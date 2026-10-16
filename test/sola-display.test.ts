import { beforeAll, describe, expect, it } from "vitest";
import { loadPresetSources } from "../scripts/build-tomisakae-vn-rp-plugin.js";
import {
  applyRegexScripts,
  composePresetPrompts,
  createDefaultSettings,
  PLACEMENT_AI_OUTPUT,
  type FfPreset,
} from "../risuai/tomisakae-vn-rp-plugin/src/core.js";
import {
  adaptSolaSceneHeaderForDisplay,
  preserveSolaCardLineBreaks,
} from "../risuai/tomisakae-vn-rp-plugin/src/sola-display.js";
import {
  adaptSolaDialogueColors,
  textContrast,
} from "../risuai/tomisakae-vn-rp-plugin/src/dialogue-colors.js";

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

  it.each(["thought_engine", "wardrobe", "scene_cast", "bond", "char_matrix"])(
    "keeps later entries in %s out of Markdown paragraph and double-line-break conversion",
    (tag) => {
      const settings = createDefaultSettings(preset);
      const body = [
        'Sola: "Cậu định làm gì?"\nEriri: "Tôi sẽ về nhà."',
        'Sola: "Cậu cảm thấy thế nào?"\nEriri: "Vẫn còn giận."',
        'Sola: "Cậu đang nghĩ gì?"\nEriri: "Tôi cần bình tĩnh."',
      ].join("\n\n");
      for (const vietnameseOutputEnabled of [true, false]) {
        settings.vietnameseOutputEnabled = vietnameseOutputEnabled;
        for (const newline of ["\n", "\r\n"]) {
          const content = body.replaceAll("\n", newline);
          const input = `<${tag}>${newline}${content}${newline}</${tag}>`;
          const displayed = applyRegexScripts(input, preset, settings, {
            placement: PLACEMENT_AI_OUTPUT,
            markdown: true,
            depth: 0,
          });
          // A literal blank line would end the host's raw HTML block and let
          // Markdown insert <p> margins and <br> + newline inside pre-wrap.
          expect(displayed).not.toMatch(/[\r\n]/);
          expect(displayed.replace(/<[^>]+>/g, "")).toContain(body.replaceAll("\n", "&#10;"));
          expect(displayed).toContain("white-space:pre-wrap;");
          expect(
            applyRegexScripts(input, preset, settings, {
              placement: PLACEMENT_AI_OUTPUT,
              prompt: true,
              depth: 0,
            }),
          ).toBe(input);
        }
      }
    },
  );

  it("preserves named thought cards, inline colors and Sola notes across multiple HUD entries", () => {
    const settings = createDefaultSettings(preset);
    const input = [
      '<sola_hud digest="Ngày 1">',
      '<thought_engine char="Eriri">\nSola: "Đi đâu?"\nEriri: <copper>"Về nhà."</copper>\n\nSola: "Vì sao?"\nEriri: "Đã muộn."\n</thought_engine>',
      '<thought_engine char="An">\nSola: "Đi đâu?"\nAn: "Ra vườn."\n\nSola: "Vì sao?"\nAn: "Tưới cây."\n</thought_engine>',
      "<wardrobe>\nEriri:\nLayers: Áo khoác xanh\nSola: *Tay áo xắn lên.*\n\nAn:\nLayers: Sơ mi trắng\nSola: *Cổ áo cài kín.*\n</wardrobe>",
      "</sola_hud>",
    ].join("\n\n");
    const displayed = applyRegexScripts(input, preset, settings, {
      placement: PLACEMENT_AI_OUTPUT,
      markdown: true,
      depth: 0,
    });
    expect(displayed).toContain("Suy nghĩ nội tâm — Eriri");
    expect(displayed).toContain("Suy nghĩ nội tâm — An");
    expect(displayed).toContain('"Về nhà."</span></font></span>&#10;&#10;');
    expect(displayed).toContain("Tay áo xắn lên.");
    expect(displayed).toContain("Cổ áo cài kín.");
    expect(displayed).not.toMatch(/<\/?(?:thought_engine|wardrobe|copper)\b/);
    const bodies = [...displayed.matchAll(/white-space:pre-wrap;[^>]*>([\s\S]*?)<\/details>/g)];
    expect(bodies).toHaveLength(3);
    for (const [, body] of bodies) expect(body).not.toMatch(/[\r\n]/);
  });

  it.each([true, false])(
    "distinguishes Thought Engine speakers without depending on the language toggle (%s)",
    (vietnameseOutputEnabled) => {
      const settings = createDefaultSettings(preset);
      settings.vietnameseOutputEnabled = vietnameseOutputEnabled;
      const body = 'Sola: "Cậu đang nghĩ gì?"\r\nNgọc-An: "Tôi cần bình tĩnh."';
      for (const opening of ["<thought_engine>", '<thought_engine char="Ngọc-An">']) {
        const input = `${opening}\r\n${body}\r\n</thought_engine>`;
        const displayed = applyRegexScripts(input, preset, settings, {
          placement: PLACEMENT_AI_OUTPUT,
          markdown: true,
          depth: 0,
        });
        expect(displayed).toMatch(
          /<span style="color:#EBC889;[^>]*><span style="font-weight:700;">Sola:<\/span> "Cậu đang nghĩ gì\?"<\/span>/,
        );
        expect(displayed).toMatch(
          /<span style="color:#B7D8CD;[^>]*><span style="font-weight:700;">Ngọc-An:<\/span> "Tôi cần bình tĩnh\."<\/span>/,
        );
        // The host's quote/emphasis elements must inherit the speaker color.
        expect(displayed).toContain("--FontColorQuote2:#EBC889;");
        expect(displayed).toContain("--FontColorBold:#B7D8CD;");
        expect(displayed).not.toMatch(/[\r\n]/);
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

  it("does not normalize captured HTML attributes, comments or authored line-break tags", () => {
    const markup = '<span title="A > B\nC" style="letter-spacing:3px;">Nội dung</span>';
    const comment = "<!-- ghi chú\nẩn -->";
    const content = `${markup}\n\n${comment}<br>Cuối.`;
    expect(preserveSolaCardLineBreaks(content)).toBe(`${markup}&#10;&#10;${comment}<br>Cuối.`);
    const settings = createDefaultSettings(preset);
    const input = `<story_notes>${content}</story_notes>`;
    const displayed = applyRegexScripts(input, preset, settings, {
      placement: PLACEMENT_AI_OUTPUT,
      markdown: true,
      depth: 0,
    });
    expect(displayed).toContain(markup);
    expect(displayed).toContain(comment);
    expect(displayed).toContain("<br>Cuối.");
    for (const script of preset.extensions?.regex_scripts ?? [])
      if (script.scriptName?.startsWith("Sola Card:")) settings.regexEnabled[script.id] = false;
    settings.vietnameseOutputEnabled = false;
    expect(
      applyRegexScripts(input, preset, settings, {
        placement: PLACEMENT_AI_OUTPUT,
        markdown: true,
        depth: 0,
      }),
    ).toBe(input);
  });

  it("uses Vietnamese sans-serif text with normal spacing throughout the character matrix", () => {
    const settings = createDefaultSettings(preset);
    const content = "<b>Đặc điểm:</b> Mạnh: khả năng dẫn dắt; yếu: dễ lộ nội tâm.".normalize("NFD");
    const input = `<char_matrix>${content}</char_matrix>`;
    for (const vietnameseOutputEnabled of [true, false]) {
      settings.vietnameseOutputEnabled = vietnameseOutputEnabled;
      const displayed = applyRegexScripts(input, preset, settings, {
        placement: PLACEMENT_AI_OUTPUT,
        markdown: true,
        depth: 0,
      });
      expect(displayed).toContain(content);
      expect(displayed).not.toContain("font-family:Georgia");
      expect(displayed).not.toContain("font-family:serif");
      expect(displayed.match(/font-family:system-ui/g)).toHaveLength(2);
      expect(displayed.match(/letter-spacing:normal/g)).toHaveLength(3);
      expect(
        applyRegexScripts(input, preset, settings, {
          placement: PLACEMENT_AI_OUTPUT,
          prompt: true,
          depth: 1,
        }),
      ).toBe(input);
    }
  });

  it.each(["heavy", "crush"])(
    "gives %s dialogue a Vietnamese font and room for accents across colors, gradients and standalone effects",
    (effect) => {
      const snapshot = JSON.stringify(preset);
      const text =
        effect === "crush"
          ? '"KHÔNG CÓ CHUYỆN ĐÓ! TUYỆT ĐỐI KHÔNG! Xé luôn cái kế hoạch ấy ra rồi ném vào lò sưởi cho tôi!"'
          : '"Ngồi yên đó. Trong tầm mắt tôi. Cậu mà há miệng nhắc lại chuyện đó thêm một từ, tôi mở cửa và vứt cậu ra giữa đường cao tốc, nghe rõ chưa."';
      for (const vietnameseOutputEnabled of [true, false]) {
        const settings = createDefaultSettings(preset);
        settings.vietnameseOutputEnabled = vietnameseOutputEnabled;
        settings.dialogueThemeEnabled = false;
        for (const content of [text, text.normalize("NFD")]) {
          for (const tag of [
            `marigold:${effect}`,
            `solstice:${effect}`,
            effect,
            `kinetic:${effect}`,
          ]) {
            const input = `<${tag}>${content}</${tag}>`;
            const displayed = applyRegexScripts(input, preset, settings, {
              placement: PLACEMENT_AI_OUTPUT,
              markdown: true,
              depth: 0,
            });
            expect(displayed).toContain(content);
            expect(displayed).toContain("font-family:system-ui");
            expect(displayed).toContain(
              "--risu-font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans',Arial,sans-serif;",
            );
            expect(displayed).toContain("'Segoe UI',Roboto,'Noto Sans',Arial,sans-serif");
            expect(displayed).toContain("line-height:1.5;");
            expect(displayed).not.toContain(`<${tag}>`);
            expect(displayed).not.toContain(`</${tag}>`);
            if (effect === "heavy") {
              expect(displayed).toContain("font-size:1.16em;");
              expect(displayed).toContain("font-weight:900;");
              expect(displayed).toContain("letter-spacing:0.5px;");
            } else {
              expect(displayed).toContain("font-weight:800;");
              expect(displayed).toContain("transform:scaleY(0.92);");
              expect(displayed).toContain("letter-spacing:-0.8px;");
              expect(displayed).toContain("opacity:0.95;");
            }
            if (tag.startsWith("marigold:")) expect(displayed).toContain("color:#F4A261;");
            if (tag.startsWith("solstice:"))
              expect(displayed).toContain("linear-gradient(135deg,#F4A261,#EE6C4D)");
            expect(
              applyRegexScripts(input, preset, settings, {
                placement: PLACEMENT_AI_OUTPUT,
                prompt: true,
                depth: 0,
              }),
            ).toBe(input);
          }
        }
      }
      expect(JSON.stringify(preset)).toBe(snapshot);
    },
  );

  it("synchronizes all six gradients with the prompt and preserves their effects in both themes", async () => {
    const snapshot = JSON.stringify(preset);
    const gradients = {
      dusk: ["#F3B74B", "#8592E6"],
      solstice: ["#F4A261", "#EE6C4D"],
      eclipse: ["#A3948A", "#7A8B99"],
      wildwood: ["#9AA87A", "#789E8A"],
      hearth: ["#E07A5F", "#C06C54"],
      mistveil: ["#B08EA2", "#98B9C7"],
    };
    for (const background of ["#282a36", "#f5f5f5", "#808080"]) {
      const settings = createDefaultSettings(preset);
      const theme = {
        type: background === "#282a36" ? ("dark" as const) : ("light" as const),
        background,
      };
      const gradientPrompts = preset.prompts.filter(
        (prompt) =>
          typeof prompt.content === "string" &&
          /Curated Gradient Duos|Signature Gradient Assignment/.test(prompt.content),
      );
      expect(gradientPrompts).toHaveLength(2);
      for (const prompt of gradientPrompts) settings.promptEnabled[prompt.identifier] = true;
      const observed = new Map<string, string>();
      await composePresetPrompts(
        preset,
        settings,
        async (content) => content,
        { dialogueTheme: theme },
        (message, prompt) => observed.set(prompt.identifier, message.content),
      );
      for (const [name, colors] of Object.entries(gradients)) {
        const pair = adaptSolaDialogueColors(colors.join(","), theme);
        for (const prompt of gradientPrompts)
          expect(observed.get(prompt.identifier)).toContain(`(${pair.replace(",", " ➔ ")})`);
        for (const color of pair.split(","))
          expect(textContrast(color, background)).toBeGreaterThanOrEqual(4.5);
        const effects = [
          "",
          "whisper",
          "tremble",
          "bite",
          "steady",
          "heavy",
          "stretch",
          "echo",
          "crush",
          "fracture",
          "tilt:6",
        ];
        const input = effects
          .map((effect) => `<${name}${effect ? `:${effect}` : ""}>"Lời thoại."</${name}>`)
          .join("\n");
        const lines = applyRegexScripts(input, preset, settings, {
          placement: PLACEMENT_AI_OUTPUT,
          markdown: true,
          depth: 0,
          dialogueTheme: theme,
        }).split("\n");
        expect(lines).toHaveLength(effects.length);
        for (const [index, effect] of effects.entries()) {
          const displayed = lines[index]!;
          expect(displayed).toContain(`linear-gradient(135deg,${pair})`);
          expect(displayed).not.toMatch(/opacity:0\./);
          expect(displayed).toContain('"Lời thoại."');
          if (effect === "stretch") expect(displayed).toContain("letter-spacing:3.5px;");
          if (effect === "tilt:6") expect(displayed).toContain("transform:rotate(6deg);");
          if (effect === "crush") expect(displayed).toContain("transform:scaleY(0.92);");
          if (effect === "fracture") expect(displayed).toContain("transform:skew(-5deg);");
        }
      }
    }
    expect(JSON.stringify(preset)).toBe(snapshot);
  });

  it("protects colored and standalone tone/kinetic text without changing effect spacing", () => {
    const settings = createDefaultSettings(preset);
    const input =
      "<copper:whisper>Khẽ.</copper><indigo:tremble>Run.</indigo>" +
      "<amber:stretch>Dài.</amber><denim:echo>Vọng.</denim><sage:crush>Nén.</sage>" +
      "<whisper>Khẽ.</whisper><tremble>Run.</tremble><stretch>Dài.</stretch>" +
      "<echo>Vọng.</echo><crush>Nén.</crush>";
    for (const type of ["light", "dark"] as const) {
      const displayed = applyRegexScripts(input, preset, settings, {
        placement: PLACEMENT_AI_OUTPUT,
        markdown: true,
        depth: 0,
        dialogueTheme: {
          type,
          background: type === "light" ? "#f5f5f5" : "#282a36",
        },
      });
      expect([...displayed.matchAll(/opacity:1;/g)]).toHaveLength(10);
      expect(displayed).toContain("letter-spacing:3.5px;");
      expect(displayed).toContain("letter-spacing:1.2px;");
      expect(displayed).toContain("transform:scaleY(0.92);");
    }
  });

  it("keeps native gradients and opacity when theme adaptation is disabled or unavailable", () => {
    const settings = createDefaultSettings(preset);
    const input =
      "<solstice:whisper>Khẽ.</solstice><dusk:echo>Vọng.</dusk>" +
      "<copper:tremble>Run.</copper><echo>Vọng.</echo>";
    const options = { placement: PLACEMENT_AI_OUTPUT, markdown: true, depth: 0 };
    const native = applyRegexScripts(input, preset, settings, options);
    expect(native).toContain("linear-gradient(135deg,#F4A261,#EE6C4D)");
    expect(native).toContain("opacity:0.85;");
    expect(native).toContain("opacity:0.65;");
    expect(native).toContain("opacity:0.55;");
    settings.dialogueThemeEnabled = false;
    expect(
      applyRegexScripts(input, preset, settings, {
        ...options,
        dialogueTheme: { type: "light", background: "#f5f5f5" },
      }),
    ).toBe(native);
  });

  it("leaves HUDs, headers and captured markup unaffected by dialogue theme adaptation", () => {
    const settings = createDefaultSettings(preset);
    const captured = '<span style="color:#F4A261;opacity:0.55;">Màu riêng.</span>';
    const input =
      '<scene_header sky="dusk" location="Phòng khách" time="18:45" />' +
      `<sola_hud digest="Ngày 1"><story_notes>${captured}</story_notes></sola_hud>`;
    const options = { placement: PLACEMENT_AI_OUTPUT, markdown: true, depth: 0 };
    const native = applyRegexScripts(input, preset, settings, options);
    expect(native).toContain(captured);
    expect(
      applyRegexScripts(input, preset, settings, {
        ...options,
        dialogueTheme: { type: "light", background: "#f5f5f5" },
      }),
    ).toBe(native);
    expect(
      applyRegexScripts("<solstice:whisper>Khẽ.</solstice>", preset, settings, {
        placement: PLACEMENT_AI_OUTPUT,
        prompt: true,
        depth: 0,
        dialogueTheme: { type: "light", background: "#f5f5f5" },
      }),
    ).toBe("<solstice:whisper>Khẽ.</solstice>");
  });
});
