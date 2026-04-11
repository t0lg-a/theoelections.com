/* ============================================================
   state-legs.js — State Legislatures page
   Handles the State House (SLDL) map. Self-contained; does not
   touch Congress / Senate / Governor code in forecast.js.
   Depends on: d3 v7, topojson-client v3 (already in <head>)
   ============================================================ */
(function(){
  const PAGE_ID = 'stateLegsPage';
  const TOPOJSON_URL = './sldl_national.topojson';
  // Fallback to first object key if this exact name is absent
  const PREFERRED_OBJECT = 'districts';

  let loaded = false;
  let loading = false;
  let features = null;          // array of GeoJSON features
  let byState = null;           // { AL: {features, totalD, totalR, total, avgMargin, ...} }
  let currentZoom = 'us';       // 'us' or state abbr

  // --- DOM helpers -------------------------------------------------
  const root       = () => document.getElementById(PAGE_ID);
  const svgEl      = () => root() && root().querySelector('svg[data-sldl-map]');
  const stickyEl   = () => root() && root().querySelector('[data-sldl-sticky]');
  const cursorEl   = () => root() && root().querySelector('[data-sldl-cursor]');
  const zoomSelect = () => root() && root().querySelector('[data-sldl-zoom-select]');
  const usBtn      = () => root() && root().querySelector('[data-sldl-zoom="us"]');

  // --- Color scale: diverging red-blue on margin -------------------
  function hex(c){
    if (!c) return '#888888';
    c = c.trim();
    if (c.startsWith('#')){
      if (c.length === 4) return '#' + [...c.slice(1)].map(x=>x+x).join('');
      return c;
    }
    // rgb(…)
    const m = c.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (m) return '#' + [m[1],m[2],m[3]].map(v=>(+v).toString(16).padStart(2,'0')).join('');
    return '#888888';
  }
  function mix(a, b, k){
    const pa = a.match(/\w\w/g).map(h=>parseInt(h,16));
    const pb = b.match(/\w\w/g).map(h=>parseInt(h,16));
    return '#' + pa.map((v,i)=>Math.round(v+(pb[i]-v)*k).toString(16).padStart(2,'0')).join('');
  }
  function marginColor(m){
    if (m == null || !isFinite(m)) return '#d0d0d0';
    const cs = getComputedStyle(document.documentElement);
    const blue = hex(cs.getPropertyValue('--blue') || '#2563eb');
    const red  = hex(cs.getPropertyValue('--red')  || '#dc2626');
    const neutral = '#f4f4f4';
    const t = Math.max(-1, Math.min(1, m / 40)); // saturate at ±40 pts
    return t >= 0 ? mix(neutral, blue, t) : mix(neutral, red, -t);
  }

  // --- Data indexing -----------------------------------------------
  function indexByState(feats){
    const map = {};
    for (const f of feats){
      const p = f.properties || {};
      const st = p.state_abbr;
      if (!st) continue;
      if (!map[st]) map[st] = {
        features: [], totalD:0, totalR:0, total:0, sumMargin:0, nValid:0
      };
      const s = map[st];
      s.features.push(f);
      s.total++;
      const m = p.margin;
      if (m != null && isFinite(m)){
        s.sumMargin += m; s.nValid++;
        if (m > 0) s.totalD++;
        else if (m < 0) s.totalR++;
      }
    }
    for (const st in map){
      map[st].avgMargin = map[st].nValid ? map[st].sumMargin / map[st].nValid : null;
    }
    return map;
  }

  function populateStateSelect(){
    const sel = zoomSelect();
    if (!sel) return;
    const states = Object.keys(byState).sort();
    sel.innerHTML = '<option value="">State…</option>' +
      states.map(s => `<option value="${s}">${s}</option>`).join('');
  }

  function fmtMargin(m){
    if (m == null || !isFinite(m)) return '—';
    return (m >= 0 ? 'D+' : 'R+') + Math.abs(m).toFixed(1);
  }

  function baselineLabel(b){
    if (!b) return '—';
    if (b === '2024_pres') return '2024 pres';
    if (b === '2016-20_comp') return '2016–20 comp.';
    return b;
  }

  // --- Sticky panel (right-side, per-state totals) -----------------
  function updateSticky(stateAbbr){
    const el = stickyEl();
    if (!el || !byState) return;
    if (!stateAbbr || !byState[stateAbbr]){
      // National roll-up
      let tD=0, tR=0, tot=0, sum=0, n=0;
      for (const st in byState){
        const s = byState[st];
        tD  += s.totalD;
        tR  += s.totalR;
        tot += s.total;
        if (s.nValid){ sum += s.sumMargin; n += s.nValid; }
      }
      el.innerHTML = `
        <div class="stHead">United States</div>
        <div class="stRow"><span>Total seats</span><span class="v">${tot}</span></div>
        <div class="stRow d"><span>Est. Dem</span><span class="v">${tD}</span></div>
        <div class="stRow r"><span>Est. Rep</span><span class="v">${tR}</span></div>
        <div class="stRow"><span>Avg margin</span><span class="v">${fmtMargin(n ? sum/n : null)}</span></div>`;
      return;
    }
    const s = byState[stateAbbr];
    el.innerHTML = `
      <div class="stHead">${stateAbbr}</div>
      <div class="stRow"><span>Total seats</span><span class="v">${s.total}</span></div>
      <div class="stRow d"><span>Est. Dem</span><span class="v">${s.totalD}</span></div>
      <div class="stRow r"><span>Est. Rep</span><span class="v">${s.totalR}</span></div>
      <div class="stRow"><span>Avg margin</span><span class="v">${fmtMargin(s.avgMargin)}</span></div>`;
  }

  // --- Render -------------------------------------------------------
  function render(){
    const svg = svgEl();
    if (!svg || !features) return;
    const rect = svg.getBoundingClientRect();
    const w = Math.max(1, rect.width  || 600);
    const h = Math.max(1, rect.height || 320);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    const feats = currentZoom === 'us'
      ? features
      : (byState[currentZoom] ? byState[currentZoom].features : []);

    const fc = { type:'FeatureCollection', features: feats };
    const projection = d3.geoAlbersUsa().fitSize([w, h], fc);
    const path = d3.geoPath(projection);

    const sel = d3.select(svg);
    sel.selectAll('path').remove();
    sel.selectAll('path')
      .data(feats, d => d.properties.GEOID)
      .join('path')
        .attr('d', path)
        .attr('fill', d => marginColor(d.properties.margin))
      .on('mousemove', function(ev, d){
        const p = d.properties || {};
        updateSticky(p.state_abbr);
        const tip = cursorEl();
        if (!tip) return;
        const dir = p.margin == null ? '' : (p.margin >= 0 ? 'd' : 'r');
        tip.innerHTML = `
          <div class="cName">${p.NAMELSAD || 'District'} — ${p.state_abbr || ''}</div>
          <div class="cMargin ${dir}">${fmtMargin(p.margin)}</div>
          <div class="cBase">baseline: ${baselineLabel(p.baseline)}</div>`;
        tip.style.display = 'block';
        const parent = tip.parentElement.getBoundingClientRect();
        let x = ev.clientX - parent.left + 12;
        let y = ev.clientY - parent.top  + 12;
        // Keep tip inside stage
        const tipRect = tip.getBoundingClientRect();
        if (x + tipRect.width  > parent.width)  x = ev.clientX - parent.left - tipRect.width  - 8;
        if (y + tipRect.height > parent.height) y = ev.clientY - parent.top  - tipRect.height - 8;
        tip.style.left = x + 'px';
        tip.style.top  = y + 'px';
      })
      .on('mouseleave', function(){
        const tip = cursorEl();
        if (tip) tip.style.display = 'none';
      });

    updateSticky(currentZoom === 'us' ? null : currentZoom);
  }

  // --- Loader -------------------------------------------------------
  async function load(){
    if (loaded || loading) return;
    loading = true;
    try {
      const res  = await fetch(TOPOJSON_URL);
      if (!res.ok) throw new Error('fetch ' + res.status);
      const topo = await res.json();
      const objName = (topo.objects && topo.objects[PREFERRED_OBJECT])
        ? PREFERRED_OBJECT
        : Object.keys(topo.objects || {})[0];
      if (!objName) throw new Error('no topojson objects found');
      const fc = topojson.feature(topo, topo.objects[objName]);
      features = fc.features || [];
      byState  = indexByState(features);
      populateStateSelect();
      loaded = true;
      render();
    } catch(e){
      console.error('[state-legs] load failed', e);
      const el = stickyEl();
      if (el) el.innerHTML = `<div class="stHead">Error</div><div class="stRow"><span>Could not load districts</span></div>`;
    } finally {
      loading = false;
    }
  }

  // --- Controls -----------------------------------------------------
  function wireControls(){
    const r = root();
    if (!r) return;

    r.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-sldl-zoom]');
      if (!btn) return;
      currentZoom = btn.getAttribute('data-sldl-zoom');
      r.querySelectorAll('[data-sldl-zoom]').forEach(b =>
        b.classList.toggle('active', b === btn));
      const sel = zoomSelect();
      if (sel) sel.value = '';
      render();
    });

    const sel = zoomSelect();
    if (sel) sel.addEventListener('change', () => {
      if (!sel.value) return;
      currentZoom = sel.value;
      const ub = usBtn();
      if (ub) ub.classList.remove('active');
      render();
    });

    window.addEventListener('resize', () => { if (loaded) render(); });
  }

  // --- Activation & page visibility management --------------------
  // Host tab switcher (in ratings.js) hardcodes 6 pages and doesn't
  // know about stateLegsPage. We add a second listener on .pageTabs
  // that runs AFTER the host's (listeners fire in registration order)
  // and handles stateLegsPage show/hide. This lets the host do its
  // normal hide-everything pass, then we show/hide our page on top.

  function handleTabClick(ev){
    const btn = ev.target.closest('.pageTab');
    if (!btn) return;
    const page = btn.dataset.page;
    const r = root();
    if (!r) return;

    if (page === 'state-legs'){
      // Host switcher already hid every other page. Show ours.
      r.style.display = '';
      // Host switcher set active=false on all tabs (it only re-activates
      // buttons it recognizes via the same class loop — wait, it DOES
      // re-add 'active' to the clicked btn. So the button class is fine.)
      // But host switcher also hid #triGrid which is correct.
      load();
      if (loaded) setTimeout(render, 0);
    } else {
      // Any other tab — make sure our page is hidden
      r.style.display = 'none';
    }
  }

  function init(){
    const r = root();
    if (!r) return;
    wireControls();

    // Attach AFTER host switcher's listener (this file loads after ratings.js)
    const nav = document.querySelector('.pageTabs');
    if (nav) nav.addEventListener('click', handleTabClick);

    // Default state: hidden (host switcher defaults to model page)
    r.style.display = 'none';
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init);
  else init();
})();
