// ============================================================
// PRONUNCIATION TRAINER — Exercise Data Bank
// Personalized for Dr. Lê Trọng Thiên Long
// ============================================================

const EXERCISES = {
  // ── LECTURES (Bài giảng lý thuyết cho từng ngày) ──
  lectures: {
    1: {
      title: "Ngày 1: Chẩn đoán lỗi & Giải phóng bộ máy phát âm",
      content: "Tiếng Việt có thói quen cấu âm thụ động: ít di chuyển hàm, lưỡi bẹt, hơi nông ở ngực. Tiếng Anh yêu cầu di chuyển hàm linh hoạt (jaw release), hạ lưỡi tạo khoang mở, hơi thở cơ hoành bụng sâu đẩy lực nén dài. Warm-up bằng Lip Trills (rung môi), Humming và Straw Phonation giúp thư giãn nếp thanh quản, giảm lực ép trực tiếp ở cổ họng, chuẩn bị cột hơi đầm ấm."
    },
    2: {
      title: "Ngày 2: Âm ma sát răng-lưỡi /θ/ & /ð/",
      content: "Âm răng-lưỡi (dental fricative) vô thanh /θ/ (trong ethics, path) và hữu thanh /ð/ (trong they, breathe) không tồn tại trong tiếng Việt. Lỗi sai phổ biến là biến /θ/ thành /t/ (tink) hoặc /s/ (sic), và /ð/ thành /d/ (day). Cơ học sửa: Đặt đầu lưỡi nằm nhẹ giữa 2 hàm răng cửa, thổi luồng hơi liên tục qua khe răng-lưỡi. Tuyệt đối không chặn hơi đột ngột."
    },
    3: {
      title: "Ngày 3: Bật hơi (Aspiration) & Phân biệt Hữu thanh/Vô thanh",
      content: "Các phụ âm bật hơi vô thanh /p/, /t/, /k/ trong tiếng Anh đòi hỏi thời gian đóng mở cơ quan cấu âm (Voice Onset Time - VOT) dài hơn 40ms, tạo luồng hơi bật mạnh. Tiếng Việt không bật hơi các âm này (đọc PhD thành BSD, ten thành đen). Cơ học sửa: Tích tụ áp suất khí sau môi (với /p/) hoặc đầu lưỡi chạm ngạc (với /t/), sau đó mở đột ngột để luồng khí phụt mạnh ra ngoài."
    },
    4: {
      title: "Ngày 4: Cụm phụ âm cuối (Final Clusters) & Nối âm",
      content: "Tiếng Việt là ngôn ngữ đơn tiết, không có phụ âm cuối nhả hơi hay cụm phụ âm liên tiếp. Người Việt thường nuốt âm đuôi để tiết kiệm lực (như đọc builds thành view, risk thành race). Cơ học sửa: Áp dụng kỹ thuật Build-up (buil -> build -> builds). Phát âm âm dừng trước rồi nhả dần phụ âm xát cuối mà không đứt quãng luồng hơi."
    },
    5: {
      title: "Ngày 5: Nhịp điệu (Rhythm) & Trọng âm (Stress)",
      content: "Tiếng Anh là ngôn ngữ đẳng nhịp trọng âm (Stress-timed): khoảng cách thời gian giữa các âm tiết mang trọng âm chính trong câu là bằng nhau, các nguyên âm yếu còn lại bị lướt/giảm âm (vowel reduction). Người Việt thường nói đẳng thời âm tiết (mỗi từ một lực bằng nhau), gây vỡ nhịp. Cơ học sửa: Đập nhịp hoặc vỗ tay mạnh vào âm tiết mang trọng âm chính, lướt nhanh các từ phụ."
    },
    6: {
      title: "Ngày 6: Cộng hưởng (Resonance) & Giọng nói uy lực",
      content: "Giọng nói uy lực của bác sĩ khi thuyết trình y khoa được quyết định bởi cộng hưởng khoang ngực (Chest voice) tạo độ trầm ấm và cộng hưởng khoang mặt (Mask resonance) tạo độ đanh, rõ nét. Cơ học sửa: Thực hành bài tập Humming m khép môi đẩy âm lên khoang mũi và trán (Forward Placement), kết hợp hạ sâu cơ hoành mở rộng cổ họng."
    },
    7: {
      title: "Ngày 7: Tổng luyện & Kế hoạch duy trì 12 tuần",
      content: "Huấn luyện phát âm là quá trình chuyển hóa từ kiểm soát ý thức sang trí nhớ cơ bắp tự động (muscle memory). Test lại 10 câu chẩn đoán bằng ASR để đo lường độ chính xác (Accuracy). Thiết lập vòng lặp phản hồi thần kinh tự sửa lỗi (Self-monitoring) và duy trì luyện tập 15 phút mỗi ngày trong 12 tuần để hình thành phản xạ tự nhiên."
    }
  },
  // ── DAILY PRACTICE EXERCISES (Bài tập thực hành cho 7 ngày) ──
  dailyExercises: {
    1: [
      { id: "breath-basic", name: "Thở cơ hoành cơ bản", type: "breathing", targetSets: 3, desc: "Đặt tay lên bụng và ngực. Hít vào bụng phình (4s) -> Giữ (2s) -> Thở ra xẹp bụng (6s). Lặp lại 10 lần = 1 set." },
      { id: "lip-trills", name: "Lip Trills (Rung môi)", type: "warmup", targetSets: 2, desc: "Thổi hơi đều qua môi lỏng tạo tiếng rung 'brrrrr'. Giữ hơi liên tục 15-20 giây = 1 set." },
      { id: "straw-phonation", name: "Straw Phonation (SOVTE)", type: "warmup", targetSets: 3, desc: "Humming âm 'mmmm' qua ống hút nhỏ vào cốc nước tạo bong bóng đều đặn trong 15 giây = 1 set." },
      { id: "jaw-release", name: "Massage giải phóng hàm cắn", type: "warmup", targetSets: 2, desc: "Dùng ngón tay xoay tròn massage cơ masseter hai bên hàm cắn, há miệng hình chữ O thả lỏng = 1 set." }
    ],
    2: [
      { id: "dental-words-th", name: "Luyện âm ma sát vô thanh /θ/", type: "minimal-pairs", targetSets: 3, desc: "Luyện các từ: think, three, thick, thin, bath, path, mouth, teeth, ethics, theory. Đặt lưỡi giữa răng thổi hơi." },
      { id: "dental-words-dh", name: "Luyện âm ma sát hữu thanh /ð/", type: "minimal-pairs", targetSets: 3, desc: "Luyện các từ: this, they, breathe, bathe, mother, father, weather, brother. Rung dây thanh quản." },
      { id: "ethics-drill", name: "Từ khóa ETHICS Drill chuyên sâu", type: "words", targetSets: 5, desc: "Phát âm từ 'Ethics' /ˈeθ.ɪks/ chậm rãi và rõ ràng 20 lần = 1 set. Chú ý đặt lưỡi ở răng cửa cho âm /θ/ ở giữa." },
      { id: "dental-sentences", name: "ASR Test: Câu ma sát răng-lưỡi", type: "sentences", targetSets: 2, desc: "Đọc câu mẫu: 'Ethics is the foundation of any sustainable organization.' Mục tiêu: ASR nhận diện đúng 100%." }
    ],
    3: [
      { id: "paper-test", name: "Paper Test (Kiểm tra bật hơi)", type: "warmup", targetSets: 3, desc: "Đặt tờ giấy mỏng trước miệng 5cm. Phát âm /p/, /t/, /k/ làm tờ giấy bay mạnh = 1 set." },
      { id: "aspirated-pairs", name: "Minimal Pairs: Bật hơi vs Không bật", type: "minimal-pairs", targetSets: 3, desc: "Luyện các cặp từ: pin-bin, pat-bat, ten-den, two-do, time-dime, class-glass, curl-girl. Bật hơi mạnh hơn." },
      { id: "phd-drill", name: "PhD & Surgeon Drill", type: "words", targetSets: 4, desc: "Luyện phát âm từ 'PhD' /ˌpiː.eɪtʃˈdiː/ và 'Surgeon' /ˈsɜː.dʒən/ 15 lần = 1 set. Bật mạnh âm /p/." },
      { id: "voicing-sentences", name: "ASR Test: Câu phân biệt bật hơi", type: "sentences", targetSets: 2, desc: "Đọc câu mẫu: 'I am a surgeon and urologist, holding a Master of Science degree.' Chú ý bật hơi mạnh phụ âm." }
    ],
    4: [
      { id: "buildup-drill", name: "Kỹ thuật Build-up phụ âm cuối", type: "words", targetSets: 3, desc: "Thực hành chuỗi: buil -> build -> builds; ris -> risk -> risks; shape -> shaped. Đọc 10 chuỗi = 1 set." },
      { id: "final-clusters", name: "Luyện Cụm phụ âm đuôi phức tạp", type: "minimal-pairs", targetSets: 3, desc: "Luyện phát âm các từ: builds, risks, trust, robust, strict, prompts, contexts, accepts, facts, distinct." },
      { id: "linking-rules", name: "Nối âm thực tế (Linking)", type: "sentences", targetSets: 2, desc: "Nối âm: 'holds a', 'builds up', 'risk of'. Đọc 5 cụm nối âm liên tục 10 lần = 1 set." },
      { id: "clusters-sentences", name: "ASR Test: Câu cụm phụ âm cuối", type: "sentences", targetSets: 2, desc: "Đọc câu mẫu: 'Business ethics builds long-term reputation and stakeholder trust.'" }
    ],
    5: [
      { id: "stress-words", name: "Trọng âm từ đa âm tiết", type: "words", targetSets: 3, desc: "Luyện các từ: COR-po-rate, in-TEG-ri-ty, u-ro-LOG-i-cal, or-gan-i-ZA-tion, sus-tain-a-BIL-i-ty. Nhấn mạnh vào âm tiết viết hoa." },
      { id: "vowel-reduction", name: "Giảm âm nguyên âm yếu (Vowel Reduction)", type: "words", targetSets: 2, desc: "Luyện lướt nhanh âm /ə/ (schwa) trong các từ: corporate /ˈkɔːr.pər.ɪt/, professional /prəˈfeʃ.ən.əl/." },
      { id: "clapping-drills", name: "Clapping Drill (Vỗ tay tạo nhịp)", type: "sentences", targetSets: 3, desc: "Đọc câu mẫu và vỗ tay đều đặn vào các từ in đậm mang trọng âm chính để tạo nhịp điệu Stress-timed." },
      { id: "rhythm-sentences", name: "ASR Test: Nhịp điệu câu dài", type: "sentences", targetSets: 2, desc: "Đọc câu mẫu: 'What truly matters is a robust system of organizational accountability.'" }
    ],
    6: [
      { id: "mask-resonance", name: "Humming cộng hương khoang mặt", type: "warmup", targetSets: 3, desc: "Khép nhẹ môi, hum âm 'mmmm' hướng hơi lên khoang mặt, trán, mũi cảm nhận sự rung rung ở môi và cánh mũi = 1 set." },
      { id: "chest-voice", name: "Chest Voice Projection (Khoang ngực)", type: "warmup", targetSets: 3, desc: "Đặt tay lên xương ức, hạ giọng nói trầm ấm hướng âm thanh xuống khoang ngực. Phát âm 'OH-AH' cảm nhận độ rung xương ức = 1 set." },
      { id: "forward-placement", name: "Kỹ thuật Forward Placement", type: "words", targetSets: 2, desc: "Đẩy luồng hơi phát âm ra rìa trước của môi thay vì kẹt lại ở họng sau. Luyện các thuật ngữ niệu khoa." },
      { id: "resonance-sentences", name: "ASR Test: Thuyết trình giọng uy lực", type: "sentences", targetSets: 2, desc: "Đọc câu mẫu: 'Promoting ethics helps company success by creating distinct competitive advantages.'" }
    ],
    7: [
      { id: "diagnostic-test", name: "Diagnostic Re-evaluation (ASR)", type: "sentences", targetSets: 1, desc: "Ghi âm đọc lại toàn bộ các câu chẩn đoán ban đầu. AI so sánh độ cải thiện và đưa ra đánh giá." },
      { id: "self-monitoring", name: "Vòng lặp tự sửa lỗi (Self-monitoring)", type: "warmup", targetSets: 2, desc: "Nói tự do 2 phút về chủ đề chuyên môn, ghi âm lại, tự nghe lại và đếm xem mình mắc bao nhiêu lỗi nuốt âm đuôi = 1 set." },
      { id: "maintenance-plan", name: "Kế hoạch duy trì 12 tuần", type: "warmup", targetSets: 1, desc: "Thiết lập lịch nhắc nhở hàng ngày luyện tập 15 phút, tập trung vào 3 lỗi Pareto cốt lõi." }
    ]
  },
  // ── MINIMAL PAIRS ──────────────────────────────────────────
  minimalPairs: {
    dental_fricatives: {
      title: "Âm ma sát răng-lưỡi /θ/ vs /t/ & /ð/ vs /d/",
      description: "Phân biệt âm dental fricative — lỗi #1 trong bài thuyết trình",
      pairs: [
        { word1: "think", ipa1: "/θɪŋk/", word2: "tink", ipa2: "/tɪŋk/", audio_hint: "Đặt lưỡi giữa 2 hàm răng" },
        { word1: "three", ipa1: "/θriː/", word2: "tree", ipa2: "/triː/", audio_hint: "Lưỡi chạm răng trên" },
        { word1: "thick", ipa1: "/θɪk/", word2: "tick", ipa2: "/tɪk/", audio_hint: "Thổi nhẹ qua khe lưỡi-răng" },
        { word1: "thin", ipa1: "/θɪn/", word2: "tin", ipa2: "/tɪn/", audio_hint: "Hơi thở liên tục, không chặn" },
        { word1: "bath", ipa1: "/bɑːθ/", word2: "bat", ipa2: "/bæt/", audio_hint: "Giữ âm cuối kéo dài" },
        { word1: "path", ipa1: "/pɑːθ/", word2: "pat", ipa2: "/pæt/", audio_hint: "Lưỡi vẫn giữa răng ở cuối" },
        { word1: "this", ipa1: "/ðɪs/", word2: "dis", ipa2: "/dɪs/", audio_hint: "Rung dây thanh + lưỡi giữa răng" },
        { word1: "they", ipa1: "/ðeɪ/", word2: "day", ipa2: "/deɪ/", audio_hint: "/ð/ = rung, /d/ = chặn" },
        { word1: "breathe", ipa1: "/briːð/", word2: "breed", ipa2: "/briːd/", audio_hint: "Âm cuối: lưỡi giữa răng vs chặn" },
        { word1: "bathe", ipa1: "/beɪð/", word2: "bade", ipa2: "/beɪd/", audio_hint: "Cuối từ rung nhẹ" },
      ]
    },
    aspiration: {
      title: "Bật hơi /p/ vs /b/, /t/ vs /d/, /k/ vs /g/",
      description: "Sửa lỗi PhD→BSD, greed→breed",
      pairs: [
        { word1: "pin", ipa1: "/pʰɪn/", word2: "bin", ipa2: "/bɪn/", audio_hint: "Giấy bay = đúng /p/" },
        { word1: "pat", ipa1: "/pʰæt/", word2: "bat", ipa2: "/bæt/", audio_hint: "Bật mạnh từ môi" },
        { word1: "ten", ipa1: "/tʰen/", word2: "den", ipa2: "/den/", audio_hint: "Lưỡi bật mạnh từ ngạc" },
        { word1: "two", ipa1: "/tʰuː/", word2: "do", ipa2: "/duː/", audio_hint: "Luồng hơi mạnh hơn" },
        { word1: "time", ipa1: "/tʰaɪm/", word2: "dime", ipa2: "/daɪm/", audio_hint: "Hơi thở phụt ra trước" },
        { word1: "cap", ipa1: "/kʰæp/", word2: "gap", ipa2: "/ɡæp/", audio_hint: "Cuống lưỡi bật từ ngạc mềm" },
        { word1: "coat", ipa1: "/kʰoʊt/", word2: "goat", ipa2: "/ɡoʊt/", audio_hint: "Bật hơi mạnh từ họng" },
      ]
    },
    sibilants: {
      title: "Âm xát /ʃ/ vs /s/",
      description: "Sửa lỗi shaped→safe, professionally→play some ali",
      pairs: [
        { word1: "ship", ipa1: "/ʃɪp/", word2: "sip", ipa2: "/sɪp/", audio_hint: "Môi tròn vs phẳng" },
        { word1: "she", ipa1: "/ʃiː/", word2: "see", ipa2: "/siː/", audio_hint: "/ʃ/ = lưỡi lùi + môi tròn" },
        { word1: "shave", ipa1: "/ʃeɪv/", word2: "save", ipa2: "/seɪv/", audio_hint: "Liên hệ: shaped vs safe" },
        { word1: "mash", ipa1: "/mæʃ/", word2: "mass", ipa2: "/mæs/", audio_hint: "Cuối từ cũng khác" },
      ]
    }
  },
  // ── FINAL CONSONANT CLUSTERS ───────────────────────────────
  finalClusters: {
    title: "Cụm phụ âm cuối — Lỗi Pareto #1 (20.5%)",
    description: "9/50 lỗi trong bài thuyết trình xuất phát từ việc nuốt âm cuối",
    levels: [
      {
        name: "Level 1: Âm cuối đơn",
        words: [
          { word: "build", target: "/bɪld/", error: "→ buil", focus: "Giữ /d/ cuối" },
          { word: "risk", target: "/rɪsk/", error: "→ ris", focus: "Bật /k/ cuối" },
          { word: "trust", target: "/trʌst/", error: "→ trus", focus: "Bật /t/ cuối" },
          { word: "safe", target: "/seɪf/", error: "shape → safe", focus: "/f/ vs /p/" },
          { word: "conclude", target: "/kənˈkluːd/", error: "→ can lose", focus: "Giữ /d/ cuối" },
        ]
      },
      {
        name: "Level 2: Cụm 2 phụ âm",
        words: [
          { word: "builds", target: "/bɪldz/", error: "→ views", focus: "/ld/ + /z/" },
          { word: "risks", target: "/rɪsks/", error: "→ race", focus: "/sk/ + /s/" },
          { word: "shaped", target: "/ʃeɪpt/", error: "→ safe", focus: "/p/ + /t/" },
          { word: "robust", target: "/rəˈbʌst/", error: "→ robot", focus: "/s/ + /t/" },
          { word: "distinct", target: "/dɪˈstɪŋkt/", error: "→ this thing", focus: "/ŋk/ + /t/" },
        ]
      },
      {
        name: "Level 3: Cụm 3+ phụ âm",
        words: [
          { word: "attracts", target: "/əˈtrækts/", error: "→ direct", focus: "/k/ + /t/ + /s/" },
          { word: "strengths", target: "/streŋkθs/", error: "khó nhất", focus: "/ŋk/ + /θ/ + /s/" },
          { word: "sixths", target: "/sɪksθs/", error: "—", focus: "/k/ + /s/ + /θ/ + /s/" },
          { word: "prompts", target: "/prɒmpts/", error: "—", focus: "/m/ + /p/ + /t/ + /s/" },
          { word: "contexts", target: "/ˈkɒnteksts/", error: "—", focus: "/k/ + /s/ + /t/ + /s/" },
        ]
      }
    ]
  },
  // ── WORD STRESS PATTERNS ───────────────────────────────────
  wordStress: {
    title: "Trọng âm từ — Sửa lỗi Fragmentation",
    description: "corporate→carburetor, integrity→into crazy",
    words: [
      { word: "corporate", stress: "COR-po-rate", ipa: "/ˈkɔːr.pər.ɪt/", error: "→ carburetor", syllables: 3 },
      { word: "integrity", stress: "in-TEG-ri-ty", ipa: "/ɪnˈteɡ.rɪ.ti/", error: "→ into crazy", syllables: 4 },
      { word: "urological", stress: "u-ro-LOG-i-cal", ipa: "/ˌjʊər.əˈlɒdʒ.ɪ.kəl/", error: "→ neurological", syllables: 5 },
      { word: "organization", stress: "or-gan-i-ZA-tion", ipa: "/ˌɔːr.ɡən.aɪˈzeɪ.ʃən/", error: "—", syllables: 5 },
      { word: "sustainability", stress: "sus-tain-a-BIL-i-ty", ipa: "/səˌsteɪ.nəˈbɪl.ɪ.ti/", error: "—", syllables: 6 },
      { word: "accountability", stress: "ac-count-a-BIL-i-ty", ipa: "/əˌkaʊn.təˈbɪl.ɪ.ti/", error: "—", syllables: 6 },
      { word: "professional", stress: "pro-FES-sion-al", ipa: "/prəˈfeʃ.ən.əl/", error: "→ play some ali", syllables: 4 },
      { word: "compliance", stress: "com-PLI-ance", ipa: "/kəmˈplaɪ.əns/", error: "—", syllables: 3 },
      { word: "presentation", stress: "pre-sen-TA-tion", ipa: "/ˌprez.ənˈteɪ.ʃən/", error: "→ represent", syllables: 4 },
      { word: "retaliation", stress: "re-tal-i-A-tion", ipa: "/rɪˌtæl.iˈeɪ.ʃən/", error: "—", syllables: 5 },
      { word: "ethical", stress: "ETH-i-cal", ipa: "/ˈeθ.ɪ.kəl/", error: "→ addicts", syllables: 3 },
      { word: "competitive", stress: "com-PET-i-tive", ipa: "/kəmˈpet.ɪ.tɪv/", error: "—", syllables: 4 },
    ]
  },
  // ── SHADOWING SENTENCES (from actual presentation) ─────────
  shadowingSentences: {
    title: "Shadowing — Bài thuyết trình Business Ethics",
    description: "Luyện lại chính bài nói của bạn với phát âm chuẩn",
    sentences: [
      {
        text: "Good morning, teacher. My name is Le Trong Thien Long.",
        focus: "Greeting + proper noun",
        difficulty: 1,
        tips: "Ngắt nhịp sau 'teacher'. Nói tên rõ ràng, chậm."
      },
      {
        text: "I am a surgeon and urologist, holding a Master of Science degree.",
        focus: "Medical terminology + final /st/ in 'urologist'",
        difficulty: 2,
        tips: "u-ROL-o-gist: nhấn âm 2. MAS-ter: bật /t/ rõ."
      },
      {
        text: "Ethics is the foundation of any sustainable organization.",
        focus: "KEY SENTENCE — /θ/ in ethics, final /n/ in organization",
        difficulty: 3,
        tips: "ETH-ics: lưỡi giữa răng! foun-DA-tion: nhấn âm 2."
      },
      {
        text: "Business ethics builds long-term reputation and stakeholder trust.",
        focus: "builds /ldz/, trust /st/",
        difficulty: 3,
        tips: "BUILDS: giữ /l/ + /d/ + /z/. TRUST: bật /st/ cuối."
      },
      {
        text: "It ensures strict legal compliance, avoiding the catastrophic risk of lawsuits.",
        focus: "risk /sk/, strict /kt/",
        difficulty: 4,
        tips: "RISK: giữ /s/ + /k/. STRICT: bật /kt/. Catastrophic: ca-ta-STROPH-ic."
      },
      {
        text: "Ethics drives sustainable value over short-term greed.",
        focus: "drives /vz/, greed vs breed",
        difficulty: 3,
        tips: "DRIVES: giữ /v/ + /z/. GREED: /ɡ/ không phải /b/."
      },
      {
        text: "They aim to guide corporate decision-making.",
        focus: "Stress-timing, corporate stress",
        difficulty: 4,
        tips: "THEY AIM: nối âm. COR-po-rate: 3 âm tiết, nhấn 1."
      },
      {
        text: "Promoting ethics helps company success by creating distinct competitive advantages.",
        focus: "distinct /ŋkt/, competitive stress",
        difficulty: 5,
        tips: "dis-TINCT: bật /ŋkt/. com-PET-i-tive: nhấn âm 2."
      },
      {
        text: "Implement protected whistleblowing channels so employees feel safe to report misconduct.",
        focus: "Complex sentence, linking",
        difficulty: 5,
        tips: "IM-ple-ment: nhấn âm 1. WHIS-tle-blow-ing: nhấn âm 1."
      },
      {
        text: "What truly matters is a robust system of organizational accountability and a personal moral compass.",
        focus: "robust /st/, moral compass (NOT Mortal Kombat!)",
        difficulty: 5,
        tips: "ro-BUST: giữ /st/. MOR-al COM-pass: 2 từ riêng biệt, nhấn âm 1 mỗi từ."
      }
    ]
  },
  // ── BREATHING EXERCISES (General Reference) ─────────────────
  breathingExercises: [
    {
      name: "Thở cơ hoành cơ bản (Speech Breathing)",
      duration: "5 phút",
      steps: [
        "Nằm ngửa hoặc đứng thẳng, vai thả lỏng hoàn toàn",
        "Đặt 1 tay lên ngực, 1 tay lên bụng",
        "Hít vào bằng MŨI 4 nhịp — chỉ tay trên BỤNG nâng lên (cơ hoành hạ xuống)",
        "Giữ hơi 2 nhịp (đóng nhẹ nắp thanh quản)",
        "Thở ra bằng MIỆNG 6 nhịp — bụng từ từ xẹp xuống nén hơi đều",
        "Tay trên NGỰC không được di chuyển"
      ]
    },
    {
      name: "Stomach Vacuum (Thành bụng phẳng TVA)",
      duration: "5 phút",
      steps: [
        "Đứng cúi nhẹ người, đặt hai tay lên gối",
        "Hít vào sâu bằng bụng qua mũi trong 3 giây",
        "Thở ra thật sạch hơi qua miệng trong 5 giây",
        "Hóp rốn sâu hết mức về cột sống và hướng lên lồng ngực (tạo phễu chân không)",
        "Giữ tĩnh nín thở co cơ đẳng trường từ 15-20 giây"
      ]
    },
    {
      name: "Valsalva Maneuver (Valsalva tạ nặng)",
      duration: "3 phút",
      steps: [
        "Hít sâu bằng miệng (80% dung tích phổi) trong 3 giây",
        "Ép khí xuống bụng căng phình 360 độ (bụng trước, sườn, lưng dưới)",
        "Đóng chặt thanh quản, siết cứng bụng (core bracing) tạo áp suất ổ bụng IAP",
        "Nâng tạ (Squat/Deadlift) và nín thở giữ cột sống thẳng thắt lưng",
        "Thở mạnh ra sau khi vượt qua sticking point của động tác nâng"
      ]
    }
  ],
  // ── 7-DAY SCHEDULE ─────────────────────────────────────────
  schedule: {
    title: "LỊCH TRÌNH 7 NGÀY HARDCORE",
    days: [
      {
        day: 1,
        title: "Chẩn đoán & Giải phóng",
        morning: "Baseline ASR test + Thở cơ hoành + Jaw/Tongue release",
        midday: "Lip trills + Humming + Straw phonation",
        afternoon: "Nghe phân biệt minimal pairs (chỉ NGHE, chưa nói)",
        evening: "Ghi âm đọc 5 câu → chạy qua Voice Typing → đếm lỗi",
        totalHours: "45-60 phút",
      },
      {
        day: 2,
        title: "Dental Fricatives /θ/ /ð/",
        morning: "Mirror drill: đặt lưỡi giữa răng + Minimal pairs /θ/ vs /t/",
        midday: "Từ khóa ETHICS drill × 100 lần + Câu có 'ethics'",
        afternoon: "Shadowing BBC Pronunciation videos về /θ/ /ð/",
        evening: "Ghi âm 10 câu có /θ/ /ð/ → test ASR",
        totalHours: "60-90 phút",
      },
      {
        day: 3,
        title: "Aspiration & Voicing",
        morning: "Paper test /p/ /t/ /k/ + Minimal pairs voiced/voiceless",
        midday: "PhD drill + /ʃ/ vs /s/ (shaped vs safe) + Trust drill",
        afternoon: "Shadowing medical presentation videos",
        evening: "Ghi âm + ASR test cho từ bật hơi",
        totalHours: "60-90 phút",
      },
      {
        day: 4,
        title: "Final Clusters & Linking",
        morning: "Build-up drill: buil→build→builds × tất cả từ lỗi",
        midday: "Linking rules + Nối âm trong câu thực tế",
        afternoon: "Shadowing đoạn dài từ bài Business Ethics",
        evening: "Ghi âm full paragraph + ASR test",
        totalHours: "60-90 phút",
      },
      {
        day: 5,
        title: "Rhythm & Stress",
        morning: "Clapping drill + Vowel reduction + Word stress patterns",
        midday: "Jazz chants với thuật ngữ y khoa",
        afternoon: "Shadowing TED Talk (Atul Gawande hoặc tương tự)",
        evening: "Ghi âm đoạn thuyết trình → so sánh rhythm",
        totalHours: "60-90 phút",
      },
      {
        day: 6,
        title: "Resonance & Giọng uy lực",
        morning: "Humming → Mask resonance → Projection drill",
        midday: "Pitch variety + Pause power + Falling amplitude",
        afternoon: "Voiceover dubbing TED Talk",
        evening: "Ghi âm presentation voice → đánh giá charisma",
        totalHours: "60-90 phút",
      },
      {
        day: 7,
        title: "Tổng luyện & Kiểm tra",
        morning: "Full warm-up (tất cả bài tập từ 6 ngày)",
        midday: "Full presentation rehearsal × 3 lần",
        afternoon: "Final ASR test + So sánh Ngày 1 vs Ngày 7",
        evening: "Self-assessment + Lập kế hoạch tuần 2-12",
        totalHours: "60-90 phút",
      }
    ]
  },
  // ── UROLOGY DICTIONARY ─────────────────────────────────────
  urologyDictionary: {
    title: "Từ điển phát âm chuyên ngành Niệu khoa (Urology Dictionary)",
    description: "Tra cứu IPA và nghe phát âm chuẩn các thuật ngữ Ngoại tiết niệu quan trọng của BS. Long.",
    words: [
      { word: "urologist", ipa: "/jʊəˈrɒl.ə.dʒɪst/", meaning: "Bác sĩ chuyên khoa niệu", advice: "Nhấn âm 2 (ROL). Chú ý phụ âm cuối /st/." },
      { word: "urological", ipa: "/ˌjʊə.rəˈlɒdʒ.ɪ.kəl/", meaning: "Thuộc niệu khoa", advice: "Nhấn âm 3 (LOG). Đọc chậm 5 âm tiết: u-ro-log-i-cal." },
      { word: "prostate", ipa: "/ˈprɒs.teɪt/", meaning: "Tuyến tiền liệt", advice: "Nhấn âm 1 (PROS). Không đọc nhầm thành 'pro-state'." },
      { word: "nephrolithotomy", ipa: "/ˌnef.rəʊ.lɪˈθɒt.ə.mi/", meaning: "Phẫu thuật lấy sỏi thận", advice: "Nhấn âm 4 (THOT). Có âm ma sát răng-lưỡi /θ/ ở giữa." },
      { word: "cystoscopy", ipa: "/sɪˈstɒs.kə.pi/", meaning: "Nội soi bàng quang", advice: "Nhấn âm 2 (STOS). Đọc rõ các phụ âm xát /s/." },
      { word: "lithotripsy", ipa: "/ˈlɪθ.ə.ˌtrɪp.si/", meaning: "Tán sỏi", advice: "Nhấn âm 1 (LITH). Có âm ma sát răng-lưỡi /θ/ đầu tiên." },
      { word: "incontinence", ipa: "/ɪnˈkɒn.tɪ.nəns/", meaning: "Tiểu không kiểm soát", advice: "Nhấn âm 2 (KON). Chú ý phụ âm cuối /ns/." },
      { word: "laparoscopic", ipa: "/ˌlæp.ər.əˈskɒp.ɪk/", meaning: "Thuộc nội soi ổ bụng", advice: "Nhấn âm 4 (SKOP). Chú ý /k/ bật ở cuối." },
      { word: "ureter", ipa: "/jʊəˈriː.tər/", meaning: "Niệu quản", advice: "Nhấn âm 2 (REE). Lưỡi hơi cong nhẹ âm cuối." },
      { word: "catheter", ipa: "/ˈkæθ.ə.tər/", meaning: "Ống thông (sonde)", advice: "Nhấn âm 1 (CATH). Có âm ma sát răng-lưỡi /θ/ ở giữa." },
      { word: "nephrology", ipa: "/nɪˈfrɒl.ə.dʒi/", meaning: "Thận học", advice: "Nhấn âm 2 (ROL). Tránh nhầm với urology." },
      { word: "stones", ipa: "/stəʊnz/", meaning: "Sỏi (tiết niệu)", advice: "Đọc rõ âm đầu /st/ và âm cuối /nz/." }
    ]
  }
};

// Export for use in app
if (typeof module !== 'undefined') module.exports = EXERCISES;
