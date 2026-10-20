const TRACKER_RE =
  /<\s{0,8}sex_tracker\b(?:"[^"]*"|'[^']*'|[^'">])*(?:\/\s*>|>[\s\S]*?(?:<\s{0,8}\/\s{0,8}sex_tracker\s{0,8}>|(?=<\s{0,8}\/?\s{0,8}(?:sola_hud|scene_header|fengine|thought_engine|wardrobe|inventory|scene_cast|scene_state|bond|date|story_notes|solatag|char_matrix|tempo|cabinet|arrow|omen|nsfw_nsfl_ban_list)\b|<!--\s{0,8}HTML_(?:START|END)\s{0,8}-->)|$))/gi;

export const SOLA_SEX_TRACKER_MEMO = "sex-tracker";

export const SOLA_SEX_TRACKER_REMINDER =
  "- Telemetry (<sex_tracker>): Run the sexual-context Cognitive Check before writing; update stage and discussion status, cycle state, physical condition, pregnancy likelihood, risk awareness and attitude, and protection measures/actions.";

export function solaSexTrackerPrompt(vietnamese: boolean, location: string): string {
  const labels = vietnamese
    ? {
        character: "Tên nhân vật",
        stage: "Giai đoạn và trao đổi",
        cycle: "Chu kỳ kinh nguyệt",
        physicalCondition: "Tình trạng cơ thể",
        pregnancy: "Khả năng mang thai",
        awareness: "Nhận thức và thái độ với rủi ro",
        protection: "Biện pháp và hành động bảo vệ",
      }
    : {
        character: "Character Name",
        stage: "Stage and discussion",
        cycle: "Menstrual cycle",
        physicalCondition: "Physical condition",
        pregnancy: "Pregnancy likelihood",
        awareness: "Risk awareness and attitude",
        protection: "Protection measures/actions",
      };
  const stages = vietnamese
    ? { before: "Trước khi làm", during: "Đang diễn ra", after: "Kết thúc" }
    : { before: "Before", during: "In progress", after: "Finished" };
  const discussion = vietnamese
    ? { pending: "Chưa nói", done: "Đã nói về sinh sản" }
    : { pending: "Not discussed", done: "Discussed reproduction" };
  const none = vietnamese ? "Không có" : "None";
  const unknown = vietnamese ? "chưa rõ" : "unknown";
  const examples = vietnamese
    ? {
        cycle:
          "Kinh nguyệt, trước rụng trứng, rụng trứng, sau rụng trứng hoặc giai đoạn/mốc thời gian hợp lý khác mà nhân vật biết, hoặc chưa rõ",
        physical:
          "Còn trinh/từng quan hệ, tiền sử sinh nở, tổn thương, vừa đạt cực khoái, còn nhạy cảm hoặc ngứa ran, đang hưng phấn, tình trạng hồi phục hoặc tình trạng liên quan khác",
        pregnancy:
          "Thấp, vừa, cao, đã xác nhận hoặc khả năng khác được suy ra từ chu kỳ và hành động hiện tại",
        awareness:
          "Đã biết, chưa biết hoặc chưa rõ với nhân vật; điều nhân vật hiểu về nguy cơ sinh sản và cách họ tránh, phản đối hoặc chấp nhận nó",
        protection:
          "Bao cao su, biện pháp tránh thai, thuốc tránh thai khẩn cấp, xuất ngoài, yêu cầu xuất ngoài, chuyển sang đường miệng/tay/đường khác, dừng hoặc từ chối, chấp nhận rủi ro hoặc hành động bảo vệ khác",
      }
    : {
        cycle: `Menstruation, pre-ovulation, ovulation, post-ovulation, or another plausible phase/timing known to the character, or ${unknown}`,
        physical:
          "Virginity/prior intercourse, childbirth history, injuries, recent orgasm, lingering sensitivity or itchiness, arousal, recovery status, or another relevant condition",
        pregnancy:
          "Low, moderate, high, confirmed, or another likelihood inferred from cycle and current actions",
        awareness:
          "Known, unknown, or unclear to the character; what they understand about reproductive risk and how they avoid, oppose, or accept it",
        protection:
          "Condom, contraception, emergency contraception, withdrawal, requesting external ejaculation, switching to oral/manual/another route, stopping or refusing, accepting risk, or another protective action",
      };
  return `## Sexual Context Tracker 🌙
Located ${location || "at the end of your response"}, append:
<sex_tracker>
[${labels.character}]:
${labels.stage}: [${stages.before} / ${stages.during} / ${stages.after} / ${none}] | [${discussion.pending} / ${discussion.done}]
${labels.cycle}: [${examples.cycle}]
${labels.physicalCondition}: [${examples.physical}]
${labels.pregnancy}: [${examples.pregnancy}]
${labels.awareness}: [${examples.awareness}]
${labels.protection}: [${examples.protection}]
</sex_tracker>

Rules:
- Before writing, select EXACTLY ONE stage matching the current scene for each character; use ${none} if the scene has not actually progressed toward sexual activity. Run a Cognitive Check: identify the character's current facts, age, knowledge, experience, and beliefs; then let their established personality and card/lore determine the reaction.
- Infer and update tracker values from card/lore, the previous tracker, elapsed time, current actions, and the character's knowledge; when data is missing, choose the most plausible development and keep it consistent. Fill every field except ${labels.cycle} with a suitable value; record ${labels.cycle} only when the character knows or can reasonably recognize the phase or timing, otherwise write ${unknown}. Only mark ${discussion.done} after actual scene dialogue; carry it through the same encounter and reset to ${discussion.pending} for a new encounter.
- Assess pregnancy likelihood from cycle state, current actions, and protection measures/actions.
- If ${discussion.pending} during an active stage, NPCs MUST discuss reproduction immediately IN THE SCENE: ${stages.before}, intentions/protection; ${stages.during}, boundaries/choices; ${stages.after}, risk/response. If unaware, ask according to their knowledge; pleasure, loss of control, or post-climax afterglow MUST NOT excuse skipping the discussion.
- Let the checked risk awareness, knowledge, experience, beliefs, personality, and card/lore determine how the character avoids, opposes, or accepts risk, including uncertainty or conflict when present.
- Place characters within a SINGLE <sex_tracker> container, separated by one blank line.`;
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
    ["stage and discussion", vietnamese ? "Giai đoạn và trao đổi" : "Stage and discussion"],
    ["giai đoạn và trao đổi", vietnamese ? "Giai đoạn và trao đổi" : "Stage and discussion"],
    ["menstrual cycle", vietnamese ? "Chu kỳ kinh nguyệt" : "Menstrual cycle"],
    ["chu kỳ kinh nguyệt", vietnamese ? "Chu kỳ kinh nguyệt" : "Menstrual cycle"],
    ["physical condition", vietnamese ? "Tình trạng cơ thể" : "Physical condition"],
    ["tình trạng cơ thể", vietnamese ? "Tình trạng cơ thể" : "Physical condition"],
    ["pregnancy likelihood", vietnamese ? "Khả năng mang thai" : "Pregnancy likelihood"],
    ["khả năng mang thai", vietnamese ? "Khả năng mang thai" : "Pregnancy likelihood"],
    ["knows cycle timing", vietnamese ? "Biết mốc chu kỳ" : "Knows cycle timing"],
    ["biết mốc chu kỳ", vietnamese ? "Biết mốc chu kỳ" : "Knows cycle timing"],
    ["knows current date", vietnamese ? "Biết mốc chu kỳ" : "Knows cycle timing"],
    ["biết ngày hiện tại", vietnamese ? "Biết mốc chu kỳ" : "Knows cycle timing"],
    [
      "risk awareness and attitude",
      vietnamese ? "Nhận thức và thái độ với rủi ro" : "Risk awareness and attitude",
    ],
    [
      "nhận thức và thái độ với rủi ro",
      vietnamese ? "Nhận thức và thái độ với rủi ro" : "Risk awareness and attitude",
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
        if (label)
          return `<div style="padding:3px 0;color:#E7DED7;"><span style="color:#E8A87C;font-weight:750;">${escapeHtml(label)}:</span> ${escapeHtml(field[2]!)}</div>`;
      }
      return `<div style="color:#E7DED7;">${escapeHtml(line)}</div>`;
    })
    .join("");
}

export function adaptSolaSexTrackerForDisplay(input: string, vietnamese: boolean): string {
  return input.replace(
    /<\s{0,8}sex_tracker\b[^>]*>([\s\S]*?)<\s{0,8}\/\s{0,8}sex_tracker\s{0,8}>/gi,
    (_match, body: string) =>
      `<div data-sola-ui="sex-tracker"><details style="margin:12px 0;background:linear-gradient(135deg,rgba(44,22,38,.96),rgba(22,25,43,.94));border:1px solid rgba(224,137,180,.52);border-left:4px solid #E089B4;border-radius:9px;box-shadow:0 3px 16px rgba(0,0,0,.3);overflow:hidden;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><summary style="cursor:pointer;padding:10px 13px;background:linear-gradient(90deg,rgba(224,137,180,.2),rgba(22,25,43,.25));color:#FFD4E9;font-weight:800;outline:none;user-select:none;">${vietnamese ? "🌙 Sola: Bối cảnh tình dục" : "🌙 Sola: Sexual Context"}</summary><div style="padding:9px 13px 12px;line-height:1.5;overflow-wrap:anywhere;">${trackerBodyHtml(body, vietnamese)}</div></details></div>`,
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
