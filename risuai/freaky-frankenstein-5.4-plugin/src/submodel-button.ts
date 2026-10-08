export interface SafeElement {
  querySelector(selector: string): Promise<SafeElement | null>;
  getParent(): Promise<SafeElement | null>;
  prepend(child: SafeElement): Promise<void>;
  remove(): Promise<void>;
  setClassName(value: string): Promise<void>;
  setInnerHTML(value: string): Promise<void>;
  addEventListener(
    type: string,
    callback: (event: { key?: string }) => void | Promise<void>,
  ): Promise<string>;
  removeEventListener(type: string, id: string): Promise<void>;
}

interface SafeDocument extends SafeElement {
  createElement(tag: string): Promise<SafeElement>;
}

interface SafeObserver {
  observe(element: SafeElement, options: { childList: boolean; subtree: boolean }): Promise<void>;
  disconnect(): Promise<void>;
}

export interface RewriteButtonTarget {
  key: string;
  characterIndex: number;
  chatIndex: number;
  messageIndex: number;
  messageId: unknown;
  chatId: unknown;
  available: boolean;
  busy?: boolean;
}

export interface RewriteButtonController {
  refresh(): Promise<void>;
  dispose(): Promise<void>;
}

export interface RewriteButtonApi {
  getRootDocument(): Promise<SafeDocument | null>;
  createMutationObserver(callback: () => void): Promise<SafeObserver>;
}

export async function createRewriteButton(
  api: RewriteButtonApi,
  getTarget: () => Promise<RewriteButtonTarget | undefined>,
  rewrite: (target: RewriteButtonTarget) => Promise<void>,
  cancel: (target: RewriteButtonTarget) => void,
): Promise<RewriteButtonController | undefined> {
  const root = await api.getRootDocument();
  if (!root) return undefined;
  const marker = ".ff54-submodel-rewrite";
  let control: SafeElement | undefined;
  let current: RewriteButtonTarget | undefined;
  let busy = false;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let refreshInFlight: Promise<void> | undefined;

  const paint = async () => {
    if (!control) return;
    const rewriting = busy || current?.busy;
    const title = rewriting
      ? "Ngắt biên tập bằng Submodel"
      : current?.available
        ? "Viết lại tiếng Việt bằng Submodel"
        : "Hãy tạo phản hồi mới để plugin lấy đầy đủ context trước khi viết lại";
    // SafeElement listeners receive document-wide events without a target.
    // A native checkbox records activation until IPC reads it, preventing
    // unrelated clicks from calling the model. It is displayed as an icon button.
    await control.setInnerHTML(
      `<label title="${title}" style="position:relative;display:inline-flex;align-items:center;justify-content:center;min-width:28px;min-height:28px;border-radius:4px;opacity:${!rewriting && !current?.available ? ".5" : "1"};cursor:${rewriting || current?.available ? "pointer" : "not-allowed"}"><input type="checkbox" role="button" aria-label="${title}" ${!rewriting && !current?.available ? "disabled" : ""} style="position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:inherit"><span aria-hidden="true">${rewriting ? "⏹" : "✍️"}</span></label>`,
    );
  };

  const refresh = (): Promise<void> => {
    if (disposed) return Promise.resolve();
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      const target = await getTarget();
      if (disposed) return;
      if (!target) {
        await control?.remove();
        control = undefined;
        current = undefined;
        return;
      }
      const row = await root.querySelector(`.risu-chat[data-chat-index="${target.messageIndex}"]`);
      const toolbar = await (await row?.querySelector(".button-icon-edit"))?.getParent();
      if (!toolbar) {
        await control?.remove();
        control = undefined;
        current = undefined;
        return;
      }
      if (
        current?.key === target.key &&
        current.available === target.available &&
        current.busy === target.busy &&
        (await toolbar.querySelector(marker))
      )
        return;
      await control?.remove();
      control = await root.createElement("span");
      await control.setClassName("ff54-submodel-rewrite flex items-center shrink-0");
      current = target;
      await paint();
      if (disposed) return;
      await toolbar.prepend(control);
    })().finally(() => {
      refreshInFlight = undefined;
    });
    return refreshInFlight;
  };

  const schedule = () => {
    if (disposed || timer !== undefined) return;
    timer = setTimeout(() => {
      timer = undefined;
      void (async () => {
        // Text streaming changes the DOM repeatedly. When our toolbar is
        // still attached to the same message, keep it without rereading history.
        if (current) {
          const attached = await root.querySelector(
            `.risu-chat[data-chat-index="${current.messageIndex}"][data-chat-id=${JSON.stringify(String(current.messageId ?? ""))}] ${marker}`,
          );
          if (attached) return;
        }
        await refresh();
      })().catch((error) => console.warn("[FF5.4] Could not refresh rewrite button.", error));
    }, 120);
  };

  const activate = async (keyboard = false) => {
    if (disposed || !current) return;
    const activated = await root.querySelector(`${marker} input:${keyboard ? "focus" : "checked"}`);
    if (!activated || disposed) return;
    const target = current;
    if (busy || target.busy) {
      cancel(target);
      return;
    }
    if (!target.available) return;
    busy = true;
    try {
      await paint();
      await rewrite(target);
    } finally {
      busy = false;
      if (!disposed) {
        await paint();
        await refresh();
      }
    }
  };

  const clickId = await root.addEventListener("click", async () => {
    await activate().catch((error) => console.warn("[FF5.4] Manual rewrite failed.", error));
  });
  const keyId = await root.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      await activate(true).catch((error) => console.warn("[FF5.4] Manual rewrite failed.", error));
    }
  });
  const observer = await api.createMutationObserver(schedule);
  await observer.observe(root, { childList: true, subtree: true });
  await refresh();
  return {
    refresh,
    async dispose() {
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
      await observer.disconnect();
      await root.removeEventListener("click", clickId);
      await root.removeEventListener("keydown", keyId);
      await control?.remove();
    },
  };
}
