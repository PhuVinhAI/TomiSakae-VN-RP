import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  compilePrompts,
  discoverPromptModules,
  RECOMMENDED_PROMPT_BUDGET,
} from "../src/compiler.js";

const temporaryDirectories: string[] = [];

async function createFixture(): Promise<string> {
  const fixture = await mkdtemp(path.join(tmpdir(), "prompt-compiler-"));
  temporaryDirectories.push(fixture);
  await mkdir(path.join(fixture, "prompts", "nested"), { recursive: true });
  return fixture;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("prompt compiler", () => {
  it("discovers supported files in deterministic natural order", async () => {
    const fixture = await createFixture();
    const source = path.join(fixture, "prompts");
    await writeFile(path.join(source, "10-last.md"), "# Last\r\n", "utf8");
    await writeFile(path.join(source, "02-middle.txt"), "# Middle\n", "utf8");
    await writeFile(path.join(source, "nested", "01-nested.md"), "# Nested\n", "utf8");
    await writeFile(path.join(source, "ignored.json"), "{}\n", "utf8");

    const modules = await discoverPromptModules(source);

    expect(modules.map((module) => module.relativePath)).toEqual([
      "02-middle.txt",
      "10-last.md",
      "nested/01-nested.md",
    ]);
  });

  it("writes one reproducible, copy-ready master prompt without a generated preamble", async () => {
    const fixture = await createFixture();
    const source = path.join(fixture, "prompts");
    const output = path.join(fixture, "generated", "MASTER_PROMPT.md");
    await writeFile(path.join(source, "01-first.md"), "# First\n\nAlpha", "utf8");
    await writeFile(path.join(source, "02-second.md"), "# Second\n\nBeta", "utf8");

    const first = await compilePrompts({ sourceDirectory: source, outputFile: output });
    const second = await compilePrompts({
      sourceDirectory: source,
      outputFile: output,
      writeOutput: false,
    });

    expect(await readFile(output, "utf8")).toBe(first.compiled);
    expect(second.compiled).toBe(first.compiled);
    expect(second.digest).toBe(first.digest);
    expect(first.compiled).toBe("# First\n\nAlpha\n\n---\n\n# Second\n\nBeta\n");
    expect(first.compiled.startsWith("# First")).toBe(true);
    expect(first.compiled).not.toContain("MASTER PROMPT");
    expect(first.compiled).not.toContain("Source order");
    expect(first.compiled).not.toContain("SHA-256");
  });

  it("rejects an empty prompt directory", async () => {
    const fixture = await createFixture();

    await expect(
      compilePrompts({
        sourceDirectory: path.join(fixture, "prompts"),
        outputFile: path.join(fixture, "out.md"),
        writeOutput: false,
      }),
    ).rejects.toThrow("No .md or .txt prompt modules were found.");
  });

  it("warns above the soft prompt budget without blocking compilation", async () => {
    const fixture = await createFixture();
    const source = path.join(fixture, "prompts");
    const moduleCount = 3;
    const moduleSize = Math.ceil(RECOMMENDED_PROMPT_BUDGET.maxCompiledCharacters / moduleCount);

    await Promise.all(
      Array.from({ length: moduleCount }, (_, index) =>
        writeFile(
          path.join(source, `${String(index).padStart(2, "0")}-module.md`),
          `# Module ${index}\n\n${"x".repeat(moduleSize)}`,
          "utf8",
        ),
      ),
    );

    const result = await compilePrompts({
      sourceDirectory: source,
      outputFile: path.join(fixture, "out.md"),
      writeOutput: false,
    });

    expect(result.modules).toHaveLength(moduleCount);
    expect(result.compiled).toContain("# Module 2");
    expect(result.warnings).toEqual([
      expect.stringContaining(
        `recommended soft budget is ${RECOMMENDED_PROMPT_BUDGET.maxCompiledCharacters.toLocaleString("en-US")}`,
      ),
    ]);
  });

  it("keeps project prompt ordinals and the requested line frames stable", async () => {
    const modules = await discoverPromptModules(path.resolve("prompts"));
    const expectedLines = new Map<string, number>([
      ["01-authority-and-scope.md", 46],
      ["02-baseline-router.md", 21],
      ["03-risuai-asset-syntax.md", 16],
      ["04-asmr-performance-priority.md", 59],
      ["05-asmr-soundstage.md", 44],
      ["06-overwhelmed-dialogue.md", 23],
      ["07-intensity-and-recovery.md", 7],
      ["08-character-voice.md", 16],
      ["09-solo-and-harem-orchestration.md", 34],
      ["10-activity-agnostic-choreography.md", 26],
      ["11-consent-and-agency.md", 20],
      ["12-spatial-continuity.md", 11],
      ["13-language-and-localization.md", 25],
      ["14-prose-and-sensory-economy.md", 23],
      ["15-output-contract.md", 29],
      ["16-vietnamese-contrastive-examples.md", 409],
      ["17-final-quality-gate.md", 33],
    ]);

    expect(modules).toHaveLength(18);
    for (const [index, module] of modules.entries()) {
      expect(module.relativePath).toMatch(
        new RegExp(`^${String(index).padStart(2, "0")}-[a-z0-9-]+\\.(?:md|txt)$`),
      );

      const expected = expectedLines.get(module.relativePath);
      if (expected !== undefined) {
        expect(module.content.split("\n")).toHaveLength(expected);
      }
    }
  });

  it("preserves the full RisuAI system prefix as the immutable beginning", async () => {
    const prefix = (await readFile(path.resolve("prompts", "00-risuai-system-prefix.md"), "utf8"))
      .replace(/\r\n?/g, "\n")
      .trim();
    const result = await compilePrompts({
      sourceDirectory: path.resolve("prompts"),
      outputFile: path.resolve("generated", "MASTER_PROMPT.md"),
      writeOutput: false,
    });

    expect(prefix.split("\n")).toHaveLength(45);
    expect(result.compiled.startsWith(`${prefix}\n\n---\n\n`)).toBe(true);
    expect(prefix).toContain("<SYSTEM_RULE>");
    expect(prefix).toContain("<CONFIGURATION>");
    expect(prefix).toContain("<ROLEPLAY_RULE>");
    expect(prefix).toContain("[Xây dựng thế giới]");
    expect(prefix).toContain("[Phát triển nhân vật]");
    expect(prefix).toContain("[Tiến triển tự sự]");
    expect(prefix).toContain("[Tích hợp {{user}}]");
    expect(prefix).toContain("[Tính chân thật và nhất quán]");
    expect(prefix.endsWith("<ROLEPLAY_INFO>")).toBe(true);
    expect(result.compiled.endsWith("</ROLEPLAY_INFO>\n")).toBe(true);
  });

  it("integrates canon, route, agency, voice, ASMR, groups, and assets instead of isolating them", async () => {
    const result = await compilePrompts({
      sourceDirectory: path.resolve("prompts"),
      outputFile: path.resolve("generated", "MASTER_PROMPT.md"),
      writeOutput: false,
    });
    const compiled = result.compiled.replace(/\s+/g, " ");

    expect(compiled).toContain("nguồn–lượt–nhân vật–âm–cơ học–nhóm–ảnh");
    expect(compiled).toContain("Dữ kiện gốc quyết định điều gì tồn tại, ai có thể làm gì");
    expect(compiled).toContain("Độ dài gói có trọng số bằng không đối với độ dài phản hồi");
    expect(compiled).toContain("không tự hoàn thành phản ứng của đối phương");
    expect(compiled).toContain("mỗi tuyến cần ít nhất một ảnh đúng");
    expect(compiled).toContain("Mỗi người đang hoạt động có vị trí, hành động, tay/miệng");
    expect(compiled).toContain(
      "không tự cho phép chuỗi kỹ thuật, đổi tư thế, cao trào hoặc hồi phục",
    );
    expect(compiled).toContain("Tự chủ hiện qua lựa chọn, thời điểm, bộ phận rảnh");
    expect(compiled).not.toMatch(/\b(?:manga|hybrid)\b/i);
  });

  it("keeps Vietnamese ASMR continuous, character-specific, and scoped to the current moment", async () => {
    const result = await compilePrompts({
      sourceDirectory: path.resolve("prompts"),
      outputFile: path.resolve("generated", "MASTER_PROMPT.md"),
      writeOutput: false,
    });
    const compiled = result.compiled.replace(/\s+/g, " ");

    expect(compiled).toContain("neo mở -> mốc ngắn -> neo tiếp diễn -> mốc ngắn -> neo bàn giao");
    expect(compiled).toContain("không phải giới hạn tổng độ dài, số đoạn hay quota tiếng rên");
    expect(compiled).toContain("Miệng bận: dùng âm bị cản, hơi mũi/họng, nuốt và nhả đúng cơ quan");
    expect(compiled).toContain("Người không rên: ba lần trạng thái nghe được trở lại");
    expect(compiled).toContain("lời dưới quá tải giữ lõi ý định, đại từ và thái độ");
    expect(compiled).toContain("Tăng độ phân giải của cùng khoảnh khắc");
    expect(compiled).not.toMatch(/[\u3040-\u30ff\uac00-\ud7af]/u);
    expect(compiled).not.toContain("<Thoughts>");
  });

  it("ships a compact contiguous contrastive curriculum focused on model failure modes", async () => {
    const examples = await readFile(
      path.resolve("prompts", "16-vietnamese-contrastive-examples.md"),
      "utf8",
    );
    const numbers = [...examples.matchAll(/^### Ví dụ (\d+)/gm)].map((match) => Number(match[1]));

    expect(numbers).toEqual(Array.from({ length: 28 }, (_, index) => index + 1));
    expect(examples).toContain("## CHUỖI ÂM XUYÊN NHIỀU DÒNG");
    expect(examples).toContain("## MIỆNG ĐANG BẬN VÀ ÂM TỪ MIỆNG, MŨI, HỌNG");
    expect(examples).toContain("## ÂM TIẾP XÚC VÀ CƠ HỌC CỤ THỂ");
    expect(examples).toContain("## TỰ CHỦ CỦA NHÂN VẬT");
    expect(examples).toContain("## CẢNH NHIỀU NGƯỜI");
    expect(examples).toContain(
      "### Ví dụ 28 — Gói route dài làm phản hồi dài và chiếm quyền {{user}}",
    );
    expect(examples).toContain("nguồn–lượt–giọng–âm–cơ học–tự chủ–nhóm");
    expect(examples).not.toContain("## ĐỜI THƯỜNG:");
    expect(examples).not.toContain("## CÁC HỌ TƯ THẾ");
  });

  it("preserves every default RisuAI response instruction in Vietnamese and appends the final override", async () => {
    const response = await readFile(
      path.resolve("standalone", "RISUAI_RESPONSE_INSTRUCTION_REPLACEMENT.md"),
      "utf8",
    );

    expect(response.startsWith("<RESPONSE_INSTRUCTION>\n")).toBe(true);
    expect(response).toContain("[Kỹ thuật tự sự]");
    expect(response).toContain("[Biểu đạt nhân vật]");
    expect(response).toContain("[Hành động và thân mật]");
    expect(response).toContain("[Đa dạng và chống lặp]");
    expect(response).toContain("[Độc lập phong cách]");
    expect(response).toContain("[Nguyên tắc chính]");
    expect(response).toContain("Dùng điểm nhìn ngôi ba giới hạn có tính nhập vai.");
    expect(response).toContain("Kết phản hồi bằng hành động hoặc lời thoại có thể quan sát");
    expect(response).toContain("<FINAL_EXECUTION_OVERRIDE>");
    expect(response.indexOf("<FINAL_EXECUTION_OVERRIDE>")).toBeGreaterThan(
      response.indexOf("[Nguyên tắc chính]"),
    );
    expect(response.indexOf("</FINAL_EXECUTION_OVERRIDE>")).toBeLessThan(
      response.indexOf("</RESPONSE_INSTRUCTION>"),
    );
  });

  it("keeps change-route output compact and progressively compressed", async () => {
    const route = await readFile(
      path.resolve("standalone", "ROLEPLAY_CHANGE_ROUTE_SYSTEM_PROMPT.md"),
      "utf8",
    );

    expect(route.length).toBeLessThan(4_000);
    expect(route).toContain("ROUTE_001 -> ROUTE_002 -> ROUTE_003");
    expect(route).toContain("Route càng cũ càng nén thành ý chính");
    expect(route).toContain("Độ dài gói không quyết định độ dài phản hồi");
    expect(route).toContain("## CẦU NỐI HIỆN TẠI");
    expect(route).toContain("## KÝ ỨC VÀ KIẾN THỨC");
    expect(route).toContain("## VIỆC CHƯA XONG");
    expect(route).not.toContain("<ROLEPLAY_HANDOFF>");
    expect(route).not.toContain("Tầng 4");
  });
});
