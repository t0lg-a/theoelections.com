#!/usr/bin/env node
// build_past_index.js
// Lists which past-election odds files actually exist, so the client stops
// asking for the ones that do not. Off-years carry only the races that were
// held, and requesting a missing year/mode cost four 404s on every load.
//
// Reads:  json/past/*_odds.json
// Writes: json/past/odds_index.json

const fs = require("fs");
const path = require("path");

const DIR = path.join("json", "past");
const OUT = path.join(DIR, "odds_index.json");

function main() {
  if (!fs.existsSync(DIR)) {
    console.error(`${DIR}: not found`);
    process.exit(1);
  }

  const byYear = {};
  for (const name of fs.readdirSync(DIR)) {
    const m = name.match(/^(\d{4})_([a-z]+)_odds\.json$/);
    if (!m) continue;
    const [, year, mode] = m;
    (byYear[year] ||= []).push(mode);
  }

  for (const y of Object.keys(byYear)) byYear[y].sort();

  const out = {
    generatedAt: new Date().toISOString(),
    note: "Year to the modes that have a precomputed odds file. Absent means the race was not held or has no odds.",
    years: Object.fromEntries(Object.keys(byYear).sort().map(y => [y, byYear[y]])),
  };

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  const total = Object.values(byYear).reduce((n, a) => n + a.length, 0);
  console.log(`  ${OUT}: ${Object.keys(byYear).length} years, ${total} odds files`);
}

if (require.main === module) main();
