import type { ChatMessage } from "./core.js";

/** Clone the request already cut by RisuAI without restoring any older history. */
export function buildEditorReferenceMessages(
  request: ChatMessage[],
  responseId: unknown,
): ChatMessage[] {
  return structuredClone(request).filter((message) => !responseId || message.memo !== responseId);
}
