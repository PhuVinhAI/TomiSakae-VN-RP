const TRACKER_RE =
  /<\s{0,8}sex_tracker\b(?:"[^"]*"|'[^']*'|[^'">])*(?:\/\s*>|>[\s\S]*?(?:<\s{0,8}\/\s{0,8}sex_tracker\s{0,8}>|(?=<\s{0,8}\/?\s{0,8}(?:sola_hud|scene_header|fengine|thought_engine|wardrobe|inventory|scene_cast|scene_state|bond|date|story_notes|solatag|char_matrix|tempo|cabinet|arrow|omen|nsfw_nsfl_tracker)\b|<!--\s{0,8}HTML_(?:START|END)\s{0,8}-->)|$))/gi;

export const SOLA_SEX_TRACKER_MEMO = "sex-tracker";

export const SOLA_SEX_TRACKER_REMINDER =
  "- Telemetry (<sex_tracker>): Run the sexual-context Cognitive Check before writing; simulate cycle state, record cycle knowledge, physical condition, pregnancy likelihood/status, real-world awareness and choice, and protection measures/actions.";

export function solaSexTrackerPrompt(vietnamese: boolean, location: string): string {
  const labels = vietnamese
    ? {
        character: "Tên nhân vật",
        cycle: "Chu kỳ kinh nguyệt",
        cycleKnowledge: "Nhận biết chu kỳ",
        physicalCondition: "Tình trạng cơ thể",
        pregnancy: "Khả năng và trạng thái mang thai",
        stage: "Giai đoạn thai kỳ",
        awareness: "Nhận thức thực tế và lựa chọn",
        protection: "Biện pháp và hành động bảo vệ",
      }
    : {
        character: "Character Name",
        cycle: "Menstrual cycle",
        cycleKnowledge: "Cycle knowledge",
        physicalCondition: "Physical condition",
        pregnancy: "Pregnancy likelihood/status",
        stage: "Pregnancy stage",
        awareness: "Real-world awareness and choice",
        protection: "Protection measures/actions",
      };
  const examples = vietnamese
    ? {
        cycle:
          "Kinh nguyệt, trước rụng trứng, rụng trứng, sau rụng trứng hoặc giai đoạn/mốc sinh học hợp lý khác được mô phỏng từ dữ liệu hiện có",
        cycleKnowledge: "Biết, Không biết, Chưa rõ hoặc trạng thái nhận biết phù hợp khác",
        physical:
          "Còn trinh/từng quan hệ, tiền sử sinh nở, tổn thương, vừa đạt cực khoái, còn nhạy cảm hoặc ngứa ran, đang hưng phấn, tình trạng hồi phục hoặc tình trạng liên quan khác",
        stage:
          "Chưa thụ thai, đã thụ thai, thai kỳ đầu, tam cá nguyệt một/hai/ba, chuyển dạ, sinh con, hậu sản hoặc trạng thái phù hợp khác",
        awareness: "Điều nhân vật hiểu về hệ quả cá nhân/xã hội và lựa chọn hiện tại",
        protection:
          "Bao cao su, biện pháp tránh thai, thuốc tránh thai khẩn cấp, xuất ngoài, yêu cầu xuất ngoài, chuyển sang đường miệng/tay/đường khác, dừng hoặc từ chối, chấp nhận rủi ro hoặc hành động bảo vệ khác",
      }
    : {
        cycle:
          "Menstruation, pre-ovulation, ovulation, post-ovulation, or another plausible biological phase/timing simulated from available data",
        cycleKnowledge: "Known, Unknown, Unclear, or another fitting awareness state",
        physical:
          "Virginity/prior intercourse, childbirth history, injuries, recent orgasm, lingering sensitivity or itchiness, arousal, recovery status, or another relevant condition",
        stage:
          "Not conceived, conceived, early pregnancy, first/second/third trimester, labor, childbirth, postpartum, or another fitting state",
        awareness:
          "What the character understands about personal/social consequences and their current choice",
        protection:
          "Condom, contraception, emergency contraception, withdrawal, requesting external ejaculation, switching to oral/manual/another route, stopping or refusing, accepting risk, or another protective action",
      };
  const cycleKnowledgeValues = vietnamese
    ? "Biết, Không biết, Chưa rõ hoặc trạng thái nhận biết phù hợp khác"
    : "Known, Unknown, Unclear, or another fitting awareness state";
  return `## Sexual Context Tracker 🌙
In EVERY response, you MUST append ${location || "at the end of your response"}:
<sex_tracker>
[${labels.character}]:
${labels.cycle}: [${examples.cycle}]
${labels.cycleKnowledge}: [${examples.cycleKnowledge}]
${labels.physicalCondition}: [${examples.physical}]
${labels.pregnancy}: <pregnancy chance="00.00%" status="" />
${labels.stage}: [${examples.stage}]
${labels.awareness}: [${examples.awareness}]
${labels.protection}: [${examples.protection}]
</sex_tracker>

Rules:
- Before writing, run a Cognitive Check: determine what {{char}} understands, which consequences apply, and what concrete choice or response follows IN THE SCENE; record that awareness and choice instead of leaving them abstract or omitted. This check separates objective biological data from character awareness. Limit knowledge ONLY when concrete evidence establishes missing knowledge or impaired cognition; NEVER invent ignorance to bypass consequences.
- Infer and update tracker values from card/lore, the previous tracker, elapsed time, current actions, relevant RP events, and the character's knowledge; when data is missing, choose the most plausible development and keep it consistent. Always simulate the objective biological menstrual cycle; record ${labels.cycleKnowledge} separately as ${cycleKnowledgeValues}.
- For EACH character, infer conception chance from the simulated cycle, physical condition, exposure, and ${labels.protection}; MUST use 0.00% to 100.00% with two decimals, NEVER use the Sola roll as the chance, and use 0.00% when no viable exposure exists or its biological window ends.
- In the next tracker, copy the previous Sola result after removing only its roll: write "HIT|n/3", "MISS|n/3", or "CONCEIVED|3/3"; if none exists, leave status="". NEVER calculate, increment, reorder, or replace the state/count.
- When exposure ends or prevention/actions avert conception, MUST write status="" and chance="0.00%"; otherwise PRESERVE the copied state/count and update ${labels.stage} ONLY for CONCEIVED.
- Place characters within a SINGLE <sex_tracker> container, separated by one blank line.`;
}

const PREGNANCY_TAG_RE = /<pregnancy\s+chance="(\d{1,3}\.\d{2})%"\s+status="([^"<>&]*)"\s*\/>/g;
const PREGNANCY_STATUS_RE = /^(\d{1,3}\.\d{2})%\|(MISS|HIT|CONCEIVED)(?:\|([0-3])\/3)?$/;
const PREGNANCY_COMPACT_STATUS_RE = /^([0-3])\/3(?:\|(MISS|HIT|CONCEIVED))?$/;
const PREGNANCY_STATE_FIRST_STATUS_RE = /^(MISS|HIT|CONCEIVED)\|([0-3])\/3$/;
const PREGNANCY_CHARACTER_BOUNDARY_RE = /(?=^[ \t]*\[[^\]\r\n]+\][ \t]*:[ \t]*\r?$)/m;
const PREGNANCY_STATE_LABELS: Record<string, { en: string; vi: string }> = {
  MISS: { en: "No conception", vi: "Chưa thụ thai" },
  HIT: { en: "Hit, not yet conceived", vi: "Trúng, chưa thụ thai" },
  CONCEIVED: { en: "Conceived", vi: "Đã thụ thai" },
};

function parsePregnancyStatus(status: string) {
  const sampled = PREGNANCY_STATUS_RE.exec(status.trim());
  if (sampled)
    return {
      roll: sampled[1],
      state: sampled[2],
      hits: sampled[3] === undefined ? undefined : Number(sampled[3]),
    };
  const compact = PREGNANCY_COMPACT_STATUS_RE.exec(status.trim());
  if (compact)
    return {
      roll: undefined,
      state: compact[2],
      hits: Number(compact[1]),
    };
  const stateFirst = PREGNANCY_STATE_FIRST_STATUS_RE.exec(status.trim());
  if (stateFirst)
    return {
      roll: undefined,
      state: stateFirst[1],
      hits: Number(stateFirst[2]),
    };
  return undefined;
}

function pregnancyCharacterKey(section: string): string | undefined {
  return section
    .match(/^[ \t]*\[([^\]\r\n]+)\][ \t]*:[ \t]*\r?$/m)?.[1]
    ?.trim()
    .normalize("NFC")
    .toLocaleLowerCase("vi");
}

/** Recover accidentally cleared counts from the prior turn before sampling each character. */
export function resolveSolaPregnancy(
  input: string,
  random: () => number = Math.random,
  previousInput = "",
): string {
  const previousStatuses = new Map<string, string>();
  for (const [block] of previousInput.matchAll(new RegExp(TRACKER_RE.source, TRACKER_RE.flags))) {
    for (const section of block.split(PREGNANCY_CHARACTER_BOUNDARY_RE)) {
      const character = pregnancyCharacterKey(section);
      const pregnancy = new RegExp(PREGNANCY_TAG_RE.source, PREGNANCY_TAG_RE.flags).exec(section);
      if (character && pregnancy) previousStatuses.set(character, pregnancy[2]!.trim());
    }
  }
  return input.replace(new RegExp(TRACKER_RE.source, TRACKER_RE.flags), (block) =>
    block
      .split(PREGNANCY_CHARACTER_BOUNDARY_RE)
      .map((section) => {
        const priorStatus = previousStatuses.get(pregnancyCharacterKey(section) ?? "");
        return section.replace(
          new RegExp(PREGNANCY_TAG_RE.source, PREGNANCY_TAG_RE.flags),
          (tag, value: string, status: string) => {
            const chance = Number(value);
            if (chance <= 0 || chance > 100) return tag;
            const recordedStatus = status.trim() || priorStatus || "";
            const previous = parsePregnancyStatus(recordedStatus);
            if (previous?.state === "CONCEIVED")
              return tag.replace(/status="[^"]*"/, `status="${recordedStatus}"`);
            const hits = Math.min(2, previous?.hits ?? 0);
            const roll = Math.floor(random() * 10000) / 100;
            const hit = roll < chance;
            const total = Math.min(3, hits + Number(hit));
            const state = total === 3 ? "CONCEIVED" : hit ? "HIT" : "MISS";
            return tag.replace(
              /status="[^"]*"/,
              `status="${roll.toFixed(2)}%|${state}|${total}/3"`,
            );
          },
        );
      })
      .join(""),
  );
}

function pregnancyStatusLabel(status: string, vietnamese: boolean): string {
  const result = parsePregnancyStatus(status);
  if (!result) return status || (vietnamese ? "Chưa có kết quả" : "No result");
  const label = PREGNANCY_STATE_LABELS[result.state ?? "MISS"]!;
  const progress = result.hits === undefined ? "" : ` (${result.hits}/3)`;
  const roll = result.roll === undefined ? "" : `Roll: ${result.roll}% - `;
  return `${roll}${vietnamese ? label.vi : label.en}${progress}`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function trackerBodyHtml(body: string, vietnamese: boolean): string {
  const labels = new Map<string, string>([
    ["menstrual cycle", vietnamese ? "Chu kỳ kinh nguyệt" : "Menstrual cycle"],
    ["chu kỳ kinh nguyệt", vietnamese ? "Chu kỳ kinh nguyệt" : "Menstrual cycle"],
    ["cycle knowledge", vietnamese ? "Nhận biết chu kỳ" : "Cycle knowledge"],
    ["nhận biết chu kỳ", vietnamese ? "Nhận biết chu kỳ" : "Cycle knowledge"],
    ["physical condition", vietnamese ? "Tình trạng cơ thể" : "Physical condition"],
    ["tình trạng cơ thể", vietnamese ? "Tình trạng cơ thể" : "Physical condition"],
    ["pregnancy likelihood", vietnamese ? "Khả năng mang thai" : "Pregnancy likelihood"],
    ["khả năng mang thai", vietnamese ? "Khả năng mang thai" : "Pregnancy likelihood"],
    [
      "pregnancy likelihood/status",
      vietnamese ? "Khả năng và trạng thái mang thai" : "Pregnancy likelihood/status",
    ],
    [
      "khả năng và trạng thái mang thai",
      vietnamese ? "Khả năng và trạng thái mang thai" : "Pregnancy likelihood/status",
    ],
    ["pregnancy stage", vietnamese ? "Giai đoạn thai kỳ" : "Pregnancy stage"],
    ["giai đoạn thai kỳ", vietnamese ? "Giai đoạn thai kỳ" : "Pregnancy stage"],
    ["knows cycle timing", vietnamese ? "Biết mốc chu kỳ" : "Knows cycle timing"],
    ["biết mốc chu kỳ", vietnamese ? "Biết mốc chu kỳ" : "Knows cycle timing"],
    ["knows current date", vietnamese ? "Biết mốc chu kỳ" : "Knows cycle timing"],
    ["biết ngày hiện tại", vietnamese ? "Biết mốc chu kỳ" : "Knows cycle timing"],
    [
      "real-world awareness and choice",
      vietnamese ? "Nhận thức thực tế và lựa chọn" : "Real-world awareness and choice",
    ],
    [
      "nhận thức thực tế và lựa chọn",
      vietnamese ? "Nhận thức thực tế và lựa chọn" : "Real-world awareness and choice",
    ],
    [
      "protection measures/actions",
      vietnamese ? "Biện pháp và hành động bảo vệ" : "Protection measures/actions",
    ],
    [
      "protection measure",
      vietnamese ? "Biện pháp và hành động bảo vệ" : "Protection measures/actions",
    ],
    [
      "biện pháp và hành động bảo vệ",
      vietnamese ? "Biện pháp và hành động bảo vệ" : "Protection measures/actions",
    ],
    [
      "biện pháp bảo vệ",
      vietnamese ? "Biện pháp và hành động bảo vệ" : "Protection measures/actions",
    ],
  ]);
  return body
    .trim()
    .split(/\r?\n/)
    .map((source) => {
      const line = source.trim();
      if (!line) return '<div style="height:5px;"></div>';
      const character = line.match(/^\[([^\]]+)]\s*:\s*$/);
      if (character)
        return `<div style="margin:10px 0 5px;color:#F6C177;font-weight:800;">${escapeHtml(character[1]!)}</div>`;
      const field = line.match(/^([^:]{1,80})\s*:\s*(.*)$/);
      if (field) {
        const label = labels.get(field[1]!.trim().toLocaleLowerCase("vi"));
        if (label) {
          const value = field[2]!.replace(
            new RegExp(PREGNANCY_TAG_RE.source, PREGNANCY_TAG_RE.flags),
            (_tag, chance: string, status: string) =>
              `${vietnamese ? "Xác suất" : "Chance"}: ${chance}% · ${pregnancyStatusLabel(status, vietnamese)}`,
          );
          return `<div style="padding:3px 0;color:#E7DED7;"><span style="color:#E8A87C;font-weight:750;">${escapeHtml(label)}:</span> ${escapeHtml(value)}</div>`;
        }
      }
      return `<div style="color:#E7DED7;">${escapeHtml(line)}</div>`;
    })
    .join("");
}

export function adaptSolaSexTrackerForDisplay(input: string, vietnamese: boolean): string {
  return input.replace(
    /<\s{0,8}sex_tracker\b[^>]*>([\s\S]*?)<\s{0,8}\/\s{0,8}sex_tracker\s{0,8}>/gi,
    (_match, body: string) =>
      `<div data-sola-ui="sex-tracker"><details style="margin:12px 0;background:linear-gradient(135deg,rgba(44,22,38,.96),rgba(22,25,43,.94));border:1px solid rgba(224,137,180,.52);border-left:4px solid #E089B4;border-radius:9px;box-shadow:0 3px 16px rgba(0,0,0,.3);overflow:hidden;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><summary style="cursor:pointer;padding:10px 13px;background:linear-gradient(90deg,rgba(224,137,180,.2),rgba(22,25,43,.25));color:#FFD4E9;font-weight:800;outline:none;user-select:none;">${vietnamese ? "🌙 Sola: Theo dõi sinh sản" : "🌙 Sola: Reproductive Context"}</summary><div style="padding:9px 13px 12px;line-height:1.5;overflow-wrap:anywhere;">${trackerBodyHtml(body, vietnamese)}</div></details></div>`,
  );
}

/** Keep only the newest assistant tracker; one assistant response ages it out. */
export function expireSolaSexTracker(
  input: string,
  assistantDepth: number | undefined,
  onRemoval?: (offset: number, text: string) => void,
): string {
  if (assistantDepth === undefined || assistantDepth < 2) return input;
  const regex = new RegExp(TRACKER_RE.source, TRACKER_RE.flags);
  let removedLength = 0;
  return input.replace(regex, (match: string, ...args: unknown[]) => {
    const offset = Number(args.at(-2)) - removedLength;
    onRemoval?.(offset, match);
    removedLength += match.length;
    return "";
  });
}
