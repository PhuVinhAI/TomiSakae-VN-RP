import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { loadPresetSources } from "./build-tomisakae-vn-rp-plugin.js";
import {
  createDefaultSettings,
  type FfGlobalSettings,
  type FfRegexScript,
} from "../risuai/tomisakae-vn-rp-plugin/src/core.js";
import {
  adaptFamilyPrompt,
  familyRegexScripts,
  imageOptimizationFor,
  presetOrder,
  vietnameseOutputFor,
} from "../risuai/tomisakae-vn-rp-plugin/src/preset-family.js";
import {
  editorSystemFor,
  editorUserFor,
} from "../risuai/tomisakae-vn-rp-plugin/src/editor-prompts.js";
import {
  adaptDialogueColorRegex,
  adaptSolaDialogueColors,
  adaptSolaDialogueReplacement,
  type DialogueTheme,
} from "../risuai/tomisakae-vn-rp-plugin/src/dialogue-colors.js";
import { adaptSolaDisplayReplacement } from "../risuai/tomisakae-vn-rp-plugin/src/sola-display.js";
import { adaptSolaRegexForVietnamese } from "../risuai/tomisakae-vn-rp-plugin/src/sola-vietnamese-regex.js";
import { SOLA_DIALOGUE_COLORS } from "../risuai/tomisakae-vn-rp-plugin/src/dialogue-colors.js";
import {
  SOLA_VIETNAMESE_LABELS,
  SOLA_VIETNAMESE_REPLACEMENTS,
} from "../risuai/tomisakae-vn-rp-plugin/src/vietnamese.js";
import {
  familyChoiceGroups,
  familyHiddenPromptIds,
  familyPromptSections,
  familyRegexGroups,
  normalizeFamilyChoices,
} from "../risuai/tomisakae-vn-rp-plugin/src/family-ui.js";
import { promptUiCopy, regexUiCopy } from "../risuai/tomisakae-vn-rp-plugin/src/ui-vi.js";

const ROOT = "risuai/tomisakae-vn-rp-plugin";
const SOURCE = `${ROOT}/source/sola-v2-flame.json`;
const OUTPUT = `${ROOT}/comparison/SOLA_V2_FLAME_RAW_PLUGIN_REVIEW.md`;
const THEMES: DialogueTheme[] = [
  { type: "dark", background: "#282a36" },
  { type: "light", background: "#f5f5f5" },
];
const AUXILIARY_KEYS = [
  "send_if_empty",
  "impersonation_prompt",
  "new_chat_prompt",
  "new_group_chat_prompt",
  "new_example_chat_prompt",
  "continue_nudge_prompt",
  "group_nudge_prompt",
  "wi_format",
  "scenario_format",
  "personality_format",
  "assistant_prefill",
  "assistant_impersonation",
  "continue_postfix",
];

function hash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function code(content: string, language = "text"): string {
  const length = Math.max(4, ...[...content.matchAll(/~+/g)].map((m) => m[0].length + 1));
  const fence = "~".repeat(length);
  return `${fence}${language}\n${content}\n${fence}`;
}

function cell(content: unknown): string {
  return String(content ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("|", "&#124;")
    .replaceAll("`", "&#96;")
    .replaceAll("*", "&#42;")
    .replaceAll("_", "&#95;")
    .replaceAll("\r\n", "\n")
    .replaceAll("\n", "<br>");
}

function table(headers: string[], rows: unknown[][]): string {
  return [
    `| ${headers.map(cell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`),
  ].join("\n");
}

/** Show every changed line in adjacent columns, without abridging full payloads below. */
function changedLines(before: string, after: string): string {
  if (before === after) return "Không đổi.";
  const left = before.split("\n");
  const right = after.split("\n");
  // Large renderer templates may be one line; LCS also handles the short prompt modules.
  const counts = Array.from({ length: left.length + 1 }, () => new Uint32Array(right.length + 1));
  for (let i = left.length - 1; i >= 0; i -= 1)
    for (let j = right.length - 1; j >= 0; j -= 1)
      counts[i]![j] =
        left[i] === right[j]
          ? counts[i + 1]![j + 1]! + 1
          : Math.max(counts[i + 1]![j]!, counts[i]![j + 1]!);
  const rows: unknown[][] = [];
  let i = 0;
  let j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      i += 1;
      j += 1;
      continue;
    }
    const oldLines: string[] = [];
    const newLines: string[] = [];
    const oldStart = i + 1;
    const newStart = j + 1;
    while (i < left.length || j < right.length) {
      if (i < left.length && j < right.length && left[i] === right[j]) break;
      if (j >= right.length || (i < left.length && counts[i + 1]![j]! >= counts[i]![j + 1]!))
        oldLines.push(left[i++]!);
      else newLines.push(right[j++]!);
    }
    rows.push([
      oldLines.length ? `${oldStart}: ${oldLines.join("\n")}` : "(không có; thêm mới)",
      newLines.length ? `${newStart}: ${newLines.join("\n")}` : "(đã bỏ)",
    ]);
  }
  return table(["Cũ: dòng gốc", "Mới: dòng hiện tại"], rows);
}

function comparison(title: string, before: string, after: string, language = "text"): string {
  return [
    `### ${title}`,
    "",
    changedLines(before, after),
    "",
    "**Cũ — đầy đủ:**",
    "",
    code(before, language),
    "",
    "**Mới — đầy đủ:**",
    "",
    code(after, language),
  ].join("\n");
}

function serialized(script: FfRegexScript): string {
  return JSON.stringify(script, null, 2);
}

/** Match applyRegexScripts's template adaptations; captures/macros remain unexpanded. */
function runtimeRegex(
  script: FfRegexScript,
  vietnamese: boolean,
  theme?: DialogueTheme,
): FfRegexScript {
  const localized = vietnamese
    ? adaptSolaRegexForVietnamese(
        script.findRegex ?? "",
        script.replaceString ?? "",
        script.scriptName ?? "",
      )
    : { findRegex: script.findRegex ?? "", replaceString: script.replaceString ?? "" };
  let findRegex = localized.findRegex;
  let replaceString = localized.replaceString;
  if (script.markdownOnly) {
    findRegex = adaptDialogueColorRegex(findRegex);
    replaceString = adaptSolaDisplayReplacement(
      adaptSolaDialogueReplacement(replaceString, script.scriptName ?? "", theme),
      script.scriptName ?? "",
    ).replace(
      '<span style="color:$1;',
      '<span style="color:$1;--FontColorStandard:$1;--FontColorItalic:$1;--FontColorBold:$1;--FontColorItalicBold:$1;--FontColorQuote1:$1;--FontColorQuote2:$1;',
    );
  }
  return { ...script, findRegex, replaceString };
}

function status(value: boolean | undefined): string {
  return value === undefined ? "Ngoài thứ tự đang dùng" : value ? "BẬT" : "TẮT";
}

/** Exact AST ranges avoid drifting hand-maintained line numbers. */
async function sourceExcerpt(filename: string, names?: string[]): Promise<string> {
  const content = await readFile(`${ROOT}/src/${filename}`, "utf8");
  if (!names) return code(content, "typescript");
  const file = ts.createSourceFile(filename, content, ts.ScriptTarget.Latest, true);
  const nodes = file.statements.filter((statement) => {
    if (ts.isFunctionDeclaration(statement)) return names.includes(statement.name?.text ?? "");
    if (ts.isVariableStatement(statement))
      return statement.declarationList.declarations.some(
        (item) => ts.isIdentifier(item.name) && names.includes(item.name.text),
      );
    return false;
  });
  const found = new Set(
    nodes.flatMap((node) =>
      ts.isFunctionDeclaration(node)
        ? [node.name?.text ?? ""]
        : ts.isVariableStatement(node)
          ? node.declarationList.declarations.flatMap((item) =>
              ts.isIdentifier(item.name) ? [item.name.text] : [],
            )
          : [],
    ),
  );
  for (const name of names) if (!found.has(name)) throw new Error(`Missing ${filename}: ${name}`);
  return nodes
    .map((node) => {
      const start = node.getStart(file);
      const line = file.getLineAndCharacterOfPosition(start).line + 1;
      return `Nguồn: \`${ROOT}/src/${filename}:${line}\`.\n\n${code(content.slice(start, node.end), "typescript")}`;
    })
    .join("\n\n");
}

export async function buildSolaRawReview(outputFile = OUTPUT) {
  const { sola } = await loadPresetSources();
  const raw = await readFile(SOURCE, "utf8");
  if (hash(raw) !== sola.sha256) throw new Error("Sola source changed while exporting.");
  const fullSource: Record<string, unknown> = JSON.parse(raw.replace(/^\uFEFF/, ""));
  const preset = sola.preset;
  const settings = createDefaultSettings(preset);
  normalizeFamilyChoices(preset, settings);
  const baseSettings: FfGlobalSettings = {
    ...settings,
    vietnameseOutputEnabled: false,
    imageOptimizationEnabled: false,
    dialogueThemeEnabled: false,
  };
  const viSettings = { ...baseSettings, vietnameseOutputEnabled: true };
  const order = presetOrder(preset);
  const orderById = new Map(order.map((entry) => [entry.identifier, entry]));
  const promptById = new Map(preset.prompts.map((prompt) => [prompt.identifier, prompt]));
  const ordered = order.map((entry) => {
    const prompt = promptById.get(entry.identifier);
    if (!prompt) throw new Error(`Missing source prompt ${entry.identifier}`);
    return prompt;
  });
  ordered.push(...preset.prompts.filter((p) => !orderById.has(p.identifier)));
  if (new Set(ordered.map((p) => p.identifier)).size !== preset.prompts.length)
    throw new Error("Prompt inventory is not complete and unique.");
  const hidden = familyHiddenPromptIds(preset);
  const choiceById = new Map(
    familyChoiceGroups(preset).flatMap((group) => group.memberIds.map((id) => [id, group.label])),
  );
  const ids = new Map(
    ordered.map((p, i) => [p.identifier, `SOLA-${String(i + 1).padStart(3, "0")}`]),
  );
  const promptSections: string[] = [];
  const optionalSections: string[] = [];
  const promptInventory: unknown[][] = [];
  const requiredPayloads: string[] = [];
  let basePromptChanges = 0;
  let viPromptChanges = 0;
  let imagePromptChanges = 0;
  let themePromptChanges = 0;
  for (const prompt of ordered) {
    const id = ids.get(prompt.identifier)!;
    const original = typeof prompt.content === "string" ? prompt.content : "";
    const base = adaptFamilyPrompt(original, preset, baseSettings);
    const vi = adaptFamilyPrompt(original, preset, viSettings);
    requiredPayloads.push(original, base, vi);
    if (base !== original) basePromptChanges += 1;
    if (vi !== base) viPromptChanges += 1;
    const copy = promptUiCopy(prompt, "sola");
    const sourceEntry = orderById.get(prompt.identifier);
    promptInventory.push([
      id,
      prompt.identifier,
      prompt.name,
      copy.name,
      status(sourceEntry ? sourceEntry.enabled !== false : undefined),
      status(settings.promptEnabled[prompt.identifier]),
      base !== original ? "CÓ" : "không",
      vi !== base ? "CÓ" : "không",
    ]);
    const { content: _content, ...metadata } = prompt;
    void _content;
    promptSections.push(
      [
        `## ${id}. ${prompt.name ?? prompt.identifier}`,
        "",
        `Identifier: \`${prompt.identifier}\`. Vai trò: \`${prompt.role ?? "system"}\`.`,
        "",
        `UI: **${copy.name}**. ${copy.description}`,
        "",
        `Vị trí UI: ${prompt.marker ? "slot của host" : hidden.has(prompt.identifier) ? "ẩn thanh phân nhóm" : (choiceById.get(prompt.identifier) ?? "module/cấu hình nguồn")}.`,
        "",
        `SHA-256 nội dung: raw \`${hash(original)}\`; plugin tắt Việt \`${hash(base)}\`; plugin bật Việt \`${hash(vi)}\`.`,
        "",
        "Metadata nguồn giữ nguyên:",
        "",
        code(JSON.stringify(metadata, null, 2), "json"),
        "",
        comparison("Raw → plugin tắt tiếng Việt/ảnh/màu", original, base),
        "",
        comparison("Plugin tắt tiếng Việt → bật tiếng Việt (phần Việt hóa riêng)", base, vi),
      ].join("\n"),
    );
    const images = adaptFamilyPrompt(original, preset, {
      ...viSettings,
      imageOptimizationEnabled: true,
    });
    if (images !== vi) {
      imagePromptChanges += 1;
      requiredPayloads.push(images);
      optionalSections.push(
        `## ${id}. Khi bật Tối ưu hình ảnh\n\n${comparison("Tắt ảnh → bật ảnh, tiếng Việt bật", vi, images)}\n\nThay đổi tích hợp này cũng áp dụng khi tắt tiếng Việt; chỉ điều kiện bật ảnh quyết định việc chèn.`,
      );
    }
    if ((prompt.role ?? "system") !== "system") continue;
    let changesWithTheme = false;
    for (const [label, current] of [
      ["Tắt tiếng Việt", base],
      ["Bật tiếng Việt", vi],
    ] as const) {
      for (const theme of THEMES) {
        const themed = adaptSolaDialogueColors(current, theme);
        if (themed === current) continue;
        changesWithTheme = true;
        requiredPayloads.push(themed);
        optionalSections.push(
          `## ${id}. ${label}; màu ${theme.type === "dark" ? "tối" : "sáng"} (${theme.background})\n\n${comparison("Không chỉnh màu → bật màu theo theme", current, themed)}`,
        );
      }
    }
    if (changesWithTheme) themePromptChanges += 1;
  }

  const nativeRegex = preset.extensions?.regex_scripts ?? [];
  const nativeById = new Map(nativeRegex.map((script) => [script.id, script]));
  const runtimeScripts = familyRegexScripts(preset);
  if (new Set(runtimeScripts.map((script) => script.id)).size !== runtimeScripts.length)
    throw new Error("Duplicate regex identifiers.");
  const regexSections: string[] = [];
  const regexInventory: unknown[][] = [];
  let baseRegexChanges = 0;
  let viRegexChanges = 0;
  let themeRegexChanges = 0;
  for (const [index, script] of runtimeScripts.entries()) {
    const id = `SOLA-REGEX-${String(index + 1).padStart(3, "0")}`;
    const original = nativeById.get(script.id);
    const base = runtimeRegex(script, false);
    const vi = runtimeRegex(script, true);
    const originalText = original ? serialized(original) : "";
    const baseText = serialized(base);
    const viText = serialized(vi);
    requiredPayloads.push(originalText, serialized(script), baseText, viText);
    if (original && originalText !== baseText) baseRegexChanges += 1;
    if (baseText !== viText) viRegexChanges += 1;
    const copy = regexUiCopy(script);
    regexInventory.push([
      id,
      script.id,
      script.scriptName,
      copy.name,
      original ? status(original.disabled !== true) : "Không có trong raw",
      status(settings.regexEnabled[script.id]),
      original ? (originalText !== baseText ? "CÓ" : "không") : "THÊM MỚI",
      baseText !== viText ? "CÓ" : "không",
    ]);
    const sections = [
      `## ${id}. ${script.scriptName ?? script.id}`,
      "",
      `Identifier: \`${script.id}\`. UI: **${copy.name}**. ${copy.description}`,
      "",
      `Phạm vi: ${script.promptOnly ? "lọc request; Sola Saver còn xóa/lưu ẩn trong lịch sử, trừ Scene Header" : "hiển thị UI, không gửi HTML/CSS này sang model"}. minDepth: \`${script.minDepth ?? "không giới hạn"}\`; maxDepth: \`${script.maxDepth ?? "không giới hạn"}\`.`,
      "",
      original
        ? comparison(
            "Regex/CSS raw → plugin tắt tiếng Việt và chỉnh màu",
            originalText,
            baseText,
            "json",
          )
        : [
            "**Cũ:** JSON raw không có regex này. **Mới — toàn bộ cấu hình thêm vào:**",
            "",
            code(baseText, "json"),
          ].join("\n"),
      "",
      comparison("Plugin tắt tiếng Việt → bật tiếng Việt", baseText, viText, "json"),
    ];
    // The family-level configuration exists before display/localization adapters run.
    if (serialized(script) !== baseText) {
      sections.push(
        "",
        "### Cấu hình plugin trước bước render (để phân biệt sửa Saver với sửa CSS)",
        "",
        code(serialized(script), "json"),
      );
    }
    let changesWithTheme = false;
    if (script.markdownOnly) {
      for (const vietnamese of [false, true]) {
        const plain = vietnamese ? viText : baseText;
        for (const theme of THEMES) {
          const themed = serialized(runtimeRegex(script, vietnamese, theme));
          if (themed === plain) continue;
          changesWithTheme = true;
          requiredPayloads.push(themed);
          sections.push(
            "",
            comparison(
              `${vietnamese ? "Bật" : "Tắt"} tiếng Việt; thêm theme ${theme.type} (${theme.background})`,
              plain,
              themed,
              "json",
            ),
          );
        }
      }
    }
    if (changesWithTheme) themeRegexChanges += 1;
    regexSections.push(sections.join("\n"));
  }

  const auxiliary = AUXILIARY_KEYS.flatMap((key) => {
    const value = fullSource[key];
    if (typeof value !== "string") return [];
    requiredPayloads.push(value);
    return [
      `## AUX-${key}\n\nNgoài prompts[]; plugin không đóng gói/chèn trường này. Không có bản Việt hóa hoạt động.\n\n${comparison("Gốc → không chỉnh nội dung", value, value)}`,
    ];
  });
  const globalPrompts = [
    [
      "Vietnamese Output",
      vietnameseOutputFor(preset),
      "System; chỉ khi bật đầu ra tiếng Việt. Sau leading (gồm Image Coverage nếu bật), trước history; trailing theo thứ tự nguồn vẫn ở phía sau.",
    ],
    [
      "Image Coverage",
      imageOptimizationFor(preset),
      "System; chỉ khi bật tối ưu ảnh. Cuối leading, trước Vietnamese Output và history. Một điểm tích hợp trong Story Review đã xuất ở phần tùy chọn.",
    ],
    [
      "Vietnamese Editor — system",
      editorSystemFor(preset),
      "Chỉ request Submodel; chèn trước chỉ dẫn relative sau history của Sola. Không thêm vào request main.",
    ],
    [
      "Vietnamese Editor — user",
      editorUserFor(preset),
      "Tin user cuối của request Submodel, sau assistant mục tiêu đã cắt suy luận đầu. Không thêm vào request main.",
    ],
  ].map(([title, content, scope]) => {
    requiredPayloads.push(content!);
    return `## ${title}\n\n${scope}\n\n**Cũ:** raw Sola không có prompt tương ứng.\n\n**Mới — nguyên văn đang dùng:**\n\n${code(content!)}`;
  });

  const runtimeRows = [
    [
      "Header mỗi lượt",
      "Chỉ mở cảnh/đổi địa điểm/time skip; tránh lặp trong cảnh liên tục.",
      "Luôn yêu cầu header sau suy luận, trước RP, mỗi phản hồi; áp dụng cả khi tắt tiếng Việt.",
      "Prompt; phần 2.",
    ],
    [
      "Suy luận",
      "Không có 4 regex Sola Reasoning của plugin.",
      "Thẻ think/thoughts/reasoning/storyreview hoặc tiêu đề Markdown được bọc UI và xóa khỏi history/request. Đầu không có thẻ chỉ được nhận là suy luận khi có dấu hiệu lên kế hoạch trước scene_header.",
      "4 công tắc riêng; phần 5.",
    ],
    [
      "Thẻ tracker thiếu đóng",
      "Regex Saver nguồn cần khớp khối theo mẫu gốc.",
      "Saver dừng ở thẻ đóng, ranh giới tracker/header/HTML hoặc cuối tin; phạm vi tracker và minDepth nguồn giữ nguyên.",
      "Luôn sửa mẫu của Saver; vẫn tùy công tắc.",
    ],
    [
      "History thật",
      "JSON chỉ chứa cấu hình regex; không có mã lưu trữ/khôi phục của PocketRisu plugin.",
      "Xóa nội dung Saver khỏi data lịch sử, lưu text + offset trong solaHistory theo tin/swipe; dựng lại trước khi cắt theo depth hiện tại.",
      "Không chỉ ẩn UI; phần 7.",
    ],
    [
      "Xóa tin/rẽ nhánh/swipe",
      "Không có watcher/solaHistory trong raw JSON.",
      "Watcher 250 ms theo chat đang mở; phục hồi phần còn phù hợp minDepth. Snapshot đi theo tin vào nhánh, mỗi swipe có khóa riêng. Nội dung sửa tay khác snapshot.visible không bị ghi đè.",
      "Dùng công tắc Saver hiện tại.",
    ],
    [
      "Request nhận dữ liệu phục hồi",
      "Không có bước đồng bộ archive → request trong JSON nguồn.",
      "Dọn/khôi phục history, đối chiếu assistant request với tin gốc/visible snapshot, đưa data phục hồi vào history của request rồi mới lọc theo depth.",
      "beforeRequest + syncRestoredStatesToRequest.",
    ],
    [
      "Tính depth Saver",
      "Nguồn có minDepth theo độ sâu tin: 2/3/4/5...",
      "Độ sâu assistant là 0,2,4... ngay sau phản hồi và 1,3,5... sau user mới. User/OOC chèn thêm và marker nhánh không làm state già thêm sai.",
      "solaSaverDepths, áp dụng cả history/request.",
    ],
    [
      "Header Saver mới",
      "Không có trong 149 regex nguồn.",
      "minDepth 4; chỉ cắt header khỏi bản request; không xóa header trong history thật.",
      "1 công tắc mới; phần 5.",
    ],
    [
      "Nhãn/enum chỉ hiển thị",
      "Digest có NEUTRAL/STEADY/DRIVE; các caption HUD/Arrow tiếng Anh.",
      "Việt hóa nhãn render; digest enum chỉ hiển thị GIỮ NHỊP/ĐỀU NHỊP/ĐẨY TIẾN. Fate/tempo định danh gốc được giữ cho dữ liệu/regex.",
      "Bật tiếng Việt; không sửa enum trong history bằng render.",
    ],
    [
      "Skybox tiếng Việt",
      "Dynamic trigger theo từ tiếng Anh và giờ AM/PM.",
      "Regex giữ từ gốc, thêm từ Việt/Unicode; bản render suy ra sky từ SA/CH, giờ 24h, từ thời tiết. sky có sẵn giữ nguyên; không sửa data đã lưu.",
      "Nhãn/trigger Việt khi bật tiếng Việt; sky inference ở bước UI.",
    ],
    [
      "CSS điện thoại & dấu Việt",
      "Font/letter-spacing/height/flex theo template raw.",
      "Thay font fallback; wrap/co giãn; header auto height; Heavy/Crush có --risu-font-family; ma trận bỏ letter-spacing; sửa $2→$3 ở Rain/Storm Compact.",
      "Luôn áp cho renderer tương ứng; không phụ thuộc bật tiếng Việt.",
    ],
    [
      "Màu theme",
      "16 palette Sola với hex gốc.",
      "Giữ tên palette, đổi hex theo nền thực tế để tương phản ≥4.5; chỉnh prompt system và renderer; theme renderer tránh opacity làm mờ thêm.",
      "dialogueThemeEnabled !== false; không thêm luật màu mới.",
    ],
    [
      "Màu lồng quote/emphasis",
      "font/span màu nguồn có thể bị theme PocketRisu ghi đè ở phần tử con.",
      "Cài --FontColorStandard/Italic/Bold/Quote trên font/span renderer, kể cả khi tắt chỉnh màu theme.",
      "UI; không chèn prompt.",
    ],
    [
      "Submodel context",
      "Không có Vietnamese Editor trong raw JSON.",
      "Giữ prompt/card/lore, tối đa 2 trao đổi trước + user hiện tại; loại memory memo/summary và phản hồi mục tiêu cũ, rồi thêm assistant mục tiêu + user nhiệm vụ. Không gửi suy luận đầu của phản hồi cần sửa.",
      "Chỉ khi bật Submodel; mặc định tắt.",
    ],
    [
      "Submodel lưu kết quả",
      "Không có cơ chế rewrite của plugin trong raw.",
      "Thêm swipe mới, giữ chọn lại raw; chấp nhận đúng việc watcher dọn suy luận/history trong lúc chạy, vẫn kiểm tra sửa tay/đổi swipe.",
      "Nút viết lại đổi thành ngắt; timeout 600000 ms.",
    ],
    [
      "Auto Submodel",
      "Không có trong raw.",
      "Chỉ bật khi editor bật; đợi phản hồi đóng đủ tracker/comment trước tự chạy.",
      "Mặc định tắt; riêng công tắc.",
    ],
    [
      "Âm báo",
      "Không có module âm báo request của plugin trong raw.",
      "Báo thành công/thất bại; auto editor thì chờ editor; monitor bắt phản hồi main không hoàn tất.",
      "Mặc định tắt; không thêm prompt.",
    ],
    [
      "Ước tính token",
      "Không có bảng ước tính trong raw.",
      "Dùng composer hiện tại + tokenizer o200k_base; chỉ đo prompt plugin thêm, không tính đầy đủ card/lore/history hoặc toàn request Submodel; random preview không tiêu roll thực.",
      "UI; không thêm prompt.",
    ],
    [
      "Macro/thứ tự/slot",
      "SillyTavern prompts[], các prompt_order và macro nguồn.",
      "Dùng order character_id=100001; giữ slot card/lore/history, role/relative/absolute; bung setvar/addvar/getvar/random/roll và macro host; không nhập cấu hình model/sampling/auth từ JSON.",
      "composePresetPrompts/buildRequestMessages; mã thật ở phần 7.",
    ],
    [
      "UI/preset",
      "Tên module tiếng Anh, các lựa chọn có thể cùng bật trong danh sách nguồn.",
      "Tên/mô tả tiếng Việt, gom 6 nhóm chọn 1; lựa chọn riêng từng family và config/card; giữ module tắt trong bank để có thể bật.",
      "Không đổi lời prompt chỉ vì đổi UI; phần 6.",
    ],
  ];

  const excerpts: Array<[string, string[] | undefined, string]> = [
    [
      "vietnamese.ts",
      ["adaptSolaPromptForVietnamese"],
      "Phép Việt hóa động sau bảng thay thế literal",
    ],
    [
      "preset-family.ts",
      ["familyRegexScripts", "adaptFamilyPrompt"],
      "Phạm vi sửa prompt/regex từng family; xem nhánh sola",
    ],
    [
      "sola-vietnamese-regex.ts",
      undefined,
      "Toàn bộ adapter regex/nhãn hiển thị tiếng Việt, kể cả trigger Skybox",
    ],
    ["sola-display.ts", undefined, "Toàn bộ sửa CSS/font/header trên bản render"],
    ["sola-history.ts", undefined, "Toàn bộ Saver/ẩn dữ liệu/phục hồi theo swipe"],
    ["sola-reasoning.ts", undefined, "Toàn bộ nhận diện/xử lý suy luận Sola"],
    [
      "dialogue-colors.ts",
      [
        "SOLA_DIALOGUE_COLORS",
        "MINIMUM_TEXT_CONTRAST",
        "luminance",
        "textContrast",
        "readableSwatch",
        "adaptSolaDialogueColors",
        "adaptSolaDialogueReplacement",
        "adaptDialogueColorRegex",
        "resolveDialogueTheme",
      ],
      "Palette và chính xác phép chọn màu theo theme",
    ],
    [
      "core.ts",
      [
        "SOLA_PROMPT_DEFAULTS",
        "createDefaultSettings",
        "normalizeSettings",
        "composePresetPrompts",
        "applyRegexScripts",
        "solaSaverDepths",
        "applyPromptRegexToMessages",
        "applyRequestFiltersToMessages",
        "buildRequestMessages",
      ],
      "Composer/filter/depth thật; các nhánh FF5.4/Voyage được giữ trong hàm dùng chung để không sửa trích đoạn",
    ],
    [
      "plugin.ts",
      [
        "playCompletionSound",
        "syncRestoredStatesToRequest",
        "cleanSavedHistory",
        "cleanSavedHistoryOnce",
        "restoreActiveHistory",
        "startHistoryRestoreWatcher",
        "beforeRequest",
        "displayOutput",
        "splitEditorResponse",
        "runSubmodelEditor",
        "completeAutoRewriteResponse",
        "submodelOutputListener",
        "rewriteLatestResponse",
      ],
      "Lưu/khôi phục history, gửi request, hiển thị và Submodel; mã dùng chung chỉ nhánh sola hoạt động ở preset này",
    ],
    ["submodel-context.ts", undefined, "Toàn bộ phép cắt context Submodel"],
    ["editor-prompts.ts", ["insertSubmodelEditorSystem"], "Vị trí chèn editor system"],
    ["token-estimate.ts", undefined, "Toàn bộ ước tính token thêm vào UI"],
    [
      "family-ui.ts",
      [
        "familyChoiceGroups",
        "normalizeFamilyChoices",
        "familyPromptSections",
        "familyHiddenPromptIds",
        "familyRegexGroups",
      ],
      "Nhóm chọn 1/ẩn module/UI; chỉ nhánh sola áp dụng",
    ],
    [
      "preset-ui-copy.ts",
      ["SOLA_PROMPT_COPY", "SOLA_SECTION_COPY", "solaRegexUiCopy"],
      "Nhãn/mô tả UI Sola",
    ],
    ["presets.ts", undefined, "Cấu hình theo card và chuyển family; không thêm prompt RP"],
    ["completion-monitor.ts", undefined, "Monitor dùng cho âm báo khi request không hoàn tất"],
    ["submodel-button.ts", undefined, "Nút rewrite/ngắt; không thêm prompt RP"],
  ];
  const appendix: string[] = [];
  for (const [filename, names, explanation] of excerpts)
    appendix.push(
      `## CODE-${filename}\n\n${explanation}. JSON raw không có mã plugin tương ứng; cột cũ/mới về hành vi ở đầu phần này, regex cũ ở phần 5.\n\n${await sourceExcerpt(filename, names)}`,
    );
  const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const document = [
    "# Sola V2 Flame — đối chiếu toàn bộ raw và plugin hiện tại",
    "",
    "File này là tài liệu kiểm tra, không phải prompt để thực hiện RP. Mỗi mục đặt cũ/mới cạnh nhau trong bảng dòng thay đổi, rồi giữ nguyên văn đầy đủ bên dưới. Nội dung lấy trực tiếp từ JSON nguồn và hàm plugin hiện tại; không tự dịch lại prompt khi xuất báo cáo. Bao gồm cả module mặc định tắt, slot trống, ví dụ GOOD/BAD/NSFW và module ngoài thứ tự hoạt động.",
    "",
    `Nguồn: \`${SOURCE}\` (tên bản gốc **Sola V2 Flame.json**). SHA-256: \`${sola.sha256}\`. Commit kiểm tra: \`${commit}\`.`,
    "",
    "## Cách đọc",
    "",
    "- **Raw → plugin tắt tiếng Việt:** thấy thay đổi luôn áp dụng như header, Saver, CSS; tắt cả ảnh và chỉnh màu trong mức này.",
    "- **Plugin tắt → bật tiếng Việt:** chỉ phần bổ sung do Vietnamese Output/Việt hóa; không gộp thay đổi header chung vào đây.",
    "- **Ảnh/màu:** phần tùy chọn có nguyên văn thêm/sửa, mẫu tối/sáng. Runtime dùng nền thực tế nên hex có thể khác hai nền mẫu.",
    "- **Regex/CSS/UI:** không phải prompt gửi AI. Adapter render chỉ đổi bản hiển thị; History Saver thực sự xóa data và lưu archive riêng.",
    "- **Thêm mới:** không có đối tượng gốc tương ứng thì ghi rõ; không dựng một bản raw giả để so sánh.",
    "",
    "Macro và nhóm bắt regex chưa bung để kiểm tra đúng bank/schema. File không phải một request bật cùng lúc mọi module. Các bảng UI/default là cấu hình mới tạo; cấu hình đã lưu có thể khác.",
    "",
    table(
      ["Hạng mục", "Số lượng"],
      [
        ["Prompt/slot nguồn (xuất đầy đủ)", ordered.length],
        [
          "Prompt có nội dung",
          ordered.filter((p) => typeof p.content === "string" && p.content.length).length,
        ],
        ["Prompt ngoài thứ tự dùng", ordered.length - order.length],
        ["Prompt đổi ngay cả khi tắt tiếng Việt", basePromptChanges],
        ["Prompt đổi thêm khi bật tiếng Việt", viPromptChanges],
        ["Prompt đổi thêm khi bật ảnh", imagePromptChanges],
        ["Prompt có biến thể màu theme", themePromptChanges],
        ["Regex/CSS nguồn (xuất đầy đủ)", nativeRegex.length],
        ["Regex plugin thêm", runtimeScripts.length - nativeRegex.length],
        ["Regex nguồn đổi dù tắt tiếng Việt/theme", baseRegexChanges],
        ["Regex đổi thêm khi bật tiếng Việt", viRegexChanges],
        ["Regex có biến thể theme", themeRegexChanges],
        ["Prompt/format phụ ngoài prompts[]", auxiliary.length],
        ["Prompt Global/Submodel thêm", globalPrompts.length],
      ],
    ),
    "",
    "# 1. Danh mục module, UI và mặc định cũ/mới",
    "",
    table(
      [
        "Mục",
        "Identifier",
        "Tên raw",
        "Tên UI plugin",
        "Raw",
        "Plugin mới",
        "Sửa chung",
        "Sửa Việt",
      ],
      promptInventory,
    ),
    "",
    "## Tất cả prompt_order nguồn giữ nguyên",
    "",
    code(JSON.stringify(preset.prompt_order, null, 2), "json"),
    "",
    "# 2. Tất cả prompt nguồn: cũ/mới đầy đủ",
    "",
    ...promptSections,
    "",
    "# 3. Prompt plugin thêm: Global và Submodel",
    "",
    ...globalPrompts,
    "",
    "# 4. Thay đổi tùy chọn trong prompt nguồn: ảnh/màu",
    "",
    ...optionalSections,
    "",
    "# 5. Tất cả regex/CSS: cũ/mới đầy đủ",
    "",
    "Thứ tự dưới đây là thứ tự runtime: 4 regex suy luận mới → 149 regex nguồn qua adapter → Header Saver mới. JSON mới thể hiện findRegex/replaceString sau các adapter tương ứng; capture $1/$2, macro và ký tự \\n vẫn theo template, sẽ bung khi khớp đầu ra thật. Không đưa CSS này vào prompt model.",
    "",
    table(
      [
        "Mục",
        "Identifier",
        "Tên raw/runtime",
        "UI plugin",
        "Raw",
        "Plugin mới",
        "Sửa chung",
        "Sửa Việt",
      ],
      regexInventory,
    ),
    "",
    ...regexSections,
    "",
    "# 6. Bảng thay thế đầy đủ, UI/công tắc và trường phụ",
    "",
    "## Tất cả phép thay thế literal của Sola",
    "",
    "Danh sách thật trong vietnamese.ts, theo thứ tự áp dụng. Một phép chỉ chạy ở module có chuỗi khớp; không có nghĩa chuỗi đó được thêm vào mọi module. Phần 2 đã thể hiện kết quả từng prompt, kể cả các phép liên quan ví dụ/NSFW. Phép đổi nhãn trong block và sửa chỉ dẫn liên quan nhãn có thêm mã ở phần 7.",
    "",
    table(
      ["#", "Cũ", "Mới"],
      SOLA_VIETNAMESE_REPLACEMENTS.map(([old, next], index) => [index + 1, old, next]),
    ),
    "",
    "## Tất cả nhãn tracker: cũ/mới",
    "",
    table(
      ["Raw", "Nhãn Việt"],
      SOLA_VIETNAMESE_LABELS.map((pair) => [...pair]),
    ),
    "",
    "## Nhóm UI chọn 1, phân nhóm module và regex",
    "",
    "Raw không có nhóm UI plugin này. Đây là dữ liệu giao diện; không thêm các mô tả sau vào prompt.",
    "",
    code(
      JSON.stringify(
        {
          choices: familyChoiceGroups(preset),
          sections: familyPromptSections(preset),
          hidden: [...hidden],
          regexGroups: familyRegexGroups(preset),
        },
        null,
        2,
      ),
      "json",
    ),
    "",
    "## Mặc định Global mới",
    "",
    "Raw không có các công tắc Global này. dialogueThemeEnabled chưa lưu giá trị mặc định, runtime coi khác false là bật. Prompt/regex default đã đặt cạnh bản raw trong hai danh mục.",
    "",
    code(
      JSON.stringify(
        {
          enabled: settings.enabled,
          vietnameseOutputEnabled: settings.vietnameseOutputEnabled,
          imageOptimizationEnabled: settings.imageOptimizationEnabled,
          soundNotificationsEnabled: settings.soundNotificationsEnabled,
          submodelEditorEnabled: settings.submodelEditorEnabled,
          submodelAutoRewriteEnabled: settings.submodelAutoRewriteEnabled,
          dialogueThemeEnabled: "BẬT khi chưa lưu (khác false)",
        },
        null,
        2,
      ),
      "json",
    ),
    "",
    ...auxiliary,
    "",
    "## Những trường JSON nguồn plugin không nhập",
    "",
    "Plugin chỉ đóng gói prompts, prompt_order và extensions.regex_scripts. Cấu hình kết nối/model/sampling/reasoning của host dùng setting PocketRisu; không áp giá trị xuất của SillyTavern. Danh sách key dưới đây ghi phạm vi bỏ qua, không xuất mật khẩu hay cấu hình auth vào báo cáo.",
    "",
    code(
      JSON.stringify(
        Object.keys(fullSource).filter(
          (key) => !["prompts", "prompt_order", "extensions", ...AUXILIARY_KEYS].includes(key),
        ),
        null,
        2,
      ),
      "json",
    ),
    "",
    "# 7. Thay đổi xử lý so với raw, và mã hiện tại để kiểm tra",
    "",
    table(["Nơi thay đổi", "Cũ/raw", "Mới/plugin", "Điều kiện/phạm vi"], runtimeRows),
    "",
    "Calendar/date và digest hiện vẫn ở HUD cuối. Không có tính năng chuyển lịch lên header trong bản đang đối chiếu.",
    "",
    ...appendix,
    "",
  ].join("\n");
  // Verify actual full payloads and every source identifier before delivering the single file.
  for (const content of requiredPayloads)
    if (content && !document.includes(content))
      throw new Error(`Missing full payload ${hash(content)}`);
  for (const prompt of preset.prompts)
    if (!document.includes(`Identifier: \`${prompt.identifier}\``))
      throw new Error(`Missing prompt ${prompt.identifier}`);
  for (const script of nativeRegex)
    if (!document.includes(`Identifier: \`${script.id}\``))
      throw new Error(`Missing regex ${script.id}`);
  const output = path.resolve(outputFile);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, document, "utf8");
  return {
    output,
    prompts: ordered.length,
    regex: runtimeScripts.length,
    sourceRegex: nativeRegex.length,
    basePromptChanges,
    viPromptChanges,
    bytes: Buffer.byteLength(document),
    sha256: hash(document),
  };
}

interface ChangeChunk {
  before: string;
  after: string;
  context: string;
}

/** Exact LCS edits; reconstruct the result to verify that no change is lost. */
function changeChunks(before: string, after: string, technical = false): ChangeChunk[] {
  if (before === after) return [];
  const split = (text: string) =>
    technical ? (text.match(/[^<>;\n]+|[<>;\n]/g) ?? []) : (text.match(/[^\n]*\n|[^\n]+$/g) ?? []);
  const left = split(before);
  const right = split(after);
  const counts = Array.from({ length: left.length + 1 }, () => new Uint32Array(right.length + 1));
  for (let i = left.length - 1; i >= 0; i -= 1)
    for (let j = right.length - 1; j >= 0; j -= 1)
      counts[i]![j] =
        left[i] === right[j]
          ? counts[i + 1]![j + 1]! + 1
          : Math.max(counts[i + 1]![j]!, counts[i]![j + 1]!);
  const chunks: ChangeChunk[] = [];
  let reconstructed = "";
  let i = 0;
  let j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      reconstructed += left[i++];
      j += 1;
      continue;
    }
    const oldParts: string[] = [];
    const newParts: string[] = [];
    const context = technical ? (left[i - 1] ?? "").slice(-80) : "";
    while (i < left.length || j < right.length) {
      if (i < left.length && j < right.length && left[i] === right[j]) break;
      if (j >= right.length || (i < left.length && counts[i + 1]![j]! >= counts[i]![j + 1]!))
        oldParts.push(left[i++]!);
      else newParts.push(right[j++]!);
    }
    const afterChunk = newParts.join("");
    reconstructed += afterChunk;
    chunks.push({ before: oldParts.join(""), after: afterChunk, context });
  }
  if (reconstructed !== after)
    throw new Error("Compact diff did not reconstruct the adapted text.");
  return chunks;
}

class ChangeBank {
  private entries = new Map<string, { change: ChangeChunk; uses: Set<string> }>();
  addExact(before: string, after: string, where: string): void {
    if (before === after) return;
    const key = JSON.stringify([before, after]);
    const entry = this.entries.get(key) ?? {
      change: { before, after, context: "" },
      uses: new Set<string>(),
    };
    entry.uses.add(where);
    this.entries.set(key, entry);
  }
  add(before: string, after: string, where: string, technical = false): void {
    for (const change of changeChunks(before, after, technical)) {
      // Identical changes shared by many modules are shown once with every location.
      const key = JSON.stringify([change.before, change.after]);
      const entry = this.entries.get(key) ?? { change, uses: new Set<string>() };
      entry.uses.add(where);
      this.entries.set(key, entry);
    }
  }
  get size(): number {
    return this.entries.size;
  }
  render(): string {
    return compactTable(
      ["Nơi áp dụng", "Cũ", "Mới"],
      [...this.entries.values()].map(({ change, uses }) => [
        compactRefs([...uses]),
        change.before || "[thêm mới]",
        change.after || "[đã bỏ]",
      ]),
    );
  }
}

function compactRefs(references: string[]): string {
  const sorted = [...references].sort();
  const result: string[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const start = sorted[i]!;
    let end = i;
    const match = start.match(/^([SR])(\d{3})$/);
    if (match) {
      while (
        end + 1 < sorted.length &&
        sorted[end + 1] === `${match[1]}${String(Number(match[2]) + end - i + 1).padStart(3, "0")}`
      )
        end += 1;
    }
    if (end - i >= 2) {
      result.push(`${start}–${sorted[end]}`);
      i = end;
    } else result.push(start);
  }
  return result.join(", ");
}

/** Inline code avoids inflating every tag/macro into HTML entities. */
function compactTable(headers: string[], rows: unknown[][]): string {
  const inline = (content: unknown) =>
    String(content ?? "")
      .split(/\r?\n/)
      .map((line) => {
        if (!line) return "";
        const runs = [...line.matchAll(/`+/g)].map((m) => m[0].length);
        const ticks = "`".repeat(Math.max(1, ...runs.map((n) => n + 1)));
        return `${ticks} ${line.replaceAll("|", "\\|")} ${ticks}`;
      })
      .join("<br>");
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(inline).join(" | ")} |`),
  ].join("\n");
}

/** Export literal units once, while verifying the complete production result for every module. */
function collectSolaVietnameseChanges(
  base: string,
  expected: string,
  id: string,
  bank: ChangeBank,
): void {
  let current = base;
  for (const [old, next] of SOLA_VIETNAMESE_REPLACEMENTS) {
    if (current.includes(old)) {
      const prefix = current.slice(0, current.indexOf(old)).split("\n").at(-1) ?? "";
      const exampleKind = prefix.match(/\b(Bad|Good)\s*:/i)?.[1]?.toUpperCase();
      bank.addExact(old, next, exampleKind ? `${id} (${exampleKind})` : id);
      current = current.replaceAll(old, next);
    }
  }
  current = current.replace(
    /<(story_notes|date|bond|fengine|thought_engine|char_matrix|arrow|omen|wardrobe|inventory|scene_cast|scene_state)\b[^>]*>[\s\S]*?<\/\1>/g,
    (block) => {
      for (const [old, next] of SOLA_VIETNAMESE_LABELS) {
        if (block.includes(`${old}: `)) {
          bank.addExact(`${old}:`, `${next}:`, id);
          block = block.replaceAll(`${old}: `, `${next}: `);
        }
      }
      return block;
    },
  );
  const finalPairs = [
    ["`Shift:", "`Thay đổi:"],
    [
      "- Subtext and Thought must not restate each other. Subtext is the mask seen from outside; Thought is the voice inside.",
      "- Ẩn ý and Suy nghĩ must not restate each other. Ẩn ý is the mask seen from outside; Suy nghĩ is the voice inside.",
    ],
    [
      "- Observable Facts must be physical, visible, or audible reality;",
      "- Dữ kiện quan sát must be physical, visible, or audible reality;",
    ],
  ] as const;
  for (const [old, next] of finalPairs) {
    if (!current.includes(old)) continue;
    bank.addExact(old, next, id);
    current = old === "`Shift:" ? current.replaceAll(old, next) : current.replace(old, next);
  }
  if (current !== expected) throw new Error(`Compact Vietnamese coverage drift: ${id}`);
}

/** Review changes only; no duplicated full modules, renderer templates or source-code appendix. */
export async function buildSolaCompactReview(outputFile = OUTPUT) {
  const { sola } = await loadPresetSources();
  const source = await readFile(SOURCE, "utf8");
  if (hash(source) !== sola.sha256) throw new Error("Sola source changed while exporting.");
  const preset = sola.preset;
  const settings = createDefaultSettings(preset);
  normalizeFamilyChoices(preset, settings);
  const baseSettings = {
    ...settings,
    vietnameseOutputEnabled: false,
    imageOptimizationEnabled: false,
    dialogueThemeEnabled: false,
  };
  const viSettings = { ...baseSettings, vietnameseOutputEnabled: true };
  const order = presetOrder(preset);
  const orderIds = new Set(order.map((entry) => entry.identifier));
  const promptMap = new Map(preset.prompts.map((p) => [p.identifier, p]));
  const ordered = [
    ...order.map((entry) => promptMap.get(entry.identifier)!),
    ...preset.prompts.filter((p) => !orderIds.has(p.identifier)),
  ];
  const promptInventory: unknown[][] = [];
  const unchanged: string[] = [];
  const baseChanges = new ChangeBank();
  const vietnameseChanges = new ChangeBank();
  const imageChanges = new ChangeBank();
  const defaults: unknown[][] = [];
  const themePromptIds: string[] = [];
  const uiNames: unknown[][] = [];
  let viPromptCount = 0;
  for (const [index, prompt] of ordered.entries()) {
    const id = `S${String(index + 1).padStart(3, "0")}`;
    const original = typeof prompt.content === "string" ? prompt.content : "";
    const base = adaptFamilyPrompt(original, preset, baseSettings);
    const vi = adaptFamilyPrompt(original, preset, viSettings);
    const images = adaptFamilyPrompt(original, preset, {
      ...viSettings,
      imageOptimizationEnabled: true,
    });
    baseChanges.add(original, base, id);
    collectSolaVietnameseChanges(base, vi, id, vietnameseChanges);
    imageChanges.add(vi, images, id);
    if (base === original && vi === base && images === vi) unchanged.push(id);
    const sourceDefault = order.find((entry) => entry.identifier === prompt.identifier);
    const defaultChanged =
      sourceDefault &&
      (sourceDefault.enabled !== false) !== settings.promptEnabled[prompt.identifier];
    if (base !== original || vi !== base || images !== vi || defaultChanged)
      promptInventory.push([
        id,
        prompt.name,
        status(settings.promptEnabled[prompt.identifier]),
        [
          base !== original ? "chung" : "",
          vi !== base ? "Việt" : "",
          images !== vi ? "ảnh" : "",
          defaultChanged ? "mặc định" : "",
        ]
          .filter(Boolean)
          .join("+") || "–",
      ]);
    if (base !== vi) viPromptCount += 1;
    if (
      (prompt.role ?? "system") === "system" &&
      THEMES.some((theme) => adaptSolaDialogueColors(base, theme) !== base)
    )
      themePromptIds.push(id);
    const rawEntry = order.find((entry) => entry.identifier === prompt.identifier);
    if (rawEntry && (rawEntry.enabled !== false) !== settings.promptEnabled[prompt.identifier])
      defaults.push([
        id,
        status(rawEntry.enabled !== false),
        status(settings.promptEnabled[prompt.identifier]),
      ]);
    uiNames.push([id, prompt.name ?? prompt.identifier, promptUiCopy(prompt, "sola").name]);
  }
  const nativeRegex = preset.extensions?.regex_scripts ?? [];
  const nativeById = new Map(nativeRegex.map((r) => [r.id, r]));
  const scripts = familyRegexScripts(preset);
  const saverChanges = new ChangeBank();
  const regexFindChanges = new ChangeBank();
  const displayTextChanges = new ChangeBank();
  const cssChanges = new ChangeBank();
  const regexInventory: unknown[][] = [];
  const additions: unknown[][] = [];
  const themeRegexIds: string[] = [];
  const regexNames: unknown[][] = [];
  for (const [index, script] of scripts.entries()) {
    const id = `R${String(index + 1).padStart(3, "0")}`;
    const original = nativeById.get(script.id);
    const base = runtimeRegex(script, false);
    const vi = runtimeRegex(script, true);
    if (original) {
      saverChanges.add(original.findRegex ?? "", base.findRegex ?? "", id, true);
      cssChanges.add(original.replaceString ?? "", base.replaceString ?? "", id, true);
      const { findRegex: _f1, replaceString: _r1, ...rawMeta } = original;
      const { findRegex: _f2, replaceString: _r2, ...newMeta } = script;
      void _f1;
      void _r1;
      void _f2;
      void _r2;
      if (JSON.stringify(rawMeta) !== JSON.stringify(newMeta))
        throw new Error(`Unexpected metadata change ${id}`);
    } else {
      additions.push([
        id,
        script.id,
        script.scriptName,
        script.promptOnly ? "Xóa khỏi history/request" : "Bọc suy luận trên UI",
        script.findRegex,
        script.minDepth ?? "không giới hạn",
      ]);
    }
    regexFindChanges.add(base.findRegex ?? "", vi.findRegex ?? "", id, true);
    displayTextChanges.add(base.replaceString ?? "", vi.replaceString ?? "", id, true);
    const themes = THEMES.some(
      (theme) => serialized(runtimeRegex(script, false, theme)) !== serialized(base),
    );
    if (themes) themeRegexIds.push(id);
    regexInventory.push([
      id,
      script.scriptName,
      !original ? "Thêm" : serialized(original) !== serialized(base) ? "Có" : "–",
      serialized(base) !== serialized(vi) ? "Có" : "–",
      themes ? "Có" : "–",
    ]);
    regexNames.push([id, script.scriptName, regexUiCopy(script).name]);
  }
  const palette = Object.entries(SOLA_DIALOGUE_COLORS).map(([name, hex]) => [
    name,
    hex,
    ...THEMES.map((theme) => adaptSolaDialogueColors(hex, theme)),
  ]);
  const technicalSummary = [
    [
      "Saver tracker/HTML (sola-history.ts)",
      "Cần khớp mẫu khối gốc, thường cần thẻ đóng.",
      "Giữ tag, minDepth, placement và công tắc nguồn; nhận thẻ tự đóng/thiếu đóng, dừng tại tracker/header/HTML kế tiếp hoặc cuối tin. HUD thiếu đóng chỉ dừng ở HUD/header khác.",
    ],
    [
      "Trigger Dusk/Skybox (sola-vietnamese-regex.ts)",
      "Từ Anh với \\b; giờ AM/PM.",
      "Giữ từ Anh + thêm chạng vạng/hoàng hôn/chiều tà/buổi tối, gió/lạnh/bụi, lửa/khói/tro/âm ỉ/lò rèn/bếp lửa/ấm/nóng/tĩnh lặng/yên tĩnh/êm đềm; nhận CH/24h. Dùng biên Unicode thay \\b cho tiếng Việt.",
    ],
    [
      "Nhãn/thời điểm/tên riêng",
      "Chỉ mẫu tiếng Anh/ASCII.",
      "Nhãn regex nhận cả Anh lẫn Việt. Thêm Bình minh/Rạng đông/Hửng sáng, Buổi sáng/Giữa trưa/Buổi trưa/Buổi chiều, Chạng vạng/Hoàng hôn/Chiều tà/Buổi tối, Ban đêm/Nửa đêm/Đêm khuya. Subject Line nhận chữ Unicode có dấu.",
    ],
    [
      "Chip Bond Shift/Arrow",
      "Capture phần text có thể nuốt thẻ HTML theo sau.",
      "Chặn capture ở ký tự <; không đổi số/enum của cơ chế.",
    ],
    [
      "Font (sola-display.ts)",
      "Font nguồn, có thể thiếu dấu Việt.",
      "UI/header/matrix: system-ui + Segoe UI/Roboto/Noto Sans/Arial; serif: Georgia/Noto Serif/Times New Roman; mono: ui-monospace/Consolas/Liberation Mono. Heavy/Crush còn đặt --risu-font-family và line-height 1.5.",
    ],
    [
      "CSS bố cục",
      "Flex/width/font/letter-spacing theo raw.",
      "Thêm border-box, min-width:0, overflow-wrap:anywhere; flex-wrap và gap nếu thiếu; span max-width:100%. Matrix letter-spacing:normal; vùng có giãn chữ khác:0.02em; line-height:1.5 khi không có height cố định.",
    ],
    [
      "CSS header",
      "height:170px, title Cinzel và kích thước cố định.",
      "height:auto + min-height:170px, padding/gap responsive; width:100%; title clamp(1.1em,1em + 1vw,1.65em), weight 700, bỏ uppercase cưỡng ép; nền tối/shadow cho title; span được co và xuống dòng.",
    ],
    [
      "Capture Rain/Storm Compact",
      "Dùng $2 cho thời gian dù nhóm này là atmosphere.",
      "Đổi $2 → $3 trong replacement; sửa hiển thị, không đổi dữ liệu/prompt.",
    ],
    [
      "Màu lồng quote/bold/italic",
      "font/span màu có thể bị theme PocketRisu ghi đè.",
      "Đặt các biến --FontColorStandard/Italic/Bold/ItalicBold/Quote1/Quote2 theo màu source. Chỉnh theme hex theo bảng sau; khi theme bật, Voice/Gradient Mod/Kinetic dùng opacity:1.",
    ],
    [
      "Suy luận thêm (sola-reasoning.ts)",
      "Không có 4 regex plugin.",
      "Delete+Display cho nhóm thẻ think/thinking/thought/thoughts/reasoning/internal_monologue/storyreview và tiêu đề Markdown; thêm Delete+Display đầu không thẻ có dấu hiệu lên kế hoạch trước scene_header. UI bọc details, filter bỏ suy luận khỏi history/request.",
    ],
    [
      "Header Saver thêm",
      "Không có regex này.",
      "Chỉ bỏ scene_header khỏi bản request ở minDepth:4; history thật giữ header. Mặc định bật.",
    ],
  ];
  const regexCoverage = familyRegexGroups(preset).map((group) => {
    const members = regexInventory.filter((_row, index) => group.ids.includes(scripts[index]!.id));
    return [
      group.label,
      members.length,
      members.filter((row) => row[2] !== "–").length,
      members.filter((row) => row[3] !== "–").length,
      members.filter((row) => row[4] !== "–").length,
    ];
  });
  const globalPrompts = [
    [
      "Vietnamese Output",
      vietnameseOutputFor(preset),
      "system, chỉ khi bật tiếng Việt; sau leading, trước history",
    ],
    ["Image Coverage", imageOptimizationFor(preset), "system, chỉ khi bật ảnh; cuối leading"],
    [
      "Vietnamese Editor — system",
      editorSystemFor(preset),
      "chỉ Submodel; trước chỉ dẫn relative sau history",
    ],
    [
      "Vietnamese Editor — user",
      editorUserFor(preset),
      "user cuối request Submodel; sau assistant cần viết lại",
    ],
  ].map(
    ([title, content, where]) => `## ${title}\n\nCũ: không có. Mới: ${where}.\n\n${code(content!)}`,
  );
  const runtime = [
    [
      "History/Saver",
      "Chỉ regex nguồn; không có archive PocketRisu của plugin.",
      "Xóa data theo Saver, lưu text+offset trong solaHistory theo tin/swipe. Phục hồi rồi cắt lại theo minDepth; header chỉ cắt bản request ở depth ≥4.",
    ],
    [
      "Depth & request",
      "Độ sâu tin thông thường; không có đồng bộ archive.",
      "AI depth 0/2/4... sau AI, 1/3/5... sau user mới; user/OOC chèn thêm và marker nhánh không làm già state. Đồng bộ dữ liệu đã phục hồi vào request trước khi lọc.",
    ],
    [
      "Xóa/rẽ nhánh/swipe",
      "Không có watcher trong raw.",
      "Watcher 250 ms phục hồi theo depth hiện tại; archive đi theo tin/swipe. Không ghi đè sửa tay khác snapshot.visible.",
    ],
    [
      "Nhãn HUD render",
      "Enum/nhãn hiển thị tiếng Anh.",
      "Digest NEUTRAL→GIỮ NHỊP, STEADY→ĐỀU NHỊP, DRIVE→ĐẨY TIẾN; Việt hóa nhãn tracker trên bản render. Dữ liệu enum gốc giữ nguyên. Calendar/digest vẫn ở HUD cuối.",
    ],
    [
      "Skybox render",
      "Trigger Anh/AM-PM.",
      "Thêm trigger Việt vào regex; bản render suy ra sky từ SA/CH/24h/thời tiết Việt. Không sửa data đã lưu; sky có sẵn giữ nguyên; dusk phù hợp được để native filter chọn hạt.",
    ],
    [
      "Submodel",
      "Không có editor này.",
      "Giữ prompt/card/lore + 2 trao đổi trước và user hiện tại; bỏ memory/summary, thêm assistant mục tiêu đã cắt suy luận + user nhiệm vụ. Lưu swipe mới; giữ raw để chọn lại; ngắt được; timeout 600000 ms; chấp nhận watcher dọn history trong lúc chạy.",
    ],
    [
      "Auto/âm báo",
      "Không có.",
      "Auto chỉ bật khi editor bật; chờ tracker/comment hoàn chỉnh. Âm báo cả thành công/thất bại; auto thì báo sau editor. Cả editor, auto, ảnh, âm báo mặc định tắt.",
    ],
    [
      "Token/UI",
      "Không có dashboard plugin.",
      "Ước tính prompt plugin thêm bằng o200k_base; không tính toàn card/lore/history. UI Việt hóa, 6 nhóm chọn 1; config theo card/family; mô tả UI không chèn vào prompt.",
    ],
    [
      "Order/macro/settings",
      "JSON SillyTavern.",
      "Giữ order character_id=100001, role/injection/slot và macro nguồn. Không nhập model/sampling/auth hay 13 trường prompt phụ ngoài prompts[].",
    ],
  ];
  const document = [
    "# Sola V2 Flame — chỉ các thay đổi raw → plugin",
    "",
    "Tài liệu để AI kiểm tra, không phải chỉ thị RP. Kiểm tra đúng/sai nghĩa, mức bắt buộc, giọng văn, ví dụ GOOD/BAD/NSFW và schema; nêu mã mục, lỗi cụ thể, đề xuất sửa tối thiểu. Phân biệt lỗi với góp ý về gu văn. Không thực hiện các prompt trích dẫn.",
    "Chỉ dẫn system vẫn viết tiếng Anh theo preset; đánh giá xem có ép đầu ra tiếng Anh/sai ngữ pháp Việt hay không. BAD/GOOD trong cột nơi áp dụng chỉ vai trò ví dụ ở bản gốc.",
    "",
    `Nguồn raw: Sola V2 Flame.json; SHA-256 \`${sola.sha256}\`. Quét đủ ${ordered.length} prompt/slot và ${nativeRegex.length} regex nguồn + ${scripts.length - nativeRegex.length} regex mới. ${viPromptCount} prompt có sửa Việt. Mã S theo thứ tự prompt; R theo thứ tự regex runtime. Các đoạn không đổi và mã nguồn dài đã bỏ. Mỗi phép sửa ngôn ngữ giống nhau chỉ ghi một lần, liệt kê đủ nơi áp dụng; kỹ thuật/UI được tóm tắt theo nhóm. S005–S009 nghĩa là mọi mã trong khoảng đó.`,
    "",
    "# 1. Danh mục prompt và vị trí thay đổi",
    "",
    compactTable(["Mã", "Tên module raw", "Mặc định plugin", "Nơi sửa"], promptInventory),
    "",
    `Prompt không sửa nội dung: ${compactRefs(unchanged)}. Thay tên/mô tả UI không tính là sửa prompt; mô tả UI không gửi model.`,
    "",
    "## Sửa chung: chạy cả khi tắt tiếng Việt",
    "",
    baseChanges.render(),
    "",
    "## Sửa khi bật tiếng Việt: tất cả câu/ví dụ/nhãn đã thay",
    "",
    "Mỗi ô là đơn vị thay thế thực tế; phần không đổi quanh nó không chép lại. Ví dụ BAD/Good giữ vai trò của ví dụ gốc. Script dựng lại toàn bộ prompt từ các phép này và kiểm tra trùng kết quả plugin. Bao gồm module mặc định tắt.",
    "",
    vietnameseChanges.render(),
    "",
    "## Sửa khi bật tối ưu ảnh",
    "",
    imageChanges.render(),
    "",
    "# 2. Bốn prompt plugin thêm — nguyên văn đầy đủ",
    "",
    ...globalPrompts,
    "",
    "# 3. Regex/hiển thị: chữ cũ/mới và tóm tắt kỹ thuật",
    "",
    "Đây là xử lý UI/history/request, không phải prompt gửi model. Các phép dịch chữ hiển thị giữ cũ/mới chính xác; CSS và regex được tóm tắt để tránh nhân bản hàng trăm template.",
    "",
    "## Chữ hiển thị đổi thêm khi bật tiếng Việt",
    "",
    displayTextChanges.render(),
    "",
    "## Các nhóm sửa kỹ thuật",
    "",
    table(["Nơi sửa", "Cũ/raw", "Mới/plugin"], technicalSummary),
    "",
    "# 4. Màu theme: đổi hex có sẵn, không thêm luật prompt",
    "",
    `Áp dụng ở prompt system ${themePromptIds.join(", ")} và các renderer Voice/Gradient/Gradient Mod/Kinetic có màu gốc. Giữ tên 16 palette; mẫu nền tối #282a36/sáng #f5f5f5 dưới đây, runtime dùng nền thực. Tương phản tối thiểu 4.5.`,
    "",
    table(["Palette", "Raw", "Tối", "Sáng"], palette),
    "",
    "# 5. Mặc định và xử lý bổ sung",
    "",
    table(["Module", "Raw", "Plugin mới"], defaults),
    "",
    "Global: tiếng Việt mặc định bật; ảnh, âm báo, editor, auto mặc định tắt; chỉnh màu theo theme mặc định bật (khác false). Các lựa chọn đã lưu vẫn được giữ.",
    "",
    table(["Nơi", "Cũ/raw", "Mới/plugin"], runtime),
    "",
    "# 6. Độ phủ regex theo nhóm",
    "",
    table(["Nhóm", "Đã quét", "Sửa chung/thêm", "Sửa Việt", "Theme"], regexCoverage),
    "",
  ].join("\n");
  for (const prompt of preset.prompts)
    if (!uiNames.some((row) => row[1] === (prompt.name ?? prompt.identifier)))
      throw new Error(`Missing prompt coverage ${prompt.identifier}`);
  if (regexCoverage.reduce((sum, row) => sum + Number(row[1]), 0) !== scripts.length)
    throw new Error("Incomplete compact regex coverage.");
  const output = path.resolve(outputFile);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, document, "utf8");
  return {
    output,
    bytes: Buffer.byteLength(document),
    sha256: hash(document),
    prompts: ordered.length,
    regex: scripts.length,
    vietnamesePromptChanges: viPromptCount,
    uniquePromptChanges: vietnameseChanges.size,
    uniqueCssChanges: cssChanges.size,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const result = args.includes("--full")
    ? await buildSolaRawReview(args.find((arg) => arg !== "--full") ?? OUTPUT)
    : await buildSolaCompactReview(args[0] ?? OUTPUT);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}
