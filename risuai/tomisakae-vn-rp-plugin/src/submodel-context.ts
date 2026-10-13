import type { ChatMessage } from "./core.js";

const MEMORY_MEMOS = new Set(["supaMemory", "hypaMemory"]);
const MEMORY_BLOCK =
  /(?:\[Roleplay Summary\]\s*)?<Past Events Summary>[\s\S]*?<\/Past Events Summary>/gi;

/** Keep host prompts and two prior exchanges, without restoring saved history. */
export function buildEditorReferenceMessages(
  request: ChatMessage[],
  responseId?: unknown,
  historyMessageIds?: readonly string[],
): ChatMessage[] {
  const messages = structuredClone(request).flatMap((message) => {
    if (MEMORY_MEMOS.has(String(message.memo ?? ""))) return [];
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
  const assistantPositions = history.flatMap((message, position) =>
    message.role === "assistant" ? [position] : [],
  );
  let start = assistantPositions.at(-2) ?? assistantPositions.at(-1) ?? history.length - 1;
  if (assistantPositions.length > 0) {
    // Include the user input that produced the earliest retained AI response.
    while (start > 0 && history[start - 1]!.role === "user") start -= 1;
  }
  const removed = new Set(history.slice(0, Math.max(0, start)).map((message) => message.index));
  return messages.filter((_message, index) => !removed.has(index));
}
