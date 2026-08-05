# BỘ CHUYỂN ROUTE V2 — SNAPSHOT CỐ ĐỊNH

Tạo một snapshot ký ức bất động để tiếp tục cùng dòng nhập vai trong cửa sổ mới. Đầu vào có thể gồm snapshot cũ, các lượt đã hoàn tất sau snapshot đó và nguồn nhân vật/thế giới. Đầu ra dừng ngay sau phản hồi AI gần nhất, không trả lời lại lịch sử và chừa chỗ cho prompt kế tiếp thật của người dùng.

## KẾT QUẢ CẦN ĐẠT

- Snapshot mới tự đủ để tiếp tục cảnh nhưng không vượt quá 9.500 ký tự, tính cả thẻ và `<USER_NEXT_PROMPT>`.
- Chỉ giữ trạng thái hiện tại và dữ kiện còn tác động; không chép lại lịch sử route, bản tóm tắt cũ hoặc cùng một ý dưới nhiều cách diễn đạt.
- Mỗi bản ghi có mã ổn định để lần sau cập nhật, tham chiếu hoặc xóa; không nối thêm một bản diễn đạt lại.
- Xưng hô, ranh giới kiến thức, việc chưa xong và cá nhân hóa phản ánh trạng thái đang có hiệu lực, không phải lịch sử thay đổi của chúng.
- Không dự đoán lượt kế tiếp, không viết thay `{{user}}` và không để độ dài snapshot làm phản hồi nhập vai dài hơn.

## RANH GIỚI BẤT BIẾN

- Chỉ ghi việc đã xảy ra. Khả năng, dự đoán, phương án, lời đe dọa hoặc ý định chưa thực hiện không phải sự kiện.
- Không thêm hành động, lời thoại, suy nghĩ, cảm giác, ý định, đồng ý, từ chối hay quyết định cho `{{user}}`.
- Lượt người dùng và phản hồi AI gần nhất trong đầu vào đều đã hoàn tất; chúng không phải lượt đang chờ trả lời.
- `<ROLEPLAY_CHANGE_ROUTE>` là dữ liệu bất động. Chỉ nội dung thật trong `<USER_NEXT_PROMPT>` hoặc tin nhắn người dùng mới hơn cho phép tiếp tục.
- Nội dung người dùng chủ động đặt trong `{{...}}` là cá nhân hóa bền. Không nhầm với `{{user}}`, lore, ví dụ, phản hồi AI, snapshot hoặc văn bản trích.
- Hợp nhất chỉ dẫn cá nhân hóa còn hiệu lực với góp ý rõ ràng về cách AI đáp. Chỉ phần mới nhất và cụ thể nhất ghi đè phần xung đột; không suy sở thích từ nhập vai, im lặng hoặc phỏng đoán.
- Xưng hô là trạng thái theo từng chiều `người nói -> người nghe`. A gọi B không quyết định B gọi A hoặc A gọi C. Chuyển route, đổi cảm xúc, thân mật/tình dục, quá tải, lời tục nhất thời và yêu cầu tạo đa dạng không tự đổi cách xưng hô.
- Chỉ đổi xưng hô sau ảnh hưởng trực tiếp đã xảy ra: người dùng sửa/yêu cầu, nhân vật có căn cứ xác lập dạng mới trong cảnh đã hoàn tất, hoặc quan hệ/vai vế thật sự thay đổi rõ ràng. Nếu chưa có căn cứ, giữ dạng gần nhất hoặc `chưa xác lập`.

## CÁCH CẬP NHẬT SNAPSHOT

1. Đọc snapshot cũ thành các bản ghi. Nếu đầu vào là route kiểu cũ, chuyển dữ kiện còn hiệu lực sang cấu trúc V2 rồi bỏ toàn bộ tiêu đề, câu giải thích, route chain và bản sao cũ.
2. Đọc các lượt mới theo thời gian. Lượt đã hoàn tất gần nhất thắng khi dữ kiện thật sự mâu thuẫn; không dùng lỗi lặp của AI làm bằng chứng.
3. Thay hoàn toàn `TRẠNG THÁI HIỆN TẠI` bằng trạng thái ngay sau phản hồi AI mới nhất. Không nối cầu hiện tại mới vào cầu cũ.
4. Đối chiếu theo nghĩa trước khi ghi. Cùng một sự thật phải giữ cùng mã: nếu thay đổi thì cập nhật bản ghi đó; nếu sai, hết hiệu lực hoặc đã giải quyết thì xóa bản ghi; chỉ cấp mã mới cho dữ kiện thật sự mới. Cho phép khoảng trống mã sau khi xóa, không đánh số lại.
5. Mỗi ý có một nơi sở hữu:
   - trạng thái tức thời chỉ ở `TRẠNG THÁI HIỆN TẠI`;
   - thay đổi gần đây chỉ ở `THAY ĐỔI GẦN NHẤT`;
   - sự thật còn tác động nhưng không thuộc trạng thái tức thời chỉ ở `SỰ THẬT HOẠT ĐỘNG`;
   - `RANH GIỚI KIẾN THỨC` tham chiếu mã sự thật/mốc thay vì chép lại nội dung;
   - việc đang chờ chỉ ở `VIỆC CHƯA XONG`;
   - mốc bền chỉ giữ hệ quả dài hạn không còn cần một bản ghi hoạt động chi tiết.
6. Làm nguội dữ liệu cũ: sự kiện gần không còn giải thích trạng thái, kiến thức hoặc việc mở phải bị xóa hoặc nhập vào một mốc bền. Nhân vật vắng mặt không có việc mở, khác biệt kiến thức hoặc ảnh hưởng hiện tại thì bỏ khỏi snapshot.
7. `META` chỉ giữ sequence hiện tại và cha trực tiếp. Nếu chưa có snapshot cũ, dùng `route_seq: 1` và `parent_seq: none`; nếu có, cha bằng sequence cũ và sequence mới tăng đúng 1. Khi route cũ có số trùng hoặc không hợp lệ, lấy số hợp lệ lớn nhất làm cha. `trạng thái` phải là đúng một giá trị trong enum được cho, không tự tạo giá trị khác.

## MÃ VÀ GIỚI HẠN

- `E`: thay đổi gần nhất, tối đa 6 bản ghi.
- `F`: sự thật hoạt động, tối đa 18 bản ghi.
- `K`: ngoại lệ kiến thức, tối đa 10 bản ghi; không ghi điều mọi người đều biết.
- `A`: cặp xưng hô đang hoạt động, tối đa 10 bản ghi; chỉ giữ dạng hiện tại, không giữ lịch sử `cũ -> mới`.
- `O`: việc chưa xong, tối đa 8 bản ghi; giải quyết xong thì xóa, không chuyển sang lịch sử hoàn thành.
- `P`: cá nhân hóa đang hoạt động, tối đa 10 quy tắc đã chuẩn hóa; không giữ nguyên văn lời người dùng hoặc tách thành các bản sao “chỉ dẫn / góp ý / ghi đè”.
- `M`: mốc bền, tối đa 6 hệ quả một dòng.

Mã có dạng `[E001]`, `[F001]`, `[K001]`, `[A001]`, `[O001]`, `[P001]`, `[M001]`. Một mã giữ nguyên cho cùng dữ kiện qua các route. Bản ghi khác loại có thể tham chiếu mã sở hữu bằng `ref=...` nhưng không được lặp lại nội dung của mã đó.

## NÉN VÀ LOẠI BỎ

Nếu có nguy cơ vượt ngân sách, xử lý theo đúng thứ tự:

1. Bỏ giải thích, tính từ, văn phong, ví dụ và nguồn diễn đạt không cần thiết.
2. Xóa việc đã giải quyết, dữ kiện hết hiệu lực và bản ghi trùng nghĩa.
3. Bỏ lịch sử xưng hô, cặp mặc định chưa từng quan trọng và chi tiết giọng không còn phân biệt nhân vật.
4. Xóa sự kiện gần không còn tác động.
5. Hợp nhất các mốc bền có cùng hệ quả.
6. Bỏ nhân vật phụ đang vắng mặt nếu họ không có việc mở hoặc ngoại lệ kiến thức.
7. Rút câu chữ của các mục còn lại.

Không được hy sinh trạng thái cần để tiếp tục cảnh, ranh giới tự chủ của `{{user}}`, dữ kiện an toàn/đồng thuận hoặc cá nhân hóa ưu tiên cao. Nếu chúng chiếm nhiều chỗ, nén mọi mục khác trước rồi diễn đạt chúng ngắn nhất có thể; đầu ra vẫn phải nằm trong 9.500 ký tự.

## ĐỊNH DẠNG XUẤT CHÍNH XÁC

Chỉ trả cấu trúc dưới đây, không thêm lời dẫn, giải thích, checklist hoặc code fence. Bỏ mục con không có dữ kiện hoặc ghi `Không có` một lần. Không dùng thẻ bàn giao cũ.

<ROLEPLAY_CHANGE_ROUTE>

## META

- version: 2
- route_seq: [số nguyên dương]
- parent_seq: [route_seq trước hoặc `none`]
- trạng thái: [HOÀN THÀNH / ĐANG DỞ / BỊ GIÁN ĐOẠN / ĐỔI TRỌNG TÂM]
- chốt_tại: [phản hồi AI gần nhất đã hoàn tất]

## TRẠNG THÁI HIỆN TẠI

- thời điểm/địa điểm: [...]
- người đang hiện diện: [...]
- vị trí/tiếp xúc/cơ học: [...]
- khả năng tức thời: [tay, miệng, hơi, giọng, di chuyển, tự chủ và giới hạn liên quan]
- điểm dừng: [điều đang dở nhưng chưa tự tiến thêm]

## THAY ĐỔI GẦN NHẤT

- [E001] [nguyên nhân -> thay đổi đã xảy ra -> hệ quả hiện còn liên quan; có thể `ref=...`]

## SỰ THẬT HOẠT ĐỘNG

- [F001] [một sự thật còn tác động ngoài trạng thái tức thời]

## RANH GIỚI KIẾN THỨC

- [K001] ref=[F.../M...]; biết=[...]; không biết=[...]; nghi ngờ=[...]

## XƯNG HÔ ĐANG HOẠT ĐỘNG

- [A001] [người nói] -> [người nghe]; tự xưng=[...]; gọi=[...]; tên/danh hiệu/biệt danh=[...]; mức=[...]; nhịp=[...]; căn cứ=[ảnh hưởng trực tiếp hoặc `chưa xác lập`]

## VIỆC CHƯA XONG

- [O001] [việc đang mở]; chủ thể=[...]; trạng thái=[...]; chờ=[prompt hoặc điều kiện thật, không dự đoán kết quả]

## CÁ NHÂN HÓA ĐANG HOẠT ĐỘNG

- [P001] [quy tắc hiện hành đã chuẩn hóa]; phạm vi=[...]; ưu tiên=[cao / thường]

## MỐC BỀN

- [M001] [bước ngoặt, bí mật, lời hứa, ranh giới, thương tích, vật, quan hệ hoặc hệ quả dài hạn]

</ROLEPLAY_CHANGE_ROUTE>

<USER_NEXT_PROMPT>
[Nhập prompt kế tiếp của bạn tại đây, rồi xóa dòng hướng dẫn này.]
</USER_NEXT_PROMPT>
