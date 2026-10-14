import { beforeAll, describe, expect, it } from "vitest";
import { loadPresetSources } from "../scripts/build-tomisakae-vn-rp-plugin.js";
import {
  applyRegexScripts,
  applyPromptRegexToMessages,
  createDefaultSettings,
  PLACEMENT_AI_OUTPUT,
  type ChatMessage,
  type FfPreset,
} from "../risuai/tomisakae-vn-rp-plugin/src/core.js";
import {
  restoreSolaHistoryContent,
  SOLA_HEADER_SAVER_ID,
  type SolaHistoryRemoval,
} from "../risuai/tomisakae-vn-rp-plugin/src/sola-history.js";

let preset: FfPreset;
beforeAll(async () => {
  preset = (await loadPresetSources()).sola.preset;
});

describe("Sola saved-history snapshots", () => {
  const header = '<scene_header location="Phòng > cửa" time="13:40" atmosphere="Nắng" />';

  it("round-trips overlapping HUD savers and several inline HTML blocks without moving prose", () => {
    const separation = "Một đoạn kể nằm giữa tài liệu và HUD. ".repeat(8);
    const input = `${header}\nĐoạn đầu.\n<!--HTML_START--><div>Thư thứ nhất.</div><!--HTML_END-->\nĐoạn giữa.\n<!--HTML_START--><div>Thư thứ hai.</div><!--HTML_END-->\nĐoạn cuối.${separation}\n<!--HTML_START--><sola_hud digest="Ngày 1"><date>Ngày: 1</date><wardrobe>Áo khoác</wardrobe><fengine>T1 F2 D3 Y2</fengine><bond>+1</bond><tempo>STEADY</tempo></sola_hud><!--HTML_END-->`;
    const removals: SolaHistoryRemoval[] = [];
    const settings = createDefaultSettings(preset);
    const visible = applyRegexScripts(input, preset, settings, {
      placement: PLACEMENT_AI_OUTPUT,
      prompt: true,
      history: true,
      depth: 20,
      onHistoryRemoval: (offset, text) => removals.push({ offset, text }),
    });
    expect(visible).toContain(header);
    expect(visible).toContain("Đoạn đầu.");
    expect(visible).toContain("Đoạn giữa.");
    expect(visible).toContain("Đoạn cuối.");
    expect(visible).not.toMatch(/Thư thứ|<sola_hud|<date>|<fengine/);
    expect(restoreSolaHistoryContent(visible, { visible, removals })).toBe(input);
    expect(
      restoreSolaHistoryContent(visible.replace("Đoạn đầu.", "Chỉnh diễn biến."), {
        visible,
        removals,
      }),
    ).toContain("Chỉnh diễn biến.");
  });

  it("keeps headers in saved history and cuts them only from sufficiently old request copies", () => {
    const settings = createDefaultSettings(preset);
    expect(settings.regexEnabled[SOLA_HEADER_SAVER_ID]).toBe(true);
    const options = { placement: PLACEMENT_AI_OUTPUT, prompt: true, depth: 4 };
    expect(applyRegexScripts(header, preset, settings, options)).toBe("");
    expect(applyRegexScripts(header, preset, settings, { ...options, history: true })).toBe(header);
    expect(applyRegexScripts(header, preset, settings, { ...options, depth: 3 })).toBe(header);
    settings.regexEnabled[SOLA_HEADER_SAVER_ID] = false;
    expect(applyRegexScripts(header, preset, settings, options)).toBe(header);
  });

  it("cleans incomplete trackers and follows each saver toggle and native depth", () => {
    const settings = createDefaultSettings(preset);
    const input = "Trước.<wardrobe>Áo khoác</wardrobe>Sau.<wardrobe>Chưa xong";
    const options = { placement: PLACEMENT_AI_OUTPUT, prompt: true, history: true };
    expect(applyRegexScripts(input, preset, settings, { ...options, depth: 1 })).toBe(input);
    expect(applyRegexScripts(input, preset, settings, { ...options, depth: 2 })).toBe("Trước.Sau.");
    const wardrobe = preset.extensions!.regex_scripts!.find(
      (script) => script.scriptName === "Sola Saver: Wardrobe & Inventory",
    )!;
    settings.regexEnabled[wardrobe.id] = false;
    expect(applyRegexScripts(input, preset, settings, { ...options, depth: 2 })).toBe(input);
  });

  it("keeps the latest wardrobe with extra user messages while aging only on new AI responses", () => {
    const settings = createDefaultSettings(preset);
    const hud =
      '<sola_hud digest="Ngày 1"><wardrobe>Áo khoác</wardrobe><inventory>Bút</inventory><date>Ngày: 1</date><scene_cast>An</scene_cast><story_notes>Ghi chú</story_notes></sola_hud>';
    const response = (name: string): ChatMessage => ({
      role: "assistant",
      content: `${header}\n${name}\n${hud}`,
    });
    const history: ChatMessage[] = [
      response("Cũ"),
      { role: "user", content: "Lượt trước" },
      response("Liền trước"),
      { role: "user", content: "Lượt này" },
      response("Mới nhất"),
    ];
    const afterResponse = applyPromptRegexToMessages(history, preset, settings);
    expect(afterResponse[0]!.content).not.toContain("<sola_hud");
    expect(afterResponse[2]!.content).not.toMatch(/<wardrobe|<inventory/);
    expect(afterResponse[2]!.content).toContain("<date>");
    expect(afterResponse[2]!.content).toContain("<scene_cast>");
    expect(afterResponse[4]!.content).toBe(history[4]!.content);

    for (const count of [1, 2, 6]) {
      const messages = [
        ...history,
        ...Array.from({ length: count }, (_, index): ChatMessage => ({
          role: "user",
          content: index === 0 ? "Tôi lại gần cô." : "OOC dùng nhiều ảnh và tone có sẵn.",
        })),
      ];
      const snapshot = structuredClone(messages);
      for (const options of [{}, { history: true }]) {
        const filtered = applyPromptRegexToMessages(messages, preset, settings, options);
        expect(filtered[0]!.content).not.toContain("<sola_hud");
        expect(filtered[2]!.content).not.toMatch(/<wardrobe|<inventory|<date|<scene_cast/);
        expect(filtered[2]!.content).toContain("<story_notes>");
        expect(filtered[4]!.content).toBe(messages[4]!.content);
        expect(filtered.slice(5)).toEqual(messages.slice(5));
      }
      expect(messages).toEqual(snapshot);
    }

    const consecutiveResponses = applyPromptRegexToMessages(
      [response("Cũ"), response("Liền trước"), response("Mới nhất")],
      preset,
      settings,
    );
    expect(consecutiveResponses[0]!.content).not.toContain("<sola_hud");
    expect(consecutiveResponses[1]!.content).not.toMatch(/<wardrobe|<inventory/);
    expect(consecutiveResponses[2]!.content).toContain(hud);
  });

  it.each([
    ["Feeling Engine", "fengine"],
    ["Thought Engine", "thought_engine"],
    ["Wardrobe & Inventory", "wardrobe"],
    ["Wardrobe & Inventory", "inventory"],
    ["Scene Cast & Dossier", "scene_cast"],
    ["Scene Cast & Dossier", "scene_state"],
    ["Bond Radar", "bond"],
    ["Calendar", "date"],
    ["Director Notebook", "story_notes"],
    ["Character Trait Ledger", "solatag"],
    ["Character Matrix", "char_matrix"],
    ["Tempo", "tempo"],
    ["Showrunner HUD", "sola_hud"],
  ])("archives an unfinished %s block without altering its original data", (saver, tag) => {
    const settings = createDefaultSettings(preset);
    const script = preset.extensions!.regex_scripts!.find(
      (candidate) => candidate.scriptName === `Sola Saver: ${saver}`,
    )!;
    settings.regexEnabled = { [script.id]: true };
    const input = `${header}\nĐoạn kể.\n<${tag} name="An > Bình">Dữ liệu chưa đóng`;
    const removals: SolaHistoryRemoval[] = [];
    const visible = applyRegexScripts(input, preset, settings, {
      placement: PLACEMENT_AI_OUTPUT,
      prompt: true,
      history: true,
      depth: script.minDepth!,
      onHistoryRemoval: (offset, text) => removals.push({ offset, text }),
    });
    expect(visible).toBe(`${header}\nĐoạn kể.\n`);
    expect(restoreSolaHistoryContent(visible, { visible, removals })).toBe(input);
  });

  it("stops an unfinished child before a retained sibling or HUD close", () => {
    const settings = createDefaultSettings(preset);
    const input = `${header}\nĐoạn kể.\n<sola_hud digest="Ngày 1"><wardrobe>Áo chưa đóng<date>Ngày: 1</date></sola_hud>\nĐoạn sau.`;
    const removals: SolaHistoryRemoval[] = [];
    const visible = applyRegexScripts(input, preset, settings, {
      placement: PLACEMENT_AI_OUTPUT,
      prompt: true,
      history: true,
      depth: 2,
      onHistoryRemoval: (offset, text) => removals.push({ offset, text }),
    });
    expect(visible).toBe(
      `${header}\nĐoạn kể.\n<sola_hud digest="Ngày 1"><date>Ngày: 1</date></sola_hud>\nĐoạn sau.`,
    );
    expect(restoreSolaHistoryContent(visible, { visible, removals })).toBe(input);
  });

  it("preserves prose after self-closing trackers and before a subsequent scene header", () => {
    const settings = createDefaultSettings(preset);
    const input = `Trước.<wardrobe />Sau.<sola_hud><date>Chưa đóng\n${header}\nCảnh mới.`;
    const visible = applyRegexScripts(input, preset, settings, {
      placement: PLACEMENT_AI_OUTPUT,
      prompt: true,
      history: true,
      depth: 20,
    });
    expect(visible).toBe(`Trước.Sau.${header}\nCảnh mới.`);
  });

  it("archives unclosed prop markers without consuming a following HUD", () => {
    const settings = createDefaultSettings(preset);
    const saver = preset.extensions!.regex_scripts!.find(
      (script) => script.scriptName === "Sola Saver: Immersive Props (HTML Blocks)",
    )!;
    settings.regexEnabled = { [saver.id]: true };
    const hud = '<sola_hud digest="Ngày 1"><date>Ngày: 1</date></sola_hud>';
    const input = `${header}\nĐoạn kể.\n<!-- HTML_START --><div>${"Nội dung thư. ".repeat(25)}</div>\n${hud}`;
    const removals: SolaHistoryRemoval[] = [];
    const visible = applyRegexScripts(input, preset, settings, {
      placement: PLACEMENT_AI_OUTPUT,
      prompt: true,
      history: true,
      depth: 2,
      onHistoryRemoval: (offset, text) => removals.push({ offset, text }),
    });
    expect(visible).toBe(`${header}\nĐoạn kể.\n${hud}`);
    expect(restoreSolaHistoryContent(visible, { visible, removals })).toBe(input);
  });
});
