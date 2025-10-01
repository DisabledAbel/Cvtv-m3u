import fs from "fs";
import fetch from "node-fetch";

const issueUrl = "https://api.github.com/repos/DisabledAbel/Cvtv-m3u/issues/1";

// Fetch the GitHub issue content
const response = await fetch(issueUrl, {
  headers: { "Accept": "application/vnd.github.v3+json" }
});
const data = await response.json();
const body = data.body;

// Extract channels (lines starting with http)
const lines = body.split("\n");
const channels = [];
let lastName = "";

for (let line of lines) {
  line = line.trim();
  if (!line) continue;

  if (line.startsWith("http")) {
    channels.push({ name: lastName || "Unknown", url: line });
  } else if (line.startsWith("#")) {
    // ignore markdown headings
  } else {
    lastName = line;
  }
}

// Build M3U content
let output = "#EXTM3U\n\n";
for (const ch of channels) {
  output += `#EXTINF:-1 group-title="Missouri",${ch.name}\n${ch.url}\n\n`;
}

// Ensure folder exists
fs.mkdirSync("playlists", { recursive: true });
fs.writeFileSync("playlists/missouri.m3u8", output);

console.log("✅ Playlist built successfully!");
