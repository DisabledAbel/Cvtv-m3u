import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// helper to generate timestamp
function getTimestamp() {
  return new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
}

// recreate __filename / __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  let playlistContent = `#EXTM3U
# Updated: ${getTimestamp()}
#EXTINF:-1, Example Channel 1
http://example.com/stream1.m3u8
#EXTINF:-1, Example Channel 2
http://example.com/stream2.m3u8
`;

  const dir = path.join(__dirname, "playlists");
  fs.mkdirSync(dir, { recursive: true });

  const outputPath = path.join(dir, "missouri.m3u8");
  fs.writeFileSync(outputPath, playlistContent, "utf8");

  console.log(`✅ Missouri playlist saved to ${outputPath}`);

  const preview = playlistContent.split("\n").slice(0, 6).join("\n");
  console.log("\n📺 Playlist preview:\n" + preview + "\n...");

} catch (err) {
  console.error("❌ Failed to build Missouri playlist:", err.message);
  process.exit(1);
}
