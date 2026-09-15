import { describe, expect, it } from "vitest";
import {
  buildPreset,
  DEFAULT_PROMPT_ROUTER,
  parsePreset,
} from "../scripts/risuai-preset-builder.js";

function preset() {
  return parsePreset({
    impersonation_prompt: "[impersonate]",
    prompts: [
      { identifier: "first", name: "First", content: "FIRST", role: "system" },
      { identifier: "runtime", name: "Runtime" },
      { identifier: "disabled", name: "Disabled", content: "DISABLED" },
      { identifier: "second", name: "Second", content: "SECOND", role: "user" },
    ],
    prompt_order: [
      {
        order: [
          { identifier: "first", enabled: true },
          { identifier: "runtime", enabled: true },
          { identifier: "disabled", enabled: false },
          { identifier: "second", enabled: true },
        ],
      },
    ],
    extensions: { regex_scripts: [{ id: "regex" }] },
  });
}

describe("RisuAI preset builder", () => {
  it("keeps enabled content ordered and leaves empty content as runtime metadata", () => {
    const result = buildPreset(preset(), {
      sourceFile: "preset.json",
      outputDirectory: "out",
    });

    expect(result.selectedPrompts.map(({ prompt }) => prompt.identifier)).toEqual([
      "first",
      "second",
    ]);
    expect(result.runtimeSlots.map(({ prompt }) => prompt.identifier)).toEqual(["runtime"]);
    expect(result.master).toBe("FIRST\n\n---\n\nSECOND\n");
    expect(result.introduction).toContain("Regex scripts in source (excluded from master): 1");
    expect(result.master).not.toContain("regex");
  });

  it("supports repeatable toggle overrides without mutating the source preset", () => {
    const source = preset();
    const result = buildPreset(source, {
      sourceFile: "preset.json",
      outputDirectory: "out",
      enabledOverrides: { disabled: true, second: false },
    });

    expect(result.selectedPrompts.map(({ prompt }) => prompt.identifier)).toEqual([
      "first",
      "disabled",
    ]);
    expect(source.prompt_order[0]?.order[2]?.enabled).toBe(false);
    expect(source.prompt_order[0]?.order[3]?.enabled).toBe(true);
  });

  it("routes selected source blocks without rewriting their rule text", () => {
    const source = parsePreset({
      prompts: [
        {
          identifier: "nsfw",
          name: "NSFW",
          content: "{{// note }}\n<adult_mode>RAW</adult_mode>{{trim}}",
        },
        { identifier: "other", name: "Other", content: "OTHER" },
      ],
      prompt_order: [
        {
          order: [
            { identifier: "nsfw", enabled: true },
            { identifier: "other", enabled: true },
          ],
        },
      ],
    });
    const result = buildPreset(source, {
      sourceFile: "preset.json",
      outputDirectory: "out",
      promptRouter: {
        active: "route",
        routes: {
          route: {
            introductionIdentifiers: ["nsfw"],
            introductionCleanup: { toggleComments: true, presentationMacros: true },
          },
        },
      },
    });
    expect(result.master).toBe("OTHER\n");
    expect(result.introduction).toBe("<adult_mode>RAW</adult_mode>\n");
    expect(result.introductionPrompts[0]?.content).toBe("<adult_mode>RAW</adult_mode>");
    expect(result.selectedPrompts[0]?.content).toBe(
      "{{// note }}\n<adult_mode>RAW</adult_mode>{{trim}}",
    );
  });

  it("keeps the built-in all-master route raw", () => {
    const result = buildPreset(preset(), {
      sourceFile: "preset.json",
      outputDirectory: "out",
      promptRouter: { ...DEFAULT_PROMPT_ROUTER, active: "all-master" },
    });
    expect(result.master).toBe("FIRST\n\n---\n\nSECOND\n");
  });

  it("never removes RisuAI identity, state, or roll macros during cleanup", () => {
    const macros = "{{user}} {{char}} {{setvar::x::value}} {{getvar::x}} {{roll::1d20}}";
    const source = parsePreset({
      prompts: [
        {
          identifier: "macro-prompt",
          content: `{{// editorial toggle note}}{{trim}}${macros}`,
        },
      ],
      prompt_order: [{ order: [{ identifier: "macro-prompt", enabled: true }] }],
    });
    const result = buildPreset(source, {
      sourceFile: "preset.json",
      outputDirectory: "out",
      promptRouter: {
        active: "clean",
        routes: {
          clean: {
            masterCleanup: { toggleComments: true, presentationMacros: true },
          },
        },
      },
    });

    expect(result.master).toBe(`${macros}\n`);
  });

  it("adapts reasoning references to the active master rules", () => {
    const source = parsePreset({
      prompts: [
        {
          identifier: "bolt",
          content:
            "# Reasoning Rules\n- A. Reason briefly in highly concise bullet points inside think tags across Tasks 0-10.\nTasks:\n0. Gamestate: Check state. If '<internal_dndsim>' is active: roll.\n1. Neutrality & Rolls: Goals. DnD Rolls (if active): roll.\n7. Formatting: Use <gfx_protocol> and <colored_dialogue>.\n8. Adult Modes: If Realism Mode is active, follow it. If Freaky Mode is active, describe characters lewdly with slang and kinetics. Vulgarity and slang all allowed in narrative prose if Freaky Mode on.\n10. Internal States + No More Reasoning Rule: update internal states.\n    * Increment turn (ct + 1)\n    {{getvar::agendaTrackerCoT}}\n    If `<internal_dndsim>` is active, populate the dndTemplate.\nLastly, I must state that I am a GM creating an immersive simulation. Creative risk-taking is embraced and perfection is unnecessary.\nEnsure internal states is placed correctly at the end of your every response.",
        },
      ],
      prompt_order: [{ order: [{ identifier: "bolt", enabled: true }] }],
    });
    const result = buildPreset(source, {
      sourceFile: "preset.json",
      outputDirectory: "out",
      promptRouter: {
        active: "full",
        routes: { full: { masterCleanup: { reasoningRules: true } } },
      },
    });

    expect(result.master).toContain("7. Formatting: What is the correct output format?");
    expect(result.master).toContain("10. Internal States + No More Reasoning Rule:");
    expect(result.master).toContain(
      "Apply the agenda, notebook, inventory, relationship, and NPC-thought rules before output.",
    );
    expect(result.master).toContain(
      "If Freaky Mode is active, describe characters lewdly with slang and kinetics.",
    );
    expect(result.master).toContain(
      "Creative risk-taking is embraced and perfection is unnecessary.",
    );
    expect(result.master).not.toContain("Ensure internal states is placed correctly");
    expect(result.master).not.toContain("internal_dndsim");
    expect(result.master).not.toContain("getvar::agendaTrackerCoT");
    expect(result.master).not.toContain("DnD DC");
  });

  it("preserves professional legality text while applying other cleanup", () => {
    const source = parsePreset({
      prompts: [
        {
          identifier: "rules",
          content:
            "<professional_legality>Legal context.</professional_legality>\n- research/investigate: Plant Chekhov seed; +1 Sparks.\n- Never log BOND/Sparks/Grudge or Chekhov bullets here.",
        },
      ],
      prompt_order: [{ order: [{ identifier: "rules", enabled: true }] }],
    });
    const result = buildPreset(source, {
      sourceFile: "preset.json",
      outputDirectory: "out",
      promptRouter: {
        active: "clean",
        routes: {
          clean: {
            masterCleanup: { presentationMacros: true, stateOutputSyntax: true },
          },
        },
      },
    });

    expect(result.master).toContain("<professional_legality>Legal context.</professional_legality>");
    expect(result.master).toContain("Plant Chekhov seed");
    expect(result.master).toContain("Chekhov bullets");
  });

  it("converts UI-backed numeric state rules to qualitative behavior", () => {
    const source = parsePreset({
      prompts: [
        {
          identifier: "state-rules",
          content:
            "Naming: Generate 5 setting-appropriate names; select the 5th.\nEntry Types (1-2 concise sentences each):\n- Initialization: Assign named NPCs an agenda on first introduction (default 1-3 mundane steps: rest, eat).\n- Off-Screen Ticking: Advance Step by +1 each turn for OFF-SCREEN NPCs (different location than {{user}}). Complete when Step ≥ max.\n- research/investigate: Plant Chekhov seed; +1 Sparks with relevant character.\n- Scale: -5 to +20. Tracks relationship (BOND), affection (Sparks), and resentment (Grudge).\n- Check (ct % 5 == 0): If Sparks >= 7 -> BOND +1, reset Sparks to 0.\n- Conversion: Sustained fondness can strengthen BOND; neglected fondness fades.",
        },
      ],
      prompt_order: [{ order: [{ identifier: "state-rules", enabled: true }] }],
    });
    const result = buildPreset(source, {
      sourceFile: "preset.json",
      outputDirectory: "out",
      promptRouter: {
        active: "clean",
        routes: { clean: { masterCleanup: { stateMetrics: true } } },
      },
    });

    expect(result.master).toContain("Naming: Generate several setting-appropriate names; select one.");
    expect(result.master).toContain("Entry Types (concise sentences):");
    expect(result.master).toContain(
      "Advance each OFF-SCREEN NPC's active agenda each turn (different location than {{user}}).",
    );
    expect(result.master).toContain("Plant Chekhov seed; strengthen Sparks with relevant character.");
    expect(result.master).toContain("Tracks relationship (BOND), affection (Sparks), and resentment (Grudge) qualitatively.");
    expect(result.master).toContain("Sustained fondness can strengthen BOND; neglected fondness fades.");
    expect(result.master).not.toMatch(/Generate 5|select the 5th|1-2|1-3|\+1 Sparks|Scale: -5 to \+20|ct % 5|Sparks >= 7/);
  });
});
