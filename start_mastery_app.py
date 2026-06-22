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

def send_telegram(url, provider="cloudflare", ip=""):
    if not os.path.exists(TELEGRAM_CONFIG):
        print(f"Telegram config not found: {TELEGRAM_CONFIG}")
        return False

    with open(TELEGRAM_CONFIG) as f:
        cfg = json.load(f)

    msg = (
        f"🆕 Pronunciation Mastery Live Tunnel ({provider.upper()})\n\n"
        f"URL: {url}\n"
    )
    if provider == "localtunnel" and ip:
        msg += f"🔑 IP của máy Mac (nhập IP này để bypass nếu được hỏi): {ip}\n"
        
    msg += (
        f"Thời gian: {time.strftime('%H:%M %d/%m/%Y')}\n\n"
        f"Bác sĩ bấm vào link trên để học với giọng đọc mẫu chuẩn và Giọng Clone Bản xứ (Native-Prosody) của chính mình!"
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

def start_tunnel_process(provider="cloudflare"):
    if provider == "cloudflare":
        if os.path.exists(TUNNEL_LOG):
            try: os.remove(TUNNEL_LOG)
            except: pass
        proc = subprocess.Popen(
            ["cloudflared", "tunnel", "--url", f"http://localhost:{PORT}", "--logfile", TUNNEL_LOG],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        return proc, TUNNEL_LOG, r"https://[a-z0-9-]+\.trycloudflare\.com"
    else:
        # Localtunnel
        LT_LOG = "/tmp/lt_mastery_tunnel.log"
        if os.path.exists(LT_LOG):
            try: os.remove(LT_LOG)
            except: pass
        log_f = open(LT_LOG, "w")
        proc = subprocess.Popen(
            ["npx", "-y", "localtunnel", "--port", str(PORT)],
            stdout=log_f,
            stderr=log_f
        )
        return proc, LT_LOG, r"https://[a-z0-9-]+\.loca\.lt"

def main():
    # Fetch public IP for localtunnel bypass warning
    try:
        public_ip = urllib.request.urlopen("https://api.ipify.org", timeout=3).read().decode().strip()
    except Exception:
        public_ip = "Không rõ"
        
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
    
    print("🌐 Launching Tunnel...")
    provider = "cloudflare"
    tunnel_proc, log_file, pattern = start_tunnel_process(provider)
    
    url = None
    print("⏳ Waiting for Live Tunnel URL...")
    for i in range(30):
        time.sleep(1)
        if os.path.exists(log_file):
            with open(log_file) as f:
                content = f.read()
            
            # Check for Cloudflare rate limit error
            if provider == "cloudflare" and ("429 Too Many Requests" in content or "error code: 1015" in content):
                print("⚠️ Cloudflare Tunnel rate-limited (429/1015).")
                break
                
            urls = re.findall(pattern, content)
            if urls:
                url = urls[0]
                break
                
    if not url:
        print("🔄 Falling back to Localtunnel...")
        try: tunnel_proc.terminate()
        except: pass
        provider = "localtunnel"
        tunnel_proc, log_file, pattern = start_tunnel_process(provider)
        
        print("⏳ Waiting for Localtunnel URL (up to 30 seconds)...")
        for i in range(30):
            time.sleep(1)
            if os.path.exists(log_file):
                with open(log_file) as f:
                    content = f.read()
                urls = re.findall(pattern, content)
                if urls:
                    url = urls[0]
                    break
                    
    if not url:
        print("❌ Failed to capture Tunnel URL from both Cloudflare and Localtunnel.")
        try: tunnel_proc.terminate()
        except: pass
        return
        
    print(f"\n✅ Captured Live URL ({provider}): {url}")
    if send_telegram(url, provider, public_ip):
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
        subprocess.run("git pull origin feature/pronunciation-coach --rebase", shell=True, env=env)
        subprocess.run("git push origin feature/pronunciation-coach", shell=True, env=env)
        print("✅ GitHub Pages updated successfully!")
    except Exception as e:
        print(f"⚠️ Failed to update GitHub Pages automatically: {e}")
        
    print("\nPress Ctrl+C to stop local server and tunnel...")
    delay = 5
    tunnel_start_time = time.time()
    try:
        while True:
            # Reset backoff nếu hầm đã chạy ổn định hơn 60s
            if tunnel_proc.poll() is None:
                if time.time() - tunnel_start_time > 60 and delay > 5:
                    print("ℹ️ Tunnel has been stable for 60 seconds. Resetting backoff delay.")
                    delay = 5
            else:
                print(f"⚠️ Tunnel ({provider}) stopped. Restarting in {delay} seconds...")
                time.sleep(delay)
                delay = min(delay * 2, 120)  # Tăng thời gian chờ gấp đôi (max 2 phút)
                
                # Khởi động lại hầm
                tunnel_proc, log_file, pattern = start_tunnel_process(provider)
                tunnel_start_time = time.time()
                
                new_url = None
                for _ in range(30):
                    time.sleep(1)
                    if os.path.exists(log_file):
                        with open(log_file) as f:
                            content = f.read()
                        
                        # Nếu bị Cloudflare khóa tiếp, chuyển sang localtunnel
                        if provider == "cloudflare" and ("429 Too Many Requests" in content or "error code: 1015" in content):
                            print("⚠️ Cloudflare rate-limited during restart. Switching to Localtunnel...")
                            try: tunnel_proc.terminate()
                            except: pass
                            provider = "localtunnel"
                            tunnel_proc, log_file, pattern = start_tunnel_process(provider)
                            tunnel_start_time = time.time()
                            break
                            
                        urls = re.findall(pattern, content)
                        if urls:
                            new_url = urls[-1]
                            break
                            
                if new_url:
                    print(f"✅ Re-captured Live URL ({provider}): {new_url}")
                    delay = 5
                    
                    with open("data/tunnel_url.json", "w") as f:
                        json.dump({"url": new_url, "updated_at": time.strftime('%H:%M %d/%m/%Y')}, f, indent=2)
                    send_telegram(new_url, provider, public_ip)
                    
                    env = os.environ.copy()
                    env.pop("GITHUB_TOKEN", None)
                    subprocess.run("git add data/tunnel_url.json", shell=True, env=env)
                    subprocess.run('git commit -m "chore: update live tunnel URL [skip ci]"', shell=True, env=env)
                    subprocess.run("git pull origin feature/pronunciation-coach --rebase", shell=True, env=env)
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
