import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
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

  it("keeps all 18 project prompt modules nonempty and in ordinal order", async () => {
    const modules = await discoverPromptModules(path.resolve("prompts"));
    const expectedOrdinals = Array.from({ length: 18 }, (_, index) =>
      String(index).padStart(2, "0"),
    );

    expect(modules).toHaveLength(expectedOrdinals.length);
    for (const [index, module] of modules.entries()) {
      expect(module.relativePath).toMatch(
        new RegExp(`^${expectedOrdinals[index]}-[a-z0-9-]+\\.(?:md|txt)$`),
      );
      expect(module.content.trim().length).toBeGreaterThan(0);
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

  it("ports the additive route, language, dialogue, agency, ASMR, and group rules", async () => {
    const result = await compilePrompts({
      sourceDirectory: path.resolve("prompts"),
      outputFile: path.resolve("generated", "MASTER_PROMPT.md"),
      writeOutput: false,
    });
    const compiled = result.compiled.replace(/\s+/g, " ");

    expect(compiled).toContain("nguồn–lượt–nhân vật–âm–cơ học–nhóm–ảnh");
    expect(compiled).toContain("Dữ kiện gốc quyết định điều gì tồn tại, ai có thể làm gì");
    expect(compiled).toContain("<USER_NEXT_PROMPT>");
    expect(compiled).toContain("Đang chờ prompt kế tiếp của bạn.");
    expect(compiled).toContain("Độ dài gói có trọng số bằng không đối với độ dài phản hồi");
    expect(compiled).toContain("không tự hoàn thành phản ứng của đối phương");
    expect(compiled).toContain("Không sao chép, trích lại, diễn đạt gần như toàn bộ");
    expect(compiled).toContain("Không biến hội thoại thành tranh biện hoặc phán quyết");
    expect(compiled).toContain("Để năng lực hiện tại thắng hình tượng anh hùng");
    expect(compiled).toContain("Tách ý định, cố gắng và hoàn thành");
    expect(compiled).toContain("Mỗi nhân vật phải giữ riêng vị trí, hành động");
    expect(compiled).toContain(
      "không tự cho phép chuỗi kỹ thuật, đổi tư thế, cao trào hoặc hồi phục",
    );
    expect(compiled).toContain("Tiếng Việt là yêu cầu đầu ra cố định");
    expect(compiled).not.toMatch(/\b(?:manga|hybrid)\b/i);
  });

  it("keeps ASMR causal and character-led without sound quotas", async () => {
    const result = await compilePrompts({
      sourceDirectory: path.resolve("prompts"),
      outputFile: path.resolve("generated", "MASTER_PROMPT.md"),
      writeOutput: false,
    });
    const compiled = result.compiled.replace(/\s+/g, " ");

    expect(compiled).toContain("Duy trì tính liên tục nghe được nhưng không áp quota");
    expect(compiled).toContain(
      "Không có số dòng, độ dài nguyên âm, âm lượng, kiểu chữ, mẫu cao trào hay khuôn phát âm bắt buộc",
    );
    expect(compiled).toContain("Khi còn đủ tỉnh táo và nói ổn, ưu tiên lời tự nhiên có nghĩa");
    expect(compiled).toContain(
      "âm vô nghĩa, tiếng rên phản xạ, âm tiết bị cản, âm qua mũi hoặc họng và từ vỡ đều hợp lệ",
    );
    expect(compiled).toContain("không bắt chúng phải mã hóa một lời xin, lệnh hay ý định");
    expect(compiled).toContain("Không viết một âm vỡ rồi quay về phân tích dài");
    expect(compiled).toContain("không viết một âm vỡ rồi chuyển sang nhiều câu mô tả cảm giác");
    expect(compiled).toContain("Tăng độ phân giải của cùng khoảnh khắc");
    expect(compiled).not.toContain("neo mở -> mốc ngắn -> neo tiếp diễn");
    expect(compiled).not.toContain("ba lần trạng thái nghe được trở lại");
    expect(compiled).not.toContain("ba dòng cao trào");
    expect(compiled).not.toMatch(/[\u3040-\u30ff\uac00-\ud7af]/u);
    expect(compiled).not.toContain("<Thoughts>");
  });

  it("ships 109 contiguous positive examples with every source sample line unchanged", async () => {
    const examples = await readFile(
      path.resolve("prompts", "16-vietnamese-contrastive-examples.md"),
      "utf8",
    );
    const numbers = [...examples.matchAll(/^### Ví dụ (\d+)/gm)].map((match) => Number(match[1]));
    const sampleLines = examples
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .filter((line) => line.startsWith(">"));

    expect(numbers).toEqual(Array.from({ length: 109 }, (_, index) => index + 1));
    expect(sampleLines).toHaveLength(231);
    expect(createHash("sha256").update(sampleLines.join("\n"), "utf8").digest("hex")).toBe(
      "ebb2548dcf6ae815ebe489d9f68900db16e3f1d7ae00ccec898b2c05586199d2",
    );
    expect(examples).toContain("## TÍNH LIÊN TỤC NGHE ĐƯỢC XUYÊN SUỐT PHẢN HỒI");
    expect(examples).toContain("## MIỆNG ĐANG BẬN VÀ ÂM TỪ MIỆNG, MŨI, HỌNG");
    expect(examples).toContain("## ÂM TIẾP XÚC, ĐỤNG CHẠM VÀ CẢM GIÁC");
    expect(examples).toContain("## TỰ CHỦ CỦA NHÂN VẬT");
    expect(examples).toContain("## CẢNH HAREM VÀ NHIỀU NHÂN VẬT");
    expect(examples).toContain("## CẢM GIÁC BÊN TRONG VÀ KÍCH THÍCH");
    expect(examples).toContain("## CAO TRÀO, GIỌNG VÀ DƯ ÂM");
    expect(examples).toContain("## VÍ DỤ DƯƠNG RỘNG TRÊN NHIỀU HÀNH ĐỘNG THÂN MẬT");
    expect(examples).toContain("## TỪ VỰNG TIẾNG VIỆT TRỰC DIỆN TRONG NGỮ CẢNH");
    expect(examples).toContain("## VÍ DỤ TÌNH DỤC CƯỜNG ĐỘ CAO VÀ CỰC ĐOAN");
    expect(examples).toContain("## VÍ DỤ HAREM THUẦN BỔ SUNG");
    expect(examples).toContain("### Ví dụ 29 — Gói route chờ prompt mới của người dùng");
    expect(examples).toContain("### Ví dụ 100 — Trì hoãn cực khoái rồi giải phóng áp đảo");
    expect(examples).toContain("### Ví dụ 109 — Chịch tập thể với nhiều nhịp diễn ra đồng thời");
    expect(examples).toContain("Âm của nhân vật có thể vô nghĩa");
    expect(examples).not.toContain("**SAI**");
    expect(examples).not.toContain("**VIẾT LẠI**");
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
    expect(response).toContain("Không lặp, trích hoặc diễn đạt gần như toàn bộ câu trước");
    expect(response).toContain("Không áp quota số dòng");
    expect(response).toContain("Tự chủ, năng lực và chống anh hùng hóa");
    expect(response).toContain("âm phản xạ hoặc âm vô nghĩa đúng trạng thái");
    expect(response).toContain("Khóa đầu ra tiếng Việt tuyệt đối");
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
    expect(route).toContain("<USER_NEXT_PROMPT>");
    expect(route).toContain("[Nhập prompt kế tiếp của bạn tại đây");
    expect(route).toContain("Không có gì trong gói này là yêu cầu hiện tại của người dùng");
    expect(route).not.toContain("<ROLEPLAY_HANDOFF>");
    expect(route).not.toContain("Tầng 4");
  });
});
