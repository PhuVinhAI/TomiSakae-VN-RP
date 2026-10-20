const TRACKER_RE =
  /<\s{0,8}sex_tracker\b(?:"[^"]*"|'[^']*'|[^'">])*(?:\/\s*>|>[\s\S]*?(?:<\s{0,8}\/\s{0,8}sex_tracker\s{0,8}>|(?=<\s{0,8}\/?\s{0,8}(?:sola_hud|scene_header|fengine|thought_engine|wardrobe|inventory|scene_cast|scene_state|bond|date|story_notes|solatag|char_matrix|tempo|cabinet|arrow|omen|nsfw_nsfl_ban_list)\b|<!--\s{0,8}HTML_(?:START|END)\s{0,8}-->)|$))/gi;

export const SOLA_SEX_TRACKER_MEMO = "sex-tracker";

export const SOLA_SEX_TRACKER_REMINDER =
  "- Telemetry (<sex_tracker>): Run the sexual-context Cognitive Check before writing; update cycle state, physical condition, pregnancy likelihood, risk awareness and attitude, and protection measures/actions.";

export function solaSexTrackerPrompt(vietnamese: boolean, location: string): string {
  const labels = vietnamese
    ? {
        character: "Tên nhân vật",
        cycle: "Chu kỳ kinh nguyệt",
        physicalCondition: "Tình trạng cơ thể",
        pregnancy: "Khả năng mang thai",
        awareness: "Nhận thức và thái độ với rủi ro",
        protection: "Biện pháp và hành động bảo vệ",
      }
    : {
        character: "Character Name",
        cycle: "Menstrual cycle",
        physicalCondition: "Physical condition",
        pregnancy: "Pregnancy likelihood",
        awareness: "Risk awareness and attitude",
        protection: "Protection measures/actions",
      };
  const unknown = vietnamese ? "chưa rõ" : "unknown";
  return `## Sexual Context Tracker 🌙
Located ${location || "at the end of your response"}, append:
<sex_tracker>
[${labels.character}]:
${labels.cycle}: [Cycle phase or timing known to the character, or ${unknown}]
${labels.physicalCondition}: [No prior/prior intercourse, childbirth history, injuries, recent orgasm, lingering sensitivity or itchiness, arousal, recovery status]
${labels.pregnancy}: [Current likelihood]
${labels.awareness}: [What the character understands about the current reproductive risk and how they avoid, oppose, or accept it]
${labels.protection}: [Protection methods or protective actions the character knows and takes, or none / not applicable]
</sex_tracker>

Rules:
- Before writing, run a Cognitive Check: identify the character's current facts, age, knowledge, experience, and beliefs; then let their established personality and card/lore determine the reaction.
- Infer and update tracker values from card/lore, the previous tracker, elapsed time, current actions, and the character's knowledge; when data is missing, choose the most plausible development and keep it consistent. Fill every field except ${labels.cycle} with a suitable value; record ${labels.cycle} only when the character knows or can reasonably recognize the phase or timing, otherwise write ${unknown}.
- Assess pregnancy likelihood from cycle state, current actions, and protection measures/actions, not from generic patterns or desire.
- Do not default a sexual outcome or risk response; let the checked risk awareness, personality, card, and lore determine whether the character avoids, opposes, or accepts risk and how they handle it.
- Do not let a generic sexual pattern decide the outcome. Write the character's response to the checked context, including uncertainty or conflict when present.
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
