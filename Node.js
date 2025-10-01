import fs from "fs";
import fetch from "node-fetch";

const issueUrl = "https://api.github.com/repos/DisabledAbel/Cvtv-m3u/issues/1";
const res = await fetch(issueUrl, { headers: { "Accept": "application/vnd.github.v3+json" } });
const data = await res.json();
const body = data.body || "";

const lines = body.split("\n");
const channels = [];
let lastName = "";

for (let line of lines) {
  line = line.trim();
  if (!line) continue;
  if (line.startsWith("http")) {
    channels.push({ name: lastName || "Unknown", url: line });
  } else if (!line.startsWith("#")) {
    lastName = line;
  }
}

let output = "#EXTM3U\n\n";
for (const ch of channels) {
  output += `#EXTINF:-1 group-title="Missouri",${ch.name}\n${ch.url}\n\n`;
}

fs.mkdirSync("playlists", { recursive: true });
fs.writeFileSync("playlists/missouri.m3u8", output);
console.log("✅ Playlist built successfully!");
