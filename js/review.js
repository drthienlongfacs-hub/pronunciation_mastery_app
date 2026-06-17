// ============================================================
// PRONUNCIATION MASTERY — Smart Review (SRS) + Progress Charts
// Phụ thuộc (global từ app.js): EXERCISES, alignWords, levenshtein,
// speak, API_BASE, PMData (srs.js), switchTab, initSpeechRecognition
// ============================================================

// ── Kho item hợp nhất (mọi thứ có thể luyện + ôn) ────────────
let ITEM_POOL = [];

function buildItemPool() {
  const pool = [];

  // Câu shadowing (bài thuyết trình thật của bác sĩ)
  (EXERCISES.shadowingSentences?.sentences || []).forEach((s, i) => {
    pool.push({
      id: `sent:${i}`, type: 'sentence', text: s.text,
      hint: s.tips || s.focus || '', ipa: '', sentenceIdx: i,
      label: s.text,
    });
  });

  // Từ cụm phụ âm cuối
  (EXERCISES.finalClusters?.levels || []).forEach(level => {
    (level.words || []).forEach(w => {
      pool.push({
        id: `clus:${w.word}`, type: 'word', text: w.word,
        ipa: w.target || '', hint: w.focus || '', label: w.word,
      });
    });
  });

  // Trọng âm từ
  (EXERCISES.wordStress?.words || []).forEach(w => {
    pool.push({
      id: `stress:${w.word}`, type: 'word', text: w.word,
      ipa: w.ipa || '', hint: w.stress || '', label: w.word,
    });
  });

  // Thuật ngữ niệu khoa
  (EXERCISES.urologyDictionary?.words || []).forEach(w => {
    pool.push({
      id: `uro:${w.word}`, type: 'word', text: w.word,
      ipa: w.ipa || '', hint: w.advice || '', label: w.word,
    });
  });

  // Từ trong minimal pairs (chỉ từ chuẩn = word1)
  Object.values(EXERCISES.minimalPairs || {}).forEach(group => {
    (group.pairs || []).forEach(p => {
      pool.push({
        id: `mp:${p.word1}`, type: 'word', text: p.word1,
        ipa: p.ipa1 || '', hint: p.audio_hint || '', label: p.word1,
      });
    });
  });

  ITEM_POOL = pool;
  return pool;
}

// ── Tab Ôn tập thông minh (SRS) ──────────────────────────────
let reviewQueue = [];
let reviewIdx = 0;

function renderSmartReview() {
  const container = document.getElementById('reviewContent');
  if (!container) return;
  if (!ITEM_POOL.length) buildItemPool();

  const stats = PMData.getStats(ITEM_POOL);
  const queue = PMData.getDueQueue(ITEM_POOL);
  // Hàng đợi: item đến hạn trước, sau đó vài item mới (tối đa 8 item mới/buổi)
  reviewQueue = queue.due.concat(queue.fresh.slice(0, 8));
  reviewIdx = 0;

  const statsHtml = `
    <div class="stats-grid" style="margin-bottom:16px">
      <div class="stat-card"><div class="stat-value" style="color:var(--accent-red)">${stats.due}</div><div class="stat-label">Đến hạn ôn</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--accent-amber)">${stats.learning}</div><div class="stat-label">Đang học</div></div>
      <div class="stat-card"><div class="stat-value" style="color:var(--accent-green)">${stats.mastered}</div><div class="stat-label">Đã thành thạo</div></div>
      <div class="stat-card"><div class="stat-value">${stats.fresh}</div><div class="stat-label">Chưa học</div></div>
    </div>`;

  if (reviewQueue.length === 0) {
    container.innerHTML = statsHtml + `
      <div class="card" style="text-align:center;padding:32px">
        <div style="font-size:3rem">🎉</div>
        <div class="card-title" style="justify-content:center">Hôm nay không còn gì phải ôn!</div>
        <div class="card-description">Bộ não cần thời gian củng cố trí nhớ. Quay lại ngày mai để ôn các từ đến hạn, hoặc luyện thêm ở các tab khác.</div>
      </div>`;
    return;
  }

  container.innerHTML = statsHtml + `
    <div class="card" id="reviewCard">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div class="card-title" style="margin-bottom:0">🧠 Ôn tập ngắt quãng</div>
        <span style="font-size:0.85rem;color:var(--text-muted)" id="reviewCounter"></span>
      </div>
      <div class="card-description">Hệ thống tự chọn từ/câu bạn sắp quên hoặc hay sai để ôn đúng lúc (thuật toán SM-2 như Anki).</div>
      <div id="reviewItemArea"></div>
    </div>`;

  showReviewItem();
}

function showReviewItem() {
  const area = document.getElementById('reviewItemArea');
  const counter = document.getElementById('reviewCounter');
  if (!area) return;

  if (reviewIdx >= reviewQueue.length) {
    area.innerHTML = `
      <div style="text-align:center;padding:24px">
        <div style="font-size:2.5rem">✅</div>
        <div style="font-weight:700;margin:8px 0">Hoàn thành buổi ôn (${reviewQueue.length} mục)!</div>
        <button class="btn btn-primary" onclick="renderSmartReview()">Làm mới hàng đợi</button>
      </div>`;
    if (counter) counter.textContent = '';
    return;
  }

  const item = reviewQueue[reviewIdx];
  const st = PMData.getItemState(item.id);
  const stTxt = st && st.seen > 0
    ? `Đã ôn ${st.seen} lần · lần trước ${st.lastAccuracy}% · giãn cách ${st.interval} ngày`
    : '🆕 Mục mới';

  if (counter) counter.textContent = `${reviewIdx + 1} / ${reviewQueue.length}`;

  area.innerHTML = `
    <div class="target-text" style="text-align:center;font-size:${item.type === 'sentence' ? '1.15rem' : '1.6rem'};margin:16px 0">
      ${item.text}
      ${item.ipa ? `<span class="ipa" style="display:block;font-size:0.85rem;margin-top:8px;color:var(--text-secondary)">${item.ipa}</span>` : ''}
      ${item.hint ? `<span style="display:block;font-size:0.8rem;margin-top:6px;color:var(--accent-secondary)">💡 ${item.hint}</span>` : ''}
    </div>
    <div style="text-align:center;font-size:0.78rem;color:var(--text-muted);margin-bottom:12px">${stTxt}</div>
    <div class="btn-group" style="justify-content:center;margin-bottom:12px">
      <button class="btn btn-ghost btn-sm" onclick="speak('${item.text.replace(/'/g, "\\'")}', ${item.type === 'sentence' ? 0.85 : 0.6})">🔊 Nghe mẫu</button>
    </div>
    <div class="recorder-container">
      <button class="record-btn" id="reviewRecordBtn" onclick="toggleReviewRecording()"><span id="reviewRecordIcon">🎙️</span></button>
      <div class="record-label" id="reviewRecordLabel">Nhấn để ghi âm</div>
    </div>
    <div class="asr-result" id="reviewAsrResult" style="display:none">
      <div class="label">ASR nghe được</div>
      <div class="transcript" id="reviewAsrTranscript"></div>
    </div>
    <div id="reviewMatchResult" style="display:none;margin-top:16px;text-align:center">
      <div class="score-ring" style="--score:0" id="reviewScoreRing">
        <div class="score-ring-inner"><div class="score-value" id="reviewScoreValue">0%</div><div class="score-label">Accuracy</div></div>
      </div>
      <p style="margin-top:12px;font-size:0.85rem" id="reviewMatchFeedback"></p>
      <div class="btn-group" style="justify-content:center;margin-top:12px">
        <button class="btn btn-outline btn-sm" onclick="skipReviewItem()">Bỏ qua</button>
        <button class="btn btn-primary btn-sm" onclick="nextReviewItem()">Mục tiếp theo →</button>
      </div>
    </div>`;
}

function skipReviewItem() { reviewIdx++; showReviewItem(); }
function nextReviewItem() { reviewIdx++; showReviewItem(); }

async function toggleReviewRecording() {
  const btn = document.getElementById('reviewRecordBtn');
  const label = document.getElementById('reviewRecordLabel');
  const icon = document.getElementById('reviewRecordIcon');
  const item = reviewQueue[reviewIdx];
  if (!item) return;

  if (state.isRecording) {
    state.isRecording = false;
    btn.classList.remove('recording');
    if (icon) icon.textContent = '🎙️';
    if (state.recognition) state.recognition.stop();
    stopVisualization();
    if (recordingStream) { recordingStream.getTracks().forEach(t => t.stop()); recordingStream = null; }
    return;
  }

  try {
    if (currentAudio) { currentAudio.pause(); currentAudio = null; }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordingStream = stream;
    state.isRecording = true;
    btn.classList.add('recording');
    if (icon) icon.textContent = '⏹';
    label.textContent = 'Đang thu âm...';

    state.recognition = initSpeechRecognition(item.type === 'sentence');
    if (!state.recognition) { label.textContent = 'Trình duyệt không hỗ trợ. Dùng Chrome.'; return; }

    state.recognition.onresult = async (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) transcript += event.results[i][0].transcript;
      const r = document.getElementById('reviewAsrResult');
      if (r) { r.style.display = 'block'; document.getElementById('reviewAsrTranscript').textContent = transcript; }
      await scoreReviewItem(item, transcript);
    };
    state.recognition.onerror = (e) => { label.textContent = `Lỗi: ${e.error}`; };
    state.recognition.onend = () => {
      if (state.isRecording && item.type === 'sentence') {
        try { state.recognition.start(); } catch (e) {}
      } else {
        state.isRecording = false;
        btn.classList.remove('recording');
        if (icon) icon.textContent = '🎙️';
        label.textContent = 'Ghi âm xong';
        if (recordingStream) { recordingStream.getTracks().forEach(t => t.stop()); recordingStream = null; }
      }
    };
    state.recognition.start();
  } catch (err) {
    label.textContent = 'Lỗi microphone';
  }
}

// Chấm điểm 1 item ôn tập + ghi nhật ký SRS
async function scoreReviewItem(item, transcript) {
  const target = item.text.toLowerCase();
  const spoken = transcript.toLowerCase();
  const targetWords = target.split(/\s+/).filter(w => w.length > 0);
  const spokenWords = spoken.split(/\s+/).filter(w => w.length > 0);

  const path = alignWords(targetWords, spokenWords);
  const opMap = {};
  path.forEach(s => { if (s.targetIdx >= 0) opMap[s.targetIdx] = s.op; });

  let matches = 0;
  const errorWords = [];
  for (let i = 0; i < targetWords.length; i++) {
    if (opMap[i] === 'match') matches++;
    else errorWords.push(targetWords[i]);
  }
  const accuracy = Math.round((matches / Math.max(1, targetWords.length)) * 100);

  const mr = document.getElementById('reviewMatchResult');
  if (mr) {
    mr.style.display = 'block';
    document.getElementById('reviewScoreRing').style.setProperty('--score', accuracy);
    document.getElementById('reviewScoreValue').textContent = accuracy + '%';
    const fb = document.getElementById('reviewMatchFeedback');
    if (accuracy >= 90) { fb.textContent = '🎉 Xuất sắc! Lịch ôn được giãn ra.'; fb.style.color = 'var(--accent-green)'; }
    else if (accuracy >= 70) { fb.textContent = '👍 Khá. Mục này sẽ ôn lại sớm.'; fb.style.color = 'var(--accent-amber)'; }
    else { fb.textContent = '💪 Cần luyện thêm — sẽ quay lại sớm hơn.'; fb.style.color = 'var(--accent-red)'; }
  }

  // Ghi nhật ký + cập nhật lịch SRS (đây là cốt lõi data-driven)
  PMData.recordAttempt({
    itemId: item.id, type: item.type, target: item.text,
    accuracy, errorWords, mode: 'asr-word',
  });
  if (typeof refreshDataDrivenDashboard === 'function') refreshDataDrivenDashboard();
}

// ── Biểu đồ tiến bộ (SVG thuần) ──────────────────────────────
function renderProgressCharts() {
  renderAccuracyLineChart();
  renderParetoChart();
}

function refreshDataDrivenDashboard() {
  renderAccuracyLineChart();
  renderParetoChart();
}

function renderAccuracyLineChart() {
  const el = document.getElementById('accuracyChart');
  if (!el) return;
  const daily = PMData.getDailyAverages();
  if (daily.length === 0) {
    el.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:24px;font-size:0.88rem">Chưa có dữ liệu. Hãy luyện vài câu — biểu đồ tiến bộ sẽ xuất hiện ở đây.</div>`;
    return;
  }
  const W = 600, H = 200, pad = 32;
  const pts = daily.map((d, i) => {
    const x = pad + (daily.length === 1 ? (W - 2 * pad) / 2 : i * (W - 2 * pad) / (daily.length - 1));
    const y = H - pad - (d.avg / 100) * (H - 2 * pad);
    return { x, y, d };
  });
  const poly = pts.map(p => `${p.x},${p.y}`).join(' ');
  const dots = pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#6366f1"><title>${p.d.day}: ${p.d.avg}% (${p.d.n} lần)</title></circle>`).join('');
  const grid = [0, 25, 50, 75, 100].map(v => {
    const y = H - pad - (v / 100) * (H - 2 * pad);
    return `<line x1="${pad}" y1="${y}" x2="${W - pad}" y2="${y}" stroke="rgba(255,255,255,0.08)"/><text x="4" y="${y + 4}" fill="var(--text-muted)" font-size="10">${v}</text>`;
  }).join('');
  el.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">
      ${grid}
      <polyline points="${poly}" fill="none" stroke="#6366f1" stroke-width="2.5"/>
      ${dots}
    </svg>
    <div style="text-align:center;font-size:0.78rem;color:var(--text-muted)">Độ chính xác trung bình theo ngày (${daily.length} ngày có dữ liệu)</div>`;
}

function renderParetoChart() {
  const el = document.getElementById('paretoChart');
  if (!el) return;
  const profile = PMData.getErrorProfile();
  if (profile.totalErrorEvents === 0) {
    el.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:16px;font-size:0.88rem">Chưa ghi nhận lỗi nào. Khi bạn luyện và có từ sai, hồ sơ lỗi cá nhân (Pareto) sẽ hiện ở đây — dựa trên DỮ LIỆU THẬT của bạn, không phải số liệu mẫu.</div>`;
    return;
  }
  const top = profile.topPhonemes.slice(0, 6);
  const max = top[0][1];
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px">
      ${top.map(([tag, count], i) => {
        const pct = Math.round((count / profile.totalErrorEvents) * 100);
        const w = Math.round((count / max) * 100);
        const medal = ['🥇', '🥈', '🥉'][i] || '▪️';
        return `<div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:1.1rem">${medal}</span>
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:2px">
              <span style="font-weight:600">${tag}</span>
              <span style="color:var(--text-muted)">${count} lần (${pct}%)</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${w}%;background:${i === 0 ? 'var(--accent-red)' : i === 1 ? 'var(--accent-amber)' : 'var(--accent-primary)'}"></div></div>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div style="margin-top:10px;font-size:0.75rem;color:var(--text-muted)">
      📊 Dựa trên ${profile.totalErrorEvents} lỗi thực tế của bạn. (Phase 1: ước lượng âm vị theo từ — sẽ chính xác hơn khi bật chấm điểm âm vị.)
    </div>
    ${profile.topWords.length ? `<div style="margin-top:8px;font-size:0.8rem;color:var(--text-secondary)">Từ hay sai nhất: ${profile.topWords.slice(0, 8).map(([w, c]) => `<b>${w}</b>(${c})`).join(', ')}</div>` : ''}`;
}
