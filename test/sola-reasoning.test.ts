import { beforeAll, describe, expect, it } from "vitest";
import { loadPresetSources } from "../scripts/build-tomisakae-vn-rp-plugin.js";
import {
  applyRegexScripts,
  createDefaultSettings,
  PLACEMENT_AI_OUTPUT,
  type FfPreset,
} from "../risuai/tomisakae-vn-rp-plugin/src/core.js";
import { splitSolaReasoning } from "../risuai/tomisakae-vn-rp-plugin/src/sola-reasoning.js";

let preset: FfPreset;
beforeAll(async () => {
  preset = (await loadPresetSources()).sola.preset;
});

describe("Sola reasoning boundaries", () => {
  const header = '<scene_header location="Phòng" time="13:40" />';
  const response = `${header}\nAn mở cửa.\n<sola_hud><thought_engine>Suy nghĩ NPC</thought_engine><cabinet>Nội tâm</cabinet></sola_hud>`;

  it.each(["think", "Thoughts", "thinking", "reasoning", "internal_monologue", "storyreview"])(
    "renders and removes %s without touching character thoughts or RP",
    (tag) => {
      const input = `<${tag}>Lập kế hoạch.</${tag}>\n${response}`;
      const settings = createDefaultSettings(preset);
      const cleaned = applyRegexScripts(input, preset, settings, {
        placement: PLACEMENT_AI_OUTPUT,
        prompt: true,
        history: true,
        depth: 0,
      });
      expect(cleaned.trim()).toBe(response);
      const display = applyRegexScripts(input, preset, settings, {
        placement: PLACEMENT_AI_OUTPUT,
        markdown: true,
        depth: 0,
      });
      expect(display).toContain("<summary");
      expect(display).toContain("💭 Suy luận");
      expect(display).toContain("Lập kế hoạch.");
      expect(display).not.toContain(`<${tag}>`);
      expect(display).toContain("Suy nghĩ NPC");
      expect(splitSolaReasoning(input).response).toBe(response);
    },
  );

  it("handles long, consecutive and markdown reasoning without a character cap", () => {
    const input = `<think>${"Plan. ".repeat(6000)}</think>\n<Thoughts>Check.</Thoughts>\n### Story Review\nAudit.\n### Response\n${response}`;
    const cleaned = applyRegexScripts(input, preset, createDefaultSettings(preset), {
      placement: PLACEMENT_AI_OUTPUT,
      prompt: true,
      history: true,
      depth: 0,
    });
    expect(cleaned.trim()).toBe(response);
    const split = splitSolaReasoning(input);
    expect(split.response).toBe(response);
    expect(split.prefix + split.response).toBe(input);
  });

  it.each([
    "Let me review the scene.",
    "Task 0: Gamestate\nTask 1: NPC Check",
    "## Story Review\nNPC Check",
  ])("removes untagged planning before the header: %s", (planning) => {
    const input = `${planning}\n\n${response}`;
    const settings = createDefaultSettings(preset);
    expect(
      applyRegexScripts(input, preset, settings, {
        placement: PLACEMENT_AI_OUTPUT,
        prompt: true,
        history: true,
        depth: 0,
      }),
    ).toBe(response);
    expect(splitSolaReasoning(input).response).toBe(response);
    const display = applyRegexScripts(input, preset, settings, {
      placement: PLACEMENT_AI_OUTPUT,
      markdown: true,
      depth: 0,
    });
    expect(display).toContain("💭 Suy luận");
    for (const line of planning.split("\n")) expect(display).toContain(line);
  });

  it("leaves older mid-scene narration and headerless prose intact", () => {
    for (const input of [`An mở cửa.\n${response}`, "Let me in, she says."]) {
      expect(splitSolaReasoning(input)).toEqual({ prefix: "", response: input });
      expect(
        applyRegexScripts(input, preset, createDefaultSettings(preset), {
          placement: PLACEMENT_AI_OUTPUT,
          prompt: true,
          history: true,
          depth: 0,
        }),
      ).toBe(input);
    }
  });

  it("respects independent display/delete toggles even with Vietnamese Output off", () => {
    const input = `<think>Plan.</think>\n${response}`;
    const settings = createDefaultSettings(preset);
    settings.vietnameseOutputEnabled = false;
    settings.regexEnabled["vn-rp-sola-reasoning-delete-tagged"] = false;
    expect(
      applyRegexScripts(input, preset, settings, {
        placement: PLACEMENT_AI_OUTPUT,
        prompt: true,
        history: true,
        depth: 0,
      }),
    ).toBe(input);
    expect(
      applyRegexScripts(input, preset, settings, {
        placement: PLACEMENT_AI_OUTPUT,
        markdown: true,
        depth: 0,
      }),
    ).toContain("💭 Reasoning");
    settings.regexEnabled["vn-rp-sola-reasoning-display-tagged"] = false;
    expect(
      applyRegexScripts(input, preset, settings, {
        placement: PLACEMENT_AI_OUTPUT,
        markdown: true,
        depth: 0,
      }),
    ).toContain("<think>Plan.</think>");
  });
});
