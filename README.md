# CVTV Auto Playlist Scraper

Automatically discovers and updates CVTV channels every 6 hours and generates a live HLS playlist.

---

## 🔹 Features

- Scrapes [CVTV](https://cvtv.cvalley.net/) for all available HLS channels
- Automatically updates:
  - `playlist.m3u8`
  - `known_channels.json`
  - `new_channels.txt`
- Commits changes with GitHub Actions bot
- Runs every 6 hours (configurable in workflow)

---

## 🔹 Usage

### 1. Playlist URL
```bash
https://bit.ly/Cntvm3u8
```
Use this link in VLC, IPTV apps, or any HLS-compatible player:
~~


### Notes:
playlist.m3u8 must stay in the repo root for the raw URL to work
The URL never changes
New channels are discovered automatically

## ⚠️ Disclaimer

- Only includes streams officially published by CVTV and publicly available.  
- Does NOT include paid, subscription, or copyrighted-only channels.  
- Intended for personal and educational use only.  
- Redistribution for commercial purposes is prohibited.  
- The author is not responsible for misuse.  
- Source/publication link: [CVTV Public Streams](https://github.com/iptv-org/iptv/issues/17443

# Status 
[![CVTV Scraper + Pages](https://github.com/DisabledAbel/Cvtv-m3u/actions/workflows/scraper.yml/badge.svg)](https://github.com/DisabledAbel/Cvtv-m3u/actions/workflows/scraper.yml)
