import type { FfRegexScript } from "./core.js";

const GM_MARKER = String.raw`<!--\s*GM\s*-->`;
const PROTECTED_COMMENT = String.raw`<!--(?!\s*GM\s*-->)`;
const TAGGED_REASONING = String.raw`(?:<\s{0,8}(think|thinking|thought|thoughts|reasoning|internal_monologue|internal\s+monologue)\b[^>]*>([\s\S]*?)<\s{0,8}\/\s{0,8}\1\s{0,8}>|###\s{0,8}(?:Internal Monologue|Reasoning|Thoughts?|Thinking)\s{0,8}\n?([\s\S]*?)###\s{0,8}(?:Response|Output|Narrative|Final Answer)\s{0,8})`;
const REASONING_END = String.raw`(?:<\s{0,8}\/\s{0,8}(?:think|thinking|thought|thoughts|reasoning|internal_monologue|internal\s+monologue)\s{0,8}>|###\s{0,8}(?:Response|Output|Narrative|Final Answer)\s{0,8})`;
// Match through repeated GM markers in reasoning to the last boundary.
// Other XML comments remain protected character/location sheets and GM notes.
const REASONING = String.raw`(?:^\s*((?!${PROTECTED_COMMENT})\S(?:(?!${PROTECTED_COMMENT})[\s\S])*)\s*(?=${GM_MARKER})(?!(?:(?!${PROTECTED_COMMENT})[\s\S])*${REASONING_END})|${TAGGED_REASONING.replaceAll("\\1", "\\2")}|(<!--[\s\S]*?-->))`;

export const VOYAGE_REASONING_DISPLAY_ID = "vn-rp-voyage-reasoning-display";
export const VOYAGE_REASONING_DELETE_ID = "vn-rp-voyage-reasoning-delete";
export const VOYAGE_GM_START_RULE =
  "Start every GM reply with `<!-- GM -->` on its own line, after reasoning.";

export function addVoyageReasoningBoundary(content: string, recallEnabled: boolean): string {
  if (recallEnabled)
    return content.replace(
      "The next reply must adhere to all `## Rule:` Rules.",
      `The next reply must adhere to all \`## Rule:\` Rules.\n${VOYAGE_GM_START_RULE}`,
    );
  if (content.startsWith('# "The Unknown World" TTRPG\n'))
    return content.replace(
      '# "The Unknown World" TTRPG\n',
      `# "The Unknown World" TTRPG\n${VOYAGE_GM_START_RULE}\n`,
    );
  return content;
}

export const VOYAGE_REASONING_SCRIPTS: FfRegexScript[] = [
  {
    id: VOYAGE_REASONING_DELETE_ID,
    scriptName: "Voyage Reasoning: Delete",
    findRegex: `/${REASONING}/gi`,
    replaceString: "$5",
    placement: [2],
    promptOnly: true,
    disabled: false,
  },
  {
    id: VOYAGE_REASONING_DISPLAY_ID,
    scriptName: "Voyage Reasoning: Display",
    findRegex: `/${REASONING}/gi`,
    replaceString: "$1$3$4$5",
    placement: [2],
    markdownOnly: true,
    disabled: false,
  },
];

export function renderVoyageReasoning(text: string, vietnamese: boolean): string {
  if (/^<!--(?:(?!-->)[\s\S])*-->$/.test(text)) return text;
  const body = text
    .replace(new RegExp(TAGGED_REASONING, "gi"), "$2$3")
    .trim()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return `<details style="background:rgba(147,51,234,.08);border:1px solid rgba(147,51,234,.3);border-left:4px solid #a855f7;border-radius:8px;margin:10px 0;padding:10px 14px;font-size:.92em"><summary style="cursor:pointer;font-weight:bold;color:#c084fc">💭 ${vietnamese ? "Suy luận" : "Reasoning"}</summary><div style="white-space:pre-wrap;overflow-wrap:anywhere">${body}</div></details>\n\n`;
}

/** Retain the main reply's prefix separately from the RP sent to Submodel. */
export function splitVoyageReasoning(text: string): { prefix: string; response: string } {
  const reasoning = new RegExp(REASONING, "gi");
  let response = text;
  while (true) {
    reasoning.lastIndex = 0;
    const match = reasoning.exec(response);
    if (!match || match[5] !== undefined || response.slice(0, match.index).trim()) break;
    response = response.slice(match.index + match[0].length).trimStart();
  }
  return { prefix: text.slice(0, text.length - response.length), response };
}
