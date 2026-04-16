/* ============================================================
   state-legs.js — State Legislatures page  (v9, dual-chamber)

   Click district → zoom to state. Left panel shows state seat
   standing (rating buckets) + hovered district info. Chamber
   toggle in the panel header swaps between State House (SLDL)
   and State Senate (SLDU) datasets.

   Senate data requires sldu_with_data.topojson at the site
   root — same flat-properties shape as sldl_national.topojson
   but produced by build_sldu.py (baseline/margin/dem_pct
   already embedded, so no separate lean-CSV fetch).
   ============================================================ */
(function(){
  const PAGE_ID = 'stateLegsPage';

  // --- Chamber config ---------------------------------------
  // Both chambers share the rendering pipeline. Everything that
  // differs (URLs, labels, seat totals, stagger fractions,
  // hispanic adjustment source) lives in one place here.
  //
  // SLDL paths match the existing working setup (separate lean
  // CSV). SLDU uses the self-contained format from build_sldu.py
  // where margin/dem_pct/baseline live on the geometry properties
  // directly — no separate CSV join needed.
  const CHAMBERS = {
    sldl: {
      key: 'sldl',
      label: 'State House',
      sub:   'Lower chambers — district baselines',
      mapLabel: 'State House map',
      topoUrl:     './sldl_national.topojson',
      leanCsvUrl:  './national_district_results.csv',  // separate join
      hispCsvUrl:  './sldl_hispanic_share.csv',
      topoObject:  'districts',                        // prefer this key
    },
    sldu: {
      key: 'sldu',
      label: 'State Senate',
      sub:   'Upper chambers — district baselines',
      mapLabel: 'State Senate map',
      topoUrl:     './sldu_with_data.topojson',
      leanCsvUrl:  null,                               // embedded
      hispCsvUrl:  './sldu_hispanic_share.csv',        // optional
      topoObject:  'data',                             // from build_sldu.py
    },
  };
  let currentChamber = 'sldl';
  const CH = () => CHAMBERS[currentChamber];

  // Per-chamber hispanic-share dict. SLDU adjustment is a no-op
  // until sldu_hispanic_share.csv is produced — same behavior as
  // SLDL was before its CSV existed.
  const HISPANIC_SHARE = { sldl: {}, sldu: {} };
  const SLDL_HISPANIC_SHARE = HISPANIC_SHARE.sldl;  // back-compat alias

  // Per-chamber load state + cached features/index. Switching
  // chambers after both are loaded is O(render).
  const CHAMBER_STATE = {
    sldl: { loaded:false, loading:false, features:null, byState:null },
    sldu: { loaded:false, loading:false, features:null, byState:null },
  };
  const CS = () => CHAMBER_STATE[currentChamber];

  // Read HISPANIC_GB and HISPANIC_BASELINE from forecast.js's
  // script scope. Both are `const` declared at the top level of
  // forecast.js, so they're visible here by name as long as
  // forecast.js loads first. Fall back to safe defaults.
  function getHispanicBaseline(){
    try { if (typeof HISPANIC_BASELINE !== 'undefined' && HISPANIC_BASELINE) return HISPANIC_BASELINE; } catch(_){}
    return { D: 53.06, R: 46.94 };
  }
  function getHispanicGb(){
    try { if (typeof HISPANIC_GB !== 'undefined' && HISPANIC_GB) return HISPANIC_GB; } catch(_){}
    return null;
  }

  // Match forecast.js: VIS = { show:12.5, likely:7.5, lean:2.5 }
  const RATINGS = [
    { key:'SD', label:'Safe D', color:'#1e40af', light:false },
    { key:'LD', label:'Lkly D', color:'#3b82f6', light:false },
    { key:'TD', label:'Lean D', color:'#93c5fd', light:true  },
    { key:'TU', label:'Toss',   color:'#fbbf24', light:true  },
    { key:'TR', label:'Lean R', color:'#fca5a5', light:true  },
    { key:'LR', label:'Lkly R', color:'#ef4444', light:false },
    { key:'SR', label:'Safe R', color:'#991b1b', light:false },
  ];
  function rateDistrict(m){
    if (m == null || !isFinite(m)) return null;
    const a = Math.abs(m);
    if (a <= 2.5)  return RATINGS[3];
    if (a <= 7.5)  return m > 0 ? RATINGS[2] : RATINGS[4];
    if (a <= 12.5) return m > 0 ? RATINGS[1] : RATINGS[5];
    return m > 0 ? RATINGS[0] : RATINGS[6];
  }

  const BASELINE_GB = {
    '2024_pres':    { D: 48.3, R: 49.8 },
    '2016-20_comp': { D: 51.5, R: 48.5 },
    '2020-24_comp': { D: 49.7, R: 49.0 },  // rough Biden+Harris avg
    '2020_pres':    { D: 51.3, R: 46.8 },  // Biden margin +4.5
  };

  function buildRatio(props){
    const demRaw = props.dem_pct;
    const marginPts = props.margin;
    if (demRaw == null || marginPts == null || !isFinite(demRaw) || !isFinite(marginPts)) return null;
    const demPct = (Math.abs(demRaw) <= 1.5) ? demRaw * 100 : demRaw;
    const repPct = demPct - marginPts;
    const gbBase = BASELINE_GB[props.baseline] || { D: 50, R: 50 };
    if (gbBase.D <= 0 || gbBase.R <= 0) return null;

    let ratioD = demPct / gbBase.D;
    let ratioR = repPct / gbBase.R;

    // Hispanic swing adjustment — mirrors forecast.js getHouseModel.
    // Uses the per-chamber hispanic-share dict. SLDU starts empty so
    // the adjustment is a no-op until we produce that CSV.
    const hShare = HISPANIC_SHARE[currentChamber][props.GEOID] || 0;
    const hGb = getHispanicGb();
    if (hShare > 0 && hGb){
      const hBase = getHispanicBaseline();
      const swingD = (hGb.D - hBase.D) / hBase.D;
      const swingR = (hGb.R - hBase.R) / hBase.R;
      ratioD = ratioD * (1 + hShare * 0.75 * swingD);
      ratioR = ratioR * (1 + hShare * 0.75 * swingR);
    }

    props._demPct = demPct;
    props._repPct = repPct;
    props._hShare = hShare;
    return { D: ratioD, R: ratioR };
  }

  function projectMarginFromRatio(ratio, gbOverride){
    if (!ratio) return null;
    const m = gbOverride != null ? gbOverride
            : (gbCurrent != null && isFinite(gbCurrent)) ? gbCurrent : 0;
    const gbNow = { D: 50 + m/2, R: 50 - m/2 };
    const cdD = ratio.D * gbNow.D;
    const cdR = ratio.R * gbNow.R;
    const s   = cdD + cdR;
    if (s <= 0) return null;
    const projD = 100 * cdD / s;
    const projR = 100 * cdR / s;
    return projD - projR;
  }

  function attachRatios(){
    const feats = CS().features; if (!feats) return;
    for (const f of feats){ const p = f.properties; if (p) p._ratio = buildRatio(p); }
  }

  // Per-state additive D-margin bias to correct stale baseline drift.
  // NOT a model fudge — a data correction for known baseline drift.
  // Applies to both chambers because the baseline source is the
  // same underlying precinct data.
  const STATE_LEG_BIAS = {
    ME: +3,
  };

  function applyProjection(){
    const feats = CS().features; if (!feats) return;
    for (const f of feats){
      const p = f.properties;
      if (!p) continue;
      let m = projectMarginFromRatio(p._ratio);
      if (m != null && isFinite(m)){
        const bias = STATE_LEG_BIAS[p.state_abbr] || 0;
        if (bias) m += bias;
      }
      p._projMargin = m;
    }

    // Impute null-margin districts from their state's mean projected
    // margin (same rationale as before — some districts lack baseline
    // data and would otherwise be dropped from chamber totals).
    const sums = {};
    for (const f of feats){
      const p = f.properties || {};
      if (p._projMargin == null || !isFinite(p._projMargin)) continue;
      const st = p.state_abbr; if (!st) continue;
      if (!sums[st]) sums[st] = { sum: 0, n: 0 };
      sums[st].sum += p._projMargin; sums[st].n++;
    }
    let imputed = 0;
    for (const f of feats){
      const p = f.properties || {};
      if (p._projMargin != null && isFinite(p._projMargin)) continue;
      const st = p.state_abbr; if (!st) continue;
      const s = sums[st]; if (!s || s.n === 0) continue;
      p._projMargin = s.sum / s.n;
      p._imputed = true;
      imputed++;
    }
    if (imputed > 0) console.log(`[state-legs/${currentChamber}] imputed margins for ${imputed} districts`);

    CS().byState = indexByState(feats);
  }

  function mOf(p){ return (p && p._projMargin != null) ? p._projMargin : (p ? p.margin : null); }

  // --- Monte Carlo majority odds ------------------------------
  // Same variance budget as before, same rationale — see v8 notes.
  const NAT_SIGMA  = 20;
  const IDIO_SIGMA = 16;
  const MC_SIMS    = 50000;

  function gaussian(){
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function winProbD(margin){
    if (margin == null || !isFinite(margin)) return 0.5;
    return _nCDF(margin / NAT_SIGMA);
  }
  function _nCDF(z){
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z*z/2);
    const p = d * t * (0.3193815 + t*(-0.3565638 + t*(1.781478 + t*(-1.821256 + t*1.330274))));
    return z > 0 ? 1 - p : p;
  }

  // ----- Chamber-size + 2026 stagger tables ------------------
  //
  // SLDL (state house) — as before:
  const CHAMBER_SLDL = {
    AL:105, AK:40, AZ:60, AR:100, CA:80, CO:65, CT:151, DE:41, FL:120, GA:180,
    HI:51, ID:70, IL:118, IN:100, IA:100, KS:125, KY:100, LA:105, ME:151, MD:141,
    MA:160, MI:110, MN:134, MS:122, MO:163, MT:100, NE:0, NV:42, NH:400, NJ:80,
    NM:70, NY:150, NC:120, ND:94, OH:99, OK:101, OR:60, PA:203, RI:75, SC:124,
    SD:70, TN:99, TX:150, UT:75, VT:150, VA:100, WA:98, WV:100, WI:99, WY:62,
  };
  const SEATS_UP_FRAC_2026_SLDL = {
    LA: 0, MS: 0, NJ: 0, VA: 0,
    NE: 0,
    ND: 0.5,
  };

  // SLDU (state senate) — source: Wikipedia 2026 state legislative
  // elections summary table, cross-checked against the 270toWin
  // 2026 state senate map. Seat counts are the chamber size, not
  // seats up. Stagger fractions computed from (seats up)/(seat total)
  // per the same table:
  //
  //   100% up (whole chamber on ballot): AL, AZ, CT, GA, ID, ME, MD,
  //     MA, MI, NH, NY, NC, RI, SD, VT
  //   ~50% up (staggered 4-year):  AK (10/20), CA (20/40),
  //     CO (18/35), DE (11/21), FL (20/40), HI (13/25), IN (25/50),
  //     IA (25/50), KY (19/38), MO (17/34), MT (25/50), NV (11/21),
  //     OH (17/33), OK (24/48), OR (15/30), PA (25/50), TN (17/33),
  //     TX (16/31), UT (15/29), WA (24/49), WV (17/34), WI (17/33),
  //     WY (16/31), ND (24/47)
  //   66% up (2-4-4 system): IL (39/59)
  //   0% up (odd-year senates):   LA, MS, NJ, VA
  //   0% up (presidential-year senates): KS, NM, SC
  //   N/A (unicameral): NE
  const CHAMBER_SLDU = {
    AL:35,  AK:20,  AZ:30,  AR:35,  CA:40,  CO:35,  CT:36,  DE:21,  FL:40,  GA:56,
    HI:25,  ID:35,  IL:59,  IN:50,  IA:50,  KS:40,  KY:38,  LA:39,  ME:35,  MD:47,
    MA:40,  MI:38,  MN:67,  MS:52,  MO:34,  MT:50,  NE:0,   NV:21,  NH:24,  NJ:40,
    NM:42,  NY:63,  NC:50,  ND:47,  OH:33,  OK:48,  OR:30,  PA:50,  RI:38,  SC:46,
    SD:35,  TN:33,  TX:31,  UT:29,  VT:30,  VA:40,  WA:49,  WV:34,  WI:33,  WY:31,
  };
  const SEATS_UP_FRAC_2026_SLDU = {
    // whole-chamber states: leave undefined → default 1.0
    // fractional states (fraction up in 2026):
    AK: 10/20,  CA: 20/40,  CO: 18/35,  DE: 11/21,  FL: 20/40,
    HI: 13/25,  IL: 39/59,  IN: 25/50,  IA: 25/50,  KY: 19/38,
    MO: 17/34,  MT: 25/50,  NV: 11/21,  ND: 24/47,  OH: 17/33,
    OK: 24/48,  OR: 15/30,  PA: 25/50,  TN: 17/33,  TX: 16/31,
    UT: 15/29,  WA: 24/49,  WV: 17/34,  WI: 17/33,  WY: 16/31,
    // not-up-in-2026:
    LA: 0,  MS: 0,  NJ: 0,  VA: 0,
    KS: 0,  NM: 0,  SC: 0,
    NE: 0,
  };

  const CHAMBER = () => currentChamber === 'sldu' ? CHAMBER_SLDU : CHAMBER_SLDL;
  const SEATS_UP_FRAC_2026 = () => currentChamber === 'sldu' ? SEATS_UP_FRAC_2026_SLDU : SEATS_UP_FRAC_2026_SLDL;

  // Mirror NOT_UP_2026_STATES per chamber for the gray fill logic.
  const NOT_UP_SET = () => {
    const frac = SEATS_UP_FRAC_2026();
    const s = new Set();
    for (const k in frac) if (frac[k] === 0) s.add(k);
    return s;
  };

  function seatsUp2026(st, featureCount){
    const frac = SEATS_UP_FRAC_2026()[st];
    if (frac === 0) return 0;
    if (typeof frac === 'number') return Math.round(featureCount * frac);
    return featureCount;
  }

  function poissonBinomial(pDemArr){
    let dist = new Array(pDemArr.length + 1).fill(0);
    dist[0] = 1;
    for (let i = 0; i < pDemArr.length; i++){
      const p = Math.max(0, Math.min(1, pDemArr[i]));
      const nxt = new Array(pDemArr.length + 1).fill(0);
      for (let k = 0; k <= i; k++){
        nxt[k]     += dist[k] * (1 - p);
        nxt[k + 1] += dist[k] * p;
      }
      dist = nxt;
    }
    return dist;
  }

  function chamberOdds(stateAbbr){
    const bs = CS().byState;
    const s = bs && bs[stateAbbr];
    if (!s || !s.features?.length) return null;
    const total = s.features.length;
    const up = seatsUp2026(stateAbbr, total);
    if (up <= 0) return { total, up:0, notUp:true };

    const items = s.features
      .map(f => ({ f, m: mOf(f.properties) }))
      .sort((a,b) => Math.abs(a.m ?? 999) - Math.abs(b.m ?? 999));
    const upItems = items.slice(0, up);
    const lockedItems = items.slice(up);
    let lockedD = 0;
    for (const it of lockedItems){
      if (it.m != null && it.m > 0) lockedD++;
    }

    const majLine   = Math.floor(total/2) + 1;
    const superLine = Math.ceil(total * 2 / 3);
    const rMajCap   = total - majLine;
    const rSuperCap = total - superLine;

    const margins = upItems.map(it => it.m);
    let pDmaj = 0, pDsup = 0, pRmaj = 0, pRsup = 0, seatSum = 0;
    for (let sim = 0; sim < MC_SIMS; sim++){
      const natSwing = gaussian() * NAT_SIGMA;
      let dSeats = lockedD;
      for (let i = 0; i < margins.length; i++){
        const mBase = margins[i];
        if (mBase == null) { if (Math.random() < 0.5) dSeats++; continue; }
        const mSim = mBase + natSwing + gaussian() * IDIO_SIGMA;
        if (mSim > 0) dSeats++;
      }
      seatSum += dSeats;
      if (dSeats >= majLine)   pDmaj++;
      if (dSeats >= superLine) pDsup++;
      if (dSeats <= rMajCap)   pRmaj++;
      if (dSeats <= rSuperCap) pRsup++;
    }
    return {
      total, up, notUp:false, majLine, superLine,
      pDmaj: pDmaj / MC_SIMS,
      pDsup: pDsup / MC_SIMS,
      pRmaj: pRmaj / MC_SIMS,
      pRsup: pRsup / MC_SIMS,
      eDemSeats: seatSum / MC_SIMS,
      lockedD,
    };
  }

  let currentZoom = 'us';
  let gbHistory = null;
  let gbCurrent = null;

  // --- Generic ballot sync from forecast.js ------------------
  function readForecastGb(){
    try {
      try {
        if (typeof _savedNowcastGb !== 'undefined' && _savedNowcastGb
            && isFinite(_savedNowcastGb.D) && isFinite(_savedNowcastGb.R)) {
          return { margin: _savedNowcastGb.D - _savedNowcastGb.R, gb: _savedNowcastGb, src: 'nowcast' };
        }
      } catch(_) {}
      if (typeof DATA === 'undefined') return { err: 'no-binding' };
      const D = DATA;
      if (!D || !D.house) return { err: 'no-house' };
      const gb = D.house.gb;
      if (!gb) return { err: 'gb-null' };
      if (!isFinite(gb.D) || !isFinite(gb.R)) return { err: 'gb-nan' };
      return { margin: gb.D - gb.R, gb, src: 'house.gb' };
    } catch(e) {
      return { err: 'throw:' + e.message };
    }
  }
  let _lastErr = null;
  function syncGbFromForecast(){
    const r = readForecastGb();
    if (r.err){
      if (r.err !== _lastErr){
        console.log(`[state-legs] gb not ready (${r.err})`);
        _lastErr = r.err;
      }
      return false;
    }
    _lastErr = null;
    const hGb = getHispanicGb();
    const hKey = hGb ? `${hGb.D.toFixed(2)}/${hGb.R.toFixed(2)}` : 'none';
    const hChanged = hKey !== _lastHGbKey;
    if (r.margin !== gbCurrent || hChanged){
      const prev = gbCurrent;
      gbCurrent = r.margin;
      _lastHGbKey = hKey;
      if (prev !== r.margin) console.log(`[state-legs] gb synced: ${prev==null?'(initial)':prev.toFixed(2)} → ${r.margin.toFixed(2)}`);
      if (hChanged) console.log(`[state-legs] Hispanic gb changed: ${hKey}`);
      // Recompute ratios + projections for BOTH loaded chambers, but
      // only re-render the active one.
      for (const ch of ['sldl','sldu']){
        if (!CHAMBER_STATE[ch].features) continue;
        const prevChamber = currentChamber;
        currentChamber = ch;
        try { attachRatios(); applyProjection(); } finally { currentChamber = prevChamber; }
      }
      if (svgEl()) render();
      if (currentZoom && currentZoom !== 'us') renderPanelForState(currentZoom);
    }
    return true;
  }
  let _lastHGbKey = 'none';
  function startGbWatcher(){
    syncGbFromForecast();
    let tries = 0;
    const fast = setInterval(() => {
      tries++;
      if (syncGbFromForecast()){
        clearInterval(fast);
      } else if (tries > 120){
        clearInterval(fast);
        console.warn(`[state-legs] gave up waiting for forecast DATA.house.gb after 60s (last err: ${_lastErr}) — falling back to gbCurrent=0`);
        if (gbCurrent == null){ gbCurrent = 0; applyProjection(); if (svgEl()) render(); }
      }
    }, 500);
    setInterval(syncGbFromForecast, 15000);
  }

  async function loadGbHistory(){
    if (gbHistory) return;
    try {
      const res = await fetch('json/polls.json', { cache:'no-store' });
      if (!res.ok) throw new Error('gb ' + res.status);
      const j = await res.json();
      const gb = Array.isArray(j.genericBallot) ? j.genericBallot : [];
      const polls = gb.map(p => {
        const ds = p.end_date || p.start_date || p.created_at;
        if (!ds) return null;
        const m = String(ds).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return null;
        const d = new Date(+m[1], +m[2]-1, +m[3]);
        const getNum = (o, keys) => {
          for (const k of keys){ if (o[k] != null && isFinite(+o[k])) return +o[k]; }
          return NaN;
        };
        const dem = getNum(p, ['dem','democrat','democrats','democratic']);
        const rep = getNum(p, ['rep','republican','republicans','gop']);
        if (!isFinite(dem) || !isFinite(rep)) return null;
        return { date: d, margin: dem - rep };
      }).filter(Boolean).sort((a,b) => a.date - b.date);
      if (!polls.length) return;
      const W = 14;
      const series = [];
      for (let i = 0; i < polls.length; i++){
        const lo = Math.max(0, i - W + 1);
        const slice = polls.slice(lo, i + 1);
        const avg = slice.reduce((s,p)=>s+p.margin,0) / slice.length;
        series.push({ date: polls[i].date, margin: avg });
      }
      gbHistory = series;
    } catch(e){ console.warn('[state-legs] gb history unavailable', e); }
  }

  const root       = () => document.getElementById(PAGE_ID);
  const svgEl      = () => root() && root().querySelector('svg[data-sldl-map]');
  const zoomSelect = () => root() && root().querySelector('[data-sldl-zoom-select]');
  const usBtn      = () => root() && root().querySelector('[data-sldl-zoom="us"]');
  const panelEl    = () => root() && root().querySelector('.sldlStatePanel');
  const stageEl    = () => root() && root().querySelector('.modeCol[data-mode="sldl"] .mapStage');
  const mapStageEl = () => root() && root().querySelector('.modeCol[data-mode="sldu"] .mapStage');

  function hideOldTooltips(){
    const s = root() && root().querySelector('[data-sldl-sticky]');
    const c = root() && root().querySelector('[data-sldl-cursor]');
    if (s) s.style.display = 'none';
    if (c) c.style.display = 'none';
  }

  // Update the static DOM labels (top-card titles, map aria) when
  // the chamber changes. These are driven by data-* hooks that the
  // HTML patch added so we don't need to re-template.
  function refreshChamberLabels(){
    const r = root(); if (!r) return;
    const ch = CH();
    r.querySelectorAll('[data-sldl-left-title]').forEach(el => el.textContent = ch.label);
    r.querySelectorAll('[data-sldl-left-sub]').forEach(el => el.textContent = ch.sub);
    r.querySelectorAll('[data-sldl-right-title]').forEach(el => el.textContent = ch.label + ' Map');
    const svg = svgEl();
    if (svg) svg.setAttribute('aria-label', ch.label + ' districts');
    const mapCard = r.querySelector('.modeCol[data-mode="sldu"] .mapCard');
    if (mapCard) mapCard.setAttribute('aria-label', ch.mapLabel);
    // Panel subtitle inside the card, set at injectPanel-time
    const p = panelEl();
    if (p){ const sub = p.querySelector('.sldlPanelSub'); if (sub) sub.textContent = ch.label; }
  }

  function injectPanel(){
    const stage = stageEl();
    if (!stage || stage.querySelector('.sldlStatePanel')) return;
    const div = document.createElement('div');
    div.className = 'sldlStatePanel';
    div.innerHTML = `
      <div class="sldlPanelHeader">
        <div>
          <div class="sldlPanelTitle">—</div>
          <div class="sldlPanelSub">${CH().label}</div>
        </div>
        <div class="sldlModeToggle sldlChamberToggle" data-chamber-toggle>
          <button type="button" data-ch="sldl" class="active">House</button>
          <button type="button" data-ch="sldu">Senate</button>
        </div>
      </div>
      <div class="sldlPanelHeader" style="margin-top:-2px;">
        <div></div>
        <div class="sldlModeToggle" data-mode-toggle>
          <button type="button" data-mode="model" class="active">Model</button>
          <button type="button" data-mode="ratings">Ratings</button>
        </div>
      </div>
      <div class="sldlSeatLine">
        <span class="dSide">D <b data-seats-d>—</b></span>
        <span class="sep">|</span>
        <span class="rSide">R <b data-seats-r>—</b></span>
      </div>
      <div class="sldlRatingBar" data-rating-bar></div>
      <div class="sldlRatingLabels" data-rating-labels></div>
      <div class="sldlOddsRow" data-odds-row></div>
      <div class="sldlPanelDivider"></div>
      <div class="sldlPanelDistrict" data-district>
        <div class="dstPlaceholder">Hover a district</div>
      </div>`;
    stage.appendChild(div);

    // Fill-mode (Model vs Ratings) — unchanged.
    div.querySelectorAll('[data-mode-toggle] button').forEach(b => {
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        fillMode = b.getAttribute('data-mode');
        div.querySelectorAll('[data-mode-toggle] button').forEach(x => x.classList.toggle('active', x===b));
        render();
      });
    });

    // Chamber toggle — swaps SLDL ↔ SLDU. Lazy-loads SLDU on first click.
    div.querySelectorAll('[data-chamber-toggle] button').forEach(b => {
      b.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const ch = b.getAttribute('data-ch');
        if (ch === currentChamber) return;
        div.querySelectorAll('[data-chamber-toggle] button').forEach(x => x.classList.toggle('active', x===b));
        currentChamber = ch;
        refreshChamberLabels();
        // Zoom stays where it was — feels right when swapping chambers for the same state.
        await load();
        render();
        // Refresh panel for current zoom with new chamber's data
        if (currentZoom === 'us') {
          const p = panelEl();
          if (p){
            p.querySelector('.sldlPanelTitle').textContent = 'US';
            p.querySelector('[data-seats-d]').textContent = '—';
            p.querySelector('[data-seats-r]').textContent = '—';
            const bar = p.querySelector('[data-rating-bar]'); if (bar) bar.innerHTML = '';
            const lbl = p.querySelector('[data-rating-labels]'); if (lbl) lbl.innerHTML = '';
            const odds = p.querySelector('[data-odds-row]');
            if (odds) odds.innerHTML = '<div class="sldlOddsNone" style="grid-column:1/-1;">Hover a state for majority odds</div>';
          }
        } else {
          renderPanelForState(currentZoom);
        }
      });
    });

    if (document.getElementById('sldlPanelStyles')) return;
    const style = document.createElement('style');
    style.id = 'sldlPanelStyles';
    style.textContent = `
      #stateLegsPage.sldl-active{display:grid !important;}
      #stateLegsPage .mapStage{position:relative;}
      #stateLegsPage .sldlStatePanel{
        position:relative;width:100%;
        background:var(--panel,#fff);border:1px solid var(--line,rgba(0,0,0,0.12));
        border-radius:6px;padding:14px 18px;font-size:11px;line-height:1.4;font-weight:600;
        box-shadow:none;display:none;pointer-events:auto;
      }
      #stateLegsPage .sldlStatePanel.show{display:block;}
      #stateLegsPage .sldlStatePanel .sldlModeToggle,
      #stateLegsPage .sldlStatePanel .sldlModeToggle button{pointer-events:auto;}
      #stateLegsPage .sldlPanelHeader{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:6px;}
      #stateLegsPage .sldlModeToggle{display:inline-flex;border:1px solid rgba(0,0,0,0.15);border-radius:4px;overflow:hidden;pointer-events:auto;}
      #stateLegsPage .sldlModeToggle button{padding:3px 9px;background:transparent;border:none;cursor:pointer;font-size:9px;font-weight:800;color:var(--muted,#6b7280);letter-spacing:0.04em;text-transform:uppercase;}
      #stateLegsPage .sldlModeToggle button.active{background:var(--ink,#111);color:#fff;}
      #stateLegsPage .sldlChamberToggle button{padding:3px 10px;}
      #stateLegsPage .sldlOddsRow{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-top:10px;}
      #stateLegsPage .sldlOddsRow .cell{background:rgba(0,0,0,0.03);border-radius:4px;padding:5px 6px;text-align:center;}
      #stateLegsPage .sldlOddsRow .lbl{font-size:8px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.03em;margin-bottom:1px;}
      #stateLegsPage .sldlOddsRow .val{font-size:12px;font-weight:800;font-variant-numeric:tabular-nums;}
      #stateLegsPage .sldlOddsRow .val.d{color:var(--blue,#2563eb);}
      #stateLegsPage .sldlOddsRow .val.r{color:var(--red,#dc2626);}
      #stateLegsPage .sldlOddsNone{font-size:10px;color:var(--muted);text-align:center;padding:6px 0;font-style:italic;}
      #stateLegsPage .sldlPanelTitle{font-size:15px;font-weight:800;color:var(--ink);letter-spacing:-0.01em;}
      #stateLegsPage .sldlPanelSub{font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;}
      #stateLegsPage .sldlSeatLine{display:flex;align-items:center;justify-content:center;gap:10px;font-weight:800;margin:4px 0 8px;}
      #stateLegsPage .sldlSeatLine .dSide{color:var(--blue,#2563eb);font-size:12px;}
      #stateLegsPage .sldlSeatLine .dSide b{font-size:19px;}
      #stateLegsPage .sldlSeatLine .rSide{color:var(--red,#dc2626);font-size:12px;}
      #stateLegsPage .sldlSeatLine .rSide b{font-size:19px;}
      #stateLegsPage .sldlSeatLine .sep{color:var(--line,rgba(0,0,0,0.2));font-weight:400;}
      #stateLegsPage .sldlRatingBar{display:flex;height:20px;border-radius:3px;overflow:hidden;border:1px solid var(--line,rgba(0,0,0,0.12));}
      #stateLegsPage .sldlRatingBar .seg{display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;min-width:0;}
      #stateLegsPage .sldlRatingBar .seg.light{color:#1f2937;}
      #stateLegsPage .sldlRatingLabels{display:flex;font-size:8px;font-weight:700;color:var(--muted);margin-top:3px;text-transform:uppercase;letter-spacing:0.02em;}
      #stateLegsPage .sldlRatingLabels .lbl{text-align:center;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      #stateLegsPage .sldlPanelDivider{height:1px;background:var(--line,rgba(0,0,0,0.1));margin:10px -12px;}
      #stateLegsPage .sldlPanelDistrict{min-height:56px;}
      #stateLegsPage .dstPlaceholder{color:var(--muted);font-style:italic;font-size:9px;text-align:center;padding:14px 0;}
      #stateLegsPage .dstName{font-size:11px;font-weight:800;color:var(--ink);margin-bottom:5px;}
      #stateLegsPage .dstRow{display:flex;justify-content:space-between;align-items:center;font-size:10px;color:var(--muted);padding:2px 0;}
      #stateLegsPage .dstRow .v{color:var(--ink);font-variant-numeric:tabular-nums;font-weight:700;}
      #stateLegsPage .dstRow .v.d{color:var(--blue,#2563eb);}
      #stateLegsPage .dstRow .v.r{color:var(--red,#dc2626);}
      #stateLegsPage .dstRating{display:inline-block;padding:2px 7px;border-radius:3px;color:#fff;font-weight:800;font-size:9px;letter-spacing:0.03em;text-transform:uppercase;}
      #stateLegsPage .dstRating.light{color:#1f2937;}
      #stateLegsPage .dstWpSection{margin-top:6px;}
      #stateLegsPage .dstWpHeader{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px;}
      #stateLegsPage .dstWpLabel{font-size:8px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;}
      #stateLegsPage .dstWpNums{font-size:10px;font-weight:800;font-variant-numeric:tabular-nums;}
      #stateLegsPage .dstWpNums .d{color:var(--blue,#2563eb);}
      #stateLegsPage .dstWpNums .r{color:var(--red,#dc2626);margin-left:5px;}
      #stateLegsPage .dstSpark{width:100%;height:32px;display:block;border:1px solid var(--line,rgba(0,0,0,0.08));border-radius:2px;}
      #stateLegsPage .modeCol[data-mode="sldl"] .mapSvg path{cursor:pointer;}
    `;
    document.head.appendChild(style);
  }

  let fillMode = 'model';

  function ratingFillFor(m){
    const r = rateDistrict(m);
    return r ? r.color : '#d0d0d0';
  }

  function fillFor(m, props){
    if (props && NOT_UP_SET().has(props.state_abbr)) return '#e5e7eb';
    if (m == null || !isFinite(m)) return '#d0d0d0';
    return fillMode === 'ratings' ? ratingFillFor(m) : marginColor(m);
  }

  function indexByState(feats){
    const map = {};
    for (const f of feats){
      const p = f.properties || {}, st = p.state_abbr;
      if (!st) continue;
      if (!map[st]) map[st] = { features:[], totalD:0, totalR:0, total:0, ratings:{} };
      const s = map[st];
      s.features.push(f); s.total++;
      const m = (p._projMargin != null) ? p._projMargin : p.margin;
      if (m != null && isFinite(m)){
        if (m > 0) s.totalD++; else if (m < 0) s.totalR++;
        const r = rateDistrict(m);
        if (r) s.ratings[r.key] = (s.ratings[r.key] || 0) + 1;
      }
    }
    return map;
  }

  function populateStateSelect(){
    const sel = zoomSelect(); if (!sel) return;
    const bs = CS().byState; if (!bs) return;
    const states = Object.keys(bs).sort();
    const current = sel.value;
    sel.innerHTML = '<option value="">State…</option>' + states.map(s=>`<option value="${s}">${s}</option>`).join('');
    // Restore selection if the new chamber also has this state (it will).
    if (current && states.includes(current)) sel.value = current;
  }

  function fmtMargin(m){ if (m==null||!isFinite(m)) return '—'; return (m>=0?'D+':'R+')+Math.abs(m).toFixed(1); }
  function baselineLabel(b){
    if(!b) return '—';
    if (b==='2024_pres')    return '2024 pres';
    if (b==='2020-24_comp') return '2020–24 comp.';
    if (b==='2016-20_comp') return '2016–20 comp.';
    if (b==='2020_pres')    return '2020 pres';
    return b;
  }

  function hex(c){ if(!c) return '#888'; c=c.trim(); if(c.startsWith('#')) return c.length===4?'#'+[...c.slice(1)].map(x=>x+x).join(''):c; const m=c.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/); return m?'#'+[m[1],m[2],m[3]].map(v=>(+v).toString(16).padStart(2,'0')).join(''):'#888'; }
  function mix(a,b,k){ const pa=a.match(/\w\w/g).map(h=>parseInt(h,16)); const pb=b.match(/\w\w/g).map(h=>parseInt(h,16)); return '#'+pa.map((v,i)=>Math.round(v+(pb[i]-v)*k).toString(16).padStart(2,'0')).join(''); }
  function marginColor(m){
    if (m==null||!isFinite(m)) return '#d0d0d0';
    if (Math.abs(m) <= 2.5) return '#fbbf24';
    const cs=getComputedStyle(document.documentElement);
    const blue=hex(cs.getPropertyValue('--blue')||'#2563eb');
    const red =hex(cs.getPropertyValue('--red') ||'#dc2626');
    const t=Math.max(-1,Math.min(1,m/40));
    return t>=0?mix('#f4f4f4',blue,t):mix('#f4f4f4',red,-t);
  }

  function renderPanelForState(stateAbbr){
    const p = panelEl(); if (!p) return;
    const bs = CS().byState;
    if (!stateAbbr || !bs || !bs[stateAbbr]){ p.classList.remove('show'); return; }
    const s = bs[stateAbbr];
    p.classList.add('show');
    p.querySelector('.sldlPanelTitle').textContent = stateAbbr;
    const sub = p.querySelector('.sldlPanelSub'); if (sub) sub.textContent = CH().label;
    p.querySelector('[data-seats-d]').textContent = s.totalD;
    p.querySelector('[data-seats-r]').textContent = s.totalR;
    const bar = p.querySelector('[data-rating-bar]');
    const labels = p.querySelector('[data-rating-labels]');
    let barHTML = '', lblHTML = '';
    for (const r of RATINGS){
      const n = s.ratings[r.key] || 0;
      if (n === 0) continue;
      barHTML += `<div class="seg ${r.light?'light':''}" style="flex:${n};background:${r.color};" title="${r.label}: ${n}">${n}</div>`;
      lblHTML += `<div class="lbl" style="flex:${n};">${r.label}</div>`;
    }
    bar.innerHTML = barHTML;
    labels.innerHTML = lblHTML;

    const oddsEl = p.querySelector('[data-odds-row]');
    if (oddsEl){
      const o = chamberOdds(stateAbbr);
      if (!o) { oddsEl.innerHTML = ''; }
      else if (o.notUp) {
        const why = stateAbbr === 'NE' ? 'unicameral'
                  : (currentChamber === 'sldu' && ['KS','NM','SC'].includes(stateAbbr)) ? 'presidential-year senate'
                  : 'odd-year state';
        oddsEl.innerHTML = `<div class="sldlOddsNone" style="grid-column:1/-1;">Not up in 2026 · ${why}</div>`;
      } else {
        const pct = v => (v*100).toFixed(v>0.995||v<0.005 ? 1 : 0) + '%';
        oddsEl.innerHTML = `
          <div class="cell"><div class="lbl">D Super</div><div class="val d">${pct(o.pDsup)}</div></div>
          <div class="cell"><div class="lbl">D Maj</div><div class="val d">${pct(o.pDmaj)}</div></div>
          <div class="cell"><div class="lbl">R Maj</div><div class="val r">${pct(o.pRmaj)}</div></div>
          <div class="cell"><div class="lbl">R Super</div><div class="val r">${pct(o.pRsup)}</div></div>`;
      }
    }

    const dst = p.querySelector('[data-district]');
    dst.innerHTML = '<div class="dstPlaceholder">Hover a district</div>';
  }

  function normalCDF(z){
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804 * Math.exp(-z*z/2);
    let p = d * t * (0.3193815 + t*(-0.3565638 + t*(1.781478 + t*(-1.821256 + t*1.330274))));
    return z >= 0 ? 1 - p : p;
  }
  const WIN_PROB_SD = 6;
  function winProbDistrict(margin){
    if (margin == null || !isFinite(margin)) return null;
    return normalCDF(margin / WIN_PROB_SD);
  }

  function buildSparkline(ratio){
    if (!gbHistory || gbHistory.length < 2 || !ratio || gbCurrent == null) return '';
    const pts = gbHistory.map(p => {
      const dm = projectMarginFromRatio(ratio, p.margin);
      return { t: p.date.getTime(), y: (dm != null) ? normalCDF(dm / WIN_PROB_SD) : 0.5 };
    });
    const W = 196, H = 32;
    const tMin = pts[0].t, tMax = pts[pts.length-1].t;
    const span = Math.max(1, tMax - tMin);
    const xOf = t => ((t - tMin) / span) * W;
    const yOf = y => H - (y * H);
    let demArea = `M 0 ${H} `;
    let line = '';
    pts.forEach((p, i) => {
      const x = xOf(p.t), y = yOf(p.y);
      demArea += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
      line += (i === 0 ? 'M' : 'L') + ` ${x.toFixed(1)} ${y.toFixed(1)} `;
    });
    demArea += `L ${W} ${H} Z`;
    const mid = yOf(0.5);
    const cs = getComputedStyle(document.documentElement);
    const blueC = (cs.getPropertyValue('--blue')||'#2563eb').trim();
    const redC  = (cs.getPropertyValue('--red') ||'#dc2626').trim();
    return `
      <svg class="dstSpark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <rect x="0" y="0" width="${W}" height="${H}" fill="${redC}" opacity="0.08"/>
        <rect x="0" y="0" width="${W}" height="${mid}" fill="${blueC}" opacity="0.10"/>
        <path d="${demArea}" fill="${blueC}" opacity="0.35"/>
        <line x1="0" y1="${mid}" x2="${W}" y2="${mid}" stroke="#9ca3af" stroke-width="0.5" stroke-dasharray="2,2"/>
        <path d="${line}" fill="none" stroke="${blueC}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
      </svg>`;
  }

  function renderPanelDistrict(props){
    const p = panelEl(); if (!p || !p.classList.contains('show')) return;
    const dst = p.querySelector('[data-district]'); if (!dst) return;
    const mProj = mOf(props);
    const r = rateDistrict(mProj);
    const marginClass = mProj == null ? '' : (mProj >= 0 ? 'd' : 'r');
    const wpD = winProbDistrict(mProj);
    const wpDPct = wpD != null ? Math.round(wpD * 100) : null;
    const wpRPct = wpDPct != null ? (100 - wpDPct) : null;
    const spark = buildSparkline(props._ratio);
    const wpBlock = wpD != null
      ? `<div class="dstWpHeader"><span class="dstWpLabel">Win Probability</span><span class="dstWpNums"><span class="d">D ${wpDPct}%</span> <span class="r">R ${wpRPct}%</span></span></div>
         ${spark}`
      : '<div class="dstWpLabel" style="color:var(--muted);">No baseline data</div>';
    dst.innerHTML = `
      <div class="dstName">${props.NAMELSAD || 'District'}</div>
      <div class="dstRow"><span>Rating</span><span>${r ? `<span class="dstRating ${r.light?'light':''}" style="background:${r.color};">${r.label}</span>` : '—'}</span></div>
      <div class="dstRow"><span>Margin</span><span class="v ${marginClass}">${fmtMargin(mProj)}</span></div>
      <div class="dstRow"><span>Baseline</span><span class="v">${baselineLabel(props.baseline)}</span></div>
      <div class="dstWpSection">${wpBlock}</div>`;
  }

  function render(){
    const svg = svgEl(); if (!svg) return;
    const features = CS().features; if (!features) return;
    const W = 2880, H = 1800;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    svg.setAttribute('shape-rendering','geometricPrecision');
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.width = '';
    svg.style.height = '';

    const byState = CS().byState;
    const feats = currentZoom === 'us' ? features : (byState && byState[currentZoom] ? byState[currentZoom].features : []);
    // Same sanity filter as before — drop features with inside-out
    // winding that make d3.geoBounds return the whole globe.
    const isSane = f => {
      const b = d3.geoBounds(f);
      return isFinite(b[0][0]) && (b[1][0]-b[0][0]) < 30 && (b[1][1]-b[0][1]) < 30;
    };
    const conusFeats = (currentZoom === 'us'
      ? feats.filter(f => { const fp = f.properties?.STATEFP || f.properties?.GEOID?.slice(0,2); return fp !== '02' && fp !== '15'; })
      : feats
    ).filter(isSane);
    const fc = { type:'FeatureCollection', features: conusFeats };
    const projection = d3.geoMercator().fitExtent([[54,54],[W-54,H-54]], fc);
    const path = d3.geoPath(projection);

    const sel = d3.select(svg);
    sel.selectAll('g.sldlZoomLayer').remove();
    sel.selectAll('path').remove();

    const zoomLayer = sel.append('g').attr('class','sldlZoomLayer');

    sel.on('click', function(ev){
      if (ev.target.tagName !== 'path' && currentZoom !== 'us'){
        currentZoom = 'us';
        const zs = zoomSelect(); if (zs) zs.value = '';
        const ub = usBtn(); if (ub) ub.classList.add('active');
        render();
      }
    });

    zoomLayer.selectAll('path')
      .data(conusFeats, d => d.properties.GEOID)
      .join('path')
        .attr('d', path)
        .attr('fill', d => fillFor(mOf(d.properties), d.properties))
        .attr('stroke','rgba(255,255,255,0.4)')
        .attr('stroke-width', currentZoom === 'us' ? 1.5 : 2.4)
      .on('mouseenter', function(ev, d){
        d3.select(this).attr('stroke','#1f2937').attr('stroke-width',3.6);
        const st = d.properties.state_abbr;
        if (currentZoom === 'us' && st) renderPanelForState(st);
        renderPanelDistrict(d.properties);
      })
      .on('mouseleave', function(){
        d3.select(this).attr('stroke','rgba(255,255,255,0.4)').attr('stroke-width', currentZoom==='us'?1.5:2.4);
      })
      .on('click', function(ev, d){
        ev.stopPropagation();
        const st = d.properties.state_abbr; if (!st) return;
        currentZoom = st;
        const zs = zoomSelect(); if (zs) zs.value = st;
        const ub = usBtn(); if (ub) ub.classList.remove('active');
        render();
      });

    if (currentZoom === 'us') {
      const p = panelEl();
      if (p){
        p.classList.add('show');
        p.querySelector('.sldlPanelTitle').textContent = 'US';
        const sub = p.querySelector('.sldlPanelSub'); if (sub) sub.textContent = CH().label;
        p.querySelector('[data-seats-d]').textContent = '—';
        p.querySelector('[data-seats-r]').textContent = '—';
        const bar = p.querySelector('[data-rating-bar]'); if (bar) bar.innerHTML = '';
        const lbl = p.querySelector('[data-rating-labels]'); if (lbl) lbl.innerHTML = '';
        const odds = p.querySelector('[data-odds-row]');
        if (odds) odds.innerHTML = '<div class="sldlOddsNone" style="grid-column:1/-1;">Hover a state for majority odds</div>';
        const dst = p.querySelector('[data-district]');
        if (dst) dst.innerHTML = '<div class="dstPlaceholder">Hover a district</div>';
      }
    } else {
      renderPanelForState(currentZoom);
    }

    sel.on('.zoom', null);
    const zoom = d3.zoom()
      .scaleExtent([1, 24])
      .translateExtent([[-150,-150],[W+150,H+150]])
      .on('zoom', (ev) => {
        _currentZoomTransform = ev.transform;
        zoomLayer.attr('transform', ev.transform);
        zoomLayer.selectAll('path')
          .attr('stroke-width', (currentZoom==='us'?1.5:2.4) / ev.transform.k);
      });
    sel.call(zoom);
    // Reset zoom when chamber OR view mode changes. Preserve otherwise.
    const zoomKey = currentChamber + '/' + currentZoom;
    if (_lastZoomKey !== zoomKey){
      _lastZoomKey = zoomKey;
      _currentZoomTransform = d3.zoomIdentity;
      sel.call(zoom.transform, d3.zoomIdentity);
    } else if (_currentZoomTransform && _currentZoomTransform !== d3.zoomIdentity){
      sel.call(zoom.transform, _currentZoomTransform);
    }
  }
  let _lastZoomKey = null;
  let _currentZoomTransform = null;

  async function load(){
    const state = CS();
    if (state.loaded || state.loading) return;
    state.loading = true;
    const ch = CH();
    try {
      const res = await fetch(ch.topoUrl);
      if (!res.ok) throw new Error(`fetch ${ch.topoUrl}: ${res.status}`);
      const topo = await res.json();
      const objName = (topo.objects && topo.objects[ch.topoObject]) ? ch.topoObject : Object.keys(topo.objects||{})[0];
      if (!objName) throw new Error('no topojson objects');
      const fc = topojson.feature(topo, topo.objects[objName]);
      state.features = fc.features || [];

      // SLDL: separate lean CSV → join by GEOID.
      // SLDU: properties already carry margin/dem_pct/baseline.
      if (ch.leanCsvUrl){
        try {
          const csvRes = await fetch(ch.leanCsvUrl, { cache:'no-store' });
          if (!csvRes.ok) throw new Error('lean csv ' + csvRes.status);
          const text = await csvRes.text();
          const lines = text.split(/\r?\n/).filter(Boolean);
          const headers = lines[0].split(',');
          const iGeoid = headers.indexOf('GEOID');
          const iDem   = headers.indexOf('dem_pct');
          const iMar   = headers.indexOf('margin');
          const iSrc   = headers.indexOf('baseline_source');
          const leanByGeoid = {};
          for (let i = 1; i < lines.length; i++){
            const c = lines[i].split(',');
            const geoid = c[iGeoid];
            if (!geoid) continue;
            leanByGeoid[geoid] = {
              dem_pct:  parseFloat(c[iDem]),
              margin:   parseFloat(c[iMar]),
              baseline: c[iSrc] || null,
            };
          }
          let matched = 0;
          for (const f of state.features){
            const p = f.properties; if (!p) continue;
            const lean = leanByGeoid[p.GEOID];
            if (lean){
              p.dem_pct  = lean.dem_pct;
              p.margin   = lean.margin;
              p.baseline = lean.baseline;
              matched++;
            }
          }
          console.log(`[state-legs/${ch.key}] joined lean data: ${matched}/${state.features.length} districts`);
        } catch (e){
          console.error(`[state-legs/${ch.key}] lean csv load failed`, e);
        }
      } else {
        // SLDU: sanity-check that properties actually have what we need.
        const hasAny = state.features.some(f => f.properties && f.properties.margin != null);
        const n = state.features.length;
        if (!hasAny) console.warn(`[state-legs/${ch.key}] no margin data on topojson properties — build_sldu.py output may be broken`);
        else console.log(`[state-legs/${ch.key}] embedded properties: ${n} districts`);
      }

      // Hispanic CSV — optional for both chambers. Silent no-op if absent.
      if (ch.hispCsvUrl){
        try {
          const hRes = await fetch(ch.hispCsvUrl, { cache:'no-store' });
          if (hRes.ok){
            const text = await hRes.text();
            const lines = text.split(/\r?\n/).filter(Boolean);
            const hdr = lines[0].split(',');
            const iG = hdr.indexOf('GEOID');
            const iH = hdr.indexOf('h_share');
            if (iG >= 0 && iH >= 0){
              const dict = HISPANIC_SHARE[ch.key];
              let kept = 0, skipped = 0;
              for (let i = 1; i < lines.length; i++){
                const c = lines[i].split(',');
                const geoid = c[iG];
                const h = parseFloat(c[iH]);
                if (geoid && isFinite(h)){
                  if (h >= 0.5){ dict[geoid] = h; kept++; }
                  else skipped++;
                }
              }
              console.log(`[state-legs/${ch.key}] Hispanic share: ${kept} districts ≥50% (${skipped} below threshold, ignored)`);
            }
          } else {
            console.log(`[state-legs/${ch.key}] no Hispanic CSV (adjustment disabled)`);
          }
        } catch (e){
          console.log(`[state-legs/${ch.key}] Hispanic CSV not available (adjustment disabled)`);
        }
      }

      attachRatios();
      applyProjection();
      populateStateSelect();
      hideOldTooltips();
      injectPanel();
      refreshChamberLabels();

      const hasAnyMargin = state.features.some(f => f.properties && f.properties.margin != null && isFinite(f.properties.margin));
      if (!hasAnyMargin) {
        const stage = stageEl();
        if (stage && !stage.querySelector('.sldlDataBanner')) {
          const b = document.createElement('div');
          b.className = 'sldlDataBanner';
          b.textContent = `No partisan data loaded — upload ${ch.topoUrl.replace('./','')} with margin/dem_pct/baseline`;
          stage.appendChild(b);
        }
      }

      state.loaded = true;
    } catch(e){
      console.error(`[state-legs/${ch.key}] load failed`, e);
      const stage = stageEl();
      if (stage && !stage.querySelector('.sldlDataBanner')) {
        const b = document.createElement('div');
        b.className = 'sldlDataBanner';
        b.textContent = `Failed to load ${ch.topoUrl.replace('./','')} — check that the file exists at the site root`;
        stage.appendChild(b);
      }
    }
    finally { state.loading = false; }

    // gb history + watcher are chamber-agnostic; start once.
    if (!_gbStarted){
      _gbStarted = true;
      await loadGbHistory();
      startGbWatcher();
    }
  }
  let _gbStarted = false;

  function wireControls(){
    const r = root(); if (!r) return;
    r.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-sldl-zoom]');
      if (!btn) return;
      currentZoom = btn.getAttribute('data-sldl-zoom');
      r.querySelectorAll('[data-sldl-zoom]').forEach(b => b.classList.toggle('active', b===btn));
      const sel = zoomSelect(); if (sel) sel.value = '';
      render();
    });
    const sel = zoomSelect();
    if (sel) sel.addEventListener('change', () => {
      if (!sel.value) return;
      currentZoom = sel.value;
      const ub = usBtn(); if (ub) ub.classList.remove('active');
      render();
    });
    window.addEventListener('resize', () => { if (CS().loaded) render(); });
  }

  function handleTabClick(ev){
    const btn = ev.target.closest('.pageTab');
    if (!btn) return;
    const page = btn.dataset.page;
    const r = root(); if (!r) return;
    if (page === 'state-legs'){
      r.style.display = 'grid';
      r.classList.add('sldl-active');
      load().then(() => {
        if (CS().loaded) requestAnimationFrame(() => requestAnimationFrame(render));
      });
    } else {
      r.classList.remove('sldl-active');
      r.style.display = 'none';
    }
  }

  function init(){
    const r = root(); if (!r) return;
    wireControls();
    const nav = document.querySelector('.pageTabs');
    if (nav) {
      nav.addEventListener('click', handleTabClick);
      nav.addEventListener('click', handleTabClick, true);
    }
    r.style.display = 'none';
  }

  // Debug helper — dual-chamber aware
  window.sldlDebug = function(stateAbbr){
    if (!stateAbbr) stateAbbr = 'GA';
    const bs = CS().byState;
    if (!bs || !bs[stateAbbr]){
      return { error: 'no state ' + stateAbbr + ' in ' + currentChamber, available: bs ? Object.keys(bs).sort() : null };
    }
    const s = bs[stateAbbr];
    const margins = s.features.map(f => f.properties._projMargin).filter(x => x != null).sort((a,b)=>a-b);
    const nullCount = s.features.length - margins.length;
    const odds = chamberOdds(stateAbbr);
    let forecastGb = null, forecastNowcastGb = null, hispanicGb = null;
    try { forecastGb = DATA?.house?.gb; } catch(_){}
    try { forecastNowcastGb = (typeof _savedNowcastGb !== 'undefined') ? _savedNowcastGb : null; } catch(_){}
    try { hispanicGb = (typeof HISPANIC_GB !== 'undefined') ? HISPANIC_GB : null; } catch(_){}
    const buckets = { 'D>20':0, 'D10-20':0, 'D2.5-10':0, 'TOSS':0, 'R2.5-10':0, 'R10-20':0, 'R>20':0 };
    for (const m of margins){
      if (m > 20)      buckets['D>20']++;
      else if (m > 10) buckets['D10-20']++;
      else if (m > 2.5) buckets['D2.5-10']++;
      else if (m >= -2.5) buckets['TOSS']++;
      else if (m >= -10) buckets['R2.5-10']++;
      else if (m >= -20) buckets['R10-20']++;
      else              buckets['R>20']++;
    }
    const out = {
      chamber: currentChamber,
      state: stateAbbr,
      chamber_total_members_real: CHAMBER()[stateAbbr],
      chamber_features_in_topojson: s.features.length,
      features_with_null_margin: nullCount,
      seats_up_2026_feature_count: seatsUp2026(stateAbbr, s.features.length),
      seats_up_2026_fraction: SEATS_UP_FRAC_2026()[stateAbbr] ?? 'default (1.0)',
      gbCurrent_in_state_legs: gbCurrent,
      DATA_house_gb: forecastGb,
      _savedNowcastGb: forecastNowcastGb,
      HISPANIC_GB: hispanicGb,
      NAT_SIGMA, IDIO_SIGMA, MC_SIMS,
      odds,
      mean_margin: margins.length ? (margins.reduce((a,b)=>a+b,0) / margins.length).toFixed(2) : null,
      median_margin: margins.length ? margins[Math.floor(margins.length/2)].toFixed(2) : null,
      min_margin: margins[0]?.toFixed(2),
      max_margin: margins[margins.length-1]?.toFixed(2),
      bucket_counts: buckets,
      totalD_from_indexByState: s.totalD,
      totalR_from_indexByState: s.totalR,
    };
    console.log(`=== sldlDebug(${stateAbbr}) · ${currentChamber} ===`);
    console.log(JSON.stringify(out, null, 2));
    return out;
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
