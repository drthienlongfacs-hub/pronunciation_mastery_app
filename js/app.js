// ============================================================
// PRONUNCIATION MASTERY — Core Application Logic
// ============================================================

const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:3000' : '';

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
};

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
    
    // continuous = true cho phép bác sĩ Long ngắt nghỉ lấy hơi giữa câu thoải mái
    state.recognition = initSpeechRecognition(true);
    if (!state.recognition) {
      label.textContent = 'Trình duyệt không hỗ trợ Speech Recognition. Dùng Chrome.';
      return;
    }
    
    const asrResult = document.getElementById('asrResult');
    const asrTranscript = document.getElementById('asrTranscript');
    
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
  const sentences = EXERCISES.shadowingSentences.sentences;
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
    try {
      const res = await fetch(`${API_BASE}/api/ai-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetText: originalTarget, spokenText: transcript })
      });
      if (res.ok) {
        const result = await res.json();
        if (result.feedbacks && result.feedbacks.length > 0) {
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
      }
    } catch (err) {
      console.warn('AI feedback API call failed', err);
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

// ── Sentence Navigation ───────────────────────────────────────
function updateSentenceDisplay() {
  const sentences = EXERCISES.shadowingSentences.sentences;
  const s = sentences[state.currentSentenceIdx];
  const target = document.getElementById('recorder-target');
  target.innerHTML = `${s.text}<span class="ipa" style="font-size:0.8rem;margin-top:8px;display:block;color:var(--text-secondary)">${s.tips}</span>`;
  document.getElementById('sentence-counter').textContent = 
    `${state.currentSentenceIdx + 1} / ${sentences.length}`;
  
  // Reset results
  document.getElementById('asrResult').style.display = 'none';
  document.getElementById('matchResult').style.display = 'none';
}

function nextSentence() {
  const sentences = EXERCISES.shadowingSentences.sentences;
  state.currentSentenceIdx = (state.currentSentenceIdx + 1) % sentences.length;
  updateSentenceDisplay();
}

function prevSentence() {
  const sentences = EXERCISES.shadowingSentences.sentences;
  state.currentSentenceIdx = (state.currentSentenceIdx - 1 + sentences.length) % sentences.length;
  updateSentenceDisplay();
}

// ── Text-to-Speech ────────────────────────────────────────────
let currentAudio = null;

function speak(text, rate = 0.85) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }

  const encodedText = encodeURIComponent(text);
  const audioUrl = `${API_BASE}/api/tts?text=${encodedText}&rate=${rate}`;

  const audio = new Audio(audioUrl);
  currentAudio = audio;

  audio.play().catch(err => {
    console.warn('Dynamic Edge-TTS playback failed, falling back to Web Speech API', err);
    fallbackWebSpeech(text, rate);
  });
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
function showPairGroup(groupKey) {
  const group = EXERCISES.minimalPairs[groupKey];
  if (!group) return;
  
  // Update buttons
  document.querySelectorAll('#tab-minimal-pairs .btn-group .btn').forEach(b => {
    b.className = 'btn btn-ghost';
  });
  const btnMap = { dental_fricatives: 'btn-dental', aspiration: 'btn-aspiration', sibilants: 'btn-sibilants' };
  const activeBtn = document.getElementById(btnMap[groupKey]);
  if (activeBtn) activeBtn.className = 'btn btn-primary';
  
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
    
    initAudioVisualization(stream);
    
    state.recognition = initSpeechRecognition(false);
    if (!state.recognition) {
      label.textContent = 'Trình duyệt không hỗ trợ. Dùng Chrome.';
      return;
    }
    
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
      label.textContent = `Lỗi: ${event.error}`;
    };
    
    state.recognition.onend = () => {
      if (state.isRecording) {
        toggleClusterRecording();
      }
    };
    
    state.recognition.start();
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
    
    try {
      const res = await fetch(`${API_BASE}/api/ai-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetText: targetWord, spokenText: transcript })
      });
      if (res.ok) {
        const result = await res.json();
        if (result.feedbacks && result.feedbacks.length > 0) {
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
    } catch (err) {
      console.warn('AI feedback API call failed', err);
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
  container.innerHTML = EXERCISES.shadowingSentences.sentences.map((s, i) => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div class="card-title" style="margin-bottom:0">
          🗣️ Câu ${i + 1}
        </div>
        <div style="font-size:0.8rem;color:var(--text-muted)">Độ khó: ${'⭐'.repeat(s.difficulty)}</div>
      </div>
      <div class="target-text" style="font-size:1.1rem;margin-bottom:12px">${s.text}</div>
      <div style="font-size:0.85rem;color:var(--accent-secondary);margin-bottom:12px">💡 ${s.focus}</div>
      <div class="btn-group">
        <button class="btn btn-primary btn-sm" onclick="speak('${s.text.replace(/'/g, "\\'")}')">🔊 Nghe mẫu</button>
        <button class="btn btn-outline btn-sm" onclick="startShadowingRecord(${i})">🎙️ Luyện nói</button>
      </div>
    </div>
  `).join('');
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
  const sentences = EXERCISES.shadowingSentences.sentences;
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
    
    const cardClass = isDone ? 'practice-item done' : 'practice-item';
    const badgeColor = isDone ? 'var(--accent-green)' : 'var(--accent-primary)';
    
    return `
      <div class="${cardClass}" style="display:flex;align-items:center;justify-content:space-between;padding:14px;background:rgba(255,255,255,0.02);border:1px solid var(--border-subtle);border-radius:var(--radius-md);gap:12px;">
        <div style="flex:1;text-align:left;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-weight:600;font-size:0.95rem;color:var(--text-primary);">${ex.name}</span>
            <span style="font-size:0.75rem;padding:2px 8px;border-radius:20px;background:rgba(255,255,255,0.05);color:var(--text-accent);text-transform:capitalize;">${ex.type}</span>
          </div>
          <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:4px;">${ex.desc}</p>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
          <span style="font-family:var(--font-mono);font-size:0.85rem;padding:4px 8px;border-radius:var(--radius-sm);background:${badgeColor};color:white;font-weight:600;">
            ${completed} / ${ex.targetSets} set
          </span>
          <button class="btn btn-sm btn-primary" onclick="completeSet('${ex.id}', ${ex.targetSets})" ${isDone ? 'style="background:var(--accent-green);border-color:var(--accent-green);cursor:default;"' : ''}>
            ${isDone ? '✅ Đạt' : '＋ Set'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function completeSet(exerciseId, targetSets) {
  const current = state.completedSets[exerciseId] || 0;
  if (current < targetSets) {
    state.completedSets[exerciseId] = current + 1;
    saveState();
    updateDashboard();
    renderPracticeTracker();
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
      
      updateDashboard();
      renderSchedule();
      renderLecture();
      renderPracticeTracker();
    }
  } catch (err) {
    console.warn('Failed to load progress from server, using local storage backup', err);
    state.completedSets = JSON.parse(localStorage.getItem('completedSets') || '{}');
  }
}

// ── Initialize ────────────────────────────────────────────────
async function init() {
  // Load voices
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }
  
  await loadStateFromServer();

  // Nạp dữ liệu học tập (SRS + nhật ký) rồi dựng kho item + biểu đồ
  if (typeof PMData !== 'undefined') {
    await PMData.load();
    if (typeof buildItemPool === 'function') buildItemPool();
    if (typeof renderProgressCharts === 'function') renderProgressCharts();
  }

  updateDashboard();
  updateSentenceDisplay();
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
