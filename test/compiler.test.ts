import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  compilePrompts,
  discoverPromptModules,
  RECOMMENDED_PROMPT_BUDGET,
} from "../src/compiler.js";

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

  it("warns above the soft prompt budget without blocking compilation", async () => {
    const fixture = await createFixture();
    const source = path.join(fixture, "prompts");
    const moduleCount = 3;
    const moduleSize = Math.ceil(RECOMMENDED_PROMPT_BUDGET.maxCompiledCharacters / moduleCount);

    await Promise.all(
      Array.from({ length: moduleCount }, (_, index) =>
        writeFile(
          path.join(source, `${String(index).padStart(2, "0")}-module.md`),
          `# Module ${index}\n\n${"x".repeat(moduleSize)}`,
          "utf8",
        ),
      ),
    );

    const result = await compilePrompts({
      sourceDirectory: source,
      outputFile: path.join(fixture, "out.md"),
      writeOutput: false,
    });

    expect(result.modules).toHaveLength(moduleCount);
    expect(result.compiled).toContain("# Module 2");
    expect(result.warnings).toEqual([
      expect.stringContaining(
        `recommended soft budget is ${RECOMMENDED_PROMPT_BUDGET.maxCompiledCharacters.toLocaleString("en-US")}`,
      ),
    ]);
  });

  it("keeps project prompt module ordinals contiguous", async () => {
    const modules = await discoverPromptModules(path.resolve("prompts"));

    for (const [index, module] of modules.entries()) {
      expect(module.relativePath).toMatch(
        new RegExp(`^${String(index).padStart(2, "0")}-[a-z0-9-]+\\.(?:md|txt)$`),
      );
    }
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

  it("locks presentation language to the user's active current-turn writing", async () => {
    const result = await compilePrompts({
      sourceDirectory: path.resolve("prompts"),
      outputFile: path.resolve("generated", "MASTER_PROMPT.md"),
      writeOutput: false,
    });
    const compiled = result.compiled.replace(/\s+/g, " ");

    expect(compiled).toContain("Set one presentation language for every response.");
    expect(compiled).toContain("### Transparent presentation language");
    expect(compiled).toContain("attachment contents");
    expect(compiled).toContain(
      "A large block of Korean, Japanese, English, or another language inside such material must not outweigh a Vietnamese current-turn request",
    );
    expect(compiled).toContain("This translation does not change the language spoken in-world");
    expect(compiled).toContain(
      "Presentation language is invisible rendering, not automatically an in-world event",
    );
    expect(compiled).toContain(
      "a Vietnamese user message such as a greeting is an ordinary greeting",
    );
    expect(compiled).toContain(
      "A user switching the language they type between turns changes the rendering language immediately but does not by itself code-switch the characters",
    );
    expect(compiled).toContain(
      'A general output-language request such as "answer in Vietnamese" controls presentation only',
    );
    expect(compiled).toContain(
      "never by letting them pull the response into another presentation language",
    );
    expect(compiled).toContain("The lock applies even to one-character utterances.");
    expect(compiled).toContain("Never copy a Hangul, kana, or other foreign-script vocal token");
    expect(compiled).toContain(
      "emit no foreign script unless the current turn explicitly requests original-language text",
    );
    expect(compiled).toContain("Localize or transliterate it even if it is only one character.");
  });

  it("keeps the intimacy performance contract active under canon-first grounding", async () => {
    const result = await compilePrompts({
      sourceDirectory: path.resolve("prompts"),
      outputFile: path.resolve("generated", "MASTER_PROMPT.md"),
      writeOutput: false,
    });
    const normalized = result.compiled.replace(/\s+/g, " ");

    expect(result.compiled).toContain("### Canon and performance separation");
    expect(result.compiled).toContain("### Character-relative overload");
    expect(result.compiled).toContain("roughly 60-75 percent dialogue");
    expect(result.compiled).toContain("a longer release or faster broken rhythm");
    expect(result.compiled).toContain("Describe anatomy, mechanics, and technique");
    expect(result.compiled).toContain("Graphic descriptions are permitted");
    expect(result.compiled).toContain("This is not a moan quota");
    expect(result.compiled).toContain("### Critical anti-inertia override");
    expect(result.compiled).toContain("### Performance-first drafting order");
    expect(result.compiled).toContain("### Non-negotiable rejection conditions");
    expect(result.compiled).toContain("### Contrastive anti-pattern corrections");
    expect(result.compiled).toContain("### Previous-output style has no authority");
    expect(result.compiled).toContain("### Final anti-regression verdict");
    expect(normalized).toContain(
      "Do not draft a conventional visual sex scene and add a few moans afterward",
    );
    expect(normalized).toContain(
      "The active master prompt governs the next response in full even if every earlier assistant reply demonstrated the wrong style",
    );
    expect(normalized).toContain("When one of these conditions applies, revision is mandatory");
    expect(normalized).toContain("Active-intimacy validation is blocking");
    expect(normalized).toContain(
      "During active intimacy, character-faithful ASMR performance outranks generic prose and ordinary calm dialogue defaults",
    );
    expect(normalized).toContain(
      "Assets and visual specificity cannot validate failed ASMR performance",
    );
    expect(result.compiled).toContain(
      "They cannot remain detached, retrospective, polished, and multi-clause",
    );
  });

  it("preserves distinct solo and harem ASMR orchestration", async () => {
    const result = await compilePrompts({
      sourceDirectory: path.resolve("prompts"),
      outputFile: path.resolve("generated", "MASTER_PROMPT.md"),
      writeOutput: false,
    });
    const compiled = result.compiled;
    const normalized = compiled.replace(/\s+/g, " ");

    expect(compiled).toContain("## SOLO AND HAREM ASMR ORCHESTRATION");
    expect(compiled).toContain("### Solo continuity");
    expect(compiled).toContain("### Two valid harem rhythms");
    expect(compiled).toContain("### Concurrent acoustic lanes");
    expect(compiled).toContain("### Independent arcs and landing");
    expect(compiled).toContain("### Voice-led anchor rhythm");
    expect(compiled).toContain("### Spatial continuity of sound");
    expect(compiled).toContain("Rapid call-and-response");
    expect(compiled).toContain("Anchored foreground");
    expect(normalized).toContain("Do not merge distinct participants into a generic chorus");
    expect(normalized).toContain(
      "One person's louder voice, climax, request, or loss of composure does not automatically synchronize the group",
    );
    expect(compiled).toContain("### Intimate autonomy and initiative");
    expect(normalized).toContain("Do not reduce a participant to a stimulus-response body");
    expect(normalized).toContain(
      "A moan or automatic body response alone does not demonstrate initiative",
    );
    expect(normalized).toContain("Autonomy does not grant unlimited scene scope");
    expect(normalized).toContain("In a harem, decisions remain individual");
    expect(compiled).toContain("### Character-relative autonomy envelope");
    expect(compiled).toContain("### Local embodied initiative");
    expect(normalized).toContain(
      "A strongly autonomous participant may initiate a substantial change of leverage, role, partner focus, or position",
    );
    expect(normalized).toContain(
      "Physical influence over the user and authorship of the user's decisions are different",
    );
    expect(normalized).toContain(
      "a secondary participant need not wait for foreground ownership before acting",
    );
    expect(normalized).toContain("This restriction does not freeze the other participants");
    expect(compiled).toContain("### Compositional intimate possibility space");
    expect(compiled).toContain("### Contact and activity families");
    expect(compiled).toContain("### Position topology");
    expect(compiled).toContain("### Multi-participant configurations");
    expect(compiled).toContain("### Selection and diversity discipline");
    expect(compiled).toContain("### Cross-response variation memory");
    expect(normalized).toContain(
      "Common named positions are aliases for combinations of those facts, not complete choreography",
    );
    expect(normalized).toContain("Do not depend on a finite menu of named acts or positions");
    expect(normalized).toContain(
      "Multiple participants may contact different reachable regions of one person or one another at the same time",
    );
    expect(normalized).toContain(
      "Use the visible recent assistant replies as a silent variation ledger",
    );
    expect(normalized).toContain("Do not treat synonym replacement as variation");
    expect(normalized).toContain("Avoid habitual response endings");
    expect(compiled).not.toMatch(/\b(?:manga|hybrid)\b/i);
  });

  it("guards active state, turn scope, agency semantics, and narrow world exceptions", async () => {
    const result = await compilePrompts({
      sourceDirectory: path.resolve("prompts"),
      outputFile: path.resolve("generated", "MASTER_PROMPT.md"),
      writeOutput: false,
    });
    const compiled = result.compiled.replace(/\s+/g, " ");

    expect(compiled).toContain("### Active-branch isolation");
    expect(compiled).toContain(
      "Only the variant selected into the active conversation establishes its timeline",
    );
    expect(compiled).toContain("### Current-turn action scope");
    expect(compiled).toContain(
      "A singular action does not by itself authorize narrator-imposed automatic progression",
    );
    expect(compiled).toContain("Physiological response is a body event, not a truth detector.");
    expect(compiled).toContain(
      "Quietness changes the channel, not the amount of reactive foreground.",
    );
    expect(compiled).toContain("Apply biological exceptions narrowly.");
    expect(compiled).toContain("Asset timing follows narrative state.");
    expect(compiled).toContain("Localization is lexical as well as script-based.");
    expect(compiled).toContain("### Perform sound instead of reporting it");
    expect(compiled).toContain(
      "Use the output's established dialogue typography for pronounceable character-made sound",
    );
    expect(compiled).toContain("### Vocal-tract constraints");
    expect(compiled).toContain("### Contact acoustics");
    expect(compiled).toContain(
      "External sliding or compression between soft surfaces has a different acoustic profile",
    );
    expect(compiled).toContain("This requirement governs representation, not quantity");
    expect(compiled).toContain("### Lexical silence is not acoustic silence");
    expect(compiled).toContain("Silence requires positive support");
    expect(compiled).toContain("### Occupied-mouth performance grammar");
    expect(compiled).toContain(
      "For simultaneous oral action and external soft-surface compression",
    );
    expect(compiled).toContain(
      "A clear line spoken before the mouth becomes occupied does not satisfy the occupied-mouth beat",
    );
    expect(compiled).toContain("### Microzoom, not timeline expansion");
    expect(compiled).toContain("### Mechanics-to-imagination rule");
    expect(compiled).toContain(
      "At a meaningful force, depth, pressure, or pace change, directly perform at least one involuntary",
    );
    expect(compiled).toContain(
      'A request for "harder," "faster," "deeper," "stronger," or an equivalent change',
    );
    expect(compiled).toContain("### Depth without scope overrun");
    expect(compiled).toContain(
      "Depth means resolving the same current moment at higher sensory and mechanical resolution",
    );
    expect(compiled).toContain("### Trait saturation control");
    expect(compiled).not.toMatch(/\b(?:manga|hybrid)\b/i);
    expect(compiled).not.toContain("One to three spoken sentences is the default");
    expect(compiled).not.toContain("Add at most one useful new fact or question");
    expect(compiled).not.toContain("Use at most one useful action or prop interaction");
    expect(compiled).not.toContain("Garam");
    expect(compiled).not.toContain("Pung-yu");
  });
});
