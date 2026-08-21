// ============================================================
// PRONUNCIATION MASTERY — Mobile Capability & Audio Resilience
// Module xử lý In-App Browser, Speech Synthesis tự nhiên và
// giải phóng xung đột WebKit CoreAudio trên iPhone/Android
// ============================================================

(function (global) {
  'use strict';

  function safeNavigator() {
    return typeof navigator !== 'undefined' ? navigator : null;
  }

  function getInAppBrowserName(customUserAgent) {
    const nav = safeNavigator();
    const userAgent = customUserAgent || nav?.userAgent || '';
    if (/zalo/i.test(userAgent)) return 'Zalo';
    if (/micromessenger/i.test(userAgent)) return 'WeChat';
    if (/messenger|fb_iab.*messenger/i.test(userAgent)) return 'Messenger';
    if (/fban|fbav/i.test(userAgent)) return 'Facebook';
    if (/instagram/i.test(userAgent)) return 'Instagram';
    if (/musical_ly|bytedance|tiktok/i.test(userAgent)) return 'TikTok';
    if (/line/i.test(userAgent)) return 'Line';
    return null;
  }

  function isInsideInAppBrowser(customUserAgent) {
    return !!getInAppBrowserName(customUserAgent);
  }

  function detectDeviceCapabilities() {
    const nav = safeNavigator();
    const ua = nav?.userAgent || '';
    const platform = nav?.platform || '';

    const isiOS = /iPhone|iPad|iPod/i.test(platform) || (platform === 'MacIntel' && (nav?.maxTouchPoints || 0) > 1);
    const isAndroid = /Android/i.test(ua);
    const isSafari = isiOS && /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/i.test(ua);
    const isChrome = /Chrome|CriOS/i.test(ua);
    const inApp = getInAppBrowserName(ua);

    const hasSpeechRecognition = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    const hasMediaDevices = !!(nav?.mediaDevices?.getUserMedia);
    const hasSpeechSynthesis = typeof window !== 'undefined' && ('speechSynthesis' in window);

    return {
      isiOS,
      isAndroid,
      isSafari,
      isChrome,
      inAppBrowser: inApp,
      isMobile: isiOS || isAndroid,
      sttSupported: hasSpeechRecognition && !inApp,
      mediaCaptureSupported: hasMediaDevices,
      ttsSupported: hasSpeechSynthesis,
    };
  }

  // ── Voice Profiling & Prosody ──────────────────────────────
  const PREFERRED_VOICE_NAMES = [
    'Ava (Premium)', 'Samantha (Enhanced)', 'Samantha (Premium)',
    'Google US English', 'Daniel (Enhanced)', 'Daniel',
    'Samantha', 'Victoria', 'Karen', 'Moira', 'Alex',
  ];

  function findBestNaturalVoice(voices, lang = 'en-US') {
    if (!voices || voices.length === 0) return null;
    
    // 1. Check preferred high quality names first
    for (const name of PREFERRED_VOICE_NAMES) {
      const match = voices.find(v => v.lang.startsWith(lang.slice(0, 2)) && v.name.includes(name));
      if (match) return match;
    }

    // 2. Premium / Enhanced voices
    const premiumMatch = voices.find(v => v.lang.startsWith(lang.slice(0, 2)) && /premium|enhanced|natural/i.test(v.name));
    if (premiumMatch) return premiumMatch;

    // 3. Exact language match
    const exactLangMatch = voices.find(v => v.lang === lang);
    if (exactLangMatch) return exactLangMatch;

    // 4. Any English voice
    return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
  }

  function resolveNaturalVoiceProfile(options = {}) {
    const lang = options.lang || 'en-US';
    const voices = options.voices || (typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
    const preferredRate = typeof options.rate === 'number' ? options.rate : 0.90;
    
    const bestVoice = findBestNaturalVoice(voices, lang);

    // Clamping: On mobile Safari, rate < 0.85 distorts pitch into muffled robot
    const clampedRate = Math.max(0.85, Math.min(1.10, preferredRate));
    const clampedPitch = 1.0;

    return {
      voice: bestVoice,
      lang: bestVoice?.lang || lang,
      prosody: {
        rate: clampedRate,
        pitch: clampedPitch,
        volume: 1.0,
      },
    };
  }

  function speakNaturalText(text, options = {}) {
    if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;

    const synth = window.speechSynthesis;
    const lang = options.lang || 'en-US';
    const rate = typeof options.rate === 'number' ? options.rate : 0.90;
    const voices = synth.getVoices();

    const profile = resolveNaturalVoiceProfile({ lang, voices, rate });

    try {
      synth.cancel();
    } catch (e) {
      console.warn('speechSynthesis cancel warning:', e);
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (profile.voice) {
      utterance.voice = profile.voice;
      utterance.lang = profile.voice.lang;
    } else {
      utterance.lang = lang;
    }

    utterance.rate = profile.prosody.rate;
    utterance.pitch = profile.prosody.pitch;
    utterance.volume = profile.prosody.volume;

    if (typeof options.onEnd === 'function') {
      utterance.onend = options.onEnd;
    }

    if (typeof options.onError === 'function') {
      utterance.onerror = options.onError;
    }

    // Small delay helps iOS Safari audio queue reset cleanly
    setTimeout(() => {
      try {
        synth.speak(utterance);
      } catch (err) {
        console.warn('speakNaturalText failed:', err);
      }
    }, 40);
  }

  // Export to global scope
  const MobileCap = {
    getInAppBrowserName,
    isInsideInAppBrowser,
    detectDeviceCapabilities,
    findBestNaturalVoice,
    resolveNaturalVoiceProfile,
    speakNaturalText,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobileCap;
  } else {
    global.MobileCap = MobileCap;
  }
})(typeof window !== 'undefined' ? window : globalThis);
