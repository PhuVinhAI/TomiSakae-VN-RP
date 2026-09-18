import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { buildRisuAiPreset, type PromptRouter } from "./risuai-preset-builder.js";

const BOLT_REASONING_IDENTIFIER = "634ecfec-1862-4ce0-821e-e31057acadfa";
const REVIEW_FILE = "FF54_MINIMALITY_REVIEW.md";

function rawPromptRouter(): PromptRouter {
  return {
    active: "raw-review",
    routes: {
      "raw-review": {
        reasoningIdentifiers: [BOLT_REASONING_IDENTIFIER, "jailbreak"],
      },
    },
  };
}

async function unifiedDiff(label: string, original: string, current: string): Promise<string> {
  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "ff54-review-"));
  const originalFile = path.join(tempDirectory, "raw.md");
  const currentFile = path.join(tempDirectory, "current.md");

  try {
    await Promise.all([
      writeFile(originalFile, original, "utf8"),
      writeFile(currentFile, current, "utf8"),
    ]);
    try {
      return execFileSync(
        "git",
        [
          "diff",
          "--no-index",
          "--no-color",
          "--no-ext-diff",
          "--unified=3",
          "--src-prefix=raw/",
          "--dst-prefix=current/",
          path.basename(originalFile),
          path.basename(currentFile),
        ],
        { cwd: tempDirectory, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
      );
    } catch (error) {
      const result = error as { status?: number; stdout?: string };
      if (result.status === 1 && typeof result.stdout === "string") return result.stdout;
      throw error;
    }
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

function fenced(content: string): string {
  return `~~~~text\n${content.trimEnd()}\n~~~~`;
}

export async function run(argv: string[]): Promise<number> {
  const program = new Command()
    .name("build-risuai-comparison")
    .description("Build current and untouched FF5.4 prompt pairs plus one review document.")
    .requiredOption("-s, --source <file>", "source RisuAI preset JSON file")
    .option(
      "-o, --output-directory <directory>",
      "directory receiving the comparison artifacts",
      "risuai/freaky-frankenstein-5.4-comparison",
    )
    .showHelpAfterError()
    .exitOverride();

  try {
    program.parse(argv, { from: "user" });
    const options = program.opts<{ source: string; outputDirectory: string }>();
    const sourceFile = path.resolve(options.source);
    const outputDirectory = path.resolve(options.outputDirectory);

    const [current, raw] = await Promise.all([
      buildRisuAiPreset(
        {
          sourceFile,
          outputDirectory,
          modelMode: "gemma-4",
        },
        false,
      ),
      buildRisuAiPreset(
        {
          sourceFile,
          outputDirectory,
          promptRouter: rawPromptRouter(),
        },
        false,
      ),
    ]);

    const artifacts = {
      currentMaster: path.join(outputDirectory, "CURRENT_MASTER_PROMPT.md"),
      currentResponse: path.join(outputDirectory, "CURRENT_RESPONSE_RULES.md"),
      rawMaster: path.join(outputDirectory, "RAW_MASTER_PROMPT.md"),
      rawResponse: path.join(outputDirectory, "RAW_RESPONSE_RULES.md"),
      review: path.join(outputDirectory, REVIEW_FILE),
    };

    await mkdir(outputDirectory, { recursive: true });
    await Promise.all([
      writeFile(artifacts.currentMaster, current.master, "utf8"),
      writeFile(artifacts.currentResponse, current.reasoning, "utf8"),
      writeFile(artifacts.rawMaster, raw.master, "utf8"),
      writeFile(artifacts.rawResponse, raw.reasoning, "utf8"),
    ]);

    const [masterDiff, responseDiff] = await Promise.all([
      unifiedDiff("MASTER_PROMPT.md", raw.master, current.master),
      unifiedDiff("RESPONSE_RULES.md", raw.reasoning, current.reasoning),
    ]);
    const sourceBytes = (await readFile(sourceFile)).byteLength;
    const review = [
      "# FF5.4 Minimality and Style Review",
      "",
      "## Review Goal",
      "",
      "Compare the untouched source build with the current cleaned Gemma 4 build. Treat the community-tested English FF5.4 behavior as authoritative. Determine whether every deletion or rewrite is necessary, whether unchanged instructions retain their original cadence and force, and whether edited text uses the same terse labels, imperatives, sentence rhythm, terminology, and structural conventions as the surrounding source. Prefer the smallest correct change. Flag any semantic weakening, broadened scope, new behavior, duplicated rule, unnecessary translation of internal instruction text, or stylistic wording that sounds unlike FF5.4.",
      "",
      "The raw build uses the source JSON's existing ON/OFF states. It applies no cleanup, no external Vietnamese module, no Gemma 4 transform, and no exclusions. It only routes the source BOLT reasoning block and post-history instruction block into the response-rules file so both builds can be compared as the same two-part shape. Source regex scripts remain outside prompt extraction in both builds.",
      "",
      "## Build Facts",
      "",
      `- Source: \`${sourceFile.replaceAll("\\", "/")}\``,
      `- Source bytes: ${sourceBytes}`,
      `- Raw selected prompt blocks: ${raw.selectedPrompts.length}`,
      `- Raw master blocks: ${raw.masterPrompts.length}`,
      `- Raw response-rule blocks: ${raw.reasoningPrompts.length}`,
      `- Current selected prompt blocks: ${current.selectedPrompts.length}`,
      `- Current master blocks: ${current.masterPrompts.length} + ${current.externalMasterModules.length} external module`,
      `- Current response-rule blocks: ${current.reasoningPrompts.length}`,
      `- Raw master SHA-256: \`${raw.masterDigest}\``,
      `- Current master SHA-256: \`${current.masterDigest}\``,
      `- Raw response rules SHA-256: \`${raw.reasoningDigest}\``,
      `- Current response rules SHA-256: \`${current.reasoningDigest}\``,
      "",
      "## Questions for the Reviewer",
      "",
      "1. Are the cleanup deletions limited to toggle comments, runtime/presentation macros, output UI/HTML/status syntax, and intentionally disabled internal engines? Confirm that substantive rules, numeric state mechanics, `<formatting_constraints>`, and `<professional_legality>` remain intact.",
      "2. Does any retained behavior from the raw prompt disappear or weaken unintentionally?",
      "3. Does every rewritten line preserve the original instruction's trigger, scope, priority, and force?",
      "4. Do the edits match FF5.4's terse label-first structure and direct imperative cadence?",
      "5. Is Vietnamese confined to reader-facing examples, dialogue/vocalization tokens, pronouns, conjunction tokens, banned/required output vocabulary, and the dedicated Vietnamese output module?",
      "6. Could any edit be reduced while keeping the same Gemma 4 compatibility or RisuAI behavior?",
      "7. Do the current master and response rules conflict, duplicate one another, or create an output behavior absent from the raw source? Does reasoning reconstruct state only from available history and memory in the current context, prefer direct recent history on conflicts, count each event once, update the current turn once, fall back to default or neutral values when evidence is missing, and keep all state private?",
      "",
      "## Master Unified Diff",
      "",
      "```diff",
      masterDiff.trimEnd(),
      "```",
      "",
      "## Response Rules Unified Diff",
      "",
      "```diff",
      responseDiff.trimEnd(),
      "```",
      "",
      "## Raw Master Prompt",
      "",
      fenced(raw.master),
      "",
      "## Current Master Prompt",
      "",
      fenced(current.master),
      "",
      "## Raw Response Rules",
      "",
      fenced(raw.reasoning),
      "",
      "## Current Response Rules",
      "",
      fenced(current.reasoning),
      "",
    ]
      .join("\n")
      .replace(/[ \t]+$/gm, "");

    await writeFile(artifacts.review, review, "utf8");
    process.stdout.write(
      `Built FF5.4 comparison in ${outputDirectory}\nReview: ${artifacts.review}\n`,
    );
    return 0;
  } catch (error) {
    if (error instanceof Error) {
      process.stderr.write(`${error.message}\n`);
      return 1;
    }
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await run(process.argv.slice(2));
}
