#!/usr/bin/env node
// fetch-state-polls.js — Node.js CI script
// Pulls state-level Senate and Governor polls from the VoteHub polls API and
// writes them to json/state_polls.json, the file forecast.js, polls.js and
// compute_odds.js read for state polling.
//
// csv/state_polls_by_date.csv stays in the repo as a manual supplement: any
// row in it that the API does not already carry is merged in, so a race the
// API has not picked up yet still reaches the model.
//
// Reads:  csv/state_polls_by_date.csv (optional supplement + candidate parties)
// Writes: json/state_polls.json

const fs = require("fs");

const API_BASE = "https://api.votehub.com/polls";

// CONFIG
const LOOKBACK_DAYS = 700;   // 2026 cycle polling starts well before the year
const SLICE_DAYS    = 60;    // initial chunk size for the date-sliced fetch
const MAX_RETRIES   = 4;
const RETRY_BASE_MS = 750;
const DEFAULT_SIGMA = 3;     // matches the model's per-state polling sigma
const CSV_PATH      = "csv/state_polls_by_date.csv";
const OUT_PATH      = "json/state_polls.json";

// poll_type must match the API exactly. A live probe on 2026-07-28 showed the
// API answers for governor, generic-ballot, approval and favorability, and for
// nothing resembling senate: state Senate races are not exposed. The senate
// names stay in the list so the day they appear this picks them up, and the
// manual CSV carries senate until then.
const MODE_POLL_TYPES = {
  senate:   ["senate", "us-senate", "senate-general", "senate-race"],
  governor: ["governor", "gubernatorial", "governor-general", "governor-race"],
};

// The cycle this site models. A governor poll's subject reads "2025 Virginia"
// or "2026 New Hampshire", and last cycle's race is not this cycle's data.
const CYCLE = "2026";

// When every candidate name comes back empty, ask the API what it does carry
// rather than guessing again next time.
const PROBE_TYPES = [
  "senate", "us-senate", "house", "us-house", "governor", "gubernatorial",
  "president", "presidential", "generic-ballot", "approval", "favorability",
  "state-senate", "state-house", "attorney-general", "secretary-of-state",
  "senate-primary", "governor-primary", "ballot-measure",
];

// Race stages we skip. Anything else — including a stage the API does not
// report at all — is treated as a general-election matchup, because rejecting
// on an unrecognised stage silently threw away every poll on the first run.
const REJECTED_STAGE = /(primary|runoff|jungle|caucus|convention|nomination)/;

function stageIsModelled(raw) {
  const v = String(raw || "").trim().toLowerCase();
  if (!v) return true;
  return !REJECTED_STAGE.test(v);
}

const NAME_TO_USPS = {
  alabama:"AL",alaska:"AK",arizona:"AZ",arkansas:"AR",california:"CA",colorado:"CO",
  connecticut:"CT",delaware:"DE","district of columbia":"DC",florida:"FL",georgia:"GA",
  hawaii:"HI",idaho:"ID",illinois:"IL",indiana:"IN",iowa:"IA",kansas:"KS",kentucky:"KY",
  louisiana:"LA",maine:"ME",maryland:"MD",massachusetts:"MA",michigan:"MI",minnesota:"MN",
  mississippi:"MS",missouri:"MO",montana:"MT",nebraska:"NE",nevada:"NV","new hampshire":"NH",
  "new jersey":"NJ","new mexico":"NM","new york":"NY","north carolina":"NC","north dakota":"ND",
  ohio:"OH",oklahoma:"OK",oregon:"OR",pennsylvania:"PA","rhode island":"RI",
  "south carolina":"SC","south dakota":"SD",tennessee:"TN",texas:"TX",utah:"UT",vermont:"VT",
  virginia:"VA",washington:"WA","west virginia":"WV",wisconsin:"WI",wyoming:"WY"
};
const USPS = new Set(Object.values(NAME_TO_USPS));

/* ═══════════════════════════════════════════════════════
   HTTP
   ═══════════════════════════════════════════════════════ */
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// VoteHub's docs use %20 for spaces; URLSearchParams emits '+', which some of
// their filters reject.
function buildUrl(paramsObj) {
  const qs = new URLSearchParams(paramsObj).toString().replace(/\+/g, "%20");
  return `${API_BASE}?${qs}`;
}

function extractList(json) {
  if (Array.isArray(json)) return json;
  if (json && Array.isArray(json.polls)) return json.polls;
  if (json && Array.isArray(json.results)) return json.results;
  if (json && Array.isArray(json.data)) return json.data;
  return [];
}

async function fetchJson(url) {
  let lastErr = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "theoelections-state-polls/1.0" },
      });
      const text = await res.text();

      if (res.status === 429) {
        const wait = RETRY_BASE_MS * Math.pow(2, attempt - 1);
        console.warn(`  429 rate limit. Waiting ${wait}ms then retrying...`);
        await sleep(wait);
        continue;
      }

      if (!res.ok) {
        const err = new Error(`HTTP ${res.status} ${res.statusText}\nURL: ${url}\nBody (first 600):\n${text.slice(0, 600)}`);
        if (res.status >= 500 && attempt < MAX_RETRIES) {
          const wait = RETRY_BASE_MS * Math.pow(2, attempt - 1);
          console.warn(`  HTTP ${res.status}. Waiting ${wait}ms then retrying...`);
          await sleep(wait);
          lastErr = err;
          continue;
        }
        throw err;
      }

      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`Non-JSON response\nURL: ${url}\nBody (first 600):\n${text.slice(0, 600)}`);
      }
    } catch (e) {
      lastErr = e;
      if (attempt < MAX_RETRIES) {
        const wait = RETRY_BASE_MS * Math.pow(2, attempt - 1);
        console.warn(`  Fetch error. Waiting ${wait}ms then retrying...`);
        await sleep(wait);
      }
    }
  }

  throw lastErr;
}

function isoDate(d) { return d.toISOString().slice(0, 10); }

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function daysBetween(a, b) {
  return Math.floor((new Date(b) - new Date(a)) / (24 * 3600 * 1000));
}

// A single 5xx on one malformed record shouldn't cost a whole slice, so split
// the range down to day level before giving up on it.
async function fetchRangeRobust({ poll_type, from_date, to_date, debug }) {
  const span = daysBetween(from_date, to_date) + 1;

  try {
    const list = extractList(await fetchJson(buildUrl({
      poll_type, from_date, to_date, sort: "-end_date",
    })));
    debug.okSlices++;
    return list;
  } catch (e) {
    const msg = String(e);
    const is5xx = msg.includes("HTTP 5") || msg.includes("Internal Server Error");
    if (!is5xx) throw e;

    debug.failedSlices++;
    if (span <= 1) {
      debug.skippedDays.push(from_date);
      console.warn(`  Skipping ${from_date} (VoteHub 5xx).`);
      return [];
    }

    const mid = isoDate(addDays(new Date(from_date), Math.floor(span / 2) - 1));
    const left = await fetchRangeRobust({ poll_type, from_date, to_date: mid, debug });
    const right = await fetchRangeRobust({ poll_type, from_date: isoDate(addDays(new Date(mid), 1)), to_date, debug });
    return left.concat(right);
  }
}

async function fetchPollType(poll_type, start, today, debug) {
  let all = [];
  for (let d = new Date(start); d <= today; d = addDays(d, SLICE_DAYS)) {
    const from_date = isoDate(d);
    const end = addDays(d, SLICE_DAYS - 1);
    const to_date = isoDate(end > today ? today : end);
    process.stdout.write(`  ${poll_type} ${from_date} → ${to_date} ... `);
    const slice = await fetchRangeRobust({ poll_type, from_date, to_date, debug });
    all = all.concat(slice);
    console.log(`+${slice.length}`);
  }
  return all;
}

/* ═══════════════════════════════════════════════════════
   CSV (supplement + candidate → party lookup)
   ═══════════════════════════════════════════════════════ */
function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = line.split(",");
    const row = {};
    for (let j = 0; j < headers.length; j++) row[headers[j]] = (vals[j] || "").trim();
    rows.push(row);
  }
  return rows;
}

const CANDIDATE_PARTY = new Map();  // normalized candidate name → "D" | "R"

function normName(s) {
  return String(s || "").toLowerCase().replace(/[^a-z ]+/g, "").replace(/\s+/g, " ").trim();
}

function rememberCandidate(name, party) {
  const n = normName(name);
  const p = String(party || "").trim().toUpperCase().slice(0, 1);
  if (!n || (p !== "D" && p !== "R")) return;
  if (!CANDIDATE_PARTY.has(n)) CANDIDATE_PARTY.set(n, p);
  // Last-name-only fallback, useful because polls often list "Peltola" alone.
  const parts = n.split(" ");
  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (last.length > 3 && !CANDIDATE_PARTY.has(last)) CANDIDATE_PARTY.set(last, p);
  }
}

function normMode(x) {
  const v = String(x || "").trim().toLowerCase();
  if (v.includes("senate") || v === "sen") return "senate";
  if (v.includes("governor") || v.includes("gubernatorial") || v === "gov") return "governor";
  const u = v.toUpperCase();
  if (u.includes("SEN")) return "senate";
  if (u.includes("GOV")) return "governor";
  return "";
}

function toUsps(x) {
  const raw = String(x || "").trim();
  if (!raw) return "";
  const up = raw.toUpperCase();
  if (USPS.has(up)) return up;
  const byName = NAME_TO_USPS[raw.toLowerCase()];
  if (byName) return byName;
  // Race codes: "AK-SEN", "GA-Sen-Special", "TX-GOV"
  const m = up.match(/^([A-Z]{2})[-\s]/);
  if (m && USPS.has(m[1])) return m[1];
  // Seat names: "Georgia Senate", "New Hampshire Governor"
  const stripped = raw.toLowerCase()
    .replace(/\b(senate|senator|governor|gubernatorial|class\s+[ivx]+|special|general|runoff)\b/g, "")
    .replace(/[^a-z ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return NAME_TO_USPS[stripped] || "";
}

function parseDate(s) {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
}

/**
 * A race poll carries neither a state field nor a seat name: the race is in
 * `subject`, as a cycle and a state name, "2026 New Hampshire". Returns the
 * cycle and the USPS code, either of which may be empty.
 */
function parseSubject(subject) {
  const raw = String(subject || "").trim();
  if (!raw) return { cycle: "", state: "" };
  const m = raw.match(/^(\d{4})\s+(.*)$/);
  const cycle = m ? m[1] : "";
  const rest = (m ? m[2] : raw).trim();
  return { cycle, state: toUsps(rest) };
}

function loadCsvSupplement() {
  if (!fs.existsSync(CSV_PATH)) {
    console.log(`  ${CSV_PATH}: not found (optional, skipping)`);
    return [];
  }
  const rows = parseCSV(fs.readFileSync(CSV_PATH, "utf8"));
  const out = [];

  for (const r of rows) {
    rememberCandidate(r.candA_name, r.candA_party);
    rememberCandidate(r.candB_name, r.candB_party);

    const mode = normMode(r.mode || r.office || r.race || r.contest || "");
    const state = toUsps(r.state || r.State || r.key || r.race || "");
    const date = parseDate(r.date || r.end_date || r.endDate || "");
    if (!mode || !state || !date) continue;

    let D = Number(r.dem ?? r.D ?? r.pollD ?? NaN);
    let R = Number(r.rep ?? r.R ?? r.pollR ?? NaN);
    if (!isFinite(D) || !isFinite(R)) {
      const aP = String(r.candA_party || "").trim().toUpperCase().slice(0, 1);
      const bP = String(r.candB_party || "").trim().toUpperCase().slice(0, 1);
      const aPct = Number(r.candA_pct), bPct = Number(r.candB_pct);
      if (aP === "D") D = aPct; if (bP === "D") D = bPct;
      if (aP === "R") R = aPct; if (bP === "R") R = bPct;
      if (!isFinite(D) && !isFinite(R) && !aP && !bP) { D = aPct; R = bPct; }
    }
    if (!isFinite(D) || !isFinite(R) || (D + R) <= 0) continue;

    const moe = Number(r.sigma ?? r.moe_pct ?? NaN);
    out.push({
      mode, state, date,
      D, R,
      sigma: isFinite(moe) && moe > 0 ? moe : DEFAULT_SIGMA,
      pollster: String(r.pollster || "").trim(),
      sampleSize: Number(r.sample_n) || null,
      population: String(r.sample_type || "").trim().toLowerCase() || null,
      partisan: String(r.pollster_partisan || "").trim().toUpperCase() || null,
      internal: false,
      url: null,
      seat: String(r.race || "").trim() || null,
      source: "csv",
    });
  }

  console.log(`  ${CSV_PATH}: ${out.length} manual poll rows, ${CANDIDATE_PARTY.size} candidate-party entries`);
  return out;
}

/* ═══════════════════════════════════════════════════════
   NORMALIZING API POLLS
   ═══════════════════════════════════════════════════════ */
const D_WORDS = /^(d|dem|dems|democrat|democrats|democratic|generic democrat|democratic candidate)$/;
const R_WORDS = /^(r|rep|reps|gop|republican|republicans|generic republican|republican candidate)$/;

/** Normalize any party spelling the API might use into D, R or "". */
function partyLetter(raw) {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return "";
  if (/^(d|dem|dems|democrat|democratic|democrats)$/.test(v)) return "D";
  if (/^(r|rep|reps|gop|republican|republicans)$/.test(v)) return "R";
  return "";
}

/**
 * Party for one answer. The API's field naming is not pinned down, so this
 * looks at every key whose name mentions a party, then at the label, then at
 * the candidate map built from the CSV. It never guesses from position:
 * assigning a party by order would quietly corrupt the model, and a dropped
 * poll is recoverable where a mislabelled one is not.
 */
function answerParty(ans) {
  if (!ans || typeof ans !== "object") return "";

  // 1. Any field that names a party, at the top level or one level down.
  for (const [k, v] of Object.entries(ans)) {
    if (!/part(y|isan)/i.test(k)) continue;
    const p = partyLetter(v);
    if (p) return p;
  }
  for (const nest of ["candidate", "answer", "choice"]) {
    const obj = ans[nest];
    if (obj && typeof obj === "object") {
      for (const [k, v] of Object.entries(obj)) {
        if (!/part(y|isan)/i.test(k)) continue;
        const p = partyLetter(v);
        if (p) return p;
      }
    }
  }

  // 2. The label itself.
  const choice = String(
    ans.choice ?? ans.answer ?? ans.candidate_name ?? ans.name ?? ans.label ??
    (ans.candidate && (ans.candidate.name || ans.candidate.candidate_name)) ?? ""
  ).trim();
  const lower = choice.toLowerCase().replace(/\s+/g, " ");
  if (D_WORDS.test(lower)) return "D";
  if (R_WORDS.test(lower)) return "R";

  // Party marker anywhere in the label: "Jon Ossoff (D)", "Ossoff, D",
  // "Ossoff - Dem", "(D) Ossoff".
  const marker = choice.match(/[(\[,\-–]\s*(dem|democrat(?:ic)?|d|rep|republican|gop|r)\s*[)\]]?(?:\s|$)/i);
  if (marker) return partyLetter(marker[1]);

  // 3. The candidate map built from the manual CSV.
  const byName = CANDIDATE_PARTY.get(normName(choice.replace(/[(\[].*$/, "")));
  return byName || "";
}

function answerPct(ans) {
  const v = Number(ans.pct ?? ans.percent ?? ans.value ?? ans.share ?? ans.support ?? NaN);
  return isFinite(v) ? v : NaN;
}

/**
 * Collapse one API poll into a single {D, R} matchup: the strongest Democrat
 * against the strongest Republican. Returns null when either side is missing —
 * primaries and one-party fields drop out here.
 */
// Candidate names the party lookup could not place. Reported so the manual CSV
// can be extended rather than the poll being silently lost every run.
const UNRESOLVED = new Map();

function noteUnresolved(choice, subject) {
  const key = String(choice || "").trim();
  if (!key) return;
  if (!UNRESOLVED.has(key)) UNRESOLVED.set(key, new Set());
  UNRESOLVED.get(key).add(String(subject || "").trim());
}

function toMatchup(poll) {
  const answers = (Array.isArray(poll.answers) ? poll.answers : [])
    .map(a => ({ a, pct: answerPct(a), party: answerParty(a) }))
    .filter(x => isFinite(x.pct));

  let D = NaN, R = NaN;
  for (const x of answers) {
    if (x.party === "D" && (!isFinite(D) || x.pct > D)) D = x.pct;
    if (x.party === "R" && (!isFinite(R) || x.pct > R)) R = x.pct;
  }

  // A two-answer race where exactly one side is known: the other side is the
  // other party. This is the shape of the contest, not a guess from position —
  // a head-to-head has two parties, and one of them is already named.
  if (answers.length === 2) {
    const known = answers.filter(x => x.party === "D" || x.party === "R");
    if (known.length === 1) {
      const other = answers.find(x => x !== known[0]);
      if (known[0].party === "D") { D = known[0].pct; R = other.pct; }
      else                        { R = known[0].pct; D = other.pct; }
    }
  }

  if (!isFinite(D) || !isFinite(R) || (D + R) <= 0) {
    for (const x of answers) {
      if (!x.party) {
        noteUnresolved(x.a.choice ?? x.a.answer ?? x.a.candidate_name, poll.subject);
      }
    }
    return null;
  }
  return { D, R };
}

/**
 * Returns a row, or a string naming why the poll was dropped. Naming the
 * reason is the point: the first live run dropped 282 of 282 polls and the
 * output could not say which test had failed.
 */
function normalizeApiPoll(poll, mode) {
  if (!stageIsModelled(poll.stage ?? poll.race_stage)) return "stage";

  const subject = parseSubject(poll.subject);
  if (subject.cycle && subject.cycle !== CYCLE) return "cycle";

  const state = toUsps(poll.state) || toUsps(poll.seat_name) || toUsps(poll.race)
             || toUsps(poll.state_abbr) || toUsps(poll.state_name) || subject.state;
  if (!state) return "state";

  const date = parseDate(poll.end_date || poll.start_date || poll.created_at);
  if (!date) return "date";

  const pair = toMatchup(poll);
  if (!pair) return "matchup";

  const moe = Number(poll.margin_of_error ?? poll.moe ?? NaN);

  return {
    mode,
    state,
    date,
    D: pair.D,
    R: pair.R,
    sigma: isFinite(moe) && moe > 0 ? moe : DEFAULT_SIGMA,
    pollster: String(poll.pollster || poll.display_name || "").trim(),
    sampleSize: Number(poll.sample_size) || null,
    population: String(poll.population || "").trim().toLowerCase() || null,
    partisan: poll.partisan ? String(poll.partisan).trim().toUpperCase().slice(0, 1) : null,
    internal: !!poll.internal,
    url: poll.url || null,
    seat: poll.seat_name || null,
    source: "votehub",
    id: poll.id || null,
  };
}

/** Same race, same field date, same pollster, same numbers → same poll. */
function dedupeKey(p) {
  return [
    p.mode, p.state, p.date,
    String(p.pollster || "").toLowerCase().replace(/[^a-z0-9]+/g, ""),
    Number(p.D).toFixed(1), Number(p.R).toFixed(1),
  ].join("|");
}

/* ═══════════════════════════════════════════════════════
   DIAGNOSTICS
   The API is not reachable from every environment this repo is worked on in,
   so the script has to be able to describe what it received.
   ═══════════════════════════════════════════════════════ */

/** Record the field names the API actually returned, plus a redacted sample. */
function describeShape(mode, polls, debug) {
  const keys = new Set();
  const answerKeys = new Set();
  const stages = new Set();
  const stateVals = new Set();
  for (const p of polls.slice(0, 200)) {
    for (const k of Object.keys(p || {})) keys.add(k);
    for (const a of (Array.isArray(p.answers) ? p.answers : [])) {
      for (const k of Object.keys(a || {})) answerKeys.add(k);
    }
    if (p.stage != null) stages.add(String(p.stage));
    if (p.state != null) stateVals.add(String(p.state));
  }
  const sample = polls.slice(0, 3).map(p => ({
    id: p.id, poll_type: p.poll_type, stage: p.stage,
    state: p.state, seat_name: p.seat_name, subject: p.subject,
    start_date: p.start_date, end_date: p.end_date, pollster: p.pollster,
    answers: (Array.isArray(p.answers) ? p.answers : []).slice(0, 4),
  }));
  debug.shape[mode] = {
    pollKeys: [...keys].sort(),
    answerKeys: [...answerKeys].sort(),
    stages: [...stages].slice(0, 8),
    stateExamples: [...stateVals].slice(0, 8),
    sample,
  };
  console.log(`  ${mode} shape: keys=${JSON.stringify([...keys].sort())}`);
  console.log(`  ${mode} answer keys=${JSON.stringify([...answerKeys].sort())} stages=${JSON.stringify([...stages].slice(0,8))}`);
  console.log(`  ${mode} sample=${JSON.stringify(sample)}`);
}

/** Ask the API which poll_type names it answers for, over a short window. */
async function probePollTypes(start, today, debug) {
  const from_date = isoDate(addDays(today, -120));
  const to_date = isoDate(today);
  const found = {};
  for (const t of PROBE_TYPES) {
    try {
      const list = extractList(await fetchJson(buildUrl({
        poll_type: t, from_date, to_date, sort: "-end_date",
      })));
      if (list.length) found[t] = list.length;
    } catch (e) {
      found[t] = `error: ${String(e).split("\n")[0].slice(0, 60)}`;
    }
  }
  return found;
}

/* ═══════════════════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════════════════ */
async function run() {
  const today = new Date();
  const start = addDays(today, -LOOKBACK_DAYS);

  const debug = {
    lookbackDays: LOOKBACK_DAYS,
    pollTypeUsed: {},
    fetched: {},
    dropped: {},
    dropReasons: {},
    shape: {},
    okSlices: 0,
    failedSlices: 0,
    skippedDays: [],
  };

  console.log("Loading manual supplement + candidate parties...");
  const csvPolls = loadCsvSupplement();

  const apiPolls = [];
  for (const mode of Object.keys(MODE_POLL_TYPES)) {
    console.log(`Fetching ${mode} polls from VoteHub...`);
    let raw = [];
    for (const pollType of MODE_POLL_TYPES[mode]) {
      try {
        raw = await fetchPollType(pollType, start, today, debug);
      } catch (e) {
        console.warn(`  poll_type="${pollType}" failed: ${String(e).split("\n")[0]}`);
        continue;
      }
      if (raw.length) {
        debug.pollTypeUsed[mode] = pollType;
        break;
      }
      console.log(`  poll_type="${pollType}" returned nothing; trying the next name.`);
    }

    // The API can repeat a poll across overlapping slices.
    const byId = new Map();
    for (const p of raw) {
      if (p && p.id != null) byId.set(p.id, p);
      else if (p) byId.set(JSON.stringify(p), p);
    }
    const unique = Array.from(byId.values());

    if (unique.length) describeShape(mode, unique, debug);

    const reasons = {};
    let kept = 0;
    for (const p of unique) {
      const row = normalizeApiPoll(p, mode);
      if (typeof row === "string") reasons[row] = (reasons[row] || 0) + 1;
      else { apiPolls.push(row); kept++; }
    }
    debug.fetched[mode] = unique.length;
    debug.dropped[mode] = unique.length - kept;
    debug.dropReasons[mode] = reasons;
    console.log(`  ${mode}: ${unique.length} polls, ${kept} usable D-vs-R matchups`);
    if (unique.length && kept === 0) {
      console.warn(`  ${mode}: every poll was dropped. Reasons: ${JSON.stringify(reasons)}`);
    }

    if (!unique.length) {
      const found = await probePollTypes(start, today, debug);
      debug.probe = found;
      console.warn(`  ${mode}: no poll_type matched. The API answered for: ${JSON.stringify(found)}`);
    }
  }

  if (!apiPolls.length) {
    console.warn("WARNING: VoteHub returned no usable state polls; writing the manual supplement only.");
  }

  // API first, then any manual row the API doesn't already carry.
  const seen = new Set();
  const merged = [];
  for (const p of apiPolls.concat(csvPolls)) {
    const k = dedupeKey(p);
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(p);
  }
  merged.sort((a, b) => a.mode.localeCompare(b.mode) || a.state.localeCompare(b.state) || a.date.localeCompare(b.date));

  const counts = { senate: 0, governor: 0 };
  const states = { senate: new Set(), governor: new Set() };
  for (const p of merged) {
    counts[p.mode] = (counts[p.mode] || 0) + 1;
    states[p.mode]?.add(p.state);
  }

  debug.fromApi = merged.filter(p => p.source === "votehub").length;
  debug.fromCsv = merged.filter(p => p.source === "csv").length;

  // If the API answered and nothing survived, say so in the artifact itself.
  // The manual CSV keeps the site working, which is exactly how a silent
  // failure hides.
  const anyFetched = Object.values(debug.fetched).some(n => n > 0);
  debug.degraded = (anyFetched && debug.fromApi === 0) ? "API returned polls but none were usable" : false;

  // Names the lookup could not place, with the races they appeared in. Adding
  // a row for one to csv/state_polls_by_date.csv teaches the map and the poll
  // stops being dropped.
  if (UNRESOLVED.size) {
    debug.unresolvedCandidates = Object.fromEntries(
      [...UNRESOLVED.entries()].sort().slice(0, 60).map(([name, races]) => [name, [...races].sort()])
    );
    console.warn(`  ${UNRESOLVED.size} candidate name(s) had no party. Add any of them to ${CSV_PATH} to resolve their polls.`);
  }

  const out = {
    updatedAt: new Date().toISOString(),
    source: API_BASE,
    degraded: debug.degraded,
    window: 6,                 // rolling window (polls) the model averages over
    counts,
    states: { senate: states.senate.size, governor: states.governor.size },
    polls: merged,
    debug,
  };

  fs.mkdirSync("json", { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));
  console.log(`Done. ${merged.length} state polls (${debug.fromApi} from VoteHub, ${debug.fromCsv} manual) → ${OUT_PATH}`);

  if (debug.degraded) {
    console.warn(`WARNING: ${debug.degraded}. See debug.dropReasons and debug.shape in ${OUT_PATH}.`);
  }
  if (debug.skippedDays.length) {
    console.warn(`WARNING: skipped ${debug.skippedDays.length} day(s) due to VoteHub 5xx. See debug.skippedDays.`);
  }
}

if (require.main === module) {
  run().catch(e => {
    console.error("Critical Error:\n" + String(e));
    process.exit(1);
  });
}

module.exports = { run, normalizeApiPoll, toMatchup, answerParty, partyLetter, stageIsModelled, toUsps, normMode, rememberCandidate, dedupeKey };
