#!/usr/bin/env python3
"""CVTV daily discovery + playlist generator.

Writes:
 - playlist.m3u8         (the public playlist)
 - known_channels.json    (persisted list of discovered/verified channels)
 - new_channels.txt       (channels discovered on this run)

Notes:
 - Does polite rate-limiting and basic retries.
 - Honor CVTV_COOKIE and CVTV_UA from env (set as GitHub Secrets).
"""
import os
import json
import time
import string
from pathlib import Path
from urllib.parse import urljoin

import requests
import m3u8

# Config
BASE_URL = "https://cvtv.cvalley.net/hls/{}/{}.m3u8"
PLAYLIST_PATH = Path("playlist.m3u8")
KNOWN_PATH = Path("known_channels.json")
NEW_PATH = Path("new_channels.txt")

# Seed channels to start with (you can expand)
SEED_CHANNELS = [
    "KMBCABC", "KCTV5", "KSHBD", "KSHB41", "WDAF", "KCPT",
    "ESPN", "ESPN2", "ESPNU", "ESPNEWS", "ESPNDEPORTES",
    "FOXSPORTS1", "FOXSPORTS2", "NFLNETWORK", "NBATV",
    "MLBNETWORK", "NHLNETWORK", "TNT", "TBS", "USA",
    "CNN", "MSNBC", "CNBC", "FOXNEWS",
]

# Candidate generation (adjust ranges to control scan size)
CANDIDATES = (
    SEED_CHANNELS
    + [f"ESPN{i}" for i in range(3, 6)]
    + [f"FOX{i}" for i in range(1, 5)]
    + [f"CBS{i}" for i in range(1, 5)]
    + [f"ABC{i}" for i in range(1, 5)]
    + list(string.ascii_uppercase)  # A..Z
)

# HTTP headers from env (optional)
HEADERS = {}
if os.getenv("CVTV_COOKIE"):
    HEADERS["Cookie"] = os.getenv("CVTV_COOKIE")
if os.getenv("CVTV_UA"):
    HEADERS["User-Agent"] = os.getenv("CVTV_UA")

# Timeouts and retries
REQUEST_TIMEOUT = 10
RETRY_COUNT = 2
SLEEP_BETWEEN = 0.3  # polite delay between probes

def load_known():
    if KNOWN_PATH.exists():
        try:
            return set(json.loads(KNOWN_PATH.read_text(encoding="utf-8")))
        except Exception:
            return set()
    return set(SEED_CHANNELS)

def save_known(known_set):
    KNOWN_PATH.write_text(json.dumps(sorted(list(known_set))), encoding="utf-8")

def fetch_playlist(url):
    for attempt in range(RETRY_COUNT + 1):
        try:
            r = requests.get(url, timeout=REQUEST_TIMEOUT, headers=HEADERS)
            r.raise_for_status()
            playlist = m3u8.loads(r.text)
            # if master playlist, resolve first variant
            if playlist.playlists:
                variant = urljoin(url, playlist.playlists[0].uri)
                r2 = requests.get(variant, timeout=REQUEST_TIMEOUT, headers=HEADERS)
                r2.raise_for_status()
                return variant
            return url
        except requests.HTTPError as he:
            status = he.response.status_code if he.response is not None else "?"
            # 404/403 -> stop retrying immediately
            if status in (403, 404):
                return None
        except Exception:
            pass
        # backoff
        time.sleep(0.5 + attempt * 0.5)
    return None

def build_playlist(found):
    lines = ["#EXTM3U"]
    for ch in sorted(found):
        url = BASE_URL.format(ch, ch)
        lines.append(f'#EXTINF:-1 tvg-id="{ch}" group-title="CVTV",{ch}')
        lines.append(url)
    content = "\n".join(lines) + "\n"
    return content

def main():
    known = load_known()
    found_channels = set()
    newly_discovered = []

    # Probe candidates
    for ch in CANDIDATES:
        url = BASE_URL.format(ch, ch)
        variant = fetch_playlist(url)
        if variant:
            found_channels.add(ch)
            if ch not in known:
                newly_discovered.append(ch)
                known.add(ch)
                print(f"NEW: {ch}")
            else:
                print(f"OK: {ch}")
        else:
            print(f"MISS: {ch}")
        time.sleep(SLEEP_BETWEEN)

    # Also keep previously known channels that maybe not in candidate list (failsafe)
    for ch in list(known):
        if ch not in found_channels:
            # try once more for guaranteed known channels
            url = BASE_URL.format(ch, ch)
            variant = fetch_playlist(url)
            if variant:
                found_channels.add(ch)
            else:
                # If a known channel disappears, keep it in known but don't include in playlist
                print(f"Previously known but currently unreachable: {ch}")

    # Write playlist and files only if changed
    playlist_content = build_playlist(found_channels)
    changed = True
    if PLAYLIST_PATH.exists() and PLAYLIST_PATH.read_text(encoding="utf-8") == playlist_content:
        print("No playlist changes.")
        changed = False
    else:
        PLAYLIST_PATH.write_text(playlist_content, encoding="utf-8")
        print(f"Wrote {PLAYLIST_PATH} ({len(found_channels)} channels)")

    # Persist known channels
    save_known(known)
    # Write new channel log
    NEW_PATH.write_text("\n".join(newly_discovered) + ("\n" if newly_discovered else ""), encoding="utf-8")

    # Exit code 0 always; workflow will check for file changes to commit
    print("Newly discovered channels:", newly_discovered)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
