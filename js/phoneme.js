// ============================================================
// PRONUNCIATION MASTERY — Phoneme Scoring Client (Phase 2)
// Thu audio bằng MediaRecorder song song với ASR, gửi server
// chấm âm vị (allosaurus, mã nguồn mở). Phụ thuộc: API_BASE, PMData
// ============================================================

let phonemeEnabled = null; // null = chưa biết, true/false
let pmMediaRecorder = null;
let pmChunks = [];

async function checkPhonemeEnabled() {
  if (phonemeEnabled !== null) return phonemeEnabled;
  try {
    const base = (typeof API_BASE !== 'undefined') ? API_BASE : '';
    const res = await fetch(`${base}/api/phoneme-enabled`);
    const j = await res.json();
    phonemeEnabled = !!j.enabled;
  } catch (e) { phonemeEnabled = false; }
  return phonemeEnabled;
}

// Bắt đầu thu audio (gọi trong lúc bắt đầu ghi âm)
function phonemeStartCapture(stream) {
  try {
    pmChunks = [];
    pmMediaRecorder = new MediaRecorder(stream);
    pmMediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) pmChunks.push(e.data); };
    pmMediaRecorder.start();
  } catch (e) {
    console.warn('MediaRecorder không khởi tạo được', e);
    pmMediaRecorder = null;
  }
}

// Dừng thu + gửi chấm âm vị. targetText = câu/từ mẫu. ids = container hiển thị.
async function phonemeStopAndScore(targetText, panelId, contentId, itemId) {
  if (!pmMediaRecorder) return;
  const rec = pmMediaRecorder;
  pmMediaRecorder = null;

  const blob = await new Promise(resolve => {
    rec.onstop = () => resolve(new Blob(pmChunks, { type: 'audio/webm' }));
    try { rec.stop(); } catch (e) { resolve(new Blob(pmChunks, { type: 'audio/webm' })); }
  });
  if (!blob || blob.size < 1000) return; // quá ngắn

  const panel = document.getElementById(panelId);
  const content = document.getElementById(contentId);
  if (panel) panel.style.display = 'block';
  if (content) content.innerHTML = `<div style="color:var(--text-muted);font-size:0.88rem">🔬 Đang phân tích âm vị (so với giọng bản ngữ mẫu)...</div>`;

  const base64 = await blobToBase64(blob);
  try {
    const base = (typeof API_BASE !== 'undefined') ? API_BASE : '';
    const res = await fetch(`${base}/api/phoneme-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetText, audioBase64: base64, mimeType: 'audio/webm' }),
    });
    const result = await res.json();
    renderPhonemeResult(result, content);

    // Ghi nhật ký điểm âm vị THẬT (mode 'phoneme') — chính xác hơn ASR từ
    if (result.enabled && typeof result.accuracy === 'number' && typeof PMData !== 'undefined') {
      PMData.recordAttempt({
        itemId: itemId || null,
        type: 'phoneme',
        target: targetText,
        accuracy: result.accuracy,
        errorWords: [],
        mode: 'phoneme',
      });
      if (typeof refreshDataDrivenDashboard === 'function') refreshDataDrivenDashboard();
    }
  } catch (e) {
    if (content) content.innerHTML = `<div style="color:var(--accent-amber);font-size:0.85rem">Không kết nối được dịch vụ chấm âm vị.</div>`;
  }
}

function renderPhonemeResult(result, content) {
  if (!content) return;
  if (!result.enabled) {
    content.innerHTML = `<div style="color:var(--text-muted);font-size:0.85rem">${result.error || 'Chấm âm vị chưa bật.'}</div>`;
    return;
  }
  if (result.error) {
    content.innerHTML = `<div style="color:var(--accent-amber);font-size:0.85rem">${result.error}</div>`;
    return;
  }
  const acc = result.accuracy;
  const color = acc >= 85 ? 'var(--accent-green)' : acc >= 65 ? 'var(--accent-amber)' : 'var(--accent-red)';
  const phoneRow = (arr, hl) => (arr || []).map(p =>
    `<span style="display:inline-block;padding:2px 7px;margin:2px;border-radius:6px;font-family:var(--font-mono);font-size:0.85rem;background:${hl ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)'};color:${hl ? 'var(--accent-red)' : 'var(--text-secondary)'}">${p}</span>`
  ).join('');

  let html = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <div style="font-size:1.6rem;font-weight:800;color:${color}">${acc}%</div>
      <div style="font-size:0.82rem;color:var(--text-secondary)">Độ tương đồng âm vị so với giọng bản ngữ mẫu (beta · allosaurus mã nguồn mở)</div>
    </div>
    <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px">Giọng mẫu đọc:</div>
    <div style="margin-bottom:8px">${phoneRow(result.refPhones, false)}</div>
    <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px">Bác sĩ đọc:</div>
    <div style="margin-bottom:8px">${phoneRow(result.userPhones, false)}</div>`;

  if (result.feedbacks && result.feedbacks.length) {
    html += `<div style="border-top:1px solid var(--border-subtle);padding-top:12px;margin-top:8px;display:flex;flex-direction:column;gap:8px">`;
    result.feedbacks.forEach(f => {
      html += `<div class="ai-feedback-card">
        <div class="ai-feedback-word">Âm ${f.type}: /${f.phone}/</div>
        <div class="ai-feedback-advice">${f.advice}</div>
      </div>`;
    });
    html += `</div>`;
  } else if (acc >= 85) {
    html += `<div style="color:var(--accent-green);font-size:0.88rem">🎉 Phát âm rất sát giọng mẫu!</div>`;
  }
  html += `<div style="font-size:0.72rem;color:var(--text-muted);margin-top:10px">⚠️ Đây là điểm "khoảng cách âm vị so với giọng mẫu TTS", không phải điểm giám khảo người. Mô hình mã nguồn mở có sai số — dùng để theo dõi xu hướng cải thiện.</div>`;
  content.innerHTML = html;
}

function blobToBase64(blob) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.readAsDataURL(blob);
  });
}
