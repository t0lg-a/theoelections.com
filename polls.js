/* ========== Polls Page Module (v11 — full rewrite) ========== */
(function(){
"use strict";

const FONT = "'Switzer',ui-sans-serif,system-ui,sans-serif";
let pollsInited = false;

/* ---- The data palette. Colour appears only where a datum is, so these are
   read for the figures on this surface and nowhere else. ---- */
function tok(name, fallback){
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}
const INK      = () => tok("--t-ink", "#16171A");
const PAPER    = () => tok("--t-paper", "#E9E8E0");
const MUTED    = () => tok("--t-muted", "#6E6C61");
const HAIR     = () => tok("--t-hair", "#CBC8BC");
const DEM_INK  = () => tok("--t-d5", "#1E6FD9");
const REP_INK  = () => tok("--t-d1", "#D62828");
const OVERPRINT= () => tok("--t-overprint", "#191122");

/* Geography obeys the colour law: paper for units with no datum, the two-way
   inks by margin, overprint for a contested unit. */
function pollsFill(margin){
  if (!isFinite(margin)) return PAPER();
  const a = Math.abs(margin);
  if (a < 2) return OVERPRINT();
  const t = Math.min(1, Math.max(0, a / 25));
  return mixToPaper(margin > 0 ? REP_INK() : DEM_INK(), 0.22 + 0.78 * t);
}

function mixToPaper(hex, amount){
  const p = parseHex(PAPER()) || [233, 232, 224];
  const c = parseHex(hex) || [22, 23, 26];
  const m = c.map((v, i) => Math.round(p[i] * (1 - amount) + v * amount));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}

function parseHex(s){
  const m = String(s).trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const PUI = {};          // per-mode UI refs
const PMAP = {};         // per-mode map handles
const PSEL = { senate:null, governor:null }; // selected state

/* ---- Pollster weight tiers ---- */
// A+/A rated pollsters → 1x
const TIER_A = new Set([
  "marquette","marquette law school",
  "beacon","beaconresearch","shaw","beacon-shaw","beacon/shaw",
  "echelon","echelon insights",
  "hart","hartresearch","publicopinionstrategies","hart-pos","hart/pos",
  "insideradvantage","insider advantage",
  "marist",
  "research co.","research co",
  "siena","siena-nyt","newyorktimes","siena college/the new york times","nyt/siena",
  "susquehanna",
  "east carolina university","east carolina",
  "fabrizio-impact","fabrizio/impact"
]);
// Downweighted pollsters → 0.4x
const TIER_C = new Set(["yougov","ipsos"]);
// Everything else on the AP list (not A+/A rated) → 0.75x
const TIER_B = new Set([
  "verasight",
  "arg","americanresearchgroup","american research group",
  "tipp","tipp insights",
  "emerson","emerson college",
  "gallup",
  "quinnipiac","quinnipiac university",
  "apnorc","ap-norc","norc",
  "cnnssrs","cnn/ssrs","cnn-ssrs","ssrs",
  "atlasintel","atlas",
  "pew","pewresearch","pew research",
  "surveymonkey","survey monkey",
  "leger",
  "umass","massachusetts","departmentofpoliticalscience",
  "foxnews","fox news","fox news/beacon","fox/beacon",
  "wsj","wallstreetjournal","wall street journal"
]);

function pollWeight(pollster){
  if(!pollster) return 0.1;
  const key = String(pollster).toLowerCase().trim();
  if(TIER_A.has(key)) return 1;
  if(TIER_C.has(key)) return 0.25;
  if(TIER_B.has(key)) return 0.75;
  return 0.1;
}

/* ---- Approval data ---- */
let APP_RAW = [];        // {date,approve,disapprove,pollster}
let APP_SERIES = [];     // moving avg [{date,a,b}]

function loadApproval(j){
  APP_RAW = (j.approval||[]).map(p=>{
    const date=parseDate(p.end_date||p.start_date||p.created_at);
    let ap=null,dis=null;
    for(const a of(p.answers||[])){
      const c=String(a.choice||"").toLowerCase();
      if(c==="approve"||c==="yes") ap=+a.pct;
      if(c==="disapprove"||c==="no") dis=+a.pct;
    }
    return{date,approve:ap,disapprove:dis,pollster:p.pollster||""};
  }).filter(p=>p.date&&isFinite(p.approve)&&isFinite(p.disapprove));
  APP_RAW.sort((a,b)=>a.date-b.date);
  // dedupe
  APP_RAW = dedupe(APP_RAW,"date","pollster");
  const strict=!!GB_SRC.filterStrict;
  const f=APP_RAW.filter(p=>isAllowedPollster(p.pollster,strict));
  APP_SERIES=movAvg(f.map(p=>({date:p.date,a:p.approve,b:p.disapprove,pollster:p.pollster})),24);
}

function dedupe(arr,dk,pk){
  const seen=new Set();
  return arr.filter(p=>{
    const key=ds(p[dk])+"|"+String(p[pk]||"").toLowerCase().trim();
    if(seen.has(key))return false;
    seen.add(key); return true;
  });
}

function movAvg(sorted,targetW){
  if(!sorted.length)return[];
  const n=sorted.length;
  const out=[];let hi=0;
  const t1=new Date();t1.setHours(0,0,0,0);
  const end=t1>sorted[n-1].date?t1:sorted[n-1].date;
  for(let d=new Date(sorted[0].date);d<=end;d.setDate(d.getDate()+1)){
    while(hi<n&&sorted[hi].date<=d)hi++;
    if(hi===0)continue;
    let wS=0,wA=0,wB=0;
    for(let i=hi-1;i>=0&&wS<targetW;i--){
      const pw=pollWeight(sorted[i].pollster);
      wA+=sorted[i].a*pw; wB+=sorted[i].b*pw; wS+=pw;
    }
    if(wS>0)out.push({date:new Date(d),a:wA/wS,b:wB/wS});
  }
  return out;
}

function movAvgSimple(sorted,N){
  if(!sorted.length)return[];
  const n=sorted.length;
  const pA=new Float64Array(n+1),pB=new Float64Array(n+1);
  for(let i=0;i<n;i++){pA[i+1]=pA[i]+sorted[i].a;pB[i+1]=pB[i]+sorted[i].b;}
  const out=[];let hi=0;
  const t1=new Date();t1.setHours(0,0,0,0);
  const end=t1>sorted[n-1].date?t1:sorted[n-1].date;
  for(let d=new Date(sorted[0].date);d<=end;d.setDate(d.getDate()+1)){
    while(hi<n&&sorted[hi].date<=d)hi++;
    const lo=Math.max(0,hi-N),c=hi-lo;
    if(c>0)out.push({date:new Date(d),a:(pA[hi]-pA[lo])/c,b:(pB[hi]-pB[lo])/c});
  }
  return out;
}

function gbDeduped(){
  const raw=(GB_SRC.raw||[]).filter(p=>p&&p.date&&isFinite(p.dem)&&isFinite(p.rep));
  const strict=!!GB_SRC.filterStrict;
  const f=raw.filter(p=>isAllowedPollster(p.pollster,strict));
  f.sort((a,b)=>a.date-b.date);
  return dedupe(f,"date","pollster");
}

/* ---- Left mode ---- */
let LMODE="gb";

/* ======== INIT ======== */
async function initPollsPage(){
  console.log("initPollsPage v11");
  if(!APP_RAW.length){
    try{const j=await fetch("/json/polls.json",{cache:"no-store"}).then(r=>r.json());loadApproval(j);}catch(e){console.warn(e);}
  }
  buildUI("gb"); buildUI("senate"); buildUI("governor");
  if(!pollsInited) wireToggle();
  pollsInited=true;

  await new Promise(r=>setTimeout(r,250));

  try{renderLeft();}catch(e){console.error("left:",e);}
  try{await initMode("senate");}catch(e){console.error("sen:",e);}
  try{await initMode("governor");}catch(e){console.error("gov:",e);}
  try{pickState("senate","TX");}catch(e){}
  try{pickState("governor","AZ");}catch(e){}
}

function buildUI(m){
  const pg=document.getElementById("pollsPage"); if(!pg)return;
  const cards=pg.querySelectorAll(`[data-polls-mode='${m}']`);
  const q=s=>{for(const c of cards){const el=c.matches(s)?c:c.querySelector(s);if(el)return el;}return null;};
  PUI[m]={
    topCard:q(".topCard"),
    dPill:q("[data-polls-d]"), rPill:q("[data-polls-r]"),
    dBig:q("[data-polls-d-big]"), rBig:q("[data-polls-r-big]"),
    dLbl:q("[data-polls-d-lbl]"), rLbl:q("[data-polls-r-lbl]"),
    hist:q("[data-polls-hist]"),
    chart:q("[data-polls-chart]"),
    chartTitle:q("[data-polls-chart-title]"), chartSub:q("[data-polls-chart-sub]"),
    map:q("[data-polls-map]"),
    stChart:q("[data-polls-state-chart]"),
    stTitle:q("[data-polls-state-chart-title]"),
    list:q("[data-polls-list]"),
  };
}

function wireToggle(){
  const pg=document.getElementById("pollsPage"); if(!pg)return;
  pg.querySelectorAll("[data-polls-toggle]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      pg.querySelectorAll("[data-polls-toggle]").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      LMODE=btn.dataset.pollsToggle;
      renderLeft();
    });
  });
}

/* ======== LEFT COLUMN ======== */
function renderLeft(){
  const ui=PUI.gb; if(!ui)return;
  LMODE==="approval"?renderApproval(ui):renderGB(ui);
}

function renderGB(ui){
  const polls=gbDeduped();
  const lat=GB_SRC.latest; if(!lat)return;
  const dV=+lat.dem,rV=+lat.rep;
  setNum(ui,dV,rV,"D","R");
  colorTop(ui,dV>rV);
  resetPillColor(ui);
  if(ui.chartTitle)ui.chartTitle.textContent="Generic Ballot";
  if(ui.chartSub)ui.chartSub.textContent="Scatter · moving average";

  const ser=(GB_SRC.series||[]).map(s=>({date:parseDate(s.date),a:+s.dem,b:+s.rep})).filter(d=>d.date);
  drawMarginTimeline(ui.hist, ser.map(d=>({date:d.date,margin:d.a-d.b})));
  dualScatter(ui.chart, polls.map(p=>({date:p.date,a:+p.dem,b:+p.rep})), ser, "D","R");
  pollTable(ui.list, polls.sort((a,b)=>b.date-a.date).slice(0,100).map(p=>({date:p.date,ps:p.pollster,a:p.dem,b:p.rep})),"D","R",DEM_INK(),REP_INK());
}

function renderApproval(ui){
  if(!APP_SERIES.length)return;
  const lat=APP_SERIES[APP_SERIES.length-1];
  setNum(ui,lat.a,lat.b,"App","Dis");
  if(ui.topCard)ui.topCard.classList.remove("leads-d","leads-r");
  greenPill(ui);
  if(ui.chartTitle)ui.chartTitle.textContent="Presidential Approval";
  if(ui.chartSub)ui.chartSub.textContent="Scatter · moving average";

  const strict=!!GB_SRC.filterStrict;
  const polls=APP_RAW.filter(p=>isAllowedPollster(p.pollster,strict));
  drawMarginTimeline(ui.hist, APP_SERIES.map(d=>({date:d.date,margin:d.a-d.b})), INK(), MUTED(), "app", "dis");
  dualScatter(ui.chart, polls.map(p=>({date:p.date,a:p.approve,b:p.disapprove})), APP_SERIES, "app","dis",INK(),MUTED());
  pollTable(ui.list, polls.sort((a,b)=>b.date-a.date).slice(0,100).map(p=>({date:p.date,ps:p.pollster,a:p.approve,b:p.disapprove})),"app","dis",INK(),MUTED());
}

function setNum(ui,a,b,lA,lB){
  // Absent is absent, not zero, and never a plausible-looking placeholder.
  const fmt=v=>isFinite(+v)?(+v).toFixed(1):"absent";
  if(ui.dPill)ui.dPill.textContent=fmt(a);
  if(ui.rPill)ui.rPill.textContent=fmt(b);
  if(ui.dBig){ui.dBig.textContent=fmt(a);ui.dBig.classList.toggle("isAbsent",!isFinite(+a));}
  if(ui.rBig){ui.rBig.textContent=fmt(b);ui.rBig.classList.toggle("isAbsent",!isFinite(+b));}
  if(ui.dLbl)ui.dLbl.textContent=lA;
  if(ui.rLbl)ui.rLbl.textContent=lB;
}
function colorTop(ui,dLead){
  if(!ui.topCard)return;
  ui.topCard.classList.remove("leads-d","leads-r");
  ui.topCard.classList.add(dLead?"leads-d":"leads-r");
}
function resetPillColor(ui){
  const el=ui.dPill?.closest(".metricPill");
  if(el){el.classList.add("blue");el.querySelector(".dot").style.background="";}
  const s=ui.dBig?.closest(".seatsSide"); if(s)s.style.color="";
}
function greenPill(ui){
  const APPROVE = INK();
  const el=ui.dPill?.closest(".metricPill");
  if(el){el.classList.remove("blue");el.querySelector(".dot").style.background=APPROVE;}
  const s=ui.dBig?.closest(".seatsSide"); if(s)s.style.color=APPROVE;
}

/* ======== THE MARGIN TIMELINE ======== */
/* [6.19][6.20] A bar per day, off the even-vote rule.

   It had no axis and no scale: a bar's height could only be read against
   the bars beside it, so a series that was steadily D+8 looked exactly like
   one that was steadily D+2. Now the vessel carries its scale on the left —
   the step it tops out at, the rule at zero, and the step below it — and
   every quantity in the furniture comes from the tokens the SVG axes are
   built from, so the two cannot drift apart. */
function drawMarginTimeline(canvas,rawPolls,cAbove,cBelow,lAbove,lBelow){
  // rawPolls = [{date, margin}]. Group by day, average, then draw bar per day.
  if(!canvas)return;
  const W=canvas.clientWidth||300, H=canvas.clientHeight||48;
  const dpr=devicePixelRatio||1;
  canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr);
  const ctx=canvas.getContext("2d");
  ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,W,H);
  if(!rawPolls.length)return;

  // Group by day key, average margins
  const byDay=new Map();
  for(const p of rawPolls){
    if(!p.date)continue;
    const k=ds(p.date);
    if(!byDay.has(k)) byDay.set(k,{date:p.date,sum:0,n:0});
    const d=byDay.get(k); d.sum+=p.margin; d.n++;
  }
  const days=[...byDay.values()].map(d=>({date:d.date,margin:d.sum/d.n})).sort((a,b)=>a.date-b.date);
  if(!days.length)return;

  const bl=cAbove||DEM_INK();
  const rd=cBelow||REP_INK();
  // Extend to today
  const minD=days[0].date;
  const today=new Date(); today.setHours(0,0,0,0);
  const maxD=today>days[days.length-1].date?today:days[days.length-1].date;
  const span=maxD-minD||1;
  // A fixed scale in points, stepped up only when the data needs it. Scaling to
  // the observed maximum made a steady lead fill the whole vessel and hid the
  // shape of the series.
  const peak=Math.max(...days.map(d=>Math.abs(d.margin)));
  const SCALES=[5,10,15,20,30,40];
  const maxAbs=SCALES.find(v=>peak<=v*0.92)||Math.ceil(peak/10)*10;

  // [6.19] The scale's furniture: a tick's length, the gap to its label, the
  // label's size and the two rule weights, all read from the tokens.
  const AX=window.__axis;
  const TICK=AX.tokenPx("--t-tick",5), GAP=AX.tokenPx("--t-tick-gap",4);
  const FS=AX.tokenPx("--t-fs-1",11);
  const HAIRW=AX.tokenPx("--t-w-hair",1), RULEW=AX.tokenPx("--t-w-rule",1.5);
  const FAM=getComputedStyle(document.documentElement)
    .getPropertyValue("--t-data").trim()||FONT;
  ctx.font="600 "+FS+"px "+FAM;

  // The scale is labelled in the direction it means, not in bare numbers: a
  // bar reaching the top step is a ten point lead for somebody in particular.
  const above=lAbove||"D", below=lBelow||"R";
  const topLbl=above+"+"+maxAbs, botLbl=below+"+"+maxAbs;
  const gutter=Math.ceil(Math.max(ctx.measureText(topLbl).width,
                                  ctx.measureText(botLbl).width,
                                  ctx.measureText("0").width))+TICK+GAP;
  const pad=Math.ceil(FS/2)+1;              // room for the outer labels
  const plotX=gutter, plotW=Math.max(10,W-gutter);
  const mid=Math.round(H/2);
  const half=Math.max(4,mid-pad);           // pixels per maxAbs points

  // The half step, drawn across the vessel, so the eye has something to
  // measure a bar against between the rule and the top of the scale.
  ctx.strokeStyle=HAIR(); ctx.lineWidth=HAIRW;
  for(const dir of [-1,1]){
    const yy=Math.round(mid+dir*half*0.5)+0.5;
    ctx.beginPath(); ctx.moveTo(plotX,yy); ctx.lineTo(W,yy); ctx.stroke();
  }

  // Each bar stretches from its date to the next day's date (no gaps)
  for(let i=0;i<days.length;i++){
    const d=days[i];
    const x=plotX+((d.date-minD)/span)*plotW;
    const nextD=i<days.length-1?days[i+1].date:maxD;
    const x2=plotX+((nextD-minD)/span)*plotW;
    const bw=Math.max(2, x2-x);
    const barH=Math.min(1,Math.abs(d.margin)/maxAbs)*half;
    ctx.fillStyle=d.margin>=0?bl:rd;
    if(d.margin>=0){
      ctx.fillRect(x,mid-barH,bw-0.5,barH);
    } else {
      ctx.fillRect(x,mid,bw-0.5,barH);
    }
  }

  // [6.20] The axis: three steps, each with its tick and its label.
  ctx.textAlign="right"; ctx.textBaseline="middle";
  ctx.strokeStyle=HAIR(); ctx.lineWidth=HAIRW;
  ctx.fillStyle=MUTED();
  for(const [yy,text] of [[mid-half,topLbl],[mid,"0"],[mid+half,botLbl]]){
    const y=Math.round(yy)+0.5;
    ctx.beginPath(); ctx.moveTo(plotX-TICK,y); ctx.lineTo(plotX,y); ctx.stroke();
    ctx.fillText(text,plotX-TICK-GAP,yy);
  }

  // The zero rule sits on top of the bars, never under them, and it is an
  // ink rule at the system's rule weight like every other threshold.
  ctx.strokeStyle=INK(); ctx.lineWidth=RULEW;
  ctx.beginPath(); ctx.moveTo(plotX,Math.round(mid)+0.5); ctx.lineTo(W,Math.round(mid)+0.5); ctx.stroke();

  canvas.setAttribute("data-scale",String(maxAbs));
  // The figure's accessible name carries the scale too: a reader who cannot
  // see the labels cannot read the bars without it.
  const host=canvas.closest('[data-polls-host="hist"]');
  const name="The daily margin off the even-vote rule, on a scale of "+
    topLbl+" to "+botLbl;
  canvas.setAttribute("aria-label",name);
  if(host) host.setAttribute("aria-label",name);
}

/* ======== DUAL SCATTER ======== */
function dualScatter(el,polls,avg,lA,lB,cA,cB){
  if(!el)return;
  const r=el.getBoundingClientRect();
  const W=Math.max(320,Math.floor(r.width||400)), H=Math.max(200,Math.floor(r.height||240));
  const svg=d3.select(el); svg.selectAll("*").remove(); svg.attr("viewBox",`0 0 ${W} ${H}`);
  const mg={l:38,r:10,t:10,b:26}, iw=W-mg.l-mg.r, ih=H-mg.t-mg.b;
  if(!polls.length)return;
  const blue=cA||DEM_INK();
  const red=cB||REP_INK();
  const ad=polls.map(d=>d.date).concat(avg.map(d=>d.date)).filter(Boolean);
  const xE=d3.extent(ad), av=polls.flatMap(d=>[d.a,d.b]);
  const yMn=Math.max(0,d3.min(av)-3), yMx=Math.min(100,d3.max(av)+3);
  const x=d3.scaleTime().domain(xE).range([mg.l,mg.l+iw]);
  const y=d3.scaleLinear().domain([yMn,yMx]).range([mg.t+ih,mg.t]).nice();
  svg.append("g").attr("class","oddsAxis").attr("transform",`translate(0,${mg.t+ih})`).call(window.__axis.time(x, iw));
  svg.append("g").attr("class","oddsAxis").attr("transform",`translate(${mg.l},0)`).call(window.__axis.value(y, ih, d=>`${d}%`));
  if(y.domain()[0]<=50&&y.domain()[1]>=50){
    svg.append("line").attr("x1",mg.l).attr("x2",mg.l+iw).attr("y1",y(50)).attr("y2",y(50)).attr("class","seatMajLine");
    svg.append("text").attr("class","thrLabel").attr("x",mg.l+iw).attr("y",y(50)-5).attr("text-anchor","end").text("50");
  }
  // [6.12][6.13] The mark vocabulary, from window.__mark: a hollow ring is
  // one poll, the solid line is the average of them. A pile-up of surveys
  // never reads as a tint of the series colour, and the two series nest so
  // that two polls taken the same day stay two polls.
  const MK=window.__mark;
  MK.rings(svg,polls,{x:d=>x(d.date),y:d=>y(d.a),ink:blue,series:0,of:2});
  MK.rings(svg,polls,{x:d=>x(d.date),y:d=>y(d.b),ink:red,series:1,of:2});
  if(avg.length>1){
    // [6.17][6.18] The average is computed per day and carries the last
    // polls forward, so a month without polling would otherwise draw at
    // full weight. It breaks there, and opens on the dash while a single
    // poll is behind it.
    const dates=polls.map(d=>d.date);
    const sup=MK.supportedBy(dates), behind=MK.countBehind(dates);
    const supported=d=>sup(d.date), provisional=d=>behind(d.date)<2;
    MK.average(svg,avg,{x:d=>x(d.date),y:d=>y(d.a),ink:blue,supported,provisional});
    MK.average(svg,avg,{x:d=>x(d.date),y:d=>y(d.b),ink:red,supported,provisional});
  }
  // hover
  const dot=MK.cursor(svg,blue);
  const dot2=MK.cursor(svg,red);
  const bis=d3.bisector(d=>d.date).left;
  const hd=avg.length>1?avg:polls;
  svg.append("rect").attr("x",mg.l).attr("y",mg.t).attr("width",iw).attr("height",ih).style("fill","transparent").style("cursor","crosshair")
    .on("mousemove",ev=>{if(!hd.length)return;const[mx]=d3.pointer(ev);const xd=x.invert(mx);const i=clamp(bis(hd,xd),1,hd.length-1);const p=hd[i-1],q=hd[i];const d=(xd-p.date)>(q.date-xd)?q:p;dot.attr("cx",x(d.date)).attr("cy",y(d.a)).style("opacity",1);dot2.attr("cx",x(d.date)).attr("cy",y(d.b)).style("opacity",1);showSimTip(ev,`<div class="stDate">${ds(d.date)}</div><div class="stRow"><span class="stDot" style="background:${blue}"></span><span class="stLbl">${lA}</span><span class="stVal">${d.a.toFixed(1)}%</span></div><div class="stRow"><span class="stDot" style="background:${red}"></span><span class="stLbl">${lB}</span><span class="stVal">${d.b.toFixed(1)}%</span></div>`);})
    .on("mouseleave",()=>{dot.style("opacity",0);dot2.style("opacity",0);hideSimTip();});
}

/* ======== POLL TABLE ======== */
function pollTable(el,rows,lA,lB,cA,cB){
  if(!el)return;
  if(!rows.length){el.innerHTML=`<div class="t-absent">no polls yet</div>`;return;}
  const ca=cA|| "#2a4570",cb=cB|| "#903629";
  const paper=PAPER();
  // [8.1][8.9][8.21] The record's type and its column rule live in
  // assets/theme.css; this writes structure and nothing else. Every header
  // carries a scope and the table carries a caption that states what it is
  // a record of, not what shape it is.
  let h=`<table><caption>Every poll behind this average, most recent first</caption>`;
  h+=`<thead><tr>`;
  const th=`position:sticky;top:0;background:${paper};z-index:2`;
  h+=`<th scope="col" style="${th}">date</th>`;
  h+=`<th scope="col" style="${th}">pollster</th>`;
  h+=`<th scope="col" style="${th}">${lA}</th>`;
  h+=`<th scope="col" style="${th}">${lB}</th>`;
  h+=`<th scope="col" style="${th}">margin</th>`;
  h+=`</tr></thead><tbody>`;
  for(const p of rows){
    const m=p.a-p.b;
    const ms=Math.abs(m)<.05?"tied":(m>0?`${lA}+${m.toFixed(1)}`:`${lB}+${Math.abs(m).toFixed(1)}`);
    const mc=m>0?ca:(m<0?cb:"var(--muted)");
    // [8.10][8.11] The pollster's name is truncated by measure in the
    // sheet, never by a character count here, and it carries its full name
    // for anyone who wants it.
    const ps = String(p.ps || "");
    h+=`<tr>`;
    h+=`<td class="recDate">${ds(p.date)}</td>`;
    h+=`<td class="recName" title="${escapeHtml(ps)}">${escapeHtml(ps)}</td>`;
    h+=`<td class="recNum">${(+p.a).toFixed(1)}</td>`;
    h+=`<td class="recNum">${(+p.b).toFixed(1)}</td>`;
    h+=`<td class="recNum recMargin">${ms}</td>`;
    h+=`</tr>`;
  }
  h+=`</tbody></table>`;
  el.innerHTML=h;
}

/* ======== SENATE / GOV COLUMNS ======== */
async function initMode(mk){
  const ui=PUI[mk]; if(!ui)return;
  // Default: show model seat tally
  const t=computeSeatTally(mk,IND_CACHE[mk]);
  setNum(ui,t.totalD,t.totalR,"D","R");
  colorTop(ui,t.totalD>t.totalR);

  // Margin histogram from all state polls
  const src=STATE_POLL_SRC.byModeState?.[mk];
  if(src){
    const pts=[];
    for(const st of Object.keys(src)) for(const p of src[st]) if(p.date&&isFinite(p.D)&&isFinite(p.R)) pts.push({date:p.date,a:p.D,b:p.R});
    pts.sort((a,b)=>a.date-b.date);
    const avg=movAvgSimple(pts,6);
    drawMarginTimeline(ui.hist, avg.map(d=>({date:d.date,margin:d.a-d.b})));
  }

  await initMap(mk);
  recolorMap(mk);
  if(ui.stTitle)ui.stTitle.textContent="Pick a state to read its polls";
}

/* ---- Maps (colored by POLLS) ---- */
async function initMap(mk){
  const ui=PUI[mk]; if(!ui?.map)return;
  const geo=await loadStateGeo();
  const W=960,H=600;
  const svg=d3.select(ui.map); svg.attr("viewBox",`0 0 ${W} ${H}`); svg.selectAll("*").remove();
  const proj=d3.geoAlbersUsa(); proj.fitExtent([[18,18],[W-18,H-18]],geo);
  const path=d3.geoPath(proj);
  const g=svg.append("g");
  g.selectAll("path").data(geo.features).join("path")
    .attr("class",d=>{const st=fipsToUsps(d.id);return(st&&DATA[mk]?.ratios[st])?"state active":"state";})
    .attr("data-st",d=>fipsToUsps(d.id)).attr("d",d=>path(d)).attr("fill","var(--neutral-bg)")
    .style("cursor",d=>{const st=fipsToUsps(d.id);return(st&&DATA[mk]?.ratios[st])?"pointer":"default";})
    .on("mouseenter",(ev,d)=>{
      const st=fipsToUsps(d.id);if(!st||!DATA[mk]?.ratios[st])return;
      d3.select(ev.currentTarget).classed("hovered",true)
        .classed("onDark",isDarkFill(ev.currentTarget.style.fill));
      showSimTip(ev,stateTipHtml(mk,st));
    })
    .on("mousemove",ev=>{const el=document.getElementById("simTip");if(el)showSimTip(ev,el.innerHTML);})
    .on("mouseleave",ev=>{d3.select(ev.currentTarget).classed("hovered",false).classed("onDark",false);hideSimTip();})
    .on("click",(ev,d)=>{const st=fipsToUsps(d.id);if(st&&DATA[mk]?.ratios[st])pickState(mk,st);})
    .attr("tabindex",d=>{const st=fipsToUsps(d.id);return(st&&DATA[mk]?.ratios[st])?0:null;})
    .attr("role",d=>{const st=fipsToUsps(d.id);return(st&&DATA[mk]?.ratios[st])?"button":null;})
    .attr("aria-label",d=>{
      const st=fipsToUsps(d.id);
      if(!st||!DATA[mk]?.ratios[st])return null;
      const pp=STATE_POLL_SRC.byModeState?.[mk]?.[st],n=pp?pp.length:0;
      return `${USPS_TO_NAME[st]||st}, ${n} poll${n===1?"":"s"}`;
    })
    .on("focus",(ev,d)=>{
      const st=fipsToUsps(d.id);if(!st||!DATA[mk]?.ratios[st])return;
      // [9.13] Focus is a heavier rule than hover, and it is set here for
      // the same reason it is in forecast.js: an SVG path is not a control.
      d3.select(ev.currentTarget).classed("hovered",true).classed("focused",true)
        .classed("onDark",isDarkFill(ev.currentTarget.style.fill));
      showSimTip(ev,stateTipHtml(mk,st));
    })
    .on("blur",ev=>{d3.select(ev.currentTarget).classed("hovered",false).classed("focused",false).classed("onDark",false);hideSimTip();})
    .on("keydown",(ev,d)=>{
      if(ev.key!=="Enter"&&ev.key!==" ")return;
      ev.preventDefault();
      const st=fipsToUsps(d.id);if(st&&DATA[mk]?.ratios[st])pickState(mk,st);
    });

  // Direct labels: geography is a figure, so the polled units name themselves
  // rather than sending the reader to a legend or a hover.
  const gl=svg.append("g").attr("class","mapLabels").attr("pointer-events","none");
  for(const f of geo.features){
    const st=fipsToUsps(f.id);
    if(!st||!DATA[mk]?.ratios[st])continue;
    const b=path.bounds(f), w=b[1][0]-b[0][0], h=b[1][1]-b[0][1];
    if(w<26||h<16)continue;   // too small to hold its own label
    const c=path.centroid(f);
    if(!isFinite(c[0])||!isFinite(c[1]))continue;
    gl.append("text").attr("class","mapLabel").attr("data-st",st)
      .attr("x",c[0]).attr("y",c[1]+3.5).attr("text-anchor","middle").text(st);
  }
  PMAP[mk]={svg,g,labels:gl};
  paintLabelContrast(mk);
}

/* One state's hover card: the name, the margin, and how many polls stand behind it. */
function stateTipHtml(mk,st){
  const pp=STATE_POLL_SRC.byModeState?.[mk]?.[st];
  const pc=pp?pp.length:0;
  const name=USPS_TO_NAME[st]||st;
  if(!pc) return `<div class="stDate">${name}</div><div class="stRow"><span class="stLbl">no polls yet</span></div>`;
  const w=Math.min(STATE_POLL_SRC.window||6,pp.length);
  let sD=0,sR=0;for(let i=pp.length-w;i<pp.length;i++){sD+=pp[i].D;sR+=pp[i].R;}
  const D=sD/w,R=sR/w,m=D-R;
  const ms=Math.abs(m)<.05?"tied":(m>0?`D+${m.toFixed(1)}`:`R+${Math.abs(m).toFixed(1)}`);
  return `<div class="stDate">${name} \u00B7 ${pc} poll${pc!==1?"s":""}</div>`+
    `<div class="stRow"><span class="stDot" style="background:${DEM_INK()}"></span><span class="stLbl">D</span><span class="stVal">${D.toFixed(1)}%</span></div>`+
    `<div class="stRow"><span class="stDot" style="background:${REP_INK()}"></span><span class="stLbl">R</span><span class="stVal">${R.toFixed(1)}%</span></div>`+
    `<div class="stRow"><span class="stLbl">margin</span><span class="stVal">${ms}</span></div>`;
}

/* A label sits on top of its unit's fill, so it flips to paper over a dark one. */
function paintLabelContrast(mk){
  const m=PMAP[mk]; if(!m?.labels)return;
  m.labels.selectAll("text.mapLabel").each(function(){
    const st=this.getAttribute("data-st");
    const unit=m.g.select(`path.state[data-st='${st}']`).node();
    const fill=unit?unit.style.fill:"";
    this.style.fill=isDarkFill(fill)?PAPER():INK();
  });
}

function isDarkFill(fill){
  const m=String(fill||"").match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  const rgb=m?[+m[1],+m[2],+m[3]]:parseHex(fill);
  if(!rgb)return false;
  // Rec. 601 luma; below this the paper type wins.
  return (0.299*rgb[0]+0.587*rgb[1]+0.114*rgb[2])<140;
}

function recolorMap(mk){
  const m=PMAP[mk]; if(!m?.g)return;
  m.g.selectAll("path.state").each(function(){
    const st=this.getAttribute("data-st");
    // Absent is absent, not zero: an unpolled state keeps the paper ground.
    // [7.17] And says so, in the map's text alternative.
    if(!st||!DATA[mk]?.ratios[st]){this.style.fill=PAPER();this.setAttribute("data-reading","no race this year");return;}
    const pp=STATE_POLL_SRC.byModeState?.[mk]?.[st];
    if(!pp||!pp.length){this.style.fill=PAPER();this.setAttribute("data-reading","no polls yet");return;}
    const w=Math.min(STATE_POLL_SRC.window||6,pp.length);
    let sD=0,sR=0;for(let i=pp.length-w;i<pp.length;i++){sD+=pp[i].D;sR+=pp[i].R;}
    const mg=(sR/w)-(sD/w);
    this.style.fill=pollsFill(mg);
    this.setAttribute("data-reading",
      window.__geo.marginReading(mg)+" from "+pp.length+" poll"+(pp.length===1?"":"s"));
  });
  paintLabelContrast(mk);
  renderStateAgate(mk);
}

/* [8.18] The state list, in agate.

   The map holds the shape of the contest; only a list holds the numbers,
   and until now the only way to read a state's average was to hover it. A
   thirty-five row table would have run past the map it belongs to, so this
   is the dense-list form: swatch, state, margin, two columns of them. The
   swatch takes the map's own fill, so the list and the map cannot disagree,
   and the margin is written out in words beside it so the list reads
   without the colour as well as with it. */
function renderStateAgate(mk){
  const host=document.querySelector(
    `.agateHost[data-polls-host="agate"][data-mode="${mk}"]`);
  if(!host||typeof window.__agate!=="function")return;
  const src=STATE_POLL_SRC.byModeState?.[mk]||{};
  const rows=[];
  for(const st of Object.keys(DATA[mk]?.ratios||{})){
    const pp=src[st];
    const name=USPS_TO_NAME[st]||st;
    if(!pp||!pp.length){
      // Absent is absent, not zero: an unpolled race is listed as unpolled
      // rather than left out, because leaving it out is a different claim.
      rows.push({name,value:"no polls yet",ink:null,lean:"none"});
      continue;
    }
    const w=Math.min(STATE_POLL_SRC.window||6,pp.length);
    let sD=0,sR=0;for(let i=pp.length-w;i<pp.length;i++){sD+=pp[i].D;sR+=pp[i].R;}
    const m=(sR/w)-(sD/w);
    rows.push({
      name,
      value:window.__geo.marginReading(m),
      ink:pollsFill(m),
      lean:!isFinite(m)?"none":Math.abs(m)<2?"contested":(m>0?"r":"d"),
    });
  }
  rows.sort((a,b)=>a.name.localeCompare(b.name));
  window.__agate(host,rows,{
    caption:"Every race on the map above and where its polling average stands",
    empty:"no polls yet",
  });
}

/* ---- State Selection ---- */
function pickState(mk,usps){
  PSEL[mk]=usps;
  const ui=PUI[mk]; if(!ui)return;
  // Mark the selected unit by rule, not by colour, and let the stylesheet own it.
  const m=PMAP[mk];
  if(m?.g){
    m.g.selectAll("path.state")
      .classed("selected",function(){ return this.getAttribute("data-st")===usps; })
      .classed("onDark",function(){
        return this.getAttribute("data-st")===usps && isDarkFill(this.style.fill);
      });
    // A selected unit is raised so its contour is never clipped by a neighbour.
    const sel=m.g.select(`path.state[data-st='${usps}']`).node();
    if(sel&&sel.parentNode) sel.parentNode.appendChild(sel);
  }
  if(m?.labels) m.labels.selectAll("text.mapLabel").classed("selected",function(){
    return this.getAttribute("data-st")===usps;
  });

  // Update big numbers to show this state's poll average
  const pp=STATE_POLL_SRC.byModeState?.[mk]?.[usps];
  let avgD=NaN,avgR=NaN;
  if(pp&&pp.length){
    const w=Math.min(STATE_POLL_SRC.window||6,pp.length);
    let sD=0,sR=0;for(let i=pp.length-w;i<pp.length;i++){sD+=pp[i].D;sR+=pp[i].R;}
    avgD=sD/w; avgR=sR/w;
    setNum(ui,avgD,avgR,"D","R");
    colorTop(ui,avgD>avgR);
  } else {
    setNum(ui,NaN,NaN,"D","R");
  }

  const name=USPS_TO_NAME[usps]||usps;
  const n=pp?pp.length:0;
  const finding=raceFinding(name,avgD,avgR,n);
  if(ui.stTitle)ui.stTitle.textContent=finding;
  stateScatter(mk,usps);
  // [10.12] The chart under this just changed; say what it now shows.
  if(window.__announce) window.__announce(finding);
}

/* A figure is titled with what it found, not with what it is. */
function raceFinding(name,D,R,n){
  if(!n||!isFinite(D)||!isFinite(R)) return `No polling in ${name} yet`;
  const m=D-R;
  if(Math.abs(m)<0.5) return `${name} is a tied race`;
  const lead=m>0?"Democrats":"Republicans";
  return `${lead} lead ${name} by ${Math.abs(m).toFixed(1)}`;
}

function stateScatter(mk,usps){
  const ui=PUI[mk]; const el=ui?.stChart; if(!el)return;
  const polls=(STATE_POLL_SRC.byModeState?.[mk]?.[usps]||[]).map(p=>({date:p.date,a:+p.D,b:+p.R,ps:p.pollster||"",partisan:p.partisan||null})).sort((a,b)=>a.date-b.date);
  const r=el.getBoundingClientRect();
  const W=Math.max(320,Math.floor(r.width||400)),H=Math.max(180,Math.floor(r.height||220));
  const svg=d3.select(el); svg.selectAll("*").remove(); svg.attr("viewBox",`0 0 ${W} ${H}`);
  const mg={l:38,r:10,t:10,b:26},iw=W-mg.l-mg.r,ih=H-mg.t-mg.b;
  // Absent is absent, not zero: an empty vessel with its word inside.
  if(!polls.length){
    const bh=Math.min(72,ih);
    svg.append("rect").attr("x",mg.l).attr("y",mg.t+(ih-bh)/2).attr("width",iw).attr("height",bh)
      .attr("fill",PAPER()).attr("stroke",INK()).attr("stroke-width",2);
    svg.append("text").attr("x",mg.l+iw/2).attr("y",mg.t+ih/2+4).attr("text-anchor","middle")
      .attr("fill",MUTED()).attr("font-family",FONT).attr("font-size","12px").attr("font-weight","600")
      .text("no polls yet");
    return;
  }
  const av=polls.flatMap(d=>[d.a,d.b]);
  const yMn=Math.max(0,d3.min(av)-3),yMx=Math.min(100,d3.max(av)+3);
  const x=d3.scaleTime().domain(d3.extent(polls,d=>d.date)).range([mg.l,mg.l+iw]);
  const y=d3.scaleLinear().domain([yMn,yMx]).range([mg.t+ih,mg.t]).nice();
  svg.append("g").attr("class","oddsAxis").attr("transform",`translate(0,${mg.t+ih})`).call(window.__axis.time(x, iw));
  svg.append("g").attr("class","oddsAxis").attr("transform",`translate(${mg.l},0)`).call(window.__axis.value(y, ih, d=>`${d}%`));
  if(y.domain()[0]<=50&&y.domain()[1]>=50) svg.append("line").attr("x1",mg.l).attr("x2",mg.l+iw).attr("y1",y(50)).attr("y2",y(50)).attr("class","seatMajLine");
  const blue=DEM_INK(),red=REP_INK();
  // [6.12][6.14] The same vocabulary the generic ballot draws in, so a ring
  // on this chart is the same claim as a ring on that one. The two series
  // nest at unequal radii, no alpha: two coincident polls stay two polls
  // instead of blending into a colour the palette does not contain.
  const MK=window.__mark;
  MK.rings(svg,polls,{x:d=>x(d.date),y:d=>y(d.a),ink:blue,series:0,of:2});
  MK.rings(svg,polls,{x:d=>x(d.date),y:d=>y(d.b),ink:red,series:1,of:2});
  if(polls.length>=3){
    const wn=Math.min(6,polls.length),ag=[];
    for(let i=0;i<polls.length;i++){const lo=Math.max(0,i-wn+1);let sA=0,sB=0;for(let j=lo;j<=i;j++){sA+=polls[j].a;sB+=polls[j].b;}const c=i-lo+1;ag.push({date:polls[i].date,a:sA/c,b:sB/c,n:c});}
    // [6.17][6.18] State polling is sparse: a race polled in March and again
    // in September is two observations, not a six-month trend.
    const dates=polls.map(d=>d.date);
    const sup=MK.supportedBy(dates);
    const supported=d=>sup(d.date), provisional=d=>d.n<2;
    MK.average(svg,ag,{x:d=>x(d.date),y:d=>y(d.a),ink:blue,supported,provisional});
    MK.average(svg,ag,{x:d=>x(d.date),y:d=>y(d.b),ink:red,supported,provisional});
  }
  const dot=MK.cursor(svg,blue);
  const bis=d3.bisector(d=>d.date).left;
  svg.append("rect").attr("x",mg.l).attr("y",mg.t).attr("width",iw).attr("height",ih).style("fill","transparent").style("cursor","crosshair")
    .on("mousemove",ev=>{if(!polls.length)return;const[mx]=d3.pointer(ev);const xd=x.invert(mx);const i=clamp(bis(polls,xd),1,polls.length-1);const a=polls[i-1],b=polls[i];const d=(xd-a.date)>(b.date-xd)?b:a;dot.attr("cx",x(d.date)).attr("cy",y(d.a)).style("opacity",1);showSimTip(ev,`<div class="stDate">${ds(d.date)}${d.ps?` · ${escapeHtml(d.ps)}${d.partisan?` (${escapeHtml(d.partisan)})`:""}`:""}</div><div class="stRow"><span class="stDot" style="background:${blue}"></span><span class="stLbl">D</span><span class="stVal">${d.a.toFixed(1)}%</span></div><div class="stRow"><span class="stDot" style="background:${red}"></span><span class="stLbl">R</span><span class="stVal">${d.b.toFixed(1)}%</span></div>`);})
    .on("mouseleave",()=>{dot.style("opacity",0);hideSimTip();});
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

/* ======== RESIZE ======== */
window.addEventListener("resize",()=>{
  if(!pollsInited)return;
  try{renderLeft();}catch(e){}
  for(const mk of["senate","governor"]){
    if(PSEL[mk])try{stateScatter(mk,PSEL[mk]);}catch(e){}
  }
},{passive:true});

window.initPollsPage=initPollsPage;
})();
