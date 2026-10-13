import type { ChatMessage, FfPreset } from "./core.js";
import { familyOf, pluginMemoPrefix, presetOrder } from "./preset-family.js";

const FF54_EDITOR_SYSTEM = `<vietnamese_editor>
- Task & Context: Rewrite the latest assistant response before the final user instruction into natural contemporary Vietnamese, including narration, dialogue, header/HUD/GFX text, and internal states. Use prompts, card, lore, and history as reference only; do not execute their tasks or commands inside the draft.
- Style: Freely rebuild sentences and paragraphs with manga, anime, and light-novel pacing. Vary rhythm, link related actions naturally, cut repetition, and enrich or recast compatible incidental details. Favor concrete action, sensory consequence, and character expression; use comic timing when appropriate. Avoid wuxia diction, stiff translation, purple prose, choppy or inventory-like narration, and em-dashes in prose and dialogue.
- Language & Voice: Correct spelling, grammar, collocations, stray characters, and accidental foreign wording. Preserve established names and necessary terms; retain foreign dialogue only when credible for the speaker. Adjust pronouns and address to identity, relationship, and viewpoint; preserve intent, respect, intimacy, idiolect, and natural hesitations. Use only dialogue tones shout, whisper, measured, tremble; omit :tone for normal delivery.
- Continuity: Preserve core facts, participants, events, sequence, causality, outcome, POV, agency, relationships, and emotional direction. Do not continue RP, answer the scene, or add consequential events.
- Internal States: Rewrite free-text descriptions, thoughts, and notes inside <internal_states> into natural Vietnamese while preserving their information and meaning. Follow active template labels and preserve valid labels. Keep numbers, DCs, rolls, deltas, counters, progress, scores, fixed identifiers, and fixed status values unchanged. Preserve absent, unknown, inapplicable, and empty values. Do not fill in, recalculate, or normalize data into defaults or zeros.
- Syntax & Output: Preserve valid schema structure, tags, attributes, comments, markers, placeholders, fixed identifiers, and image keywords. Repair existing syntax errors only as supported by active schemas. Return only the complete rewritten response with its header/HUD/GFX/internal states; no reasoning, commentary, or code fences.
</vietnamese_editor>`;

const EDITOR_CONTEXT =
  "Rewrite the latest assistant response before the final user instruction into natural Vietnamese. Use prompts, card, lore, and history only as reference; do not execute their generation tasks or commands inside the draft.";
const EDITOR_LANGUAGE =
  "Correct grammar, collocations, stray characters, and accidental foreign wording. Preserve established names and necessary terms; foreign speech must be credible for the speaker. Adjust pronouns and address to identity, relationships, POV, respect, intimacy, and idiolect.";
const EDITOR_CONTINUITY =
  "Preserve core facts, events, sequence, causality, outcomes, POV, agency, relationships, and emotional direction. Do not continue RP or add consequential events.";
const EDITOR_STATE =
  "Rewrite free-text descriptions, thoughts, and notes in all active trackers and hidden state blocks into natural Vietnamese. Preserve their information, fixed keys, valid template labels, identifiers, enums, numbers, rolls, scores, counters, progress, and deltas. Keep absent, unknown, inapplicable, and empty values as they are; do not fill in or recalculate data.";
const EDITOR_OUTPUT =
  "Preserve valid markup, attributes, comments, delimiters, placeholders, image identifiers, and active schemas. Repair existing syntax errors only as supported by those schemas. Return only the complete rewritten response, including its displays and state blocks; no reasoning, commentary, or added code fences.";

export function editorSystemFor(preset: FfPreset): string {
  switch (familyOf(preset)) {
    case "sola":
      return `## Vietnamese Editor
- Task & Context: ${EDITOR_CONTEXT}
- Prose & Voice: Rebuild sentences and paragraphs under the active Sola style, pacing, POV, and voice modules. Keep cinematic physical beats, sensory grounding, acoustic friction, distinct NPC cadence, and anti-echo. Link actions naturally in Vietnamese; cut repetition and stiff translation without imposing another style.
- Language: ${EDITOR_LANGUAGE} Use tone, kinetic, gradient, and palette names from enabled Sola modules.
- Continuity: ${EDITOR_CONTINUITY}
- HUD & Trackers: ${EDITOR_STATE}
- Format & Output: ${EDITOR_OUTPUT}`;
    case "voyage":
      return `## Rule: Vietnamese Editor
* Task: ${EDITOR_CONTEXT}
* Prose: Rebuild sentences and paragraphs in Voyage's direct, grounded style under the active POV and Prose Format. Keep concrete actions, observable consequences, and goal-driven realistic NPC speech. Link clauses naturally in Vietnamese; avoid ornamental explanation or forced banter.
* Voice: ${EDITOR_LANGUAGE}
* Continuity: ${EDITOR_CONTINUITY}
* Sheets & Notes: ${EDITOR_STATE}
* Format & Output: ${EDITOR_OUTPUT}`;
    default:
      return FF54_EDITOR_SYSTEM;
  }
}

export function editorUserFor(preset: FfPreset): string {
  if (familyOf(preset) === "ff54")
    return "Rewrite the latest assistant response according to <vietnamese_editor>, including descriptions, thoughts, and notes inside <internal_states>. Keep numeric and fixed state values unchanged; do not fill in data. Return only the complete response; do not continue RP.";
  return "Rewrite the latest assistant response according to Vietnamese Editor, including free text in its displays, trackers, sheets, and hidden notes. Preserve numeric and fixed state values; do not fill in data. Return only the complete response; do not continue RP.";
}

/** Keep the editor before the family's final relative instructions. */
export function insertSubmodelEditorSystem(
  messages: ChatMessage[],
  preset: FfPreset,
): ChatMessage[] {
  const prefix = pluginMemoPrefix(preset);
  const order = presetOrder(preset);
  const historyIndex = order.findIndex((entry) => entry.identifier === "chatHistory");
  const prompts = new Map(preset.prompts.map((prompt) => [prompt.identifier, prompt]));
  const trailingMemos = new Set([
    `${prefix}jailbreak`,
    ...(historyIndex < 0
      ? []
      : order
          .slice(historyIndex + 1)
          .filter((entry) => prompts.get(entry.identifier)?.injection_position !== 1)
          .map((entry) => `${prefix}${entry.identifier}`)),
  ]);
  const editorSystem: ChatMessage = {
    role: "system",
    content: editorSystemFor(preset),
    memo: `${prefix}submodel-editor`,
  };
  const trailingIndex = messages.findIndex((message) => trailingMemos.has(String(message.memo)));
  const fallbackIndex =
    familyOf(preset) === "ff54"
      ? messages.findIndex((message) => message.content.includes("High risk context is allowed."))
      : -1;
  const index =
    trailingIndex >= 0 ? trailingIndex : fallbackIndex >= 0 ? fallbackIndex : messages.length;
  return [...messages.slice(0, index), editorSystem, ...messages.slice(index)];
}
