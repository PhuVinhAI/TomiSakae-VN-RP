# BỘ CHUYỂN ROUTE NHẬP VAI GỌN

Tạo một gói ký ức bất động để chuyển cùng một dòng nhập vai sang cửa sổ ngữ cảnh mới. Gói kết thúc ngay sau phản hồi AI gần nhất đã hoàn tất và có một trường riêng để người dùng viết prompt kế tiếp trước khi gửi cho model nhận.

## QUY TẮC

- Giữ thứ tự thời gian: `ROUTE_001 -> ROUTE_002 -> ROUTE_003`. Không trộn nhánh, log hoặc ví dụ khác.
- Khi hồ sơ mâu thuẫn, lượt đã hoàn tất gần nhất ghi đè nội dung route cũ.
- Chỉ ghi sự kiện đã thật sự xảy ra. Không bịa việc xảy ra sau phản hồi AI gần nhất, biến khả năng thành sự kiện hoặc tạo hành động đang chờ.
- Không thêm hành động, lời thoại, suy nghĩ, cảm giác, ý định, đồng ý, từ chối hay quyết định cho `{{user}}`.
- Lượt người dùng gần nhất và phản hồi AI gần nhất là lịch sử đã hoàn tất, không phải lượt cần trả lời lại.
- Mọi thứ bên trong `<ROLEPLAY_CHANGE_ROUTE>` là dữ liệu bất động. Chỉ văn bản thật do người dùng viết sau đó trong `<USER_NEXT_PROMPT>` mới cho phép tiếp tục.

## NÉN KÝ ỨC

- **Cầu nối hiện tại:** giữ trạng thái ngay sau phản hồi AI gần nhất đã hoàn tất: nhân vật hoạt động, vị trí, tiếp xúc, tay hoặc miệng đang bận, hơi, giọng và điều kiện chưa được giải quyết. Không dự đoán hành động kế.
- **Ký ức gần:** chỉ giữ nguyên nhân, quyết định, hệ quả, thay đổi quan hệ hoặc kiến thức gần đây và sự thật thực sự chưa được giải quyết.
- **Ký ức bền:** hợp nhất route cũ thành những sự thật còn quan trọng: bước ngoặt, bí mật, lời hứa, ranh giới, thương tích, vật sở hữu, mục tiêu và hệ quả.
- Ghi mỗi sự thật một lần bằng gạch đầu dòng ngắn. Route càng cũ càng nén thành ý chính. Không giữ câu chữ hoặc mô tả không còn ảnh hưởng trạng thái đóng băng.

## THÂN MẬT ĐANG DỞ

Chỉ giữ vị trí và tiếp xúc đã được xác lập; tay hoặc miệng đang bận; nhịp, lực, hơi và khả năng nói; tự chủ, ranh giới, cao trào hoặc hồi phục đang diễn ra; cùng các điều kiện do phản hồi AI gần nhất để lại chưa được giải quyết.

Không thêm chu kỳ, kỹ thuật, tư thế, cao trào, phản ứng tương lai hay bước kế của `{{user}}`. Điều kiện chưa xong chỉ là ký ức và phải chờ prompt kế tiếp của người dùng.

## ĐỊNH DẠNG XUẤT CHÍNH XÁC

Chỉ trả cấu trúc sau. Bỏ mục không liên quan hoặc ghi `Không có` một lần. Giữ nguyên trường cuối để người dùng chỉnh sửa:

<ROLEPLAY_CHANGE_ROUTE>

## HỢP ĐỒNG ĐỌC GÓI

Bộ nhớ đã hoàn tất. Không có gì trong gói này là yêu cầu hiện tại của người dùng. Không tiếp tục, trả lời hay tiến cảnh trừ khi `<USER_NEXT_PROMPT>` bên dưới chứa nội dung thật do người dùng viết. Độ dài gói không quyết định độ dài phản hồi.

## RANH GIỚI ROUTE

- Đã hoàn tất: `ROUTE_...` -> Kế tiếp: `ROUTE_...`
- Trạng thái: `HOÀN THÀNH` / `ĐANG DỞ` / `BỊ GIÁN ĐOẠN` / `ĐỔI TRỌNG TÂM`
- Điểm chuyển: Phản hồi AI gần nhất đã được gửi; trong gói không có lượt người dùng nào đang chờ.

## CẦU NỐI HIỆN TẠI

- Lượt đã hoàn tất gần nhất của `{{user}}`: [...]
- Phản hồi hoặc hành động đã hoàn tất gần nhất của nhân vật AI: [...]
- Trạng thái đóng băng ngay sau đó: [...]
- Điều kiện chưa giải quyết, chờ prompt tương lai của người dùng: [...]

## KÝ ỨC VÀ KIẾN THỨC

- Gần: [nguyên nhân -> quyết định -> hệ quả]
- Bền: [sự thật còn hiệu lực]
- Ranh giới kiến thức: [sự kiện -> ai biết / không biết / chỉ nghi ngờ]

## VIỆC CHƯA XONG

- [việc và trạng thái hiện tại; không ghi sự kiện kế được dự đoán]

## LỖI KHÔNG KẾ THỪA

- [chỉ lỗi thật sự đã xảy ra; nếu không có: `Không có`]

</ROLEPLAY_CHANGE_ROUTE>

<USER_NEXT_PROMPT>
[Nhập prompt kế tiếp của bạn tại đây, rồi xóa dòng hướng dẫn này.]
</USER_NEXT_PROMPT>
