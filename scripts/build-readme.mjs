// Rebuilds the generated parts of README.md from sites.json.
// Only the text between <!-- BEGIN name --> and <!-- END name --> markers is replaced; everything else is hand-written.
// Runs in GitHub Actions on every change to sites.json. To run locally: node scripts/build-readme.mjs
import { readFile, writeFile } from "node:fs/promises";

// Whole-line // comments are allowed in sites.json (same rule as index.html).
const text = (await readFile("sites.json", "utf8")).replace(/^\s*\/\/.*$/gm, "").replace(/,(\s*[\]}])/g, "$1");
const sites = JSON.parse(text);

// GitHub repos come first; otherwise the same grouping as the page:
// categories in order of first appearance, sites in file order.
const isGitHub = (s) => /^https?:\/\/(www\.)?github\.com\//i.test(s.url);
const groups = new Map();
for (const s of [...sites.filter(isGitHub), ...sites.filter((s) => !isGitHub(s))]) {
  const key = s.category.en;
  if (!groups.has(key)) groups.set(key, { category: s.category, sites: [] });
  groups.get(key).sites.push(s);
}

// Headings are English only so the anchors are predictable.
// GitHub heading anchors: lowercase, punctuation dropped, each space becomes a hyphen.
const slug = (h) => h.toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/ /g, "-");
const cell = (v) => String(v ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const status = (s) => [s.approved && "✅ Tested", s.todo && "📝 To test"].filter(Boolean).join(" · ");

const blocks = {
  toc: [...groups.values()]
    .map((g) => `  - [${g.category.en} · ${g.category.fa}](#${slug(g.category.en)}) (${g.sites.length})`)
    .join("\n"),

  stats: `**${sites.length}** sites in **${groups.size}** categories · ` +
    `**${sites.filter((s) => s.approved).length}** tested · ` +
    `**${sites.filter((s) => s.todo).length}** to test`,

  sites: [...groups.values()]
    .map((g) => [
      `### ${g.category.en}`,
      "",
      g.category.fa,
      "",
      "| Site | Note | توضیح | Status |",
      "| --- | --- | --- | --- |",
      ...g.sites.map((s) => `| [${cell(s.name)}](${s.url}) | ${cell(s.note.en)} | ${cell(s.note.fa)} | ${status(s)} |`),
    ].join("\n"))
    .join("\n\n"),
};

let readme = await readFile("README.md", "utf8");
for (const [name, body] of Object.entries(blocks)) {
  const re = new RegExp(`(<!-- BEGIN ${name} -->)[\\s\\S]*?(<!-- END ${name} -->)`);
  if (!re.test(readme)) throw new Error(`README.md is missing the <!-- BEGIN ${name} --> / <!-- END ${name} --> markers`);
  readme = readme.replace(re, (_, a, b) => `${a}\n${body}\n${b}`);
}
await writeFile("README.md", readme);
console.log(`README.md updated: ${sites.length} sites in ${groups.size} categories`);
