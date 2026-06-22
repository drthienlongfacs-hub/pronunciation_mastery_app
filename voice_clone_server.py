import os
import io
import time
import numpy as np
import soundfile as sf
import scipy.signal as signal
import pyloudnorm as pyln
import torch
import torch.nn.functional as F
import librosa
import subprocess
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from chatterbox.tts import ChatterboxTTS, Conditionals
from chatterbox.models.t3.modules.cond_enc import T3Cond

app = FastAPI(title="Chatterbox Voice Clone Server")

# Kích hoạt CORS để cho phép gọi API từ frontend/node
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global TTS model
model = None
REF_AUDIO_PATH = "/Users/mac/Desktop/voice-clone/reference_english.wav"
NATIVE_REF_PATH = "cache/native_ref.mp3"

def ensure_native_reference():
    os.makedirs("cache", exist_ok=True)
    if os.path.exists(NATIVE_REF_PATH) and os.path.getsize(NATIVE_REF_PATH) > 0:
        return
    print("🎙️ Generating native speaker reference using Edge-TTS...")
    text = "Good morning everyone. Let's start our pronunciation practice session today."
    cmd = [
        "/Users/mac/Library/Python/3.9/bin/edge-tts",
        "--text", text,
        "--voice", "en-US-AndrewNeural",
        "--write-media", NATIVE_REF_PATH
    ]
    try:
        subprocess.run(cmd, check=True)
        print("✅ Native reference generated at:", NATIVE_REF_PATH)
    except Exception as e:
        print(f"❌ Failed to generate native reference: {e}")

def prepare_cross_speaker_conditionals(model, user_wav_path, native_wav_path, exaggeration=0.5):
    # 1. Load user reference wav (doctor's voice DNA)
    user_wav, _ = librosa.load(user_wav_path, sr=model.sr)
    user_16k = librosa.resample(user_wav, orig_sr=model.sr, target_sr=16000)
    
    # User voice-encoder speaker embedding
    user_ve_embed = torch.from_numpy(model.ve.embeds_from_wavs([user_16k], sample_rate=16000))
    user_ve_embed = user_ve_embed.mean(axis=0, keepdim=True).to(model.device)
    
    # User vocoder reference
    user_dec_wav = user_wav[:model.DEC_COND_LEN]
    user_ref_dict = model.s3gen.embed_ref(user_dec_wav, model.sr, device=model.device)
    
    # 2. Load native reference wav (native speaker prosody)
    native_wav, _ = librosa.load(native_wav_path, sr=model.sr)
    native_16k = librosa.resample(native_wav, orig_sr=model.sr, target_sr=16000)
    
    # Extract prompt tokens from the native speaker
    plen = model.t3.hp.speech_cond_prompt_len
    s3_tokzr = model.s3gen.tokenizer
    native_cond_prompt_tokens, _ = s3_tokzr.forward([native_16k[:model.ENC_COND_LEN]], max_len=plen)
    native_cond_prompt_tokens = torch.atleast_2d(native_cond_prompt_tokens).to(model.device)
    
    # Assemble Conditionals
    t3_cond = T3Cond(
        speaker_emb=user_ve_embed,
        cond_prompt_speech_tokens=native_cond_prompt_tokens,
        emotion_adv=exaggeration * torch.ones(1, 1, 1),
    ).to(device=model.device)
    
    model.conds = Conditionals(t3_cond, user_ref_dict)

@app.on_event("startup")
def startup_event():
    global model
    print("⏳ Loading ChatterboxTTS model onto MPS...")
    try:
        model = ChatterboxTTS.from_pretrained(device="mps")
        print("✅ Model loaded successfully on MPS!")
    except Exception as e:
        print(f"❌ Failed to load model on MPS: {e}. Falling back to CPU.")
        model = ChatterboxTTS.from_pretrained(device="cpu")
        print("✅ Model loaded successfully on CPU!")
    
    ensure_native_reference()

def enhance_audio(data, rate):
    # Đảm bảo dữ liệu là 1D (mono)
    if len(data.shape) > 1:
        data = data[:, 0]
        
    nyquist = rate / 2
    
    # 1. High-pass filter (Low-cut) ở 80Hz để loại bỏ tiếng ù nền
    b_hp, a_hp = signal.butter(4, 80 / nyquist, btype='high')
    data_hp = signal.filtfilt(b_hp, a_hp, data)
    
    # 2. Boost mạnh hơn dải trầm (130Hz, Q=1.2, Gain=+6.0dB) để giọng dày, đầy nội lực hơn
    # hệ số gain = 10^(6/20) - 1 ≈ 0.99
    b_bass1, a_bass1 = signal.iirpeak(130 / nyquist, 1.2)
    bass1_comp = signal.filtfilt(b_bass1, a_bass1, data_hp)
    data_eq = data_hp + 0.99 * bass1_comp
    
    # 3. Boost dải trung trầm (220Hz, Q=0.8, Gain=+5.0dB) để tăng tối đa độ ấm và tròn tiếng (chest resonance)
    # hệ số gain = 10^(5/20) - 1 ≈ 0.78
    b_bass2, a_bass2 = signal.iirpeak(220 / nyquist, 0.8)
    bass2_comp = signal.filtfilt(b_bass2, a_bass2, data_eq)
    data_eq = data_eq + 0.78 * bass2_comp
    
    # 4. Boost nhẹ dải trung cao (3200Hz, Q=1.0, Gain=+2.0dB) để tăng độ rõ phụ âm
    b_treble, a_treble = signal.iirpeak(3200 / nyquist, 1.0)
    treble_comp = signal.filtfilt(b_treble, a_treble, data_eq)
    data_eq = data_eq + 0.26 * treble_comp
    
    # 5. Dynamic Range Compressor (Bộ nén tiếng giúp âm tròn căng chuyên nghiệp)
    try:
        # RMS envelope với cửa sổ 20ms
        window_size = int(0.02 * rate)
        if window_size < 1: window_size = 1
        window = np.ones(window_size) / window_size
        envelope = np.sqrt(np.convolve(data_eq ** 2, window, mode='same') + 1e-8)
        
        # Convert envelope sang dB
        env_db = 20 * np.log10(envelope)
        
        # Ngưỡng nén (Threshold) -22dB, Tỉ lệ nén (Ratio) 3:1 (Nén sâu hơn để âm tròn căng hơn)
        threshold_db = -22.0
        ratio = 3.0
        
        # Tính toán suy giảm gain
        gain_db = np.zeros_like(env_db)
        over_threshold = env_db - threshold_db
        mask = over_threshold > 0
        gain_db[mask] = over_threshold[mask] * (1.0 / ratio - 1.0)
        
        # Chuyển đổi gain về tuyến tính
        gain_linear = 10 ** (gain_db / 20.0)
        
        # Làm mịn gain (smooth attack/release) bằng bộ lọc thông thấp 15Hz
        b_sm, a_sm = signal.butter(1, 15 / nyquist, btype='low')
        smooth_gain = signal.filtfilt(b_sm, a_sm, gain_linear)
        
        # Áp dụng nén và tự động bù âm lượng (Makeup Gain +3.5dB = 1.5)
        data_eq = data_eq * smooth_gain * 1.5
    except Exception as e:
        print(f"Compressor failed: {e}. Skipping compression.")
    
    # 6. Chuẩn hóa độ to (Loudness Normalization) về -16.0 LUFS
    try:
        meter = pyln.Meter(rate)
        loudness = meter.integrated_loudness(data_eq)
        data_norm = pyln.normalize.loudness(data_eq, loudness, -16.0)
    except Exception as e:
        print(f"Loudness norm failed: {e}. Using peak normalisation.")
        data_norm = data_eq / np.max(np.abs(data_eq)) * 0.5
        
    # 7. Peak limiting ở -1.0dB để tránh vỡ tiếng
    max_peak = np.max(np.abs(data_norm))
    if max_peak > 0.89:
        data_norm = (data_norm / max_peak) * 0.89
        
    return data_norm

@app.get("/api/health")
def health_check():
    return {"status": "ok", "device": getattr(model, "device", "unknown") if model else "not_loaded"}

@app.get("/api/clone-tts")
def clone_tts(text: str, exaggeration: float = 0.5, voice: str = "casual"):
    if not text:
        raise HTTPException(status_code=400, detail="Missing text parameter")
    if model is None:
        raise HTTPException(status_code=503, detail="TTS Model is not loaded yet")
    
    try:
        print(f"🎙️ Generating voice clone for text: '{text}' (voice={voice}, exaggeration={exaggeration})")
        start_time = time.time()
        
        if voice == "native_pro":
            ensure_native_reference()
            prepare_cross_speaker_conditionals(model, REF_AUDIO_PATH, NATIVE_REF_PATH, exaggeration=exaggeration)
            wav = model.generate(text, audio_prompt_path=None, exaggeration=exaggeration)
        else:
            wav = model.generate(text, audio_prompt_path=REF_AUDIO_PATH, exaggeration=exaggeration)
            
        raw_data = wav.squeeze().cpu().numpy()
        
        # Áp dụng bộ lọc âm thanh
        enhanced_data = enhance_audio(raw_data, model.sr)
        
        # Ghi âm thanh vào bộ nhớ WAV
        buffer = io.BytesIO()
        sf.write(buffer, enhanced_data, model.sr, format='WAV')
        buffer.seek(0)
        
        elapsed = time.time() - start_time
        print(f"✅ Generated voice clone in {elapsed:.2f} seconds.")
        
        return StreamingResponse(buffer, media_type="audio/wav")
    except Exception as e:
        print(f"❌ Error generating voice clone: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Chạy trên localhost cổng 8005
    uvicorn.run(app, host="127.0.0.1", port=8005)
