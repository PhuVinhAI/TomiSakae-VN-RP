import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { compilePrompts } from "../src/compiler.js";
import { compilePromptProfile, discoverPromptProfiles } from "../src/profiles.js";

const workspaceDirectory = path.resolve(".");
const profilesDirectory = path.join(workspaceDirectory, "profiles");

async function loadProjectProfiles() {
  return discoverPromptProfiles(profilesDirectory, workspaceDirectory);
}

function count(source: string, token: string): number {
  return source.split(token).length - 1;
}

function responseInstructionShell(source: string): string {
  return source
    .replace(/\r\n?/g, "\n")
    .replace(
      /<FINAL_EXECUTION_OVERRIDE>[\s\S]*<\/FINAL_EXECUTION_OVERRIDE>/,
      "<FINAL_EXECUTION_OVERRIDE>\n</FINAL_EXECUTION_OVERRIDE>",
    );
}

describe("prompt profiles", () => {
  it("discovers the six product profiles in manifest order", async () => {
    const profiles = await loadProjectProfiles();

    expect(profiles.map(({ manifest }) => manifest.id)).toEqual([
      "nsfw",
      "sfw",
      "nsfw-lite",
      "nsfw-lite-en",
      "nsfw-lite-gemini3-en",
      "nsfw-lite-mimo25-pro-en",
    ]);
    expect(profiles.map(({ manifest }) => manifest.responseInstruction)).toEqual([
      "bundles/nsfw/RESPONSE_INSTRUCTION.md",
      "bundles/sfw/RESPONSE_INSTRUCTION.md",
      "bundles/nsfw-lite/RESPONSE_INSTRUCTION.md",
      "bundles/nsfw-lite-en/RESPONSE_INSTRUCTION.md",
      "bundles/nsfw-lite-gemini3-en/RESPONSE_INSTRUCTION.md",
      "bundles/nsfw-lite-mimo25-pro-en/RESPONSE_INSTRUCTION.md",
    ]);
    expect(profiles.map(({ manifest }) => manifest.routeInstruction)).toEqual([
      "bundles/nsfw/ROLEPLAY_CHANGE_ROUTE.md",
      "bundles/sfw/ROLEPLAY_CHANGE_ROUTE.md",
      "bundles/nsfw-lite/ROLEPLAY_CHANGE_ROUTE.md",
      undefined,
      undefined,
      undefined,
    ]);

    for (const profile of profiles) {
      const responseInstruction = await readFile(profile.responseInstructionFile, "utf8");
      const expectedPrefix =
        profile.manifest.id === "nsfw-lite-en"
          ? "profile-modules/nsfw-lite-en/00-gemma4-system-prefix.md"
          : profile.manifest.id === "nsfw-lite-gemini3-en"
            ? "profile-modules/nsfw-lite-gemini3-en/00-gemini3-system-prefix.md"
            : profile.manifest.id === "nsfw-lite-mimo25-pro-en"
              ? "profile-modules/nsfw-lite-mimo25-pro-en/00-mimo25-system-prefix.md"
              : "prompts/00-risuai-system-prefix.md";
      expect(profile.manifest.modules[0]).toBe(expectedPrefix);
      expect(count(responseInstruction, "<RESPONSE_INSTRUCTION>")).toBe(1);
      expect(count(responseInstruction, "</RESPONSE_INSTRUCTION>")).toBe(1);
      if (profile.routeInstructionFile) {
        const routeInstruction = await readFile(profile.routeInstructionFile, "utf8");
        expect(routeInstruction).toContain("<ROLEPLAY_CHANGE_ROUTE>");
        expect(routeInstruction).toContain("</ROLEPLAY_CHANGE_ROUTE>");
        expect(routeInstruction).toContain("<USER_NEXT_PROMPT>");
        expect(routeInstruction).toContain("</USER_NEXT_PROMPT>");
      }
    }
  });

  it("keeps the full NSFW profile identical to the legacy prompts directory", async () => {
    const profiles = await loadProjectProfiles();
    const nsfw = profiles.find(({ manifest }) => manifest.id === "nsfw")!;
    const profiled = await compilePromptProfile({ profile: nsfw, writeOutput: false });
    const legacy = await compilePrompts({
      sourceDirectory: path.join(workspaceDirectory, "prompts"),
      outputFile: path.join(workspaceDirectory, "generated", "MASTER_PROMPT.md"),
      writeOutput: false,
    });

    expect(profiled.modules).toHaveLength(18);
    expect(profiled.compiled).toBe(legacy.compiled);
    expect(profiled.digest).toBe(legacy.digest);
    expect(profiled.outputFiles).toEqual([
      path.join(workspaceDirectory, "bundles", "nsfw", "MASTER_PROMPT.md"),
      path.join(workspaceDirectory, "generated", "MASTER_PROMPT.md"),
    ]);
    expect(profiled.compiled).toContain("họ muốn gì ngay lúc này, điều gì đang cản");
    expect(profiled.compiled).toContain("Mỗi câu nói phải là một hành động có mục đích");
    expect(profiled.compiled).toContain("không chèn cử chỉ chỉ để ngăn hai câu thoại");
  });

  it("keeps SFW plot-focused without turning it into a content filter", async () => {
    const profiles = await loadProjectProfiles();
    const sfw = profiles.find(({ manifest }) => manifest.id === "sfw")!;
    const result = await compilePromptProfile({ profile: sfw, writeOutput: false });

    expect(result.modules.map(({ relativePath }) => relativePath)).toEqual([
      "prompts/00-risuai-system-prefix.md",
      "profile-modules/shared/01-core-state-and-personalization.md",
      "profile-modules/shared/02-risuai-assets.md",
      "profile-modules/sfw/10-plot-and-character-depth.md",
      "profile-modules/shared/99-vietnamese-output-close.md",
    ]);
    expect(result.compiled.length).toBeLessThanOrEqual(sfw.manifest.maxCompiledCharacters);
    expect(result.compiled).toContain("Mọi nội dung phù hợp với bối cảnh mô phỏng đều được phép");
    expect(result.compiled).toContain("không được né tránh bằng cách làm chệch diễn biến tự nhiên");
    expect(result.compiled).toContain('Cấm tuyệt đối xu hướng "thiện hóa" phản hồi');
    expect(result.compiled).toContain(
      "Sắc thái tôn thờ, phục tùng, lạnh lùng, tàn nhẫn hay dịu dàng do character/world",
    );
    expect(result.compiled).toContain("muốn gì ngay lúc này -> điều gì đang cản");
    expect(result.compiled).toContain("Áp lực từ tổ chức, phe phái, tài nguyên, thời hạn");
    expect(result.compiled).toContain("lời nói hay không tự thắng");
    expect(result.compiled).not.toContain("## NSFW LITE");
    expect(result.compiled).not.toContain("## HỢP ĐỒNG ĐỘ PHỦ CỦA VÍ DỤ");
    expect(result.compiled).not.toContain("## ASMR");
    expect(result.compiled).not.toContain("cao trào");
  });

  it("keeps NSFW Lite unrestricted and fully capable of multi-character scenes", async () => {
    const profiles = await loadProjectProfiles();
    const lite = profiles.find(({ manifest }) => manifest.id === "nsfw-lite")!;
    const liteResult = await compilePromptProfile({ profile: lite, writeOutput: false });
    const liteResponse = await readFile(lite.responseInstructionFile, "utf8");

    expect(liteResult.compiled.length).toBeLessThanOrEqual(lite.manifest.maxCompiledCharacters);
    expect(liteResponse).toContain("nhiều người");
    expect(liteResponse).toContain("ảnh nhóm thật sự chứa họ");
    expect(liteResponse).not.toContain("Chỉ theo dõi {{user}} và một nhân vật AI");
    expect(liteResponse).not.toContain("không tạo, điều phối, cân bằng hoặc duy trì cảnh tập thể");
    expect(liteResult.modules.map(({ relativePath }) => relativePath)).toEqual([
      "prompts/00-risuai-system-prefix.md",
      "profile-modules/nsfw-lite/01-core-state-and-personalization.md",
      "profile-modules/nsfw-lite/02-risuai-assets.md",
      "prompts/07-intensity-and-recovery.md",
      "prompts/09-solo-and-harem-orchestration.md",
      "profile-modules/nsfw-lite/10-nsfw-lite-core.md",
      "profile-modules/nsfw-lite/99-vietnamese-output-close.md",
    ]);
    expect(liteResult.compiled).toContain("## CẢNH TRƯỞNG THÀNH CÔ ĐỌNG");
    expect(liteResult.compiled).toContain("dark/deep dark");
    expect(liteResult.compiled).toContain("không tự chặn, cứu rỗi");
    expect(liteResult.compiled).toContain("Một hành động không tự cho phép đổi tư thế");
    expect(liteResult.compiled).toContain(
      "sắc thái tôn thờ/đê tiện/thô bạo đã có trong character/world vẫn giữ đúng người",
    );
    expect(liteResult.compiled).toContain("Khóa chữ Hàn áp dụng cho toàn bộ phần văn cảnh");
    expect(liteResult.compiled).toContain("Chỉ hai loại được Latin hóa");
    expect(liteResult.compiled).toContain(
      "Không được xuất cùng một nội dung bằng nhiều ngôn ngữ dưới bất kỳ hình thức nào",
    );
    expect(liteResult.compiled).toContain("Bất kỳ từ hoặc chuỗi Hàn nào không thuộc hai loại đó");
    expect(liteResult.compiled).toContain(
      "Trong cảnh quan hệ, mọi âm thanh và cách mô tả âm thanh phải được viết bằng tiếng Việt tự nhiên",
    );
    expect(liteResponse).toContain("Không được có bất kỳ ký tự Hangul nào");
    expect(liteResponse).toContain("cấm dùng bất kỳ từ hoặc chuỗi tiếng Anh nào");
    expect(liteResponse).toContain(
      "Không được xuất cùng một nội dung bằng nhiều ngôn ngữ dưới bất kỳ hình thức nào",
    );
    expect(liteResponse).toContain("số ký tự Hangul bằng không");
    expect(liteResult.compiled).toContain(
      "Mọi mô tả ngoại hình, trang phục, chất liệu, kiểu tóc, tư thế và hoạt động quan hệ phải dùng từ tiếng Việt",
    );
    expect(liteResponse).toContain(
      "Mọi mô tả ngoại hình, trang phục, chất liệu, kiểu tóc, tư thế và hoạt động quan hệ phải dùng từ tiếng Việt",
    );
    expect(liteResult.compiled).not.toMatch(
      /[\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff]/u,
    );
    expect(liteResponse).not.toMatch(
      /[\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff]/u,
    );
    expect(liteResult.compiled).toContain("muốn gì ngay lúc này -> điều gì đang cản");
    expect(liteResult.compiled).toContain("Không lặp máy móc khuôn kể rồi thoại rồi kể");
    expect(liteResult.compiled).toContain("## ĐIỀU PHỐI CẢNH MỘT VÀ NHIỀU NHÂN VẬT");
    expect(liteResult.compiled).toContain("ảnh nhóm thật sự chứa tất cả họ");
    expect(liteResult.compiled).toContain("không đồng bộ cả nhóm");
    expect(liteResult.compiled).toContain("cao trào hoặc hồi phục của một người");
    expect(liteResult.compiled).toContain(
      "Danh sách cấm từ vựng trong lời thoại/cảnh thân mật theo yêu cầu người dùng",
    );
    expect(liteResult.compiled).toContain(
      "Chỉ tránh đúng các mục này trong phạm vi cảnh thân mật; không biến danh sách thành lệnh cấm chung",
    );
    expect(liteResult.compiled).toContain("`hỏng`");
    expect(liteResult.compiled).not.toContain("### Ví dụ 1");
  });

  it("builds an English Gemma 4 control prompt with a Vietnamese output contract", async () => {
    const profiles = await loadProjectProfiles();
    const gemma = profiles.find(({ manifest }) => manifest.id === "nsfw-lite-en")!;
    const result = await compilePromptProfile({ profile: gemma, writeOutput: false });
    const response = await readFile(gemma.responseInstructionFile, "utf8");
    expect(gemma.routeInstructionFile).toBeUndefined();
    expect(result.modules.map(({ relativePath }) => relativePath)).toEqual([
      "profile-modules/nsfw-lite-en/00-gemma4-system-prefix.md",
      "profile-modules/nsfw-lite-en/10-authority-state-and-turn.md",
      "profile-modules/nsfw-lite-en/15-character-trajectory-control.md",
      "profile-modules/nsfw-lite-en/30-scene-engine.md",
      "profile-modules/nsfw-lite-en/35-image-context-and-selection.md",
      "profile-modules/nsfw-lite-en/40-vietnamese-localization.md",
      "profile-modules/nsfw-lite-en/99-output-contract.md",
    ]);
    expect(result.compiled.length).toBeLessThanOrEqual(gemma.manifest.maxCompiledCharacters);
    expect(result.compiled).toContain("# PRIMARY OBJECTIVE");
    expect(result.compiled).toContain("<CONFIGURATION>");
    expect(result.compiled).toContain("</CONFIGURATION>");
    expect(result.compiled).toContain("<ROLEPLAY_RULE>");
    expect(result.compiled).toContain("</ROLEPLAY_RULE>");
    expect(result.compiled).toContain("# INSTRUCTION PRIORITY");
    expect(result.compiled).toContain("# DATA BOUNDARY");
    expect(result.compiled).toContain("# ACTIVE RULES");
    expect(result.compiled).toContain("# OUTPUT CONTRACT");
    expect(result.compiled).toContain("# SILENT VALIDATION");
    expect(result.compiled.match(/<SYSTEM_RULE>/g)).toHaveLength(1);
    expect(result.compiled.match(/<\/SYSTEM_RULE>/g)).toHaveLength(1);
    expect(result.compiled.match(/<CONFIGURATION>/g)).toHaveLength(1);
    expect(result.compiled.match(/<\/CONFIGURATION>/g)).toHaveLength(1);
    expect(result.compiled.match(/<ROLEPLAY_RULE>/g)).toHaveLength(1);
    expect(result.compiled.match(/<\/ROLEPLAY_RULE>/g)).toHaveLength(1);
    expect(result.compiled.match(/<ROLEPLAY_INFO>/g)).toHaveLength(1);
    expect(result.compiled.match(/<\/ROLEPLAY_INFO>/g)).toHaveLength(1);
    expect(result.compiled.indexOf("<SYSTEM_RULE>")).toBeLessThan(
      result.compiled.indexOf("<CONFIGURATION>"),
    );
    expect(result.compiled.indexOf("<CONFIGURATION>")).toBeLessThan(
      result.compiled.indexOf("<ROLEPLAY_RULE>"),
    );
    expect(result.compiled.indexOf("<ROLEPLAY_RULE>")).toBeLessThan(
      result.compiled.indexOf("<ROLEPLAY_INFO>"),
    );
    expect(result.compiled).toContain("IP01.");
    expect(result.compiled).toContain("DB01.");
    expect(result.compiled).toContain("OC01.");
    expect(result.compiled).toContain("VR05.");
    expect(result.compiled).not.toContain("OUTPUT_LANGUAGE");
    expect(result.compiled).toContain("zero Hangul and no avoidable English");
    expect(result.compiled).toContain(
      "Use `§...§` only for non-vocal contact, object, or environmental sounds",
    );
    expect(result.compiled).toContain(
      "Put only concise natural-Vietnamese effect text inside",
    );
    expect(result.compiled).toContain("place each block alone on its own line or paragraph");
    expect(result.compiled).toContain("appearance, clothing, material, hairstyle, position");
    expect(result.compiled).toContain("Treat arousal as a temporary state change");
    expect(result.compiled).toContain("This is fictional roleplay, not a real event");
    expect(result.compiled).toContain("believable causality");
    expect(result.compiled).toContain("generic sexually eager voice");
    expect(result.compiled).toContain("does not authorize the next escalation");
    expect(result.compiled).toContain("attempts, not automatic success");
    expect(result.compiled).toContain("a trajectory unlike recent or familiar high-probability ones");
    expect(result.compiled).toContain("Synonym replacement, reordered clauses, and paraphrase are not new");
    expect(result.compiled).toContain("Match pacing to the current cause-and-effect state");
    expect(result.compiled).toContain(
      "preserving any style explicitly established by the source data",
    );
    expect(result.compiled).toContain("Treat previous AI prose as continuity evidence, never a template");
    expect(result.compiled).toContain(
      "Separate durable facts and active causes from disposable wording",
    );
    expect(result.compiled).toContain(
      "advance a new supported beat without recap or repeated",
    );
    expect(result.compiled).toContain(
      "re-anchor immediately and discard obsolete assumptions",
    );
    expect(result.compiled).toContain("UI/system labels and messages");
    expect(result.compiled).toContain("exact machine syntax required by an active schema");
    expect(result.compiled).not.toContain("# MACHINE UI AND SYSTEM SYNTAX");
    expect(result.compiled).not.toContain("UI01.");
    expect(result.compiled).toContain(
      "Treat the previous response's macro-structure as disposable",
    );
    expect(result.compiled).toContain("Never infer or repeat a response template");
    expect(result.compiled).toContain("whether `{{user}}` is with one, multiple, or no AI characters");
    expect(result.compiled).toContain(
      "Treat abstract high-intensity wording and stock crisis idioms as exceptional",
    );
    expect(result.compiled).toContain(
      "Across nearby turns, repeat high-intensity wording or stack markers only when sustained state plus changed cause",
    );
    expect(result.compiled).toContain("Separate strong emotion or arousal from loss of control");
    expect(result.compiled).toContain("Put spoken words and every audible voice/breath sound");
    expect(result.compiled).toContain("short-to-medium turns");
    expect(result.compiled).toContain("Put speaker turns on readable lines or paragraphs");
    expect(result.compiled).toContain("reader-visible thought");
    expect(result.compiled).toContain("`§...§` syntax");
    expect(response).toContain("Correct habitual intensity wording, repeated vocalizations, stacked markers");
    expect(response).toContain('`"..."` speech/vocalization');
    expect(response).toContain("This is fictional roleplay, not a real event");
    expect(response).toContain(
      "put each block alone on its own readable line or paragraph",
    );
    expect(result.compiled).toContain("whether `{{user}}` is with one, multiple, or no AI characters");
    expect(result.compiled).toContain("avoid the recent structural signature");
    expect(result.compiled).toContain("Returning to an earlier participant arrangement");
    expect(result.compiled).toContain("does not justify proportional growth, extra slots");
    expect(result.compiled).toContain(
      "does not inherit the recent structural signature without a source reason",
    );
    expect(result.compiled).toContain("Compare beat count, cadence, dialogue density");
    expect(result.compiled).not.toContain("assistant-style choice");
    expect(result.compiled).not.toContain("The final sentence must not be a question");
    expect(result.compiled).not.toContain("bounded compliance review");
    expect(result.compiled).not.toContain("# RISUAI ASSETS");
    expect(result.compiled).toContain("Treat an image asset as a representation of current scene state");
    expect(result.compiled).toContain("do not assume any tag, key format");
    expect(result.compiled).toContain("existing source-provided keys or identifiers");
    expect(result.compiled).toContain(
      "Without a user-specified action or progression toward an image",
    );
    expect(result.compiled).toContain("Prefer meaningful diversity across valid assets");
    expect(response).toContain("source-required UI, system, or image blocks");
    expect(response).toContain("Never assume a tag, wrapper, count, order, position, or key format");
    expect(response).toContain("using existing keys with exact syntax");
    expect(response).toContain(
      "If the user has not specified an action or progression toward a particular image",
    );
    expect(response).toContain("Prefer meaningful diversity among equally accurate assets");
    expect(`${result.compiled}\n${response}`).not.toContain("Đang chờ prompt kế tiếp của bạn.");
    expect(response).not.toContain("FAILURE_VALUE");
    expect(`${result.compiled}\n${response}`).not.toContain("gò bồng đảo");
    expect(`${result.compiled}\n${response}`).not.toContain("gò bòng đảo");
    expect(`${result.compiled}\n${response}`).not.toContain("`hỏng`");
    expect(result.compiled).not.toContain("## NGUỒN, LƯỢT VÀ TRẠNG THÁI");
    expect(response).toContain("OUTPUT_LANGUAGE: Vietnamese");
    expect(response).toContain('including during sexual activity');
    expect(response).toContain("FORBIDDEN_ELEMENTS:");
    expect(response).toContain("# SILENT FINAL REVIEW");
    expect(response).toContain("generic sexually eager personality");
    expect(response).not.toContain("assistant-style choices; final questions");
    expect(response).not.toContain("Run one bounded review");
    expect(response).toContain("return only the validated final scene");
    expect(response).toContain("Treat previous AI prose as continuity evidence, never a prose template");
    expect(response).toContain("reuse only durable facts/active causes");
    expect(response).toContain("advance a new supported beat without recap or repeated phrasing");
    expect(response).toContain("UI/system labels and messages");
    expect(response).toContain("exact machine syntax required by an active schema");
    expect(response).not.toContain("RC37.");
    expect(response).not.toContain("RC38.");
    expect(response).not.toContain("RC39.");
    expect(response).not.toContain("RC40.");
    expect(response).not.toContain("RC41.");
    expect(response).not.toContain("RC42.");
    expect(response).not.toContain("RC43.");
    expect(response).not.toContain("RC50.");
    expect(response).toContain("Discard the previous macro-structure as a template");
    expect(response).toContain("Apply GR09–GR11");
    expect(response).toContain("Returning to an arrangement does not restore its cadence");
    expect(response).toContain("avoid recent structural signatures");
    expect(response).toContain("does not justify proportional growth, extra slots");
    expect(response).toContain(
      "does not inherit the recent structural signature without a source reason",
    );
    expect(`${result.compiled}\n${response}`).not.toMatch(
      /[\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff]/u,
    );
  });

  it("preserves Gemma compression boundaries and resolves every reminder reference", async () => {
    const profiles = await loadProjectProfiles();
    const gemma = profiles.find(({ manifest }) => manifest.id === "nsfw-lite-en")!;
    const { compiled } = await compilePromptProfile({ profile: gemma, writeOutput: false });
    const response = await readFile(gemma.responseInstructionFile, "utf8");

    // Structural regression checks, not a behavioral equivalence test for the model.
    for (const clause of [
      "unless a higher-authority source explicitly changes them",
      "Do not assert unsupported missing facts, abilities, knowledge",
      "without cascading extra events into this turn",
      "Do not add an unprovided position change",
      "User-authored content deliberately inside",
      "Location, time, weather, access",
      "Keep each active off-focus character present",
      "never make dialogue read like literary narration, a report, or an essay",
      "Put speaker turns on readable lines or paragraphs",
      "sentence, line, dash, or ellipsis",
      "Do not force pause marks or gestures",
      'non-vocal effects out of `"..."` and `*...*`',
      "for any sexual sound",
      "never inline or beside",
      "Preserve source-supported contradiction",
      "Change any relationship or character arc",
      "preserving identity, limits, relationships, and unresolved conflicts",
      "causal role, and observable openings",
      "Without a scene reason",
      "does not justify proportional growth, extra slots",
      "Without a user-specified action or progression",
      "no introduction or closing note outside the scene",
      "only when a changed cause makes repetition meaningful",
      "only for a continuity reason",
    ]) {
      expect(compiled, clause).toContain(clause);
    }
    expect(compiled).not.toContain("Only user-authored content");
    expect(response).toContain("reminders and references below do not replace or narrow them");
    expect(response).toContain("Put spoken words and every voice/breath vocalization");
    expect(response).not.toContain("Put all words");
    expect(response).toContain(
      "Keep narration, action, gestures, explanation, and sound descriptions outside markers",
    );
    expect(response).not.toContain("bilingual notes outside markers");
    expect(response).toContain("never duplicate languages or attach source glosses");
    expect(compiled).not.toContain("never mix sound with");
    expect(compiled).not.toContain("force no pause in every line");

    const labels = new Set(
      [...compiled.matchAll(/^([A-Z]+\d+[A-Z]?)\./gm)].map((match) => match[1]),
    );
    const nextNumber = new Map<string, number>();
    for (const text of [compiled, response]) {
      for (const match of text.matchAll(/^(([A-Z]+)\d+[A-Z]?)\./gm)) {
        const prefix = match[2]!;
        const expected = nextNumber.get(prefix) ?? 1;
        expect(match[1]).toBe(`${prefix}${String(expected).padStart(2, "0")}`);
        nextNumber.set(prefix, expected + 1);
      }
    }
    const referencePattern = /\b([A-Z]{2}\d+[A-Z]?)(?:–([A-Z]{2}\d+[A-Z]?))?/g;
    for (const text of [compiled, response]) {
      for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n\n")) {
        const body = paragraph.replace(/^[A-Z]+\d+[A-Z]?\.\s*/, "");
        for (const match of body.matchAll(referencePattern)) {
          expect(labels.has(match[1]), `Missing master rule ${match[1]}`).toBe(true);
          if (match[2]) {
            expect(labels.has(match[2]), `Missing master rule ${match[2]}`).toBe(true);
            const start = /^([A-Z]+)(\d+)$/.exec(match[1]!)!;
            const end = /^([A-Z]+)(\d+)$/.exec(match[2])!;
            if (start[1] === end[1]) {
              expect(Number(start[2])).toBeLessThanOrEqual(Number(end[2]));
              for (let number = Number(start[2]); number <= Number(end[2]); number++) {
                const label = `${start[1]}${String(number).padStart(2, "0")}`;
                expect(labels.has(label), `Missing rule inside range: ${label}`).toBe(true);
              }
            }
          }
        }
      }
    }
  });

  it("builds a concise Gemini 3.x control prompt with Vietnamese output", async () => {
    const profiles = await loadProjectProfiles();
    const gemini = profiles.find(({ manifest }) => manifest.id === "nsfw-lite-gemini3-en")!;
    const gemma = profiles.find(({ manifest }) => manifest.id === "nsfw-lite-en")!;
    const result = await compilePromptProfile({ profile: gemini, writeOutput: false });
    const gemmaResult = await compilePromptProfile({ profile: gemma, writeOutput: false });
    const response = await readFile(gemini.responseInstructionFile, "utf8");

    expect(gemini.routeInstructionFile).toBeUndefined();
    expect(result.modules.map(({ relativePath }) => relativePath)).toEqual([
      "profile-modules/nsfw-lite-gemini3-en/00-gemini3-system-prefix.md",
      "profile-modules/nsfw-lite-gemini3-en/10-authority-state-and-turn.md",
      "profile-modules/nsfw-lite-gemini3-en/15-character-trajectory-control.md",
      "profile-modules/nsfw-lite-gemini3-en/30-scene-engine.md",
      "profile-modules/nsfw-lite-gemini3-en/40-vietnamese-localization.md",
      "profile-modules/nsfw-lite-gemini3-en/99-output-contract.md",
    ]);
    expect(result.compiled.length).toBeLessThan(gemmaResult.compiled.length);
    expect(result.compiled.length).toBeLessThanOrEqual(gemini.manifest.maxCompiledCharacters);
    expect(result.compiled).toContain("# RESPONSE SHAPE");
    expect(result.compiled).toContain("minor transient environmental details");
    expect(result.compiled).toContain("multiple causally connected actions");
    expect(result.compiled).toContain("Do not infer the response language from any source");
    expect(result.compiled).toContain("Regardless of source language");
    expect(result.compiled).toContain("# SILENT CHECK");
    expect(result.compiled).not.toContain("VR10.");
    expect(result.compiled).not.toContain("# RISUAI ASSETS");
    expect(result.compiled).not.toContain("ROLEPLAY_CHANGE_ROUTE");
    expect(result.compiled).not.toContain("choice menu");
    expect(response).toContain("OUTPUT_LANGUAGE: Vietnamese");
    expect(response).toContain("Fully developed roleplay prose and dialogue");
    expect(response).toContain("multiple causally connected actions");
    expect(response).toContain("zero Hangul");
    expect(`${result.compiled}\n${response}`).not.toContain("Đang chờ prompt kế tiếp của bạn.");
    expect(response).not.toContain("FAILURE_VALUE");
    expect(`${result.compiled}\n${response}`).not.toContain("gò bồng đảo");
    expect(`${result.compiled}\n${response}`).not.toContain("gò bòng đảo");
    expect(`${result.compiled}\n${response}`).not.toContain("`hỏng`");
    expect(`${result.compiled}\n${response}`).not.toMatch(
      /[\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff]/u,
    );
  });

  it("builds a medium-length MiMo 2.5 Pro control prompt with Vietnamese output", async () => {
    const profiles = await loadProjectProfiles();
    const mimo = profiles.find(({ manifest }) => manifest.id === "nsfw-lite-mimo25-pro-en")!;
    const result = await compilePromptProfile({ profile: mimo, writeOutput: false });
    const response = await readFile(mimo.responseInstructionFile, "utf8");

    expect(mimo.routeInstructionFile).toBeUndefined();
    expect(result.modules.map(({ relativePath }) => relativePath)).toEqual([
      "profile-modules/nsfw-lite-mimo25-pro-en/00-mimo25-system-prefix.md",
      "profile-modules/nsfw-lite-mimo25-pro-en/10-authority-state-and-turn.md",
      "profile-modules/nsfw-lite-mimo25-pro-en/15-character-trajectory-control.md",
      "profile-modules/nsfw-lite-mimo25-pro-en/30-scene-engine.md",
      "profile-modules/nsfw-lite-mimo25-pro-en/40-vietnamese-localization.md",
      "profile-modules/nsfw-lite-mimo25-pro-en/99-output-contract.md",
    ]);
    expect(result.compiled.length).toBeLessThanOrEqual(mimo.manifest.maxCompiledCharacters);
    expect(result.compiled).toContain("medium-length");
    expect(result.compiled).toContain("active state");
    expect(result.compiled).toContain("clothing actually worn");
    expect(result.compiled).toContain("Causality comes before novelty");
    expect(result.compiled).toContain("Do not impose a numeric word or character limit");
    expect(result.compiled).not.toMatch(/\b\d+\s+(?:words?|paragraphs?|characters?)\b/i);
    expect(result.compiled).not.toContain("ROLEPLAY_CHANGE_ROUTE");
    expect(result.compiled).not.toContain("# RISUAI ASSETS");
    expect(response).toContain("Medium-length, fully developed roleplay prose and dialogue");
    expect(response).toContain("Do not impose a numeric word or character limit");
    expect(response).toContain("state ledger");
    expect(response).toContain("clothing actually worn");
    expect(response).not.toContain("FAILURE_VALUE");
    expect(`${result.compiled}\n${response}`).not.toMatch(
      /[\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\uac00-\ud7af\ud7b0-\ud7ff]/u,
    );
  });

  it("balances the ROLEPLAY_INFO wrapper in every compiled profile", async () => {
    const profiles = await loadProjectProfiles();
    const results = await Promise.all(
      profiles.map((profile) => compilePromptProfile({ profile, writeOutput: false })),
    );

    for (const result of results) {
      expect(count(result.compiled, "<ROLEPLAY_INFO>")).toBe(1);
      expect(count(result.compiled, "</ROLEPLAY_INFO>")).toBe(1);
      expect(result.compiled.trimEnd().endsWith("</ROLEPLAY_INFO>")).toBe(true);
      expect(result.warnings).toEqual([]);
    }
  });

  it("keeps the exact NSFW system prefix and response shell across the three legacy profiles", async () => {
    const profiles = (await loadProjectProfiles()).filter(({ manifest }) =>
      ["nsfw", "sfw", "nsfw-lite"].includes(manifest.id),
    );
    const expectedPrefix = (
      await readFile(path.join(workspaceDirectory, "prompts", "00-risuai-system-prefix.md"), "utf8")
    )
      .replace(/\r\n?/g, "\n")
      .trim();
    const nsfwResponse = await readFile(
      path.join(workspaceDirectory, "bundles", "nsfw", "RESPONSE_INSTRUCTION.md"),
      "utf8",
    );

    for (const profile of profiles) {
      const result = await compilePromptProfile({ profile, writeOutput: false });
      const responseInstruction = await readFile(profile.responseInstructionFile, "utf8");

      expect(result.compiled.startsWith(`${expectedPrefix}\n\n---\n\n`)).toBe(true);
      expect(responseInstructionShell(responseInstruction)).toBe(
        responseInstructionShell(nsfwResponse),
      );
    }
  });

  it("keeps runtime prompt artifacts free of compiler-facing terminology", async () => {
    const profiles = await loadProjectProfiles();

    for (const profile of profiles) {
      const responseInstruction = await readFile(profile.responseInstructionFile, "utf8");
      const routeInstruction = profile.routeInstructionFile
        ? await readFile(profile.routeInstructionFile, "utf8")
        : "";
      const result = await compilePromptProfile({ profile, writeOutput: false });
      const runtimeText = `${responseInstruction}\n${routeInstruction}\n${result.compiled}`;

      expect(runtimeText).not.toMatch(/\bprofile\b/i);
      expect(runtimeText).not.toMatch(/\bmodule\b/i);
      expect(runtimeText).not.toContain("model nhỏ");
      expect(runtimeText).not.toContain("NSFW Lite");
      expect(runtimeText).not.toMatch(/1-on-1|one-on-one/i);
      expect(runtimeText).not.toMatch(/\bstory-\d/i);
    }
  });

  it("persists the active motive at the appropriate route depth", async () => {
    const profiles = await loadProjectProfiles();
    const routeInstructions = await Promise.all(
      profiles
        .filter(
          (profile): profile is typeof profile & { routeInstructionFile: string } =>
            profile.routeInstructionFile !== undefined,
        )
        .map(async (profile) => ({
          id: profile.manifest.id,
          source: await readFile(profile.routeInstructionFile, "utf8"),
        })),
    );

    expect(routeInstructions.find(({ id }) => id === "nsfw")!.source).toContain(
      "động lực tức thời: [theo từng nhân vật",
    );
    expect(routeInstructions.find(({ id }) => id === "sfw")!.source).toContain(
      "tổ chức, tài nguyên, thời hạn, thời tiết hoặc hoạt động ngoài cảnh",
    );
    expect(routeInstructions.find(({ id }) => id === "nsfw-lite")!.source).toContain(
      "động lực từng nhân vật AI",
    );
    expect(routeInstructions.find(({ id }) => id === "nsfw-lite")!.source).toContain(
      "Không có trần ký tự cứng",
    );
    expect(routeInstructions.find(({ id }) => id === "nsfw-lite-en")).toBeUndefined();
  });
});
