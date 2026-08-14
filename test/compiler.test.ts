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

  it("keeps one semantic owner for every refactored behavior domain", async () => {
    const modules = await discoverPromptModules(path.resolve("prompts"));
    const byOrdinal = new Map(
      modules.map((module) => [module.relativePath.slice(0, 2), module.content]),
    );
    const contracts: Record<string, string[]> = {
      "01": ["Gói route là ký ức đã hoàn tất", "Chỉ dẫn cá nhân hóa bền của người dùng"],
      "02": ["Cổng vào", "Hợp nhất cá nhân hóa trước khi viết", "Chọn chế độ và phạm vi"],
      "03": ["đúng nhân vật + outfit + emotion", "ảnh nhóm thật sự chứa tất cả họ"],
      "04": ["Âm là hành động, không phải nhãn", "Tăng độ phân giải mà không tiến thời gian"],
      "05": ["Miệng, hơi và tiếng Việt khả thi", "không bịa tiếng vọng sâu bên trong"],
      "06": ["Nén theo năng lực, giữ đúng nhân vật", "Không biến hội thoại thành tranh biện"],
      "07": ["Không tự gây cao trào", "chỉ viết phản ứng giác quan"],
      "08": ["Phản ứng mà không nhai lại lời trước", "`Oho` chỉ là lựa chọn"],
      "09": ["Trạng thái độc lập", "không đồng bộ cả nhóm"],
      "10": ["Một hành động không tự cho phép chuỗi kỹ thuật", "Độ sâu là phân giải"],
      "11": ["Tuổi và đồng thuận không phải điều kiện tiên quyết", "Không trao chiến thắng bù trừ"],
      "12": ["Route không làm thời gian trôi", "Chỉ tiến phần lượt mới cho phép"],
      "13": [
        "Tiếng Việt là yêu cầu đầu ra cố định",
        "Xưng hô, trực diện và nhịp",
        "Giữ một nền văn kể qua mọi nội dung",
      ],
      "14": ["Đa dạng không ghi đè cá nhân hóa", "Không đọc lại gói route"],
      "15": ["chỉ trả cảnh nhập vai tiếng Việt hoàn thiện", "route -> lượt -> cá nhân hóa"],
      "16": ["HỢP ĐỒNG ĐỘ PHỦ CỦA VÍ DỤ", "Không sao chép câu chữ"],
      "17": ["CỔNG CHẤT LƯỢNG CUỐI", "Chỉ trả văn nhập vai tiếng Việt đã sửa xong"],
    };

    for (const [ordinal, requiredPhrases] of Object.entries(contracts)) {
      expect(byOrdinal.get(ordinal), `missing module ${ordinal}`).toBeDefined();
      for (const phrase of requiredPhrases) {
        expect(byOrdinal.get(ordinal), `${ordinal} lost: ${phrase}`).toContain(phrase);
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
    expect(createHash("sha256").update(prefix, "utf8").digest("hex")).toBe(
      "7a25290104108dd34d6f093bc2e192b0ed13c122b01fa3db970bc18aeb003664",
    );
    expect(result.compiled.endsWith("</ROLEPLAY_INFO>\n")).toBe(true);
    expect(result.compiled.match(/<ROLEPLAY_INFO>/g)).toHaveLength(1);
    expect(result.compiled.match(/<\/ROLEPLAY_INFO>/g)).toHaveLength(1);
  });

  it("keeps the refactored master within the soft budget", async () => {
    const result = await compilePrompts({
      sourceDirectory: path.resolve("prompts"),
      outputFile: path.resolve("generated", "MASTER_PROMPT.md"),
      writeOutput: false,
    });

    expect(result.compiled.length).toBeLessThanOrEqual(
      RECOMMENDED_PROMPT_BUDGET.maxCompiledCharacters,
    );
    expect(result.warnings).toEqual([]);
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
    expect(compiled).toContain("quan hệ–động cơ bền");
    expect(compiled).toContain("không chỉ đọc kết luận gần nhất");
    expect(compiled).toContain("Chỉ dẫn cá nhân hóa bền của người dùng");
    expect(compiled).toContain("nội dung họ chủ động đặt giữa `{{` và `}}`");
    expect(compiled).toContain("CÁ NHÂN HÓA ĐANG HOẠT ĐỘNG");
    expect(compiled).toContain("không tự xóa sở thích vì nó không được nhắc lại");
    expect(compiled).toContain("chỉ phần mới nhất và cụ thể nhất");
    expect(compiled).toContain("không tự hoàn thành phản ứng của đối phương");
    expect(compiled).toContain("Không sao chép, trích lại, diễn đạt gần như toàn bộ");
    expect(compiled).toContain("Không biến hội thoại thành tranh biện hoặc phán quyết");
    expect(compiled).toContain("Để năng lực hiện tại thắng hình tượng anh hùng");
    expect(compiled).toContain("Tách ý định, cố gắng và hoàn thành");
    expect(compiled).toContain("Mỗi nhân vật phải giữ riêng vị trí, hành động");
    expect(compiled).toContain("Xưng hô bền theo từng chiều");
    expect(compiled).toContain("A gọi B không quyết định B gọi A");
    expect(compiled).toContain("Chuyển route, đổi cảm xúc, thân mật hoặc tình dục tăng");
    expect(compiled).toContain("cũ -> mới");
    expect(compiled).toContain(
      "không tự cho phép chuỗi kỹ thuật, đổi tư thế, cao trào hoặc hồi phục",
    );
    expect(compiled).toContain("Tiếng Việt là yêu cầu đầu ra cố định");
    expect(compiled).toContain("Loại nội dung chỉ làm đổi sự kiện, danh từ, động từ");
    expect(compiled).toContain("Từ vựng trực diện đi cùng cú pháp tiếng Việt đời thường");
    expect(compiled).toContain("Chỉ dùng sắc thái tôn thờ khi character/world");
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
    expect(examples).toContain("## HỢP ĐỒNG ĐỘ PHỦ CỦA VÍ DỤ");
    expect(examples.length).toBeLessThan(50_000);
    expect(examples).not.toContain("**SAI**");
    expect(examples).not.toContain("**VIẾT LẠI**");
  });

  it("keeps the compact transcription prompt faithful, uncertain, and format-locked", async () => {
    const transcript = await readFile(
      path.resolve("standalone", "GEMINI_NSFW_ASMR_TRANSCRIPTION_SYSTEM_PROMPT.md"),
      "utf8",
    );

    expect(transcript.length).toBeLessThan(6_000);
    expect(transcript).toContain("Chép toàn bộ audio đầy đủ, trung thực, đúng thời gian");
    expect(transcript).toContain("không được làm dịu hay lược bỏ");
    expect(transcript).toContain("không dịch, phiên tự hoặc chuẩn hóa");
    expect(transcript).toContain("[UNCERTAIN: candidate?]");
    expect(transcript).toContain("[OVERLAPPING SPEECH, INAUDIBLE HH:MM:SS-HH:MM:SS]");
    expect(transcript).toContain("[ERROR: AUDIO UNAVAILABLE]");
    expect(transcript).toContain("<TRANSCRIPT>");
    expect(transcript).toContain("</TRANSCRIPT>");
  });

  it("preserves every default RisuAI response instruction in Vietnamese and appends the final override", async () => {
    const response = await readFile(
      path.resolve("standalone", "RISUAI_RESPONSE_INSTRUCTION_REPLACEMENT.md"),
      "utf8",
    );

    expect(response).toMatch(/^<RESPONSE_INSTRUCTION>\r?\n/);
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
    expect(response).toContain("Một nền văn kể qua mọi nội dung");
    expect(response).toContain("giữ từ vựng trực diện trong cú pháp đời thường");
    expect(response).toContain("Sắc thái tôn thờ do character/world");
    expect(response).toContain("Cá nhân hóa bền và ghi đè có phạm vi");
    expect(response).toContain("Không bỏ qua, làm trái, tự cho hết hạn hoặc chỉ áp dụng một lượt");
    expect(response).toContain("Nạp và giữ `XƯNG HÔ ĐANG HOẠT ĐỘNG` theo từng chiều");
    expect(response).toContain("`QUAN HỆ VÀ ĐỘNG CƠ BỀN`");
    expect(response).toContain("dùng nguyên nhân–hệ quả được giữ để hiểu hành vi");
    expect(response).toContain("không tự cho phép đổi cách nói/gọi");
    expect(
      createHash("sha256")
        .update(
          response
            .slice(0, response.indexOf("<FINAL_EXECUTION_OVERRIDE>"))
            .replaceAll("\r\n", "\n")
            .trim(),
          "utf8",
        )
        .digest("hex"),
    ).toBe("cd541e0b8498d923ab67e77d0e6b6e38ff129a90818f49a4461104aece72957d");
    expect(response.indexOf("<FINAL_EXECUTION_OVERRIDE>")).toBeGreaterThan(
      response.indexOf("[Nguyên tắc chính]"),
    );
    expect(response.indexOf("</FINAL_EXECUTION_OVERRIDE>")).toBeLessThan(
      response.indexOf("</RESPONSE_INSTRUCTION>"),
    );
  });

  it("keeps change-route snapshots adaptive, deep, and updateable", async () => {
    const route = await readFile(
      path.resolve("standalone", "ROLEPLAY_CHANGE_ROUTE_SYSTEM_PROMPT.md"),
      "utf8",
    );

    expect(route.length).toBeLessThan(11_500);
    expect(route).toContain("Bảo toàn đủ trạng thái truyện");
    expect(route).toContain("ba mức mục tiêu và một chế độ bảo toàn ngoại lệ");
    expect(route).toContain("`GỌN`: mục tiêu tối đa 12.000 ký tự");
    expect(route).toContain("`SÂU`: mục tiêu tối đa 18.000 ký tự");
    expect(route).toContain("`MỞ RỘNG`: mục tiêu tối đa 24.000 ký tự");
    expect(route).toContain("`BẢO TOÀN`: được vượt 24.000");
    expect(route).toContain("không được lớn lên chỉ vì số route");
    expect(route).toContain("Cùng một sự thật phải giữ cùng mã");
    expect(route).toContain("xóa bản ghi không được bảo vệ trước");
    expect(route).toContain("Thay hoàn toàn `TRẠNG THÁI HIỆN TẠI`");
    expect(route).toContain("## DỮ KIỆN ĐƯỢC BẢO VỆ");
    expect(route).toContain("Không xóa hoặc làm phẳng");
    expect(route).toContain("không tự hết hạn vì cũ");
    expect(route).toContain("nguyên nhân -> điều đã xảy ra -> hệ quả hiện tại -> điều còn chờ");
    expect(route).toContain("## META");
    expect(route).toContain("## TRẠNG THÁI HIỆN TẠI");
    expect(route).toContain("## THAY ĐỔI GẦN NHẤT");
    expect(route).toContain("## SỰ THẬT HOẠT ĐỘNG");
    expect(route).toContain("## QUAN HỆ VÀ ĐỘNG CƠ BỀN");
    expect(route).toContain("## RANH GIỚI KIẾN THỨC");
    expect(route).toContain("## XƯNG HÔ ĐANG HOẠT ĐỘNG");
    expect(route).toContain("A gọi B không quyết định B gọi A");
    expect(route).toContain("chưa xác lập");
    expect(route).toContain("## VIỆC CHƯA XONG");
    expect(route).toContain("## CÁ NHÂN HÓA ĐANG HOẠT ĐỘNG");
    expect(route).toContain("## MỐC BỀN");
    expect(route).toContain("không phải trần xóa");
    expect(route).toContain("`E`: khoảng 8 thay đổi gần nhất");
    expect(route).toContain("`F`: khoảng 30 sự thật hoạt động");
    expect(route).toContain("`R`: khoảng 16 trạng thái quan hệ–động cơ bền");
    expect(route).toContain("`K`: khoảng 18 ngoại lệ kiến thức");
    expect(route).toContain("`A`: khoảng 16 cặp xưng hô");
    expect(route).toContain("`O`: khoảng 14 việc chưa xong");
    expect(route).toContain("`P`: khoảng 12 quy tắc cá nhân hóa");
    expect(route).toContain("`M`: khoảng 12 mốc bền");
    expect(route).toContain("## KIỂM TRA PHỦ TRƯỚC KHI XUẤT");
    expect(route).toContain("- version: 2.1");
    expect(route).toContain("- độ_sâu: [GỌN / SÂU / MỞ RỘNG / BẢO TOÀN]");
    expect(route).toContain("<USER_NEXT_PROMPT>");
    expect(route).toContain("[Nhập prompt kế tiếp của bạn tại đây");
    expect(route).not.toContain("<ROLEPLAY_HANDOFF>");
    expect(route).not.toContain("ROUTE_001 -> ROUTE_002 -> ROUTE_003");
    expect(route).not.toContain("## KÝ ỨC VÀ KIẾN THỨC");
    expect(route).not.toContain("## XƯNG HÔ VÀ GIỌNG THEO CẶP");
    expect(route).not.toContain("không vượt quá 9.500 ký tự");
    expect(route).not.toContain("tối đa 6 bản ghi");
    expect(route).not.toContain("Tầng 4");
    expect(route).not.toContain("## LỖI KHÔNG KẾ THỪA");
  });
});
