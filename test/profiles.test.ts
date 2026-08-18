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
  it("discovers the four product profiles in manifest order", async () => {
    const profiles = await loadProjectProfiles();

    expect(profiles.map(({ manifest }) => manifest.id)).toEqual([
      "nsfw",
      "sfw",
      "nsfw-lite",
      "nsfw-lite-en",
    ]);
    expect(profiles.map(({ manifest }) => manifest.responseInstruction)).toEqual([
      "bundles/nsfw/RESPONSE_INSTRUCTION.md",
      "bundles/sfw/RESPONSE_INSTRUCTION.md",
      "bundles/nsfw-lite/RESPONSE_INSTRUCTION.md",
      "bundles/nsfw-lite-en/RESPONSE_INSTRUCTION.md",
    ]);
    expect(profiles.map(({ manifest }) => manifest.routeInstruction)).toEqual([
      "bundles/nsfw/ROLEPLAY_CHANGE_ROUTE.md",
      "bundles/sfw/ROLEPLAY_CHANGE_ROUTE.md",
      "bundles/nsfw-lite/ROLEPLAY_CHANGE_ROUTE.md",
      "bundles/nsfw-lite-en/ROLEPLAY_CHANGE_ROUTE.md",
    ]);

    for (const profile of profiles) {
      const responseInstruction = await readFile(profile.responseInstructionFile, "utf8");
      const routeInstruction = await readFile(profile.routeInstructionFile, "utf8");
      expect(profile.manifest.modules[0]).toBe(
        profile.manifest.id === "nsfw-lite-en"
          ? "profile-modules/nsfw-lite-en/00-gemma4-system-prefix.md"
          : "prompts/00-risuai-system-prefix.md",
      );
      expect(count(responseInstruction, "<RESPONSE_INSTRUCTION>")).toBe(1);
      expect(count(responseInstruction, "</RESPONSE_INSTRUCTION>")).toBe(1);
      expect(routeInstruction).toContain("<ROLEPLAY_CHANGE_ROUTE>");
      expect(routeInstruction).toContain("</ROLEPLAY_CHANGE_ROUTE>");
      expect(routeInstruction).toContain("<USER_NEXT_PROMPT>");
      expect(routeInstruction).toContain("</USER_NEXT_PROMPT>");
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
    const route = await readFile(gemma.routeInstructionFile, "utf8");

    expect(result.modules.map(({ relativePath }) => relativePath)).toEqual([
      "profile-modules/nsfw-lite-en/00-gemma4-system-prefix.md",
      "profile-modules/nsfw-lite-en/10-authority-state-and-turn.md",
      "profile-modules/nsfw-lite-en/20-risuai-assets.md",
      "profile-modules/nsfw-lite-en/30-scene-engine.md",
      "profile-modules/nsfw-lite-en/40-vietnamese-localization.md",
      "profile-modules/nsfw-lite-en/99-output-contract.md",
    ]);
    expect(result.compiled.length).toBeLessThanOrEqual(gemma.manifest.maxCompiledCharacters);
    expect(result.compiled).toContain("# PRIMARY OBJECTIVE");
    expect(result.compiled).toContain("# INSTRUCTION PRIORITY");
    expect(result.compiled).toContain("# DATA BOUNDARY");
    expect(result.compiled).toContain("# ACTIVE RULES");
    expect(result.compiled).toContain("# OUTPUT CONTRACT");
    expect(result.compiled).toContain("# SILENT VALIDATION");
    expect(result.compiled).toContain("IP01.");
    expect(result.compiled).toContain("DB01.");
    expect(result.compiled).toContain("OC01.");
    expect(result.compiled).toContain("VR10.");
    expect(result.compiled).toContain("OUTPUT_LANGUAGE").toBe(false);
    expect(result.compiled).toContain("zero Hangul characters");
    expect(result.compiled).toContain("every sound and every description of sound");
    expect(result.compiled).toContain("appearance, clothing, material, hairstyle, position");
    expect(result.compiled).toContain("Đang chờ prompt kế tiếp của bạn.");
    expect(result.compiled).not.toContain("## NGUỒN, LƯỢT VÀ TRẠNG THÁI");
    expect(response).toContain("OUTPUT_LANGUAGE: Vietnamese");
    expect(response).toContain("FORBIDDEN_ELEMENTS:");
    expect(response).toContain("# SILENT FINAL REVIEW");
    expect(response).toContain("Return only the validated final scene");
    expect(route).toContain("# INSTRUCTION PRIORITY");
    expect(route).toContain("# OUTPUT CONTRACT");
    expect(route).toContain("current motive by AI character");
    expect(route).toContain("Use no hard character ceiling");
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
    const profiles = (await loadProjectProfiles()).filter(
      ({ manifest }) => manifest.id !== "nsfw-lite-en",
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
      const routeInstruction = await readFile(profile.routeInstructionFile, "utf8");
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
      profiles.map(async (profile) => ({
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
    expect(routeInstructions.find(({ id }) => id === "nsfw-lite-en")!.source).toContain(
      "current motive by AI character",
    );
    expect(routeInstructions.find(({ id }) => id === "nsfw-lite-en")!.source).toContain(
      "Use no hard character ceiling",
    );
  });
});
