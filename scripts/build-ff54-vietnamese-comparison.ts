import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import {
  adaptPromptForVietnamese,
  VIETNAMESE_OUTPUT_PROMPT,
  VIETNAMESE_OUTPUT_REPLACEMENTS,
  VIETNAMESE_REASONING_REPLACEMENTS,
} from "../risuai/freaky-frankenstein-5.4-plugin/src/vietnamese.js";

const DEFAULT_SOURCE = "risuai/freaky-frankenstein-5.4-plugin/source/ff54-sillytavern-preset.json";
const DEFAULT_OUTPUT_DIRECTORY = "risuai/freaky-frankenstein-5.4-plugin/comparison";

interface SourcePrompt {
  identifier: string;
  name?: string;
  content?: unknown;
  role?: string;
  injection_position?: number;
  injection_depth?: number;
  injection_order?: number;
}

interface SourceOrderEntry {
  identifier: string;
  enabled?: boolean;
}

interface SourcePreset {
  prompts: SourcePrompt[];
  prompt_order: Array<{ order: SourceOrderEntry[] }>;
}

function validatePreset(value: unknown): asserts value is SourcePreset {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Preset root must be an object.");
  }
  const preset = value as Record<string, unknown>;
  if (!Array.isArray(preset.prompts)) throw new Error("Preset is missing prompts[].");
  if (!Array.isArray(preset.prompt_order) || preset.prompt_order.length === 0) {
    throw new Error("Preset is missing prompt_order[].");
  }
  const firstOrder = preset.prompt_order[0] as Record<string, unknown> | undefined;
  if (!firstOrder || !Array.isArray(firstOrder.order)) {
    throw new Error("Preset is missing prompt_order[0].order[].");
  }
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function fenced(value: string): string {
  const normalized = value
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join("\n")
    .trimEnd();
  return `~~~~text\n${normalized}\n~~~~`;
}

function renderPrompt(
  prompt: SourcePrompt,
  entry: SourceOrderEntry,
  index: number,
  transform: (content: string) => string,
): string {
  const state = entry.enabled === false ? "OFF" : "ON";
  const metadata = [
    `Identifier: \`${prompt.identifier}\``,
    `Source toggle: **${state}**`,
    `Role: \`${prompt.role ?? "system"}\``,
    `Injection position: \`${prompt.injection_position ?? "relative/default"}\``,
    `Injection depth: \`${prompt.injection_depth ?? "default"}\``,
    `Injection order: \`${prompt.injection_order ?? "default"}\``,
  ].join(" · ");
  const content =
    typeof prompt.content === "string" ? transform(prompt.content) : "[No prompt content]";
  return [
    `## ${String(index).padStart(2, "0")}. ${state} — ${prompt.name ?? prompt.identifier}`,
    "",
    metadata,
    "",
    fenced(content),
  ].join("\n");
}

function renderDocument(
  title: string,
  sourceFile: string,
  sourceDigest: string,
  preset: SourcePreset,
  transform: (content: string) => string,
  includeVietnameseModule: boolean,
): string {
  const prompts = new Map(preset.prompts.map((prompt) => [prompt.identifier, prompt]));
  const order = preset.prompt_order[0]?.order ?? [];
  const sections = order.map((entry, index) => {
    const prompt = prompts.get(entry.identifier);
    if (!prompt) throw new Error(`Prompt order references missing prompt: ${entry.identifier}`);
    return renderPrompt(prompt, entry, index, transform);
  });
  const orderedIdentifiers = new Set(order.map((entry) => entry.identifier));
  const orphanedPrompts = preset.prompts.filter(
    (prompt) => !orderedIdentifiers.has(prompt.identifier),
  );
  if (orphanedPrompts.length > 0) {
    sections.push(
      [
        "# Prompts outside `prompt_order`",
        "",
        "These source prompts cannot be toggled or composed by the current preset order. They are included for a complete translation review.",
        "",
        ...orphanedPrompts.map((prompt, index) =>
          renderPrompt(
            prompt,
            { identifier: prompt.identifier, enabled: false },
            order.length + index,
            transform,
          ),
        ),
      ].join("\n"),
    );
  }
  if (includeVietnameseModule) {
    sections.unshift(
      [
        "## Plugin module — ON — 🇻🇳 Vietnamese Output",
        "",
        "Identifier: `ff54:vietnamese-output` · Source toggle: **plugin default ON** · Role: `system`",
        "",
        fenced(VIETNAMESE_OUTPUT_PROMPT),
      ].join("\n"),
    );
  }
  return [
    `# ${title}`,
    "",
    `Source: \`${sourceFile.replaceAll("\\", "/")}\``,
    `Source SHA-256: \`${sourceDigest}\``,
    `Source prompts: ${preset.prompts.length}`,
    `Ordered source entries: ${order.length}`,
    `Prompts outside prompt_order: ${orphanedPrompts.length}`,
    "",
    "This document includes every prompt-order entry, including modules whose source toggle is OFF. Toggle comments, macros, tags, HTML/CSS, schema labels, and machine syntax remain visible so a reviewer can verify that the Vietnamese adapter changes only reader-facing output language.",
    "",
    ...sections,
    "",
  ].join("\n");
}

function renderReviewPair(prompt: SourcePrompt, entry: SourceOrderEntry, index: number): string {
  const state = entry.enabled === false ? "OFF" : "ON";
  const original = typeof prompt.content === "string" ? prompt.content : "[No prompt content]";
  const adapted = adaptPromptForVietnamese(original);
  const changed = adapted !== original;
  const metadata = [
    `Identifier: \`${prompt.identifier}\``,
    `Source toggle: **${state}**`,
    `Changed by adapter: **${changed ? "YES" : "NO"}**`,
    `Role: \`${prompt.role ?? "system"}\``,
    `Injection position: \`${prompt.injection_position ?? "relative/default"}\``,
    `Injection depth: \`${prompt.injection_depth ?? "default"}\``,
    `Injection order: \`${prompt.injection_order ?? "default"}\``,
  ].join(" · ");
  return [
    `## ${String(index).padStart(2, "0")}. ${state} — ${prompt.name ?? prompt.identifier}`,
    "",
    metadata,
    "",
    "### English source",
    "",
    fenced(original),
    "",
    "### Vietnamese-adapted",
    "",
    fenced(adapted),
  ].join("\n");
}

function renderReplacementInventory(): string {
  const pairs = [
    ...VIETNAMESE_OUTPUT_REPLACEMENTS.map((pair) => ({ scope: "Prompt module", pair })),
    ...VIETNAMESE_REASONING_REPLACEMENTS.map((pair) => ({ scope: "Reasoning rule", pair })),
  ];
  return [
    "# Exact replacement inventory",
    "",
    "Review every pair by the function of the changed text, not merely by whether it appears inside an English instruction. A quoted GOOD/BAD sentence, dialogue line, narration sample, vocalization, pronoun, conjunction, or vocabulary item may be reader-visible output and therefore may require Vietnamese even when embedded in an instructional example.",
    "",
    ...pairs.map(({ scope, pair }, index) =>
      [
        `## R${String(index + 1).padStart(3, "0")} — ${scope}`,
        "",
        "### English source fragment",
        "",
        fenced(pair[0]),
        "",
        "### Vietnamese replacement fragment",
        "",
        fenced(pair[1]),
      ].join("\n"),
    ),
  ].join("\n");
}

function renderCombinedReview(
  sourceFile: string,
  sourceDigest: string,
  preset: SourcePreset,
): string {
  const prompts = new Map(preset.prompts.map((prompt) => [prompt.identifier, prompt]));
  const order = preset.prompt_order[0]?.order ?? [];
  const orderedIdentifiers = new Set(order.map((entry) => entry.identifier));
  const orphanedPrompts = preset.prompts.filter(
    (prompt) => !orderedIdentifiers.has(prompt.identifier),
  );
  const orderedSections = order.map((entry, index) => {
    const prompt = prompts.get(entry.identifier);
    if (!prompt) throw new Error(`Prompt order references missing prompt: ${entry.identifier}`);
    return renderReviewPair(prompt, entry, index);
  });
  const orphanedSections = orphanedPrompts.map((prompt, index) =>
    renderReviewPair(
      prompt,
      { identifier: prompt.identifier, enabled: false },
      order.length + index,
    ),
  );
  const changedCount = preset.prompts.filter((prompt) => {
    const content = typeof prompt.content === "string" ? prompt.content : "";
    return adaptPromptForVietnamese(content) !== content;
  }).length;

  return [
    "# FF5.4 English/Vietnamese Adapter Review",
    "",
    `Source: \`${sourceFile.replaceAll("\\", "/")}\``,
    `Source SHA-256: \`${sourceDigest}\``,
    `Source prompts: ${preset.prompts.length}`,
    `Ordered source entries: ${order.length}`,
    `Prompts outside prompt_order: ${orphanedPrompts.length}`,
    `Source prompts changed by adapter: ${changedCount}`,
    "",
    "## Review objective",
    "",
    "Verify that the Vietnamese adapter changes only text the model may reproduce directly in reader-visible roleplay output. Do not classify a passage solely by its position inside an instruction: quoted GOOD/BAD prose, dialogue, narration, vocalizations, interjections, pronouns, conjunctions, and output vocabulary are output samples or tokens and may need Vietnamese adaptation.",
    "",
    "## Mandatory review checklist",
    "",
    "- [ ] Preserve English control instructions, explanations, reasoning questions, module names, and rule labels unless a minimal reference to Vietnamese output is operationally required.",
    "- [ ] Translate reader-visible sample prose inside GOOD/BAD or other instructional examples when the model may imitate that prose in its response.",
    "- [ ] Translate quoted sample dialogue, narration, vocalizations, interjections, and other literal response text while preserving the surrounding English instruction.",
    "- [ ] Translate output pronoun and conjunction tokens only where they directly constrain Vietnamese narration or spoken dialogue.",
    "- [ ] Translate banned, required, allowed, and discouraged output vocabulary so those lists govern Vietnamese generation rather than irrelevant English wording.",
    "- [ ] Translate reader-visible FF5.4 headers, internal-state labels, placeholders, and generated values while preserving their structure and updating dependent regex compatibility.",
    "- [ ] Preserve tags, HTML/CSS, comments, macros, event codes, commands, identifiers, and machine syntax exactly.",
    "- [ ] Reject broad rewrites of English instructions made only for style, simplification, or explanation.",
    "- [ ] Check that every replacement preserves the original rule's force, scope, polarity, and FF5.4 rhythm.",
    "- [ ] Check that Vietnamese samples are natural contemporary Vietnamese and do not introduce translationese, unintended setting, gender, relationship, or intensity changes.",
    "- [ ] Check OFF modules and prompts outside `prompt_order` as carefully as active modules; they may be enabled by later configurations.",
    "",
    "## Plugin-only Vietnamese output module",
    "",
    "This block has no English-source counterpart in the JSON preset. Review whether it controls reader-visible language without translating or altering FF5.4 machine syntax.",
    "",
    fenced(VIETNAMESE_OUTPUT_PROMPT),
    "",
    renderReplacementInventory(),
    "",
    "# Ordered prompt modules",
    "",
    ...orderedSections,
    "",
    "# Prompts outside `prompt_order`",
    "",
    "These prompts are not composed by the current source order, but are included so the adapter can be reviewed completely.",
    "",
    ...orphanedSections,
    "",
  ].join("\n");
}

export async function buildVietnameseComparison(options: {
  sourceFile: string;
  outputDirectory: string;
}): Promise<{ originalFile: string; vietnameseFile: string; reviewFile: string }> {
  const sourceFile = path.resolve(options.sourceFile);
  const outputDirectory = path.resolve(options.outputDirectory);
  const raw = await readFile(sourceFile, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  validatePreset(parsed);

  const original = renderDocument(
    "FF5.4 Original — All Prompt Modules",
    sourceFile,
    digest(raw),
    parsed,
    (content) => content,
    false,
  );
  const vietnamese = renderDocument(
    "FF5.4 Vietnamese Adapter — All Prompt Modules",
    sourceFile,
    digest(raw),
    parsed,
    adaptPromptForVietnamese,
    true,
  );
  const review = renderCombinedReview(sourceFile, digest(raw), parsed);
  const originalFile = path.join(outputDirectory, "FF54_ORIGINAL_ALL_MODULES.md");
  const vietnameseFile = path.join(outputDirectory, "FF54_VIETNAMESE_ALL_MODULES.md");
  const reviewFile = path.join(outputDirectory, "FF54_EN_VI_REVIEW.md");
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    writeFile(originalFile, original, "utf8"),
    writeFile(vietnameseFile, vietnamese, "utf8"),
    writeFile(reviewFile, review, "utf8"),
  ]);
  return { originalFile, vietnameseFile, reviewFile };
}

export async function run(argv: string[]): Promise<number> {
  const program = new Command()
    .name("build-ff54-vietnamese-comparison")
    .description("Build original and Vietnamese-adapted FF5.4 files containing every module.")
    .option("-s, --source <file>", "source FF5.4 preset JSON", DEFAULT_SOURCE)
    .option(
      "-o, --output-directory <directory>",
      "directory receiving the two comparison files",
      DEFAULT_OUTPUT_DIRECTORY,
    )
    .showHelpAfterError()
    .exitOverride();

  try {
    program.parse(argv, { from: "user" });
    const options = program.opts<{ source: string; outputDirectory: string }>();
    const result = await buildVietnameseComparison({
      sourceFile: options.source,
      outputDirectory: options.outputDirectory,
    });
    process.stdout.write(
      `Built FF5.4 Vietnamese comparison:\n${result.originalFile}\n${result.vietnameseFile}\n${result.reviewFile}\n`,
    );
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await run(process.argv.slice(2));
}
