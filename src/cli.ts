import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { z } from "zod";
import { compilePrompts } from "./compiler.js";
import {
  compilePromptProfile,
  discoverPromptProfiles,
  type PromptProfileCompileResult,
} from "./profiles.js";

const CliOptionsSchema = z.object({
  source: z.string().min(1).optional(),
  output: z.string().min(1).optional(),
  profile: z.string().min(1),
  profilesDirectory: z.string().min(1),
  allProfiles: z.boolean(),
  stdout: z.boolean(),
  list: z.boolean(),
  check: z.boolean(),
});

async function outputIsCurrent(outputFile: string, expected: string): Promise<boolean> {
  try {
    return (await readFile(outputFile, "utf8")) === expected;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function profileOutputsAreCurrent(result: PromptProfileCompileResult): Promise<boolean> {
  const checks = await Promise.all(
    result.outputFiles.map((outputFile) => outputIsCurrent(outputFile, result.compiled)),
  );
  return checks.every(Boolean);
}

export async function run(argv: string[]): Promise<number> {
  const program = new Command()
    .name("prompt-compiler")
    .description("Compile ordered Markdown prompt modules into one deterministic master prompt.")
    .option("-s, --source <directory>", "compile one raw prompt module directory")
    .option("-o, --output <file>", "override the primary generated output")
    .option("-p, --profile <id>", "prompt profile id", "nsfw")
    .option("--profiles-directory <directory>", "profile manifest directory", "profiles")
    .option("--all-profiles", "compile every prompt profile", false)
    .option("--stdout", "print the compiled prompt without writing it", false)
    .option("--list", "list prompt modules in compilation order", false)
    .option("--check", "fail when the generated file is missing or stale", false)
    .showHelpAfterError()
    .exitOverride();

  try {
    program.parse(argv, { from: "user" });
    const options = CliOptionsSchema.parse(program.opts());

    if (options.source) {
      if (options.allProfiles) {
        throw new Error("--source cannot be combined with --all-profiles.");
      }

      const outputFile = path.resolve(options.output ?? "generated/MASTER_PROMPT.md");
      const result = await compilePrompts({
        sourceDirectory: path.resolve(options.source),
        outputFile,
        writeOutput: !options.stdout && !options.check,
      });

      for (const warning of result.warnings) {
        process.stderr.write(`Warning: ${warning}\n`);
      }

      if (options.list) {
        for (const module of result.modules) {
          process.stdout.write(`${module.relativePath}\n`);
        }
      }

      if (options.stdout) {
        process.stdout.write(result.compiled);
      } else if (options.check) {
        if (!(await outputIsCurrent(outputFile, result.compiled))) {
          process.stderr.write(`Generated prompt is stale: ${outputFile}\n`);
          return 1;
        }

        process.stdout.write(`Prompt is current (${result.modules.length} modules).\n`);
      } else {
        process.stdout.write(
          `Compiled ${result.modules.length} modules to ${result.outputFile}\nSHA-256: ${result.digest}\n`,
        );
      }

      return 0;
    }

    const workspaceDirectory = process.cwd();
    const profiles = await discoverPromptProfiles(
      path.resolve(options.profilesDirectory),
      workspaceDirectory,
    );
    const selectedProfiles = options.allProfiles
      ? profiles
      : profiles.filter(({ manifest }) => manifest.id === options.profile);

    if (selectedProfiles.length === 0) {
      throw new Error(`Unknown prompt profile: ${options.profile}`);
    }

    if (options.stdout && selectedProfiles.length !== 1) {
      throw new Error("--stdout requires exactly one profile.");
    }

    if (options.output && selectedProfiles.length !== 1) {
      throw new Error("--output requires exactly one profile.");
    }

    const results = await Promise.all(
      selectedProfiles.map((profile) => {
        const compileOptions = {
          profile,
          writeOutput: !options.stdout && !options.check,
          ...(options.output ? { outputFile: options.output } : {}),
        };

        return compilePromptProfile(compileOptions);
      }),
    );

    for (const result of results) {
      for (const warning of result.warnings) {
        process.stderr.write(`Warning: ${warning}\n`);
      }
    }

    if (options.list) {
      for (const result of results) {
        process.stdout.write(`[${result.profile.id}]\n`);
        for (const module of result.modules) {
          process.stdout.write(`${module.relativePath}\n`);
        }
      }
    }

    if (options.stdout) {
      process.stdout.write(results[0]!.compiled);
    } else if (options.check) {
      for (const result of results) {
        if (!(await profileOutputsAreCurrent(result))) {
          process.stderr.write(`Generated profile is stale: ${result.profile.id}\n`);
          return 1;
        }
      }

      process.stdout.write(`Prompt profiles are current (${results.length} profiles).\n`);
    } else {
      for (const result of results) {
        process.stdout.write(
          `Compiled ${result.profile.id} (${result.modules.length} modules) to ${result.outputFiles.join(", ")}\nSHA-256: ${result.digest}\n`,
        );
      }
    }

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
