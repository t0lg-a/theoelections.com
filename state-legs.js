/* ============================================================
   state-legs.js — State Legislatures page  (v10)

   Three view modes via a top-level toolbar styled like the
   Forecast/Nowcast toggle:
     • House  — single big map of state-house districts (SLDL)
     • Senate — single big map of state-senate districts (SLDU)
     • Split  — both chambers shown together, each in its own
                panel + map (independently zoomable)

   Senate-only enhancements:
     • Not-up states are grayed on the map.
     • "Not up" state panels show the CURRENT pre-2026 chamber
       composition (D/R count) rather than baseline projections.
     • Locked seats (those not up this cycle in staggered states)
       use real current-holder counts from CURRENT_SENATE_COMP_2025
       when computing majority odds — so D seats that aren't on
       the ballot are counted as D in the MC, not re-projected.
     • Hispanic-share adjustment reads sldu_hispanic_share.csv.

   Multi-member district notice: AZ / NJ / ND / SD / NH (house)
   and VT (senate) have TIGER features that represent districts
   electing >1 legislator. The MC treats each district as a
   party-ticket and feature count = seat count, which is the
   correct modeling unit. A small note appears in the panel for
   these states so viewers aren't confused by "30 seats" in an
   Arizona house panel that holds 60 representatives.
   ============================================================ */
(function(){
  const PAGE_ID = 'stateLegsPage';

  // --- Chamber config ---------------------------------------
  const CHAMBERS = {
    sldl: {
      key: 'sldl',
      label: 'State House',
      short: 'House',
      sub:   'Lower chambers — district baselines',
      mapLabel: 'State House map',
      topoUrl:     './sldl_national.topojson',
      leanCsvUrl:  './national_district_results.csv',
      hispCsvUrl:  './sldl_hispanic_share.csv',
      topoObject:  'districts',
    },
    sldu: {
      key: 'sldu',
      label: 'State Senate',
      short: 'Senate',
      sub:   'Upper chambers — district baselines',
      mapLabel: 'State Senate map',
      topoUrl:     './sldu_with_data.topojson',
      leanCsvUrl:  null,       // data embedded on properties
      hispCsvUrl:  './sldu_hispanic_share.csv',
      topoObject:  'data',
    },
  };

  // --- View state --------------------------------------------
  // view: 'sldl' | 'sldu' | 'split'
  // currentChamber: the "primary" chamber being operated on. In
  //   single-map mode it's the chamber being shown. In split mode
  //   it's the chamber we most recently rendered/handled.
  let view = 'sldl';
  let currentChamber = 'sldl';
  // syncZoomEnabled: when true (default), clicking a state in one split-view
  // map zooms both maps to the same state. When false, each map zooms
  // independently — useful for comparing different states side-by-side.
  let syncZoomEnabled = true;
  const CH = (ch) => CHAMBERS[ch || currentChamber];

  // Per-chamber view state — zoom target + d3.zoom transform.
  // In single-map mode only the active chamber's zoom matters.
  // In split mode each chamber has independent zoom/pan.
  const viewState = {
    sldl: { zoom:'us', transform:null, lastZoomKey:null },
    sldu: { zoom:'us', transform:null, lastZoomKey:null },
  };

  // --- Hispanic share, per-chamber ---------------------------
  const HISPANIC_SHARE = { sldl: {}, sldu: {} };
  const SLDL_HISPANIC_SHARE = HISPANIC_SHARE.sldl;  // back-compat alias

  // --- Per-chamber load state ---------------------------------
  const CHAMBER_STATE = {
    sldl: { loaded:false, loading:false, features:null, byState:null },
    sldu: { loaded:false, loading:false, features:null, byState:null },
  };
  const CS = (ch) => CHAMBER_STATE[ch || currentChamber];

  // --- Forecast integration ----------------------------------
  function getHispanicBaseline(){
    try { if (typeof HISPANIC_BASELINE !== 'undefined' && HISPANIC_BASELINE) return HISPANIC_BASELINE; } catch(_){}
    return { D: 53.06, R: 46.94 };
  }
  function getHispanicGb(){
    try { if (typeof HISPANIC_GB !== 'undefined' && HISPANIC_GB) return HISPANIC_GB; } catch(_){}
    return null;
  }

  // --- Ratings + margin coloring ------------------------------
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
    '2020-24_comp': { D: 49.7, R: 49.0 },
    '2020_pres':    { D: 51.3, R: 46.8 },
  };

  function buildRatio(props, chamber){
    const demRaw = props.dem_pct;
    const marginPts = props.margin;
    if (demRaw == null || marginPts == null || !isFinite(demRaw) || !isFinite(marginPts)) return null;
    const demPct = (Math.abs(demRaw) <= 1.5) ? demRaw * 100 : demRaw;
    const repPct = demPct - marginPts;
    const gbBase = BASELINE_GB[props.baseline] || { D: 50, R: 50 };
    if (gbBase.D <= 0 || gbBase.R <= 0) return null;

    let ratioD = demPct / gbBase.D;
    let ratioR = repPct / gbBase.R;

    // Hispanic swing adjustment (mirrors forecast.js getHouseModel)
    const hShare = HISPANIC_SHARE[chamber][props.GEOID] || 0;
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

  function attachRatios(chamber){
    const feats = CS(chamber).features; if (!feats) return;
    for (const f of feats){ const p = f.properties; if (p) p._ratio = buildRatio(p, chamber); }
  }

  function applyProjection(chamber){
    const feats = CS(chamber).features; if (!feats) return;
    for (const f of feats){
      const p = f.properties; if (!p) continue;
      const m = projectMarginFromRatio(p._ratio);
      p._projMargin = m;
    }

    // Impute null-margin districts from state's mean (for ME-style gaps)
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
    if (imputed > 0) console.log(`[state-legs/${chamber}] imputed margins for ${imputed} districts`);
    CS(chamber).byState = indexByState(feats);
  }

  function mOf(p){ return (p && p._projMargin != null) ? p._projMargin : (p ? p.margin : null); }

  // --- Monte Carlo ------------------------------------------
  const NAT_SIGMA  = 20;
  const IDIO_SIGMA = 16;
  const MC_SIMS    = 50000;

  function gaussian(){
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function _nCDF(z){
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z*z/2);
    const p = d * t * (0.3193815 + t*(-0.3565638 + t*(1.781478 + t*(-1.821256 + t*1.330274))));
    return z > 0 ? 1 - p : p;
  }
  function winProbD(margin){
    if (margin == null || !isFinite(margin)) return 0.5;
    return _nCDF(margin / NAT_SIGMA);
  }

  // --- Chamber size + 2026 stagger + current comp -----------
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

  // SLDU (state senate) — sourced from Wikipedia 2026 state legislative
  // elections summary table, cross-checked against 270toWin 2026.
  const CHAMBER_SLDU = {
    AL:35,  AK:20,  AZ:30,  AR:35,  CA:40,  CO:35,  CT:36,  DE:21,  FL:40,  GA:56,
    HI:25,  ID:35,  IL:59,  IN:50,  IA:50,  KS:40,  KY:38,  LA:39,  ME:35,  MD:47,
    MA:40,  MI:38,  MN:67,  MS:52,  MO:34,  MT:50,  NE:0,   NV:21,  NH:24,  NJ:40,
    NM:42,  NY:63,  NC:50,  ND:47,  OH:33,  OK:48,  OR:30,  PA:50,  RI:38,  SC:46,
    SD:35,  TN:33,  TX:31,  UT:29,  VT:30,  VA:40,  WA:49,  WV:34,  WI:33,  WY:31,
  };
  const SEATS_UP_FRAC_2026_SLDU = {
    // staggered: (up)/(total)
    AK: 10/20,  CA: 20/40,  CO: 18/35,  DE: 11/21,  FL: 20/40,
    HI: 13/25,  IL: 39/59,  IN: 25/50,  IA: 25/50,  KY: 19/38,
    MO: 17/34,  MT: 25/50,  NV: 11/21,  ND: 24/47,  OH: 17/33,
    OK: 24/48,  OR: 15/30,  PA: 25/50,  TN: 17/33,  TX: 16/31,
    UT: 15/29,  WA: 24/49,  WV: 17/34,  WI: 17/33,  WY: 16/31,
    // not up in 2026
    LA: 0,  MS: 0,  NJ: 0,  VA: 0,
    KS: 0,  NM: 0,  SC: 0,
    NE: 0,
  };

  // Pre-2026 state senate composition — source: Wikipedia 2026 state
  // legislative elections "Before" columns. Independents/coalition
  // members are assigned to their caucus:
  //   AK: 9D + 5R + 6 coalition Rs  → 9D / 11R
  //   FL: 28R + 10D + 1 I (Pizzo, caucuses D) + 1 vacancy → 11D / 28R
  //   ME: 20D + 14R + 1 I (Bennett, retiring) → treat I as R → 20D / 15R
  //   UT: 22R + 6D + 1 Forward (conservative caucus) → 6D / 23R
  //   VT: 16D + 13R + 1 Progressive (caucuses D) → 17D / 13R
  //
  // Used as real current-holder locks for not-up seats so chamber odds
  // reflect actual D/R ownership rather than baseline inference.
  const CURRENT_SENATE_COMP_2025 = {
    AL:{D:8,  R:27}, AK:{D:9,  R:11}, AZ:{D:13, R:17}, AR:{D:6,  R:29},
    CA:{D:30, R:10}, CO:{D:23, R:12}, CT:{D:25, R:11}, DE:{D:15, R:6 },
    FL:{D:11, R:28}, GA:{D:23, R:33}, HI:{D:22, R:3 }, ID:{D:6,  R:29},
    IL:{D:40, R:19}, IN:{D:10, R:40}, IA:{D:17, R:33}, KS:{D:9,  R:31},
    KY:{D:7,  R:31}, LA:{D:12, R:27}, ME:{D:20, R:15}, MD:{D:34, R:13},
    MA:{D:36, R:4 }, MI:{D:19, R:18}, MN:{D:34, R:33}, MS:{D:16, R:36},
    MO:{D:10, R:24}, MT:{D:18, R:32}, NE:{D:0,  R:0 }, NV:{D:13, R:8 },
    NH:{D:8,  R:16}, NJ:{D:25, R:15}, NM:{D:26, R:16}, NY:{D:41, R:22},
    NC:{D:20, R:30}, ND:{D:5,  R:42}, OH:{D:9,  R:24}, OK:{D:8,  R:40},
    OR:{D:18, R:12}, PA:{D:22, R:28}, RI:{D:34, R:4 }, SC:{D:12, R:34},
    SD:{D:3,  R:32}, TN:{D:6,  R:27}, TX:{D:12, R:19}, UT:{D:6,  R:23},
    VT:{D:17, R:13}, VA:{D:21, R:19}, WA:{D:30, R:19}, WV:{D:2,  R:32},
    WI:{D:15, R:18}, WY:{D:2,  R:29},
  };

  // Multi-member states: each TIGER feature represents a district that
  // elects >1 legislator. Displayed with a note in the panel.
  const MULTIMEMBER_SLDL = new Set(['AZ','NJ','ND','SD','NH']);
  const MULTIMEMBER_SLDU = new Set(['VT']);

  const CHAMBER_SIZE = (ch) => (ch || currentChamber) === 'sldu' ? CHAMBER_SLDU : CHAMBER_SLDL;
  const SEATS_UP_FRAC_2026 = (ch) => (ch || currentChamber) === 'sldu' ? SEATS_UP_FRAC_2026_SLDU : SEATS_UP_FRAC_2026_SLDL;
  const MULTIMEMBER_SET = (ch) => (ch || currentChamber) === 'sldu' ? MULTIMEMBER_SLDU : MULTIMEMBER_SLDL;

  const NOT_UP_SET = (ch) => {
    const frac = SEATS_UP_FRAC_2026(ch);
    const s = new Set();
    for (const k in frac) if (frac[k] === 0) s.add(k);
    return s;
  };

  // Per-district stagger: for states where only half the senate is up
  // and the districts can be partitioned by parity of district number,
  // encode whether odd or even districts are up in 2026. Districts
  // not matching this parity render gray on the map.
  //
  // Sources: each state's Wikipedia 2026 election page and Ballotpedia
  // senate-district stagger rules. States not listed here fall back
  // to aggregate stagger (no per-district gray — v10 behavior).
  const DISTRICT_PARITY_UP_2026_SLDU = {
    // Midterm-Class-2 standard pattern: odd-numbered districts up
    TX: 'odd',  // "All 16 odd-numbered seats" (Wikipedia 2026 TX elections)
    OH: 'odd',  // "17 odd-numbered districts" (Wikipedia 2026 OH senate)
    WI: 'odd',  // "17 odd-numbered districts" (Wikipedia 2026 WI senate)
    IA: 'odd',  // "25 odd-numbered districts" (Wikipedia 2026 IA senate)
    MO: 'odd',
    NV: 'odd',
    IN: 'odd',
    KY: 'odd',
    MT: 'odd',
    TN: 'odd',
    UT: 'odd',
    WV: 'odd',
    OK: 'odd',
    WY: 'odd',
    PA: 'odd',
    WA: 'odd',
    OR: 'odd',
    ND: 'odd',
    HI: 'odd', // "13 seats contested in 2026—covering odd-numbered districts"
    // Alaska uses letter-suffix districts (A-T). Per Wikipedia 2026 AK Senate:
    // "The A, C, E, G, I, K, M, O, Q, and S districts are up for election."
    // These map to odd letter-positions (A=1, C=3, E=5, ... S=19). Handled as
    // 'odd' here with a letter-to-number conversion in isDistrictUp2026.
    AK: 'odd',
    // Presidential-cycle-offset: even-numbered districts up in midterms
    CA: 'even', // Ballotpedia: "senators from even-numbered districts elected in intervening even years"
    FL: 'even', // Wikipedia 2026 FL senate: "Only even-numbered seats will be up for election in 2026"
    // States using 2-4-4 systems with flat district lists (see below): AR, IL, DE
    // Still untouched: AK only (letter-based districts can't use numeric rules)
  };

  // Flat up-districts lists for states that can't be expressed as a simple
  // odd/even parity rule. Takes precedence over parity rules if both exist.
  // Source: Wikipedia 2022 and 2026 state senate election pages.
  const DISTRICT_UP_2026_SET_SLDU = {
    // Colorado: verified against Wikipedia 2022 Colorado Senate election
    // (4-year term districts elected 2022 → up again 2026)
    CO: new Set([1,3,4,7,8,9,11,15,20,22,24,25,27,30,32,34,35]),
    // Arkansas: 17 districts on 2026 ballot + 1 special (district 26).
    // Source: Wikipedia 2026 Arkansas Senate election page results table.
    AR: new Set([2,7,9,10,11,13,14,15,16,21,24,26,27,28,30,31,32,35]),
    // Illinois: 39 of 59 districts up in 2026 (groups 1 and 2 per IL constitution).
    // Source: Wikipedia Illinois Senate article, "State senators will be elected..."
    //   Group 1 (4-4-2 cycle, 4-yr term in 2026): 2,5,8,11,14,17,20,23,26,29,32,35,38,41,44,47,50,53,56,59
    //   Group 2 (4-2-4 cycle, 2-yr term in 2026): 3,6,9,12,15,18,21,24,27,30,33,36,39,42,45,48,51,54,57
    //   Group 3 (2-4-4 cycle, NOT up 2026): 1,4,7,10,13,16,19,22,25,28,31,34,37,40,43,46,49,52,55,58
    IL: new Set([2,3,5,6,8,9,11,12,14,15,17,18,20,21,23,24,26,27,29,30,32,33,35,36,38,39,41,42,44,45,47,48,50,51,53,54,56,57,59]),
    // Delaware: 11 of 21 districts up in 2026 (4-yr-term winners from 2022).
    // Derived by subtracting 2024 up-districts from all 21. In 2022 (post-
    // reapportionment), 10 districts drew 2-yr terms (up in 2024, then 4-yr
    // in 2028) and 11 drew 4-yr terms (up in 2026 with 2-yr term this time).
    // Source: Wikipedia 2024 Delaware Senate election, 10 up-districts table;
    // cross-referenced against Delaware Dept. of Elections 2026-2034 schedule.
    //   2024 up (NOT up 2026): 2, 3, 4, 6, 10, 11, 16, 17, 18, 21
    //   2026 up:               1, 5, 7, 8, 9, 12, 13, 14, 15, 19, 20
    DE: new Set([1,5,7,8,9,12,13,14,15,19,20]),
  };

  function isDistrictUp2026(chamber, props){
    if (chamber !== 'sldu') return true;  // SLDL parity rule TBD
    const st = props && props.state_abbr;
    if (!st) return true;
    // Whole-chamber not-up states: already handled elsewhere
    if (NOT_UP_SET('sldu').has(st)) return false;
    const geoid = props.GEOID; if (!geoid || geoid.length < 3) return true;

    // Extract district number. Alaska uses letter suffixes (A-T); all other
    // states use numeric suffixes. For Alaska, convert letter → 1-indexed
    // position (A=1, B=2, ..., T=20) so parity rules work uniformly.
    const last = geoid.slice(-3);
    let dnum;
    if (st === 'AK'){
      const letter = geoid.slice(-1).toUpperCase();
      if (letter < 'A' || letter > 'Z') return true;
      dnum = letter.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
    } else {
      if (!last.match(/^\d+$/)) return true;
      dnum = parseInt(last, 10);
    }
    if (!isFinite(dnum)) return true;

    // Flat up-districts lists (e.g. CO) take precedence over parity.
    const upSet = DISTRICT_UP_2026_SET_SLDU[st];
    if (upSet) return upSet.has(dnum);

    const parity = DISTRICT_PARITY_UP_2026_SLDU[st];
    if (!parity) return true;  // no stagger rule → treat as up-able

    // Per-state exceptions: specific districts that override the parity rule
    // because of vacancy-fill two-year terms or other special cases.
    const exceptionsUp = DISTRICT_EXCEPTIONS_UP_2026_SLDU[st];
    if (exceptionsUp && exceptionsUp.has(dnum)) return true;

    return parity === 'odd' ? (dnum % 2 === 1) : (dnum % 2 === 0);
  }

  // Districts that are up in 2026 despite their parity indicating otherwise
  // (typically due to mid-term vacancy appointments needing special election).
  // Source: state legislature publications and local news (e.g. ND Monitor 2026).
  const DISTRICT_EXCEPTIONS_UP_2026_SLDU = {
    ND: new Set([26, 42]),  // Two-year terms filling vacancies per ND Monitor
  };

  function seatsUp2026(chamber, st, featureCount){
    const frac = SEATS_UP_FRAC_2026(chamber)[st];
    if (frac === 0) return 0;
    if (typeof frac === 'number') return Math.round(featureCount * frac);
    return featureCount;
  }

  function chamberOdds(chamber, stateAbbr){
    const bs = CS(chamber).byState;
    const s = bs && bs[stateAbbr];
    if (!s || !s.features?.length) return null;
    const total = s.features.length;
    const up = seatsUp2026(chamber, stateAbbr, total);

    // Not up this cycle — report current composition for senate,
    // or a generic notUp for house.
    if (up <= 0) {
      const cur = (chamber === 'sldu') ? CURRENT_SENATE_COMP_2025[stateAbbr] : null;
      if (cur){
        const majLine = Math.floor(total/2) + 1;
        const superLine = Math.ceil(total*2/3);
        return {
          total, up:0, notUp:true,
          lockedD: cur.D, lockedR: cur.R,
          pDmaj: cur.D >= majLine ? 1 : 0,
          pDsup: cur.D >= superLine ? 1 : 0,
          pRmaj: cur.R >= majLine ? 1 : 0,
          pRsup: cur.R >= superLine ? 1 : 0,
          eDemSeats: cur.D,
        };
      }
      return { total, up:0, notUp:true };
    }

    // Partition into up + locked.
    //
    // If we have a district-parity rule for this state (odd/even up),
    // use it to split exactly — each physical district is assigned to
    // the bucket matching whether its seat is on the ballot in 2026.
    // Otherwise fall back to the aggregate approach: take the `up`
    // most-competitive districts as the "up" pool (v10/v11 behavior).
    const allItems = s.features.map(f => ({ f, m: mOf(f.properties) }));
    let upItems, lockedItems;
    if (chamber === 'sldu' && (DISTRICT_PARITY_UP_2026_SLDU[stateAbbr] || DISTRICT_UP_2026_SET_SLDU[stateAbbr])){
      upItems = [];
      lockedItems = [];
      for (const it of allItems){
        if (isDistrictUp2026(chamber, it.f.properties)) upItems.push(it);
        else lockedItems.push(it);
      }
    } else {
      const sorted = allItems.slice().sort((a,b) => Math.abs(a.m ?? 999) - Math.abs(b.m ?? 999));
      upItems = sorted.slice(0, up);
      lockedItems = sorted.slice(up);
    }

    // For SLDU: use real current holders to back into a locked D count
    // that honors the chamber's true composition. Gap between baseline-
    // projected total D and actual current D is absorbed into locked seats.
    let lockedD;
    if (chamber === 'sldu' && CURRENT_SENATE_COMP_2025[stateAbbr]){
      const cur = CURRENT_SENATE_COMP_2025[stateAbbr];
      const upD_baseline = upItems.filter(it => it.m != null && it.m > 0).length;
      lockedD = Math.max(0, Math.min(lockedItems.length, cur.D - upD_baseline));
    } else {
      lockedD = 0;
      for (const it of lockedItems){
        if (it.m != null && it.m > 0) lockedD++;
      }
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
    } catch(e) { return { err: 'throw:' + e.message }; }
  }
  let _lastErr = null, _lastHGbKey = 'none';
  function syncGbFromForecast(){
    const r = readForecastGb();
    if (r.err){
      if (r.err !== _lastErr){ console.log(`[state-legs] gb not ready (${r.err})`); _lastErr = r.err; }
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
      for (const ch of ['sldl','sldu']){
        if (!CHAMBER_STATE[ch].features) continue;
        attachRatios(ch);
        applyProjection(ch);
      }
      rerenderActive();
    }
    return true;
  }
  function startGbWatcher(){
    syncGbFromForecast();
    let tries = 0;
    const fast = setInterval(() => {
      tries++;
      if (syncGbFromForecast()) clearInterval(fast);
      else if (tries > 120){
        clearInterval(fast);
        console.warn(`[state-legs] gave up waiting for DATA.house.gb (last err: ${_lastErr})`);
        if (gbCurrent == null){
          gbCurrent = 0;
          for (const ch of ['sldl','sldu']) if (CHAMBER_STATE[ch].features) applyProjection(ch);
          rerenderActive();
        }
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

  const root = () => document.getElementById(PAGE_ID);

  // Accessors — pick single-mode original DOM or split-mode injected DOM
  const singleSvgEl   = () => root() && root().querySelector('svg[data-sldl-map]');
  const singlePanelEl = () => root() && root().querySelector('.modeCol[data-mode="sldl"] .sldlStatePanel');
  const zoomSelect    = () => root() && root().querySelector('.modeCol[data-mode="sldu"] [data-sldl-zoom-select]');
  const usBtn         = () => root() && root().querySelector('.modeCol[data-mode="sldu"] [data-sldl-zoom="us"]');
  const stageEl       = () => root() && root().querySelector('.modeCol[data-mode="sldl"] .mapStage');

  const splitSvgEl   = (ch) => {
    const r = root(); if (!r) return null;
    // House (sldl) uses the existing map SVG. Senate (sldu) uses the injected one.
    return ch === 'sldl'
      ? r.querySelector('svg[data-sldl-map]')
      : r.querySelector('svg[data-sldu-split-map]');
  };
  const splitPanelEl = (ch) => {
    const r = root(); if (!r) return null;
    // Both panels live in the sldl column's stage. First one = house, second = senate.
    const stage = r.querySelector('.modeCol[data-mode="sldl"] .mapStage');
    if (!stage) return null;
    const panels = stage.querySelectorAll('.sldlStatePanel');
    return ch === 'sldl' ? panels[0] : panels[1];
  };
  const splitZoomSelect = (ch) => {
    // House uses the existing map control bar. Senate uses the new right-column one.
    const r = root(); if (!r) return null;
    return ch === 'sldl'
      ? r.querySelector('.modeCol[data-mode="sldu"] [data-sldl-zoom-select]')
      : r.querySelector('.modeCol[data-mode="sldu-right"] [data-sldl-zoom-select]');
  };
  const splitUsBtn = (ch) => {
    const r = root(); if (!r) return null;
    return ch === 'sldl'
      ? r.querySelector('.modeCol[data-mode="sldu"] [data-sldl-zoom="us"]')
      : r.querySelector('.modeCol[data-mode="sldu-right"] [data-sldl-zoom="us"]');
  };

  // Where error/no-data banners go — next to the map for that chamber.
  // In single mode, both chambers share the main sldu column's map card.
  // In split mode, the senate chamber uses the new sldu-right column.
  function bannerParent(ch){
    const r = root(); if (!r) return null;
    if (view === 'split' && ch === 'sldu'){
      return r.querySelector('.modeCol[data-mode="sldu-right"] .mapCard');
    }
    return r.querySelector('.modeCol[data-mode="sldu"] .mapCard');
  }

  function svgForChamber(ch){
    return view === 'split' ? splitSvgEl(ch) : (ch === currentChamber ? singleSvgEl() : null);
  }
  function panelForChamber(ch){
    return view === 'split' ? splitPanelEl(ch) : (ch === currentChamber ? singlePanelEl() : null);
  }

  // --- Panel + styles injection ------------------------------
  function ensurePanel(container){
    if (!container || container.querySelector('.sldlStatePanel')) return;
    const div = document.createElement('div');
    div.className = 'sldlStatePanel';
    div.innerHTML = `
      <div class="sldlPanelHeader">
        <div>
          <div class="sldlPanelTitle">—</div>
          <div class="sldlPanelSub">—</div>
        </div>
        <div class="sldlModeToggle" data-mode-toggle>
          <button type="button" data-mode="model" class="active">Model</button>
          <button type="button" data-mode="ratings">Ratings</button>
        </div>
      </div>
      <div class="sldlMmNote" data-mm-note style="display:none;"></div>
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
    container.appendChild(div);
    div.querySelectorAll('[data-mode-toggle] button').forEach(b => {
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        fillMode = b.getAttribute('data-mode');
        // Mirror the toggle to ALL panels (so mode is consistent across split)
        document.querySelectorAll('#stateLegsPage [data-mode-toggle] button').forEach(x => {
          x.classList.toggle('active', x.getAttribute('data-mode') === fillMode);
        });
        rerenderActive();
      });
    });
  }

  function injectStyles(){
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
        box-sizing:border-box;
      }
      #stateLegsPage .sldlStatePanel.show{display:block;}
      #stateLegsPage .sldlStatePanel .sldlModeToggle,
      #stateLegsPage .sldlStatePanel .sldlModeToggle button{pointer-events:auto;}
      #stateLegsPage .sldlPanelHeader{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:6px;}
      #stateLegsPage .sldlModeToggle{display:inline-flex;border:1px solid rgba(0,0,0,0.15);border-radius:4px;overflow:hidden;pointer-events:auto;}
      #stateLegsPage .sldlModeToggle button{padding:3px 9px;background:transparent;border:none;cursor:pointer;font-size:9px;font-weight:800;color:var(--muted,#6b7280);letter-spacing:0.04em;text-transform:uppercase;}
      #stateLegsPage .sldlModeToggle button.active{background:var(--ink,#111);color:#fff;}
      #stateLegsPage .sldlMmNote{
        display:none;font-size:9px;font-weight:700;color:var(--muted,#6b7280);
        background:rgba(251,191,36,0.10);border:1px solid rgba(251,191,36,0.35);
        border-radius:3px;padding:4px 6px;margin:4px 0 8px;letter-spacing:0.01em;
      }
      #stateLegsPage .sldlMmNote.show{display:block;}
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
      #stateLegsPage .modeCol .mapSvg path{cursor:pointer;}
      #stateLegsPage .sldlDataBanner{position:absolute;top:10px;left:50%;transform:translateX(-50%);background:rgba(220,38,38,0.95);color:#fff;padding:8px 14px;font-size:11px;font-weight:700;border-radius:4px;max-width:80%;text-align:center;z-index:10;}

      /* ----- v10: top toolbar (House / Senate / Split) ------ */
      #sldlViewToolbar{
        grid-column: 1 / -1;
        display:flex; align-items:center; justify-content:center;
        gap:12px; margin-bottom:12px;
      }

      /* Sync-zoom toggle — hidden except in split view. */
      #sldlViewToolbar .sldlSyncToggle{
        display:none;
        align-items:center;
        gap:6px;
        font-size:13px; color:#374151;
        cursor:pointer;
        user-select:none;
      }
      #stateLegsPage.view-split #sldlViewToolbar .sldlSyncToggle{
        display:inline-flex;
      }
      #sldlViewToolbar .sldlSyncToggle input[type="checkbox"]{
        margin:0;
        cursor:pointer;
      }

      /* ----- v11: split view — reflow existing grid to 3 cols ----
         Maps render side-by-side in the existing map area (house on
         the left where it always was; senate in a new right column).
         Panels stack in the left column (house on top, senate below). */

      /* The third column is hidden by default and only shown in split mode */
      #stateLegsPage .modeCol[data-mode="sldu-right"]{ display:none; }

      #stateLegsPage.view-split.triGrid{
        grid-template-columns: 290px minmax(0, 1fr) minmax(0, 1fr) !important;
      }
      #stateLegsPage.view-split .modeCol[data-mode="sldu-right"]{
        display:flex; flex-direction:column; min-width:0;
      }
      #stateLegsPage.view-split .modeCol[data-mode="sldu-right"] .mapCard{
        flex:1; min-height:0;
      }
      #stateLegsPage.view-split .modeCol[data-mode="sldu-right"] .mapGrid,
      #stateLegsPage.view-split .modeCol[data-mode="sldu-right"] .mapStage{
        height:100%;
      }
      #stateLegsPage.view-split .modeCol[data-mode="sldu-right"] svg[data-sldu-split-map]{
        height:100% !important; width:100%; display:block; min-height:520px;
      }

      /* Stacked panels in the left column in split mode.
         Both panels share the column's height (matched to the map cards
         on the right). Each panel gets its own internal scroll so neither
         gets cut off regardless of content length. */
      #stateLegsPage.view-split .modeCol[data-mode="sldl"]{
        display:flex; flex-direction:column; min-height:0;
      }
      #stateLegsPage.view-split .modeCol[data-mode="sldl"] .mapCard{
        flex:1; min-height:0; display:flex; flex-direction:column;
      }
      #stateLegsPage.view-split .modeCol[data-mode="sldl"] .mapGrid{
        flex:1; min-height:0; display:flex; flex-direction:column;
      }
      #stateLegsPage.view-split .modeCol[data-mode="sldl"] .mapStage{
        display:flex; flex-direction:column; gap:10px;
        flex:1; min-height:0;
      }
      #stateLegsPage.view-split .modeCol[data-mode="sldl"] .sldlStatePanel{
        flex:1 1 0; min-height:0;
        overflow-y:auto;
      }
      #stateLegsPage .sldlStatePanel--senate{
        /* slight visual distinction so users can tell the panels apart at a glance */
        border-top: 2px solid var(--red, #dc2626);
      }
      html[data-look="riso"] #stateLegsPage .sldlStatePanel--senate{
        border-top: 2px solid var(--text-ink) !important;
      }
    `;
    document.head.appendChild(style);

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
  }

  function hideOldTooltips(){
    const r = root(); if (!r) return;
    const s = r.querySelector('[data-sldl-sticky]'); if (s) s.style.display = 'none';
    const c = r.querySelector('[data-sldl-cursor]'); if (c) c.style.display = 'none';
  }

  // --- Top toolbar (House / Senate / Split) ------------------
  function injectToolbar(){
    const r = root(); if (!r) return;
    if (r.querySelector('#sldlViewToolbar')) return;
    const bar = document.createElement('div');
    bar.id = 'sldlViewToolbar';
    bar.innerHTML = `
      <div class="forecastToggle" role="tablist" aria-label="State legislature view">
        <button class="fcBtn active" data-view="sldl" type="button">House</button>
        <button class="fcBtn"        data-view="sldu" type="button">Senate</button>
        <button class="fcBtn"        data-view="split" type="button">Split</button>
      </div>
      <label class="sldlSyncToggle" data-sldl-sync-wrap title="When on, zooming one map zooms the other. When off, each map can be zoomed to a different state independently.">
        <input type="checkbox" data-sldl-sync checked>
        <span>Sync zoom</span>
      </label>`;
    r.insertBefore(bar, r.firstChild);
    bar.addEventListener('click', async (ev) => {
      const btn = ev.target.closest('[data-view]');
      if (!btn) return;
      const next = btn.getAttribute('data-view');
      if (next === view) return;
      bar.querySelectorAll('[data-view]').forEach(x => x.classList.toggle('active', x===btn));
      await setView(next);
    });
    // Wire the sync toggle. Default state = checked = synced.
    const syncCb = bar.querySelector('[data-sldl-sync]');
    if (syncCb){
      syncCb.addEventListener('change', () => {
        syncZoomEnabled = syncCb.checked;
        // If the user re-enables sync, snap both maps to the left (sldl) zoom.
        if (syncZoomEnabled && view === 'split'){
          syncZoomBothChambers(viewState.sldl.zoom);
        }
      });
    }
  }

  // --- Split-view DOM ---------------------------------------
  // v11: the split view reuses the existing grid instead of adding
  // a whole extra row. When active, the page grid goes from
  //   [290px panel] [1fr house map]
  // to
  //   [290px panel] [1fr house map] [1fr senate map]
  // The panel column holds two stacked panels (house on top, senate
  // below). The senate map lives in a new modeCol sibling.
  function ensureSplitLayout(){
    const r = root(); if (!r) return;

    // 1) Second panel in the sldl column's stage.
    const stage = r.querySelector('.modeCol[data-mode="sldl"] .mapStage');
    if (stage && stage.querySelectorAll('.sldlStatePanel').length < 2){
      ensurePanel(stage);  // ensurePanel no-ops if one already exists — so call helper directly instead
      const div = document.createElement('div');
      div.className = 'sldlStatePanel sldlStatePanel--senate';
      div.innerHTML = `
        <div class="sldlPanelHeader">
          <div>
            <div class="sldlPanelTitle">—</div>
            <div class="sldlPanelSub">—</div>
          </div>
          <div class="sldlModeToggle" data-mode-toggle>
            <button type="button" data-mode="model" class="active">Model</button>
            <button type="button" data-mode="ratings">Ratings</button>
          </div>
        </div>
        <div class="sldlMmNote" data-mm-note style="display:none;"></div>
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
      // Wire Model/Ratings toggle on the new panel — mirrors to all panels.
      div.querySelectorAll('[data-mode-toggle] button').forEach(b => {
        b.addEventListener('click', (ev) => {
          ev.stopPropagation();
          fillMode = b.getAttribute('data-mode');
          document.querySelectorAll('#stateLegsPage [data-mode-toggle] button').forEach(x => {
            x.classList.toggle('active', x.getAttribute('data-mode') === fillMode);
          });
          rerenderActive();
        });
      });
    }

    // 2) Third column: senate map, injected as a modeCol sibling after sldu.
    if (!r.querySelector('.modeCol[data-mode="sldu-right"]')){
      const existingSldu = r.querySelector('.modeCol[data-mode="sldu"]');
      if (!existingSldu) return;
      const col = document.createElement('section');
      col.className = 'modeCol';
      col.setAttribute('data-mode', 'sldu-right');
      col.innerHTML = `
        <section class="card topCard">
          <div class="panelHeaderRow">
            <div class="panelTitleWrap">
              <div class="panelTitle">State Senate Map</div>
              <div class="panelSub">District baselines</div>
            </div>
          </div>
        </section>
        <section class="card mapCard">
          <div class="mapGrid">
            <div class="mapStage">
              <svg data-sldu-split-map class="mapSvg" aria-label="State Senate districts"></svg>
            </div>
          </div>
        </section>
        <div class="mapControlBar">
          <button class="zoomBtn active" data-sldl-zoom="us" type="button">US</button>
          <select class="zoomSelect" data-sldl-zoom-select>
            <option value="">State…</option>
          </select>
        </div>`;
      existingSldu.parentNode.insertBefore(col, existingSldu.nextSibling);
      // Wire zoom controls — synced across both maps.
      col.addEventListener('click', (ev) => {
        const btn = ev.target.closest('[data-sldl-zoom]');
        if (!btn) return;
        const z = btn.getAttribute('data-sldl-zoom');
        syncZoomBothChambers(z, 'sldu');
      });
      const selR = col.querySelector('[data-sldl-zoom-select]');
      if (selR) selR.addEventListener('change', () => {
        if (!selR.value) return;
        syncZoomBothChambers(selR.value, 'sldu');
      });
    }
  }

  // In split mode, change both chambers' zoom at once and re-render —
  // unless the sync toggle is off, in which case only touch the caller's
  // chamber (passed via `chamberHint`; defaults to currentChamber).
  // In single mode, just update the active chamber.
  function syncZoomBothChambers(z, chamberHint){
    if (view === 'split'){
      if (syncZoomEnabled){
        viewState.sldl.zoom = z;
        viewState.sldu.zoom = z;
        // Sync all zoom UI
        const r = root();
        const allZoomBtns = r.querySelectorAll('[data-sldl-zoom]');
        allZoomBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-sldl-zoom') === z));
        const allSelects = r.querySelectorAll('[data-sldl-zoom-select]');
        allSelects.forEach(s => s.value = (z === 'us' ? '' : z));
        renderChamber('sldl');
        renderChamber('sldu');
      } else {
        // Sync off: only update the chamber the user interacted with.
        const ch = chamberHint || currentChamber;
        viewState[ch].zoom = z;
        // Update just that chamber's zoom UI. The sldl/house map lives in
        // .modeCol[data-mode="sldu"]; the sldu/senate map lives in
        // .modeCol[data-mode="sldu-right"].
        const r = root();
        const colSel = ch === 'sldl'
          ? '.modeCol[data-mode="sldu"]'
          : '.modeCol[data-mode="sldu-right"]';
        r.querySelectorAll(`${colSel} [data-sldl-zoom]`)
          .forEach(b => b.classList.toggle('active', b.getAttribute('data-sldl-zoom') === z));
        const sel = r.querySelector(`${colSel} [data-sldl-zoom-select]`);
        if (sel) sel.value = (z === 'us' ? '' : z);
        renderChamber(ch);
      }
    } else {
      viewState[currentChamber].zoom = z;
      renderChamber(currentChamber);
    }
  }

  function setCardTitles(){
    const r = root(); if (!r) return;
    const ch = CH();
    r.querySelectorAll('[data-sldl-left-title]').forEach(el => el.textContent = ch.label);
    r.querySelectorAll('[data-sldl-left-sub]').forEach(el => el.textContent = ch.sub);
    r.querySelectorAll('[data-sldl-right-title]').forEach(el => el.textContent = ch.label + ' Map');
    const svg = singleSvgEl();
    if (svg) svg.setAttribute('aria-label', ch.label + ' districts');
    const mapCard = r.querySelector('.modeCol[data-mode="sldu"] .mapCard');
    if (mapCard) mapCard.setAttribute('aria-label', ch.mapLabel);
  }

  // --- View switcher -----------------------------------------
  async function setView(next){
    view = next;
    const r = root(); if (!r) return;
    r.classList.toggle('view-split', view === 'split');

    if (view === 'sldl' || view === 'sldu'){
      currentChamber = view;
      setCardTitles();
      // Hide the secondary senate panel — it's only meaningful in split mode.
      const sp = root().querySelector('.sldlStatePanel--senate');
      if (sp) sp.classList.remove('show');
      await ensureChamberLoaded(view);
      populateStateSelectForPanel(zoomSelect(), CS(view).byState);
      renderChamber(view);
    } else if (view === 'split'){
      ensureSplitLayout();
      await Promise.all(['sldl','sldu'].map(ensureChamberLoaded));
      populateStateSelectForPanel(splitZoomSelect('sldl'), CS('sldl').byState);
      populateStateSelectForPanel(splitZoomSelect('sldu'), CS('sldu').byState);
      renderChamber('sldl');
      renderChamber('sldu');
    }
  }

  async function ensureChamberLoaded(ch){
    const st = CHAMBER_STATE[ch];
    if (st.loaded) return;
    if (st.loading){
      while (st.loading) await new Promise(r => setTimeout(r, 50));
      return;
    }
    await loadChamber(ch);
  }

  // --- Rating/margin helpers --------------------------------
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

  let fillMode = 'model';
  function ratingFillFor(m){ const r = rateDistrict(m); return r ? r.color : '#d0d0d0'; }
  function fillForChamber(chamber, m, props){
    if (props){
      const notUp = NOT_UP_SET(chamber);
      if (notUp.has(props.state_abbr)) return '#e5e7eb';
      // Per-district stagger gray — individual seats not up this cycle
      if (!isDistrictUp2026(chamber, props)) return '#e5e7eb';
    }
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

  function populateStateSelectForPanel(selectEl, byState){
    if (!selectEl || !byState) return;
    const states = Object.keys(byState).sort();
    const current = selectEl.value;
    selectEl.innerHTML = '<option value="">State…</option>' + states.map(s=>`<option value="${s}">${s}</option>`).join('');
    if (current && states.includes(current)) selectEl.value = current;
  }

  // --- Cursor tooltip ---------------------------------------
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

  // --- Panel rendering --------------------------------------
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
    let demArea = `M 0 ${H} `, line = '';
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

  function renderPanelForState(chamber, stateAbbr){
    const p = panelForChamber(chamber); if (!p) return;
    const bs = CS(chamber).byState;
    if (!stateAbbr || !bs || !bs[stateAbbr]){ p.classList.remove('show'); return; }
    const s = bs[stateAbbr];
    p.classList.add('show');
    p.querySelector('.sldlPanelTitle').textContent = stateAbbr;
    const sub = p.querySelector('.sldlPanelSub'); if (sub) sub.textContent = CHAMBERS[chamber].label;

    // Multi-member note (AZ/NJ/ND/SD/NH house; VT senate)
    const mmNote = p.querySelector('[data-mm-note]');
    if (mmNote){
      if (MULTIMEMBER_SET(chamber).has(stateAbbr)){
        const totalSeats = CHAMBER_SIZE(chamber)[stateAbbr] || s.features.length;
        mmNote.classList.add('show');
        mmNote.textContent = `Multi-member districts — ${s.features.length} districts elect ${totalSeats} legislators.`;
      } else {
        mmNote.classList.remove('show');
      }
    }

    const o = chamberOdds(chamber, stateAbbr);
    const isNotUp = !!(o && o.notUp);

    // Seat line: baseline projection for up states, current composition for not-up
    if (chamber === 'sldu' && isNotUp && o.lockedD != null){
      p.querySelector('[data-seats-d]').textContent = o.lockedD;
      p.querySelector('[data-seats-r]').textContent = o.lockedR;
    } else {
      p.querySelector('[data-seats-d]').textContent = s.totalD;
      p.querySelector('[data-seats-r]').textContent = s.totalR;
    }

    const bar = p.querySelector('[data-rating-bar]');
    const labels = p.querySelector('[data-rating-labels]');
    // For whole-chamber not-up states, there's no election this cycle,
    // so rating projections are meaningless — clear the bar entirely.
    if (isNotUp){
      bar.innerHTML = '';
      labels.innerHTML = '';
    } else {
      let barHTML = '', lblHTML = '';
      for (const r of RATINGS){
        const n = s.ratings[r.key] || 0;
        if (n === 0) continue;
        barHTML += `<div class="seg ${r.light?'light':''}" style="flex:${n};background:${r.color};" title="${r.label}: ${n}">${n}</div>`;
        lblHTML += `<div class="lbl" style="flex:${n};">${r.label}</div>`;
      }
      bar.innerHTML = barHTML;
      labels.innerHTML = lblHTML;
    }

    const oddsEl = p.querySelector('[data-odds-row]');
    if (oddsEl){
      if (!o) { oddsEl.innerHTML = ''; }
      else if (isNotUp){
        const why = stateAbbr === 'NE' ? 'unicameral'
                  : (chamber === 'sldu' && ['KS','NM','SC'].includes(stateAbbr)) ? 'presidential-year senate'
                  : 'odd-year state';
        if (chamber === 'sldu' && o.lockedD != null){
          oddsEl.innerHTML = `
            <div class="cell" style="grid-column:1/3;"><div class="lbl">Current D</div><div class="val d">${o.lockedD}</div></div>
            <div class="cell" style="grid-column:3/5;"><div class="lbl">Current R</div><div class="val r">${o.lockedR}</div></div>
            <div class="sldlOddsNone" style="grid-column:1/-1;margin-top:2px;">Not up in 2026 · ${why}</div>`;
        } else {
          oddsEl.innerHTML = `<div class="sldlOddsNone" style="grid-column:1/-1;">Not up in 2026 · ${why}</div>`;
        }
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

  function renderPanelDistrict(chamber, props){
    const p = panelForChamber(chamber); if (!p || !p.classList.contains('show')) return;
    const dst = p.querySelector('[data-district]'); if (!dst) return;
    const mProj = mOf(props);
    const r = rateDistrict(mProj);
    const marginClass = mProj == null ? '' : (mProj >= 0 ? 'd' : 'r');
    const wpD = winProbDistrict(mProj);
    const wpDPct = wpD != null ? Math.round(wpD * 100) : null;
    const wpRPct = wpDPct != null ? (100 - wpDPct) : null;
    const spark = buildSparkline(props._ratio);
    const notUp = NOT_UP_SET(chamber).has(props.state_abbr) || !isDistrictUp2026(chamber, props);
    const wpBlock = notUp
      ? '<div class="dstWpLabel" style="color:var(--muted);">Seat not up in 2026</div>'
      : (wpD != null
          ? `<div class="dstWpHeader"><span class="dstWpLabel">Win Probability</span><span class="dstWpNums"><span class="d">D ${wpDPct}%</span> <span class="r">R ${wpRPct}%</span></span></div>
             ${spark}`
          : '<div class="dstWpLabel" style="color:var(--muted);">No baseline data</div>');
    dst.innerHTML = `
      <div class="dstName">${props.NAMELSAD || 'District'}</div>
      <div class="dstRow"><span>Rating</span><span>${r ? `<span class="dstRating ${r.light?'light':''}" style="background:${r.color};">${r.label}</span>` : '—'}</span></div>
      <div class="dstRow"><span>Margin</span><span class="v ${marginClass}">${fmtMargin(mProj)}</span></div>
      <div class="dstRow"><span>Baseline</span><span class="v">${baselineLabel(props.baseline)}</span></div>
      <div class="dstWpSection">${wpBlock}</div>`;
  }

  function resetPanelToUS(chamber){
    const p = panelForChamber(chamber); if (!p) return;
    p.classList.add('show');
    p.querySelector('.sldlPanelTitle').textContent = 'US';
    const sub = p.querySelector('.sldlPanelSub'); if (sub) sub.textContent = CHAMBERS[chamber].label;
    p.querySelector('[data-seats-d]').textContent = '—';
    p.querySelector('[data-seats-r]').textContent = '—';
    const bar = p.querySelector('[data-rating-bar]'); if (bar) bar.innerHTML = '';
    const lbl = p.querySelector('[data-rating-labels]'); if (lbl) lbl.innerHTML = '';
    const odds = p.querySelector('[data-odds-row]');
    if (odds) odds.innerHTML = '<div class="sldlOddsNone" style="grid-column:1/-1;">Hover a state for majority odds</div>';
    const dst = p.querySelector('[data-district]');
    if (dst) dst.innerHTML = '<div class="dstPlaceholder">Hover a district</div>';
    const mm = p.querySelector('[data-mm-note]'); if (mm) mm.classList.remove('show');
  }

  // --- Map rendering ----------------------------------------
  function renderChamber(chamber){
    const svg = svgForChamber(chamber);
    if (!svg) return;
    const features = CS(chamber).features;
    if (!features) return;

    const W = 2880, H = 1800;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    svg.setAttribute('shape-rendering','geometricPrecision');
    svg.removeAttribute('width');
    svg.removeAttribute('height');

    const vs = viewState[chamber];
    const byState = CS(chamber).byState;
    const feats = vs.zoom === 'us' ? features : (byState && byState[vs.zoom] ? byState[vs.zoom].features : []);

    const isSane = f => {
      const b = d3.geoBounds(f);
      return isFinite(b[0][0]) && (b[1][0]-b[0][0]) < 30 && (b[1][1]-b[0][1]) < 30;
    };
    const conusFeats = (vs.zoom === 'us'
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

    sel.on('click.reset', function(ev){
      if (ev.target.tagName !== 'path' && vs.zoom !== 'us'){
        if (view === 'split'){
          syncZoomBothChambers('us', chamber);
        } else {
          vs.zoom = 'us';
          const zs = zoomSelect(); if (zs) zs.value = '';
          const ub = usBtn(); if (ub) ub.classList.add('active');
          renderChamber(chamber);
        }
      }
    });

    const strokeBase = vs.zoom === 'us' ? 1.5 : 2.4;

    zoomLayer.selectAll('path')
      .data(conusFeats, d => d.properties.GEOID)
      .join('path')
        .attr('d', path)
        .attr('fill', d => fillForChamber(chamber, mOf(d.properties), d.properties))
        .attr('stroke','rgba(255,255,255,0.4)')
        .attr('stroke-width', strokeBase)
      .on('mouseenter', function(ev, d){
        d3.select(this).attr('stroke','#1f2937').attr('stroke-width', strokeBase * 2.4);
        const st = d.properties.state_abbr;
        if (vs.zoom === 'us' && st){
          renderPanelForState(chamber, st);
          // Split mode: mirror the state hover to the OTHER chamber's panel
          // so both sides reflect the same state at a glance.
          if (view === 'split'){
            const other = chamber === 'sldl' ? 'sldu' : 'sldl';
            if (CS(other).byState) renderPanelForState(other, st);
          }
        }
        renderPanelDistrict(chamber, d.properties);
        showTip(d.properties, ev);
      })
      .on('mousemove', function(ev){ moveTip(ev); })
      .on('mouseleave', function(){
        d3.select(this).attr('stroke','rgba(255,255,255,0.4)').attr('stroke-width', strokeBase);
        hideTip();
      })
      .on('click', function(ev, d){
        ev.stopPropagation();
        const st = d.properties.state_abbr; if (!st) return;
        if (view === 'split'){
          syncZoomBothChambers(st, chamber);
        } else {
          vs.zoom = st;
          const zs = zoomSelect(); if (zs) zs.value = st;
          const ub = usBtn(); if (ub) ub.classList.remove('active');
          renderChamber(chamber);
        }
      });

    if (vs.zoom === 'us') resetPanelToUS(chamber);
    else renderPanelForState(chamber, vs.zoom);

    sel.on('.zoom', null);
    const zoom = d3.zoom()
      .scaleExtent([1, 24])
      .translateExtent([[-150,-150],[W+150,H+150]])
      .on('zoom', (ev) => {
        vs.transform = ev.transform;
        zoomLayer.attr('transform', ev.transform);
        zoomLayer.selectAll('path').attr('stroke-width', strokeBase / ev.transform.k);
      });
    sel.call(zoom);
    const zoomKey = view + '/' + chamber + '/' + vs.zoom;
    if (vs.lastZoomKey !== zoomKey){
      vs.lastZoomKey = zoomKey;
      vs.transform = d3.zoomIdentity;
      sel.call(zoom.transform, d3.zoomIdentity);
    } else if (vs.transform && vs.transform !== d3.zoomIdentity){
      sel.call(zoom.transform, vs.transform);
    }
  }

  function rerenderActive(){
    if (view === 'split'){
      renderChamber('sldl');
      renderChamber('sldu');
    } else {
      renderChamber(view);
    }
  }

  // --- Data loading (per chamber) ----------------------------
  async function loadChamber(chamber){
    const state = CHAMBER_STATE[chamber];
    if (state.loaded || state.loading) return;
    state.loading = true;
    const ch = CHAMBERS[chamber];
    try {
      const res = await fetch(ch.topoUrl);
      if (!res.ok) throw new Error(`fetch ${ch.topoUrl}: HTTP ${res.status}`);
      const rawText = await res.text();
      const trimmed = rawText.trimStart();
      if (!trimmed.startsWith('{')){
        const preview = rawText.slice(0, 120).replace(/\s+/g, ' ');
        throw new Error(`${ch.topoUrl} did not return JSON (got: "${preview}…"). Is the file deployed at the site root?`);
      }
      let topo;
      try { topo = JSON.parse(rawText); }
      catch(pe){ throw new Error(`${ch.topoUrl} is not valid JSON: ${pe.message}`); }
      const objName = (topo.objects && topo.objects[ch.topoObject]) ? ch.topoObject : Object.keys(topo.objects||{})[0];
      if (!objName) throw new Error(`${ch.topoUrl} has no topojson objects`);
      const fc = topojson.feature(topo, topo.objects[objName]);
      state.features = fc.features || [];

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
            const geoid = c[iGeoid]; if (!geoid) continue;
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
            if (lean){ p.dem_pct = lean.dem_pct; p.margin = lean.margin; p.baseline = lean.baseline; matched++; }
          }
          console.log(`[state-legs/${chamber}] joined lean data: ${matched}/${state.features.length} districts`);
        } catch (e){ console.error(`[state-legs/${chamber}] lean csv load failed`, e); }
      } else {
        const hasAny = state.features.some(f => f.properties && f.properties.margin != null);
        console.log(`[state-legs/${chamber}] embedded properties: ${state.features.length} districts${hasAny?'':' (no margin data found!)'}`);
      }

      // Hispanic CSV (optional — silent no-op if missing)
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
              const dict = HISPANIC_SHARE[chamber];
              let kept = 0, skipped = 0;
              for (let i = 1; i < lines.length; i++){
                const c = lines[i].split(',');
                const geoid = c[iG];
                const h = parseFloat(c[iH]);
                if (geoid && isFinite(h)){
                  if (h >= 0.5){ dict[geoid] = h; kept++; } else skipped++;
                }
              }
              console.log(`[state-legs/${chamber}] Hispanic share: ${kept} districts ≥50% (${skipped} below threshold, ignored)`);
            }
          } else {
            console.log(`[state-legs/${chamber}] no Hispanic CSV at ${ch.hispCsvUrl} (adjustment disabled)`);
          }
        } catch (e){ console.log(`[state-legs/${chamber}] Hispanic CSV not available (adjustment disabled)`); }
      }

      attachRatios(chamber);
      applyProjection(chamber);
      hideOldTooltips();

      const hasAnyMargin = state.features.some(f => f.properties && f.properties.margin != null && isFinite(f.properties.margin));
      if (!hasAnyMargin){
        const stage = bannerParent(chamber);
        if (stage && !stage.querySelector('.sldlDataBanner')){
          const b = document.createElement('div');
          b.className = 'sldlDataBanner';
          b.textContent = `No partisan data in ${ch.topoUrl.replace('./','')}`;
          stage.appendChild(b);
        }
      }

      state.loaded = true;
    } catch(e){
      console.error(`[state-legs/${chamber}] load failed`, e);
      const stage = bannerParent(chamber);
      if (stage && !stage.querySelector('.sldlDataBanner')){
        const b = document.createElement('div');
        b.className = 'sldlDataBanner';
        b.textContent = `Failed to load ${ch.topoUrl.replace('./','')} — ${e.message}`;
        stage.appendChild(b);
      }
    } finally { state.loading = false; }

    if (!_gbStarted){ _gbStarted = true; await loadGbHistory(); startGbWatcher(); }
  }
  let _gbStarted = false;

  // --- Wiring (single-map zoom controls) ---------------------
  function wireSingleModeControls(){
    const r = root(); if (!r) return;
    r.addEventListener('click', (ev) => {
      const btn = ev.target.closest('.modeCol[data-mode="sldu"] [data-sldl-zoom]');
      if (!btn) return;
      const z = btn.getAttribute('data-sldl-zoom');
      if (view === 'split'){
        // In split view, the sldu modeCol hosts the HOUSE map. Pass 'sldl'
        // as the chamber hint so independent-zoom mode updates only the
        // house side.
        syncZoomBothChambers(z, 'sldl');
      } else {
        viewState[currentChamber].zoom = z;
        r.querySelectorAll('.modeCol[data-mode="sldu"] [data-sldl-zoom]')
          .forEach(b => b.classList.toggle('active', b===btn));
        const sel = zoomSelect(); if (sel) sel.value = '';
        renderChamber(currentChamber);
      }
    });
    const setupSelect = () => {
      const sel = zoomSelect(); if (!sel || sel._wired) return;
      sel._wired = true;
      sel.addEventListener('change', () => {
        if (!sel.value) return;
        if (view === 'split'){
          syncZoomBothChambers(sel.value, 'sldl');
        } else {
          viewState[currentChamber].zoom = sel.value;
          const ub = usBtn(); if (ub) ub.classList.remove('active');
          renderChamber(currentChamber);
        }
      });
    };
    setupSelect();
    requestAnimationFrame(setupSelect);

    window.addEventListener('resize', () => rerenderActive());
  }

  // --- Page tab entry ----------------------------------------
  async function handleTabClick(ev){
    const btn = ev.target.closest('.pageTab');
    if (!btn) return;
    const page = btn.dataset.page;
    const r = root(); if (!r) return;
    if (page === 'state-legs'){
      r.style.display = 'grid';
      r.classList.add('sldl-active');
      if (view === 'split'){
        ensureSplitLayout();
        await Promise.all(['sldl','sldu'].map(ensureChamberLoaded));
        populateStateSelectForPanel(splitZoomSelect('sldl'), CS('sldl').byState);
        populateStateSelectForPanel(splitZoomSelect('sldu'), CS('sldu').byState);
        renderChamber('sldl'); renderChamber('sldu');
      } else {
        await ensureChamberLoaded(view);
        populateStateSelectForPanel(zoomSelect(), CS(view).byState);
        renderChamber(view);
      }
    } else {
      r.classList.remove('sldl-active');
      r.style.display = 'none';
    }
  }

  function init(){
    const r = root(); if (!r) return;
    injectStyles();
    injectToolbar();
    const st = stageEl();
    if (st) ensurePanel(st);
    setCardTitles();
    wireSingleModeControls();

    const nav = document.querySelector('.pageTabs');
    if (nav) {
      nav.addEventListener('click', handleTabClick);
      nav.addEventListener('click', handleTabClick, true);
    }
    r.style.display = 'none';
  }

  // Debug helper
  window.sldlDebug = function(stateAbbr){
    if (!stateAbbr) stateAbbr = 'GA';
    const chambersToTry = view === 'split' ? ['sldl','sldu'] : [currentChamber];
    const out = { view, currentChamber, chambers_inspected: chambersToTry, gbCurrent };
    for (const ch of chambersToTry){
      const bs = CS(ch).byState;
      if (!bs || !bs[stateAbbr]){ out[ch] = { error: 'no state ' + stateAbbr }; continue; }
      const s = bs[stateAbbr];
      const margins = s.features.map(f => f.properties._projMargin).filter(x => x != null).sort((a,b)=>a-b);
      out[ch] = {
        chamber_size: CHAMBER_SIZE(ch)[stateAbbr],
        features: s.features.length,
        null_margins: s.features.length - margins.length,
        seats_up_2026: seatsUp2026(ch, stateAbbr, s.features.length),
        current_senate_comp: ch==='sldu' ? CURRENT_SENATE_COMP_2025[stateAbbr] : null,
        odds: chamberOdds(ch, stateAbbr),
        mean_margin: margins.length ? +(margins.reduce((a,b)=>a+b,0)/margins.length).toFixed(2) : null,
        median_margin: margins.length ? +margins[Math.floor(margins.length/2)].toFixed(2) : null,
        totalD: s.totalD, totalR: s.totalR,
        multi_member: MULTIMEMBER_SET(ch).has(stateAbbr),
      };
    }
    console.log(`=== sldlDebug(${stateAbbr}) ===`);
    console.log(JSON.stringify(out, null, 2));
    return out;
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
