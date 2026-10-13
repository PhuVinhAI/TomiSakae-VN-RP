import type { FfRegexScript } from "./core.js";

export const SOLA_HEADER_SAVER_ID = "vn-rp-sola-scene-header-saver";

/** Header cleanup applies only to request copies, never saved history. */
export const SOLA_HEADER_SAVER: FfRegexScript = {
  id: SOLA_HEADER_SAVER_ID,
  scriptName: "Sola Saver: Scene Header",
  findRegex: "/<scene_header\\b(?:\"[^\"]*\"|'[^']*'|[^'\">])*\\/?>/gi",
  replaceString: "",
  placement: [2],
  promptOnly: true,
  markdownOnly: false,
  disabled: false,
  minDepth: 4,
};

export interface SolaHistoryRemoval {
  offset: number;
  text: string;
}

export interface SolaHistorySnapshot {
  visible: string;
  removals: SolaHistoryRemoval[];
}

/** Snapshots follow messages into branches and stay separate for each swipe. */
export type SolaHistoryArchive = Record<string, SolaHistorySnapshot>;

export function solaHistorySwipeKey(swipeId: unknown): string {
  return typeof swipeId === "number" && Number.isInteger(swipeId) && swipeId >= 0
    ? `swipe:${swipeId}`
    : "main";
}

/** Undo deletions in reverse order, including savers nested inside a HUD. */
export function restoreSolaHistoryContent(
  content: string,
  snapshot: SolaHistorySnapshot | undefined,
): string {
  // A different visible body is a real edit; never replace it with an old draft.
  if (!snapshot || content !== snapshot.visible) return content;
  let restored = content;
  for (const removal of [...snapshot.removals].reverse()) {
    restored = restored.slice(0, removal.offset) + removal.text + restored.slice(removal.offset);
  }
  return restored;
}
