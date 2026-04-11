/* ============================================================
   state-legs.js — State Legislatures page
   Click district → zoom to state. Left panel shows state seat
   standing (rating buckets) + hovered district info.
   ============================================================ */
(function(){
  const PAGE_ID = 'stateLegsPage';
  const TOPOJSON_URL = './sldl_national.topojson';
  const LEAN_CSV_URL = './national_district_results.csv';
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

  // Build a per-district { D, R } ratio pair — the district's baseline share
  // divided by the baseline GB share, separately for each party. Mirrors
  // forecast.js getHouseModel, where DATA.house.ratios[did] = { D, R }.
  // Your topojson stores dem_pct + margin only, so we derive rep_pct from
  // the identity margin = dem - rep  =>  rep = dem - margin (exact, not approx).
  function buildRatio(props){
    const demRaw = props.dem_pct;
    const marginPts = props.margin;
    if (demRaw == null || marginPts == null || !isFinite(demRaw) || !isFinite(marginPts)) return null;

    // dem_pct is stored as a 0–1 decimal in this topojson; margin is in points.
    // Normalize both to the same 0–100 "percent" scale.
    const demPct = (Math.abs(demRaw) <= 1.5) ? demRaw * 100 : demRaw;
    const repPct = demPct - marginPts;   // D - R = margin  =>  R = D - margin

    // Baseline generic ballot the topojson was built against.
    const gbBase = BASELINE_GB[props.baseline] || { D: 50, R: 50 };
    if (gbBase.D <= 0 || gbBase.R <= 0) return null;

    // Two independent ratios — one per party. Both used at projection time.
    const ratioD = demPct / gbBase.D;
    const ratioR = repPct / gbBase.R;

    // Cache derived values on the props so you can inspect them in devtools.
    props._demPct = demPct;
    props._repPct = repPct;

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
  let currentZoom = 'us';
  let gbHistory = null;        // array of { date: Date, margin: number (D-R pts) }
  let gbCurrent = null;        // most recent gen ballot margin (pts)

  // --- Generic ballot: read from forecast.js's DATA.house.gb ----------
  // forecast.js loads as a classic script and declares `const DATA` at the
  // top level. Since both files share the same script realm, we can read
  // it directly by name. We poll because forecast's polls fetch is async.
  function readForecastGb(){
    try {
      // eslint-disable-next-line no-undef
      const gb = (typeof DATA !== 'undefined') && DATA && DATA.house && DATA.house.gb;
      if (gb && isFinite(gb.D) && isFinite(gb.R)) return gb.D - gb.R; // D-R margin pts
    } catch(_) {}
    return null;
  }
  function syncGbFromForecast(){
    const m = readForecastGb();
    if (m != null && m !== gbCurrent){
      gbCurrent = m;
      if (features){
        applyProjection();
        if (svgEl()) render();
        if (currentZoom && currentZoom !== 'us') renderPanelForState(currentZoom);
      }
      return true;
    }
    return false;
  }
  function startGbWatcher(){
    if (syncGbFromForecast()) { /* got it on first tick */ }
    // Poll for up to 30s in case forecast.js polls load slowly, then every 15s
    // for updates. Cheap — just 2 property reads per tick.
    let tries = 0;
    const fast = setInterval(() => {
      tries++;
      if (syncGbFromForecast() || tries > 60) clearInterval(fast);
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
  const stageEl    = () => root() && root().querySelector('.modeCol[data-mode="sldl"] .mapStage');

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
        <div class="sldlPanelTitle">—</div>
        <div class="sldlPanelSub">State House</div>
      </div>
      <div class="sldlSeatLine">
        <span class="dSide">D <b data-seats-d>—</b></span>
        <span class="sep">|</span>
        <span class="rSide">R <b data-seats-r>—</b></span>
      </div>
      <div class="sldlRatingBar" data-rating-bar></div>
      <div class="sldlRatingLabels" data-rating-labels></div>
      <div class="sldlPanelDivider"></div>
      <div class="sldlPanelDistrict" data-district>
        <div class="dstPlaceholder">Hover a district</div>
      </div>`;
    stage.appendChild(div);

    if (document.getElementById('sldlPanelStyles')) return;
    const style = document.createElement('style');
    style.id = 'sldlPanelStyles';
    style.textContent = `
      #stateLegsPage.sldl-active{display:grid !important;}
      #stateLegsPage .sldlStatePanel{position:absolute;top:8px;left:8px;width:240px;background:var(--panel,#fff);border:1px solid var(--line,rgba(0,0,0,0.12));border-radius:6px;padding:10px 12px;font-size:10px;line-height:1.35;font-weight:600;box-shadow:0 2px 6px rgba(0,0,0,0.08);pointer-events:none;z-index:3;display:none;}
      #stateLegsPage .sldlStatePanel.show{display:block;}
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
      @media (max-width: 979px){
        #stateLegsPage .sldlStatePanel{position:relative;top:0;left:0;width:auto;margin:8px;box-shadow:none;}
      }
    `;
    document.head.appendChild(style);
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
      <div class="dstWpSection">${wpBlock}</div>
      <div class="dstRow" style="margin-top:4px;"><span>Baseline</span><span class="v" style="font-size:9px;">${baselineLabel(props.baseline)} ${fmtMargin(props.margin)}</span></div>`;
  }

  function render(){
    const svg = svgEl(); if (!svg || !features) return;
    // Use a fixed internal coordinate space like the Congress map does.
    // CSS (.mapSvg height:280px width:100%) handles actual display size;
    // preserveAspectRatio scales the fixed viewBox into the CSS box.
    const W = 960, H = 600;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
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
    const projection = d3.geoMercator().fitExtent([[18,18],[W-18,H-18]], fc);
    const path = d3.geoPath(projection);

    const sel = d3.select(svg);
    sel.selectAll('path').remove();
    sel.on('click', function(ev){
      if (ev.target.tagName !== 'path' && currentZoom !== 'us'){
        currentZoom = 'us';
        const zs = zoomSelect(); if (zs) zs.value = '';
        const ub = usBtn(); if (ub) ub.classList.add('active');
        render();
      }
    });
    sel.selectAll('path')
      .data(conusFeats, d => d.properties.GEOID)
      .join('path')
        .attr('d', path)
        .attr('fill', d => marginColor(mOf(d.properties)))
        .attr('stroke','rgba(255,255,255,0.4)')
        .attr('stroke-width', currentZoom === 'us' ? 0.5 : 0.8)
      .on('mouseenter', function(){ d3.select(this).attr('stroke','#1f2937').attr('stroke-width',1.2); })
      .on('mouseleave', function(){ d3.select(this).attr('stroke','rgba(255,255,255,0.4)').attr('stroke-width', currentZoom==='us'?0.5:0.8); })
      .on('mousemove', function(ev, d){ renderPanelDistrict(d.properties); })
      .on('click', function(ev, d){
        ev.stopPropagation();
        const st = d.properties.state_abbr; if (!st) return;
        currentZoom = st;
        const zs = zoomSelect(); if (zs) zs.value = st;
        const ub = usBtn(); if (ub) ub.classList.remove('active');
        renderPanelForState(st);
        render();
      });

    if (currentZoom === 'us') { const p = panelEl(); if (p) p.classList.remove('show'); }
    else renderPanelForState(currentZoom);
  }

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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
