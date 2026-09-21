import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  adaptDisplayMarkupForRisuAI,
  applyPromptRegexToMessages,
  buildRequestMessages,
  composePresetPrompts,
  createDefaultSettings,
  expandSourceMacros,
  expandHostMacros,
  type FfPreset,
} from "../risuai/freaky-frankenstein-5.4-plugin/src/core.js";

const source = "C:/Users/tomis/Downloads/Freaky Frankenstein 5.4 Internal States (2).json";

async function preset(): Promise<FfPreset> {
  return JSON.parse(await readFile(source, "utf8")) as FfPreset;
}

describe("FF5.4 RisuAI plugin compatibility", () => {
  it("copies every source prompt and regex toggle default", async () => {
    const data = await preset();
    const settings = createDefaultSettings(data);
    expect(Object.keys(settings.promptEnabled)).toHaveLength(data.prompt_order[0]!.order.length);
    expect(Object.keys(settings.regexEnabled)).toHaveLength(data.extensions!.regex_scripts!.length);
    for (const entry of data.prompt_order[0]!.order) {
      expect(settings.promptEnabled[entry.identifier]).toBe(entry.enabled !== false);
    }
  });

  it("composes setvar/getvar fragments dynamically from enabled modules", () => {
    const variables = new Map<string, string>();
    expect(expandSourceMacros("{{setvar::piece::alpha}}", variables)).toBe("");
    expect(expandSourceMacros("x{{getvar::piece}}y", variables)).toBe("xalphay");
    expect(
      expandSourceMacros("{{setvar::piece::<b>{{user}}</b>}}{{getvar::piece}}", variables),
    ).toBe("<b>{{user}}</b>");
    expect(expandSourceMacros("{{roll::1d20}}", variables, { randomInt: () => 13 })).toBe("13");
  });

  it("resolves FF5.4 host-name macros without the unavailable chat-parser API", () => {
    expect(
      expandHostMacros("{{user}} meets {{CHAR}}. {{scenario}} stays intact.", {
        userName: "Tomi",
        characterName: "Miyabi",
        maxContext: 32768,
        maxResponse: 1024,
      }),
    ).toBe("Tomi meets Miyabi. {{scenario}} stays intact.");
    expect(
      expandHostMacros("{{maxContext}}/{{maxResponseTokens}}", {
        userName: "Tomi",
        characterName: "Miyabi",
        maxContext: 32768,
        maxResponse: 1024,
      }),
    ).toBe("32768/1024");
  });

  it("keeps source prompt text and adds depth-zero internal prompts after the latest message", async () => {
    const data = await preset();
    const settings = createDefaultSettings(data);
    const messages = [
      { role: "system" as const, content: "host" },
      { role: "user" as const, content: "latest" },
    ];
    const built = await buildRequestMessages(messages, data, settings, async (text) =>
      text.replaceAll("{{user}}", "User").replaceAll("{{char}}", "Character"),
    );
    const composed = await composePresetPrompts(data, settings, async (text) =>
      text.replaceAll("{{user}}", "User").replaceAll("{{char}}", "Character"),
    );
    expect(built).toContainEqual(composed.leading.find((entry) => entry.memo === "ff54:main"));
    const latestIndex = built.findIndex((entry) => entry.content === "latest");
    expect(built[latestIndex + 1]!.memo).toContain("ff54:absolute:0");
  });

  it("uses one global settings object rather than card or chat settings", async () => {
    const pluginSource = await readFile(
      "risuai/freaky-frankenstein-5.4-plugin/src/plugin.ts",
      "utf8",
    );
    expect(pluginSource).toContain('const STORAGE_KEY = "ff54-global-settings-v1"');
    expect(pluginSource).toContain('location: "chat"');
    expect(pluginSource).not.toMatch(/getCurrent(Character|Chat)Index|characterIndex|chatIndex/);
    expect(pluginSource.match(/pluginStorage\.getItem\(STORAGE_KEY\)/g)).toHaveLength(1);
    expect(pluginSource.match(/pluginStorage\.setItem\(STORAGE_KEY, settings\)/g)).toHaveLength(1);
    const unavailableParserApi = ["parse", "Risu", "Chat"].join("");
    expect(pluginSource).not.toContain(unavailableParserApi);
  });

  it("does not bundle the unavailable chat-parser API", async () => {
    const artifact = await readFile(
      "risuai/freaky-frankenstein-5.4-plugin/dist/ff54-risuai-plugin.js",
      "utf8",
    );
    expect(artifact).not.toContain(["parse", "Risu", "Chat"].join(""));
    expect(artifact).toContain("//@version 1.0.2");
  });

  it("context-saver regex strips old internal state but keeps the newest", async () => {
    const data = await preset();
    const settings = createDefaultSettings(data);
    const messages = [
      { role: "assistant" as const, content: "old<internal_states>OLD</internal_states>" },
      { role: "user" as const, content: "middle" },
      { role: "assistant" as const, content: "new<internal_states>NEW</internal_states>" },
      { role: "user" as const, content: "latest" },
    ];
    const output = applyPromptRegexToMessages(messages, data, settings);
    expect(output[0]!.content).toBe("old");
    expect(output[2]!.content).toContain("<internal_states>NEW</internal_states>");
  });

  it("uses a RisuAI-safe display wrapper without exposing internal-state tags", () => {
    const input =
      "<!-- GFX_START -->\n<internal_states>\n<details><summary>State</summary>Body</details>\n</internal_states>\n<!-- GFX_END -->";
    const output = adaptDisplayMarkupForRisuAI(input);
    expect(output).toBe(
      '<!-- GFX_START -->\n<div data-ff54="internal-states">\n<details><summary>State</summary>Body</details>\n</div>\n<!-- GFX_END -->',
    );
    expect(output).not.toMatch(/<\/?internal_states>/i);
  });

  it("master disable returns the host request without mutation", async () => {
    const data = await preset();
    const settings = createDefaultSettings(data);
    settings.enabled = false;
    const input = [{ role: "user" as const, content: "unchanged" }];
    await expect(buildRequestMessages(input, data, settings, async (value) => value)).resolves.toBe(
      input,
    );
  });
});
