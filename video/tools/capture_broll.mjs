// Records real B-roll of the running web app as PNG frame sequences.
// Usage: node tools/capture_broll.mjs [baseUrl]   (default http://localhost:3100)
// Output: broll/<name>/f00001.png ... plus broll/<name>/meta.json {fps}
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] || "http://localhost:3100";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const CHROME = path.join(ROOT, "node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe");
const INTERVAL = 150; // ms between frames -> ~6.7 fps, played back with motion smoothing in MoviePy

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function record(page, name, action, { maxMs = 30000, until } = {}) {
  const dir = path.join(ROOT, "broll", name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  let n = 0;
  let stop = false;
  const started = Date.now();
  const loop = (async () => {
    while (!stop && Date.now() - started < maxMs) {
      const t = Date.now();
      await page.screenshot({ path: path.join(dir, `f${String(++n).padStart(5, "0")}.png`) });
      await sleep(Math.max(0, INTERVAL - (Date.now() - t)));
    }
  })();
  await action();
  if (until) await until().catch(() => {});
  await sleep(1500); // hold on the result
  stop = true;
  await loop;
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify({ frames: n, ms: Date.now() - started }));
  console.log(`${name}: ${n} frames in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

async function ask(page, url, question) {
  await page.goto(url, { waitUntil: "networkidle2" });
  await sleep(800);
  const input = await page.waitForSelector("input[type=text], input:not([type]), textarea");
  let before = 0;
  await record(page, path.basename(url) || "page", async () => {
    await sleep(600);
    await input.click();
    await input.type(question, { delay: 45 });
    await sleep(300);
    await page.keyboard.press("Enter");
    await sleep(700);
    before = await page.evaluate(() => document.body.innerText.length);
  }, {
    maxMs: 60000,
    // the answer has arrived when the busy label is gone and the page text has grown
    until: () => page.waitForFunction(
      (n) => !/thinking|sending|loading/i.test(document.body.innerText) && document.body.innerText.length > n + 30,
      { timeout: 55000, polling: 250 }, before),
  });
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox", "--hide-scrollbars"] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1.5 });
await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);

const only = process.argv[3];
if (!only || only === "overview") {
  await page.goto(BASE, { waitUntil: "networkidle2" });
  await record(page, "overview", async () => {
    await sleep(1200);
    await page.evaluate(() => window.scrollTo({ top: 260, behavior: "smooth" }));
    await sleep(3500);
  }, { maxMs: 8000 });
}
if (!only || only === "kirana") {
  await ask(page, `${BASE}/kirana`, "March 2026 mein sabse zyada orders kis store pe aaye?");
}
if (!only || only === "support") {
  await ask(page, `${BASE}/support`, "Mera order late kyun hai?");
}
if (only === "bench") {
  // Dashboard scrolled to the benchmark chart, keeping the live-traffic KPI tiles out of frame.
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle2" });
  await page.evaluate(() => {
    const h = [...document.querySelectorAll("h1,h2,h3,div,span")].find((e) => e.textContent.trim() === "Benchmark runs");
    window.scrollTo(0, (h?.getBoundingClientRect().top ?? 0) + window.scrollY - 40);
  });
  await sleep(1200);
  await record(page, "bench", async () => { await sleep(4000); }, { maxMs: 6000 });
}
if (only === "notebook") {
  await page.goto("https://github.com/Ayush-e4/apprentice/blob/main/notebooks/train_sql_judge.ipynb", { waitUntil: "networkidle2", timeout: 60000 });
  await sleep(4000); // GitHub renders notebooks in an iframe after load
  await record(page, "notebook", async () => {
    await sleep(800);
    for (let i = 0; i < 6; i++) { await page.mouse.wheel({ deltaY: 160 }); await sleep(600); }
  }, { maxMs: 9000 });
}
if (!only || only === "dashboard") {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle2" });
  await record(page, "dashboard", async () => {
    await sleep(1500);
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: "smooth" }));
    await sleep(3500);
  }, { maxMs: 8000 });
}
await browser.close();
