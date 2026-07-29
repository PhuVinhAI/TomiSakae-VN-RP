# ASMR Manga Prompt Compiler

Du an Node.js + TypeScript nho gon de quan ly prompt theo tung module va ghep chung thanh mot file
duy nhat, theo thu tu ten file. Bo prompt mac dinh sua hoi thoai doi thuong, ket hop ASMR voi nhip
manga cho canh than mat nguoi lon khong do hoa, va bat buoc chen anh asset RisuAI khi character co
danh sach anh hop le.

## Yeu cau

- Node.js 20.19 tro len
- pnpm 11

## Su dung

```bash
pnpm install
pnpm compile:prompts
```

File tong hop duoc tao tai `generated/MASTER_PROMPT.md`.

Them prompt moi bang cach tao file `.md` hoac `.txt` trong `prompts/`. Ten file quyet dinh thu tu
ghep; vi du `05-dialogue.md` duoc ghep truoc `10-quality.md`. Khong can sua config.

## Lenh

```bash
pnpm dev -- --list              # Xem thu tu module
pnpm compile:prompts            # Sinh lai master prompt
pnpm check:prompts              # Kiem tra file tong hop co moi hay khong
pnpm check                      # TypeScript va ESLint
pnpm test                       # Vitest
pnpm build                      # Build CLI vao dist/
pnpm ci                         # Chay toan bo kiem tra
```

CLI cung ho tro duong dan tuy chinh khi can:

```bash
pnpm dev -- --source prompts --output generated/MASTER_PROMPT.md
pnpm dev -- --stdout
```

## Cau truc

```text
prompts/                     Cac khoi prompt co the chinh sua rieng
src/compiler.ts              Kham pha, sap xep va ghep module
src/cli.ts                   Giao dien dong lenh
test/compiler.test.ts        Kiem thu tinh on dinh cua compiler
generated/MASTER_PROMPT.md   File tong hop duoc sinh tu dong
```

Compiler khong chen thoi gian tao file, nen cung mot bo module luon tao ra cung mot ket qua va cung
ma SHA-256. Dieu nay giup de review thay doi va phat hien file tong hop bi cu.
