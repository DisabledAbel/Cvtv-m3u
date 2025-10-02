const fs = require("fs");
const path = require("path");

// helper to generate a readable timestamp
function getTimestamp() {
  return new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
}

try {
  // TODO: Replace this block with your real playlist generation logic
  let playlistContent = `#EXTM3U
# Updated: ${getTimestamp()}
#EXTINF:-1, Example Channel 1
http://example.com/stream1.m3u8
#EXTINF:-1, Example Channel 2
http://example.com/stream2.m3u8
`;

  // ensure "playlists" directory exists
  const dir = path.join(__dirname, "playlists");
  fs.mkdirSync(dir, { recursive: true });

  // write file
  const outputPath = path.join(dir, "missouri.m3u8");
  fs.writeFileSync(outputPath, playlistContent, "utf8");

  console.log(`✅ Missouri playlist saved to ${outputPath}`);

  // log preview for GitHub Actions
  const preview = playlistContent.split("\n").slice(0, 6).join("\n");
  console.log("\n📺 Playlist preview:\n" + preview + "\n...");

} catch (err) {
  console.error("❌ Failed to build Missouri playlist:", err.message);
  process.exit(1); // fail clearly in GitHub Actions
}
