# Trình biên dịch bộ lệnh ASMR tiếng Việt

Dự án Node.js + TypeScript để quản lý bộ lệnh theo từng mô-đun và ghép chúng thành một tệp duy nhất
theo thứ tự tên. Bộ lệnh chỉ tạo phản hồi nhập vai bằng tiếng Việt, giữ đời thường linh hoạt, tập
trung sâu vào ASMR khi cảnh thân mật thật sự hoạt động và dùng ảnh RisuAI đúng nhân vật/trạng thái
khi có danh sách tài nguyên hợp lệ.

Hệ thống không còn coi dữ kiện gốc, route, quyền lượt, giọng nhân vật, tự chủ, ASMR, cơ học, cảnh
nhóm, tiếng Việt và ảnh là các checklist rời. Mỗi module vẫn có trọng tâm riêng nhưng các câu lệnh
được nối bằng quan hệ điều kiện và hệ quả, để model áp dụng chúng đồng thời trong cùng khoảnh khắc
thay vì nhớ từng luật độc lập rồi vá kết quả ở cuối.

## Yêu cầu

- Node.js 20.19 trở lên
- pnpm 11

## Sử dụng

```bash
pnpm install
pnpm compile:prompts
```

Tệp tổng hợp được tạo tại `generated/MASTER_PROMPT.md`. Nội dung tệp bắt đầu ngay từ mô-đun đầu
tiên, không chèn metadata, danh sách nguồn hay lời mở đầu, nên có thể sao chép trực tiếp.

Thêm bộ lệnh mới bằng cách tạo tệp `.md` hoặc `.txt` trong `prompts/`. Tên tệp quyết định thứ tự
ghép; ví dụ `05-dialogue.md` được ghép trước `10-quality.md`. Không cần sửa cấu hình.

## Lệnh

```bash
pnpm dev --list                 # Xem thứ tự mô-đun
pnpm compile:prompts            # Sinh lại bộ lệnh chính
pnpm check:prompts              # Kiểm tra tệp tổng hợp có mới hay không
pnpm check                      # TypeScript và ESLint
pnpm test                       # Vitest
pnpm build                      # Biên dịch CLI vào dist/
pnpm zip:handoff                # ZIP nguồn cần thiết để gửi cho AI khác
pnpm ci                         # Chạy toàn bộ kiểm tra
```

CLI cũng hỗ trợ đường dẫn tùy chỉnh khi cần:

```bash
pnpm dev --source prompts --output generated/MASTER_PROMPT.md
pnpm dev --stdout
```

## Đóng gói để chuyển cho AI khác

Chạy `pnpm zip:handoff` để tạo ZIP trong `exports/`. Script lấy danh sách bằng
`git ls-files --cached --others --exclude-standard`, vì vậy nó gồm tệp đang được Git theo dõi và tệp
mới không bị ignore, nhưng loại `.git`, `node_modules`, `dist`, coverage, master sinh tự động và ZIP
cũ. Thư mục `exports/` cũng nằm trong `.gitignore`.

```powershell
pnpm zip:handoff -ListOnly
pnpm zip:handoff -OutputPath exports\prompt-review.zip
```

`-ListOnly` chỉ in danh sách dự kiến. `-OutputPath` chọn tên/đường dẫn ZIP; đường dẫn tương đối được
tính từ gốc dự án.

## Cấu trúc

```text
prompts/                     Các khối bộ lệnh có thể chỉnh sửa riêng
src/compiler.ts              Khám phá, sắp xếp và ghép mô-đun
src/cli.ts                   Giao diện dòng lệnh
scripts/export-project.ps1   Đóng gói tệp Git cần thiết thành ZIP
test/compiler.test.ts        Kiểm thử tính ổn định của compiler
generated/MASTER_PROMPT.md   Tệp tổng hợp được sinh tự động
prompts/16-vietnamese-contrastive-examples.md
                             Bộ mẫu SAI → VIẾT LẠI tập trung lỗi ASMR thân mật
standalone/ROLEPLAY_CHANGE_ROUTE_SYSTEM_PROMPT.md
                             Bộ lệnh chuyển route ngắn và nén ký ức gần/bền
standalone/RISUAI_RESPONSE_INSTRUCTION_REPLACEMENT.md
                             RESPONSE_INSTRUCTION mặc định đã Việt hóa + phần chốt cuối
```

Trình biên dịch không chèn thời gian tạo tệp, nên cùng một bộ mô-đun luôn tạo ra cùng một kết quả và
cùng mã SHA-256. Điều này giúp dễ rà soát thay đổi và phát hiện tệp tổng hợp bị cũ.

## Bộ ví dụ đối chiếu

`prompts/16-vietnamese-contrastive-examples.md` là lớp giáo huấn bằng trường hợp cụ thể ngay trước
cổng chất lượng cuối. Mô-đun có 28 ví dụ liên tục, chỉ giữ các lỗi model thường không tự sửa: một âm
rồi kể dài, nhãn âm thay biểu diễn, lời tỉnh dưới quá tải, mức âm theo tính cách, miệng đang bận, âm
tiếp xúc, tự chủ, cảnh nhiều người, ảnh, độ sâu, chống lặp và route chiếm quyền lượt.

Các ví dụ không chỉ sửa riêng âm thanh: mỗi bản viết lại nối nguồn, trạng thái, giọng, cơ học, tự
chủ, tuyến nhóm và quyền lượt. Khi tác động còn duy trì, giọng/hơi/miệng tái xuất qua nhiều dòng
thay vì một tiếng rồi tràn mô tả; người nhiều, ít hoặc không rên dùng kênh đúng tính cách, không
theo quota.

Các đoạn **SAI** là dữ liệu âm tính, không phải văn mẫu, lịch sử route hay kho câu để sao chép. Nếu
bản nháp mắc cùng cấu trúc, model phải giữ dữ kiện đúng rồi dựng lại toàn đoạn từ nguyên nhân; không
vá bằng cách nối thêm một tiếng, ảnh, từ tục hoặc lời giải thích kỹ thuật.

## Khung dòng và mật độ quy tắc

File 00 là khung hệ thống chung đầy đủ của RisuAI và được giữ nguyên. Các module 01–17 giữ đúng số
dòng đã khóa trong kiểm thử, nhưng mỗi dòng nội dung được viết dày hơn để liên kết các quy tắc liên
quan. Mốc 90.000 ký tự là ngân sách mềm: compiler chỉ cảnh báo khi vượt, không chặn biên dịch. Các
tệp trong `prompts/` và `standalone/` được loại khỏi Prettier để formatter không tự gộp khung dòng;
TypeScript, cấu hình và README vẫn dùng định dạng tự động bình thường.

## Phạm vi tiếng Việt

- `generated/MASTER_PROMPT.md`, các mô-đun trong `prompts/`, chỉ dẫn phản hồi và bộ lệnh chuyển
  route đều bắt buộc nội dung hướng người đọc bằng tiếng Việt.
- Chỉ giữ nguyên biến, thẻ XML, khóa tài nguyên ảnh, mã, đường dẫn và tên riêng cần thiết về kỹ
  thuật.
- bộ lệnh phiên âm Gemini cũng được hướng dẫn hoàn toàn bằng tiếng Việt. Riêng lời nghe thấy trong
  audio vẫn phải chép nguyên ngôn ngữ nguồn để bảo toàn tính nguyên văn; đây là ngoại lệ kỹ thuật
  của tác vụ phiên âm, không phải hỗ trợ đa ngôn ngữ cho nhập vai.

## Chuyển route và ký ức dài hạn

`standalone/ROLEPLAY_CHANGE_ROUTE_SYSTEM_PROMPT.md` thay bộ lệnh bàn giao cũ bằng gói ngắn. Route là
một đoạn liên tục của cùng dòng nhập vai, không phải nhánh hoặc thế giới mới; có thể chuyển khi
chuỗi hành động đã hoàn thành hoặc vẫn đang dở nhưng cần sang cửa sổ hội thoại mới.

Cầu nối hiện tại là phần duy nhất giữ đủ chi tiết để đáp ngay. Route gần chỉ giữ nguyên nhân, quyết
định, hệ quả và việc dở; route xa được hợp nhất thành ký ức bền. Mỗi sự thật xuất hiện một lần, ký
ức được theo dõi theo người biết và route càng cũ càng ngắn, nên gói không tăng gần tuyến tính theo
log.

Để tạo route kế tiếp, đưa cho bộ lệnh chuyển route: gói `<ROLEPLAY_CHANGE_ROUTE>` gần nhất nếu có,
phần hội thoại phát sinh trong route hiện tại, lượt cuối đang chờ và các nguồn nhân vật/thế giới cần
thiết. Trong cuộc trò chuyện mới, đặt gói được sinh vào lớp bộ nhớ sau thẻ nhân vật và tri thức thế
giới nhưng trước lượt hội thoại cần trả lời. Không cần gắn lại toàn bộ log của các route cũ đã được
nén trong gói.

## Thứ tự chèn khuyến nghị cho RisuAI

Khi khung lệnh bao ngoài mặc định có `ROLEPLAY_RULE`, `ROLEPLAY_INFO` và `RESPONSE_INSTRUCTION`,
dùng thứ tự sau:

1. System/configuration chung của nền tảng.
2. `ROLEPLAY_RULE` chung.
3. Dán toàn bộ `generated/MASTER_PROMPT.md` làm prefix thay cho phần từ `<SYSTEM_RULE>` đến hết
   `<ROLEPLAY_INFO>` cũ. Master đã chứa sẵn các tag mở/đóng này; không lồng nó vào một
   `<ROLEPLAY_INFO>` khác.
4. Thẻ nhân vật, hồ sơ nhân vật người dùng, các mục tri thức thế giới đang hoạt động và bộ nhớ do
   RisuAI chèn.
5. `standalone/RISUAI_RESPONSE_INSTRUCTION_REPLACEMENT.md` thay cho khối mặc định nếu nền tảng cho
   phép. Tệp giữ đầy đủ mọi mục/chỉ dẫn mặc định của RisuAI đã dịch sang tiếng Việt, sau đó nối
   `<FINAL_EXECUTION_OVERRIDE>` ngay trước `</RESPONSE_INSTRUCTION>`; không cần chèn thêm phần chốt
   hoặc phần điền trước riêng cho AI.

Không chuyển toàn bộ master dài xuống vị trí cuối: làm vậy tăng độ gần của luật phong cách nhưng đẩy
thẻ nhân vật và tri thức nền ra xa phản hồi. Phần chốt cuối đã được ghép vào cuối chỉ dẫn phản hồi
để nhắc lại các điều kiện chặn có nguy cơ cao trong cùng thông điệp hệ thống và tránh bị gửi sai
thành vai `assistant`.
