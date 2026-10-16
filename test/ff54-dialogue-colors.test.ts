import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { adaptDialogueColors, resolveDialogueTheme } from "../src/dialogue-colors.js";
import type { FfPreset } from "../src/core.js";

describe("theme-aware dialogue palettes", () => {
  it("filters the existing named palette for a light UI without adding guidance", () => {
    const source =
      "<colored_dialogue>\nMust replace color in tag with: cyan, pink, teal, orange, gold, violet, salmon, orchid, yellow, plum\nRules:\n- Keep colors.\n</colored_dialogue>";
    const output = adaptDialogueColors(source, { type: "light", background: "#ffffff" });
    expect(output).toContain("Must replace color in tag with: teal");
    expect(output).toContain("darkgreen");
    expect(output).not.toContain("cyan");
    expect(output).not.toContain("Contrast:");
    expect(output).toContain("Rules:");
  });

  it("filters an existing HEX palette for a dark UI and preserves ordering", () => {
    const source =
      "<colored_dialogue>\nPalette: #56B4E9, #E69F00, #009E73, #CC79A7, #D55E00\n</colored_dialogue>";
    const output = adaptDialogueColors(source, { type: "dark", background: "#282a36" });
    expect(output).toContain("Palette: #56B4E9, #E69F00, #CC79A7");
    expect(output).not.toContain("#009E73");
    expect(output).not.toContain("#D55E00");
  });

  it("returns no theme when the host API is unavailable", () => {
    expect(resolveDialogueTheme(undefined)).toBeUndefined();
  });

  it.each(["light", "dark"] as const)(
    "keeps source rules and examples consistent with an expanded %s palette",
    async (type) => {
      const preset = JSON.parse(
        await readFile("source/ff54-sillytavern-preset.json", "utf8"),
      ) as FfPreset;
      const snapshot = structuredClone(preset);
      const source = String(
        preset.prompts.find(
          (prompt) => prompt.identifier === "019f62e8-892f-7019-be65-715a4949cba0",
        )!.content,
      );
      const theme = { type, background: type === "light" ? "#ffffff" : "#1a1a1a" };
      const output = adaptDialogueColors(source, theme);
      const palette = output.match(/^Must replace color in tag with: (.+)$/m)![1]!.split(", ");
      expect(palette.length).toBeGreaterThanOrEqual(18);
      expect(new Set(palette).size).toBe(palette.length);
      const exampleColor = output.match(/^Example: <([a-z]+):/m)![1];
      expect(palette).toContain(exampleColor);
      const omitPaletteAndExample = (text: string) =>
        text
          .split("\n")
          .filter((line) => !/^(Must replace color in tag with:|Example:)/.test(line));
      expect(omitPaletteAndExample(output)).toEqual(omitPaletteAndExample(source));
      expect(adaptDialogueColors(output, theme)).toBe(output);
      expect(adaptDialogueColors(source)).toBe(source);
      expect(preset).toEqual(snapshot);
    },
  );
});
