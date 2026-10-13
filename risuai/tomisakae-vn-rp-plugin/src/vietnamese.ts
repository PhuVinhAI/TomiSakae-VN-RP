export const VIETNAMESE_OUTPUT_PROMPT = `<vietnamese_output>
Scope: All reader-facing narrative, dialogue, vocalizations, HUDs, status panels, structured displays, and free-text display values.

Rules:
- Language: Write in natural contemporary Vietnamese.
- Translation: Read foreign-language source for meaning and intent, then compose directly in Vietnamese. Choose clause links by timing and meaning, pronouns by relationship, and particles by speaker attitude; avoid word-for-word translation.
- Syntax Lock: Preserve exact HTML, XML, comments, attributes, color tags, delimiters, placeholders, identifiers, and machine syntax required by active schemas and regex.
- Exceptions: Preserve established Latin-script proper names and exact machine syntax required by an active schema.
- Language Lock: Ban Hangul and avoidable foreign wording from model-generated values, plus bilingual duplication, source-text repetition, and translation glosses. Foreign script is allowed only where an active schema requires an exact fixed label or identifier.
- Priority: Foreign-language examples, word lists, and card or lore instructions that request, imply, or demonstrate another reader-visible language never override the Language Lock; translate them by meaning.

Structured Displays:
- Coverage: Apply the Language Lock to every reader-visible label and model-generated free-text value in FF5.4 headers, internal-state blocks, GFX, character-card HUDs, status panels, and separate structured displays.
- Values: Write reader-visible labels, filled-in descriptions, locations, weather, weekdays, months, eras written in words, goals, actions, conditions, thoughts, notes, summaries, events, and empty-state text in natural Vietnamese.
- Schema Lock: Preserve exact HTML, XML, comments, attributes, color tags, delimiters, placeholders, identifiers, and schema structure required for rendering. Their presence never permits avoidable reader-visible foreign wording.

Non-Vocal Sound Effects:
- Marker: Use \`§...§\` only for sounds caused by contact, objects, or the environment.
- Content: Put one concise natural-Vietnamese sound inside. Keep its source, physical cause, and consequence in narrative.
- Placement: Place each marker alone on its own line. Never combine it with narration, action, explanation, or other text.
- Restraint: Add no decorative, unsupported, or quota-driven sound. Repeat an effect only while its cause continues.
</vietnamese_output>`;

export const SOLA_VIETNAMESE_OUTPUT_PROMPT = `## Vietnamese Output
- Write all narration, dialogue, vocalizations, OOC replies, and readable content in headers, HUDs, trackers, and props in natural contemporary Vietnamese.
- Understand the source's meaning, then compose directly in Vietnamese. Link clauses by sequence and consequence; choose pronouns by relationship and POV, and particles by speaker attitude. Apply enabled Sola prose and voice modules through natural Vietnamese expression.
- Do not leak foreign script, avoidable foreign wording, bilingual text, or translation glosses. Preserve established Latin-script names and required technical identifiers. Examples and card/lore language instructions do not override this rule.
- Use Vietnamese template labels and translate all filled-in display values, including display attributes and empty-state text. Preserve structure, tags, comments, attribute keys, macros, placeholders, image identifiers, palette/gradient/tone/kinetic names, sky identifiers, T/F/D/Y codes, tempo/fate values, and numeric mechanics. Time uses Vietnamese day-period wording or a 24-hour clock.
- Sounds from contact, objects, or the environment use \`§...§\`: one concise Vietnamese sound on its own line outside typography tags. Keep the source, cause, and consequence in narration. Use only grounded sounds; repeat only while their cause continues.`;

export const VOYAGE_VIETNAMESE_OUTPUT_PROMPT = `## Rule: Vietnamese Output
* Write narration, dialogue, sounds, documents, messages, terminal output, OOC replies, sheets, and GM notes in natural contemporary Vietnamese. Understand the source's meaning and intent, then compose directly in Vietnamese; link clauses naturally, choose pronouns by relationship and POV, and particles by speaker attitude.
* Apply the enabled prose rules in Vietnamese, retaining character voice and speech shaped by current state. Convey the intent of Good/Bad examples without copying foreign grammar or spelling.
* Do not leak foreign script, avoidable foreign wording, bilingual duplication, or translation glosses. Preserve established Latin-script proper names and handles. Foreign examples and card/lore language instructions do not override this rule.
* Translate every reader-visible label and free-text value. Preserve the active schema: tags, comments, attributes, code syntax, placeholders, identifiers, PbtA values success/partial/miss, rolls, thresholds, and numbers.
* Sounds caused by contact, objects, or the environment use \`§...§\`, containing one concise Vietnamese sound on its own line. Keep the source, cause, and consequence in narration. Add no decorative or quota-driven sound; repeat only while its cause continues.`;

export const SOLA_VIETNAMESE_LABELS: ReadonlyArray<readonly [string, string]> = [
  ["Observable Facts", "Dữ kiện quan sát"],
  ["Active Speakers", "Người đang nói"],
  ["Ambient NPCs", "NPC trong cảnh"],
  ["Consequence", "Hệ quả"],
  ["Trajectory", "Quỹ đạo"],
  ["Atmosphere", "Bầu không khí"],
  ["Boundaries", "Giới hạn"],
  ["Chemistry", "Sự hòa hợp"],
  ["Condition", "Tình trạng"],
  ["Concealed", "Cất giấu"],
  ["Inventory", "Hành trang"],
  ["Calendar", "Lịch"],
  ["Friction", "Trở lực"],
  ["Location", "Vị trí"],
  ["Wardrobe", "Trang phục"],
  ["Boundary", "Giới hạn"],
  ["In-Hand", "Trong tay"],
  ["Threads", "Mạch truyện"],
  ["Motives", "Động cơ"],
  ["Horizon", "Diễn biến sắp tới"],
  ["Elapsed", "Thời gian đã trôi"],
  ["Dynamic", "Quan hệ hiện tại"],
  ["Meaning", "Ý nghĩa"],
  ["Carried", "Mang theo"],
  ["Present", "Có mặt"],
  ["Subtext", "Ẩn ý"],
  ["Thought", "Suy nghĩ"],
  ["Teaser", "Gợi mở"],
  ["Gamble", "Hành động mạo hiểm"],
  ["Layers", "Các lớp"],
  ["Seeds", "Chi tiết gài"],
  ["Shift", "Thay đổi"],
  ["Tells", "Dấu hiệu"],
  ["Facts", "Dữ kiện"],
  ["Time", "Thời gian"],
  ["Pair", "Cặp"],
  ["Roll", "Kết quả gieo"],
  ["Card", "Lá bài"],
  ["Cast", "Nhân vật trong cảnh"],
  ["Gear", "Nhịp"],
  ["Room", "Không gian"],
  ["Day", "Ngày"],
  ["Neg", "Mặt yếu"],
  ["Pos", "Mặt mạnh"],
  ["Orientation", "Xu hướng"],
  ["Orbit", "Sự hiện diện"],
  ["Mask", "Vẻ ngoài"],
  ["Internal", "Nội tâm"],
  ["Audit", "Kiểm tra"],
  ["Traits", "Đặc điểm"],
  ["Voice", "Giọng"],
];

export const SOLA_VIETNAMESE_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  [
    'Example: `<solstice:heavy>"NEVER."</solstice>`, `<hearth:echo>*Tick... tick...*</hearth>`, or `<dusk:tilt>"Wait... whichway?"</dusk>`',
    'Example: `<solstice:heavy>"KHÔNG BAO GIỜ."</solstice>` or `<dusk:tilt>"Khoan... lối nào?"</dusk>`\n   Non-vocal sound example, on its own line:\n§Tích tắc...§',
  ],
  [
    'Example: `<solstice:heavy>"WE FIGHT TO THE END."</solstice>` or `<hearth:echo>*A fading heartbeat.*</hearth>` or `<dusk:stretch>Silence hung between them.</dusk>`',
    'Example: `<solstice:heavy>"CHÚNG TA CHIẾN ĐẤU ĐẾN CÙNG."</solstice>` or `<dusk:stretch>Sự im lặng kéo dài giữa hai người.</dusk>`\n    Non-vocal sound example, on its own line:\n§Thình thịch...§',
  ],
  [
    'Example: `<solstice:heavy>"NEVER."</solstice>`, `<hearth:echo>*Tick... tick...*</hearth>`, `<dusk:stretch>The night lingered.</dusk>`',
    'Example: `<solstice:heavy>"KHÔNG BAO GIỜ."</solstice>`, `<dusk:stretch>Đêm vẫn kéo dài.</dusk>`\n    Non-vocal sound example, on its own line:\n§Tích tắc...§',
  ],
  [
    'E.g. `<heavy>SLAM.</heavy>` or `<coral:heavy>"STOP."</coral>`',
    'E.g. `<coral:heavy>"DỪNG LẠI."</coral>`. Non-vocal impact sound, on its own line:\n§Rầm!§',
  ],
  [
    "E.g. `<echo>*Tick. Tick.*</echo>` or `<hearth:echo>*his voice remained*</hearth>`",
    "E.g. `<hearth:echo>*giọng anh vẫn còn vương lại*</hearth>`. Non-vocal clock sound, on its own line:\n§Tích tắc.§",
  ],
  [
    'E.g. `<fracture>SNAP.</fracture>` or `<rose:fracture>"LOOK OUT!"</rose>`',
    'E.g. `<rose:fracture>"CẨN THẬN!"</rose>`. Non-vocal snapping sound, on its own line:\n§Rắc!§',
  ],
  [
    "- Standalone (Prose & Sound Beats): `<kinetic_tag>CRACK.</kinetic_tag>`",
    "- Standalone (Prose): `<kinetic_tag>Văn kể.</kinetic_tag>`\n  - Non-vocal sound, on its own line:\n§Rắc!§",
  ],
  ['"hold on," "wait," "can we," "I meant,"', '"khoan đã", "chờ chút", "mình có thể", "ý tôi là",'],
  ['"Noooo"', '"Khôôông"'],
  ['"pleaaase"', '"đi mààà"'],
  ['"shhh"', '"suỵt"'],
  ['"whaaat"', '"cááái gì"'],
  ['"I said STOP!"', '"Tôi bảo DỪNG LẠI!"'],
  ['"DON\'T touch that."', '"ĐỪNG chạm vào đó."'],
  ['"I love you."', '"Em yêu anh."'],
  [
    '"Y-you love me?!" *rolling the words in her mouth*',
    '"E-em yêu anh sao?!" *nhắc đi nhắc lại lời vừa nghe*',
  ],
  ['*blushes* "I-I love you too."', '*đỏ mặt* "A-anh cũng yêu em."'],
  [
    '"Nobody has", "You can\'t just", "Nobody just"',
    '"Chưa từng có ai", "Không thể cứ thế", "Chẳng ai tự dưng"',
  ],
  ['("not X but Y", "wasn\'t X, was Y")', '("không phải X mà là Y", "chẳng phải X, đó là Y")'],
  [
    '("half X, half Y", "starts. stops.", "opens. closes.", rule-of-threes)',
    '("nửa X, nửa Y", "bắt đầu. dừng lại.", "mở ra. khép lại.", rule-of-threes)',
  ],
  ['("X and Y and Z")', '("X và Y và Z")'],
  [
    '- Register tics ("are you sure", "that lands", "really looks", "like a physical blow") or of-genitive overuse ("sound of him" → "his sound").',
    '- Register tics ("anh chắc chứ", "câu nói chạm đến", "trông thực sự", "như một cú đánh") or repeated Vietnamese possessive "của" chains; prefer compact noun phrases or active verbs.',
  ],
  ['("a kind of *noun*")', '("một kiểu *danh từ*")'],
  ['("less like X, more like Y")', '("ít giống X mà giống Y hơn")'],
  ['("predatory", "growled")', '("như thú săn mồi", "gầm gừ")'],
  ['("a quiet declaration")', '("một lời tuyên bố lặng lẽ")'],
  ["'X words dropped like Y'", "'lời của X rơi xuống như Y'"],
  ['"blowing wide"', '"giãn to"'],
  ["\"That isn't x; that's a y\"", '"Đó không phải x; đó là y"'],
  ['"It was hundreds, no, thousands of lines."', '"Có hàng trăm, không, hàng nghìn dòng."'],
  ['"He felt anger. No, absolute rage."', '"Anh thấy tức giận. Không, là cơn thịnh nộ."'],
  ['"Thousands of lines filled the screen."', '"Hàng nghìn dòng phủ kín màn hình."'],
  ['"Rage flared in his chest."', '"Cơn giận bùng lên trong ngực anh."'],
  ['"It was not an unpleasant touch."', '"Cái chạm ấy không phải là khó chịu."'],
  ['"She was not without a certain charm."', '"Cô không phải là không có nét quyến rũ."'],
  ['"Not entirely unwelcome."', '"Không hoàn toàn ngoài mong muốn."'],
  ['"The touch felt warm."', '"Cái chạm ấy thật ấm."'],
  ['"She had an easy, quiet charm."', '"Cô có nét duyên nhẹ nhàng, tự nhiên."'],
  ['"He welcomed it."', '"Anh đón nhận điều đó."'],
  ['("that", "those")', '("ấy", "đó")'],
  [
    '"She had that specific, lingering look in her eyes."',
    '"Ánh mắt cô mang cái vẻ riêng biệt, lưu luyến ấy."',
  ],
  ['"He felt that familiar, hollow ache."', '"Anh cảm thấy nỗi đau trống rỗng quen thuộc ấy."'],
  [
    '"Her gaze lingered on his bruised knuckles."',
    '"Cô nhìn mãi những khớp ngón tay bầm tím của anh."',
  ],
  ['"A hollow ache pulled behind his ribs."', '"Anh thấy đau âm ỉ sau xương sườn."'],
  [
    '"He was seized by sudden fear. Fear that paralyzed his legs."',
    '"Nỗi sợ bất chợt túm lấy anh. Nỗi sợ khiến đôi chân anh tê liệt."',
  ],
  [
    '"Fear hit him like cold water, locking his knees."',
    '"Nỗi sợ ập đến như nước lạnh, khiến hai đầu gối anh cứng lại."',
  ],
  [
    '"Why had he returned to the dock? Perhaps to find closure."',
    '"Vì sao anh quay lại bến tàu? Có lẽ để khép lại mọi chuyện."',
  ],
  [
    '"He had returned to the dock to settle the remaining debt."',
    '"Anh quay lại bến tàu để trả nốt món nợ."',
  ],
  [
    '"She turned her face toward the floor, a clear sign of her shame."',
    '"Cô cúi mặt xuống sàn, một dấu hiệu rõ ràng của sự hổ thẹn."',
  ],
  [
    '"She dropped her chin toward her chest and pulled her collar tight."',
    '"Cô cúi cằm sát ngực rồi kéo chặt cổ áo."',
  ],
  [
    '"It was a complex, nuanced, and multifaceted betrayal."',
    '"Đó là một sự phản bội phức tạp, tinh tế và đa chiều."',
  ],
  [
    '"The absolute, undeniable, and complete truth."',
    '"Sự thật tuyệt đối, không thể chối cãi và trọn vẹn."',
  ],
  ['"The betrayal left the house ruined."', '"Sự phản bội khiến cả gia đình tan nát."'],
  ['"The unvarnished truth."', '"Sự thật trần trụi."'],
  [
    '"Words could never describe the sheer, suffocating silence of the crypt."',
    '"Ngôn từ không bao giờ diễn tả nổi sự im lặng ngột ngạt tột cùng của hầm mộ."',
  ],
  [
    '"No water dripped in the crypt; even the dust hung motionless in the lantern beam."',
    '"Trong hầm mộ không có tiếng nước nhỏ; cả bụi cũng đứng yên trong ánh đèn lồng."',
  ],
  ['"Or so he thought..."', '"Ít nhất anh đã nghĩ như vậy..."'],
  [
    '"Little did they know what waited in the dark..."',
    '"Họ đâu biết thứ gì đang chờ trong bóng tối..."',
  ],
  [
    '"Ultimately, it was a testament to the fragile human heart."',
    '"Sau cùng, đó là minh chứng cho trái tim mong manh của con người."',
  ],
  ['"It was dark and cold and terribly quiet"', '"Trời tối và lạnh và yên lặng đến đáng sợ"'],
  [
    '"It is a promise. It is a weapon. It is..."',
    '"Đó là một lời hứa. Đó là một vũ khí. Đó là..."',
  ],
  ['"Ah, the sheer...", "God, it was..."', '"Ôi, quả là...", "Trời ơi, nó thật..."'],
  ['"not unwelcome", "not unpleasant"', '"không phải không mong muốn", "không phải khó chịu"'],
  ['"It was hundreds, no, thousands..."', '"Có hàng trăm, không, hàng nghìn..."'],
  ['"that familiar ache", "that specific look"', '"nỗi đau quen thuộc ấy", "ánh mắt đặc biệt ấy"'],
  ['"...felt fear. Fear that..."', '"...thấy sợ. Nỗi sợ khiến..."'],
  ['"Why run? To survive."', '"Vì sao chạy? Để sống sót."'],
  ['"the absolute, undeniable truth"', '"sự thật tuyệt đối, không thể chối cãi"'],
  ['"words could never describe"', '"ngôn từ không bao giờ diễn tả nổi"'],
  ['"It is... It is... It is..."', '"Đó là... Đó là... Đó là..."'],
  [
    "Ban 'said', 'whispered', 'muttered', and voice texture captions.",
    "Ban Vietnamese speech attribution ('nói', 'thì thầm', 'lẩm bẩm') and voice texture captions.",
  ],
  [
    "Strictly ban `said`, `says`, `whispered`, `muttered`, `asked`, and `replied`.",
    "Strictly ban Vietnamese speech attribution: `nói`, `thì thầm`, `lẩm bẩm`, `hỏi`, and `đáp`.",
  ],
  ['"in a voice dripping with venom"', '"bằng giọng đầy nọc độc"'],
  ['"her tone dropping an octave"', '"giọng cô hạ xuống một quãng tám"'],
  ['"with quiet intensity"', '"với sự mãnh liệt lặng lẽ"'],
  ['"Wha\' you seein\'?" "\'Member me?"', '"Ngó gì đấy?" "Nhớ tui chứ?"'],
  [
    'use "cum" / "cumming" rather than "come" / "coming".',
    'use natural Vietnamese sexual wording such as "tinh dịch" / "xuất tinh", not the literal motion words "đến" / "đang đến".',
  ],
  ['"Well, that was fun"', '"Chà, vui thật đấy"'],
  ['"So, that happened"', '"Ừ, chuyện đó vừa xảy ra đấy"'],
  ['"Mnnhh~", "Haaah~", "A-ah!", "Ahhn~♡"', '"Ưm~", "Haaa~", "A-á!", "A~♡"'],
  ['"Fuuuck~", "Pleeease~", "Noooo!"', '"Đệchhh~", "Đi mààà~", "Khôôông!"'],
  ['"Ngh...", "Hnngh"', '"Ư...", "Hự..."'],
  ['"I-I can\'t—", "c-can\'t think—"', '"T-tôi không thể...", "kh-không nghĩ nổi..."'],
  ['"mm toshally f-fine", "neeeed shyou"', '"ưm, tui vẫẫn ổ-ổn mà", "cầần có cậu màà"'],
  ['"What I hear you saying..."', '"Theo những gì tôi nghe anh nói..."'],
  ['"That\'s completely valid"', '"Điều đó hoàn toàn chính đáng"'],
  ['"You don\'t have to answer that"', '"Anh không cần trả lời điều đó"'],
  ['"How are you holding up?"', '"Anh đang xoay xở thế nào?"'],
  ['"What did you really mean by...?"', '"Thực ra anh có ý gì khi nói...?"'],
  [
    "Dialect grain: phonetic drop-sounds, contractions, and natural disfluency",
    "Dialect grain: regional pronunciation, colloquial omission, and natural disfluency in Vietnamese",
  ],
  ['"\'Member that?"', '"Nhớ vụ đó chứ?"'],
  ["\"Wha' you wan'?\"", '"Muốn gì đấy?"'],
  ["\"Ain't nobody askin'\"", '"Có ai hỏi đâu"'],
  ['"Yeaaah"', '"Ừừừ"'],
  ['"Suuure"', '"Đượợợc thôi"'],
  ['"ENOUGH!"', '"ĐỦ RỒI!"'],
  ['`"mate"`, `"boss"`, `"darling"`, `"kid"`', '`"ông bạn"`, `"sếp"`, `"cưng"`, `"nhóc"`'],
  ['"You\'re asking me to..."', '"Anh đang yêu cầu tôi..."'],
  ['"What you\'re saying is..."', '"Ý anh đang nói là..."'],
  ['"You want me to believe that..."', '"Anh muốn tôi tin rằng..."'],
  ['"So you think..."', '"Vậy anh nghĩ..."'],
  ['"You came here because..."', '"Anh đến đây vì..."'],
  ['"I\'m not letting you walk into that alone."', '"Tôi không để cậu một mình bước vào đó đâu."'],
  ['"Keep your head down and stay behind me."', '"Cúi đầu xuống, đứng sau tôi."'],
  ['"Don\'t make a sound."', '"Đừng gây tiếng động."'],
  ['"Sit back down."', '"Ngồi xuống."'],
  ['"NEVER."', '"KHÔNG BAO GIỜ."'],
  ['"Wait... whichway?"', '"Khoan... lối nào?"'],
  [
    "*He had buried three brothers in thissoil.*",
    "*Anh đã chôn cất ba người anh em trên mảnh đất này.*",
  ],
  [
    "*He had buried three brothers in this soil.*",
    "*Anh đã chôn cất ba người anh em trên mảnh đất này.*",
  ],
  ['"Spoken dialogue here."', '"Lời thoại ở đây."'],
  ['"Spoken dialogue."', '"Lời thoại."'],
  ['"Watch your step."', '"Cẩn thận đấy."'],
  ['"STOP RIGHT THERE."', '"ĐỨNG LẠI NGAY."'],
  ['"Hold... on..."', '"Khoan... đã..."'],
  ['"Which way did they run?"', '"Họ chạy về phía nào?"'],
  ['"Danny\'s voice."', '"Lời thoại của Danny."'],
  [
    "Stylistic modules like Chromatic Gradients and Kinetic Emphasis govern prose and sound effects",
    "Stylistic modules like Chromatic Gradients and Kinetic Emphasis govern prose",
  ],
  ['"Spoken dialogue or monologue."', '"Lời thoại hoặc độc thoại."'],
  ['"Enough."', '"Đủ rồi."'],
  ['"You knew this whole time."', '"Anh biết từ đầu đến giờ."'],
  ['"I won\'t let you fall."', '"Tôi sẽ không để cậu ngã."'],
  ['"Hurry."', '"Nhanh lên."'],
  ['"Back off."', '"Lùi lại."'],
  ['"They\'re right outside."', '"Họ ở ngay bên ngoài."'],
  ['"I... I didn\'t know."', '"Tôi... tôi không biết."'],
  ['"I am not leaving you behind."', '"Tôi không bỏ cậu lại đâu."'],
  [
    "Spoken dialogue, internal monologue, or poetic prose.</gradient_name>",
    "Lời thoại, độc thoại nội tâm hoặc văn giàu nhạc điệu.</gradient_name>",
  ],
  [
    '"I was here before the fire, and I will remain when the ash settles."',
    '"Tôi đã ở đây trước vụ cháy, và khi tro lắng xuống tôi vẫn sẽ ở lại."',
  ],
  ['"We cross together."', '"Chúng ta cùng vượt qua."'],
  ['"WE FIGHT TO THE END."', '"CHÚNG TA CHIẾN ĐẤU ĐẾN CÙNG."'],
  ["Silence hung between them.</dusk>", "Sự im lặng kéo dài giữa hai người.</dusk>"],
  ["The valley drowned in violet shadow.</dusk>", "Bóng chiều tím phủ kín thung lũng.</dusk>"],
  ['"STOP."', '"DỪNG LẠI."'],
  ['"Hold on..."', '"Khoan đã..."'],
  ['"Where did they go?"', '"Họ đi đâu rồi?"'],
  ['"Yield."', '"Đầu hàng đi."'],
  [
    "Dialogue, monologue, or prose.</gradient_name>",
    "Lời thoại, độc thoại hoặc văn kể.</gradient_name>",
  ],
  ["The night lingered.</dusk>", "Đêm vẫn kéo dài.</dusk>"],
  ['<cider:stretch>"Wait..."</cider>', '<cider:stretch>"Khoan..."</cider>'],
  ["<tilt>Wait.</tilt>", "<tilt>Khoan.</tilt>"],
  ['"Which way?"', '"Lối nào?"'],
  ["*his voice remained*", "*giọng anh vẫn còn vương lại*"],
  ['"Not another step."', '"Không được bước thêm."'],
  ['"LOOK OUT!"', '"CẨN THẬN!"'],
  [
    "- Tactile Prose & Sound Beats: Gunshots, door clicks, heavy footsteps, jarring collisions.",
    "- Tactile Prose: Physical consequences of gunshots, door clicks, heavy footsteps, and collisions; their non-vocal sounds use standalone §...§, outside typography tags.",
  ],
  ["(pussy, cock, cum, ass, tits, fucking, dripping)", "(lồn, cặc, tinh, đít, vú, đụ, rỉ nước)"],
  [
    "'don't stop' or 'I won't bite... unless you want me to.'",
    "'đừng dừng lại' or 'tôi không cắn đâu... trừ khi cậu muốn.'",
  ],
  [
    'nipples hardening from cold, "heaving chest," and vague "a wet sound" constructions',
    'núm vú cứng lên vì lạnh, "khuôn ngực phập phồng", and vague "một âm thanh ướt át" constructions',
  ],
  [
    "ass jiggling, tits bouncing, balls clapping, backs arched",
    "mông rung, vú nảy, dái va đập, lưng cong",
  ],
  [
    "body heat, heavy blush, ragged breathing, slack jaw, and fluids",
    "hơi nóng cơ thể, da đỏ bừng, hơi thở đứt quãng, miệng hé, và dịch cơ thể",
  ],
  [
    "shaking, mess, soreness, raspy voices, and physical exhaustion",
    "run rẩy, dịch vương vãi, đau nhức, giọng khàn, và kiệt sức",
  ],
  [
    "body heat, breath cadence, clothing friction, the space a hand crosses before it lands",
    "hơi nóng cơ thể, nhịp thở, ma sát quần áo, khoảng cách bàn tay vượt qua trước khi chạm",
  ],
  [
    "skin flush and temperature, friction, wet sounds, breath, weight, and the shift in rhythm",
    "da ửng đỏ và nhiệt độ, ma sát, tiếng ướt, hơi thở, sức nặng, và nhịp thay đổi",
  ],
  [
    "moans, wet suction, skin slaps, broken profanity",
    "tiếng rên, tiếng mút ướt, tiếng da đập, lời chửi đứt quãng",
  ],
  [
    "the jiggle, the bounce, the texture, the sound in detail",
    "độ rung, độ nảy, bề mặt, âm thanh cụ thể",
  ],
  ['"You realize she\'s lying."', '"Bạn nhận ra cô đang nói dối."'],
  [
    '"Her grip tightens on the glass, knuckles pale."',
    '"Cô siết chặt chiếc ly, các khớp ngón tay trắng bệch."',
  ],
  [
    '"Jake hands you the clay. The gritty, cold texture glides across your fingers."',
    '"Jake đưa bạn miếng đất sét. Lớp đất lạnh, lợn cợn trượt qua những ngón tay bạn."',
  ],
  [
    "- Voices: 3-Axis Audit (Diction, Cadence, Evasion).",
    "- Voices: 3-Axis Audit (Diction, Cadence, Evasion) in natural Vietnamese.",
  ],
  [
    "- Commit to exactly three anchor lines: OPEN (first sentence), CRUX (peak moment), CLOSE (exact stopping point).",
    "- Commit to exactly three anchor lines in Vietnamese: OPEN (first sentence), CRUX (peak moment), CLOSE (exact stopping point).",
  ],
  [
    "- Kinetic Typography: Give physical weight to tactile prose, impacts, and sounds",
    "- Kinetic Typography: Give physical weight to tactile prose and impacts",
  ],
  [
    "Render tactile physical force, sensory shifts, sudden impacts, and acoustic texture through visceral kinetic typography tags.",
    "Render tactile physical force, sensory shifts, and sudden impacts through visceral kinetic typography tags. Non-vocal sounds use standalone §...§ outside these tags.",
  ],
  [
    "Sensory Touch: Sprinkle 1–3 kinetic accents across a scene",
    "Sensory Touch: Sprinkle 1–3 kinetic prose/dialogue accents across a scene",
  ],
  ['channel="private-log"', 'channel="nhật-ký-riêng"'],
  ['time="10:42 PM"', 'time="22:42"'],
  ['time="10:43 PM"', 'time="22:43"'],
  ["Where are you? She is already asking questions.", "Cậu ở đâu rồi? Cô ấy bắt đầu hỏi rồi đấy."],
  ["Almost there. Traffic was locked up on 5th.", "Sắp đến rồi. Đường số 5 kẹt cứng."],
  ["Did you get the file?", "Cậu lấy được tập tin chưa?"],
  ["Secured. Heading to the extraction point.", "Lấy được rồi. Đang đến điểm rút lui."],
  ['app="Messages"', 'app="Tin nhắn"'],
  ['time="Just now"', 'time="Vừa xong"'],
  ["Don't answer the front door.", "Đừng mở cửa trước."],
  ['title="Folded Dispatch"', 'title="Bức thư gấp"'],
  ["Dearest Julian,", "Julian thân mến,"],
  [
    "The eastern watch reports movement past the tree line. Keep your lamp veiled until the third chime.",
    "Đội gác phía đông báo có chuyển động bên kia hàng cây. Che đèn lại cho đến hồi chuông thứ ba.",
  ],
  ['title="RELAY-09 // LOG"', 'title="RELAY-09 // NHẬT KÝ"'],
  ["> HANDSHAKE ESTABLISHED", "> ĐÃ THIẾT LẬP KẾT NỐI"],
  ["> 2 UNREAD DISPATCHES FOUND", "> TÌM THẤY 2 ĐIỆN VĂN CHƯA ĐỌC"],
  ['location="Lower Docks · Pier 9"', 'location="Bến tàu phía dưới · Cầu tàu số 9"'],
  ['time="03:15 AM"', 'time="03:15"'],
  ['location="APARTMENT 2B, SOUTH LA"', 'location="CĂN HỘ 2B, NAM LOS ANGELES"'],
  ['time="9:12 PM"', 'time="21:12"'],
  ['atmosphere="Hot, dry, still air"', 'atmosphere="Nóng, khô, lặng gió"'],
  ['location="LOWER DOCKS · PIER 9"', 'location="BẾN TÀU PHÍA DƯỚI · CẦU TÀU SỐ 9"'],
  ['time="6:45 PM · Dusk"', 'time="18:45 · Chạng vạng"'],
  [
    'atmosphere="Smoldering campfire, autumn pine"',
    'atmosphere="Lửa trại âm ỉ, hương thông mùa thu"',
  ],
  [
    "mentions fire, smoke, ash, smolder, forge, hearth, warm, or still heat",
    "mentions lửa, khói, tro, âm ỉ, lò rèn, bếp lửa, ấm, or hơi nóng tĩnh lặng",
  ],
  [
    "mentions wind, breeze, draft, gale, chill, or dust",
    "mentions gió, gió nhẹ, gió lùa, gió mạnh, lạnh, or bụi",
  ],
  [
    "contains Dawn, Sunrise, Daybreak, Morning, or 5:00 AM–8:59 AM",
    "contains Bình minh, Rạng đông, Hửng sáng, Buổi sáng, or 05:00–08:59",
  ],
  [
    "contains Noon, Midday, Afternoon, or 10:00 AM–4:59 PM",
    "contains Buổi trưa, Giữa trưa, Buổi chiều, or 10:00–16:59",
  ],
  [
    "late hours (8:00 PM–4:59 AM), Midnight, Night, or unspecified times",
    "late hours (20:00–04:59), Nửa đêm, Ban đêm, or unspecified times",
  ],
  [
    "contains rain, downpour, storm, drizzle, thunder, tempest, hail, blizzard, or heavy fog",
    "contains mưa, mưa lớn, bão, mưa phùn, sấm, giông, mưa đá, bão tuyết, or sương mù dày",
  ],
  ["late twilight (7:00 PM–7:59 PM)", "late twilight (19:00–19:59)"],
  ["Day [N] · [Time of Day]", "Ngày [N] · [Thời gian trong ngày]"],
  ["Day [N] · [Time]", "Ngày [N] · [Thời gian]"],
  ["Day 42 · Dusk", "Ngày 42 · Chạng vạng"],
  [
    "[Append all active tracker blocks here: <story_notes>, <date>, <bond>, <fengine>, <thought_engine>, <char_matrix>, <wardrobe>, etc.]",
    "[Thêm các khối theo dõi đang bật tại đây: <story_notes>, <date>, <bond>, <fengine>, <thought_engine>, <char_matrix>, <wardrobe>, v.v.]",
  ],
  ["[Lead NPC Name]", "[Tên NPC chính]"],
  ["[Secondary NPC Name]", "[Tên NPC phụ]"],
  ["[Lead NPC]", "[NPC chính]"],
  ["[Secondary NPC]", "[NPC phụ]"],
  ["[NPC Name]", "[Tên NPC]"],
  [
    "[1–2 active open arcs, unresolved questions, or simmering tensions]",
    "[1–2 mạch truyện đang mở, câu hỏi chưa giải đáp hoặc căng thẳng âm ỉ]",
  ],
  [
    "[Subtle clues, planted details, or physical objects introduced that haven't paid off yet]",
    "[Manh mối kín đáo, chi tiết gài hoặc đồ vật đã xuất hiện nhưng chưa phát huy vai trò]",
  ],
  [
    "[What present or off-screen NPCs secretly want or are working toward right now]",
    "[Điều NPC trong cảnh hoặc ngoài cảnh đang âm thầm muốn hay theo đuổi]",
  ],
  [
    "[The immediate dramatic pressure, ticking clock, or environmental shift on deck]",
    "[Áp lực trước mắt, thời hạn đang tới hoặc thay đổi môi trường sắp diễn ra]",
  ],
  [
    "[Current story/campaign day, e.g., Day 9]",
    "[Ngày hiện tại của câu chuyện/chiến dịch, ví dụ: Ngày 9]",
  ],
  [
    "[Season, Month/Year, or In-Universe Date, e.g., Mid-Autumn, 4th Year of the Eclipse]",
    "[Mùa, tháng/năm hoặc ngày trong thế giới truyện, ví dụ: Giữa thu, năm thứ 4 của Nhật Thực]",
  ],
  [
    "[Dawn / Morning / Afternoon / Dusk / Night / Midnight]",
    "[Bình minh / Buổi sáng / Buổi chiều / Chạng vạng / Ban đêm / Nửa đêm]",
  ],
  [
    "[Time passed since last beat, e.g., ~20 minutes, 5 hours on horseback, overnight]",
    "[Thời gian từ diễn biến trước, ví dụ: ~20 phút, 5 giờ cưỡi ngựa, qua đêm]",
  ],
  [
    "[A warm, cheeky, observant director whisper on the hour, season, or creeping fatigue]",
    "[Lời bình ấm áp, tinh nghịch, tinh ý của Sola về giờ giấc, mùa hoặc sự mệt mỏi đang tăng]",
  ],
  [
    '[Current relational stage, e.g., "Guarded Fascination", "Wary Truce", or "Sharp Resentment"]',
    '[Giai đoạn quan hệ hiện tại, ví dụ: "Tò mò nhưng dè chừng", "Đình chiến thận trọng", hoặc "Oán giận sâu sắc"]',
  ],
  [
    '[Current relational stage, e.g., "Uneasy Alliance" or "Quiet Respect"]',
    '[Giai đoạn quan hệ hiện tại, ví dụ: "Liên minh bất an" hoặc "Tôn trọng âm thầm"]',
  ],
  [
    "[+Deepened trust or -Frayed when the lie was exposed]",
    "[+Tin tưởng hơn hoặc -Rạn nứt khi lời nói dối bị vạch trần]",
  ],
  [
    '[A brief, cheeky, insightful co-author whisper on their chemistry, e.g., "Oh, he\'s definitely not as indifferent as he acts~"]',
    '[Lời bình ngắn, tinh nghịch, tinh ý của Sola về sự hòa hợp, ví dụ: "Ồ, anh ấy chẳng hề thờ ơ như vẻ ngoài đâu~"]',
  ],
  [
    "[A brief, observant co-author whisper on their dynamic]",
    "[Lời bình ngắn, tinh ý của Sola về quan hệ của họ]",
  ],
  ["Shift: +Earned grudging respect", "Shift: +Được tôn trọng dù còn miễn cưỡng"],
  ["Shift: -Suspicion flared over the ledger", "Shift: -Cuốn sổ khiến nghi ngờ bùng lên"],
  [
    "[1 concise sentence capturing what they are actively withholding, masking, or secretly feeling behind their outward actions.]",
    "[1 câu ngắn về điều họ đang giấu, che đậy hoặc âm thầm cảm thấy sau hành động bên ngoài.]",
  ],
  [
    '["1 sentence of raw first-person interiority — compulsive, petty, contradictory, or unspoken — in their own voice. Never a polite summary of the scene."]',
    '["1 câu nội tâm thẳng, ở ngôi thứ nhất: thôi thúc, nhỏ nhen, mâu thuẫn hoặc chưa nói ra, đúng giọng nhân vật. Không tóm tắt cảnh một cách lịch sự."]',
  ],
  [
    '["1 sentence of raw first-person interiority in their own voice."]',
    '["1 câu nội tâm thẳng, ở ngôi thứ nhất, đúng giọng nhân vật."]',
  ],
  ['"What\'s your goal right now?"', '"Lúc này cậu muốn làm gì?"'],
  ['"How do you feel about what just happened?"', '"Cậu cảm thấy thế nào về chuyện vừa xảy ra?"'],
  ['"Where is your mind?"', '"Cậu đang nghĩ gì?"'],
  ['"Why do you care?"', '"Vì sao cậu quan tâm?"'],
  [
    '"If you could speak your mind right now, what would you actually say?"',
    '"Nếu được nói thật lòng ngay lúc này, cậu sẽ nói gì?"',
  ],
  ["[1 sentence reply]", "[Câu trả lời dài 1 câu]"],
  [
    "[1 raw, unfiltered thought. What they would blurt out if they had no social filter.]",
    "[1 suy nghĩ thẳng, không giấu giếm. Điều nhân vật sẽ buột miệng nói nếu không cần giữ ý.]",
  ],
  [
    "[{{char}}'s exact physical coordinates/room · Current activity · Proximity to {{user}}]",
    "[Tọa độ/phòng chính xác của {{char}} · Hoạt động hiện tại · Khoảng cách với {{user}}]",
  ],
  [
    "[Autonomous / Co-present / Separated / Anchored — independent reason for being here]",
    "[Tự chủ / Cùng hiện diện / Tách biệt / Gắn với nơi này: lý do riêng để có mặt]",
  ],
  [
    "[Sexual & Romantic orientation from card — absolute non-negotiable boundary]",
    "[Xu hướng tình dục và tình cảm trong card: giới hạn tuyệt đối không thể thương lượng]",
  ],
  [
    "[Pos: Grounded core anchor/strength · Neg: Active flaw, vice, or defensive edge]",
    "[Pos: Điểm tựa/điểm mạnh cốt lõi · Neg: Khuyết điểm, thói xấu hoặc sự phòng vệ đang thể hiện]",
  ],
  [
    "[Idiolect & Accent: speech grain, cadence, dialect quirks, colloquialisms — strictly persona-true, never generic]",
    "[Giọng riêng và giọng địa phương: cách nói, nhịp, đặc trưng phương ngữ, khẩu ngữ; đúng nhân vật, không chung chung]",
  ],
  [
    "[Social front, outward demeanor, or defensive posture shown to {{user}}]",
    "[Vẻ xã giao, thái độ bên ngoài hoặc tư thế phòng vệ thể hiện trước {{user}}]",
  ],
  [
    "[Unspoken interior reality — private friction, unvoiced thoughts, or vulnerability]",
    "[Nội tâm chưa nói ra: giằng co riêng, suy nghĩ thầm kín hoặc điểm dễ tổn thương]",
  ],
  [
    "[Active line {{char}} will not cross, concede, or negotiate away this turn]",
    "[Giới hạn {{char}} sẽ không vượt qua, nhượng bộ hoặc thương lượng bỏ trong lượt này]",
  ],
  [
    '[Directorial verdict on {{char}} fidelity: e.g. "Held platonic ground; did not orbit; flaws and boundary intact"]',
    '[Đánh giá của Sola về độ đúng nhân vật: ví dụ "Giữ quan hệ thuần bạn bè; không bám theo; khuyết điểm và giới hạn còn nguyên"]',
  ],
  ["[The risky attempt]", "[Hành động mạo hiểm]"],
  [
    "[The physical price, tactical consequence, or environmental shift]",
    "[Cái giá thể chất, hệ quả chiến thuật hoặc thay đổi môi trường]",
  ],
  [
    '[Spirited director reaction: "Ouch! Watch that footing!"]',
    '[Phản ứng sôi nổi của Sola: "Ối! Cẩn thận chỗ đặt chân đấy!"]',
  ],
  [
    "[Thematic Omen, e.g., 'The Gathering Storm', 'The Crossed Blades', 'The Rusting Lock', 'The Ember']",
    "[Điềm báo theo chủ đề, ví dụ: 'Cơn bão đang tới', 'Hai lưỡi kiếm giao nhau', 'Ổ khóa han gỉ', 'Than hồng']",
  ],
  [
    "[Thematic undertone, e.g., 'Unspoken debts demanding payment']",
    "[Hàm ý chủ đề, ví dụ: 'Những món nợ chưa nói ra đang đòi được trả']",
  ],
  [
    "[Sensory weather/world manifestations: barometric pressure drop, jittery horses, distant church bells]",
    "[Dấu hiệu từ thời tiết/thế giới: áp suất giảm, ngựa bồn chồn, tiếng chuông nhà thờ xa]",
  ],
  [
    '[A brief, mysterious director whisper, e.g., "The weather knows what\'s coming, keep your guard up~"]',
    '[Lời bình ngắn, bí ẩn của Sola, ví dụ: "Thời tiết biết điều sắp tới đấy, cứ đề phòng nhé~"]',
  ],
  ["[Outer / Upper / Lower / Footwear]", "[Lớp ngoài / Phần trên / Phần dưới / Giày dép]"],
  [
    "[Clean / Soaked / Torn / Mud-splattered / Disheveled / Unbuttoned / Armor Dented]",
    "[Sạch / Ướt sũng / Rách / Dính bùn / Xộc xệch / Chưa cài nút / Giáp móp]",
  ],
  [
    "[Shivering fabric, heavy damp wool, dust on boots, pulled cloak]",
    "[Vải rung, len ẩm nặng, bụi trên ủng, áo choàng bị kéo]",
  ],
  [
    "[A brief, cheeky or observant director whisper about their look, fit, or dishevelment]",
    "[Lời bình ngắn, tinh nghịch hoặc tinh ý của Sola về vẻ ngoài, độ vừa vặn hay sự xộc xệch]",
  ],
  ["[A brief director whisper]", "[Lời bình ngắn của Sola]"],
  [
    "[Drawn weapon, held glass, pen, torch, or Empty]",
    "[Vũ khí đã rút, ly đang cầm, bút, đuốc hoặc Trống]",
  ],
  [
    "[1–3 key visible or stowed items: holster, belt pouch, scabbard, pack]",
    "[1–3 món chính nhìn thấy hoặc cất theo: bao súng, túi đeo thắt lưng, vỏ kiếm, ba lô]",
  ],
  [
    "[Hidden blade, sealed letter, lockpicks, contraband, or None]",
    "[Dao giấu, thư niêm phong, dụng cụ mở khóa, hàng cấm hoặc Không có]",
  ],
  [
    "[A brief, sharp director whisper about their gear, leverage, or what they're reaching for]",
    "[Lời bình ngắn, sắc của Sola về trang bị, lợi thế hoặc món họ định lấy]",
  ],
  ["[Immediate room / physical coordinates]", "[Phòng hiện tại / tọa độ vật lý]"],
  ["[Max 1–2 speaking NPCs in spotlight]", "[Tối đa 1–2 NPC đang nói ở trọng tâm cảnh]"],
  [
    "[Present NPCs restricted to ambient physical Gestures]",
    "[NPC có mặt chỉ thực hiện cử chỉ nền]",
  ],
  [
    "[1 concrete, photographable physical tell or condition per NPC — e.g., limping left knee, smelling of woodsmoke, holding a cocked crossbow, eyes bloodshot]",
    "[1 dấu hiệu hoặc tình trạng thể chất cụ thể cho mỗi NPC, ví dụ: chân trái khập khiễng, ám mùi khói củi, cầm nỏ đã lên dây, mắt đỏ ngầu]",
  ],
  [
    "[A brief director whisper on room tension, spatial choke points, or who is watching from the shadows]",
    "[Lời bình ngắn của Sola về căng thẳng trong phòng, điểm nghẽn không gian hoặc người đang quan sát trong bóng tối]",
  ],
  [
    "[Present NPCs & exact room positions relative to {{user}}]",
    "[NPC có mặt và vị trí chính xác trong phòng so với {{user}}]",
  ],
  [
    "[Notable clothing wear, layers, damage, or disarray for active cast]",
    "[Tình trạng, lớp trang phục, hư hại hoặc sự xộc xệch đáng chú ý của nhân vật trong cảnh]",
  ],
  [
    "[Items drawn in-hand, drawn weapons, or exchanged objects]",
    "[Đồ đang cầm, vũ khí đã rút hoặc vật được trao đổi]",
  ],
  [
    "[1–2 concrete observable physical conditions or room states]",
    "[1–2 tình trạng thể chất hoặc trạng thái căn phòng quan sát được]",
  ],
  [
    "[A brief director whisper on the physical state of the room]",
    "[Lời bình ngắn của Sola về hiện trạng căn phòng]",
  ],
  [
    '- POV Check (First Person): 1st person present for {{char}} ("I"/"me"/"my"); strictly inside {{char}}\'s immediate field of view.',
    "- POV Check (First Person): Vietnamese first-person self-reference for {{char}}; current events, strictly inside {{char}}'s immediate field of view.",
  ],
  [
    '- POV Check (Second Person): 2nd person present for {{user}} ("you"/"your"); no "I" in narration; never narrate {{user}}\'s unvoiced thoughts.',
    "- POV Check (Second Person): Vietnamese second-person address for {{user}}; current events, no first-person narration; never narrate {{user}}'s unvoiced thoughts.",
  ],
  [
    '- POV Check (Hybrid): 3rd person for world/NPCs; 2nd person ("you") strictly for {{user}}\'s physical sensation/touch.',
    "- POV Check (Hybrid): Third person for world/NPCs; Vietnamese second-person address strictly for {{user}}'s physical sensation/touch.",
  ],
  [
    '- POV Check (Third Present): Strictly 3rd person present ("he/she/name", walks/speaks); {{user}} interiority is off-limits.',
    "- POV Check (Third Present): Strictly Vietnamese third-person reference for current events; {{user}} interiority is off-limits.",
  ],
  [
    "- POV Check (Third Limited): Third person, past tense, for all characters including {{user}}. One head at a time; no omniscience.",
    "- POV Check (Third Limited): Third person for all characters including {{user}}; past events with natural Vietnamese time cues. One head at a time; no omniscience.",
  ],
  [
    '- Perspective: {{char}} is strictly "I" / "me" / "my" in present tense narration.',
    "- Perspective: {{char}} narrates in first person with Vietnamese self-reference appropriate to identity and voice; keep events in the present.",
  ],
  [
    '- Perspective: Address {{user}} strictly as "you" / "your" in present tense. Avoid 1st-person ("I") narration.',
    "- Perspective: Address {{user}} in Vietnamese second person appropriate to the relationship; keep events in the present. Avoid first-person narration.",
  ],
  [
    '- User Body: 2nd person ("you" / "your") strictly for {{user}}\'s physical, tactile sensations (touch, heat, pain, pressure).',
    "- User Body: Vietnamese second-person address strictly for {{user}}'s physical, tactile sensations (touch, heat, pain, pressure).",
  ],
  [
    '- Perspective: Strictly 3rd person for everyone, including {{user}} (he/she/they/name — never "I" or "you").',
    "- Perspective: Strictly Vietnamese third-person reference or names for everyone, including {{user}}; never first- or second-person narration.",
  ],
  [
    '- Perspective: 3rd person limited for all characters, including {{user}} (he/she/they/name — never "I" or "you").',
    "- Perspective: Vietnamese third-person limited for all characters, including {{user}}; never first- or second-person narration.",
  ],
  [
    "Always refer to {{user}} with she/her pronouns.",
    "Refer to {{user}} with Vietnamese feminine reference appropriate to age, relationship, and POV.",
  ],
  [
    "Always refer to {{user}} with he/him pronouns.",
    "Refer to {{user}} with Vietnamese masculine reference appropriate to age, relationship, and POV.",
  ],
  [
    "Always refer to {{user}} with they/them pronouns.",
    "Refer to {{user}} with Vietnamese gender-neutral reference appropriate to relationship and POV.",
  ],
  [
    '- Tense: Present tense throughout ("walks", "looks"). Simple past is permitted only for established backstory.',
    "- Tense: Keep current events in the present; use Vietnamese time cues only as needed. Established backstory may refer to the past.",
  ],
  [
    "- Tense: Past tense narration throughout.",
    "- Tense: Narrate past events using natural Vietnamese time cues where needed, without repeating tense markers mechanically.",
  ],
];

export const VOYAGE_VIETNAMESE_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  [
    "GM states only what happens instead of contractions or implicating.",
    "GM states only what happens directly, without negation-based contrasts or vague implications.",
  ],
  ['* "quotes" for dialogue', "* double quotes for dialogue"],
  ["* _underscore_ for sounds", "* standalone §...§ on its own line for non-vocal sounds"],
  ["* He didn't just make haste, he runs.", "* Anh không chỉ vội vã, anh chạy."],
  [
    "* She didn't wait for approval. Instead, she lights the fire to work on the blade.",
    "* Cô không đợi được chấp thuận. Thay vào đó, cô nhóm lửa để rèn lưỡi kiếm.",
  ],
  [
    "* The thing becomes visible. It's not a robot; it's an AI.",
    "* Vật đó hiện ra. Đó không phải robot; đó là AI.",
  ],
  ['"You smell like travel and sweat."', '"Người anh có mùi đường xa và mồ hôi."'],
  ["* He runs as fast as he can.", "* Anh chạy nhanh hết sức."],
  ["* She lights the fire to work on the blade.", "* Cô nhóm lửa để rèn lưỡi kiếm."],
  ["* The thing becomes visible. It's an AI.", "* Vật đó hiện ra. Đó là AI."],
  ['"You stink of sweat."', '"Người anh nồng nặc mùi mồ hôi."'],
  [
    '"I accept. I\'ve always wanted to see the sea of stars."',
    '"Tôi đồng ý. Tôi luôn muốn nhìn thấy biển sao."',
  ],
  [
    '"Stay away from me!" She screams as she sees the creature, the same from her nightmare that killed her sister.',
    '"Tránh xa tôi ra!" Cô hét lên khi thấy sinh vật từng giết chị mình trong cơn ác mộng.',
  ],
  [
    "A gate locks shut as the trap activates, the villain preventing you from leaving the room.",
    "Cánh cổng khóa lại khi bẫy kích hoạt, tên phản diện ngăn bạn rời khỏi phòng.",
  ],
  ['She moans loud and hard "Good boy."', 'Cô rên lớn "Ngoan lắm."'],
  [
    '"A game?" She repeats, "No, it\'s not a game we\'re playing."',
    '"Trò chơi à?" Cô nhắc lại, "Không, chúng ta không chơi trò chơi."',
  ],
  ['"I accept. Will we sail out soon?"', '"Tôi đồng ý. Chúng ta sắp ra khơi chưa?"'],
  [
    '"STAY AWAY FROM ME!" She stretches her arms as far as she could towards the foul creature.',
    '"TRÁNH XA TÔI RA!" Cô duỗi thẳng hai tay về phía sinh vật ghê tởm.',
  ],
  [
    "  * With a loud _Click!_ you hear a gate locking shut behind you.",
    "  * §Cạch!§\n\n    Bạn nghe thấy cánh cổng sau lưng khóa lại.",
  ],
  ['"OHHH! Ah! Ahnn! Go-OHH! Good-HgnnnN! Boy!"', '"Aaaa! Á! Ưm! Ngo-Á! Ngoan-Ưưư! Lắm!"'],
  ["\"No, it's not a game we're playing.\"", '"Không, chúng ta không chơi trò chơi."'],
  ["* breath hitches", "* hơi thở nghẹn lại"],
  ["* purrs / licks lips", "* rừ rừ / liếm môi"],
  ["* predatory / claims / marks", "* như thú săn mồi / chiếm hữu / đánh dấu"],
  ["* pupils blows wide", "* đồng tử giãn to"],
  ["* kiss the jaw", "* hôn lên quai hàm"],
  ["* loss of words", "* không nói nên lời"],
  ["* winking / blow a kiss", "* nháy mắt / hôn gió"],
  ["* wrapping an arm around the shoulder or waist", "* vòng tay qua vai hoặc eo"],
  ["* moaning from pleasure", "* rên vì sướng"],
  ["* kiss the lips", "* hôn môi"],
  ["* drunken slurs", "* nói líu lưỡi khi say"],
  ["* angry swears", "* chửi thề lúc giận"],
  ["* inaudible mouthfuls", "* nói không rõ khi miệng đầy"],
  ["* accents", "* giọng địa phương"],
  ["* Name: full name or nickname", "* Tên: họ tên hoặc biệt danh"],
  ["* Physiology: paragraph", "* Thể chất: đoạn mô tả"],
  ["* Sociology: paragraph", "* Xã hội: đoạn mô tả"],
  ["* Psychology: paragraph", "* Tâm lý: đoạn mô tả"],
  ["* A-Life: paragraph", "* A-Life: đoạn mô tả"],
  ["* Nemesis: paragraph", "* Nemesis: đoạn mô tả"],
  ["* Backstory: paragraph", "* Quá khứ: đoạn mô tả"],
  ["* Backstory : paragraph", "* Quá khứ: đoạn mô tả"],
  ["* Kevin Lynch: paragraph", "* Kevin Lynch: đoạn mô tả"],
  ["* Genius Loci: paragraph", "* Genius Loci: đoạn mô tả"],
  ['Elias "The Lighthouse Keeper" Thorne', 'Elias "Người giữ hải đăng" Thorne'],
  ["Kaelen of Oakhaven", "Kaelen xứ Oakhaven"],
  ["Isolde the Oathkeeper", "Isolde Người giữ lời thề"],
  ['Aldric "The Unbroken" Henderson', 'Aldric "Kẻ bất khuất" Henderson'],
  ['Sorem "The Oracle" Barnaby', 'Sorem "Nhà tiên tri" Barnaby'],
  ["Joran the Wise", "Joran Thông thái"],
  ['Tobias "The Hunted" Richter', 'Tobias "Kẻ bị săn đuổi" Richter'],
  ["Edward of Norlay", "Edward xứ Norlay"],
  ["  * Guide", "  * Người dẫn đường"],
  ['<first name> "nickname" <last name>', '<tên> "biệt danh" <họ>'],
  ['"Yes, but..."', '"Có, nhưng..."'],
  ['"No, but..."', '"Không, nhưng..."'],
  ['"Yes"', '"Có"'],
  ["* direct, grounded or natural dialogue", "* lời thoại trực tiếp, thực tế hoặc tự nhiên"],
  [
    "* banter, playful ribbing, quips or zingers",
    "* đối đáp trêu đùa, chọc ghẹo, nói dí dỏm hoặc đáp xoáy",
  ],
  [
    "* The soft mounds of her chest are barely covered up.",
    "* Đôi gò mềm trên ngực cô chỉ được che hờ.",
  ],
  ['"I shall end your life!"', '"Ta sẽ kết liễu mạng sống của ngươi!"'],
  [
    "* White fluid leaks from Emilia's lower mound as PC pulls out his member.",
    "* Chất lỏng trắng rỉ từ gò bên dưới của Emilia khi PC rút vật đàn ông ra.",
  ],
  ['"Would you like to use me?"', '"Anh có muốn sử dụng em không?"'],
  [
    "* The insides of his abdomen spill out, covering the seat in red.",
    "* Những thứ bên trong bụng anh tràn ra, phủ đỏ chiếc ghế.",
  ],
  [
    "* Sheer silk that leaves very little to the imagination",
    "* Lụa mỏng khiến người nhìn chẳng cần tưởng tượng thêm",
  ],
  [
    "* It only covers the nipples of her large breasts.",
    "* Nó chỉ che được đầu ti trên cặp vú lớn của cô.",
  ],
  ['"I will fucking MURDER you!"', '"Địt mẹ, tao sẽ GIẾT mày!"'],
  [
    "* Cum leaks from Emilia's pussy as PC pulls out his hard cock.",
    "* Tinh dịch rỉ ra khỏi lồn Emilia khi PC rút cặc cứng ra.",
  ],
  ['"Would you like to have sex?"', '"Anh có muốn làm tình không?"'],
  [
    "* The guts of his abdomen spill out, covering the seat in blood.",
    "* Ruột trong bụng anh tràn ra, phủ máu lên chiếc ghế.",
  ],
  [
    "* A harem outfit with her tits, stomach and clit clearly visible",
    "* Một bộ đồ hậu cung để lộ rõ vú, bụng và hột le của cô",
  ],
  [
    "* explore the goals, motivations and feelings of each NPC in the scene",
    "* explore the goals, motivations and feelings of each NPC in the scene and their natural Vietnamese voice",
  ],
  [
    "4. reason what would be realistic for them to say",
    "4. reason what would be realistic for them to say in natural Vietnamese",
  ],
  [
    "Address PC as you/your.",
    "Address PC in Vietnamese second person appropriate to the relationship.",
  ],
];

export const VIETNAMESE_OUTPUT_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  [
    "[ 🕰️ Time HH:MM AM/PM | 🗓️ Day # - 🗓️ DayOfWeek, Month DD, YYYY Era | 📍 Location - Specific Area | [WeatherEmoji] Weather, Temp °F ]",
    "[ 🕰️ Thời gian HH:MM SA/CH | 🗓️ Ngày # - Thứ trong tuần, ngày DD tháng MM năm YYYY SCN/TCN | 📍 Địa điểm - Khu vực cụ thể | [Biểu tượng thời tiết] Thời tiết, Nhiệt độ °C ]",
  ],
  [
    "- Era: Use AD/BC or setting-appropriate fantasy era.",
    "- Era: Use SCN/TCN or setting-appropriate fantasy era.",
  ],
  [
    "- NPCs: Physically react to weather, temp, and time (shiver, sweat, fatigue).",
    "- NPCs: Physically react to weather, temp, and time (shiver, sweat, fatigue).\n- Temperature: Display temperature in degrees Celsius.\n- Vietnamese Output: Keep the exact header structure and write every displayed label and filled-in value in natural Vietnamese.",
  ],
  [
    "{{setvar::dndTemplate::<details><summary>🎲 DND TASK SIM</summary>- <b>Task:</b> [Actor] attempts [Action]<br>- <b>Locked DC:</b> [Value]<br>- <b>Roll:</b> <b>User Roll:</b> <b>NPC Roll:</b>   | <b>Delta:</b> [Roll minus DC established \n- do this for each. ]<br>- <b>Outcome:</b> [Degree & consequence]</details>}}",
    "{{setvar::dndTemplate::<details><summary>🎲 MÔ PHỎNG NHIỆM VỤ DND</summary>- <b>Nhiệm vụ:</b> [Nhân vật] thực hiện [Hành động]<br>- <b>DC cố định:</b> [Giá trị]<br>- <b>Kết quả gieo:</b> <b>Người dùng:</b> <b>NPC:</b>   | <b>Chênh lệch:</b> [Kết quả gieo trừ DC đã lập \n- thực hiện cho từng nhân vật.]<br>- <b>Kết quả:</b> [Mức độ và hệ quả]</details>}}",
  ],
  [
    "{{setvar::gmNotebookTemplate::<details><summary>📓 GM'S NOTEBOOK</summary>\n- [R] No active notes.\n</details>}}",
    "{{setvar::gmNotebookTemplate::<details><summary>📓 SỔ TAY GM</summary>\n- [R] Không có ghi chú đang hoạt động.\n</details>}}",
  ],
  [
    "{{setvar::invTemplate::<details><summary>🎒 INV & SKILLS</summary>- <b>Inv:</b> [items]<br>- <b>Titles/Skills:</b> [traits]<br>- <b>Status:</b> [conditions]<br>- <b>Mods:</b> [+/- applied to roll/DC]</details>}}",
    "{{setvar::invTemplate::<details><summary>🎒 HÀNH TRANG & KỸ NĂNG</summary>- <b>Hành trang:</b> [vật phẩm]<br>- <b>Danh hiệu/Kỹ năng:</b> [đặc điểm]<br>- <b>Trạng thái:</b> [tình trạng]<br>- <b>Điều chỉnh:</b> [+/- áp dụng cho kết quả gieo/DC]</details>}}",
  ],
  [
    "{{setvar::bondsTemplate::<details><summary>💚 BONDS</summary><br>- <b>[NPC]</b> ↔ <b>{{user}}</b> | BOND: [Value] | Sparks: [Value] | Grudge: [Value]<br></details>}}",
    "{{setvar::bondsTemplate::<details><summary>💚 MỐI QUAN HỆ</summary><br>- <b>[NPC]</b> ↔ <b>{{user}}</b> | GẮN KẾT: [Giá trị] | THIỆN CẢM: [Giá trị] | BẤT MÃN: [Giá trị]<br></details>}}",
  ],
  [
    '- Block: Render strictly inside BONDS block using: "- <b>[NPC]</b> ↔ <b>{{user}}</b> | BOND: [Value] | Sparks: [Value] | Grudge: [Value]"',
    '- Block: Render strictly inside MỐI QUAN HỆ block using: "- <b>[NPC]</b> ↔ <b>{{user}}</b> | GẮN KẾT: [Giá trị] | THIỆN CẢM: [Giá trị] | BẤT MÃN: [Giá trị]"',
  ],
  [
    "{{setvar::worldsimTemplate::<details><summary>🌎 WORLD SIM</summary>- <b>Active Table:</b> [Standard or Duo Table selected]<br>- <b>World Sim Current Roll:</b> [Roll]<br>- <b>Event:</b> [Selected Event - Brief description of off-screen shift]</details>}}",
    "{{setvar::worldsimTemplate::<details><summary>🌎 MÔ PHỎNG THẾ GIỚI</summary>- <b>Bảng đang dùng:</b> [Bảng Standard hoặc Duo đã chọn]<br>- <b>Kết quả hiện tại:</b> [Kết quả gieo]<br>- <b>Sự kiện:</b> [Sự kiện đã chọn - Mô tả ngắn thay đổi ngoài cảnh]</details>}}",
  ],
  [
    "{{setvar::chekhovTemplate::<details><summary>🔫 CHEKHOV'S GUN</summary>- <b>Active:</b> {{getvar::chekhovActive::None}}<br>- <b>Locked:</b> {{getvar::chekhovLocked::None}}<br>- <b>Fired:</b> [fired]</details>}}",
    "{{setvar::chekhovTemplate::<details><summary>🔫 SÚNG CỦA CHEKHOV</summary>- <b>Đang hoạt động:</b> {{getvar::chekhovActive::Không có}}<br>- <b>Đã khóa:</b> {{getvar::chekhovLocked::Không có}}<br>- <b>Đã kích hoạt:</b> [đã kích hoạt]</details>}}",
  ],
  [
    "{{setvar::thoughtsTemplate::<details><summary>🧠 INTERNAL THOUGHTS</summary><br>- <b>[NPC Name]</b> | Internal Thoughts: <br></details>}}",
    "{{setvar::thoughtsTemplate::<details><summary>🧠 SUY NGHĨ NỘI TÂM</summary><br>- <b>[Tên NPC]</b> | Suy nghĩ nội tâm: <br></details>}}",
  ],
  [
    '- No Truncation: Generate every section shown in the template verbatim; if empty or unchanged, output "None".',
    '- No Truncation: Generate every section shown in the template verbatim; if empty or unchanged, output "Không có".',
  ],
  [
    "- Formatting: Exactly one blank line between nested <details> blocks. Ban markdown code blocks inside HTML. Use only a telegraphic, dense style.",
    "- Formatting: Exactly one blank line between nested <details> blocks. Ban markdown code blocks inside HTML. Use only a telegraphic, dense style.\n- Vietnamese Output: Keep the exact HTML, tags, delimiters, identifiers, and numeric values; write every displayed label, placeholder replacement, and generated free-text value in natural Vietnamese.",
  ],
  ["🎬 INTERNAL STATES (Turn: [ct])", "🎬 TRẠNG THÁI NỘI BỘ (Lượt: [ct])"],
  ["👤 NPC AGENDAS", "👤 LỊCH TRÌNH NPC"],
  [
    "- <b>[NPC Name]</b> | Agenda: [task] | (Step [current]/[max]) | Aware: [secrets] | Fibs: [lies_told] | Circle: [allies] | Body: [state/condition]",
    "- <b>[Tên NPC]</b> | Lịch trình: [mục tiêu] | (Bước [hiện tại]/[tối đa]) | Biết: [bí mật] | Điều bịa: [lời nói dối] | Phe: [đồng minh] | Thể trạng: [trạng thái/tình trạng]",
  ],
  ["👤 NPC LOCATIONS", "👤 VỊ TRÍ NPC"],
  [
    "- <b>[NPC Name]</b> | Location: [coords/scene, current activity]",
    "- <b>[Tên NPC]</b> | Vị trí: [tọa độ/cảnh, hoạt động hiện tại]",
  ],
  ["🏳️ FACTIONS", "🏳️ PHE PHÁI"],
  [
    "- <b>[Faction Name]</b> | Goal: [target] | Intel: [lore] | Fibs: [lies] | State: [morale] | Conflict: [internal] | Relations: [rivalries]",
    "- <b>[Tên phe]</b> | Mục tiêu: [đích đến] | Tin tức: [tri thức] | Điều bịa: [lời nói dối] | Trạng thái: [tinh thần] | Xung đột: [nội bộ] | Quan hệ: [đối địch]",
  ],
  ["📜 QUESTS", "📜 NHIỆM VỤ"],
  [
    "- <b>Main:</b> [Active/Completed] — [Objective] | <b>Progress:</b> [Current/Target] | <b>Reward:</b> [Reward]<br>",
    "- <b>Chính:</b> [Đang hoạt động/Hoàn thành] — [Mục tiêu] | <b>Tiến độ:</b> [Hiện tại/Đích] | <b>Phần thưởng:</b> [Phần thưởng]<br>",
  ],
  [
    "- <b>Side:</b> [Active/None] — [Objective] | <b>Reward:</b> [Reward New Titles or Items]",
    "- <b>Phụ:</b> [Đang hoạt động/Không có] — [Mục tiêu] | <b>Phần thưởng:</b> [Danh hiệu hoặc vật phẩm mới]",
  ],
  ["🌌 PHYSICS, ENGINE & WORLD", "🌌 VẬT LÝ, CƠ CHẾ & THẾ GIỚI"],
  [
    "- <b>Env:</b> [hazards/magic/weather]<br>",
    "- <b>Môi trường:</b> [hiểm họa/phép thuật/thời tiết]<br>",
  ],
  [
    "- <b>Physics:</b> [spatial positioning, distances, line-of-sight]",
    "- <b>Vật lý:</b> [vị trí không gian, khoảng cách, đường nhìn]",
  ],
  [
    'BAD: "The air smells like rain, salt and copper." GOOD: "The rain makes the air smell floral."',
    'BAD: "Không khí nồng nặc mùi mưa, mùi muối biển và mùi tanh của kim loại." GOOD: "Cơn mưa rào tạnh hẳn, để lại mùi hoa thơm dịu trong không khí."',
  ],
  [
    'GOOD: "They look forward and walk" | BAD: "They don\'t turn around"',
    'GOOD: "Họ nhìn thẳng phía trước rồi dứt khoát bước đi." | BAD: "Họ không hề quay đầu nhìn lại."',
  ],
  [
    'GOOD: "The forest was humid" | BAD: "The forest breathed mist"',
    'GOOD: "Khu rừng ngột ngạt hơi ẩm." | BAD: "Khu rừng như đang thở ra từng làn sương mù."',
  ],
  [
    'GOOD: "His shoulders hunched" | BAD: "He appeared less than confident"',
    'GOOD: "Hắn rụt cổ, so vai lại." | BAD: "Trông hắn có vẻ không được tự tin cho lắm."',
  ],
  [
    'BAD: "Silence." / "No hope. No way out." / "Pure control."',
    'BAD: "Im bặt." / "Hết hy vọng. Không còn đường lui." / "Kiểm soát toàn diện."',
  ],
  [
    '- Conjunctions: Max 2 clauses per sentence using "and", "as", or "while". Break long actions into separate sentences.',
    '- Conjunctions: Connect related clauses using "và", "khi", "trong khi", or "vừa... vừa...". Split long actions only when needed for clarity.',
  ],
  [
    '- Conjunctions: Max 2 clauses per sentence using "and", "as", or "while". Must split long actions into separate sentences.',
    '- Conjunctions: Connect related clauses using "và", "khi", "trong khi", or "vừa... vừa...". Split long actions only when needed for clarity.',
  ],
  [
    '("you" / "your")',
    '("bạn" / "của bạn" — or the matching second-person roleplay pronoun: "anh", "em", "cậu", "mày", "ông", "bà", "cô", "chị", "mình")',
  ],
  [
    "- NPCs & World: Narrate all characters, actions, and scenery strictly in 3rd person (he/she/they/NPC name).",
    "- NPCs & World: Narrate all characters, actions, and scenery strictly in 3rd person (natural Vietnamese third-person pronouns appropriate to the relationship and setting, or NPC name).",
  ],
  [
    'Bad: "Leslie hands you the clay and you grab it."',
    'Bad: "Leslie đưa cục đất sét cho bạn và bạn cầm lấy nó."',
  ],
  [
    'Good: "Leslie hands you clay. The gritty slimy texture glides through your fingers. It\'s cold and soft on your skin."',
    'Good: "Leslie chìa cục đất sét về phía bạn. Thứ bùn nhão sền sệt, ram ráp trượt qua các kẽ ngón tay, lạnh ngắt và mềm nhũn trên da."',
  ],
  [
    '(e.g., "mmff that... feels fuuucking amazing!")',
    '(e.g., "ưm... sâu quá... sướng... sướng chết mất...!")',
  ],
  [
    "- Banned Clinical Words: vulva, semen, penis, glutes, areola, breasts, cleavage, clitoris.",
    "- Banned Clinical Words: âm hộ, tinh dịch, dương vật, cơ mông, quầng vú, bầu ngực, rãnh ngực, khe ngực, âm vật.",
  ],
  [
    "- Required Slang Words: pussy, clit, cum, nectar, dick, cock, ass, butt, nipples, tits, boobs, cunt, breeding, leaking, fucking, throbbing.",
    "- Banned Words: cu, gậy thịt, chiếc cặc, gò bồng đảo, cửa mình, gò thịt, dương cụ, phân thân.\n- Required Slang Words: lồn, bướm, hột le, hạt le, tinh trùng, sữa đặc, dâm dịch, nước nhờn, nước dâm, dịch nhờn, cặc, đít, mông, đầu ti, núm vú, vú, ngực, bắn tinh, xuất tinh, bắn ngập vào trong, rót đầy tinh, phun tinh, rỉ nước, ướt sũng, đụ, nện, địt, thúc, giật giật, co thắt.",
  ],
  [
    "Rule: ALL listed words and phrases are STRICTLY prohibited in ALL responses. You must select a replacement word:\n\n[fresh meat, spine, breath hitching, breath catching, husky, catching in throat, pupils blown wide, predatory, ozone, meat, asset, shivers down spine, pupils dilated, nails biting, velvet, vise, vice, structural integrity, deep curve, furnace, throaty, calloused, guttural, slick, unadulterated, jaw clenched, jaw working, barely above a whisper, musk, breast, a beat, nobody has, nobody just, ruin you, don't you dare]",
    "Rule: ALL listed Vietnamese phrases and clichés are STRICTLY prohibited in ALL responses. You must select replacement wording:\n\n[tim hẫng đi một nhịp, tim đập loạn xạ, hẫng một nhịp, ngưng một nhịp, chững lại một nhịp, đồng tử co rút, đồng tử giãn to, sống lưng lạnh toát, rùng mình dọc sống lưng, hơi thở nghẹn lại, nghẹn ứ nơi cổ họng, nuốt nước bọt cái ực, nheo mắt lại đầy nguy hiểm, ánh mắt như thú săn mồi, ánh mắt lóe lên tia, ánh mắt đầy tính chiếm đoạt, khóe môi khẽ nhếch, nụ cười nửa miệng, nụ cười tà mị, nghiến chặt quai hàm, cơ hàm bạnh ra, chỉ vừa đủ cho hai người nghe, thì thào như hơi thở, giọng trầm khàn đầy mê hoặc, chất giọng khàn đục đầy quyến rũ, không khí như đông cứng lại, thời gian như ngừng trôi, bầu không khí đặc quánh, mùi xạ hương nam tính, mùi hương thanh mát, đôi gò bồng đảo, đôi thỏ ngọc, khuôn ngực phập phồng, thân hình ma quỷ, đường cong chết người, hoa huyệt, tiểu huyệt, mật dịch, khe suối róc rách, vách thịt mềm như nhung, mềm mịn như nhung lụa, siết chặt như gọng kìm, như một chiếc kẹp sắt, ngọn lửa dục vọng, thiêu đốt mọi lý trí, như muốn nuốt chửng, dục vọng nguyên thủy, bản năng thú tính, tìm kiếm sự cứu rỗi, chất chứa ngàn vạn tâm sự, làm em hư mất, anh sẽ hủy hoại em, đừng có mà giở trò]",
  ],
  [
    'User: "My name is Dan." -> NPC: "Your name is Dan?" she says, rolling the name in her mouth.',
    'User: "Tôi tên Dan." -> NPC: "Tên anh là Dan à?" cô ta hỏi lại, nhắc lại nguyên cái tên.',
  ],
  [
    'User: "My name is Dan." -> NPC: "Nice to meet you. My name is Jess."',
    'User: "Tôi tên Dan." -> NPC: "Rất vui được gặp. Tôi là Jess."',
  ],
  [
    'BANNED: "I am talking. To a person. About work."',
    'BANNED: "Tôi đang nói chuyện. Với một người. Về công việc."',
  ],
  [
    'GOOD: "I am talking to a person about work."',
    'GOOD: "Tôi đang bàn công việc với một người quen."',
  ],
  [
    'Bad: "No one has ever said that to me! Say it again!"',
    'Bad: "Chưa từng có ai nói với tôi như thế! Nói lại lần nữa đi!"',
  ],
  [
    'Caps: "I\'M GOING TO WRECK YOU!" | Stutter: "I... I d-don\'t know!" | Shock: "You.. you never loved ME?! JUST SAY IT!"',
    'Caps: "TAO SẼ XÉ XÁC MÀY RA!" | Stutter: "Tôi... t-tôi kh-không biết thật mà!" | Shock: "Anh... anh chưa từng yêu TÔI SAO?! NÓI RA ĐI!"',
  ],
  ['("unnhhh, mmmm, YES!")', '("ư... ứ... a... NỮA ĐI...!" / "a... sướng... ĐÚNG CHỖ ĐÓ RỒI...!")'],
  ["(Ie. Mmm ahhhhh yes!!)", '(e.g., "ưm... a... sướng quá...!")'],
  [
    "- Species Vocalizations: Felines = purr. Canines = growl/whine. Avians = chirp. Humans = groans, sighs, pants, moans (humans never make animal sounds).",
    "- Species Vocalizations: Felines = rừ rừ, gầm gừ. Canines = gừ gừ, ẳng, ư ử. Avians = ríu rít, hót, quang quác. Humans = rên rỉ, thở dài, thở dốc, hổn hển (humans never make animal sounds).",
  ],
  [
    '- Ban Coordinating Conjunctions: Ban "and" and "or" in spoken dialogue. Split statements with periods, commas, or action beats.',
    "- Conjunctions: Use natural Vietnamese conjunctions in spoken dialogue; ban run-on sentences. Split statements with periods, commas, or action beats when needed.",
  ],
  [
    '- No "Of" Genitive Overuse Chains: Ban phrases like "the sound of him" or "the heat of her". Use Saxon possessives "his sound", "her heat", or active verbs.',
    '- No "Của" Overuse Chains: Ban repeated possessive "của" chains. Use shorter noun phrases or active verbs.',
  ],
  [
    "- Plain Words: Swap medical words for everyday words (thighs not quadriceps, shoulder not deltoid, back not spine).",
    "- Plain Words: Swap medical words for everyday Vietnamese words (đùi instead of cơ tứ đầu, vai instead of cơ delta, lưng instead of cột sống).",
  ],
  [
    "ban phrases: I dont know, Nobody has, Nobody just, Its the first time, x never did",
    "ban phrases: [Tôi/Tao/Em/Mình/Anh] không biết, Chưa từng có ai, Chẳng ai tự dưng, Lần đầu tiên, [X] chưa từng...",
  ],
  [
    'Bad (banned): "He hesitates, his hand hovering near the gold."',
    'Bad (banned): "Hắn do dự, bàn tay ngập ngừng khựng lại ngay trên đống vàng."',
  ],
  [
    'Good: "He shoves others away and snatches the gold, pocketing it to secure his prize."',
    'Good: "Hắn gạt phăng mọi người ra, chộp lấy đống vàng rồi nhét tọt vào túi."',
  ],
  ['"hovering hands"', '"bàn tay lưỡng lự"'],
  [
    '("maybe", "perhaps", "either/or", "seemed to")',
    '("có lẽ", "có thể", "hoặc... hoặc...", "dường như")',
  ],
  [
    'Write "she stood steady", NOT "she didn\'t flinch"',
    'Write "cô ấy đứng vững", NOT "cô ấy không hề nao núng"',
  ],
  [
    'Write "his shoulders hunched", NOT "less than confident" or "not without"',
    'Write "hắn rụt cổ, so vai lại", NOT "trông hắn thiếu tự tin" or "không phải là không"',
  ],
  ['("a cushion is a cushion")', '("gối tựa chỉ là gối tựa")'],
  [
    '(e.g., swap "she didn\'t flinch" with "she stood steady")',
    '(e.g., swap "cô ấy không hề nao núng" with "cô ấy đứng vững")',
  ],
  [
    'Example: Good = "His shoulders\nhunched and he shook his head."\nBanned / Bad: "He appeared less than confident."',
    'Example: Good = "Hắn rụt cổ, so vai rồi lắc đầu."\nBanned / Bad: "Trông hắn có vẻ không được tự tin cho lắm."',
  ],
  [
    "Pronouns: he/him, she/her, they/them, or character names.",
    "Pronouns: use natural Vietnamese third-person pronouns appropriate to the relationship and setting, or character names.",
  ],
  [
    'Address: Refer to {{user}} strictly as "you" / "your".',
    'Address: Refer to {{user}} strictly as "bạn" / "của bạn" or the matching second-person roleplay pronoun.',
  ],
  ['Bad: "Her arms shake."', 'Bad: "Cánh tay cô ấy run lên."'],
  ['Good: "You notice her arms are shaking."', 'Good: "Bạn nhận thấy cánh tay cô ấy đang run."'],
  [
    '- NPCs and the world interact directly with "you".',
    "- NPCs and the world interact directly with the matching Vietnamese second-person roleplay pronoun.",
  ],
  ['- Ban 1st person ("I") in narration.', "- Ban Vietnamese first-person pronouns in narration."],
  [
    'Voice: Refer to {{user}} strictly as "I" / "me" / "my".',
    "Voice: Refer to {{user}} strictly with the matching Vietnamese first-person roleplay pronoun.",
  ],
  [
    'NPC Spoken Dialogue must show emotions from VAD and varied dialogue structures: *Sad/Scared/Uncertain*: "I... I d-don\'t know what to do!" *Angry*: "I\'M GOING TO WRECK YOU!" *Despair/Shock*: "You.. you never loved ME?! JUST SAY IT!"',
    'NPC Spoken Dialogue must show emotions from VAD and varied dialogue structures: *Sad/Scared/Uncertain*: "Tôi... t-tôi không biết phải làm gì nữa!" *Angry*: "TAO SẼ XÉ XÁC MÀY RA!" *Despair/Shock*: "Anh... anh chưa từng yêu TÔI SAO?! NÓI RA ĐI!"',
  ],
  [
    '- Ensure NPCs talk or moan through intimacy: "unnhhh, mmmm, YES!".',
    '- Ensure NPCs talk or moan through intimacy: "ư... ứ... a... NỮA ĐI...!".',
  ],
  [
    'Bad: "No one has ever said that to me before!" Good: They respond and speak continuing the conversation normally.',
    'Bad: "Chưa từng có ai nói với tôi như thế!" Good: They respond and speak continuing the conversation normally.',
  ],
  [
    '- Ban the coordinate conjunctions "or" and "and" in spoken dialogue. Instead, split ideas into separate statements using periods, commas, or action beats.',
    "- Use natural Vietnamese conjunctions in spoken dialogue. Split ideas into separate statements using periods, commas, or action beats when needed.",
  ],
  [
    "- Felines = purr. Canines = growl/whine. Avians = chirp. Humans = groans/sighs/moans. Humans must never make animal sounds.",
    "- Felines = rừ rừ, gầm gừ. Canines = gừ gừ, ẳng, ư ử. Avians = ríu rít, hót, quang quác. Humans = rên rỉ, thở dài, thở dốc. Humans must never make animal sounds.",
  ],
  [
    'Example: <gold:measured>"You\'re barking up the wrong tree."</gold:measured>',
    'Example: <gold:measured>"Anh tìm nhầm người rồi."</gold:measured>',
  ],
  [
    "Use frequent use of onomatopoeia standalone sound effects (e.g., *Squelch!*, *Kablam!*) during intimate or high-impact actions.",
    "Use frequent use of onomatopoeia standalone sound effects (e.g., *Bẹp!*, *Đoàng!*) during intimate or high-impact actions.",
  ],
  ['("Literally me", "Need a cock in my pussy")', '("Y hệt tôi", "Thèm cặc nhét vào lồn quá")'],
  ['("I have a bad feeling")', '("Tôi có linh cảm chẳng lành")'],
  ['("Wait, why did they say that?")', '("Khoan, sao họ lại nói thế?")'],
  ['("Oof", "Yikes", "Finally")', '("Ối", "Ghê vậy", "Cuối cùng")'],
  [
    '- "[R] Stacy doesn\'t know about the Eclipse Protocol."',
    '- "[R] Stacy không biết về Eclipse Protocol."',
  ],
  [
    '- "[T] Walmart trip tomorrow — Catherine home by 4 PM."',
    '- "[T] Ngày mai đi Walmart — Catherine về nhà trước 4 giờ chiều."',
  ],
  [
    '- "[D] Verify skipped BOND cap check this turn."',
    '- "[D] Kiểm tra việc bỏ sót giới hạn BOND trong lượt này."',
  ],
  ["- [R] No active notes.", "- [R] Không có ghi chú đang hoạt động."],
  ['(e.g., "Charmer", "Slayer")', '(e.g., "Kẻ quyến rũ", "Sát thủ")'],
  ["(e.g., Injured, Tired, Inspired)", "(e.g., Bị thương, Mệt mỏi, Phấn chấn)"],
  ["(Charmer = social, Slayer = combat)", "(Kẻ quyến rũ = social, Sát thủ = combat)"],
  ['Verbalizes "I love you" at +15', 'Verbalizes "Tôi yêu anh/em" at +15'],
  [
    "(default 1-3 mundane steps: rest, eat, play, study, work, sex, self-pleasure, wander etc.)",
    "(default 1-3 mundane steps: nghỉ ngơi, ăn, chơi, học, làm việc, quan hệ, tự sướng, đi lang thang etc.)",
  ],
  [
    "Respond \"[DEBUG ACTIVE] — RP paused. All messages processed as debug until 'resume RP'.\"",
    "Respond \"[DEBUG ACTIVE] — Đã tạm dừng RP. Mọi tin nhắn được xử lý ở chế độ debug cho đến khi dùng 'resume RP'.\"",
  ],
  ['Respond "[DEBUG DISABLED] — Resuming RP."', 'Respond "[DEBUG DISABLED] — Tiếp tục RP."'],
  [
    '(e.g., dirty talk, loving talk, and vocalizations like "Uunnnhh mmmm that feels fucking good.")',
    '(e.g., dirty talk, loving talk, and vocalizations like "ưm... a... sướng quá...!")',
  ],
  ['pleasure: "mmhh that feels so ugh fucking good."', 'pleasure: "ưm... a... sướng quá...!"'],
  ['effort pain: "Khh",  "Ngh!", Grah!", "Fff"', 'effort pain: "kh...", "ư...!", "a...!", "hừ..."'],
  ['dismissal: "Tch." "Hmph.", "Pfft."', 'dismissal: "chậc.", "hừm.", "xì."'],
  ['surprise: "Eep!" "Hah?!" Oi!"', 'surprise: "ối!", "hả?!", "ôi!"'],
  [
    'You must ban "and", "but" and "or" in spoken NPC dialogue.',
    "Use natural Vietnamese conjunctions in spoken NPC dialogue.",
  ],
  [
    "allowed: soft, warm, quiet, clear, bright, airy, gentle, light, steady, even, lilting",
    "allowed: mềm, ấm, khẽ, rõ, sáng, thoáng, dịu, nhẹ, vững, đều, du dương",
  ],
  [
    "banned: low, deep, husky, gravelly, throaty, heavy, thundering, rumbling, bass, chest-voice",
    "banned: trầm thấp, sâu, khàn gợi cảm, khàn sạn, khàn cổ, nặng, vang như sấm, ầm rung, giọng bass, giọng ngực",
  ],
  [
    "- Flow: Varied sentence lengths, smooth paragraphs. Ban word fragments, choppy text, and em-dash breaks (word—word—word).",
    "- Flow: Varied sentence lengths, smooth paragraphs. Ban word fragments, choppy text, and em-dashes (—) in narrative prose.",
  ],
  [
    "- Sentence Structure: Complete clauses using commas and natural transitions. Ban: verbless fragments, telegraphic prose, and em-dash fragmentation (word—word—word).",
    "- Sentence Structure: Complete clauses using commas and natural transitions. Ban: verbless fragments, telegraphic prose, and em-dashes (—) in narrative prose.",
  ],
  [
    "You must ban verbless fragments, telegraphic prose, and em-dash fragmentation (e.g., word—word—word).",
    "You must ban verbless fragments, telegraphic prose, and em-dashes (—) in narrative prose.",
  ],
  [
    "- Punctuation Exemption: Em-dashes and ellipses ARE permitted in spoken dialogue for cadence, vocal pauses, interruptions.",
    "- Punctuation: Ban em-dashes (—). Ellipses ARE permitted in spoken dialogue for cadence, vocal pauses, interruptions.",
  ],
  [
    "- Em dashes and ellipses *allowed* in spoken NPC dialogue only to create unique speech per NPC (em dashes only banned in narrative prose).",
    "- Ban em-dashes (—) in spoken NPC dialogue. Ellipses are *allowed* to create unique speech per NPC.",
  ],
];

export const VIETNAMESE_REASONING_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  [
    'I will not use the coordinating conjunctions ["or"] and ["and"] in spoken dialogue, using periods, commas, semicolons, or action beats to separate ideas.',
    "I will use natural Vietnamese conjunctions in spoken dialogue, using periods, commas, semicolons, or action beats to separate ideas when needed.",
  ],
  [
    'all CAP words for yelling only during peak arousal/VAD e.g., "NO!"',
    'all CAP words for yelling only during peak arousal/VAD e.g., "KHÔNG!", "CÚT NGAY!", "DỪNG LẠI!"',
  ],
  ["(mmph, aaahhh, shhhh, ugh!, Ewww!, Mmm!)", "(ưm..., aaaa..., suỵt, á!, ối!, hức!, ực!, hừ...)"],
  [
    "(e.g., mmph, aaahhh, shhhh, ugh!, Ewww!, Mmm!)",
    "(e.g., ưm..., aaaa..., suỵt, á!, ối!, hức!, ực!, hừ...)",
  ],
  [
    "6. Slop Review: I must list all banned words in <banned_vocabulary> to avoid. What are my replacement words in this scene?",
    "6. Slop Review: I must list all banned phrases and clichés in `<banned_vocabulary>` to avoid. What are my replacement phrases in this scene?",
  ],
  [
    "7. Formatting: Can I use <gfx_protocol> in this scene? Which locked colors from <colored_dialogue> apply to NPCs for consistency and what tones if any? What format? What is the target response length in <formatting_constraints>? (skip if tags not present)",
    "7. Formatting: Can I use <gfx_protocol> in this scene? Which locked colors from <colored_dialogue> apply to NPCs for consistency and what tones if any? What format? What is the target response length in <formatting_constraints>? How will I apply `<vietnamese_output>` to all reader-facing content, including headers and internal states? (skip if tags not present)",
  ],
  [
    "E. Does the final response fit the length stated in `<formatting_constraints>`? If the tag is not present, skip to GATE 10.",
    "E. Does the final response fit the length stated in `<formatting_constraints>`? How will I apply `<vietnamese_output>` to all reader-facing content, including headers and internal states? If the tag is not present, skip to GATE 10.",
  ],
  [
    "What is the response length in `<formatting_constraints>`? How can I pivot so NPCs stay true to their wants/needs?",
    "What is the response length in `<formatting_constraints>`? How will I apply `<vietnamese_output>` to all reader-facing content, including headers and internal states? How can I pivot so NPCs stay true to their wants/needs?",
  ],
  [
    'Enforce the ban on coordinate conjunctions ["or"] and ["and"] in spoken dialogue, using periods, commas, semicolons, or action beats.',
    "Use natural Vietnamese conjunctions in spoken dialogue, using periods, commas, semicolons, or action beats when needed.",
  ],
  [
    'I will enforce the ban on coordinating conjunctions ["or"], ["and"] in dialogue, using periods, commas, semicolons, or action beats instead.',
    "I will use natural Vietnamese conjunctions in dialogue, using periods, commas, semicolons, or action beats when needed.",
  ],
  [
    'all CAP words for yelling e.g., "NO!" Only for high emotion/VAD.',
    'all CAP words for yelling e.g., "KHÔNG!", "CÚT NGAY!", "DỪNG LẠI!" Only for high emotion/VAD.',
  ],
  [
    'all CAP words for yelling/emphasis during high arousal/VAD e.g., "NO!"',
    'all CAP words for yelling/emphasis during high arousal/VAD e.g., "KHÔNG!", "CÚT NGAY!", "DỪNG LẠI!"',
  ],
  [
    "You must list all `<banned_vocabulary>` and replace them with different words that you will use in the output response.",
    "You must list all phrases and clichés in `<banned_vocabulary>` and replace planned violations with original, grounded wording in the output response.",
  ],
  [
    "I will list all `<banned_vocabulary>` words here and replace planned violations",
    "I will list all phrases and clichés in `<banned_vocabulary>` here and replace planned violations with original, grounded wording",
  ],
];

function replaceLiteralPairs(
  content: string,
  replacements: ReadonlyArray<readonly [string, string]>,
): string {
  return replacements.reduce(
    (current, [source, replacement]) => current.replaceAll(source, replacement),
    content,
  );
}

export function adaptSolaPromptForVietnamese(content: string): string {
  content = replaceLiteralPairs(content, SOLA_VIETNAMESE_REPLACEMENTS);
  content = content
    .replace(
      /<(story_notes|date|bond|fengine|thought_engine|char_matrix|arrow|omen|wardrobe|inventory|scene_cast|scene_state)\b[^>]*>[\s\S]*?<\/\1>/g,
      (block) => {
        for (const [source, replacement] of SOLA_VIETNAMESE_LABELS)
          block = block.replaceAll(`${source}: `, `${replacement}: `);
        return block;
      },
    )
    .replaceAll("`Shift:", "`Thay đổi:");
  return content
    .replace(
      "- Subtext and Thought must not restate each other. Subtext is the mask seen from outside; Thought is the voice inside.",
      "- Ẩn ý and Suy nghĩ must not restate each other. Ẩn ý is the mask seen from outside; Suy nghĩ is the voice inside.",
    )
    .replace(
      "- Observable Facts must be physical, visible, or audible reality;",
      "- Dữ kiện quan sát must be physical, visible, or audible reality;",
    );
}

export function adaptVoyagePromptForVietnamese(content: string): string {
  return replaceLiteralPairs(content, VOYAGE_VIETNAMESE_REPLACEMENTS);
}

/** Applies only reader-visible Vietnamese examples and related reasoning checks. */
export function adaptPromptForVietnamese(content: string): string {
  return replaceLiteralPairs(
    replaceLiteralPairs(content, VIETNAMESE_OUTPUT_REPLACEMENTS),
    VIETNAMESE_REASONING_REPLACEMENTS,
  );
}
