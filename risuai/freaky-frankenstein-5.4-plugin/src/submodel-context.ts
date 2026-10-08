import type { ChatMessage } from "./core.js";

/** Clone the request already cut by RisuAI without restoring or removing history. */
export function buildEditorReferenceMessages(
  request: ChatMessage[],
  _responseId?: unknown,
): ChatMessage[] {
  return structuredClone(request);
}
