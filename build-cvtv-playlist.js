#!/usr/bin/env node
/**
 * build-missouri-playlist.js
 *
 * Generates playlists/missouri.m3u8 from an internal channel list.
 * Validates each URL (requests first bytes) and comments out failing entries.
 *
 * Node 20+ (global fetch) required.
 */

import fs from "fs/promises";
import path from "path";

const OUT_DIR = path.resolve("playlists");
const OUT_FILE = path.join(OUT_DIR, "missouri.m3u8");
const TMP_FILE = OUT_FILE + ".tmp";
const CONCURRENCY = 6;
const FETCH_TIMEOUT_MS = 10_000; // 10s

// === channel list (from your provided playlist) ===
const channels = [
  { name: "KOMU CW", url: "https://cvtv.cvalley.net/hls/KOMUCW/KOMUCW.m3u8", group: "Local" },
  { name: "KCTV CBS", url: "https://cvtv.cvalley.net/hls/KCTVCBS/KCTVCBS.m3u8", group: "Local" },
  { name: "KMBC ABC", url: "https://cvtv.cvalley.net/hls/KMBCABC/KMBCABC.m3u8", group: "Local" },
  { name: "KMCI IND", url: "https://cvtv.cvalley.net/hls/KMCIIND/KMCIIND.m3u8", group: "Local" },
  { name: "KOMU NBC", url: "https://cvtv.cvalley.net/hls/KOMUNBC/KOMUNBC.m3u8", group: "Local" },
  { name: "KRCG CBS", url: "https://cvtv.cvalley.net/hls/KRCGCBS/KRCGCBS.m3u8", group: "Local" },
  { name: "KSHB NBC", url: "https://cvtv.cvalley.net/hls/KSHBNBC/KSHBNBC.m3u8", group: "Local" },
  { name: "KTVO ABC", url: "https://cvtv.cvalley.net/hls/KTVOABC/KTVOABC.m3u8", group: "Local" },
  { name: "KYOU FOX", url: "https://cvtv.cvalley.net/hls/KYOUFOX/KYOUFOX.m3u8", group: "Local" },
  { name: "KTVO CBS", url: "https://cvtv.cvalley.net/hls/KTVOCBS/KTVOCBS.m3u8", group: "Local" },
  { name: "KQFX FOX", url: "https://cvtv.cvalley.net/hls/KQFXFOX/KQFXFOX.m3u8", group: "Local" },
  { name: "WDAF FOX", url: "https://cvtv.cvalley.net/hls/WDAFFox/WDAFFox.m3u8", group: "Local" },
  { name: "KNLJ", url: "https://cvtv.cvalley.net/hls/KNLJ/KNLJ.m3u8", group: "Local" },
  { name: "KCPT PBS", url: "https://cvtv.cvalley.net/hls/KCPTPBS/KCPTPBS.m3u8", group: "Local" },
  { name: "KCWE CE", url: "https://cvtv.cvalley.net/hls/KCWECW/KCWECW.m3u8", group: "Local" },
  { name: "KMBC MeTV", url: "https://cvtv.cvalley.net/hls/KMBCMeTV/KMBCMeTV.m3u8", group: "Subchannel" },
  { name: "KMCI Bounce TV", url: "https://cvtv.cvalley.net/hls/KMCIBounceTV/KMCIBounceTV.m3u8", group: "Subchannel" },
  { name: "KMIZ MeTV", url: "https://cvtv.cvalley.net/hls/KMIZMeTV/KMIZMeTV.m3u8", group: "Subchannel" },
  { name: "KMSO PBS", url: "https://cvtv.cvalley.net/hls/KMOSPBS/KMOSPBS.m3u8", group: "Local" },
  { name: "KPXE ION", url: "https://cvtv.cvalley.net/hls/KPXEION/KPXEION.m3u8", group: "Subchannel" },
  { name: "KRCG Comet", url: "https://cvtv.cvalley.net/hls/KRCGComet/KRCGComet.m3u8", group: "Subchannel" },
  { name: "KRCG CHARGE", url: "https://cvtv.cvalley.net/hls/KRCGCHARGE/KRCGCHARGE.m3u8", group: "Subchannel" },
  { name: "KRCG TBD", url: "https://cvtv.cvalley.net/hls/KRCGTBD/KRCGTBD.m3u8", group: "Subchannel" },
  { name: "KSHB COZI", url: "https://cvtv.cvalley.net/hls/KSHBCozi/KSHBCozi.m3u8", group: "Subchannel" },
  { name: "KSHB LAFF", url: "https://cvtv.cvalley.net/hls/KSHBLaff/KSHBLaff.m3u8", group: "Subchannel" },
  { name: "KSMO IND", url: "https://cvtv.cvalley.net/hls/KSMOIND/KSMOIND.m3u8", group: "Local" },
  { name: "KTVO Comet", url: "https://cvtv.cvalley.net/hls/KTVOComet/KTVOComet.m3u8", group: "Subchannel" },
  { name: "KYOU NBC", url: "https://cvtv.cvalley.net/hls/KYOUNBC/KYOUNBC.m3u8", group: "Local" },
  { name: "KYOU NBC2", url: "https://cvtv.cvalley.net/hls/KYOUNBC2/KYOUNBC2.m3u8", group: "Local" },
  { name: "KYOU GRIT", url: "https://cvtv.cvalley.net/hls/KYOUGrit/KYOUGrit.m3u8", group: "Subchannel" },
  { name: "KYOU DT4", url: "https://cvtv.cvalley.net/hls/KYOUDT4/KYOUDT4.m3u8", group: "Subchannel" },
  { name: "KYOU MYZOU", url: "https://cvtv.cvalley.net/hls/KZOUMYZOU/KZOUMYZOU.m3u8", group: "Subchannel" },
  { name: "WDAF Antenna", url: "https://cvtv.cvalley.net/hls/WDAFAntenna/WDAFAntenna.m3u8", group: "Subchannel" }
];

// === helpers ===
function sanitizeTvgId(name) {
  return name.toLowerCase().replace(/\s+/g, "_").replace(/[^\w-_.]/g, "");
}

function timeoutPromise(ms, msg) {
  return new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), ms));
}

async function fetchHeadSample(url) {
  const controller = new AbortController();
  const signal = controller.signal;
  // race with timeout
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    // request a tiny byte range if server supports it
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { Range: "bytes=0-1023", "User-Agent": "missouri-playlist-updater/1.0" },
      signal
    });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Limited concurrency map
 */
async function mapLimit(array, limit, iteratorFn) {
  const results = new Array(array.length);
  let idx = 0;
  const workers = new Array(Math.min(limit, array.length)).fill(null).map(async () => {
    while (true) {
      const i = idx++;
      if (i >= array.length) return;
      results[i] = await iteratorFn(array[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

// === main ===
async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  console.log(`Validating ${channels.length} channels (concurrency=${CONCURRENCY})...`);

  const results = await mapLimit(channels, CONCURRENCY, async (ch) => {
    try {
      const res = await fetchHeadSample(ch.url);
      if (!res.ok) throw new Error(`http ${res.status}`);
      const ct = res.headers.get("content-type") || "";
      // good if content-type looks like HLS or URL ends with .m3u8
      const ok = ct.includes("mpegurl") || ct.includes("vnd.apple.mpegurl") || ct.includes("application/vnd.apple.mpegurl") || ch.url.toLowerCase().endsWith(".m3u8") || res.headers.get("content-length") !== null;
      return { ok, status: res.status, contentType: ct, name: ch.name, url: ch.url, group: ch.group || "Local" };
    } catch (err) {
      return { ok: false, error: err.message || String(err), name: ch.name, url: ch.url, group: ch.group || "Local" };
    }
  });

  // build output
  const header = [
    "#EXTM3U",
    `# Generated: ${new Date().toISOString()}`,
    "# Source: DisabledAbel/Cvtv-m3u",
    ""
  ].join("\n");

  const okLines = [];
  const failedLines = [];

  for (const r of results) {
    const tvgId = sanitizeTvgId(r.name);
    if (r.ok) {
      okLines.push(`#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${r.name}" group-title="${r.group}",${r.name}`);
      okLines.push(r.url);
      okLines.push("");
    } else {
      failedLines.push(`# ${r.name} -- failed (${r.error || `status=${r.status} ct=${r.contentType || ""}`})`);
      failedLines.push(`#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${r.name}" group-title="${r.group}",${r.name}`);
      failedLines.push(`# ${r.url}`);
      failedLines.push("");
    }
  }

  const body = [header, ...okLines, "# FAILED (commented) -- channels below were unreachable during generation", "", ...failedLines].join("\n");

  await fs.writeFile(TMP_FILE, body, "utf8");
  await fs.rename(TMP_FILE, OUT_FILE);

  const okCount = results.filter(r => r.ok).length;
  const failCount = results.length - okCount;
  console.log(`Playlist written: ${OUT_FILE}  (ok: ${okCount}, failed: ${failCount})`);

  if (failCount > 0) {
    console.log("Some channels failed — they are included commented at the bottom of the playlist.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exitCode = 2;
});
