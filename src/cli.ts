import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { Command } from "commander";
import { z } from "zod";
import { compilePrompts } from "./compiler.js";

const CliOptionsSchema = z.object({
  source: z.string().min(1),
  output: z.string().min(1),
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

export async function run(argv: string[]): Promise<number> {
  const program = new Command()
    .name("prompt-compiler")
    .description("Compile ordered Markdown prompt modules into one deterministic master prompt.")
    .option("-s, --source <directory>", "prompt module directory", "prompts")
    .option("-o, --output <file>", "generated master prompt", "generated/MASTER_PROMPT.md")
    .option("--stdout", "print the compiled prompt without writing it", false)
    .option("--list", "list prompt modules in compilation order", false)
    .option("--check", "fail when the generated file is missing or stale", false)
    .showHelpAfterError()
    .exitOverride();

  try {
    program.parse(argv, { from: "user" });
    const options = CliOptionsSchema.parse(program.opts());
    const sourceDirectory = path.resolve(options.source);
    const outputFile = path.resolve(options.output);
    const result = await compilePrompts({
      sourceDirectory,
      outputFile,
      writeOutput: !options.stdout && !options.check,
    });

    if (options.list) {
      for (const module of result.modules) {
        process.stdout.write(`${module.relativePath}\n`);
      }
    }

    if (options.stdout) {
      process.stdout.write(result.compiled);
    } else if (options.check) {
      const current = await outputIsCurrent(outputFile, result.compiled);

      if (!current) {
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
