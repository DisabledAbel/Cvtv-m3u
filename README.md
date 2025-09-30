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
https://raw.githubusercontent.com/DisabledAbel/Cvtv-m3u/refs/heads/main/playlist.m3u8
```
Use this link in VLC, IPTV apps, or any HLS-compatible player:

