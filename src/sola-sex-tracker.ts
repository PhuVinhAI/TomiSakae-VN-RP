const TRACKER_RE =
  /<\s{0,8}sex_tracker\b(?:"[^"]*"|'[^']*'|[^'">])*(?:\/\s*>|>[\s\S]*?(?:<\s{0,8}\/\s{0,8}sex_tracker\s{0,8}>|(?=<\s{0,8}\/?\s{0,8}(?:sola_hud|scene_header|fengine|thought_engine|wardrobe|inventory|scene_cast|scene_state|bond|date|story_notes|solatag|char_matrix|tempo|cabinet|arrow|omen|nsfw_tracker)\b|<!--\s{0,8}HTML_(?:START|END)\s{0,8}-->)|$))/gi;

export const SOLA_SEX_TRACKER_MEMO = "sex-tracker";

export const SOLA_SEX_TRACKER_REMINDER =
  "- Telemetry (<sex_tracker>): Run the sexual-context Cognitive Check before writing; update the current cycle, pregnancy likelihood, date knowledge, and character awareness.";

export function solaSexTrackerPrompt(vietnamese: boolean, location: string): string {
  const labels = vietnamese
    ? {
        character: "Tên nhân vật",
        cycle: "Chu kỳ kinh nguyệt",
        pregnancy: "Khả năng mang thai",
        dateKnowledge: "Biết ngày hiện tại",
        awareness: "Nhận thức thực tế",
      }
    : {
        character: "Character Name",
        cycle: "Menstrual cycle",
        pregnancy: "Pregnancy likelihood",
        dateKnowledge: "Knows current date",
        awareness: "Actual awareness",
      };
  const unknown = vietnamese ? "chưa rõ" : "unknown";
  const dateKnowledge = vietnamese ? "Đã biết / Chưa biết / Chưa rõ" : "Known / Unknown / Unclear";
  return `## Sexual Context Tracker 🌙
Located ${location || "at the end of your response"}, append:
<sex_tracker>
[${labels.character}]:
${labels.cycle}: [Current cycle state or ${unknown}]
${labels.pregnancy}: [Current likelihood or ${unknown}]
${labels.dateKnowledge}: [${dateKnowledge}]
${labels.awareness}: [What the character actually understands about the current reproductive risk]
</sex_tracker>

Rules:
- Before writing, run a Cognitive Check: identify the character's current facts, age, knowledge, experience, and beliefs; then let their established personality and card/lore determine the reaction.
- Do not default any sexual outcome; derive each decision from the checked context and the character's established awareness.
- Do not let a generic sexual pattern decide the outcome. Write the character's response to the checked context, including uncertainty or conflict when present.
- Place all active characters within a SINGLE <sex_tracker> container, separated by one blank line.
- Replace it with this turn's values and omit it when no sexual or reproductive context is present.`;
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
    ["pregnancy likelihood", vietnamese ? "Khả năng mang thai" : "Pregnancy likelihood"],
    ["khả năng mang thai", vietnamese ? "Khả năng mang thai" : "Pregnancy likelihood"],
    ["knows current date", vietnamese ? "Biết ngày hiện tại" : "Knows current date"],
    ["biết ngày hiện tại", vietnamese ? "Biết ngày hiện tại" : "Knows current date"],
    ["actual awareness", vietnamese ? "Nhận thức thực tế" : "Actual awareness"],
    ["nhận thức thực tế", vietnamese ? "Nhận thức thực tế" : "Actual awareness"],
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
