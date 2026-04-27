/* ================================================================
   redistricting.js v2
   Redistricting War tab — Before (2024) vs After (2026) maps
   for the mid-decade redistricting states: CA, FL, MO, NC, TX, UT, VA.

   Reuses forecast.js globals:
     - DATA.house.gb, GB_SRC, HISPANIC_SHARE, HISPANIC_GB, HISPANIC_BASELINE
     - normalizePair, marginRD, winProbFromMargin, winProbD_fast, interpColor,
       fmtLead, classifyMargin, classifyColorAttr, clamp, ds, parseDate
     - winArcSVG, miniMeterHTML

   v2 changes (vs v1):
     • Florida added (28 districts, ratios + Hispanic share) — rendered from
       fl_districts.geojson via d3.geoAlbersUsa, layered into the same gRoot
       so it participates in tooltips, recoloring, zoom.
     • Visual fix: viewBox is auto-fit from the union of both eras' getBBox(),
       so the source SVGs' inconsistent viewBoxes no longer clip CA/UT/etc.
     • REDIST_DATA["2026"].hispanic is now {} (was null) so era-2026 FL
       districts get their own h_cd; falls back to global HISPANIC_SHARE
       for non-FL codes.
     • Bottom-bar legend ("CA · MO · NC · TX · UT · VA · (127 districts)") is
       now derived from REDIST_STATES + ratio counts, no hardcoded numbers.
   ================================================================ */
console.log("redistricting.js v2 — FL added + viewBox auto-fit");

const REDIST_STATES = ["CA","FL","MO","NC","TX","UT","VA"];

// Official effective dates for each state's new map (ISO yyyy-mm-dd).
// A state "flips" to the 2026 map on or after its date in the time-series chart.
// FL: TBD — leave null until the FL effective date is known. Null disables
// FL in the war-chart timeline (redistIsPassedBy returns false).
const REDIST_EFFECTIVE = {
  "TX": "2025-08-29", // Abbott signed
  "MO": "2025-09-28", // Kehoe signed
  "NC": "2025-10-22", // NC House final passage (no gubernatorial signature required)
  "CA": "2025-11-04", // Prop 50 approved by voters
  "UT": "2025-11-10", // Third District Court selected remedial map
  "VA": "2026-04-21", // Referendum approved
  "FL": null,         // TBD
};

const REDIST_DATA = {
  "2024": { ratios: {}, hispanic: {} },
  // hispanic: FL-specific overrides. Falls back to global HISPANIC_SHARE
  // for non-FL codes via redistGetHispanic().
  "2026": { ratios: {}, hispanic: {} },
};

// FL geojson cache (one file used for both eras until separate "before" data exists)
let REDIST_FL_GEOJSON = null;

// FL placement within the existing imported-states bbox (relative coords).
// southeast quadrant — under NC, east of TX. Tunable if it overlaps anything.
const FL_PLACEMENT = {
  xFrac: 0.80,   // left edge as fraction of imported-content bbox width
  yFrac: 0.62,   // top edge as fraction of imported-content bbox height
  wFrac: 0.16,   // FL footprint width fraction
  hFrac: 0.18,   // FL footprint height fraction
};

let REDIST_INITED = false;        // rendered once flag
let REDIST_LOADED = false;        // data loaded flag
let REDIST_LOAD_PROMISE = null;
let REDIST_SVG_TEXT = { "2024": null, "2026": null };
const REDIST_MAP = { "2024": null, "2026": null };
let REDIST_UI = null;

/* ---------- Data loading ---------- */
async function redistLoadRatios(path, target){
  const text = await fetch(path, {cache:"no-store"}).then(r=>{
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    return r.text();
  });
  const rows = d3.csvParse(text);
  let n = 0;
  for (const r of rows){
    const st = String(r.state||"").trim().toUpperCase();
    const cdI = parseInt(r.cd, 10);
    const rd = parseFloat(r.ratio_d);
    const rr = parseFloat(r.ratio_r);
    if (!st || !isFinite(cdI) || !isFinite(rd) || !isFinite(rr)) continue;
    const code = `${st}-${String(cdI).padStart(2,"0")}`;
    target[code] = { D: rd, R: rr, state: st, cd: cdI, code };
    n++;
  }
  return n;
}

async function redistLoadHispanic2024(){
  try {
    const text = await fetch("cd_hispanic_share_2024.csv", {cache:"no-store"}).then(r=>{
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    });
    const rows = d3.csvParse(text);
    let n = 0;
    for (const r of rows){
      const code = String(r.code||"").trim().toUpperCase();
      const h = parseFloat(r.h_cd);
      if (code && isFinite(h)){
        REDIST_DATA["2024"].hispanic[code] = h;
        n++;
      }
    }
    console.log(`Hispanic 2024 share: ${n} districts loaded`);
  } catch(e){
    console.warn("cd_hispanic_share_2024.csv not loaded:", e);
  }
}

/* FL Hispanic share — applied to BOTH eras since FL data is the same in both
   until a separate "before" baseline exists. */
async function redistLoadHispanicFL(){
  try {
    const text = await fetch("cd_hispanic_share_fl.csv", {cache:"no-store"}).then(r=>{
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    });
    const rows = d3.csvParse(text);
    let n = 0;
    for (const r of rows){
      const code = String(r.code||"").trim().toUpperCase();
      const h = parseFloat(r.h_cd);
      if (code && isFinite(h)){
        REDIST_DATA["2024"].hispanic[code] = h;
        REDIST_DATA["2026"].hispanic[code] = h;
        n++;
      }
    }
    console.log(`Hispanic FL share: ${n} districts loaded into both eras`);
  } catch(e){
    console.warn("cd_hispanic_share_fl.csv not loaded:", e);
  }
}

/* FL ratios loaded into both eras' ratio tables (same data, no "before" yet). */
async function redistLoadRatiosFL(){
  try {
    const n24 = await redistLoadRatios("ratios_fl.csv", REDIST_DATA["2024"].ratios);
    // Same file, second pass into 2026
    const text = await fetch("ratios_fl.csv", {cache:"no-store"}).then(r=>r.text());
    const rows = d3.csvParse(text);
    let n26 = 0;
    for (const r of rows){
      const st = String(r.state||"").trim().toUpperCase();
      const cdI = parseInt(r.cd, 10);
      const rd = parseFloat(r.ratio_d);
      const rr = parseFloat(r.ratio_r);
      if (!st || !isFinite(cdI) || !isFinite(rd) || !isFinite(rr)) continue;
      const code = `${st}-${String(cdI).padStart(2,"0")}`;
      REDIST_DATA["2026"].ratios[code] = { D: rd, R: rr, state: st, cd: cdI, code };
      n26++;
    }
    console.log(`FL ratios: ${n24} → 2024, ${n26} → 2026 (same data both eras)`);
  } catch(e){
    console.warn("ratios_fl.csv not loaded:", e);
  }
}

async function redistLoadFLGeoJSON(){
  try {
    REDIST_FL_GEOJSON = await fetch("fl_districts.geojson", {cache:"no-store"}).then(r=>{
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    console.log(`FL geojson: ${REDIST_FL_GEOJSON.features.length} features`);
  } catch(e){
    console.warn("fl_districts.geojson not loaded:", e);
  }
}

async function redistLoadSVGs(){
  const [a, b] = await Promise.all([
    fetch("2024h_filtered.svg", {cache:"no-store"}).then(r=>r.text()),
    fetch("2026h_filtered.svg", {cache:"no-store"}).then(r=>r.text()),
  ]);
  REDIST_SVG_TEXT["2024"] = a;
  REDIST_SVG_TEXT["2026"] = b;
}

async function redistLoadAll(){
  if (REDIST_LOAD_PROMISE) return REDIST_LOAD_PROMISE;
  REDIST_LOAD_PROMISE = (async () => {
    const n24 = await redistLoadRatios("ratios_2024cd.csv", REDIST_DATA["2024"].ratios);
    const n26 = await redistLoadRatios("ratios_2026cd.csv", REDIST_DATA["2026"].ratios);
    await redistLoadHispanic2024();
    await redistLoadRatiosFL();
    await redistLoadHispanicFL();
    await redistLoadFLGeoJSON();
    await redistLoadSVGs();
    const tot24 = Object.keys(REDIST_DATA["2024"].ratios).length;
    const tot26 = Object.keys(REDIST_DATA["2026"].ratios).length;
    console.log(`Redistricting data: ${n24}+FL → ${tot24} (2024), ${n26}+FL → ${tot26} (2026)`);
    REDIST_LOADED = true;
  })();
  return REDIST_LOAD_PROMISE;
}

/* ---------- Hispanic lookup with global fallback ---------- */
function redistGetHispanic(era, code){
  // Local override (FL in both eras, plus the full 2024 cohort)
  const local = REDIST_DATA[era].hispanic[code];
  if (local !== undefined) return local;
  // For 2026, fall back to the global HISPANIC_SHARE that forecast.js loads
  if (era === "2026" && typeof HISPANIC_SHARE !== "undefined" && HISPANIC_SHARE){
    return HISPANIC_SHARE[code] || 0;
  }
  return 0;
}

/* ---------- Model ---------- */
function redistHouseModelForGB(era, code, gbPair){
  const ratio = REDIST_DATA[era].ratios[code];
  if (!ratio) return null;

  const h_cd = redistGetHispanic(era, code);

  let adjD = ratio.D, adjR = ratio.R;
  if (h_cd > 0 && typeof HISPANIC_GB !== "undefined" && HISPANIC_GB
      && typeof HISPANIC_BASELINE !== "undefined"){
    const swingD = (HISPANIC_GB.D - HISPANIC_BASELINE.D) / HISPANIC_BASELINE.D;
    const swingR = (HISPANIC_GB.R - HISPANIC_BASELINE.R) / HISPANIC_BASELINE.R;
    adjD = ratio.D * (1 + h_cd * 0.75 * swingD);
    adjR = ratio.R * (1 + h_cd * 0.75 * swingR);
  }

  const cdD = adjD * gbPair.D;
  const cdR = adjR * gbPair.R;
  const s = cdD + cdR;
  const pair = (s > 0) ? {D: 100*cdD/s, R: 100*cdR/s} : {D:50,R:50};
  return { pair, ratio, h_cd, margin: marginRD(pair) };
}

function redistHouseModel(era, code){
  const gb = (typeof DATA !== "undefined" && DATA?.house?.gb) ? DATA.house.gb : {D:50,R:50};
  const m = redistHouseModelForGB(era, code, gb);
  if (!m) return null;
  m.winProb = winProbFromMargin(m.margin);
  return m;
}

function redistAllCodes(era){
  return Object.keys(REDIST_DATA[era].ratios).sort();
}
function redistCodesForState(era, st){
  return redistAllCodes(era).filter(c => c.startsWith(`${st}-`));
}

/* Seat tally for an era (D wins + R wins over all loaded districts) */
function redistSeatTally(era){
  let D=0, R=0;
  for (const code of redistAllCodes(era)){
    const m = redistHouseModel(era, code);
    if (!m) continue;
    if (m.margin < 0) D++; else R++;
  }
  return { D, R, total: D+R };
}

/* Poisson-binomial over an array of win probabilities pD */
function redistPoissonBinomial(ps){
  const n = ps.length;
  const dist = new Array(n+1).fill(0);
  dist[0] = 1;
  for (const pRaw of ps){
    const p = clamp(pRaw, 0, 1);
    for (let k = n; k >= 1; k--){
      dist[k] = dist[k] * (1 - p) + dist[k-1] * p;
    }
    dist[0] = dist[0] * (1 - p);
  }
  return dist;
}

/* Full distribution of D seats for an era, at the current GB */
function redistSeatDistribution(era){
  const ps = [];
  for (const code of redistAllCodes(era)){
    const m = redistHouseModel(era, code);
    if (!m) continue;
    ps.push(m.winProb.pD);
  }
  return redistPoissonBinomial(ps);
}

/* ---------- UI helpers ---------- */
function redistDateStr(d){ return ds(d instanceof Date ? d : new Date(d)); }
function redistParseDateStr(s){ return parseDate(s); }

function redistIsPassedBy(state, dateISO){
  const eff = REDIST_EFFECTIVE[state];
  if (!eff) return false; // null effective date → state never "flips" in the timeline
  const d0 = redistParseDateStr(eff);
  const dt = (typeof dateISO === "string") ? redistParseDateStr(dateISO) : dateISO;
  if (!d0 || !dt) return false;
  return dt.getTime() >= d0.getTime();
}

/* ---------- Redistricting war time-series ----------
   For each day t in the GB series:
     - "baseline" map: passed states use 2024 ratios
     - "current"  map: passed states use 2026 ratios
     - States with no effective date (e.g. FL until set) are excluded.
*/
function redistComputeGainSeries(){
  const series = (typeof GB_SRC !== "undefined" && GB_SRC?.series) ? GB_SRC.series : [];
  if (!series.length) return [];

  const out = [];
  for (const pt of series){
    const gbNat = normalizePair(+pt.dem, +pt.rep);
    const dateISO = pt.date;

    const ps2024Passed = [];
    const ps2026Passed = [];

    for (const st of REDIST_STATES){
      if (!redistIsPassedBy(st, dateISO)) continue;
      for (const code of redistCodesForState("2024", st)){
        const m = redistHouseModelForGB("2024", code, gbNat);
        if (m) ps2024Passed.push(winProbFromMargin(m.margin).pD);
      }
      for (const code of redistCodesForState("2026", st)){
        const m = redistHouseModelForGB("2026", code, gbNat);
        if (m) ps2026Passed.push(winProbFromMargin(m.margin).pD);
      }
    }

    let expGainR = 0;
    if (ps2024Passed.length && ps2026Passed.length){
      const E_R_2024 = ps2024Passed.reduce((a,p)=>a + (1 - p), 0);
      const E_R_2026 = ps2026Passed.reduce((a,p)=>a + (1 - p), 0);
      expGainR = E_R_2026 - E_R_2024;
    }

    let pGainR = 0;
    if (ps2024Passed.length && ps2026Passed.length){
      const d24 = redistPoissonBinomial(ps2024Passed);
      const d26 = redistPoissonBinomial(ps2026Passed);
      const N26 = d26.length;
      const cdf26 = new Array(N26+1).fill(0);
      for (let k=0;k<N26;k++) cdf26[k+1] = cdf26[k] + d26[k];
      let p = 0;
      for (let k=0;k<d24.length;k++){
        const idx = Math.min(k, N26);
        p += d24[k] * cdf26[idx];
      }
      pGainR = p;
    }

    out.push({ date: dateISO, expGainR, pGainR });
  }
  return out;
}

/* ---------- Rendering: seat summary + mini histogram ---------- */
function redistRenderSeatsFor(era){
  const ui = REDIST_UI;
  if (!ui) return;
  const col = ui.cols[era];
  if (!col) return;

  const tally = redistSeatTally(era);
  if (col.seatsD) col.seatsD.textContent = String(tally.D);
  if (col.seatsR) col.seatsR.textContent = String(tally.R);

  const dist = redistSeatDistribution(era);
  const total = tally.total;
  const thr = Math.floor(total / 2) + 1;
  const hist = {
    counts: dist.slice(),
    min: 0,
    max: dist.length - 1,
    isProb: true,
    binSize: 1,
    total: 1,
  };
  if (col.simCanvas){
    if (typeof drawSeatSimMini === "function"){
      drawSeatSimMini(col.simCanvas, hist, thr);
    }
    col.simCanvas._simMeta = { hist, threshold: thr, total: 1 };
    if (typeof ensureSimHover === "function") ensureSimHover(col.simCanvas);
  }

  const gb = (typeof DATA !== "undefined" && DATA?.house?.gb) ? DATA.house.gb : {D:50,R:50};
  if (col.pillD) col.pillD.textContent = Number(gb.D).toFixed(1);
  if (col.pillR) col.pillR.textContent = Number(gb.R).toFixed(1);
}

/* ---------- Rendering: Map ---------- */
function redistCodeFromDataName(dn){
  const m = String(dn||"").match(/^([A-Za-z]{2})-(\d+)$/);
  if (!m) return null;
  return `${m[1].toUpperCase()}-${String(parseInt(m[2],10)).padStart(2,"0")}`;
}

/* Parse "minX minY width height" viewBox string into [x,y,w,h] tuple.
   Falls back to [0,0,1900,1180] for missing/malformed input. */
function redistParseViewBox(vbStr){
  if (!vbStr) return [0, 0, 1900, 1180];
  const parts = String(vbStr).trim().split(/[\s,]+/).map(parseFloat);
  if (parts.length !== 4 || parts.some(n => !isFinite(n)) || parts[2] <= 0 || parts[3] <= 0){
    return [0, 0, 1900, 1180];
  }
  return parts;
}

/* Inject FL geojson features as <path> children of gRoot, matching the
   data-name + data-did + class structure of the imported SVG paths so the
   rest of the system (tooltip, recolor, hover) treats them identically.

   Uses d3.geoIdentity().reflectY(true).fitExtent — NOT d3.geoAlbersUsa —
   to avoid the spherical-projection winding-order bug that produces a
   giant filled square when geojson rings are wound the "wrong" way.

   Placement is anchored to the source SVG's parsed viewBox tuple
   (not getBBox), so FL lands deterministically even while the page is
   still display:none during init. */
function redistInjectFLDistricts(era, gRoot, sourceVB){
  if (!REDIST_FL_GEOJSON || !REDIST_FL_GEOJSON.features) return 0;
  if (typeof d3 === "undefined" || !d3.geoIdentity) return 0;

  const [vbX, vbY, vbW, vbH] = sourceVB;
  const flX0 = vbX + vbW * FL_PLACEMENT.xFrac;
  const flY0 = vbY + vbH * FL_PLACEMENT.yFrac;
  const flX1 = flX0 + vbW * FL_PLACEMENT.wFrac;
  const flY1 = flY0 + vbH * FL_PLACEMENT.hFrac;

  const projection = d3.geoIdentity()
    .reflectY(true)
    .fitExtent([[flX0, flY0], [flX1, flY1]], REDIST_FL_GEOJSON);
  const path = d3.geoPath(projection);

  const flG = gRoot.append("g").attr("id", `fl-${era}`).attr("class", "flDistricts");
  let n = 0;
  for (const feat of REDIST_FL_GEOJSON.features){
    const name = feat.properties?.NAME ?? feat.properties?.id;
    const cdI = parseInt(name, 10);
    if (!isFinite(cdI)) continue;
    const code = `FL-${String(cdI).padStart(2,"0")}`;
    if (!REDIST_DATA[era].ratios[code]) continue;
    const dAttr = path(feat);
    if (!dAttr) continue;
    flG.append("path")
      .attr("d", dAttr)
      .attr("data-name", `FL-${cdI}`)
      .attr("data-did", code)
      .attr("class", "district active");
    n++;
  }
  return n;
}

function redistInitMap(era){
  const ui = REDIST_UI;
  if (!ui) return;
  const col = ui.cols[era];
  if (!col?.svgEl) return;

  const svgHost = d3.select(col.svgEl);
  svgHost.selectAll("*").remove();

  // Parse source viewBox up front — we need it both as an initial display hint
  // AND as the coordinate frame for FL placement. Falls back to a sane default
  // if the source SVG is missing or malformed.
  let srcSvg = null;
  if (REDIST_SVG_TEXT[era]){
    const doc = new DOMParser().parseFromString(REDIST_SVG_TEXT[era], "image/svg+xml");
    srcSvg = doc.querySelector("svg");
    if (!srcSvg){
      console.warn(`${era} source SVG: parse failed or no <svg> element — proceeding with FL only`);
    }
  } else {
    console.warn(`${era} source SVG not loaded — proceeding with FL only`);
  }
  const vbStr = (srcSvg && srcSvg.getAttribute("viewBox")) || "0 0 1900 1180";
  const sourceVB = redistParseViewBox(vbStr);
  svgHost.attr("viewBox", vbStr);

  // Zoom wrapper
  const gZoom = svgHost.append("g").attr("class","redistZoomG");
  const gRoot = gZoom.append("g");

  // Import state content. Try <g id="..."> wrappers first (the common case);
  // fall back to standalone <path data-name="..."> at root if the SVG doesn't
  // use group wrappers.
  let importedNodes = 0;
  if (srcSvg){
    const groups = srcSvg.querySelectorAll("g[id]");
    if (groups.length){
      groups.forEach(g => {
        gRoot.node().appendChild(document.importNode(g, true));
        importedNodes++;
      });
    } else {
      const paths = srcSvg.querySelectorAll("path[data-name]");
      paths.forEach(p => {
        gRoot.node().appendChild(document.importNode(p, true));
        importedNodes++;
      });
    }
  }
  console.log(`${era} source SVG: imported ${importedNodes} top-level nodes`);

  // Tag SVG-imported district paths
  let taggedCount = 0;
  gRoot.selectAll("path").each(function(){
    const dn = this.getAttribute("data-name") || "";
    const code = redistCodeFromDataName(dn);
    if (!code) return;
    if (!REDIST_DATA[era].ratios[code]) return;
    this.setAttribute("data-did", code);
    this.classList.add("district","active");
    try{ this.style.fill = ""; }catch(e){}
    taggedCount++;
  });
  console.log(`${era} source SVG: tagged ${taggedCount} district paths`);

  // Layer in FL geojson districts (using parsed source viewBox, not getBBox)
  const flN = redistInjectFLDistricts(era, gRoot, sourceVB);
  if (flN) console.log(`FL districts injected into ${era} map: ${flN}`);

  // Hover tooltips
  gRoot.selectAll("path.district.active")
    .on("mouseenter", (event)=>{
      const did = event.currentTarget.getAttribute("data-did");
      if (!did) return;
      d3.select(event.currentTarget).classed("hovered", true);
      redistShowTooltip(event, era, did);
    })
    .on("mousemove", (event)=>{
      if (typeof positionTooltip === "function") positionTooltip(event);
    })
    .on("mouseleave", (event)=>{
      d3.select(event.currentTarget).classed("hovered", false);
      if (typeof hideTooltip === "function") hideTooltip();
    });

  // d3.zoom on the host SVG
  const zoom = d3.zoom()
    .scaleExtent([1, 12])
    .on("zoom", (event) => gZoom.attr("transform", event.transform));
  svgHost.call(zoom);
  svgHost.on("dblclick.zoom", null);
  svgHost.on("dblclick", () => {
    svgHost.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
  });

  REDIST_MAP[era] = { svg: svgHost, gRoot, gZoom, zoom };
}

/* ---------- Visual fix: per-era viewBox auto-fit ----------
   Each era's SVG fits to its OWN content bbox. The previous union-across-eras
   approach broke when the two source SVGs had different coordinate spaces
   (the union viewBox was much wider than either era's content, leaving
   one or both maps with most of the content offscreen or tiny). Side-by-side
   comparability is carried by the seat counts above the maps; pixel-aligning
   the maps was a nice-to-have that was actively breaking things. */
function redistFitViewBoxes(){
  for (const era of ["2024","2026"]){
    const m = REDIST_MAP[era];
    if (!m || !m.gRoot) continue;
    let bb;
    try {
      bb = m.gRoot.node().getBBox();
    } catch(e){ bb = null; }
    if (!bb || bb.width <= 0 || bb.height <= 0) continue;

    const padX = bb.width * 0.025;
    const padY = bb.height * 0.025;
    const vb = `${(bb.x - padX).toFixed(1)} ${(bb.y - padY).toFixed(1)} ${(bb.width + 2*padX).toFixed(1)} ${(bb.height + 2*padY).toFixed(1)}`;
    m.svg.attr("viewBox", vb);
    if (m.zoom) m.svg.call(m.zoom.transform, d3.zoomIdentity);
  }
}

function redistRecolorMap(era){
  const m = REDIST_MAP[era];
  if (!m?.gRoot) return;
  m.gRoot.selectAll("path.district").each(function(){
    const did = this.getAttribute("data-did");
    if (!did) return;
    const model = redistHouseModel(era, did);
    if (!model){
      this.style.fill = getComputedStyle(document.documentElement).getPropertyValue("--neutral-bg").trim() || "#e5e7eb";
      return;
    }
    this.style.fill = interpColor(model.margin);
  });
}

/* ---------- Tooltip with era label ---------- */
function redistShowTooltip(evt, era, did){
  if (typeof tip === "undefined" || !tip) return;

  const model = redistHouseModel(era, did);
  if (!model) return;

  const mFinal = model.margin;
  const pD = Math.round(model.winProb.pD * 100);
  const pR = 100 - pD;

  const [st, cdStr] = did.split("-");
  const cdI = parseInt(cdStr, 10);
  const stateName = (typeof USPS_TO_NAME !== "undefined" && USPS_TO_NAME[st]) ? USPS_TO_NAME[st] : st;
  const title = did;
  const subtitle = (cdI === 0) ? `${stateName} At-Large` : `${stateName} District ${cdI}`;

  const cls = classifyMargin(mFinal);
  const clsStyle = classifyColorAttr(cls);
  const bgParts = clsStyle.split(";");
  const clsBg = (bgParts[0]||"").replace("bg:","");
  const clsCol = (bgParts[1]||"").replace("color:","");
  const ns = normalizePair(model.pair.D, model.pair.R);
  const isDem = mFinal <= 0;

  const gb = (typeof DATA !== "undefined" && DATA?.house?.gb) ? DATA.house.gb : {D:50,R:50};
  const gbPair = normalizePair(gb.D * model.ratio.D, gb.R * model.ratio.R);
  const gbM = marginRD(gbPair);

  let rows = "";
  rows += miniMeterHTML("Generic ballot", gbM);
  if (model.h_cd > 0 && typeof HISPANIC_GB !== "undefined" && HISPANIC_GB){
    const hispPct = (model.h_cd * 100).toFixed(0);
    const hispMargin = HISPANIC_GB.R - HISPANIC_GB.D;
    rows += miniMeterHTML(`Hispanic (${hispPct}%)`, hispMargin);
  }
  rows += miniMeterHTML("Final", mFinal, null, true);

  const eraLabel = (era === "2024") ? "Before (2024 map)" : "After (2026 map)";

  tip.innerHTML = `
    <div class="panelAccent ${isDem?'dem':'rep'}"></div>
    <div class="panelHeader">
      <div class="panelNameRow">
        <span class="panelName">${title} <span class="panelUsps">${subtitle}</span></span>
        <span class="panelClassify" style="background:${clsBg};color:${clsCol};box-shadow:0 1px 3px ${clsBg}44">${cls}</span>
      </div>
      <div style="margin-top:4px;font-size:9px;font-weight:700;color:var(--muted);letter-spacing:0.06em;text-transform:uppercase;">${eraLabel}</div>
      <div class="panelShareBar">
        <div class="panelShareLabels">
          <span class="panelShareD"><small>DEM</small> ${ns.D.toFixed(1)}</span>
          <span class="panelShareR">${ns.R.toFixed(1)} <small>GOP</small></span>
        </div>
        <div class="panelShareTrack">
          <div class="panelShareFillD" style="width:${ns.D}%"></div>
          <div class="panelShareGap"></div>
          <div class="panelShareFillR"></div>
        </div>
      </div>
    </div>
    <div class="panelHero">
      <div class="panelMarginBlock">
        <div class="panelMarginNum ${isDem?'dem':'rep'}">${fmtLead(mFinal)}</div>
        <div class="panelMarginLabel">Projected margin</div>
      </div>
      <div class="panelArc">${winArcSVG(pD, 88)}</div>
    </div>
    <div class="panelFactors">${rows}</div>
  `;
  tip.style.transform = "translate(0,0)";
  if (typeof positionTooltip === "function") positionTooltip(evt);
}

/* ---------- "Who is winning the redistricting war?" chart ---------- */
let REDIST_WAR_CHART_MODE = "prob"; // "prob" or "seats"
let REDIST_WAR_DATA = null;

function redistRenderWarChart(){
  const ui = REDIST_UI;
  const svgEl = ui?.warSvg;
  if (!svgEl) return;

  if (!REDIST_WAR_DATA) REDIST_WAR_DATA = redistComputeGainSeries();
  const data = REDIST_WAR_DATA;

  const rect = svgEl.getBoundingClientRect();
  const width = Math.max(400, Math.floor(rect.width || 800));
  const height = Math.max(140, Math.floor(rect.height || 220));

  const svg = d3.select(svgEl);
  svg.selectAll("*").remove();
  svg.attr("viewBox", `0 0 ${width} ${height}`);

  const m = {l:44, r:14, t:12, b:26};
  const iw = width - m.l - m.r;
  const ih = height - m.t - m.b;

  const parsed = (data||[]).map(d=>({
    date: parseDate(d.date),
    expGainR: +d.expGainR,
    pGainR: +d.pGainR,
  })).filter(d=>d.date && isFinite(d.expGainR));

  if (!parsed.length){
    const statusEl = ui?.warStatus;
    if (statusEl) statusEl.textContent = "No data.";
    return;
  }

  // Sync chart mode from active tab
  const root = document.getElementById("redistrictingPage");
  const activeTab = root?.querySelector("[data-redist-chart-tab].active");
  const mode = activeTab?.dataset?.redistChartTab || REDIST_WAR_CHART_MODE;
  REDIST_WAR_CHART_MODE = mode;

  const x = d3.scaleTime()
    .domain(d3.extent(parsed, d=>d.date))
    .range([m.l, m.l+iw]);

  const xAxis = d3.axisBottom(x)
    .ticks(Math.min(8, Math.floor(iw/90)))
    .tickFormat(d3.timeFormat("%b %Y"));

  let y, yAxis, yVal;
  if (mode === "seats"){
    const vals = parsed.map(d=>d.expGainR);
    const ymin = Math.min(0, d3.min(vals));
    const ymax = Math.max(0, d3.max(vals));
    const pad = Math.max(1, (ymax - ymin) * 0.12);
    y = d3.scaleLinear().domain([ymin - pad, ymax + pad]).range([m.t+ih, m.t]).nice();
    yAxis = d3.axisLeft(y).ticks(5).tickFormat(d => (d>0 ? `+${d.toFixed(0)}` : d.toFixed(0)));
    yVal = d => d.expGainR;
  } else {
    y = d3.scaleLinear().domain([0, 1]).range([m.t+ih, m.t]);
    yAxis = d3.axisLeft(y).ticks(5).tickFormat(d=>`${Math.round(d*100)}%`);
    yVal = d => d.pGainR;
  }

  svg.append("g").attr("class","oddsAxis").attr("transform",`translate(0,${m.t+ih})`).call(xAxis);
  svg.append("g").attr("class","oddsAxis").attr("transform",`translate(${m.l},0)`).call(yAxis);

  y.ticks(5).forEach(t=>{
    svg.append("line").attr("x1",m.l).attr("x2",m.l+iw)
      .attr("y1",y(t)).attr("y2",y(t))
      .attr("stroke","var(--line)").attr("stroke-width",1)
      .attr("stroke-dasharray","3 3").attr("opacity",0.5);
  });

  if (mode === "seats"){
    const y0 = y(0);
    if (y0 >= m.t && y0 <= m.t+ih){
      svg.append("line").attr("class","seatMajLine")
        .attr("x1",m.l).attr("x2",m.l+iw).attr("y1",y0).attr("y2",y0);
      svg.append("text").attr("class","seatMajLabel")
        .attr("x",m.l+iw-2).attr("y",y0-4).attr("text-anchor","end").text("Tied");
    }
  } else {
    const y50 = y(0.5);
    svg.append("line").attr("class","seatMajLine")
      .attr("x1",m.l).attr("x2",m.l+iw).attr("y1",y50).attr("y2",y50);
  }

  // Vertical markers for each state's effective date (skips states with null effective date)
  for (const st of REDIST_STATES){
    const eff = REDIST_EFFECTIVE[st];
    if (!eff) continue;
    const ed = parseDate(eff);
    if (!ed) continue;
    if (ed < x.domain()[0] || ed > x.domain()[1]) continue;
    const xp = x(ed);
    svg.append("line")
      .attr("x1",xp).attr("x2",xp)
      .attr("y1",m.t).attr("y2",m.t+ih)
      .attr("stroke","var(--muted-light)")
      .attr("stroke-width",1)
      .attr("stroke-dasharray","3 2")
      .attr("opacity",0.6);
    svg.append("text")
      .attr("x",xp+3).attr("y",m.t+10)
      .attr("font-size","9px")
      .attr("font-weight","700")
      .attr("fill","var(--muted)")
      .attr("font-family","var(--sans)")
      .text(st);
  }

  const line = d3.line().x(d=>x(d.date)).y(d=>y(yVal(d))).curve(d3.curveStepAfter);

  const areaGen = d3.area()
    .x(d=>x(d.date))
    .y0((mode === "seats") ? y(0) : y(0.5))
    .y1(d=>y(yVal(d)))
    .curve(d3.curveStepAfter);

  const defs = svg.append("defs");
  const clipIdPos = `redistClipPos_${mode}`;
  const clipIdNeg = `redistClipNeg_${mode}`;
  defs.append("clipPath").attr("id", clipIdPos)
    .append("rect").attr("x",m.l).attr("y",m.t).attr("width",iw)
    .attr("height", (mode==="seats") ? (y(0) - m.t) : (y(0.5) - m.t));
  defs.append("clipPath").attr("id", clipIdNeg)
    .append("rect").attr("x",m.l).attr("y",(mode==="seats") ? y(0) : y(0.5))
    .attr("width",iw)
    .attr("height", (mode==="seats") ? (m.t+ih - y(0)) : (m.t+ih - y(0.5)));

  svg.append("path").datum(parsed).attr("d",areaGen)
    .attr("fill","var(--red)").attr("opacity",0.14)
    .attr("clip-path",`url(#${clipIdPos})`);
  svg.append("path").datum(parsed).attr("d",areaGen)
    .attr("fill","var(--blue)").attr("opacity",0.14)
    .attr("clip-path",`url(#${clipIdNeg})`);

  svg.append("path").datum(parsed)
    .attr("d", line)
    .attr("fill","none")
    .attr("stroke","var(--ink)")
    .attr("stroke-width",1.8);

  const last = parsed[parsed.length-1];
  const endCol = (yVal(last) > ((mode==="seats")?0:0.5)) ? "var(--red)" : "var(--blue)";
  svg.append("circle")
    .attr("cx", x(last.date)).attr("cy", y(yVal(last)))
    .attr("r", 4)
    .attr("fill", endCol).attr("stroke","var(--ink)").attr("stroke-width",1);

  const dot = svg.append("circle").attr("r",4).style("opacity",0)
    .attr("stroke","var(--ink)").attr("stroke-width",1).attr("fill","var(--ink)");
  const bisect = d3.bisector(d=>d.date).left;
  svg.append("rect")
    .attr("x", m.l).attr("y", m.t)
    .attr("width", iw).attr("height", ih)
    .style("fill","transparent").style("cursor","crosshair")
    .on("mousemove", (ev)=>{
      const [mx] = d3.pointer(ev);
      const xd = x.invert(mx);
      const i = clamp(bisect(parsed, xd), 1, parsed.length-1);
      const a = parsed[i-1], b = parsed[i];
      const d = (xd - a.date) > (b.date - xd) ? b : a;
      dot.attr("cx", x(d.date)).attr("cy", y(yVal(d))).style("opacity", 1)
         .attr("fill", yVal(d) > ((mode==="seats")?0:0.5) ? "var(--red)" : "var(--blue)");
      const gainSign = d.expGainR > 0 ? "+" : "";
      const gainTxt = `${gainSign}${d.expGainR.toFixed(2)} R seats`;
      const pTxt = `${Math.round(d.pGainR*100)}%`;
      if (typeof showSimTip === "function"){
        showSimTip(ev,
          `<div class="stDate">${ds(d.date)}</div>`+
          `<div class="stRow"><span class="stDot" style="background:var(--red)"></span><span class="stLbl">E[R gain]</span><span class="stVal">${gainTxt}</span></div>`+
          `<div class="stRow"><span class="stDot" style="background:var(--ink)"></span><span class="stLbl">P(R gain ≥1)</span><span class="stVal">${pTxt}</span></div>`
        );
      }
    })
    .on("mouseleave", ()=>{
      dot.style("opacity", 0);
      if (typeof hideSimTip === "function") hideSimTip();
    });

  const statusEl = ui?.warStatus;
  if (statusEl){
    const finalN = last.expGainR;
    const finalP = last.pGainR;
    const winner = (finalN > 0.5) ? "R" : (finalN < -0.5) ? "D" : "≈ Tied";
    const sign = finalN > 0 ? "+" : "";
    statusEl.textContent = `Current: ${sign}${finalN.toFixed(2)} expected R seat gain · P(R net gain ≥ 1) = ${Math.round(finalP*100)}% · winning: ${winner}`;
  }
}

/* ---------- Bottom-bar legend (state list + total district count) ---------- */
function redistUpdateMapLegend(){
  const root = document.getElementById("redistrictingPage");
  if (!root) return;
  const total24 = Object.keys(REDIST_DATA["2024"].ratios).length;
  const total26 = Object.keys(REDIST_DATA["2026"].ratios).length;
  const states = REDIST_STATES.slice().sort().join(" · ");
  // Use the 2024 column's bar (only one currently shows the state list);
  // the 2026 bar keeps the "scroll/drag/zoom" hint.
  const beforeBar = root.querySelector('.modeCol[data-redist-era="2024"] .mapCtrlLabel');
  if (beforeBar){
    beforeBar.textContent = `${states} · (${total24} districts)`;
  }
}

/* ---------- Full render ---------- */
function redistRenderAll(){
  redistRenderSeatsFor("2024");
  redistRenderSeatsFor("2026");
  redistRecolorMap("2024");
  redistRecolorMap("2026");
  REDIST_WAR_DATA = null;
  redistRenderWarChart();
}

/* ---------- UI wiring ---------- */
function redistInitUI(){
  const root = document.getElementById("redistrictingPage");
  if (!root) return null;
  const colFor = (era) => {
    const col = root.querySelector(`.modeCol[data-redist-era='${era}']`);
    if (!col) return null;
    return {
      root: col,
      pillD: col.querySelector("[data-pill-d]"),
      pillR: col.querySelector("[data-pill-r]"),
      seatsD: col.querySelector("[data-seats-d]"),
      seatsR: col.querySelector("[data-seats-r]"),
      simCanvas: col.querySelector("[data-sim-canvas]"),
      svgEl: col.querySelector("svg.mapSvg"),
    };
  };
  return {
    root,
    cols: { "2024": colFor("2024"), "2026": colFor("2026") },
    warSvg: root.querySelector("[data-redist-war-svg]"),
    warStatus: root.querySelector("[data-redist-war-status]"),
  };
}

function redistSetupChartTabs(){
  const root = document.getElementById("redistrictingPage");
  if (!root) return;
  root.querySelectorAll("[data-redist-chart-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      root.querySelectorAll("[data-redist-chart-tab]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      REDIST_WAR_CHART_MODE = btn.dataset.redistChartTab;
      redistRenderWarChart();
    });
  });
}

async function initRedistrictingPage(){
  if (!REDIST_LOADED) await redistLoadAll();
  if (REDIST_INITED) {
    redistRenderAll();
    // Re-fit after re-render in case the layout changed
    requestAnimationFrame(redistFitViewBoxes);
    return;
  }
  REDIST_UI = redistInitUI();
  if (!REDIST_UI) return;
  redistInitMap("2024");
  redistInitMap("2026");
  redistSetupChartTabs();
  redistUpdateMapLegend();
  redistRenderAll();

  // Auto-fit after paint so getBBox returns real dimensions. Two rAFs because
  // the redistricting page has just been display-toggled; one frame for the
  // browser to apply display, another for the SVG to lay out.
  requestAnimationFrame(()=>{
    requestAnimationFrame(redistFitViewBoxes);
  });

  REDIST_INITED = true;
}
window.initRedistrictingPage = initRedistrictingPage;

/* ---------- Tab switching ---------- */
(function(){
  const nav = document.querySelector('.pageTabs');
  if (!nav) return;
  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('.pageTab');
    if (!btn) return;
    const page = btn.getAttribute('data-page');
    const pg = document.getElementById('redistrictingPage');
    if (!pg) return;
    if (page === 'redistricting'){
      pg.style.display = '';
      document.querySelectorAll('.pageTab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      initRedistrictingPage();
    } else {
      pg.style.display = 'none';
    }
  });
})();

window.refreshRedistrictingForForecast = function(){
  if (!REDIST_INITED) return;
  try { redistRenderAll(); } catch(e){ console.warn(e); }
};

(function(){
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.fcToggleSync [data-fc]');
    if (!btn) return;
    setTimeout(() => { try { window.refreshRedistrictingForForecast(); } catch(e){} }, 0);
  });
})();

window.addEventListener("resize", ()=>{
  if (!REDIST_INITED) return;
  try { redistRenderWarChart(); } catch(e){}
  try {
    redistRenderSeatsFor("2024");
    redistRenderSeatsFor("2026");
  } catch(e){}
  // Re-fit on resize so the map keeps filling its container
  requestAnimationFrame(redistFitViewBoxes);
}, {passive:true});
