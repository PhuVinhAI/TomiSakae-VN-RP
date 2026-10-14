import { beforeAll, describe, expect, it } from "vitest";
import { loadPresetSources } from "../scripts/build-tomisakae-vn-rp-plugin.js";
import {
  applyRegexScripts,
  buildRequestMessages,
  createDefaultSettings,
  normalizeSettings,
  PLACEMENT_AI_OUTPUT,
  type FfPreset,
} from "../risuai/tomisakae-vn-rp-plugin/src/core.js";
import { familyRegexGroups } from "../risuai/tomisakae-vn-rp-plugin/src/family-ui.js";
import { regexUiCopy } from "../risuai/tomisakae-vn-rp-plugin/src/ui-vi.js";
import { VOYAGE_FF54_JAILBREAK_ID } from "../risuai/tomisakae-vn-rp-plugin/src/preset-family.js";
import {
  splitVoyageReasoning,
  VOYAGE_GM_START_RULE,
  VOYAGE_REASONING_DELETE_ID,
  VOYAGE_REASONING_DISPLAY_ID,
  VOYAGE_REASONING_SCRIPTS,
} from "../risuai/tomisakae-vn-rp-plugin/src/voyage-reasoning.js";

let preset: FfPreset;
beforeAll(async () => {
  preset = (await loadPresetSources()).voyage.preset;
});

describe("Voyage reasoning and defaults", () => {
  const marker = "<!-- GM -->";
  const sheets = "<!--\n* Tên: An\n* Ghi chú: Giữ <think>trong ví dụ</think>.\n-->";
  const response = `${marker}\nAn mở cửa.\n${sheets}`;
  const clean = (input: string) =>
    applyRegexScripts(input, preset, createDefaultSettings(preset), {
      placement: PLACEMENT_AI_OUTPUT,
      prompt: true,
      history: true,
      depth: 0,
    });

  it("uses only bạn for the PC in Vietnamese second-person narration", async () => {
    const settings = createDefaultSettings(preset);
    settings.promptEnabled["2c0a0577-b4c5-4a82-b6ad-6c524a1e7678"] = true;
    settings.promptEnabled["2e8f70a4-f5b6-455b-9f62-e9a3d50665b6"] = false;
    const built = await buildRequestMessages(
      [{ role: "user", content: "Tiếp đi." }],
      preset,
      settings,
      async (text) => text,
    );
    const pov = built.find((m) => m.content.includes("## Rule: PoV Second Person"))!.content;
    expect(pov.trim()).toBe('## Rule: PoV Second Person\nAddress PC as "bạn/của bạn".');
  });

  it("disables adult modules by default while retaining saved choices", () => {
    const ids = [
      VOYAGE_FF54_JAILBREAK_ID,
      "216aa279-7af9-401b-8d51-fea7cc725a43",
      "ee7a5f53-672d-4b32-a607-c976db5f32eb",
    ];
    const defaults = createDefaultSettings(preset);
    for (const id of ids) expect(defaults.promptEnabled[id]).toBe(false);
    const saved = normalizeSettings(preset, {
      promptEnabled: Object.fromEntries(ids.map((id) => [id, true])),
    });
    for (const id of ids) expect(saved.promptEnabled[id]).toBe(true);
  });

  it.each([true, false])("sends one GM boundary rule with Vietnamese Output %s", async (vn) => {
    const settings = createDefaultSettings(preset);
    settings.vietnameseOutputEnabled = vn;
    for (const recall of [true, false]) {
      settings.promptEnabled["713e9dd1-366f-4f2a-9e4b-5e28b6ee63a5"] = recall;
      const built = await buildRequestMessages(
        [{ role: "user", content: "Tiếp đi." }],
        preset,
        settings,
        async (text) => text,
      );
      const withRule = built.filter((m) => m.content.includes(VOYAGE_GM_START_RULE));
      expect(withRule).toHaveLength(1);
      expect(withRule[0]!.memo).toBe(
        `vn-rp:voyage:${recall ? "713e9dd1-366f-4f2a-9e4b-5e28b6ee63a5" : "48727501-cb02-4bb4-8be7-17d47d48e05c"}`,
      );
      expect(
        built.find((m) => m.content.includes("## Rule: Chain of Thought"))?.content,
      ).not.toContain("<!-- GM -->");
    }
  });

  it.each(["think", "Thoughts", "thinking", "reasoning", "internal_monologue"])(
    "cleans %s with and without a GM boundary while retaining sheets",
    (tag) => {
      for (const body of [response, `An mở cửa.\n${sheets}`]) {
        const input = `<${tag}>Lập kế hoạch.</${tag}>\n${body}`;
        expect(clean(input).trimStart()).toBe(body);
        const split = splitVoyageReasoning(input);
        expect(split.response).toBe(body);
        expect(split.prefix + split.response).toBe(input);
      }
    },
  );

  it("collapses long untagged planning and safely displays tags inside reasoning", () => {
    const planning = `Rà soát NPC <npc>. ${"Kế hoạch. ".repeat(5000)}`;
    const input = `${planning}\n${response}`;
    expect(clean(input)).toBe(response);
    const displayed = applyRegexScripts(input, preset, createDefaultSettings(preset), {
      placement: PLACEMENT_AI_OUTPUT,
      markdown: true,
      depth: 0,
    });
    expect(displayed).toContain("💭 Suy luận");
    expect(displayed).toContain("&lt;npc&gt;");
    expect(displayed).toContain(response);
    expect(splitVoyageReasoning(input).response).toBe(response);
  });

  it("handles consecutive and Markdown reasoning without consuming comments", () => {
    const input = `<think>Plan.</think>\n<Thoughts>Check.</Thoughts>\n### Reasoning\nAudit.\n### Response\n${response}`;
    expect(clean(input).trim()).toBe(response);
    expect(splitVoyageReasoning(input).response).toBe(response);
    for (const input of [response, `\n${response}`, sheets, "An mở cửa."])
      expect(clean(input)).toBe(input);
  });

  it("exposes independent Vietnamese display/delete controls", () => {
    const settings = createDefaultSettings(preset);
    settings.vietnameseOutputEnabled = false;
    settings.regexEnabled[VOYAGE_REASONING_DELETE_ID] = false;
    const input = `<think>Plan.</think>\n${response}`;
    expect(
      applyRegexScripts(input, preset, settings, {
        placement: PLACEMENT_AI_OUTPUT,
        prompt: true,
        history: true,
      }),
    ).toBe(input);
    expect(
      applyRegexScripts(input, preset, settings, {
        placement: PLACEMENT_AI_OUTPUT,
        markdown: true,
      }),
    ).toContain("💭 Reasoning");
    settings.regexEnabled[VOYAGE_REASONING_DISPLAY_ID] = false;
    expect(
      applyRegexScripts(input, preset, settings, {
        placement: PLACEMENT_AI_OUTPUT,
        markdown: true,
      }),
    ).toBe(input);
    expect(familyRegexGroups(preset)).toContainEqual({
      label: "Suy luận",
      ids: VOYAGE_REASONING_SCRIPTS.map((script) => script.id),
    });
    for (const script of VOYAGE_REASONING_SCRIPTS)
      expect(regexUiCopy(script).description).not.toBe("Quy tắc kỹ thuật của preset gốc");
  });
});
