/* ============================================================
   state-legs.js — State Legislatures page
   Click district → zoom to state. Left panel shows state seat
   standing (rating buckets) + hovered district info.
   ============================================================ */
(function(){
  const PAGE_ID = 'stateLegsPage';
  const TOPOJSON_URL = './sldl_national.topojson';
  const LEAN_CSV_URL = './national_district_results.csv';
  const HISPANIC_CSV_URL = './sldl_hispanic_share.csv';

  // Populated from sldl_hispanic_share.csv on load (GEOID → Hispanic share 0–1).
  // Empty until the file is present — adjustment is a no-op in that case.
  const SLDL_HISPANIC_SHARE = {};

  // Read HISPANIC_GB and HISPANIC_BASELINE from forecast.js's script scope.
  // Both are `const` declared at the top level of forecast.js, so they're
  // visible here by name as long as forecast.js loads first. Fall back to
  // safe defaults if forecast hasn't populated them yet.
  function getHispanicBaseline(){
    try { if (typeof HISPANIC_BASELINE !== 'undefined' && HISPANIC_BASELINE) return HISPANIC_BASELINE; } catch(_){}
    return { D: 53.06, R: 46.94 };  // same as forecast.js normalizePair(52, 46)
  }
  function getHispanicGb(){
    try { if (typeof HISPANIC_GB !== 'undefined' && HISPANIC_GB) return HISPANIC_GB; } catch(_){}
    return null;
  }
  const PREFERRED_OBJECT = 'districts';

  // Match forecast.js: VIS = { show:12.5, likely:7.5, lean:2.5 }
  // Colors mirror classifyColorAttr() in forecast.js exactly.
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
    if (a <= 2.5)  return RATINGS[3];                  // Tossup
    if (a <= 7.5)  return m > 0 ? RATINGS[2] : RATINGS[4]; // Lean
    if (a <= 12.5) return m > 0 ? RATINGS[1] : RATINGS[5]; // Likely
    return m > 0 ? RATINGS[0] : RATINGS[6];            // Safe
  }

  let loaded = false, loading = false;
  let features = null, byState = null;

  // Generic ballot assumed by each baseline when the topojson was built.
  const BASELINE_GB = {
    '2024_pres':    { D: 48.3, R: 49.8 },  // Trump +1.5
    '2016-20_comp': { D: 51.5, R: 48.5 },  // ≈ D+3
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

    // --- Hispanic swing adjustment (mirrors forecast.js getHouseModel) ---
    // If we have (a) this district's Hispanic share and (b) a current
    // Hispanic-subsample GB from forecast, shift the ratio by share × swing,
    // dampened by 0.75 (same factor forecast uses for CDs).
    const hShare = SLDL_HISPANIC_SHARE[props.GEOID] || 0;
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

  // Mirrors forecast.js getHouseModel() exactly:
  //   cdD = ratio.D * gb.D   (D's baseline lean × current D gen-ballot share)
  //   cdR = ratio.R * gb.R   (R's baseline lean × current R gen-ballot share)
  //   renormalize so cdD + cdR = 100, then margin = D - R
  // BOTH sides of the ratio are used on every projection.
  function projectMarginFromRatio(ratio, gbOverride){
    if (!ratio) return null;
    const m = gbOverride != null ? gbOverride
            : (gbCurrent != null && isFinite(gbCurrent)) ? gbCurrent : 0;
    const gbNow = { D: 50 + m/2, R: 50 - m/2 };
    const cdD = ratio.D * gbNow.D;   // uses ratio.D
    const cdR = ratio.R * gbNow.R;   // uses ratio.R
    const s   = cdD + cdR;
    if (s <= 0) return null;
    const projD = 100 * cdD / s;
    const projR = 100 * cdR / s;
    return projD - projR;
  }

  function attachRatios(){
    if (!features) return;
    for (const f of features){ const p = f.properties; if (p) p._ratio = buildRatio(p); }
  }

  function applyProjection(){
    if (!features) return;
    for (const f of features){ const p = f.properties; if (p) p._projMargin = projectMarginFromRatio(p._ratio); }
    byState = indexByState(features);
  }

  function mOf(p){ return (p && p._projMargin != null) ? p._projMargin : (p ? p.margin : null); }

  // --- Monte Carlo majority odds with correlated national swing -------
  // Each simulation: draw ONE national swing ~ N(0, NAT_SIGMA²) that shifts
  // every district's margin by the same amount, then add small independent
  // district noise ~ N(0, IDIO_SIGMA²), then count seats.
  //
  // This is the right model because district outcomes are highly correlated
  // — a wave moves every district together. Independent-district math
  // (Poisson-binomial) underestimates tails dramatically in close chambers
  // and produces absurd 3%/97% splits when truth is closer to 20%/80%.
  // Variance budget: per-district marginal stdev ≈ 20 pts, split into
  //   national  (correlated across all districts) ~ 6 pts
  //   idiosyncratic (independent per district)    ~ 19 pts
  // Var(dist) = 6² + 19² = 36 + 361 = 397  →  stdev ≈ 19.9
  // This keeps single-district uncertainty at ~20 (what you want) while
  // preventing absurdly wide chamber tails. A 20-pt NATIONAL swing would
  // be once-in-a-century; real waves are 5–8 pts. Most margin uncertainty
  // is district-specific (candidate quality, local issues, turnout).
  const NAT_SIGMA  = 6;
  const IDIO_SIGMA = 19;
  const MC_SIMS    = 5000;

  function gaussian(){
    // Box-Muller
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function winProbD(margin){
    // Kept for per-district display in the tooltip. Uses NAT_SIGMA so the
    // single-district display matches what the MC would average to.
    if (margin == null || !isFinite(margin)) return 0.5;
    return _nCDF(margin / NAT_SIGMA);
  }
  function _nCDF(z){
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z*z/2);
    const p = d * t * (0.3193815 + t*(-0.3565638 + t*(1.781478 + t*(-1.821256 + t*1.330274))));
    return z > 0 ? 1 - p : p;
  }

  // Chamber sizes + thresholds. Supermajority defaults to 2/3 where a single
  // rule doesn't apply. Verify these against your state's actual rules if you
  // want exact constitutional supermajority lines per state.
  const CHAMBER = {
    AL:105, AK:40, AZ:60, AR:100, CA:80, CO:65, CT:151, DE:41, FL:120, GA:180,
    HI:51, ID:70, IL:118, IN:100, IA:100, KS:125, KY:100, LA:105, ME:151, MD:141,
    MA:160, MI:110, MN:134, MS:122, MO:163, MT:100, NE:0, NV:42, NH:400, NJ:80,
    NM:70, NY:150, NC:120, ND:94, OH:99, OK:101, OR:60, PA:203, RI:75, SC:124,
    SD:70, TN:99, TX:150, UT:75, VT:150, VA:100, WA:98, WV:100, WI:99, WY:62,
  };

  // 2026 state house election schedule. Values are number of seats up in 2026.
  // - Odd-year states (LA, MS, NJ, VA) are NOT up in 2026 → 0.
  // - ND is staggered, 51/94 each cycle → 51.
  // - NE is unicameral, no lower house → 0.
  // - States absent from this map default to CHAMBER[st] (all seats up).
  const SEATS_UP_2026 = {
    LA: 0, MS: 0, NJ: 0, VA: 0,
    NE: 0,
    ND: 51,
    // NH, VT, etc. elect full chamber every 2 years → default.
  };
  function seatsUp2026(st){
    return SEATS_UP_2026[st] != null ? SEATS_UP_2026[st] : (CHAMBER[st] || 0);
  }

  // Exact Poisson-binomial distribution from per-district D win probs.
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
    return dist;  // dist[k] = P(D wins exactly k seats)
  }

  // For a given state: return probabilities of D majority, D supermajority,
  // R majority, R supermajority, plus expected D seat count.
  function chamberOdds(stateAbbr){
    const s = byState && byState[stateAbbr];
    if (!s || !s.features?.length) return null;
    const total = CHAMBER[stateAbbr] || s.features.length;
    const up = seatsUp2026(stateAbbr);
    if (up <= 0) return { total, up:0, notUp:true };

    // Pick the `up` most competitive seats (proxy for which are on the
    // ballot this cycle in staggered chambers). Lock the rest at current lean.
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
    // For D-perspective thresholds, we need D seats >= line.
    // For R, we need total - dSeats >= line, i.e. dSeats <= total - line.
    const rMajCap   = total - majLine;
    const rSuperCap = total - superLine;

    // Pre-extract margins for speed in the hot loop
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
  let gbHistory = null;        // array of { date: Date, margin: number (D-R pts) }
  let gbCurrent = null;        // most recent gen ballot margin (pts)

  // --- Generic ballot: read from forecast.js's DATA.house.gb ---------
  // forecast.js declares `const DATA = {...}` at classic-script top level.
  // That binding is shared across classic scripts in the same document, so
  // we can reference `DATA` directly from here. We poll because forecast's
  // polls fetch is async — DATA.house.gb is null until aggregation finishes.
  function readForecastGb(){
    try {
      // Prefer the NOWCAST gb (raw latest polls) over forecast-adjusted gb.
      // forecast.js stores it as a top-level `let _savedNowcastGb`.
      try {
        // eslint-disable-next-line no-undef
        if (typeof _savedNowcastGb !== 'undefined' && _savedNowcastGb
            && isFinite(_savedNowcastGb.D) && isFinite(_savedNowcastGb.R)) {
          return { margin: _savedNowcastGb.D - _savedNowcastGb.R, gb: _savedNowcastGb, src: 'nowcast' };
        }
      } catch(_) {}
      // Fallback: DATA.house.gb (whatever mode forecast is in).
      // eslint-disable-next-line no-undef
      if (typeof DATA === 'undefined') return { err: 'no-binding' };
      // eslint-disable-next-line no-undef
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
      if (features){
        attachRatios();          // rebuild ratios with current HISPANIC_GB applied
        applyProjection();
        if (svgEl()) render();
        if (currentZoom && currentZoom !== 'us') renderPanelForState(currentZoom);
      }
    }
    return true;
  }
  let _lastHGbKey = 'none';
  function startGbWatcher(){
    syncGbFromForecast();
    // Poll fast for 60s, then slow forever.
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

  // --- Generic ballot history (for sparklines only) -------------------
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
          for (const k of keys){
            if (o[k] != null && isFinite(+o[k])) return +o[k];
          }
          return NaN;
        };
        const dem = getNum(p, ['dem','democrat','democrats','democratic']);
        const rep = getNum(p, ['rep','republican','republicans','gop']);
        if (!isFinite(dem) || !isFinite(rep)) return null;
        return { date: d, margin: dem - rep };
      }).filter(Boolean).sort((a,b) => a.date - b.date);
      if (!polls.length) return;
      // Smooth: rolling 14-poll average to get a clean trajectory
      const W = 14;
      const series = [];
      for (let i = 0; i < polls.length; i++){
        const lo = Math.max(0, i - W + 1);
        const slice = polls.slice(lo, i + 1);
        const avg = slice.reduce((s,p)=>s+p.margin,0) / slice.length;
        series.push({ date: polls[i].date, margin: avg });
      }
      gbHistory = series;
      // NOTE: do NOT set gbCurrent here — that now comes from forecast.js's
      // DATA.house.gb via syncGbFromForecast() for consistency.
    } catch(e){ console.warn('[state-legs] gb history unavailable', e); }
  }

  const root       = () => document.getElementById(PAGE_ID);
  const svgEl      = () => root() && root().querySelector('svg[data-sldl-map]');
  const zoomSelect = () => root() && root().querySelector('[data-sldl-zoom-select]');
  const usBtn      = () => root() && root().querySelector('[data-sldl-zoom="us"]');
  const panelEl    = () => root() && root().querySelector('.sldlStatePanel');
  // Card lives in the LEFT column (sldl). Map lives in the RIGHT column (sldu).
  const stageEl    = () => root() && root().querySelector('.modeCol[data-mode="sldl"] .mapStage');
  const mapStageEl = () => root() && root().querySelector('.modeCol[data-mode="sldu"] .mapStage');

  function hideOldTooltips(){
    const s = root() && root().querySelector('[data-sldl-sticky]');
    const c = root() && root().querySelector('[data-sldl-cursor]');
    if (s) s.style.display = 'none';
    if (c) c.style.display = 'none';
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
          <div class="sldlPanelSub">State House</div>
        </div>
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

    // Mode toggle wiring — inside card so it doesn't block map interactions.
    div.querySelectorAll('[data-mode-toggle] button').forEach(b => {
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        fillMode = b.getAttribute('data-mode');
        div.querySelectorAll('[data-mode-toggle] button').forEach(x => x.classList.toggle('active', x===b));
        render();
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
      #stateLegsPage .sldlStatePanel.show{display:block;}
      #stateLegsPage .sldlPanelHeader{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:6px;}
      #stateLegsPage .sldlModeToggle{display:inline-flex;border:1px solid rgba(0,0,0,0.15);border-radius:4px;overflow:hidden;pointer-events:auto;}
      #stateLegsPage .sldlModeToggle button{padding:3px 9px;background:transparent;border:none;cursor:pointer;font-size:9px;font-weight:800;color:var(--muted,#6b7280);letter-spacing:0.04em;text-transform:uppercase;}
      #stateLegsPage .sldlModeToggle button.active{background:var(--ink,#111);color:#fff;}
      #stateLegsPage .sldlOddsRow{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-top:10px;}
      #stateLegsPage .sldlOddsRow .cell{background:rgba(0,0,0,0.03);border-radius:4px;padding:5px 6px;text-align:center;}
      #stateLegsPage .sldlOddsRow .lbl{font-size:8px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.03em;margin-bottom:1px;}
      #stateLegsPage .sldlOddsRow .val{font-size:12px;font-weight:800;font-variant-numeric:tabular-nums;}
      #stateLegsPage .sldlOddsRow .val.d{color:var(--blue,#2563eb);}
      #stateLegsPage .sldlOddsRow .val.r{color:var(--red,#dc2626);}
      #stateLegsPage .sldlOddsNone{font-size:10px;color:var(--muted);text-align:center;padding:6px 0;font-style:italic;}
      #stateLegsPage .sldlPanelHeader{display:flex;align-items:baseline;justify-content:space-between;gap:6px;margin-bottom:6px;}
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

    // Cursor-following tooltip — lives on body so it can escape the map box.
    if (!document.getElementById('sldlCursorTip')){
      const tip = document.createElement('div');
      tip.id = 'sldlCursorTip';
      tip.style.cssText = 'position:fixed;z-index:9999;pointer-events:none;display:none;'
        + 'background:var(--panel,#fff);border:1px solid rgba(0,0,0,0.12);'
        + 'border-radius:6px;padding:8px 10px;font-size:11px;line-height:1.4;'
        + 'font-weight:600;color:var(--ink,#111);box-shadow:0 4px 16px rgba(0,0,0,0.12);'
        + 'min-width:180px;max-width:240px;';
      document.body.appendChild(tip);
    }

    // Fixed info panel BELOW the map — DISABLED, replaced by sldlStatePanel card.
    const stageForPanel = null;
    if (false && stageForPanel && !stageForPanel.querySelector('.sldlInfoPanel')){
      const wrap = document.createElement('div');
      wrap.className = 'sldlInfoPanel';
      wrap.innerHTML = `
        <div class="sldlInfoHeader">
          <div class="sldlModeToggle" data-mode-toggle>
            <button type="button" data-mode="model"   class="active">Model</button>
            <button type="button" data-mode="ratings">Ratings</button>
          </div>
          <div class="sldlChamberOdds" data-chamber-odds>Hover or click a state</div>
        </div>
      `;
      stageForPanel.appendChild(wrap);

      const tStyle = document.createElement('style');
      tStyle.textContent = `
        #stateLegsPage .sldlInfoPanel{
          display:flex;flex-direction:column;gap:8px;
          margin-top:10px;padding:10px 14px;
          background:var(--panel,#fff);border:1px solid rgba(0,0,0,0.1);
          border-radius:6px;font-size:11px;line-height:1.4;font-weight:600;
          color:var(--ink,#111);
        }
        #stateLegsPage .sldlInfoHeader{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
        #stateLegsPage .sldlModeToggle{display:inline-flex;border:1px solid rgba(0,0,0,0.15);border-radius:4px;overflow:hidden;}
        #stateLegsPage .sldlModeToggle button{
          padding:4px 10px;background:transparent;border:none;cursor:pointer;
          font-size:10px;font-weight:700;color:var(--muted,#6b7280);letter-spacing:0.03em;text-transform:uppercase;
        }
        #stateLegsPage .sldlModeToggle button.active{background:var(--ink,#111);color:#fff;}
        #stateLegsPage .sldlChamberOdds{font-size:11px;font-weight:700;color:var(--muted,#6b7280);}
        #stateLegsPage .sldlChamberOdds .pct{color:var(--ink,#111);font-variant-numeric:tabular-nums;}
      `;
      document.head.appendChild(tStyle);

      wrap.querySelectorAll('[data-mode-toggle] button').forEach(b => {
        b.addEventListener('click', () => {
          fillMode = b.getAttribute('data-mode');
          wrap.querySelectorAll('[data-mode-toggle] button').forEach(x => x.classList.toggle('active', x===b));
          render();
        });
      });
    }
  }

  let fillMode = 'model';

  function ratingFillFor(m){
    const r = rateDistrict(m);
    return r ? r.color : '#d0d0d0';
  }

  // Cursor tooltip helpers.
  const tipEl = () => document.getElementById('sldlCursorTip');
  function showTip(props, ev){
    const el = tipEl(); if (!el) return;
    const m = mOf(props);
    const r = rateDistrict(m);
    const fm = fmtMargin(m);
    const wpD = Math.round(winProbD(m) * 100);
    const mColor = m == null ? 'var(--muted)' : (m >= 0 ? 'var(--blue,#2563eb)' : 'var(--red,#dc2626)');
    el.innerHTML = `
      <div style="font-weight:800;font-size:12px;margin-bottom:4px;">
        ${props.state_abbr} · ${props.NAMELSAD || 'District'}
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
        ${r ? `<span style="display:inline-block;padding:2px 7px;border-radius:3px;background:${r.color};color:${r.light?'#1f2937':'#fff'};font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.03em;">${r.label}</span>` : ''}
        <span style="font-weight:800;color:${mColor};">${fm}</span>
      </div>
      <div style="font-size:9px;color:var(--muted);font-weight:600;">
        Win prob · D ${wpD}% · R ${100-wpD}%
      </div>`;
    el.style.display = 'block';
    moveTip(ev);
  }
  function moveTip(ev){
    const el = tipEl(); if (!el || el.style.display === 'none') return;
    const pad = 14;
    let x = ev.clientX + pad, y = ev.clientY + pad;
    const rect = el.getBoundingClientRect();
    if (x + rect.width  > window.innerWidth)  x = ev.clientX - rect.width  - pad;
    if (y + rect.height > window.innerHeight) y = ev.clientY - rect.height - pad;
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
  }
  function hideTip(){ const el = tipEl(); if (el) el.style.display = 'none'; }
  const NOT_UP_2026_STATES = new Set(['LA','MS','NJ','VA','NE']);

  function fillFor(m, props){
    if (props && NOT_UP_2026_STATES.has(props.state_abbr)) return '#e5e7eb';
    if (m == null || !isFinite(m)) return '#d0d0d0';
    return fillMode === 'ratings' ? ratingFillFor(m) : marginColor(m);
  }

  function showChamberOdds(stateAbbr){
    const el = document.querySelector('#stateLegsPage [data-chamber-odds]');
    if (!el) return;
    if (!stateAbbr){ el.innerHTML = 'US view · hover a state or click to zoom'; return; }
    const o = chamberOdds(stateAbbr);
    if (!o){ el.innerHTML = `${stateAbbr}: no data`; return; }
    if (o.notUp){
      el.innerHTML = `<span style="font-weight:800;color:var(--ink,#111);">${stateAbbr}</span> <span style="color:var(--muted);">· not up in 2026 (${stateAbbr==='NE'?'unicameral':'odd-year state'})</span>`;
      return;
    }
    const pct = v => (v*100).toFixed(v>0.995||v<0.005 ? 1 : 0) + '%';
    const stagLabel = o.up < o.total ? ` · ${o.up}/${o.total} up` : ` · ${o.total} seats`;
    el.innerHTML = `
      <span style="font-weight:800;color:var(--ink,#111);">${stateAbbr}${stagLabel} · E[D]=${o.eDemSeats.toFixed(0)}</span>
      &nbsp;·&nbsp;
      D majority <span class="pct">${pct(o.pDmaj)}</span>
      &nbsp;·&nbsp;
      D supermaj <span class="pct">${pct(o.pDsup)}</span>
      &nbsp;·&nbsp;
      R majority <span class="pct">${pct(o.pRmaj)}</span>
      &nbsp;·&nbsp;
      R supermaj <span class="pct">${pct(o.pRsup)}</span>
    `;
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
    const states = Object.keys(byState).sort();
    sel.innerHTML = '<option value="">State…</option>' + states.map(s=>`<option value="${s}">${s}</option>`).join('');
  }

  function fmtMargin(m){ if (m==null||!isFinite(m)) return '—'; return (m>=0?'D+':'R+')+Math.abs(m).toFixed(1); }
  function baselineLabel(b){ if(!b) return '—'; if (b==='2024_pres') return '2024 pres'; if (b==='2016-20_comp') return '2016–20 comp.'; return b; }

  function hex(c){ if(!c) return '#888'; c=c.trim(); if(c.startsWith('#')) return c.length===4?'#'+[...c.slice(1)].map(x=>x+x).join(''):c; const m=c.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/); return m?'#'+[m[1],m[2],m[3]].map(v=>(+v).toString(16).padStart(2,'0')).join(''):'#888'; }
  function mix(a,b,k){ const pa=a.match(/\w\w/g).map(h=>parseInt(h,16)); const pb=b.match(/\w\w/g).map(h=>parseInt(h,16)); return '#'+pa.map((v,i)=>Math.round(v+(pb[i]-v)*k).toString(16).padStart(2,'0')).join(''); }
  function marginColor(m){
    if (m==null||!isFinite(m)) return '#d0d0d0';
    // Tossup (±2.5) gets the forecast.js yellow directly.
    if (Math.abs(m) <= 2.5) return '#fbbf24';
    const cs=getComputedStyle(document.documentElement);
    const blue=hex(cs.getPropertyValue('--blue')||'#2563eb');
    const red =hex(cs.getPropertyValue('--red') ||'#dc2626');
    const t=Math.max(-1,Math.min(1,m/40));
    return t>=0?mix('#f4f4f4',blue,t):mix('#f4f4f4',red,-t);
  }

  function renderPanelForState(stateAbbr){
    const p = panelEl(); if (!p) return;
    if (!stateAbbr || !byState[stateAbbr]){ p.classList.remove('show'); return; }
    const s = byState[stateAbbr];
    p.classList.add('show');
    p.querySelector('.sldlPanelTitle').textContent = stateAbbr;
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

    // Odds row — majority/supermajority for both parties via Poisson-binomial.
    const oddsEl = p.querySelector('[data-odds-row]');
    if (oddsEl){
      const o = chamberOdds(stateAbbr);
      if (!o) { oddsEl.innerHTML = ''; }
      else if (o.notUp) {
        oddsEl.innerHTML = `<div class="sldlOddsNone" style="grid-column:1/-1;">Not up in 2026 · ${stateAbbr==='NE'?'unicameral':'odd-year state'}</div>`;
      } else {
        const pct = v => (v*100).toFixed(v>0.995||v<0.005 ? 1 : 0) + '%';
        const upLbl = o.up < o.total ? ` · ${o.up}/${o.total} up` : '';
        oddsEl.innerHTML = `
          <div class="cell"><div class="lbl">D Maj</div><div class="val d">${pct(o.pDmaj)}</div></div>
          <div class="cell"><div class="lbl">D Super</div><div class="val d">${pct(o.pDsup)}</div></div>
          <div class="cell"><div class="lbl">R Maj</div><div class="val r">${pct(o.pRmaj)}</div></div>
          <div class="cell"><div class="lbl">R Super</div><div class="val r">${pct(o.pRsup)}</div></div>`;
      }
    }

    const dst = p.querySelector('[data-district]');
    dst.innerHTML = '<div class="dstPlaceholder">Hover a district</div>';
  }

  // Normal CDF approximation for win probability from margin
  function normalCDF(z){
    // Abramowitz & Stegun 7.1.26
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804 * Math.exp(-z*z/2);
    let p = d * t * (0.3193815 + t*(-0.3565638 + t*(1.781478 + t*(-1.821256 + t*1.330274))));
    return z >= 0 ? 1 - p : p;
  }
  // SD in percentage points — tuned so a D+5 district reads ~80% D
  const WIN_PROB_SD = 6;
  function winProbD(margin){
    if (margin == null || !isFinite(margin)) return null;
    return normalCDF(margin / WIN_PROB_SD);
  }

  // Build SVG path for win-probability sparkline over gen-ballot history.
  // district.margin represents the district's projected margin at the
  // current gen ballot. ratio = district.margin - gbCurrent is fixed.
  // For each historical day: district_margin(t) = gbHistory[t] + ratio
  // → win prob via normal CDF.
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
    // Dem area path (under line)
    let demArea = `M 0 ${H} `;
    let line = '';
    pts.forEach((p, i) => {
      const x = xOf(p.t), y = yOf(p.y);
      demArea += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
      line += (i === 0 ? 'M' : 'L') + ` ${x.toFixed(1)} ${y.toFixed(1)} `;
    });
    demArea += `L ${W} ${H} Z`;
    // 50% reference line
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
    const wpD = winProbD(mProj);
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
      <div class="dstWpSection">${wpBlock}</div>`;
  }

  function render(){
    const svg = svgEl(); if (!svg || !features) return;
    // Internal coordinate space. Bumped to 2880x1800 (3x the display size)
    // so d3.geoPath has enough sub-pixel precision to stay crisp when
    // users zoom in 10–24x. Browser scales the viewBox down to CSS size via
    // preserveAspectRatio, so on-screen size is unchanged but the underlying
    // path data has 3x the integer resolution to round against.
    const W = 2880, H = 1800;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    svg.setAttribute('shape-rendering','geometricPrecision');
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.width = '';
    svg.style.height = '';

    const feats = currentZoom === 'us' ? features : (byState[currentZoom] ? byState[currentZoom].features : []);
    // Filter (1) AK/HI at the national view and (2) any feature with a
    // globe-sized bbox. 16 districts in this topojson have inside-out polygon
    // winding (CO-59, GA-134/150, ID-29, MD-3, MA, PA, TN, VA, WA, WI, WY…),
    // so d3.geoBounds returns [[-180,-90],[180,90]]. fitExtent then scales the
    // projection to the whole globe and every real district collapses to a dot
    // while the broken ones render as giant red rectangles covering everything.
    const isSane = f => {
      const b = d3.geoBounds(f);
      return isFinite(b[0][0]) && (b[1][0]-b[0][0]) < 30 && (b[1][1]-b[0][1]) < 30;
    };
    const conusFeats = (currentZoom === 'us'
      ? feats.filter(f => { const fp = f.properties?.STATEFP; return fp !== '02' && fp !== '15'; })
      : feats
    ).filter(isSane);
    const fc = { type:'FeatureCollection', features: conusFeats };
    const projection = d3.geoMercator().fitExtent([[54,54],[W-54,H-54]], fc);
    const path = d3.geoPath(projection);

    const sel = d3.select(svg);
    sel.selectAll('g.sldlZoomLayer').remove();
    sel.selectAll('path').remove();

    // All paths go in a zoomable <g>. d3.zoom applies a transform to it.
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
        // At US level, hovering a district shows that state's card with district details.
        // At state zoom, card already shown — just update district row.
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

    // At US zoom, show a prompt card; at state zoom, show that state.
    if (currentZoom === 'us') {
      const p = panelEl();
      if (p){
        p.classList.add('show');
        p.querySelector('.sldlPanelTitle').textContent = 'US';
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

    // d3.zoom — wheel/pinch to zoom, drag to pan. Scale 1–24x.
    // Detach any previous zoom behavior first, then re-attach fresh one.
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
    // Only reset zoom when the view MODE changes (US ↔ state).
    // Preserve existing pan/zoom across data-update re-renders.
    if (_lastZoomMode !== currentZoom){
      _lastZoomMode = currentZoom;
      _currentZoomTransform = d3.zoomIdentity;
      sel.call(zoom.transform, d3.zoomIdentity);
    } else if (_currentZoomTransform && _currentZoomTransform !== d3.zoomIdentity){
      // Re-apply saved transform to the fresh zoom behavior
      sel.call(zoom.transform, _currentZoomTransform);
    }
  }
  let _lastZoomMode = null;
  let _currentZoomTransform = null;

  async function load(){
    if (loaded || loading) return;
    loading = true;
    try {
      const res = await fetch(TOPOJSON_URL);
      if (!res.ok) throw new Error('fetch ' + res.status);
      const topo = await res.json();
      const objName = (topo.objects && topo.objects[PREFERRED_OBJECT]) ? PREFERRED_OBJECT : Object.keys(topo.objects||{})[0];
      if (!objName) throw new Error('no topojson objects');
      const fc = topojson.feature(topo, topo.objects[objName]);
      features = fc.features || [];

      // Fetch the lean CSV and join by GEOID. CSV schema:
      //   GEOID,dem,rep,total,state,baseline_source,dem_pct,margin
      try {
        const csvRes = await fetch(LEAN_CSV_URL, { cache:'no-store' });
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
        for (const f of features){
          const p = f.properties; if (!p) continue;
          const lean = leanByGeoid[p.GEOID];
          if (lean){
            p.dem_pct  = lean.dem_pct;
            p.margin   = lean.margin;
            p.baseline = lean.baseline;
            matched++;
          }
        }
        console.log(`[state-legs] joined lean data: ${matched}/${features.length} districts`);
      } catch (e){
        console.error('[state-legs] lean csv load failed', e);
      }

      // Optional: fetch Hispanic share per SLDL. If missing, adjustment is a no-op.
      // CSV schema: GEOID,hispanic,total,h_share
      try {
        const hRes = await fetch(HISPANIC_CSV_URL, { cache:'no-store' });
        if (hRes.ok){
          const text = await hRes.text();
          const lines = text.split(/\r?\n/).filter(Boolean);
          const hdr = lines[0].split(',');
          const iG = hdr.indexOf('GEOID');
          const iH = hdr.indexOf('h_share');
          if (iG >= 0 && iH >= 0){
            let n = 0, skipped = 0;
            for (let i = 1; i < lines.length; i++){
              const c = lines[i].split(',');
              const geoid = c[iG];
              const h = parseFloat(c[iH]);
              if (geoid && isFinite(h)){
                // Match forecast.js CD behavior: only 50%+ Hispanic districts
                // get the adjustment. Below that, treat as h_share = 0.
                if (h >= 0.5){ SLDL_HISPANIC_SHARE[geoid] = h; n++; }
                else skipped++;
              }
            }
            console.log(`[state-legs] Hispanic share: ${n} districts ≥50% (${skipped} below threshold, ignored)`);
          }
        } else {
          console.log('[state-legs] no Hispanic CSV (adjustment disabled)');
        }
      } catch (e){
        console.log('[state-legs] Hispanic CSV not available (adjustment disabled)');
      }

      attachRatios();
      applyProjection();
      populateStateSelect();
      hideOldTooltips();
      injectPanel();
      // Detect missing partisan data — helpful diagnostic
      const hasAnyMargin = features.some(f => f.properties && f.properties.margin != null && isFinite(f.properties.margin));
      if (!hasAnyMargin) {
        const stage = stageEl();
        if (stage && !stage.querySelector('.sldlDataBanner')) {
          const b = document.createElement('div');
          b.className = 'sldlDataBanner';
          b.textContent = 'No partisan data loaded — upload sldl_national.topojson with margin/dem_pct/baseline properties';
          stage.appendChild(b);
        }
      }
      await loadGbHistory();
      startGbWatcher();
      loaded = true;
      requestAnimationFrame(() => requestAnimationFrame(render));
    } catch(e){ console.error('[state-legs] load failed', e); }
    finally { loading = false; }
  }

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
    window.addEventListener('resize', () => { if (loaded) render(); });
  }

  function handleTabClick(ev){
    const btn = ev.target.closest('.pageTab');
    if (!btn) return;
    const page = btn.dataset.page;
    const r = root(); if (!r) return;
    if (page === 'state-legs'){
      r.style.display = 'grid';
      r.classList.add('sldl-active');
      load();
      if (loaded) requestAnimationFrame(() => requestAnimationFrame(render));
    } else {
      r.classList.remove('sldl-active');
      r.style.display = 'none';
    }
  }

  function init(){
    const r = root(); if (!r) return;
    wireControls();
    const nav = document.querySelector('.pageTabs');
    // Attach in capture AND bubble phase so we run regardless of host switcher order
    if (nav) {
      nav.addEventListener('click', handleTabClick);
      nav.addEventListener('click', handleTabClick, true);
    }
    r.style.display = 'none';
  }

  // --- Debug helper: window.sldlDebug('GA') dumps everything needed to
  //     diagnose chamber odds bugs. Paste the output back to Claude.
  window.sldlDebug = function(stateAbbr){
    if (!stateAbbr) stateAbbr = 'GA';
    if (!byState || !byState[stateAbbr]){
      return { error: 'no state ' + stateAbbr, available: byState ? Object.keys(byState).sort() : null };
    }
    const s = byState[stateAbbr];
    const margins = s.features.map(f => f.properties._projMargin).filter(x => x != null).sort((a,b)=>a-b);
    const nullCount = s.features.length - margins.length;
    const odds = chamberOdds(stateAbbr);

    // Forecast-side globals
    let forecastGb = null, forecastNowcastGb = null, hispanicGb = null;
    try { forecastGb = DATA?.house?.gb; } catch(_){}
    try { forecastNowcastGb = (typeof _savedNowcastGb !== 'undefined') ? _savedNowcastGb : null; } catch(_){}
    try { hispanicGb = (typeof HISPANIC_GB !== 'undefined') ? HISPANIC_GB : null; } catch(_){}

    // Histogram of projected margins for diagnosis
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
      state: stateAbbr,
      chamber_total: CHAMBER[stateAbbr],
      chamber_features_in_topojson: s.features.length,
      features_with_null_margin: nullCount,
      seats_up_2026: SEATS_UP_2026[stateAbbr] ?? 'default (all)',
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
    console.log('=== sldlDebug('+stateAbbr+') ===');
    console.log(JSON.stringify(out, null, 2));
    return out;
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
