import {
  adaptFamilyPrompt,
  familyPrompts,
  familyRegexScripts,
  familyOf,
  imageOptimizationFor,
  isPluginMemo,
  normalizePresetFamily,
  pluginMemoPrefix,
  presetOrder,
  vietnameseOutputFor,
  type PresetFamilyId,
} from "./preset-family.js";
import {
  adaptDialogueColors,
  adaptDialogueColorRegex,
  adaptSolaDialogueColors,
  adaptSolaDialogueReplacement,
  type DialogueTheme,
} from "./dialogue-colors.js";
import {
  adaptSolaRegexForVietnamese,
  adaptSolaTrackerLabelsForDisplay,
} from "./sola-vietnamese-regex.js";
import { SOLA_HEADER_SAVER_ID } from "./sola-history.js";
import { adaptSolaCardContentForDisplay, adaptSolaDisplayReplacement } from "./sola-display.js";
import { gemmaFixPromptFor, normalizeGemmaNsfwLevel, type GemmaNsfwLevel } from "./gemma-fix.js";
import { cardImagePrompt, type CardImageCatalog } from "./card-images.js";
import {
  adaptSolaNsfwTrackerForDisplay,
  expireSolaNsfwTracker,
  solaNsfwPatternBanPrompt,
  solaNsfwTrackerPrompt,
  splitSolaNsfwTracker,
  SOLA_NSFW_TRACKER_MEMO,
  SOLA_NSFW_TRACKER_REMINDER,
} from "./sola-nsfw-tracker.js";
import {
  adaptSolaSexTrackerForDisplay,
  expireSolaSexTracker,
  solaSexTrackerPrompt,
  SOLA_SEX_TRACKER_MEMO,
  SOLA_SEX_TRACKER_REMINDER,
} from "./sola-sex-tracker.js";

export type ChatRole = "system" | "user" | "assistant" | "function";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  memo?: string;
  isComment?: boolean;
  vnRpGemmaFixSuffix?: string;
  /** Request-only record retained when rebuilding a request without raw tracker blocks. */
  vnRpNsfwTracker?: string;
  /** Internal request marker: retain restored Sola trackers during a reroll/swipe. */
  vnRpRestoreSolaTrackers?: boolean;
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
  presetFamily?: PresetFamilyId;
  familyModules?: Partial<
    Record<
      PresetFamilyId,
      { promptEnabled: Record<string, boolean>; regexEnabled: Record<string, boolean> }
    >
  >;
  dialogueThemeEnabled?: boolean;
  enabled: boolean;
  promptEnabled: Record<string, boolean>;
  regexEnabled: Record<string, boolean>;
  vietnameseOutputEnabled: boolean;
  imageOptimizationEnabled: boolean;
  cardImageCatalogEnabled: boolean;
  solaNsfwTrackerEnabled: boolean;
  solaSexTrackerEnabled: boolean;
  soundNotificationsEnabled: boolean;
  submodelEditorEnabled: boolean;
  submodelAutoRewriteEnabled: boolean;
  gemmaFixEnabled: boolean;
  gemmaFixNsfwLevel: GemmaNsfwLevel;
}

export interface MacroContext {
  randomInt?: (minimum: number, maximum: number) => number;
  dialogueTheme?: DialogueTheme;
  cardImageCatalog?: CardImageCatalog;
}

export interface HostMacroContext {
  characterName: string;
  maxContext?: number;
  maxResponse?: number;
  userName: string;
  dialogueTheme?: DialogueTheme;
  cardImageCatalog?: CardImageCatalog;
}

export const PLACEMENT_USER_INPUT = 1;
export const PLACEMENT_AI_OUTPUT = 2;

const SCENE_HEADER_RE =
  /\[\s*🕰️\s*((?:\[[^|[\]\r\n]*\]|[^|[\]\r\n])*?)\s*\|\s*(?:🗓|🗒)\uFE0F?\s*((?:\[[^|[\]\r\n]*\]|[^|[\]\r\n])*?)\s*\|\s*📍\s*((?:\[[^|[\]\r\n]*\]|[^|[\]\r\n])*?)\s*\|\s*((?:\[[^[\]\r\n]*\]|[^[\]\r\n])*?)\s*\]/gu;
const INTERNAL_STATE_BLOCK_RE =
  /(?:<!--\s{0,8}GFX_START\s{0,8}-->\s*)?<internal_states>[\s\S]{0,50000}?(?:<\/internal_states>|$)(?:\s*<!--\s{0,8}GFX_END\s{0,8}-->)?/gi;
const GFX_MARKER_RE = /<!--\s{0,8}GFX_(START|END)\s{0,8}-->/gi;

/** Return the complete internal-state block before Context Saver removes it. */
export function extractInternalStateBlock(input: string): string | undefined {
  const matcher = new RegExp(INTERNAL_STATE_BLOCK_RE.source, INTERNAL_STATE_BLOCK_RE.flags);
  return matcher.exec(input)?.[0];
}

function removeOrphanTrailingGfxEnd(input: string): string {
  let output = input;
  while (true) {
    let open = 0;
    let orphanEnd: RegExpExecArray | undefined;
    for (const marker of output.matchAll(GFX_MARKER_RE)) {
      if (marker[1]?.toUpperCase() === "START") open += 1;
      else if (open > 0) open -= 1;
      else orphanEnd = marker;
    }
    if (!orphanEnd || output.slice(orphanEnd.index + orphanEnd[0].length).trim()) return output;
    output = output.slice(0, orphanEnd.index).trimEnd();
  }
}

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

const REALISM_MODE_ID = "019f62e8-892f-700c-9795-53ecb3381d7d";
const FREAKY_MODE_ID = "019f62e8-892f-700d-b070-4add983aeae1";
const SOLA_PROMPT_DEFAULTS: Readonly<Record<string, boolean>> = {
  "01a0c1ff-4ecf-7006-aa85-a9d7fd7ed074": true, // Freaky Jailbreak
  "01a0c1ff-4ecf-702e-9a5f-c2003733ab34": true, // Body Description Enhancement
};

export function createDefaultSettings(preset: FfPreset): FfGlobalSettings {
  const order = presetOrder(preset);
  const regexScripts = familyRegexScripts(preset);
  const promptDefaults: Readonly<Record<string, boolean>> =
    familyOf(preset) === "sola"
      ? SOLA_PROMPT_DEFAULTS
      : { [REALISM_MODE_ID]: true, [FREAKY_MODE_ID]: false };
  const promptEnabled = Object.fromEntries(
    order.map((entry) => [
      entry.identifier,
      promptDefaults[entry.identifier] ?? entry.enabled !== false,
    ]),
  );
  return {
    enabled: true,
    promptEnabled,
    regexEnabled: Object.fromEntries(
      regexScripts.map((script) => [script.id, script.disabled !== true]),
    ),
    vietnameseOutputEnabled: true,
    imageOptimizationEnabled: false,
    cardImageCatalogEnabled: false,
    solaNsfwTrackerEnabled: false,
    solaSexTrackerEnabled: false,
    soundNotificationsEnabled: false,
    submodelEditorEnabled: false,
    submodelAutoRewriteEnabled: false,
    gemmaFixEnabled: false,
    gemmaFixNsfwLevel: 2,
    ...(familyOf(preset) !== "ff54" ? { presetFamily: familyOf(preset) } : {}),
  };
}

export function normalizeSettings(preset: FfPreset, value: unknown): FfGlobalSettings {
  const defaults = createDefaultSettings(preset);
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;
  const record = value as Record<string, unknown>;
  if (typeof record.dialogueThemeEnabled === "boolean")
    defaults.dialogueThemeEnabled = record.dialogueThemeEnabled;
  if (
    record.familyModules &&
    typeof record.familyModules === "object" &&
    !Array.isArray(record.familyModules)
  )
    defaults.familyModules = structuredClone(
      Object.fromEntries(
        Object.entries(record.familyModules).filter(
          ([family]) => family === "ff54" || family === "sola",
        ),
      ),
    ) as NonNullable<FfGlobalSettings["familyModules"]>;
  const retiredFamily =
    typeof record.presetFamily === "string" &&
    normalizePresetFamily(record.presetFamily) !== record.presetFamily;
  // Recover the remaining family's saved bank instead of applying a retired preset's IDs.
  const moduleSettings = retiredFamily ? defaults.familyModules?.[familyOf(preset)] : record;
  const promptEnabled =
    moduleSettings?.promptEnabled && typeof moduleSettings.promptEnabled === "object"
      ? (moduleSettings.promptEnabled as Record<string, unknown>)
      : {};
  const regexEnabled =
    moduleSettings?.regexEnabled && typeof moduleSettings.regexEnabled === "object"
      ? (moduleSettings.regexEnabled as Record<string, unknown>)
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
  if (typeof record.imageOptimizationEnabled === "boolean") {
    defaults.imageOptimizationEnabled = record.imageOptimizationEnabled;
  }
  if (typeof record.cardImageCatalogEnabled === "boolean")
    defaults.cardImageCatalogEnabled = record.cardImageCatalogEnabled;
  if (typeof record.solaNsfwTrackerEnabled === "boolean")
    defaults.solaNsfwTrackerEnabled = record.solaNsfwTrackerEnabled;
  if (typeof record.solaSexTrackerEnabled === "boolean")
    defaults.solaSexTrackerEnabled = record.solaSexTrackerEnabled;
  if (typeof record.soundNotificationsEnabled === "boolean") {
    defaults.soundNotificationsEnabled = record.soundNotificationsEnabled;
  }
  if (typeof record.submodelEditorEnabled === "boolean") {
    defaults.submodelEditorEnabled = record.submodelEditorEnabled;
  }
  if (typeof record.submodelAutoRewriteEnabled === "boolean") {
    defaults.submodelAutoRewriteEnabled =
      defaults.submodelEditorEnabled && record.submodelAutoRewriteEnabled;
  }
  if (typeof record.gemmaFixEnabled === "boolean")
    defaults.gemmaFixEnabled = record.gemmaFixEnabled;
  defaults.gemmaFixNsfwLevel = normalizeGemmaNsfwLevel(record.gemmaFixNsfwLevel);
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
    } else if (normalized.startsWith("random::")) {
      const choices = inner.slice("random::".length).split("::");
      replacement = choices[rng(0, choices.length - 1)] ?? "";
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
 * Resolves source host-name macros without relying on newer
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
  return new Map(familyPrompts(preset).map((prompt) => [prompt.identifier, prompt]));
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
 * Builds the selected preset around RisuAI's already assembled card/chat context.
 * Marker slots are supplied by RisuAI; the preset keeps its own prompt order,
 * roles, relative sections, and absolute-depth injections.
 */
export function composePresetPrompts(
  preset: FfPreset,
  settings: FfGlobalSettings,
  parseHostMacros: (content: string, role: ChatRole) => Promise<string>,
  macroContext: MacroContext = {},
  onExpandedPrompt?: (message: ChatMessage, prompt: FfPrompt) => void,
): Promise<ComposedPrompt> {
  return (async () => {
    const map = promptMap(preset);
    const variables = new Map<string, string>();
    if (familyOf(preset) === "sola" && settings.solaNsfwTrackerEnabled)
      variables.set("mod_track_nsfw", SOLA_NSFW_TRACKER_REMINDER);
    if (familyOf(preset) === "sola" && settings.solaSexTrackerEnabled)
      variables.set("mod_track_sex", SOLA_SEX_TRACKER_REMINDER);
    const leading: ChatMessage[] = [];
    const absoluteByDepth = new Map<number, FfPrompt[]>();
    const trailing: ChatMessage[] = [];
    const order = presetOrder(preset);
    const memoPrefix = pluginMemoPrefix(preset);
    const solaHudEnabled =
      familyOf(preset) === "sola" &&
      settings.promptEnabled["01a0c1ff-4ecf-701f-ae98-acfb7b26a41f"] === true;
    let afterHistory = false;

    let nsfwTrackerInjected = false;
    let sexTrackerInjected = false;
    const addTracker = async (kind: "nsfw" | "sex", absoluteBucket?: FfPrompt[]) => {
      const location =
        variables.get("tracker_location") ??
        (solaHudEnabled ? "inside of '<sola_hud>' tags" : "at the end of your response");
      const content = await parseHostMacros(
        kind === "nsfw"
          ? solaNsfwTrackerPrompt(settings.vietnameseOutputEnabled, location)
          : solaSexTrackerPrompt(settings.vietnameseOutputEnabled, location),
        "system",
      );
      const memo = `${memoPrefix}${kind === "nsfw" ? SOLA_NSFW_TRACKER_MEMO : SOLA_SEX_TRACKER_MEMO}`;
      if (absoluteBucket) {
        absoluteBucket.push({
          identifier: kind === "nsfw" ? "sola-nsfw-tracker" : "sola-sex-tracker",
          content,
          role: "system",
          injection_position: ABSOLUTE_POSITION,
          injection_depth: 0,
          injection_order: kind === "nsfw" ? 99 : 98,
        });
      } else {
        trailing.push({ role: "system", content, memo });
      }
    };
    const injectNsfwTracker = async (at: FfPrompt[] | undefined) => {
      if (nsfwTrackerInjected || familyOf(preset) !== "sola" || !settings.solaNsfwTrackerEnabled)
        return;
      nsfwTrackerInjected = true;
      if (at) await addTracker("nsfw", at);
      else if (solaHudEnabled) {
        const bucket = absoluteByDepth.get(0) ?? [];
        await addTracker("nsfw", bucket);
        absoluteByDepth.set(0, bucket);
      } else await addTracker("nsfw");
    };
    const injectSexTracker = async (at: FfPrompt[] | undefined) => {
      if (sexTrackerInjected || familyOf(preset) !== "sola" || !settings.solaSexTrackerEnabled)
        return;
      sexTrackerInjected = true;
      if (at) await addTracker("sex", at);
      else if (solaHudEnabled) {
        const bucket = absoluteByDepth.get(0) ?? [];
        await addTracker("sex", bucket);
        absoluteByDepth.set(0, bucket);
      } else await addTracker("sex");
    };

    for (const entry of order) {
      if (entry.identifier === "chatHistory") afterHistory = true;
      if (!settings.promptEnabled[entry.identifier] || MARKER_IDENTIFIERS.has(entry.identifier))
        continue;
      const prompt = map.get(entry.identifier);
      if (!prompt || prompt.marker || typeof prompt.content !== "string") continue;
      let sourceContent = adaptFamilyPrompt(prompt.content, preset, settings);
      if (settings.dialogueThemeEnabled !== false && promptRole(prompt) === "system") {
        sourceContent =
          familyOf(preset) === "sola"
            ? adaptSolaDialogueColors(sourceContent, macroContext.dialogueTheme)
            : familyOf(preset) === "ff54"
              ? adaptDialogueColors(sourceContent, macroContext.dialogueTheme)
              : sourceContent;
      }
      let content = expandSourceMacros(sourceContent, variables, macroContext);
      content = await parseHostMacros(content, promptRole(prompt));
      if (!content.trim()) continue;
      const message: ChatMessage = {
        role: promptRole(prompt),
        content: content.trim(),
        memo: `${memoPrefix}${prompt.identifier}`,
      };
      onExpandedPrompt?.(message, prompt);
      if (prompt.injection_position === ABSOLUTE_POSITION) {
        const depth = Math.max(0, Number(prompt.injection_depth) || 0);
        const bucket = absoluteByDepth.get(depth) ?? [];
        bucket.push({ ...prompt, content: message.content });
        absoluteByDepth.set(depth, bucket);
        if (entry.identifier === "01a0c1ff-4ecf-701f-ae98-acfb7b26a41f") {
          await injectNsfwTracker(bucket);
          await injectSexTracker(bucket);
        }
      } else if (
        entry.identifier === "jailbreak" ||
        (familyOf(preset) !== "ff54" && afterHistory)
      ) {
        pushMerged(trailing, message);
      } else if (
        prompt.injection_position === undefined ||
        prompt.injection_position === RELATIVE_POSITION
      ) {
        pushMerged(leading, message);
      }
    }
    await injectNsfwTracker(undefined);
    await injectSexTracker(undefined);

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
          const grouped = orderGroups.get(order) ?? [];
          const contents = grouped
            .filter((prompt) => promptRole(prompt) === role)
            .map((prompt) => String(prompt.content).trim())
            .filter(Boolean);
          if (contents.length > 0) {
            const tracker = grouped.length === 1 ? grouped[0]!.identifier : "";
            const memo =
              tracker === "sola-nsfw-tracker"
                ? `${memoPrefix}${SOLA_NSFW_TRACKER_MEMO}`
                : tracker === "sola-sex-tracker"
                  ? `${memoPrefix}${SOLA_SEX_TRACKER_MEMO}`
                  : `${memoPrefix}absolute:${depth}:${order}:${role}`;
            absolute.push({
              role,
              content: contents.join("\n"),
              memo,
            });
          }
        }
      }
    }
    if (settings.imageOptimizationEnabled) {
      leading.push({
        role: "system",
        content: await parseHostMacros(imageOptimizationFor(preset), "system"),
        memo: `${memoPrefix}image-optimization`,
      });
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
  transformCapture?: (value: string) => string,
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
        return transformCapture ? transformCapture(value) : value;
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
    depthForScript?: (script: FfRegexScript) => number | undefined;
    history?: boolean;
    onHistoryRemoval?: (offset: number, text: string) => void;
    dialogueTheme?: DialogueTheme;
  },
): string {
  let output =
    options.markdown && settings.vietnameseOutputEnabled && familyOf(preset) === "sola"
      ? adaptSolaTrackerLabelsForDisplay(input)
      : input;
  if (options.markdown && settings.solaNsfwTrackerEnabled && familyOf(preset) === "sola")
    output = adaptSolaNsfwTrackerForDisplay(output, settings.vietnameseOutputEnabled);
  if (options.markdown && settings.solaSexTrackerEnabled && familyOf(preset) === "sola")
    output = adaptSolaSexTrackerForDisplay(output, settings.vietnameseOutputEnabled);
  for (const script of familyRegexScripts(preset)) {
    if (!settings.regexEnabled[script.id] || !script.findRegex || !output) continue;
    if (options.history && script.id === SOLA_HEADER_SAVER_ID) continue;
    const eligibleMode =
      (script.markdownOnly && options.markdown) ||
      (script.promptOnly && options.prompt) ||
      (!script.markdownOnly && !script.promptOnly && !options.markdown && !options.prompt);
    if (!eligibleMode || !script.placement?.includes(options.placement)) continue;
    if (options.edit && !script.runOnEdit) continue;
    const scriptDepth = options.depthForScript?.(script) ?? options.depth;
    if (!depthAllowed(script, scriptDepth)) continue;
    if (options.prompt && script.scriptName === "FF5 - Context Saver (Universal)") {
      output = removeOrphanTrailingGfxEnd(output.replace(INTERNAL_STATE_BLOCK_RE, ""));
      continue;
    }
    if (options.prompt && script.scriptName === "FF5 - GFX Stripper") continue;
    const sourceReplacement = String(script.replaceString ?? "");
    const localized = settings.vietnameseOutputEnabled
      ? familyOf(preset) === "ff54"
        ? adaptRegexForVietnamese(script.findRegex, sourceReplacement)
        : familyOf(preset) === "sola"
          ? adaptSolaRegexForVietnamese(
              script.findRegex,
              sourceReplacement,
              script.scriptName ?? "",
            )
          : { findRegex: script.findRegex, replaceString: sourceReplacement }
      : { findRegex: script.findRegex, replaceString: sourceReplacement };
    // Provider reasoning can exceed the source's 20,000-character cap.
    // Keep Hapuppy's closing-tag boundaries and toggle/depth rules intact.
    const findRegex =
      script.scriptName === "Hapuppy Delete Thoughts" ||
      script.scriptName === "Hapuppy Hide Thoughts"
        ? localized.findRegex.replaceAll("[\\s\\S]{0,20000}?", "[\\s\\S]*?")
        : localized.findRegex;
    const regex = parseRegexLiteral(
      options.markdown ? adaptDialogueColorRegex(findRegex) : findRegex,
    );
    if (!regex) continue;
    if (
      options.onHistoryRemoval &&
      script.scriptName?.startsWith("Sola Saver:") &&
      localized.replaceString === ""
    ) {
      let removedLength = 0;
      output = output.replace(regex, (match: string, ...args: unknown[]) => {
        const offset = Number(args.at(-2));
        options.onHistoryRemoval!(offset - removedLength, match);
        removedLength += match.length;
        return "";
      });
      continue;
    }
    // RisuAI gives nested quote/emphasis elements their own theme colors.
    // Scope those variables to the dialogue span so they keep the source color.
    const themedReplacement =
      options.markdown && familyOf(preset) === "sola"
        ? adaptSolaDialogueReplacement(
            localized.replaceString,
            script.scriptName ?? "",
            settings.dialogueThemeEnabled !== false ? options.dialogueTheme : undefined,
          )
        : localized.replaceString;
    const displayReplacement =
      options.markdown && familyOf(preset) === "sola"
        ? adaptSolaDisplayReplacement(themedReplacement, script.scriptName ?? "")
        : themedReplacement;
    const replacement = options.markdown
      ? displayReplacement.replace(
          '<span style="color:$1;',
          '<span style="color:$1;--FontColorStandard:$1;--FontColorItalic:$1;--FontColorBold:$1;--FontColorItalicBold:$1;--FontColorQuote1:$1;--FontColorQuote2:$1;',
        )
      : displayReplacement;
    output = replaceWithSourceGroups(
      output,
      regex,
      replacement.replace(/\\n/g, "\n"),
      script.trimStrings ?? [],
      options.markdown && familyOf(preset) === "sola" && script.scriptName?.startsWith("Sola Card:")
        ? (value) => adaptSolaCardContentForDisplay(value, script.scriptName!)
        : undefined,
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

/** Recognize a closed scene header with all four display values present. */
export function hasCompleteSceneHeader(input: string): boolean {
  const header = new RegExp(SCENE_HEADER_RE.source, SCENE_HEADER_RE.flags).exec(input);
  return header !== null && header.slice(1).every((value) => value.trim().length > 0);
}

/** Keep the complete response starting at the same header recognized by the renderer. */
export function splitBeforeSceneHeader(input: string): { prefix: string; response: string } {
  const header = new RegExp(SCENE_HEADER_RE.source, SCENE_HEADER_RE.flags).exec(input);
  const index = header?.index ?? 0;
  return { prefix: input.slice(0, index), response: input.slice(index) };
}

/** PocketRisu branch markers can be user or assistant messages without a flag. */
export function isChatComment(message: Pick<ChatMessage, "content" | "isComment">): boolean {
  return message.isComment === true || /^\s*\{\{specialcomment::/.test(message.content);
}

function messageDepths(messages: ChatMessage[]): Map<ChatMessage, number> {
  const history = messages.filter(
    (message) =>
      (message.role === "user" || message.role === "assistant") &&
      !isChatComment(message) &&
      !isPluginMemo(message.memo),
  );
  const depths = new Map<ChatMessage, number>();
  [...history].reverse().forEach((message, depth) => depths.set(message, depth));
  return depths;
}

function assistantResponseDepths(messages: ChatMessage[]): Map<ChatMessage, number> {
  const depths = new Map<ChatMessage, number>();
  let assistantDepth = 0;
  for (const message of [...messages].reverse()) {
    if (isChatComment(message)) continue;
    if (isPluginMemo(message.memo)) continue;
    if (message.role !== "user" && message.role !== "assistant") continue;
    depths.set(message, assistantDepth);
    if (message.role === "assistant") assistantDepth += 1;
  }
  return depths;
}

/** Keep Sola's alternating-chat depths without aging state for extra user injections. */
function solaSaverDepths(messages: ChatMessage[]): Map<ChatMessage, number> {
  const depths = new Map<ChatMessage, number>();
  let depth = 0;
  let foundResponse = false;
  for (const message of [...messages].reverse()) {
    if (isChatComment(message) || isPluginMemo(message.memo)) continue;
    if (message.role === "assistant") {
      depths.set(message, depth);
      depth += 2;
      foundResponse = true;
    } else if (message.role === "user" && !foundResponse) {
      depth = 1;
    }
  }
  return depths;
}

/**
 * Context Saver keeps the same state that would survive the normal prompt
 * cleanup at this response depth. This is shared with the history snapshot
 * layer so restoring a deleted/branched history does not expose an old state
 * that the configured minDepth would immediately remove again.
 */
export function keepsInternalStateInHistory(
  messages: ChatMessage[],
  target: ChatMessage,
  preset: FfPreset,
  settings: FfGlobalSettings,
): boolean {
  const contextSaver = (preset.extensions?.regex_scripts ?? []).find(
    (script) => script.scriptName === "FF5 - Context Saver (Universal)",
  );
  if (
    contextSaver === undefined ||
    settings.regexEnabled[contextSaver.id] !== true ||
    contextSaver.disabled ||
    contextSaver.promptOnly !== true ||
    contextSaver.markdownOnly === true ||
    contextSaver.placement?.includes(PLACEMENT_AI_OUTPUT) !== true
  )
    return true;
  const depth = assistantResponseDepths(messages).get(target);
  return !depthAllowed(contextSaver, depth);
}

export function applyRequestFiltersToMessages(
  messages: ChatMessage[],
  preset: FfPreset,
  settings: FfGlobalSettings,
): ChatMessage[] {
  const regexed = applyPromptRegexToMessages(
    messages.filter((message) => !isChatComment(message)),
    preset,
    settings,
  );
  const depths = assistantResponseDepths(regexed);
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
  options: {
    history?: boolean;
    onHistoryRemoval?: (message: ChatMessage, offset: number, text: string) => void;
  } = {},
): ChatMessage[] {
  const depths = messageDepths(messages);
  const contextSaver = (preset.extensions?.regex_scripts ?? []).find(
    (script) => script.scriptName === "FF5 - Context Saver (Universal)",
  );
  const contextSaverDepths = assistantResponseDepths(messages);
  const solaDepths = familyOf(preset) === "sola" ? solaSaverDepths(messages) : undefined;
  return messages.map((message) => {
    if (isChatComment(message)) return { ...message };
    const placement =
      message.role === "user"
        ? PLACEMENT_USER_INPUT
        : message.role === "assistant"
          ? PLACEMENT_AI_OUTPUT
          : undefined;
    if (placement === undefined) return { ...message };
    let content = applyRegexScripts(message.content, preset, settings, {
      placement,
      prompt: true,
      ...(options.history ? { history: true } : {}),
      ...(options.onHistoryRemoval
        ? {
            onHistoryRemoval: (offset: number, text: string) =>
              options.onHistoryRemoval!(message, offset, text),
          }
        : {}),
      ...(depths.has(message) ? { depth: depths.get(message)! } : {}),
      ...((contextSaver !== undefined || solaDepths !== undefined) &&
      placement === PLACEMENT_AI_OUTPUT
        ? {
            depthForScript: (script: FfRegexScript) => {
              if (solaDepths && script.scriptName?.startsWith("Sola Saver:"))
                return solaDepths.get(message);
              return script.id === contextSaver?.id ? contextSaverDepths.get(message) : undefined;
            },
          }
        : {}),
    });
    if (
      settings.solaNsfwTrackerEnabled &&
      familyOf(preset) === "sola" &&
      placement === PLACEMENT_AI_OUTPUT &&
      message.vnRpRestoreSolaTrackers !== true
    )
      content = expireSolaNsfwTracker(content, solaDepths?.get(message), (offset, text) =>
        options.onHistoryRemoval?.(message, offset, text),
      );
    if (
      settings.solaSexTrackerEnabled &&
      familyOf(preset) === "sola" &&
      placement === PLACEMENT_AI_OUTPUT &&
      message.vnRpRestoreSolaTrackers !== true
    )
      content = expireSolaSexTracker(content, solaDepths?.get(message), (offset, text) =>
        options.onHistoryRemoval?.(message, offset, text),
      );
    return {
      ...message,
      content,
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
    const match = String(message.memo ?? "").match(/^(?:ff54:|vn-rp:sola:)absolute:([0-9]+):/);
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
  const hostMessages = messages
    .filter((message) => !isPluginMemo(message.memo))
    .map((message) => {
      // Remove only a suffix added by this plugin when rebuilding a request.
      const { vnRpGemmaFixSuffix: suffix, ...hostMessage } = message;
      if (typeof suffix === "string" && hostMessage.content.endsWith(suffix))
        hostMessage.content = hostMessage.content.slice(0, -suffix.length);
      return hostMessage;
    });
  let nsfwPatternBan = "";
  if (familyOf(preset) === "sola" && settings.solaNsfwTrackerEnabled) {
    const latestResponse = [...hostMessages]
      .reverse()
      .find((message) => message.role === "assistant" && !isChatComment(message));
    for (let index = 0; index < hostMessages.length; index += 1) {
      const message = hostMessages[index]!;
      if (message.role !== "assistant" || isChatComment(message)) continue;
      const extracted = splitSolaNsfwTracker(message.content);
      const patterns = extracted.patterns || message.vnRpNsfwTracker || "";
      if (message === latestResponse) nsfwPatternBan = solaNsfwPatternBanPrompt(patterns);
      hostMessages[index] = {
        ...message,
        content: extracted.content,
        ...(patterns ? { vnRpNsfwTracker: patterns } : {}),
      };
    }
  }
  const requestHistory = applyRequestFiltersToMessages(hostMessages, preset, settings);
  const composed = await composePresetPrompts(preset, settings, parseHostMacros, macroContext);
  if (settings.gemmaFixEnabled) {
    for (let index = requestHistory.length - 1; index >= 0; index -= 1) {
      const message = requestHistory[index]!;
      if (message.role !== "user") continue;
      const suffix = `\n\n${await parseHostMacros(gemmaFixPromptFor(settings.gemmaFixNsfwLevel), "user")}`;
      requestHistory[index] = {
        ...message,
        content: `${message.content}${suffix}`,
        vnRpGemmaFixSuffix: suffix,
      };
      break;
    }
  }
  const historyWithPrompts = injectAbsoluteAtDepth(requestHistory, composed.absolute);
  if (settings.cardImageCatalogEnabled) {
    const content = cardImagePrompt(macroContext.cardImageCatalog);
    if (content) {
      for (let index = historyWithPrompts.length - 1; index >= 0; index -= 1) {
        const message = historyWithPrompts[index]!;
        if (message.role !== "user" || isPluginMemo(message.memo)) continue;
        historyWithPrompts.splice(index + 1, 0, {
          role: "user",
          content,
          memo: `${pluginMemoPrefix(preset)}card-image-catalog`,
        });
        break;
      }
    }
  }
  if (nsfwPatternBan) {
    // Keep the ban adjacent to the real user message, after its Gemma suffix,
    // even when a card-image catalog or absolute prompts are also injected.
    let index = historyWithPrompts.length;
    for (let candidate = historyWithPrompts.length - 1; candidate >= 0; candidate -= 1) {
      const message = historyWithPrompts[candidate]!;
      if (message.role !== "user" || isPluginMemo(message.memo)) continue;
      index = candidate + 1;
      break;
    }
    historyWithPrompts.splice(index, 0, {
      role: "user",
      content: nsfwPatternBan,
      memo: `${pluginMemoPrefix(preset)}nsfw-pattern-ban`,
    });
  }
  const requestHistoryWithoutInternalMarkers = historyWithPrompts.map((message) => {
    const publicMessage = { ...message };
    delete publicMessage.vnRpRestoreSolaTrackers;
    return publicMessage;
  });
  return [
    ...composed.leading,
    ...(settings.vietnameseOutputEnabled
      ? [
          {
            role: "system" as const,
            content: vietnameseOutputFor(preset, settings),
            memo: `${pluginMemoPrefix(preset)}vietnamese-output`,
          },
        ]
      : []),
    ...requestHistoryWithoutInternalMarkers,
    ...composed.trailing,
  ];
}
