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
    
    print("🚀 Starting Express Local Server...")
    server_log = open("server.log", "w")
    subprocess.Popen(["node", "server.js"], stdout=server_log, stderr=server_log)
    time.sleep(2)
    
    print("🌐 Launching Cloudflare Tunnel...")
    if os.path.exists(TUNNEL_LOG):
        try: os.remove(TUNNEL_LOG)
        except: pass
        
    tunnel_log_file = open(TUNNEL_LOG, "w")
    tunnel_proc = subprocess.Popen(
        ["cloudflared", "tunnel", "--url", f"http://localhost:{PORT}"],
        stdout=subprocess.DEVNULL,
        stderr=tunnel_log_file
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
        tunnel_log_file.close()
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
                print("Cloudflared stopped unexpectedly.")
                break
            time.sleep(2)
    except KeyboardInterrupt:
        print("\nStopping server and tunnel...")
    finally:
        tunnel_log_file.close()
        tunnel_proc.terminate()
        kill_port_processes()
        print("Done!")

if __name__ == "__main__":
    main()
