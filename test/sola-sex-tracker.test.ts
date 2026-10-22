import { beforeAll, describe, expect, it, vi } from "vitest";
import { loadPresetSources } from "../scripts/build-tomisakae-vn-rp-plugin.js";
import {
  applyPromptRegexToMessages,
  applyRegexScripts,
  composePresetPrompts,
  createDefaultSettings,
  PLACEMENT_AI_OUTPUT,
  type ChatMessage,
  type FfPreset,
} from "../src/core.js";
import { estimatePluginPromptTokens } from "../src/token-estimate.js";
import { restoreSolaHistoryContent } from "../src/sola-history.js";
import { resolveSolaPregnancy, solaSexTrackerPrompt } from "../src/sola-sex-tracker.js";

let sola: FfPreset;
let ff54: FfPreset;

beforeAll(async () => {
  const sources = await loadPresetSources();
  sola = sources.sola.preset;
  ff54 = sources.ff54.preset;
});

const tracker = (character: string, cycle: string) => `<sex_tracker>
[${character}]:
Menstrual cycle: ${cycle}
Physical condition: unknown
Pregnancy likelihood: unknown
Real-world awareness and choice: Considers personal/social consequences
Protection measure: unknown
</sex_tracker>`;

describe("Sola Sexual Context Tracker", () => {
  it("injects only for Sola and connects to HUD reminders", async () => {
    const settings = createDefaultSettings(sola);
    settings.solaNsfwTrackerEnabled = true;
    settings.solaSexTrackerEnabled = true;
    const composed = await composePresetPrompts(sola, settings, async (value) => value);
    const module = composed.absolute.find((message) => message.memo?.endsWith(":sex-tracker"));
    expect(module?.content).toContain("## Sexual Context Tracker");
    expect(module?.content).toContain("Chu kỳ kinh nguyệt:");
    expect(module?.content).toContain("Nhận biết chu kỳ:");
    expect(module?.content).toContain("Nhận biết chu kỳ");
    expect(module?.content).toContain("Tình trạng cơ thể:");
    expect(module?.content).toContain(
      "vừa đạt cực khoái, còn nhạy cảm hoặc ngứa ran, đang hưng phấn",
    );
    expect(module?.content).toContain("Nhận thức thực tế và lựa chọn:");
    expect(module?.content).toContain("Biện pháp và hành động bảo vệ:");
    expect(module?.content).toContain(
      "Bao cao su, biện pháp tránh thai, thuốc tránh thai khẩn cấp, xuất ngoài",
    );
    expect(module?.content).toContain("simulate the objective cycle separately");
    expect(module?.content).toContain("record {{char}}'s awareness, applicable consequences");
    expect(module?.content).toContain("fill gaps plausibly and consistently");
    expect(module?.content).toContain("Khả năng và trạng thái mang thai:");
    expect(module?.content).toContain("Giai đoạn thai kỳ:");
    expect(module?.content).toContain('<pregnancy chance="00.00%" status="" />');
    expect(module?.content).toContain("infer the current conception chance");
    expect(module?.content).toContain("infer the current conception chance independently");
    expect(module?.content).toContain("NEVER copy or substitute the Sola roll as the percentage");
    expect(module?.content).toContain(
      "Use 0.00% to 100.00% with two decimal places and the % sign",
    );
    expect(module?.content).toContain("after its biological window ends");
    expect(module?.content).toContain(
      'replacing previous results with "00.00%|MISS" or "00.00%|CONCEIVED"',
    );
    expect(module?.content).toContain("unless status already records CONCEIVED");
    expect(module?.content).toContain("NEVER generate that result yourself");
    expect(module?.content).not.toContain("cycle-timing knowledge");
    expect(module?.content).not.toContain("Tình trạng rủi ro:");
    expect(
      [...composed.leading, ...composed.absolute, ...composed.trailing].some((message) =>
        message.content.includes(
          "Telemetry (<sex_tracker>): Run the sexual-context Cognitive Check",
        ),
      ),
    ).toBe(true);
    expect(composed.absolute.some((message) => message.content.includes("<sex_tracker>"))).toBe(
      true,
    );
    const showrunnerIndex = composed.absolute.findIndex((message) =>
      message.content.includes("## Showrunner Master HUD"),
    );
    const nsfwIndex = composed.absolute.findIndex((message) =>
      message.memo?.endsWith(":nsfw-tracker"),
    );
    const sexIndex = composed.absolute.findIndex((message) =>
      message.memo?.endsWith(":sex-tracker"),
    );
    expect(showrunnerIndex).toBeGreaterThanOrEqual(0);
    expect(nsfwIndex).toBeGreaterThan(showrunnerIndex);
    expect(sexIndex).toBeGreaterThan(nsfwIndex);

    const other = createDefaultSettings(ff54);
    other.solaSexTrackerEnabled = true;
    const ff = await composePresetPrompts(ff54, other, async (value) => value);
    expect(
      [...ff.leading, ...ff.absolute, ...ff.trailing].some((message) =>
        message.content.includes("sex_tracker"),
      ),
    ).toBe(false);
  });

  it.each([
    {
      vietnamese: true,
      field: "Nhận thức thực tế và lựa chọn",
      value: "Điều nhân vật hiểu về hệ quả cá nhân/xã hội và lựa chọn hiện tại",
    },
    {
      vietnamese: false,
      field: "Real-world awareness and choice",
      value:
        "What the character understands about personal/social consequences and their current choice",
    },
  ])(
    "connects $field to real-world awareness without stage or discussion bookkeeping",
    ({ vietnamese, field, value }) => {
      const prompt = solaSexTrackerPrompt(vietnamese, "at the end of your response");
      const body = prompt.match(/<sex_tracker>\n([\s\S]*?)\n<\/sex_tracker>/)?.[1];
      expect(body?.split("\n")).toHaveLength(8);
      expect(prompt).toContain(`${field}: [${value}]`);
      expect(prompt).not.toContain(
        "NPCs MUST NOT default to preferring or readily accepting risky sex",
      );
      expect(prompt).not.toContain(
        "LOVE, trust, intimacy, arousal, and relationship depth NEVER override reproductive, health, consent, or social consequences",
      );
      expect(prompt).not.toContain(
        "When the current act creates risk, the character MUST recognize it and make a concrete protective, negotiating, refusing, stopping, switching, mitigating, consciously risk-accepting, or otherwise fitting choice IN THE SCENE",
      );
      expect(prompt).not.toContain(
        "NEVER turn prior sex, arousal, or orgasm into lustful traits, lost boundaries, or disregard for consequences",
      );
      expect(prompt).not.toContain(
        "REAL-WORLD awareness of reproduction, health, responsibility, and social consequences MUST govern EVERY reaction, dialogue, and action, even when absent from card/lore",
      );
      expect(prompt).not.toContain(
        "NEVER treat {{user}}'s silence, lack of action, hesitation, or non-resistance as consent or acceptance of risky sex",
      );
      expect(prompt).toContain("record {{char}}'s awareness, applicable consequences");
      expect(prompt).toContain("concrete choice IN THE SCENE");
      expect(prompt).toContain(
        "Limit knowledge ONLY by concrete evidence of missing knowledge or impaired cognition",
      );
      expect(prompt).toContain("NEVER invent ignorance to bypass consequences");
      expect(prompt).toContain('After a MISS, return status="" EACH turn');
      expect(prompt).toContain(
        'Clear status to "" and set chance to "0.00%" ONLY after effective prevention before conception',
      );
      expect(prompt).toContain("a clear physical/situational event ends the pregnancy");
      expect(prompt).toContain("otherwise maintain its progression");
      expect(prompt).toContain(
        vietnamese ? "tam cá nguyệt một/hai/ba" : "first/second/third trimester",
      );
      expect(prompt).toContain(vietnamese ? "sinh con, hậu sản" : "childbirth, postpartum");
      expect(prompt).toContain("PRESERVE the exact sampled code");
      expect(prompt).toContain("with elapsed RP time");
      expect(prompt).toContain("NEVER write prose in status");
      expect(prompt).not.toContain("TRIMESTER_1");
      expect(prompt).not.toMatch(
        /Giai đoạn và trao đổi|Stage and discussion|Chưa nói|Đã nói|Not discussed|Discussed reproduction|active stage|MUST discuss/,
      );
    },
  );

  it("falls back to trailing output when the Showrunner HUD is disabled", async () => {
    const settings = createDefaultSettings(sola);
    settings.solaSexTrackerEnabled = true;
    settings.promptEnabled["01a0c1ff-4ecf-701f-ae98-acfb7b26a41f"] = false;
    const composed = await composePresetPrompts(sola, settings, async (value) => value);
    const module = composed.trailing.find((message) => message.memo?.endsWith(":sex-tracker"));
    expect(module?.content).toContain("Located at the end of your response, append:");
    expect(composed.absolute.some((message) => message.memo?.endsWith(":sex-tracker"))).toBe(false);
  });

  it("adds the sexual-context reminder to Reminder System and both Story Reviews", async () => {
    const settings = createDefaultSettings(sola);
    settings.solaSexTrackerEnabled = true;
    for (const id of [
      "01a0c1ff-4ecf-7049-99ca-b8289f911924",
      "01a0c1ff-4ecf-704a-82b3-0c9b9af52526",
      "01a0c1ff-4ecf-704b-80c7-70e3c11b723f",
    ])
      settings.promptEnabled[id] = true;
    const composed = await composePresetPrompts(sola, settings, async (value) => value);
    const reminder = "Run the sexual-context Cognitive Check before writing";
    expect(composed.absolute.filter((message) => message.content.includes(reminder))).toHaveLength(
      2,
    );
  });

  it("does not add a sex check to Character Matrix", async () => {
    const settings = createDefaultSettings(sola);
    settings.solaSexTrackerEnabled = true;
    settings.vietnameseOutputEnabled = true;
    const enabled = await composePresetPrompts(sola, settings, async (value) => value);
    const enabledText = [...enabled.leading, ...enabled.absolute, ...enabled.trailing]
      .map((message) => message.content)
      .join("\n");
    expect(enabledText).not.toContain("Kiểm tra tình dục:");
    expect(enabledText).not.toContain("Sex Check:");

    settings.solaSexTrackerEnabled = false;
    const sexOff = await composePresetPrompts(sola, settings, async (value) => value);
    expect(
      [...sexOff.leading, ...sexOff.absolute, ...sexOff.trailing]
        .map((message) => message.content)
        .join("\n"),
    ).not.toContain("Kiểm tra tình dục:");
  });

  it("expires the previous assistant tracker after one later response", () => {
    const settings = createDefaultSettings(sola);
    settings.solaSexTrackerEnabled = true;
    const messages: ChatMessage[] = [
      { role: "assistant", content: `Cũ.\n${tracker("Nana", "Day 1")}` },
      { role: "user", content: "Tiếp." },
      { role: "assistant", content: `Mới.\n${tracker("Nana", "Day 2")}` },
      { role: "user", content: "Lượt hiện tại." },
    ];
    const filtered = applyPromptRegexToMessages(messages, sola, settings);
    expect(filtered[0]!.content).not.toContain("<sex_tracker>");
    expect(filtered[2]!.content).toContain("Day 2");

    const next = applyPromptRegexToMessages(
      [...messages, { role: "assistant", content: "Lượt kế." }],
      sola,
      settings,
    );
    expect(next[2]!.content).not.toContain("<sex_tracker>");
  });

  it("archives and restores both nested HUD trackers as one history snapshot", () => {
    const settings = createDefaultSettings(sola);
    settings.solaNsfwTrackerEnabled = true;
    settings.solaSexTrackerEnabled = true;
    const oldContent = `<sola_hud><nsfw_nsfl_tracker>NSFW cũ</nsfw_nsfl_tracker><sex_tracker>Sex cũ</sex_tracker></sola_hud>`;
    const messages: ChatMessage[] = [
      { role: "assistant", content: `Cũ.\n${oldContent}` },
      { role: "user", content: "Tiếp." },
      { role: "assistant", content: "Mới." },
    ];
    const removals: Array<{ offset: number; text: string }> = [];
    const filtered = applyPromptRegexToMessages(messages, sola, settings, {
      history: true,
      onHistoryRemoval: (_message, offset, text) => removals.push({ offset, text }),
    });
    expect(filtered[0]!.content).toBe("Cũ.\n<sola_hud></sola_hud>");
    expect(removals).toHaveLength(2);
    expect(
      restoreSolaHistoryContent(filtered[0]!.content, {
        visible: filtered[0]!.content,
        removals,
      }),
    ).toBe(`Cũ.\n${oldContent}`);
  });

  it("renders a localized escaped HUD card and counts the module", async () => {
    const settings = createDefaultSettings(sola);
    settings.solaSexTrackerEnabled = true;
    const displayed = applyRegexScripts(tracker("Nana <img>", "Day <script>"), sola, settings, {
      placement: PLACEMENT_AI_OUTPUT,
      markdown: true,
      depth: 0,
    });
    expect(displayed).toContain('data-sola-ui="sex-tracker"');
    expect(displayed).toContain("🌙 Sola: Theo dõi sinh sản");
    expect(displayed).toContain(
      "Nhận thức thực tế và lựa chọn:</span> Considers personal/social consequences",
    );
    expect(displayed).toContain("Tình trạng cơ thể:</span> unknown");
    expect(displayed).toContain("&lt;img&gt;");
    const estimate = await estimatePluginPromptTokens(sola, settings, {
      characterName: "Nana",
      userName: "TomiSakae",
    });
    expect(
      estimate.entries.find((entry) => entry.identifier === "sex-tracker")?.tokens,
    ).toBeGreaterThan(0);
  });

  it("renders real-world awareness with the same HUD styling in English", () => {
    const settings = createDefaultSettings(sola);
    settings.solaSexTrackerEnabled = true;
    settings.vietnameseOutputEnabled = false;
    const displayed = applyRegexScripts(
      `<sex_tracker>\n[Nana]:\nNhận thức thực tế và lựa chọn: Hiểu hệ quả; chọn biện pháp bảo vệ\n</sex_tracker>`,
      sola,
      settings,
      { placement: PLACEMENT_AI_OUTPUT, markdown: true, depth: 0 },
    );
    expect(displayed).toContain(
      "Real-world awareness and choice:</span> Hiểu hệ quả; chọn biện pháp bảo vệ",
    );
    expect(displayed).toContain("🌙 Sola: Reproductive Context");
  });

  it.each([true, false])(
    "displays pregnancy values safely without exposing markup (%s)",
    (vietnamese) => {
      const settings = createDefaultSettings(sola);
      settings.solaSexTrackerEnabled = true;
      settings.vietnameseOutputEnabled = vietnamese;
      const displayed = applyRegexScripts(
        '<sex_tracker>\n[Nana]:\nPregnancy likelihood/status: <pregnancy chance="25.00%" status="" />\n[Mina]:\nPregnancy likelihood/status: <pregnancy chance="18.50%" status="12.34%|CONCEIVED" />\nPregnancy stage: Tuần 14 <script>\n[Lina]:\nPregnancy likelihood/status: <pregnancy chance="10.00%" status="45.34%|MISS" />\n</sex_tracker>',
        sola,
        settings,
        { placement: PLACEMENT_AI_OUTPUT, markdown: true, depth: 0 },
      );
      expect(displayed).toContain(
        `${vietnamese ? "Xác suất" : "Chance"}: 25.00% · ${vietnamese ? "Chưa có kết quả" : "No result"}`,
      );
      expect(displayed).toContain(
        `18.50% · Roll: 12.34% - ${vietnamese ? "Đã thụ thai" : "Conceived"}`,
      );
      expect(displayed).toContain(
        `10.00% · Roll: 45.34% - ${vietnamese ? "Chưa thụ thai" : "No conception"}`,
      );
      expect(displayed).not.toContain("|CONCEIVED");
      expect(displayed).not.toContain("|MISS");
      expect(displayed).toContain(
        `${vietnamese ? "Giai đoạn thai kỳ" : "Pregnancy stage"}:</span> Tuần 14 &lt;script&gt;`,
      );
      expect(displayed).not.toContain("&lt;pregnancy");
      expect(displayed).not.toContain("<pregnancy");
    },
  );
});

describe("silent pregnancy resolution", () => {
  const pregnancy = (chance: string, status = "") =>
    `<pregnancy chance="${chance}" status="${status}" />`;
  const record = (body: string) => `<sex_tracker>\n${body}\n</sex_tracker>`;

  it("samples each pending character independently, preserving their own probability", () => {
    const random = vi.fn().mockReturnValueOnce(0.1).mockReturnValueOnce(0.75);
    const input = record(`[Nana]:\n${pregnancy("25.00%")}\n[Mina]:\n${pregnancy("70.00%")}`);
    const output = resolveSolaPregnancy(input, random);
    expect(output).toContain(`[Nana]:\n${pregnancy("25.00%", "10.00%|CONCEIVED")}`);
    expect(output).toContain(`[Mina]:\n${pregnancy("70.00%", "75.00%|MISS")}`);
    expect(random).toHaveBeenCalledTimes(2);
  });

  it("tries again after a miss and preserves success and pregnancy progression", () => {
    const random = vi.fn().mockReturnValueOnce(0.8).mockReturnValueOnce(0.1);
    const input = record(pregnancy("50.00%"));
    const miss = resolveSolaPregnancy(input, random);
    expect(miss).toBe(record(pregnancy("50.00%", "80.00%|MISS")));
    const success = resolveSolaPregnancy(miss, random);
    expect(success).toBe(record(pregnancy("50.00%", "10.00%|CONCEIVED")));
    expect(resolveSolaPregnancy(success, random)).toBe(success);
    const progressed = record(
      `${pregnancy("50.00%", "10.00%|CONCEIVED")}\nPregnancy stage: Second trimester, week 16`,
    );
    expect(resolveSolaPregnancy(progressed, random)).toBe(progressed);
    expect(random).toHaveBeenCalledTimes(2);
  });

  it("rerolls non-positive statuses instead of letting copied or invented text block resolution", () => {
    const random = vi.fn(() => 0.75);
    const statuses = [" ", "80.00%|MISS", "MISS", "75.00%", "Chưa thụ thai", "NOT_CONCEIVED"];
    const input = record(statuses.map((status) => pregnancy("50.00%", status)).join("\n"));
    expect(resolveSolaPregnancy(input, random)).toBe(
      record(statuses.map(() => pregnancy("50.00%", "75.00%|MISS")).join("\n")),
    );
    expect(random).toHaveBeenCalledTimes(statuses.length);
  });

  it("ignores zero, out of range, malformed percentages and markup outside the tracker", () => {
    const random = vi.fn(() => 0);
    const outside = pregnancy("100.00%");
    const input = `${outside}\n${record(
      [
        pregnancy("0.00%"),
        pregnancy("100.01%"),
        pregnancy("101.00%"),
        pregnancy("25%"),
        pregnancy("25.0%"),
        pregnancy("25.00"),
        pregnancy("-1.00%"),
        pregnancy("NaN%"),
        pregnancy("0.00%", "postpartum"),
      ].join("\n"),
    )}`;
    expect(resolveSolaPregnancy(input, random)).toBe(input);
    expect(random).not.toHaveBeenCalled();
  });

  it("uses the percentage boundary consistently, including 100% and low probabilities", () => {
    const random = vi
      .fn()
      .mockReturnValueOnce(0.25)
      .mockReturnValueOnce(0.999999)
      .mockReturnValueOnce(0.000099)
      .mockReturnValueOnce(0.0001);
    const input = record(
      ["25.00%", "100.00%", "0.01%", "0.01%"].map((value) => pregnancy(value)).join("\n"),
    );
    const output = resolveSolaPregnancy(input, random);
    expect(output).toBe(
      record(
        [
          pregnancy("25.00%", "25.00%|MISS"),
          pregnancy("100.00%", "99.99%|CONCEIVED"),
          pregnancy("0.01%", "0.00%|CONCEIVED"),
          pregnancy("0.01%", "0.01%|MISS"),
        ].join("\n"),
      ),
    );
    expect(random).toHaveBeenCalledTimes(4);
  });
});
