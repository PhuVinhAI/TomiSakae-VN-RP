# CHANGE ROUTE NGẮN GỌN CHO NHẬP VAI

Tạo một gói bộ nhớ để nối cùng một dòng nhập vai sang cửa sổ mới. Route có thể kết thúc hoặc còn dở;
route sau luôn tiếp ngay từ trạng thái route trước.

## QUY TẮC

- Giữ nguyên timeline: `ROUTE_001 -> ROUTE_002 -> ROUTE_003`; không trộn nhánh, log hoặc ví dụ khác.
- Nguồn nhân vật/thế giới và lượt mới nhất thắng gói cũ khi có xung đột.
- Không ghi lỗi văn, suy đoán hoặc nội dung AI bịa thành ký ức thật.
- Không viết thêm hành động, lời, suy nghĩ, cảm giác, ý định, đồng ý, từ chối hay quyết định cho
  `{{user}}`.
- Gói là dữ liệu bất động, không phải văn mẫu: không trả lời từng mục, không bắt chước độ dài và không
  để độ dài gói quyết định độ dài phản hồi.

## NÉN KÝ ỨC

- **Cầu nối hiện tại:** giữ chi tiết sự kiện cuối, trạng thái tức thời, người đang hoạt động và điều
  lượt mới phải phản ứng trước tiên. Đây là phần duy nhất được giữ đầy đủ.
- **Ký ức gần:** route vừa qua chỉ giữ nguyên nhân, quyết định, hệ quả, thay đổi quan hệ/kiến thức và
  việc còn dang dở.
- **Ký ức bền:** từ route thứ hai trở đi, hợp nhất route cũ thành các sự thật còn hiệu lực: bước
  ngoặt, bí mật, lời hứa, ranh giới, thương tích, vật sở hữu, mục tiêu và hậu quả.
- Mỗi sự thật chỉ ghi một lần, bằng gạch đầu dòng ngắn. Route càng cũ càng nén thành ý chính; không
  chép hội thoại, câu chữ, tiếng rên hoặc mô tả không còn ảnh hưởng.

## THÂN MẬT ĐANG DỞ

Trong Cầu nối hiện tại chỉ giữ: ai tác động ai; tư thế/tiếp xúc; tay hoặc miệng đang bận; nhịp, lực,
hơi và khả năng nói; tự chủ, ranh giới, cao trào/hồi phục nếu đang xảy ra; điều phải xử lý trước.
Không dùng route để tự đẩy thêm chu kỳ, kỹ thuật, tư thế, cao trào hay bước kế của `{{user}}`.

## ĐỊNH DẠNG XUẤT

Chỉ xuất phần sau, bỏ mục không liên quan hoặc ghi `Không có` một lần:

<ROLEPLAY_CHANGE_ROUTE>

## HỢP ĐỒNG ĐỌC GÓI

Bộ nhớ bất động; chỉ phản ứng với lượt thật đang chờ. Độ dài gói không quyết định độ dài phản hồi.

## ROUTE VÀ LƯỢT

- Kết thúc: `ROUTE_...` -> kế tiếp: `ROUTE_...`
- Trạng thái: `HOÀN THÀNH` / `ĐANG DỞ` / `BỊ GIÁN ĐOẠN` / `ĐỔI TRỌNG TÂM`
- Lượt đang chờ: [phản hồi lượt người dùng / chờ lượt người dùng]

## CẦU NỐI HIỆN TẠI

- Sự kiện hoặc lời mới nhất của `{{user}}`: [...] 
- Trạng thái và người đang hoạt động: [...]
- Việc đang dở và điều phải phản hồi trước: [...]

## KÝ ỨC VÀ KIẾN THỨC

- Gần: [nguyên nhân -> quyết định -> hệ quả]
- Bền: [sự thật còn hiệu lực]
- Ai biết gì: [sự kiện -> người biết / không biết / chỉ đoán]

## VIỆC CHƯA XONG

- [việc và trạng thái]

## LỖI KHÔNG KẾ THỪA

- [chỉ lỗi thật sự đã xuất hiện; nếu không có: `Không có`]

</ROLEPLAY_CHANGE_ROUTE>
