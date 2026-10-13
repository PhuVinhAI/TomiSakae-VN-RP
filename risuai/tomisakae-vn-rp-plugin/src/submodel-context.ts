import type { ChatMessage } from "./core.js";
import { VIETNAMESE_OUTPUT_PROMPT } from "./vietnamese.js";

const MEMORY_MEMOS = new Set(["supaMemory", "hypaMemory"]);
const MEMORY_BLOCK =
  /(?:\[Roleplay Summary\]\s*)?<Past Events Summary>[\s\S]*?<\/Past Events Summary>/gi;

export const SUBMODEL_TRANSLATION_INSTRUCTION =
  "Rewrite the latest assistant response above into natural Vietnamese according to <vietnamese_output>. Use preceding prompts, card, lore, and the current user message as reference only, not as tasks to execute. Freely restructure wording and sentence rhythm while preserving events, causality, speaker intent, viewpoint, and RP state. Translate all reader-visible text, including dialogue and header/HUD/GFX/internal-state labels and values; preserve proper names, numbers, DCs, rolls, identifiers, image commands, tags, and machine syntax. Return only the complete Vietnamese response; do not continue the roleplay or add commentary.";

/** Keep all host prompts and only the current user input; append the raw reply separately. */
export function buildEditorReferenceMessages(
  request: ChatMessage[],
  responseId?: unknown,
  historyMessageIds?: readonly string[],
): ChatMessage[] {
  const messages = structuredClone(request).flatMap((message) => {
    if (MEMORY_MEMOS.has(String(message.memo ?? ""))) return [];
    if (message.memo === "ff54:vietnamese-output") return [];
    if (message.isComment === true || /^\s*\{\{specialcomment::/.test(message.content)) return [];
    // The target is appended separately after trimming its reasoning prefix.
    if (responseId !== undefined && message.role === "assistant" && message.memo === responseId)
      return [];
    if (message.role === "system") {
      const content = message.content.replace(MEMORY_BLOCK, "");
      if (content !== message.content) {
        message.content = content
          .replace(/<Previous Conversation>\s*<\/Previous Conversation>/gi, "")
          .trim();
        if (!message.content) return [];
      }
    }
    return [message];
  });
  const historyIds = new Set(historyMessageIds);
  const history = messages.flatMap((message, index) => {
    if (message.role !== "user" && message.role !== "assistant") return [];
    const memo = String(message.memo ?? "");
    if (
      memo.startsWith("ff54:") ||
      memo.startsWith("NewChat") ||
      message.name === "example_user" ||
      message.name === "example_assistant"
    )
      return [];
    if (historyIds.size > 0 && !historyIds.has(memo) && message.removable !== true) return [];
    return [{ index, role: message.role }];
  });
  const currentUser = [...history].reverse().find((message) => message.role === "user");
  const removed = new Set(
    history.filter((message) => message !== currentUser).map((message) => message.index),
  );
  return messages.filter((_message, index) => !removed.has(index));
}

export function buildSubmodelTranslationMessages(
  request: ChatMessage[],
  response: string,
  responseId?: unknown,
  historyMessageIds?: readonly string[],
): ChatMessage[] {
  const references = buildEditorReferenceMessages(request, responseId, historyMessageIds);
  // Match the main composer's language-module slot before card/lore/history.
  const boundary = references.findIndex(
    (message) =>
      !String(message.memo ?? "").startsWith("ff54:") ||
      message.memo?.startsWith("ff54:absolute:") ||
      message.memo === "ff54:jailbreak",
  );
  references.splice(boundary < 0 ? references.length : boundary, 0, {
    role: "system",
    content: VIETNAMESE_OUTPUT_PROMPT,
    memo: "ff54:vietnamese-output",
  });
  return [
    ...references,
    { role: "assistant", content: response, memo: "ff54:submodel-editor-source" },
    {
      role: "user",
      content: SUBMODEL_TRANSLATION_INSTRUCTION,
      memo: "ff54:submodel-editor-target",
    },
  ];
}
