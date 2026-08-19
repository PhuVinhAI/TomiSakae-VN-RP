import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  getPromptBudgetWarnings,
  renderMasterPrompt,
  type CompileResult,
  type PromptModule,
} from "./compiler.js";

const ProfileManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  label: z.string().min(1),
  description: z.string().min(1),
  output: z.string().min(1),
  aliases: z.array(z.string().min(1)).default([]),
  responseInstruction: z.string().min(1),
  routeInstruction: z.string().min(1).optional(),
  maxCompiledCharacters: z.number().int().positive(),
  modules: z.array(z.string().min(1)).min(1),
});

export type PromptProfileManifest = z.infer<typeof ProfileManifestSchema>;

export interface LoadedPromptProfile {
  manifestFile: string;
  workspaceDirectory: string;
  responseInstructionFile: string;
  routeInstructionFile: string | undefined;
  manifest: PromptProfileManifest;
}

export interface CompilePromptProfileOptions {
  profile: LoadedPromptProfile;
  outputFile?: string;
  writeOutput?: boolean;
}

export interface PromptProfileCompileResult extends CompileResult {
  profile: PromptProfileManifest;
  outputFiles: string[];
}

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function comparePaths(left: string, right: string): number {
  return left.localeCompare(right, "en", { numeric: true, sensitivity: "base" });
}

function resolveWithinWorkspace(workspaceDirectory: string, relativePath: string): string {
  const workspace = path.resolve(workspaceDirectory);
  const target = path.resolve(workspace, relativePath);
  const relative = path.relative(workspace, target);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Profile path escapes the workspace: ${relativePath}`);
  }

  return target;
}

export async function loadPromptProfileManifest(
  manifestFile: string,
  workspaceDirectory = path.dirname(path.dirname(path.resolve(manifestFile))),
): Promise<LoadedPromptProfile> {
  const absoluteManifest = path.resolve(manifestFile);
  const absoluteWorkspace = path.resolve(workspaceDirectory);
  const parsed = ProfileManifestSchema.parse(
    JSON.parse(await readFile(absoluteManifest, "utf8")) as unknown,
  );

  if (new Set(parsed.modules).size !== parsed.modules.length) {
    throw new Error(`Profile contains duplicate modules: ${parsed.id}`);
  }

  const outputs = [parsed.output, ...parsed.aliases];
  if (new Set(outputs).size !== outputs.length) {
    throw new Error(`Profile contains duplicate output paths: ${parsed.id}`);
  }

  for (const modulePath of parsed.modules) {
    resolveWithinWorkspace(absoluteWorkspace, modulePath);
  }

  for (const outputPath of outputs) {
    resolveWithinWorkspace(absoluteWorkspace, outputPath);
  }

  const responseInstructionFile = resolveWithinWorkspace(
    absoluteWorkspace,
    parsed.responseInstruction,
  );
  const responseInstruction = normalizeNewlines(
    await readFile(responseInstructionFile, "utf8"),
  ).trim();

  if (responseInstruction.length === 0) {
    throw new Error(`Response instruction is empty for profile: ${parsed.id}`);
  }

  if (
    (responseInstruction.match(/<RESPONSE_INSTRUCTION>/g) ?? []).length !== 1 ||
    (responseInstruction.match(/<\/RESPONSE_INSTRUCTION>/g) ?? []).length !== 1
  ) {
    throw new Error(`Response instruction wrapper is invalid for profile: ${parsed.id}`);
  }

  let routeInstructionFile: string | undefined;
  if (parsed.routeInstruction) {
    routeInstructionFile = resolveWithinWorkspace(absoluteWorkspace, parsed.routeInstruction);
    const routeInstruction = normalizeNewlines(await readFile(routeInstructionFile, "utf8")).trim();

    if (
      !routeInstruction.includes("<ROLEPLAY_CHANGE_ROUTE>") ||
      !routeInstruction.includes("</ROLEPLAY_CHANGE_ROUTE>") ||
      !routeInstruction.includes("<USER_NEXT_PROMPT>") ||
      !routeInstruction.includes("</USER_NEXT_PROMPT>")
    ) {
      throw new Error(`Route instruction wrapper is invalid for profile: ${parsed.id}`);
    }
  }

  return {
    manifestFile: absoluteManifest,
    workspaceDirectory: absoluteWorkspace,
    responseInstructionFile,
    routeInstructionFile,
    manifest: parsed,
  };
}

export async function discoverPromptProfiles(
  profilesDirectory: string,
  workspaceDirectory = path.dirname(path.resolve(profilesDirectory)),
): Promise<LoadedPromptProfile[]> {
  const absoluteDirectory = path.resolve(profilesDirectory);
  const entries = (await readdir(absoluteDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === ".json")
    .sort((left, right) => comparePaths(left.name, right.name));

  const profiles = await Promise.all(
    entries.map((entry) =>
      loadPromptProfileManifest(path.join(absoluteDirectory, entry.name), workspaceDirectory),
    ),
  );
  const ids = profiles.map(({ manifest }) => manifest.id);

  if (new Set(ids).size !== ids.length) {
    throw new Error("Prompt profile ids must be unique.");
  }

  const claimedOutputs = new Map<string, string>();
  for (const profile of profiles) {
    for (const output of [profile.manifest.output, ...profile.manifest.aliases]) {
      const absoluteOutput = resolveWithinWorkspace(profile.workspaceDirectory, output);
      const owner = claimedOutputs.get(absoluteOutput);

      if (owner) {
        throw new Error(
          `Prompt profiles ${owner} and ${profile.manifest.id} share an output path: ${output}`,
        );
      }

      claimedOutputs.set(absoluteOutput, profile.manifest.id);
    }
  }

  return profiles;
}

async function readProfileModules(
  workspaceDirectory: string,
  manifest: PromptProfileManifest,
): Promise<PromptModule[]> {
  return Promise.all(
    manifest.modules.map(async (relativePath) => {
      const absolutePath = resolveWithinWorkspace(workspaceDirectory, relativePath);
      const extension = path.extname(absolutePath).toLowerCase();

      if (extension !== ".md" && extension !== ".txt") {
        throw new Error(`Unsupported prompt module extension in ${manifest.id}: ${relativePath}`);
      }

      const content = normalizeNewlines(await readFile(absolutePath, "utf8")).trim();
      if (content.length === 0) {
        throw new Error(`Prompt module is empty in ${manifest.id}: ${relativePath}`);
      }

      return { absolutePath, relativePath, content };
    }),
  );
}

export async function compilePromptProfile(
  options: CompilePromptProfileOptions,
): Promise<PromptProfileCompileResult> {
  const { manifest } = options.profile;
  const { workspaceDirectory } = options.profile;
  const modules = await readProfileModules(workspaceDirectory, manifest);
  const { compiled, digest } = renderMasterPrompt(modules);
  const primaryOutput = resolveWithinWorkspace(
    workspaceDirectory,
    options.outputFile ?? manifest.output,
  );
  const outputFiles = options.outputFile
    ? [primaryOutput]
    : [
        primaryOutput,
        ...manifest.aliases.map((output) => resolveWithinWorkspace(workspaceDirectory, output)),
      ];

  if (options.writeOutput ?? true) {
    await Promise.all(
      outputFiles.map(async (outputFile) => {
        await mkdir(path.dirname(outputFile), { recursive: true });
        await writeFile(outputFile, compiled, "utf8");
      }),
    );
  }

  const warnings = getPromptBudgetWarnings(compiled.length);
  if (compiled.length > manifest.maxCompiledCharacters) {
    warnings.push(
      `Profile ${manifest.id} exceeds its ${manifest.maxCompiledCharacters.toLocaleString("en-US")}-character target.`,
    );
  }

  return {
    compiled,
    digest,
    modules,
    outputFile: primaryOutput,
    warnings,
    profile: manifest,
    outputFiles,
  };
}
