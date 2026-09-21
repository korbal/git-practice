#!/usr/bin/env node
/**
 * shot.js — headless screenshot helper for index.html (and friends).
 *
 * Why this exists: on this machine /usr/bin/firefox is a snap and refuses
 * to run headless here ("cannot change mount namespace ..."). No
 * chromium/google-chrome/puppeteer was installed, BUT a private Chrome for
 * Testing build was already cached (by a previous puppeteer run) under
 * ~/.cache/puppeteer/chrome/. This script drives that binary via
 * `puppeteer-core` (a devDependency here — no browser bundled/downloaded,
 * it just talks CDP to whatever executable you point it at), so no sudo,
 * no snap, no system package install needed.
 *
 * If ~/.cache/puppeteer has no chrome build at all, run once:
 *   npx --yes puppeteer browsers install chrome
 * (downloads a private Chrome into ~/.cache/puppeteer — no sudo needed).
 *
 * Usage:
 *   node shot.js <outputPath> [url] [width] [height] [jsFile]
 *
 *   outputPath  required. Where to write the PNG.
 *   url         default: file://<repo>/index.html
 *   width       default: 1200
 *   height      default: 900
 *   jsFile      optional path to a JS file whose contents run inside the
 *               page (via page.evaluate) AFTER load and BEFORE the shot.
 *               Use this to click through UI, e.g. a file containing:
 *
 *                 document.getElementById('p-next').click();
 *                 document.getElementById('p-next').click();
 *
 *               If the snippet needs to wait/click repeatedly with delays,
 *               make it an async IIFE — it is awaited.
 *
 * Examples:
 *   node shot.js out.png
 *   node shot.js out.png file:///path/to/index.html 800 600
 *   node shot.js out.png "" 1200 900 click-through.js
 *
 * Set CHROME_PATH to use a Chrome/Chromium that is not in the puppeteer cache.
 *
 * Exit code is non-zero on failure; stderr has details.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

function findChrome() {
  // Escape hatch for machines that have Chrome somewhere else (CI images, containers).
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const cacheRoot = path.join(os.homedir(), ".cache", "puppeteer", "chrome");
  if (!fs.existsSync(cacheRoot)) return null;
  const versions = fs.readdirSync(cacheRoot).sort(); // lexical ~= version sort here
  for (let i = versions.length - 1; i >= 0; i--) {
    const dir = path.join(cacheRoot, versions[i], "chrome-linux64", "chrome");
    if (fs.existsSync(dir)) return dir;
  }
  return null;
}

async function main() {
  const [, , outPath, urlArg, widthArg, heightArg, jsFileArg] = process.argv;
  if (!outPath) {
    console.error("Usage: node shot.js <outputPath> [url] [width] [height] [jsFile]");
    process.exit(1);
  }

  const url =
    urlArg && urlArg.length
      ? urlArg
      : "file://" + path.join(__dirname, "index.html");
  const width = parseInt(widthArg, 10) || 1200;
  const height = parseInt(heightArg, 10) || 900;

  const executablePath = findChrome();
  if (!executablePath) {
    console.error(
      "No cached Chrome found under ~/.cache/puppeteer/chrome. Run:\n" +
        "  npx --yes puppeteer browsers install chrome"
    );
    process.exit(1);
  }

  const puppeteer = require("puppeteer-core");
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    page.on("console", (msg) => {
      // Surface page console errors to help debugging blank renders.
      if (msg.type() === "error") console.error("[page console]", msg.text());
    });
    page.on("pageerror", (err) => console.error("[page error]", err.message));

    await page.goto(url, { waitUntil: "load" });

    if (jsFileArg) {
      const snippet = fs.readFileSync(jsFileArg, "utf8");
      // Evaluate as a string IN THE PAGE so it can use await/delays.
      await page.evaluate(`(async () => { ${snippet} })()`);
    }

    await page.screenshot({ path: outPath, fullPage: false });
    console.log("Wrote", outPath);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
