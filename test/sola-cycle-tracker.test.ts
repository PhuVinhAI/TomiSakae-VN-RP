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

let sola: FfPreset;
let ff54: FfPreset;

beforeAll(async () => {
  const sources = await loadPresetSources();
  sola = sources.sola.preset;
  ff54 = sources.ff54.preset;
});

const tracker = (character: string, cycle: string) => `<cycle_tracker>
[${character}]:
Cycle: ${cycle}
Fertility: unknown
</cycle_tracker>`;

describe("Sola Menstrual Cycle Tracker", () => {
  it("injects only for Sola and connects to HUD reminders", async () => {
    const settings = createDefaultSettings(sola);
    settings.solaCycleTrackerEnabled = true;
    const composed = await composePresetPrompts(sola, settings, async (value) => value);
    const module = composed.trailing.find((message) => message.memo?.endsWith(":cycle-tracker"));
    expect(module?.content).toContain("## Menstrual Cycle Tracker");
    expect(module?.content).toContain("Chu kỳ:");
    expect(
      [...composed.leading, ...composed.absolute, ...composed.trailing].some((message) =>
        message.content.includes(
          "Telemetry (<cycle_tracker>): Update menstrual cycle and fertility",
        ),
      ),
    ).toBe(true);
    expect(composed.absolute.some((message) => message.content.includes("<cycle_tracker>"))).toBe(
      true,
    );

    const other = createDefaultSettings(ff54);
    other.solaCycleTrackerEnabled = true;
    const ff = await composePresetPrompts(ff54, other, async (value) => value);
    expect(
      [...ff.leading, ...ff.absolute, ...ff.trailing].some((message) =>
        message.content.includes("cycle_tracker"),
      ),
    ).toBe(false);
  });

  it("adds the cycle reminder to Reminder System and both Story Reviews", async () => {
    const settings = createDefaultSettings(sola);
    settings.solaCycleTrackerEnabled = true;
    for (const id of [
      "01a0c1ff-4ecf-7049-99ca-b8289f911924",
      "01a0c1ff-4ecf-704a-82b3-0c9b9af52526",
      "01a0c1ff-4ecf-704b-80c7-70e3c11b723f",
    ])
      settings.promptEnabled[id] = true;
    const composed = await composePresetPrompts(sola, settings, async (value) => value);
    const reminder = "Update menstrual cycle and fertility for this turn";
    expect(composed.absolute.filter((message) => message.content.includes(reminder))).toHaveLength(
      2,
    );
  });

  it("expires the previous assistant tracker after one later response", () => {
    const settings = createDefaultSettings(sola);
    settings.solaCycleTrackerEnabled = true;
    const messages: ChatMessage[] = [
      { role: "assistant", content: `Cũ.\n${tracker("Nana", "Day 1")}` },
      { role: "user", content: "Tiếp." },
      { role: "assistant", content: `Mới.\n${tracker("Nana", "Day 2")}` },
      { role: "user", content: "Lượt hiện tại." },
    ];
    const filtered = applyPromptRegexToMessages(messages, sola, settings);
    expect(filtered[0]!.content).not.toContain("<cycle_tracker>");
    expect(filtered[2]!.content).toContain("Day 2");

    const next = applyPromptRegexToMessages(
      [...messages, { role: "assistant", content: "Lượt kế." }],
      sola,
      settings,
    );
    expect(next[2]!.content).not.toContain("<cycle_tracker>");
  });

  it("renders a localized escaped HUD card and counts the module", async () => {
    const settings = createDefaultSettings(sola);
    settings.solaCycleTrackerEnabled = true;
    const displayed = applyRegexScripts(tracker("Nana <img>", "Day <script>"), sola, settings, {
      placement: PLACEMENT_AI_OUTPUT,
      markdown: true,
      depth: 0,
    });
    expect(displayed).toContain('data-sola-ui="cycle-tracker"');
    expect(displayed).toContain("🌙 Sola: Chu kỳ kinh nguyệt");
    expect(displayed).toContain("&lt;img&gt;");
    const estimate = await estimatePluginPromptTokens(sola, settings, {
      characterName: "Nana",
      userName: "TomiSakae",
    });
    expect(
      estimate.entries.find((entry) => entry.identifier === "cycle-tracker")?.tokens,
    ).toBeGreaterThan(0);
  });
});
