import type { FfRegexScript } from "./core.js";

const TAGGED_REASONING = String.raw`(?:<\s{0,8}(think|thinking|thought|thoughts|reasoning|internal_monologue|internal\s+monologue|storyreview)\b[^>]*>([\s\S]*?)<\s{0,8}\/\s{0,8}\1\s{0,8}>|###\s{0,8}(?:Internal Monologue|Reasoning|Thoughts?|Thinking|Story Review)\s{0,8}\n?([\s\S]*?)###\s{0,8}(?:Response|Output|Narrative|Final Answer)\s{0,8})`;
// Older Sola replies may have real prose before a mid-scene header. Require
// a planning cue before treating an untagged opening as model reasoning.
const UNTAGGED_REASONING = String.raw`^\s*((?=(?:#{1,6}\s*)?(?:Let me\b|Let's\b|I (?:need|must|should|will|have to)\b|(?:[-*]\s*)?Task\s*\d+\b|Story Review\b|NPC Check\b|Narrative Check\b|(?:\d+[.)]\s*)?Gamestate\b|(?:Thoughts?|Thinking|Reasoning|Internal Monologue)\s*:))[\s\S]+?)\s*(?=<scene_header\b)`;

const REASONING_DETAILS =
  '<details style="background:rgba(147,51,234,.08);border:1px solid rgba(147,51,234,.3);border-left:4px solid #a855f7;border-radius:8px;margin:10px 0;padding:10px 14px;font-size:.92em"><summary style="cursor:pointer;font-weight:bold;color:#c084fc">💭 Reasoning</summary>\n\n';

export const SOLA_REASONING_SCRIPTS: FfRegexScript[] = [
  {
    id: "vn-rp-sola-reasoning-delete-tagged",
    scriptName: "Sola Reasoning: Delete Tagged",
    findRegex: `/${TAGGED_REASONING}/gi`,
    replaceString: "",
    placement: [2, 1],
    promptOnly: true,
    disabled: false,
  },
  {
    id: "vn-rp-sola-reasoning-display-tagged",
    scriptName: "Sola Reasoning: Display Tagged",
    findRegex: `/${TAGGED_REASONING}/gi`,
    replaceString: `${REASONING_DETAILS}$2$3\n</details>`,
    placement: [2],
    markdownOnly: true,
    disabled: false,
  },
  {
    id: "vn-rp-sola-reasoning-delete-untagged",
    scriptName: "Sola Reasoning: Delete Untagged",
    findRegex: `/${UNTAGGED_REASONING}/i`,
    replaceString: "",
    placement: [2],
    promptOnly: true,
    disabled: false,
  },
  {
    id: "vn-rp-sola-reasoning-display-untagged",
    scriptName: "Sola Reasoning: Display Untagged",
    findRegex: `/${UNTAGGED_REASONING}/i`,
    replaceString: `${REASONING_DETAILS}$1\n</details>\n\n`,
    placement: [2],
    markdownOnly: true,
    disabled: false,
  },
];

/** Send only RP to the editor, retaining the original prefix for its swipe. */
export function splitSolaReasoning(text: string): { prefix: string; response: string } {
  const tagged = new RegExp(TAGGED_REASONING, "gi");
  let response = text;
  while (true) {
    tagged.lastIndex = 0;
    const match = tagged.exec(response);
    if (!match || response.slice(0, match.index).trim()) break;
    response = response.slice(match.index + match[0].length).trimStart();
  }
  response = response.replace(new RegExp(UNTAGGED_REASONING, "i"), "");
  return { prefix: text.slice(0, text.length - response.length), response };
}
