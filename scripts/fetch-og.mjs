// Reads sites.json, downloads each site's og:image into ./og and writes og/manifest.json.
// Runs in GitHub Actions (Node 20+, built-in fetch). A failure on one site never stops the rest.
import { mkdir, readFile, writeFile } from "node:fs/promises";

const UA = "Mozilla/5.0 (compatible; BookmarksBot/1.0)";
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const MAX_BYTES = 3 * 1024 * 1024;

function findMeta(html, names) {
  for (const n of names) {
    const a = new RegExp(`<meta[^>]+(?:property|name)=["']${n}["'][^>]*content=["']([^"']+)["']`, "i");
    const b = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${n}["']`, "i");
    const m = html.match(a) || html.match(b);
    if (m) return m[1].replace(/&amp;/g, "&");
  }
  return null;
}

// Whole-line // comments are allowed in sites.json (same rule as index.html).
const text = (await readFile("sites.json", "utf8")).replace(/^\s*\/\/.*$/gm, "").replace(/,(\s*[\]}])/g, "$1");
const sites = JSON.parse(text);
await mkdir("og", { recursive: true });
const manifest = {};

for (const s of sites) {
  try {
    const page = await fetch(s.url, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(15000) });
    const html = (await page.text()).slice(0, 300000);
    const raw = findMeta(html, ["og:image", "og:image:url", "twitter:image"]);
    if (!raw) { console.log(`- ${s.id}: no og:image found`); continue; }

    const imgUrl = new URL(raw, page.url).href;
    const res = await fetch(imgUrl, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20000) });
    const type = (res.headers.get("content-type") || "").split(";")[0].trim();
    const ext = EXT[type];
    if (!res.ok || !ext) { console.log(`- ${s.id}: unsupported or failed image (${res.status} ${type})`); continue; }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) { console.log(`- ${s.id}: image too large, skipped`); continue; }

    await writeFile(`og/${s.id}.${ext}`, buf);
    manifest[s.id] = `og/${s.id}.${ext}`;
    console.log(`+ ${s.id}: saved ${manifest[s.id]}`);
  } catch (e) {
    console.log(`- ${s.id}: failed (${e.message})`);
  }
}

await writeFile("og/manifest.json", JSON.stringify(manifest, null, 2));
