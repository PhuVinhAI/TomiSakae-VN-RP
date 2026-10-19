import { readFile } from "node:fs/promises";
import { encode } from "gpt-tokenizer/encoding/o200k_base";
import { describe, expect, it, vi } from "vitest";
import {
  buildRequestMessages,
  createDefaultSettings,
  expandHostMacros,
  type FfPreset,
} from "../src/core.js";
import { estimatePluginPromptTokens } from "../src/token-estimate.js";
import { collectCardImages } from "../src/card-images.js";

const host = { characterName: "An", userName: "Tomi", maxContext: 32768, maxResponse: 8192 };
const tokenCount = (text: string) => encode(text, { disallowedSpecial: new Set<string>() }).length;

describe("Plugin dashboard token estimates", () => {
  it("counts expanded enabled prompts, skips comments and host markers, and follows fragment dependencies", async () => {
    const preset: FfPreset = {
      prompts: [
        {
          identifier: "main",
          content: "{{// ignored source comment}}{{setvar::template::}}Hello {{char}}.",
        },
        { identifier: "producer", content: "{{setvar::template::Bond: 3}}Track relationships." },
        {
          identifier: "consumer",
          content: "<state>{{getvar::template}}</state> {{roll::1d20}}",
          injection_position: 1,
          role: "user",
        },
        { identifier: "unused", content: "Not enabled." },
        { identifier: "charDescription", content: "Host card text." },
      ],
      prompt_order: [
        {
          order: [
            { identifier: "main" },
            { identifier: "producer" },
            { identifier: "consumer" },
            { identifier: "unused", enabled: false },
            { identifier: "charDescription" },
          ],
        },
      ],
    };
    const settings = createDefaultSettings(preset);
    settings.vietnameseOutputEnabled = false;
    const snapshot = structuredClone({ preset, settings });
    const random = vi.spyOn(Math, "random");
    try {
      const estimate = await estimatePluginPromptTokens(preset, settings, host);
      expect(random).not.toHaveBeenCalled();
      expect(estimate.entries).toEqual([
        { identifier: "main", tokens: tokenCount("Hello An.") },
        { identifier: "producer", tokens: tokenCount("Track relationships.") },
        { identifier: "consumer", tokens: tokenCount("<state>Bond: 3</state> 1") },
      ]);
      expect(estimate.messageCount).toBe(3);
      settings.promptEnabled.producer = false;
      const reduced = await estimatePluginPromptTokens(preset, settings, host);
      expect(reduced.entries.find((entry) => entry.identifier === "consumer")?.tokens).toBe(
        tokenCount("<state></state> 1"),
      );
      expect(reduced.tokens).toBeLessThan(estimate.tokens);
      expect(preset).toEqual(snapshot.preset);
      settings.promptEnabled.producer = true;
      expect(settings).toEqual(snapshot.settings);
    } finally {
      random.mockRestore();
    }
  });

  it.each([
    [true, false, 2],
    [false, false, 1],
    [true, true, 0],
    [false, true, 3],
    [true, false, 3],
  ] as const)(
    "matches the actual injected prompt text with Vietnamese Output %s, Submodel %s and Gemma level %s",
    async (vietnamese, submodel, level) => {
      const preset = JSON.parse(
        await readFile("source/ff54-sillytavern-preset.json", "utf8"),
      ) as FfPreset;
      const settings = createDefaultSettings(preset);
      settings.vietnameseOutputEnabled = vietnamese;
      settings.submodelEditorEnabled = submodel;
      settings.imageOptimizationEnabled = true;
      settings.gemmaFixEnabled = true;
      settings.gemmaFixNsfwLevel = level;
      settings.cardImageCatalogEnabled = true;
      const themedHost = {
        ...host,
        dialogueTheme: { type: "light" as const, background: "#ffffff" },
        cardImageCatalog: collectCardImages({
          additionalAssets: [["outfit.smile.1.png", "assets/a.png", "png"]],
        }),
      };
      const estimate = await estimatePluginPromptTokens(preset, settings, themedHost);
      const request = await buildRequestMessages(
        [
          { role: "system", content: "Card, lore, memory: must not count." },
          { role: "assistant", content: "Old chat: must not count." },
          { role: "user", content: "Latest user message: must not count." },
        ],
        preset,
        settings,
        async (text) => expandHostMacros(text, host),
        {
          randomInt: (minimum) => minimum,
          dialogueTheme: themedHost.dialogueTheme,
          cardImageCatalog: themedHost.cardImageCatalog,
        },
      );
      const added = request.filter((message) => message.memo?.startsWith("ff54:"));
      const suffix = request.find((message) => message.vnRpGemmaFixSuffix)?.vnRpGemmaFixSuffix;
      expect(suffix).toBeDefined();
      expect(estimate.contentTokens).toBe(
        added.reduce((total, message) => total + tokenCount(message.content), 0) +
          tokenCount(suffix!),
      );
      expect(estimate.messageCount).toBe(added.length);
      expect(estimate.cardImages).toMatchObject({ imageCount: 1, keywordCount: 1 });
      expect(estimate.cardImages!.tokens).toBe(
        tokenCount(added.find((message) => message.memo === "ff54:card-image-catalog")!.content),
      );
      expect(estimate.framingTokens).toBe(
        added.reduce((total, message) => total + 3 + tokenCount(message.role), 0),
      );
      expect(
        estimate.entries.filter((entry) => entry.identifier === "image-optimization"),
      ).toHaveLength(1);
      expect(estimate.entries.some((entry) => entry.identifier === "vietnamese-output")).toBe(
        vietnamese,
      );
    },
  );

  it("counts literal special markers as text and adds nothing when the master switch is off", async () => {
    const preset: FfPreset = {
      prompts: [{ identifier: "main", content: "Literal <|endoftext|> marker." }],
      prompt_order: [{ order: [{ identifier: "main" }] }],
    };
    const settings = createDefaultSettings(preset);
    settings.vietnameseOutputEnabled = false;
    expect((await estimatePluginPromptTokens(preset, settings, host)).contentTokens).toBe(
      tokenCount("Literal <|endoftext|> marker."),
    );
    settings.enabled = false;
    expect(await estimatePluginPromptTokens(preset, settings, host)).toEqual({
      tokens: 0,
      contentTokens: 0,
      framingTokens: 0,
      messageCount: 0,
      entries: [],
    });
  });
});
