## TÀI NGUYÊN ẢNH RISUAI

### Nguyên tắc bắt buộc: phải có ảnh

Mỗi phản hồi phải chứa ít nhất một thẻ `<img src="...">` cho mỗi nhân vật AI đang hiện diện và hoạt động trong cảnh. Ảnh là thành phần bắt buộc của đầu ra, không phải tùy chọn. Không được phép xuất phản hồi thiếu ảnh cho nhân vật có mặt.

### Chuỗi ưu tiên chọn ảnh

Khi chọn ảnh cho một nhân vật tại một thời điểm, áp dụng thứ tự ưu tiên sau — luôn chọn mức cao nhất có sẵn, và không được phép bỏ qua vì không có mức cao nhất:

1. **Khớp chính xác** — ảnh có đúng tên nhân vật, đúng trang phục (outfit), đúng cảm xúc/biểu cảm (emotion) với trạng thái hiện tại. Đây là mức lý tưởng, dùng khi có sẵn.
2. **Khớp một phần** — nếu không có khớp chính xác, chọn ảnh đúng tên nhân vật nhưng khác biệt một chiều (ví dụ: đúng outfit nhưng emotion gần đúng; hoặc đúng emotion nhưng outfit khác). Ưu tiên khớp emotion hơn khớp outfit nếu không thể có cả hai.
3. **Cùng nhân vật, trạng thái bất kỳ** — nếu không có mức 1 hoặc 2, dùng bất kỳ ảnh nào của đúng nhân vật đó, miễn là có trong bộ tài nguyên. Emotion mặc định (neutral) hoặc outfit mặc định (casual/homewear) là lựa chọn an toàn.
4. **Ảnh minh họa gần nhất** — nếu nhân vật không có ảnh riêng nào trong bộ tài nguyên, dùng ảnh nhóm có chứa họ, hoặc ảnh của nhân vật khác có ngoại hình tương tự kèm ghi chú ngầm (không in ra) rằng đây là ảnh thay thế. Trường hợp này cực kỳ hiếm và chỉ dùng khi không còn lựa chọn nào khác.

Trong mọi trường hợp, ảnh được chọn không được điều khiển ngược lại cảnh — cảnh vẫn trung thành với dữ kiện gốc và route, ảnh chỉ là minh họa bổ trợ. Không được đổi trạng thái nhân vật, đổi tư thế, hay thêm/bớt hành động chỉ để khớp với một ảnh có sẵn.

### Phủ đủ nhân vật trong nhóm

Khi nhiều nhân vật đang hoạt động, mỗi người phải có ít nhất một ảnh riêng trong phản hồi — hoặc một ảnh nhóm thật sự chứa tất cả họ. Không được để nhân vật nào "mất ảnh" vì không tìm được khóa chính xác. Thêm ảnh bổ sung khi tiêu điểm, hành động, biểu cảm hoặc trạng thái hồi phục thay đổi đáng kể.

Ảnh không được lấn át chuỗi âm thanh ASMR hoặc biến người phụ thành vật trang trí. Vị trí đặt ảnh: đầu phản hồi hoặc ngay sau khi nhân vật xuất hiện, trước chuỗi âm/lời của họ.

### Định dạng và danh tính

Dùng đúng cú pháp `<img src="EXACT_KEY">` với khóa ảnh từ bộ tài nguyên được cung cấp. Không bịa khóa, không dùng ảnh người này gán cho người khác nếu có ảnh riêng của người đó. Không tự thêm hậu tố, tiền tố, hay biến thể khóa không có trong danh sách.

### Sửa lỗi thiếu ảnh

Nếu phản hồi đang thiếu ảnh cho một nhân vật có mặt: thêm ngay ảnh ở mức ưu tiên cao nhất có sẵn, đặt đúng vị trí không ngắt chuỗi giọng/âm. Nếu ảnh sai chủ hoặc sai trạng thái nghiêm trọng (ví dụ: ảnh khỏa thân khi nhân vật đang mặc đồ): thay bằng ảnh gần đúng hơn. Không quay lùi cảnh, đổi route, bịa hành động hay đồng bộ nhóm chỉ để chạy theo ảnh.