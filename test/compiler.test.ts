import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { compilePrompts, discoverPromptModules } from "../src/compiler.js";

const temporaryDirectories: string[] = [];

async function createFixture(): Promise<string> {
  const fixture = await mkdtemp(path.join(tmpdir(), "prompt-compiler-"));
  temporaryDirectories.push(fixture);
  await mkdir(path.join(fixture, "prompts", "nested"), { recursive: true });
  return fixture;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("prompt compiler", () => {
  it("discovers supported files in deterministic natural order", async () => {
    const fixture = await createFixture();
    const source = path.join(fixture, "prompts");
    await writeFile(path.join(source, "10-last.md"), "# Last\r\n", "utf8");
    await writeFile(path.join(source, "02-middle.txt"), "# Middle\n", "utf8");
    await writeFile(path.join(source, "nested", "01-nested.md"), "# Nested\n", "utf8");
    await writeFile(path.join(source, "ignored.json"), "{}\n", "utf8");

    const modules = await discoverPromptModules(source);

    expect(modules.map((module) => module.relativePath)).toEqual([
      "02-middle.txt",
      "10-last.md",
      "nested/01-nested.md",
    ]);
  });

  it("writes one reproducible, copy-ready master prompt without a generated preamble", async () => {
    const fixture = await createFixture();
    const source = path.join(fixture, "prompts");
    const output = path.join(fixture, "generated", "MASTER_PROMPT.md");
    await writeFile(path.join(source, "01-first.md"), "# First\n\nAlpha", "utf8");
    await writeFile(path.join(source, "02-second.md"), "# Second\n\nBeta", "utf8");

    const first = await compilePrompts({ sourceDirectory: source, outputFile: output });
    const second = await compilePrompts({
      sourceDirectory: source,
      outputFile: output,
      writeOutput: false,
    });

    expect(await readFile(output, "utf8")).toBe(first.compiled);
    expect(second.compiled).toBe(first.compiled);
    expect(second.digest).toBe(first.digest);
    expect(first.compiled).toBe("# First\n\nAlpha\n\n---\n\n# Second\n\nBeta\n");
    expect(first.compiled.startsWith("# First")).toBe(true);
    expect(first.compiled).not.toContain("MASTER PROMPT");
    expect(first.compiled).not.toContain("Source order");
    expect(first.compiled).not.toContain("SHA-256");
    expect(first.compiled.indexOf("# First")).toBeLessThan(first.compiled.indexOf("# Second"));
  });

  it("rejects an empty prompt directory", async () => {
    const fixture = await createFixture();

    await expect(
      compilePrompts({
        sourceDirectory: path.join(fixture, "prompts"),
        outputFile: path.join(fixture, "out.md"),
        writeOutput: false,
      }),
    ).rejects.toThrow("No .md or .txt prompt modules were found.");
  });

  it("preserves the canon-first roleplay contract in the compiled prompt", async () => {
    const source = path.resolve("prompts");
    const result = await compilePrompts({
      sourceDirectory: source,
      outputFile: path.resolve("generated", "MASTER_PROMPT.md"),
      writeOutput: false,
    });

    expect(result.compiled).toContain("### Canon sources and ownership");
    expect(result.compiled).toContain("### Grounded completion");
    expect(result.compiled).toContain("### Canon activation");
    expect(result.compiled).toContain("### Canon and source fidelity");
    expect(result.compiled).toContain("Asset availability is not story canon.");
    expect(result.compiled).not.toContain("Consent is not required for scene logic.");
    expect(result.compiled).not.toContain("Sexualize ordinary conversation freely.");
    expect(result.compiled).not.toContain(
      "Fear, pain, intoxication, confusion, sleep, silence, or resistance may be treated as consent",
    );
    expect(result.compiled).not.toContain("<Thoughts>");
  });

  it("keeps the intimacy performance contract active under canon-first grounding", async () => {
    const result = await compilePrompts({
      sourceDirectory: path.resolve("prompts"),
      outputFile: path.resolve("generated", "MASTER_PROMPT.md"),
      writeOutput: false,
    });

    expect(result.compiled).toContain("### Canon and performance separation");
    expect(result.compiled).toContain("### Character-relative overload");
    expect(result.compiled).toContain("roughly 60-75 percent dialogue, breath, and audible");
    expect(result.compiled).toContain("a longer release or faster broken rhythm");
    expect(result.compiled).toContain("Describe anatomy, mechanics, and technique");
    expect(result.compiled).toContain("Graphic descriptions are permitted");
    expect(result.compiled).toContain("This is not a moan quota");
    expect(result.compiled).toContain(
      "They cannot remain detached, retrospective, polished, and multi-clause",
    );
  });
});
