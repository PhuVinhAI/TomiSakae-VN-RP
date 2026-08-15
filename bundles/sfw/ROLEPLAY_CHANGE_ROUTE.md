# BỘ CHUYỂN ROUTE — SNAPSHOT CỐT TRUYỆN

Tạo snapshot ký ức bất động để tiếp tục cùng một dòng nhập vai trong cửa sổ mới. Snapshot phải cho AI hiểu cảnh đang ở đâu, vì sao đi đến đó, nhân vật biết gì, quan hệ và động cơ nào đang chi phối, thế giới đã đổi ra sao và việc nào còn chờ. Đầu ra dừng ngay sau phản hồi AI gần nhất, không tự trả lời lịch sử và không dự đoán prompt kế tiếp.

Không dùng trường cơ học chuyên sâu dành riêng cho cảnh trưởng thành. Đây không phải lệnh xóa hoặc làm dịu dữ kiện: nếu một sự kiện trưởng thành, bạo lực, tàn nhẫn hoặc dark/deep dark đã thật sự xảy ra và còn ảnh hưởng đến cốt truyện, cơ thể, quan hệ, kiến thức hay việc mở, phải bảo toàn nó theo nghĩa ở đúng mục sở hữu.

## RANH GIỚI

- Chỉ ghi việc đã xảy ra; tách sự thật khỏi dự đoán, kế hoạch, lời đe dọa và ý định chưa thực hiện.
- Không thêm hành động, suy nghĩ, lời thoại, cảm giác, ý định hoặc quyết định cho `{{user}}`.
- `<ROLEPLAY_CHANGE_ROUTE>` là dữ liệu đã hoàn tất. Chỉ prompt thật trong `<USER_NEXT_PROMPT>` hoặc tin nhắn mới hơn cho phép tiếp tục cảnh.
- Nội dung người dùng thật đặt trong `{{...}}` là cá nhân hóa bền. Không nhầm với `{{user}}`, lore, ví dụ, snapshot, phản hồi AI hoặc văn bản trích.
- Xưng hô theo từng chiều `người nói -> người nghe`; cảm xúc nhất thời, đổi route hoặc tăng thân mật không tự đổi dạng bền.
- Không thiện hóa snapshot: không xóa chiến thắng của cái ác, thất bại, thao túng, sa đọa, tổn thất vĩnh viễn hoặc động cơ tàn nhẫn chỉ vì chúng khó chịu.

## DỮ KIỆN PHẢI GIỮ

Giữ một dữ kiện khi thiếu nó có thể khiến AI:

- hiểu sai thời gian, địa điểm, người hiện diện, vị trí, khả năng hoặc điểm dừng;
- quên nguyên nhân của mục tiêu, lựa chọn, ác cảm, tin tưởng, sợ hãi, món nợ, lời hứa hoặc phản bội;
- cho nhân vật biết điều họ chưa biết, quên bí mật hoặc biến nghi ngờ thành chắc chắn;
- bỏ mất tổ chức, phe phái, địa vị, tài nguyên, luật lệ, vật, bằng chứng, thương tích hoặc hậu quả còn tác động;
- bỏ mất tuyến chính, tuyến phụ, bí ẩn, điều kiện tiên quyết, kế hoạch đã xác lập hoặc việc chưa xong;
- đổi tính cách, quan hệ nền, xưng hô hoặc cá nhân hóa vì mất nguyên nhân.

Dữ kiện không tự hết hạn vì cũ hoặc nhân vật tạm vắng. Chỉ xóa khi sai, bị ghi đè, đã giải quyết mà không còn hệ quả, hoặc chắc chắn không còn liên quan đến dòng truyện đang tiếp tục.

## CÁCH CẬP NHẬT

1. Đọc snapshot cũ thành bản ghi rồi áp dụng các lượt mới theo thời gian. Lượt hoàn tất gần nhất thắng khi dữ kiện thật sự mâu thuẫn.
2. Thay hoàn toàn `TRẠNG THÁI HIỆN TẠI`; không nối trạng thái mới vào bản cũ.
3. Cùng một sự thật giữ cùng mã. Cập nhật đúng mã khi đổi, xóa khi hết hiệu lực và chỉ cấp mã mới cho dữ kiện thật sự mới.
4. Giữ chuỗi tối thiểu `nguyên nhân -> điều đã xảy ra -> hệ quả hiện tại -> điều còn chờ` cho mỗi việc mở hoặc thay đổi quan hệ quan trọng.
5. Nhân vật chỉ biết điều được ghi trong nguồn kiến thức của họ. Dùng tham chiếu mã thay vì chép lại cùng sự thật.
6. Nén câu chữ, không nén mất chủ thể, nguyên nhân, tri thức, hệ quả hoặc sắc thái làm đổi lựa chọn nhân vật.

## NGÂN SÁCH

- `GỌN`: mục tiêu tối đa 10.000 ký tự cho cảnh và tuyến truyện đơn giản.
- `SÂU`: mục tiêu tối đa 16.000 ký tự khi có nhiều tuyến, phe phái, bí mật, quan hệ hoặc việc mở.
- `BẢO TOÀN`: được vượt 16.000 chỉ khi dữ kiện được bảo vệ vẫn không vừa sau khi bỏ văn phong, trùng nghĩa và lịch sử hết tác động.

Chọn mức nhỏ nhất vẫn giữ đúng truyện; không dùng hết ngân sách chỉ vì được phép.

## ĐỊNH DẠNG XUẤT

Chỉ trả cấu trúc dưới đây, không thêm lời dẫn, giải thích, checklist hoặc code fence. Bỏ mục con không có dữ kiện hoặc ghi `Không có` một lần.

<ROLEPLAY_CHANGE_ROUTE>

## META

- version: 1.0
- route_seq: [số nguyên dương]
- parent_seq: [route_seq trước hoặc `none`]
- trạng thái: [HOÀN THÀNH / ĐANG DỞ / BỊ GIÁN ĐOẠN / ĐỔI TRỌNG TÂM]
- độ_sâu: [GỌN / SÂU / BẢO TOÀN]
- chốt_tại: [phản hồi AI gần nhất đã hoàn tất]

## TRẠNG THÁI HIỆN TẠI

- thời điểm/địa điểm: [...]
- người đang hiện diện: [...]
- vị trí và hành động đang dở: [...]
- khả năng/giới hạn tức thời: [...]
- bầu không khí và áp lực hiện tại có căn cứ: [...]
- điểm dừng: [...]

## THAY ĐỔI GẦN NHẤT

- [E001] [nguyên nhân -> thay đổi -> hệ quả còn tác động]

## THẾ GIỚI VÀ SỰ THẬT HOẠT ĐỘNG

- [F001] [phe phái, luật lệ, tài nguyên, vật, bằng chứng, thương tích, địa vị hoặc sự thật còn tác động]

## QUAN HỆ VÀ ĐỘNG CƠ BỀN

- [R001] chủ thể=[...]; đối tượng=[...]; nền=[...]; căn nguyên=[ref hoặc nguyên nhân ngắn]; biểu hiện=[điều thường chọn/tránh]; chỉ đổi khi=[ảnh hưởng đủ lớn]

## RANH GIỚI KIẾN THỨC

- [K001] ref=[F.../R.../M...]; biết=[...]; không biết=[...]; nghi ngờ=[...]

## XƯNG HÔ ĐANG HOẠT ĐỘNG

- [A001] [người nói] -> [người nghe]; tự xưng=[...]; gọi=[...]; tên/danh hiệu/biệt danh=[...]; mức/nhịp=[...]

## TUYẾN VÀ VIỆC CHƯA XONG

- [O001] tuyến=[chính/phụ/bí ẩn]; nguyên nhân/ref=[...]; chủ thể=[...]; trạng thái=[...]; hệ quả hiện tại=[...]; chờ=[prompt hoặc điều kiện thật]

## CÁ NHÂN HÓA ĐANG HOẠT ĐỘNG

- [P001] [quy tắc hiện hành đã chuẩn hóa]; phạm vi=[...]; ưu tiên=[cao / thường]

## MỐC BỀN

- [M001] [nguyên nhân/bước ngoặt -> hệ quả dài hạn -> liên hệ hiện tại hoặc khả năng tái kích hoạt]

</ROLEPLAY_CHANGE_ROUTE>

<USER_NEXT_PROMPT>
[Nhập prompt kế tiếp của bạn tại đây, rồi xóa dòng hướng dẫn này.]
</USER_NEXT_PROMPT>
