export const VIETNAMESE_OUTPUT_PROMPT = `<vietnamese_output>
Scope: All reader-facing narrative, dialogue, vocalizations, HUDs, status panels, structured displays, and free-text display values.

Rules:
- Language: Write in natural contemporary Vietnamese.
- Translation: Treat foreign-language source as meaning only. Translate its meaning without copying syntax, modifier order, idioms, metaphors, rhythm, or exclamations.
- Syntax Lock: Preserve exact HTML, XML, comments, attributes, color tags, delimiters, placeholders, identifiers, and machine syntax required by active schemas and regex.
- Exceptions: Preserve established Latin-script proper names and exact machine syntax required by an active schema.
- Language Lock: Ban Hangul and avoidable foreign wording from model-generated values, plus bilingual duplication, source-text repetition, and translation glosses. Foreign script is allowed only where an active schema requires an exact fixed label or identifier.
- Priority: Foreign-language examples, word lists, and card or lore instructions that request, imply, or demonstrate another reader-visible language never override the Language Lock; translate them by meaning.

Structured Displays:
- Coverage: Apply the Language Lock to every reader-visible label and model-generated free-text value in FF5.4 headers, internal-state blocks, GFX, character-card HUDs, status panels, and separate structured displays.
- Values: Write reader-visible labels, filled-in descriptions, locations, weather, weekdays, months, eras written in words, goals, actions, conditions, thoughts, notes, summaries, events, and empty-state text in natural Vietnamese.
- Schema Lock: Preserve exact HTML, XML, comments, attributes, color tags, delimiters, placeholders, identifiers, and schema structure required for rendering. Their presence never permits reader-visible foreign-language labels or values.

Non-Vocal Sound Effects:
- Marker: Use \`§...§\` only for sounds caused by contact, objects, or the environment.
- Content: Put one concise natural-Vietnamese sound inside. Keep its source, physical cause, and consequence in narrative.
- Placement: Place each marker alone on its own line. Never combine it with narration, action, explanation, or other text.
- Restraint: Add no decorative, unsupported, or quota-driven sound. Repeat an effect only while its cause continues.
</vietnamese_output>`;

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
    '- Conjunctions: Connect related clauses using "và", "khi", "trong khi", or "vừa... vừa...". Vary sentence length; split only when needed for clarity.',
  ],
  [
    '- Conjunctions: Max 2 clauses per sentence using "and", "as", or "while". Must split long actions into separate sentences.',
    '- Conjunctions: Connect related clauses using "và", "khi", "trong khi", or "vừa... vừa...". Vary sentence length; split only when needed for clarity.',
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
    '- Ban Coordinating Conjunctions: Ban "and" and "or" in spoken dialogue.',
    '- Ban Coordinating Conjunctions: Ban "và", "hoặc", and "hay là" in spoken dialogue.',
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
    '- Ban the coordinate conjunctions "và", "hoặc", and "hay là" in spoken dialogue. Instead, split ideas into separate statements using periods, commas, or action beats.',
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
    'style: write continuous, fluid, and flowing dialogue but without run-on sentences; avoid short, punchy speech. Exception: You may break speech with a movement, action, or interruption to avoid monologues. You must ban "and", "but" and "or" in spoken NPC dialogue.',
    'style: write continuous, fluid, and flowing dialogue but without run-on sentences; avoid short, punchy speech. Exception: You may break speech with a movement, action, or interruption to avoid monologues. You must ban "và", "nhưng", "hoặc", and "hay là" in spoken NPC dialogue.',
  ],
  [
    "allowed: soft, warm, quiet, clear, bright, airy, gentle, light, steady, even, lilting",
    "allowed: mềm, ấm, khẽ, rõ, sáng, thoáng, dịu, nhẹ, vững, đều, du dương",
  ],
  [
    "banned: low, deep, husky, gravelly, throaty, heavy, thundering, rumbling, bass, chest-voice",
    "banned: trầm thấp, sâu, khàn gợi cảm, khàn sạn, khàn cổ, nặng, vang như sấm, ầm rung, giọng bass, giọng ngực",
  ],
];

export const VIETNAMESE_REASONING_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
  ['conjunctions ["or"] and ["and"]', 'conjunctions ["và"], ["hoặc"], and ["hay là"]'],
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
    'Enforce the ban on coordinate conjunctions ["or"] and ["and"] in spoken dialogue',
    'Enforce the ban on coordinate conjunctions ["và"], ["hoặc"], and ["hay là"] in spoken dialogue',
  ],
  [
    'I will enforce the ban on coordinating conjunctions ["or"], ["and"] in dialogue',
    'I will enforce the ban on coordinating conjunctions ["và"], ["hoặc"], ["hay là"] in dialogue',
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

/** Applies only reader-visible Vietnamese examples and related reasoning checks. */
export function adaptPromptForVietnamese(content: string): string {
  return replaceLiteralPairs(
    replaceLiteralPairs(content, VIETNAMESE_OUTPUT_REPLACEMENTS),
    VIETNAMESE_REASONING_REPLACEMENTS,
  );
}
