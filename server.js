const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const PROGRESS_FILE = path.join(__dirname, 'data', 'user_progress.json');

// Helper to write JSON atomically
function writeJsonAtomic(filePath, data) {
  const tempPath = filePath + '.tmp';
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
}

// ── API: Get user progress ────────────────────────────────────
app.get('/api/progress', (req, res) => {
  try {
    if (!fs.existsSync(PROGRESS_FILE)) {
      const defaultProgress = {
        currentDay: 1,
        sessions: 0,
        totalMinutes: 0,
        lastAccuracy: '—',
        notes: '',
        completedExercises: []
      };
      writeJsonAtomic(PROGRESS_FILE, defaultProgress);
      return res.json(defaultProgress);
    }
    const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    res.json(data);
  } catch (err) {
    console.error('Error reading progress:', err);
    res.status(500).json({ error: 'Failed to read progress file' });
  }
});

// ── API: Update user progress ─────────────────────────────────
app.post('/api/progress', (req, res) => {
  try {
    const newProgress = req.body;
    writeJsonAtomic(PROGRESS_FILE, newProgress);
    res.json({ message: 'Progress saved successfully', progress: newProgress });
  } catch (err) {
    console.error('Error saving progress:', err);
    res.status(500).json({ error: 'Failed to save progress file' });
  }
});

// ── API: Learning Data (SRS + nhật ký lỗi data-driven) ────────
const LEARNING_FILE = path.join(__dirname, 'data', 'learning_data.json');

app.get('/api/learning-data', (req, res) => {
  try {
    if (!fs.existsSync(LEARNING_FILE)) {
      return res.json({ attempts: [], srs: {} });
    }
    const data = JSON.parse(fs.readFileSync(LEARNING_FILE, 'utf8'));
    res.json(data);
  } catch (err) {
    console.error('Error reading learning data:', err);
    res.status(500).json({ error: 'Failed to read learning data' });
  }
});

app.post('/api/learning-data', (req, res) => {
  try {
    const body = req.body || {};
    const safe = { attempts: body.attempts || [], srs: body.srs || {} };
    writeJsonAtomic(LEARNING_FILE, safe);
    res.json({ message: 'Learning data saved', count: safe.attempts.length });
  } catch (err) {
    console.error('Error saving learning data:', err);
    res.status(500).json({ error: 'Failed to save learning data' });
  }
});

// ── API: AI Pronunciation Feedback Coach ──────────────────────
app.post('/api/ai-feedback', (req, res) => {
  const { targetText, spokenText } = req.body;
  if (!targetText || !spokenText) {
    return res.status(400).json({ error: 'Missing targetText or spokenText' });
  }

  const targetClean = targetText.toLowerCase().replace(/[.,!?;:'"]/g, '');
  const spokenClean = spokenText.toLowerCase().replace(/[.,!?;:'"]/g, '');

  const targetWords = targetClean.split(/\s+/).filter(w => w.length > 0);
  const spokenWords = spokenClean.split(/\s+/).filter(w => w.length > 0);

  const mismatches = [];
  const feedbacks = [];

  // Simple word matching
  targetWords.forEach(tw => {
    const found = spokenWords.some(sw => sw === tw || levenshtein(sw, tw) <= 1);
    if (!found) {
      mismatches.push(tw);
      const advice = getMechanicalFeedback(tw);
      feedbacks.push({ word: tw, advice: advice });
    }
  });

  const accuracy = Math.round(((targetWords.length - mismatches.length) / targetWords.length) * 100);

  res.json({
    accuracy: Math.max(0, accuracy),
    mismatches: mismatches,
    feedbacks: feedbacks
  });
});

// Levenshtein helper
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i-1] === a[j-1]) {
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i-1][j-1] + 1,
          matrix[i][j-1] + 1,
          matrix[i-1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Generate mechanical articulator instructions based on Day 1-7 guidelines and specific vocabulary
function getMechanicalFeedback(word) {
  const cleanWord = word.toLowerCase().trim().replace(/[.,!?;:'"]/g, '');

  // 1. TỪ ĐIỂN CẤU ÂM CHI TIẾT CHO 10 CÂU SHADOWING CỦA BS. LONG
  const SHADOWING_WORDS_DICT = {
    // Câu 1
    good: '🦷 [Âm bật hữu thanh /d/ ở cuối]: Đầu lưỡi chạm ngạc cứng chặn luồng hơi, rung nhẹ dây thanh quản rồi bật nhẹ hơi tạo âm /d/. Tránh đọc thành "gút" bị nuốt mất âm cuối.',
    morning: '👅 [Âm mũi /ŋ/ ở cuối]: Phát âm /ˈmɔː.nɪŋ/. Cơ học: Hạ ngạc mềm xuống, nâng cuống lưỡi chạm ngạc mềm chặn hoàn toàn đường miệng để luồng hơi đi lên và vang qua khoang mũi.',
    teacher: '🥁 [Trọng âm từ /ˈtiː.tʃər/]: Nhấn mạnh vào âm tiết đầu. Chú ý phụ âm ghép /tʃ/ ở giữa: chu tròn môi, đầu lưỡi chạm ngạc cứng chặn hơi rồi bật mạnh luồng hơi ra ngoài.',
    name: '👄 [Âm khép môi cuối /m/]: Chú ý phát âm nguyên âm đôi /eɪ/ (trượt nhanh từ e sang i) và khép chặt hai môi ở cuối để âm rung /m/ vang qua mũi.',
    
    // Câu 2
    and: '🦷 [Âm bật hữu thanh /d/ ở cuối]: Người Việt thường nuốt âm cuối này. Cơ học: Đầu lưỡi chạm ngạc cứng chặn hơi, rung nhẹ dây thanh rồi bật nhẹ hơi ra ngoài. Đồng thời, hạ sâu quai hàm dưới mở rộng miệng cho nguyên âm dẹt /æ/.',
    surgeon: '🩺 [Thuật ngữ chuyên ngành /ˈsɜː.dʒən/]: Trọng âm nhấn âm tiết 1. Âm đầu /s/ xát nhẹ. Âm giữa /dʒ/: chu tròn môi, bật hơi và rung mạnh dây thanh quản.',
    urologist: '🩺 [Thuật ngữ /jʊəˈrɒl.ə.dʒɪst/]: Trọng âm nhấn âm 2 (ROL). Chú ý phụ âm cuối ghép /st/: xì âm /s/ rồi bật hơi âm /t/ dứt khoát không nuốt.',
    holding: '👅 [Nguyên âm đôi /oʊ/ + âm cuối]: Phát âm /ˈhoʊl.dɪŋ/. Âm /l/ ở giữa: đưa đầu lưỡi chạm lợi răng cửa hàm trên rồi nhả nhanh sang âm tiết sau.',
    master: '🥁 [Trọng âm từ + Âm ma sát giữa]: Trọng âm nhấn âm 1 MAS-ter /ˈmɑː.stər/. Chú ý âm ma sát /s/ ở giữa: khép răng, thổi hơi xì nhẹ trước khi chuyển sang bật âm /t/.',
    of: '👄 [Âm ma sát răng-môi hữu thanh]: Phát âm chuẩn là /əv/ hoặc /ɒv/ (không phải /of/). Cơ học: Răng cửa hàm trên chạm nhẹ môi dưới, rung nhẹ dây thanh tạo luồng hơi ma sát hữu thanh nhẹ /v/.',
    science: '🦷 [Âm ma sát kép cuối từ /ns/]: Phát âm /ˈsaɪ.əns/. Người Việt thường nuốt âm xì cuối. Cơ học: Phát âm rõ /saɪ/, lướt qua /ən/, khép răng thổi hơi xì /s/ kéo dài rõ nét.',
    degree: '🥁 [Trọng âm từ /dɪˈɡriː/]: Nhấn mạnh âm 2 GREE. Đọc lướt nhanh âm tiết đầu dɪ, sau đó nhấn mạnh và kéo dài nguyên âm e dài /iː/ ở âm tiết sau.',

    // Câu 3 & 4
    ethics: '🦷 [Âm răng-lưỡi vô thanh /θ/]: Phát âm /ˈeθ.ɪks/. Đặt đầu lưỡi nằm nhẹ giữa răng cửa trên và dưới. Thổi hơi nhẹ qua khe răng-lưỡi tạo âm ma sát liên tục, kết thúc bằng âm xì /s/.',
    foundation: '🥁 [Trọng âm từ /faʊnˈdeɪ.ʃən/]: Trọng âm nhấn âm 2 DAY /deɪ/. Chú ý âm ma sát răng-môi /f/ ban đầu và lướt nhẹ âm cuối /ʃən/.',
    sustainable: '🥁 [Trọng âm từ /səˈsteɪ.nə.bəl/]: Nhấn mạnh âm 2 TAI /teɪ/. Tránh đọc đều giọng.',
    organization: '🥁 [Trọng âm từ /ˌɔːr.ɡən.aɪˈzeɪ.ʃən/]: Trọng âm chính nhấn vào âm tiết 4 ZA /zeɪ/. Lướt nhanh các âm trước.',
    business: '🥁 [Trọng âm từ /ˈbɪz.nɪs/]: Phát âm 2 âm tiết (không phải 3). Nhấn âm 1. Chú ý âm xát hữu thanh /z/ ở giữa: khép răng, rung thanh quản thổi hơi xì nhẹ.',
    builds: '🔗 [Cụm phụ âm cuối /ldz/]: Áp dụng kỹ thuật Build-up: buil -> build -> builds. Giữ /l/, bật nhẹ /d/ rồi nhả hơi xát hữu thanh /z/ liên tục.',
    reputation: '🥁 [Trọng âm từ /ˌrep.jəˈteɪ.ʃən/]: Trọng âm chính nhấn vào âm tiết 3 TA /teɪ/. Bật nhẹ hơi /p/ ở âm tiết đầu.',
    stakeholder: '🥁 [Từ ghép /ˈsteɪkˌhoʊl.dər/]: Nhấn âm 1 STAKE. Chú ý âm chặn /k/ ở giữa trước khi sang holder.',
    trust: '🦷 [Cụm phụ âm cuối /st/]: Phát âm /trʌst/. Chú ý cụm phụ âm /tr/ bật hơi ban đầu, và kết thúc bằng việc xì âm /s/ rồi bật hơi âm /t/ dứt khoát ở cuối.',

    // Câu 5 & 6
    ensures: '🥁 [Trọng âm từ /ɪnˈʃɔːrz/]: Trọng âm nhấn âm 2. Âm /ʃ/: chu tròn môi xát mạnh. Kết thúc bằng âm xát hữu thanh /z/ nhẹ.',
    strict: '🦷 [Cụm phụ âm cuối /kt/]: Phát âm /strɪkt/. Cơ học: bật âm /k/ nhẹ ở cuống lưỡi rồi nối tiếp bật âm /t/ dứt khoát ở đầu lưỡi, không nuốt âm nào.',
    legal: '👅 [Phát âm /ˈliː.ɡəl/]: Nhấn âm 1. Âm cuối /l/: đưa đầu lưỡi chạm lên phần lợi sau răng cửa hàm trên để tạo âm vang cuối.',
    compliance: '🩺 [Thuật ngữ /kəmˈplaɪ.əns/]: Nhấn âm 2 PLI. Chú ý âm bật /k/ ban đầu và âm xát xì cuối /ns/ rõ nét.',
    catastrophic: '🥁 [Trọng âm từ /ˌkæt.əˈstrɒf.ɪk/]: Nhấn mạnh vào âm tiết 3 STROPH /strɒf/. Chú ý bật hơi phụ âm cuối /k/.',
    risk: '🦷 [Cụm phụ âm cuối /sk/]: Phát âm /rɪsk/. Cơ học: xì âm /s/ nhẹ rồi bật hơi âm /k/ mạnh ở cuống lưỡi.',
    lawsuits: '🦷 [Cụm phụ âm cuối /ts/]: Phát âm /ˈlɔː.suːts/. Nhấn âm 1. Âm cuối: đặt đầu lưỡi chặn hơi tại lợi rồi nhả xát nhanh âm /s/ tạo âm bật ma sát /ts/.',
    drives: '👄 [Cụm phụ âm cuối /vz/]: Phát âm /draɪvz/. Cơ học: chạm nhẹ răng cửa trên vào môi dưới để tạo âm /v/, đồng thời rung thanh quản nối tiếp âm xì hữu thanh /z/.',
    value: '👄 [Nguyên âm /æ/ + /juː/]: Phát âm /ˈvæl.juː/. Chú ý hạ hàm sâu cho âm /æ/ và khép tròn môi cho âm /juː/.',
    over: '👄 [Phát âm /ˈoʊ.vər/]: Nhấn âm 1. Răng cửa trên chạm nhẹ môi dưới tạo âm /v/.',
    greed: '🦷 [Âm bật hữu thanh /d/ cuối]: Phát âm /ɡriːd/. Chú ý âm /ɡ/ ở cuống lưỡi và âm /d/ bật hơi ở đầu lưỡi, kéo dài nguyên âm đôi /iː/.',

    // Câu 7 & 8
    corporate: '🥁 [Trọng âm từ /ˈkɔːr.pər.ɪt/]: Phát âm 3 âm tiết (không phải 4). Nhấn âm 1. Lướt nhẹ âm tiết cuối.',
    decision: '🥁 [Trọng âm từ /dɪˈsɪʒ.ən/]: Trọng âm chính nhấn âm 2 SI /sɪʒ/. Chú ý âm /ʒ/ rung dây thanh quản.',
    making: '🥁 [Trọng âm từ /ˈmeɪ.kɪŋ/]: Nhấn âm 1. Âm cuối /ŋ/ vang mũi.',
    promoting: '🥁 [Trọng âm từ /prəˈmoʊt.ɪŋ/]: Nhấn âm 2 MOUT /moʊt/. Bật hơi âm /p/ ở đầu.',
    company: '🥁 [Trọng âm từ /ˈkʌm.pə.ni/]: Nhấn âm 1. Phát âm rõ 3 âm tiết.',
    success: '🥁 [Trọng âm từ /səkˈses/]: Nhấn âm 2. Chú ý âm bật /k/ ở giữa và âm xát xì /s/ rõ nét ở cuối.',
    distinct: '🦷 [Cụm phụ âm cuối /ŋkt/]: Phát âm /dɪˈstɪŋkt/. Cơ học: chặn âm /ŋ/ qua mũi, bật nhẹ /k/ ở ngạc mềm rồi bật mạnh /t/ ở ngạc cứng.',
    competitive: '🥁 [Trọng âm từ /kəmˈpet.ə.tɪv/]: Nhấn âm 2 PET /pet/. Lướt nhẹ các âm tiết còn lại.',
    advantages: '🥁 [Trọng âm từ /ədˈvɑːn.tɪ.dʒɪz/]: Nhấn âm 2 VAN /vɑːn/. Chú ý âm cuối /dʒɪz/ có âm bật xát hữu thanh.',

    // Câu 9 & 10
    implement: '🥁 [Trọng âm từ /ˈɪm.plɪ.ment/]: Nhấn âm 1. Bật nhẹ âm /t/ ở cuối.',
    protected: '🥁 [Trọng âm từ /prəˈtek.tɪd/]: Nhấn âm 2. Âm cuối /tɪd/ có âm bật hữu thanh /d/ nhẹ.',
    whistleblowing: '🥁 [Từ ghép /ˈwɪs.əlˌbloʊ.ɪŋ/]: Nhấn âm 1. Chú ý câm âm /t/ trong whistle (chỉ đọc /wɪs.əl/).',
    misconduct: '🩺 [Thuật ngữ /ˌmɪsˈkɒn.dʌkt/]: Nhấn âm 2 KON /kɒn/. Chú ý cụm phụ âm cuối /kt/ bật hơi rõ ràng.',
    robust: '🦷 [Cụm phụ âm cuối /st/]: Phát âm /rəʊˈbʌst/. Nhấn âm 2 BUST. Kết thúc bằng âm xì /s/ nối tiếp bật hơi /t/ dứt khoát.',
    system: '🥁 [Trọng âm từ /ˈsɪs.təm/]: Nhấn âm 1. Phát âm rõ âm xì /s/ ở giữa.',
    personal: '🥁 [Trọng âm từ /ˈpɜː.sən.əl/]: Nhấn âm 1. Lướt nhẹ âm tiết giữa.',
    moral: '👅 [Phát âm /ˈmɒr.əl/]: Nhấn âm 1. Tránh đọc nhầm thành "mortal". Âm cuối /l/ nâng nhẹ đầu lưỡi chạm ngạc.',
    compass: '🥁 [Phát âm /ˈkʌm.pəs/]: Nhấn âm 1 COM. Tránh đọc nhầm thành "Kombat". Kết thúc bằng âm xì /s/ rõ nét.'
  };

  // Nếu từ nằm trong từ điển shadowing, trả về hướng dẫn chuyên sâu ngay
  if (SHADOWING_WORDS_DICT[cleanWord]) {
    return SHADOWING_WORDS_DICT[cleanWord];
  }

  // 2. PARSER QUY TẮC NGỮ ÂM ĐỘNG DỰA TRÊN HẬU TỐ (SUFFIX RULES)
  
  // Răng-lưỡi /θ/ and /ð/
  if (cleanWord.includes('th')) {
    return '🦷 [Âm răng-lưỡi /θ/, /ð/]: Có tổ hợp "th". Cơ học sửa: Đặt đầu lưỡi nằm nhẹ giữa răng cửa trên và dưới. Thổi hơi nhẹ qua khe răng-lưỡi để tạo âm ma sát liên tục (không chặn hơi hoàn toàn biến thành /t/ hay /d/).';
  }

  // Cụm phụ âm cuối phức tạp
  if (/(sts|sks|pts|cts|ldz|nks|ndz)$/.test(cleanWord)) {
    return '🔗 [Cụm phụ âm cuối phức tạp]: Lỗi nuốt âm đuôi liên tục. Cơ học sửa: Áp dụng kỹ thuật Build-up. Nói âm chính trước rồi nhả dần từng phụ âm cuối liên tục (ví dụ: build -> builds). Dùng hơi thở bụng đẩy lực dài.';
  }

  // Âm bật vô thanh /t/ cuối
  if (cleanWord.endsWith('t') && !cleanWord.endsWith('st') && !cleanWord.endsWith('th')) {
    return '🦷 [Âm bật vô thanh /t/ cuối]: Lỗi nuốt phụ âm cuối /t/. Cơ học sửa: Chạm đầu lưỡi vào ngạc cứng (ngay sau răng cửa trên) để chặn luồng hơi, sau đó mở đột ngột để luồng khí bật ra nhẹ nhàng.';
  }

  // Âm bật hữu thanh /d/ cuối
  if (cleanWord.endsWith('d') || cleanWord.endsWith('ed')) {
    return '🦷 [Âm bật hữu thanh /d/ cuối]: Người Việt thường nuốt âm này. Cơ học sửa: Đầu lưỡi chạm ngạc cứng chặn luồng hơi, rung nhẹ dây thanh quản rồi nhả nhẹ hơi tạo âm bật /d/.';
  }

  // Âm ma sát xì /s/ hoặc /z/ cuối
  if (cleanWord.endsWith('s') || cleanWord.endsWith('z') || cleanWord.endsWith('ce') || cleanWord.endsWith('se')) {
    return '🦷 [Âm ma sát /s/ hoặc /z/ ở cuối]: Thiếu âm xì đuôi. Cơ học sửa: Khép hai hàm răng lại gần nhau, đầu lưỡi hướng sát ngạc (không chạm), thổi luồng hơi xát mạnh qua khe răng tạo âm xì rõ nét.';
  }

  // Âm ma sát răng-môi /f/, /v/ cuối
  if (cleanWord.endsWith('f') || cleanWord.endsWith('v') || cleanWord.endsWith('ve')) {
    return '👄 [Âm ma sát răng-môi cuối /f/, /v/]: Chạm răng cửa hàm trên vào phần trong của môi dưới. Thổi luồng hơi ma sát (với âm /f/) hoặc rung nhẹ dây thanh quản (với âm /v/).';
  }

  // Trọng âm từ dài
  if (cleanWord.length > 7) {
    return `🥁 [Trọng âm từ đa âm tiết]: Từ dài "${cleanWord}". Hãy tra cứu IPA, đọc chậm rãi từng âm tiết và nhấn mạnh (nói to hơn, cao hơn, dài hơn) vào âm tiết mang trọng âm chính.`;
  }

  return `💡 Cấu âm cơ học: Hãy đọc chậm, chú ý phát âm rõ nét từng phụ âm đầu và phụ âm cuối. Nghe phát âm mẫu từ Edge-TTS và luyện tập lại.`;
}

// ── API: Text-to-Speech via Microsoft Edge TTS ───────────────
const CACHE_DIR = path.join(__dirname, 'cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

app.get('/api/tts', (req, res) => {
  const text = req.query.text;
  if (!text) {
    return res.status(400).json({ error: 'Missing text parameter' });
  }

  const voice = req.query.voice || 'en-US-AvaNeural';
  let rateStr = '+0%';
  const rateVal = parseFloat(req.query.rate || '1.0');
  if (rateVal !== 1.0) {
    const diff = Math.round((rateVal - 1.0) * 100);
    rateStr = diff >= 0 ? `+${diff}%` : `${diff}%`;
  }

  const hash = crypto.createHash('md5').update(`${text}_${voice}_${rateStr}`).digest('hex');
  const cachePath = path.join(CACHE_DIR, `${hash}.mp3`);

  if (fs.existsSync(cachePath)) {
    return res.sendFile(cachePath);
  }

  const edgeTtsCli = '/Users/mac/Library/Python/3.9/bin/edge-tts';
  execFile(edgeTtsCli, [
    '--text', text,
    '--voice', voice,
    `--rate=${rateStr}`,
    '--write-media', cachePath
  ], (error, stdout, stderr) => {
    if (error) {
      console.error('Edge-TTS generation error:', error, stderr);
      return res.status(500).json({ error: 'Failed to generate speech' });
    }
    res.sendFile(cachePath);
  });
});

app.listen(PORT, () => {
  console.log(`============================================================`);
  console.log(`🚀 Pronunciation Mastery Full-Stack Server running!`);
  console.log(`   Local link: http://localhost:${PORT}`);
  console.log(`============================================================`);
});
