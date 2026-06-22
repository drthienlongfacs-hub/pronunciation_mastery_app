import os
import io
import time
import numpy as np
import soundfile as sf
import scipy.signal as signal
import pyloudnorm as pyln
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from chatterbox.tts import ChatterboxTTS

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

def enhance_audio(data, rate):
    # Đảm bảo dữ liệu là 1D (mono)
    if len(data.shape) > 1:
        data = data[:, 0]
        
    nyquist = rate / 2
    
    # 1. High-pass filter (Low-cut) ở 80Hz để loại bỏ tiếng ù nền
    b_hp, a_hp = signal.butter(4, 80 / nyquist, btype='high')
    data_hp = signal.filtfilt(b_hp, a_hp, data)
    
    # 2. Boost tần số trầm (130Hz, Q=1.2, Gain=+3.5dB) để giọng nam trầm ấm, dày tiếng
    b_bass, a_bass = signal.iirpeak(130 / nyquist, 1.2)
    bass_comp = signal.filtfilt(b_bass, a_bass, data_hp)
    data_eq = data_hp + 0.5 * bass_comp
    
    # 3. Boost nhẹ tần số trung cao (3200Hz, Q=1.0, Gain=+2dB) để tăng độ rõ phụ âm
    b_treble, a_treble = signal.iirpeak(3200 / nyquist, 1.0)
    treble_comp = signal.filtfilt(b_treble, a_treble, data_eq)
    data_eq = data_eq + 0.26 * treble_comp
    
    # 4. Chuẩn hóa độ to (Loudness Normalization) về -16.0 LUFS
    try:
        meter = pyln.Meter(rate)
        loudness = meter.integrated_loudness(data_eq)
        data_norm = pyln.normalize.loudness(data_eq, loudness, -16.0)
    except Exception as e:
        print(f"Loudness norm failed: {e}. Using peak normalisation.")
        data_norm = data_eq / np.max(np.abs(data_eq)) * 0.5
        
    # 5. Peak limiting ở -1.0dB để tránh vỡ tiếng
    max_peak = np.max(np.abs(data_norm))
    if max_peak > 0.89:
        data_norm = (data_norm / max_peak) * 0.89
        
    return data_norm

@app.get("/api/health")
def health_check():
    return {"status": "ok", "device": getattr(model, "device", "unknown") if model else "not_loaded"}

@app.get("/api/clone-tts")
def clone_tts(text: str, exaggeration: float = 0.5):
    if not text:
        raise HTTPException(status_code=400, detail="Missing text parameter")
    if model is None:
        raise HTTPException(status_code=503, detail="TTS Model is not loaded yet")
    
    try:
        print(f"🎙️ Generating voice clone for text: '{text}' (exaggeration={exaggeration})")
        start_time = time.time()
        
        # Sinh giọng clone bằng Chatterbox
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
