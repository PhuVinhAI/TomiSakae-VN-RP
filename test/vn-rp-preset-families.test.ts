import { readFile } from "node:fs/promises";
import { describe, expect, it, beforeAll } from "vitest";
import { loadPresetSources } from "../scripts/build-tomisakae-vn-rp-plugin.js";
import {
  applyRegexScripts,
  buildRequestMessages,
  composePresetPrompts,
  createDefaultSettings,
  expandHostMacros,
  normalizeSettings,
  PLACEMENT_AI_OUTPUT,
} from "../risuai/tomisakae-vn-rp-plugin/src/core.js";
import {
  PRESET_FAMILIES,
  pluginMemoPrefix,
  presetOrder,
  vietnameseOutputFor,
  type PresetSources,
} from "../risuai/tomisakae-vn-rp-plugin/src/preset-family.js";
import {
  createConfigPreset,
  normalizePresetStore,
  presetForCard,
  selectCardPreset,
  switchPresetFamily,
} from "../risuai/tomisakae-vn-rp-plugin/src/presets.js";
import {
  editorSystemFor,
  editorUserFor,
  insertSubmodelEditorSystem,
} from "../risuai/tomisakae-vn-rp-plugin/src/editor-prompts.js";
import { estimatePluginPromptTokens } from "../risuai/tomisakae-vn-rp-plugin/src/token-estimate.js";
import {
  familyPromptSections,
  familyChoiceGroups,
  normalizeFamilyChoices,
} from "../risuai/tomisakae-vn-rp-plugin/src/family-ui.js";
import { promptUiCopy } from "../risuai/tomisakae-vn-rp-plugin/src/ui-vi.js";
import { adaptSolaSceneHeaderForDisplay } from "../risuai/tomisakae-vn-rp-plugin/src/sola-display.js";
import {
  adaptSolaDialogueColors,
  SOLA_DIALOGUE_COLORS,
  textContrast,
} from "../risuai/tomisakae-vn-rp-plugin/src/dialogue-colors.js";

let sources: PresetSources;
const host = { characterName: "An", userName: "TomiSakae" };
const parse = async (text: string) => expandHostMacros(text, host);
beforeAll(async () => {
  sources = await loadPresetSources();
});

describe("TomiSakae VN-RP preset families", () => {
  it("uses full names and versions and bundles source prompts/regex unchanged", async () => {
    expect(PRESET_FAMILIES.map((p) => p.name)).toEqual([
      "Freaky Frankenstein 5.4",
      "Sola V2 Flame",
      "Voyage-Universal-v5",
    ]);
    for (const [family, filename] of [
      ["sola", "sola-v2-flame.json"],
      ["voyage", "voyage-universal-v5.json"],
    ] as const) {
      const original = JSON.parse(
        await readFile(`risuai/tomisakae-vn-rp-plugin/source/${filename}`, "utf8"),
      );
      expect(sources[family].preset.prompts).toEqual(original.prompts);
      expect(sources[family].preset.prompt_order).toEqual(original.prompt_order);
      expect(sources[family].preset.extensions?.regex_scripts).toEqual(
        original.extensions?.regex_scripts ?? [],
      );
      expect(sources[family].preset).not.toHaveProperty("proxy_password");
    }
  });

  it("selects Voyage's populated order rather than its placeholder order", async () => {
    const preset = sources.voyage.preset;
    expect(preset.prompt_order[0]?.order).toHaveLength(9);
    expect(presetOrder(preset)).toHaveLength(48);
    const settings = createDefaultSettings(preset);
    expect(Object.keys(settings.promptEnabled)).toHaveLength(48);
    const built = await buildRequestMessages(
      [{ role: "user", content: "Tôi vào phòng." }],
      preset,
      settings,
      parse,
    );
    const text = built.map((m) => m.content).join("\n");
    expect(text).toContain('"The Unknown World" TTRPG');
    expect(text).toContain("## Rule: Direct Prose");
    expect(text).toContain("## Rule: Vietnamese Output");
    expect(text).not.toContain("<internal_states>");
    const recall = built.findIndex((m) => m.content.includes("internally recall ALL"));
    expect(recall).toBeGreaterThan(built.findIndex((m) => m.content === "Tôi vào phòng."));
  });

  it("expands Sola's module banks, dice/random macros, and depth injections", async () => {
    const preset = sources.sola.preset;
    const result = await composePresetPrompts(preset, createDefaultSettings(preset), parse, {
      randomInt: (minimum) => minimum,
    });
    const text = [...result.leading, ...result.absolute, ...result.trailing]
      .map((m) => m.content)
      .join("\n");
    expect(text).toContain("## Story Review");
    expect(text).toContain("## Showrunner Master HUD");
    expect(text).toContain("OPEN (first sentence)");
    expect(text).not.toMatch(/\{\{(?:setvar|getvar|random|roll|trim|user|char)(?:::|\}\})/i);
    expect(result.absolute.some((m) => m.content.includes("Story Review"))).toBe(true);
    expect(result.trailing.some((m) => m.content.includes("## Post-History"))).toBe(true);
  });

  it("keeps Global features and each family's module bank through switches/reload", () => {
    const original = createDefaultSettings(sources.ff54.preset);
    original.submodelEditorEnabled = true;
    original.soundNotificationsEnabled = true;
    original.imageOptimizationEnabled = true;
    const id = Object.keys(original.promptEnabled)[0]!;
    original.promptEnabled[id] = false;
    const sola = switchPresetFamily(original, sources.sola.preset);
    const solaId = Object.keys(sola.promptEnabled)[1]!;
    sola.promptEnabled[solaId] = false;
    const voyage = switchPresetFamily(sola, sources.voyage.preset);
    const stored = normalizePresetStore(
      sources.ff54.preset,
      {
        version: 1,
        presets: [{ id: "default", name: "Mặc định", settings: voyage }],
        cardPresets: { card: "default" },
      },
      undefined,
      sources,
    );
    expect(stored.presets[0]!.settings.presetFamily).toBe("voyage");
    expect(Object.keys(stored.presets[0]!.settings.promptEnabled)).toHaveLength(48);
    const back = switchPresetFamily(stored.presets[0]!.settings, sources.ff54.preset);
    expect(back.promptEnabled).toEqual(original.promptEnabled);
    expect(back.submodelEditorEnabled).toBe(true);
    expect(back.soundNotificationsEnabled).toBe(true);
    expect(back.imageOptimizationEnabled).toBe(true);
    expect(switchPresetFamily(back, sources.sola.preset).promptEnabled[solaId]).toBe(false);
  });

  it("migrates existing profiles to Freaky Frankenstein 5.4", () => {
    const store = normalizePresetStore(
      sources.ff54.preset,
      undefined,
      { submodelEditorEnabled: true },
      sources,
    );
    expect(store.presets[0]!.settings.submodelEditorEnabled).toBe(true);
    expect(switchPresetFamily(store.presets[0]!.settings, sources.sola.preset).presetFamily).toBe(
      "sola",
    );
  });

  it.each(["ff54", "sola", "voyage"] as const)(
    "reloads a custom %s profile and its card assignment",
    (family) => {
      const preset = sources[family].preset;
      const store = normalizePresetStore(sources.ff54.preset, undefined, undefined, sources);
      const settings = createDefaultSettings(preset);
      settings.dialogueThemeEnabled = false;
      settings.vietnameseOutputEnabled = false;
      settings.submodelAutoRewriteEnabled = true;
      const id = Object.keys(settings.promptEnabled)[0]!;
      settings.promptEnabled[id] = false;
      createConfigPreset(store, `Custom ${family}`, settings, "custom");
      selectCardPreset(store, "card", "custom");
      const reloaded = normalizePresetStore(
        sources.ff54.preset,
        JSON.parse(JSON.stringify(store)),
        undefined,
        sources,
      );
      expect(presetForCard(reloaded, "card")).toEqual(store.presets[1]);
      expect(presetForCard(reloaded, "new-card").id).toBe("default");
    },
  );

  it.each(["ff54", "sola", "voyage"] as const)(
    "inserts the %s editor before relative post-history instructions",
    async (family) => {
      const preset = sources[family].preset;
      const settings = createDefaultSettings(preset);
      settings.promptEnabled.jailbreak = true;
      const references = await buildRequestMessages(
        [{ role: "user", content: "Tiếp đi." }],
        preset,
        settings,
        parse,
        { randomInt: (min) => min },
      );
      const snapshot = structuredClone(references);
      const composed = await composePresetPrompts(preset, settings, parse, {
        randomInt: (min) => min,
      });
      const sent = insertSubmodelEditorSystem(references, preset);
      const editorIndex = sent.findIndex(
        (message) => message.memo === `${pluginMemoPrefix(preset)}submodel-editor`,
      );
      const trailingIndex = sent.findIndex(
        (message) => message.memo === composed.trailing[0]?.memo,
      );
      expect(editorIndex).toBeGreaterThan(-1);
      expect(editorIndex + 1).toBe(trailingIndex);
      expect(sent[editorIndex]?.role).toBe("system");
      expect(sent.filter((_message, index) => index !== editorIndex)).toEqual(snapshot);
      expect(references).toEqual(snapshot);
    },
  );

  it("appends the editor when all post-history modules are off", async () => {
    const preset = sources.voyage.preset;
    const settings = createDefaultSettings(preset);
    const order = presetOrder(preset);
    for (const entry of order.slice(
      order.findIndex((entry) => entry.identifier === "chatHistory") + 1,
    ))
      settings.promptEnabled[entry.identifier] = false;
    const references = await buildRequestMessages(
      [{ role: "user", content: "Tiếp đi." }],
      preset,
      settings,
      parse,
    );
    const sent = insertSubmodelEditorSystem(references, preset);
    expect(sent.slice(0, -1)).toEqual(references);
    expect(sent.at(-1)?.memo).toBe("vn-rp:voyage:submodel-editor");
  });

  it("preserves source regex defaults and keeps Sola's disabled master saver off across reload/switch", () => {
    for (const family of ["sola", "voyage"] as const) {
      const preset = sources[family].preset;
      const defaults = createDefaultSettings(preset);
      for (const script of preset.extensions?.regex_scripts ?? [])
        expect(defaults.regexEnabled[script.id]).toBe(script.disabled !== true);
    }
    const preset = sources.sola.preset;
    const script = preset.extensions!.regex_scripts!.find((script) => script.disabled)!;
    const settings = normalizeSettings(preset, { regexEnabled: {} });
    const switched = switchPresetFamily(
      switchPresetFamily(settings, sources.voyage.preset),
      preset,
    );
    const reloaded = normalizeSettings(preset, JSON.parse(JSON.stringify(switched)));
    expect(reloaded.regexEnabled[script.id]).toBe(false);
    const state = "<cabinet>Hidden continuity</cabinet>";
    expect(
      applyRegexScripts(state, preset, reloaded, {
        placement: PLACEMENT_AI_OUTPUT,
        prompt: true,
        depth: 9,
      }),
    ).toBe(state);
    // A deliberate toggle remains available; the source flag is a default, not a lock.
    reloaded.regexEnabled[script.id] = true;
    expect(
      applyRegexScripts(state, preset, reloaded, {
        placement: PLACEMENT_AI_OUTPUT,
        prompt: true,
        depth: 9,
      }),
    ).toBe("");
  });

  it("adapts Sola POV in both the main rules and Story Review while preserving perspective boundaries", async () => {
    const preset = sources.sola.preset;
    const group = familyChoiceGroups(preset).find((group) => group.id === "pov")!;
    for (const id of group.memberIds) {
      const settings = createDefaultSettings(preset);
      for (const choice of group.memberIds) settings.promptEnabled[choice] = choice === id;
      const messages = await buildRequestMessages(
        [{ role: "user", content: "Tiếp đi." }],
        preset,
        settings,
        parse,
        { randomInt: (min) => min },
      );
      const text = messages.map((message) => message.content).join("\n");
      expect(text).not.toMatch(
        /\("I"\/"me"\/"my"\)|\("you"(?:\/"your")?\)|he\/she\/they\/name|"he\/she\/name"/,
      );
      expect(text).toContain("Vietnamese");
      expect(text).toContain("POV Check");
      expect(text).toContain("interiority");
    }
  });

  it("keeps Sola pronoun selections exclusive and uses the correct source names in UI", () => {
    const preset = sources.sola.preset;
    const settings = createDefaultSettings(preset);
    const group = familyChoiceGroups(preset).find((group) => group.id === "pronouns")!;
    for (const id of group.memberIds) settings.promptEnabled[id] = true;
    normalizeFamilyChoices(preset, settings);
    expect(group.memberIds.filter((id) => settings.promptEnabled[id])).toHaveLength(1);
    for (const family of ["sola", "voyage"] as const) {
      const prompt = sources[family].preset.prompts.find(
        (prompt) => prompt.identifier === "jailbreak",
      )!;
      expect(promptUiCopy(prompt, family).name).toBe(prompt.name);
      expect(promptUiCopy(prompt, family).description).not.toContain("DS4 Pro");
    }
  });

  it.each(["sola", "voyage"] as const)(
    "uses %s's native language, editor, image rules and UI modules",
    async (family) => {
      const preset = sources[family].preset;
      const settings = createDefaultSettings(preset);
      settings.imageOptimizationEnabled = true;
      const built = await buildRequestMessages(
        [{ role: "user", content: "Chào." }],
        preset,
        settings,
        parse,
        { randomInt: (min) => min },
      );
      const all = built.map((m) => m.content).join("\n");
      expect(all).toContain(vietnameseOutputFor(preset));
      expect(all).toContain(family === "sola" ? "## Image Coverage" : "## Rule: Image Coverage");
      expect(all).not.toContain("<vietnamese_output>");
      expect(all).not.toContain("<image_optimization>");
      expect(all).not.toContain("Max 2 clauses per sentence");
      expect(editorSystemFor(preset)).not.toContain("manga, anime, and light-novel pacing");
      expect(editorSystemFor(preset)).not.toContain("shout, whisper, measured, tremble");
      expect(editorUserFor(preset)).not.toContain("<internal_states>");
      const visible = [
        ...familyChoiceGroups(preset).flatMap((g) => g.memberIds),
        ...familyPromptSections(preset).flatMap((s) => s.promptIds),
      ];
      for (const entry of presetOrder(preset)) {
        const prompt = preset.prompts.find((p) => p.identifier === entry.identifier);
        if (!prompt?.marker && typeof prompt?.content === "string" && prompt.content.trim())
          expect(visible).toContain(entry.identifier);
      }
      const estimate = await estimatePluginPromptTokens(preset, settings, host);
      expect(estimate.tokens).toBeGreaterThan(1000);
      expect(estimate.entries.some((entry) => entry.identifier === "image-optimization")).toBe(
        true,
      );
      expect(estimate.entries.some((entry) => entry.identifier === "vietnamese-output")).toBe(true);
    },
  );

  it.each(["sola", "voyage"] as const)(
    "returns %s's original prompts when Global prompt features are off",
    async (family) => {
      const preset = sources[family].preset;
      const settings = createDefaultSettings(preset);
      settings.vietnameseOutputEnabled = false;
      settings.imageOptimizationEnabled = false;
      settings.dialogueThemeEnabled = false;
      const observed = new Map<string, string>();
      await composePresetPrompts(preset, settings, parse, { randomInt: (min) => min }, (m, p) =>
        observed.set(p.identifier, m.content),
      );
      expect([...observed.values()].join("\n")).not.toContain("natural Vietnamese");
      expect([...observed.values()].join("\n")).not.toContain("Image Coverage");
    },
  );

  it("keeps Sola's custom palette names readable in prompt and rendered speech", () => {
    for (const background of ["#282a36", "#f5f5f5", "#808080"]) {
      const theme = {
        type: background === "#282a36" ? ("dark" as const) : ("light" as const),
        background,
      };
      const text = adaptSolaDialogueColors(
        Object.entries(SOLA_DIALOGUE_COLORS)
          .map(([name, hex]) => `${name}: ${hex}`)
          .join("\n"),
        theme,
      );
      for (const line of text.split("\n"))
        expect(textContrast(line.split(": ")[1]!, background)).toBeGreaterThanOrEqual(4.5);
      const displayed = applyRegexScripts(
        '<copper:bite>"Chào."</copper>',
        sources.sola.preset,
        createDefaultSettings(sources.sola.preset),
        { placement: PLACEMENT_AI_OUTPUT, markdown: true, depth: 0, dialogueTheme: theme },
      );
      expect(displayed).not.toContain("<copper");
      expect(displayed).toContain("--FontColorQuote1:");
      expect(displayed).toContain("font-weight:700");
    }
  });

  it("renders Vietnamese Sola headers, trackers, gradients and tones with source regex", () => {
    const input =
      '<scene_header location="Phòng khách" time="13:40" atmosphere="Nắng nhẹ" />\n<sola_hud digest="Ngày 1 · 13:40 · STEADY"><date>Day: 1\nTime: 13:40</date></sola_hud>';
    const normalized = adaptSolaSceneHeaderForDisplay(input);
    expect(normalized).toContain('sky="day"');
    const rendered = applyRegexScripts(
      normalized,
      sources.sola.preset,
      createDefaultSettings(sources.sola.preset),
      { placement: PLACEMENT_AI_OUTPUT, markdown: true, depth: 0 },
    );
    expect(rendered).not.toContain("<scene_header");
    expect(rendered).not.toContain("<sola_hud");
    expect(rendered).not.toContain("<date>");
    expect(rendered).toContain("Phòng khách");
    expect(
      adaptSolaSceneHeaderForDisplay(
        '<scene_header location="Đường" time="10:00" atmosphere="Mưa lớn" />',
      ),
    ).toContain('sky="noir"');
  });
});
