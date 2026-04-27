/* ================================================================
   fl_redistricting.js
   Drives the Florida Redistricting page (#flRedistrictingPage).

   The page has a static HTML scaffold with four cards in a grid:
     [data-flr-card="oldForecast"]  Old map + Forecast (national GB)
     [data-flr-card="newForecast"]  New map + Forecast (national GB)
     [data-flr-card="oldSwing"]     Old map + Swingometer (own sliders)
     [data-flr-card="newSwing"]     New map + Swingometer (own sliders)

   Model (mirrors the existing district-level forecast):
     1. Per-district ratio: ratio_d = district_D / national_2024_D, same for R.
     2. Hispanic adjustment: scales ratio in proportion to how the Hispanic GB
        differs from its baseline, weighted by the district's Hispanic share.
        adj = ratio * (1 + h_cd * 0.75 * (gb - baseline)/baseline)
     3. Project: cd_D = adj_D * gb.D, cd_R = adj_R * gb.R, normalize.

   Forecast cards read DATA.house.gb + HISPANIC_GB. Swingometer cards have
   independent sliders.

   Files loaded:
     fl_ratios_old.csv    fl_ratios_new.csv      cd, ratio_d, ratio_r
     fl_hispanic_old.csv  fl_hispanic_new.csv    cd, h_cd
     fl_districts_old.geojson  fl_districts_new.geojson  28 features each
   ================================================================ */
console.log("fl_redistricting.js loaded");

const FL_BENCHMARK = { D: 48.32, R: 49.81 }; // 2024 presidential popular vote
const FL_HISPANIC_WEIGHT = 0.75;
const FL_HISPANIC_BASELINE_FALLBACK = { D: 52, R: 46 };

const FL_DATA = {
  old: { ratios: {}, hispanic: {}, geojson: null },
  new: { ratios: {}, hispanic: {}, geojson: null },
};
const FL_ERAS = ["old", "new"];

let FL_LOADED = false;
let FL_LOAD_PROMISE = null;
let FL_INITED = false;
let FL_RESIZE_BOUND = false;

/* Per-card runtime state */
const FL_CARDS = {
  oldForecast: { era: "old", mode: "forecast" },
  newForecast: { era: "new", mode: "forecast" },
  oldSwing:    { era: "old", mode: "swing", gbD: 48.3, gbR: 49.8, hispD: 52, hispR: 46 },
  newSwing:    { era: "new", mode: "swing", gbD: 48.3, gbR: 49.8, hispD: 52, hispR: 46 },
};

/* ---------- Data loading ---------- */
async function flLoadCsv(path){
  const text = await fetch(path, {cache:"no-store"}).then(r=>{
    if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
    return r.text();
  });
  return d3.csvParse(text);
}

async function flLoadEra(era){
  const ratiosRows = await flLoadCsv(`fl_ratios_${era}.csv`);
  const hispRows   = await flLoadCsv(`fl_hispanic_${era}.csv`);
  const geojson    = await fetch(`fl_districts_${era}.geojson`, {cache:"no-store"}).then(r=>{
    if (!r.ok) throw new Error(`fl_districts_${era}.geojson: HTTP ${r.status}`);
    return r.json();
  });

  for (const r of ratiosRows){
    const cd = parseInt(r.cd, 10);
    if (!isFinite(cd)) continue;
    FL_DATA[era].ratios[cd] = {
      D: parseFloat(r.ratio_d),
      R: parseFloat(r.ratio_r),
      cd,
    };
  }
  for (const r of hispRows){
    const cd = parseInt(r.cd, 10);
    if (isFinite(cd)) FL_DATA[era].hispanic[cd] = parseFloat(r.h_cd);
  }
  FL_DATA[era].geojson = geojson;

  console.log(`FL ${era}: ${Object.keys(FL_DATA[era].ratios).length} ratios, ${Object.keys(FL_DATA[era].hispanic).length} hispanic, ${geojson.features.length} features`);
}

async function flLoadAll(){
  if (FL_LOAD_PROMISE) return FL_LOAD_PROMISE;
  FL_LOAD_PROMISE = (async () => {
    await Promise.all(FL_ERAS.map(flLoadEra));
    FL_LOADED = true;
  })();
  return FL_LOAD_PROMISE;
}

/* ---------- Model ---------- */
function flProjectDistrict(era, cd, gb, hispGb){
  const ratio = FL_DATA[era].ratios[cd];
  if (!ratio) return null;
  const h_cd = FL_DATA[era].hispanic[cd] || 0;

  const baseline = (typeof HISPANIC_BASELINE !== "undefined" && HISPANIC_BASELINE)
    ? HISPANIC_BASELINE
    : FL_HISPANIC_BASELINE_FALLBACK;

  let adjD = ratio.D, adjR = ratio.R;
  if (h_cd > 0 && hispGb && baseline){
    const swingD = (hispGb.D - baseline.D) / baseline.D;
    const swingR = (hispGb.R - baseline.R) / baseline.R;
    adjD = ratio.D * (1 + h_cd * FL_HISPANIC_WEIGHT * swingD);
    adjR = ratio.R * (1 + h_cd * FL_HISPANIC_WEIGHT * swingR);
  }

  const cdD = adjD * gb.D;
  const cdR = adjR * gb.R;
  const sum = cdD + cdR;
  const pair = sum > 0 ? { D: 100*cdD/sum, R: 100*cdR/sum } : { D: 50, R: 50 };
  const margin = (typeof marginRD === "function") ? marginRD(pair) : (pair.R - pair.D);
  const winProb = (typeof winProbFromMargin === "function")
    ? winProbFromMargin(margin)
    : { pD: margin < 0 ? 1 : 0, pR: margin < 0 ? 0 : 1 };

  return { ratio, h_cd, pair, margin, winProb, cd };
}

function flProjectAll(era, gb, hispGb){
  const out = [];
  const cds = Object.keys(FL_DATA[era].ratios).map(Number).sort((a,b)=>a-b);
  for (const cd of cds){
    const m = flProjectDistrict(era, cd, gb, hispGb);
    if (m) out.push(m);
  }
  return out;
}

function flSeatTally(projections){
  let D=0, R=0;
  for (const p of projections){ if (p.margin < 0) D++; else R++; }
  return { D, R };
}

function flPoissonBinomial(ps){
  const n = ps.length;
  const dist = new Array(n+1).fill(0);
  dist[0] = 1;
  for (const p of ps){
    const pp = Math.max(0, Math.min(1, p));
    for (let k = n; k >= 1; k--){
      dist[k] = dist[k] * (1 - pp) + dist[k-1] * pp;
    }
    dist[0] = dist[0] * (1 - pp);
  }
  return dist;
}

/* ---------- Card-state input lookup ---------- */
function flGetCardInputs(cardKey){
  const c = FL_CARDS[cardKey];
  if (c.mode === "forecast"){
    const gb = (typeof DATA !== "undefined" && DATA?.house?.gb)
      ? { D: +DATA.house.gb.D, R: +DATA.house.gb.R }
      : { D: 50, R: 50 };
    const hispGb = (typeof HISPANIC_GB !== "undefined" && HISPANIC_GB)
      ? { D: +HISPANIC_GB.D, R: +HISPANIC_GB.R }
      : { D: 52, R: 46 };
    return { gb, hispGb };
  }
  return {
    gb: { D: c.gbD, R: c.gbR },
    hispGb: { D: c.hispD, R: c.hispR },
  };
}

/* ---------- Map rendering ---------- */
function flRenderMap(svgEl, projections, era){
  const geojson = FL_DATA[era].geojson;
  if (!svgEl || !geojson) return;

  const svg = d3.select(svgEl);
  svg.selectAll("*").remove();

  const rect = svgEl.getBoundingClientRect();
  const W = Math.max(120, Math.round(rect.width || 320));
  const H = Math.max(120, Math.round(rect.height || 240));
  svg.attr("viewBox", `0 0 ${W} ${H}`);

  // d3.geoIdentity().reflectY(true).fitSize sidesteps the spherical-projection
  // winding-order bug that AlbersUsa hits on inverted-ring geojsons (the giant
  // filled square issue) and auto-frames the geometry without manual scale.
  const projection = d3.geoIdentity()
    .reflectY(true)
    .fitSize([W - 6, H - 6], geojson);
  const path = d3.geoPath(projection);

  const projByCd = new Map(projections.map(p => [p.cd, p]));

  const g = svg.append("g").attr("transform", "translate(3,3)");

  g.selectAll("path.district")
    .data(geojson.features, d => d.properties.id)
    .enter().append("path")
    .attr("class", "district")
    .attr("d", path)
    .attr("data-cd", d => d.properties.id)
    .attr("fill", d => {
      const p = projByCd.get(d.properties.id);
      if (!p) return "var(--neutral-bg, #e5e7eb)";
      return (typeof interpColor === "function") ? interpColor(p.margin)
                                                  : (p.margin < 0 ? "#3b82f6" : "#ef4444");
    })
    .attr("vector-effect", "non-scaling-stroke")
    .style("cursor", "pointer")
    .on("mouseenter", function(event, d){
      d3.select(this).classed("hovered", true);
      flShowTooltip(event, projByCd.get(d.properties.id), era);
    })
    .on("mousemove", (event)=>{
      if (typeof positionTooltip === "function") positionTooltip(event);
    })
    .on("mouseleave", function(){
      d3.select(this).classed("hovered", false);
      if (typeof hideTooltip === "function") hideTooltip();
    });
}

function flShowTooltip(evt, proj, era){
  if (typeof tip === "undefined" || !tip || !proj) return;
  const isDem = proj.margin <= 0;
  const cls = (typeof classifyMargin === "function") ? classifyMargin(proj.margin) : "";
  const clsStyle = (typeof classifyColorAttr === "function") ? classifyColorAttr(cls) : "bg:#999;color:#fff";
  const bgParts = clsStyle.split(";");
  const clsBg = (bgParts[0]||"").replace("bg:","");
  const clsCol = (bgParts[1]||"").replace("color:","");
  const leadStr = (typeof fmtLead === "function") ? fmtLead(proj.margin)
                                                  : (isDem ? `D+${(-proj.margin).toFixed(1)}` : `R+${proj.margin.toFixed(1)}`);
  const eraLabel = era === "old" ? "Old map (pre-redistricting)" : "New map (post-redistricting)";
  const ns = (typeof normalizePair === "function") ? normalizePair(proj.pair.D, proj.pair.R) : proj.pair;
  const hispLine = proj.h_cd > 0
    ? `<div style="margin-top:2px;font-size:9px;color:var(--muted);">Hispanic share: ${(proj.h_cd*100).toFixed(1)}%</div>`
    : "";

  tip.innerHTML = `
    <div class="panelAccent ${isDem?'dem':'rep'}"></div>
    <div class="panelHeader">
      <div class="panelNameRow">
        <span class="panelName">FL-${String(proj.cd).padStart(2,"0")}</span>
        <span class="panelClassify" style="background:${clsBg};color:${clsCol};box-shadow:0 1px 3px ${clsBg}44">${cls}</span>
      </div>
      <div style="margin-top:4px;font-size:9px;font-weight:700;color:var(--muted);letter-spacing:0.06em;text-transform:uppercase;">${eraLabel}</div>
      ${hispLine}
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
        <div class="panelMarginNum ${isDem?'dem':'rep'}">${leadStr}</div>
        <div class="panelMarginLabel">Projected margin</div>
      </div>
    </div>
  `;
  tip.style.transform = "translate(0,0)";
  if (typeof positionTooltip === "function") positionTooltip(evt);
}

/* ---------- Histogram ---------- */
function flRenderHisto(canvasEl, projections){
  if (!canvasEl) return;
  const ps = projections.map(p => p.winProb.pD);
  const dist = flPoissonBinomial(ps);
  const total = projections.length;
  const thr = Math.floor(total / 2) + 1;
  const hist = {
    counts: dist.slice(),
    min: 0,
    max: dist.length - 1,
    isProb: true,
    binSize: 1,
    total: 1,
  };
  if (typeof drawSeatSimMini === "function"){
    drawSeatSimMini(canvasEl, hist, thr);
  } else {
    flDrawHistoFallback(canvasEl, dist);
  }
  canvasEl._simMeta = { hist, threshold: thr, total: 1 };
  if (typeof ensureSimHover === "function") ensureSimHover(canvasEl);
}

function flDrawHistoFallback(canvas, dist){
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || 280;
  const H = canvas.clientHeight || 38;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const max = Math.max(...dist);
  if (max <= 0) return;
  const barW = W / dist.length;
  const blueColor = getComputedStyle(document.documentElement).getPropertyValue("--blue").trim() || "#2563eb";
  ctx.fillStyle = blueColor;
  for (let i=0;i<dist.length;i++){
    const h = (dist[i] / max) * (H - 4);
    ctx.fillRect(i*barW, H - h, Math.max(1, barW-1), h);
  }
}

/* ---------- Card render ---------- */
function flGetCardEl(cardKey){
  return document.querySelector(`#flRedistrictingPage [data-flr-card="${cardKey}"]`);
}

function flRenderCard(cardKey){
  const cardEl = flGetCardEl(cardKey);
  if (!cardEl) return;
  const c = FL_CARDS[cardKey];
  const { gb, hispGb } = flGetCardInputs(cardKey);

  const projections = flProjectAll(c.era, gb, hispGb);
  const tally = flSeatTally(projections);

  const seatsD = cardEl.querySelector("[data-seats-d]");
  const seatsR = cardEl.querySelector("[data-seats-r]");
  if (seatsD) seatsD.textContent = tally.D;
  if (seatsR) seatsR.textContent = tally.R;

  const pillD = cardEl.querySelector("[data-pill-d]");
  const pillR = cardEl.querySelector("[data-pill-r]");
  if (pillD) pillD.textContent = gb.D.toFixed(1);
  if (pillR) pillR.textContent = gb.R.toFixed(1);

  const histo = cardEl.querySelector("[data-sim-canvas]");
  if (histo) flRenderHisto(histo, projections);

  const mapSvg = cardEl.querySelector("svg.flrMap");
  if (mapSvg) flRenderMap(mapSvg, projections, c.era);
}

function flRenderAll(){
  for (const k of Object.keys(FL_CARDS)) flRenderCard(k);
}

/* ---------- Slider wiring (swing cards only) ---------- */
function flSetSliderUI(input, valSpan, value, fmt){
  if (input) input.value = value;
  if (valSpan) valSpan.textContent = (fmt || (v=>(+v).toFixed(1)))(value);
}

function flWireSwingCard(cardKey){
  const cardEl = flGetCardEl(cardKey);
  if (!cardEl) return;
  const c = FL_CARDS[cardKey];

  const inputs = {
    gbD:    cardEl.querySelector("[data-slider-gb-d]"),
    gbR:    cardEl.querySelector("[data-slider-gb-r]"),
    hispD:  cardEl.querySelector("[data-slider-hisp-d]"),
    hispR:  cardEl.querySelector("[data-slider-hisp-r]"),
  };
  const vals = {
    gbD:    cardEl.querySelector("[data-val-gb-d]"),
    gbR:    cardEl.querySelector("[data-val-gb-r]"),
    hispD:  cardEl.querySelector("[data-val-hisp-d]"),
    hispR:  cardEl.querySelector("[data-val-hisp-r]"),
  };

  flSetSliderUI(inputs.gbD,   vals.gbD,   c.gbD);
  flSetSliderUI(inputs.gbR,   vals.gbR,   c.gbR);
  flSetSliderUI(inputs.hispD, vals.hispD, c.hispD, v=>(+v).toFixed(0));
  flSetSliderUI(inputs.hispR, vals.hispR, c.hispR, v=>(+v).toFixed(0));

  if (inputs.gbD) inputs.gbD.addEventListener("input", ()=>{
    c.gbD = parseFloat(inputs.gbD.value);
    if (vals.gbD) vals.gbD.textContent = c.gbD.toFixed(1);
    flRenderCard(cardKey);
  });
  if (inputs.gbR) inputs.gbR.addEventListener("input", ()=>{
    c.gbR = parseFloat(inputs.gbR.value);
    if (vals.gbR) vals.gbR.textContent = c.gbR.toFixed(1);
    flRenderCard(cardKey);
  });
  if (inputs.hispD) inputs.hispD.addEventListener("input", ()=>{
    c.hispD = parseFloat(inputs.hispD.value);
    if (vals.hispD) vals.hispD.textContent = c.hispD.toFixed(0);
    flRenderCard(cardKey);
  });
  if (inputs.hispR) inputs.hispR.addEventListener("input", ()=>{
    c.hispR = parseFloat(inputs.hispR.value);
    if (vals.hispR) vals.hispR.textContent = c.hispR.toFixed(0);
    flRenderCard(cardKey);
  });
}

/* ---------- Page init ---------- */
async function initFloridaPage(){
  if (!FL_LOADED) await flLoadAll();
  const root = document.getElementById("flRedistrictingPage");
  if (!root){
    console.warn("#flRedistrictingPage not in DOM");
    return;
  }

  if (FL_INITED){
    // Re-render forecast cards in case the global GB changed
    flRenderCard("oldForecast");
    flRenderCard("newForecast");
    return;
  }

  flWireSwingCard("oldSwing");
  flWireSwingCard("newSwing");

  flRenderAll();

  if (!FL_RESIZE_BOUND){
    let resizeRaf = 0;
    window.addEventListener("resize", () => {
      if (!FL_INITED) return;
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(()=>{
        resizeRaf = 0;
        flRenderAll();
      });
    }, { passive: true });
    FL_RESIZE_BOUND = true;
  }

  FL_INITED = true;
}
window.initFloridaPage = initFloridaPage;

window.refreshFloridaForForecast = function(){
  if (!FL_INITED) return;
  try {
    flRenderCard("oldForecast");
    flRenderCard("newForecast");
  } catch(e){ console.warn(e); }
};

/* Forecast/Nowcast toggle inside the FL page or anywhere else */
(function(){
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.fcToggleSync [data-fc]');
    if (!btn) return;
    setTimeout(() => {
      try { window.refreshFloridaForForecast(); } catch(e){}
    }, 0);
  });
})();

/* ---------- Tab switching ---------- */
(function(){
  const nav = document.querySelector('.pageTabs');
  if (!nav) return;
  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('.pageTab');
    if (!btn) return;
    const page = btn.getAttribute('data-page');
    const pg = document.getElementById('flRedistrictingPage');
    if (!pg) return;
    if (page === 'fl-redistricting'){
      pg.style.display = '';
      document.querySelectorAll('.pageTab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      initFloridaPage();
    } else {
      pg.style.display = 'none';
    }
  });
})();
