# Trình biên dịch bộ lệnh ASMR tiếng Việt

Dự án Node.js + TypeScript nhỏ gọn để quản lý bộ lệnh theo từng mô-đun và ghép chúng thành một tệp
duy nhất, theo thứ tự tên tệp. Bộ lệnh chỉ tạo phản hồi nhập vai bằng tiếng Việt, giữ hội thoại đời
thường linh hoạt, tập trung sâu vào ASMR cho cảnh thân mật và bắt buộc chèn ảnh RisuAI khi nhân vật
có danh sách tài nguyên ảnh hợp lệ.

Hệ thống tiếng Việt chuyên biệt xử lý đại từ/vai vế, khẩu ngữ thân mật, mức trực diện của từ chỉ cơ
thể, lời vỡ dưới áp lực, âm phi từ vựng có thể đọc, giới hạn phát âm khi miệng bị chiếm dụng, nhịp
tiếp xúc và chống lẫn chữ hoặc cách rên Hàn/Nhật/Anh. Thẻ nhân vật, tri thức nền và tên riêng có thể
đến từ nguồn ngoại ngữ nhưng toàn bộ nội dung hướng người đọc vẫn được trình bày tự nhiên bằng tiếng
Việt.

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
pnpm ci                         # Chạy toàn bộ kiểm tra
```

CLI cũng hỗ trợ đường dẫn tùy chỉnh khi cần:

```bash
pnpm dev --source prompts --output generated/MASTER_PROMPT.md
pnpm dev --stdout
```

## Cấu trúc

```text
prompts/                     Các khối bộ lệnh có thể chỉnh sửa riêng
src/compiler.ts              Khám phá, sắp xếp và ghép mô-đun
src/cli.ts                   Giao diện dòng lệnh
test/compiler.test.ts        Kiểm thử tính ổn định của compiler
generated/MASTER_PROMPT.md   Tệp tổng hợp được sinh tự động
prompts/16-vietnamese-contrastive-examples.md
                             Bộ mẫu SAI → sửa lại cho đời thường và ASMR thân mật
standalone/ROLEPLAY_CHANGE_ROUTE_SYSTEM_PROMPT.md
                             Bộ lệnh chuyển route và nén ký ức phân tầng
```

Trình biên dịch không chèn thời gian tạo tệp, nên cùng một bộ mô-đun luôn tạo ra cùng một kết quả và
cùng mã SHA-256. Điều này giúp dễ rà soát thay đổi và phát hiện tệp tổng hợp bị cũ.

## Bộ ví dụ đối chiếu

`prompts/16-vietnamese-contrastive-examples.md` là lớp giáo huấn bằng trường hợp cụ thể, nằm ngay
trước cổng chất lượng cuối. Mô-đun hiện có 73 ví dụ được đánh số liên tục, bao phủ đời thường, cầu
chuyển thân mật, giọng theo tính cách/cường độ, mức từ vựng từ trung tính đến thô trực tiếp, âm
miệng, cơ học bề mặt, họ tư thế, tự chủ, cảnh nhiều người, cao trào/hồi phục, chống lặp và chuyển
route.

Nhóm ví dụ mới buộc giọng/hơi/miệng của nhân vật tái xuất qua nhiều dòng khi tác động còn duy trì,
thay vì một tiếng rồi tràn mô tả. Người nhiều/lớn tiếng, ít/nhỏ tiếng và gần như không rên dùng các
kênh khác nhau; không có quota tiếng rên. Phần kể chỉ làm cầu ngắn giữa các lần phát âm hoặc dấu âm
kế tiếp.

Các đoạn **SAI** là dữ liệu âm tính, không phải văn mẫu để sao chép. Đặc biệt, đầu ra không được lộ
giọng người chấm bài như “đây không phải tiếng rên mà...”, tự gọi tên loại âm, nhắc prompt hoặc giải
thích vì sao đang viết theo một quy tắc. Quy tắc chỉ điều khiển văn và phải biến mất khỏi cảnh.

## Phạm vi tiếng Việt

- `generated/MASTER_PROMPT.md`, các mô-đun trong `prompts/`, chỉ dẫn phản hồi và bộ lệnh chuyển
  route đều bắt buộc nội dung hướng người đọc bằng tiếng Việt.
- Chỉ giữ nguyên biến, thẻ XML, khóa tài nguyên ảnh, mã, đường dẫn và tên riêng cần thiết về kỹ
  thuật.
- bộ lệnh phiên âm Gemini cũng được hướng dẫn hoàn toàn bằng tiếng Việt. Riêng lời nghe thấy trong
  audio vẫn phải chép nguyên ngôn ngữ nguồn để bảo toàn tính nguyên văn; đây là ngoại lệ kỹ thuật
  của tác vụ phiên âm, không phải hỗ trợ đa ngôn ngữ cho nhập vai.

## Chuyển route và ký ức dài hạn

`standalone/ROLEPLAY_CHANGE_ROUTE_SYSTEM_PROMPT.md` thay thế hoàn toàn bộ lệnh bàn giao hội thoại
cũ. Route là một đoạn liên tục của cùng dòng nhập vai, không phải nhánh hoặc thế giới mới. Route có
thể kết thúc khi chuỗi hành động đã hoàn thành hoặc khi vẫn đang dở nhưng cần chuyển sang cửa sổ hội
thoại mới.

Khi chuyển route, trạng thái cuối được giữ nguyên làm cầu nối. Route vừa kết thúc được giữ chi tiết;
các route gần giữ nguyên nhân và hệ quả chính; route xa dần được nén thành ký ức cốt lõi và hợp nhất
thành ký ức dài hạn. Những việc chưa giải quyết, bước ngoặt quan hệ, lời hứa, bí mật, thương tích,
kiến thức và hậu quả lâu dài không được mất chỉ vì route đã cũ. Ký ức được theo dõi riêng theo điều
từng nhân vật thật sự biết, thay vì biến cả nhóm thành một trí nhớ chung.

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
5. `standalone/RISUAI_RESPONSE_INSTRUCTION_REPLACEMENT.md` thay cho `RESPONSE_INSTRUCTION` mặc định
   nếu nền tảng cho phép sửa khối đó. Tệp này đã chứa `<FINAL_EXECUTION_OVERRIDE>` ngay trước
   `</RESPONSE_INSTRUCTION>`, vì vậy không chèn thêm phần chốt cuối hoặc phần điền trước riêng cho
   AI.

Không chuyển toàn bộ master dài xuống vị trí cuối: làm vậy tăng độ gần của luật phong cách nhưng đẩy
thẻ nhân vật và tri thức nền ra xa phản hồi. Phần chốt cuối đã được ghép vào cuối chỉ dẫn phản hồi
để nhắc lại các điều kiện chặn có nguy cơ cao trong cùng thông điệp hệ thống và tránh bị gửi sai
thành vai `assistant`.
