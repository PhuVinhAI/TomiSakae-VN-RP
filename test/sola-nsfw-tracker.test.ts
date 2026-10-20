import { beforeAll, describe, expect, it } from "vitest";
import { loadPresetSources } from "../scripts/build-tomisakae-vn-rp-plugin.js";
import {
  applyPromptRegexToMessages,
  applyRegexScripts,
  buildRequestMessages,
  composePresetPrompts,
  createDefaultSettings,
  normalizeSettings,
  PLACEMENT_AI_OUTPUT,
  type ChatMessage,
  type FfPreset,
} from "../src/core.js";
import { restoreSolaHistoryContent, type SolaHistoryRemoval } from "../src/sola-history.js";
import { estimatePluginPromptTokens } from "../src/token-estimate.js";
import { solaNsfwPatternBanPrompt, splitSolaNsfwTracker } from "../src/sola-nsfw-tracker.js";

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
Response structure: Sound(short) → Image → Narration(long) → Dialogue(short) → Thought(short) → Narration(long) → Narration(medium) → Image → Dialogue(short)

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
      "Record ONLY patterns actually written in THIS response; ignore all earlier responses, trackers, and history",
    );
    expect(module?.content).not.toContain("ABSOLUTE");
    expect(module?.content).not.toContain("next response");
    expect(module?.content).toContain("Do not invent entries.");
    expect(module?.content).not.toContain("previous tracker");
    expect(module?.content).not.toContain("Overwrite");
    expect(module?.content).toContain("Cách miêu tả:");
    expect(module?.content).toContain("Hành động/Động lực cơ thể:");
    expect(module?.content).toContain("Điểm nhấn cảm giác:");
    expect(module?.content).toContain("Nhịp triển khai:");
    expect(module?.content).toContain("Bố cục phản hồi:");
    expect(module?.content).toContain(
      "Toàn bộ thứ tự các khối thực tế trong phản hồi hiện tại trước HUD, ghi loại và độ dài ngắn/vừa/dài; giữ riêng từng khối kể cả khi cùng loại liên tiếp",
    );
    expect(module?.content).toContain("Phản ứng thân thể / Hành động NSFL:");
    expect(module?.content).toContain(
      "[Tên nhân vật]: [Distinct NSFW movement, force, pose, and contact patterns used this turn",
    );
    expect(module?.content).toContain(
      "Record shared description, sensory, pacing, and response structure once",
    );
    expect(module?.content).toContain(
      "For NSFL scenes, record the concrete bodily reflex, defensive action, persona-true behavior, or immediate survival drive",
    );
    expect(module?.content?.match(/\[Tên nhân vật\]:/g)).toHaveLength(4);
    expect(module?.content).not.toContain("<nsfw_nsfl_ban_list>\n[Tên nhân vật]:");
    expect(module?.content).toContain("Distinct NSFW descriptive constructions used this turn");
    expect(module?.content).toContain("Record concrete NSFW patterns used this turn");
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
      [...ff.leading, ...ff.trailing].some((message) =>
        message.content.includes("nsfw_nsfl_ban_list"),
      ),
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
    const reminder =
      "Telemetry (<nsfw_nsfl_ban_list>): Record ONLY patterns actually written above in THIS response";
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
      [true, "🔥 Sola: Ghi chép NSFW/NSFL", "Cách miêu tả"],
      [false, "🔥 Sola: NSFW/NSFL Usage Record", "Description patterns"],
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
      expect(displayed).toContain(vietnamese ? "Bố cục phản hồi" : "Response structure");
      expect(displayed).toContain(
        "Sound(short) → Image → Narration(long) → Dialogue(short) → Thought(short) → Narration(long) → Narration(medium) → Image → Dialogue(short)",
      );
      expect(displayed).toContain("&lt;img src=x&gt;");
      expect(displayed).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
      expect(displayed).not.toContain("<img src=x>");
      expect(displayed).toContain("Nana &lt;img src=x&gt;:</span> shifting pressure");
      expect(displayed).toContain("Mina:</span> stepping back");
      expect(displayed).not.toContain("[Nana");
    }
  });

  it("moves the latest response's recorded items into one system ban without changing saved history", async () => {
    const settings = createDefaultSettings(sola);
    settings.solaNsfwTrackerEnabled = true;
    settings.solaSexTrackerEnabled = true;
    const messages: ChatMessage[] = [
      { role: "assistant", content: `Cũ.\n${tracker("Mina", "mẫu cũ")}` },
      { role: "user", content: "Lượt trước." },
      {
        role: "assistant",
        content: `Mới.\n<sola_hud>${tracker("Nana", "mẫu mới")}<sex_tracker>Trạng thái hiện tại</sex_tracker></sola_hud>`,
        memo: "latest-response",
      },
      { role: "user", content: "Tiếp tục." },
    ];
    const snapshot = structuredClone(messages);
    const built = await buildRequestMessages(messages, sola, settings, async (value) => value);
    const assistants = built.filter((message) => message.role === "assistant");
    expect(assistants.every((message) => !message.content.includes("<nsfw_nsfl_ban_list>"))).toBe(
      true,
    );
    expect(assistants.at(-1)?.content).toContain("<sex_tracker>Trạng thái hiện tại</sex_tracker>");
    const bans = built.filter((message) => message.memo?.endsWith(":nsfw-pattern-ban"));
    expect(bans).toHaveLength(1);
    const ban = bans[0]!;
    expect(ban.role).toBe("system");
    expect(ban.content).toContain("ABSOLUTE BAN");
    expect(ban.content).toContain("NEVER repeat, closely paraphrase, synonym-swap");
    expect(ban.content).toContain(
      "RESTRUCTURE the recorded response layout, not its individual block types: change the opening, block order, grouping, and lengths",
    );
    expect(ban.content).toContain(
      "NEVER keep the template by only swapping words or changing a few positions",
    );
    expect(ban.content).toContain("Description patterns: mẫu mới");
    expect(ban.content).toContain("Pacing: tension to interruption");
    expect(ban.content).toContain(
      "<banned_pattern>\nResponse structure: Sound(short) → Image → Narration(long) → Dialogue(short) → Thought(short) → Narration(long) → Narration(medium) → Image → Dialogue(short)\n</banned_pattern>",
    );
    expect(ban.content).toContain("Action/Body dynamics:\n[Nana]: shifting pressure");
    expect(ban.content).toContain("Dialogue patterns:\n[Nana]: &quot;Lại đây.&quot;");
    expect(ban.content).toContain("Moans/Vocal reactions:\n[Nana]: breath catching");
    expect(ban.content.match(/<banned_pattern>/g)).toHaveLength(7);
    expect(ban.content).not.toContain("mẫu cũ");
    expect(built.at(-1)).toBe(ban);
    expect(messages).toEqual(snapshot);
  });

  it("rebuilds a single ban on retry and uses only the selected latest response after a branch or swipe", async () => {
    const settings = createDefaultSettings(sola);
    settings.solaNsfwTrackerEnabled = true;
    const parse = async (value: string) => value;
    const macro = { randomInt: (minimum: number) => minimum };
    const history: ChatMessage[] = [
      { role: "assistant", content: `Cảnh.\n${tracker("Nana", "nhánh đầu")}` },
      { role: "user", content: "Tiếp." },
    ];
    const built = await buildRequestMessages(history, sola, settings, parse, macro);
    expect(await buildRequestMessages(built, sola, settings, parse, macro)).toEqual(built);
    const swipe = await buildRequestMessages(
      [
        { role: "assistant", content: `Cảnh khác.\n${tracker("Nana", "swipe được chọn")}` },
        history[1]!,
      ],
      sola,
      settings,
      parse,
      macro,
    );
    expect(swipe.at(-1)?.content).toContain("swipe được chọn");
    expect(swipe.at(-1)?.content).not.toContain("nhánh đầu");

    const continued = await buildRequestMessages(
      [
        ...built,
        { role: "assistant", content: "Phản hồi mới không có tracker." },
        { role: "user", content: "Tiếp nữa." },
      ],
      sola,
      settings,
      parse,
      macro,
    );
    expect(continued.some((message) => message.memo?.endsWith(":nsfw-pattern-ban"))).toBe(false);
    const branch = await buildRequestMessages(history.slice(0, 1), sola, settings, parse, macro);
    expect(branch.at(-1)?.content).toContain("nhánh đầu");
  });

  it("does not convert user trackers, disabled trackers, or FF5.4 history into bans", async () => {
    const messages: ChatMessage[] = [
      { role: "assistant", content: "Không có tracker." },
      { role: "user", content: tracker("Nana", "dữ liệu user") },
    ];
    const enabled = createDefaultSettings(sola);
    enabled.solaNsfwTrackerEnabled = true;
    const userOnly = await buildRequestMessages(messages, sola, enabled, async (value) => value);
    expect(userOnly.some((message) => message.memo?.endsWith(":nsfw-pattern-ban"))).toBe(false);
    for (const preset of [sola, ff54]) {
      const settings = createDefaultSettings(preset);
      settings.solaNsfwTrackerEnabled = preset === ff54;
      const request = await buildRequestMessages(
        [{ role: "assistant", content: tracker("Nana", "giữ nguyên"), memo: "host-response" }],
        preset,
        settings,
        async (value) => value,
      );
      expect(request.some((message) => message.memo?.endsWith(":nsfw-pattern-ban"))).toBe(false);
      expect(request.find((message) => message.memo === "host-response")?.content).toContain(
        "<nsfw_nsfl_ban_list>",
      );
    }
  });

  it("extracts open trackers without swallowing another tracker and wraps localized items without treating None as a pattern", () => {
    const raw =
      "<sola_hud><nsfw_nsfl_ban_list>Nhịp triển khai: chậm rồi ngắt\nPhản ứng thân thể / Hành động NSFL:\n[Nana]: Không có<sex_tracker>Giữ lại</sex_tracker></sola_hud>";
    const extracted = splitSolaNsfwTracker(raw);
    expect(extracted.content).toBe("<sola_hud><sex_tracker>Giữ lại</sex_tracker></sola_hud>");
    const ban = solaNsfwPatternBanPrompt(extracted.patterns);
    expect(ban.match(/<banned_pattern>/g)).toHaveLength(1);
    expect(ban).toContain("Nhịp triển khai: chậm rồi ngắt");
    expect(ban).not.toContain("Không có");
    expect(solaNsfwPatternBanPrompt("NSFL bodily response / action:\n[Nana]: None")).toBe("");
    expect(solaNsfwPatternBanPrompt("Description patterns: </banned_pattern>")).toContain(
      "&lt;/banned_pattern&gt;",
    );
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
