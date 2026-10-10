export interface CompletionMonitorApi {
  getRootDocument(): Promise<{
    querySelector(selector: string): Promise<unknown>;
  } | null>;
  getCurrentCharacterIndex(): Promise<number>;
  getCurrentChatIndex(): Promise<number>;
  getChatFromIndex(character: number, chat: number): Promise<{ id?: unknown } | null>;
}

interface PendingCompletion {
  characterIndex: number;
  chatIndex: number;
  chatId: unknown;
  onIncomplete: () => void;
}

/** The output listener handles success. PocketRisu exposes no request-error listener,
 * so observe the current chat's generation control for a terminal run without output. */
export function createCompletionMonitor(api: CompletionMonitorApi) {
  const pending = new Map<string, PendingCompletion>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  const schedule = () => {
    if (disposed || timer !== undefined || !pending.size) return;
    timer = setTimeout(() => {
      timer = undefined;
      void check().finally(schedule);
    }, 750);
  };
  const check = async () => {
    try {
      const characterIndex = await api.getCurrentCharacterIndex();
      const chatIndex = await api.getCurrentChatIndex();
      const key = `${characterIndex}:${chatIndex}`;
      const entry = pending.get(key);
      if (!entry) return;
      const root = await api.getRootDocument();
      if (!root || (await root.querySelector('button[aria-labelledby="cancel"]'))) return;
      if (!(await root.querySelector(".button-icon-send"))) return;
      // Read history only after generation ends, never on each streaming tick.
      const chat = await api.getChatFromIndex(characterIndex, chatIndex);
      if (chat?.id !== entry.chatId) {
        if (pending.get(key) === entry) pending.delete(key);
        return;
      }
      // Recheck selection after IPC; switching cards is not a completed request.
      if (
        (await api.getCurrentCharacterIndex()) !== characterIndex ||
        (await api.getCurrentChatIndex()) !== chatIndex ||
        pending.get(key) !== entry ||
        disposed
      )
        return;
      pending.delete(key);
      entry.onIncomplete();
    } catch {
      // A missing/closed UI must never interfere with generation.
    }
  };
  return {
    start(key: string, entry: PendingCompletion) {
      pending.set(key, entry);
      schedule();
    },
    finish(key: string) {
      pending.delete(key);
      if (!pending.size && timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    },
    dispose() {
      disposed = true;
      pending.clear();
      if (timer !== undefined) clearTimeout(timer);
    },
  };
}
