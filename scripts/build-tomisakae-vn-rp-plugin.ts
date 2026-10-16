import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import type { PresetSources } from "../risuai/tomisakae-vn-rp-plugin/src/preset-family.js";
import type { FfPreset } from "../risuai/tomisakae-vn-rp-plugin/src/core.js";

const DEFAULT_SOURCE = "risuai/tomisakae-vn-rp-plugin/source/ff54-sillytavern-preset.json";
const DEFAULT_OUTPUT = "risuai/tomisakae-vn-rp-plugin/dist/tomisakae-vn-rp-plugin.js";

interface Options {
  sourceFile: string;
  outputFile: string;
  check: boolean;
}

function parseArguments(argv: string[]): Options {
  const options: Options = {
    sourceFile: DEFAULT_SOURCE,
    outputFile: DEFAULT_OUTPUT,
    check: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--source") options.sourceFile = argv[++index] ?? "";
    else if (argument === "--output") options.outputFile = argv[++index] ?? "";
    else if (argument === "--check") options.check = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.sourceFile) throw new Error("--source requires a JSON path.");
  if (!options.outputFile) throw new Error("--output requires a JavaScript path.");
  return options;
}

function validatePreset(value: unknown): asserts value is {
  prompts: unknown[];
  prompt_order: Array<{ order: unknown[] }>;
} {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Preset root must be an object.");
  const preset = value as Record<string, unknown>;
  if (!Array.isArray(preset.prompts)) throw new Error("Preset is missing prompts[].");
  if (!Array.isArray(preset.prompt_order) || preset.prompt_order.length === 0)
    throw new Error("Preset is missing prompt_order[].");
  const firstOrder = preset.prompt_order[0] as Record<string, unknown> | undefined;
  if (!firstOrder || !Array.isArray(firstOrder.order))
    throw new Error("Preset is missing prompt_order[0].order[].");
}

export async function buildPlugin(options: Options): Promise<{ output: string; digest: string }> {
  const sourcePath = path.resolve(options.sourceFile);
  const outputPath = path.resolve(options.outputFile);
  const raw = await readFile(sourcePath, "utf8");
  const preset = JSON.parse(raw) as unknown;
  validatePreset(preset);
  const canonicalPreset = JSON.stringify(preset);
  const sourceDigest = createHash("sha256").update(raw).digest("hex");
  const sources = await loadPresetSources(sourcePath);
  const result = await build({
    entryPoints: [path.resolve("risuai/tomisakae-vn-rp-plugin/src/plugin.ts")],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    minify: false,
    legalComments: "none",
    define: {
      __FF54_PRESET__: canonicalPreset,
      __FF54_SOURCE_NAME__: JSON.stringify(path.basename(sourcePath)),
      __FF54_SOURCE_SHA256__: JSON.stringify(sourceDigest),
      __PRESET_SOURCES__: JSON.stringify(sources),
    },
    banner: {
      js: [
        "//@name tomisakae_vn_rp",
        "//@display-name TomiSakae VN-RP",
        "//@api 3.0",
        "//@version 2.0.1",
        "",
      ].join("\n"),
    },
  });
  const bundled = result.outputFiles[0]?.text;
  if (!bundled) throw new Error("esbuild did not produce plugin JavaScript.");
  const output = bundled.replace(/\r\n/g, "\n");
  const digest = createHash("sha256").update(output).digest("hex");

  if (options.check) {
    const existing = await readFile(outputPath, "utf8").catch(() => "");
    if (existing !== output) throw new Error(`Generated plugin is stale: ${outputPath}`);
  } else {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, output, "utf8");
  }
  return { output: outputPath, digest };
}

/** Bundle prompt/regex data only, never exported connection or sampling settings. */
export async function loadPresetSources(ff54Source = DEFAULT_SOURCE): Promise<PresetSources> {
  const sources = {} as PresetSources;
  const inputs = [
    ["ff54", ff54Source, path.basename(ff54Source)],
    ["sola", "risuai/tomisakae-vn-rp-plugin/source/sola-v2-flame.json", "Sola V2 Flame.json"],
  ] as const;
  for (const [family, filename, sourceName] of inputs) {
    const raw = await readFile(path.resolve(filename), "utf8");
    const data: unknown = JSON.parse(raw.replace(/^\uFEFF/, ""));
    validatePreset(data);
    const preset = data as FfPreset;
    sources[family] = {
      preset: {
        family,
        prompts: preset.prompts,
        prompt_order: preset.prompt_order,
        extensions: { regex_scripts: preset.extensions?.regex_scripts ?? [] },
      },
      sourceName,
      sha256: createHash("sha256").update(raw).digest("hex"),
    };
  }
  return sources;
}

export async function run(argv: string[]): Promise<number> {
  try {
    const options = parseArguments(argv);
    const result = await buildPlugin(options);
    process.stdout.write(
      `${options.check ? "Verified" : "Built"} ${result.output}\nSHA-256: ${result.digest}\n`,
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
