import { describe, expect, it } from "vitest";
import { buildPreset, parsePreset } from "../scripts/risuai-preset-builder.js";

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
});
