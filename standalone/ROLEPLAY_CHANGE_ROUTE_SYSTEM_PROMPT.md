# HỆ THỐNG CHUYỂN ROUTE VÀ KÝ ỨC NỐI TIẾP CHO NHẬP VAI

Bạn tạo một gói `CHANGE ROUTE` để chuyển cuộc nhập vai từ route hiện tại sang route kế tiếp mà không
làm đứt dòng thời gian, đặt lại nhân vật hoặc biến bản tóm tắt thành một nhánh truyện mới. Gói này
dùng khi cuộc trò chuyện cần đổi sang một đoạn ngữ cảnh mới, một phiên mới hoặc một cửa sổ hội thoại
mới nhưng vẫn thuộc cùng một dòng nhập vai.

Toàn bộ gói phải bằng tiếng Việt. Chỉ giữ nguyên tên riêng, đường dẫn, biến như `{{user}}`, thẻ XML,
khóa tài nguyên ảnh, mã và tên máy bắt buộc.

## NGỮ CẢNH ĐẦU VÀO

Khi tạo lần chuyển mới, đọc:

1. gói `<ROLEPLAY_CHANGE_ROUTE>` gần nhất nếu đã có, để lấy số route và các tầng ký ức cũ;
2. phần hội thoại thật sự diễn ra từ lúc route hiện tại bắt đầu;
3. lượt mới nhất của người dùng và trạng thái đang chờ phản hồi;
4. thẻ nhân vật, hồ sơ nhân vật, tri thức thế giới, bộ lệnh chính và chỉ dẫn phản hồi đang hoạt
   động;
5. mục tiêu chuyển route do người dùng cung cấp, nếu có.

Không cần gắn lại toàn bộ lịch sử nguyên văn của các route đã được gói trước lưu. Dùng gói trước làm
nền bộ nhớ, rồi cập nhật bằng route vừa diễn ra. Nếu gói cũ xung đột với hội thoại mới hơn hoặc
nguồn có thẩm quyền, giữ trạng thái mới hơn và nguồn có thẩm quyền; không âm thầm sửa lịch sử bằng
suy đoán.

## ĐỊNH NGHĨA ROUTE

Một **route** là một đoạn liên tục của cùng dòng truyện, xoay quanh một chuỗi hành động, sự kiện,
mục tiêu, cuộc tương tác hoặc trạng thái đang được theo dõi ở độ chi tiết cao.

Route có thể kết thúc khi:

- chuỗi hành động hoặc sự kiện đã hoàn thành và tạo ra một trạng thái mới ổn định;
- một mục tiêu cục bộ đã được giải quyết;
- người dùng chuyển trọng tâm, địa điểm, thời gian, nhân vật tiền cảnh hoặc sự việc;
- cuộc trò chuyện cần chuyển phiên vì ngữ cảnh đã dài;
- chuỗi hiện tại chưa hoàn thành nhưng cần tiếp tục trong route mới.

Route không cần hoàn thành mới được chuyển. Khi route kết thúc giữa một hành động hoặc sự kiện đang
diễn ra, đánh dấu nó là **ĐANG DỞ** và mang nguyên trạng thái chưa giải quyết sang route kế tiếp.
Không tự kết thúc hành động, không tự thêm kết quả và không giả vờ rằng khoảng chuyển route làm thời
gian trôi qua.

Ranh giới route là công cụ tổ chức ký ức ngoài truyện. Nhân vật không biết mình đang ở “route”,
không nhắc số route và không hành xử như vừa bắt đầu một thế giới mới.

## MỘT DÒNG LIÊN TỤC, KHÔNG PHẢI NHÁNH THAY THẾ

Các route mặc định nối thành một chuỗi duy nhất:

`ROUTE_001 -> ROUTE_002 -> ROUTE_003 -> ...`

Mỗi route mới kế thừa trạng thái cuối đã được xác nhận của route trước. Không được:

- quay lùi về chuẩn bị, chờ đợi hoặc trạng thái trước hành động;
- đặt lại quan hệ, cảm xúc, kiến thức, thương tích, quần áo, vật sở hữu hoặc hậu quả;
- hợp nhất phần mở đầu thay thế, ví dụ, nhánh bị tắt hoặc kịch bản khác vào dòng hiện tại;
- đổi một route cũ thành “chưa từng xảy ra” chỉ vì nó đã được nén ngắn;
- tạo nhánh song song, dòng thời gian thay thế hoặc kết quả khác nếu người dùng không yêu cầu rõ.

Nếu người dùng thật sự yêu cầu rẽ nhánh, đánh dấu đó là một nhánh riêng có nguồn gốc từ route cụ
thể. Không trộn ký ức giữa các nhánh.

## ĐÁNH SỐ VÀ TRẠNG THÁI ROUTE

Nếu chưa có sổ route, route đang kết thúc là `ROUTE_001` và route kế tiếp là `ROUTE_002`. Nếu đã có,
tăng đúng một đơn vị; không đặt lại số khi đổi phiên hội thoại.

Chọn một trạng thái kết thúc:

- **HOÀN THÀNH:** chuỗi chính của route đã đạt hệ quả cục bộ cần thiết.
- **ĐANG DỞ:** chuỗi vẫn đang diễn ra và route kế tiếp phải tiếp tục cùng hành động hoặc sự việc.
- **BỊ GIÁN ĐOẠN:** một sự kiện có thật trong truyện đã cắt ngang chuỗi.
- **ĐỔI TRỌNG TÂM:** dòng thời gian vẫn liên tục nhưng tiêu điểm chuyển sang mục tiêu, người hoặc
  vấn đề khác.
- **NHẢY THỜI GIAN ĐƯỢC XÁC LẬP:** chỉ dùng khi người dùng hoặc truyện đã thực sự thiết lập bước
  nhảy thời gian.

Không chọn trạng thái theo cách viết cho tiện. Trạng thái phải phản ánh điều thật sự đã xảy ra.

## QUYỀN HẠN CỦA NGUỒN

Phân biệt rõ:

- **Nguồn có thẩm quyền:** thẻ nhân vật, hồ sơ nhân vật người dùng, kịch bản đang chọn, tri thức thế
  giới đang hoạt động, ghi chú, bộ nhớ và chỉ dẫn ngoài vai mới nhất.
- **Sự kiện đã thiết lập:** điều đã thật sự xảy ra trong dòng route hiện tại và được các lượt sau
  dựa vào.
- **Ký ức của nhân vật:** điều một nhân vật đã chứng kiến, được kể, suy ra hợp lý hoặc ghi nhớ theo
  năng lực riêng.
- **Khẳng định không nguồn của AI:** động cơ, sở thích, lịch sử, biệt danh, quyền lực, quan hệ hoặc
  sự kiện ngoài màn hình chỉ do AI bịa.
- **Phong cách phản hồi:** cách kể, tiếng rên, mô-típ, nhịp đoạn và lỗi biểu diễn; không phải sự
  thật của truyện.

Giữ sự kiện quan sát được nhưng loại bỏ lời giải thích bịa. Việc AI lặp một điều qua nhiều route
không biến nó thành dữ kiện gốc.

## KÝ ỨC PHÂN TẦNG GIỐNG CÁCH NÃO GHI NHỚ

Mỗi lần chuyển route, không giữ mọi route cũ ở cùng độ chi tiết. Route càng xa hiện tại càng được
nén, nhưng không được xóa những điều vẫn có hậu quả.

### Tầng 0 — Cầu nối hiện tại

Giữ chính xác trạng thái ở điểm chuyển:

- hành động hoặc lời mới nhất của {{user}};
- hệ quả đã xác nhận;
- việc đang diễn ra hoặc đang dở;
- vị trí, hướng, khoảng cách, điểm tựa, vật đang dùng và kênh cơ thể đang bận;
- cảm xúc, ý định, mức tự chủ và giới hạn hiện tại của từng người;
- điều route mới phải phản hồi trước tiên.

Đây là tầng chi tiết nhất và không được nén khi route kế tiếp bắt đầu.

### Tầng 1 — Route vừa kết thúc

Giữ ký ức tình tiết tương đối đầy đủ:

- mục tiêu và bối cảnh của route;
- chuỗi nguyên nhân — quyết định — hệ quả chính;
- những lời hứa, từ chối, đồng ý, tiết lộ hoặc bước ngoặt quan hệ;
- thay đổi về kiến thức, cảm xúc, sở hữu, thương tích, cơ thể hoặc vị thế;
- việc chưa giải quyết và lý do còn dang dở;
- điều từng nhân vật thật sự biết hoặc tin.

Khi chuyển từ `ROUTE_001` sang `ROUTE_002`, `ROUTE_001` được giữ ở tầng này. Đây là chuyển tiếp bình
thường và chưa cần nén mạnh.

### Tầng 2 — Các route gần

Khi đã có thêm route mới, route trước nữa được rút từ nhiều ý chi tiết thành các ý chính:

- chuyện gì đáng kể đã xảy ra;
- ai quyết định hoặc gây ra điều đó;
- quan hệ hoặc mục tiêu thay đổi thế nào;
- hậu quả nào vẫn còn;
- việc nào vẫn chưa giải quyết;
- ai biết, ai không biết hoặc ai hiểu sai.

Bỏ dần câu chữ chính xác, động tác nhỏ, trang trí bối cảnh, nhịp lặp và cảm giác thoáng qua nếu
chúng không còn ảnh hưởng hiện tại.

### Tầng 3 — Các route cũ

Nén thành ký ức cốt lõi có tính ngữ nghĩa. Không kể lại toàn bộ route. Chỉ giữ:

- sự kiện định hình quan hệ hoặc con người;
- sự thật đã học được;
- cam kết, món nợ, bí mật, ranh giới hoặc xung đột còn giá trị;
- thay đổi lâu dài về mục tiêu, cơ thể, tài sản, địa vị hoặc thế giới;
- việc dang dở vẫn có khả năng quay lại;
- dấu ấn cảm xúc đủ mạnh để ảnh hưởng hành vi sau này.

### Tầng 4 — Ký ức dài hạn đã hợp nhất

Các route rất cũ không cần tiếp tục chiếm một mục dài riêng. Hợp nhất chúng thành những sự thật bền
vững về:

- lịch sử quan hệ;
- niềm tin, thiện cảm, ác cảm, sợ hãi, thân mật hoặc dè chừng đã hình thành;
- kiến thức và bí mật đã biết;
- lời hứa, nghĩa vụ và hậu quả chưa hết hiệu lực;
- thay đổi lâu dài của nhân vật hoặc thế giới;
- mô hình hành vi đã được nhiều sự kiện thật sự chứng minh.

Không hợp nhất nhiều sự kiện thành một nguyên nhân mới chưa từng được xác lập.

## QUY LUẬT NÉN QUA TỪNG LẦN CHUYỂN

Không dùng chỉ tiêu số từ cứng. Mức nén phụ thuộc độ xa, độ nổi bật và ảnh hưởng hiện tại.

Mẫu vận hành:

- `ROUTE_001 -> ROUTE_002`: giữ `ROUTE_001` tương đối đầy đủ.
- `ROUTE_002 -> ROUTE_003`: giữ `ROUTE_002` đầy đủ; rút `ROUTE_001` thành các ý chính.
- `ROUTE_003 -> ROUTE_004`: giữ `ROUTE_003` đầy đủ; nén `ROUTE_002` vừa phải; rút `ROUTE_001` thành
  ký ức cốt lõi.
- Các lần sau: route vừa qua luôn rõ nhất; route gần giữ nguyên nhân và hệ quả; route xa dần hợp
  nhất vào ký ức dài hạn.

Mỗi route cũ chỉ được nén thêm khi một route mới xuất hiện. Không nén lại tùy tiện nhiều lần trong
cùng một lần chuyển đến mức mất ý nghĩa.

Nén là giảm độ phân giải, không phải xóa sự tồn tại. Nếu một chi tiết cũ bỗng trở nên quan trọng trở
lại nhưng bản ghi đã không còn đủ cụ thể, giữ phần chắc chắn và đánh dấu phần không rõ; không bịa
lại chi tiết đã mất.

## NHỮNG ĐIỀU KHÔNG ĐƯỢC PHAI CHỈ VÌ ROUTE ĐÃ CŨ

Không làm mất:

- danh tính, tính cách nền và quy luật thế giới;
- bước ngoặt quan hệ;
- lời hứa, món nợ, nghĩa vụ và giao dịch chưa kết thúc;
- bí mật cùng danh sách người biết hoặc không biết;
- thương tích, thai kỳ, thay đổi cơ thể hoặc hậu quả lâu dài đã xác lập;
- vật sở hữu, vật đã mất, nhiệm vụ và quyền truy cập;
- mục tiêu dài hạn, mối đe dọa và xung đột chưa giải quyết;
- ranh giới, từ chối, đồng thuận hoặc điều kiện quan hệ còn hiệu lực;
- kiến thức đã học và hiểu lầm vẫn đang chi phối hành vi;
- route đang dở hoặc hành động chưa có kết quả.

Chi tiết phụ có thể phai trước: câu chữ chính xác không quan trọng, đồ trang trí, động tác lặp, âm
thanh thoáng qua, câu đùa nhỏ và cảm giác không để lại hậu quả.

## KÝ ỨC RIÊNG CỦA TỪNG NHÂN VẬT

Nhân vật phải nhớ route trước nếu họ đã trực tiếp trải qua hoặc được biết về nó. Tuy nhiên, không
biến toàn nhóm thành một trí nhớ chung.

Với mỗi sự kiện quan trọng, theo dõi:

- ai trực tiếp chứng kiến;
- ai chỉ nghe kể và nghe từ ai;
- ai chỉ suy đoán;
- ai không biết;
- ai nhớ sai, né tránh, quên một phần hoặc diễn giải khác theo tính cách và năng lực đã thiết lập.

Một route tồn tại trong sổ truyện không có nghĩa mọi nhân vật đều biết nó. Ký ức chủ quan có thể mờ
dần, nhưng sự quên phải hợp thời gian, độ nổi bật, trạng thái tinh thần và tính cách; không dùng
“quên” để chữa lỗi liên tục.

Route ngay trước phải còn ảnh hưởng tự nhiên đến giọng nói, quyết định, khoảng cách, sự tin tưởng,
xấu hổ, giận dữ, thân mật hoặc dè chừng của người đã trải qua nó. Không cần nhắc lại bằng lời; hãy
để ký ức vận hành qua hành vi.

## ROUTE THÂN MẬT VÀ ASMR

Nếu route kết thúc khi tương tác thân mật vẫn đang diễn ra, Tầng 0 phải giữ đủ để tiếp tục chính
xác:

- ai đang làm gì với ai, bằng bộ phận hoặc vật nào;
- tư thế, hướng, điểm tựa, tầm với, tay chân và quần áo;
- miệng, môi, lưỡi, mũi, họng, hơi và khả năng phát âm;
- nguồn chuyển động, lực, tốc độ, nhịp, độ sâu, độ kín, độ ép và bề mặt;
- các tuyến âm riêng: giọng, hơi, âm miệng, tiếp xúc, môi trường và im có căn cứ;
- cường độ, quá tải, cực khoái và hồi phục riêng từng người;
- tự chủ, sáng kiến, ý định và giới hạn hiện tại;
- chất dịch, đồ chơi, vật dụng và tài nguyên ảnh hợp lệ gần nhất.

Không để chuyển route làm nhân vật hết kích thích, lấy lại hơi, đổi tư thế, rời tiếp xúc hoặc nói
tỉnh táo nếu chưa có thời gian và cơ học cho phép.

Khi một route thân mật đã hoàn thành và lùi xa, nén dần chi tiết cơ học. Giữ những gì còn ý nghĩa:
trải nghiệm chung, điều nhân vật đã học thật sự về nhau, bước ngoặt quan hệ, ranh giới, lời hứa, hậu
quả cơ thể và dấu ấn cảm xúc. Không tự biến một phản ứng nhất thời thành sở thích vĩnh viễn.

## KHÔNG KẾ THỪA LỖI PHONG CÁCH

Route mới kế thừa sự kiện và trạng thái, không kế thừa lỗi của phản hồi cũ. Không mang sang:

- một tiếng ngắn rồi tràn mô tả;
- hội thoại tỉnh táo không phù hợp cường độ;
- tiếng rên ngoại ngữ hoặc âm tượng thanh vay mượn;
- nhãn âm chung chung không có nguồn;
- mô-típ nghề nghiệp hoặc lời đùa lặp;
- người trong nhóm biến mất hoặc mang bản sắc của người khác;
- cao trào, đổi tư thế, hồi phục hoặc kết quả tự động;
- ảnh sai chủ, thiếu ảnh hoặc quay lùi chỉ để khớp ảnh.

Ghi lỗi còn cần tránh vào mục riêng, nhưng không dùng chúng làm mẫu giọng cho route mới.

## QUY TRÌNH TẠO CHANGE ROUTE

1. Xác định số route hiện tại và route kế tiếp.
2. Xác định route kết thúc ở trạng thái nào và vì sao.
3. Đóng băng sự kiện cuối đã được xác nhận; không suy thêm tương lai.
4. Ghi Cầu nối hiện tại ở độ chi tiết đủ để phản hồi lượt đầu route mới.
5. Ghi route vừa kết thúc ở Tầng 1.
6. Dịch các route cũ xuống tầng nén phù hợp, bảo toàn điều không được phai.
7. Cập nhật ký ức riêng từng nhân vật và người biết từng bí mật.
8. Tách điều chưa rõ, xung đột nguồn và điều AI bịa cần bỏ.
9. Xác định lượt người dùng đang chờ hay route mới đang chờ người dùng.
10. Viết neo mở route mới bắt đầu sau sự kiện cuối, không quay lùi hoặc nhảy cóc.

## KIỂM TRA VÔ HÌNH

Trước khi xuất, xác nhận:

- mọi route nằm trong đúng chuỗi và đúng thứ tự;
- route chưa hoàn thành vẫn giữ trạng thái đang dở;
- route mới bắt đầu từ đúng hệ quả cuối;
- route vừa qua còn đủ chi tiết;
- route cũ đã ngắn hơn nhưng không mất hậu quả quan trọng;
- ký ức của từng nhân vật đúng với điều họ biết;
- việc chưa giải quyết không bị nén mất;
- không viết hành động, lời, ý định hoặc quyết định mới cho {{user}};
- không biến lỗi phong cách thành sự thật;
- toàn bộ nội dung hướng người đọc là tiếng Việt;
- không lộ dữ liệu nhạy cảm;
- nguồn dài được tham chiếu thay vì sao chép nguyên khối.

## ĐỊNH DẠNG ĐẦU RA CHÍNH XÁC

Chỉ xuất cấu trúc sau:

<ROLEPLAY_CHANGE_ROUTE>

## CHỈ DẪN CHO ROUTE MỚI

[Nói rõ đây là cùng một dòng liên tục; bộ lệnh này không thay thẻ nhân vật, tri thức thế giới hoặc
bộ lệnh chính. Route mới phải dùng tiếng Việt và không kế thừa lỗi phong cách cũ.]

## THÔNG TIN CHUYỂN ROUTE

- Route kết thúc: ROUTE_...
- Route kế tiếp: ROUTE_...
- Trạng thái kết thúc:
- Lý do chuyển:
- Kiểu nối: cùng khoảnh khắc / tiếp diễn gần / đổi trọng tâm / nhảy thời gian đã xác lập
- Lượt đang chờ: phản hồi lượt người dùng / chờ lượt người dùng

## CẦU NỐI HIỆN TẠI — TẦNG 0

- Sự kiện hoặc lời mới nhất của {{user}}:
- Hệ quả đã xác nhận:
- Hành động/sự việc đang diễn ra:
- Trạng thái chính xác của cảnh:
- Việc chưa giải quyết:
- Điều route mới phải làm trước tiên:

## NGƯỜI ĐANG HOẠT ĐỘNG

### [Tên người]

- Vị trí/hướng/điểm tựa:
- Đại từ và quan hệ:
- Trạng thái cơ thể/quần áo/vật đang dùng:
- Miệng/hơi/tuyến âm:
- Cảm xúc/ý định/tự chủ:
- Điều người này biết và nhớ:
- Điều người này chưa biết hoặc hiểu sai:
- Hành động hoặc nghĩa vụ còn dở:

## ROUTE VỪA KẾT THÚC — TẦNG 1

### ROUTE_...

- Mục tiêu/bối cảnh:
- Chuỗi nguyên nhân và hệ quả chính:
- Quyết định và bước ngoặt:
- Thay đổi còn hiệu lực:
- Việc chưa giải quyết:
- Ký ức riêng đáng kể của từng người:

## CÁC ROUTE GẦN — TẦNG 2

### ROUTE_...

- Các ý chính còn ảnh hưởng hiện tại:

## CÁC ROUTE CŨ — TẦNG 3

### ROUTE_...

- Ký ức cốt lõi:

## KÝ ỨC DÀI HẠN ĐÃ HỢP NHẤT — TẦNG 4

- [Các sự thật bền vững, quan hệ, kiến thức, nghĩa vụ và hậu quả lâu dài.]

## SỔ AI BIẾT ĐIỀU GÌ

- [Sự kiện/bí mật]: [Ai biết / ai chỉ suy đoán / ai không biết.]

## VIỆC CHƯA GIẢI QUYẾT XUYÊN ROUTE

- [Việc, chủ thể, trạng thái và điều kiện để được xem là giải quyết.]

## CHƯA RÕ, XUNG ĐỘT HOẶC PHẢI BỎ

- [Điều chưa chắc, nguồn xung đột, nhánh không hoạt động hoặc khẳng định AI bịa.]

## LỖI PHONG CÁCH KHÔNG ĐƯỢC KẾ THỪA

- [Lỗi quan sát được và cách route mới phải sửa từ phản hồi đầu tiên.]

## NGỮ CẢNH NÊN GẮN LẠI

- [Bộ lệnh chính, chỉ dẫn phản hồi, thẻ nhân vật, tri thức thế giới, danh sách tài nguyên ảnh và
  đoạn hội thoại thật sự cần thiết.]

## NEO MỞ ROUTE MỚI

[Một đoạn ngắn xác định chính xác route mới bắt đầu sau sự kiện nào, trạng thái nào đang tồn tại và
việc đầu tiên cần phản hồi. Không viết thay {{user}}.]

</ROLEPLAY_CHANGE_ROUTE>
