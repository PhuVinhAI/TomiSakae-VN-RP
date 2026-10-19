const TRACKER_RE =
  /<\s{0,8}nsfw_tracker\b(?:"[^"]*"|'[^']*'|[^'">])*(?:\/\s*>|>[\s\S]*?(?:<\s{0,8}\/\s{0,8}nsfw_tracker\s{0,8}>|(?=<\s{0,8}\/?\s{0,8}(?:sola_hud|scene_header|fengine|thought_engine|wardrobe|inventory|scene_cast|scene_state|bond|date|story_notes|solatag|char_matrix|tempo|cabinet|arrow|omen|cycle_tracker)\b|<!--\s{0,8}HTML_(?:START|END)\s{0,8}-->)|$))/gi;

export const SOLA_NSFW_TRACKER_MEMO = "nsfw-tracker";

export const SOLA_NSFW_TRACKER_REMINDER =
  "- Telemetry (<nsfw_tracker>): BAN the previous NSFW description, dialogue, and vocal patterns; record this turn's new patterns.";

export function solaNsfwTrackerPrompt(vietnamese: boolean, location: string): string {
  const labels = vietnamese
    ? {
        character: "Tên nhân vật",
        description: "Cách miêu tả",
        dialogue: "Kiểu thoại",
        vocal: "Tiếng rên/Phản ứng giọng",
      }
    : {
        character: "Character Name",
        description: "Description patterns",
        dialogue: "Dialogue patterns",
        vocal: "Moans/Vocal reactions",
      };
  return `## NSFW Variety Tracker 🔥
Located ${location || "at the end of your response"}, append:
<nsfw_tracker>
[${labels.character}]:
${labels.description}: [Distinct descriptive constructions used this turn]
${labels.dialogue}: [Distinct erotic dialogue constructions used this turn]
${labels.vocal}: [Exact moans, gasps, stammers, or phonetic reactions used this turn]
</nsfw_tracker>

Rules:
- Use the previous <nsfw_tracker> as a BAN LIST for this turn; do not reuse or closely paraphrase its entries.
- Place all active characters within a SINGLE <nsfw_tracker> container, separated by one blank line.
- Record only distinct patterns actually used in this turn, then overwrite the tracker.
- Omit the tracker when no NSFW content occurs.`;
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
  const groups = new Map<string, string>([
    ["description patterns", vietnamese ? "Cách miêu tả" : "Description patterns"],
    ["cách miêu tả", vietnamese ? "Cách miêu tả" : "Description patterns"],
    ["dialogue patterns", vietnamese ? "Kiểu thoại" : "Dialogue patterns"],
    ["kiểu thoại", vietnamese ? "Kiểu thoại" : "Dialogue patterns"],
    ["moans/vocal reactions", vietnamese ? "Tiếng rên/Phản ứng giọng" : "Moans/Vocal reactions"],
    ["vocal patterns", vietnamese ? "Tiếng rên/Phản ứng giọng" : "Vocal patterns"],
    ["tiếng rên/phản ứng giọng", vietnamese ? "Tiếng rên/Phản ứng giọng" : "Moans/Vocal reactions"],
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
      const field = line.match(/^([^:]{1,80})\s*:\s*$/);
      const label = field ? groups.get(field[1]!.trim().toLocaleLowerCase("vi")) : undefined;
      if (label)
        return `<div style="margin:7px 0 3px;color:#E8A87C;font-size:.82em;font-weight:750;letter-spacing:.02em;">${escapeHtml(label)}</div>`;
      if (/^[-*]\s+/.test(line))
        return `<div style="padding-left:12px;color:#E7DED7;"><span style="color:#C97B63;">•</span> ${escapeHtml(line.replace(/^[-*]\s+/, ""))}</div>`;
      return `<div style="color:#E7DED7;">${escapeHtml(line)}</div>`;
    })
    .join("");
}

/** Render only a display copy; tracker text is escaped and never executed as markup. */
export function adaptSolaNsfwTrackerForDisplay(input: string, vietnamese: boolean): string {
  return input.replace(
    /<\s{0,8}nsfw_tracker\b[^>]*>([\s\S]*?)<\s{0,8}\/\s{0,8}nsfw_tracker\s{0,8}>/gi,
    (_match, body: string) =>
      `<div data-sola-ui="nsfw-tracker"><details style="margin:12px 0;background:rgba(36,18,20,.86);border:1px solid rgba(214,112,91,.42);border-left:4px solid #D6705B;border-radius:9px;box-shadow:0 3px 16px rgba(0,0,0,.3);overflow:hidden;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><summary style="cursor:pointer;padding:10px 13px;background:linear-gradient(90deg,rgba(214,112,91,.18),rgba(36,18,20,.25));color:#F6C177;font-weight:800;outline:none;user-select:none;">${vietnamese ? "🔥 Sola: Bộ theo dõi NSFW" : "🔥 Sola: NSFW Tracker"}</summary><div style="padding:9px 13px 12px;line-height:1.5;overflow-wrap:anywhere;">${trackerBodyHtml(body, vietnamese)}</div></details></div>`,
  );
}

/** Keep only the newest assistant tracker; one assistant response ages it out. */
export function expireSolaNsfwTracker(
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
