import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { z } from "zod";
import {
  buildRisuAiPreset,
  DEFAULT_PROMPT_ROUTER,
  type RisuAiBuildConfig,
  type PromptRouter,
} from "./risuai-preset-builder.js";

const PromptCleanupSchema = z.object({
  toggleComments: z.boolean().optional(),
  presentationMacros: z.boolean().optional(),
  runtimeMacros: z.boolean().optional(),
  reasoningRules: z.boolean().optional(),
  obsoleteOutputInstructions: z.boolean().optional(),
  stateOutputSyntax: z.boolean().optional(),
  stateMetrics: z.boolean().optional(),
});

const PromptRouteSchema = z.object({
  masterModuleFiles: z.array(z.string()).optional(),
  reasoningIdentifiers: z.array(z.string()).optional(),
  introductionIdentifiers: z.array(z.string()).optional(),
  enabledIdentifiers: z.array(z.string()).optional(),
  excludedIdentifiers: z.array(z.string()).optional(),
  masterCleanup: PromptCleanupSchema.optional(),
  introductionCleanup: PromptCleanupSchema.optional(),
  reasoningCleanup: PromptCleanupSchema.optional(),
  includeDisabled: z.boolean().optional(),
});

const PromptRouterSchema = z.object({
  active: z.string().min(1),
  routes: z.record(z.string(), PromptRouteSchema),
});

const FileConfigSchema = z
  .object({
    sourceFile: z.string().min(1).optional(),
    outputDirectory: z.string().min(1).optional(),
    orderIndex: z.number().int().nonnegative().optional(),
    includeDisabled: z.boolean().optional(),
    enabledOverrides: z.record(z.string(), z.boolean()).optional(),
    separator: z.string().optional(),
    includeRootFields: z.boolean().optional(),
    promptRouter: PromptRouterSchema.optional(),
  })
  .passthrough();

async function readFileConfig(configFile: string): Promise<Partial<RisuAiBuildConfig>> {
  const raw = await readFile(path.resolve(configFile), "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${configFile}: ${error.message}`);
    }
    throw error;
  }

  const config = FileConfigSchema.parse(parsed);
  const result: Partial<RisuAiBuildConfig> = {};
  if (config.sourceFile !== undefined) result.sourceFile = config.sourceFile;
  if (config.outputDirectory !== undefined) result.outputDirectory = config.outputDirectory;
  if (config.orderIndex !== undefined) result.orderIndex = config.orderIndex;
  if (config.includeDisabled !== undefined) result.includeDisabled = config.includeDisabled;
  if (config.enabledOverrides !== undefined) result.enabledOverrides = config.enabledOverrides;
  if (config.separator !== undefined) result.separator = config.separator;
  if (config.includeRootFields !== undefined) result.includeRootFields = config.includeRootFields;
  if (config.promptRouter !== undefined) result.promptRouter = config.promptRouter as PromptRouter;
  return result;
}

function parseOverride(value: string): [string, boolean] {
  const separator = value.lastIndexOf("=");
  if (separator <= 0) {
    throw new Error(`Invalid --set-enabled value ${value}; expected identifier=on|off.`);
  }

  const identifier = value.slice(0, separator);
  const state = value.slice(separator + 1).toLowerCase();
  if (state !== "on" && state !== "off" && state !== "true" && state !== "false") {
    throw new Error(`Invalid --set-enabled state ${state}; expected on, off, true, or false.`);
  }

  return [identifier, state === "on" || state === "true"];
}

async function fileMatches(file: string, expected: string): Promise<boolean> {
  try {
    return (await readFile(file, "utf8")) === expected;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export async function run(argv: string[]): Promise<number> {
  const program = new Command()
    .name("build-risuai-preset")
    .description(
      "Extract an ordered RisuAI preset into master, reasoning, and metadata prompt files.",
    )
    .option("-s, --source <file>", "source RisuAI preset JSON file (or set sourceFile in --config)")
    .option(
      "-o, --output-directory <directory>",
      "directory for MASTER_PROMPT.md, REASONING_RULES.md, and INTRODUCTION.md",
    )
    .option("-c, --config <file>", "JSON build configuration merged before CLI overrides")
    .option("--order-index <number>", "prompt_order group index", (value) => Number(value))
    .option("--include-disabled", "include source-disabled order entries unless overridden", false)
    .option(
      "--set-enabled <identifier=on|off>",
      "override one entry; may be supplied more than once",
      (value: string, previous: string[] = []) => [...previous, value],
      [],
    )
    .option(
      "--without-root-fields",
      "omit root-level RisuAI control fields from introduction",
      false,
    )
    .option("--check", "check whether generated files are current without writing", false)
    .option("--route <name>", "override the active prompt router route")
    .showHelpAfterError()
    .exitOverride();

  try {
    program.parse(argv, { from: "user" });
    const options = program.opts<{
      source?: string;
      outputDirectory?: string;
      config?: string;
      orderIndex?: number;
      includeDisabled: boolean;
      setEnabled: string[];
      withoutRootFields: boolean;
      check: boolean;
      route?: string;
    }>();
    const fileConfig = options.config ? await readFileConfig(options.config) : {};
    const sourceFile = options.source ?? fileConfig.sourceFile;
    if (!sourceFile) {
      throw new Error("A source preset is required; pass --source or set sourceFile in --config.");
    }
    const outputDirectory =
      options.outputDirectory ??
      fileConfig.outputDirectory ??
      "risuai/freaky-frankenstein-5.4-internal-states";
    const enabledOverrides = {
      ...(fileConfig.enabledOverrides ?? {}),
      ...Object.fromEntries(options.setEnabled.map(parseOverride)),
    };
    const promptRouter = options.route
      ? {
          ...(fileConfig.promptRouter ?? DEFAULT_PROMPT_ROUTER),
          active: options.route,
        }
      : fileConfig.promptRouter;
    const config: RisuAiBuildConfig = {
      sourceFile,
      outputDirectory,
      ...(fileConfig.orderIndex === undefined && options.orderIndex === undefined
        ? {}
        : { orderIndex: options.orderIndex ?? fileConfig.orderIndex }),
      ...(options.includeDisabled || fileConfig.includeDisabled ? { includeDisabled: true } : {}),
      ...(Object.keys(enabledOverrides).length > 0 ? { enabledOverrides } : {}),
      ...(fileConfig.separator === undefined ? {} : { separator: fileConfig.separator }),
      ...(options.withoutRootFields || fileConfig.includeRootFields === false
        ? { includeRootFields: false }
        : {}),
      ...(promptRouter === undefined ? {} : { promptRouter }),
    };
    const result = await buildRisuAiPreset(config, !options.check);

    if (options.check) {
      const [masterCurrent, reasoningCurrent, introductionCurrent] = await Promise.all([
        fileMatches(result.outputFiles.master, result.master),
        fileMatches(result.outputFiles.reasoning, result.reasoning),
        fileMatches(result.outputFiles.introduction, result.introduction),
      ]);
      if (!masterCurrent || !reasoningCurrent || !introductionCurrent) {
        process.stderr.write(
          `Generated RisuAI files are stale in ${path.resolve(config.outputDirectory)}\n`,
        );
        return 1;
      }
      process.stdout.write(
        `RisuAI files are current (${result.masterPrompts.length + result.reasoningPrompts.length + result.introductionPrompts.length + result.externalMasterModules.length} output prompt blocks).\n`,
      );
      return 0;
    }

    process.stdout.write(
      `Extracted ${result.masterPrompts.length + result.reasoningPrompts.length + result.introductionPrompts.length + result.externalMasterModules.length} output prompt blocks and ${result.runtimeSlots.length} runtime slots to ${path.resolve(config.outputDirectory)}\nMASTER SHA-256: ${result.masterDigest}\nREASONING SHA-256: ${result.reasoningDigest}\n`,
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
