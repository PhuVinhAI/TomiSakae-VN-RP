import { beforeAll, describe, expect, it } from "vitest";
import { loadPresetSources } from "../scripts/build-tomisakae-vn-rp-plugin.js";
import {
  applyRegexScripts,
  createDefaultSettings,
  PLACEMENT_AI_OUTPUT,
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

  it("preserves incomplete trackers and follows each saver toggle and native depth", () => {
    const settings = createDefaultSettings(preset);
    const input = "Trước.<wardrobe>Áo khoác</wardrobe>Sau.<wardrobe>Chưa xong";
    const options = { placement: PLACEMENT_AI_OUTPUT, prompt: true, history: true };
    expect(applyRegexScripts(input, preset, settings, { ...options, depth: 1 })).toBe(input);
    expect(applyRegexScripts(input, preset, settings, { ...options, depth: 2 })).toBe(
      "Trước.Sau.<wardrobe>Chưa xong",
    );
    const wardrobe = preset.extensions!.regex_scripts!.find(
      (script) => script.scriptName === "Sola Saver: Wardrobe & Inventory",
    )!;
    settings.regexEnabled[wardrobe.id] = false;
    expect(applyRegexScripts(input, preset, settings, { ...options, depth: 2 })).toBe(input);
  });
});
