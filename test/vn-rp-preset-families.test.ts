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
} from "../src/core.js";
import {
  PRESET_FAMILIES,
  familyPrompts,
  familyRegexScripts,
  pluginMemoPrefix,
  presetOrder,
  vietnameseOutputFor,
  adaptFamilyPrompt,
  type PresetSources,
} from "../src/preset-family.js";
import {
  createConfigPreset,
  normalizePresetStore,
  presetForCard,
  selectCardPreset,
  switchPresetFamily,
} from "../src/presets.js";
import {
  editorSystemFor,
  editorUserFor,
  insertSubmodelEditorSystem,
} from "../src/editor-prompts.js";
import { estimatePluginPromptTokens } from "../src/token-estimate.js";
import {
  familyPromptSections,
  familyChoiceGroups,
  familyHiddenPromptIds,
  familyRegexGroups,
  normalizeFamilyChoices,
} from "../src/family-ui.js";
import { promptUiCopy, regexUiCopy } from "../src/ui-vi.js";
import { solaRegexUiCopy } from "../src/preset-ui-copy.js";
import { adaptSolaSceneHeaderForDisplay } from "../src/sola-display.js";
import { adaptSolaPromptForVietnamese, SOLA_VIETNAMESE_REPLACEMENTS } from "../src/vietnamese.js";
import { adaptSolaPunctuation, SOLA_PUNCTUATION_REPLACEMENTS } from "../src/sola-punctuation.js";
import { adaptSolaRegexForVietnamese } from "../src/sola-vietnamese-regex.js";
import { GEMMA_FIX_PROMPT, gemmaFixPromptFor } from "../src/gemma-fix.js";
import { adaptSolaSoundPlacement, SOLA_SOUND_REPLACEMENTS } from "../src/sola-sound.js";
import { cardImagePrompt, collectCardImages } from "../src/card-images.js";
import {
  adaptSolaDialogueColors,
  SOLA_DIALOGUE_COLORS,
  textContrast,
} from "../src/dialogue-colors.js";

let sources: PresetSources;
const host = { characterName: "An", userName: "TomiSakae" };
const parse = async (text: string) => expandHostMacros(text, host);
beforeAll(async () => {
  sources = await loadPresetSources();
});

describe("TomiSakae VN-RP preset families", () => {
  it("uses full names and versions and bundles source prompts/regex unchanged", async () => {
    expect(Object.keys(sources)).toEqual(["ff54", "sola"]);
    expect(PRESET_FAMILIES.map((p) => p.name)).toEqual([
      "Freaky Frankenstein 5.4",
      "Sola V2 Flame",
    ]);
    for (const [family, filename] of [["sola", "sola-v2-flame.json"]] as const) {
      const original = JSON.parse(await readFile(`source/${filename}`, "utf8"));
      expect(sources[family].preset.prompts).toEqual(original.prompts);
      expect(sources[family].preset.prompt_order).toEqual(original.prompt_order);
      expect(sources[family].preset.extensions?.regex_scripts).toEqual(
        original.extensions?.regex_scripts ?? [],
      );
      expect(sources[family].preset).not.toHaveProperty("proxy_password");
    }
  });

  it.each(
    (["ff54", "sola"] as const).flatMap((family) =>
      ([0, 1, 2, 3] as const).map((level) => [family, level] as const),
    ),
  )(
    "appends the shared Gemma fix inside the latest user message for %s at level %s",
    async (family, level) => {
      const preset = sources[family].preset;
      const settings = createDefaultSettings(preset);
      expect(settings.gemmaFixEnabled).toBe(false);
      expect(settings.gemmaFixNsfwLevel).toBe(2);
      settings.gemmaFixEnabled = true;
      settings.gemmaFixNsfwLevel = level;
      const messages = [
        { role: "user" as const, content: "Tin user cũ." },
        { role: "assistant" as const, content: "Phản hồi trước." },
        { role: "user" as const, content: "Tin user mới.", memo: "latest-user", removable: true },
      ];
      const snapshot = structuredClone(messages);
      const macroContext = { randomInt: (minimum: number) => minimum };
      const built = await buildRequestMessages(messages, preset, settings, parse, macroContext);
      const memo = `${pluginMemoPrefix(preset)}gemma-fix`;
      const intimacyMemo = `${pluginMemoPrefix(preset)}gemma-intimacy-limit`;
      const index = built.findIndex((message) => message.memo === "latest-user");
      expect(index).toBeGreaterThanOrEqual(0);
      expect(built[index]).toMatchObject({
        role: "user",
        content: `Tin user mới.\n\n${expandHostMacros(gemmaFixPromptFor(level), host)}`,
        removable: true,
      });
      expect(built.filter((message) => message.memo === memo)).toHaveLength(0);
      expect(built.filter((message) => message.memo === intimacyMemo)).toHaveLength(0);
      expect(built.some((message) => message.content.includes("IntimacyLimitInstructions"))).toBe(
        false,
      );

      const estimate = await estimatePluginPromptTokens(preset, settings, host);
      expect(
        estimate.entries.find((entry) => entry.identifier === "gemma-fix")?.tokens,
      ).toBeGreaterThan(0);
      expect(estimate.entries.some((entry) => entry.identifier === "gemma-intimacy-limit")).toBe(
        false,
      );

      const retried = await buildRequestMessages(
        structuredClone(built),
        preset,
        settings,
        parse,
        macroContext,
      );
      expect(retried).toEqual(built);

      const changed = await buildRequestMessages(
        retried,
        preset,
        { ...settings, gemmaFixNsfwLevel: level === 2 ? 0 : 2 },
        parse,
        macroContext,
      );
      expect(changed[index]!.content).toBe(
        `Tin user mới.\n\n${expandHostMacros(gemmaFixPromptFor(level === 2 ? 0 : 2), host)}`,
      );

      settings.gemmaFixEnabled = false;
      const disabled = await buildRequestMessages(messages, preset, settings, parse, macroContext);
      expect(disabled.some((message) => message.memo === memo)).toBe(false);
      expect(built).toHaveLength(disabled.length);
      expect(built.filter((_message, position) => position !== index)).toEqual(
        disabled.filter((_message, position) => position !== index),
      );
      expect(disabled[index]).toEqual(messages.at(-1));
      expect(await buildRequestMessages(built, preset, settings, parse, macroContext)).toEqual(
        disabled,
      );
      const disabledEstimate = await estimatePluginPromptTokens(preset, settings, host);
      expect(estimate.messageCount).toBe(disabledEstimate.messageCount);
      expect(estimate.framingTokens).toBe(disabledEstimate.framingTokens);
      expect(estimate.contentTokens - disabledEstimate.contentTokens).toBe(
        estimate.entries.find((entry) => entry.identifier === "gemma-fix")?.tokens,
      );
      expect(messages).toEqual(snapshot);
    },
  );

  it("sections each Gemma NSFW level while preserving every rule", () => {
    const commonSections = [
      "Vietnamese Output",
      "Image Use",
      "Reproductive Reality",
      "NSFW Initiation",
      "NSFW Mechanics",
      "Somatic Trauma",
    ];
    expect(gemmaFixPromptFor(0)).not.toContain("## Character Integrity");
    expect(gemmaFixPromptFor(0)).not.toContain("## User Agency");
    expect(gemmaFixPromptFor(0)).not.toContain("## Sexual Risk");
    expect(gemmaFixPromptFor(1)).toContain("## Character Integrity");
    expect(gemmaFixPromptFor(1)).toContain(
      "{{char}} should not offer sex or readily accept offers of sex; never invent lustful, submissive, dependent, or infatuated traits absent from the card/lore",
    );
    expect(gemmaFixPromptFor(2)).toBe(GEMMA_FIX_PROMPT);
    expect(gemmaFixPromptFor(2)).toContain("## Character Integrity");
    expect(gemmaFixPromptFor(2)).toContain("## Reproductive Reality");
    expect(gemmaFixPromptFor(2)).toContain(
      "{{char}} MUST be EXTREMELY CAUTIOUS about pregnancy before, during, and after EVERY sexual act because the pregnancy system is ALWAYS ACTIVE",
    );
    expect(gemmaFixPromptFor(2)).not.toContain("## User Agency");
    expect(gemmaFixPromptFor(2)).not.toContain("## Sexual Risk");
    expect(gemmaFixPromptFor(3)).toContain("## User Agency");
    expect(gemmaFixPromptFor(3)).not.toContain("## Sexual Risk");
    expect(gemmaFixPromptFor(3)).toContain(
      "{{user}}'s desire, intent, or consent MUST NOT be assumed",
    );
    expect(gemmaFixPromptFor(3)).toContain("When grounded in card/lore, {{char}} MAY pursue sex by ANY means");
    expect(gemmaFixPromptFor(3)).not.toContain("across turns");
    const initiationRule =
      "- When an intimate encounter begins, {{char}} MUST NOT skip directly to penetration or instant sex; {{char}} MUST advance through concrete physical stages: spatial positioning, tactile tension, gradual undressing, manual, oral, or other fitting foreplay, and pre-contact friction.\n- When initiating or changing approach, DIVERSIFY spatial approaches based on the environment, posture, and persona (cornering against walls, pinning to furniture, pulling from behind, stripping with resistance, neck/collarbone contact, finger or mouth teasing, or another fitting approach).\n- BAN repetitive default lap-straddling, groin-grinding shortcuts, or penetration that skips spatial escalation and concrete foreplay.";
    const kineticRule =
      "- EVERY RESPONSE MUST contain a concrete NSFW physical, sensory, or action beat grounded in the current scene and card/lore.\n- This beat is descriptive rendering only and MUST NOT by itself create, increase, or rewrite sexual desire, consent, arousal, personality, relationship, boundaries, or motives; physical depiction, sensation, reflex, resistance, or climax MUST NOT prove willingness or character change.\n- Preserve current pacing and characterization unless explicit action, card/lore, or earned on-page development changes them; ADVANCE the scene through concrete action or dialogue; NEVER stall on an unchanged beat through prolonged or repetitive description.\n- EVERY NSFW/NSFL scene MUST render graphic physical mechanics, raw anatomical and vernacular terminology, body mass shifting, leverage, tissue deformation, thermal-olfactory cues, fluid movement, viscosity and persistence, tissue trauma, and pre-contact friction.\n- RENDER fractured vocalizations and dirty talk; vary tactile, manual, oral, pressure, and friction-based stimulation across multiple fitting erogenous zones, choosing different methods and zones as the scene progresses rather than repeating one method.\n- When {{char}} genuinely wants it or card/lore and the situation permit, {{char}} MUST actively participate in and advance intimate interaction through concrete action or dialogue: invite or request continuation, open or adjust their own position, propose or enact a change of position or pace, or add fitting contact, stimulation, or closeness; extend this with another persona-fitting initiative when appropriate. NEVER leave {{char}} merely waiting or repeating passive reactions.\n- When climax occurs, render the immediate post-kinetic somatic aftermath, muscle tremors, and fluid residue.";
    const somaticTraumaRule =
      "- In all NSFW/NSFL scenes and their aftermath, PRIORITIZE raw external kinetics, bodily sensations, and physical reflexes over internal emotional processing.\n- NEVER summarize, sanitize, skip, or divert pain, distress, resistance, or forced contact into abstract thoughts, coping monologues, or psychological debriefs.\n- Bodily responses, arousal reflexes, and trauma MUST be rendered through concrete physical reactions; NEVER convert them into implied desire, consent, or compliance.\n- When pain, distress, resistance, or forced contact occurs, {{char}} MUST immediately show a concrete bodily reaction and take a defensive, escape, retaliatory, survival, or another fitting physical action; NEVER replace this immediate somatic response with interpretation, coping monologue, or aftermath summary.\n- When trauma occurs, NEVER reduce characters to passive numbness or generic flat depression; somatic distress MUST manifest through concrete physical actions, tremors, defensive posture, visceral disgust, hypervigilance, spiteful dialogue, or immediate survival goals.";
    const reproductiveRealityRules = [
      "- When {{char}}'s current sexual act creates reproductive risk, {{char}} MUST recognize that risk and make a concrete protective, negotiating, refusing, stopping, switching, mitigating, consciously risk-accepting, or otherwise fitting choice IN THE SCENE when awareness and ability allow it.",
      "- {{char}} MUST be EXTREMELY CAUTIOUS about pregnancy before, during, and after EVERY sexual act because the pregnancy system is ALWAYS ACTIVE; real-world reproductive consequences MUST override instinct, arousal, or automatic sexual behavior.",
    ];
    for (const level of [0, 1, 2, 3]) {
      expect(gemmaFixPromptFor(level).startsWith("{{\n")).toBe(true);
      expect(gemmaFixPromptFor(level).endsWith("\n}}")).toBe(true);
      for (const section of commonSections) {
        expect(gemmaFixPromptFor(level)).toContain(`## ${section}\n`);
      }
      const reproductiveReality = gemmaFixPromptFor(level)
        .split("## Reproductive Reality\n")[1]!
        .split("\n\n")[0];
      expect(reproductiveReality?.split("\n")).toEqual(reproductiveRealityRules);
      expect(gemmaFixPromptFor(level)).toContain(
        "FOR EACH distinct NSFW/NSFL action by {{char}}, {{user}}, or another NPC",
      );
      expect(gemmaFixPromptFor(level)).toContain(
        "when one scene contains multiple actions, render multiple corresponding images",
      );
      expect(gemmaFixPromptFor(level)).toContain(
        "COVER each distinct body state and pose, reselect when they change",
      );
      expect(gemmaFixPromptFor(level)).toContain(
        "when no matching unused NSFW image fits an action, use the closest suitable expression/reaction image instead",
      );
      expect(gemmaFixPromptFor(level)).toContain("exact supported image-tag syntax");
      expect(gemmaFixPromptFor(level)).toContain(
        "EVERY RESPONSE MUST contain a concrete NSFW physical, sensory, or action beat grounded in the current scene and card/lore",
      );
      expect(gemmaFixPromptFor(level)).toContain(initiationRule);
      expect(gemmaFixPromptFor(level)).toContain(kineticRule);
      expect(gemmaFixPromptFor(level)).toContain(somaticTraumaRule);
      expect(gemmaFixPromptFor(level)).not.toContain("## Somatic Priority");
      expect(gemmaFixPromptFor(level)).not.toContain("## Post-Trauma Agency");
      expect(gemmaFixPromptFor(level)).not.toContain("ONE text type per line");
    }
  });

  it.each(["ff54", "sola"] as const)(
    "migrates and persists the Gemma NSFW level as a global setting for %s",
    (family) => {
      const preset = sources[family].preset;
      expect(normalizeSettings(preset, { gemmaFixEnabled: true }).gemmaFixNsfwLevel).toBe(2);
      for (const value of [-1, 5, 0.5, "0", "4", null, undefined]) {
        expect(normalizeSettings(preset, { gemmaFixNsfwLevel: value }).gemmaFixNsfwLevel).toBe(2);
      }
      for (const level of [0, 1, 2, 3] as const) {
        const settings = normalizeSettings(preset, {
          gemmaFixEnabled: true,
          gemmaFixNsfwLevel: level,
        });
        const switched = switchPresetFamily(settings, sources.sola.preset);
        expect(switched.gemmaFixNsfwLevel).toBe(level);
        const store = normalizePresetStore(preset, undefined, switched, sources);
        const reloaded = normalizePresetStore(
          preset,
          JSON.parse(JSON.stringify(store)),
          undefined,
          sources,
        );
        expect(reloaded.presets[0]!.settings.gemmaFixNsfwLevel).toBe(level);
      }
    },
  );

  it.each(["ff54", "sola"] as const)(
    "sends exact card image keywords immediately after the latest user for %s",
    async (family) => {
      const preset = sources[family].preset;
      const settings = createDefaultSettings(preset);
      expect(settings.cardImageCatalogEnabled).toBe(false);
      settings.cardImageCatalogEnabled = true;
      settings.gemmaFixEnabled = true;
      const messages = [
        { role: "user" as const, content: "Tin cũ.", memo: "old-user" },
        { role: "assistant" as const, content: "Phản hồi cũ." },
        { role: "user" as const, content: "Tiếp đi.", memo: "latest-user" },
      ];
      const snapshot = structuredClone(messages);
      const catalog = collectCardImages({
        additionalAssets: [["outfit.smile.1.png", "assets/a.png", "png"]],
        emotionImages: [["happy", "assets/b.png"]],
      });
      const context = { randomInt: (minimum: number) => minimum, cardImageCatalog: catalog };
      const built = await buildRequestMessages(messages, preset, settings, parse, context);
      const memo = `${pluginMemoPrefix(preset)}card-image-catalog`;
      const index = built.findIndex((message) => message.memo === "latest-user");
      expect(built[index + 1]).toEqual({ role: "user", content: cardImagePrompt(catalog), memo });
      expect(built[index]!.content).toContain(expandHostMacros(GEMMA_FIX_PROMPT, host));
      expect(built.filter((message) => message.memo === memo)).toHaveLength(1);
      expect(await buildRequestMessages(built, preset, settings, parse, context)).toEqual(built);
      const estimate = await estimatePluginPromptTokens(preset, settings, {
        ...host,
        cardImageCatalog: catalog,
      });
      expect(estimate.cardImages).toMatchObject({
        imageCount: 2,
        keywordCount: 2,
        unavailable: false,
      });
      expect(estimate.cardImages!.tokens).toBeGreaterThan(0);
      settings.cardImageCatalogEnabled = false;
      const disabled = await buildRequestMessages(built, preset, settings, parse, context);
      expect(built.filter((message) => message.memo !== memo)).toEqual(disabled);
      const noImages = await buildRequestMessages(
        messages,
        preset,
        {
          ...settings,
          cardImageCatalogEnabled: true,
        },
        parse,
        { ...context, cardImageCatalog: collectCardImages(null) },
      );
      expect(noImages).toEqual(disabled);
      expect(messages).toEqual(snapshot);
      expect(
        normalizeSettings(preset, { cardImageCatalogEnabled: true }).cardImageCatalogEnabled,
      ).toBe(true);
    },
  );

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
    const stored = normalizePresetStore(
      sources.ff54.preset,
      {
        version: 1,
        presets: [{ id: "default", name: "Mặc định", settings: sola }],
        cardPresets: { card: "default" },
      },
      undefined,
      sources,
    );
    expect(stored.presets[0]!.settings.presetFamily).toBe("sola");
    expect(Object.keys(stored.presets[0]!.settings.promptEnabled)).toHaveLength(
      presetOrder(sources.sola.preset).length,
    );
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

  it.each([true, false])(
    "migrates a retired preset with a saved FF5.4 bank %s while preserving Global and card assignment",
    (savedBank) => {
      const defaults = createDefaultSettings(sources.ff54.preset);
      const promptId = Object.keys(defaults.promptEnabled)[0]!;
      const regexId = Object.keys(defaults.regexEnabled)[0]!;
      const ff54Bank = {
        promptEnabled: { ...defaults.promptEnabled, [promptId]: !defaults.promptEnabled[promptId] },
        regexEnabled: { ...defaults.regexEnabled, [regexId]: !defaults.regexEnabled[regexId] },
      };
      const sola = createDefaultSettings(sources.sola.preset);
      const settings = {
        presetFamily: "retired-preset",
        submodelEditorEnabled: true,
        submodelAutoRewriteEnabled: true,
        soundNotificationsEnabled: true,
        gemmaFixEnabled: true,
        gemmaFixNsfwLevel: 3,
        promptEnabled: { jailbreak: false, "retired-module": true },
        regexEnabled: { "retired-regex": true },
        familyModules: {
          ...(savedBank ? { ff54: ff54Bank } : {}),
          sola: { promptEnabled: sola.promptEnabled, regexEnabled: sola.regexEnabled },
          "retired-preset": { promptEnabled: { obsolete: true }, regexEnabled: {} },
        },
      };
      const snapshot = structuredClone(settings);
      const store = normalizePresetStore(
        sources.ff54.preset,
        {
          version: 1,
          presets: [{ id: "custom", name: "Cấu hình cũ", settings }],
          cardPresets: { card: "custom" },
        },
        undefined,
        sources,
      );
      const profile = presetForCard(store, "card");
      expect(profile.id).toBe("custom");
      expect(profile.settings.presetFamily ?? "ff54").toBe("ff54");
      expect(profile.settings).toMatchObject({
        submodelEditorEnabled: true,
        submodelAutoRewriteEnabled: true,
        soundNotificationsEnabled: true,
        gemmaFixEnabled: true,
        gemmaFixNsfwLevel: 3,
        promptEnabled: savedBank ? ff54Bank.promptEnabled : defaults.promptEnabled,
        regexEnabled: savedBank ? ff54Bank.regexEnabled : defaults.regexEnabled,
      });
      expect(profile.settings.promptEnabled).not.toHaveProperty("retired-module");
      expect(profile.settings.regexEnabled).not.toHaveProperty("retired-regex");
      expect(profile.settings.familyModules).not.toHaveProperty("retired-preset");
      expect(switchPresetFamily(profile.settings, sources.sola.preset).promptEnabled).toEqual(
        sola.promptEnabled,
      );
      const reloaded = normalizePresetStore(sources.ff54.preset, store, undefined, sources);
      expect(presetForCard(reloaded, "card")).toEqual(profile);
      expect(settings).toEqual(snapshot);
    },
  );

  it.each(["ff54", "sola"] as const)(
    "reloads a custom %s profile and its card assignment",
    (family) => {
      const preset = sources[family].preset;
      const store = normalizePresetStore(sources.ff54.preset, undefined, undefined, sources);
      const settings = createDefaultSettings(preset);
      settings.dialogueThemeEnabled = false;
      settings.vietnameseOutputEnabled = false;
      settings.submodelEditorEnabled = true;
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

  it.each(["ff54", "sola"] as const)(
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
    const preset = sources.sola.preset;
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
    expect(sent.at(-1)?.memo).toBe("vn-rp:sola:submodel-editor");
  });

  it("preserves source regex defaults and keeps Sola's disabled master saver off across reload/switch", () => {
    for (const family of ["sola"] as const) {
      const preset = sources[family].preset;
      const defaults = createDefaultSettings(preset);
      for (const script of preset.extensions?.regex_scripts ?? [])
        expect(defaults.regexEnabled[script.id]).toBe(script.disabled !== true);
    }
    const preset = sources.sola.preset;
    const script = preset.extensions!.regex_scripts!.find((script) => script.disabled)!;
    const settings = normalizeSettings(preset, { regexEnabled: {} });
    const switched = switchPresetFamily(switchPresetFamily(settings, sources.ff54.preset), preset);
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
      expect(text).toMatch(/interiority|unvoiced thoughts|thoughts must be inferred/);
    }
  });

  it("keeps Sola pronoun selections exclusive and uses family-specific Vietnamese UI copy", () => {
    const preset = sources.sola.preset;
    const settings = createDefaultSettings(preset);
    const group = familyChoiceGroups(preset).find((group) => group.id === "pronouns")!;
    for (const id of group.memberIds) settings.promptEnabled[id] = true;
    normalizeFamilyChoices(preset, settings);
    expect(group.memberIds.filter((id) => settings.promptEnabled[id])).toHaveLength(1);
    for (const family of ["sola"] as const) {
      const prompt = sources[family].preset.prompts.find(
        (prompt) => prompt.identifier === "jailbreak",
      )!;
      expect(promptUiCopy(prompt, family).name).toContain("Chỉ dẫn sau lịch sử chat");
      expect(promptUiCopy(prompt, family).description).not.toContain("DS4 Pro");
    }
  });

  it("uses reviewed Sola punctuation edits without changing words or unlisted text", () => {
    const raw = sources.sola.preset.prompts.map((prompt) => prompt.content ?? "").join("\n");
    const localized = adaptSolaPromptForVietnamese(raw);
    const variants = [
      raw,
      localized,
      adaptSolaSoundPlacement(raw),
      adaptSolaSoundPlacement(localized),
    ];
    const wording = (text: string) => text.replace(/[\p{P}\s]/gu, "");
    for (const [source, replacement] of SOLA_PUNCTUATION_REPLACEMENTS) {
      expect(
        variants.some((text) => text.includes(source)),
        source,
      ).toBe(true);
      expect(wording(replacement), source).toBe(wording(source));
      expect(replacement, source).not.toContain("—");
    }
    for (const text of variants) {
      const adapted = adaptSolaPunctuation(text);
      expect(adapted).not.toContain("—");
      expect(wording(adapted)).toBe(wording(text));
      expect(adapted.split("\n")).toHaveLength(text.split("\n").length);
    }
    const adapted = adaptSolaPunctuation(raw);
    expect(adapted).toContain("You are Sola, a deeply observant storyteller and co-author.");
    expect(adapted).toContain(
      "They shift only if what they know (and what they stand to gain or lose) would actually move them.",
    );
    expect(adapted).toContain("Vulnerability shows through the body: a turned wrist");
    expect(adapted).toContain(
      "Questions rare and transactional; never ask one just to fill a turn.",
    );
    expect(adapted).toContain('"I-I can\'t...", "c-can\'t think..."');
    const unlisted = "Unlisted text — leave this untouched.";
    expect(adaptSolaPunctuation(unlisted)).toBe(unlisted);
    expect(
      adaptFamilyPrompt(raw, sources.ff54.preset, {
        ...createDefaultSettings(sources.ff54.preset),
        vietnameseOutputEnabled: false,
        imageOptimizationEnabled: false,
      }),
    ).toBe(raw);
  });

  it.each(["sola"] as const)(
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
      expect(all).toContain(vietnameseOutputFor(preset, settings));
      expect(all).toContain("## Image Coverage");
      const imagePrompt = built.find(
        (message) => message.memo === `${pluginMemoPrefix(preset)}image-optimization`,
      )!;
      expect(imagePrompt.content).toContain("even if An refuses or resists");
      expect(imagePrompt.content).not.toContain("{{char}}");
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
      const hidden = familyHiddenPromptIds(preset);
      for (const entry of presetOrder(preset)) {
        const prompt = preset.prompts.find((p) => p.identifier === entry.identifier);
        if (
          !prompt?.marker &&
          typeof prompt?.content === "string" &&
          prompt.content.trim() &&
          !hidden.has(entry.identifier)
        )
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

  it.each(["sola"] as const)(
    "localizes all %s controls and hides source dividers and dependent data",
    (family) => {
      const preset = sources[family].preset;
      const sections = familyPromptSections(preset);
      const groups = familyChoiceGroups(preset);
      const visible = [
        ...groups.flatMap((g) => g.memberIds),
        ...sections.flatMap((s) => s.promptIds),
      ];
      expect(new Set(visible).size).toBe(visible.length);
      for (const identifier of visible) {
        const prompt = familyPrompts(preset).find((p) => p.identifier === identifier)!;
        const copy = promptUiCopy(prompt, family);
        expect(copy.name).not.toBe(prompt.name);
        expect(copy.name).not.toMatch(
          /\[(?:Module|Core|V|R|Reasoning|Pronouns|Balancer|Jailbreak)\]|Pick 1|━/,
        );
        expect(copy.description.length).toBeGreaterThan(30);
        expect(copy.description).not.toContain("Preset gốc không có chú thích");
      }
      for (const section of sections) {
        expect(section.label).not.toMatch(/Foundations|Voice Styles|Trackers|Reasoning Stack|━/);
        expect(section.description.length).toBeGreaterThan(30);
      }
      for (const group of groups) {
        expect(group.description).not.toBe("Chọn một module theo preset nguồn.");
        expect(group.offDescription.length).toBeGreaterThan(30);
      }
      const settings = createDefaultSettings(preset);
      for (const id of familyHiddenPromptIds(preset)) {
        expect(visible).not.toContain(id);
        expect(settings.promptEnabled[id]).toBe(
          presetOrder(preset).find((entry) => entry.identifier === id)?.enabled !== false,
        );
      }
    },
  );

  it("localizes and groups every Sola regex without losing or duplicating a filter", () => {
    const preset = sources.sola.preset;
    const scripts = familyRegexScripts(preset);
    const groups = familyRegexGroups(preset);
    const ids = groups.flatMap((group) => group.ids);
    expect(ids).toHaveLength(scripts.length);
    expect(new Set(ids).size).toBe(scripts.length);
    expect(groups.map((g) => g.label)).toContain("Header mở cảnh");
    expect(groups.map((g) => g.label)).toContain("Tiết kiệm ngữ cảnh gửi model");
    for (const script of scripts) {
      expect(solaRegexUiCopy(script), script.scriptName).toBeDefined();
      const copy = regexUiCopy(script);
      expect(copy.name).not.toBe(script.scriptName);
      expect(copy.name).not.toContain("Sola ");
      expect(copy.description.length).toBeGreaterThan(30);
      if (script.promptOnly && script.minDepth != null)
        expect(copy.description).toContain(`độ sâu ${script.minDepth}`);
    }
  });

  it.each(["sola"] as const)(
    "keeps %s's prompts free of Global guidance when Global prompt features are off",
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

  it.each(["sola"] as const)(
    "adapts %s examples in the entire module bank without changing the source or mechanics",
    async (family) => {
      const preset = sources[family].preset;
      const snapshot = JSON.stringify(preset);
      const settings = createDefaultSettings(preset);
      settings.imageOptimizationEnabled = false;
      settings.dialogueThemeEnabled = false;
      const sourceText = preset.prompts.map((p) => p.content ?? "").join("\n");
      const pairs = SOLA_VIETNAMESE_REPLACEMENTS;
      for (const [source] of pairs) expect(sourceText, source).toContain(source);

      for (const prompt of preset.prompts) {
        if (typeof prompt.content !== "string" || !prompt.content) continue;
        const adapted = adaptFamilyPrompt(prompt.content, preset, settings);
        if (family === "sola" && prompt.content.includes("- POV Check (Third Limited):")) {
          expect(adapted).not.toContain("Third person, past tense, for all characters");
          expect(adapted).toContain("past events with natural Vietnamese time cues");
        }
        const macroTokens = (text: string) =>
          [...text.matchAll(/\{\{(?:(setvar|getvar|roll)::([^}:]+)|(random)::)/g)].map(
            (m) => m[3] ?? `${m[1]}::${m[2]}`,
          );
        expect(macroTokens(adapted), prompt.name).toEqual(macroTokens(prompt.content));
        const withoutVietnamese = adaptFamilyPrompt(prompt.content, preset, {
          ...settings,
          vietnameseOutputEnabled: false,
        });
        expect(withoutVietnamese, prompt.name).not.toContain("—");
        if (family === "sola" && prompt.identifier === "01a0c1ff-4ecf-701d-97b3-6626434ed938") {
          // Header frequency is deliberately adapted for PocketRisu in both languages.
          expect(withoutVietnamese).toContain("Begin every response with <scene_header>");
          expect(withoutVietnamese).not.toContain("Do NOT repeat the header");
          const schemaAndEngine = (text: string) =>
            text.slice(text.indexOf("```html"), text.indexOf("### Rules"));
          expect(schemaAndEngine(withoutVietnamese)).toBe(schemaAndEngine(prompt.content));
        } else {
          const withoutSoundPlacement = SOLA_SOUND_REPLACEMENTS.reduce(
            (text, [source, replacement]) =>
              text.replaceAll(adaptSolaPunctuation(replacement), adaptSolaPunctuation(source)),
            withoutVietnamese,
          );
          expect(withoutSoundPlacement, prompt.name).toBe(adaptSolaPunctuation(prompt.content));
        }
        settings.promptEnabled[prompt.identifier] = true;
      }
      const composed = await composePresetPrompts(preset, settings, parse, {
        randomInt: (min) => min,
      });
      const text = [...composed.leading, ...composed.absolute, ...composed.trailing]
        .map((m) => m.content)
        .join("\n");
      expect(text).not.toMatch(/\{\{(?:setvar|getvar|random|roll|trim)(?:::|\}\})/);

      expect(text).toContain(
        "Dialect grain: regional pronunciation, colloquial omission, and natural disfluency in Vietnamese",
      );
      expect(text).not.toContain("phonetic drop-sounds, contractions");
      expect(text).toContain("govern prose and sound effects");
      expect(text).not.toContain("Third person, past tense, for all characters");
      expect(text).toContain("lồn, cặc, buồi, tinh, đít, vú, đụ, địt, ướt nhẹp, chảy nước");
      expect(text).toContain('"Mẹ kiếp~", "Làm ơơơn~", "Khôôông!"');
      expect(text).toContain('"Chưa từng có ai", "Không thể cứ thế", "Chẳng ai tự dưng"');
      expect(text).toContain("ass jiggling, tits bouncing, balls clapping, backs arched");
      expect(text).toContain('"Cái chạm ấy thật ấm."');
      expect(text).toContain('"Vì sao chạy? Để sống sót."');
      expect(text).toContain('<copper:whisper>"Đừng gây tiếng động."</copper>');
      expect(text).toContain("T=[0-4] | F=[0-4] | D=[0-4] | Y=[0-4]");
      expect(text).toContain("[Bullseye | Grazing Shot | Wind Drift]");
      expect(text).toContain("Thay đổi: +Được tôn trọng dù còn miễn cưỡng");
      expect(text).toContain("Lịch: [Season, Month/Year");
      expect(text).toContain("Xu hướng: [Sexual & Romantic orientation from card");
      expect(text).toContain('<notification app="Tin nhắn"');
      expect(text).toContain("> TÌM THẤY 2 ĐIỆN VĂN CHƯA ĐỌC");
      expect(text).toContain("NEUTRAL");

      expect(text).not.toContain("shout, whisper, measured, tremble");
      expect(text).not.toContain("<internal_states>");
      expect(text).not.toContain("manga, anime, and light-novel pacing");
      expect(text).not.toContain("—");

      expect(text).not.toContain("§");
      expect(vietnameseOutputFor(preset)).not.toContain("§");

      expect(JSON.stringify(preset)).toBe(snapshot);
    },
  );

  it("keeps Sola annotations and template instructions in English while localizing output", () => {
    const preset = sources.sola.preset;
    const settings = createDefaultSettings(preset);
    const adapted = new Map(
      preset.prompts.map((prompt) => [
        prompt.identifier,
        adaptFamilyPrompt(
          typeof prompt.content === "string" ? prompt.content : "",
          preset,
          settings,
        ),
      ]),
    );
    const all = [...adapted.values()].join("\n");
    expect(all).not.toContain("—");
    expect(all).toContain('"E-em yêu anh sao?!" *rolling the words in her mouth* BAD X');
    expect(all).toContain('*blushes* "A-anh cũng yêu em." APPROVED');
    expect(all).not.toContain("nhắc đi nhắc lại lời vừa nghe");
    expect(all).toContain('("một kiểu *noun*")');
    expect(all).toContain('"hold on," "wait," "can we," "I meant,"');
    expect(all).toContain('<palette_name>"Spoken dialogue here."</palette_name>');
    expect(all).toContain("[Append all active tracker blocks here:");
    expect(all).toContain('Sola: "Lúc này cậu muốn làm gì?"');
    expect(all).toContain('{{char}}: "[1 sentence reply]"');
    expect(all).toContain("Ẩn ý: [1 concise sentence capturing");
    expect(all).toContain("Xu hướng: [Sexual & Romantic orientation from card");
    expect(all).toContain('[Current relational stage, e.g., "Tò mò nhưng dè chừng"');
    expect(all).toContain(
      '[A brief, cheeky, insightful co-author whisper on their chemistry, e.g., "Ồ,',
    );
    expect(all).toContain("Lịch: [Season, Month/Year, or In-Universe Date, e.g., Giữa thu,");

    for (const prompt of preset.prompts) {
      const source = typeof prompt.content === "string" ? prompt.content : "";
      for (const comment of source.matchAll(/\{\{\/\/[\s\S]*?\}\}/g))
        expect(adapted.get(prompt.identifier), prompt.name).toContain(comment[0]);
    }
    for (const name of [
      "[Module] Intimacy: Sensory Pacing & Tension",
      "[Module] Intimacy: Visceral Gooner Mode",
    ]) {
      const prompt = preset.prompts.find((prompt) => prompt.name === name)!;
      expect(adapted.get(prompt.identifier)).toBe(
        adaptSolaPunctuation(adaptSolaSoundPlacement(String(prompt.content))),
      );
    }
    const explicit = preset.prompts.find(
      (prompt) => prompt.name === "[Module] Intimacy: Explicit Register",
    )!;
    const instructions = adapted.get(explicit.identifier)!;
    expect(instructions).toContain("skin flush and temperature, friction, wet sounds, breath");
    expect(instructions).toContain("moans, wet suction, skin slaps, broken profanity");
    expect(instructions).toContain("the jiggle, the bounce, the texture, the sound in detail");
    expect(instructions).toContain("(lồn, cặc, buồi, tinh, đít, vú, đụ, địt, ướt nhẹp, chảy nước)");
    expect(instructions).toContain(
      'đầu ngực/núm vú cứng lên vì lạnh, "khuôn ngực phập phồng", and vague "một âm thanh ướt át"',
    );
    expect(instructions).toContain("Every sound occupies its own line, has a physical cause");
  });

  it.each([true, false])(
    "removes Sola's unused HUD references with all trackers off and Vietnamese=%s",
    async (vietnamese) => {
      const preset = sources.sola.preset;
      const settings = createDefaultSettings(preset);
      settings.vietnameseOutputEnabled = vietnamese;
      for (const prompt of preset.prompts) {
        if (/^\[Module\] (?:Tracker:|Roleplay System:)/.test(prompt.name ?? ""))
          settings.promptEnabled[prompt.identifier] = false;
      }
      // Both normal and expansive length rules must drop the tracker exception.
      for (const expansive of [false, true]) {
        settings.promptEnabled["01a0c1ff-4ecf-7009-9668-cadfeda511c3"] = expansive;
        const built = await buildRequestMessages(
          [{ role: "user", content: "Tiếp đi." }],
          preset,
          settings,
          parse,
          { randomInt: (min) => min },
        );
        const all = built.map((message) => message.content).join("\n");
        expect(all).not.toMatch(/HUD|tracker|T\/F\/D\/Y|tempo\/fate|numeric mechanics/i);
        expect(all).toContain("Begin every response with <scene_header>");
        expect(all).toContain("## Immersive Props & Diegetic Artifacts");
        expect(all).toContain(expansive ? "~700–900 words" : "~400–500 words");
        if (vietnamese) expect(all).toContain("readable content in headers and props");
      }
      if (vietnamese) {
        const estimate = await estimatePluginPromptTokens(preset, settings, host);
        const full = await estimatePluginPromptTokens(preset, createDefaultSettings(preset), host);
        expect(
          estimate.entries.find((entry) => entry.identifier === "vietnamese-output")!.tokens,
        ).toBeLessThan(
          full.entries.find((entry) => entry.identifier === "vietnamese-output")!.tokens,
        );
      }
    },
  );

  it.each([
    ["01a0c1ff-4ecf-7025-b750-acb802f5a3ef", "wardrobe", false, ""],
    ["01a0c1ff-4ecf-7029-a1b8-8b3b57754b2b", "fengine", true, ""],
    ["01a0c1ff-4ecf-7008-a4dc-cfe495078cac", "tempo", false, "tempo values"],
    ["01a0c1ff-4ecf-7023-8754-7e215d4a4eac", "arrow", false, "fate values"],
  ])("retains Sola's standalone %s tracker without the HUD", async (id, tag, tfdy, values) => {
    const preset = sources.sola.preset;
    const settings = createDefaultSettings(preset);
    for (const prompt of preset.prompts) {
      if (/^\[Module\] (?:Tracker:|Roleplay System:)/.test(prompt.name ?? ""))
        settings.promptEnabled[prompt.identifier] = false;
    }
    settings.promptEnabled[id as string] = true;
    const built = await buildRequestMessages(
      [{ role: "user", content: "Tiếp đi." }],
      preset,
      settings,
      parse,
      { randomInt: (min) => min },
    );
    const all = built.map((message) => message.content).join("\n");
    const output = vietnameseOutputFor(preset, settings);
    expect(all).not.toMatch(/HUD|sola_hud/i);
    expect(all).toContain(`<${tag}>`);
    expect(all).toContain("Trackers do not count towards word count.");
    expect(output).toContain("headers, trackers, and props");
    expect(output.includes("T/F/D/Y codes")).toBe(tfdy);
    if (values) expect(output).toContain(values);
    else expect(output).not.toMatch(/tempo values|fate values|tempo\/fate values/);
  });

  it.each([true, false])(
    "requires Sola headers in the module and reasoning reminder with Vietnamese=%s",
    async (vietnamese) => {
      const preset = sources.sola.preset;
      const settings = createDefaultSettings(preset);
      settings.vietnameseOutputEnabled = vietnamese;
      const headerId = "01a0c1ff-4ecf-701d-97b3-6626434ed938";
      settings.promptEnabled[headerId] = true;
      settings.promptEnabled["01a0c1ff-4ecf-704a-82b3-0c9b9af52526"] = true;
      const composed = await composePresetPrompts(preset, settings, parse, {
        randomInt: (min) => min,
      });
      const messages = [...composed.leading, ...composed.absolute, ...composed.trailing];
      const headerModule = messages.find((message) => message.memo === `vn-rp:sola:${headerId}`)!;
      expect(headerModule.content).toContain(
        "after any reasoning and before narration or dialogue",
      );
      expect(headerModule.content).toContain("even within the same continuous scene");
      expect(headerModule.content).not.toContain("Do NOT repeat the header");
      const reasoning = messages.find(
        (message) =>
          message.content.includes("## NPC Check") || message.content.includes("## 1. NPC Check"),
      )!;
      expect(reasoning.content).toContain("Begin every response with <scene_header>");
      settings.promptEnabled[headerId] = false;
      const disabled = await composePresetPrompts(preset, settings, parse, {
        randomInt: (min) => min,
      });
      expect(
        [...disabled.leading, ...disabled.absolute, ...disabled.trailing]
          .map((message) => message.content)
          .join("\n"),
      ).not.toContain("Begin every response with <scene_header>");
    },
  );

  it("preserves Sola's native sound typography with Vietnamese examples", () => {
    const preset = sources.sola.preset;
    const settings = createDefaultSettings(preset);
    const prompts = preset.prompts.filter((p) => typeof p.content === "string" && p.content);
    const nativeRules = [
      "Stylistic modules like Chromatic Gradients and Kinetic Emphasis govern prose and sound effects, each sound effect on its own line",
      "- Kinetic Typography: Give physical weight to tactile prose, impacts, and standalone sound lines",
      "Render tactile physical force, sensory shifts, sudden impacts, and acoustic texture through visceral kinetic typography tags.",
      "- Tactile Prose & Sound Beats: Gunshots, door clicks, heavy footsteps, jarring collisions.",
      "Sensory Touch: Sprinkle 1–3 kinetic accents across a scene",
    ];
    const texts = prompts.map((p) => {
      const source = String(p.content);
      const text = adaptFamilyPrompt(source, preset, settings);
      expect(text, p.name).not.toContain("§");
      for (const rule of nativeRules) {
        const original = SOLA_SOUND_REPLACEMENTS.reduce(
          (current, [before, after]) => current.replaceAll(after, before),
          rule,
        );
        if (source.includes(original)) expect(text, p.name).toContain(rule);
      }
      return text;
    });
    const text = texts.join("\n");
    for (const example of [
      "<hearth:echo>*Tích tắc... tích tắc...*</hearth>",
      "<hearth:echo>*Nhịp tim nhỏ dần.*</hearth>",
      "<heavy>RẦM.</heavy>",
      "<echo>*Tích tắc. Tích tắc.*</echo>",
      "<fracture>RẮC.</fracture>",
      "- Standalone (Prose & Sound Beats, each sound on its own line): `<kinetic_tag>RẮC.</kinetic_tag>`",
    ])
      expect(text).toContain(example);
    const sounds = "<heavy>RẦM.</heavy>\n<echo>*Tích tắc.*</echo>\n<fracture>RẮC.</fracture>";
    const rendered = applyRegexScripts(sounds, preset, settings, {
      placement: PLACEMENT_AI_OUTPUT,
      markdown: true,
      depth: 0,
    });
    expect(rendered).not.toMatch(/<\/?(?:heavy|echo|fracture)>/);
    for (const sound of ["RẦM.", "Tích tắc.", "RẮC."]) expect(rendered).toContain(sound);
    const vocal = preset.prompts.find((p) => p.name?.includes("Voice: Vocal Sounds"))!;
    expect(adaptFamilyPrompt(String(vocal.content), preset, settings)).toContain('"Ưm~"');
    for (const [before, after] of SOLA_SOUND_REPLACEMENTS) {
      const prompt = prompts.find((p) => String(p.content).includes(before));
      expect(prompt, before).toBeDefined();
      expect(adaptFamilyPrompt(String(prompt!.content), preset, settings), before).toContain(after);
    }
    for (const prompt of prompts) {
      const source = String(prompt.content);
      const inline = adaptSolaSoundPlacement(source);
      expect(inline.split("\n")).toHaveLength(source.split("\n").length);
      expect(adaptSolaSoundPlacement(inline)).toBe(inline);
      expect(inline).not.toMatch(/^\s*(?:- )?(?:Keep each vocal sound|Render vocal sounds)/m);
    }
  });

  it("renders both Sola tracker languages and preserves prompt saver depth and raw text", () => {
    const preset = sources.sola.preset;
    const settings = createDefaultSettings(preset);
    const input =
      '<sola_hud digest="Ngày 9 · DRIVE"><date>Ngày: 9\nThời gian: Bình minh</date>\n<bond>Cặp: An & TomiSakae\nThay đổi: +Tin tưởng hơn</bond>\n<fengine>Đức:\nT=2↑ | F=1 | D=0 | Y=3\nẨn ý: Giấu lo lắng\nSuy nghĩ: Phải đi thôi.</fengine>\n<arrow>Quỹ đạo: Bullseye</arrow>\n<inventory>Trong tay: Trống\nCất giấu: Không có</inventory>\n<story_notes>Mạch truyện: Đi tìm chìa khóa</story_notes></sola_hud>';
    const options = { placement: PLACEMENT_AI_OUTPUT, markdown: true, depth: 0 };
    const rendered = applyRegexScripts(input, preset, settings, options);
    expect(rendered).not.toMatch(/<(?:sola_hud|date|bond|fengine|arrow|inventory|story_notes)\b/);
    expect(rendered).toContain("HUD ĐIỀU PHỐI SOLA");
    expect(rendered).toContain("Lịch & thời gian");
    expect(rendered).toContain("Dịu dàng 2/4");
    expect(rendered).toContain("TRÚNG ĐÍCH");
    expect(rendered).toContain("🌅 Bình minh");
    expect(rendered).toContain("Tin tưởng hơn");
    expect(rendered).toContain(">Đức:</span>");
    const english =
      "<date>Day: 9\nTime: Dawn</date>\n<bond>Pair: An & TomiSakae\nShift: +More trust</bond>";
    const originalRender = applyRegexScripts(english, preset, settings, options);
    expect(originalRender).toContain("Thời gian:");
    expect(originalRender).toContain("More trust");
    const disabled = applyRegexScripts(
      english,
      preset,
      { ...settings, vietnameseOutputEnabled: false },
      options,
    );
    expect(disabled).toContain("Calendar & Chronology");
    expect(disabled).not.toContain("Lịch & thời gian");
    for (const script of preset.extensions!.regex_scripts!) {
      const adapted = adaptSolaRegexForVietnamese(
        script.findRegex!,
        String(script.replaceString ?? ""),
        script.scriptName!,
      );
      const end = adapted.findRegex.lastIndexOf("/");
      expect(
        () => new RegExp(adapted.findRegex.slice(1, end), adapted.findRegex.slice(end + 1)),
        script.scriptName,
      ).not.toThrow();
      const captures = (text: string) => text.match(/\$\d+/g) ?? [];
      expect(captures(adapted.replaceString)).toEqual(captures(String(script.replaceString ?? "")));
      if (script.promptOnly) expect(adapted.findRegex).toBe(script.findRegex);
    }
    const saved = applyRegexScripts(input, preset, settings, {
      placement: PLACEMENT_AI_OUTPUT,
      prompt: true,
      depth: 20,
    });
    expect(saved).not.toContain("<sola_hud");
    expect(input).toContain("Thay đổi: +Tin tưởng hơn");
  });

  it.each([
    ["char_matrix", "Mask", "Vẻ ngoài", "Vỏ bọc", "Giấu sự lo lắng."],
    ["scene_cast", "Ambient NPCs", "NPC trong cảnh", "NPC làm nền", "An đang lau ly."],
    ["arrow", "Friction", "Trở lực", "Hệ quả", "Đánh rơi chìa khóa."],
    ["date", "Elapsed", "Thời gian đã trôi", "Đã trôi qua", "~20 phút"],
  ])(
    "renders current and historical Sola %s labels without rewriting request text",
    (tag, english, legacy, current, value) => {
      const preset = sources.sola.preset;
      const settings = createDefaultSettings(preset);
      const options = { placement: PLACEMENT_AI_OUTPUT, markdown: true, depth: 0 };
      const makeInput = (label: string) =>
        `Trong truyện vẫn giữ từ ${legacy}.\n<${tag}>${label}: ${value}</${tag}>`;
      const expected = applyRegexScripts(makeInput(current), preset, settings, options);
      expect(expected).not.toContain(`<${tag}>`);
      expect(expected).toContain(`>${current}:</span>`);
      expect(expected).toContain(value);
      expect(expected).toContain(`Trong truyện vẫn giữ từ ${legacy}.`);
      for (const label of [english, legacy, current]) {
        const input = makeInput(label);
        expect(applyRegexScripts(input, preset, settings, options)).toBe(expected);
        expect(
          applyRegexScripts(input, preset, settings, {
            placement: PLACEMENT_AI_OUTPUT,
            prompt: true,
            depth: 0,
          }),
        ).toBe(input);
      }
    },
  );

  it("localizes standalone tempo values in the Sola HUD digest only on the display copy", () => {
    const preset = sources.sola.preset;
    const settings = createDefaultSettings(preset);
    const options = { placement: PLACEMENT_AI_OUTPUT, markdown: true, depth: 0 };
    for (const [gear, label] of [
      ["NEUTRAL", "GIỮ NHỊP"],
      ["STEADY", "ĐỀU NHỊP"],
      ["DRIVE", "ĐẨY TIẾN"],
    ]) {
      const input = `<sola_hud digest="Ngày 42 · Chạng vạng · ${gear} · DRIVE: T1 F2 D3 Y2">Tên DRIVE trong truyện.</sola_hud>`;
      const rendered = applyRegexScripts(input, preset, settings, options);
      expect(rendered).toContain(`Ngày 42 · Chạng vạng · ${label} · DRIVE:`);
      expect(rendered).toContain("Tên DRIVE trong truyện.");
      expect(rendered).not.toContain(`· ${gear} ·`);
      expect(input).toContain(`· ${gear} ·`);
      expect(
        applyRegexScripts(input, preset, { ...settings, vietnameseOutputEnabled: false }, options),
      ).toContain(`· ${gear} ·`);
      expect(
        applyRegexScripts(input, preset, settings, {
          placement: PLACEMENT_AI_OUTPUT,
          prompt: true,
          depth: 0,
        }),
      ).toBe(input);
      const bracketed = `<sola_hud digest="Ngày 42 · [${gear}]"></sola_hud>`;
      expect(applyRegexScripts(bracketed, preset, settings, options)).toContain(`[${label}]`);
    }
  });

  it("selects Vietnamese Sola skyboxes with working source override ordering", () => {
    for (const [time, atmosphere, sky, color] of [
      ["Bình minh", "Lặng gió", "dawn", "#F4845F"],
      ["Buổi chiều", "Nắng", "day", "#A8DADC"],
      ["Chạng vạng", "Yên tĩnh", "dusk", "#F4A261"],
      ["Ban đêm", "Lạnh", "night", "#8592E6"],
      ["13:40", "Mưa lớn", "noir", "#8FA4B2"],
    ]) {
      const input = `<scene_header location="Phòng" time="${time}" atmosphere="${atmosphere}" />`;
      const normalized = adaptSolaSceneHeaderForDisplay(input);
      if (sky === "dusk") expect(normalized).toBe(input);
      else expect(normalized).toContain(`<scene_header sky="${sky}" location=`);
      const rendered = applyRegexScripts(
        normalized,
        sources.sola.preset,
        createDefaultSettings(sources.sola.preset),
        { placement: PLACEMENT_AI_OUTPUT, markdown: true, depth: 0 },
      );
      expect(rendered).not.toContain("<scene_header");
      expect(rendered).toContain(color!);
      expect(rendered).toContain("HỒ SƠ ĐỊA ĐIỂM");
      expect(rendered).toContain(atmosphere!);
    }
  });

  it("selects native dusk particles for Vietnamese and English fire/wind triggers", () => {
    const preset = sources.sola.preset;
    const settings = createDefaultSettings(preset);
    const render = (input: string) =>
      applyRegexScripts(adaptSolaSceneHeaderForDisplay(input), preset, settings, {
        placement: PLACEMENT_AI_OUTPUT,
        markdown: true,
        depth: 0,
      });
    const header = (time: string, atmosphere: string, sky = "") =>
      `<scene_header ${sky ? `sky="${sky}" ` : ""}location="Phòng" time="${time}" atmosphere="${atmosphere}" />`;
    const cases = [
      ["Lửa", "fire"],
      ["Khói", "smoke"],
      ["Tro", "ash"],
      ["Âm ỉ", "smolder"],
      ["Lò rèn", "forge"],
      ["Bếp lửa", "hearth"],
      ["Ấm", "warm"],
      ["Hơi nóng tĩnh lặng", "still heat"],
      ["Gió nhẹ", "breeze"],
      ["Gió lùa", "draft"],
      ["Gió mạnh", "gale"],
      ["Lạnh", "chill"],
      ["Bụi", "dust"],
      ["Gió, lửa", "wind, fire"],
      ["Mưa, gió, lửa", "rain, wind, fire"],
      ["Mùi nấm", "mushroom scent"],
    ] as const;
    for (const [vietnamese, english] of cases) {
      const reference = render(header("6:45 PM", english));
      expect(reference).not.toContain("<scene_header");
      for (const time of ["Hoàng hôn", "Chiều tà", "Chạng vạng", "18:45", "6:45 CH"]) {
        expect(render(header(time, vietnamese)), `${time}: ${vietnamese}`).toBe(
          reference.replaceAll("6:45 PM", time).replaceAll(english, vietnamese),
        );
      }
    }
    expect(render(header("18:45", "Gió mạnh"))).toContain("radial-gradient(4px 4px at 620px 40px");
    expect(render(header("18:45", "Lửa"))).toContain("radial-gradient(4px 4px at 480px 65px");
    expect(render(header("18:45", "Mùi nấm"))).toContain("radial-gradient(4px 4px at 160px 50px");
    expect(render(header("18:45", "Gió mạnh", "dusk"))).toContain(
      "radial-gradient(4px 4px at 480px 65px",
    );
    const native = header("6:45 PM", "fire");
    expect(adaptSolaSceneHeaderForDisplay(native)).toBe(native);
    const timeFirst = '<scene_header time="18:45" location="Phòng" atmosphere="Gió" />';
    expect(adaptSolaSceneHeaderForDisplay(timeFirst)).toContain('sky="dusk"');
    expect(adaptSolaSceneHeaderForDisplay(header("18:45", "Gió"), false)).toContain('sky="dusk"');
  });
});
