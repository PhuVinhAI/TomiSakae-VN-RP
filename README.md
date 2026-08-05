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
                             109 ví dụ dương tiếng Việt cho solo và harem
standalone/ROLEPLAY_CHANGE_ROUTE_SYSTEM_PROMPT.md
                             Bộ lệnh chuyển route ngắn và nén ký ức gần/bền
standalone/RISUAI_RESPONSE_INSTRUCTION_REPLACEMENT.md
                             RESPONSE_INSTRUCTION mặc định đã Việt hóa + phần chốt cuối
```

Trình biên dịch không chèn thời gian tạo tệp, nên cùng một bộ mô-đun luôn tạo ra cùng một kết quả và
cùng mã SHA-256. Điều này giúp dễ rà soát thay đổi và phát hiện tệp tổng hợp bị cũ.

## Bộ ví dụ đối chiếu

`prompts/16-vietnamese-contrastive-examples.md` là lớp giáo huấn bằng 109 ví dụ dương liên tục ngay
trước cổng chất lượng cuối. Một hợp đồng độ phủ chung thay cho phần giải thích lặp sau từng ví dụ;
231 dòng văn mẫu vẫn được giữ nguyên từng câu chữ và SHA-256 từ nhánh nguồn. Các ví dụ bao quát
quyền nguồn, ranh giới lượt, giọng nhân vật, miệng đang bận, âm tiếp xúc, cảm giác bên trong, tự
chủ, solo, harem hợp tác/cạnh tranh/phân cấp/luân phiên, ảnh, chống lặp, từ vựng trực tiếp và nhiều
dạng thân mật.

Âm thanh luôn gắn với nguồn, nguyên nhân, cảm giác và hệ quả thay vì đứng thành một khối riêng. Nhân
vật có thể rên dài, ngắn, đứt quãng, rất ít, im lặng hoặc phát âm vô nghĩa tùy tính cách và trạng
thái; không có quota dòng, mẫu nguyên âm, độ dài chữ hay khuôn cao trào bắt buộc. Khi nhân vật còn
tỉnh táo và nói ổn, lời tự nhiên có nghĩa được ưu tiên. Khi miệng bận hoặc khoái cảm quá cao, âm
tiết bị cản, tiếng rên phản xạ và âm vô nghĩa đều hợp lệ; điều bị cấm là dùng một âm cô lập rồi để
văn kể dài nói thay toàn bộ trải nghiệm và làm giọng nhân vật biến mất.

Các ví dụ là khuôn quan hệ giữa trạng thái, âm, tiếp xúc, cảm giác, ham muốn, lựa chọn và dư âm,
không phải kho câu hoặc danh mục hành động để sao chép. Model phải giữ dữ kiện, giọng, ranh giới và
quyền lượt hiện tại; chỉ học cấu trúc nhân quả, không bê câu chữ, cường độ, giải phẫu hay kết quả
sang cảnh khác.

`pnpm compact:examples` là phép biến đổi lặp lại an toàn: script chỉ giữ tiêu đề nhóm, đủ 109 tiêu
đề ví dụ và các dòng mẫu, rồi dựng lại hợp đồng chung. Script dừng nếu số thứ tự, số dòng mẫu hoặc
SHA-256 thay đổi.

## Khung dòng và mật độ quy tắc

File 00 là khung hệ thống chung đầy đủ của RisuAI và được giữ nguyên. Mỗi module 01–17 sở hữu một
miền hành vi; câu nhắc chéo chỉ giữ khi nó làm nhiệm vụ khác ở router, hợp đồng đầu ra hoặc cổng
kiểm tra. Cấu trúc này tránh diễn giải lại cùng luật trong nhiều module nhưng vẫn giữ đủ route, cá
nhân hóa, quyền lượt, giọng, cơ học, nhóm, ảnh và tiếng Việt. Mốc 90.000 ký tự là ngân sách mềm:
compiler chỉ cảnh báo khi vượt, không chặn biên dịch; kiểm thử dự án còn yêu cầu master thực tế nằm
trong ngân sách. Các tệp trong `prompts/` và `standalone/` được loại khỏi Prettier; TypeScript, cấu
hình và README vẫn dùng định dạng tự động bình thường.

Đợt tái cấu trúc dựa trên hướng dẫn chính thức về việc ưu tiên kết quả, bỏ chỉ dẫn/ví dụ không đổi
hành vi và chạy lại eval sau từng nhóm:
[Prompting guidance for GPT-5.6 Sol](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6)
và [Prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering).

## Phạm vi tiếng Việt

- `generated/MASTER_PROMPT.md`, các mô-đun trong `prompts/`, chỉ dẫn phản hồi và bộ lệnh chuyển
  route đều bắt buộc nội dung hướng người đọc bằng tiếng Việt.
- Chỉ giữ nguyên biến, thẻ XML, khóa tài nguyên ảnh, mã, đường dẫn và tên riêng cần thiết về kỹ
  thuật.
- bộ lệnh phiên âm Gemini cũng được hướng dẫn hoàn toàn bằng tiếng Việt. Riêng lời nghe thấy trong
  audio vẫn phải chép nguyên ngôn ngữ nguồn để bảo toàn tính nguyên văn; đây là ngoại lệ kỹ thuật
  của tác vụ phiên âm, không phải hỗ trợ đa ngôn ngữ cho nhập vai.

## Chuyển route và ký ức dài hạn

`standalone/ROLEPLAY_CHANGE_ROUTE_SYSTEM_PROMPT.md` tạo Route V2 dưới dạng snapshot có kích thước cố
định, tối đa khoảng 9.500 ký tự. Route vẫn là một đoạn liên tục của cùng dòng nhập vai, không phải
nhánh hoặc thế giới mới; có thể chuyển khi chuỗi hành động đã hoàn thành hoặc còn đang dở nhưng cần
sang cửa sổ hội thoại mới.

Mỗi lần tạo route, bộ chuyển đọc snapshot cũ thành bản ghi, áp dụng các lượt mới rồi render lại toàn
bộ snapshot. `TRẠNG THÁI HIỆN TẠI` luôn bị thay hoàn toàn. Các nhóm còn lại dùng mã ổn định `E`,
`F`, `K`, `A`, `O`, `P`, `M`: cùng một sự thật cập nhật đúng mã cũ, dữ kiện sai/hết hiệu lực và việc
đã giải quyết bị xóa, còn mã mới chỉ dành cho dữ kiện thật sự mới. Snapshot chỉ giữ sequence hiện
tại và cha trực tiếp, không tích lũy danh sách mọi route đã hoàn thành.

Mỗi nhóm có trần riêng: 6 thay đổi gần, 18 sự thật hoạt động, 10 ngoại lệ kiến thức, 10 cặp xưng hô,
8 việc chưa xong, 10 quy tắc cá nhân hóa và 6 mốc bền. Kiến thức chỉ ghi ngoại lệ ai biết/không
biết/nghi ngờ và tham chiếu mã sự thật thay vì lặp lại nội dung. Sự kiện cũ không còn tác động được
làm nguội rồi xóa hoặc nhập thành một mốc bền; nhân vật phụ vắng mặt không còn việc mở cũng bị loại.

`CÁ NHÂN HÓA ĐANG HOẠT ĐỘNG` lưu các quy tắc hiện hành đã chuẩn hóa thay cho mục lỗi cũ hoặc nhiều
bản sao “chỉ dẫn / góp ý / ghi đè”. Nội dung người dùng tự đặt trong `{{...}}` có hiệu lực ngay và
qua các phản hồi/route sau; góp ý mới nhất, cụ thể nhất chỉ ghi đè phần xung đột. Biến `{{user}}`,
lore, ví dụ và văn bản trích không bị nhận nhầm là cá nhân hóa.

`XƯNG HÔ ĐANG HOẠT ĐỘNG` chỉ lưu dạng hiện tại theo từng chiều `người nói -> người nghe`, gồm đại từ
tự xưng, từ gọi đối phương, tên/danh hiệu/biệt danh, mức và nhịp. A gọi B không ép B gọi A hoặc A
gọi C giống vậy. Chuyển route, đổi cảm xúc, tăng thân mật/tình dục, quá tải hoặc lời tục nhất thời
không tự đổi cách xưng hô; chỉ ảnh hưởng trực tiếp đã xảy ra mới cập nhật đúng bản ghi `A`.

Để tạo route kế tiếp, đưa cho bộ chuyển snapshot `<ROLEPLAY_CHANGE_ROUTE>` gần nhất nếu có, các lượt
đã hoàn tất sau snapshot đó và nguồn nhân vật/thế giới cần thiết. Trong cuộc trò chuyện mới, đặt
snapshot được sinh vào lớp bộ nhớ sau thẻ nhân vật và tri thức thế giới nhưng trước lượt hội thoại
cần trả lời. Không gắn lại log hoặc các route cũ đã được snapshot thay thế.

Gói sinh ra kết thúc bằng `<USER_NEXT_PROMPT>`. Trước khi gửi gói cho model nhận, thay dòng giữ chỗ
bằng prompt kế tiếp thật của người dùng. Nếu trường này thiếu, trống hoặc vẫn còn placeholder và
không có tin nhắn người dùng mới hơn, AI phải đứng yên và chỉ trả
`Đang chờ prompt kế tiếp của bạn.`; không tiếp tục cảnh, giải quyết việc đang dở, xuất ảnh hoặc viết
hành động cho {{user}}.

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
