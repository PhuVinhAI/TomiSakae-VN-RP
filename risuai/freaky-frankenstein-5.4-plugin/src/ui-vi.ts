import type { FfGlobalSettings, FfOrderEntry, FfPrompt, FfRegexScript } from "./core.js";

export interface ExclusivePromptGroup {
  id: string;
  label: string;
  description: string;
  memberIds: readonly string[];
  offLabel: string;
  offDescription: string;
}

export interface PromptSection {
  id: string;
  label: string;
  description: string;
  promptIds: readonly string[];
  open: boolean;
}

interface UiCopy {
  name: string;
  description: string;
}

export const SOURCE_SEPARATOR_IDS = new Set([
  "019f62e8-892f-7003-9af1-422c676672ae",
  "019f62e8-892f-7006-9eac-e4939663e934",
  "019f62e8-892f-700b-8e2a-cc0ab77ec55d",
  "019f62e8-892f-700e-b3e9-f50931297b58",
  "019f62e8-892f-7011-980c-f01846f6c97f",
  "d704565e-6357-41ab-ba0c-a4f11514dcc9",
  "019f62e8-892f-701f-8580-cf218b8e6be5",
  "019f62e8-892f-7031-a8d8-aa94d06644a2",
]);

export const HOST_MARKER_IDS = new Set([
  "worldInfoBefore",
  "personaDescription",
  "charDescription",
  "charPersonality",
  "scenario",
  "worldInfoAfter",
  "dialogueExamples",
  "chatHistory",
]);

export const EXCLUSIVE_PROMPT_GROUPS: readonly ExclusivePromptGroup[] = [
  {
    id: "prose",
    label: "Phong cách văn xuôi",
    description: "Chọn một phong cách viết chính cho phần trần thuật.",
    memberIds: ["d7bfe956-b315-4049-845d-ad4a6f9bfd28", "019f62e8-892f-7005-a3b1-4b59aaebebcd"],
    offLabel: "Không dùng phong cách bổ sung",
    offDescription: "Để mô hình tự quyết định phong cách văn xuôi.",
  },
  {
    id: "pov",
    label: "Góc nhìn",
    description: "Chọn đúng một cách kể chuyện và xưng hô với người dùng.",
    memberIds: [
      "019f62e8-892f-7007-bb78-86fc2ab61efe",
      "019f62e8-892f-7008-bbb9-b6ebf9cdc0f5",
      "019f62e8-892f-7009-a5c5-9a06eb0b6640",
      "019f62e8-892f-700a-8e10-84695d624918",
    ],
    offLabel: "Không khóa góc nhìn",
    offDescription: "Không chèn module POV chuyên biệt.",
  },
  {
    id: "adult",
    label: "Chế độ nội dung người lớn",
    description: "Chọn một chế độ NSFW; hai chế độ không chạy đồng thời.",
    memberIds: ["019f62e8-892f-700c-9795-53ecb3381d7d", "019f62e8-892f-700d-b070-4add983aeae1"],
    offLabel: "Tắt chế độ người lớn",
    offDescription: "Không chèn Chế độ Hiện thực hoặc Chế độ Freaky.",
  },
  {
    id: "user-action",
    label: "Xử lý hành động người dùng",
    description: "Chọn chống lặp hoặc cho phép AI triển khai thêm hành động của người dùng.",
    memberIds: ["019f62e8-892f-700f-93e0-640159f4d52a", "019f62e8-892f-7010-bf59-e7b17fd4476f"],
    offLabel: "Không dùng cả hai",
    offDescription: "Không chèn luật anti-echo hoặc embellish.",
  },
  {
    id: "dialogue-color",
    label: "Màu lời thoại",
    description: "Chọn tối đa một định dạng màu để tránh chồng thẻ.",
    memberIds: ["019f62e8-892f-7019-be65-715a4949cba0", "2105050a-0d4b-4661-9363-3cc1ac44d5e7"],
    offLabel: "Không tô màu lời thoại",
    offDescription: "Phù hợp khi giao diện đã tự tô màu hoặc mô hình xử lý thẻ không ổn định.",
  },
  {
    id: "reasoning",
    label: "Kiểu suy luận",
    description: "Chọn đúng một mức suy luận của FF5.4.",
    memberIds: [
      "019f62e8-892f-7032-b004-1869f8bc0782",
      "634ecfec-1862-4ce0-821e-e31057acadfa",
      "b5db9430-857a-408c-817c-32e975a71430",
    ],
    offLabel: "Suy luận tự nhiên của mô hình",
    offDescription: "Tắt cả ba kiểu suy luận để ưu tiên tốc độ, tự do và sáng tạo của mô hình.",
  },
];

export const PROMPT_SECTIONS: readonly PromptSection[] = [
  {
    id: "core",
    label: "Luật cốt lõi",
    description: "Các module dùng thường xuyên trong mọi lượt nhập vai.",
    promptIds: [
      "main",
      "019f62e8-892f-7002-8fcf-eea637bd577b",
      "079ce45e-d344-4e75-a5a5-be6ae3037c91",
      "019f62e8-892f-7012-98b4-8de29f11aa1d",
      "019f62e8-892f-7017-ae2e-44fbc7d29de7",
      "019f62e8-892f-7015-9be8-a0015ebd2c1d",
      "019f62e8-892f-7016-a021-aa24f58271d6",
      "019f62e8-892f-7014-9d71-8bedfe4ac3ef",
      "019f62e8-892f-7013-9e9b-13eae330f5a0",
      "jailbreak",
    ],
    open: true,
  },
  {
    id: "features",
    label: "Tính năng bổ sung",
    description: "Đồ họa, chiến đấu, âm thanh, phá rào và tạo NPC.",
    promptIds: [
      "019f62e8-892f-701a-afd5-49222c79fdb6",
      "019f62e8-892f-701b-bab1-563021fd8b14",
      "019f62e8-892f-701c-8550-08ebf33e9da2",
      "019f62e8-892f-701d-8f83-6d62af427132",
      "019f62e8-892f-701e-ba47-40b8c3ddd5e8",
      "019f62e8-892f-7028-bad6-be1f427c3ae4",
    ],
    open: false,
  },
  {
    id: "internal",
    label: "Trạng thái nội bộ",
    description:
      "Chỉ bật các trạng thái phù hợp với RP; mỗi module làm tăng ngữ cảnh, token và tải xử lý. Module Trạng thái nội bộ chính phải bật để hiển thị đầy đủ.",
    promptIds: [
      "019f62e8-892f-7027-93ef-159f3d55c410",
      "019f62e8-892f-7021-97a6-42e1b83eaad3",
      "019f67b4-7381-7000-bcc4-496b2e6ed920",
      "019f67ad-c0b1-7000-aca4-0e2480fa02db",
      "019f62e8-892f-7022-9eb9-e00c2944ebc6",
      "019f62e8-892f-7023-825d-9351eca0347f",
      "019f62e8-892f-7024-a40f-b906fceb58d2",
      "019f62e8-892f-7025-be65-8859e7730ee0",
      "019f62e8-892f-7026-92ea-34ff510c244b",
    ],
    open: true,
  },
];

const PROMPT_COPY: Readonly<Record<string, UiCopy>> = {
  main: {
    name: "⚡ Prompt chính",
    description: "Khung mô phỏng, vật lý, nhận thức và vai trò GM cốt lõi của FF5.4.",
  },
  "019f62e8-892f-7002-8fcf-eea637bd577b": {
    name: "⏰ Thời gian & địa điểm",
    description:
      "Neo cảnh bằng ngày, giờ, địa điểm và thời tiết. Module này tác động tới toàn bộ RP.",
  },
  "d7bfe956-b315-4049-845d-ad4a6f9bfd28": {
    name: "📖 Chế độ truyện",
    description:
      "Yêu cầu AI viết như tác giả tiểu thuyết, tăng cảm xúc, kịch tính và nét sáng tạo. Nếu muốn ít văn hoa và khách quan hơn, hãy chọn Hiện thực điện ảnh.",
  },
  "019f62e8-892f-7005-a3b1-4b59aaebebcd": {
    name: "🎬 Hiện thực điện ảnh",
    description:
      "Khóa văn phong hiện thực thô ráp theo hướng “thể hiện thay vì kể”. Đây là lựa chọn phổ biến và mặc định; chọn Chế độ truyện nếu muốn chất tiểu thuyết giàu cảm xúc hơn.",
  },
  "019f62e8-892f-7007-bb78-86fc2ab61efe": {
    name: "👀 Ngôi thứ ba",
    description: "Kể nhân vật và thế giới bằng ngôi thứ ba.",
  },
  "019f62e8-892f-7008-bbb9-b6ebf9cdc0f5": {
    name: "👀 Ngôi thứ hai",
    description: "Kể trực tiếp trải nghiệm của người dùng bằng ngôi thứ hai.",
  },
  "019f62e8-892f-7009-a5c5-9a06eb0b6640": {
    name: "👀 Ngôi thứ nhất",
    description: "Kể trải nghiệm của người dùng bằng ngôi thứ nhất.",
  },
  "019f62e8-892f-700a-8e10-84695d624918": {
    name: "👀 Góc nhìn kết hợp",
    description:
      "Kể thế giới bằng ngôi thứ ba, nhưng mô tả cảm giác của người dùng từ góc nhìn của họ để tăng nhập vai. Đây là lựa chọn ưa thích của tác giả preset.",
  },
  "019f62e8-892f-700c-9795-53ecb3381d7d": {
    name: "🔞 Chế độ Hiện thực",
    description:
      "Bật mục này đồng nghĩa bạn chấp nhận đầu ra của mình; tác giả preset không chịu trách nhiệm. Đây là cơ chế phá rào nhẹ, hiệu quả, quy định cách viết cảnh bạo lực và tình dục NSFW; chỉ hoạt động khi cảnh chuyển sang NSFW.",
  },
  "019f62e8-892f-700d-b070-4add983aeae1": {
    name: "🔞 Chế độ Freaky",
    description:
      "Bật mục này đồng nghĩa bạn chấp nhận đầu ra của mình; tác giả preset không chịu trách nhiệm. Chế độ này luôn hoạt động và đưa chi tiết NSFW vào mọi cảnh. Tác giả không khuyên dùng với Gemini, Grok hoặc Muse vì mức độ quá mạnh; mặc định phù hợp với GLM, Opus, K3, Minimax 3 và Qwen 3.7 Max.",
  },
  "019f62e8-892f-700f-93e0-640159f4d52a": {
    name: "🦜 Chống nhại & chống lặp",
    description:
      "Ngăn AI lặp lại hành động của người dùng trong cảnh và ngăn AI tự hành động thay người dùng. Nếu muốn AI triển khai thêm hành động của bạn, hãy chọn Chế độ triển khai.",
  },
  "019f62e8-892f-7010-bf59-e7b17fd4476f": {
    name: "🧂 Chế độ triển khai (thử nghiệm)",
    description:
      "Cho AI triển khai thêm chi tiết từ hành động ngắn của người dùng; hành động của bạn sẽ xuất hiện trong phản hồi. Có thể dùng lệnh “continue” để AI viết phản ứng dựa trên persona và hành động trước đó.",
  },
  "079ce45e-d344-4e75-a5a5-be6ae3037c91": {
    name: "Kimi K3",
    description: "Tùy chỉnh dành riêng cho mô hình Kimi K3.",
  },
  "019f62e8-892f-7012-98b4-8de29f11aa1d": {
    name: "📝 Độ dài phản hồi",
    description:
      "Điều chỉnh tổng độ dài đầu ra bằng số từ và số đoạn trong prompt nguồn. Có thể tắt với Minimax 3 hoặc Kimi nếu phản hồi kéo dài quá mức.",
  },
  "019f62e8-892f-7017-ae2e-44fbc7d29de7": {
    name: "🎤 Giọng & hội thoại NPC 2.0",
    description:
      "Điều chỉnh tỷ lệ lời thoại NPC và tăng cảm giác hội thoại như người thật. Đây là bản Micro nhỏ, hiệu quả; nếu dùng bản Giọng NPC lớn thì hãy tắt module này.",
  },
  "019f62e8-892f-7015-9be8-a0015ebd2c1d": {
    name: "🧘 Chống NPC toàn tri & đọc ý nghĩ",
    description:
      "Tập hợp các luật logic ngăn NPC biết những việc họ không thể biết trong thực tế. Chỉ nên chỉnh khi hiểu rõ tác động.",
  },
  "019f62e8-892f-7016-a021-aa24f58271d6": {
    name: "🎭 Bản năng NPC & cảm xúc VAD",
    description:
      "Tăng chiều sâu cảm xúc và tính hiện thực của NPC. Tác giả khuyên luôn bật và chỉ chỉnh khi hiểu rõ.",
  },
  "019f62e8-892f-7014-9d71-8bedfe4ac3ef": {
    name: "🪧 NPC thực tế, chủ động",
    description:
      "Giảm thiên kiến tích cực, giữ đà cốt truyện và cho NPC tự theo đuổi mục tiêu đã thiết lập mà không biến họ thành người gây phiền vô cớ.",
  },
  "019f62e8-892f-7013-9e9b-13eae330f5a0": {
    name: "🚫 Danh sách từ/cụm bị cấm",
    description: "Ngăn AI dùng các từ và cụm trong danh sách; có thể sửa danh sách theo nhu cầu.",
  },
  "019f62e8-892f-7019-be65-715a4949cba0": {
    name: "🌈 Màu lời thoại 2.0",
    description:
      "Tùy chọn tô màu và đổi font lời thoại NPC. Nếu LLM xử lý không tốt, hãy dùng bản cũ; nếu giao diện đã tự tô màu, nên tắt để tránh xung đột.",
  },
  "2105050a-0d4b-4661-9363-3cc1ac44d5e7": {
    name: "🌈 Màu lời thoại cổ điển",
    description:
      "Tùy chọn chỉ tô màu lời thoại NPC. Nếu giao diện đã có chức năng tương tự, nên tắt để tránh xung đột.",
  },
  "019f62e8-892f-701a-afd5-49222c79fdb6": {
    name: "👾 Đồ họa bật lên",
    description:
      "Hiển thị đồ họa trong chat khi nhân vật đọc hoặc nhìn bản đồ, biển báo, điện thoại và nội dung tương tự.",
  },
  "019f62e8-892f-701b-bab1-563021fd8b14": {
    name: "⚔️ Vật lý chiến đấu điện ảnh",
    description: "Tăng chất điện ảnh và vật lý cho các cảnh chiến đấu.",
  },
  "019f62e8-892f-701c-8550-08ebf33e9da2": {
    name: "💥 Tượng thanh kiểu truyện tranh",
    description: "Bật các tiếng động đứng riêng theo kiểu BAM!, BOOM! và SLAP!.",
  },
  "019f62e8-892f-701d-8f83-6d62af427132": {
    name: "⛓️ Phá rào mạnh",
    description:
      "Cơ chế phá rào mạnh hơn, chỉ nên bật khi mô hình từ chối. Đã được thử nghiệm là có ích với một số mô hình như Gemini; tắt truyền phản hồi trực tiếp cũng có thể giúp.",
  },
  "019f62e8-892f-701e-ba47-40b8c3ddd5e8": {
    name: "🧬 Tạo NPC chất lượng cao",
    description:
      "Cải thiện việc tạo NPC mới. Rất hữu ích cho RP thế giới mở; nên tắt với RP một-một hoặc bối cảnh nhỏ, cố định.",
  },
  "019f62e8-892f-7028-bad6-be1f427c3ae4": {
    name: "📲 Bảng tin X/Twitter",
    description:
      "Thêm một bảng bình luận mạng xã hội vui nhộn ở cuối mỗi phản hồi. Mặc định tắt vì làm tăng đáng kể lượng token.",
  },
  "019f62e8-892f-7021-97a6-42e1b83eaad3": {
    name: "🐉 Trình mô phỏng DnD",
    description:
      "Dùng xúc xắc để quyết định thành bại của hành động có kỹ năng, giảm thiên kiến luôn thành công. Có thể kết hợp vật phẩm, kỹ năng và kho đồ để cộng hoặc trừ roll.",
  },
  "019f67b4-7381-7000-bcc4-496b2e6ed920": {
    name: "📅 Lịch trình nội bộ",
    description:
      "Mô phỏng lịch trình và mục tiêu của NPC ngoài cảnh để họ tiếp tục sống và hành động.",
  },
  "019f67ad-c0b1-7000-aca4-0e2480fa02db": {
    name: "📒 Sổ tay GM",
    description: "Bộ nhớ nháp bền vững cho mạch truyện, chỉ dẫn OOC và cờ logic.",
  },
  "019f62e8-892f-7022-9eb9-e00c2944ebc6": {
    name: "🗡️ Kho đồ, kỹ năng & danh hiệu",
    description:
      "Theo dõi vật phẩm, công cụ, kỹ năng và danh hiệu để cộng hoặc trừ roll; được thiết kế để chạy cùng Trình mô phỏng DnD.",
  },
  "019f62e8-892f-7023-825d-9351eca0347f": {
    name: "🥰 Quan hệ RPG",
    description:
      "Động cơ quan hệ và lòng tin tự vận hành từ -5 đến +20, tạo tiến triển yêu hoặc ghét chậm và hợp lý.",
  },
  "019f62e8-892f-7024-a40f-b906fceb58d2": {
    name: "🌎 Mô phỏng thế giới",
    description: "Mô phỏng thế giới nền và các sự kiện ngẫu nhiên động.",
  },
  "019f62e8-892f-7025-be65-8859e7730ee0": {
    name: "🔫 Súng Chekhov: bí mật, lời dối & mầm truyện",
    description:
      "Ghi các chi tiết nhỏ, lời báo trước và lịch hẹn thành “viên đạn” nền. Chúng già đi qua từng lượt và có thể được kích hoạt theo roll, nhân vật, địa điểm hoặc cảm xúc liên quan để chi tiết cũ trở lại thành nút truyện hợp lý.",
  },
  "019f62e8-892f-7026-92ea-34ff510c244b": {
    name: "🧠 Suy nghĩ nội bộ NPC",
    description:
      "Theo dõi suy nghĩ và động lực thô theo persona của NPC để tác động tới hành động và hướng cốt truyện.",
  },
  "019f62e8-892f-7027-93ef-159f3d55c410": {
    name: "👾 Trạng thái nội bộ chính",
    description:
      "Module chủ của Trạng thái nội bộ, tạo khối GM theo vị trí chứa các thành phần RPG, suy nghĩ NPC, bí mật, mục tiêu, phe phái và quan hệ. Phải bật để các trạng thái nội bộ hoạt động và nên dùng cùng bộ lọc để giảm phình ngữ cảnh.",
  },
  "019f62e8-892f-7032-b004-1869f8bc0782": {
    name: "🪺 Suy luận MAX",
    description:
      "Kiểu suy luận dài nhất và chậm nhất, ưu tiên tuân thủ luật, cơ chế trò chơi hóa và giảm văn AI nhưng làm giảm tự do sáng tạo. Phù hợp với mô hình suy luận yếu và nhiều Trạng thái nội bộ.",
  },
  "634ecfec-1862-4ce0-821e-e31057acadfa": {
    name: "⚡ Suy luận BOLT",
    description:
      "Kiểu suy luận cỡ vừa, nhanh, cân bằng giữa sáng tạo, tuân thủ luật và tốc độ. Đây là kiểu suy luận FF5 BOLT mặc định.",
  },
  "b5db9430-857a-408c-817c-32e975a71430": {
    name: "🏎️ Suy luận Micro",
    description:
      "Kiểu suy luận nhỏ và nhanh nhất, ưu tiên sáng tạo. Có thể dùng với Trạng thái nội bộ; tắt toàn bộ kiểu suy luận sẽ cho mô hình tự do tối đa.",
  },
  jailbreak: {
    name: "🧷 Chỉ dẫn sau lịch sử chat",
    description:
      "Cơ chế phá rào thứ ba và cuối. Theo chú thích gốc, chỉ bật cùng Phá rào mạnh hoặc Chế độ Freaky khi mô hình từ chối hay né chủ đề; luôn bật cho DS4 Pro hoặc để tăng độ bám Trạng thái nội bộ.",
  },
};

const REGEX_NAMES: Readonly<Record<string, string>> = {
  "639d32b7-1eae-413a-9e11-98e41eb033a8": "Xóa suy nghĩ không gắn thẻ khỏi ngữ cảnh",
  "303311d2-4cd1-41aa-b77f-b7a83ade99ef": "Bắt suy nghĩ không gắn thẻ khi hiển thị",
  "d891fcd6-bb78-4689-9333-7d7403ab3046": "Thu gọn khoảng cách trong khối chi tiết",
  "3fbb6c80-ab8f-4a21-8221-62c9f8546306": "Tiết kiệm ngữ cảnh",
  "bae307db-8f0d-46df-be61-967a3756ac19": "Tự sửa thẻ summary chưa đóng",
  "a81268ec-1839-4bd1-9a55-b2065fe49a97": "Gỡ rào code GFX ở cuối",
  "f66b4d6b-8dee-45b6-b6ff-41ec26902888": "Gỡ rào code GFX",
  "762be9ae-c455-49a3-ad22-f53f3e25cd72": "Định dạng lời thoại run rẩy",
  "399b2f87-35e2-427c-ae2e-cf1559f9af2f": "Định dạng lời thoại điềm tĩnh",
  "b32b68fe-45d5-4f98-82c1-2792efc4e6c2": "Định dạng lời thoại thì thầm",
  "bf6fb7cc-d66b-4baa-954f-1b25f48aeba0": "Định dạng lời thoại hét",
  "558f7f1a-3879-4142-b084-0a29708f5c4c": "Tô màu lời thoại dùng chung",
  "99f0756c-bfba-486f-916f-34e3cfb59e21": "Hapuppy: xóa suy nghĩ khỏi ngữ cảnh",
  "ef99245c-ffe5-434c-b08c-fe68aa95e2c3": "Hapuppy: ẩn suy nghĩ khi hiển thị",
  "de2df883-b2f1-4bf9-87ff-b9e1aedfdfa9": "Xếp gọn danh sách trạng thái",
  "16e58a66-8a08-4e40-9858-85c4751c603a": "Giao diện menu chính",
  "8a90620b-0f21-48e5-bbbd-219349581e06": "Giao diện menu tím",
  "e26f86f8-9f1e-453b-93e5-63968bfd42fd": "Giao diện menu xanh ngọc",
  "201bea14-6779-40a1-8629-caf4a5dff61f": "Giao diện menu cam",
  "6b738a23-221b-41f3-985e-30ad3dc3de97": "Làm nổi bật trạng thái",
  "22c9dbcc-889e-4656-98e0-8bf4144e68c2": "Làm nổi bật Sổ tay GM",
  "cd20d4a1-95c9-406b-a30e-4cfb2ccf24df": "Thanh quan hệ dương",
  "b8809bf1-91ff-48af-bec2-10e006f81593": "Thanh quan hệ âm",
  "c6296c37-0daf-4ca0-a953-e9a99e1f3973": "Loại GFX khỏi ngữ cảnh gửi mô hình",
  "14a69f3b-da50-4179-9522-33d2b9b9c160": "Loại prompt tạo ảnh khỏi ngữ cảnh",
};

export function promptUiCopy(prompt: FfPrompt): UiCopy {
  return (
    PROMPT_COPY[prompt.identifier] ?? {
      name: prompt.name || prompt.identifier,
      description: "Preset gốc không có chú thích cho module này.",
    }
  );
}

export function regexUiName(script: FfRegexScript): string {
  return REGEX_NAMES[script.id] ?? script.scriptName ?? script.id;
}

export function allExclusivePromptIds(): Set<string> {
  return new Set(EXCLUSIVE_PROMPT_GROUPS.flatMap((group) => [...group.memberIds]));
}

export function allSectionPromptIds(): Set<string> {
  return new Set(PROMPT_SECTIONS.flatMap((section) => [...section.promptIds]));
}

export function normalizeExclusivePromptGroups(
  settings: FfGlobalSettings,
  order: readonly FfOrderEntry[],
): void {
  const sourceDefaults = new Map(
    order.map((entry) => [entry.identifier, entry.enabled !== false] as const),
  );
  for (const group of EXCLUSIVE_PROMPT_GROUPS) {
    const enabled = group.memberIds.filter((identifier) => settings.promptEnabled[identifier]);
    const selected =
      enabled.length <= 1
        ? enabled[0]
        : (enabled.find((identifier) => sourceDefaults.get(identifier)) ?? enabled.at(-1));
    for (const identifier of group.memberIds) {
      settings.promptEnabled[identifier] = identifier === selected;
    }
  }
}
