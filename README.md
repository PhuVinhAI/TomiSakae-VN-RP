# ASMR Prompt Compiler

Dự án Node.js + TypeScript nhỏ gọn để quản lý prompt theo từng module và ghép chúng thành một file
duy nhất, theo thứ tự tên file. Bộ prompt giữ hội thoại đời thường linh hoạt, tập trung vào ASMR chi
tiết cho cảnh thân mật, và bắt buộc chèn ảnh asset RisuAI khi character có danh sách ảnh hợp lệ.

## Yêu cầu

- Node.js 20.19 trở lên
- pnpm 11

## Sử dụng

```bash
pnpm install
pnpm compile:prompts
```

File tổng hợp được tạo tại `generated/MASTER_PROMPT.md`. Nội dung file bắt đầu ngay từ module đầu
tiên, không chèn metadata, danh sách source hay lời mở đầu, nên có thể copy trực tiếp.

Thêm prompt mới bằng cách tạo file `.md` hoặc `.txt` trong `prompts/`. Tên file quyết định thứ tự
ghép; ví dụ `05-dialogue.md` được ghép trước `10-quality.md`. Không cần sửa config.

## Lệnh

```bash
pnpm dev -- --list              # Xem thứ tự module
pnpm compile:prompts            # Sinh lại master prompt
pnpm check:prompts              # Kiểm tra file tổng hợp có mới hay không
pnpm check                      # TypeScript và ESLint
pnpm test                       # Vitest
pnpm build                      # Build CLI vào dist/
pnpm ci                         # Chạy toàn bộ kiểm tra
```

CLI cũng hỗ trợ đường dẫn tùy chỉnh khi cần:

```bash
pnpm dev -- --source prompts --output generated/MASTER_PROMPT.md
pnpm dev -- --stdout
```

## Cấu trúc

```text
prompts/                     Các khối prompt có thể chỉnh sửa riêng
src/compiler.ts              Khám phá, sắp xếp và ghép module
src/cli.ts                   Giao diện dòng lệnh
test/compiler.test.ts        Kiểm thử tính ổn định của compiler
generated/MASTER_PROMPT.md   File tổng hợp được sinh tự động
```

Compiler không chèn thời gian tạo file, nên cùng một bộ module luôn tạo ra cùng một kết quả và cùng
mã SHA-256. Điều này giúp dễ review thay đổi và phát hiện file tổng hợp bị cũ.
