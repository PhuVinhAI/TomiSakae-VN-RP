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

const SAVER_TAGS: Readonly<Record<string, string>> = {
  "Sola Saver: Feeling Engine": "fengine",
  "Sola Saver: Thought Engine": "thought_engine",
  "Sola Saver: Wardrobe & Inventory": "wardrobe|inventory",
  "Sola Saver: Scene Cast & Dossier": "scene_cast|scene_state",
  "Sola Saver: Bond Radar": "bond",
  "Sola Saver: Calendar": "date",
  "Sola Saver: Director Notebook": "story_notes",
  "Sola Saver: Character Trait Ledger": "solatag",
  "Sola Saver: Character Matrix": "char_matrix",
  "Sola Saver: Tempo": "tempo",
  "Sola Saver: Showrunner HUD": "sola_hud",
  "Sola Saver: Master Telemetry (All Trackers)":
    "fengine|wardrobe|inventory|scene_cast|scene_state|cabinet|arrow|omen|date|story_notes|solatag|char_matrix|nsfw_ban_list|sex_tracker",
};
const TRACKER_TAGS =
  "sola_hud|fengine|thought_engine|wardrobe|inventory|scene_cast|scene_state|bond|date|story_notes|solatag|char_matrix|tempo|cabinet|arrow|omen|nsfw_ban_list|sex_tracker|scene_header";

/** Keep native saver scope/depth; stop a broken block at the next boundary. */
export function adaptSolaSaver(script: FfRegexScript): FfRegexScript {
  const tags = SAVER_TAGS[script.scriptName ?? ""];
  if (tags) {
    // HUDs contain other trackers; only another HUD/header ends a broken HUD.
    const boundary = tags === "sola_hud" ? "sola_hud|scene_header" : TRACKER_TAGS;
    return {
      ...script,
      findRegex: String.raw`/<\s{0,8}(${tags})\b(?:"[^"]*"|'[^']*'|(?!\/\s*>)[^'">])*(?:\/\s*>|>[\s\S]*?(?:<\s{0,8}\/\s{0,8}\1\s{0,8}>|(?=<\s{0,8}\/?\s{0,8}(?:${boundary})\b|<!--\s{0,8}HTML_(?:START|END)\s{0,8}-->)|$))/gi`,
    };
  }
  if (script.scriptName === "Sola Saver: Immersive Props (HTML Blocks)") {
    return {
      ...script,
      findRegex:
        "/<!--\\s{0,8}HTML_START\\s{0,8}-->(?![\\s\\S]{0,200}?<\\s{0,8}sola_hud\\b)[\\s\\S]*?(?:<!--\\s{0,8}HTML_END\\s{0,8}-->|(?=<\\s{0,8}(?:sola_hud|scene_header)\\b|<!--\\s{0,8}HTML_START\\s{0,8}-->)|$)/gi",
    };
  }
  return script;
}

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
