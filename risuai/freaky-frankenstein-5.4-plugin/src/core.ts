import { adaptPromptForVietnamese, VIETNAMESE_OUTPUT_PROMPT } from "./vietnamese.js";

export type ChatRole = "system" | "user" | "assistant" | "function";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  memo?: string;
  [key: string]: unknown;
}

export interface FfPrompt {
  identifier: string;
  name?: string;
  content?: unknown;
  role?: string;
  marker?: boolean;
  system_prompt?: boolean;
  injection_position?: number;
  injection_depth?: number;
  injection_order?: number;
  [key: string]: unknown;
}

export interface FfOrderEntry {
  identifier: string;
  enabled?: boolean;
  [key: string]: unknown;
}

export interface FfRegexScript {
  id: string;
  scriptName?: string;
  findRegex?: string;
  replaceString?: string;
  trimStrings?: string[];
  placement?: number[];
  disabled?: boolean;
  markdownOnly?: boolean;
  promptOnly?: boolean;
  runOnEdit?: boolean;
  substituteRegex?: number;
  minDepth?: number | null;
  maxDepth?: number | null;
  [key: string]: unknown;
}

export interface FfPreset {
  prompts: FfPrompt[];
  prompt_order: Array<{ order: FfOrderEntry[]; [key: string]: unknown }>;
  extensions?: { regex_scripts?: FfRegexScript[]; [key: string]: unknown };
  [key: string]: unknown;
}

export interface FfGlobalSettings {
  enabled: boolean;
  promptEnabled: Record<string, boolean>;
  regexEnabled: Record<string, boolean>;
  vietnameseOutputEnabled: boolean;
}

export interface MacroContext {
  randomInt?: (minimum: number, maximum: number) => number;
}

export interface HostMacroContext {
  characterName: string;
  maxContext?: number;
  maxResponse?: number;
  userName: string;
}

export const PLACEMENT_USER_INPUT = 1;
export const PLACEMENT_AI_OUTPUT = 2;

const SCENE_HEADER_RE =
  /\[\s*🕰️\s*([^|\]\r\n]*?)\s*\|\s*🗓️\s*([^|\]\r\n]*?)\s*\|\s*📍\s*([^|\]\r\n]*?)\s*\|\s*([^\]\r\n]*?)\s*\]/gu;

const RELATIVE_POSITION = 0;
const ABSOLUTE_POSITION = 1;
const MARKER_IDENTIFIERS = new Set([
  "worldInfoBefore",
  "personaDescription",
  "charDescription",
  "charPersonality",
  "scenario",
  "worldInfoAfter",
  "dialogueExamples",
  "chatHistory",
]);

export function createDefaultSettings(preset: FfPreset): FfGlobalSettings {
  const order = preset.prompt_order[0]?.order ?? [];
  const regexScripts = preset.extensions?.regex_scripts ?? [];
  return {
    enabled: true,
    promptEnabled: Object.fromEntries(
      order.map((entry) => [entry.identifier, entry.enabled !== false]),
    ),
    regexEnabled: Object.fromEntries(
      regexScripts.map((script) => [script.id, script.disabled !== true]),
    ),
    vietnameseOutputEnabled: true,
  };
}

export function normalizeSettings(preset: FfPreset, value: unknown): FfGlobalSettings {
  const defaults = createDefaultSettings(preset);
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;
  const record = value as Record<string, unknown>;
  const promptEnabled =
    record.promptEnabled && typeof record.promptEnabled === "object"
      ? (record.promptEnabled as Record<string, unknown>)
      : {};
  const regexEnabled =
    record.regexEnabled && typeof record.regexEnabled === "object"
      ? (record.regexEnabled as Record<string, unknown>)
      : {};

  for (const identifier of Object.keys(defaults.promptEnabled)) {
    if (typeof promptEnabled[identifier] === "boolean") {
      defaults.promptEnabled[identifier] = promptEnabled[identifier];
    }
  }
  for (const identifier of Object.keys(defaults.regexEnabled)) {
    if (typeof regexEnabled[identifier] === "boolean") {
      defaults.regexEnabled[identifier] = regexEnabled[identifier];
    }
  }
  if (typeof record.enabled === "boolean") defaults.enabled = record.enabled;
  if (typeof record.vietnameseOutputEnabled === "boolean") {
    defaults.vietnameseOutputEnabled = record.vietnameseOutputEnabled;
  }
  return defaults;
}

function randomInt(minimum: number, maximum: number): number {
  return Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;
}

function rollDice(formula: string, rng: (minimum: number, maximum: number) => number): string {
  const normalized = /^\d+$/.test(formula.trim()) ? `1d${formula.trim()}` : formula.trim();
  const match = normalized.match(/^(\d*)d(\d+)(?:\s*([+-])\s*(\d+))?$/i);
  if (!match) return "";
  const count = Number(match[1] || "1");
  const sides = Number(match[2]);
  if (!Number.isSafeInteger(count) || !Number.isSafeInteger(sides) || count < 1 || sides < 1) {
    return "";
  }
  let total = 0;
  for (let index = 0; index < count; index += 1) total += rng(1, sides);
  const modifier = Number(match[4] || "0") * (match[3] === "-" ? -1 : 1);
  return String(total + modifier);
}

function addVariable(current: string | undefined, addition: string): string {
  const currentNumber = Number(current);
  const additionNumber = Number(addition);
  if (
    current !== undefined &&
    current.trim() !== "" &&
    Number.isFinite(currentNumber) &&
    Number.isFinite(additionNumber)
  ) {
    return String(currentNumber + additionNumber);
  }
  return `${current ?? ""}${addition}`;
}

interface MacroToken {
  end: number;
  inner: string;
}

function readMacroToken(input: string, start: number): MacroToken | null {
  if (!input.startsWith("{{", start)) return null;
  let depth = 1;
  for (let index = start + 2; index < input.length - 1; index += 1) {
    if (input.startsWith("{{", index)) {
      depth += 1;
      index += 1;
    } else if (input.startsWith("}}", index)) {
      depth -= 1;
      if (depth === 0) return { end: index + 2, inner: input.slice(start + 2, index) };
      index += 1;
    }
  }
  return null;
}

function splitMacroArgument(value: string): [string, string] {
  const separator = value.indexOf("::");
  if (separator < 0) return [value, ""];
  return [value.slice(0, separator), value.slice(separator + 2)];
}

function expandMacroPass(
  content: string,
  variables: Map<string, string>,
  rng: (minimum: number, maximum: number) => number,
): string {
  let output = "";
  let cursor = 0;
  while (cursor < content.length) {
    const start = content.indexOf("{{", cursor);
    if (start < 0) {
      output += content.slice(cursor);
      break;
    }
    output += content.slice(cursor, start);
    const token = readMacroToken(content, start);
    if (!token) {
      output += content.slice(start);
      break;
    }

    const inner = token.inner;
    const normalized = inner.toLowerCase();
    let replacement: string | undefined;
    if (inner.startsWith("//")) {
      replacement = "";
    } else if (normalized === "trim") {
      replacement = "{{trim}}";
    } else if (normalized.startsWith("setvar::")) {
      const [name, value] = splitMacroArgument(inner.slice("setvar::".length));
      variables.set(name.trim(), value);
      replacement = "";
    } else if (normalized.startsWith("addvar::")) {
      const [name, value] = splitMacroArgument(inner.slice("addvar::".length));
      const key = name.trim();
      variables.set(key, addVariable(variables.get(key), value));
      replacement = "";
    } else if (normalized.startsWith("incvar::")) {
      const key = inner.slice("incvar::".length).trim();
      const value = Number(variables.get(key) || "0") + 1;
      variables.set(key, String(value));
      replacement = String(value);
    } else if (normalized.startsWith("getvar::")) {
      const [name, fallback] = splitMacroArgument(inner.slice("getvar::".length));
      const value = variables.get(name.trim());
      replacement = value === undefined || value === "" ? fallback : value;
    } else if (normalized.startsWith("roll::")) {
      replacement = rollDice(inner.slice("roll::".length), rng);
    }

    output += replacement === undefined ? content.slice(start, token.end) : replacement;
    cursor = token.end;
  }
  return output;
}

/**
 * Expands the macros used by the source preset. Variables are request-local,
 * matching SillyTavern prompt composition: enabled modules define fragments,
 * then later prompts consume them in source order.
 */
export function expandSourceMacros(
  content: string,
  variables: Map<string, string>,
  context: MacroContext = {},
): string {
  const rng = context.randomInt ?? randomInt;
  let result = content;
  for (let pass = 0; pass < 20; pass += 1) {
    const expanded = expandMacroPass(result, variables, rng);
    if (expanded === result) break;
    result = expanded;
  }
  result = result.replace(/(?:\r?\n)*\{\{trim\}\}(?:\r?\n)*/gi, "");
  return result;
}

/**
 * Resolves the host-name macros used by FF5.4 without relying on newer
 * RisuAI chat-parser APIs. Other macros stay intact for source fidelity.
 */
export function expandHostMacros(content: string, context: HostMacroContext): string {
  let output = content
    .replace(/\{\{user\}\}/gi, context.userName)
    .replace(/\{\{char\}\}/gi, context.characterName);
  if (context.maxContext !== undefined) {
    output = output.replace(/\{\{maxContext(?:Tokens)?\}\}/gi, String(context.maxContext));
  }
  if (context.maxResponse !== undefined) {
    output = output.replace(/\{\{maxResponse(?:Tokens)?\}\}/gi, String(context.maxResponse));
  }
  return output;
}

function promptMap(preset: FfPreset): Map<string, FfPrompt> {
  return new Map(preset.prompts.map((prompt) => [prompt.identifier, prompt]));
}

function promptRole(prompt: FfPrompt): ChatRole {
  if (prompt.role === "user" || prompt.role === "assistant" || prompt.role === "function") {
    return prompt.role;
  }
  return "system";
}

function canMerge(left: ChatMessage | undefined, right: ChatMessage): boolean {
  return Boolean(
    left &&
    left.role === right.role &&
    left.name === right.name &&
    left.memo === right.memo &&
    typeof left.content === "string" &&
    typeof right.content === "string",
  );
}

function pushMerged(target: ChatMessage[], message: ChatMessage): void {
  const previous = target.at(-1);
  if (canMerge(previous, message)) previous!.content += `\n\n${message.content}`;
  else target.push(message);
}

export interface ComposedPrompt {
  leading: ChatMessage[];
  absolute: ChatMessage[];
  trailing: ChatMessage[];
  variables: Map<string, string>;
}

/**
 * Builds FF5.4 around RisuAI's already assembled card/chat context. Source
 * marker slots are supplied by RisuAI, while FF5.4 keeps its own prompt order,
 * roles, relative sections, and absolute-depth injections.
 */
export function composePresetPrompts(
  preset: FfPreset,
  settings: FfGlobalSettings,
  parseHostMacros: (content: string, role: ChatRole) => Promise<string>,
  macroContext: MacroContext = {},
): Promise<ComposedPrompt> {
  return (async () => {
    const map = promptMap(preset);
    const variables = new Map<string, string>();
    const leading: ChatMessage[] = [];
    const absoluteByDepth = new Map<number, FfPrompt[]>();
    const trailing: ChatMessage[] = [];
    const order = preset.prompt_order[0]?.order ?? [];

    for (const entry of order) {
      if (!settings.promptEnabled[entry.identifier] || MARKER_IDENTIFIERS.has(entry.identifier))
        continue;
      const prompt = map.get(entry.identifier);
      if (!prompt || prompt.marker || typeof prompt.content !== "string") continue;
      const sourceContent = settings.vietnameseOutputEnabled
        ? adaptPromptForVietnamese(prompt.content)
        : prompt.content;
      let content = expandSourceMacros(sourceContent, variables, macroContext);
      content = await parseHostMacros(content, promptRole(prompt));
      if (!content.trim()) continue;
      const message: ChatMessage = {
        role: promptRole(prompt),
        content: content.trim(),
        memo: `ff54:${prompt.identifier}`,
      };
      if (prompt.injection_position === ABSOLUTE_POSITION) {
        const depth = Math.max(0, Number(prompt.injection_depth) || 0);
        const bucket = absoluteByDepth.get(depth) ?? [];
        bucket.push({ ...prompt, content: message.content });
        absoluteByDepth.set(depth, bucket);
      } else if (entry.identifier === "jailbreak") {
        pushMerged(trailing, message);
      } else if (
        prompt.injection_position === undefined ||
        prompt.injection_position === RELATIVE_POSITION
      ) {
        pushMerged(leading, message);
      }
    }

    const absolute: ChatMessage[] = [];
    for (const depth of [...absoluteByDepth.keys()].sort((left, right) => left - right)) {
      const prompts = absoluteByDepth.get(depth) ?? [];
      const roleOrder: ChatRole[] = ["system", "user", "assistant"];
      const orderGroups = new Map<number, FfPrompt[]>();
      for (const prompt of prompts) {
        const order = Number(prompt.injection_order) || 100;
        const group = orderGroups.get(order) ?? [];
        group.push(prompt);
        orderGroups.set(order, group);
      }
      for (const order of [...orderGroups.keys()].sort((left, right) => right - left)) {
        for (const role of roleOrder) {
          const contents = (orderGroups.get(order) ?? [])
            .filter((prompt) => promptRole(prompt) === role)
            .map((prompt) => String(prompt.content).trim())
            .filter(Boolean);
          if (contents.length > 0) {
            absolute.push({
              role,
              content: contents.join("\n"),
              memo: `ff54:absolute:${depth}:${order}:${role}`,
            });
          }
        }
      }
    }
    return { leading, absolute, trailing, variables };
  })();
}

function parseRegexLiteral(value: string): RegExp | null {
  if (!value.startsWith("/")) return null;
  let closingSlash = -1;
  for (let index = value.length - 1; index > 0; index -= 1) {
    if (value[index] !== "/") continue;
    let escapes = 0;
    for (let before = index - 1; before >= 0 && value[before] === "\\"; before -= 1) escapes += 1;
    if (escapes % 2 === 0) {
      closingSlash = index;
      break;
    }
  }
  if (closingSlash < 1) return null;
  try {
    return new RegExp(value.slice(1, closingSlash), value.slice(closingSlash + 1));
  } catch {
    return null;
  }
}

function adaptRegexForVietnamese(
  findRegex: string,
  replaceString: string,
): { findRegex: string; replaceString: string } {
  return {
    findRegex: findRegex
      .replaceAll("\\bTime\\b", "(?:\\bTime\\b|Thời\\s{1,8}gian)")
      .replaceAll("(INTERNAL STATES)", "(INTERNAL STATES|TRẠNG THÁI NỘI BỘ)")
      .replaceAll(
        "(QUESTS|CHEKHOV'S GUN|CHEKHOV SEEDS|INTERNAL THOUGHTS|INV & SKILLS|INVENTORY & STATUS|GM NOTEBOOK|GM'S NOTEBOOK)",
        "(QUESTS|CHEKHOV'S GUN|CHEKHOV SEEDS|INTERNAL THOUGHTS|INV & SKILLS|INVENTORY & STATUS|GM NOTEBOOK|GM'S NOTEBOOK|NHIỆM VỤ|SÚNG CỦA CHEKHOV|SUY NGHĨ NỘI TÂM|HÀNH TRANG & KỸ NĂNG|SỔ TAY GM)",
      )
      .replaceAll(
        "(NPC AGENDAS|NPC LOCATIONS|FACTIONS|BONDS|BOND TRACKER)",
        "(NPC AGENDAS|NPC LOCATIONS|FACTIONS|BONDS|BOND TRACKER|LỊCH TRÌNH NPC|VỊ TRÍ NPC|PHE PHÁI|MỐI QUAN HỆ)",
      )
      .replaceAll(
        "(PLOT MOMENTUM|DND TASK SIM|WORLD SIM|PHYSICS, ENGINE & WORLD)",
        "(PLOT MOMENTUM|DND TASK SIM|WORLD SIM|PHYSICS, ENGINE & WORLD|MÔ PHỎNG NHIỆM VỤ DND|MÔ PHỎNG THẾ GIỚI|VẬT LÝ, CƠ CHẾ & THẾ GIỚI)",
      )
      .replaceAll("BOND:", "(?:BOND|GẮN KẾT):")
      .replaceAll("SPARKS?:", "(?:SPARKS?|THIỆN CẢM):")
      .replaceAll("GRUDGE:", "(?:GRUDGE|BẤT MÃN):"),
    replaceString: replaceString
      .replaceAll("BOND: $3$4", "GẮN KẾT: $3$4")
      .replaceAll("SPARKS: $5", "THIỆN CẢM: $5")
      .replaceAll("GRUDGE: $6", "BẤT MÃN: $6"),
  };
}

function depthAllowed(script: FfRegexScript, depth: number | undefined): boolean {
  if (depth === undefined) return true;
  if (typeof script.minDepth === "number" && script.minDepth >= -1 && depth < script.minDepth)
    return false;
  if (typeof script.maxDepth === "number" && script.maxDepth >= 0 && depth > script.maxDepth)
    return false;
  return true;
}

function replaceWithSourceGroups(
  input: string,
  regex: RegExp,
  replacement: string,
  trimStrings: string[],
): string {
  return input.replace(regex, (...args: unknown[]) => {
    const match = String(args[0] ?? "");
    const possibleGroups = args.at(-1);
    const namedGroups =
      possibleGroups && typeof possibleGroups === "object"
        ? (possibleGroups as Record<string, string>)
        : undefined;
    return replacement
      .replace(/\{\{match\}\}/gi, match)
      .replace(/\$(\d+)|\$<([^>]+)>/g, (_token, number, groupName) => {
        let value = "";
        if (number !== undefined) value = String(args[Number(number)] ?? "");
        else if (groupName !== undefined) value = String(namedGroups?.[String(groupName)] ?? "");
        for (const trimString of trimStrings) value = value.replaceAll(trimString, "");
        return value;
      });
  });
}

export function applyRegexScripts(
  input: string,
  preset: FfPreset,
  settings: FfGlobalSettings,
  options: {
    placement: number;
    prompt?: boolean;
    markdown?: boolean;
    edit?: boolean;
    depth?: number;
  },
): string {
  let output = input;
  for (const script of preset.extensions?.regex_scripts ?? []) {
    if (!settings.regexEnabled[script.id] || script.disabled || !script.findRegex || !output)
      continue;
    const eligibleMode =
      (script.markdownOnly && options.markdown) ||
      (script.promptOnly && options.prompt) ||
      (!script.markdownOnly && !script.promptOnly && !options.markdown && !options.prompt);
    if (!eligibleMode || !script.placement?.includes(options.placement)) continue;
    if (options.edit && !script.runOnEdit) continue;
    if (!depthAllowed(script, options.depth)) continue;
    const localized = settings.vietnameseOutputEnabled
      ? adaptRegexForVietnamese(script.findRegex, String(script.replaceString ?? ""))
      : { findRegex: script.findRegex, replaceString: String(script.replaceString ?? "") };
    const regex = parseRegexLiteral(localized.findRegex);
    if (!regex) continue;
    output = replaceWithSourceGroups(
      output,
      regex,
      localized.replaceString.replace(/\\n/g, "\n"),
      script.trimStrings ?? [],
    );
  }
  return output;
}

export function adaptDisplayMarkupForRisuAI(input: string): string {
  return input
    .replace(/<\s*internal_states\s*>/gi, '<div data-ff54="internal-states">')
    .replace(/<\s*\/\s*internal_states\s*>/gi, "</div>");
}

function escapeDisplayHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function adaptVietnameseHeaderForRisuAI(input: string): string {
  return input.replace(
    SCENE_HEADER_RE,
    (_match, time: string, date: string, location: string, weather: string) => {
      const cards = [
        ["🕰️ Thời gian", time],
        ["🗓️ Ngày", date],
        ["📍 Địa điểm", location],
        ["🌤️ Thời tiết", weather],
      ]
        .map(
          ([label, value]) =>
            `<div style="min-width:0;padding:10px 12px;border:1px solid rgba(148,163,184,.24);border-radius:10px;background:rgba(15,23,42,.3)"><div style="margin-bottom:4px;color:#a5b4fc;font-size:.76em;font-weight:700">${label}</div><div style="overflow-wrap:anywhere;line-height:1.4">${escapeDisplayHtml(value!)}</div></div>`,
        )
        .join("");
      return `<div data-ff54="scene-header" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr));gap:8px;margin:0 0 12px;padding:10px;border:1px solid rgba(148,163,184,.28);border-radius:12px;background:rgba(15,23,42,.22)">${cards}</div>`;
    },
  );
}

/** Remove scene headers from the request copy; saved history remains unchanged. */
export function removeSceneHeadersForRequest(input: string): string {
  return input.replace(SCENE_HEADER_RE, "");
}

function messageDepths(messages: ChatMessage[]): Map<ChatMessage, number> {
  const history = messages.filter(
    (message) =>
      (message.role === "user" || message.role === "assistant") &&
      !String(message.memo ?? "").startsWith("ff54:"),
  );
  const depths = new Map<ChatMessage, number>();
  [...history].reverse().forEach((message, depth) => depths.set(message, depth));
  return depths;
}

export function applyRequestFiltersToMessages(
  messages: ChatMessage[],
  preset: FfPreset,
  settings: FfGlobalSettings,
): ChatMessage[] {
  const regexed = applyPromptRegexToMessages(messages, preset, settings);
  const depths = messageDepths(regexed);
  return regexed.map((message) => {
    const depth = depths.get(message);
    const contextSaver = (preset.extensions?.regex_scripts ?? []).find(
      (script) => script.scriptName === "FF5 - Context Saver (Universal)",
    );
    const removeHeader =
      message.role === "assistant" &&
      depth !== undefined &&
      contextSaver !== undefined &&
      settings.regexEnabled[contextSaver.id] === true &&
      !contextSaver.disabled &&
      contextSaver.placement?.includes(PLACEMENT_AI_OUTPUT) === true &&
      depthAllowed(contextSaver, depth);
    return {
      ...message,
      content: removeHeader ? removeSceneHeadersForRequest(message.content) : message.content,
    };
  });
}


export function applyPromptRegexToMessages(
  messages: ChatMessage[],
  preset: FfPreset,
  settings: FfGlobalSettings,
): ChatMessage[] {
  const depths = messageDepths(messages);
  return messages.map((message) => {
    const placement =
      message.role === "user"
        ? PLACEMENT_USER_INPUT
        : message.role === "assistant"
          ? PLACEMENT_AI_OUTPUT
          : undefined;
    if (placement === undefined) return { ...message };
    return {
      ...message,
      content: applyRegexScripts(message.content, preset, settings, {
        placement,
        prompt: true,
        ...(depths.has(message) ? { depth: depths.get(message)! } : {}),
      }),
    };
  });
}

export function injectAbsoluteAtDepth(
  messages: ChatMessage[],
  injections: ChatMessage[],
): ChatMessage[] {
  if (injections.length === 0) return messages;
  const result = [...messages];
  // SillyTavern receives history newest-first, inserts depth 0 at index 0,
  // then reverses it. In chronological request order, depth 0 follows the
  // latest message and higher depths walk farther back.
  const byDepth = new Map<number, ChatMessage[]>();
  for (const message of injections) {
    const match = String(message.memo ?? "").match(/^ff54:absolute:([0-9]+):/);
    const depth = match ? Number(match[1]) : 0;
    const bucket = byDepth.get(depth) ?? [];
    bucket.push(message);
    byDepth.set(depth, bucket);
  }
  let inserted = 0;
  for (const depth of [...byDepth.keys()].sort((left, right) => left - right)) {
    const index = Math.max(0, result.length - depth - inserted);
    result.splice(index, 0, ...(byDepth.get(depth) ?? []));
    inserted += byDepth.get(depth)?.length ?? 0;
  }
  return result;
}

export async function buildRequestMessages(
  messages: ChatMessage[],
  preset: FfPreset,
  settings: FfGlobalSettings,
  parseHostMacros: (content: string, role: ChatRole) => Promise<string>,
  macroContext: MacroContext = {},
): Promise<ChatMessage[]> {
  if (!settings.enabled) return messages;
  const hostMessages = messages.filter(
    (message) => !String(message.memo ?? "").startsWith("ff54:"),
  );
  const requestHistory = applyRequestFiltersToMessages(hostMessages, preset, settings);
  const composed = await composePresetPrompts(preset, settings, parseHostMacros, macroContext);
  return [
    ...composed.leading,
    ...(settings.vietnameseOutputEnabled
      ? [
          {
            role: "system" as const,
            content: VIETNAMESE_OUTPUT_PROMPT,
            memo: "ff54:vietnamese-output",
          },
        ]
      : []),
    ...injectAbsoluteAtDepth(requestHistory, composed.absolute),
    ...composed.trailing,
  ];
}
