const TRACKER_RE =
  /<\s{0,8}cycle_tracker\b(?:"[^"]*"|'[^']*'|[^'">])*(?:\/\s*>|>[\s\S]*?(?:<\s{0,8}\/\s{0,8}cycle_tracker\s{0,8}>|(?=<\s{0,8}\/?\s{0,8}(?:sola_hud|scene_header|fengine|thought_engine|wardrobe|inventory|scene_cast|scene_state|bond|date|story_notes|solatag|char_matrix|tempo|cabinet|arrow|omen|nsfw_tracker)\b|<!--\s{0,8}HTML_(?:START|END)\s{0,8}-->)|$))/gi;

export const SOLA_CYCLE_TRACKER_MEMO = "cycle-tracker";

export const SOLA_CYCLE_TRACKER_REMINDER =
  "- Menstrual Cycle (<cycle_tracker>): Update cycle and fertility for this turn.";

export function solaCycleTrackerPrompt(vietnamese: boolean, location: string): string {
  const labels = vietnamese
    ? {
        character: "Tên nhân vật",
        cycle: "Chu kỳ",
        fertility: "Khả năng thụ thai",
      }
    : {
        character: "Character Name",
        cycle: "Cycle",
        fertility: "Fertility",
      };
  return `## Tracker: Menstrual Cycle 🌙
Located ${location || "at the end of your response"}.

Track the cycle and fertility state for this turn. This tracker is removed after the next response.

### Output Format
<cycle_tracker>
[${labels.character}]:
${labels.cycle}: [day, phase, period, or unknown]
${labels.fertility}: [lower, fertile window, ovulation, or unknown]
</cycle_tracker>

Replace it with this turn's values; omit it when neither appears.`;
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
    ["cycle", vietnamese ? "Chu kỳ" : "Cycle"],
    ["chu kỳ", vietnamese ? "Chu kỳ" : "Cycle"],
    ["fertility", vietnamese ? "Khả năng thụ thai" : "Fertility"],
    ["khả năng thụ thai", vietnamese ? "Khả năng thụ thai" : "Fertility"],
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

export function adaptSolaCycleTrackerForDisplay(input: string, vietnamese: boolean): string {
  return input.replace(
    /<\s{0,8}cycle_tracker\b[^>]*>([\s\S]*?)<\s{0,8}\/\s{0,8}cycle_tracker\s{0,8}>/gi,
    (_match, body: string) =>
      `<div data-sola-ui="cycle-tracker"><details style="margin:12px 0;background:rgba(24,26,42,.86);border:1px solid rgba(154,145,214,.42);border-left:4px solid #9A91D6;border-radius:9px;box-shadow:0 3px 16px rgba(0,0,0,.3);overflow:hidden;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><summary style="cursor:pointer;padding:10px 13px;background:linear-gradient(90deg,rgba(154,145,214,.18),rgba(24,26,42,.25));color:#D8D3FF;font-weight:800;outline:none;user-select:none;">${vietnamese ? "🌙 Sola: Chu kỳ kinh nguyệt" : "🌙 Sola: Menstrual Cycle"}</summary><div style="padding:9px 13px 12px;line-height:1.5;overflow-wrap:anywhere;">${trackerBodyHtml(body, vietnamese)}</div></details></div>`,
  );
}

/** Keep only the newest assistant tracker; one assistant response ages it out. */
export function expireSolaCycleTracker(
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
