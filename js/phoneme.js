// ============================================================
// PRONUNCIATION MASTERY — Phoneme Scoring Client (Phase 2)
// Thu audio bằng MediaRecorder song song với ASR, gửi server
// chấm âm vị (allosaurus, mã nguồn mở). Phụ thuộc: API_BASE, PMData
// ============================================================

let phonemeEnabled = null; // null = chưa biết, true/false
let phonemeStatus = null;
let pmMediaRecorder = null;
let pmChunks = [];
let pmMimeType = '';
let pmRecorderError = null;

const previewUrls = {
  sentence: null,
  cluster: null,
};

function getPhonemeServiceBase() {
  const explicitBase = (typeof API_BASE !== 'undefined' ? String(API_BASE || '') : '').trim();
  if (explicitBase) return explicitBase;
  if (typeof window !== 'undefined') {
    const host = String(window.location.hostname || '').toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return window.location.origin;
    }
  }
  return '';
}

function getUiConfig(contentId) {
  if (contentId === 'phonemeContent') {
    return {
      scope: 'sentence',
      playbackPanelId: 'recordingPlaybackPanel',
      playbackAudioId: 'recordingPlaybackAudio',
      playbackMetaId: 'recordingPlaybackMeta',
    };
  }
  if (contentId === 'clusterAiFeedbackContent') {
    return {
      scope: 'cluster',
      playbackPanelId: 'clusterRecordingPlaybackPanel',
      playbackAudioId: 'clusterRecordingPlaybackAudio',
      playbackMetaId: 'clusterRecordingPlaybackMeta',
    };
  }
  return null;
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 KB';
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function pickRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/aac',
  ];
  return candidates.find(candidate => MediaRecorder.isTypeSupported(candidate)) || '';
}

function mimeTypeToExtension(mimeType) {
  const value = String(mimeType || '').toLowerCase();
  if (value.includes('wav')) return 'wav';
  if (value.includes('mp4') || value.includes('m4a') || value.includes('aac')) return 'mp4';
  if (value.includes('ogg')) return 'ogg';
  return 'webm';
}

function describeServiceFailure(status) {
  if (!status) return 'Không kết nối được dịch vụ chấm âm vị.';
  if (!status.base) return 'Chưa có địa chỉ máy chủ AI. Hãy mở phần cài đặt và nhập tunnel mới.';
  if (status.kind === 'tunnel_down') return `Tunnel Cloudflare đang offline (${status.code || '1033'}).`;
  if (status.kind === 'http') return `Máy chủ AI trả về HTTP ${status.code}.`;
  if (status.kind === 'service_disabled') return status.message || 'Máy chủ AI đang online nhưng chấm âm vị chưa sẵn sàng.';
  if (status.kind === 'timeout') return 'Máy chủ AI phản hồi quá chậm hoặc không truy cập được.';
  return status.message || 'Không kết nối được dịch vụ chấm âm vị.';
}

function renderAiConnectionStatus(status = phonemeStatus) {
  const el = document.getElementById('aiConnectionStatus');
  if (!el) return;
  const base = status?.base || getPhonemeServiceBase();
  if (!base) {
    el.style.color = 'var(--text-secondary)';
    el.innerHTML = 'Chưa cấu hình tunnel AI. App vẫn dùng được phần local, nhưng chấm âm vị thật và Edge-TTS server sẽ không hoạt động.';
    return;
  }
  if (status?.ok) {
    el.style.color = 'var(--accent-green)';
    el.innerHTML = `Đã kết nối dịch vụ âm vị tại <code>${base}</code>.`;
    return;
  }
  el.style.color = 'var(--accent-amber)';
  el.innerHTML = `${describeServiceFailure(status)} <code>${base}</code>`;
}

async function getPhonemeServiceStatus(force = false) {
  const base = getPhonemeServiceBase();
  if (!base) {
    phonemeEnabled = false;
    phonemeStatus = {
      ok: false,
      base: '',
      kind: 'no_base',
      message: 'Chưa cấu hình tunnel AI.',
      checkedAt: Date.now(),
    };
    renderAiConnectionStatus(phonemeStatus);
    return phonemeStatus;
  }

  if (
    !force &&
    phonemeStatus &&
    phonemeStatus.base === base &&
    Date.now() - phonemeStatus.checkedAt < 15000
  ) {
    return phonemeStatus;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch(`${base}/api/phoneme-enabled?_t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const body = await res.text();

    if (!res.ok) {
      const tunnelDown = /Cloudflare Tunnel error|Error\s*1033/i.test(body);
      phonemeEnabled = false;
      phonemeStatus = {
        ok: false,
        base,
        kind: tunnelDown ? 'tunnel_down' : 'http',
        code: tunnelDown ? 1033 : res.status,
        message: tunnelDown ? 'Tunnel Cloudflare hiện không hoạt động.' : `Máy chủ AI trả về HTTP ${res.status}.`,
        checkedAt: Date.now(),
      };
      renderAiConnectionStatus(phonemeStatus);
      return phonemeStatus;
    }

    let parsed = {};
    try {
      parsed = JSON.parse(body);
    } catch {
      parsed = {};
    }

    phonemeEnabled = !!parsed.enabled;
    phonemeStatus = {
      ok: !!parsed.enabled,
      base,
      kind: parsed.enabled ? 'ok' : 'service_disabled',
      message: parsed.error || (parsed.enabled ? 'Dịch vụ âm vị đang online.' : 'Máy chủ AI đang online nhưng chấm âm vị chưa sẵn sàng.'),
      checkedAt: Date.now(),
    };
    renderAiConnectionStatus(phonemeStatus);
    return phonemeStatus;
  } catch (error) {
    clearTimeout(timeoutId);
    phonemeEnabled = false;
    phonemeStatus = {
      ok: false,
      base,
      kind: error?.name === 'AbortError' ? 'timeout' : 'network',
      message: error?.name === 'AbortError'
        ? 'Máy chủ AI phản hồi quá chậm.'
        : 'Không kết nối được tới máy chủ AI.',
      checkedAt: Date.now(),
    };
    renderAiConnectionStatus(phonemeStatus);
    return phonemeStatus;
  }
}

async function checkPhonemeEnabled() {
  if (phonemeEnabled !== null) return phonemeEnabled;
  const status = await getPhonemeServiceStatus();
  phonemeEnabled = !!status.ok;
  return phonemeEnabled;
}

function renderRecordingPreview(contentId, blob, mimeType) {
  const config = getUiConfig(contentId);
  if (!config || !blob) return;
  const panel = document.getElementById(config.playbackPanelId);
  const audio = document.getElementById(config.playbackAudioId);
  const meta = document.getElementById(config.playbackMetaId);
  if (!panel || !audio || !meta) return;

  if (previewUrls[config.scope]) {
    URL.revokeObjectURL(previewUrls[config.scope]);
  }
  const objectUrl = URL.createObjectURL(blob);
  previewUrls[config.scope] = objectUrl;
  audio.src = objectUrl;
  panel.style.display = 'block';
  meta.innerHTML = `Đã thu âm thành công: <strong>${formatBytes(blob.size)}</strong> · <code>${mimeTypeToExtension(mimeType)}</code>`;
}

function renderUnavailableState(content, status, extraMessage = '') {
  if (!content) return;
  content.innerHTML = `
    <div style="color:var(--accent-amber);font-size:0.9rem;font-weight:700;margin-bottom:8px">${describeServiceFailure(status)}</div>
    <div style="color:var(--text-secondary);font-size:0.82rem;line-height:1.5">Bản ghi âm vẫn được giữ lại ở khung phát bên trên để nghe lại. ${extraMessage}</div>
  `;
}

function resetAudioPreview(scope) {
  const config = scope === 'cluster'
    ? getUiConfig('clusterAiFeedbackContent')
    : getUiConfig('phonemeContent');
  if (!config) return;
  const panel = document.getElementById(config.playbackPanelId);
  const audio = document.getElementById(config.playbackAudioId);
  const meta = document.getElementById(config.playbackMetaId);

  const transcriptId = scope === 'cluster' ? 'clusterRecordingPlaybackTranscript' : 'recordingPlaybackTranscript';
  const transcriptEl = document.getElementById(transcriptId);
  if (transcriptEl) {
    transcriptEl.style.display = 'none';
    const spanEl = transcriptEl.querySelector('.ipa-text');
    if (spanEl) spanEl.textContent = '';
    else transcriptEl.textContent = '';
  }

  if (previewUrls[config.scope]) {
    URL.revokeObjectURL(previewUrls[config.scope]);
    previewUrls[config.scope] = null;
  }
  if (audio) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }
  if (panel) panel.style.display = 'none';
  if (meta) meta.textContent = '';
}

function resetPhonemeUi(scope = 'all') {
  if (scope === 'all' || scope === 'sentence') {
    const panel = document.getElementById('phonemePanel');
    const content = document.getElementById('phonemeContent');
    if (panel) panel.style.display = 'none';
    if (content) content.innerHTML = '';
    resetAudioPreview('sentence');
  }
  if (scope === 'all' || scope === 'cluster') {
    const content = document.getElementById('clusterAiFeedbackContent');
    if (content) content.innerHTML = '';
    resetAudioPreview('cluster');
  }
}

// Bắt đầu thu audio (gọi trong lúc bắt đầu ghi âm)
function phonemeStartCapture(stream) {
  try {
    pmChunks = [];
    pmRecorderError = null;
    pmMimeType = pickRecorderMimeType();
    pmMediaRecorder = pmMimeType
      ? new MediaRecorder(stream, { mimeType: pmMimeType })
      : new MediaRecorder(stream);
    pmMimeType = pmMediaRecorder.mimeType || pmMimeType || 'audio/webm';
    pmMediaRecorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) pmChunks.push(e.data);
    };
    pmMediaRecorder.start();
  } catch (e) {
    console.warn('MediaRecorder không khởi tạo được', e);
    pmRecorderError = e;
    pmMediaRecorder = null;
  }
}

// Dừng thu + gửi chấm âm vị. targetText = câu/từ mẫu. ids = container hiển thị.
async function phonemeStopAndScore(targetText, panelId, contentId, itemId) {
  const panel = document.getElementById(panelId);
  const content = document.getElementById(contentId);

  if (!pmMediaRecorder) {
    if (panel) panel.style.display = 'block';
    renderUnavailableState(
      content,
      phonemeStatus,
      pmRecorderError
        ? 'Thiết bị hoặc trình duyệt hiện tại không khởi tạo được MediaRecorder cho phiên này.'
        : 'Không có dữ liệu audio hợp lệ để gửi lên máy chủ.'
    );
    return;
  }

  const rec = pmMediaRecorder;
  pmMediaRecorder = null;
  const activeMimeType = pmMimeType || rec.mimeType || 'audio/webm';

  const blob = await new Promise(resolve => {
    rec.onstop = () => resolve(new Blob(pmChunks, { type: activeMimeType }));
    try {
      rec.stop();
    } catch (e) {
      resolve(new Blob(pmChunks, { type: activeMimeType }));
    }
  });
  pmMimeType = '';

  if (!blob || blob.size < 1000) {
    if (panel) panel.style.display = 'block';
    renderUnavailableState(content, phonemeStatus, 'Âm thanh quá ngắn hoặc chưa ghi được tiếng nói đủ rõ để chấm âm vị.');
    return;
  }

  renderRecordingPreview(contentId, blob, activeMimeType);
  if (panel) panel.style.display = 'block';
  if (content) {
    content.innerHTML = '<div style="color:var(--text-muted);font-size:0.88rem">🔬 Đang phân tích âm vị (so với giọng bản ngữ mẫu)...</div>';
  }

  const status = await getPhonemeServiceStatus();
  if (!status.ok) {
    renderUnavailableState(
      content,
      status,
      'Nếu đang dùng GitHub Pages trên điện thoại, cần mở lại tunnel mới và cập nhật URL trong phần cấu hình hoặc file <code>data/tunnel_url.json</code>.'
    );
    return;
  }

  const base64 = await blobToBase64(blob);
  try {
    const base = getPhonemeServiceBase();
    const res = await fetch(`${base}/api/phoneme-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetText,
        audioBase64: base64,
        mimeType: activeMimeType,
      }),
    });
    const body = await res.text();

    if (!res.ok) {
      const tunnelDown = /Cloudflare Tunnel error|Error\s*1033/i.test(body);
      phonemeEnabled = false;
      phonemeStatus = {
        ok: false,
        base,
        kind: tunnelDown ? 'tunnel_down' : 'http',
        code: tunnelDown ? 1033 : res.status,
        message: tunnelDown ? 'Tunnel Cloudflare hiện không hoạt động.' : `Máy chủ AI trả về HTTP ${res.status}.`,
        checkedAt: Date.now(),
      };
      renderAiConnectionStatus(phonemeStatus);
      renderUnavailableState(content, phonemeStatus, 'App đã giữ lại bản ghi âm cục bộ để nghe lại.');
      return;
    }

    let result = null;
    try {
      result = JSON.parse(body);
    } catch (error) {
      renderUnavailableState(content, {
        ok: false,
        base,
        kind: 'http',
        code: res.status,
        message: 'Máy chủ AI trả về dữ liệu không đọc được.',
      }, 'Hãy kiểm tra log server cục bộ hoặc khởi động lại tunnel.');
      return;
    }

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
    await getPhonemeServiceStatus(true);
    renderUnavailableState(content, phonemeStatus, 'Lỗi này xảy ra sau khi thu âm xong, không phải do cache của trình duyệt.');
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

  // Tự động cập nhật vòng tròn hiển thị điểm và thông báo (nếu có)
  let ringEl, valEl, feedbackEl;
  if (content.id === 'phonemeContent') {
    ringEl = document.getElementById('scoreRing');
    valEl = document.getElementById('scoreValue');
    feedbackEl = document.getElementById('matchFeedback');
    const panel = document.getElementById('matchResult');
    if (panel) panel.style.display = 'block';
  } else if (content.id === 'clusterAiFeedbackContent') {
    ringEl = document.getElementById('clusterScoreRing');
    valEl = document.getElementById('clusterScoreValue');
    feedbackEl = document.getElementById('clusterMatchFeedback');
    const panel = document.getElementById('clusterMatchResult');
    if (panel) panel.style.display = 'block';
  }

  if (ringEl && typeof acc === 'number') {
    ringEl.style.setProperty('--score', acc);
    if (valEl) valEl.textContent = acc + '%';
    if (feedbackEl) {
      if (acc >= 85) {
        feedbackEl.textContent = '🎉 Tuyệt vời! Độ chính xác âm vị rất cao!';
        feedbackEl.style.color = 'var(--accent-green)';
      } else if (acc >= 65) {
        feedbackEl.textContent = '👍 Tốt! Hãy chú ý các âm vị bị lệch màu đỏ bên dưới.';
        feedbackEl.style.color = 'var(--accent-amber)';
      } else {
        feedbackEl.textContent = '💪 Cần luyện thêm để cơ miệng quen với cấu âm này.';
        feedbackEl.style.color = 'var(--accent-red)';
      }
    }
  }

  // Hiển thị phiên âm IPA thực tế tại khung nghe lại ("Bản ghi âm vừa thu")
  let playbackTranscriptEl;
  if (content.id === 'phonemeContent') {
    playbackTranscriptEl = document.getElementById('recordingPlaybackTranscript');
  } else if (content.id === 'clusterAiFeedbackContent') {
    playbackTranscriptEl = document.getElementById('clusterRecordingPlaybackTranscript');
  }
  if (playbackTranscriptEl && result.userPhones && result.userPhones.length) {
    const ipaStr = '/' + result.userPhones.join('') + '/';
    const spanEl = playbackTranscriptEl.querySelector('.ipa-text');
    if (spanEl) {
      spanEl.textContent = ipaStr;
    } else {
      playbackTranscriptEl.textContent = 'Phiên âm thực tế: ' + ipaStr;
    }
    playbackTranscriptEl.style.display = 'block';
  }

  const phoneRow = (arr, hl) => (arr || []).map(p =>
    `<span style="display:inline-block;padding:2px 7px;margin:2px;border-radius:6px;font-family:var(--font-mono);font-size:0.85rem;background:${hl ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)'};color:${hl ? 'var(--accent-red)' : 'var(--text-secondary)'}">${p}</span>`
  ).join('');

  const refIpaStr = result.refPhones && result.refPhones.length ? '/' + result.refPhones.join('') + '/' : '/-/';
  const userIpaStr = result.userPhones && result.userPhones.length ? '/' + result.userPhones.join('') + '/' : '/-/';

  let html = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <div style="font-size:1.6rem;font-weight:800;color:${color}">${acc}%</div>
      <div style="font-size:0.82rem;color:var(--text-secondary)">Độ tương đồng âm vị so với giọng bản ngữ mẫu (beta · allosaurus mã nguồn mở)</div>
    </div>
    <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px">Giọng mẫu đọc (IPA: <span style="font-family:var(--font-mono);color:var(--accent-secondary);font-weight:bold">${refIpaStr}</span>):</div>
    <div style="margin-bottom:8px">${phoneRow(result.refPhones, false)}</div>
    <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:4px">Bác sĩ đọc (IPA: <span style="font-family:var(--font-mono);color:var(--accent-secondary);font-weight:bold">${userIpaStr}</span>):</div>
    <div style="margin-bottom:8px">${phoneRow(result.userPhones, false)}</div>`;

  if (result.feedbacks && result.feedbacks.length) {
    html += '<div style="border-top:1px solid var(--border-subtle);padding-top:12px;margin-top:8px;display:flex;flex-direction:column;gap:8px">';
    result.feedbacks.forEach(f => {
      html += `<div class="ai-feedback-card">
        <div class="ai-feedback-word">Âm ${f.type}: /${f.phone}/</div>
        <div class="ai-feedback-advice">${f.advice}</div>
      </div>`;
    });
    html += '</div>';
  } else if (acc >= 85) {
    html += '<div style="color:var(--accent-green);font-size:0.88rem">🎉 Phát âm rất sát giọng mẫu!</div>';
  }
  html += '<div style="font-size:0.72rem;color:var(--text-muted);margin-top:10px">⚠️ Đây là điểm "khoảng cách âm vị so với giọng mẫu TTS", không phải điểm giám khảo người. Mô hình mã nguồn mở có sai số — dùng để theo dõi xu hướng cải thiện.</div>';
  content.innerHTML = html;
}

function blobToBase64(blob) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(',')[1] || '');
    reader.readAsDataURL(blob);
  });
}

window.getPhonemeServiceStatus = getPhonemeServiceStatus;
window.resetPhonemeUi = resetPhonemeUi;

setTimeout(() => {
  getPhonemeServiceStatus(true);
}, 0);
