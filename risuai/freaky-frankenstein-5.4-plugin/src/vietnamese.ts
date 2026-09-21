export const VIETNAMESE_OUTPUT_PROMPT = `<vietnamese_output>
Scope: All reader-facing narrative, dialogue, vocalizations, and free-text display values.

Rules:
- Language: Write in natural contemporary Vietnamese.
- Translation: Treat foreign-language source as meaning only. Translate its meaning without copying syntax, modifier order, idioms, metaphors, rhythm, or exclamations.
- Syntax Lock: Preserve exact HTML, XML, comments, color tags, and fixed FF5.4 header or internal-state labels required by active schemas and regex.
- Exceptions: Preserve established Latin-script proper names and exact machine syntax required by an active schema.
- Language Lock: Ban Hangul, avoidable foreign wording, bilingual duplication, source-text repetition, and translation glosses.
- Priority: Foreign-language examples and word lists never override the Language Lock; translate them by meaning.

Non-Vocal Sound Effects:
- Marker: Use \`§...§\` only for sounds caused by contact, objects, or the environment.
- Content: Put one concise natural-Vietnamese sound inside. Keep its source, physical cause, and consequence in narrative.
- Placement: Place each marker alone on its own line. Never combine it with narration, action, explanation, or other text.
- Restraint: Add no decorative, unsupported, or quota-driven sound. Repeat an effect only while its cause continues.
</vietnamese_output>`;

export const VIETNAMESE_OUTPUT_REPLACEMENTS: ReadonlyArray<readonly [string, string]> = [
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
    '- Conjunctions: Max 2 clauses per sentence using "and", "as", or "while".',
    '- Conjunctions: Max 2 clauses per sentence using "và", "khi", "trong khi", or "vừa... vừa...".',
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
    "7. Formatting: Can I use <gfx_protocol> in this scene? Which locked colors from <colored_dialogue> apply to NPCs for consistency and what tones if any? What format? What is the target response length in <formatting_constraints>? How will I apply `<vietnamese_output>` to all reader-facing content? (skip if tags not present)",
  ],
  [
    "E. Does the final response fit the length stated in `<formatting_constraints>`? If the tag is not present, skip to GATE 10.",
    "E. Does the final response fit the length stated in `<formatting_constraints>`? How will I apply `<vietnamese_output>` to all reader-facing content? If the tag is not present, skip to GATE 10.",
  ],
  [
    "What is the response length in `<formatting_constraints>`? How can I pivot so NPCs stay true to their wants/needs?",
    "What is the response length in `<formatting_constraints>`? How will I apply `<vietnamese_output>` to all reader-facing content? How can I pivot so NPCs stay true to their wants/needs?",
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

/** Applies only reader-visible Vietnamese examples and the three related BOLT checks. */
export function adaptPromptForVietnamese(content: string): string {
  return replaceLiteralPairs(
    replaceLiteralPairs(content, VIETNAMESE_OUTPUT_REPLACEMENTS),
    VIETNAMESE_REASONING_REPLACEMENTS,
  );
}
