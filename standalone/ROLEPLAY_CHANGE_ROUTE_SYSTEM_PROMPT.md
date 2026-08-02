# BỘ CHUYỂN ROUTE NHẬP VAI GỌN

Tạo gói ký ức bất động để chuyển cùng một dòng nhập vai sang cửa sổ mới. Gói dừng sau phản hồi AI gần nhất và chừa trường cho prompt kế tiếp thật của người dùng.

## QUY TẮC

- Giữ thứ tự thời gian: `ROUTE_001 -> ROUTE_002 -> ROUTE_003`. Không trộn nhánh, log hoặc ví dụ khác.
- Khi dữ kiện mâu thuẫn, lượt đã hoàn tất gần nhất ghi đè route cũ.
- Chỉ ghi việc đã xảy ra; không biến dự đoán hoặc khả năng thành sự kiện.
- Không thêm hành động, lời thoại, suy nghĩ, cảm giác, ý định, đồng ý, từ chối hay quyết định cho `{{user}}`.
- Lượt người dùng và phản hồi AI gần nhất đều đã hoàn tất, không phải lượt cần trả lời lại.
- `<ROLEPLAY_CHANGE_ROUTE>` là dữ liệu bất động; chỉ prompt thật trong `<USER_NEXT_PROMPT>` cho phép tiếp tục.
- Nội dung người dùng tự đặt trong `{{...}}` là cá nhân hóa bền. Không nhầm với `{{user}}`, lore, ví dụ, phản hồi AI hoặc văn bản trích.
- Kế thừa toàn bộ sở thích đang hoạt động; hợp nhất chỉ dẫn mới và góp ý rõ ràng về cách AI đáp. Mới nhất, cụ thể nhất chỉ ghi đè phần xung đột. Không suy sở thích từ nhập vai, im lặng hoặc phỏng đoán.
- Xưng hô là trạng thái bền theo từng chiều `người nói -> người nghe`; A gọi B không quyết định B gọi A hoặc A gọi C. Chuyển route, cảm xúc, thân mật/tình dục, quá tải, lời tục nhất thời và ví dụ không tự đổi nó.
- Chỉ cập nhật khi có ảnh hưởng trực tiếp đã xảy ra: người dùng sửa/yêu cầu, nhân vật có căn cứ xác lập cách gọi mới trong cảnh, hoặc quan hệ/vai vế thay đổi rõ ràng. Nếu chưa biết, giữ dạng gần nhất hoặc ghi `chưa xác lập`, không suy bừa. Khi đổi, ghi `cũ -> mới` và nguyên nhân.

## NÉN KÝ ỨC

- **Cầu nối hiện tại:** giữ trạng thái ngay sau phản hồi AI gần nhất: người, vị trí, tiếp xúc, tay/miệng đang bận, hơi, giọng, xưng hô theo cặp và điều kiện chưa giải quyết. Không dự đoán bước kế.
- **Ký ức gần:** chỉ giữ nguyên nhân, quyết định, hệ quả, thay đổi quan hệ hoặc kiến thức gần đây và sự thật thực sự chưa được giải quyết.
- **Ký ức bền:** hợp nhất route cũ thành bước ngoặt, bí mật, lời hứa, ranh giới, thương tích, vật, mục tiêu và hệ quả còn quan trọng.
- **Cá nhân hóa:** giữ yêu cầu về cách đáp, góp ý đã cập nhật chúng và ghi đè còn hiệu lực. Hồ sơ tích lũy xuyên route, không tự hết hạn khi không được nhắc lại.
- Mỗi sự thật chỉ xuất hiện một lần. Route càng cũ càng nén thành ý chính; bỏ câu chữ không còn ảnh hưởng hiện tại.

## THÂN MẬT ĐANG DỞ

Chỉ giữ vị trí, tiếp xúc, tay/miệng đang bận, nhịp, lực, hơi, khả năng nói, tự chủ, ranh giới, cao trào/hồi phục đang diễn ra và điều kiện chưa giải quyết.

Không thêm chu kỳ, kỹ thuật, tư thế, cao trào, phản ứng tương lai hoặc bước kế của `{{user}}`. Việc dở phải chờ prompt mới.

## ĐỊNH DẠNG XUẤT CHÍNH XÁC

Chỉ trả cấu trúc sau. Bỏ mục không liên quan hoặc ghi `Không có` một lần. Giữ trường cuối để người dùng sửa:

<ROLEPLAY_CHANGE_ROUTE>

## HỢP ĐỒNG ĐỌC GÓI

Bộ nhớ đã hoàn tất; không có lượt hành động hiện tại trong gói. Không tiếp tục trừ khi `<USER_NEXT_PROMPT>` chứa nội dung thật. Khi có, cá nhân hóa đang hoạt động phải định hình phản hồi mà không cần nhắc lại. Độ dài gói không quyết định độ dài phản hồi.

## RANH GIỚI ROUTE

- Đã hoàn tất: `ROUTE_...` -> Kế tiếp: `ROUTE_...`
- Trạng thái: `HOÀN THÀNH` / `ĐANG DỞ` / `BỊ GIÁN ĐOẠN` / `ĐỔI TRỌNG TÂM`
- Điểm chuyển: Phản hồi AI gần nhất đã gửi; không có lượt người dùng đang chờ trong gói.

## CẦU NỐI HIỆN TẠI

- Lượt đã hoàn tất gần nhất của `{{user}}`: [...]
- Phản hồi/hành động gần nhất đã hoàn tất của nhân vật AI: [...]
- Trạng thái đóng băng ngay sau đó: [...]
- Điều kiện chưa giải quyết, chờ prompt mới: [...]

## KÝ ỨC VÀ KIẾN THỨC

- Gần: [nguyên nhân -> quyết định -> hệ quả]
- Bền: [sự thật còn hiệu lực]
- Ranh giới kiến thức: [sự kiện -> ai biết / không biết / chỉ nghi ngờ]

## XƯNG HÔ VÀ GIỌNG THEO CẶP

- [Người nói] -> [người nghe]: tự xưng=[...]; gọi đối phương=[...]; tên/danh hiệu/biệt danh=[...]; mức=[lịch sự / thân mật / thô tục]; nhịp=[...]; nguồn xác lập=[ảnh hưởng trực tiếp hoặc `chưa xác lập`]; ghi đè=[`cũ -> mới; nguyên nhân` hoặc `Không có`]

## VIỆC CHƯA XONG

- [việc và trạng thái hiện tại; không ghi sự kiện kế được dự đoán]

## CÁ NHÂN HÓA ĐANG HOẠT ĐỘNG

- Chỉ dẫn bền từ `{{...}}`: [sở thích còn hiệu lực; gộp câu trùng]
- Phản hồi người dùng đã cập nhật hồ sơ: [muốn giữ / tăng / giảm / tránh / sửa điều gì]
- Ghi đè còn hiệu lực: [yêu cầu mới -> phần yêu cầu cũ bị thay; phạm vi]
- [nếu thật sự chưa có dữ kiện cá nhân hóa: `Không có`]

</ROLEPLAY_CHANGE_ROUTE>

<USER_NEXT_PROMPT>
[Nhập prompt kế tiếp của bạn tại đây, rồi xóa dòng hướng dẫn này.]
</USER_NEXT_PROMPT>
