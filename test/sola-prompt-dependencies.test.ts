import { beforeAll, describe, expect, it } from "vitest";
import { loadPresetSources } from "../scripts/build-tomisakae-vn-rp-plugin.js";
import {
  buildRequestMessages,
  createDefaultSettings,
  expandHostMacros,
  type FfGlobalSettings,
  type FfPreset,
} from "../src/core.js";
import { vietnameseOutputFor } from "../src/preset-family.js";
import { estimatePluginPromptTokens } from "../src/token-estimate.js";

const colorId = "01a0c1ff-4ecf-7010-9abd-989d574dc050";
const gradientId = "01a0c1ff-4ecf-7012-9085-a5f80e9134d8";
const signatureId = "blockd632e6bf-a539-460b-8bf9-646ba9354e5c";
const toneId = "01a0c1ff-4ecf-7011-95e8-d19303f862ea";
const kineticId = "01a0c1ff-4ecf-7013-a487-c720d5f9a913";
const overloadId = "01a0c215-20df-7000-b7d6-060e6b7160a9";
const headerId = "01a0c1ff-4ecf-701d-97b3-6626434ed938";
const propsId = "01a0c1ff-4ecf-701c-8c25-cccd4043f936";
const hudId = "01a0c1ff-4ecf-701f-ae98-acfb7b26a41f";
const feelingId = "01a0c1ff-4ecf-7029-a1b8-8b3b57754b2b";
const tempoId = "01a0c1ff-4ecf-7008-a4dc-cfe495078cac";
const host = { characterName: "An", userName: "Tomi" };
const parse = async (text: string) => expandHostMacros(text, host);
const context = { randomInt: (minimum: number) => minimum };
let preset: FfPreset;

beforeAll(async () => {
  preset = (await loadPresetSources()).sola.preset;
});

function withoutTrackers(settings: FfGlobalSettings) {
  for (const prompt of preset.prompts)
    if (/^\[Module\] (?:Tracker:|Roleplay System:)/.test(prompt.name ?? ""))
      settings.promptEnabled[prompt.identifier] = false;
}

async function requestText(settings: FfGlobalSettings) {
  const built = await buildRequestMessages(
    [{ role: "user", content: "Tiếp đi." }],
    preset,
    settings,
    parse,
    context,
  );
  return built.map((message) => message.content).join("\n");
}

describe("Sola cross-module prompt dependencies", () => {
  it.each([true, false])(
    "keeps sound placement inline in enabled reminders and both reviews with Vietnamese=%s",
    async (vietnamese) => {
      const settings = createDefaultSettings(preset);
      settings.vietnameseOutputEnabled = vietnamese;
      const vocal = preset.prompts.find((prompt) => prompt.name?.includes("Voice: Vocal Sounds"))!;
      settings.promptEnabled[vocal.identifier] = true;
      settings.promptEnabled[kineticId] = true;
      for (const id of [
        "01a0c1ff-4ecf-7049-99ca-b8289f911924",
        "01a0c1ff-4ecf-704a-82b3-0c9b9af52526",
        "01a0c1ff-4ecf-704b-80c7-70e3c11b723f",
      ])
        settings.promptEnabled[id] = true;
      const text = await requestText(settings);
      const vocalReminder =
        "- Voice Check (Vocal Sounds): Integrate realistic disfluency, throat sounds, gasps, and non-verbal vocal texture where earned, with vocal sounds on separate lines.";
      expect(text.split(vocalReminder)).toHaveLength(4);
      for (const reminder of text.matchAll(/^- Kinetic Typography:[^\n]*/gm))
        expect(reminder[0]).toContain("standalone sound lines (");
      expect([...text.matchAll(/^- Kinetic Typography:/gm)]).toHaveLength(3);
      expect(text).not.toMatch(/^\s*(?:- )?(?:Keep each vocal sound|Render vocal sounds)/m);

      settings.promptEnabled[vocal.identifier] = false;
      settings.promptEnabled[kineticId] = false;
      const disabled = await requestText(settings);
      expect(disabled).not.toContain("Voice Check (Vocal Sounds)");
      expect(disabled).not.toContain("- Kinetic Typography:");
    },
  );

  it.each([true, false])(
    "removes disabled effects from plain colors and both reviews with Vietnamese=%s",
    async (vietnamese) => {
      const settings = createDefaultSettings(preset);
      settings.vietnameseOutputEnabled = vietnamese;
      settings.dialogueThemeEnabled = false;
      withoutTrackers(settings);
      for (const id of [toneId, kineticId, gradientId, headerId, propsId])
        settings.promptEnabled[id] = false;
      settings.promptEnabled["01a0c1ff-4ecf-704a-82b3-0c9b9af52526"] = true;
      settings.promptEnabled["01a0c1ff-4ecf-7049-99ca-b8289f911924"] = true;
      const snapshot = JSON.stringify(preset);
      const text = await requestText(settings);
      expect(text).toContain("## Style: Dialogue Colors");
      expect(text).toContain(
        "- Dialogue Colors: Keep recurring NPCs in their assigned colors, vocal sounds on separate lines.",
      );
      expect(text).toContain("Knowledge Audit: verify what the NPC personally saw or heard.");
      expect(text).toContain("## Emotional Engine");
      expect(text).toContain("## Idiolect, Dialect & Dialogue Craft");
      expect(text).not.toMatch(/:whisper|:bite|:heavy|:stretch|:tilt|:tone|:kinetic/);
      expect(text).not.toMatch(
        /Chromatic Gradients|Kinetic Emphasis|Tonal Typography|Consistently mix/,
      );
      expect(text).not.toMatch(/<scene_header|<sola_hud|HTML_START|sky identifiers|headers|props/);
      const estimate = await estimatePluginPromptTokens(preset, settings, host);
      const full = await estimatePluginPromptTokens(preset, createDefaultSettings(preset), host);
      expect(estimate.tokens).toBeLessThan(full.tokens);
      expect(JSON.stringify(preset)).toBe(snapshot);
    },
  );

  it.each(Array.from({ length: 16 }, (_, mask) => mask))(
    "keeps only enabled style syntax in modules, overload and review for mask %s",
    async (mask) => {
      for (const vietnamese of [true, false]) {
        for (const signature of [false, true]) {
          const settings = createDefaultSettings(preset);
          settings.vietnameseOutputEnabled = vietnamese;
          settings.dialogueThemeEnabled = false;
          settings.promptEnabled[colorId] = !signature && Boolean(mask & 1);
          settings.promptEnabled[gradientId] = !signature && Boolean(mask & 2);
          settings.promptEnabled[signatureId] = signature && Boolean(mask & 2);
          settings.promptEnabled[toneId] = Boolean(mask & 4);
          settings.promptEnabled[kineticId] = Boolean(mask & 8);
          settings.promptEnabled[overloadId] = true;
          const text = await requestText(settings);
          const color = !signature && Boolean(mask & 1);
          const gradient = Boolean(mask & 2);
          if (!color)
            expect(
              text.match(/<\/?(?:copper|coral|amber|indigo|slate|denim|cider)(?=[:>])/g),
            ).toBeNull();
          if (!gradient)
            expect(
              text.match(/<\/?(?:dusk|solstice|hearth|eclipse|mistveil|wildwood)(?=[:>])/g),
            ).toBeNull();
          if (!(mask & 4))
            expect(
              text.match(
                /:(?:whisper|bite|tremble|steady)|:tone|Tonal Typography|Mixed with (?:Emotional Tone|Tonal)/g,
              ),
            ).toBeNull();
          if (!(mask & 8))
            expect(
              text.match(
                /:(?:heavy|stretch|tilt|echo|crush|fracture)|:kinetic|Kinetic Emphasis|Mixed with Kinetic/g,
              ),
            ).toBeNull();
          if (mask & 4) expect(text).toContain("## Style: Tonal Typography");
          if (mask & 8) expect(text).toContain("## Style: Kinetic Emphasis Engine");
          if (gradient) expect(text).toContain("Chromatic Gradients");
          expect(text).toContain("## Authentic NPCs");
        }
      }
    },
  );

  it("restores original style instructions when their modules are re-enabled", async () => {
    const settings = createDefaultSettings(preset);
    const original = await requestText(settings);
    settings.promptEnabled[toneId] = false;
    settings.promptEnabled[kineticId] = false;
    const reduced = await requestText(settings);
    expect(reduced).not.toContain("<copper:whisper>");
    settings.promptEnabled[toneId] = true;
    settings.promptEnabled[kineticId] = true;
    expect(await requestText(settings)).toBe(original);
  });

  it("keeps enabled tone/kinetic examples valid without color or gradient modules", async () => {
    const settings = createDefaultSettings(preset);
    settings.promptEnabled[colorId] = false;
    settings.promptEnabled[gradientId] = false;
    const text = await requestText(settings);
    expect(text).toContain('<whisper>"Họ ở ngay bên ngoài."</whisper>');
    expect(text).toContain('<heavy>"DỪNG LẠI."</heavy>');
    expect(text).toContain("<heavy>RẦM.</heavy>");
    expect(text).toContain('<tilt:right>"Lối nào?"</tilt>');
  });

  it("drops disabled tracker examples and scores from an enabled HUD", async () => {
    const settings = createDefaultSettings(preset);
    withoutTrackers(settings);
    settings.promptEnabled[hudId] = true;
    settings.promptEnabled["01a0c1ff-4ecf-7025-b750-acb802f5a3ef"] = true;
    const text = await requestText(settings);
    expect(text).toContain("<sola_hud");
    expect(text).toContain("[Append all active tracker blocks here: <wardrobe>.]");
    expect(text).not.toMatch(
      /<story_notes>|<date>|<bond>|<fengine>|<thought_engine>|<char_matrix>|TFDY|T# F#|T1 F2|\[GEAR\]/,
    );
    expect(vietnameseOutputFor(preset, settings)).not.toContain("T/F/D/Y codes");
    settings.promptEnabled[feelingId] = true;
    settings.promptEnabled[tempoId] = true;
    const restored = await requestText(settings);
    expect(restored).toContain("[GEAR]");
    expect(restored).toContain("T# F# D# Y#");
    expect(restored).toContain("[Append all active tracker blocks here: <fengine>, <wardrobe>.]");
  });

  it("keeps display and identifier guidance only for enabled features", () => {
    const settings = createDefaultSettings(preset);
    withoutTrackers(settings);
    for (const id of [colorId, gradientId, toneId, kineticId, propsId, headerId])
      settings.promptEnabled[id] = false;
    const output = vietnameseOutputFor(preset, settings);
    expect(output).not.toMatch(
      /\b(?:HUD|trackers|headers|props|sky|palette|gradient|kinetic|tone names|tempo|fate)\b|T\/F\/D\/Y/,
    );
    expect(output).toContain("natural contemporary Vietnamese");
    settings.promptEnabled[signatureId] = true;
    settings.promptEnabled[headerId] = true;
    const enabled = vietnameseOutputFor(preset, settings);
    expect(enabled).toContain("readable content in headers");
    expect(enabled).toContain("gradient names");
    expect(enabled).toContain("sky identifiers");
  });
});
