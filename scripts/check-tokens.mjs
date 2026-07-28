#!/usr/bin/env node
/**
 * check-tokens.mjs — assert the token contract.
 *
 * The tokens are the system's contract, so a colour written anywhere but the
 * :root blocks is a colour nobody owns. This fails the build on one.
 *
 *   node scripts/check-tokens.mjs
 *
 * Checks:
 *   1. No colour literal in assets/theme.css outside a :root block.
 *   2. No pure white and no pure black anywhere.
 *   3. Every --t-* token that is defined is read somewhere.
 *   4. Every --t-* token that is read is defined.
 *   5. Every token defined for the light ground has a dark counterpart or is
 *      explicitly ground-independent.
 *   6. No masthead control declares a height of its own: they all take
 *      --t-control-h, so the row cannot drift by two pixels.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";

const THEME = "assets/theme.css";
const SKIP_FILES = new Set([
  "d3.v7.min.js", "topojson-client.v3.min.js",
  "react.production.min.js", "react-dom.production.min.js",
]);
// Generated route snapshots and vendored geometry are not authored here: the
// snapshots are rendered from baseline.html, and the SVGs are third-party
// district shapes whose inline colours are overridden at runtime. The checker
// asserts what a person wrote.
const SKIP_DIRS = new Set([
  ".git", "node_modules", "svg", "data", "csv", "prerender", "docs", "scripts",
  "model", "ratings", "florida", "polls", "swingometer",
  "past-elections", "state-legs", "projects", "methodology",
]);
// The three standalone analyses predate the system and carry their own
// palettes. Chapter 11 of docs/VISUAL-PLAN.md converts them; until then they
// are exempt by name, so the checker can guard the app today and this list
// can only shrink.
const PENDING_CONVERSION = new Set([
  "nationalization-2.html",
  "primary_turnout_combined.html",
  "fundraising-comparison.html",
]);

// Tokens that are the same on either ground, by design.
const GROUND_INDEPENDENT = new Set([
  "--t-d1", "--t-d2", "--t-d5", "--t-data", "--t-prose", "--t-control-h",
  "--t-w-hair", "--t-w-rule", "--t-w-contour", "--t-w-slab",
  "--t-fs-1", "--t-fs-2", "--t-fs-3", "--t-fs-4",
  "--t-fs-5", "--t-fs-6", "--t-fs-7", "--t-fs-8",
  "--t-sp-1", "--t-sp-2", "--t-sp-3", "--t-sp-4", "--t-sp-5", "--t-sp-6",
]);

const COLOUR = /#[0-9a-fA-F]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/g;
const failures = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if ([".css", ".js", ".html"].includes(extname(p)) && !SKIP_FILES.has(basename(p))) out.push(p);
  }
  return out;
}

const css = readFileSync(THEME, "utf8");

/* 1 · colour literals outside the :root blocks --------------------------- */
{
  // blank out every :root{...} body, then look for what is left
  let stripped = css.replace(/:root[^{]*\{[^}]*\}/g, "");
  const lines = css.split("\n");
  let inRoot = false, depth = 0;
  lines.forEach((line, i) => {
    if (/^:root/.test(line.trim())) inRoot = true;
    depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
    if (inRoot && depth === 0) { inRoot = false; return; }
    if (inRoot) return;
    const bare = line.split("/*")[0];
    const hits = bare.match(COLOUR);
    if (hits) failures.push(`${THEME}:${i + 1} colour outside :root — ${hits.join(" ")}`);
  });
  void stripped;
}

/* 2 · pure white and pure black ------------------------------------------ */
for (const file of walk(".")) {
  if (PENDING_CONVERSION.has(basename(file))) continue;
  const text = readFileSync(file, "utf8");
  text.split("\n").forEach((line, i) => {
    const bare = line.split("/*")[0].split("//")[0];
    if (/#fff(f{3})?\b|#000(0{3})?\b/i.test(bare) ||
        /\brgb\(\s*255\s*,\s*255\s*,\s*255\s*\)|\brgb\(\s*0\s*,\s*0\s*,\s*0\s*\)/.test(bare)) {
      failures.push(`${file}:${i + 1} pure white or black — ${line.trim().slice(0, 80)}`);
    }
  });
}

/* 3 and 4 · every token owned and read ------------------------------------ */
const defined = new Set([...css.matchAll(/^\s*(--t-[a-z0-9-]+)\s*:/gm)].map(m => m[1]));
const read = new Set();
for (const file of walk(".")) {
  const text = readFileSync(file, "utf8");
  for (const re of [/var\(\s*(--t-[a-z0-9-]+)/g,
                    /getPropertyValue\(\s*['"](--t-[a-z0-9-]+)/g,
                    /\btk\(\s*"(--t-[a-z0-9-]+)"/g,
                    /\btok\(\s*"(--t-[a-z0-9-]+)"/g]) {
    for (const m of text.matchAll(re)) read.add(m[1]);
  }
}
for (const t of [...defined].sort()) {
  if (!read.has(t)) failures.push(`${THEME} token ${t} is defined but never read`);
}
for (const t of [...read].sort()) {
  if (!defined.has(t)) failures.push(`token ${t} is read but never defined`);
}

/* 5 · a dark counterpart, or ground-independence -------------------------- */
{
  const darkBlock = css.match(/:root\[data-theme="dark"\]\{([^}]*)\}/);
  const dark = new Set(darkBlock ? [...darkBlock[1].matchAll(/(--t-[a-z0-9-]+)\s*:/g)].map(m => m[1]) : []);
  for (const t of [...defined].sort()) {
    if (dark.has(t) || GROUND_INDEPENDENT.has(t)) continue;
    failures.push(`${THEME} token ${t} has no dark counterpart and is not listed as ground-independent`);
  }
}

/* 6 · one height for every masthead control -------------------------------- */
{
  // The masthead's controls: the ground toggle and the two Donate buttons.
  const CONTROLS = /(^|[\s,}])\.(iconbtn|donate|donateBtn)\b/;
  css.split("\n").forEach((line, i) => {
    const bare = line.split("/*")[0];
    if (!CONTROLS.test(bare)) return;
    // The declaration may sit on the selector's own line in this sheet.
    const block = bare.slice(bare.indexOf("{") + 1);
    const h = block.match(/(?:^|[;{\s])height\s*:\s*([^;}]+)/);
    if (h && !/var\(\s*--t-control-h\s*\)/.test(h[1])) {
      failures.push(
        `${THEME}:${i + 1} masthead control sets its own height — ${h[1].trim()}`);
    }
  });
  if (!/--t-control-h\s*:/.test(css)) {
    failures.push(`${THEME} --t-control-h is not defined`);
  }
}

if (failures.length) {
  console.error(`check-tokens: ${failures.length} failure(s)\n`);
  for (const f of failures) console.error("  " + f);
  process.exit(1);
}
console.log("check-tokens: the token contract holds.");
