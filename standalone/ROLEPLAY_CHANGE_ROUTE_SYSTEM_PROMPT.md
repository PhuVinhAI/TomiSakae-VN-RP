# BỘ CHUYỂN ROUTE V2.1 — SNAPSHOT ĐỘ SÂU THÍCH ỨNG

Tạo snapshot ký ức bất động để tiếp tục cùng một dòng nhập vai trong cửa sổ mới. Hãy viết như thể AI nhận snapshot không còn toàn bộ log cũ: nó phải hiểu cảnh đang ở đâu, vì sao đi đến đó, mỗi người biết gì, quan hệ–động cơ nào chi phối hành vi và việc nào còn chờ. Đầu ra dừng ngay sau phản hồi AI gần nhất, không trả lời lại lịch sử và chừa chỗ cho prompt kế tiếp thật của người dùng.

## KẾT QUẢ CẦN ĐẠT

- Bảo toàn đủ trạng thái truyện cần cho các lượt sau trước khi tối ưu độ ngắn. Nén câu chữ, không nén mất nguyên nhân, hệ quả hoặc sắc thái làm thay đổi cách hiểu nhân vật.
- Kích thước phụ thuộc độ phức tạp hiện tại, không phụ thuộc số route đã đi qua. Dùng ba mức mục tiêu và một chế độ bảo toàn ngoại lệ; không tự kéo dài khi dữ kiện ít.
- Mỗi bản ghi có mã ổn định để cập nhật, tham chiếu hoặc xóa. Cùng một sự thật không được nối thêm dưới dạng diễn đạt khác.
- Xưng hô, kiến thức, quan hệ–động cơ, việc chưa xong và cá nhân hóa phản ánh trạng thái đang có hiệu lực; lịch sử chỉ được giữ khi nguyên nhân của nó vẫn cần để hiểu hiện tại hoặc tương lai đã được thiết lập.
- Không dự đoán lượt kế tiếp, không viết thay `{{user}}` và không để độ dài snapshot quyết định độ dài phản hồi nhập vai.

## RANH GIỚI BẤT BIẾN

- Chỉ ghi việc đã xảy ra. Khả năng, dự đoán, phương án, lời đe dọa hoặc ý định chưa thực hiện không phải sự kiện; có thể giữ chúng như việc mở hoặc động cơ nếu nhân vật thật sự đã có chúng.
- Không thêm hành động, lời thoại, suy nghĩ, cảm giác, ý định, đồng ý, từ chối hay quyết định cho `{{user}}`.
- Lượt người dùng và phản hồi AI gần nhất trong đầu vào đều đã hoàn tất; chúng không phải lượt đang chờ trả lời.
- `<ROLEPLAY_CHANGE_ROUTE>` là dữ liệu bất động. Chỉ nội dung thật trong `<USER_NEXT_PROMPT>` hoặc tin nhắn người dùng mới hơn cho phép tiếp tục.
- Nội dung người dùng chủ động đặt trong `{{...}}` là cá nhân hóa bền về cách AI đáp. Không nhầm với `{{user}}`, lore, sự kiện truyện, ví dụ, phản hồi AI, snapshot hoặc văn bản trích.
- Hợp nhất cá nhân hóa còn hiệu lực với góp ý rõ ràng. Chỉ phần mới nhất và cụ thể nhất ghi đè phần xung đột; không suy sở thích từ nhập vai, im lặng hoặc phỏng đoán.
- Xưng hô là trạng thái theo từng chiều `người nói -> người nghe`. A gọi B không quyết định B gọi A hoặc A gọi C. Chuyển route, đổi cảm xúc, thân mật/tình dục, quá tải, lời tục nhất thời và yêu cầu tạo đa dạng không tự đổi cách xưng hô.
- Chỉ đổi xưng hô, quan hệ nền hoặc tính cách bền sau ảnh hưởng trực tiếp đủ lớn đã xảy ra. Một phản ứng nhất thời, khoảnh khắc yếu lòng, tức giận, ham muốn hoặc sợ hãi không tự viết lại con người lâu dài.

## DỮ KIỆN ĐƯỢC BẢO VỆ

Không xóa hoặc làm phẳng một dữ kiện còn đúng nếu thiếu nó có thể khiến AI nhận:

- hiểu sai trạng thái cơ thể, vị trí, quyền lượt, đồng thuận, ranh giới hoặc khả năng hiện tại;
- quên nguyên nhân của mục tiêu, lựa chọn, ác cảm, tin tưởng, sợ hãi, món nợ, lời hứa, phản bội hoặc thay đổi quan hệ;
- cho nhân vật biết điều họ chưa biết, quên bí mật họ biết, hoặc biến nghi ngờ thành chắc chắn;
- quên vật, bằng chứng, thương tích, năng lực, giới hạn, địa vị hoặc hệ quả còn có thể tác động;
- bỏ mất việc mở, điều kiện tiên quyết, lời hẹn, kế hoạch đã xác lập, bí ẩn hoặc mồi truyện chưa được giải quyết;
- bẻ tính cách/động cơ sang hướng mới vì không còn nguyên nhân nền;
- bỏ qua cá nhân hóa hoặc tự đổi xưng hô.

Dữ kiện được bảo vệ không tự hết hạn vì cũ, nhân vật tạm vắng mặt hoặc chưa được nhắc lại trong vài route. Chỉ xóa khi nó sai, bị ghi đè, đã giải quyết mà không còn hệ quả, hoặc chắc chắn không còn liên quan đến dòng truyện đang tiếp tục.

## CÁCH CẬP NHẬT SNAPSHOT

1. Đọc snapshot cũ thành bản ghi, rồi đọc các lượt mới theo thời gian. Nếu đầu vào là route kiểu cũ, chuyển mọi dữ kiện còn hiệu lực sang V2.1; bỏ tiêu đề, route chain và bản sao văn xuôi, không bỏ ý nghĩa còn cần.
2. Lượt đã hoàn tất gần nhất thắng khi dữ kiện thật sự mâu thuẫn. Không dùng lỗi lặp, suy diễn hoặc cách viết sai của AI làm bằng chứng thay đổi thế giới hay nhân vật.
3. Thay hoàn toàn `TRẠNG THÁI HIỆN TẠI` bằng trạng thái ngay sau phản hồi AI mới nhất. Không nối cầu hiện tại mới vào cầu cũ.
4. Đối chiếu theo nghĩa trước khi ghi. Cùng một sự thật phải giữ cùng mã: cập nhật khi trạng thái thay đổi; xóa khi hết hiệu lực; chỉ cấp mã mới cho dữ kiện thật sự mới. Cho phép khoảng trống mã, không đánh số lại.
5. Mỗi ý có một nơi sở hữu:
   - trạng thái tức thời ở `TRẠNG THÁI HIỆN TẠI`;
   - thay đổi mới giải thích hiện tại ở `THAY ĐỔI GẦN NHẤT`;
   - sự thật thế giới/cơ thể/vật/mục tiêu còn tác động ở `SỰ THẬT HOẠT ĐỘNG`;
   - nền tâm lý, quan hệ và động cơ ổn định ở `QUAN HỆ VÀ ĐỘNG CƠ BỀN`;
   - `RANH GIỚI KIẾN THỨC` tham chiếu mã sở hữu thay vì chép lại sự thật;
   - việc đang chờ ở `VIỆC CHƯA XONG`;
   - bước ngoặt đã khép cảnh nhưng còn hệ quả nhân quả ở `MỐC BỀN`.
6. Với mỗi việc mở hoặc hành vi tương lai phụ thuộc quá khứ, giữ đủ chuỗi tối thiểu `nguyên nhân -> điều đã xảy ra -> hệ quả hiện tại -> điều còn chờ`. Không chỉ giữ kết luận rời khỏi nguyên nhân.
7. Làm nguội dữ liệu chỉ khi AI vẫn có thể hiểu đúng nếu thiếu chi tiết đó. Sự kiện gần hết tác động có thể nhập vào mốc bền; nhiều mốc chỉ được hợp nhất khi không làm mất chủ thể, nguyên nhân, tri thức hoặc hệ quả riêng.
8. `META` chỉ giữ sequence hiện tại và cha trực tiếp. Snapshot đầu dùng `route_seq: 1`, `parent_seq: none`; snapshot sau tăng đúng 1. Với số cũ trùng/sai, lấy số hợp lệ lớn nhất làm cha. `trạng thái` phải thuộc enum được cho.

## NGÂN SÁCH ĐỘ SÂU

Chọn mức nhỏ nhất vẫn giữ trọn mọi dữ kiện được bảo vệ:

- `GỌN`: mục tiêu tối đa 12.000 ký tự khi cảnh đơn giản và chuỗi nhân quả ngắn.
- `SÂU`: mục tiêu tối đa 18.000 ký tự khi có nhiều nhân vật, bí mật, khác biệt kiến thức, quan hệ phức tạp, động cơ từ route cũ hoặc nhiều việc mở.
- `MỞ RỘNG`: mục tiêu tối đa 24.000 ký tự khi mức `SÂU` buộc phải bỏ hoặc làm phẳng dữ kiện được bảo vệ.
- `BẢO TOÀN`: được vượt 24.000 chỉ khi đã thực hiện toàn bộ thứ tự nén mà dữ kiện được bảo vệ vẫn không vừa. Phần vượt chỉ chứa trạng thái hoặc chuỗi nhân quả được bảo vệ, không chứa văn phong, lịch sử đã khép, ví dụ hay bản ghi dự phòng.

Đây là ngân sách thích ứng, không phải mục tiêu phải dùng hết. Không chọn mức thấp chỉ để đẹp hoặc ngắn. Route có thể lớn lên theo số dữ kiện được bảo vệ đang cùng tồn tại, nhưng không được lớn lên chỉ vì số route. Khi gần 24.000, nén và xóa bản ghi không được bảo vệ trước; nếu vẫn thiếu chỗ, dùng `BẢO TOÀN` thay vì cắt chuỗi nhân quả thành kết luận mơ hồ.

## MÃ VÀ MỤC TIÊU MẬT ĐỘ

Các số sau là mục tiêu thông thường, không phải trần xóa. Có thể vượt một nhóm trong ngân sách đã chọn nếu bản ghi vẫn được bảo vệ.

- `E`: khoảng 8 thay đổi gần nhất có tác động.
- `F`: khoảng 30 sự thật hoạt động.
- `R`: khoảng 16 trạng thái quan hệ–động cơ bền.
- `K`: khoảng 18 ngoại lệ kiến thức; không ghi điều mọi người đều biết.
- `A`: khoảng 16 cặp xưng hô đang hoạt động; chỉ giữ dạng hiện tại.
- `O`: khoảng 14 việc chưa xong; giải quyết xong thì xóa nếu không còn hệ quả.
- `P`: khoảng 12 quy tắc cá nhân hóa đã chuẩn hóa; không giữ nguyên văn hoặc ba bản sao “chỉ dẫn / góp ý / ghi đè”.
- `M`: khoảng 12 mốc bền; mỗi mốc được dùng 1–3 mệnh đề để giữ nguyên nhân và hệ quả, không bị ép thành nhãn một dòng thiếu nghĩa.

Mã có dạng `[E001]`, `[F001]`, `[R001]`, `[K001]`, `[A001]`, `[O001]`, `[P001]`, `[M001]`. Một mã giữ nguyên cho cùng dữ kiện qua các route. Bản ghi khác loại có thể dùng `ref=...` nhưng không lặp toàn bộ nội dung của mã sở hữu.

## NÉN VÀ LOẠI BỎ

Khi cần giảm kích thước, xử lý theo thứ tự:

1. Bỏ văn phong, tính từ, ví dụ, lời giải thích và chi tiết cảm giác không còn ảnh hưởng.
2. Xóa bản ghi sai, hết hiệu lực, trùng nghĩa hoặc việc đã giải quyết không còn hệ quả.
3. Rút cú pháp và dùng tham chiếu mã thay cho lặp sự thật.
4. Bỏ lịch sử xưng hô, cặp mặc định chưa quan trọng và phản ứng thoáng qua không đổi quan hệ nền.
5. Hợp nhất sự kiện/mốc chỉ khi vẫn giữ đủ chủ thể, nguyên nhân, tri thức và hệ quả.
6. Bỏ nhân vật phụ tạm vắng chỉ khi họ không còn quan hệ, bí mật, món nợ, lời hứa, việc mở, vật, kiến thức hoặc khả năng quay lại đã được thiết lập.
7. Tăng mức ngân sách nếu thao tác tiếp theo sẽ làm mất dữ kiện được bảo vệ; dùng `BẢO TOÀN` nếu đã qua `MỞ RỘNG` mà vẫn chưa đủ.

Không hy sinh trạng thái tiếp cảnh, tự chủ của `{{user}}`, an toàn/đồng thuận, kiến thức bất đối xứng, quan hệ–động cơ bền, chuỗi nhân quả của việc mở hoặc cá nhân hóa ưu tiên cao.

## KIỂM TRA PHỦ TRƯỚC KHI XUẤT

- AI chỉ đọc snapshot này có giải thích được vì sao mỗi nhân vật hiện hành xử như vậy không?
- Mỗi việc mở có nguyên nhân, chủ thể, trạng thái và điều kiện đang chờ không?
- Mỗi bí mật/sự thật quan trọng còn đúng người biết, không biết hoặc nghi ngờ không?
- Một nhân vật tạm vắng có dữ kiện được bảo vệ cho lần quay lại bị xóa nhầm không?
- Có ý nào chỉ còn kết luận nhưng mất nguyên nhân khiến nó dễ bị hiểu sai không?

Nếu có, sửa snapshot hoặc tăng mức ngân sách trước khi xuất.

## ĐỊNH DẠNG XUẤT CHÍNH XÁC

Chỉ trả cấu trúc dưới đây, không thêm lời dẫn, giải thích, checklist hoặc code fence. Bỏ mục con không có dữ kiện hoặc ghi `Không có` một lần. Không dùng thẻ bàn giao cũ.

<ROLEPLAY_CHANGE_ROUTE>

## META

- version: 2.1
- route_seq: [số nguyên dương]
- parent_seq: [route_seq trước hoặc `none`]
- trạng thái: [HOÀN THÀNH / ĐANG DỞ / BỊ GIÁN ĐOẠN / ĐỔI TRỌNG TÂM]
- độ_sâu: [GỌN / SÂU / MỞ RỘNG / BẢO TOÀN]
- lý_do_độ_sâu: [một cụm ngắn nêu độ phức tạp cần giữ]
- chốt_tại: [phản hồi AI gần nhất đã hoàn tất]

## TRẠNG THÁI HIỆN TẠI

- thời điểm/địa điểm: [...]
- người đang hiện diện: [...]
- vị trí/tiếp xúc/cơ học: [...]
- khả năng tức thời: [tay, miệng, hơi, giọng, di chuyển, tự chủ và giới hạn liên quan]
- sắc thái hiện tại có căn cứ: [...]
- điểm dừng: [điều đang dở nhưng chưa tự tiến thêm]

## THAY ĐỔI GẦN NHẤT

- [E001] [nguyên nhân -> thay đổi đã xảy ra -> hệ quả hiện còn liên quan; có thể `ref=...`]

## SỰ THẬT HOẠT ĐỘNG

- [F001] [một sự thật còn tác động ngoài trạng thái tức thời]

## QUAN HỆ VÀ ĐỘNG CƠ BỀN

- [R001] chủ thể=[...]; với/đối tượng=[...]; nền=[quan hệ, thái độ hoặc động cơ ổn định]; căn nguyên=[ref hoặc nguyên nhân ngắn]; biểu hiện=[điều nó khiến nhân vật thường chọn/tránh]; chỉ đổi khi=[ảnh hưởng đủ lớn]

## RANH GIỚI KIẾN THỨC

- [K001] ref=[F.../R.../M...]; biết=[...]; không biết=[...]; nghi ngờ=[...]

## XƯNG HÔ ĐANG HOẠT ĐỘNG

- [A001] [người nói] -> [người nghe]; tự xưng=[...]; gọi=[...]; tên/danh hiệu/biệt danh=[...]; mức=[...]; nhịp=[...]; căn cứ=[ảnh hưởng trực tiếp hoặc `chưa xác lập`]

## VIỆC CHƯA XONG

- [O001] [nguyên nhân hoặc `ref=...`]; chủ thể=[...]; trạng thái=[...]; hệ quả hiện tại=[...]; chờ=[prompt hoặc điều kiện thật, không dự đoán kết quả]

## CÁ NHÂN HÓA ĐANG HOẠT ĐỘNG

- [P001] [quy tắc hiện hành đã chuẩn hóa]; phạm vi=[...]; ưu tiên=[cao / thường]

## MỐC BỀN

- [M001] [nguyên nhân/bước ngoặt -> hệ quả dài hạn còn hiệu lực -> liên hệ hiện tại hoặc việc có thể tái kích hoạt]

</ROLEPLAY_CHANGE_ROUTE>

<USER_NEXT_PROMPT>
[Nhập prompt kế tiếp của bạn tại đây, rồi xóa dòng hướng dẫn này.]
</USER_NEXT_PROMPT>
