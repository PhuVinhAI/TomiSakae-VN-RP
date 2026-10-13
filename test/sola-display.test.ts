import { beforeAll, describe, expect, it } from "vitest";
import { loadPresetSources } from "../scripts/build-tomisakae-vn-rp-plugin.js";
import {
  applyRegexScripts,
  createDefaultSettings,
  PLACEMENT_AI_OUTPUT,
  type FfPreset,
} from "../risuai/tomisakae-vn-rp-plugin/src/core.js";
import { adaptSolaSceneHeaderForDisplay } from "../risuai/tomisakae-vn-rp-plugin/src/sola-display.js";

let preset: FfPreset;
beforeAll(async () => {
  preset = (await loadPresetSources()).sola.preset;
});

describe("Sola message UI", () => {
  it.each(["dawn", "day", "dusk", "night", "noir"])(
    "renders %s headers with wrapping layout and Vietnamese typography regardless of language toggle",
    (sky) => {
      const original = JSON.stringify(preset);
      const location = "Nguyễn Đình Chiểu · Phòng khách tầng hai".normalize("NFD");
      const input = `<scene_header sky="${sky}" location="${location}" time="18:45 CH" atmosphere="Gió nhẹ bên cửa sổ" />`;
      for (const vietnameseOutputEnabled of [true, false]) {
        const settings = createDefaultSettings(preset);
        settings.vietnameseOutputEnabled = vietnameseOutputEnabled;
        const displayed = applyRegexScripts(input, preset, settings, {
          placement: PLACEMENT_AI_OUTPUT,
          markdown: true,
          depth: 0,
        });
        expect(displayed).toContain('data-sola-ui="scene-header"');
        expect(displayed).toContain(location);
        expect(displayed).toContain("18:45 CH");
        expect(displayed).toContain("Gió nhẹ bên cửa sổ");
        expect(displayed).not.toMatch(/(?:^|[";])height:170px;/);
        expect(displayed).not.toContain("'Cinzel'");
        expect(displayed).toContain("height:auto;");
        expect(displayed).toContain("flex-wrap:wrap;");
        expect(displayed).toContain("overflow-wrap:anywhere;");
      }
      expect(JSON.stringify(preset)).toBe(original);
    },
  );

  it("keeps compact headers responsive and honors a disabled header renderer", () => {
    const settings = createDefaultSettings(preset);
    const input = '<scene_header location="Đường Nguyễn Du" time="22:10" />';
    const displayed = applyRegexScripts(adaptSolaSceneHeaderForDisplay(input), preset, settings, {
      placement: PLACEMENT_AI_OUTPUT,
      markdown: true,
      depth: 0,
    });
    expect(displayed).toContain('data-sola-ui="scene-header"');
    expect(displayed).toContain("Đường Nguyễn Du");
    for (const script of preset.extensions?.regex_scripts ?? [])
      if (script.scriptName?.startsWith("Sola Scene: Header -"))
        settings.regexEnabled[script.id] = false;
    expect(
      applyRegexScripts(input, preset, settings, {
        placement: PLACEMENT_AI_OUTPUT,
        markdown: true,
        depth: 0,
      }),
    ).toBe(input);
  });

  it("shows the time rather than weather in the compact rain header's time badge", () => {
    const settings = createDefaultSettings(preset);
    const input = '<scene_header location="Đường Nguyễn Du" atmosphere="Rain" time="22:10" />';
    const displayed = applyRegexScripts(input, preset, settings, {
      placement: PLACEMENT_AI_OUTPUT,
      markdown: true,
      depth: 0,
    });
    expect(displayed).toContain('data-sola-ui="scene-header"');
    expect(displayed).toContain("Đường Nguyễn Du");
    expect(displayed).toContain(">22:10</span>");
    expect(displayed).not.toContain(">Rain</span>");
  });

  it("changes widget typography without touching captured RP markup or request content", () => {
    const settings = createDefaultSettings(preset);
    const captured =
      '<span style="font-family:serif;letter-spacing:3px;">Chữ trong tài liệu</span>';
    const input = `<sola_hud digest="Ngày 1 · Đều nhịp"><story_notes>${captured}</story_notes></sola_hud>`;
    const displayed = applyRegexScripts(input, preset, settings, {
      placement: PLACEMENT_AI_OUTPUT,
      markdown: true,
      depth: 0,
    });
    expect(displayed).toContain("font-family:system-ui");
    expect(displayed).toContain("font-family:Georgia,'Noto Serif'");
    expect(displayed).toContain(captured);
    expect(displayed).not.toContain("font-family:inherit;");
    expect(
      applyRegexScripts(input, preset, settings, {
        placement: PLACEMENT_AI_OUTPUT,
        prompt: true,
        depth: 0,
      }),
    ).toBe(input);
  });
});
