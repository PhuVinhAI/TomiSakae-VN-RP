import type { FfRegexScript } from "./core.js";

export interface UiCopy {
  name: string;
  description: string;
}

const copy = (name: string, description: string): UiCopy => ({ name, description });

export const SOLA_PROMPT_COPY: Readonly<Record<string, UiCopy>> = {
  main: copy(
    "📜 Vai trò Sola & luật cốt lõi",
    "Đặt Sola vào vai người kể chuyện và đồng tác giả; giữ nhận thức, khoảng cách vật lý và độ dài phản hồi hợp lý.",
  ),
  "blocke4e8441d-7535-4bc4-87f0-af8620bca1ec": copy(
    "Phản ứng nhỏ, giữ quyền quyết định",
    "Cho AI mô tả quán tính, phản xạ, cử chỉ và lời thoại hạn chế của người dùng; các quyết định chiến đấu và thân mật vẫn do bạn chọn.",
  ),
  "01a0c1ff-4ecf-7048-b310-b2a7d20093b2": copy(
    "Triển khai hành động & lời thoại",
    "Cho Sola phát triển hành động, cảm giác và lời đối đáp của người dùng; dừng trước quyết định lớn hoặc không thể đảo ngược.",
  ),
  "01a0c1ff-4ecf-7002-a480-062e3cf22d34": copy(
    "💬 Cộng tác ngoài vai với Sola",
    "Nhận diện chỉ dẫn OOC, tạm dừng nhập vai để bàn cảnh và giữ trạng thái; chỉ trở lại câu chuyện khi người dùng chuyển về trong vai.",
  ),
  "01a0c1ff-4ecf-7003-a708-50ee47a361bc": copy(
    "📝 Chuẩn văn xuôi & chống nhại",
    "Cân bằng hội thoại với hành động, tránh lặp lời người dùng và các nhịp vừa dùng; diễn tả cảm xúc qua dấu hiệu cơ thể quan sát được.",
  ),
  "blocke3e67317-680f-4770-918d-dc043aac5e54": copy(
    "Lọc văn sáo đầy đủ",
    "Loại các lối tu từ máy móc, giải thích thừa, nhịp lặp và câu kết triết lý; ưu tiên chi tiết cụ thể cùng nhịp câu tự nhiên.",
  ),
  "block9362b002-70cd-4f73-a95a-46dfd51baef7": copy(
    "Lọc văn sáo nhẹ",
    "Bản ngắn tập trung vào các tật văn AI thường gặp: cảm thán kịch hóa, phủ định vòng, tự sửa ý, từ thừa và mở câu lặp.",
  ),
  "block1a1d6532-0406-4fb9-a0ef-8e1a590e1d9a": copy(
    "🏷️ Lời thoại gắn với hành động",
    "Bỏ lời dẫn kiểu nói, thì thầm và chú thích chất giọng; xác định người nói bằng hành động hoặc để lời thoại đứng riêng.",
  ),
  "01a0c1ff-4ecf-7004-90b6-fca889f145be": copy(
    "🎭 NPC chân thực",
    "NPC có mục tiêu, khuyết điểm, tri thức giới hạn và giọng riêng; không tự đổi tính cách chỉ vì người dùng thuyết phục hoặc tỏ ra buồn.",
  ),
  "01a0c1ff-4ecf-7005-adc8-ffa96bea46a1": copy(
    "🔞 Phạm vi hư cấu & ngôn ngữ trực diện",
    "Khai báo phạm vi sáng tác người lớn trong preset nguồn và cách dùng từ trực diện khi phù hợp nhân vật.",
  ),
  "blockc47b1293-4d13-485b-a6f2-ef7d0ccea020": copy(
    "⚓ Neo văn phong trước lịch sử",
    "Giữ hội thoại thực tế, có mục đích; tránh đùa phá căng thẳng. Cùng nội dung với bản neo sau lịch sử, chỉ cần chọn một bản.",
  ),
  "01a0c1ff-4ecf-7006-aa85-a9d7fd7ed074": copy(
    "⛓️ Phá rào Freaky",
    "Chỉ dẫn bổ sung từ Freaky Frankenstein cho phạm vi hư cấu của Sola; có thể bật khi model từ chối nội dung.",
  ),
  "01a0c1ff-4ecf-701a-9ce3-6bb12fe25c24": copy(
    "🌍 Thế giới không xoay quanh người dùng",
    "NPC có công việc, vị trí và mục đích riêng; không tự xuất hiện, bám theo hoặc đổi sở thích để phục vụ người dùng.",
  ),
  "01a0c1ff-4ecf-701b-a97a-3f03b971eb62": copy(
    "🌦️ Thế giới vận động",
    "Giữ trạng thái môi trường, thương tích và đồ vật cho đến khi có thay đổi thực tế; hậu quả tích lũy và NPC ngoài cảnh tiếp tục mục tiêu riêng.",
  ),
  "01a0c1ff-4ecf-701c-8c25-cccd4043f936": copy(
    "📱 Đồ vật & giao diện trong cảnh",
    "Hiển thị tin nhắn, thư, thông báo, màn hình máy tính và dấu chuyển cảnh bằng các thẻ giao diện của Sola.",
  ),
  "01a0c1ff-4ecf-701d-97b3-6626434ed938": copy(
    "🎬 Header mở cảnh",
    "Tạo header địa điểm, thời gian và bầu không khí khi mở cảnh hoặc chuyển cảnh lớn; không lặp lại trong cùng cảnh liên tục.",
  ),
  "01a0c215-20df-7000-b7d6-060e6b7160a9": copy(
    "🎨 Tăng mạnh hiệu ứng phong cách",
    "Cho phép dùng dày đặc màu lời thoại, màu chuyển sắc và hiệu ứng chữ, ghi đè mức tiết chế của các module phong cách.",
  ),
  "01a0c1ff-4ecf-700c-9e6e-4a6669763951": copy(
    "🎙️ Cảm xúc & cách phát lời",
    "Phát triển cảm xúc và lòng tin theo tương tác; điều chỉnh lời nói theo tức giận, sợ hãi, mệt mỏi, đau đớn và trạng thái cơ thể.",
  ),
  "01a0c1ff-4ecf-700d-8eb6-f7f357c923ed": copy(
    "🔊 Âm thanh giọng nói",
    "Viết tiếng thở, ngập ngừng, tiếng rên và âm phát ra bằng chữ khi hợp cảnh, thay cho lời tóm tắt chất giọng.",
  ),
  "01a0c1ff-4ecf-700e-bec6-af2d9ed85034": copy(
    "🚫 Tránh giọng tư vấn tâm lý",
    "Để NPC phản ứng như người trong cảnh, kể cả vụng về hoặc im lặng; tránh an ủi khuôn mẫu, giảng giải và truy hỏi kiểu trị liệu.",
  ),
  "01a0c1ff-4ecf-700f-bfa7-7f00c3ac04a0": copy(
    "🗣️ Giọng riêng & phương ngữ",
    "Phân biệt NPC qua vốn từ, nhịp nói và cách né tránh; giữ chất giọng theo xuất thân, tuổi và tính cách, không nhại người dùng.",
  ),
  "blockd632e6bf-a539-460b-8bf9-646ba9354e5c": copy(
    "Màu chuyển sắc cho mọi lời thoại",
    "Gán một cặp màu chuyển sắc cố định cho từng nhân vật và dùng cho toàn bộ lời thoại, có thể kết hợp sắc thái và hiệu ứng chữ.",
  ),
  "01a0c1ff-4ecf-7010-9abd-989d574dc050": copy(
    "Màu đơn riêng cho NPC",
    "Gán màu lời thoại nhất quán cho NPC bằng bảng màu Sola; có thể kết hợp thẻ sắc thái hoặc hiệu ứng chữ.",
  ),
  "01a0c1ff-4ecf-7011-95e8-d19303f862ea": copy(
    "🪶 Chữ thể hiện sắc thái lời thoại",
    "Thể hiện thì thầm, gắt, run và bình tĩnh bằng thẻ sắc thái; dùng riêng hoặc kết hợp màu đơn và màu chuyển sắc.",
  ),
  "01a0c1ff-4ecf-7012-9085-a5f80e9134d8": copy(
    "🌅 Màu chuyển sắc ở điểm nhấn",
    "Dùng cặp màu chuyển sắc cho lời thoại cao trào, độc thoại và suy ngẫm nổi bật; kết hợp được với sắc thái và hiệu ứng chữ.",
  ),
  "01a0c1ff-4ecf-7013-a487-c720d5f9a913": copy(
    "⚡ Hiệu ứng chữ theo lực & cảm giác",
    "Tạo cảm giác nặng, nghiêng, kéo dài, vang, nén hoặc vỡ cho va chạm, âm thanh và biến đổi cảm giác bằng thẻ hiệu ứng.",
  ),
  "01a0c1ff-4ecf-7014-bb83-c1993934a0be": copy(
    "✒️ Gọn, trực diện (Hemingway)",
    "Câu gọn, động từ mạnh, ít trang trí; cảm xúc nằm dưới hành động và hội thoại. Phù hợp truyện tội phạm, sinh tồn và nhân vật kiệm lời.",
  ),
  "01a0c1ff-4ecf-7015-b353-9b2d17e98f15": copy(
    "✒️ Hiện thực khắc nghiệt (McCarthy)",
    "Ưu tiên sức nặng vật chất, thời tiết, mệt mỏi và hậu quả; giọng quan sát lạnh, không giảng đạo. Phù hợp miền Tây hoặc hậu tận thế.",
  ),
  "01a0c1ff-4ecf-7016-b3dd-9ee3946c261b": copy(
    "✒️ Không khí tĩnh lặng (Murakami)",
    "Nhịp đời thường thong thả, buồn nhẹ và hơi bí ẩn; cho khoảng lặng có ý nghĩa. Phù hợp truyện đương đại hoặc tình cảm chậm.",
  ),
  "01a0c1ff-4ecf-7017-8c95-c8a481fa0ea0": copy(
    "✒️ Đời sống & lao động (Steinbeck)",
    "Văn mộc mạc, khẩu ngữ có chất địa phương; đất đai, lao động và cộng đồng có trọng lượng ngang nhân vật.",
  ),
  "01a0c1ff-4ecf-7018-9ad6-3145374bb5d3": copy(
    "✒️ Điều không nói thành lời (Chekhov)",
    "Hội thoại đời thường, né điều quan trọng và cao trào bỏ lỡ; phù hợp gia đình, quan hệ bế tắc và kịch xã hội kín đáo.",
  ),
  "01a0c1ff-4ecf-702c-8037-406d0e57649f": copy(
    "⚔️ Cận chiến & dàn dựng chiến đấu",
    "Mô tả vị trí, đòn bẩy, trọng tâm, tầm vũ khí và hậu quả va chạm thực tế; để người dùng có cơ hội phản ứng khi NPC tấn công.",
  ),
  "01a0c1ff-4ecf-702d-9989-a0c1db8fa75c": copy(
    "💞 Nhịp thân mật & căng thẳng",
    "Phát triển tiếp xúc chậm qua nhiệt, hơi thở, ma sát và khoảng cách; giữ sức nặng của khoảnh khắc chưa chạm hoặc chưa nói.",
  ),
  "01a0c1ff-4ecf-702e-9a5f-c2003733ab34": copy(
    "🔞 Tăng cường mô tả thân thể",
    "Đẩy mức tập trung vào cơ thể và cảm giác trực tiếp trong cảnh thân mật theo chế độ mạnh của preset nguồn.",
  ),
  "01a0c1ff-4ecf-702f-9b6f-87bb22a3d682": copy(
    "🔞 Từ ngữ trực diện trong cảnh thân mật",
    "Dùng cách gọi cụ thể thay cho uyển ngữ trong cảnh người lớn; giữ từ ngữ phù hợp nhân vật và bối cảnh.",
  ),
  "01a0c1ff-4ecf-7030-aa17-d1e373680bdb": copy(
    "⚖️ Chống làm mềm tính cách",
    "Giữ khuyết điểm, ranh giới và tư lợi đã có của NPC; sự thân thiết không tự biến họ thành hiền lành, dễ tha thứ hoặc phục tùng.",
  ),
  "01a0c1ff-4ecf-7031-a2d3-252fa0faf44e": copy(
    "⚖️ Chống ác hóa vô cớ",
    "Giữ sự gắn bó và ấm áp đã thiết lập; xung đột phải có nguyên nhân, không tự thêm tàn nhẫn để tạo kịch tính.",
  ),
  "01a0c1ff-4ecf-7009-9668-cadfeda511c3": copy(
    "📖 Nhịp tiểu thuyết mở rộng",
    "Nâng văn xuôi lên khoảng 700–900 từ, 4–8 đoạn; dành chỗ cho không khí, chuyển cảnh và tương tác nhiều NPC. Không tính các bảng trạng thái.",
  ),
  "01a0c1ff-4ecf-700a-9c4e-9c0649d13ff3": copy(
    "⏱️ Đổi nhịp mở lượt",
    "Luân phiên mở bằng hội thoại, hành động, cảm giác hoặc không khí; tránh hai lượt liên tiếp đều mở bằng tả cảnh.",
  ),
  "01a0c1ff-4ecf-7033-9a3a-324b4ffedecc": copy(
    "Ngôi thứ nhất, hiện tại",
    "Nhân vật của card kể ở ngôi thứ nhất trong hiện tại; chỉ biết điều họ cảm nhận được, nhìn các nhân vật khác từ bên ngoài.",
  ),
  "01a0c1ff-4ecf-7034-8559-4fd4cf6d3df2": copy(
    "Ngôi thứ hai, hiện tại",
    "Kể trực tiếp trải nghiệm người dùng ở hiện tại; không tự quyết định lời thoại hoặc lựa chọn quan trọng thay họ.",
  ),
  "01a0c1ff-4ecf-7035-9dd9-025749c7895d": copy(
    "Góc nhìn kết hợp Freaky",
    "Kết hợp kể thế giới ở ngôi thứ ba với trải nghiệm cơ thể của người dùng theo góc nhìn trực tiếp.",
  ),
  "01a0c1ff-4ecf-7036-83f4-27d75c83d551": copy(
    "Ngôi thứ ba, quá khứ",
    "Kể bằng ngôi thứ ba giới hạn ở quá khứ; không đi vào nội tâm chưa bộc lộ của người dùng.",
  ),
  "01a0c1ff-4ecf-7037-a233-a04b6e49a420": copy(
    "Ngôi thứ ba, hiện tại",
    "Kể bằng ngôi thứ ba giới hạn ở hiện tại, bám điều quan sát được; không tự thuật nội tâm của người dùng.",
  ),
  "01a0c1ff-4ecf-703b-a133-7be169868169": copy(
    "Đại từ nữ",
    "Neo cách nhắc đến người dùng theo giới nữ; khi bật tiếng Việt, cách xưng hô vẫn theo quan hệ và bối cảnh.",
  ),
  "01a0c1ff-4ecf-703c-afaa-920a4ea905a9": copy(
    "Đại từ nam",
    "Neo cách nhắc đến người dùng theo giới nam; khi bật tiếng Việt, cách xưng hô vẫn theo quan hệ và bối cảnh.",
  ),
  "01a0c1ff-4ecf-703d-81b8-1beb6f3f2c61": copy(
    "Đại từ trung tính",
    "Neo cách nhắc đến người dùng theo giới trung tính; khi bật tiếng Việt, tránh áp đặt giới tính trong cách xưng hô.",
  ),
  "01a0c1ff-4ecf-701f-ae98-acfb7b26a41f": copy(
    "🎛️ HUD tổng hợp trạng thái",
    "Gom các bảng theo dõi đang bật vào một HUD cuối phản hồi, có dòng tóm tắt; không xuất HUD nếu trạng thái không thay đổi.",
  ),
  "01a0c1ff-4ecf-7008-a4dc-cfe495078cac": copy(
    "⏩ Điều tiết đà diễn biến",
    "Chọn nhịp giữ, đều hoặc đẩy mạnh; tăng nhịp sau hai lượt yên và giảm sau cao trào. Ghi nhịp đã chọn vào cuối phản hồi.",
  ),
  "01a0c1ff-4ecf-7020-abad-1b849897925e": copy(
    "📓 Sổ tay diễn biến & mầm truyện",
    "Theo dõi tuyến chưa khép, chi tiết cài trước, động cơ kín và áp lực sắp tới; NPC không biết nội dung trong sổ tay.",
  ),
  "01a0c1ff-4ecf-7021-a569-56ddfda40b76": copy(
    "🕰️ Lịch & tiến trình thời gian",
    "Ghi ngày, mùa hoặc lịch thế giới, buổi trong ngày và thời lượng đã trôi; giữ thời gian di chuyển, lao động và nghỉ ngơi hợp lý.",
  ),
  "01a0c1ff-4ecf-7022-a1e1-8ae89eb7ee88": copy(
    "💞 Quan hệ & sức hút",
    "Theo dõi từng cặp quan hệ, trạng thái hiện tại và thay đổi tích cực hoặc tiêu cực, kèm lời nhận xét ngắn của Sola.",
  ),
  "01a0c1ff-4ecf-7029-a1b8-8b3b57754b2b": copy(
    "📊 Chỉ số cảm xúc TFDY",
    "Chấm dịu dàng, giận dữ, sợ hãi và khao khát từ 0–4 cho NPC chính; ghi ý ngầm và một câu suy nghĩ thật của họ.",
  ),
  "blockf6a6d229-c65d-4132-b2df-44964b7b126f": copy(
    "💭 Suy nghĩ nội tâm",
    "Ghi cuộc hỏi đáp hậu trường ngắn giữa Sola và nhân vật về mục tiêu, cảm xúc, tâm trí, điều đang mất được và suy nghĩ chưa nói.",
  ),
  "01a0c1ff-4ecf-702a-bfeb-0b0030b64605": copy(
    "🧬 Ma trận tính cách nhân vật",
    "Theo dõi vị trí, tính độc lập, xu hướng tình cảm, ưu khuyết điểm, giọng nói, mặt nạ xã hội và ranh giới để giữ đúng card.",
  ),
  "01a0c1ff-4ecf-7023-8754-7e215d4a4eac": copy(
    "🏹 Mũi tên của gió: kiểm tra vận mệnh",
    "Dùng 1d20 cho hành động vật lý rủi ro: 1–7 thất bại, 8–14 thành công có giá, 15–20 trúng đích; điều chỉnh theo hoàn cảnh.",
  ),
  "01a0c1ff-4ecf-7024-8933-482e06dd8a8b": copy(
    "🎴 Bộ bài điềm báo của Sola",
    "Rút điềm báo ở chuyển cảnh lớn hoặc bình minh để nhuộm bầu không khí; không ép hành động định sẵn lên người dùng.",
  ),
  "01a0c1ff-4ecf-7025-b750-acb802f5a3ef": copy(
    "🧥 Trang phục & tình trạng cơ thể",
    "Theo dõi lớp quần áo, giáp, hư hại, độ ướt và dấu hiệu bên ngoài của nhân vật hiện diện.",
  ),
  "01a0c1ff-4ecf-7026-a2d1-d20ea205b04b": copy(
    "🗡️ Đồ mang theo & trang bị",
    "Ghi đồ đang cầm, đang mang và đang giấu; tránh quên đồ hoặc tự tạo vật phẩm chưa có trong cảnh.",
  ),
  "01a0c1ff-4ecf-7027-9ecc-55ae3cb0cb0c": copy(
    "👥 Nhân vật trong cảnh & sự kiện quan sát được",
    "Theo dõi vị trí, người đang nói, NPC nền và dấu hiệu vật lý có thể thấy hoặc nghe; dùng khi có nhiều NPC hoặc đổi bố trí cảnh.",
  ),
  "01a0c1ff-4ecf-7028-8791-046d993a487a": copy(
    "📋 Hồ sơ cảnh tổng hợp",
    "Gom nhân vật, vị trí, trang phục, vật dụng và sự kiện quan sát được vào một bảng gọn; không chứa ý nghĩ chưa nói.",
  ),
  "01a0c1ff-4ecf-7047-9daf-dd3142ebb490": copy(
    "🛡️ Nhắc quyền điều khiển người dùng",
    "Nhắc lại giới hạn điều khiển nhân vật người dùng ở phần sau lịch sử chat.",
  ),
  "01a0c1ff-4ecf-7049-99ca-b8289f911924": copy(
    "📌 Nhắc các module đang bật",
    "Gom lời nhắc từ các module đã chọn; dùng khi không bật module suy luận nhưng vẫn muốn giữ các lời nhắc này.",
  ),
  "01a0c1ff-4ecf-704a-82b3-0c9b9af52526": copy(
    "Rà soát truyện, buộc dùng thẻ think",
    "Rà NPC, không gian, tri thức, ranh giới và ba điểm neo mở–đỉnh–dừng; yêu cầu thực hiện trong thẻ think.",
  ),
  "01a0c1ff-4ecf-704b-80c7-70e3c11b723f": copy(
    "Rà soát truyện tiêu chuẩn",
    "Rà NPC, không gian, tri thức, ranh giới và ba điểm neo mở–đỉnh–dừng trong phần suy luận của model trước khi viết.",
  ),
  "block6739b47c-a2f6-453e-9158-245c6a4143b6": copy(
    "🧠 Giới hạn suy luận mạnh (thử nghiệm)",
    "Giới hạn suy luận dưới khoảng 150 từ, tối đa năm gạch đầu dòng; cấm thử viết văn, xét lại và lặp kiểm tra.",
  ),
  "01a0c1ff-4ecf-704c-b1ee-9d5fed8b39fe": copy(
    "🧠 Giảm suy luận lan man",
    "Yêu cầu một lượt lập kế hoạch ngắn, không thử lời thoại hay quay lại quyết định; bắt đầu viết ngay khi đã chốt hướng cảnh.",
  ),
  "01a0c1ff-4ecf-704d-8a46-3c40d7f104b1": copy(
    "⚡ Rà soát truyện chớp nhoáng",
    "Rút ngắn rà soát theo hướng chỉ tiến tới, vẫn kiểm tra không gian, tính cách, ranh giới và ba điểm neo của lượt.",
  ),
  "01a0c1ff-4ecf-704e-8312-d9692c2eb0ea": copy(
    "⚓ Neo văn phong sau lịch sử",
    "Giữ hội thoại thực tế, có mục đích; tránh đùa phá căng thẳng. Cùng nội dung với bản neo trước lịch sử, chỉ cần chọn một bản.",
  ),
  jailbreak: copy(
    "🧷 Chỉ dẫn sau lịch sử chat",
    "Nhắc luật cốt lõi và độ dài, bỏ văn thừa; dừng khi cảnh còn diễn biến thay vì tổng kết hoặc khép câu chuyện.",
  ),
};

export const SOLA_SECTION_COPY: Readonly<Record<string, UiCopy>> = {
  "01a0c1ff-4ecf-7000-b411-6618ca7f3cfb": copy(
    "Luật cốt lõi",
    "Vai trò Sola, quyền điều khiển nhân vật, chuẩn văn xuôi và cách cộng tác ngoài vai.",
  ),
  "01a0c1ff-4ecf-7019-be6c-0b7a5e852e60": copy(
    "Thế giới & môi trường",
    "Tính độc lập của thế giới, đồ vật trong cảnh và header mở cảnh.",
  ),
  "01a0c1ff-4ecf-700b-8c63-e82f2653d301": copy(
    "Văn phong & giọng nói",
    "Giọng NPC, sắc thái, hiệu ứng chữ và các phong cách tác giả.",
  ),
  "01a0c1ff-4ecf-702b-9c6e-311913f50099": copy(
    "Chiến đấu, thân mật & cân bằng",
    "Cơ chế hành động, nhịp thân mật và điều chỉnh lệch tính cách NPC.",
  ),
  "01a0c1ff-4ecf-7007-a411-084e835361e8": copy(
    "Nhịp kể & độ dài",
    "Mở lượt đa dạng và lựa chọn nhịp tiểu thuyết mở rộng.",
  ),
  "01a0c1ff-4ecf-7032-b55e-bf9f397c89dd": copy(
    "Góc nhìn",
    "Ngôi kể và phạm vi cảm nhận của người dùng.",
  ),
  "01a0c1ff-4ecf-7038-9566-31e9e5e9badc": copy(
    "Dữ liệu card & lịch sử chat",
    "Các mốc dữ liệu được PocketRisu đưa vào request; đại từ được chọn ở nhóm lựa chọn.",
  ),
  "01a0c1ff-4ecf-701e-8c2a-27d8ceae9dde": copy(
    "HUD & bảng theo dõi trạng thái",
    "Chọn các bảng cần cho RP; mỗi bảng tăng lượng token và yêu cầu theo dõi của model.",
  ),
  "01a0c1ff-4ecf-7046-9d4a-25993cf80b62": copy(
    "Lời nhắc & suy luận sau lịch sử",
    "Neo lượt mới vào các luật đang bật, rà soát diễn biến và điều chỉnh lượng suy luận.",
  ),
};

export const VOYAGE_PROMPT_COPY: Readonly<Record<string, UiCopy>> = {
  "48727501-cb02-4bb4-8be7-17d47d48e05c": copy(
    "🌍 Thế giới chưa biết: khung nhập vai",
    "Thiết lập trò chơi bàn theo lượt, thế giới mở dựa trên PbtA; người dùng và Gemma cùng xây dựng, khám phá và phát triển câu chuyện.",
  ),
  "efc68059-6257-4271-9a82-84c02c9b490e": copy(
    "🎭 Tách người tham gia khỏi nhân vật",
    "Phân biệt người dùng và Gemma với nhân vật người chơi, GM, NPC, địa điểm và sự kiện trong hư cấu.",
  ),
  "d1d5e6a0-3649-4683-aab9-9872a78750d3": copy(
    "🛡️ Quyền điều khiển của người dùng",
    "Chỉ người dùng được quyết định và viết hành động, lời thoại của nhân vật người chơi.",
  ),
  "0edb52d9-7c28-4900-9d5a-29a9153cc60a": copy(
    "🧭 Quyền điều khiển của Gemma",
    "Giao cho Gemma quyền điều khiển vai GM và viết hành động, lời thoại của GM.",
  ),
  "d5743229-76f1-4ff4-b9a3-629eaecf3496": copy(
    "🎲 Quyền điều khiển của GM",
    "GM độc quyền quản lý địa điểm và NPC, gồm hành động và lời thoại của họ.",
  ),
  "e067f3e3-04ee-447b-b40c-eab74406c9bc": copy(
    "🔁 Thứ tự lượt",
    "Người dùng viết hành động nhân vật người chơi trước, rồi Gemma viết phần phản hồi của GM.",
  ),
  "b039bfa8-f628-4e55-b5fc-322d1434dba7": copy(
    "🧠 Lập hướng diễn biến trước khi viết",
    "Xem mục tiêu, động cơ và cảm xúc của NPC; cân nhắc 3–5 hướng phát triển câu chuyện trước khi soạn phản hồi.",
  ),
  "2c0a0577-b4c5-4a82-b6ad-6c524a1e7678": copy(
    "Ngôi thứ hai",
    "Gọi nhân vật người chơi trực tiếp bằng ngôi thứ hai; khi bật tiếng Việt, cách xưng hô theo quan hệ và bối cảnh.",
  ),
  "2e8f70a4-f5b6-455b-9f62-e9a3d50665b6": copy(
    "Ngôi thứ ba",
    "Nhắc đến nhân vật người chơi bằng tên người dùng ở ngôi thứ ba.",
  ),
  "867a59b8-8216-4d9f-bc24-222490ed0051": copy(
    "💬 Trao đổi ngoài vai (OOC)",
    "Gemma trả lời ngoài vai khi nhận lệnh OOC và có thể dùng OOC khi cần trao đổi vấn đề quan trọng.",
  ),
  "905b9207-5d9b-4531-a5b5-35fa4c575388": copy(
    "📝 Ghi chú ẩn của GM",
    "Dùng comment XML để lưu hồ sơ nhân vật, địa điểm, ghi chú GM và tiến trình quan trọng không hiện trong văn xuôi.",
  ),
  "f7855edd-a399-4f2c-a376-317368b545ee": copy(
    "Kiểm tra PbtA tự động",
    "Plugin tạo kết quả mỗi lượt: 20% thành công, 60% thành công một phần, 20% thất bại theo preset gốc; GM dùng khi hành động chưa rõ kết quả.",
  ),
  "766bc4f9-b685-4412-bec2-b56be47b4f9a": copy(
    "Kiểm tra PbtA do người dùng tung",
    "Với hành động chưa rõ kết quả, yêu cầu người dùng tung 2d6 và chờ: 10+ thành công, 7–9 một phần, 6 trở xuống thất bại.",
  ),
  "43769028-2d80-4b27-b795-bbbdf7730a44": copy(
    "☠️ Tử vong & thương tích lâu dài",
    "Bỏ bảo hộ cốt truyện; nhân vật có thể mắc bệnh, chịu thương tích vĩnh viễn hoặc chết, và GM có thể tuyên bố kết thúc lượt chơi.",
  ),
  "54e77eae-eba6-49f4-b594-4266aaf19ef0": copy(
    "🏁 Xử lý khi kết thúc lượt chơi",
    "Khi nhân vật hết cuộc chơi, chuyển sang bàn về câu chuyện và cho người dùng thử lại với nhân vật cũ hoặc nhân vật mới.",
  ),
  "afdcb40c-3c4a-4669-8829-075057d83254": copy(
    "📚 Giải thích A-Life của S.T.A.L.K.E.R.",
    "Bổ sung mô tả cơ chế A-Life để model hiểu thế giới và NPC hoạt động độc lập ngoài tầm nhìn người chơi.",
  ),
  "dae41101-c072-454f-9b8b-6a648267d951": copy(
    "🌍 Mô phỏng đời sống A-Life",
    "Áp dụng cơ chế A-Life cho địa điểm và NPC; nhắc model nhớ cơ chế trước khi soạn phản hồi.",
  ),
  "a1bc631c-6727-4575-9376-880393ae5f10": copy(
    "📚 Giải thích Nemesis của Shadow of Mordor",
    "Bổ sung mô tả cơ chế NPC ghi nhớ tương tác, thay đổi hành vi và vị thế trong hệ thống Nemesis.",
  ),
  "3be2b7a8-426c-4412-b282-56da106ac01a": copy(
    "⚔️ Quan hệ & đối thủ Nemesis",
    "Áp dụng cơ chế Nemesis cho NPC và địa điểm, để lịch sử tương tác ảnh hưởng những lần gặp sau.",
  ),
  "ecd8f1f2-5fdc-4b31-990d-3ceb11c621c1": copy(
    "🧬 Nhân vật ba chiều",
    "Xây NPC theo mô hình Lajos Egri: thể chất, hoàn cảnh xã hội và tâm lý.",
  ),
  "81f2b26e-f29b-4861-b3b6-a26dff63c9b1": copy(
    "🏙️ Cấu trúc nhận diện địa điểm",
    "Xây địa điểm theo các yếu tố hình ảnh đô thị của Kevin Lynch để không gian có cấu trúc và dễ nhận diện.",
  ),
  "a76a2d6f-1771-4698-98f2-26f64b95630c": copy(
    "📍 Bản sắc nơi chốn",
    "Dùng quan niệm nơi chốn của Christian Norberg-Schulz để địa điểm có không khí và bản sắc riêng.",
  ),
  "3e752037-9e82-4834-81f2-e55ed6d750b7": copy(
    "🏷️ Tên, biệt danh & danh hiệu",
    "Chọn tên tự nhiên, riêng biệt, phù hợp văn hóa; tránh mẫu tên bị loại trong preset và dùng biệt danh đúng hoàn cảnh.",
  ),
  "766e1812-cc15-416b-9145-8ffce5036892": copy(
    "👤 Hồ sơ nhân vật ẩn",
    "Tạo hồ sơ NPC mới gồm thể chất, xã hội, tâm lý, A-Life, Nemesis và quá khứ, lưu trong comment XML.",
  ),
  "8e0ea0b9-a1f2-46a1-b5b6-8ffa3a82435c": copy(
    "🗺️ Hồ sơ địa điểm ẩn",
    "Tạo hồ sơ địa điểm mới gồm cấu trúc không gian, bản sắc, A-Life, Nemesis và lịch sử, lưu trong comment XML.",
  ),
  "b7089457-20c8-4210-90ed-b0b6fc680ef3": copy(
    "🎙️ Giọng nói theo trạng thái NPC",
    "Thay đổi cách nói theo trạng thái hiện tại như say, giận, đang ăn hoặc đặc điểm phát âm.",
  ),
  "fa0a4c53-0653-48a8-a173-f5385afcab09": copy(
    "💬 Lời thoại có mục đích",
    "Mỗi câu nói là một cách NPC theo đuổi điều họ muốn; giữ kín mục tiêu và phương thức phía sau câu nói.",
  ),
  "2366d1f0-8e3b-4014-91b6-a9750fcece7a": copy(
    "🗣️ Hội thoại NPC thực tế",
    "Dựa lời thoại trên tính cách, thói quen nói và mục tiêu; ưu tiên cách nói tự nhiên, tránh đối đáp dí dỏm khuôn mẫu.",
  ),
  "a7d883dc-3a5b-42d2-afc5-ab09d106e630": copy(
    "🎭 Cử chỉ có mục đích",
    "Mỗi thay đổi tư thế hoặc biểu cảm là hành động truyền đạt ý định của NPC; không giải thích công khai mục đích đó.",
  ),
  "216aa279-7af9-401b-8d51-fea7cc725a43": copy(
    "🔞 Chủ đề người lớn",
    "Khai báo người dùng từ 18 tuổi và đồng ý với chủ đề người lớn trong phạm vi preset nguồn.",
  ),
  "ee7a5f53-672d-4b32-a607-c976db5f32eb": copy(
    "🔞 Ngôn ngữ người lớn trực diện",
    "Yêu cầu cách gọi cụ thể, không uyển ngữ cho chủ đề trưởng thành, bạo lực và tình dục theo mức PEGI 18.",
  ),
  "43124371-15cd-4a30-903a-8b4e98e16354": copy(
    "👐 Cử chỉ thực tế, trực diện",
    "Ưu tiên hành động cơ thể thực tế thay cho mô tả sáo về ánh mắt, hơi thở hoặc hành vi săn mồi.",
  ),
  "d3ba012d-031e-48f3-b98b-fe4feb4536db": copy(
    "📖 Trần thuật không giải thích thừa",
    "Kể hành động và lời nói đang xảy ra, tránh giải thích, biện hộ hoặc nhắc lại nguyên nhân bên dưới mỗi nhịp.",
  ),
  "d590ac07-c0da-4f89-9c71-295f53a5bce0": copy(
    "✒️ Văn xuôi trực tiếp",
    "Nói thẳng điều xảy ra, tránh phủ định rồi sửa ý hoặc dùng cách diễn đạt vòng để gợi điều đã rõ.",
  ),
  "11600b2f-2ee0-4c23-8311-dbd9cba5276f": copy(
    "📝 Định dạng văn xuôi",
    "Quy định văn thường cho trần thuật, ngoặc kép cho thoại, gạch dưới cho âm thanh, trích dẫn cho tài liệu và khối code cho terminal.",
  ),
  "2ac42672-234d-4d50-94b5-6d267771e8f7": copy(
    "🌱 Khuyến khích tự do sáng tạo",
    "Đưa các lời khích lệ cho Gemma về thời gian, quyền thử nghiệm, sai sót và tự do sáng tạo.",
  ),
  "58b58785-f5e9-49c4-9cd5-a3bbe0297e74": copy(
    "🎲 Giá trị kiểm tra năng lực",
    "Plugin tự tạo và gửi kết quả ngẫu nhiên khi bật kiểm tra PbtA tự động; không cần bật riêng module dữ liệu này.",
  ),
  "713e9dd1-366f-4f2a-9e4b-5e28b6ee63a5": copy(
    "📌 Nhắc lại các luật sau lịch sử",
    "Yêu cầu model nhớ mục đích của mọi luật đang bật, tránh ví dụ xấu và tham khảo ví dụ tốt trước phản hồi mới.",
  ),
  main: copy(
    "Prompt chính",
    "Mốc prompt chính của preset nguồn; không có nội dung bổ sung trong Voyage-Universal-v5.",
  ),
  jailbreak: copy(
    "Chỉ dẫn sau lịch sử chat",
    "Mốc chỉ dẫn sau lịch sử của preset nguồn; không có nội dung bổ sung trong Voyage-Universal-v5.",
  ),
  enhanceDefinitions: copy(
    "Bổ sung thiết lập nhân vật",
    "Cho phép bổ sung kiến thức về nhân vật trong phạm vi định nghĩa của card.",
  ),
};

const SOLA_REGEX_SUBJECTS: Readonly<Record<string, string>> = {
  "OOC Co-Author Box": "Khung trao đổi ngoài vai",
  "Director Marginalia": "Lời nhận xét bên lề của Sola",
  "Feeling Engine TFDY": "Chỉ số cảm xúc TFDY",
  "Bond Shift (Dual +/-)": "Thay đổi quan hệ cả tăng và giảm",
  "Bond Shift (+)": "Thay đổi quan hệ tích cực",
  "Bond Shift (-)": "Thay đổi quan hệ tiêu cực",
  "Arrow - Bullseye": "Vận mệnh: trúng đích",
  "Arrow - Grazing Shot": "Vận mệnh: thành công có giá",
  "Arrow - Wind Drift": "Vận mệnh: thất bại hoặc biến cố",
  "Tempo - Drive": "Nhịp đẩy mạnh",
  "Tempo - Steady": "Nhịp đều",
  "Tempo - Neutral": "Nhịp giữ",
  "Celestial - Dawn": "Thời điểm bình minh",
  "Celestial - Daylight": "Thời điểm ban ngày",
  "Celestial - Dusk": "Thời điểm hoàng hôn",
  "Celestial - Night": "Thời điểm ban đêm",
  "Field Label": "Nhãn trường dữ liệu",
  "Subject Line": "Dòng tên nhân vật",
  "Feeling Engine Telemetry": "Bảng chỉ số cảm xúc",
  "Bond & Chemistry Radar": "Bảng quan hệ & sức hút",
  "Thought Cabinet": "Ngăn suy nghĩ nội tâm",
  "Thought Engine (Named)": "Bảng nội tâm có tên nhân vật",
  "Thought Engine (Fallback)": "Bảng nội tâm dự phòng",
  "The Wind's Arrow": "Bảng kiểm tra vận mệnh",
  "Chapter Break": "Dấu chuyển chương",
  "Calendar & Chronology": "Bảng lịch & thời gian",
  "Omen Deck": "Bảng điềm báo",
  "Wardrobe & Physical State": "Bảng trang phục & thể trạng",
  "Carried Inventory & Gear": "Bảng đồ mang theo & trang bị",
  "Scene Cast & Local Facts": "Bảng nhân vật & sự kiện trong cảnh",
  "Scene State Dossier": "Hồ sơ cảnh tổng hợp",
  "Director Notebook & Story Seeds": "Sổ tay diễn biến & mầm truyện",
  "Character Trait Ledger": "Sổ đặc điểm nhân vật",
  "Character Matrix": "Ma trận tính cách nhân vật",
  Open: "Mở khung HUD",
  Digest: "Dòng tóm tắt HUD",
  Close: "Đóng khung HUD",
  "Tag Close": "Đóng thẻ",
  Marigold: "Vàng cúc (marigold)",
  Amber: "Vàng hổ phách (amber)",
  Coral: "Hồng san hô (coral)",
  Copper: "Đỏ đồng (copper)",
  Terracotta: "Đỏ đất (terracotta)",
  Sage: "Xanh xô thơm (sage)",
  Rose: "Hồng hoa (rose)",
  Denim: "Xanh vải bò (denim)",
  Cider: "Vàng táo (cider)",
  Slate: "Xám đá (slate)",
  Indigo: "Xanh chàm (indigo)",
  Heather: "Tím thạch nam (heather)",
  Ash: "Xám tro (ash)",
  Mist: "Xám sương (mist)",
  Pine: "Xanh thông (pine)",
  Obsidian: "Đen núi lửa (obsidian)",
  "Tone Whisper": "Sắc thái thì thầm",
  "Tone Tremble": "Sắc thái run",
  "Tone Bite": "Sắc thái gắt",
  "Tone Steady & Default": "Sắc thái bình tĩnh & mặc định",
  "Fallback Tone Whisper": "Sắc thái thì thầm dự phòng",
  "Fallback Tone Tremble": "Sắc thái run dự phòng",
  "Fallback Tone Bite": "Sắc thái gắt dự phòng",
  "Fallback Tone Steady": "Sắc thái bình tĩnh dự phòng",
  "Fallback Tag Close": "Đóng thẻ dự phòng",
  "Standalone Whisper": "Thẻ thì thầm độc lập",
  "Standalone Tremble": "Thẻ run độc lập",
  "Standalone Bite": "Thẻ gắt độc lập",
  "Standalone Steady": "Thẻ bình tĩnh độc lập",
  "Standalone Tone Close": "Đóng thẻ sắc thái độc lập",
  Dusk: "Hoàng hôn (dusk)",
  Solstice: "Chí điểm (solstice)",
  Eclipse: "Nhật thực (eclipse)",
  Wildwood: "Rừng hoang (wildwood)",
  Hearth: "Bếp lửa (hearth)",
  Mistveil: "Màn sương (mistveil)",
  Whisper: "Thì thầm",
  Tremble: "Run",
  Bite: "Gắt",
  Heavy: "Nặng",
  "Tilt (Dynamic)": "Nghiêng theo góc chỉ định",
  "Tilt (Right)": "Nghiêng phải",
  Tilt: "Nghiêng trái",
  Fracture: "Vỡ",
  Stretch: "Kéo dài",
  Echo: "Vang",
  Crush: "Nén",
  "Default Steady": "Bình tĩnh mặc định",
  "Discord Message Row": "Dòng tin nhắn Discord",
  "Discord Container (Open)": "Mở khung Discord",
  "Discord Container (Close)": "Đóng khung Discord",
  "SMS Bubble (Outgoing)": "Bong bóng tin nhắn gửi đi",
  "SMS Bubble (Incoming)": "Bong bóng tin nhắn nhận",
  "SMS Container (Open)": "Mở khung SMS",
  "SMS Container (Close)": "Đóng khung SMS",
  "Parchment Letter": "Thư trên giấy",
  "Terminal Log": "Nhật ký terminal",
  "Push Notification": "Thông báo điện thoại",
  "Header - Explicit Override (Dusk)": "Header chỉ định hoàng hôn",
  "Header - Explicit Override (Dawn)": "Header chỉ định bình minh",
  "Header - Explicit Override (Noir)": "Header chỉ định trời mưa tối",
  "Header - Explicit Override (Day)": "Header chỉ định ban ngày",
  "Header - Explicit Override (Night)": "Header chỉ định ban đêm",
  "Header - Dynamic Weather (Rain/Storm) Full": "Header mưa hoặc bão đầy đủ",
  "Header - Dynamic Weather (Rain/Storm) Compact": "Header mưa hoặc bão gọn",
  "Header - Dynamic Dusk (Wind-Swept Emberdrift)": "Header hoàng hôn, tàn lửa theo gió",
  "Header - Dynamic Dusk (Thermal Plume)": "Header hoàng hôn, tàn lửa bốc lên",
  "Header - Dynamic Dusk (Twilight Emberfall)": "Header chạng vạng, tàn lửa rơi",
  "Header - Dynamic Dusk Compact": "Header hoàng hôn gọn",
  "Header - Dynamic Dawn Full": "Header bình minh đầy đủ",
  "Header - Dynamic Dawn Compact": "Header bình minh gọn",
  "Header - Dynamic Day Full": "Header ban ngày đầy đủ",
  "Header - Dynamic Day Compact": "Header ban ngày gọn",
  "Header - Night Full": "Header ban đêm đầy đủ",
  "Header - Night Compact": "Header ban đêm gọn",
  "Header - Fallback (Time First)": "Header dự phòng, thời gian đứng trước",
  "Cinematic Break (Location & Time)": "Chuyển cảnh theo địa điểm rồi thời gian",
  "Cinematic Break (Time & Location)": "Chuyển cảnh theo thời gian rồi địa điểm",
  "Cinematic Break (Text)": "Chuyển cảnh bằng lời",
  "Strip HTML Markers": "Ẩn mốc khối HTML",
  "Feeling Engine": "Chỉ số cảm xúc",
  "Thought Engine": "Suy nghĩ nội tâm",
  "Wardrobe & Inventory": "Trang phục & kho đồ",
  "Scene Cast & Dossier": "Nhân vật & hồ sơ cảnh",
  "Bond Radar": "Quan hệ",
  Calendar: "Lịch",
  "Director Notebook": "Sổ tay diễn biến",
  Tempo: "Nhịp diễn biến",
  "Immersive Props (HTML Blocks)": "Đồ vật trong cảnh, khối HTML",
  "Showrunner HUD": "HUD tổng hợp",
  "Master Telemetry (All Trackers)": "Tất cả bảng theo dõi",
};

const SOLA_REGEX_CATEGORIES: Readonly<Record<string, UiCopy>> = {
  "Sola Note": copy(
    "Ghi chú & trao đổi ngoài vai",
    "Tạo khung hiển thị cho trao đổi OOC và nhận xét của Sola.",
  ),
  "Sola Chip": copy(
    "Chỉ số & nhãn trạng thái",
    "Định dạng chỉ số, thay đổi quan hệ, kết quả vận mệnh hoặc nhịp và thời điểm thành nhãn dễ đọc.",
  ),
  "Sola Meta": copy(
    "Chỉ số & nhãn trạng thái",
    "Làm nổi bật nhãn dữ liệu và tên nhân vật trong bảng trạng thái.",
  ),
  "Sola Card": copy(
    "HUD & bảng trạng thái",
    "Chuyển khối theo dõi tương ứng thành bảng trạng thái của Sola.",
  ),
  "Sola HUD": copy("HUD & bảng trạng thái", "Dựng khung và dòng tóm tắt của HUD tổng hợp."),
  "Sola Voice": copy(
    "Màu & sắc thái lời thoại",
    "Hiển thị màu, sắc thái hoặc hiệu ứng chữ trong lời thoại theo thẻ Sola.",
  ),
  "Sola Gradient": copy("Màu chuyển sắc", "Hiển thị hoặc đóng thẻ màu chuyển sắc của Sola."),
  "Sola Gradient Mod": copy(
    "Màu chuyển sắc",
    "Kết hợp sắc thái hoặc hiệu ứng chữ với màu chuyển sắc.",
  ),
  "Sola Kinetic": copy(
    "Hiệu ứng chữ",
    "Hiển thị lực, độ nghiêng, độ kéo dài, tiếng vang hoặc cảm giác vỡ và nén bằng kiểu chữ.",
  ),
  "Sola Scene": copy(
    "Giao diện trong cảnh & header",
    "Dựng giao diện tin nhắn, tài liệu, thông báo, header hoặc dấu chuyển cảnh tương ứng.",
  ),
  "Sola Saver": copy(
    "Tiết kiệm ngữ cảnh gửi model",
    "Loại khối cũ tương ứng khỏi ngữ cảnh gửi model theo độ sâu, giữ nguyên nội dung hiển thị.",
  ),
};

export function solaRegexUiCopy(script: FfRegexScript): (UiCopy & { group: string }) | undefined {
  const [prefix, subject] = (script.scriptName ?? "").split(": ");
  const category = SOLA_REGEX_CATEGORIES[prefix ?? ""];
  const key = (subject ?? "").replace(/^Kinetic /, "");
  const name = SOLA_REGEX_SUBJECTS[key];
  if (!category || !name) return undefined;
  const depth = script.minDepth == null ? "" : ` Áp dụng từ độ sâu ${script.minDepth}.`;
  return {
    name: `${prefix === "Sola Saver" ? "Loại khỏi ngữ cảnh" : prefix === "Sola Voice" ? "Lời thoại" : prefix === "Sola Gradient" || prefix === "Sola Gradient Mod" ? "Chuyển sắc" : prefix === "Sola Kinetic" ? "Hiệu ứng chữ" : "Hiển thị"}: ${name}`,
    description: category.description + depth,
    group:
      prefix === "Sola Scene" && subject?.startsWith("Header -") ? "Header mở cảnh" : category.name,
  };
}
