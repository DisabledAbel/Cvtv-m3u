#!/usr/bin/env node
/**
 * build-missouri-playlist.js
 *
 * Generates playlists/missouri.m3u8 with parallel URL validation for faster builds.
 * Node 20+ required.
 */

import fs from "fs/promises";
import path from "path";

const OUT_DIR = path.resolve("playlists");
const OUT_FILE = path.join(OUT_DIR, "missouri.m3u8");
const TMP_FILE = OUT_FILE + ".tmp";
const FETCH_TIMEOUT_MS = 10000; // 10s
const MAX_PARALLEL = 10; // Max simultaneous fetches

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

function sanitizeTvgId(name) {
  return name.toLowerCase().replace(/\s+/g, "_").replace(/[^\w-_.]/g, "");
}

async function checkUrl(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { method: "GET", headers: { Range: "bytes=0-1023" }, signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

// Process channels in batches to limit simultaneous requests
async function batchValidate(channels, batchSize) {
  const results = [];
  for (let i = 0; i < channels.length; i += batchSize) {
    const batch = channels.slice(i, i + batchSize);
    const promises = batch.map(async ch => ({ ch, ok: await checkUrl(ch.url) }));
    const batchResults = await Promise.allSettled(promises);
    batchResults.forEach(r => {
      if (r.status === "fulfilled") results.push(r.value);
      else results.push({ ch: r.reason?.ch || null, ok: false });
    });
  }
  return results;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const validated = await batchValidate(channels, MAX_PARALLEL);

  let content = "#EXTM3U\n";
  content += `# Generated: ${new Date().toISOString()}\n\n`;

  for (const { ch, ok } of validated) {
    const tvgId = sanitizeTvgId(ch.name);
    if (ok) {
      content += `#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${ch.name}" group-title="${ch.group}",${ch.name}\n`;
      content += `${ch.url}\n\n`;
    } else {
      content += `# ${ch.name} -- unreachable\n`;
      content += `#EXTINF:-1 tvg-id="${tvgId}" tvg-name="${ch.name}" group-title="${ch.group}",${ch.name}\n`;
      content += `# ${ch.url}\n\n`;
    }
  }

  await fs.writeFile(TMP_FILE, content, "utf8");
  await fs.rename(TMP_FILE, OUT_FILE);
  console.log(`Missouri playlist generated: ${OUT_FILE}`);
}

main().catch(err => {
  console.error("Error generating playlist:", err);
  process.exit(1);
});
