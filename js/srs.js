// ============================================================
// PRONUNCIATION MASTERY — SRS Engine + Data-Driven Layer
// Spaced Repetition (SM-2) + Attempt Logging + Error Profile
// Bằng chứng học tập: Ebbinghaus (1885) spacing effect,
// Roediger & Karpicke (2006) testing effect, SuperMemo SM-2.
// ============================================================

(function (global) {
  'use strict';

  const DAY_MS = 24 * 60 * 60 * 1000;
  const STORE_KEY = 'pm_data_v1';
  const MAX_ATTEMPTS_KEPT = 2000; // giới hạn để file không phình vô hạn

  // ── Trạng thái dữ liệu ──────────────────────────────────────
  // attempts: nhật ký mọi lần luyện (data-driven)
  // srs: trạng thái lặp lại ngắt quãng cho từng item
  const data = {
    attempts: [],
    srs: {}, // itemId -> { ease, interval, reps, lapses, due, lastAccuracy, seen }
  };

  // ── SM-2: quy đổi độ chính xác (%) -> chất lượng nhớ (0..5) ──
  function accuracyToQuality(acc) {
    if (acc >= 95) return 5;
    if (acc >= 85) return 4;
    if (acc >= 70) return 3;
    if (acc >= 50) return 2;
    if (acc >= 30) return 1;
    return 0;
  }

  // ── SM-2: cập nhật lịch ôn cho 1 item sau khi luyện ─────────
  function scheduleItem(itemId, accuracy, now) {
    now = now || Date.now();
    const q = accuracyToQuality(accuracy);
    let s = data.srs[itemId] || {
      ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now, seen: 0,
    };

    if (q < 3) {
      // Sai -> học lại sớm (1 ngày), reset chuỗi
      s.reps = 0;
      s.interval = 1;
      s.lapses += 1;
    } else {
      if (s.reps === 0) s.interval = 1;
      else if (s.reps === 1) s.interval = 6;
      else s.interval = Math.round(s.interval * s.ease);
      s.reps += 1;
    }
    // Cập nhật hệ số dễ (ease factor), tối thiểu 1.3
    s.ease = Math.max(1.3, s.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    s.lastAccuracy = accuracy;
    s.seen += 1;
    s.due = now + s.interval * DAY_MS;
    data.srs[itemId] = s;
    return s;
  }

  // ── Ghi nhật ký 1 lần luyện ─────────────────────────────────
  function recordAttempt({ itemId, type, target, accuracy, errorWords, mode }) {
    const now = Date.now();
    const attempt = {
      t: now,
      itemId: itemId || null,
      type: type || 'unknown',
      target: target || '',
      accuracy: Math.round(accuracy),
      errorWords: errorWords || [],
      // phoneme tags ước lượng từ các từ lỗi (Phase 1 — word-level proxy)
      phonemeTags: tagPhonemes(errorWords || []),
      mode: mode || 'asr-word', // 'asr-word' = nhận dạng từ; 'phoneme' = chấm âm vị thật
    };
    data.attempts.push(attempt);
    if (data.attempts.length > MAX_ATTEMPTS_KEPT) {
      data.attempts = data.attempts.slice(-MAX_ATTEMPTS_KEPT);
    }
    if (itemId) scheduleItem(itemId, accuracy, now);
    save();
    return attempt;
  }

  // ── Gắn nhãn âm vị cho từ lỗi (heuristic, minh bạch là ước lượng) ──
  // Dựa trên chính tả + IPA tra được trong pool. Đây là proxy mức TỪ,
  // sẽ được thay bằng chấm âm vị thật khi Phase 2 (allosaurus) sẵn sàng.
  const PHONEME_RULES = [
    { tag: '/θ/ /ð/ (âm răng-lưỡi)', test: w => /th/.test(w) },
    { tag: 'Cụm phụ âm cuối', test: w => /(sts|sks|pts|cts|nkt|ldz|nks|ndz|kt|st|sk|ts|dz|vz|ngth|nct)$/.test(w) },
    { tag: '/v/ /f/ (răng-môi)', test: w => /(v|ve|f)$/.test(w) },
    { tag: '/s/ /z/ cuối', test: w => /(s|z|ce|se)$/.test(w) && !/(sts|sks)$/.test(w) },
    { tag: 'Âm bật /t/ /d/ cuối', test: w => /(t|d|ed)$/.test(w) && !/(st|nt|th)$/.test(w) },
    { tag: 'Trọng âm từ dài', test: w => w.length >= 8 },
  ];

  function tagPhonemes(words) {
    const tags = new Set();
    words.forEach(raw => {
      const w = String(raw).toLowerCase().replace(/[.,!?;:'"]/g, '');
      if (!w) return;
      let matched = false;
      PHONEME_RULES.forEach(r => {
        if (r.test(w)) { tags.add(r.tag); matched = true; }
      });
      if (!matched) tags.add('Phụ âm khác');
    });
    return Array.from(tags);
  }

  // ── Hồ sơ lỗi Pareto (data-driven thật từ nhật ký) ──────────
  function getErrorProfile() {
    const wordCount = {};
    const phonemeCount = {};
    let totalErrorEvents = 0;
    data.attempts.forEach(a => {
      (a.errorWords || []).forEach(w => {
        const key = String(w).toLowerCase().replace(/[.,!?;:'"]/g, '');
        if (!key) return;
        wordCount[key] = (wordCount[key] || 0) + 1;
        totalErrorEvents += 1;
      });
      (a.phonemeTags || []).forEach(tg => {
        phonemeCount[tg] = (phonemeCount[tg] || 0) + 1;
      });
    });
    const sortDesc = obj => Object.entries(obj).sort((a, b) => b[1] - a[1]);
    return {
      totalErrorEvents,
      topWords: sortDesc(wordCount),
      topPhonemes: sortDesc(phonemeCount),
    };
  }

  // ── Lịch sử độ chính xác theo thời gian (cho biểu đồ) ───────
  function getAccuracyHistory(limit) {
    const arr = data.attempts
      .filter(a => typeof a.accuracy === 'number')
      .map(a => ({ t: a.t, accuracy: a.accuracy }));
    return limit ? arr.slice(-limit) : arr;
  }

  // Độ chính xác trung bình mỗi ngày (cho đường xu hướng)
  function getDailyAverages() {
    const byDay = {};
    data.attempts.forEach(a => {
      const d = new Date(a.t);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!byDay[key]) byDay[key] = { sum: 0, n: 0 };
      byDay[key].sum += a.accuracy;
      byDay[key].n += 1;
    });
    return Object.entries(byDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, v]) => ({ day, avg: Math.round(v.sum / v.n), n: v.n }));
  }

  // ── Hàng đợi ôn tập hôm nay (due items) ─────────────────────
  // pool: mảng item {id,...}. Trả về item đến hạn + item chưa từng học.
  function getDueQueue(pool, now) {
    now = now || Date.now();
    const due = [];
    const fresh = [];
    pool.forEach(item => {
      const s = data.srs[item.id];
      if (!s || s.seen === 0) {
        fresh.push(item);
      } else if (s.due <= now) {
        due.push({ item, due: s.due });
      }
    });
    // Item đến hạn lâu nhất lên trước
    due.sort((a, b) => a.due - b.due);
    const ordered = due.map(d => d.item);
    // Thêm tối đa vài item mới để giới thiệu dần
    return { due: ordered, fresh, all: ordered.concat(fresh) };
  }

  function getItemState(itemId) {
    return data.srs[itemId] || null;
  }

  function getStats(pool) {
    let mastered = 0, learning = 0, due = 0, fresh = 0;
    const now = Date.now();
    pool.forEach(item => {
      const s = data.srs[item.id];
      if (!s || s.seen === 0) { fresh++; return; }
      if (s.due <= now) due++;
      if (s.interval >= 21 && s.lastAccuracy >= 85) mastered++;
      else learning++;
    });
    return { mastered, learning, due, fresh, total: pool.length };
  }

  // ── Lưu / nạp (localStorage + đồng bộ server) ───────────────
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) { console.warn('SRS save local fail', e); }
    syncToServer();
  }

  let syncTimer = null;
  function syncToServer() {
    if (syncTimer) clearTimeout(syncTimer);
    // debounce để không spam server
    syncTimer = setTimeout(() => {
      const base = (typeof API_BASE !== 'undefined') ? API_BASE : '';
      fetch(`${base}/api/learning-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).catch(e => console.warn('SRS sync server fail', e));
    }, 1200);
  }

  async function load() {
    // Ưu tiên server (nguồn chân lý), fallback localStorage
    const base = (typeof API_BASE !== 'undefined') ? API_BASE : '';
    try {
      const res = await fetch(`${base}/api/learning-data`);
      if (res.ok) {
        const remote = await res.json();
        if (remote && (remote.attempts || remote.srs)) {
          data.attempts = remote.attempts || [];
          data.srs = remote.srs || {};
          return data;
        }
      }
    } catch (e) { /* dùng local */ }
    try {
      const local = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (local) {
        data.attempts = local.attempts || [];
        data.srs = local.srs || {};
      }
    } catch (e) { /* bỏ qua */ }
    return data;
  }

  global.PMData = {
    load, save,
    recordAttempt, scheduleItem, accuracyToQuality,
    getErrorProfile, getAccuracyHistory, getDailyAverages,
    getDueQueue, getItemState, getStats, tagPhonemes,
    _raw: data,
  };
})(window);
