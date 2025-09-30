import re
import json
import requests
from datetime import datetime

CVTV_URL = "https://cvtv.cvalley.net/"

def fetch_channels():
    """Fetch page HTML and extract channel names."""
    try:
        resp = requests.get(CVTV_URL, timeout=20)
        resp.raise_for_status()
        html = resp.text
        # Find /hls/CHANNEL/CHANNEL.m3u8
        return set(re.findall(r'/hls/([A-Za-z0-9]+)/\1\.m3u8', html))
    except Exception as e:
        print("Error fetching CVTV site:", e)
        return set()

def load_known():
    try:
        with open("known_channels.json") as f:
            return set(json.load(f))
    except FileNotFoundError:
        return set()

def save_known(channels):
    with open("known_channels.json", "w") as f:
        json.dump(sorted(list(channels)), f, indent=2)

def build_playlist(channels):
    lines = ["#EXTM3U"]
    for ch in sorted(channels):
        lines.append(f'#EXTINF:-1 group-title="CVTV",{ch}')
        lines.append(f"https://cvtv.cvalley.net/hls/{ch}/{ch}.m3u8")
    with open("playlist.m3u8", "w") as f:
        f.write("\n".join(lines) + "\n")

def log_new(new_channels):
    if not new_channels:
        return
    with open("new_channels.txt", "a") as f:
        f.write(f"--- {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')} ---\n")
        for ch in sorted(new_channels):
            f.write(ch + "\n")

def main():
    print("🔎 Fetching channels from CVTV...")
    discovered = fetch_channels()
    known = load_known()
    new_channels = discovered - known

    if new_channels:
        print("✅ Found new channels:", new_channels)
        known |= new_channels
        save_known(known)
        log_new(new_channels)
    else:
        print("ℹ️ No new channels found.")

    build_playlist(known)
    print(f"📺 Playlist updated with {len(known)} channels.")

if __name__ == "__main__":
    main()
