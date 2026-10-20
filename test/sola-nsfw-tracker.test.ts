import { beforeAll, describe, expect, it } from "vitest";
import { loadPresetSources } from "../scripts/build-tomisakae-vn-rp-plugin.js";
import {
  applyPromptRegexToMessages,
  applyRegexScripts,
  composePresetPrompts,
  createDefaultSettings,
  normalizeSettings,
  PLACEMENT_AI_OUTPUT,
  type ChatMessage,
  type FfPreset,
} from "../src/core.js";
import { restoreSolaHistoryContent, type SolaHistoryRemoval } from "../src/sola-history.js";
import { estimatePluginPromptTokens } from "../src/token-estimate.js";

let sola: FfPreset;
let ff54: FfPreset;

beforeAll(async () => {
  const sources = await loadPresetSources();
  sola = sources.sola.preset;
  ff54 = sources.ff54.preset;
});

const tracker = (name: string, pattern: string) => `<nsfw_nsfl_ban_list>
Description patterns: ${pattern}
Sensory emphasis: warm skin
Pacing: tension to interruption

Action/Body dynamics:
[${name}]: shifting pressure

Dialogue patterns:
[${name}]: "Lại đây."

Moans/Vocal reactions:
[${name}]: breath catching
</nsfw_nsfl_ban_list>`;

describe("Sola NSFW Tracker", () => {
  it("is off by default, normalizes saved state, and injects only for Sola", async () => {
    expect(createDefaultSettings(sola).solaNsfwTrackerEnabled).toBe(false);
    expect(normalizeSettings(sola, { solaNsfwTrackerEnabled: true }).solaNsfwTrackerEnabled).toBe(
      true,
    );

    const settings = createDefaultSettings(sola);
    settings.solaNsfwTrackerEnabled = true;
    const composed = await composePresetPrompts(sola, settings, async (value) => value);
    const module = composed.absolute.find((message) => message.memo?.endsWith(":nsfw-tracker"));
    expect(module?.content).toContain(
      "Use the previous <nsfw_nsfl_ban_list> as an ABSOLUTE NSFW/NSFL BAN LIST",
    );
    expect(module?.content).toContain("Cách miêu tả:");
    expect(module?.content).toContain("Hành động/Động lực cơ thể:");
    expect(module?.content).toContain("Điểm nhấn cảm giác:");
    expect(module?.content).toContain("Nhịp triển khai:");
    expect(module?.content).toContain("Phản ứng với NSFL:");
    expect(module?.content).toContain(
      "[Tên nhân vật]: [Distinct movement, force, pose, and contact patterns used this turn",
    );
    expect(module?.content).toContain(
      "Record shared description, sensory, and pacing patterns once",
    );
    expect(module?.content).toContain(
      "For NSFL scenes, the next response MUST use a new bodily or behavioral response/action drive instead of the previous NSFL entry",
    );
    expect(module?.content?.match(/\[Tên nhân vật\]:/g)).toHaveLength(4);
    expect(module?.content).not.toContain("<nsfw_nsfl_ban_list>\n[Tên nhân vật]:");
    expect(module?.content).toContain("ABSOLUTE NSFW/NSFL BAN LIST");
    expect(module?.content).toContain(
      "Distinct descriptive constructions used this turn, or Không có",
    );
    expect(module?.content).toContain(
      "When no NSFW/NSFL content occurs this turn, write Không có in every field",
    );
    expect(module?.content).not.toContain("Omit the tracker when no NSFW content occurs");
    expect(module?.content).toContain("Located inside of '<sola_hud>' tags, append:");
    const storyReview = composed.absolute.find((message) =>
      message.content.includes("## Story Review"),
    );
    expect(storyReview?.content).toContain("Telemetry (<nsfw_nsfl_ban_list>)");
    expect(
      composed.absolute.find((message) => message.content.includes("## Showrunner Master HUD"))
        ?.content,
    ).toContain("<nsfw_nsfl_ban_list>");

    const showrunnerIndex = composed.absolute.findIndex((message) =>
      message.content.includes("## Showrunner Master HUD"),
    );
    const trackerIndex = composed.absolute.findIndex((message) =>
      message.memo?.endsWith(":nsfw-tracker"),
    );
    expect(trackerIndex).toBeGreaterThan(showrunnerIndex);

    const off = await composePresetPrompts(
      sola,
      createDefaultSettings(sola),
      async (value) => value,
    );
    expect(off.trailing.some((message) => message.memo?.endsWith(":nsfw-tracker"))).toBe(false);

    const other = createDefaultSettings(ff54);
    other.solaNsfwTrackerEnabled = true;
    const ff = await composePresetPrompts(ff54, other, async (value) => value);
    expect(
      [...ff.leading, ...ff.trailing].some((message) => message.content.includes("nsfw_nsfl_ban_list")),
    ).toBe(false);
  });

  it("falls back to trailing output when the Showrunner HUD is disabled", async () => {
    const settings = createDefaultSettings(sola);
    settings.solaNsfwTrackerEnabled = true;
    settings.promptEnabled["01a0c1ff-4ecf-701f-ae98-acfb7b26a41f"] = false;
    const composed = await composePresetPrompts(sola, settings, async (value) => value);
    const module = composed.trailing.find((message) => message.memo?.endsWith(":nsfw-tracker"));
    expect(module?.content).toContain("Located at the end of your response, append:");
    expect(composed.absolute.some((message) => message.memo?.endsWith(":nsfw-tracker"))).toBe(
      false,
    );
  });

  it("adds the reminder to Reminder System and both Story Reviews", async () => {
    const settings = createDefaultSettings(sola);
    settings.solaNsfwTrackerEnabled = true;
    for (const id of [
      "01a0c1ff-4ecf-7049-99ca-b8289f911924",
      "01a0c1ff-4ecf-704a-82b3-0c9b9af52526",
      "01a0c1ff-4ecf-704b-80c7-70e3c11b723f",
    ])
      settings.promptEnabled[id] = true;
    const composed = await composePresetPrompts(sola, settings, async (value) => value);
    const reminder = "BAN the previous NSFW/NSFL patterns";
    expect(composed.absolute.filter((message) => message.content.includes(reminder))).toHaveLength(
      2,
    );
    const reminderPrompt = sola.prompts.find(
      (prompt) => prompt.identifier === "01a0c1ff-4ecf-7049-99ca-b8289f911924",
    )!;
    const reminderOnly: FfPreset = {
      ...sola,
      prompt_order: [
        {
          character_id: 100001,
          order: [{ identifier: reminderPrompt.identifier, enabled: true }],
        },
      ],
      prompts: [reminderPrompt],
    };
    const reminderSettings = createDefaultSettings(reminderOnly);
    reminderSettings.solaNsfwTrackerEnabled = true;
    const reminderComposed = await composePresetPrompts(
      reminderOnly,
      reminderSettings,
      async (value) => value,
    );
    expect(reminderComposed.absolute[0]?.content).toContain(reminder);
  });

  it("keeps only the latest assistant tracker and does not age on user messages or repeated filtering", () => {
    const settings = createDefaultSettings(sola);
    settings.solaNsfwTrackerEnabled = true;
    const messages: ChatMessage[] = [
      { role: "assistant", content: `Cũ.\n${tracker("Nana", "mẫu cũ")}` },
      { role: "user", content: "Lượt trước." },
      { role: "assistant", content: `Mới.\n${tracker("Nana", "mẫu mới")}` },
      { role: "user", content: "Lượt hiện tại." },
    ];
    const first = applyPromptRegexToMessages(messages, sola, settings);
    expect(first[0]!.content).not.toContain("<nsfw_nsfl_ban_list>");
    expect(first[2]!.content).toContain("mẫu mới");
    const repeated = applyPromptRegexToMessages(
      [...messages, { role: "user", content: "OOC." }],
      sola,
      settings,
    );
    expect(repeated[2]!.content).toContain("mẫu mới");

    const afterNextResponse = applyPromptRegexToMessages(
      [...messages, { role: "assistant", content: "Lượt mới không có NSFW." }],
      sola,
      settings,
    );
    expect(afterNextResponse[2]!.content).not.toContain("<nsfw_nsfl_ban_list>");
  });

  it("archives expired tracker text for branch and swipe restoration", () => {
    const settings = createDefaultSettings(sola);
    settings.solaNsfwTrackerEnabled = true;
    const old: ChatMessage = {
      role: "assistant",
      content: `Đoạn cũ.\n${tracker("Nana", "mẫu cũ")}`,
    };
    const messages: ChatMessage[] = [
      old,
      { role: "user", content: "Tiếp." },
      { role: "assistant", content: `Đoạn mới.\n${tracker("Nana", "mẫu mới")}` },
    ];
    const removals: SolaHistoryRemoval[] = [];
    const filtered = applyPromptRegexToMessages(messages, sola, settings, {
      history: true,
      onHistoryRemoval: (message, offset, text) => {
        if (message === old) removals.push({ offset, text });
      },
    });
    expect(filtered[0]!.content).toBe("Đoạn cũ.\n");
    expect(
      restoreSolaHistoryContent(filtered[0]!.content, { visible: filtered[0]!.content, removals }),
    ).toBe(old.content);
  });

  it("renders an escaped localized HUD card and preserves English labels when requested", () => {
    const input = tracker("Nana <img src=x>", "da <script>alert(1)</script>").replace(
      "[Nana <img src=x>]: shifting pressure",
      "[Nana <img src=x>]: shifting pressure\n[Mina]: stepping back",
    );
    for (const [vietnamese, title, label] of [
      [true, "🔥 Sola: Danh sách cấm NSFW/NSFL", "Cách miêu tả"],
      [false, "🔥 Sola: NSFW/NSFL Ban List", "Description patterns"],
    ] as const) {
      const settings = createDefaultSettings(sola);
      settings.solaNsfwTrackerEnabled = true;
      settings.vietnameseOutputEnabled = vietnamese;
      const displayed = applyRegexScripts(input, sola, settings, {
        placement: PLACEMENT_AI_OUTPUT,
        markdown: true,
        depth: 0,
      });
      expect(displayed).toContain('data-sola-ui="nsfw-nsfl-tracker"');
      expect(displayed).toContain(title);
      expect(displayed).toContain(label);
      expect(displayed).toContain("&lt;img src=x&gt;");
      expect(displayed).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
      expect(displayed).not.toContain("<img src=x>");
      expect(displayed).toContain("Nana &lt;img src=x&gt;:</span> shifting pressure");
      expect(displayed).toContain("Mina:</span> stepping back");
      expect(displayed).not.toContain("[Nana");
    }
  });

  it("counts the injected module in token estimates", async () => {
    const settings = createDefaultSettings(sola);
    settings.solaNsfwTrackerEnabled = true;
    const estimate = await estimatePluginPromptTokens(sola, settings, {
      characterName: "Nana",
      userName: "TomiSakae",
    });
    expect(
      estimate.entries.find((entry) => entry.identifier === "nsfw-tracker")?.tokens,
    ).toBeGreaterThan(0);
  });
});
