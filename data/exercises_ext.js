// ============================================================
// EXTENSION PACK — Nội dung mở rộng có chủ đích (evidence-based)
// Nguyên tắc: HVPT (đa ngữ cảnh) + Functional Load (ưu tiên âm gây
// mất hiểu nhiều nhất cho người Việt) + đúng lĩnh vực của bác sĩ.
// File này CHỈ BỔ SUNG vào EXERCISES, không sửa nội dung gốc.
// ============================================================
(function () {
  if (typeof EXERCISES === 'undefined') return;
  const E = EXERCISES;

  // Nhãn ngắn cho nút nhóm minimal pairs (gồm cả nhóm cũ)
  if (E.minimalPairs.dental_fricatives) E.minimalPairs.dental_fricatives.label = '🦷 /θ/ vs /t/';
  if (E.minimalPairs.aspiration) E.minimalPairs.aspiration.label = '💨 /p/ /t/ /k/';
  if (E.minimalPairs.sibilants) E.minimalPairs.sibilants.label = '🌊 /ʃ/ vs /s/';

  // ── BỔ SUNG cặp vào nhóm /θ/ /ð/ (functional load cao, lỗi #3 của bác sĩ) ──
  E.minimalPairs.dental_fricatives.pairs.push(
    { word1: 'thigh', ipa1: '/θaɪ/', word2: 'tie', ipa2: '/taɪ/', audio_hint: 'Lưỡi giữa răng cho /θ/' },
    { word1: 'thought', ipa1: '/θɔːt/', word2: 'taught', ipa2: '/tɔːt/', audio_hint: '/θ/ ma sát vs /t/ bật' },
    { word1: 'thread', ipa1: '/θred/', word2: 'tread', ipa2: '/tred/', audio_hint: 'Đầu lưỡi giữa răng' },
    { word1: 'mouth', ipa1: '/maʊθ/', word2: 'mouse', ipa2: '/maʊs/', audio_hint: 'Âm cuối /θ/ vs /s/' },
    { word1: 'thin', ipa1: '/θɪn/', word2: 'sin', ipa2: '/sɪn/', audio_hint: '/θ/ vs /s/ — đừng xì hóa' }
  );

  // ── NHÓM MỚI: /l/ vs /r/ (lỗi rất nặng của người Việt) ──
  E.minimalPairs.liquids_lr = {
    label: '👅 /l/ vs /r/',
    title: 'Âm bên /l/ vs âm cong /r/',
    description: 'Người Việt thường lẫn /l/–/r/. /l/: đầu lưỡi CHẠM lợi. /r/: đầu lưỡi CONG, không chạm.',
    pairs: [
      { word1: 'light', ipa1: '/laɪt/', word2: 'right', ipa2: '/raɪt/', audio_hint: '/l/ chạm lợi, /r/ cong lưỡi' },
      { word1: 'lice', ipa1: '/laɪs/', word2: 'rice', ipa2: '/raɪs/', audio_hint: 'Đầu lưỡi: chạm vs không chạm' },
      { word1: 'glass', ipa1: '/ɡlɑːs/', word2: 'grass', ipa2: '/ɡrɑːs/', audio_hint: '/gl/ vs /gr/' },
      { word1: 'collect', ipa1: '/kəˈlekt/', word2: 'correct', ipa2: '/kəˈrekt/', audio_hint: 'Cặp dễ nhầm khi nói nhanh' },
      { word1: 'play', ipa1: '/pleɪ/', word2: 'pray', ipa2: '/preɪ/', audio_hint: '/pl/ vs /pr/' },
      { word1: 'long', ipa1: '/lɒŋ/', word2: 'wrong', ipa2: '/rɒŋ/', audio_hint: '/l/ vs /r/ đầu từ' }
    ]
  };

  // ── NHÓM MỚI: /v/ vs /w/ (và tránh /b/) ──
  E.minimalPairs.labial_vw = {
    label: '👄 /v/ vs /w/',
    title: 'Răng-môi /v/ vs môi tròn /w/',
    description: '/v/: răng cửa trên CHẠM môi dưới + rung. /w/: tròn môi, không chạm răng. Người Việt hay lẫn.',
    pairs: [
      { word1: 'vine', ipa1: '/vaɪn/', word2: 'wine', ipa2: '/waɪn/', audio_hint: 'Răng chạm môi vs tròn môi' },
      { word1: 'vest', ipa1: '/vest/', word2: 'west', ipa2: '/west/', audio_hint: '/v/ rung răng-môi' },
      { word1: 'vet', ipa1: '/vet/', word2: 'wet', ipa2: '/wet/', audio_hint: 'Răng cửa trên chạm môi dưới' },
      { word1: 'verse', ipa1: '/vɜːs/', word2: 'worse', ipa2: '/wɜːs/', audio_hint: '/v/ vs /w/ đầu từ' },
      { word1: 'vary', ipa1: '/ˈveəri/', word2: 'wary', ipa2: '/ˈweəri/', audio_hint: 'Giữ răng chạm môi cho /v/' }
    ]
  };

  // ── BỔ SUNG từ vào cụm phụ âm cuối (lỗi Pareto #1 của bác sĩ) ──
  if (E.finalClusters && E.finalClusters.levels) {
    E.finalClusters.levels[0].words.push(
      { word: 'act', target: '/ækt/', error: '→ ach', focus: 'Bật /kt/ cuối' },
      { word: 'helped', target: '/helpt/', error: '→ help', focus: '/p/ + /t/' },
      { word: 'world', target: '/wɜːld/', error: '→ wor', focus: '/l/ + /d/' },
      { word: 'asked', target: '/ɑːskt/', error: '→ ask', focus: '/s/+/k/+/t/' }
    );
    E.finalClusters.levels[1].words.push(
      { word: 'facts', target: '/fækts/', error: '→ fax', focus: '/k/+/t/+/s/' },
      { word: 'texts', target: '/teksts/', error: '→ tex', focus: '/k/+/s/+/t/+/s/' },
      { word: 'months', target: '/mʌnθs/', error: '→ month', focus: '/n/+/θ/+/s/' },
      { word: 'clothes', target: '/kləʊðz/', error: '→ close', focus: '/ð/ + /z/' }
    );
    E.finalClusters.levels[2].words.push(
      { word: 'fifths', target: '/fɪfθs/', error: 'rất khó', focus: '/f/+/θ/+/s/' },
      { word: 'glimpsed', target: '/ɡlɪmpst/', error: '—', focus: '/m/+/p/+/s/+/t/' },
      { word: 'depths', target: '/depθs/', error: '—', focus: '/p/+/θ/+/s/' }
    );
  }

  // ── BỔ SUNG câu shadowing đúng lĩnh vực (y khoa + đạo đức nghề) ──
  // Text-only + focus + tips (không gắn IPA từng từ để tránh sai số).
  if (E.shadowingSentences && E.shadowingSentences.sentences) {
    E.shadowingSentences.sentences.push(
      { text: 'The patient presented with acute flank pain and gross hematuria.', focus: 'Thuật ngữ y khoa + cụm /nt/ /s/', difficulty: 4, tips: 'pa-tient: /ʃ/. flank: giữ /ŋk/. hematuria: he-ma-TU-ri-a.' },
      { text: 'We performed a percutaneous nephrolithotomy to remove the staghorn calculus.', focus: 'Trọng âm thuật ngữ phẫu thuật', difficulty: 5, tips: 'per-cu-TA-ne-ous. neph-ro-li-THOT-o-my. CAL-cu-lus.' },
      { text: 'Informed consent must be obtained before any invasive procedure.', focus: 'Cụm /nt/ /md/ + nối âm', difficulty: 4, tips: 'in-FORMED: giữ /md/. con-SENT: bật /nt/. ob-TAINED.' },
      { text: 'Evidence-based medicine integrates clinical expertise with current research.', focus: 'Trọng âm đa âm tiết', difficulty: 5, tips: 'EV-i-dence. IN-te-grates. ex-per-TISE. re-SEARCH (nhấn 2).' },
      { text: 'Antibiotic stewardship reduces the risk of resistant infections.', focus: 'risk /sk/, resistant /nt/', difficulty: 4, tips: 'an-ti-bi-OT-ic. STEW-ard-ship. re-SIS-tant.' }
    );
  }

  // ── BỔ SUNG thuật ngữ niệu khoa / y khoa ──
  if (E.urologyDictionary && E.urologyDictionary.words) {
    E.urologyDictionary.words.push(
      { word: 'hematuria', ipa: '/ˌhiː.məˈtʊə.ri.ə/', meaning: 'Tiểu máu', advice: 'Nhấn âm 3 (TU). 5 âm tiết: he-ma-tu-ri-a.' },
      { word: 'calculus', ipa: '/ˈkæl.kjə.ləs/', meaning: 'Sỏi (kết thạch)', advice: 'Nhấn âm 1 (CAL). Âm cuối /ləs/ nhẹ.' },
      { word: 'percutaneous', ipa: '/ˌpɜː.kjuˈteɪ.ni.əs/', meaning: 'Qua da', advice: 'Nhấn âm 3 (TA). Lướt các âm trước.' },
      { word: 'hydronephrosis', ipa: '/ˌhaɪ.drəʊ.nɪˈfrəʊ.sɪs/', meaning: 'Thận ứ nước', advice: 'Nhấn âm 4 (FRO). Đọc rõ 5 âm tiết.' },
      { word: 'benign', ipa: '/bɪˈnaɪn/', meaning: 'Lành tính', advice: 'Nhấn âm 2 (NIGN). Âm /g/ CÂM — đọc /bɪˈnaɪn/.' },
      { word: 'malignant', ipa: '/məˈlɪɡ.nənt/', meaning: 'Ác tính', advice: 'Nhấn âm 2 (LIG). Cụm cuối /nt/.' },
      { word: 'biopsy', ipa: '/ˈbaɪ.ɒp.si/', meaning: 'Sinh thiết', advice: 'Nhấn âm 1 (BI). Bật nhẹ /p/.' },
      { word: 'anastomosis', ipa: '/əˌnæs.təˈməʊ.sɪs/', meaning: 'Miệng nối', advice: 'Nhấn âm 4 (MO). Đọc chậm 5 âm tiết.' }
    );
  }
})();
