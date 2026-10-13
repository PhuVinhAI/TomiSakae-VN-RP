# TomiSakae VN-RP for RisuAI

Plugin **TomiSakae VN-RP 2.0.0** hỗ trợ ba bộ preset nền, giữ thứ tự prompt, role, macro, module và regex của từng bộ:

- **Freaky Frankenstein 5.4**: GM theo task, mô phỏng thế giới và `<internal_states>`.
- **Sola V2 Flame**: nhịp điện ảnh, giọng NPC riêng, Story Review, scene header và Showrunner HUD.
- **Voyage-Universal-v5**: GM PbtA, văn trực tiếp, góc nhìn và character/location sheet trong comment ẩn.

Các preset nguồn nằm trong `source/`; build không phụ thuộc thư mục Downloads. Plugin chỉ đóng gói dữ liệu prompt/regex, không áp dụng cấu hình kết nối, mật khẩu, model hoặc sampling từ các preset xuất ra.

## Global Và Preset Cấu Hình

Mở **TomiSakae VN-RP** trong menu chat. Bảng điều khiển đặt tính năng **Global** ở trên, sau đó là lựa chọn một trong ba bộ nền và các module/regex tương ứng.

Cả ba bộ dùng tên module, mô tả chức năng và nhóm lựa chọn bằng tiếng Việt. Sola V2 Flame giữ cách nhóm nguồn, ẩn các dòng phân cách/khởi tạo biến và chia 149 bộ lọc theo chức năng. Voyage-Universal-v5 chia module thành luật cốt lõi, thế giới, văn xuôi, hồ sơ ẩn, nội dung người lớn và suy luận. Các tên hiển thị trong bảng token cũng được Việt hóa; thay đổi UI không sửa prompt, regex hoặc cấu hình đã lưu.

Preset cấu hình có tên riêng chứa lựa chọn Global, bộ nền đang dùng và cấu hình module của từng bộ. Đổi bộ nền giữ lựa chọn Global và khôi phục các lựa chọn module/regex đã lưu riêng cho bộ đó. Lần đầu chọn một bộ, plugin dùng mặc định của preset nguồn. Riêng Freaky Frankenstein 5.4 mặc định dùng Realism Mode; lựa chọn Freaky đã lưu vẫn được giữ.

Card chưa được gán preset dùng **Mặc định**. Chọn preset khác sẽ ghi nhớ cho mọi chat của card bằng `chaId`. **Tạo preset** sao chép cấu hình đang hiển thị; **Lưu preset** áp dụng cho mọi card đang dùng preset đó. Có thể đổi tên hoặc xóa preset tự tạo; Mặc định không thể đổi tên hoặc xóa. **Khôi phục** đưa cấu hình về mặc định của bộ nền đang chọn. Chọn bộ nền lưu cấu hình hiện tại trước khi chuyển; thay đổi các công tắc thông thường cần bấm Lưu preset.

Định nghĩa preset và gán card nằm trong `pluginStorage`. Đổi preset không ghi cấu hình vào card/chat. Thiết lập từ phiên bản cũ được chuyển vào Mặc định với bộ nền Freaky Frankenstein 5.4.

## Tính Năng Global

- **Đầu ra tiếng Việt**, mặc định bật: prompt trong `src/vietnamese.ts` và các sửa đổi tối thiểu tự điều chỉnh theo bộ nền. Freaky Frankenstein 5.4 dùng `<vietnamese_output>`, Sola V2 Flame dùng `## Vietnamese Output`, Voyage-Universal-v5 dùng `## Rule: Vietnamese Output`. Văn phong, POV, luật NPC, định dạng và state của bộ đang chọn được giữ; tên thẻ, khóa, mã cố định và cú pháp phụ thuộc regex không bị dịch.
- **Tối ưu hình ảnh theo card**, mặc định tắt: dùng cú pháp và định danh ảnh có sẵn từ card/lore; vị trí và phân bố ảnh theo module. Ưu tiên thay đổi trang phục, sau đó thay đổi tư thế/trạng thái cơ thể, cuối cùng mới đến biểu cảm. Đặt ảnh sát trước nhịp được minh họa, phân bố theo thay đổi có ý nghĩa và luôn có văn kể hoặc hội thoại giữa các ảnh. Prompt và nhắc trong task suy luận dùng cấu trúc riêng của từng bộ.
- **Màu hội thoại theo giao diện**, mặc định bật: đọc `getColorScheme()` mỗi request. Freaky Frankenstein 5.4 lọc bảng 45 màu theo độ tương phản tối thiểu 4.5:1 với nền; Sola V2 Flame giữ tên palette riêng và điều chỉnh mã màu trong prompt lẫn regex lời thoại. Voyage-Universal-v5 không bị thêm thẻ màu. Khi host không cung cấp theme, giữ bảng màu gốc.
- **Âm báo hoàn tất**, mặc định tắt: báo cả thành công và thất bại. Khi tự biên tập, âm báo chờ Submodel kết thúc. Theo dõi nút gửi/ngắt qua quyền `mainDom` để nhận biết request kết thúc mà không có phản hồi.
- **Biên tập bằng Submodel**, mặc định tắt: nút viết lại ở phản hồi AI cuối dùng preset Submodel hiện tại của PocketRisu. Prompt biên tập trong `src/editor-prompts.ts` theo phong cách và schema riêng của từng bộ nền. Giữ prompt/card/lore đã ghép, bỏ memory/summary và chỉ giữ hai lượt trao đổi AI gần nhất cùng tin user hiện tại. Sau các tham chiếu là phản hồi gốc trong tin `assistant` và yêu cầu viết lại trong tin `user`.
- **Tự động biên tập bằng Submodel**, mặc định tắt và cần bật biên tập: chạy một lần sau output hoàn tất, không chạy trên chunk streaming. Freaky Frankenstein 5.4 yêu cầu header và `<internal_states>` đầy đủ; Sola V2 Flame và Voyage-Universal-v5 kiểm tra các khối đã xuất có đóng đầy đủ, không bắt buộc header/HUD ở những lượt preset cho phép bỏ chúng. Bản sửa là swipe mới, giữ bản gốc để chuyển lại. Nút đổi thành nút ngắt khi đang chạy; timeout 10 phút. Thông báo thành công chỉ hiện sau khi xác nhận đã lưu. Request lỗi hoặc bị ngắt giữ phản hồi gốc.
- **Token prompt chèn thêm**: ước tính ngay trong bảng điều khiển theo bộ nền, module và các tính năng đang chọn. Tokenizer `o200k_base` chạy cục bộ sau khi bung macro và áp dụng tiếng Việt/theme. Không tính card/lore, memory, lịch sử chat, phản hồi hoặc request Submodel; không gửi request để ước tính. Có chi tiết từng module. Số thực tế có thể khác theo model/API và cách gộp message.

Biên tập Submodel có thể dựng lại câu, đoạn, nhịp văn và đại từ, nhưng giữ diễn biến, nhân quả, kết quả, quan hệ và agency. Các mô tả, suy nghĩ và ghi chú tự do trong state được viết lại tiếng Việt; số, DC, roll, bộ đếm, giá trị cố định và dữ liệu chưa có không được điền hoặc tính lại. System biên tập nằm trước các chỉ dẫn tương đối sau lịch sử của bộ đang dùng.

## Tương Thích Với Preset Nguồn

Tắt Đầu ra tiếng Việt và Tối ưu hình ảnh trả prompt về nguyên bản; tắt Màu hội thoại theo giao diện giữ mã màu nguồn. Các file JSON nguồn không bị chỉnh khi bật/tắt tính năng.

Freaky Frankenstein 5.4 thay giới hạn hai mệnh đề và lệnh cấm liên từ bằng liên kết câu tiếng Việt tự nhiên, điều chỉnh các nhắc MAX/BOLT/Micro và dấu câu liên quan. Header tiếng Việt hỗ trợ cả icon ngày `🗓️`/`🗒️` và icon thời tiết trong ngoặc như `[🌤️]`. Hapuppy giữ thẻ suy luận dài mà không còn giới hạn 20.000 ký tự.

Context Saver của Freaky Frankenstein 5.4 lưu snapshot state ẩn trước khi dọn lịch sử. Xóa tin, đổi swipe hoặc tạo nhánh sẽ khôi phục đủ các state cần giữ theo độ sâu, cả ở lịch sử hiển thị và request. GFX của truyện như thư, biển báo, bản đồ và màn hình vẫn được giữ.

Sola V2 Flame giữ module bank, depth injection, Story Review, palette/gradient/tone/kinetic và cú pháp tracker gốc. Nhắc POV trong cả module lẫn Story Review dùng đại từ tiếng Việt phù hợp khi bật tiếng Việt. Header với thời gian số hoặc thời tiết tiếng Việt được điều chỉnh trên bản hiển thị để regex chọn skybox. Saver chỉ dọn bản sao request; tracker trong lịch sử đã lưu luôn còn để quay lại hoặc tạo nhánh. Regex nguồn `disabled: true` mặc định tắt và chỉ chạy nếu người dùng chủ động bật.

Voyage-Universal-v5 sử dụng `prompt_order` đang hoạt động thay vì thứ tự placeholder trong bản xuất. Giữ Direct Prose, NPC Realistic Speech, POV, PbtA và Prose Format: văn kể plaintext, thoại trong dấu nháy, âm thanh trong dấu gạch dưới, tài liệu blockquote và terminal/code trong code block. Sheet và ghi chú giữ comment ẩn và khóa gốc; nội dung mô tả được tạo bằng tiếng Việt. Preset nguồn không có regex thì plugin không bổ sung regex FF5.4.

`{{user}}` và `{{char}}` lấy từ persona/card đang mở. Macro nguồn được bung theo thứ tự và riêng cho từng request; không còn biến của bộ trước khi đổi preset. Build giữ sampling/model chính và Submodel do PocketRisu cấu hình.

## Build Và Cài Đặt

Chạy ở thư mục gốc repository:

```powershell
pnpm check
pnpm test
pnpm build:risuai:tomisakae-vn-rp
```

File plugin để import:

```text
risuai/tomisakae-vn-rp-plugin/dist/tomisakae-vn-rp-plugin.js
```

Trong **RisuAI → Plugin Settings → Import Plugin**, import file trên để thay bản trước. Plugin dùng API v3; các tính năng biên tập tự động/swipe cần API output chat của PocketRisu. RisuAI yêu cầu quyền replacer, đọc database và `mainDom` cho việc ghép request, lấy persona, nút viết lại và âm báo.
