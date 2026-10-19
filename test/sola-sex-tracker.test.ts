import { beforeAll, describe, expect, it } from "vitest";
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
Knows cycle timing: Unclear
Actual awareness: unknown
Risk attitude: unknown
Protection measure: unknown
Risk status: unknown
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
    expect(module?.content).toContain("Tình trạng cơ thể:");
    expect(module?.content).toContain("recent orgasm, lingering sensitivity or itchiness, arousal");
    expect(module?.content).toContain("Thái độ với rủi ro:");
    expect(module?.content).toContain("Biện pháp và hành động bảo vệ:");
    expect(module?.content).toContain("Protection methods or protective actions");
    expect(module?.content).toContain("Tình trạng rủi ro:");
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
    const oldContent = `<sola_hud><nsfw_ban_list>NSFW cũ</nsfw_ban_list><sex_tracker>Sex cũ</sex_tracker></sola_hud>`;
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
    expect(displayed).toContain("🌙 Sola: Bối cảnh tình dục");
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
});
