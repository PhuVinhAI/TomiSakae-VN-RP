import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  buildRequestMessages,
  composePresetPrompts,
  createDefaultSettings,
  expandHostMacros,
  normalizeSettings,
  type FfPreset,
} from "../src/core.js";
import { addImageReasoningGuidance, IMAGE_OPTIMIZATION_PROMPT } from "../src/image.js";
import { adaptPromptForVietnamese } from "../src/vietnamese.js";
import { estimatePluginPromptTokens } from "../src/token-estimate.js";

const reasoningTasks = [
  ["019f62e8-892f-7032-b004-1869f8bc0782", "  B. You must list out concisely"],
  ["634ecfec-1862-4ce0-821e-e31057acadfa", "7. Formatting:"],
  ["b5db9430-857a-408c-817c-32e975a71430", "2. Prose, Formatting & Boundaries:"],
] as const;

describe("Card image optimization", () => {
  it.each([true, false])(
    "integrates one image check into each existing CoT task with Vietnamese Output %s",
    async (vietnamese) => {
      const preset = JSON.parse(
        await readFile("source/ff54-sillytavern-preset.json", "utf8"),
      ) as FfPreset;
      const snapshot = structuredClone(preset);
      const settings = createDefaultSettings(preset);
      expect(settings.imageOptimizationEnabled).toBe(false);
      expect(
        normalizeSettings(preset, { imageOptimizationEnabled: true }).imageOptimizationEnabled,
      ).toBe(true);
      settings.vietnameseOutputEnabled = vietnamese;
      for (const [id] of reasoningTasks) settings.promptEnabled[id] = true;
      const off = await composePresetPrompts(preset, settings, async (text) => text, {
        randomInt: (minimum) => minimum,
      });
      settings.imageOptimizationEnabled = true;
      const on = await composePresetPrompts(preset, settings, async (text) => text, {
        randomInt: (minimum) => minimum,
      });
      expect(on.leading.filter((message) => message.memo === "ff54:image-optimization")).toEqual([
        { role: "system", content: IMAGE_OPTIMIZATION_PROMPT, memo: "ff54:image-optimization" },
      ]);
      for (const [id, taskMarker] of reasoningTasks) {
        const source = String(preset.prompts.find((prompt) => prompt.identifier === id)!.content);
        const before = vietnamese ? adaptPromptForVietnamese(source) : source;
        const after = addImageReasoningGuidance(before);
        const beforeLines = before.split("\n");
        const afterLines = after.split("\n");
        expect(afterLines).toHaveLength(beforeLines.length);
        const changed = afterLines.filter((line, index) => line !== beforeLines[index]);
        expect(changed).toHaveLength(1);
        expect(changed[0]!.startsWith(taskMarker)).toBe(true);
        expect(changed[0]).toContain("<image_optimization>");
        expect(addImageReasoningGuidance(after)).toBe(after);
        expect(
          [...on.leading, ...on.absolute].some((message) => message.content.includes(changed[0]!)),
        ).toBe(true);
      }
      settings.imageOptimizationEnabled = false;
      expect(
        await composePresetPrompts(preset, settings, async (text) => text, {
          randomInt: (minimum) => minimum,
        }),
      ).toEqual(off);
      expect(preset).toEqual(snapshot);
    },
  );

  it("counts the system module and CoT additions once and rebuilds without duplicate injections", async () => {
    const preset = JSON.parse(
      await readFile("source/ff54-sillytavern-preset.json", "utf8"),
    ) as FfPreset;
    const settings = createDefaultSettings(preset);
    settings.imageOptimizationEnabled = true;
    const host = { characterName: "An", userName: "Tomi" };
    const request = await buildRequestMessages(
      [{ role: "system", content: "Card and lore.", memo: "card" }],
      preset,
      settings,
      async (text) => expandHostMacros(text, host),
      { randomInt: (minimum) => minimum },
    );
    const estimate = await estimatePluginPromptTokens(preset, settings, host);
    expect(
      estimate.entries.filter((entry) => entry.identifier === "image-optimization"),
    ).toHaveLength(1);
    expect(estimate.messageCount).toBe(
      request.filter((message) => message.memo?.startsWith("ff54:")).length,
    );
    const retried = await buildRequestMessages(
      request,
      preset,
      settings,
      async (text) => expandHostMacros(text, host),
      { randomInt: (minimum) => minimum },
    );
    expect(retried).toEqual(request);
    expect(request.findIndex((message) => message.memo === "ff54:image-optimization")).toBeLessThan(
      request.findIndex((message) => message.memo === "card"),
    );
    settings.imageOptimizationEnabled = false;
    const off = await estimatePluginPromptTokens(preset, settings, host);
    expect(off.entries.some((entry) => entry.identifier === "image-optimization")).toBe(false);
    expect(off.tokens).toBeLessThan(estimate.tokens);
  });
});
