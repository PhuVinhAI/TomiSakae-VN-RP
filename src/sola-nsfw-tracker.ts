const TRACKER_RE =
  /<\s{0,8}nsfw_nsfl_tracker\b(?:"[^"]*"|'[^']*'|[^'">])*(?:\/\s*>|>[\s\S]*?(?:<\s{0,8}\/\s{0,8}nsfw_nsfl_tracker\s{0,8}>|(?=<\s{0,8}\/?\s{0,8}(?:sola_hud|scene_header|fengine|thought_engine|wardrobe|inventory|scene_cast|scene_state|bond|date|story_notes|solatag|char_matrix|tempo|cabinet|arrow|omen|sex_tracker)\b|<!--\s{0,8}HTML_(?:START|END)\s{0,8}-->)|$))/gi;

export const SOLA_NSFW_TRACKER_MEMO = "nsfw-tracker";

export const SOLA_NSFW_TRACKER_REMINDER =
  "- Telemetry (<nsfw_nsfl_tracker>): Record ONLY patterns actually written above in THIS response.\n";

export function solaNsfwTrackerPrompt(vietnamese: boolean, location: string): string {
  const labels = vietnamese
    ? {
        description: "Cách miêu tả",
        initiation: "Tiếp cận/Dạo đầu",
        sensory: "Điểm nhấn cảm giác",
        dialogue: "Kiểu thoại",
        vocal: "Tiếng rên/Phản ứng giọng",
        variation: "Tư thế/Hành động/Kích thích",
        nsfl: "Phản ứng thân thể / Hành động NSFL",
      }
    : {
        description: "Description patterns",
        initiation: "Initiation/Foreplay",
        sensory: "Sensory emphasis",
        dialogue: "Dialogue patterns",
        vocal: "Moans/Vocal reactions",
        variation: "Pose/Action/Stimulation",
        nsfl: "NSFL bodily response / action",
      };
  return `## ${vietnamese ? "Ghi chép NSFW/NSFL" : "NSFW/NSFL Usage Record"} 🔥
In EVERY response, you MUST append ${location || "at the end of your response"}:
<nsfw_nsfl_tracker>
${labels.description}: [Distinct NSFW descriptive constructions used this turn]
${labels.sensory}: [Distinct NSFW tactile, thermal, fluid, olfactory, or acoustic details used this turn]

${labels.initiation}:
[${vietnamese ? "Tên nhân vật" : "Character Name"}]: [Distinct spatial approach, undressing, foreplay, and pre-contact friction patterns used this turn]

${labels.variation}:
[${vietnamese ? "Tên nhân vật" : "Character Name"}]: [Distinct pose, angle, action, stimulation method, and fitting erogenous zone patterns used this turn]

${labels.dialogue}:
[${vietnamese ? "Tên nhân vật" : "Character Name"}]: [Distinct NSFW dialogue constructions used this turn]

${labels.vocal}:
[${vietnamese ? "Tên nhân vật" : "Character Name"}]: [Exact NSFW moans, gasps, stammers, or phonetic reactions used this turn]

${labels.nsfl}:
[${vietnamese ? "Tên nhân vật" : "Character Name"}]: [Concrete bodily reflex, defensive posture or action, persona-true behavior, or immediate survival drive used this turn, or ${vietnamese ? "Không có" : "None"}]
</nsfw_nsfl_tracker>

Rules:
- Record ONLY patterns actually written in THIS response; ignore all earlier responses, trackers, and history. Include their concrete wording, structures, and rhythms. Do not invent entries.
- Record shared description and sensory patterns once within a SINGLE <nsfw_nsfl_tracker>. Under each character-specific heading, write one [Character]: pattern line per active character.
- For NSFL scenes, record the concrete bodily reflex, defensive action, persona-true behavior, or immediate survival drive actually used this turn in ${labels.nsfl}, one line per character.
- For each pattern-bearing field, record EVERY distinct pattern actually used this turn, preserving concrete wording, structure, rhythm, and character association; NEVER collapse multiple patterns into a generic summary or omit a used pattern. Record NSFL only when it occurs, otherwise write ${vietnamese ? "Không có" : "None"} in the NSFL field.
`;
}

/** Remove tracker blocks from a request copy and retain their recorded content. */
export function splitSolaNsfwTracker(input: string): { content: string; patterns: string } {
  const records: string[] = [];
  const content = input.replace(new RegExp(TRACKER_RE.source, TRACKER_RE.flags), (block) => {
    const body = block
      .replace(/^<\s{0,8}nsfw_nsfl_tracker\b[^>]*>/i, "")
      .replace(/<\s{0,8}\/\s{0,8}nsfw_nsfl_tracker\s{0,8}>$/i, "")
      .trim();
    if (body) records.push(body);
    return "";
  });
  return { content, patterns: records.join("\n\n") };
}

const PATTERN_FIELDS = new Set([
  "description patterns",
  "cách miêu tả",
  "sensory emphasis",
  "điểm nhấn cảm giác",
  "initiation/foreplay",
  "tiếp cận/dạo đầu",
  "pose/action/stimulation",
  "tư thế/hành động/kích thích",
  "dialogue patterns",
  "kiểu thoại",
  "moans/vocal reactions",
  "vocal patterns",
  "tiếng rên/phản ứng giọng",
  "nsfl bodily response / action",
  "phản ứng thân thể / hành động nsfl",
]);

function solaNsfwPatternItems(patterns: string): string[] {
  let heading = "";
  const items: string[] = [];
  for (const raw of patterns.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    // Normalize formatting for classification while retaining the recorded wording.
    const plainLine = line.replace(/^(?:[-*+]|\d+\.)\s+/u, "").replace(/[*_`]/g, "");
    if (/^(?:Response structure|Bố cục phản hồi)\s*:/iu.test(plainLine)) continue;
    const field = plainLine.match(/^([^:]+):\s*(.*)$/u);
    if (field && PATTERN_FIELDS.has(field[1]!.trim().toLocaleLowerCase("vi"))) heading = "";
    if (!plainLine.startsWith("[") && /:\s*$/.test(plainLine)) {
      heading = line;
      continue;
    }
    const value = (field?.[2] ?? plainLine)
      .trim()
      .replace(/^[[\]"'“”‘’\s]+|[[\]"'“”‘’\s.!]+$/gu, "");
    if (/^(?:None|Không có)$/iu.test(value)) continue;
    const item = heading ? `${heading}\n${line}` : line;
    items.push(item);
  }
  return items;
}

function naturalSolaNsfwPattern(item: string): string {
  const lines = item
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const first = lines.shift() ?? "";
  const headingMatch = first.match(/^([^:]+):\s*(.*)$/u);
  let heading = headingMatch?.[1]?.trim() ?? "";
  let value = headingMatch?.[2]?.trim() ?? first;
  if (!value && lines.length > 0) {
    value = lines.shift() ?? "";
  }
  if (lines.length > 0) value = [value, ...lines].filter(Boolean).join(" ");
  const character = value.match(/^\[([^\]]+)\]\s*:\s*(.*)$/u);
  let hasCharacter = false;
  if (character) {
    const name = character[1]!.trim();
    value = character[2]!.trim();
    heading = heading ? `${name}'s ${heading.toLocaleLowerCase("en-US")}` : `${name}'s recorded pattern`;
    hasCharacter = true;
  } else if (heading) {
    heading = heading.toLocaleLowerCase("en-US");
  } else {
    heading = "recorded pattern";
  }
  const label = hasCharacter ? heading : `the ${heading}`;
  return `${label} “${value.replaceAll("“", "'").replaceAll("”", "'")}”`;
}

/** Build a request-only user/assistant exchange that carries the latest pattern ban. */
export function solaNsfwPatternBanConversation(
  patterns: string,
  structureOnly = false,
): { user: string; assistant: string } | undefined {
  const items = solaNsfwPatternItems(patterns);
  if (!items.length && !structureOnly) return undefined;
  const recorded = items.map(naturalSolaNsfwPattern).join(", ");
  const user = items.length
    ? '{{OOC: "Do not repeat the NSFW/NSFL patterns recorded in the tracker above. For the next response, ABSOLUTELY do not use the previous response as a template: do not reuse its writing structure, order, pacing, or dialogue form. CHANGE THE RESPONSE COMPLETELY."}}'
    : '{{OOC: "For the next response, ABSOLUTELY do not use the previous response as a template: do not reuse its writing structure, order, pacing, or dialogue form. CHANGE THE RESPONSE COMPLETELY."}}';
  const assistant = items.length
    ? `I understand. I will not repeat the recorded NSFW/NSFL choices, including ${recorded}, and I will not use the previous response's structure, order, pacing, or dialogue form as a template. I will change the response completely, use a new structure and dialogue pattern, and describe the same established scene while keeping its facts and continuity intact.`
    : "I understand. I will not use the previous response's structure, order, pacing, or dialogue form as a template. I will change the response completely and use a new structure and dialogue pattern while keeping established scene facts and continuity intact.";
  return {
    user,
    assistant,
  };
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
    ["initiation/foreplay", vietnamese ? "Tiếp cận/Dạo đầu" : "Initiation/Foreplay"],
    ["tiếp cận/dạo đầu", vietnamese ? "Tiếp cận/Dạo đầu" : "Initiation/Foreplay"],
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
    [
      "pose/action/stimulation",
      vietnamese ? "Tư thế/Hành động/Kích thích" : "Pose/Action/Stimulation",
    ],
    [
      "tư thế/hành động/kích thích",
      vietnamese ? "Tư thế/Hành động/Kích thích" : "Pose/Action/Stimulation",
    ],
  ]);
  return body
    .trim()
    .split(/\r?\n/)
    .filter((source) => !/^\s*(?:Response structure|Bố cục phản hồi)\s*:/iu.test(source))
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
    /<\s{0,8}nsfw_nsfl_tracker\b[^>]*>([\s\S]*?)<\s{0,8}\/\s{0,8}nsfw_nsfl_tracker\s{0,8}>/gi,
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
