import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  adaptDisplayMarkupForRisuAI,
  adaptVietnameseHeaderForRisuAI,
  removeSceneHeadersForRequest,
  applyRegexScripts,
  applyPromptRegexToMessages,
  applyRequestFiltersToMessages,
  buildRequestMessages,
  composePresetPrompts,
  createDefaultSettings,
  expandSourceMacros,
  expandHostMacros,
  normalizeSettings,
  type FfPreset,
} from "../risuai/freaky-frankenstein-5.4-plugin/src/core.js";
import {
  adaptPromptForVietnamese,
  VIETNAMESE_OUTPUT_PROMPT,
  VIETNAMESE_OUTPUT_REPLACEMENTS,
  VIETNAMESE_REASONING_REPLACEMENTS,
} from "../risuai/freaky-frankenstein-5.4-plugin/src/vietnamese.js";
import { buildVietnameseComparison } from "../scripts/build-ff54-vietnamese-comparison.js";
import {
  EXCLUSIVE_PROMPT_GROUPS,
  HOST_MARKER_IDS,
  normalizeExclusivePromptGroups,
  PROMPT_SECTIONS,
  SOURCE_SEPARATOR_IDS,
} from "../risuai/freaky-frankenstein-5.4-plugin/src/ui-vi.js";

const source = "risuai/freaky-frankenstein-5.4-plugin/source/ff54-sillytavern-preset.json";
const realismModeId = "019f62e8-892f-700c-9795-53ecb3381d7d";
const freakyModeId = "019f62e8-892f-700d-b070-4add983aeae1";

async function preset(): Promise<FfPreset> {
  return JSON.parse(await readFile(source, "utf8")) as FfPreset;
}

describe("FF5.4 RisuAI plugin compatibility", () => {
  it("copies source toggle defaults except for the default adult mode", async () => {
    const data = await preset();
    const settings = createDefaultSettings(data);
    expect(Object.keys(settings.promptEnabled)).toHaveLength(data.prompt_order[0]!.order.length);
    expect(Object.keys(settings.regexEnabled)).toHaveLength(data.extensions!.regex_scripts!.length);
    for (const entry of data.prompt_order[0]!.order) {
      expect(settings.promptEnabled[entry.identifier]).toBe(
        entry.identifier === realismModeId
          ? true
          : entry.identifier === freakyModeId
            ? false
            : entry.enabled !== false,
      );
    }
    expect(settings.promptEnabled[realismModeId]).toBe(true);
    expect(settings.promptEnabled[freakyModeId]).toBe(false);
    expect(settings.vietnameseOutputEnabled).toBe(true);
  });

  it("keeps an explicitly saved Freaky choice", async () => {
    const data = await preset();
    const saved = {
      promptEnabled: { [realismModeId]: false, [freakyModeId]: true },
    };
    const settings = normalizeSettings(data, saved);
    normalizeExclusivePromptGroups(settings, data.prompt_order[0]!.order);
    expect(settings.promptEnabled[realismModeId]).toBe(false);
    expect(settings.promptEnabled[freakyModeId]).toBe(true);
  });

  it("defaults old global settings to Vietnamese output while preserving an explicit choice", async () => {
    const data = await preset();
    const oldSettings = {
      enabled: false,
      promptEnabled: {},
      regexEnabled: {},
    };
    expect(normalizeSettings(data, oldSettings).vietnameseOutputEnabled).toBe(true);
    expect(
      normalizeSettings(data, { ...oldSettings, vietnameseOutputEnabled: false })
        .vietnameseOutputEnabled,
    ).toBe(false);
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

  it("adds Vietnamese Output once before card context and keeps removed style modules out", async () => {
    const data = await preset();
    const settings = createDefaultSettings(data);
    const reasoningIds = [
      "019f62e8-892f-7032-b004-1869f8bc0782",
      "634ecfec-1862-4ce0-821e-e31057acadfa",
      "b5db9430-857a-408c-817c-32e975a71430",
    ];
    for (const id of reasoningIds) settings.promptEnabled[id] = true;
    const disabledPrompt = data.prompt_order[0]!.order.find((entry) => entry.enabled === false);
    expect(disabledPrompt).toBeDefined();
    const messages = [
      { role: "system" as const, content: "card context" },
      { role: "user" as const, content: "latest" },
    ];
    const built = await buildRequestMessages(messages, data, settings, async (value) => value);
    const composed = await composePresetPrompts(data, settings, async (value) => value);
    const vietnamese = built.filter((entry) => entry.memo === "ff54:vietnamese-output");
    expect(vietnamese).toHaveLength(1);
    expect(built.some((entry) => entry.memo === "ff54:vietnamese-natural-writing")).toBe(false);
    expect(built.some((entry) => entry.memo === "ff54:anime-manga-light-novel-style")).toBe(false);
    expect(vietnamese[0]!.content).toBe(VIETNAMESE_OUTPUT_PROMPT);
    expect(built.slice(0, composed.leading.length)).toEqual(composed.leading);
    expect(built.indexOf(vietnamese[0]!)).toBe(composed.leading.length);
    const npcCreationIndex = built.findIndex((entry) => entry.content.includes("<npc_creation>"));
    expect(npcCreationIndex).toBeGreaterThanOrEqual(0);
    expect(built.indexOf(vietnamese[0]!)).toBe(npcCreationIndex + 1);
    expect(built.indexOf(vietnamese[0]!)).toBeLessThan(
      built.findIndex((entry) => entry.content === "card context"),
    );
    expect(built.indexOf(vietnamese[0]!)).toBeLessThan(
      Math.min(
        ...built
          .map((entry, index) => (entry.memo?.startsWith("ff54:absolute:") ? index : Infinity))
          .filter((index) => Number.isFinite(index)),
      ),
    );
    expect(built.indexOf(vietnamese[0]!)).toBeLessThan(
      built.findIndex((entry) => entry.memo === "ff54:jailbreak"),
    );
    expect(vietnamese[0]!.content).toContain(
      "FF5.4 headers, internal-state blocks, GFX, character-card HUDs, status panels, and separate structured displays",
    );
    expect(vietnamese[0]!.content).toContain(
      "card or lore instructions that request, imply, or demonstrate another reader-visible language never override the Language Lock",
    );
    expect(vietnamese[0]!.content).toContain(
      "Preserve exact HTML, XML, comments, attributes, color tags, delimiters, placeholders, identifiers, and schema structure required for rendering",
    );
    expect(built.some((entry) => entry.memo === `ff54:${disabledPrompt!.identifier}`)).toBe(false);
    const allContent = built.map((entry) => entry.content).join("\n");
    const reasoningChecks: Array<[string, string]> = [
      ["GATE 7. Sensory Physics and Cinematography:", "GATE 8. User POV and Autonomy:"],
      ["3. Prose Style:", "4. Natural Dialogue:"],
      ["2. Prose, Formatting & Boundaries:", "3. Natural Dialogue:"],
    ];
    for (const [startMarker, endMarker] of reasoningChecks) {
      const startIndex = allContent.indexOf(startMarker);
      const endIndex = allContent.indexOf(endMarker, startIndex + startMarker.length);
      const task = allContent.slice(startIndex, endIndex);
      expect(startIndex).toBeGreaterThanOrEqual(0);
      expect(endIndex).toBeGreaterThan(startIndex);
      expect(task).not.toContain("<anime_manga_light_novel_style>");
      expect(task).not.toContain("<vietnamese_natural_writing>");
    }
    expect(allContent).not.toContain("<anime_manga_light_novel_style>");
    expect(allContent).not.toContain("<vietnamese_natural_writing>");
    expect(allContent).toContain("I will use natural Vietnamese conjunctions in spoken dialogue");
    expect(allContent).not.toContain("I will not use the coordinating conjunctions");
    expect(allContent).not.toContain("Ban Coordinating Conjunctions:");
    expect(allContent).toContain('e.g., "KHÔNG!", "CÚT NGAY!", "DỪNG LẠI!"');
    expect(allContent).toContain("(ưm..., aaaa..., suỵt, á!, ối!, hức!, ực!, hừ...)");
    expect(allContent).toContain(
      "6. Slop Review: I must list all banned phrases and clichés in `<banned_vocabulary>`",
    );
    const bannedVocabulary = built.find(
      (entry) => entry.memo === "ff54:019f62e8-892f-7013-9e9b-13eae330f5a0",
    );
    expect(bannedVocabulary?.content).toContain("<banned_vocabulary>");
    expect(bannedVocabulary?.content).toContain(
      "ALL listed Vietnamese phrases and clichés are STRICTLY prohibited",
    );
    expect(bannedVocabulary?.content).toContain("tim hẫng đi một nhịp");
    expect(bannedVocabulary?.content).not.toContain("fresh meat");
    expect(allContent).toContain(
      "Can I use <gfx_protocol> in this scene? Which locked colors from <colored_dialogue>",
    );
    expect(allContent).toContain(
      "What is the target response length in <formatting_constraints>? How will I apply `<vietnamese_output>` to all reader-facing content, including headers and internal states? (skip if tags not present)",
    );
  });

  it("rebuilds one FF5.4 injection set when the host retries a request", async () => {
    const data = await preset();
    const settings = createDefaultSettings(data);
    const messages = [
      { role: "system" as const, content: "card context" },
      { role: "user" as const, content: "latest" },
    ];
    const parse = async (value: string) => value;
    const first = await buildRequestMessages(messages, data, settings, parse, {
      randomInt: () => 13,
    });
    const retried = await buildRequestMessages(first, data, settings, parse, {
      randomInt: () => 13,
    });

    expect(retried).toEqual(first);
    expect(retried.filter((message) => message.memo === "ff54:vietnamese-output")).toHaveLength(1);
    expect(retried.filter((message) => message.memo?.startsWith("ff54:absolute:"))).toHaveLength(
      first.filter((message) => message.memo?.startsWith("ff54:absolute:")).length,
    );
  });

  it("changes only Vietnamese-facing BOLT checks", async () => {
    const data = await preset();
    const bolt = data.prompts.find((prompt) => prompt.name === "⚡️BOLT Chain of Thought 🧠");
    expect(bolt?.content).toEqual(expect.any(String));
    const source = String(bolt!.content);
    const adapted = adaptPromptForVietnamese(source);
    for (const unchanged of [
      "- A. Reason briefly in highly concise bullet points inside think tags across Tasks 0-10.",
      "- B. *NEVER* draft full prose in reasoning; ONLY brainstorm ideas and answer all questions, then output final response immediately after Task 10.",
      "- C. Do not leak reasoning into the final response.",
      "0. Gamestate:",
      "3. Prose Style:",
      "5. User Boundaries:",
      "8. Adult Modes:",
      "9. Plot Momentum:",
      "10. Internal States + No More Reasoning Rule:",
      "I will answer task points with concise ideas only, close think tags, and output the final response immediately.",
    ]) {
      expect(source).toContain(unchanged);
      expect(adapted).toContain(unchanged);
    }
    expect(adapted).not.toContain("- D.");
    expect(adapted).not.toMatch(/begin directly|Keep all internal processing private/i);
  });

  it("applies the Vietnamese output tag in MAX, BOLT, and Micro reasoning", async () => {
    const data = await preset();
    for (const identifier of [
      "019f62e8-892f-7032-b004-1869f8bc0782",
      "634ecfec-1862-4ce0-821e-e31057acadfa",
      "b5db9430-857a-408c-817c-32e975a71430",
    ]) {
      const prompt = data.prompts.find((candidate) => candidate.identifier === identifier);
      const sourceContent = String(prompt?.content ?? "");
      const adapted = adaptPromptForVietnamese(sourceContent);
      expect(sourceContent).not.toContain("How will I apply `<vietnamese_output>`");
      expect(adapted.match(/How will I apply `<vietnamese_output>`/g)).toHaveLength(1);
      expect(adapted).toContain("including headers and internal states");
      expect(adapted).not.toContain("card-required HUDs");
    }
  });

  it("uses exclusive UI groups and hides source separators and host markers", async () => {
    const data = await preset();
    const settings = createDefaultSettings(data);
    for (const group of EXCLUSIVE_PROMPT_GROUPS) {
      expect(
        group.memberIds.filter((identifier) => settings.promptEnabled[identifier]),
      ).toHaveLength(1);
    }

    const reasoning = EXCLUSIVE_PROMPT_GROUPS.find((group) => group.id === "reasoning")!;
    for (const identifier of reasoning.memberIds) settings.promptEnabled[identifier] = true;
    normalizeExclusivePromptGroups(settings, data.prompt_order[0]!.order);
    expect(reasoning.memberIds.filter((identifier) => settings.promptEnabled[identifier])).toEqual([
      "634ecfec-1862-4ce0-821e-e31057acadfa",
    ]);

    const visibleIds = new Set([
      ...EXCLUSIVE_PROMPT_GROUPS.flatMap((group) => [...group.memberIds]),
      ...PROMPT_SECTIONS.flatMap((section) => [...section.promptIds]),
    ]);
    for (const identifier of SOURCE_SEPARATOR_IDS) expect(visibleIds.has(identifier)).toBe(false);
    for (const identifier of HOST_MARKER_IDS) expect(visibleIds.has(identifier)).toBe(false);
    expect(SOURCE_SEPARATOR_IDS.size).toBe(8);
    expect(HOST_MARKER_IDS.size).toBe(8);
  });

  it("renders a Vietnamese responsive settings UI", async () => {
    const pluginSource = await readFile(
      "risuai/freaky-frankenstein-5.4-plugin/src/plugin.ts",
      "utf8",
    );
    const styles = await readFile("risuai/freaky-frankenstein-5.4-plugin/src/ui-style.ts", "utf8");
    expect(pluginSource).toContain("Điều khiển <em>FF5.4.</em>");
    expect(pluginSource).toContain("Lưu cấu hình");
    expect(pluginSource).toContain("Khôi phục");
    expect(pluginSource).toContain("Nhóm chọn một");
    expect(pluginSource).toContain('type="radio"');
    expect(pluginSource).toContain('input[data-kind="choice"][data-group=');
    expect(pluginSource).toContain('type="checkbox"');
    expect(pluginSource).toContain('aria-live="polite"');
    expect(styles).toContain("@media(max-width:700px)");
    expect(styles).toContain("grid-template-columns:1fr");
    expect(styles).toContain("prefers-reduced-motion:reduce");
    expect(pluginSource).not.toContain("Global configuration");
    expect(pluginSource).not.toContain("Reset source defaults");
    expect(pluginSource).not.toContain("Save globally");
    expect(pluginSource).not.toContain("Prompt modules");
    expect(pluginSource).not.toContain("Regex scripts");
  });

  it("matches every Vietnamese replacement against the source preset", async () => {
    const data = await preset();
    const sourceContent = data.prompts
      .map((prompt) => (typeof prompt.content === "string" ? prompt.content : ""))
      .join("\n\n");
    for (const [sourceText, replacement] of [
      ...VIETNAMESE_OUTPUT_REPLACEMENTS,
      ...VIETNAMESE_REASONING_REPLACEMENTS,
    ]) {
      expect(sourceContent, `missing source replacement: ${sourceText}`).toContain(sourceText);
      expect(adaptPromptForVietnamese(sourceText)).toBe(replacement);
    }
  });

  it("adapts Vietnamese-facing examples in optional modules when enabled", async () => {
    const data = await preset();
    const settings = createDefaultSettings(data);
    const optionalIdentifiers = [
      "019f62e8-892f-7008-bbb9-b6ebf9cdc0f5",
      "0b0afd85-71ea-45ee-99cf-cb72faf19fac",
      "2105050a-0d4b-4661-9363-3cc1ac44d5e7",
      "019f62e8-892f-701c-8550-08ebf33e9da2",
      "019f62e8-892f-7028-bad6-be1f427c3ae4",
      "019f62e8-892f-7024-a40f-b906fceb58d2",
    ];
    for (const identifier of optionalIdentifiers) settings.promptEnabled[identifier] = true;
    const composed = await composePresetPrompts(data, settings, async (value) => value, {
      randomInt: () => 13,
    });
    const content = [...composed.leading, ...composed.absolute, ...composed.trailing]
      .map((entry) => entry.content)
      .join("\n");
    expect(content).toContain('Good: "Bạn nhận thấy cánh tay cô ấy đang run."');
    expect(content).toContain('Exact Format: <font color="#HEX">"Dialogue"</font>');
    expect(content).not.toContain('Exact Format: <font color="#HEX">"Lời thoại"</font>');
    expect(content).toContain("*Bẹp!*, *Đoàng!*");
    expect(content).toContain('("Khoan, sao họ lại nói thế?")');
    expect(content).toContain('They can\'t identify "what happened" by smells.');
    expect(content).toContain('Ban intuition, dramatic irony, and "just knowing."');
    expect(content).toContain(
      "1-2, 19-20: CALM — Quiet moment; plant 1 passive environment Chekhov seed (W1).",
    );
    expect(content).not.toContain(
      "1-2, 19-20: CALM — Khoảnh khắc yên ắng; gieo 1 Chekhov seed môi trường thụ động (W1).",
    );
    expect(content).not.toContain('"You notice her arms are shaking."');
    expect(content).not.toContain('"You\'re barking up the wrong tree."');
    const orphanedLargeVoice = data.prompts.find(
      (prompt) => prompt.identifier === "019f62e8-892f-7018-a6ba-bfb2077ccfa7",
    );
    const adaptedLargeVoice = adaptPromptForVietnamese(String(orphanedLargeVoice?.content));
    expect(adaptedLargeVoice).toContain('pleasure: "ưm... a... sướng quá...!"');
  });

  it("localizes the FF5.4 header and internal-state output schemas", async () => {
    const data = await preset();
    const byId = new Map(data.prompts.map((prompt) => [prompt.identifier, prompt]));
    const header = adaptPromptForVietnamese(
      String(byId.get("019f62e8-892f-7002-8fcf-eea637bd577b")?.content),
    );
    const internalStates = adaptPromptForVietnamese(
      String(byId.get("019f62e8-892f-7027-93ef-159f3d55c410")?.content),
    );
    const dnd = adaptPromptForVietnamese(
      String(byId.get("019f62e8-892f-7021-97a6-42e1b83eaad3")?.content),
    );

    expect(header).toContain("🕰️ Thời gian HH:MM SA/CH");
    expect(header).toContain("📍 Địa điểm - Khu vực cụ thể");
    expect(header).toContain("năm YYYY SCN/TCN");
    expect(header).toContain("Nhiệt độ °C");
    expect(header).toContain("Display temperature in degrees Celsius");
    expect(header).not.toContain("🕰️ Time HH:MM AM/PM");
    expect(internalStates).toContain("🎬 TRẠNG THÁI NỘI BỘ (Lượt: [ct])");
    expect(internalStates).toContain("👤 LỊCH TRÌNH NPC");
    expect(internalStates).toContain("🌌 VẬT LÝ, CƠ CHẾ & THẾ GIỚI");
    expect(internalStates).toContain(
      "write every displayed label, placeholder replacement, and generated free-text value in natural Vietnamese",
    );
    expect(dnd).toContain("🎲 MÔ PHỎNG NHIỆM VỤ DND");
    expect(dnd).toContain("<b>Kết quả:</b> [Mức độ và hệ quả]");
  });

  it("keeps FF5.4 display regex compatible with Vietnamese internal-state labels", async () => {
    const data = await preset();
    const settings = createDefaultSettings(data);
    const input =
      "<details><summary>💚 MỐI QUAN HỆ</summary><br>- <b>Eunjin</b> ↔ <b>TomiSakae</b> | GẮN KẾT: +2 | THIỆN CẢM: 1 | BẤT MÃN: 0<br></details>";
    const output = applyRegexScripts(input, data, settings, {
      placement: 2,
      markdown: true,
      depth: 0,
    });

    expect(output).toContain("GẮN KẾT: +2");
    expect(output).toContain("THIỆN CẢM: 1");
    expect(output).toContain("BẤT MÃN: 0");
    expect(output).toContain("background:rgba");
  });

  it("keeps the untagged-thought filter compatible with the Vietnamese header", async () => {
    const data = await preset();
    const settings = createDefaultSettings(data);
    const input =
      "Reasoning leaked here\n\n[ 🕰️ Thời gian 02:25 CH | 🗓️ Ngày 1 - Thứ Bảy, ngày 04 tháng 04 năm 2026 SCN ]\nNội dung nhập vai";
    const output = applyRegexScripts(input, data, settings, {
      placement: 2,
      prompt: true,
      depth: 0,
    });

    expect(output).not.toContain("Reasoning leaked here");
    expect(output).toContain("[ 🕰️ Thời gian 02:25 CH");
    expect(output).toContain("Nội dung nhập vai");
  });

  it("builds original and Vietnamese comparison files from every source module", async () => {
    const data = await preset();
    const outputDirectory = "risuai/freaky-frankenstein-5.4-plugin/comparison";
    const result = await buildVietnameseComparison({
      sourceFile: source,
      outputDirectory,
    });
    const [original, vietnamese, review] = await Promise.all([
      readFile(result.originalFile, "utf8"),
      readFile(result.vietnameseFile, "utf8"),
      readFile(result.reviewFile, "utf8"),
    ]);
    expect(original.match(/^## \d{2}\. (?:ON|OFF) — /gm)).toHaveLength(data.prompts.length);
    expect(vietnamese.match(/^## \d{2}\. (?:ON|OFF) — /gm)).toHaveLength(data.prompts.length);
    expect(original).toContain("FF5.4 Original — All Prompt Modules");
    expect(original).toContain("fresh meat, spine, breath hitching");
    expect(original).not.toContain(VIETNAMESE_OUTPUT_PROMPT);
    expect(vietnamese).toContain("FF5.4 Vietnamese Adapter — All Prompt Modules");
    expect(vietnamese).toContain(VIETNAMESE_OUTPUT_PROMPT);
    expect(vietnamese).toContain("tim hẫng đi một nhịp");
    expect(vietnamese).toContain("Source toggle: **OFF**");
    expect(vietnamese).toContain("# Prompts outside `prompt_order`");
    expect(vietnamese).toContain('pleasure: "ưm... a... sướng quá...!"');
    expect(review.match(/^## \d{2}\. (?:ON|OFF) — /gm)).toHaveLength(data.prompts.length);
    expect(review).toContain("# FF5.4 English/Vietnamese Adapter Review");
    expect(review).toContain("## Mandatory review checklist");
    expect(review).toContain("### English source");
    expect(review).toContain("### Vietnamese-adapted");
    expect(review).toContain("quoted GOOD/BAD prose");
    expect(review).toContain(
      'NPCs talk, moan, and swear during intimacy. (e.g., "ưm... a... sướng quá...!")',
    );
  });

  it("stores named presets and card assignments in plugin storage and reads legacy settings", async () => {
    const pluginSource = await readFile(
      "risuai/freaky-frankenstein-5.4-plugin/src/plugin.ts",
      "utf8",
    );
    expect(pluginSource).toContain('const STORAGE_KEY = "ff54-global-settings-v1"');
    expect(pluginSource).toContain('location: "chat"');
    expect(pluginSource).toContain("getCurrentCharacterIndex");
    expect(pluginSource).toContain("getCurrentChatIndex");
    expect(pluginSource).toContain("setChatToIndex");
    expect(pluginSource.match(/pluginStorage\.getItem\(STORAGE_KEY\)/g)).toHaveLength(1);
    expect(pluginSource).toContain("pluginStorage.getItem(CONFIG_PRESETS_STORAGE_KEY)");
    expect(pluginSource).toContain(
      "pluginStorage.setItem(CONFIG_PRESETS_STORAGE_KEY, configPresets)",
    );
    expect(pluginSource).toContain("cardId: character?.chaId");
    const unavailableParserApi = ["parse", "Risu", "Chat"].join("");
    expect(pluginSource).not.toContain(unavailableParserApi);
  });

  it("does not bundle the unavailable chat-parser API", async () => {
    const artifact = await readFile(
      "risuai/freaky-frankenstein-5.4-plugin/dist/ff54-risuai-plugin.js",
      "utf8",
    );
    expect(artifact).not.toContain(["parse", "Risu", "Chat"].join(""));
    expect(artifact.match(/^\/\/@version (.+)$/m)?.[1]).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("context-saver regex keeps the two newest AI responses", async () => {
    const data = await preset();
    const settings = createDefaultSettings(data);
    const messages = [
      { role: "assistant" as const, content: "old<internal_states>OLD</internal_states>" },
      { role: "user" as const, content: "first user" },
      { role: "assistant" as const, content: "recent<internal_states>RECENT</internal_states>" },
      { role: "user" as const, content: "second user" },
      { role: "assistant" as const, content: "newest<internal_states>NEWEST</internal_states>" },
      { role: "user" as const, content: "latest" },
    ];
    const output = applyPromptRegexToMessages(messages, data, settings);
    expect(output[0]!.content).toBe("old");
    expect(output[2]!.content).toContain("<internal_states>RECENT</internal_states>");
    expect(output[4]!.content).toContain("<internal_states>NEWEST</internal_states>");
  });

  it("uses context-saver minDepth for old request content while preserving recent history", async () => {
    const data = await preset();
    const settings = createDefaultSettings(data);
    const header = "[ 🕰️ Thời gian 14:25 CH | 🗓️ Ngày 1 | 📍 Đại học | ☀️ Nắng, 20 °C ]";
    const messages = [
      {
        role: "assistant" as const,
        content: `${header}\nold<internal_states>OLD</internal_states>`,
      },
      { role: "user" as const, content: "first user" },
      {
        role: "assistant" as const,
        content: `${header}\nrecent<internal_states>RECENT</internal_states>`,
      },
      { role: "user" as const, content: "second user" },
      {
        role: "assistant" as const,
        content: `${header}\nnewest<internal_states>NEWEST</internal_states>`,
      },
      { role: "user" as const, content: "latest" },
    ];

    const filtered = applyRequestFiltersToMessages(messages, data, settings);
    expect(filtered[0]!.content).toBe("\nold");
    expect(filtered[0]!.content).not.toContain(header);
    expect(filtered[0]!.content).not.toContain("<internal_states>");
    expect(filtered[2]!.content).toContain(header);
    expect(filtered[2]!.content).toContain("<internal_states>RECENT</internal_states>");
    expect(filtered[4]!.content).toContain(header);
    expect(filtered[4]!.content).toContain("<internal_states>NEWEST</internal_states>");

    settings.regexEnabled["3fbb6c80-ab8f-4a21-8221-62c9f8546306"] = false;
    const preserved = applyRequestFiltersToMessages(messages, data, settings);
    expect(preserved[0]!.content).toContain(header);
    expect(preserved[0]!.content).toContain("<internal_states>OLD</internal_states>");
  });

  it("keeps scene headers in the saved history during context-saver cleanup", async () => {
    const data = await preset();
    const settings = createDefaultSettings(data);
    const header = "[ 🕰️ Thời gian 14:25 CH | 🗓️ Ngày 1 | 📍 Đại học | ☀️ Nắng, 20 °C ]";
    const messages = [
      {
        role: "assistant" as const,
        content: `${header}\nold<internal_states>OLD</internal_states>`,
      },
      { role: "user" as const, content: "first user" },
      {
        role: "assistant" as const,
        content: `${header}\nrecent<internal_states>RECENT</internal_states>`,
      },
      { role: "user" as const, content: "second user" },
      {
        role: "assistant" as const,
        content: `${header}\nrecent<internal_states>NEW</internal_states>`,
      },
      { role: "user" as const, content: "latest" },
    ];

    const cleanedHistory = applyPromptRegexToMessages(messages, data, settings);
    expect(cleanedHistory[0]!.content).toContain(header);
    expect(cleanedHistory[0]!.content).not.toContain("<internal_states>");
    expect(cleanedHistory[2]!.content).toContain(header);
    expect(cleanedHistory[2]!.content).toContain("<internal_states>RECENT</internal_states>");
    expect(cleanedHistory[4]!.content).toContain(header);
    expect(cleanedHistory[4]!.content).toContain("<internal_states>NEW</internal_states>");
  });

  it("preserves story GFX in saved history and requests while cleaning old internal state", async () => {
    const data = await preset();
    const settings = createDefaultSettings(data);
    const letter =
      '<!-- GFX_START -->\n<div style="color:#fff">Thư hẹn gặp lúc tám giờ.</div>\n<!-- GFX_END -->';
    const internal =
      "<!-- GFX_START -->\n<internal_states><details>SECRET</details></internal_states>\n<!-- GFX_END -->";
    const messages = [
      { role: "assistant" as const, content: `old\n${letter}\n${internal}\nending` },
      { role: "user" as const, content: "first user" },
      { role: "assistant" as const, content: `recent\n${letter}\n${internal}` },
      { role: "user" as const, content: "second user" },
      { role: "assistant" as const, content: `newest\n${letter}\n${internal}` },
      { role: "user" as const, content: "latest" },
    ];

    const history = applyPromptRegexToMessages(messages, data, settings);
    const request = applyRequestFiltersToMessages(messages, data, settings);
    for (const output of [history, request]) {
      for (const index of [0, 2, 4]) expect(output[index]!.content).toContain(letter);
      expect(output[0]!.content).toContain("ending");
      expect(output[0]!.content).not.toContain("SECRET");
      expect(output[0]!.content).not.toContain("<internal_states>");
      expect(output[2]!.content).toContain(internal);
      expect(output[4]!.content).toContain(internal);
    }
  });

  it("removes an orphan GFX_END at the end of an old AI response", async () => {
    const data = await preset();
    const settings = createDefaultSettings(data);
    const storyGfx = "<!-- GFX_START -->\n<div>Thư trong truyện</div>\n<!-- GFX_END -->";
    const messages = [
      { role: "assistant" as const, content: `Nội dung nhập vai\n\n<!-- GFX_END -->` },
      { role: "assistant" as const, content: `Nội dung khác\n${storyGfx}\n<!-- GFX_END -->` },
      { role: "assistant" as const, content: `Gần nhất\n${storyGfx}` },
      { role: "assistant" as const, content: `Mới nhất\n${storyGfx}` },
    ];

    for (const output of [
      applyPromptRegexToMessages(messages, data, settings),
      applyRequestFiltersToMessages(messages, data, settings),
    ]) {
      expect(output[0]!.content).toBe("Nội dung nhập vai");
      expect(output[1]!.content).toBe(`Nội dung khác\n${storyGfx}`);
      expect(output[2]!.content).toContain(storyGfx);
      expect(output[3]!.content).toContain(storyGfx);
    }
  });

  it("keeps scene headers in history but removes them from the request copy", () => {
    const header = "[ 🕰️ Thời gian 14:25 CH | 🗓️ Ngày 1 | 📍 Đại học | ☀️ Nắng, 20 °C ]";
    const input = `${header}\n\nNội dung nhập vai`;
    expect(removeSceneHeadersForRequest(input)).toBe("\n\nNội dung nhập vai");
    expect(input).toContain(header);
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

  it("renders only the current Vietnamese scene header as responsive UI", () => {
    const input =
      "[ 🕰️ Thời gian 14:25 CH | 🗓️ Ngày 1 - Thứ Bảy, ngày 04 tháng 04 năm 2026 SCN | 📍 Đại học - Đường hoa anh đào | ☀️ Nắng ráo, 20 °C ]\n\nNội dung nhập vai";
    const output = adaptVietnameseHeaderForRisuAI(input);

    expect(output).toContain('data-ff54="scene-header"');
    expect(output).toContain("grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr))");
    expect(output).toContain("14:25 CH");
    expect(output).toContain("1 - Thứ Bảy, ngày 04 tháng 04 năm 2026 SCN");
    expect(output).toContain("Đại học - Đường hoa anh đào");
    expect(output).toContain("☀️ Nắng ráo, 20 °C");
    expect(output).toContain("Nội dung nhập vai");
    expect(adaptVietnameseHeaderForRisuAI(output)).toBe(output);
  });

  it("renders a Vietnamese scene header after a host reasoning block", () => {
    const input =
      "<Thoughts>\nReasoning from Vertex\n</Thoughts>\n\n[ 🕰️ Thời gian 14:25 CH | 🗓️ Ngày 1 - Thứ Bảy, ngày 04 tháng 04 năm 2026 SCN | 📍 Đại học - Đường hoa anh đào | ☀️ Nắng ráo, 20 °C ]\n\nNội dung nhập vai";
    const output = adaptVietnameseHeaderForRisuAI(input);

    expect(output).toContain("<Thoughts>\nReasoning from Vertex\n</Thoughts>");
    expect(output).toContain('data-ff54="scene-header"');
    expect(output.indexOf('data-ff54="scene-header"')).toBeGreaterThan(
      output.indexOf("</Thoughts>"),
    );
    expect(output).not.toContain("[ 🕰️ Thời gian 14:25 CH");
    expect(output).toContain("Nội dung nhập vai");
  });

  it("renders a Vietnamese scene header after FF5.4 collapses reasoning", () => {
    const input =
      "<details><summary>💭 Thoughts</summary>Reasoning from Vertex</details>\n\n[ 🕰️ Thời gian 14:25 CH | 🗓️ Ngày 1 - Thứ Bảy, ngày 04 tháng 04 năm 2026 SCN | 📍 Đại học - Đường hoa anh đào | ☀️ Nắng ráo, 20 °C ]\n\nNội dung nhập vai";
    const output = adaptVietnameseHeaderForRisuAI(input);

    expect(output).toContain("Reasoning from Vertex</details>");
    expect(output).toContain('data-ff54="scene-header"');
    expect(output.indexOf('data-ff54="scene-header"')).toBeGreaterThan(
      output.indexOf("</details>"),
    );
    expect(output).not.toContain("[ 🕰️ Thời gian 14:25 CH");
  });

  it("renders legacy scene headers without restricting field vocabulary", () => {
    const input =
      "[ 🕰️ Thời gian 14:25 CH | 🗓️ Ngày 1 - Thứ Bảy, ngày 04 tháng 04 năm 2026 Kỷ nguyên | 📍 Đại học - Đường hoa anh đào | ☀️ Nắng ráo, 68°F ]";

    const output = adaptVietnameseHeaderForRisuAI(input);
    expect(output).toContain('data-ff54="scene-header"');
    expect(output).toContain("68°F");
  });

  it("renders headers from marker structure without guessing field vocabulary", () => {
    const inputs = [
      "[ 🕰️ Thời gian 07:00 tối | 🗓️ Ngày 1 - Thứ Hai | 📍 Trường học - Hành lang | Trời lạnh, có mưa ]",
      "[ 🕰️ 19 giờ 00 phút, buổi tối | 🗓️ Thứ Hai, ngày 05 tháng 03 | 📍 Ký túc xá | 🌙 Có mây, 18 độ C ]",
      "[ 🕰️ Time 14:25 PM, late afternoon | 🗓️ Day 1 - Monday | 📍 School - Hallway | ☀️ Sunny, 64°F ]",
    ];

    for (const input of inputs) {
      const output = adaptVietnameseHeaderForRisuAI(input);
      expect(output).toContain('data-ff54="scene-header"');
      expect(output).not.toContain(input);
    }
  });

  it("renders every structured header in a response", () => {
    const input =
      "[ 🕰️ 07:00 | 🗓️ Ngày 1 | 📍 Phòng khách | ☀️ Nắng ]\n\nNội dung\n\n[ 🕰️ 08:00 | 🗓️ Ngày 1 | 📍 Nhà bếp | 🌧️ Mưa ]";

    expect(adaptVietnameseHeaderForRisuAI(input).match(/data-ff54="scene-header"/g)).toHaveLength(
      2,
    );
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
