const TRACKER_RE =
  /<\s{0,8}nsfw_nsfl_ban_list\b(?:"[^"]*"|'[^']*'|[^'">])*(?:\/\s*>|>[\s\S]*?(?:<\s{0,8}\/\s{0,8}nsfw_nsfl_ban_list\s{0,8}>|(?=<\s{0,8}\/?\s{0,8}(?:sola_hud|scene_header|fengine|thought_engine|wardrobe|inventory|scene_cast|scene_state|bond|date|story_notes|solatag|char_matrix|tempo|cabinet|arrow|omen|sex_tracker)\b|<!--\s{0,8}HTML_(?:START|END)\s{0,8}-->)|$))/gi;

export const SOLA_NSFW_TRACKER_MEMO = "nsfw-tracker";

export const SOLA_NSFW_TRACKER_REMINDER =
  "- Telemetry (<nsfw_nsfl_ban_list>): Record ONLY patterns actually written above in THIS response.\n";

export function solaNsfwTrackerPrompt(vietnamese: boolean, location: string): string {
  const labels = vietnamese
    ? {
        description: "Cách miêu tả",
        kinetics: "Hành động/Động lực cơ thể",
        sensory: "Điểm nhấn cảm giác",
        dialogue: "Kiểu thoại",
        vocal: "Tiếng rên/Phản ứng giọng",
        pacing: "Nhịp triển khai",
        structure: "Bố cục phản hồi",
        nsfl: "Phản ứng thân thể / Hành động NSFL",
      }
    : {
        description: "Description patterns",
        kinetics: "Action/Body dynamics",
        sensory: "Sensory emphasis",
        dialogue: "Dialogue patterns",
        vocal: "Moans/Vocal reactions",
        pacing: "Pacing",
        structure: "Response structure",
        nsfl: "NSFL bodily response / action",
      };
  return `## ${vietnamese ? "Ghi chép NSFW/NSFL" : "NSFW/NSFL Usage Record"} 🔥
Located ${location || "at the end of your response"}, append:
<nsfw_nsfl_ban_list>
${labels.description}: [Distinct NSFW descriptive constructions used this turn]
${labels.sensory}: [Distinct NSFW tactile, thermal, fluid, olfactory, or acoustic details used this turn]
${labels.pacing}: [How this NSFW beat moved this turn from opening to shift and stopping point]
${labels.structure}: [${vietnamese ? "Toàn bộ thứ tự các khối thực tế trong phản hồi hiện tại trước HUD, ghi loại và độ dài ngắn/vừa/dài; giữ riêng từng khối kể cả khi cùng loại liên tiếp" : "Full sequence of actual blocks in THIS response before the HUD, recording each block's type and short/medium/long length; keep consecutive same-type blocks separate"}]

${labels.kinetics}:
[${vietnamese ? "Tên nhân vật" : "Character Name"}]: [Distinct NSFW movement, force, pose, and contact patterns used this turn]

${labels.dialogue}:
[${vietnamese ? "Tên nhân vật" : "Character Name"}]: [Distinct NSFW dialogue constructions used this turn]

${labels.vocal}:
[${vietnamese ? "Tên nhân vật" : "Character Name"}]: [Exact NSFW moans, gasps, stammers, or phonetic reactions used this turn]

${labels.nsfl}:
[${vietnamese ? "Tên nhân vật" : "Character Name"}]: [Concrete bodily reflex, defensive posture or action, persona-true behavior, or immediate survival drive used this turn, or ${vietnamese ? "Không có" : "None"}]
</nsfw_nsfl_ban_list>

Rules:
- Record ONLY patterns actually written in THIS response; ignore all earlier responses, trackers, and history. Include their concrete wording, structures, and rhythms. Do not invent entries.
- Record shared description, sensory, pacing, and response structure once within a SINGLE <nsfw_nsfl_ban_list>. Under each remaining heading, write one [Character]: pattern line per active character.
- For NSFL scenes, record the concrete bodily reflex, defensive action, persona-true behavior, or immediate survival drive actually used this turn in ${labels.nsfl}, one line per character.
- Record concrete NSFW patterns used this turn; record NSFL only when it occurs, otherwise write ${vietnamese ? "Không có" : "None"} in the NSFL field.
`;
}

/** Remove tracker blocks from a request copy and retain their recorded content. */
export function splitSolaNsfwTracker(input: string): { content: string; patterns: string } {
  const records: string[] = [];
  const content = input.replace(new RegExp(TRACKER_RE.source, TRACKER_RE.flags), (block) => {
    const body = block
      .replace(/^<\s{0,8}nsfw_nsfl_ban_list\b[^>]*>/i, "")
      .replace(/<\s{0,8}\/\s{0,8}nsfw_nsfl_ban_list\s{0,8}>$/i, "")
      .trim();
    if (body) records.push(body);
    return "";
  });
  return { content, patterns: records.join("\n\n") };
}

/** Wrap each recorded item in a system ban for the response about to be written. */
export function solaNsfwPatternBanPrompt(patterns: string): string {
  let heading = "";
  const items: string[] = [];
  for (const raw of patterns.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (!line.startsWith("[") && /:\s*$/.test(line)) {
      heading = line;
      continue;
    }
    if (/:\s*\[?\s*(?:None|Không có)\s*\]?[.!]?$/iu.test(line)) continue;
    if (!line.startsWith("[")) heading = "";
    const item = heading ? `${heading}\n${line}` : line;
    items.push(`<banned_pattern>\n${escapeHtml(item)}\n</banned_pattern>`);
  }
  if (!items.length) return "";
  return `## NSFW/NSFL Pattern Ban
- In THIS response, treat EVERY recorded item below as an ABSOLUTE BAN: replace the previous wording, structures, rhythms, pacing, and reaction patterns.
- NEVER repeat, closely paraphrase, synonym-swap, or reuse these patterns. Change the way the scene is written, not its established facts.
- RESTRUCTURE the recorded response layout, not its individual block types: change the opening, block order, grouping, and lengths; NEVER keep the template by only swapping words or changing a few positions.

${items.join("\n\n")}`;
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
    ["action/body dynamics", vietnamese ? "Hành động/Động lực cơ thể" : "Action/Body dynamics"],
    [
      "hành động/động lực cơ thể",
      vietnamese ? "Hành động/Động lực cơ thể" : "Action/Body dynamics",
    ],
    ["sensory emphasis", vietnamese ? "Điểm nhấn cảm giác" : "Sensory emphasis"],
    ["điểm nhấn cảm giác", vietnamese ? "Điểm nhấn cảm giác" : "Sensory emphasis"],
    ["dialogue patterns", vietnamese ? "Kiểu thoại" : "Dialogue patterns"],
    ["kiểu thoại", vietnamese ? "Kiểu thoại" : "Dialogue patterns"],
    ["moans/vocal reactions", vietnamese ? "Tiếng rên/Phản ứng giọng" : "Moans/Vocal reactions"],
    ["vocal patterns", vietnamese ? "Tiếng rên/Phản ứng giọng" : "Vocal patterns"],
    ["tiếng rên/phản ứng giọng", vietnamese ? "Tiếng rên/Phản ứng giọng" : "Moans/Vocal reactions"],
    [
      "nsfl bodily response / action",
      vietnamese ? "Phản ứng thân thể / Hành động NSFL" : "NSFL bodily response / action",
    ],
    [
      "phản ứng thân thể / hành động nsfl",
      vietnamese ? "Phản ứng thân thể / Hành động NSFL" : "NSFL bodily response / action",
    ],
    ["pacing", vietnamese ? "Nhịp triển khai" : "Pacing"],
    ["nhịp triển khai", vietnamese ? "Nhịp triển khai" : "Pacing"],
    ["response structure", vietnamese ? "Bố cục phản hồi" : "Response structure"],
    ["bố cục phản hồi", vietnamese ? "Bố cục phản hồi" : "Response structure"],
  ]);
  return body
    .trim()
    .split(/\r?\n/)
    .map((source) => {
      const line = source.trim();
      if (!line) return '<div style="height:5px;"></div>';
      const character = line.match(/^\[([^\]]+)]\s*:\s*(.*)$/);
      if (character)
        return `<div style="padding:3px 0 3px 12px;color:#E7DED7;"><span style="color:#F6C177;font-weight:750;">${escapeHtml(character[1]!)}:</span> ${escapeHtml(character[2]!)}</div>`;
      const field = line.match(/^([^:]{1,80})\s*:\s*(.*)$/);
      const label = field ? groups.get(field[1]!.trim().toLocaleLowerCase("vi")) : undefined;
      if (label) {
        if (!field![2]!.trim())
          return `<div style="margin:10px 0 4px;color:#F6C177;font-size:.82em;font-weight:800;letter-spacing:.02em;">${escapeHtml(label)}</div>`;
        return `<div style="margin:7px 0 3px;padding:7px 9px;border-radius:6px;background:rgba(214,112,91,.08);color:#F6C177;font-size:.82em;font-weight:750;letter-spacing:.02em;">${escapeHtml(label)}<div style="margin-top:3px;color:#F1E8DF;font-size:.94em;font-weight:500;letter-spacing:0;">${escapeHtml(field![2]!)}</div></div>`;
      }
      if (/^[-*]\s+/.test(line))
        return `<div style="padding-left:12px;color:#E7DED7;"><span style="color:#C97B63;">•</span> ${escapeHtml(line.replace(/^[-*]\s+/, ""))}</div>`;
      return `<div style="color:#E7DED7;">${escapeHtml(line)}</div>`;
    })
    .join("");
}

/** Render only a display copy; tracker text is escaped and never executed as markup. */
export function adaptSolaNsfwTrackerForDisplay(input: string, vietnamese: boolean): string {
  return input.replace(
    /<\s{0,8}nsfw_nsfl_ban_list\b[^>]*>([\s\S]*?)<\s{0,8}\/\s{0,8}nsfw_nsfl_ban_list\s{0,8}>/gi,
    (_match, body: string) =>
      `<div data-sola-ui="nsfw-nsfl-tracker"><details style="margin:12px 0;background:rgba(36,18,20,.86);border:1px solid rgba(214,112,91,.42);border-left:4px solid #D6705B;border-radius:9px;box-shadow:0 3px 16px rgba(0,0,0,.3);overflow:hidden;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><summary style="cursor:pointer;padding:10px 13px;background:linear-gradient(90deg,rgba(214,112,91,.18),rgba(36,18,20,.25));color:#F6C177;font-weight:800;outline:none;user-select:none;">${vietnamese ? "🔥 Sola: Ghi chép NSFW/NSFL" : "🔥 Sola: NSFW/NSFL Usage Record"}</summary><div style="padding:9px 13px 12px;line-height:1.5;overflow-wrap:anywhere;">${trackerBodyHtml(body, vietnamese)}</div></details></div>`,
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
