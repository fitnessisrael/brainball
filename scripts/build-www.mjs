// Copies the website into www/ for the store apps (Capacitor). In the app the first screen is the app itself (not the landing page).
import { cpSync, rmSync, mkdirSync, writeFileSync, readdirSync, readFileSync, existsSync } from "node:fs";
const out = "www";
rmSync(out, { recursive: true, force: true }); mkdirSync(out);
const skip = new Set(["www", "node_modules", "android", "ios", "scripts", "resources", "supabase", ".git", ".github", "package.json", "package-lock.json", "capacitor.config.json", "vercel.json", "index.html", "app.html", ".gitignore"]);
for (const f of readdirSync(".")) if (!skip.has(f)) cpSync(f, `${out}/${f}`, { recursive: true });
cpSync("app.html", `${out}/index.html`);
cpSync("app.html", `${out}/app.html`);
// offline libraries and fonts
const V = `${out}/vendor`; mkdirSync(V, { recursive: true });
const cp = (from, to) => { if (!existsSync(from)) throw new Error("missing " + from); mkdirSync(to.replace(/\/[^/]+$/, ""), { recursive: true }); cpSync(from, to); };
cp("node_modules/@supabase/supabase-js/dist/umd/supabase.js", `${V}/supabase.js`);
let css = "";
const RANGES = { hebrew: "U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F", latin: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" };
const add = (fam, pkg, weights, subs) => { for (const w of weights) for (const sub of subs) {
  const f = `${pkg}-${sub}-${w}-normal.woff2`; const src = `node_modules/@fontsource/${pkg}/files/${f}`; if (!existsSync(src)) continue; cp(src, `${V}/fonts/${f}`);
  css += `@font-face{font-family:${fam};font-style:normal;font-weight:${w};font-display:swap;src:url(fonts/${f}) format("woff2");unicode-range:${RANGES[sub]}}\n`; } };
add("Heebo", "heebo", [400, 500, 600, 700, 800, 900], ["hebrew", "latin"]);
add("Outfit", "outfit", [400, 500, 600, 700, 800], ["latin"]);
writeFileSync(`${V}/fonts.css`, css);
for (const f of readdirSync(out)) if (f.endsWith(".html")) {
  let t = readFileSync(`${out}/${f}`, "utf8");
  t = t.replace(/<link rel="preconnect"[^>]*>\s*/g, "");
  t = t.replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>/g, '<link rel="stylesheet" href="/vendor/fonts.css">');
  t = t.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/g, '<link rel="stylesheet" href="/vendor/fonts.css">');
  t = t.replaceAll("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js", "/vendor/supabase.js");
  writeFileSync(`${out}/${f}`, t);
}
console.log("www ready");
