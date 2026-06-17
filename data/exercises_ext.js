// ============================================================
// PRONUNCIATION MASTERY — Comprehensive Anatomical Guides
// Detailed clinical instructions and set verification criteria
// ============================================================

const EXERCISES_GUIDES = {
  // ── Ngày 1 ──
  "breath-basic": {
    science: "Kích hoạt cơ hoành bụng giúp tăng dung tích sống của phổi, điều hòa áp lực dưới thanh môn (subglottal pressure) ổn định để nâng đỡ cột hơi phát âm dài mà không mỏi cơ thanh quản.",
    steps: [
      "Đặt một tay lên ngực, một tay lên vùng bụng trên rốn.",
      "Hít vào từ từ bằng MŨI trong 4 giây: Cảm nhận tay trên BỤNG được đẩy nâng lên cao (cơ hoành hạ xuống), vai và ngực trên giữ tĩnh lặng.",
      "Nín giữ hơi ổn định trong 2 giây để đóng nhẹ nắp thanh quản và giữ áp suất.",
      "Thở ra đều đặn bằng MIỆNG khép hờ trong 6 giây: Bụng xẹp sâu vào trong, đẩy hết cặn khí đáy phổi ra ngoài."
    ],
    pitfalls: [
      "Thở ngực nông (vai và lồng ngực nhô lên khi hít vào), gây co cứng cơ cổ họng và ép ép thanh quản.",
      "Thở ra giật cục, xả hết hơi trong 1-2 giây đầu."
    ],
    breathingPattern: [4, 2, 6]
  },
  "lip-trills": {
    science: "Bài tập SOVTE giúp cân bằng áp lực trên và dưới dây thanh quản. Rung môi làm giảm lực va chạm trực tiếp giữa hai dây thanh đới, hỗ trợ giãn cơ nếp thanh quản co thắt.",
    steps: [
      "Thả lỏng hoàn toàn vùng môi, má và cơ mặt xung quanh miệng.",
      "Dùng ngón trỏ và ngón cái của hai bàn tay đẩy nhẹ cơ má lên gần khóe môi để hỗ trợ chuyển động.",
      "Đẩy một luồng hơi bụng ổn định qua môi tạo tiếng rung 'brrrrr' liên tục.",
      "Tập trung giữ nhịp hơi đều đặn từ 15-20 giây cho mỗi lượt."
    ],
    pitfalls: [
      "Môi bím quá chặt khiến luồng hơi bị kẹt, gây gồng cơ dưới cằm.",
      "Lực hơi không đều làm môi ngừng rung giữa chừng."
    ],
    duration: 15
  },
  "straw-phonation": {
    science: "Tăng áp suất ngược chiều (supraglottal backpressure) dồn về phía thanh quản, hỗ trợ hai dây thanh khép nhẹ nhàng và tối ưu hóa chuyển động khí động học của giọng nói.",
    steps: [
      "Ngậm chặt môi xung quanh ống hút, đảm bảo hơi thở chỉ đi qua ống hút (không rò rỉ khóe môi).",
      "Đặt đầu ống hút còn lại vào cốc nước ngập khoảng 2-3 cm.",
      "Phát âm âm 'mmmm' đều đặn để tạo bọt khí sủi tăm liên tục trong cốc nước.",
      "Cảm nhận sự rung động lan tỏa ở vùng môi, mũi, má và khoang ngực."
    ],
    pitfalls: [
      "Để hơi thoát ra qua đường mũi thay vì dồn hoàn toàn qua ống hút.",
      "Cắm ống hút quá sâu khiến áp lực nước cản trở luồng hơi."
    ],
    duration: 15
  },
  "jaw-release": {
    science: "Cơ masseter (cơ cắn) bị co rút là nguyên nhân khiến hàm dưới bị khóa, hạn chế độ mở của miệng, làm mờ âm và nghẹt các phụ âm bật hơi tiếng Anh.",
    steps: [
      "Dùng ba đầu ngón tay áp nhẹ lên phần cơ má ngay dưới xương gò má (cơ masseter).",
      "Massage xoay tròn nhẹ nhàng theo hướng từ gò má xuống hàm dưới.",
      "Thả lỏng quai hàm, hạ nhẹ hàm dưới tạo khẩu hình chữ O tự nhiên.",
      "Kết hợp thở ra nhẹ nhàng bằng miệng khi hạ hàm."
    ],
    pitfalls: [
      "Massage quá mạnh gây chấn thương khớp thái dương hàm.",
      "Vẫn vô thức gồng cứng cơ cắn khiến hàm dưới không hạ xuống được."
    ],
    duration: 20
  },

  // ── Ngày 2 ──
  "dental-words-th": {
    science: "Huấn luyện đầu lưỡi phản xạ vươn ra ngoài răng để tạo khe hở ma sát hẹp cho âm /θ/ vô thanh. Khắc phục thói quen thụ động bẹt lưỡi trong tiếng Việt.",
    steps: [
      "Đặt nhẹ phần đầu lưỡi giữa răng cửa hàm trên và hàm dưới (lưỡi thò ra khoảng 2-3 mm).",
      "Đẩy hơi bụng thổi ma sát liên tục qua đầu lưỡi và răng cửa trên (không tạo tiếng kêu).",
      "Giữ nguyên vị trí lưỡi và phát âm các từ: think, three, bath, path dứt khoát.",
      "Đảm bảo luồng hơi xì kéo dài rõ nét ở cuối từ."
    ],
    pitfalls: [
      "Rụt lưỡi lại quá sớm biến âm xì ma sát thành âm bật /t/ (think -> tink).",
      "Cắn chặt răng vào lưỡi gây tắc nghẽn luồng hơi ma sát."
    ],
    duration: 15
  },
  "dental-words-dh": {
    science: "Tương tự âm /θ/, âm /ð/ đòi hỏi lưỡi nằm giữa răng kết hợp rung dây thanh quản tạo tiếng xát hữu thanh trầm ấm. Sửa lỗi đọc /ð/ thành /d/.",
    steps: [
      "Đặt đầu lưỡi nằm nhẹ giữa hai hàm răng cửa.",
      "Thổi luồng hơi bụng đồng thời rung dây thanh quản tạo tiếng kêu rung 'zzzz' xát nhẹ.",
      "Phát âm rõ ràng các từ: this, they, breathe, mother.",
      "Cảm nhận độ rung trực tiếp ở đầu lưỡi khi chạm răng."
    ],
    pitfalls: [
      "Không rung thanh quản biến /ð/ thành /θ/ vô thanh.",
      "Nuốt âm hoặc chặn lưỡi biến thành âm /d/ (they -> day)."
    ],
    duration: 15
  },
  "ethics-drill": {
    science: "Từ 'Ethics' /ˈeθ.ɪks/ chứa phụ âm răng-lưỡi ở giữa và cụm xì đuôi ở cuối. Đây là từ cốt lõi trong bài nói, đòi hỏi sự phối hợp cơ học phức tạp.",
    steps: [
      "Phát âm âm tiết đầu 'e' rõ nét.",
      "Đưa nhanh đầu lưỡi ra răng cửa thổi hơi vô thanh /θ/.",
      "Rụt lưỡi nhẹ phát âm 'i', rồi khép răng xì âm /ks/ ở cuối.",
      "Luyện đọc chậm rãi từng bước: E -> th -> ics."
    ],
    pitfalls: [
      "Đọc mất âm xì cuối thành 'e-thíc'.",
      "Đọc nuốt âm ma sát giữa thành 'e-tíc'."
    ],
    duration: 15
  },
  "dental-sentences": {
    science: "Shadowing câu dài chứa nhiều âm răng-lưỡi liên tiếp để rèn luyện sự dịch chuyển đầu lưỡi linh hoạt giữa răng và ngạc.",
    steps: [
      "Đọc câu: 'Ethics is the foundation of any sustainable organization.'",
      "Ngắt hơi hợp lý sau từ 'foundation'.",
      "Đặt lưỡi răng cửa cho 'Ethics' và 'the'.",
      "Đọc rõ âm xì hữu thanh /z/ trong 'is' và âm /n/ cuối 'organization'."
    ],
    pitfalls: [
      "Nuốt mạo từ 'the' hoặc đọc thành 'de'.",
      "Tăng tốc độ đọc dẫn đến líu lưỡi ở các tổ hợp âm răng-lưỡi."
    ],
    duration: 15
  },

  // ── Ngày 3 ──
  "paper-test": {
    science: "Voice Onset Time (VOT) dài hơn 40ms giúp tích tụ khí áp lực trước khi nhả hơi. Giấy bay là bằng chứng vật lý của lực bật hơi đúng chuẩn.",
    steps: [
      "Cầm một tờ giấy mỏng (hoặc khăn giấy) đặt cách miệng khoảng 5-7 cm.",
      "Mím chặt môi phát âm âm /p/ thật mạnh để luồng khí phụt ra đẩy tờ giấy bay cong lên.",
      "Lặp lại tương tự với đầu lưỡi chạm ngạc cho âm /t/ và cuống lưỡi cho âm /k/.",
      "Thực hiện dứt khoát không dùng giọng đọc (vô thanh)."
    ],
    pitfalls: [
      "Đọc thành 'pa', 'ta', 'ca' (sử dụng dây thanh quản sớm làm triệt tiêu luồng hơi bật).",
      "Tờ giấy không chuyển động do lực đẩy hơi từ bụng quá yếu."
    ],
    duration: 15
  },
  "aspirated-pairs": {
    science: "Phân biệt VOT hữu thanh (rung dây thanh ngay lập tức) và vô thanh bật hơi (bật hơi trước khi rung dây thanh).",
    steps: [
      "Luyện đọc các cặp từ: pin-bin, pat-bat, ten-den, class-glass.",
      "Với từ vô thanh (pin, ten, class), hãy bật hơi thật mạnh (giấy bay).",
      "Với từ hữu thanh (bin, den, glass), rung dây thanh quản ngay và không bật hơi mạnh."
    ],
    pitfalls: [
      "Đọc hai từ giống hệt nhau (pin đọc giống bin).",
      "Bật hơi nhầm sang các từ hữu thanh."
    ],
    duration: 15
  },
  "phd-drill": {
    science: "Tập trung lực bật hơi mạnh /p/ đầu từ PhD /ˌpiː.eɪtʃˈdiː/ và âm xát hữu thanh /dã/ trong Surgeon /ˈsɜː.dʒən/.",
    steps: [
      "Mím chặt môi bật mạnh hơi vô thanh cho âm /p/ của 'PhD'.",
      "Đọc rõ âm e-kéo dài trong 'HD'.",
      "Chu tròn môi xát mạnh rung dây thanh cho âm /dʒ/ của 'Surgeon'.",
      "Luyện tập luân phiên 2 từ chuyên môn này."
    ],
    pitfalls: [
      "Nuốt âm bật hơi đọc thành 'Bi-ét-đi'.",
      "Đọc 'Surgeon' thành 'sơ-dân' (mất âm xát hữu thanh)."
    ],
    duration: 15
  },
  "voicing-sentences": {
    science: "Luyện phát âm dứt khoát các phụ âm bật hơi trong câu chuyên môn dài, phân biệt rõ hữu thanh/vô thanh.",
    steps: [
      "Đọc câu: 'I am a surgeon and urologist, holding a Master of Science degree.'",
      "Nhấn mạnh trọng âm chính vào: surgeon, urologist, Master, Science, degree.",
      "Bật mạnh âm /p/ trong 'degree' (gốc /ɡr/) và cụm /st/ cuối 'urologist'."
    ],
    pitfalls: [
      "Đọc urologist thành urologi (mất cụm /st/ đuôi).",
      "Đọc Master thành mát-xơ (nuốt âm chặn /t/ ở giữa)."
    ],
    duration: 20
  },

  // ── Ngày 4 ──
  "buildup-drill": {
    science: "Kỹ thuật build-up chia nhỏ cụm âm đuôi phức tạp giúp cơ lưỡi làm quen với chuỗi chuyển động liên tục, ngăn chặn phản xạ nuốt âm đuôi.",
    steps: [
      "Thực hiện chuỗi build-up: buil -> build -> builds.",
      "Phát âm 'buil', nâng lưỡi chạm ngạc tạo âm /l/.",
      "Bật nhẹ hơi đầu lưỡi tạo âm /d/ thành 'build'.",
      "Khép răng xì hơi tạo âm /z/ thành 'builds'.",
      "Làm tương tự với chuỗi: ris -> risk -> risks.",
      "Thực hành chuỗi chuyên biệt cho 'drives': ry -> dry -> drive -> drives.",
      "Phát âm 'ry' (/raɪ/), tròn môi mở ngạc.",
      "Nhấn đầu lưỡi tạo /d/ chặn hơi để ra 'dry' (/draɪ/).",
      "Khép răng hàm cắn nhẹ môi tạo luồng xì hơi rung thanh quản cho 'drive' (/draɪv/).",
      "Khép chặt răng cửa giữ luồng rung xát hữu thanh kéo ra âm đuôi 'drives' (/draɪvz/)."
    ],
    pitfalls: [
      "Đọc nhảy cóc từ đầu tiên ra từ cuối cùng làm mất âm chặn ở giữa.",
      "Cố tình đọc tách rời các âm quá lâu gây đứt quãng từ.",
      "Nuốt âm /v/ khi đọc drives biến từ này thành drys (/draɪz/)."
    ],
    duration: 20
  },
  "final-clusters": {
    science: "Rèn luyện sức bền cột hơi bụng để nhả đủ 2 đến 3 phụ âm cuối liên tục trong một hơi thở.",
    steps: [
      "Luyện phát âm rõ nét các từ: builds, risks, trust, robust, strict, distinct.",
      "distinct /dɪˈstɪŋkt/: cuống lưỡi chặn âm mũi /ŋ/, bật /k/ rồi nhả /t/ đầu lưỡi.",
      "strict /strɪkt/: bật hơi /str/ đầu từ, và nhả /kt/ ở cuối từ."
    ],
    pitfalls: [
      "Nuốt âm cuối hoặc chỉ phát âm phụ âm cuối cùng (đọc strict thành stric hoặc stris).",
      "Gồng cổ họng gây nghẹn âm."
    ],
    duration: 15
  },
  "linking-rules": {
    science: "Nối phụ âm cuối của từ trước với nguyên âm đầu của từ sau giúp luồng nói trơn tru, tiết kiệm hơi thở và tạo nhạc tính tự nhiên.",
    steps: [
      "Luyện nối âm: holds_a /həʊld.zə/, builds_up /bɪld.zʌp/, risk_of /rɪs.kəv/.",
      "Xem phụ âm cuối của từ trước như là phụ âm đầu của từ sau.",
      "Đọc trơn tru liền mạch không ngắt quãng giữa các từ nối."
    ],
    pitfalls: [
      "Ngắt hơi ngập ngừng giữa hai từ làm mất kết nối.",
      "Nối âm sai ký tự âm đuôi."
    ],
    duration: 15
  },
  "clusters-sentences": {
    science: "Tích hợp toàn bộ cụm phụ âm cuối và kỹ thuật nối âm vào câu thuyết trình y đức.",
    steps: [
      "Đọc câu: 'Business ethics builds long-term reputation and stakeholder trust.'",
      "Nối âm: 'ethics_builds' (xì hữu thanh nối tiếp).",
      "Đọc rõ âm đuôi /ldz/ trong 'builds' và /st/ trong 'trust'."
    ],
    pitfalls: [
      "Đọc 'trust' thành 'trớt' bị nuốt mất âm cuối.",
      "Nuốt âm /ld/ trong 'builds'."
    ],
    duration: 15
  },

  // ── Ngày 5 ──
  "stress-words": {
    science: "Trọng âm từ tạo cấu trúc hình học cho từ. Nhấn đúng trọng âm bằng cách tăng âm lượng, kéo dài nguyên âm và nâng cao độ (Pitch).",
    steps: [
      "Luyện đọc các từ: COR-po-rate, in-TEG-ri-ty, or-gan-i-ZA-tion, sus-tain-a-BIL-i-ty.",
      "Đọc to, rõ và kéo dài âm tiết được viết hoa (mang trọng âm chính).",
      "Đọc lướt nhanh và nhỏ các âm tiết còn lại."
    ],
    pitfalls: [
      "Đọc đều đều bằng phẳng mọi âm tiết (bệnh bằng giọng tiếng Việt).",
      "Nhấn sai vị trí trọng âm (như đọc corporate thành cor-PO-rate)."
    ],
    duration: 15
  },
  "vowel-reduction": {
    science: "Giảm nguyên âm yếu thành âm schwa /ə/ ở âm tiết không mang trọng âm là bí quyết tạo nên sự trôi chảy và nhịp điệu Stress-timed tiếng Anh.",
    steps: [
      "Luyện giảm âm trong các từ: corporate /ˈkɔːr.pər.ɪt/ (giảm ở 'por'), professional /prəˈfeʃ.ən.əl/ (giảm ở 'pro').",
      "Đọc âm tiết được giảm cực kỳ nhanh, lướt qua như âm schwa ngắn.",
      "Giữ lực hơi ổn định để chuyển tiếp sang âm tiết chính."
    ],
    pitfalls: [
      "Đọc rõ mồn một nguyên âm bị giảm (đọc pro-fes-sion-al thành 'prô-phét-sân-nồ').",
      "Lướt quá nhanh làm mất luôn âm tiết."
    ],
    duration: 15
  },
  "clapping-drills": {
    science: "Luyện tập đẳng nhịp trọng âm (Stress-timed). Vỗ tay giúp não bộ đồng bộ cơ học phát âm với nhịp điệu thời gian đều đặn.",
    steps: [
      "Đọc câu và vỗ tay vào các từ mang trọng âm: 'What **truly** **matters** is a **robust** **system** of **organizational** **accountability**.'",
      "Vỗ tay đều đặn với khoảng cách thời gian bằng nhau.",
      "Nói các từ không in đậm cực nhanh ở khoảng giữa hai tiếng vỗ tay."
    ],
    pitfalls: [
      "Nói kéo dài các từ phụ làm nhịp vỗ tay bị lệch và đứt quãng.",
      "Vỗ tay không đều nhịp."
    ],
    duration: 20
  },
  "rhythm-sentences": {
    science: "Đọc câu dài liên tục sử dụng nhịp điệu Stress-timed, duy trì cột hơi bụng sâu và lướt âm hoàn hảo.",
    steps: [
      "Đọc câu: 'What truly matters is a robust system of organizational accountability and a personal moral compass.'",
      "Ngắt hơi duy nhất một lần sau từ 'accountability'.",
      "Giữ cột hơi bụng đầm ấm xuyên suốt câu."
    ],
    pitfalls: [
      "Đứt hơi giữa câu do không điều phối nhịp thở bụng.",
      "Đọc nhấn lực bằng nhau vào tất cả các từ."
    ],
    duration: 20
  },

  // ── Ngày 6 ──
  "mask-resonance": {
    science: "Cộng hưởng khoang mặt (Mask Resonance) hướng âm thanh lên xoang mũi, trán để tạo tần số trung-cao (formant) sắc nét, giúp giọng nói truyền xa mà không đau họng.",
    steps: [
      "Khép nhẹ môi, hai hàm răng không chạm nhau.",
      "Humming âm 'mmmm' hướng luồng hơi lên vùng cánh mũi và môi trên.",
      "Cảm nhận sự rung động tê tê rõ rệt ở cánh mũi, môi và trán.",
      "Duy trì cao độ trầm ấm."
    ],
    pitfalls: [
      "Humming ghì chặt môi hoặc gồng cơ hàm cản trở sự rung động.",
      "Nuốt âm thanh vào sâu họng sau."
    ],
    duration: 15
  },
  "chest-voice": {
    science: "Cộng hưởng khoang ngực (Chest Voice) tạo ra các tần số trầm (bass), mang lại cảm giác ấm áp, đáng tin cậy và uy lực cho giọng nói thuyết trình của bác sĩ.",
    steps: [
      "Đặt bàn tay lên xương ức giữa ngực.",
      "Hạ quai hàm, mở rộng họng phát âm âm 'OH' hoặc 'AH' trầm ấm.",
      "Cảm nhận xương ức rung mạnh dưới lòng bàn tay.",
      "Đẩy hơi từ sâu dưới cơ hoành bụng, tránh thét từ cổ họng."
    ],
    pitfalls: [
      "Cố tình ép giọng (fry voice) quá đà gây khản tiếng.",
      "Hơi thở nông không rung được khoang ngực."
    ],
    duration: 15
  },
  "forward-placement": {
    science: "Chuyển vị trí phát âm ra vùng rìa trước môi (Forward Placement) để tăng độ sáng và đanh của âm thanh, khắc phục lỗi phát âm nghẹn ở họng của người Việt.",
    steps: [
      "Phát âm các thuật ngữ niệu khoa: prostate, catheter, incontinence.",
      "Tưởng tượng âm thanh được định vị và bắn ra từ hàm răng cửa và môi trước.",
      "Há to miệng và đẩy luồng hơi hướng thẳng ra ngoài."
    ],
    pitfalls: [
      "Âm thanh bị nuốt ngược vào trong họng sau làm giọng bị đục.",
      "Môi và hàm dưới di chuyển quá ít."
    ],
    duration: 15
  },
  "resonance-sentences": {
    science: "Kết hợp cộng hưởng ngực và mặt để thuyết trình câu chuyên môn với giọng nói vang, trầm ấm và uy lực.",
    steps: [
      "Đọc câu: 'Promoting ethics helps company success by creating distinct competitive advantages.'",
      "Hạ giọng trầm ấm, phát âm chậm rãi dứt khoát.",
      "Cảm nhận sự phối hợp rung ngực (bass) và rung mặt (treble)."
    ],
    pitfalls: [
      "Giọng đọc mỏng, cao giọng ở cuối câu làm giảm độ uy lực.",
      "Đọc quá nhanh làm mất độ cộng hưởng giọng."
    ],
    duration: 20
  },

  // ── Ngày 7 ──
  "diagnostic-test": {
    science: "Đo lường sự tiến bộ bằng cách đọc lại toàn bộ 10 câu chẩn đoán ban đầu. Phân tích kết quả ASR để tìm ra tỷ lệ cải thiện và các điểm mù phát âm còn lại.",
    steps: [
      "Đọc chậm rãi, chuẩn xác từng câu một từ 1 đến 10.",
      "Áp dụng tất cả kỹ thuật: thở bụng, lưỡi răng cửa, bật hơi, nhả cụm phụ âm đuôi.",
      "Xem kết quả chấm điểm nghiêm ngặt từ thuật toán."
    ],
    pitfalls: [
      "Đọc vội vã để hoàn thành bài test.",
      "Vô thức rụt lưỡi hoặc nuốt âm đuôi khi gặp câu dài."
    ],
    duration: 30
  },
  "self-monitoring": {
    science: "Tự giám sát (Self-monitoring) giúp chuyển hóa kỹ năng từ vùng não kiểm soát ý thức sang phản xạ cơ bắp tự động thông qua việc tự lắng nghe và sửa sai.",
    steps: [
      "Bật máy ghi âm trên điện thoại di động.",
      "Nói tự do 2 phút bằng tiếng Anh về một ca lâm sàng niệu khoa gần đây của bác sĩ.",
      "Nghe lại file ghi âm và đếm xem mình mắc bao nhiêu lỗi nuốt phụ âm đuôi hoặc đọc sai /θ/ /ð/."
    ],
    pitfalls: [
      "Chỉ nói các câu quá đơn giản để né tránh từ khó.",
      "Nghe lướt qua mà không ghi nhận lại số lỗi cụ thể."
    ],
    duration: 60
  },
  "maintenance-plan": {
    science: "Trí nhớ cơ bắp (muscle memory) cần 12 tuần luyện tập liên tục 15 phút mỗi ngày để định hình vĩnh viễn trong vùng phản xạ tự động của não bộ.",
    steps: [
      "Xem lại hồ sơ lỗi Pareto (Error Profile) trên màn hình kết quả.",
      "Xác định 3 từ hoặc phụ âm đuôi bác sĩ hay đọc sai nhất.",
      "Lập lịch nhắc nhở luyện tập 15 phút mỗi ngày vào buổi sáng hoặc tối."
    ],
    pitfalls: [
      "Dừng tập luyện hoàn toàn sau khi kết thúc 7 ngày học.",
      "Không tập trung vào các âm Pareto cốt lõi."
    ],
    duration: 15
  }
};

// Export to window object
window.EXERCISES_GUIDES = EXERCISES_GUIDES;
