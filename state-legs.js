/* ============================================================
   state-legs.js — State Legislatures page
   Click district → zoom to state. Left panel shows state seat
   standing (rating buckets) + hovered district info.
   ============================================================ */
(function(){
  const PAGE_ID = 'stateLegsPage';
  const TOPOJSON_URL = './sldl_national.topojson';
  const PREFERRED_OBJECT = 'districts';

  const RATINGS = [
    { key:'SD', label:'Safe D', color:'#1e40af', light:false },
    { key:'LD', label:'Lkly D', color:'#4a7ce0', light:false },
    { key:'TD', label:'Lean D', color:'#8eb4f2', light:true  },
    { key:'TU', label:'Toss',   color:'#f5c542', light:true  },
    { key:'TR', label:'Lean R', color:'#f29a9a', light:true  },
    { key:'LR', label:'Lkly R', color:'#e05555', light:false },
    { key:'SR', label:'Safe R', color:'#991b1b', light:false },
  ];
  function rateDistrict(m){
    if (m == null || !isFinite(m)) return null;
    if (m >  15) return RATINGS[0];
    if (m >   5) return RATINGS[1];
    if (m >   1) return RATINGS[2];
    if (m >= -1) return RATINGS[3];
    if (m >= -5) return RATINGS[4];
    if (m >= -15)return RATINGS[5];
    return RATINGS[6];
  }

  let loaded = false, loading = false;
  let features = null, byState = null;
  let currentZoom = 'us';

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
      #stateLegsPage .sldlStatePanel{position:absolute;top:8px;left:8px;width:220px;background:var(--panel,#fff);border:1px solid var(--line,rgba(0,0,0,0.12));border-radius:6px;padding:10px 12px;font-size:10px;line-height:1.35;font-weight:600;box-shadow:0 2px 6px rgba(0,0,0,0.08);pointer-events:none;z-index:3;display:none;}
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
      #stateLegsPage .dstWpLabel{font-size:8px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:3px;}
      #stateLegsPage .dstWpBar{display:flex;height:8px;border-radius:2px;overflow:hidden;border:1px solid var(--line,rgba(0,0,0,0.1));}
      #stateLegsPage .dstWpFill.d{background:var(--blue,#2563eb);}
      #stateLegsPage .dstWpFill.r{background:var(--red,#dc2626);}
      #stateLegsPage .dstWpLabels{display:flex;justify-content:space-between;margin-top:3px;font-size:10px;font-weight:800;font-variant-numeric:tabular-nums;}
      #stateLegsPage .dstWpLabels .d{color:var(--blue,#2563eb);}
      #stateLegsPage .dstWpLabels .r{color:var(--red,#dc2626);}
      #stateLegsPage .modeCol[data-mode="sldl"] .mapSvg path{cursor:pointer;}
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
      const m = p.margin;
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

  function renderPanelDistrict(props){
    const p = panelEl(); if (!p || !p.classList.contains('show')) return;
    const dst = p.querySelector('[data-district]'); if (!dst) return;
    const r = rateDistrict(props.margin);
    const marginClass = props.margin == null ? '' : (props.margin >= 0 ? 'd' : 'r');
    const wpD = winProbD(props.margin);
    const wpDPct = wpD != null ? Math.round(wpD * 100) : null;
    const wpRPct = wpDPct != null ? (100 - wpDPct) : null;
    const wpBar = wpD != null
      ? `<div class="dstWpBar"><div class="dstWpFill d" style="width:${wpDPct}%"></div><div class="dstWpFill r" style="width:${wpRPct}%"></div></div>
         <div class="dstWpLabels"><span class="d">D ${wpDPct}%</span><span class="r">R ${wpRPct}%</span></div>`
      : '';
    dst.innerHTML = `
      <div class="dstName">${props.NAMELSAD || 'District'}</div>
      <div class="dstRow"><span>Rating</span><span>${r ? `<span class="dstRating ${r.light?'light':''}" style="background:${r.color};">${r.label}</span>` : '—'}</span></div>
      <div class="dstRow"><span>Margin</span><span class="v ${marginClass}">${fmtMargin(props.margin)}</span></div>
      <div class="dstWpSection">
        <div class="dstWpLabel">Win Probability</div>
        ${wpBar}
      </div>
      <div class="dstRow" style="margin-top:4px;"><span>Baseline</span><span class="v" style="font-size:9px;">${baselineLabel(props.baseline)}</span></div>`;
  }

  function render(){
    const svg = svgEl(); if (!svg || !features) return;
    const stage = svg.parentElement;
    const rect = stage ? stage.getBoundingClientRect() : { width:600, height:280 };
    // If stage isn't laid out yet, retry on next frame
    if (!rect.width || !rect.height) {
      requestAnimationFrame(render);
      return;
    }
    const w = Math.max(1, Math.min(1200, rect.width  || 600));
    const h = Math.max(1, Math.min(600,  rect.height || 280));
    svg.setAttribute('width', w); svg.setAttribute('height', h);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    svg.style.width = w+'px'; svg.style.height = h+'px';
    svg.style.maxWidth='100%'; svg.style.maxHeight='100%';

    const feats = currentZoom === 'us' ? features : (byState[currentZoom] ? byState[currentZoom].features : []);
    const fc = { type:'FeatureCollection', features: feats };
    const projection = d3.geoAlbersUsa().fitSize([w,h], fc);
    const path = d3.geoPath(projection);

    const sel = d3.select(svg);
    sel.selectAll('path').remove();
    sel.selectAll('path')
      .data(feats, d => d.properties.GEOID)
      .join('path')
        .attr('d', path)
        .attr('fill', d => marginColor(d.properties.margin))
        .attr('stroke','rgba(255,255,255,0.4)')
        .attr('stroke-width', currentZoom === 'us' ? 0.3 : 0.5)
      .on('mouseenter', function(){ d3.select(this).attr('stroke','#1f2937').attr('stroke-width',1); })
      .on('mouseleave', function(){ d3.select(this).attr('stroke','rgba(255,255,255,0.4)').attr('stroke-width', currentZoom==='us'?0.3:0.5); })
      .on('mousemove', function(ev, d){ renderPanelDistrict(d.properties); })
      .on('click', function(ev, d){
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
      byState = indexByState(features);
      populateStateSelect();
      hideOldTooltips();
      injectPanel();
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
      load();
      if (loaded) requestAnimationFrame(() => requestAnimationFrame(render));
    } else {
      r.style.display = 'none';
    }
  }

  function init(){
    const r = root(); if (!r) return;
    wireControls();
    const nav = document.querySelector('.pageTabs');
    if (nav) nav.addEventListener('click', handleTabClick);
    r.style.display = 'none';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
