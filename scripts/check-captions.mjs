// Every table and image in a post must sit inside a captioned <Figure>
// (tables: <Figure kind="table" …>), and every <Figure> needs a title or
// caption, every <Video> a caption. Runs before `npm run build` (fails) and
// `npm run dev` (with --warn, only reports).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = 'src/content/posts';
const warnOnly = process.argv.includes('--warn');

// Blank out code fences and MDX comments, keeping offsets (and line numbers) intact.
const mask = (text) =>
  text.replace(/```[\s\S]*?```|\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, ' '));

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

const problems = [];
for (const dir of fs.readdirSync(ROOT)) {
  const file = path.join(ROOT, dir, 'index.mdx');
  if (!fs.existsSync(file)) continue;
  const text = mask(fs.readFileSync(file, 'utf8'));

  const events = [];
  for (const m of text.matchAll(/<Figure\b([^>]*?)(\/?)>/g)) {
    if (!/\b(title|caption)=/.test(m[1])) problems.push(`${file}:${lineOf(text, m.index)}  <Figure> without a title or caption`);
    if (!m[2]) events.push([m.index, 1]);
  }
  for (const m of text.matchAll(/<\/Figure>/g)) events.push([m.index, -1]);
  for (const m of text.matchAll(/<Video\b([^>]*?)\/?>/g)) {
    if (!/\bcaption=/.test(m[1])) problems.push(`${file}:${lineOf(text, m.index)}  <Video> without a caption`);
  }
  events.sort((a, b) => a[0] - b[0]);
  const insideFigure = (index) => events.reduce((depth, [at, d]) => (at < index ? depth + d : depth), 0) > 0;

  for (const m of text.matchAll(/^\s*\|.*\|\s*\n\s*\|[\s:|-]+\|\s*$/gm)) {
    if (!insideFigure(m.index)) problems.push(`${file}:${lineOf(text, m.index)}  table outside <Figure kind="table" title="…" caption="…">`);
  }
  for (const m of text.matchAll(/!\[[^\]]*\]\(|<img\b/g)) {
    if (!insideFigure(m.index)) problems.push(`${file}:${lineOf(text, m.index)}  image outside <Figure title="…" caption="…">`);
  }
}

if (problems.length) {
  console.error(`\nEvery table and image needs a caption:\n  ${problems.join('\n  ')}\n`);
  if (!warnOnly) process.exit(1);
}
