// ============================================================
// PRONUNCIATION MASTERY — Core Application Logic
// ============================================================

let API_BASE = localStorage.getItem('ai_api_base') || (window.location.protocol === 'file:' ? 'http://localhost:3000' : '');

// ── State ─────────────────────────────────────────────────────
const state = {
  currentTab: 'dashboard',
  currentDay: parseInt(localStorage.getItem('currentDay') || '1'),
  sessions: parseInt(localStorage.getItem('sessions') || '0'),
  totalMinutes: parseInt(localStorage.getItem('totalMinutes') || '0'),
  lastAccuracy: localStorage.getItem('lastAccuracy') || '—',
  completedSets: JSON.parse(localStorage.getItem('completedSets') || '{}'),
  isRecording: false,
  recognition: null,
  currentSentenceIdx: 0,
  breathingInterval: null,
  sessionStart: null,
  accumulatedTranscript: '',
  currentSessionTranscript: '',
  
  // Set Tracker state variables
  expandedExerciseId: null,
  activeTimerInterval: null,
  activeTimerRemaining: 0,
  activeTimerExerciseId: null,
  activeBreathingInterval: null,
  breathingPhase: null,
  breathingSecondsRemaining: 0,
  breathingCycleCount: 0,
  activeBreathingExerciseId: null,
  
  // TTS configuration
  ttsSpeed: parseFloat(localStorage.getItem('ttsSpeed') || '0.85'),

  // Sentence source mode: 'shadowing' | 'diagnostic'
  sentenceMode: 'shadowing'
};

// ── Sentence Source Helper ────────────────────────────────────
function getActiveSentences() {
  if (state.sentenceMode === 'diagnostic') {
    // Convert diagnostic format to shadowing-compatible format
    return (EXERCISES.diagnosticSentences || []).map(d => ({
      text: d.text,
      ipa: '',
      focus: d.errorType + ' ' + d.severity,
      tips: d.tip,
      difficulty: d.severity === '🔴' ? 4 : 3,
      targetWords: d.targetWords
    }));
  }
  return EXERCISES.shadowingSentences.sentences;
}

function toggleSentenceMode() {
  state.sentenceMode = state.sentenceMode === 'shadowing' ? 'diagnostic' : 'shadowing';
  state.currentSentenceIdx = 0;
  updateSentenceDisplay();
  updateSentenceModeUI();
}

function updateSentenceModeUI() {
  const btn = document.getElementById('sentenceModeToggle');
  if (btn) {
    btn.textContent = state.sentenceMode === 'diagnostic'
      ? '🎯 Chế độ: Diagnostic Test (10 câu)'
      : '🗣️ Chế độ: Shadowing Practice';
    btn.style.background = state.sentenceMode === 'diagnostic'
      ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)';
    btn.style.color = state.sentenceMode === 'diagnostic'
      ? '#EF4444' : 'var(--accent-secondary)';
  }
}

// ── Tab Navigation ────────────────────────────────────────────
function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tabId)?.classList.add('active');
  document.getElementById('nav-' + tabId)?.classList.add('active');
  state.currentTab = tabId;
  if (!state.sessionStart) state.sessionStart = Date.now();

  // Tab phụ thuộc dữ liệu: vẽ lại khi mở
  if (tabId === 'review' && typeof renderSmartReview === 'function') renderSmartReview();
  if (tabId === 'dashboard' && typeof refreshDataDrivenDashboard === 'function') refreshDataDrivenDashboard();
}

document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// ── Dashboard ─────────────────────────────────────────────────
function updateDashboard() {
  document.getElementById('stat-day').textContent = state.currentDay;
  document.getElementById('stat-sessions').textContent = state.sessions;
  document.getElementById('stat-minutes').textContent = state.totalMinutes;
  document.getElementById('stat-accuracy').textContent = state.lastAccuracy;
  
  const day = EXERCISES.schedule.days[state.currentDay - 1];
  if (day) {
    document.getElementById('today-goal').textContent = 
      `Ngày ${day.day}: ${day.title} — ${day.morning}`;
  }

  // Tính toán tiến độ set của ngày hiện tại
  const exercises = EXERCISES.dailyExercises[state.currentDay] || [];
  let totalTargetSets = 0;
  let totalCompletedSets = 0;

  exercises.forEach(ex => {
    totalTargetSets += ex.targetSets || 0;
    const completed = state.completedSets[ex.id] || 0;
    totalCompletedSets += Math.min(completed, ex.targetSets || 0);
  });

  const progressPercent = totalTargetSets > 0 ? Math.round((totalCompletedSets / totalTargetSets) * 100) : 0;
  
  const progressFill = document.getElementById('day-progress');
  const progressText = document.getElementById('day-progress-text');
  
  if (progressFill) {
    progressFill.style.width = `${progressPercent}%`;
  }
  if (progressText) {
    progressText.textContent = `${progressPercent}% (${totalCompletedSets}/${totalTargetSets} set)`;
  }
}

// ── Speech Recognition (ASR) ──────────────────────────────────
function initSpeechRecognition(continuous = false) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.warn('Speech Recognition not supported');
    return null;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.continuous = continuous;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;
  return recognition;
}

// ── Audio Visualization ───────────────────────────────────────
let audioContext, analyser, dataArray, animationId;
let recordingStream = null;

function initAudioVisualization(stream) {
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyser);
  analyser.fftSize = 256;
  dataArray = new Uint8Array(analyser.frequencyBinCount);
  drawWaveform();
}

function drawWaveform() {
  const canvas = document.getElementById('waveformCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth * 2;
  canvas.height = canvas.offsetHeight * 2;
  ctx.scale(2, 2);
  
  function draw() {
    animationId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    
    ctx.fillStyle = 'rgba(17, 24, 39, 0.3)';
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    
    const barWidth = (canvas.offsetWidth / dataArray.length) * 2;
    let x = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.offsetHeight * 0.8;
      
      const gradient = ctx.createLinearGradient(0, canvas.offsetHeight, 0, canvas.offsetHeight - barHeight);
      gradient.addColorStop(0, '#6366f1');
      gradient.addColorStop(0.5, '#818cf8');
      gradient.addColorStop(1, '#06b6d4');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, canvas.offsetHeight - barHeight, barWidth - 1, barHeight);
      x += barWidth;
    }
  }
  draw();
}

function stopVisualization() {
  if (animationId) cancelAnimationFrame(animationId);
  if (audioContext) audioContext.close();
}

// ── Recording Logic ───────────────────────────────────────────
async function toggleRecording() {
  const btn = document.getElementById('recordBtn');
  const label = document.getElementById('recordLabel');
  const icon = document.getElementById('recordIcon');
  
  if (state.isRecording) {
    // Stop
    state.isRecording = false;
    btn.classList.remove('recording');
    icon.textContent = '🎙️';
    label.textContent = 'Ghi âm hoàn tất. Phân tích...';
    
    if (state.silenceTimer) {
      clearTimeout(state.silenceTimer);
      state.silenceTimer = null;
    }
    
    if (state.recognition) {
      state.recognition.stop();
    }
    
    stopVisualization();

    // Chấm âm vị thật từ audio đã thu (nếu bật)
    if (typeof phonemeStopAndScore === 'function') {
      const sIdx = state.currentSentenceIdx;
      const sText = getActiveSentences()[sIdx]?.text;
      if (sText) phonemeStopAndScore(sText, 'phonemePanel', 'phonemeContent', `sent:${sIdx}`);
    }

    if (recordingStream) {
      recordingStream.getTracks().forEach(t => t.stop());
      recordingStream = null;
    }

    state.sessions++;
    if (state.sessionStart) {
      state.totalMinutes += Math.max(1, Math.round((Date.now() - state.sessionStart) / 60000));
      state.sessionStart = null;
    }
    saveState();
    updateDashboard();
    return;
  }
  
  // Start
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (typeof resetPhonemeUi === 'function') resetPhonemeUi('sentence');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingStream = stream;
    state.isRecording = true;
    state.sessionStart = Date.now();
    state.accumulatedTranscript = '';
    state.currentSessionTranscript = '';
    
    btn.classList.add('recording');
    icon.textContent = '⏹';
    label.textContent = 'Đang thu âm... Hãy nói tự nhiên, nghỉ lấy hơi thoải mái';
    
    initAudioVisualization(stream);

    // Thu audio song song để chấm âm vị thật (nếu bật)
    if (typeof phonemeStartCapture === 'function') phonemeStartCapture(stream);

    // continuous = true cho phép bác sĩ Long ngắt nghỉ lấy hơi giữa câu thoải mái
    state.recognition = initSpeechRecognition(true);
    const asrResult = document.getElementById('asrResult');
    const asrTranscript = document.getElementById('asrTranscript');

    if (!state.recognition) {
      console.warn('Speech Recognition not supported in this browser. Running in AI-only phoneme mode.');
      label.textContent = 'Đang thu âm... (Chế độ Phân tích Âm vị)';
      // Tự động dừng sau 15 giây nếu không có ASR dò im lặng
      state.silenceTimer = setTimeout(() => {
        if (state.isRecording) {
          console.log('AI-only: Tự động dừng ghi âm sau 15s.');
          toggleRecording();
        }
      }, 15000);
    } else {
      // Tự động dừng ghi âm sau 5 giây im lặng liên tục
      resetSilenceTimer();
      
      function resetSilenceTimer() {
        if (state.silenceTimer) clearTimeout(state.silenceTimer);
        state.silenceTimer = setTimeout(() => {
          console.log('ASR: Tự động dừng do im lặng.');
          if (state.isRecording) {
            toggleRecording();
          }
        }, 5000);
      }
    }

    if (state.recognition) {
      state.recognition.onresult = (event) => {
        // Gia hạn thu âm khi phát hiện có từ mới nói ra
        resetSilenceTimer();
        
        let sessionTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          sessionTranscript += event.results[i][0].transcript;
        }
        state.currentSessionTranscript = sessionTranscript;
        const fullTranscript = (state.accumulatedTranscript + ' ' + sessionTranscript).trim();
        
        asrResult.style.display = 'block';
        asrTranscript.textContent = fullTranscript;
        
        compareWithTarget(fullTranscript);
      };
      
      state.recognition.onerror = (event) => {
        console.error('ASR Error:', event.error);
        if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
          state.isRecording = false;
          btn.classList.remove('recording');
          icon.textContent = '🎙️';
          label.textContent = `Lỗi microphone: ${event.error}`;
          stopVisualization();
          if (recordingStream) {
            recordingStream.getTracks().forEach(t => t.stop());
            recordingStream = null;
          }
        } else if (event.error === 'no-speech') {
          label.textContent = 'Không phát hiện giọng nói. Hãy nói to rõ hơn...';
        }
      };
      
      state.recognition.onend = () => {
        if (state.isRecording) {
          // Tự động kết nối lại ASR khi bị ngắt quãng giữa câu để lấy hơi
          if (state.currentSessionTranscript) {
            state.accumulatedTranscript = (state.accumulatedTranscript + ' ' + state.currentSessionTranscript).trim();
            state.currentSessionTranscript = '';
          }
          try {
            state.recognition.start();
          } catch (e) {
            console.log("Recognition restart failed:", e);
          }
        }
      };
      
      state.recognition.start();
    }
  } catch (err) {
    label.textContent = 'Không thể truy cập microphone. Kiểm tra quyền truy cập.';
    console.error(err);
    state.isRecording = false;
    btn.classList.remove('recording');
    icon.textContent = '🎙️';
  }
}

// ── Sequence Alignment (Needleman-Wunsch / Levenshtein on Words) ──
function alignWords(targetWords, spokenWords) {
  const N = targetWords.length;
  const M = spokenWords.length;
  
  const dp = Array(N + 1).fill(null).map(() => Array(M + 1).fill(0));
  const parent = Array(N + 1).fill(null).map(() => Array(M + 1).fill(null));
  
  for (let i = 0; i <= N; i++) {
    dp[i][0] = i;
    parent[i][0] = { i: i - 1, j: 0, op: 'delete' };
  }
  for (let j = 0; j <= M; j++) {
    dp[0][j] = j;
    parent[0][j] = { i: 0, j: j - 1, op: 'insert' };
  }
  parent[0][0] = null;
  
  for (let i = 1; i <= N; i++) {
    const tw = targetWords[i - 1].toLowerCase().replace(/[.,!?;:'"]/g, '');
    for (let j = 1; j <= M; j++) {
      const sw = spokenWords[j - 1].toLowerCase().replace(/[.,!?;:'"]/g, '');
      
      const isWordMatch = (tw === sw || levenshtein(tw, sw) <= 1);
      const matchCost = isWordMatch ? 0 : 1;
      
      const subst = dp[i - 1][j - 1] + matchCost;
      const del = dp[i - 1][j] + 1;
      const ins = dp[i][j - 1] + 1;
      
      const min = Math.min(subst, del, ins);
      dp[i][j] = min;
      
      if (min === subst) {
        parent[i][j] = { i: i - 1, j: j - 1, op: isWordMatch ? 'match' : 'subst' };
      } else if (min === del) {
        parent[i][j] = { i: i - 1, j: j, op: 'delete' };
      } else {
        parent[i][j] = { i: i, j: j - 1, op: 'insert' };
      }
    }
  }
  
  const path = [];
  let currI = N;
  let currJ = M;
  while (currI > 0 || currJ > 0) {
    const node = parent[currI][currJ];
    if (!node) break;
    path.push({
      targetIdx: currI - 1,
      spokenIdx: currJ - 1,
      op: node.op
    });
    currI = node.i;
    currJ = node.j;
  }
  path.reverse();
  return path;
}

// ── Compare ASR result with target ────────────────────────────
async function compareWithTarget(transcript) {
  const sentences = getActiveSentences();
  const originalTarget = sentences[state.currentSentenceIdx].text;
  const target = originalTarget.toLowerCase();
  const spoken = transcript.toLowerCase();
  
  const targetWords = target.split(/\s+/).filter(w => w.length > 0);
  const spokenWords = spoken.split(/\s+/).filter(w => w.length > 0);
  
  const path = alignWords(targetWords, spokenWords);
  const targetOpMap = {};
  path.forEach(step => {
    if (step.targetIdx >= 0) {
      targetOpMap[step.targetIdx] = step.op;
    }
  });
  
  let matches = 0;
  const matchedHtml = [];
  const errorWords = [];

  for (let i = 0; i < targetWords.length; i++) {
    const tw = targetWords[i];
    const op = targetOpMap[i];

    // Lấy từ nguyên bản từ target text để giữ nguyên viết hoa và dấu câu khi hiển thị
    const originalTw = originalTarget.split(/\s+/).filter(w => w.length > 0)[i] || tw;

    if (op === 'match') {
      matches++;
      matchedHtml.push(`<span class="match">${originalTw}</span>`);
    } else {
      matchedHtml.push(`<span class="mismatch">${originalTw}</span>`);
      errorWords.push(tw);
    }
  }

  const accuracy = Math.round((matches / targetWords.length) * 100);
  
  // Show score
  const matchResult = document.getElementById('matchResult');
  const scoreRing = document.getElementById('scoreRing');
  const scoreValue = document.getElementById('scoreValue');
  const matchFeedback = document.getElementById('matchFeedback');
  
  matchResult.style.display = 'block';
  scoreRing.style.setProperty('--score', accuracy);
  scoreValue.textContent = accuracy + '%';
  
  if (accuracy >= 90) {
    matchFeedback.textContent = '🎉 Xuất sắc! AI nhận diện gần như hoàn hảo!';
    matchFeedback.style.color = 'var(--accent-green)';
  } else if (accuracy >= 70) {
    matchFeedback.textContent = '👍 Tốt! Còn vài từ cần cải thiện. Xem các từ đỏ bên dưới.';
    matchFeedback.style.color = 'var(--accent-amber)';
  } else {
    matchFeedback.textContent = '💪 Cần luyện thêm. Tập trung vào các từ bị đánh dấu đỏ.';
    matchFeedback.style.color = 'var(--accent-red)';
  }
  
  // Update ASR display with color coding
  document.getElementById('asrTranscript').innerHTML = matchedHtml.join(' ');
  
  // Save accuracy
  state.lastAccuracy = accuracy + '%';
  saveState();
  updateDashboard();

  // ── Ghi nhật ký data-driven + cập nhật lịch ôn SRS ──
  if (typeof PMData !== 'undefined') {
    PMData.recordAttempt({
      itemId: `sent:${state.currentSentenceIdx}`,
      type: 'sentence',
      target: originalTarget,
      accuracy,
      errorWords,
      mode: 'asr-word',
    });
    if (typeof refreshDataDrivenDashboard === 'function') refreshDataDrivenDashboard();
  }

  // Call AI Speech Coach endpoint for mechanical feedback
  const aiFeedbackContainer = document.getElementById('aiFeedbackContainer');
  const aiFeedbackContent = document.getElementById('aiFeedbackContent');
  
  if (accuracy < 100) {
    let result = null;
    try {
      const res = await fetch(`${API_BASE}/api/ai-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetText: originalTarget, spokenText: transcript })
      });
      if (res.ok) {
        result = await res.json();
      }
    } catch (err) {
      console.warn('AI feedback API call failed, using local fallback', err);
    }
    
    if (!result) {
      result = getLocalAiFeedback(originalTarget, transcript);
    }
    
    if (result && result.feedbacks && result.feedbacks.length > 0) {
      aiFeedbackContainer.style.display = 'block';
      aiFeedbackContent.innerHTML = result.feedbacks.map(f => `
        <div class="ai-feedback-card">
          <div class="ai-feedback-word">Từ lỗi: "${f.word}"</div>
          <div class="ai-feedback-advice">${f.advice}</div>
        </div>
      `).join('');
    } else {
      aiFeedbackContainer.style.display = 'none';
    }
  } else {
    aiFeedbackContainer.style.display = 'none';
  }
}

// ── Levenshtein Distance ──────────────────────────────────────
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

const SHADOWING_WORDS_DICT = {
  // Từ vựng lâm sàng/y đức mới bổ sung (Kiểm duyệt kỹ lưỡng)
  rare: '👅 [Phát âm /reər/]: Nguyên âm đôi bắt đầu từ âm /e/ lướt nhẹ sang âm schwa /ə/ và cong nhẹ đầu lưỡi ở cuối để tạo âm /r/ chuẩn Mỹ.',
  staghorn: '🩺 [Thuật ngữ /ˈstæɡ.hɔːn/]: Đọc rõ âm chặn hữu thanh /ɡ/ ở cuống lưỡi của stag trước khi phát âm horn.',
  laparoscopic: '🩺 [Thuật ngữ /ˌlæp.ər.əˈskɒp.ɪk/]: Trọng âm phụ ở âm 1, trọng âm chính nhấn ở âm tiết 4 SKOP /skɒp/. Bật hơi phụ âm /k/ mạnh ở cuối.',
  prostate: '🩺 [Thuật ngữ /ˈprɒs.teɪt/]: Trọng âm nhấn âm tiết đầu PROS. Chú ý phụ âm cuối /t/ bật hơi dứt khoát. Tránh đọc thành "pro-state".',
  discuss: '🥁 [Trọng âm từ /dɪˈskʌs/]: Trọng âm nhấn âm 2. Chú ý âm ma sát xì /s/ kéo dài rõ rệt ở cuối.',
  benefits: '🦷 [Cụm phụ âm cuối /ts/]: Phát âm /ˈben.ɪ.fɪts/. Chú ý đặt đầu lưỡi chặn hơi tại lợi rồi nhả xát nhanh âm /s/ tạo âm bật ma sát /ts/ ở cuối.',
  accepts: '🦷 [Cụm phụ âm cuối phức tạp /pts/]: Phát âm /əkˈsepts/. Kỹ thuật build-up: accept -> accepts. Bật nhẹ /p/ bằng môi, chặn nhẹ /t/ rồi thổi hơi xì /s/ dứt khoát.',
  facts: '🦷 [Cụm phụ âm cuối phức tạp /kts/]: Phát âm /fækts/. Cơ học: bật nhẹ âm chặn /k/ ở ngạc mềm rồi nhả nhanh sang âm bật ma sát /ts/. Người Việt rất hay nuốt âm /k/.',
  supports: '🦷 [Cụm phụ âm cuối /ts/]: Phát âm /səˈpɔːts/. Chú ý âm bật /p/ ở đầu âm tiết 2 và âm bật ma sát /ts/ ở cuối.',
  significant: '🥁 [Trọng âm từ /sɪɡˈnɪf.ɪ.kənt/]: Trọng âm nhấn âm 2 NIF. Đọc lướt nhanh âm 1 và bật nhẹ âm cuối /t/.',
  "post-operative": '🥁 [Trọng âm từ /pəʊst ˈɒp.ər.ə.tɪv/]: Từ ghép có nhịp điệu hơi phức tạp. Chú ý cụm /st/ ở post và âm /v/ ma sát răng môi nhẹ ở cuối.',
  privacy: '🥁 [Trọng âm từ /ˈpraɪ.və.si/]: Trọng âm nhấn âm 1 PRI. Tránh đọc nhầm thành pri-va-cy giọng Việt bẹt.',
  both: '🦷 [Âm răng-lưỡi vô thanh /θ/ ở cuối]: Phát âm /bəʊθ/. Cơ học: Đặt đầu lưỡi nằm nhẹ giữa răng cửa trên và dưới. Thổi hơi nhẹ qua khe răng-lưỡi ở cuối để tạo âm ma sát vô thanh.',
  obligation: '🥁 [Trọng âm từ /ˌɒb.lɪˈɡeɪ.ʃən/]: Trọng âm nhấn âm 3 GA /ɡeɪ/. Chú ý âm cuối lướt nhẹ /ʃən/.',

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
  greed: '🦷 [Âm bật hữu thanh /d/ cuối]: Phát âm /ɡriːd/. Chú ý âm /ɡ/ ở cuống lưỡi and âm /d/ bật hơi ở đầu lưỡi, kéo dài nguyên âm đôi /iː/.',

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

function getMechanicalFeedbackLocal(word) {
  const cleanWord = word.toLowerCase().trim().replace(/[.,!?;:'"]/g, '');
  
  if (SHADOWING_WORDS_DICT[cleanWord]) {
    return SHADOWING_WORDS_DICT[cleanWord];
  }
  
  if (cleanWord.includes('th')) {
    return '🦷 [Âm răng-lưỡi /θ/, /ð/]: Có tổ hợp "th". Cơ học sửa: Đặt đầu lưỡi nằm nhẹ giữa răng cửa trên và dưới. Thổi hơi nhẹ qua khe răng-lưỡi để tạo âm ma sát liên tục (không chặn hơi hoàn toàn biến thành /t/ hay /d/).';
  }
  
  if (/(sts|sks|pts|cts|ldz|nks|ndz)$/.test(cleanWord)) {
    return '🔗 [Cụm phụ âm cuối phức tạp]: Lỗi nuốt âm đuôi liên tục. Cơ học sửa: Áp dụng kỹ thuật Build-up. Nói âm chính trước rồi nhả dần từng phụ âm cuối liên tục (ví dụ: build -> builds). Dùng hơi thở bụng đẩy lực dài.';
  }
  
  if (cleanWord.endsWith('t') && !cleanWord.endsWith('st') && !cleanWord.endsWith('th')) {
    return '🦷 [Âm bật vô thanh /t/ cuối]: Lỗi nuốt phụ âm cuối /t/. Cơ học sửa: Chạm đầu lưỡi vào ngạc cứng (ngay sau răng cửa trên) để chặn luồng hơi, sau đó mở đột ngột để luồng khí bật ra nhẹ nhàng.';
  }
  
  if (cleanWord.endsWith('d') || cleanWord.endsWith('ed')) {
    return '🦷 [Âm bật hữu thanh /d/ cuối]: Người Việt thường nuốt âm này. Cơ học sửa: Đầu lưỡi chạm ngạc cứng chặn luồng hơi, rung nhẹ dây thanh quản rồi nhả nhẹ hơi tạo âm bật /d/.';
  }
  
  if (cleanWord.endsWith('s') || cleanWord.endsWith('z') || cleanWord.endsWith('ce') || cleanWord.endsWith('se')) {
    return '🦷 [Âm ma sát /s/ hoặc /z/ ở cuối]: Thiếu âm xì đuôi. Cơ học sửa: Khép hai hàm răng lại gần nhau, đầu lưỡi hướng sát ngạc (không chạm), thổi luồng hơi xát mạnh qua khe răng tạo âm xì rõ nét.';
  }
  
  if (cleanWord.endsWith('f') || cleanWord.endsWith('v') || cleanWord.endsWith('ve')) {
    return '👄 [Âm ma sát răng-môi cuối /f/, /v/]: Chạm răng cửa hàm trên vào phần trong của môi dưới. Thổi luồng hơi ma sát (với âm /f/) hoặc rung nhẹ dây thanh quản (với âm /v/).';
  }
  
  if (cleanWord.length > 7) {
    return `🥁 [Trọng âm từ đa âm tiết]: Từ dài "${cleanWord}". Hãy tra cứu IPA, đọc chậm rãi từng âm tiết và nhấn mạnh (nói to hơn, cao hơn, dài hơn) vào âm tiết mang trọng âm chính.`;
  }
  
  return `💡 Cấu âm cơ học: Hãy đọc chậm, chú ý phát âm rõ nét từng phụ âm đầu và phụ âm cuối. Nghe phát âm mẫu từ Edge-TTS và luyện tập lại.`;
}

function getLocalAiFeedback(targetText, spokenText) {
  const targetClean = targetText.toLowerCase().replace(/[.,!?;:'"]/g, '');
  const spokenClean = spokenText.toLowerCase().replace(/[.,!?;:'"]/g, '');
  
  const targetWords = targetClean.split(/\s+/).filter(w => w.length > 0);
  const spokenWords = spokenClean.split(/\s+/).filter(w => w.length > 0);
  
  const mismatches = [];
  const feedbacks = [];
  
  targetWords.forEach(tw => {
    const found = spokenWords.some(sw => sw === tw || levenshtein(sw, tw) <= 1);
    if (!found) {
      mismatches.push(tw);
      const advice = getMechanicalFeedbackLocal(tw);
      feedbacks.push({ word: tw, advice: advice });
    }
  });
  
  const accuracy = Math.round(((targetWords.length - mismatches.length) / targetWords.length) * 100);
  
  return {
    accuracy: Math.max(0, accuracy),
    mismatches: mismatches,
    feedbacks: feedbacks
  };
}

// ── Sentence Navigation ───────────────────────────────────────
function updateSentenceDisplay() {
  const sentences = getActiveSentences();
  const s = sentences[state.currentSentenceIdx];
  const target = document.getElementById('recorder-target');
  
  const ipaHtml = s.ipa ? `<div class="ipa" style="font-size:0.9rem;margin-top:6px;color:var(--accent-secondary);font-weight:500;">${s.ipa}</div>` : '';
  target.innerHTML = `${s.text}${ipaHtml}<span class="ipa" style="font-size:0.8rem;margin-top:8px;display:block;color:var(--text-secondary)">💡 ${s.tips}</span>`;
  
  document.getElementById('sentence-counter').textContent = 
    `${state.currentSentenceIdx + 1} / ${sentences.length}`;
  
  // Reset results
  document.getElementById('asrResult').style.display = 'none';
  document.getElementById('matchResult').style.display = 'none';
  if (typeof resetPhonemeUi === 'function') resetPhonemeUi('sentence');
}

function nextSentence() {
  const sentences = getActiveSentences();
  state.currentSentenceIdx = (state.currentSentenceIdx + 1) % sentences.length;
  updateSentenceDisplay();
}

function prevSentence() {
  const sentences = getActiveSentences();
  state.currentSentenceIdx = (state.currentSentenceIdx - 1 + sentences.length) % sentences.length;
  updateSentenceDisplay();
}

// ── Text-to-Speech ────────────────────────────────────────────
let currentAudio = null;

// ── HVPT: nhiều giọng bản ngữ (High Variability Phonetic Training) ──
// Bằng chứng: nghe cùng 1 nội dung qua NHIỀU người nói khác nhau giúp
// não khái quát hóa âm tốt hơn và chuyển giao sang giọng/từ mới.
const HVPT_VOICES = [
  'en-US-AvaNeural', 'en-US-AndrewNeural', 'en-US-EmmaNeural', 'en-US-BrianNeural',
  'en-US-GuyNeural', 'en-US-JennyNeural', 'en-US-AriaNeural', 'en-US-ChristopherNeural'
];
let hvptIdx = 0;
state.hvptMode = (localStorage.getItem('hvptMode') ?? '1') === '1';

// Initialize state variables for TTS
state.ttsProvider = localStorage.getItem('ttsProvider') || 'edge';
state.ttsVoice = localStorage.getItem('ttsVoice') || 'en-US-AvaNeural';

const VOICE_OPTIONS = {
  edge: [
    { value: 'en-US-AvaNeural', label: 'Ava (Mỹ - Nữ trầm ấm)' },
    { value: 'en-US-AndrewNeural', label: 'Andrew (Mỹ - Nam)' },
    { value: 'en-US-EmmaNeural', label: 'Emma (Mỹ - Nữ)' },
    { value: 'en-US-BrianNeural', label: 'Brian (Mỹ - Nam)' },
    { value: 'en-US-GuyNeural', label: 'Guy (Mỹ - Nam)' },
    { value: 'en-US-JennyNeural', label: 'Jenny (Mỹ - Nữ)' },
    { value: 'en-US-AriaNeural', label: 'Aria (Mỹ - Nữ)' },
    { value: 'en-US-ChristopherNeural', label: 'Christopher (Mỹ - Nam)' }
  ],
  openai: [
    { value: 'alloy', label: 'Alloy (Cân bằng, đa dụng)' },
    { value: 'echo', label: 'Echo (Nam, ấm áp)' },
    { value: 'fable', label: 'Fable (Nam, rõ ràng)' },
    { value: 'onyx', label: 'Onyx (Nam trầm, chuyên nghiệp)' },
    { value: 'nova', label: 'Nova (Nữ, tươi sáng)' },
    { value: 'shimmer', label: 'Shimmer (Nữ, truyền cảm)' }
  ],
  clone: [
    { value: 'native_pro', label: 'Giọng Clone Bản xứ (Tự nhiên, luyến láy & ấm áp)' },
    { value: 'medical', label: 'Thuyết trình y khoa (Medical Mode)' },
    { value: 'casual', label: 'Trò chuyện tự nhiên (Casual Mode)' },
    { value: 'academic', label: 'Báo cáo nghiên cứu (Academic Mode)' }
  ]
};

function initTtsSettings() {
  const providerSelect = document.getElementById('ttsProviderSelect');
  if (providerSelect) {
    providerSelect.value = state.ttsProvider;
  }
  populateTtsVoices();
  checkTtsConnection();
}

function populateTtsVoices() {
  const provider = state.ttsProvider;
  const voiceSelect = document.getElementById('ttsVoiceSelect');
  if (!voiceSelect) return;
  
  const options = VOICE_OPTIONS[provider] || [];
  voiceSelect.innerHTML = options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('');
  
  const savedVoice = state.ttsVoice;
  const isValidVoice = options.some(opt => opt.value === savedVoice);
  if (isValidVoice) {
    voiceSelect.value = savedVoice;
  } else {
    voiceSelect.value = options[0]?.value || '';
    state.ttsVoice = voiceSelect.value;
    localStorage.setItem('ttsVoice', state.ttsVoice);
  }
}

function onTtsProviderChange() {
  const providerSelect = document.getElementById('ttsProviderSelect');
  if (!providerSelect) return;
  state.ttsProvider = providerSelect.value;
  localStorage.setItem('ttsProvider', state.ttsProvider);
  populateTtsVoices();
  checkTtsConnection();
}

function onTtsVoiceChange() {
  const voiceSelect = document.getElementById('ttsVoiceSelect');
  if (!voiceSelect) return;
  state.ttsVoice = voiceSelect.value;
  localStorage.setItem('ttsVoice', state.ttsVoice);
}

async function checkTtsConnection() {
  const statusEl = document.getElementById('ttsConnectionStatus');
  if (!statusEl) return;
  
  if (state.ttsProvider === 'clone') {
    statusEl.innerHTML = `<span style="color:#f59e0b">⏳ Đang kết nối tới máy chủ clone cục bộ (cổng 8005)...</span>`;
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.status === 'ok') {
        statusEl.innerHTML = `<span style="color:#10b981">✅ Kết nối máy chủ Clone thành công (Thiết bị: ${data.device.toUpperCase()})</span>`;
      } else {
        statusEl.innerHTML = `<span style="color:#ef4444">❌ Lỗi máy chủ Clone: Trạng thái không đúng</span>`;
      }
    } catch (err) {
      statusEl.innerHTML = `<span style="color:#ef4444">❌ Không thể kết nối tới máy chủ Clone cục bộ (cổng 8005). Hãy chạy start_mastery_app.py để khởi động.</span>`;
    }
  } else if (state.ttsProvider === 'openai') {
    statusEl.innerHTML = `<span style="color:#3b82f6">💡 OpenAI TTS sử dụng kết nối Internet và key OpenAI API.</span>`;
  } else {
    statusEl.innerHTML = `<span style="color:#10b981">✅ Microsoft Edge-TTS (Cục bộ/Mạng) sẵn sàng.</span>`;
  }
}

window.onTtsProviderChange = onTtsProviderChange;
window.onTtsVoiceChange = onTtsVoiceChange;
window.initTtsSettings = initTtsSettings;

function toggleHVPT() {
  state.hvptMode = !state.hvptMode;
  localStorage.setItem('hvptMode', state.hvptMode ? '1' : '0');
  const el = document.getElementById('hvptToggle');
  if (el) {
    el.textContent = state.hvptMode ? '🎚️ Đa giọng HVPT: BẬT' : '🎚️ Đa giọng HVPT: TẮT';
    el.className = state.hvptMode ? 'btn btn-success btn-sm' : 'btn btn-ghost btn-sm';
  }
}

function speak(text, rate, voice) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  const activeProvider = state.ttsProvider || 'edge';
  
  // Xác định giọng đọc
  let activeVoice = voice;
  if (!activeVoice) {
    if (activeProvider === 'edge' && state.hvptMode) {
      activeVoice = HVPT_VOICES[hvptIdx % HVPT_VOICES.length];
      hvptIdx++;
    } else {
      activeVoice = state.ttsVoice;
    }
  }

  const activeRate = rate !== undefined ? rate : (state.ttsSpeed || 0.85);

  const encodedText = encodeURIComponent(text);
  const audioUrl = `${API_BASE}/api/tts?text=${encodedText}&rate=${activeRate}&provider=${activeProvider}&voice=${encodeURIComponent(activeVoice)}`;

  const audio = new Audio(audioUrl);
  currentAudio = audio;

  audio.play().catch(err => {
    console.warn('Dynamic TTS playback failed, falling back to Web Speech API', err);
    fallbackWebSpeech(text, activeRate);
  });
}

function updateGlobalTTSSpeed(value) {
  const speed = parseFloat(value);
  state.ttsSpeed = speed;
  localStorage.setItem('ttsSpeed', speed);
  
  // Đồng bộ tất cả các select box tốc độ trên trang
  document.querySelectorAll('.tts-speed-selector').forEach(select => {
    select.value = value;
  });
}

function toggleSettingsPanel() {
  const panel = document.getElementById('connectionSettingsPanel');
  if (panel) {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    const input = document.getElementById('aiApiBaseInput');
    if (input) {
      input.value = localStorage.getItem('ai_api_base') || '';
      if (state.discoveredTunnelUrl) {
        input.placeholder = `Tự động phát hiện: ${state.discoveredTunnelUrl}`;
      } else {
        input.placeholder = "https://xxx.trycloudflare.com (Để trống nếu chạy offline/local)";
      }
    }
    if (panel.style.display !== 'none') {
      if (typeof getPhonemeServiceStatus === 'function') {
        getPhonemeServiceStatus(true);
      }
      initTtsSettings();
    }
  }
}

function saveAiApiBase() {
  const input = document.getElementById('aiApiBaseInput');
  if (input) {
    let val = input.value.trim();
    if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
      val = 'https://' + val;
    }
    if (val.endsWith('/')) {
      val = val.slice(0, -1);
    }
    if (val) {
      localStorage.setItem('ai_api_base', val);
      alert(`Đã kết nối tới máy chủ AI: ${val}\nỨng dụng sẽ tự động tải lại.`);
    } else {
      localStorage.removeItem('ai_api_base');
      alert('Đã xóa cấu hình máy chủ AI. Ứng dụng sẽ sử dụng mặc định (Local/Static).\nỨng dụng sẽ tự động tải lại.');
    }
    window.location.reload();
  }
}

function fallbackWebSpeech(text, rate) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;
    utterance.pitch = 1;
    
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Samantha')) ||
                    voices.find(v => v.lang === 'en-US') ||
                    voices.find(v => v.lang.startsWith('en'));
    if (enVoice) utterance.voice = enVoice;
    
    window.speechSynthesis.speak(utterance);
  }
}

// ── Minimal Pairs ─────────────────────────────────────────────
// Tạo nút nhóm minimal pairs động (tự bao gồm các nhóm mở rộng)
function renderPairButtons(activeKey) {
  const container = document.getElementById('pairGroupButtons');
  if (!container) return;
  container.innerHTML = Object.keys(EXERCISES.minimalPairs).map(key => {
    const g = EXERCISES.minimalPairs[key];
    const label = g.label || g.title || key;
    const cls = key === activeKey ? 'btn btn-primary' : 'btn btn-ghost';
    return `<button class="${cls}" data-pgkey="${key}" onclick="showPairGroup('${key}')">${label}</button>`;
  }).join('');
}

function showPairGroup(groupKey) {
  const group = EXERCISES.minimalPairs[groupKey];
  if (!group) return;

  renderPairButtons(groupKey);

  document.getElementById('pairGroupTitle').textContent = group.title;
  document.getElementById('pairGroupDesc').textContent = group.description;
  
  const container = document.getElementById('pairsContainer');
  container.innerHTML = group.pairs.map((pair, i) => `
    <div class="pair-card">
      <div class="pair-word" onclick="speak('${pair.word1}', 0.7)">
        <div class="word">${pair.word1}</div>
        <div class="ipa">${pair.ipa1}</div>
      </div>
      <div class="pair-vs">VS</div>
      <div class="pair-word" onclick="speak('${pair.word2}', 0.7)">
        <div class="word">${pair.word2}</div>
        <div class="ipa">${pair.ipa2}</div>
      </div>
    </div>
    <div class="pair-hint">💡 ${pair.audio_hint}</div>
  `).join('');
}

// ── Generic recording for sub-tabs ────────────────────────────
function createSubRecorder(btnId, labelId, resultId, transcriptId) {
  return async function() {
    const btn = document.getElementById(btnId);
    const label = document.getElementById(labelId);
    
    if (state.isRecording) {
      state.isRecording = false;
      btn.classList.remove('recording');
      if (state.recognition) state.recognition.stop();
      label.textContent = 'Ghi âm hoàn tất';
      if (recordingStream) {
        recordingStream.getTracks().forEach(t => t.stop());
        recordingStream = null;
      }
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStream = stream;
      state.isRecording = true;
      btn.classList.add('recording');
      label.textContent = 'Đang ghi âm...';
      
      state.recognition = initSpeechRecognition();
      if (!state.recognition) return;
      
      state.recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        document.getElementById(resultId).style.display = 'block';
        document.getElementById(transcriptId).textContent = transcript;
      };
      
      state.recognition.onend = () => {
        state.isRecording = false;
        btn.classList.remove('recording');
        label.textContent = 'Nhấn để ghi âm lại';
        if (recordingStream) {
          recordingStream.getTracks().forEach(t => t.stop());
          recordingStream = null;
        }
      };
      
      state.recognition.start();
    } catch (err) {
      label.textContent = 'Lỗi microphone';
    }
  };
}

const togglePairRecording = createSubRecorder('pairRecordBtn', 'pairRecordLabel', 'pairAsrResult', 'pairAsrTranscript');

// ── Final Clusters ────────────────────────────────────────────
function renderClusters() {
  const container = document.getElementById('clusterLevels');
  container.innerHTML = EXERCISES.finalClusters.levels.map(level => `
    <div class="card">
      <div class="card-title">${level.name}</div>
      ${level.words.map(w => `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
          <span style="font-weight:600; color:var(--text-primary); font-size:1.05rem">${w.word}</span>
          <button class="btn btn-ghost btn-sm" onclick="speak('${w.word}', 0.6)" style="padding:4px 8px; font-size:0.8rem">🔊 Nghe mẫu</button>
        </div>
        <div class="cluster-chain">
          ${buildClusterChain(w.word).map((step, i, arr) => `
            <div class="cluster-step ${i === arr.length - 1 ? 'highlight' : ''}" onclick="speak('${step}', 0.6)">${step}</div>
            ${i < arr.length - 1 ? '<span class="cluster-arrow">→</span>' : ''}
          `).join('')}
        </div>
        <div style="display:flex;justify-content:space-between;padding:0 12px 12px;font-size:0.8rem">
          <span class="ipa-display">${w.target}</span>
          <span style="color:var(--accent-red)">${w.error}</span>
          <span style="color:var(--text-muted)">${w.focus}</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}

// ── Final Clusters Challenge Logic ────────────────────────────
let allClusterWords = [];

function populateClusterSelect() {
  const select = document.getElementById('clusterSelect');
  if (!select) return;
  
  allClusterWords = [];
  EXERCISES.finalClusters.levels.forEach(level => {
    level.words.forEach(w => {
      allClusterWords.push({
        word: w.word,
        target: w.target,
        focus: w.focus
      });
    });
  });
  
  select.innerHTML = allClusterWords.map(w => `
    <option value="${w.word}">${w.word} (${w.target})</option>
  `).join('');
  
  onClusterSelectChange();
}

function onClusterSelectChange() {
  const select = document.getElementById('clusterSelect');
  const word = select.value;
  const item = allClusterWords.find(w => w.word === word);
  if (item) {
    const display = document.getElementById('cluster-target-display');
    display.innerHTML = `${item.word}<span class="ipa" style="font-size:0.85rem;margin-top:6px;display:block;color:var(--text-secondary)">${item.target} (Focus: ${item.focus})</span>`;
    
    document.getElementById('clusterAsrResult').style.display = 'none';
    document.getElementById('clusterMatchResult').style.display = 'none';
    document.getElementById('clusterAiFeedbackContainer').style.display = 'none';
    if (typeof resetPhonemeUi === 'function') resetPhonemeUi('cluster');
  }
}

function speakSelectedCluster() {
  const select = document.getElementById('clusterSelect');
  if (select) {
    speak(select.value, 0.6);
  }
}

async function toggleClusterRecording() {
  const btn = document.getElementById('clusterRecordBtn');
  const label = document.getElementById('clusterRecordLabel');
  const icon = document.getElementById('clusterRecordIcon');
  
  if (state.isRecording) {
    state.isRecording = false;
    btn.classList.remove('recording');
    if (icon) icon.textContent = '🎙️';
    label.textContent = 'Nhấn để ghi âm từ';
    
    if (state.silenceTimer) {
      clearTimeout(state.silenceTimer);
      state.silenceTimer = null;
    }
    
    if (state.recognition) {
      state.recognition.stop();
    }
    
    stopVisualization();

    // Gửi âm thanh lên AI backend chấm âm vị
    if (typeof phonemeStopAndScore === 'function') {
      const select = document.getElementById('clusterSelect');
      const targetWord = select.value;
      if (targetWord) phonemeStopAndScore(targetWord, 'clusterMatchResult', 'clusterAiFeedbackContent', `clus:${targetWord}`);
    }
    
    if (recordingStream) {
      recordingStream.getTracks().forEach(t => t.stop());
      recordingStream = null;
    }
    return;
  }
  
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingStream = stream;
    state.isRecording = true;
    
    btn.classList.add('recording');
    if (icon) icon.textContent = '⏹';
    label.textContent = 'Đang thu âm... Hãy nói từ đã chọn';
    if (typeof resetPhonemeUi === 'function') resetPhonemeUi('cluster');
    
    initAudioVisualization(stream);

    // Kích hoạt ghi âm song song
    if (typeof phonemeStartCapture === 'function') phonemeStartCapture(stream);
    
    state.recognition = initSpeechRecognition(false);
    if (!state.recognition) {
      console.warn('Speech Recognition not supported. Running in AI-only phoneme mode.');
      label.textContent = 'Đang thu âm... (Chế độ Phân tích Âm vị)';
      // Tự động dừng sau 6 giây nếu không có ASR
      state.silenceTimer = setTimeout(() => {
        if (state.isRecording) {
          toggleClusterRecording();
        }
      }, 6000);
    } else {
      const asrResult = document.getElementById('clusterAsrResult');
      const asrTranscript = document.getElementById('clusterAsrTranscript');
      
      state.recognition.onresult = async (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        asrResult.style.display = 'block';
        asrTranscript.textContent = transcript;
        
        await compareClusterWithTarget(transcript);
      };
      
      state.recognition.onerror = (event) => {
        console.error('ASR Error:', event.error);
        if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
          console.warn('ASR permission/capture failed. Falling back to AI phoneme mode.');
          state.recognition = null;
          label.textContent = 'Đang thu âm... (Chế độ Phân tích Âm vị)';
        } else {
          label.textContent = `Lỗi: ${event.error}`;
        }
      };
      
      state.recognition.onend = () => {
        if (state.isRecording) {
          toggleClusterRecording();
        }
      };
      
      state.recognition.start();
    }
  } catch (err) {
    label.textContent = 'Lỗi microphone';
    console.error(err);
    state.isRecording = false;
    btn.classList.remove('recording');
    if (icon) icon.textContent = '🎙️';
  }
}

async function compareClusterWithTarget(transcript) {
  const select = document.getElementById('clusterSelect');
  const targetWord = select.value.toLowerCase();
  const spoken = transcript.toLowerCase().trim().replace(/[.,!?;:'"]/g, '');
  
  const isMatch = spoken === targetWord || levenshtein(spoken, targetWord) <= 1;
  const accuracy = isMatch ? 100 : 0;

  // ── Ghi nhật ký data-driven + cập nhật lịch ôn SRS ──
  if (typeof PMData !== 'undefined') {
    PMData.recordAttempt({
      itemId: `clus:${targetWord}`,
      type: 'word',
      target: targetWord,
      accuracy,
      errorWords: isMatch ? [] : [targetWord],
      mode: 'asr-word',
    });
    if (typeof refreshDataDrivenDashboard === 'function') refreshDataDrivenDashboard();
  }

  const matchResult = document.getElementById('clusterMatchResult');
  const scoreRing = document.getElementById('clusterScoreRing');
  const scoreValue = document.getElementById('clusterScoreValue');
  const matchFeedback = document.getElementById('clusterMatchFeedback');
  
  matchResult.style.display = 'block';
  scoreRing.style.setProperty('--score', accuracy);
  scoreValue.textContent = accuracy + '%';
  
  if (accuracy === 100) {
    matchFeedback.textContent = '🎉 Chính xác! Phát âm chuẩn phụ âm cuối.';
    matchFeedback.style.color = 'var(--accent-green)';
    document.getElementById('clusterAiFeedbackContainer').style.display = 'none';
  } else {
    matchFeedback.textContent = '❌ Chưa khớp hoàn toàn. Hãy xem chỉ dẫn của AI Coach.';
    matchFeedback.style.color = 'var(--accent-red)';
    
    const aiContainer = document.getElementById('clusterAiFeedbackContainer');
    const aiContent = document.getElementById('clusterAiFeedbackContent');
    
    let result = null;
    try {
      const res = await fetch(`${API_BASE}/api/ai-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetText: targetWord, spokenText: transcript })
      });
      if (res.ok) {
        result = await res.json();
      }
    } catch (err) {
      console.warn('AI feedback API call failed, using local fallback', err);
    }

    if (!result) {
      result = getLocalAiFeedback(targetWord, transcript);
    }

    if (result && result.feedbacks && result.feedbacks.length > 0) {
      aiContainer.style.display = 'block';
      aiContent.innerHTML = result.feedbacks.map(f => `
        <div class="ai-feedback-card">
          <div class="ai-feedback-word">Từ lỗi: "${f.word}"</div>
          <div class="ai-feedback-advice">${f.advice}</div>
        </div>
      `).join('');
    } else {
      aiContainer.style.display = 'none';
    }
  }
}

function buildClusterChain(word) {
  const chains = {
    'build': ['buil', 'build'],
    'builds': ['buil', 'build', 'builds'],
    'risk': ['ris', 'risk'],
    'risks': ['ris', 'risk', 'risks'],
    'shaped': ['shape', 'shaped'],
    'robust': ['robus', 'robust'],
    'distinct': ['distinc', 'distinct'],
    'attracts': ['attrac', 'attract', 'attracts'],
    'strengths': ['streng', 'strength', 'strengths'],
    'sixths': ['six', 'sixth', 'sixths'],
    'prompts': ['promp', 'prompt', 'prompts'],
    'contexts': ['contex', 'context', 'contexts'],
    'trust': ['trus', 'trust'],
    'conclude': ['conclu', 'conclude'],
    'safe': ['saf', 'safe'],
  };
  return chains[word] || [word.slice(0, -1), word];
}

// ── Word Stress ───────────────────────────────────────────────
function renderStress() {
  const container = document.getElementById('stressWords');
  container.innerHTML = EXERCISES.wordStress.words.map(w => `
    <div class="card" style="cursor:pointer" onclick="speak('${w.word}', 0.6)">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
        <div>
          <div style="font-size:1.3rem;font-weight:700">${formatStress(w.stress)}</div>
          <span class="ipa-display" style="margin-top:4px">${w.ipa}</span>
        </div>
        <div style="text-align:right">
          ${w.error !== '—' ? `<div style="font-size:0.85rem;color:var(--accent-red)">Lỗi ASR: ${w.error}</div>` : ''}
          <div style="font-size:0.8rem;color:var(--text-muted)">${w.syllables} âm tiết</div>
        </div>
      </div>
    </div>
  `).join('');
  // Clapping drills
  const clappingContainer = document.getElementById('clappingDrills');
  const clappingSentences = [
    { text: '<strong>E</strong>thics is the <strong>FOUN</strong>dation of <strong>AN</strong>y sus<strong>TAIN</strong>able <strong>OR</strong>gani<strong>ZA</strong>tion.', raw: 'Ethics is the foundation of any sustainable organization.' },
    { text: '<strong>BUSI</strong>ness <strong>E</strong>thics <strong>BUILDS</strong> long-<strong>TERM</strong> repu<strong>TA</strong>tion and <strong>STAKE</strong>holder <strong>TRUST</strong>.', raw: 'Business ethics builds long-term reputation and stakeholder trust.' },
    { text: 'They <strong>AIM</strong> to <strong>GUIDE</strong> <strong>COR</strong>porate de<strong>CI</strong>sion <strong>MAK</strong>ing.', raw: 'They aim to guide corporate decision making.' },
    { text: 'What <strong>TRU</strong>ly <strong>MAT</strong>ters is a ro<strong>BUST</strong> <strong>SYS</strong>tem of <strong>OR</strong>gani<strong>ZA</strong>tional ac<strong>COUNT</strong>a<strong>BIL</strong>ity.', raw: 'What truly matters is a robust system of organizational accountability.' },
  ];
  
  clappingContainer.innerHTML = clappingSentences.map(s => `
    <div class="card" style="cursor:pointer" onclick="speak('${s.raw.replace(/'/g, "\\'")}', 0.75)">
      <div style="font-size:1.1rem;line-height:2">${s.text}</div>
      <div style="font-size:0.8rem;color:var(--text-muted);margin-top:8px">👆 Nhấn để nghe | 👏 Vỗ tay vào từ IN ĐẬM</div>
    </div>
  `).join('');
}

function formatStress(stress) {
  return stress.split('-').map(s => {
    if (s === s.toUpperCase()) {
      return `<span style="color:var(--accent-primary);font-size:1.5rem;font-weight:900">${s}</span>`;
    }
    return `<span style="color:var(--text-secondary)">${s}</span>`;
  }).join('<span style="color:var(--text-muted);margin:0 2px">·</span>');
}

// ── Breathing Exercise ────────────────────────────────────────
let breathingTimer = null;
let currentBreathMode = 'speech';

const breathModes = {
  speech: {
    name: 'Thở phát âm',
    desc: 'Hít nhanh bằng bụng qua mũi (2s) -> Nín giữ hơi ổn định (2s) -> Thở ra đều đặn khi phát âm từ đáy phổi (12s). Vai và lồng ngực trên giữ tĩnh lặng hoàn toàn.',
    phases: [
      { name: 'HÍT VÀO', duration: 2, class: 'inhale' },
      { name: 'NÍN GIỮ', duration: 2, class: 'hold' },
      { name: 'THỞ NÓI', duration: 12, class: 'exhale' }
    ]
  },
  vacuum: {
    name: 'Stomach Vacuum',
    desc: 'Hít vào nhẹ qua mũi (3s) -> Thở ra thật sạch hơi qua miệng (5s) -> Hóp sâu rốn sát cột sống và hướng lên lồng ngực tạo khoảng khuyết, nín thở giữ tĩnh co cơ đẳng trường (15s). Cực kỳ tốt để siết eo và săn chắc cơ bụng ngang TVA.',
    phases: [
      { name: 'HÍT NHẸ', duration: 3, class: 'inhale' },
      { name: 'THỞ SẠCH', duration: 5, class: 'exhale' },
      { name: 'HÓP BỤNG', duration: 15, class: 'hold' }
    ]
  },
  valsalva: {
    name: 'Valsalva tạ nặng',
    desc: 'Hít sâu căng tròn bụng 360 độ (3s) -> Đóng nắp thanh quản gồng cứng thành bụng bảo vệ cột sống thắt lưng (5s) -> Thở ra mạnh qua miệng giải phóng áp lực (2s). Áp dụng khi nâng tạ nặng (Squat/Deadlift).',
    phases: [
      { name: 'HÍT NÉN', duration: 3, class: 'inhale' },
      { name: 'GỒNG NÉN', duration: 5, class: 'hold' },
      { name: 'THỞ RA', duration: 2, class: 'exhale' }
    ]
  }
};

const defaultBreathDurations = {
  speech: [2, 2, 12],
  vacuum: [3, 5, 15],
  valsalva: [3, 5, 2]
};

function setBreathingMode(mode) {
  if (breathingTimer) {
    toggleBreathingExercise(); // stop first
  }
  currentBreathMode = mode;
  document.querySelectorAll('#tab-breathing .btn-group .btn').forEach(b => {
    b.className = 'btn btn-ghost';
  });
  const btn = document.getElementById(`btn-breath-${mode}`);
  if (btn) btn.className = 'btn btn-primary';
  
  const m = breathModes[mode];
  
  const slider1 = document.getElementById('breathSlider1');
  const slider2 = document.getElementById('breathSlider2');
  const slider3 = document.getElementById('breathSlider3');
  
  if (slider1 && slider2 && slider3) {
    slider1.value = m.phases[0].duration;
    slider2.value = m.phases[1].duration;
    slider3.value = m.phases[2].duration;
    
    document.getElementById('sliderLabel1').textContent = `${m.phases[0].name}: ${slider1.value}s`;
    document.getElementById('sliderLabel2').textContent = `${m.phases[1].name}: ${slider2.value}s`;
    document.getElementById('sliderLabel3').textContent = `${m.phases[2].name}: ${slider3.value}s`;
  }

  document.getElementById('breathInstruction').textContent = m.name + ' - Sẵn sàng';
  updateBreathModeDescription();
  
  const circle = document.getElementById('breathCircle');
  circle.className = 'breath-circle';
  circle.textContent = 'Sẵn sàng';
  document.getElementById('breathCounter').textContent = '0 / 5 nhịp';
}

function updateBreathSliders() {
  const slider1 = document.getElementById('breathSlider1');
  const slider2 = document.getElementById('breathSlider2');
  const slider3 = document.getElementById('breathSlider3');
  
  if (!slider1 || !slider2 || !slider3) return;
  
  const m = breathModes[currentBreathMode];
  
  m.phases[0].duration = parseInt(slider1.value);
  m.phases[1].duration = parseInt(slider2.value);
  m.phases[2].duration = parseInt(slider3.value);
  
  document.getElementById('sliderLabel1').textContent = `${m.phases[0].name}: ${slider1.value}s`;
  document.getElementById('sliderLabel2').textContent = `${m.phases[1].name}: ${slider2.value}s`;
  document.getElementById('sliderLabel3').textContent = `${m.phases[2].name}: ${slider3.value}s`;
  
  updateBreathModeDescription();
}

function updateBreathModeDescription() {
  const m = breathModes[currentBreathMode];
  const p1 = m.phases[0];
  const p2 = m.phases[1];
  const p3 = m.phases[2];
  
  let scientificNote = '';
  if (currentBreathMode === 'speech') {
    scientificNote = '<br><span style="color:var(--text-accent); font-size:0.8rem">💡 <strong>Lịch sử sinh học giọng nói:</strong> Trong thở phát âm, tỷ lệ thời gian hít/thở thay đổi từ 40:60 (thở thường) sang 10:90. Hít vào phải rất nhanh (1.5-2s) và thở ra nói rất dài (10-18s) để nói hết câu mà không bị đứt hơi. Tự do kéo dài thanh trượt để cá nhân hóa phù hợp với bác sĩ Long.</span>';
  } else if (currentBreathMode === 'vacuum') {
    scientificNote = '<br><span style="color:var(--text-accent); font-size:0.8rem">💡 <strong>Sports Science Note:</strong> Stomach Vacuum đòi hỏi thở kiệt phổi (4-6s) rồi nín thở hóp bụng (10-20s) kích hoạt tối đa cơ bụng ngang (TVA) siết eo.</span>';
  } else if (currentBreathMode === 'valsalva') {
    scientificNote = '<br><span style="color:var(--text-accent); font-size:0.8rem">💡 <strong>Biomechanics Note:</strong> Valsalva gồng bụng nén hơi bảo vệ cột sống thắt lưng khi đẩy tạ nặng (Squat/Deadlift).</span>';
  }
  
  document.getElementById('breathModeDescription').innerHTML = `
    <strong>Mô tả cơ học tùy chỉnh:</strong> ${p1.name} (${p1.duration}s) -> ${p2.name} (${p2.duration}s) -> ${p3.name} (${p3.duration}s). ${m.desc} ${scientificNote}
  `;
}

function resetBreathingDurations() {
  const defaults = defaultBreathDurations[currentBreathMode];
  if (defaults) {
    const m = breathModes[currentBreathMode];
    m.phases[0].duration = defaults[0];
    m.phases[1].duration = defaults[1];
    m.phases[2].duration = defaults[2];
    setBreathingMode(currentBreathMode);
  }
}

function toggleBreathingExercise() {
  const circle = document.getElementById('breathCircle');
  const btn = document.getElementById('breathBtn');
  const counter = document.getElementById('breathCounter');
  const instr = document.getElementById('breathInstruction');
  
  if (breathingTimer) {
    clearInterval(breathingTimer);
    breathingTimer = null;
    circle.className = 'breath-circle';
    circle.textContent = 'Sẵn sàng';
    btn.textContent = '▶ Bắt đầu';
    instr.textContent = 'Đã dừng bài tập';
    return;
  }
  
  btn.textContent = '⏹ Dừng';
  
  const modeData = breathModes[currentBreathMode];
  let cycle = 0;
  let phaseIdx = 0;
  let secondsRemaining = modeData.phases[phaseIdx].duration;
  
  function updateBreath() {
    const currentPhase = modeData.phases[phaseIdx];
    circle.className = `breath-circle ${currentPhase.class}`;
    circle.textContent = `${currentPhase.name}\n${secondsRemaining}s`;
    instr.textContent = `Nhịp ${cycle + 1} - Đang thực hiện ${currentPhase.name.toLowerCase()}`;
    
    secondsRemaining--;
    if (secondsRemaining < 0) {
      phaseIdx++;
      if (phaseIdx >= modeData.phases.length) {
        phaseIdx = 0;
        cycle++;
        counter.textContent = `${cycle} / 5 nhịp`;
        if (cycle >= 5) {
          clearInterval(breathingTimer);
          breathingTimer = null;
          circle.className = 'breath-circle';
          circle.textContent = '✅';
          btn.textContent = '▶ Bắt đầu lại';
          instr.textContent = 'Chúc mừng! Hoàn thành bài tập thở.';
          return;
        }
      }
      secondsRemaining = modeData.phases[phaseIdx].duration;
    }
  }
  
  updateBreath();
  breathingTimer = setInterval(updateBreath, 1000);
}

function renderBreathingExercises() {
  const container = document.getElementById('breathingExercises');
  container.innerHTML = EXERCISES.breathingExercises.map(ex => `
    <div class="card">
      <div class="card-title">🌬️ ${ex.name}</div>
      <div class="card-description">Thời gian: ${ex.duration}</div>
      <div class="exercise-steps">
        ${ex.steps.map((step, i) => `
          <div class="exercise-step">
            <div class="step-number">${i + 1}</div>
            <div class="step-content">${step}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

// ── Shadowing ─────────────────────────────────────────────────
function renderShadowing() {
  const container = document.getElementById('shadowingSentences');
  if (!container) return;
  container.innerHTML = EXERCISES.shadowingSentences.sentences.map((s, i) => {
    const ipaHtml = s.ipa ? `<div class="ipa" style="font-size:0.85rem;margin-top:4px;margin-bottom:8px;color:var(--accent-secondary);font-weight:500;">${s.ipa}</div>` : '';
    return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div class="card-title" style="margin-bottom:0">
            🗣️ Câu ${i + 1}
          </div>
          <div style="font-size:0.8rem;color:var(--text-muted)">Độ khó: ${'⭐'.repeat(s.difficulty)}</div>
        </div>
        <div class="target-text" style="font-size:1.1rem;margin-bottom:4px">${s.text}</div>
        ${ipaHtml}
        <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:12px">💡 ${s.focus} <span style="color:var(--text-muted)">(${s.tips || ''})</span></div>
        <div class="btn-group">
          <button class="btn btn-primary btn-sm" onclick="speak('${s.text.replace(/'/g, "\\'")}')">🔊 Nghe mẫu</button>
          <button class="btn btn-outline btn-sm" onclick="startShadowingRecord(${i})">🎙️ Luyện nói</button>
        </div>
      </div>
    `;
  }).join('');
}

function startShadowingRecord(idx) {
  switchTab('recorder');
  state.currentSentenceIdx = idx;
  updateSentenceDisplay();
}

// ── Urology Dictionary ────────────────────────────────────────
function renderUrologyDictionary() {
  const container = document.getElementById('urologyDictionaryContainer');
  if (!container) return;
  
  const words = EXERCISES.urologyDictionary.words;
  container.innerHTML = words.map(w => `
    <div class="urology-card" onclick="speak('${w.word}', 0.7)">
      <div class="word-title-row">
        <span>${w.word}</span>
        <span style="font-size: 1.2rem">🔊</span>
      </div>
      <div class="urology-ipa">${w.ipa}</div>
      <div class="urology-meaning">${w.meaning}</div>
      <div class="urology-advice">${w.advice}</div>
    </div>
  `).join('');
}

function filterUrologyDictionary() {
  const query = document.getElementById('urologySearch').value.toLowerCase();
  const cards = document.querySelectorAll('.urology-card');
  const words = EXERCISES.urologyDictionary.words;
  
  cards.forEach((card, idx) => {
    const w = words[idx];
    if (w.word.toLowerCase().includes(query) || w.meaning.toLowerCase().includes(query)) {
      card.style.display = 'flex';
    } else {
      card.style.display = 'none';
    }
  });
}

function speakCurrentSentence() {
  const sentences = getActiveSentences();
  const s = sentences[state.currentSentenceIdx];
  if (s) speak(s.text);
}

// ── Schedule ──────────────────────────────────────────────────
function renderSchedule() {
  const container = document.getElementById('scheduleGrid');
  container.innerHTML = EXERCISES.schedule.days.map(day => `
    <div class="schedule-card ${state.currentDay === day.day ? 'active' : ''}" onclick="setCurrentDay(${day.day})">
      <div class="day-num">Ngày ${day.day}</div>
      <div class="day-title">${day.title}</div>
      <div class="session-list">
        <div class="session-item">🌅 ${day.morning}</div>
        <div class="session-item">☀️ ${day.midday}</div>
        <div class="session-item">🌤️ ${day.afternoon}</div>
        <div class="session-item">🌙 ${day.evening}</div>
      </div>
      <div class="day-hours">⏱️ ${day.totalHours}</div>
    </div>
  `).join('');
}

function setCurrentDay(day) {
  state.currentDay = day;
  saveState();
  updateDashboard();
  renderSchedule();
  renderLecture();
  renderPracticeTracker();
}

// ── Lecture Render ────────────────────────────────────────────
function renderLecture() {
  const lecture = EXERCISES.lectures[state.currentDay];
  const titleEl = document.getElementById('lecture-title');
  const contentEl = document.getElementById('lecture-content');
  if (lecture) {
    if (titleEl) titleEl.textContent = lecture.title;
    if (contentEl) contentEl.textContent = lecture.content;
  }
}

// ── Practice Set Tracker ──────────────────────────────────────
function renderPracticeTracker() {
  const container = document.getElementById('daily-practice-list');
  if (!container) return;

  const exercises = EXERCISES.dailyExercises[state.currentDay] || [];
  
  if (exercises.length === 0) {
    container.innerHTML = `<div style="color:var(--text-secondary);font-size:0.9rem;text-align:center;padding:20px;">Không có bài tập cấu hình cho ngày hôm nay.</div>`;
    return;
  }

  container.innerHTML = exercises.map(ex => {
    const completed = state.completedSets[ex.id] || 0;
    const isDone = completed >= ex.targetSets;
    const isExpanded = state.expandedExerciseId === ex.id;
    const guide = window.EXERCISES_GUIDES ? window.EXERCISES_GUIDES[ex.id] : null;
    
    let cardClass = isDone ? 'practice-item done' : 'practice-item';
    if (isExpanded) cardClass += ' expanded';
    const badgeColor = isDone ? 'var(--accent-green)' : 'var(--accent-primary)';
    
    const isTimerRunningForThis = state.activeTimerExerciseId === ex.id;
    const isBreathingRunningForThis = state.activeBreathingExerciseId === ex.id;
    
    // Header row HTML
    const headerHtml = `
      <div class="practice-header" onclick="toggleExerciseAccordion('${ex.id}')" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;width:100%;">
        <div style="flex:1;text-align:left;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="practice-name" style="font-weight:700;font-size:0.95rem;color:var(--text-primary);">${ex.name}</span>
            <span style="font-size:0.72rem;padding:2px 8px;border-radius:20px;background:rgba(255,255,255,0.05);color:var(--text-accent);text-transform:capitalize;">${ex.type}</span>
          </div>
          <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:4px;">${ex.desc}</p>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;" onclick="event.stopPropagation();">
          <span class="set-badge ${isDone ? 'completed' : ''}" style="font-family:var(--font-mono);font-size:0.82rem;padding:4px 8px;border-radius:var(--radius-sm);background:${isDone ? 'var(--accent-green-glow)' : 'rgba(255,255,255,0.03)'};border:1px solid ${isDone ? 'var(--accent-green)' : 'var(--border-subtle)'};color:${isDone ? 'var(--accent-green)' : 'var(--text-secondary)'};font-weight:600;">
            ${completed} / ${ex.targetSets} set
          </span>
          <button class="btn btn-sm btn-primary btn-complete-set" onclick="completeSet('${ex.id}', ${ex.targetSets})" ${isDone ? 'disabled style="background:var(--accent-green-glow);border-color:var(--accent-green);color:var(--accent-green);cursor:default;"' : ''}>
            ${isDone ? '✅ Đạt' : '＋ Set'}
          </button>
        </div>
      </div>
    `;

    // Extended guide details HTML
    let guidePanelHtml = '';
    if (guide && isExpanded) {
      let interactiveToolHtml = '';
      
      if (guide.breathingPattern) {
        const patternStr = guide.breathingPattern.join('-');
        const isRunning = isBreathingRunningForThis;
        
        interactiveToolHtml = `
          <div class="interactive-tool-box" style="margin-top:15px;padding:15px;background:rgba(0,0,0,0.25);border-radius:var(--radius-md);border:1px solid rgba(255,255,255,0.05);width:100%;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
              <span style="font-size:0.85rem;font-weight:600;color:var(--text-accent);">🫁 Bộ đếm thở sinh học (Hít-Nín-Thở: ${patternStr} giây)</span>
              <span style="font-size:0.8rem;color:var(--text-secondary);">Nhịp hiện tại: <strong id="breath-cycle-counter" style="color:var(--accent-primary);font-size:1rem;font-family:var(--font-mono);">${isRunning ? state.breathingCycleCount : 0}</strong> / 10</span>
            </div>
            
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:15px 0;gap:12px;">
              <div class="breathing-circle-container" style="height:120px;display:flex;align-items:center;justify-content:center;position:relative;width:100%;">
                <div id="breathing-guide-circle" class="breathing-circle ${isRunning ? state.breathingPhase : ''}" style="width:55px;height:55px;border-radius:50%;background:radial-gradient(circle, var(--accent-glow) 0%, var(--accent-primary) 100%);box-shadow:0 0 20px var(--accent-glow);transition: all 1s ease-in-out;"></div>
                <div id="breathing-timer-text" style="position:absolute;font-family:var(--font-mono);font-size:1.1rem;font-weight:700;color:white;text-shadow:0 2px 4px rgba(0,0,0,0.6);">
                  ${isRunning ? `${state.breathingSecondsRemaining}s` : 'Sẵn sàng'}
                </div>
              </div>
              
              <div id="breathing-phase-label" style="font-size:0.85rem;font-weight:700;color:var(--text-primary);min-height:20px;text-transform:uppercase;letter-spacing:1px;text-align:center;">
                ${isRunning ? getBreathingPhaseVietnamese(state.breathingPhase) : 'Nhấn nút bên dưới để bắt đầu tập'}
              </div>
              
              <button class="btn btn-sm ${isRunning ? 'btn-secondary' : 'btn-accent'}" onclick="toggleBreathingGuide('${ex.id}', [${guide.breathingPattern.join(',')}])" style="font-size:0.8rem;padding:5px 12px;">
                ${isRunning ? '⏹ Dừng tập' : '▶ Bắt đầu tập (Đủ 10 nhịp = 1 Set)'}
              </button>
            </div>
          </div>
        `;
      } else if (guide.duration) {
        const isRunning = isTimerRunningForThis;
        const totalDuration = guide.duration;
        const currentRemaining = isRunning ? state.activeTimerRemaining : totalDuration;
        
        interactiveToolHtml = `
          <div class="interactive-tool-box" style="margin-top:15px;padding:15px;background:rgba(0,0,0,0.25);border-radius:var(--radius-md);border:1px solid rgba(255,255,255,0.05);width:100%;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <span style="font-size:0.85rem;font-weight:600;color:var(--text-accent);">⏱️ Bộ đếm thời gian luyện tập</span>
              <span style="font-size:0.8rem;color:var(--text-secondary);">${isRunning ? 'Đang đếm ngược...' : 'Sẵn sàng'}</span>
            </div>
            
            <div style="display:flex;align-items:center;justify-content:center;gap:20px;padding:10px 0;">
              <div class="timer-value ${isRunning ? 'timer-running' : ''}" style="font-family:var(--font-mono);font-size:2.2rem;font-weight:700;color:${isRunning ? 'var(--accent-primary)' : 'white'};text-shadow:0 0 10px rgba(99,102,241,0.2);min-width:75px;text-align:center;">
                ${currentRemaining}s
              </div>
              
              <button class="btn btn-sm ${isRunning ? 'btn-secondary' : 'btn-accent'}" onclick="toggleExerciseTimer('${ex.id}', ${totalDuration})" style="font-size:0.8rem;padding:6px 14px;">
                ${isRunning ? '⏹ Dừng đếm' : '▶ Bắt đầu (Đếm ngược ' + totalDuration + 's)'}
              </button>
            </div>
          </div>
        `;
      }

      guidePanelHtml = `
        <div class="practice-guide-panel" style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.05);text-align:left;width:100%;">
          <div class="guide-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:15px;margin-bottom:12px;">
            <div>
              <h5 class="guide-section-title" style="font-size:0.75rem;font-weight:700;color:var(--text-accent);margin-bottom:6px;letter-spacing:0.5px;text-transform:uppercase;">🔬 Cơ sở khoa học</h5>
              <p style="font-size:0.8rem;color:var(--text-secondary);line-height:1.45;margin:0;">${guide.science}</p>
            </div>
            <div>
              <h5 class="guide-section-title" style="font-size:0.75rem;font-weight:700;color:var(--accent-red);margin-bottom:6px;letter-spacing:0.5px;text-transform:uppercase;">⚠️ Lỗi sai cần tránh</h5>
              <ul class="guide-pitfalls-list" style="margin:0;padding-left:14px;font-size:0.8rem;color:var(--text-secondary);line-height:1.45;">
                ${guide.pitfalls.map(p => `<li>${p}</li>`).join('')}
              </ul>
            </div>
          </div>
          <div style="margin-bottom:12px;">
            <h5 class="guide-section-title" style="font-size:0.75rem;font-weight:700;color:var(--accent-green);margin-bottom:6px;letter-spacing:0.5px;text-transform:uppercase;">📋 Các bước thực hiện</h5>
            <ol class="guide-steps-list" style="margin:0;padding-left:14px;font-size:0.8rem;color:var(--text-secondary);line-height:1.45;">
              ${guide.steps.map(s => `<li>${s}</li>`).join('')}
            </ol>
          </div>
          ${interactiveToolHtml}
        </div>
      `;
    }

    return `
      <div id="ex-card-${ex.id}" class="${cardClass}" style="display:flex;flex-direction:column;align-items:flex-start;padding:14px;background:rgba(255,255,255,0.015);border:1px solid var(--border-subtle);border-radius:var(--radius-md);gap:0;transition:all 0.3s ease;width:100%;margin-bottom:2px;">
        ${headerHtml}
        ${guidePanelHtml}
      </div>
    `;
  }).join('');
}

function completeSet(exerciseId, targetSets) {
  const current = state.completedSets[exerciseId] || 0;
  if (current < targetSets) {
    state.completedSets[exerciseId] = current + 1;
    playCompletionBeep();
    saveState();
    updateDashboard();
    renderPracticeTracker();
  }
}

// ── Interactive Guides Helpers ─────────────────────────────────
function getBreathingPhaseVietnamese(phase) {
  switch (phase) {
    case 'inhale': return '🌬️ Hít vào... (Bụng phình)';
    case 'hold': return '🧘 Nín giữ hơi... (Cân bằng)';
    case 'exhale': return '💨 Thở ra chậm... (Bụng xẹp)';
    default: return 'Chuẩn bị bắt đầu';
  }
}

function toggleExerciseAccordion(exerciseId) {
  state.expandedExerciseId = state.expandedExerciseId === exerciseId ? null : exerciseId;
  // Stop running timers or guides when switching/closing accordion
  stopExerciseTimer();
  stopBreathingExercise();
  renderPracticeTracker();
}

function toggleExerciseTimer(exerciseId, duration) {
  if (state.activeTimerExerciseId === exerciseId) {
    stopExerciseTimer();
  } else {
    stopExerciseTimer();
    stopBreathingExercise();
    
    state.activeTimerExerciseId = exerciseId;
    state.activeTimerRemaining = duration;
    renderPracticeTracker();
    
    state.activeTimerInterval = setInterval(() => {
      state.activeTimerRemaining--;
      if (state.activeTimerRemaining <= 0) {
        const ex = EXERCISES.dailyExercises[state.currentDay]?.find(e => e.id === exerciseId);
        const targetSets = ex ? ex.targetSets : 3;
        completeSet(exerciseId, targetSets);
        stopExerciseTimer();
      } else {
        const timerValEl = document.querySelector(`#ex-card-${exerciseId} .timer-value`);
        if (timerValEl) timerValEl.textContent = `${state.activeTimerRemaining}s`;
      }
    }, 1000);
  }
}

function stopExerciseTimer() {
  if (state.activeTimerInterval) {
    clearInterval(state.activeTimerInterval);
    state.activeTimerInterval = null;
  }
  state.activeTimerExerciseId = null;
  state.activeTimerRemaining = 0;
}

function toggleBreathingGuide(exerciseId, pattern) {
  if (state.activeBreathingExerciseId === exerciseId) {
    stopBreathingExercise();
  } else {
    stopExerciseTimer();
    stopBreathingExercise();
    
    state.activeBreathingExerciseId = exerciseId;
    state.breathingCycleCount = 0;
    
    runBreathingCycle(pattern);
  }
}

function runBreathingCycle(pattern) {
  if (state.activeBreathingExerciseId !== state.expandedExerciseId) return;
  
  const [inhale, hold, exhale] = pattern;
  
  // Phase 1: Inhale
  state.breathingPhase = 'inhale';
  state.breathingSecondsRemaining = inhale;
  updateBreathingUI();
  
  let timer = setInterval(() => {
    state.breathingSecondsRemaining--;
    if (state.breathingSecondsRemaining <= 0) {
      clearInterval(timer);
      
      // Phase 2: Hold
      state.breathingPhase = 'hold';
      state.breathingSecondsRemaining = hold;
      updateBreathingUI();
      
      timer = setInterval(() => {
        state.breathingSecondsRemaining--;
        if (state.breathingSecondsRemaining <= 0) {
          clearInterval(timer);
          
          // Phase 3: Exhale
          state.breathingPhase = 'exhale';
          state.breathingSecondsRemaining = exhale;
          updateBreathingUI();
          
          timer = setInterval(() => {
            state.breathingSecondsRemaining--;
            if (state.breathingSecondsRemaining <= 0) {
              clearInterval(timer);
              
              // Completed one full cycle
              state.breathingCycleCount++;
              const cycleCounter = document.getElementById('breath-cycle-counter');
              if (cycleCounter) cycleCounter.textContent = state.breathingCycleCount;
              
              if (state.breathingCycleCount >= 10) {
                const ex = EXERCISES.dailyExercises[state.currentDay]?.find(e => e.id === state.activeBreathingExerciseId);
                const targetSets = ex ? ex.targetSets : 3;
                completeSet(state.activeBreathingExerciseId, targetSets);
                stopBreathingExercise();
              } else {
                runBreathingCycle(pattern);
              }
            } else {
              updateBreathingUI();
            }
          }, 1000);
          
          state.activeBreathingInterval = timer;
        } else {
          updateBreathingUI();
        }
      }, 1000);
      
      state.activeBreathingInterval = timer;
    } else {
      updateBreathingUI();
    }
  }, 1000);
  
  state.activeBreathingInterval = timer;
}

function updateBreathingUI() {
  const textEl = document.getElementById('breathing-timer-text');
  const circleEl = document.getElementById('breathing-guide-circle');
  const labelEl = document.getElementById('breathing-phase-label');
  
  if (textEl) textEl.textContent = `${state.breathingSecondsRemaining}s`;
  if (labelEl) labelEl.textContent = getBreathingPhaseVietnamese(state.breathingPhase);
  
  if (circleEl) {
    circleEl.className = `breathing-circle ${state.breathingPhase}`;
  }
}

function stopBreathingExercise() {
  if (state.activeBreathingInterval) {
    clearInterval(state.activeBreathingInterval);
    state.activeBreathingInterval = null;
  }
  state.activeBreathingExerciseId = null;
  state.breathingPhase = null;
  state.breathingSecondsRemaining = 0;
  state.breathingCycleCount = 0;
}

function playCompletionBeep() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    oscillator.stop(audioCtx.currentTime + 0.25);
  } catch (err) {
    console.warn('Audio Context beep play failed:', err);
  }
}

// ── Persistence & Server Sync ─────────────────────────────────
async function saveState() {
  localStorage.setItem('currentDay', state.currentDay);
  localStorage.setItem('sessions', state.sessions);
  localStorage.setItem('totalMinutes', state.totalMinutes);
  localStorage.setItem('lastAccuracy', state.lastAccuracy);
  localStorage.setItem('completedSets', JSON.stringify(state.completedSets));

  const notesArea = document.getElementById('pronunciationNotes');
  const notes = notesArea ? notesArea.value : '';

  try {
    await fetch(`${API_BASE}/api/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentDay: state.currentDay,
        sessions: state.sessions,
        totalMinutes: state.totalMinutes,
        lastAccuracy: state.lastAccuracy,
        notes: notes,
        completedSets: state.completedSets
      })
    });
  } catch (err) {
    console.warn('Failed to sync progress to server', err);
  }
}

async function loadStateFromServer() {
  let loaded = false;
  try {
    const res = await fetch(`${API_BASE}/api/progress`);
    if (res.ok) {
      const data = await res.json();
      state.currentDay = data.currentDay || 1;
      state.sessions = data.sessions || 0;
      state.totalMinutes = data.totalMinutes || 0;
      state.lastAccuracy = data.lastAccuracy || '—';
      state.completedSets = data.completedSets || JSON.parse(localStorage.getItem('completedSets') || '{}');
      
      const notesArea = document.getElementById('pronunciationNotes');
      if (notesArea) notesArea.value = data.notes || '';
      
      loaded = true;
    }
  } catch (err) {
    console.warn('Failed to load progress from server, using local storage backup', err);
  }

  if (!loaded) {
    state.currentDay = parseInt(localStorage.getItem('currentDay') || '1');
    state.sessions = parseInt(localStorage.getItem('sessions') || '0');
    state.totalMinutes = parseInt(localStorage.getItem('totalMinutes') || '0');
    state.lastAccuracy = localStorage.getItem('lastAccuracy') || '—';
    state.completedSets = JSON.parse(localStorage.getItem('completedSets') || '{}');
    
    const notesArea = document.getElementById('pronunciationNotes');
    if (notesArea) notesArea.value = localStorage.getItem('pronunciationNotes') || '';
  }

  updateDashboard();
  renderSchedule();
  renderLecture();
  renderPracticeTracker();
}

// ── Initialize ────────────────────────────────────────────────
async function init() {
  // Load voices
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }
  
  await loadStateFromServer();

  // Tự động tìm kiếm Tunnel URL từ GitHub Pages
  try {
    const res = await fetch('data/tunnel_url.json?_t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data && data.url) {
        console.log('Phát hiện máy chủ AI tự động:', data.url);
        state.discoveredTunnelUrl = data.url;
        const isLocalBackendHost = ['localhost', '127.0.0.1', '::1'].includes((window.location.hostname || '').toLowerCase());
        
        // Nếu người dùng chưa cấu hình thủ công trong localStorage, tự động sử dụng link này
        if (!localStorage.getItem('ai_api_base') && !isLocalBackendHost) {
          API_BASE = data.url;
          console.log('Đã tự động chuyển đổi Cổng AI sang:', API_BASE);
        }
      }
    }
  } catch (e) {
    console.log('Không phát hiện máy chủ AI tự động hoặc đang chạy offline.');
  }

  if (typeof getPhonemeServiceStatus === 'function') {
    getPhonemeServiceStatus(true);
  }

  // Nạp dữ liệu học tập (SRS + nhật ký) rồi dựng kho item + biểu đồ
  if (typeof PMData !== 'undefined') {
    await PMData.load();
    if (typeof buildItemPool === 'function') buildItemPool();
    if (typeof renderProgressCharts === 'function') renderProgressCharts();
  }

  updateDashboard();
  updateSentenceDisplay();
  // Đồng bộ nhãn nút HVPT theo trạng thái đã lưu
  const hvptEl = document.getElementById('hvptToggle');
  if (hvptEl) {
    hvptEl.textContent = state.hvptMode ? '🎚️ Đa giọng HVPT: BẬT' : '🎚️ Đa giọng HVPT: TẮT';
    hvptEl.className = state.hvptMode ? 'btn btn-success btn-sm' : 'btn btn-ghost btn-sm';
  }
  showPairGroup('dental_fricatives');
  renderClusters();
  populateClusterSelect();
  renderStress();
  setBreathingMode('speech');
  renderBreathingExercises();
  renderShadowing();
  renderUrologyDictionary();
  renderSchedule();
  renderLecture();
  renderPracticeTracker();
  initTtsSettings();
  
  // Đồng bộ giá trị chọn tốc độ đọc mẫu khi khởi chạy
  document.querySelectorAll('.tts-speed-selector').forEach(select => {
    select.value = state.ttsSpeed || '0.85';
  });
  
  // Save notes dynamically
  const notesArea = document.getElementById('pronunciationNotes');
  if (notesArea) {
    notesArea.addEventListener('blur', saveState);
  }
  
  // Track practice time
  setInterval(() => {
    if (state.sessionStart) {
      const minutes = Math.round((Date.now() - state.sessionStart) / 60000);
      document.getElementById('stat-minutes').textContent = state.totalMinutes + minutes;
    }
  }, 30000);
}

// Start
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('load', () => {
  if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
});
