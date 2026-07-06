// Regenerate OG share cards -> public/og.png (homepage) + public/og-<slug>.png (each
// blog post), using headless Chromium so the real Fraunces + Inter webfonts render.
// Puppeteer is intentionally NOT a committed dependency (keeps CI/deploy from downloading
// Chromium); install it only when regenerating:
//   npm i -D puppeteer  &&  node scripts/gen-og.mjs  &&  npm remove puppeteer
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { readFileSync, readdirSync } from "node:fs";
import puppeteer from "puppeteer";
import sharp from "sharp";

const TEMPLATE = pathToFileURL(resolve("scripts/og-template.html")).href;

const titleOf = (md) => {
  const m = readFileSync(md, "utf8").match(/^title:\s*["']?(.+?)["']?\s*$/m);
  return m ? m[1] : null;
};

const posts = readdirSync("src/content/blog")
  .filter((f) => f.endsWith(".md"))
  .map((f) => ({ slug: f.replace(/\.md$/, ""), title: titleOf(`src/content/blog/${f}`) }))
  .filter((p) => p.title);

const jobs = [
  { url: TEMPLATE, out: "public/og.png" },
  ...posts.map((p) => ({ url: `${TEMPLATE}?title=${encodeURIComponent(p.title)}`, out: `public/og-${p.slug}.png` })),
];

const browser = await puppeteer.launch({ headless: "new" });
for (const job of jobs) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
  await page.goto(job.url, { waitUntil: "networkidle0" });
  await page.evaluateHandle("document.fonts.ready");
  await new Promise((r) => setTimeout(r, 400));
  const raw = await (await page.$(".og")).screenshot({ type: "png" });
  await sharp(raw).resize(1200, 630).png({ compressionLevel: 9 }).toFile(job.out);
  console.log("wrote", job.out);
  await page.close();
}
await browser.close();
