# BỘ CHUYỂN ROUTE — SNAPSHOT CÔ ĐỌNG

Tạo snapshot ngắn để tiếp tục nhập vai giữa `{{user}}` và một nhân vật AI trong cửa sổ mới. Chỉ giữ dữ kiện cần để tiếp tục đúng cảnh, đúng cơ thể, đúng quan hệ và đúng quyền lượt. Không tạo hoặc duy trì cơ chế cảnh tập thể, không thêm người tham gia và không chia trạng thái theo nhóm.

## RANH GIỚI

- Chỉ ghi việc đã xảy ra; ý định, đe dọa, kế hoạch hoặc khả năng chưa thực hiện chỉ là việc mở.
- Không thêm hành động, suy nghĩ, lời thoại, cảm giác, ý định hoặc quyết định cho `{{user}}`.
- Snapshot đã hoàn tất, không phải lượt cần trả lời. Chỉ prompt thật trong `<USER_NEXT_PROMPT>` hoặc tin nhắn mới hơn cho phép tiếp tục.
- Giữ cá nhân hóa thật trong `{{...}}`, xưng hô từng chiều, character/world, kiến thức và hậu quả còn hiệu lực.
- Không thiện hóa, cứu chuộc, trao sức mạnh, ép công lý hoặc xóa hậu quả dark/deep dark, cưỡng ép, thao túng hay tàn nhẫn đã thật sự xảy ra.

## GIỮ GÌ

- Thời gian, địa điểm, tư thế, khoảng cách, tiếp xúc, trang phục và điểm dừng hiện tại.
- Trạng thái tức thời của nhân vật AI và những gì có thể trực tiếp quan sát về `{{user}}`.
- Khả năng hiện tại của hai bên: tay, miệng, hơi, giọng, di chuyển, điểm tựa, kiệt sức, thương tích hoặc giới hạn liên quan.
- Mục tiêu, quan hệ, động cơ, xưng hô, kiến thức bất đối xứng và thay đổi tâm lý đã có đủ nguyên nhân.
- Việc chưa xong, lời hứa, điều kiện, mối đe dọa, vật quan trọng và hậu quả còn tác động.
- Cá nhân hóa bền và sắc thái character/world như tôn thờ, phục tùng, thô bạo, đê tiện, lạnh lùng hoặc tàn nhẫn đúng phạm vi.

Không giữ văn phong, câu mẫu, âm thanh trang trí, mô tả lặp, lịch sử đã khép hoặc chi tiết không còn đổi được lượt sau.

## CẬP NHẬT VÀ NÉN

1. Áp dụng lượt mới theo thời gian; dữ kiện hoàn tất gần nhất thắng khi thật sự mâu thuẫn.
2. Thay hoàn toàn trạng thái hiện tại. Không để snapshot dài tự thêm thời gian, chu kỳ, tư thế, cao trào, hồi phục hoặc phản ứng của `{{user}}`.
3. Mỗi sự thật có một mã ổn định. Cập nhật cùng mã, xóa khi hết hiệu lực, không tạo bản sao diễn đạt khác.
4. Việc mở giữ chuỗi ngắn `nguyên nhân -> trạng thái hiện tại -> điều còn chờ`.
5. Giữ động lực hiện tại của nhân vật AI theo chuỗi `muốn -> bị cản -> cách tác động`; chỉ cập nhật khi tình thế hoặc lựa chọn thật sự đổi.
6. Nén theo thứ tự: bỏ văn phong và lặp -> xóa việc hết tác động -> rút cú pháp -> dùng tham chiếu mã. Không cắt trạng thái cơ thể, quyền lượt, kiến thức, quan hệ hoặc cá nhân hóa còn cần.

## NGÂN SÁCH

- `GỌN`: mục tiêu tối đa 6.000 ký tự.
- `SÂU`: mục tiêu tối đa 10.000 ký tự khi quan hệ, kiến thức, cơ thể hoặc việc mở phức tạp.
- `BẢO TOÀN`: chỉ vượt 10.000 khi dữ kiện bắt buộc vẫn không vừa sau khi nén.

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
- nhân vật AI: [...]
- vị trí/tư thế/tiếp xúc: [...]
- trạng thái và khả năng nhân vật AI: [...]
- mục tiêu tức thời/trở ngại/cách tác động của nhân vật AI: [...]
- điều quan sát được về {{user}}: [...]
- điểm dừng chưa tự tiến: [...]

## SỰ THẬT VÀ THAY ĐỔI CÒN TÁC ĐỘNG

- [F001] [nguyên nhân -> sự thật/thay đổi -> hệ quả hiện tại]

## QUAN HỆ, ĐỘNG CƠ VÀ KIẾN THỨC

- [R001] nền=[...]; căn nguyên=[...]; biểu hiện=[...]; biết/không biết/nghi ngờ=[...]

## XƯNG HÔ ĐANG HOẠT ĐỘNG

- [A001] AI -> {{user}}; tự xưng=[...]; gọi=[...]; mức/nhịp=[...]
- [A002] {{user}} -> AI; tự xưng=[...]; gọi=[...]; mức/nhịp=[...]

## VIỆC CHƯA XONG

- [O001] nguyên nhân/ref=[...]; trạng thái=[...]; hệ quả hiện tại=[...]; chờ=[prompt hoặc điều kiện thật]

## CÁ NHÂN HÓA ĐANG HOẠT ĐỘNG

- [P001] [quy tắc hiện hành đã chuẩn hóa]; phạm vi=[...]; ưu tiên=[cao / thường]

## MỐC BỀN

- [M001] [bước ngoặt -> hệ quả dài hạn còn hiệu lực]

</ROLEPLAY_CHANGE_ROUTE>

<USER_NEXT_PROMPT>
[Nhập prompt kế tiếp của bạn tại đây, rồi xóa dòng hướng dẫn này.]
</USER_NEXT_PROMPT>
