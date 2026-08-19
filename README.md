# Trình biên dịch prompt nhập vai tiếng Việt

Dự án Node.js + TypeScript để quản lý prompt theo mô-đun và biên dịch bốn profile dùng chung một
pipeline. Mỗi profile chỉ chọn những module cần thiết, nên phần trạng thái, cá nhân hóa, ảnh và
tiếng Việt có một nguồn duy nhất thay vì ba bản prompt sao chép rồi lệch nhau.

| Profile        | Mục đích                                                                 | Thư mục sử dụng         |
| -------------- | ------------------------------------------------------------------------ | ----------------------- |
| `nsfw`         | Bản đầy đủ hiện tại, gồm toàn bộ ASMR, cơ học, cảnh nhóm và 109 ví dụ    | `bundles/nsfw/`         |
| `sfw`          | Tập trung cốt truyện, thế giới và nhân vật; bỏ module chuyên sâu NSFW    | `bundles/sfw/`          |
| `nsfw-lite`    | Bản NSFW 1-on-1 cho model nhỏ, giữ lõi cần thiết và không nạp ví dụ/nhóm | `bundles/nsfw-lite/`    |
| `nsfw-lite-en` | Lõi điều khiển tiếng Anh tối ưu cho Gemma 4; cảnh vẫn xuất tiếng Việt    | `bundles/nsfw-lite-en/` |

`sfw` không phải bộ lọc nội dung. Nó không chủ động mang cơ chế NSFW vào mọi cảnh, nhưng nếu
character, world và diễn biến hiện tại đi theo hướng đó thì model vẫn tiếp tục theo nguồn, không từ
chối hoặc bẻ hướng. Sắc thái tôn thờ, phục tùng, tàn nhẫn hay dịu dàng cũng do character/world và
quan hệ quyết định trong mọi profile.

Cả bốn bundle chứa cùng ba tên file: `MASTER_PROMPT.md`, `RESPONSE_INSTRUCTION.md` và
`ROLEPLAY_CHANGE_ROUTE.md`. Ba profile cũ dùng nguyên văn `prompts/00-risuai-system-prefix.md` và
giữ chung response shell từ bản NSFW. `nsfw-lite-en` dùng system prefix, response instruction và
route instruction riêng bằng tiếng Anh; chỉ hợp đồng đầu ra của nó bắt buộc cảnh nhập vai tiếng
Việt.

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

Lệnh trên sinh `MASTER_PROMPT.md` vào cả ba thư mục bundle. `generated/MASTER_PROMPT.md` vẫn là
alias giống hệt `bundles/nsfw/MASTER_PROMPT.md` để giữ tương thích với cách dùng cũ. Nội dung mỗi
master bắt đầu ngay từ mô-đun đầu tiên, không chèn metadata, danh sách nguồn hay lời mở đầu, nên có
thể sao chép trực tiếp.

Thêm hoặc đổi module trong `prompts/` hay `profile-modules/`, sau đó khai báo thứ tự sử dụng trong
manifest tương ứng tại `profiles/`. Bản `nsfw` tiếp tục trỏ tới nguyên bộ `prompts/` cũ để đầu ra
đầy đủ không đổi.

## Lệnh

```bash
pnpm dev --list                 # Xem thứ tự module của NSFW đầy đủ
pnpm compile:prompts            # Sinh cả bốn profile
pnpm compile:prompts:nsfw       # Chỉ sinh NSFW đầy đủ + alias cũ
pnpm compile:prompts:sfw        # Chỉ sinh SFW cốt truyện
pnpm compile:prompts:lite       # Chỉ sinh NSFW Lite
pnpm compile:prompts:lite:en    # Chỉ sinh NSFW Lite English cho Gemma 4
pnpm check:prompts              # Kiểm tra mọi master có mới hay không
pnpm check                      # TypeScript và ESLint
pnpm test                       # Vitest
pnpm build                      # Biên dịch CLI vào dist/
pnpm zip:handoff                # ZIP nguồn cần thiết để gửi cho AI khác
pnpm ci                         # Chạy toàn bộ kiểm tra
```

CLI cũng hỗ trợ đường dẫn tùy chỉnh khi cần:

```bash
pnpm dev --profile sfw --stdout
pnpm dev --profile nsfw-lite --list
pnpm dev --profile nsfw-lite-en --list
pnpm dev --source prompts --output generated/MASTER_PROMPT.md
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
profiles/                    Manifest và thứ tự module của bốn profile
bundles/nsfw/                Ba file dùng trực tiếp cho NSFW đầy đủ
bundles/sfw/                 Ba file dùng trực tiếp cho SFW cốt truyện
bundles/nsfw-lite/           Ba file dùng trực tiếp cho NSFW 1-on-1 cô đọng
bundles/nsfw-lite-en/        Ba file điều khiển tiếng Anh dành cho Gemma 4
profile-modules/shared/      Luật dùng chung cho SFW và phần đóng tiếng Việt
profile-modules/sfw/         Phần cốt truyện chuyên cho SFW
profile-modules/nsfw-lite/   Lõi, trạng thái và ảnh 1-on-1 cho model nhỏ
profile-modules/nsfw-lite-en/ Luật atomic, data boundary và output contract tiếng Anh
prompts/                     18 module của NSFW đầy đủ hiện tại
src/compiler.ts              Compiler thư mục thô tương thích cách dùng cũ
src/profiles.ts              Nạp manifest và biên dịch profile
src/cli.ts                   Giao diện dòng lệnh
scripts/export-project.ps1   Đóng gói tệp Git cần thiết thành ZIP
test/compiler.test.ts        Kiểm thử prompt NSFW đầy đủ và compiler gốc
test/profiles.test.ts        Kiểm thử ranh giới, kích thước và tương thích bốn profile
generated/MASTER_PROMPT.md   Alias tương thích của bundle NSFW
prompts/16-vietnamese-contrastive-examples.md
                             109 ví dụ dương tiếng Việt cho solo và harem
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

Trong profile `nsfw`, file 00 là khung hệ thống chung đầy đủ của RisuAI và được giữ nguyên. Mỗi
module 01–17 sở hữu một miền hành vi; câu nhắc chéo chỉ giữ khi nó làm nhiệm vụ khác ở router, hợp
đồng đầu ra hoặc cổng kiểm tra. Profile `sfw` và `nsfw-lite` dùng module riêng ngắn hơn nhưng chia
sẻ cùng luật trạng thái, cá nhân hóa, ảnh và nền tiếng Việt. `nsfw-lite-en` tách thành sáu lớp tiếng
Anh theo hierarchy–data–task–contract, nhưng vẫn khóa cảnh đầu ra bằng tiếng Việt. Ngân sách mềm do
từng manifest quy định; compiler chỉ cảnh báo khi vượt, không cắt nội dung. Các tệp prompt Markdown
được loại khỏi Prettier; TypeScript, JSON cấu hình và README vẫn dùng định dạng tự động bình thường.

Đợt tái cấu trúc dựa trên hướng dẫn chính thức về việc ưu tiên kết quả, bỏ chỉ dẫn/ví dụ không đổi
hành vi và chạy lại eval sau từng nhóm:
[Prompting guidance for GPT-5.6 Sol](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6)
và [Prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering).

## NSFW Lite English cho Gemma 4

`nsfw-lite-en` là bản thiết kế lại, không phải bản dịch từng câu của `nsfw-lite`. Bảy lớp system
prompt lần lượt tách mục tiêu/hierarchy, data boundary và trạng thái, character–trajectory control,
ảnh, scene engine, khóa tiếng Việt và output contract. Mỗi luật có một mã ổn định và một yêu cầu
kiểm chứng được; fallback cùng silent validation nằm gần điểm xuất để giảm lỗi quên luật khi context
dài.

Khi dùng Transformers hoặc inference stack có chat template, truyền `MASTER_PROMPT.md` bằng native
`system` role và để tokenizer tự thêm control token Gemma 4. Không chép thủ công `<|turn>system`
hoặc `<|turn>model>` vào nội dung nếu stack đã gọi `apply_chat_template`.

Lớp character–trajectory mới chống các lỗi cộng đồng báo cáo: personality bị san phẳng khi ERP,
flirt tự nhảy sang sex, NPC quá dễ bị thuyết phục, intimacy tự biến thành tình yêu/cứu chuộc, swipe
chỉ đổi từ nhưng giữ cùng đường diễn biến, trope/slop. Route mới giữ `CHARACTER ANCHORS` cùng áp lực
trajectory hiện tại để giảm drift khi hội thoại dài.

Thiết kế này bám các nguyên tắc trong nghiên cứu được cung cấp: luật bất biến ở system, hierarchy
rõ, reference là data và contract cụ thể. Tham khảo
[Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4),
[Gemma 4 prompt formatting](https://ai.google.dev/gemma/docs/core/prompt-formatting-gemma4).

## Phạm vi tiếng Việt

- Ba profile cũ viết cả luật điều khiển và nội dung hướng người đọc bằng tiếng Việt.
- `nsfw-lite-en` viết luật điều khiển bằng tiếng Anh nhưng hợp đồng đầu ra vẫn bắt buộc cảnh nhập
  vai hướng người đọc bằng tiếng Việt.
- Chỉ giữ nguyên biến, thẻ XML, khóa tài nguyên ảnh, mã, đường dẫn và tên riêng cần thiết về kỹ
  thuật.
- bộ lệnh phiên âm Gemini cũng được hướng dẫn hoàn toàn bằng tiếng Việt. Riêng lời nghe thấy trong
  audio vẫn phải chép nguyên ngôn ngữ nguồn để bảo toàn tính nguyên văn; đây là ngoại lệ kỹ thuật
  của tác vụ phiên âm, không phải hỗ trợ đa ngôn ngữ cho nhập vai.

## Chuyển route và ký ức dài hạn

`bundles/nsfw/ROLEPLAY_CHANGE_ROUTE.md` tạo Route V2.1 dưới dạng snapshot có độ sâu thích ứng. Route
vẫn là một đoạn liên tục của cùng dòng nhập vai, không phải nhánh hoặc thế giới mới; có thể chuyển
khi chuỗi hành động đã hoàn thành hoặc còn đang dở nhưng cần sang cửa sổ hội thoại mới.

Ba route chuyên biệt dùng cùng nguyên tắc snapshot bất động và cổng `<USER_NEXT_PROMPT>`. Bản SFW ưu
tiên tuyến truyện, thế giới, quan hệ và kiến thức, không thêm trường cơ học trưởng thành nhưng vẫn
bảo toàn sự kiện trưởng thành thật sự còn hệ quả. Hai bản NSFW Lite giữ trạng thái độc lập cho một
hoặc nhiều nhân vật với mật độ gọn hơn; bản English dùng nhãn snapshot tiếng Anh nhưng giữ cùng
quyền lượt và cổng prompt thật.

Mỗi lần tạo route, bộ chuyển đọc snapshot cũ thành bản ghi, áp dụng các lượt mới rồi render lại toàn
bộ snapshot. `TRẠNG THÁI HIỆN TẠI` luôn bị thay hoàn toàn. Các nhóm còn lại dùng mã ổn định `E`,
`F`, `R`, `K`, `A`, `O`, `P`, `M`: cùng một sự thật cập nhật đúng mã cũ, dữ kiện sai/hết hiệu lực và
việc đã giải quyết không còn hệ quả bị xóa, còn mã mới chỉ dành cho dữ kiện thật sự mới. Snapshot
chỉ giữ sequence hiện tại và cha trực tiếp, không tích lũy danh sách mọi route đã hoàn thành.

Thay vì trần cứng 9.500 ký tự, bộ chuyển chọn ngân sách nhỏ nhất vẫn bảo toàn context: `GỌN` khoảng
12.000 ký tự, `SÂU` khoảng 18.000 và `MỞ RỘNG` khoảng 24.000. Các mốc này là mục tiêu mềm theo độ
phức tạp, không phải dung lượng phải dùng hết. Nếu toàn bộ thao tác nén hợp lệ vẫn không đủ,
`BẢO TOÀN` được vượt 24.000 nhưng phần vượt chỉ chứa dữ kiện thật sự được bảo vệ. Vì vậy route có
thể lớn theo độ phức tạp chưa giải quyết, không lớn chỉ vì số route đã đi qua.

Số bản ghi của từng nhóm cũng là mục tiêu mật độ thay vì trần xóa tuyệt đối.
`QUAN HỆ VÀ ĐỘNG CƠ BỀN` giữ nền tâm lý ổn định và nguyên nhân khiến nhân vật thường chọn hoặc tránh
một hành vi; một phản ứng nhất thời không tự đổi tính cách. `VIỆC CHƯA XONG` và `MỐC BỀN` giữ chuỗi
tối thiểu `nguyên nhân -> điều đã xảy ra -> hệ quả -> điều còn chờ`, tránh chỉ còn kết luận ngắn
nhưng mất lý do. Kiến thức vẫn chỉ ghi ngoại lệ ai biết/không biết/nghi ngờ và tham chiếu mã thay vì
lặp nội dung.

Dữ kiện không bị xóa chỉ vì đã cũ, nhân vật tạm vắng hoặc chưa được nhắc lại vài route. Nó chỉ được
làm nguội khi AI vẫn hiểu đúng nếu thiếu chi tiết đó; nhân vật phụ chỉ bị loại khi không còn quan
hệ, bí mật, món nợ, lời hứa, vật, việc mở, kiến thức hoặc khả năng quay lại đã được thiết lập.

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
3. Mở thư mục bundle đã chọn và dùng `MASTER_PROMPT.md` làm prefix thay cho phần từ `<SYSTEM_RULE>`
   đến hết `<ROLEPLAY_INFO>` cũ. Master đã chứa sẵn các tag mở/đóng này; không lồng nó vào một
   `<ROLEPLAY_INFO>` khác.
4. Thẻ nhân vật, hồ sơ nhân vật người dùng, các mục tri thức thế giới đang hoạt động và bộ nhớ do
   RisuAI chèn.
5. Dùng `RESPONSE_INSTRUCTION.md` trong cùng thư mục bundle. Ba profile cũ giữ cùng response shell;
   `nsfw-lite-en` dùng response instruction riêng và không có `<FINAL_EXECUTION_OVERRIDE>`.

Khi chuyển cửa sổ hội thoại, dùng `ROLEPLAY_CHANGE_ROUTE.md` trong cùng thư mục bundle. Không trộn
file giữa các bundle vì mật độ và trường trạng thái khác nhau.

Không chuyển toàn bộ master dài xuống vị trí cuối: làm vậy tăng độ gần của luật phong cách nhưng đẩy
thẻ nhân vật và tri thức nền ra xa phản hồi. Phần chốt cuối đã được ghép vào cuối chỉ dẫn phản hồi
để nhắc lại các điều kiện chặn có nguy cơ cao trong cùng thông điệp hệ thống và tránh bị gửi sai
thành vai `assistant`.
