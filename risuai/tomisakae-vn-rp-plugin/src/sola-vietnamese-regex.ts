import { SOLA_VIETNAMESE_LABELS } from "./vietnamese.js";

const LEGACY_TRACKER_LABELS: ReadonlyArray<readonly [string, string]> = [
  ["NPC trong cảnh", "NPC làm nền"],
  ["Trở lực", "Hệ quả"],
  ["Thời gian đã trôi", "Đã trôi qua"],
  ["Vẻ ngoài", "Vỏ bọc"],
];
const TRACKER_DISPLAY_LABELS = [...SOLA_VIETNAMESE_LABELS, ...LEGACY_TRACKER_LABELS];

const DUSK_TRIGGERS: ReadonlyArray<readonly [string, string]> = [
  [
    String.raw`dusk|sunset|twilight|sundown|evening|(?:0?[5-7]|1[7-9]):\d{2}\s*(?:pm|p\.m\.)`,
    String.raw`chạng vạng|hoàng hôn|chiều tà|buổi tối|1[7-9]:[0-5]\d(?:\s*CH)?|0?[5-7]:[0-5]\d\s*CH`,
  ],
  [
    "wind(?:y|s)?|gale|breeze|draft(?:y|s)?|gust(?:s|y)?|chill(?:y)?|dust(?:y)?|drift(?:ing|s)?",
    "gió|lạnh|bụi",
  ],
  [
    "fire|smoke|smoky|ash(?:es)?|smolder(?:ing)?|flame(?:s)?|forge|hearth|warm|heat|still|quiet|calm",
    "lửa|khói|tro|âm ỉ|lò rèn|bếp lửa|ấm|nóng|tĩnh lặng|yên tĩnh|êm đềm",
  ],
];

const DISPLAY_TEXT: ReadonlyArray<readonly [string, string]> = [
  ["💭 Reasoning", "💭 Suy luận"],
  ["Co-Author Note", "Ghi chú đồng tác giả"],
  ["Feeling Engine Telemetry", "Chỉ số cảm xúc"],
  ["Bond & Chemistry Radar", "Quan hệ & sự hòa hợp"],
  ["Thought Cabinet", "Ngăn suy nghĩ"],
  ["Thought Engine", "Suy nghĩ nội tâm"],
  ["The Wind's Arrow", "Mũi tên của gió"],
  ["Chapter Break", "Chuyển chương"],
  ["Calendar & Chronology", "Lịch & thời gian"],
  ["Omen Deck", "Bộ bài điềm báo"],
  ["Wardrobe & Physical State", "Trang phục & thể trạng"],
  ["Carried Inventory & Gear", "Hành trang & trang bị"],
  ["Scene Cast & Local Facts", "Nhân vật & dữ kiện trong cảnh"],
  ["Scene State Dossier", "Hồ sơ trạng thái cảnh"],
  ["Director Notebook & Story Seeds", "Sổ tay đạo diễn & chi tiết gài"],
  ["Character Trait Ledger", "Đặc điểm nhân vật"],
  ["{{char}} Matrix & Persona Audit", "Ma trận {{char}} & kiểm tra tính cách"],
  ["(click to expand)", "(bấm để mở)"],
  ["SOLA SHOWRUNNER HUD", "HUD ĐIỀU PHỐI SOLA"],
  ["Tenderness", "Dịu dàng"],
  ["Fury", "Giận dữ"],
  ["Dread", "Lo sợ"],
  ["Yearning", "Khao khát"],
  ["BULLSEYE · Decisive Success", "TRÚNG ĐÍCH · Thành công dứt khoát"],
  ["GRAZING SHOT · Success with Complication", "TRÚNG SƯỢT · Thành công có trở ngại"],
  ["WIND DRIFT · Dramatic Failure", "GIÓ ĐẨY LỆCH · Thất bại"],
  ["DRIVE", "ĐẨY TIẾN"],
  ["STEADY", "ĐỀU NHỊP"],
  ["NEUTRAL", "GIỮ NHỊP"],
  ["Channel", "Kênh"],
  ["Connected · Encrypted", "Đã kết nối · Đã mã hóa"],
  ["SOLA CHRONICLE // SCENE ESTABLISHMENT", "BIÊN NIÊN SOLA // MỞ CẢNH"],
  ["LOCATION DOSSIER", "HỒ SƠ ĐỊA ĐIỂM"],
  ["PRIMARY SCENE ESTABLISHMENT", "THIẾT LẬP CẢNH"],
  ["Atmosphere:", "Bầu không khí:"],
];

/** Localize only known labels in tracker bodies on the render copy. */
export function adaptSolaTrackerLabelsForDisplay(input: string): string {
  input = input.replace(/<sola_hud\b[^>]*>/gi, (tag) =>
    tag.replace(
      /(\bdigest=")([^"]*)(")/i,
      (_match, prefix: string, digest: string, suffix: string) =>
        prefix +
        digest.replace(
          /(^|·)([ \t]*\[?)(NEUTRAL|STEADY|DRIVE)(\]?[ \t]*)(?=·|$)/g,
          (_value, separator: string, before: string, gear: string, after: string) =>
            separator + before + DISPLAY_TEXT.find(([source]) => source === gear)![1] + after,
        ) +
        suffix,
    ),
  );
  return input.replace(
    /<(story_notes|date|bond|fengine|thought_engine|char_matrix|arrow|omen|wardrobe|inventory|scene_cast|scene_state|cabinet|solatag)\b[^>]*>[\s\S]*?<\/\1>/gi,
    (block) =>
      block
        .replace(/^(<[^>]+>)(?!\n)/, "$1\n")
        .replace(
          /(^|\n)([^\n:=<>]+)([ \t]*[:=])/g,
          (match, start: string, label: string, delimiter: string) => {
            const trimmed = label.trim();
            const translated = TRACKER_DISPLAY_LABELS.find(([source]) => source === trimmed)?.[1];
            return translated
              ? `${start}${label.slice(0, label.length - label.trimStart().length)}${translated}${delimiter}`
              : match;
          },
        ),
  );
}

export function adaptSolaRegexForVietnamese(
  findRegex: string,
  replaceString: string,
  scriptName: string,
): { findRegex: string; replaceString: string } {
  if (scriptName.startsWith("Sola Scene: Header - Dynamic Dusk")) {
    for (const [source, vietnamese] of DUSK_TRIGGERS) {
      // JS word boundaries do not treat accented Vietnamese letters as word characters.
      findRegex = findRegex.replace(
        `\\b(?:${source})\\b`,
        `(?<![\\p{L}\\p{N}_])(?:${source}|${vietnamese})(?![\\p{L}\\p{N}_])`,
      );
    }
    findRegex = findRegex.replace(/\/([a-z]*)$/, (_match, flags: string) =>
      flags.includes("u") ? `/${flags}` : `/${flags}u`,
    );
  }
  for (const [source, replacement] of SOLA_VIETNAMESE_LABELS) {
    const legacy = LEGACY_TRACKER_LABELS.filter(([, label]) => label === replacement).map(
      ([label]) => label,
    );
    findRegex = findRegex.replaceAll(
      `${source}:`,
      `(?:${[source, replacement, ...legacy].join("|")}):`,
    );
  }
  if (scriptName === "Sola Meta: Field Label") {
    const labels = [
      ...new Set([
        ...SOLA_VIETNAMESE_LABELS.map(([, label]) => label),
        ...LEGACY_TRACKER_LABELS.map(([label]) => label),
      ]),
    ];
    findRegex = findRegex.replace("(Observable Facts|", `(${labels.join("|")}|Observable Facts|`);
  }
  if (scriptName === "Sola Meta: Subject Line") {
    findRegex =
      "/^\\[?([\\p{Lu}][\\p{L}\\p{M}'’\\-]{1,20}(?: [\\p{Lu}][\\p{L}\\p{M}'’\\-]{1,20}){0,3})\\]?:?[ \\t]{0,4}$/gmu";
  }
  if (scriptName.startsWith("Sola Chip: Bond Shift") || scriptName.startsWith("Sola Chip: Arrow")) {
    findRegex = findRegex
      .replaceAll("[^\\n]", "[^\\n<]")
      .replaceAll("[^\n]", "[^\n<]")
      .replaceAll("[^\n\\/]", "[^\n\\/<]");
  }
  findRegex = findRegex
    .replace("Dawn|Sunrise)", "Dawn|Sunrise|Bình minh|Rạng đông|Hửng sáng)")
    .replace(
      "Morning|Midday|Noon|Afternoon)",
      "Morning|Midday|Noon|Afternoon|Buổi sáng|Giữa trưa|Buổi trưa|Buổi chiều)",
    )
    .replace(
      "Dusk|Sunset|Twilight|Evening)",
      "Dusk|Sunset|Twilight|Evening|Chạng vạng|Hoàng hôn|Chiều tà|Buổi tối)",
    )
    .replace("Night|Midnight|Late Night)", "Night|Midnight|Late Night|Ban đêm|Nửa đêm|Đêm khuya)");

  // Keep markup, CSS, captures, and schema identifiers untouched.
  replaceString = replaceString.replace(
    /(^|>)([^<>]*)(?=<|$)/g,
    (_match, prefix: string, text: string) => {
      for (const [source, replacement] of DISPLAY_TEXT) text = text.replaceAll(source, replacement);
      return prefix + text.replace(/^Time:/, "Thời gian:");
    },
  );
  return { findRegex, replaceString };
}
