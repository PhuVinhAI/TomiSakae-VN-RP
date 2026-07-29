import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const PROMPT_EXTENSIONS = new Set([".md", ".txt"]);

export const RECOMMENDED_PROMPT_BUDGET = {
  maxCompiledCharacters: 90_000,
} as const;

export interface PromptModule {
  absolutePath: string;
  relativePath: string;
  content: string;
}

export interface CompileOptions {
  sourceDirectory: string;
  outputFile: string;
  writeOutput?: boolean;
}

export interface CompileResult {
  compiled: string;
  digest: string;
  modules: PromptModule[];
  outputFile: string;
  warnings: string[];
}

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function comparePaths(left: string, right: string): number {
  return left.localeCompare(right, "en", { numeric: true, sensitivity: "base" });
}

async function walkPromptFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => comparePaths(left.name, right.name));

  const discovered = await Promise.all(
    entries.map(async (entry) => {
      if (entry.name.startsWith(".")) {
        return [];
      }

      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return walkPromptFiles(entryPath);
      }

      if (entry.isFile() && PROMPT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        return [entryPath];
      }

      return [];
    }),
  );

  return discovered.flat();
}

export async function discoverPromptModules(sourceDirectory: string): Promise<PromptModule[]> {
  const absoluteSource = path.resolve(sourceDirectory);
  const files = await walkPromptFiles(absoluteSource);

  const modules = await Promise.all(
    files.map(async (absolutePath) => {
      const content = normalizeNewlines(await readFile(absolutePath, "utf8")).trim();
      const relativePath = path.relative(absoluteSource, absolutePath).split(path.sep).join("/");

      if (content.length === 0) {
        throw new Error(`Prompt module is empty: ${relativePath}`);
      }

      return { absolutePath, relativePath, content };
    }),
  );

  return modules.sort((left, right) => comparePaths(left.relativePath, right.relativePath));
}

export function renderMasterPrompt(modules: PromptModule[]): { compiled: string; digest: string } {
  if (modules.length === 0) {
    throw new Error("No .md or .txt prompt modules were found.");
  }

  const body = modules.map((module) => module.content).join("\n\n---\n\n");
  const digest = createHash("sha256").update(body).digest("hex");
  const compiled = `${body}\n`;

  return { compiled, digest };
}

export function getPromptBudgetWarnings(compiledCharacters: number): string[] {
  const warnings: string[] = [];

  if (compiledCharacters > RECOMMENDED_PROMPT_BUDGET.maxCompiledCharacters) {
    warnings.push(
      `Prompt has ${compiledCharacters.toLocaleString("en-US")} characters; the recommended soft budget is ${RECOMMENDED_PROMPT_BUDGET.maxCompiledCharacters.toLocaleString("en-US")}.`,
    );
  }

  return warnings;
}

export async function compilePrompts(options: CompileOptions): Promise<CompileResult> {
  const outputFile = path.resolve(options.outputFile);
  const modules = await discoverPromptModules(options.sourceDirectory);
  const { compiled, digest } = renderMasterPrompt(modules);
  const warnings = getPromptBudgetWarnings(compiled.length);

  if (options.writeOutput ?? true) {
    await mkdir(path.dirname(outputFile), { recursive: true });
    await writeFile(outputFile, compiled, "utf8");
  }

  return { compiled, digest, modules, outputFile, warnings };
}
