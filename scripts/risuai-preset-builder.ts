import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface RisuAiPrompt {
  identifier: string;
  name?: string;
  content?: unknown;
  role?: string;
  injection_position?: number;
  injection_depth?: number;
  [key: string]: unknown;
}

export interface RisuAiOrderEntry {
  identifier: string;
  enabled?: boolean;
  [key: string]: unknown;
}

export interface RisuAiPreset {
  prompts: RisuAiPrompt[];
  prompt_order: Array<{ order: RisuAiOrderEntry[]; [key: string]: unknown }>;
  extensions?: { regex_scripts?: unknown[]; [key: string]: unknown };
  [key: string]: unknown;
}

export interface RisuAiBuildConfig {
  /** JSON preset to read. */
  sourceFile: string;
  /** Directory receiving MASTER_PROMPT.md and INTRODUCTION.md. */
  outputDirectory: string;
  /** Which prompt_order group to use. The source preset normally has one group. */
  orderIndex?: number;
  /** Include entries disabled in the source order. Individual overrides still win. */
  includeDisabled?: boolean;
  /** Per-identifier toggle overrides applied after the source enabled flag. */
  enabledOverrides?: Record<string, boolean>;
  /** Separator between verbatim prompt blocks in MASTER_PROMPT.md. */
  separator?: string;
  /** Include root-level RisuAI control fields in INTRODUCTION.md. */
  includeRootFields?: boolean;
}

export interface SelectedPrompt {
  order: number;
  entry: RisuAiOrderEntry;
  prompt: RisuAiPrompt;
  content: string;
}

export interface RuntimeSlot {
  order: number;
  entry: RisuAiOrderEntry;
  prompt: RisuAiPrompt;
}

export interface RisuAiBuildResult {
  master: string;
  introduction: string;
  selectedPrompts: SelectedPrompt[];
  runtimeSlots: RuntimeSlot[];
  enabledEntries: number;
  disabledEntries: number;
  regexScriptCount: number;
  masterDigest: string;
  outputFiles: { master: string; introduction: string };
}

const DEFAULT_SEPARATOR = "\n\n---\n\n";
const DEFAULT_ORDER_INDEX = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`RisuAI preset field ${field} must be a string.`);
  }

  return value;
}

function parsePrompt(value: unknown, index: number): RisuAiPrompt {
  if (!isRecord(value)) {
    throw new Error(`Prompt at index ${index} must be an object.`);
  }

  return {
    ...value,
    identifier: requiredString(value.identifier, `prompts[${index}].identifier`),
  };
}

function parseOrderEntry(value: unknown, index: number): RisuAiOrderEntry {
  if (!isRecord(value)) {
    throw new Error(`prompt_order entry at index ${index} must be an object.`);
  }

  const identifier = requiredString(value.identifier, `prompt_order.order[${index}].identifier`);

  if (value.enabled !== undefined && typeof value.enabled !== "boolean") {
    throw new Error(`prompt_order.order[${index}].enabled must be a boolean.`);
  }

  return { ...value, identifier };
}

export function parsePreset(value: unknown): RisuAiPreset {
  if (!isRecord(value)) {
    throw new Error("RisuAI preset root must be an object.");
  }

  if (!Array.isArray(value.prompts)) {
    throw new Error("RisuAI preset is missing a prompts array.");
  }

  if (!Array.isArray(value.prompt_order) || value.prompt_order.length === 0) {
    throw new Error("RisuAI preset is missing a non-empty prompt_order array.");
  }

  const prompts = value.prompts.map(parsePrompt);
  const promptOrder = value.prompt_order.map((group, groupIndex) => {
    if (!isRecord(group) || !Array.isArray(group.order)) {
      throw new Error(`prompt_order[${groupIndex}] must contain an order array.`);
    }

    return {
      ...group,
      order: group.order.map(parseOrderEntry),
    };
  });

  const identifiers = new Set<string>();
  for (const prompt of prompts) {
    if (identifiers.has(prompt.identifier)) {
      throw new Error(`Duplicate prompt identifier: ${prompt.identifier}`);
    }
    identifiers.add(prompt.identifier);
  }

  return {
    ...value,
    prompts,
    prompt_order: promptOrder,
  };
}

export async function readPreset(sourceFile: string): Promise<RisuAiPreset> {
  const raw = await readFile(path.resolve(sourceFile), "utf8");

  try {
    return parsePreset(JSON.parse(raw) as unknown);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${sourceFile}: ${error.message}`);
    }

    throw error;
  }
}

function getPromptMap(prompts: RisuAiPrompt[]): Map<string, RisuAiPrompt> {
  return new Map(prompts.map((prompt) => [prompt.identifier, prompt]));
}

function escapeTableCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", "<br>");
}

function formatRootValue(value: unknown): string {
  if (typeof value !== "string") {
    return String(value);
  }

  if (value.length === 0) {
    return "_(empty string)_";
  }

  return `~~~text\n${value}\n~~~`;
}

function rootFieldEntries(preset: RisuAiPreset): Array<[string, unknown]> {
  const preferred = [
    "impersonation_prompt",
    "new_chat_prompt",
    "new_group_chat_prompt",
    "new_example_chat_prompt",
    "continue_nudge_prompt",
    "group_nudge_prompt",
    "scenario_format",
    "personality_format",
    "wi_format",
  ];
  const fields = new Set(["prompts", "prompt_order", "extensions"]);
  const entries: Array<[string, unknown]> = [];

  for (const key of preferred) {
    if (key in preset) {
      entries.push([key, preset[key]]);
      fields.add(key);
    }
  }

  for (const key of Object.keys(preset).sort()) {
    if (!fields.has(key)) {
      entries.push([key, preset[key]]);
    }
  }

  return entries;
}

function renderIntroduction(
  preset: RisuAiPreset,
  config: RisuAiBuildConfig,
  selectedPrompts: SelectedPrompt[],
  runtimeSlots: RuntimeSlot[],
  promptMap: Map<string, RisuAiPrompt>,
  order: RisuAiOrderEntry[],
  enabledEntries: number,
  disabledEntries: number,
  regexScriptCount: number,
): string {
  const source = path.resolve(config.sourceFile).replaceAll("\\", "/");
  const orderIndex = config.orderIndex ?? DEFAULT_ORDER_INDEX;
  const lines: string[] = [
    "<!-- Generated by scripts/build-risuai-preset.ts. Prompt text is copied verbatim. -->",
    `<!-- Source: ${source} -->`,
    "",
    "# RisuAI preset extraction",
    "",
    "This file records the source configuration and extraction metadata for the accompanying `MASTER_PROMPT.md`.",
    "The master contains only non-empty prompt content selected from the configured prompt order; separators are builder scaffolding.",
    "",
    "## Build configuration",
    "",
    `- Prompt-order group: ${orderIndex}`,
    `- Source-enabled entries: ${enabledEntries}`,
    `- Source-disabled entries: ${disabledEntries}`,
    `- Extracted prompt blocks: ${selectedPrompts.length}`,
    `- Runtime slots: ${runtimeSlots.length}`,
    `- Regex scripts in source (excluded from master): ${regexScriptCount}`,
    `- Include disabled entries: ${config.includeDisabled === true ? "yes" : "no"}`,
    "",
  ];

  if (config.enabledOverrides && Object.keys(config.enabledOverrides).length > 0) {
    lines.push("### Enabled overrides", "");
    for (const identifier of Object.keys(config.enabledOverrides).sort()) {
      lines.push(`- \`${identifier}\`: ${config.enabledOverrides[identifier] ? "ON" : "OFF"}`);
    }
    lines.push("");
  }

  if (config.includeRootFields !== false) {
    lines.push("## Root prompt fields", "");
    for (const [key, value] of rootFieldEntries(preset)) {
      lines.push(`### \`${key}\``, "", formatRootValue(value), "");
    }
  }

  lines.push(
    "## Ordered entries",
    "",
    "Entries below follow the selected prompt_order group. Empty content is a runtime slot and is documented separately.",
    "",
    "| Order | State | Identifier | Name | Role | Injection | Content |",
    "| ---: | :---: | --- | --- | --- | --- | ---: |",
  );

  const selectedByIdentifier = new Map(
    selectedPrompts.map((item) => [item.entry.identifier, item]),
  );
  const runtimeByIdentifier = new Map(runtimeSlots.map((item) => [item.entry.identifier, item]));
  for (const [index, entry] of order.entries()) {
    const selected = selectedByIdentifier.get(entry.identifier);
    const runtime = runtimeByIdentifier.get(entry.identifier);
    const prompt = selected?.prompt ?? runtime?.prompt ?? promptMap.get(entry.identifier);
    if (!prompt) {
      throw new Error(`Internal error: no prompt metadata for ${entry.identifier}.`);
    }

    const state = selected || runtime ? "ON" : "OFF";
    const injection =
      prompt.injection_position === undefined
        ? "runtime"
        : `${prompt.injection_position}${prompt.injection_depth === undefined ? "" : ` / ${prompt.injection_depth}`}`;
    const contentLength = typeof prompt.content === "string" ? prompt.content.length : 0;
    lines.push(
      `| ${index + 1} | ${state} | ${escapeTableCell(entry.identifier)} | ${escapeTableCell(String(prompt.name ?? ""))} | ${escapeTableCell(String(prompt.role ?? ""))} | ${injection} | ${contentLength} |`,
    );
  }

  lines.push("", "## Runtime slots", "");
  if (runtimeSlots.length === 0) {
    lines.push("_(none)_", "");
  } else {
    lines.push(
      "These enabled entries have no static `content` in the source and are expected to be filled by RisuAI at runtime:",
      "",
    );
    for (const slot of runtimeSlots) {
      lines.push(`- \`${slot.entry.identifier}\` — ${slot.prompt.name ?? "(unnamed)"}`);
    }
    lines.push("");
  }

  lines.push(
    "## Extraction scope",
    "",
    "Prompt blocks retain their source strings exactly. Disabled entries, entries outside the selected prompt order, and `extensions.regex_scripts` are excluded from `MASTER_PROMPT.md`.",
    "",
  );

  return lines.join("\n");
}

export function buildPreset(preset: RisuAiPreset, config: RisuAiBuildConfig): RisuAiBuildResult {
  const orderIndex = config.orderIndex ?? DEFAULT_ORDER_INDEX;
  if (!Number.isInteger(orderIndex) || orderIndex < 0) {
    throw new Error("orderIndex must be a non-negative integer.");
  }

  const selectedOrder = preset.prompt_order[orderIndex];
  if (!selectedOrder) {
    throw new Error(`prompt_order group ${orderIndex} does not exist.`);
  }

  const promptMap = getPromptMap(preset.prompts);
  const enabledOverrides = config.enabledOverrides ?? {};
  const selectedPrompts: SelectedPrompt[] = [];
  const runtimeSlots: RuntimeSlot[] = [];
  let enabledEntries = 0;
  let disabledEntries = 0;

  for (const [index, entry] of selectedOrder.order.entries()) {
    const sourceEnabled = entry.enabled === true;
    if (sourceEnabled) {
      enabledEntries += 1;
    } else {
      disabledEntries += 1;
    }

    const enabled = Object.prototype.hasOwnProperty.call(enabledOverrides, entry.identifier)
      ? enabledOverrides[entry.identifier]
      : sourceEnabled || config.includeDisabled === true;
    if (!enabled) {
      continue;
    }

    const prompt = promptMap.get(entry.identifier);
    if (!prompt) {
      throw new Error(`prompt_order references unknown prompt identifier: ${entry.identifier}`);
    }

    if (typeof prompt.content === "string" && prompt.content.length > 0) {
      selectedPrompts.push({ order: index + 1, entry, prompt, content: prompt.content });
    } else {
      runtimeSlots.push({ order: index + 1, entry, prompt });
    }
  }

  const separator = config.separator ?? DEFAULT_SEPARATOR;
  const master = `${selectedPrompts.map(({ content }) => content).join(separator)}\n`;
  const regexScriptCount = Array.isArray(preset.extensions?.regex_scripts)
    ? preset.extensions.regex_scripts.length
    : 0;
  const introduction = renderIntroduction(
    preset,
    config,
    selectedPrompts,
    runtimeSlots,
    promptMap,
    selectedOrder.order,
    enabledEntries,
    disabledEntries,
    regexScriptCount,
  );
  const outputDirectory = path.resolve(config.outputDirectory);

  return {
    master,
    introduction,
    selectedPrompts,
    runtimeSlots,
    enabledEntries,
    disabledEntries,
    regexScriptCount,
    masterDigest: createHash("sha256").update(master).digest("hex"),
    outputFiles: {
      master: path.join(outputDirectory, "MASTER_PROMPT.md"),
      introduction: path.join(outputDirectory, "INTRODUCTION.md"),
    },
  };
}

export async function buildRisuAiPreset(
  config: RisuAiBuildConfig,
  write = true,
): Promise<RisuAiBuildResult> {
  const preset = await readPreset(config.sourceFile);
  const result = buildPreset(preset, config);

  if (write) {
    await mkdir(path.resolve(config.outputDirectory), { recursive: true });
    await Promise.all([
      writeFile(result.outputFiles.master, result.master, "utf8"),
      writeFile(result.outputFiles.introduction, result.introduction, "utf8"),
    ]);
  }

  return result;
}
