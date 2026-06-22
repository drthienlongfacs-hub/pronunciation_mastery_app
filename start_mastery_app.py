import subprocess
import time
import json
import os
import re
import urllib.request

PORT = 3000
TELEGRAM_CONFIG = os.path.expanduser("~/Desktop/Downloads/bản đồ dữ liệu BVBD/.telegram_bot/config.json")
TUNNEL_LOG = "/tmp/cf_mastery_tunnel.log"

def kill_port_processes():
    try:
        subprocess.run("pkill -f 'node server.js'", shell=True)
        subprocess.run("pkill -f 'voice_clone_server.py'", shell=True)
        subprocess.run("pkill -f 'cloudflared tunnel'", shell=True)
        time.sleep(2)
    except Exception as e:
        print(f"Error cleaning processes: {e}")

def send_telegram(url):
    if not os.path.exists(TELEGRAM_CONFIG):
        print(f"Telegram config not found: {TELEGRAM_CONFIG}")
        return False

    with open(TELEGRAM_CONFIG) as f:
        cfg = json.load(f)

    msg = (
        f"🆕 Pronunciation Mastery Live Tunnel (Local Server)\n\n"
        f"URL: {url}\n"
        f"Port: {PORT}\n"
        f"Thời gian: {time.strftime('%H:%M %d/%m/%Y')}\n\n"
        f"Bác sĩ bấm vào link trên để học với giọng đọc Edge-TTS bản xứ (yêu cầu máy Mac đang mở và chạy server)!"
    )

    try:
        data = json.dumps({"chat_id": cfg["chat_id"], "text": msg}).encode()
        req = urllib.request.Request(
            f"https://api.telegram.org/bot{cfg['bot_token']}/sendMessage",
            data=data,
            headers={"Content-Type": "application/json"},
        )
        resp = urllib.request.urlopen(req, timeout=10)
        result = json.loads(resp.read())
        return result.get("ok", False)
    except Exception as e:
        print(f"Telegram send failed: {e}")
    return False

def main():
    print("🧹 Cleaning up old processes...")
    kill_port_processes()
    
    print("🎙️ Starting Python FastAPI Voice Clone Server...")
    fastapi_log = open("fastapi_server.log", "w")
    venv_py = "/Users/mac/.voice-clone-env/bin/python"
    subprocess.Popen(
        [venv_py, "voice_clone_server.py"],
        stdout=fastapi_log,
        stderr=fastapi_log
    )
    
    print("🚀 Starting Express Local Server...")
    server_log = open("server.log", "w")
    node_env = os.environ.copy()
    node_env["PORT"] = "3000"
    subprocess.Popen(["node", "server.js"], stdout=server_log, stderr=server_log, env=node_env)
    
    print("⏳ Waiting for FastAPI Voice Clone Server to be ready (loading model onto MPS)...")
    fastapi_ready = False
    for attempt in range(45):
        try:
            req = urllib.request.Request("http://127.0.0.1:8005/api/health")
            with urllib.request.urlopen(req, timeout=1) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode())
                    if data.get("status") == "ok":
                        print(f"✅ FastAPI Server is ready! Model loaded on: {data.get('device', 'unknown').upper()}")
                        fastapi_ready = True
                        break
        except Exception:
            pass
        time.sleep(1)
        
    if not fastapi_ready:
        print("⚠️ Warning: FastAPI Server health check timed out. Proceeding anyway...")
    
    print("🌐 Launching Cloudflare Tunnel...")
    if os.path.exists(TUNNEL_LOG):
        try: os.remove(TUNNEL_LOG)
        except: pass
        
    tunnel_proc = subprocess.Popen(
        ["cloudflared", "tunnel", "--url", f"http://localhost:{PORT}", "--logfile", TUNNEL_LOG],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    url = None
    print("⏳ Waiting for Live Tunnel URL (up to 60 seconds)...")
    for i in range(60):
        time.sleep(1)
        if os.path.exists(TUNNEL_LOG):
            with open(TUNNEL_LOG) as f:
                content = f.read()
            urls = re.findall(r"https://[a-z0-9-]+\.trycloudflare\.com", content)
            if urls:
                url = urls[0]
                break
                
    if not url:
        print("❌ Failed to capture Tunnel URL. Check /tmp/cf_mastery_tunnel.log")
        tunnel_proc.terminate()
        return
        
    print(f"\n✅ Captured Live URL: {url}")
    if send_telegram(url):
        print("📲 Live link sent to Telegram!")
    else:
        print("⚠️ Failed to send Telegram message.")
        
    # Ghi nhận Tunnel URL phục vụ tự động phát hiện phía Client
    print("✍️ Saving tunnel URL to data/tunnel_url.json...")
    try:
        os.makedirs("data", exist_ok=True)
        with open("data/tunnel_url.json", "w") as f:
            json.dump({"url": url, "updated_at": time.strftime('%H:%M %d/%m/%Y')}, f, indent=2)
        print("✅ Tunnel URL saved.")
        
        # Tự động đẩy cập nhật lên GitHub Pages
        print("📤 Pushing updated Tunnel URL to GitHub Pages...")
        env = os.environ.copy()
        if "GITHUB_TOKEN" in env:
            del env["GITHUB_TOKEN"]
        
        subprocess.run("git add data/tunnel_url.json", shell=True, env=env)
        subprocess.run('git commit -m "chore: update live tunnel URL [skip ci]"', shell=True, env=env)
        subprocess.run("git push origin feature/pronunciation-coach", shell=True, env=env)
        print("✅ GitHub Pages updated successfully!")
    except Exception as e:
        print(f"⚠️ Failed to update GitHub Pages automatically: {e}")
        
    print("\nPress Ctrl+C to stop local server and tunnel...")
    try:
        while True:
            if tunnel_proc.poll() is not None:
                print("⚠️ Cloudflared stopped. Restarting tunnel in 3 seconds...")
                time.sleep(3)
                if os.path.exists(TUNNEL_LOG):
                    try: os.remove(TUNNEL_LOG)
                    except: pass
                tunnel_proc = subprocess.Popen(
                    ["cloudflared", "tunnel", "--url", f"http://localhost:{PORT}", "--logfile", TUNNEL_LOG],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                print("⏳ Waiting for new Tunnel URL...")
                new_url = None
                for _ in range(30):
                    time.sleep(1)
                    if os.path.exists(TUNNEL_LOG):
                        with open(TUNNEL_LOG) as f:
                            content = f.read()
                        urls = re.findall(r"https://[a-z0-9-]+\.trycloudflare\.com", content)
                        if urls:
                            new_url = urls[-1]
                            break
                if new_url:
                    print(f"✅ Re-captured Live URL: {new_url}")
                    with open("data/tunnel_url.json", "w") as f:
                        json.dump({"url": new_url, "updated_at": time.strftime('%H:%M %d/%m/%Y')}, f, indent=2)
                    send_telegram(new_url)
                    env = os.environ.copy()
                    env.pop("GITHUB_TOKEN", None)
                    subprocess.run("git add data/tunnel_url.json", shell=True, env=env)
                    subprocess.run('git commit -m "chore: update live tunnel URL [skip ci]"', shell=True, env=env)
                    subprocess.run("env -u GITHUB_TOKEN git push origin feature/pronunciation-coach", shell=True, env=env)
                    print("✅ GitHub Pages updated successfully with new URL!")
            time.sleep(2)
    except KeyboardInterrupt:
        print("\nStopping server and tunnel...")
    finally:
        try: tunnel_proc.terminate()
        except: pass
        kill_port_processes()
        print("Done!")

if __name__ == "__main__":
    main()
