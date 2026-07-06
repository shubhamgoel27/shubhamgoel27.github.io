// Regenerate the OG share card -> public/og.png (exact 1200x630), using headless
// Chromium so the real Fraunces + Inter webfonts render. Puppeteer is intentionally
// NOT a committed dependency (keeps CI/deploy from downloading Chromium); install it
// only when regenerating:  npm i -D puppeteer  &&  node scripts/gen-og.mjs
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import puppeteer from "puppeteer";
import sharp from "sharp";

const URL = process.env.OG_URL || pathToFileURL(resolve("scripts/og-template.html")).href;
const OUT = "public/og.png";

const browser = await puppeteer.launch({ headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: "networkidle0" });
await page.evaluateHandle("document.fonts.ready");
await new Promise((r) => setTimeout(r, 400));
const raw = await (await page.$(".og")).screenshot({ type: "png" });
await browser.close();

await sharp(raw).resize(1200, 630).png({ compressionLevel: 9 }).toFile(OUT);
const meta = await sharp(OUT).metadata();
console.log(`wrote ${OUT} (${meta.width}x${meta.height})`);
