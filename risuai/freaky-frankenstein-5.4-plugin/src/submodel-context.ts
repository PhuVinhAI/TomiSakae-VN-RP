import type { ChatMessage } from "./core.js";

/** Complete the captured main history without repeating messages or the edit target. */
export function buildEditorReferenceMessages(
  request: ChatMessage[],
  history: ChatMessage[],
  capturedHistory: ChatMessage[],
  responseId: unknown,
): ChatMessage[] {
  const historyIndices = new Map(
    history.flatMap((message, index) => (message.memo ? [[message.memo, index] as const] : [])),
  );
  const capturedIds = new Set(capturedHistory.flatMap((message) => message.memo ?? []));
  const result: ChatMessage[] = [];
  let nextHistory = 0;
  let historyEnd: number | undefined;

  for (const message of structuredClone(request)) {
    if (message.memo && message.memo === responseId) continue;
    let index = message.memo ? historyIndices.get(message.memo) : undefined;
    if (index === undefined && !message.memo) {
      const found = history.findIndex(
        (entry, entryIndex) =>
          entryIndex >= nextHistory &&
          entry.role === message.role &&
          entry.content === message.content,
      );
      if (found >= 0) index = found;
    }
    if (index === undefined) {
      // A captured message no longer in history may be the regenerated edit target.
      if (message.memo && capturedIds.has(message.memo)) continue;
      result.push(message);
      continue;
    }
    if (index < nextHistory) continue;
    while (nextHistory < index) result.push(structuredClone(history[nextHistory++]!));
    result.push(message);
    nextHistory = index + 1;
    historyEnd = result.length;
  }
  result.splice(historyEnd ?? result.length, 0, ...structuredClone(history.slice(nextHistory)));
  return result;
}
