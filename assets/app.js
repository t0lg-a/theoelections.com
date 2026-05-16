"use strict";

function _createForOfIteratorHelper(r, e) { var t = "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (!t) { if (Array.isArray(r) || (t = _unsupportedIterableToArray(r)) || e && r && "number" == typeof r.length) { t && (r = t); var _n = 0, F = function F() {}; return { s: F, n: function n() { return _n >= r.length ? { done: !0 } : { done: !1, value: r[_n++] }; }, e: function e(r) { throw r; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var o, a = !0, u = !1; return { s: function s() { t = t.call(r); }, n: function n() { var r = t.next(); return a = r.done, r; }, e: function e(r) { u = !0, o = r; }, f: function f() { try { a || null == t["return"] || t["return"](); } finally { if (u) throw o; } } }; }
function _toConsumableArray(r) { return _arrayWithoutHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function _arrayWithoutHoles(r) { if (Array.isArray(r)) return _arrayLikeToArray(r); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
/* global React, ReactDOM, d3, topojson, useTweaks, TweaksPanel, TweakSection, TweakRadio */

var _React = React,
  useState = _React.useState,
  useEffect = _React.useEffect,
  useRef = _React.useRef;
var TITLES = {
  senate: {
    title: "Senate",
    sub: "Class II · 2026"
  },
  governor: {
    title: "Gubernatorial",
    sub: "Governor · 2026"
  },
  house: {
    title: "Congress",
    sub: "120th Congress · 2026"
  }
};
var SEAT_RULES_UI = {
  senate: {
    total: 100,
    majority: 51
  },
  governor: {
    total: 50,
    majority: 26
  },
  house: {
    total: 435,
    majority: 218
  }
};
var LOADING_HIST = new Array(18).fill(0.15);
var RTG_ORDER = ["Safe D", "Likely D", "Lean D", "Tossup", "Lean R", "Likely R", "Safe R"];
var RTG_KEY = {
  "Safe D": "safeD",
  "Likely D": "likelyD",
  "Lean D": "leanD",
  "Tossup": "tossup",
  "Lean R": "leanR",
  "Likely R": "likelyR",
  "Safe R": "safeR"
};
function makeLoadingSection(mode) {
  var meta = TITLES[mode];
  var rule = SEAT_RULES_UI[mode];
  var half = Math.floor(rule.total / 2);
  return {
    title: meta.title,
    sub: meta.sub,
    dPct: 50,
    rPct: 50,
    dSeats: half,
    rSeats: rule.total - half,
    histo: LOADING_HIST,
    histoDStart: 9
  };
}
function buildSectionData(mode, oddsAll, hist, forecastMode) {
  var meta = TITLES[mode];
  var rule = SEAT_RULES_UI[mode];
  if (!oddsAll || !oddsAll.length) return makeLoadingSection(mode);
  var odds = forecastMode === "nowcast" ? oddsAll.filter(function (d) {
    return !d.isForecast;
  }) : oddsAll;
  if (!odds.length) return makeLoadingSection(mode);
  var last = odds[odds.length - 1];
  var pDem = Math.max(0, Math.min(1, +last.pDem));
  var expDem = +last.expDem;
  var dPct = pDem * 100,
    rPct = 100 - dPct;
  var dSeats = Math.max(0, Math.min(rule.total, Math.round(expDem)));
  var rSeats = rule.total - dSeats;
  var histo = LOADING_HIST.slice(),
    histoDStart = 9;
  if (hist && hist.counts && hist.counts.length) {
    var _hist$min;
    var counts = hist.counts;
    var minSeat = (_hist$min = hist.min) !== null && _hist$min !== void 0 ? _hist$min : 0;
    var binSize = hist.binSize && isFinite(hist.binSize) ? hist.binSize : 1;
    var first = 0,
      lastIdx = counts.length - 1;
    while (first < counts.length && !counts[first]) first++;
    while (lastIdx >= 0 && !counts[lastIdx]) lastIdx--;
    if (lastIdx < first) {
      first = 0;
      lastIdx = counts.length - 1;
    }
    var trimmed = counts.slice(first, lastIdx + 1);
    var trimmedMin = minSeat + first * binSize;
    var trimmedMax = minSeat + (lastIdx + 1) * binSize;
    var N = 18;
    histo = new Array(N).fill(0);
    var span = trimmed.length;
    if (span <= N) {
      for (var i = 0; i < span; i++) {
        var tb = Math.min(N - 1, Math.floor(i * N / span));
        histo[tb] += trimmed[i];
      }
    } else {
      var step = span / N;
      for (var b = 0; b < N; b++) {
        var a = Math.floor(b * step),
          c = Math.floor((b + 1) * step);
        var s = 0;
        for (var _i = a; _i < c && _i < span; _i++) s += trimmed[_i];
        histo[b] = s;
      }
    }
    var seatRange = trimmedMax - trimmedMin;
    if (seatRange > 0) {
      histoDStart = Math.max(0, Math.min(N, Math.floor((rule.majority - trimmedMin) / seatRange * N)));
    }
  }
  return {
    title: meta.title,
    sub: meta.sub,
    dPct: dPct,
    rPct: rPct,
    dSeats: dSeats,
    rSeats: rSeats,
    histo: histo,
    histoDStart: histoDStart
  };
}

/* ========== Model components ========== */
function USMap(_ref) {
  var mode = _ref.mode,
    ready = _ref.ready;
  var hostRef = useRef(null);
  var _useState = useState(false),
    _useState2 = _slicedToArray(_useState, 2),
    zoomed = _useState2[0],
    setZoomed = _useState2[1];
  useEffect(function () {
    var _window$__forecast, _window$__forecast$ge, _window$__forecast2;
    if (!ready || !hostRef.current) return;
    if (typeof ((_window$__forecast = window.__forecast) === null || _window$__forecast === void 0 ? void 0 : _window$__forecast.getMapSvg) !== "function") return;
    var svg = window.__forecast.getMapSvg(mode);
    if (!svg) return;
    if (svg.parentNode !== hostRef.current) {
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.display = "block";
      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(svg);
    }
    if (mode === "house") return;
    var backBtn = (_window$__forecast$ge = (_window$__forecast2 = window.__forecast).getMapBackBtn) === null || _window$__forecast$ge === void 0 ? void 0 : _window$__forecast$ge.call(_window$__forecast2, mode);
    if (!backBtn) return;
    var sync = function sync() {
      return setZoomed(backBtn.style.display !== "none" && backBtn.style.display !== "");
    };
    sync();
    var obs = new MutationObserver(sync);
    obs.observe(backBtn, {
      attributes: true,
      attributeFilter: ["style"]
    });
    return function () {
      return obs.disconnect();
    };
  }, [mode, ready]);
  var handleBack = function handleBack(e) {
    var _window$__forecast3, _window$__forecast3$g;
    e.stopPropagation();
    var btn = (_window$__forecast3 = window.__forecast) === null || _window$__forecast3 === void 0 || (_window$__forecast3$g = _window$__forecast3.getMapBackBtn) === null || _window$__forecast3$g === void 0 ? void 0 : _window$__forecast3$g.call(_window$__forecast3, mode);
    if (btn) btn.click();
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "mapHostWrap"
  }, zoomed && /*#__PURE__*/React.createElement("button", {
    className: "mapBackBtn",
    onClick: handleBack
  }, "\u2190 US"), /*#__PURE__*/React.createElement("div", {
    className: "mapHost",
    ref: hostRef,
    "data-mode": mode
  }));
}
function Histogram(_ref2) {
  var data = _ref2.data,
    dStart = _ref2.dStart;
  var max = Math.max.apply(Math, _toConsumableArray(data).concat([1e-9]));
  return /*#__PURE__*/React.createElement("div", {
    className: "histo"
  }, data.map(function (v, i) {
    var isD = i >= dStart;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "b" + (isD ? "" : " r") + (v / max < 0.18 ? " faint" : ""),
      style: {
        height: "".concat(Math.max(2, v / max * 100), "%")
      }
    });
  }));
}
function ChartHost(_ref3) {
  var mode = _ref3.mode,
    ready = _ref3.ready;
  var hostRef = useRef(null);
  useEffect(function () {
    var _window$__forecast4;
    if (!ready || !hostRef.current) return;
    if (typeof ((_window$__forecast4 = window.__forecast) === null || _window$__forecast4 === void 0 ? void 0 : _window$__forecast4.getComboSvg) !== "function") return;
    var svg = window.__forecast.getComboSvg(mode);
    if (!svg) return;
    if (svg.parentNode === hostRef.current) return;
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.display = "block";
    hostRef.current.innerHTML = "";
    hostRef.current.appendChild(svg);
    requestAnimationFrame(function () {
      var _window$__forecast5;
      if (typeof ((_window$__forecast5 = window.__forecast) === null || _window$__forecast5 === void 0 ? void 0 : _window$__forecast5.triggerResize) === "function") window.__forecast.triggerResize();else window.dispatchEvent(new Event("resize"));
    });
  }, [mode, ready]);
  return /*#__PURE__*/React.createElement("div", {
    className: "chartHost",
    ref: hostRef,
    "data-mode": mode
  });
}
var METRO_PRESETS = [{
  code: "nyc",
  label: "NYC"
}, {
  code: "la",
  label: "LA"
}, {
  code: "chi",
  label: "CHI"
}, {
  code: "dfw",
  label: "DFW"
}];
var METRO_MORE = [{
  code: "hou",
  label: "HOU"
}, {
  code: "atl",
  label: "ATL"
}, {
  code: "dc",
  label: "DC"
}, {
  code: "phx",
  label: "PHX"
}, {
  code: "mia",
  label: "MIA"
}];
function CongressZoomRow(_ref4) {
  var ready = _ref4.ready;
  var _useState3 = useState([]),
    _useState4 = _slicedToArray(_useState3, 2),
    states = _useState4[0],
    setStates = _useState4[1];
  useEffect(function () {
    var _window$__forecast6;
    if (!ready) return;
    var fn = (_window$__forecast6 = window.__forecast) === null || _window$__forecast6 === void 0 ? void 0 : _window$__forecast6.getZoomableStates;
    if (typeof fn === "function") setStates(fn());
  }, [ready]);
  var go = function go(code) {
    var _window$__forecast7;
    if (!code) return;
    if (typeof ((_window$__forecast7 = window.__forecast) === null || _window$__forecast7 === void 0 ? void 0 : _window$__forecast7.zoomHouseTo) === "function") window.__forecast.zoomHouseTo(code);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "zoomRow"
  }, /*#__PURE__*/React.createElement("button", {
    className: "chip chipBtn",
    onClick: function onClick() {
      return go("us");
    }
  }, "US"), /*#__PURE__*/React.createElement("select", {
    className: "zoomSelect",
    defaultValue: "",
    onChange: function onChange(e) {
      var v = e.target.value;
      e.target.value = "";
      go(v);
    },
    disabled: !ready
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "State\u2026"), states.map(function (s) {
    return /*#__PURE__*/React.createElement("option", {
      key: s.usps,
      value: s.usps
    }, s.name);
  })), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "\xB7"), METRO_PRESETS.map(function (m) {
    return /*#__PURE__*/React.createElement("button", {
      key: m.code,
      className: "chip chipBtn",
      onClick: function onClick() {
        return go(m.code);
      }
    }, m.label);
  }), /*#__PURE__*/React.createElement("select", {
    className: "zoomSelect zoomSelectMore",
    defaultValue: "",
    onChange: function onChange(e) {
      var v = e.target.value;
      e.target.value = "";
      go(v);
    },
    disabled: !ready
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "More\u2026"), METRO_MORE.map(function (m) {
    return /*#__PURE__*/React.createElement("option", {
      key: m.code,
      value: m.code
    }, m.label);
  })));
}
function ModelSection(_ref5) {
  var d = _ref5.d,
    mode = _ref5.mode,
    ready = _ref5.ready,
    forecastMode = _ref5.forecastMode,
    isCongress = _ref5.isCongress;
  var _useState5 = useState("prob"),
    _useState6 = _slicedToArray(_useState5, 2),
    chartTab = _useState6[0],
    setChartTab = _useState6[1];
  var setTab = function setTab(tab) {
    var _window$__forecast8;
    setChartTab(tab);
    if (typeof ((_window$__forecast8 = window.__forecast) === null || _window$__forecast8 === void 0 ? void 0 : _window$__forecast8.setChartTab) === "function") window.__forecast.setChartTab(mode, tab);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "secHead"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "secTitle"
  }, d.title), /*#__PURE__*/React.createElement("div", {
    className: "secSub"
  }, d.sub)), /*#__PURE__*/React.createElement("div", {
    className: "pills"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pill d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sw"
  }), /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "D"), /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, d.dPct.toFixed(1)), /*#__PURE__*/React.createElement("span", {
    className: "pct"
  }, "%")), /*#__PURE__*/React.createElement("div", {
    className: "pill r"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sw"
  }), /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "R"), /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, d.rPct.toFixed(1)), /*#__PURE__*/React.createElement("span", {
    className: "pct"
  }, "%")))), /*#__PURE__*/React.createElement("div", {
    className: "seats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "seatsCol d"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Dem."), /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, d.dSeats)), /*#__PURE__*/React.createElement("div", {
    className: "seatsDash"
  }, "/"), /*#__PURE__*/React.createElement("div", {
    className: "seatsCol r"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Rep."), /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, d.rSeats))), /*#__PURE__*/React.createElement(Histogram, {
    data: d.histo,
    dStart: d.histoDStart
  }), /*#__PURE__*/React.createElement("div", {
    className: "histoCap"
  }, /*#__PURE__*/React.createElement("span", null, "more rep."), /*#__PURE__*/React.createElement("span", null, "simulated outcomes"), /*#__PURE__*/React.createElement("span", null, "more dem.")), /*#__PURE__*/React.createElement("div", {
    className: "mapBlock"
  }, /*#__PURE__*/React.createElement(USMap, {
    mode: mode,
    ready: ready
  }), /*#__PURE__*/React.createElement("div", {
    className: "mapHint"
  }, !ready ? "Loading map…" : isCongress ? "Hover a district for details" : "Hover a state for details; click to zoom into counties"), isCongress ? /*#__PURE__*/React.createElement(CongressZoomRow, {
    ready: ready
  }) : null), /*#__PURE__*/React.createElement("div", {
    className: "probBlock"
  }, /*#__PURE__*/React.createElement("div", {
    className: "probHead"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, chartTab === "prob" ? "Win probability" : "Expected seats"), /*#__PURE__*/React.createElement("div", {
    className: "toggle"
  }, /*#__PURE__*/React.createElement("button", {
    className: chartTab === "prob" ? "active" : "",
    onClick: function onClick() {
      return setTab("prob");
    }
  }, "prob."), /*#__PURE__*/React.createElement("span", {
    className: "s"
  }, "/"), /*#__PURE__*/React.createElement("button", {
    className: chartTab === "seats" ? "active" : "",
    onClick: function onClick() {
      return setTab("seats");
    }
  }, "seats"))), /*#__PURE__*/React.createElement(ChartHost, {
    mode: mode,
    ready: ready
  })));
}

/* ========== Ratings (unchanged from v8) ========== */
function RatingMapHost(_ref6) {
  var mode = _ref6.mode,
    ready = _ref6.ready;
  var hostRef = useRef(null);
  useEffect(function () {
    var _window$__forecast9;
    if (!ready || !hostRef.current) return;
    var fn = (_window$__forecast9 = window.__forecast) === null || _window$__forecast9 === void 0 ? void 0 : _window$__forecast9.getRatingsMapSvg;
    if (typeof fn !== "function") return;
    var svg = fn(mode);
    if (!svg) return;
    if (svg.parentNode === hostRef.current) return;
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.display = "block";
    hostRef.current.innerHTML = "";
    hostRef.current.appendChild(svg);
  }, [mode, ready]);
  return /*#__PURE__*/React.createElement("div", {
    className: "mapHost",
    ref: hostRef,
    "data-mode": mode,
    "data-rtg-host": "map"
  });
}
function RatingChartHost(_ref7) {
  var mode = _ref7.mode,
    ready = _ref7.ready;
  var hostRef = useRef(null);
  useEffect(function () {
    var _window$__forecast0;
    if (!ready || !hostRef.current) return;
    var fn = (_window$__forecast0 = window.__forecast) === null || _window$__forecast0 === void 0 ? void 0 : _window$__forecast0.getRatingsChartSvg;
    if (typeof fn !== "function") return;
    var svg = fn(mode);
    if (!svg) return;
    if (svg.parentNode === hostRef.current) return;
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.display = "block";
    hostRef.current.innerHTML = "";
    hostRef.current.appendChild(svg);
    requestAnimationFrame(function () {
      var _window$__forecast1;
      if (typeof ((_window$__forecast1 = window.__forecast) === null || _window$__forecast1 === void 0 ? void 0 : _window$__forecast1.triggerResize) === "function") window.__forecast.triggerResize();else window.dispatchEvent(new Event("resize"));
    });
  }, [mode, ready]);
  return /*#__PURE__*/React.createElement("div", {
    className: "chartHost",
    ref: hostRef,
    "data-mode": mode,
    "data-rtg-host": "chart"
  });
}

/* v14: Ratings tab's House zoom controls. Same UX as the Model tab's
   CongressZoomRow, but wired to ratings.js's separate set of [data-rtg-zoom-*]
   controls (state dropdown + .zoomBtn metro chips + [data-rtg-zoom-metro-more]).
   Ratings populates its own state list, so we read it from the offscreen
   dropdown rather than reusing the Model's. */
function RatingsCongressZoomRow(_ref8) {
  var ready = _ref8.ready;
  var _useState7 = useState([]),
    _useState8 = _slicedToArray(_useState7, 2),
    states = _useState8[0],
    setStates = _useState8[1];
  useEffect(function () {
    var _window$__forecast10;
    if (!ready) return;
    var fn = (_window$__forecast10 = window.__forecast) === null || _window$__forecast10 === void 0 ? void 0 : _window$__forecast10.getRatingsZoomableStates;
    if (typeof fn === "function") setStates(fn());
  }, [ready]);
  var go = function go(code) {
    var _window$__forecast11;
    if (!code) return;
    if (typeof ((_window$__forecast11 = window.__forecast) === null || _window$__forecast11 === void 0 ? void 0 : _window$__forecast11.zoomRatingsHouseTo) === "function") {
      window.__forecast.zoomRatingsHouseTo(code);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "zoomRow"
  }, /*#__PURE__*/React.createElement("button", {
    className: "chip chipBtn",
    onClick: function onClick() {
      return go("us");
    }
  }, "US"), /*#__PURE__*/React.createElement("select", {
    className: "zoomSelect",
    defaultValue: "",
    onChange: function onChange(e) {
      var v = e.target.value;
      e.target.value = "";
      go(v);
    },
    disabled: !ready
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "State\u2026"), states.map(function (s) {
    return /*#__PURE__*/React.createElement("option", {
      key: s.usps,
      value: s.usps
    }, s.name);
  })), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "\xB7"), METRO_PRESETS.map(function (m) {
    return /*#__PURE__*/React.createElement("button", {
      key: m.code,
      className: "chip chipBtn",
      onClick: function onClick() {
        return go(m.code);
      }
    }, m.label);
  }), /*#__PURE__*/React.createElement("select", {
    className: "zoomSelect zoomSelectMore",
    defaultValue: "",
    onChange: function onChange(e) {
      var v = e.target.value;
      e.target.value = "";
      go(v);
    },
    disabled: !ready
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "More\u2026"), METRO_MORE.map(function (m) {
    return /*#__PURE__*/React.createElement("option", {
      key: m.code,
      value: m.code
    }, m.label);
  })));
}
function RatingBar(_ref9) {
  var counts = _ref9.counts;
  var total = RTG_ORDER.reduce(function (s, k) {
    return s + (counts[k] || 0);
  }, 0) || 1;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "rtgBar"
  }, RTG_ORDER.map(function (cat) {
    var n = counts[cat] || 0;
    if (n === 0) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: cat,
      className: "rtgSeg rtg-" + RTG_KEY[cat],
      style: {
        width: n / total * 100 + "%"
      }
    }, n >= 2 && /*#__PURE__*/React.createElement("span", {
      className: "rtgN"
    }, n));
  })), /*#__PURE__*/React.createElement("div", {
    className: "rtgLabels"
  }, RTG_ORDER.map(function (cat) {
    return /*#__PURE__*/React.createElement("span", {
      key: cat,
      className: "rtgLbl rtg-" + RTG_KEY[cat]
    }, cat);
  })));
}
function RatingSection(_ref0) {
  var mode = _ref0.mode,
    counts = _ref0.counts,
    ready = _ref0.ready,
    isCongress = _ref0.isCongress;
  var meta = TITLES[mode];
  var dTotal = (counts["Safe D"] || 0) + (counts["Likely D"] || 0) + (counts["Lean D"] || 0);
  var rTotal = (counts["Safe R"] || 0) + (counts["Likely R"] || 0) + (counts["Lean R"] || 0);
  var tossup = counts["Tossup"] || 0;
  var _useState9 = useState("detailed"),
    _useState0 = _slicedToArray(_useState9, 2),
    chartTab = _useState0[0],
    setChartTab = _useState0[1];
  var setTab = function setTab(tab) {
    var _window$__forecast12;
    setChartTab(tab);
    if (typeof ((_window$__forecast12 = window.__forecast) === null || _window$__forecast12 === void 0 ? void 0 : _window$__forecast12.setRatingsChartTab) === "function") {
      window.__forecast.setRatingsChartTab(mode, tab);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "secHead"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "secTitle"
  }, meta.title), /*#__PURE__*/React.createElement("div", {
    className: "secSub"
  }, meta.sub)), /*#__PURE__*/React.createElement("div", {
    className: "pills"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pill d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sw"
  }), /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "D"), /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, dTotal)), /*#__PURE__*/React.createElement("div", {
    className: "pill r"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sw"
  }), /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "R"), /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, rTotal)))), /*#__PURE__*/React.createElement("div", {
    className: "rtgCountStrip"
  }, RTG_ORDER.map(function (cat) {
    return /*#__PURE__*/React.createElement("div", {
      key: cat,
      className: "rtgCountItem rtg-" + RTG_KEY[cat]
    }, /*#__PURE__*/React.createElement("div", {
      className: "rtgCountNum"
    }, counts[cat] || 0), /*#__PURE__*/React.createElement("div", {
      className: "rtgCountLbl"
    }, cat));
  })), /*#__PURE__*/React.createElement(RatingBar, {
    counts: counts
  }), /*#__PURE__*/React.createElement("div", {
    className: "rtgTossupNote"
  }, tossup > 0 ? /*#__PURE__*/React.createElement(React.Fragment, null, tossup, " ", /*#__PURE__*/React.createElement("span", {
    className: "rtg-tossup"
  }, "Tossup"), " race", tossup === 1 ? "" : "s") : /*#__PURE__*/React.createElement(React.Fragment, null, "no tossups")), /*#__PURE__*/React.createElement("div", {
    className: "mapBlock"
  }, /*#__PURE__*/React.createElement(RatingMapHost, {
    mode: mode,
    ready: ready
  }), /*#__PURE__*/React.createElement("div", {
    className: "mapHint"
  }, !ready ? "Loading ratings…" : isCongress ? "Hover a district for details" : "Hover a state for details"), isCongress ? /*#__PURE__*/React.createElement(RatingsCongressZoomRow, {
    ready: ready
  }) : null), /*#__PURE__*/React.createElement("div", {
    className: "probBlock"
  }, /*#__PURE__*/React.createElement("div", {
    className: "probHead"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, chartTab === "detailed" ? "Rating counts" : "Face-off"), /*#__PURE__*/React.createElement("div", {
    className: "toggle"
  }, /*#__PURE__*/React.createElement("button", {
    className: chartTab === "detailed" ? "active" : "",
    onClick: function onClick() {
      return setTab("detailed");
    }
  }, "detailed"), /*#__PURE__*/React.createElement("span", {
    className: "s"
  }, "/"), /*#__PURE__*/React.createElement("button", {
    className: chartTab === "faceoff" ? "active" : "",
    onClick: function onClick() {
      return setTab("faceoff");
    }
  }, "face-off"))), /*#__PURE__*/React.createElement(RatingChartHost, {
    mode: mode,
    ready: ready
  })));
}
function RatingsView(_ref1) {
  var forecastMode = _ref1.forecastMode,
    dataReady = _ref1.dataReady;
  var _useState1 = useState({
      senate: Object.fromEntries(RTG_ORDER.map(function (k) {
        return [k, 0];
      })),
      governor: Object.fromEntries(RTG_ORDER.map(function (k) {
        return [k, 0];
      })),
      house: Object.fromEntries(RTG_ORDER.map(function (k) {
        return [k, 0];
      }))
    }),
    _useState10 = _slicedToArray(_useState1, 2),
    counts = _useState10[0],
    setCounts = _useState10[1];
  var _useState11 = useState(false),
    _useState12 = _slicedToArray(_useState11, 2),
    ratingsReady = _useState12[0],
    setRatingsReady = _useState12[1];
  useEffect(function () {
    var _window$__forecast13;
    if (!dataReady) return;
    if (window.__forecastRatingsReady) {
      setRatingsReady(true);
    } else if (typeof ((_window$__forecast13 = window.__forecast) === null || _window$__forecast13 === void 0 ? void 0 : _window$__forecast13.ensureRatingsInited) === "function") {
      window.__forecast.ensureRatingsInited();
    }
    var onReady = function onReady() {
      return setRatingsReady(true);
    };
    window.addEventListener("forecast-ratings-ready", onReady);
    return function () {
      return window.removeEventListener("forecast-ratings-ready", onReady);
    };
  }, [dataReady]);
  useEffect(function () {
    var _window$__forecast14;
    if (!dataReady) return;
    var fn = (_window$__forecast14 = window.__forecast) === null || _window$__forecast14 === void 0 ? void 0 : _window$__forecast14.getRatingsCounts;
    if (typeof fn !== "function") return;
    try {
      setCounts({
        senate: fn("senate"),
        governor: fn("governor"),
        house: fn("house")
      });
    } catch (e) {}
  }, [dataReady, forecastMode, ratingsReady]);
  return /*#__PURE__*/React.createElement("div", {
    className: "cols"
  }, /*#__PURE__*/React.createElement(RatingSection, {
    mode: "senate",
    counts: counts.senate,
    ready: ratingsReady
  }), /*#__PURE__*/React.createElement("div", {
    className: "colRule"
  }), /*#__PURE__*/React.createElement(RatingSection, {
    mode: "governor",
    counts: counts.governor,
    ready: ratingsReady
  }), /*#__PURE__*/React.createElement("div", {
    className: "colRule"
  }), /*#__PURE__*/React.createElement(RatingSection, {
    mode: "house",
    counts: counts.house,
    ready: ratingsReady,
    isCongress: true
  }));
}

/* ============================================================================
   v9: PAST ELECTIONS VIEW
   ============================================================================ */
var PAST_YEARS = [2025, 2024, 2022, 2020, 2018, 2016, 2014, 2012, 2010, 2008, 2006, 2004, 2002, 2000];
var PAST_MODES = ["president", "senate", "governor", "house"];
var SWING_MODES = ["senate", "governor", "house"];
var SWING_TITLES = {
  senate: {
    title: "Senate",
    sub: "Class II · 2026"
  },
  governor: {
    title: "Gubernatorial",
    sub: "Governor · 2026"
  },
  house: {
    title: "Congress",
    sub: "120th Congress · 2026"
  }
};
function PastMapHost(_ref10) {
  var mode = _ref10.mode,
    ready = _ref10.ready,
    refreshKey = _ref10.refreshKey;
  var hostRef = useRef(null);
  useEffect(function () {
    var _window$__forecast15;
    if (!ready || !hostRef.current) return;
    var fn = (_window$__forecast15 = window.__forecast) === null || _window$__forecast15 === void 0 ? void 0 : _window$__forecast15.getPastMapSvg;
    if (typeof fn !== "function") return;
    var svg = fn(mode);
    if (!svg) return;
    if (svg.parentNode !== hostRef.current) {
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.display = "block";
      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(svg);
    }
  }, [mode, ready, refreshKey]);
  return /*#__PURE__*/React.createElement("div", {
    className: "mapHost",
    ref: hostRef,
    "data-past-host": "map",
    "data-mode": mode
  });
}
function PastChartHost(_ref11) {
  var mode = _ref11.mode,
    ready = _ref11.ready,
    refreshKey = _ref11.refreshKey;
  var hostRef = useRef(null);
  useEffect(function () {
    var _window$__forecast16;
    if (!ready || !hostRef.current) return;
    var fn = (_window$__forecast16 = window.__forecast) === null || _window$__forecast16 === void 0 ? void 0 : _window$__forecast16.getPastComboSvg;
    if (typeof fn !== "function") return;
    var svg = fn(mode);
    if (!svg) return;
    if (svg.parentNode !== hostRef.current) {
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.display = "block";
      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(svg);
    }
    requestAnimationFrame(function () {
      var _window$__forecast17;
      if (typeof ((_window$__forecast17 = window.__forecast) === null || _window$__forecast17 === void 0 ? void 0 : _window$__forecast17.triggerResize) === "function") window.__forecast.triggerResize();else window.dispatchEvent(new Event("resize"));
    });
  }, [mode, ready, refreshKey]);
  return /*#__PURE__*/React.createElement("div", {
    className: "chartHost",
    ref: hostRef,
    "data-past-host": "chart",
    "data-mode": mode
  });
}
function YearBarA(_ref12) {
  var year = _ref12.year,
    onSelect = _ref12.onSelect;
  return /*#__PURE__*/React.createElement("div", {
    className: "yearBarA"
  }, /*#__PURE__*/React.createElement("div", {
    className: "yearBarLabel"
  }, "Year"), /*#__PURE__*/React.createElement("div", {
    className: "yearBarBtns"
  }, PAST_YEARS.map(function (y) {
    return /*#__PURE__*/React.createElement("button", {
      key: y,
      className: "yearBtnA" + (y === year ? " active" : ""),
      onClick: function onClick() {
        return onSelect(y);
      }
    }, y);
  })));
}
var PAST_TITLES = {
  president: {
    title: "President",
    defSub: "Presidential"
  },
  senate: {
    title: "Senate",
    defSub: "U.S. Senate"
  },
  governor: {
    title: "Gubernatorial",
    defSub: "Governor"
  },
  house: {
    title: "Congress",
    defSub: "U.S. House"
  }
};
function PastSection(_ref13) {
  var _s$pillD, _s$pillR, _s$seatsD, _s$seatsR;
  var mode = _ref13.mode,
    year = _ref13.year,
    ready = _ref13.ready,
    snapshot = _ref13.snapshot,
    refreshKey = _ref13.refreshKey;
  var _useState13 = useState("prob"),
    _useState14 = _slicedToArray(_useState13, 2),
    chartTab = _useState14[0],
    setChartTab = _useState14[1];
  var setTab = function setTab(tab) {
    var _window$__forecast18;
    setChartTab(tab);
    if (typeof ((_window$__forecast18 = window.__forecast) === null || _window$__forecast18 === void 0 ? void 0 : _window$__forecast18.setPastChartTab) === "function") {
      window.__forecast.setPastChartTab(mode, tab);
    }
  };
  var meta = PAST_TITLES[mode];
  var s = snapshot || {};
  var title = s.title || meta.title;
  var sub = s.sub || "".concat(meta.defSub, " \xB7 ").concat(year);
  var visible = s.visible !== false;
  if (!visible) {
    return /*#__PURE__*/React.createElement("div", {
      className: "col col-past col-past-hidden"
    }, /*#__PURE__*/React.createElement("div", {
      className: "secHead"
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "secTitle"
    }, meta.title), /*#__PURE__*/React.createElement("div", {
      className: "secSub"
    }, "No race this year"))));
  }
  var pillD = (_s$pillD = s.pillD) !== null && _s$pillD !== void 0 ? _s$pillD : "—";
  var pillR = (_s$pillR = s.pillR) !== null && _s$pillR !== void 0 ? _s$pillR : "—";
  var seatsD = (_s$seatsD = s.seatsD) !== null && _s$seatsD !== void 0 ? _s$seatsD : "—";
  var seatsR = (_s$seatsR = s.seatsR) !== null && _s$seatsR !== void 0 ? _s$seatsR : "—";
  var hasSeats = s.hasSeats !== false;
  return /*#__PURE__*/React.createElement("div", {
    className: "col col-past"
  }, /*#__PURE__*/React.createElement("div", {
    className: "secHead"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "secTitle"
  }, title), /*#__PURE__*/React.createElement("div", {
    className: "secSub"
  }, sub)), /*#__PURE__*/React.createElement("div", {
    className: "pills"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pill d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sw"
  }), /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "D"), /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, pillD)), /*#__PURE__*/React.createElement("div", {
    className: "pill r"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sw"
  }), /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "R"), /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, pillR)))), hasSeats && /*#__PURE__*/React.createElement("div", {
    className: "seats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "seatsCol d"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Dem."), /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, seatsD)), /*#__PURE__*/React.createElement("div", {
    className: "seatsDash"
  }, "/"), /*#__PURE__*/React.createElement("div", {
    className: "seatsCol r"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Rep."), /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, seatsR))), /*#__PURE__*/React.createElement("div", {
    className: "mapBlock"
  }, /*#__PURE__*/React.createElement(PastMapHost, {
    mode: mode,
    ready: ready,
    refreshKey: refreshKey
  }), /*#__PURE__*/React.createElement("div", {
    className: "mapHint"
  }, !ready ? "Loading hindcast…" : "Hover a state for details")), /*#__PURE__*/React.createElement("div", {
    className: "probBlock"
  }, /*#__PURE__*/React.createElement("div", {
    className: "probHead"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, chartTab === "prob" ? "Win probability" : "Expected seats"), /*#__PURE__*/React.createElement("div", {
    className: "toggle"
  }, /*#__PURE__*/React.createElement("button", {
    className: chartTab === "prob" ? "active" : "",
    onClick: function onClick() {
      return setTab("prob");
    }
  }, "prob."), /*#__PURE__*/React.createElement("span", {
    className: "s"
  }, "/"), /*#__PURE__*/React.createElement("button", {
    className: chartTab === "seats" ? "active" : "",
    onClick: function onClick() {
      return setTab("seats");
    }
  }, "seats"))), /*#__PURE__*/React.createElement(PastChartHost, {
    mode: mode,
    ready: ready,
    refreshKey: refreshKey
  })));
}
function PastElectionsView() {
  var _useState15 = useState(2025),
    _useState16 = _slicedToArray(_useState15, 2),
    year = _useState16[0],
    setYear = _useState16[1];
  var _useState17 = useState(false),
    _useState18 = _slicedToArray(_useState17, 2),
    ready = _useState18[0],
    setReady = _useState18[1];
  var _useState19 = useState(0),
    _useState20 = _slicedToArray(_useState19, 2),
    refreshKey = _useState20[0],
    setRefreshKey = _useState20[1];
  var _useState21 = useState({}),
    _useState22 = _slicedToArray(_useState21, 2),
    snapshots = _useState22[0],
    setSnapshots = _useState22[1];
  var refreshSnapshots = function refreshSnapshots() {
    var _window$__forecast19;
    var fn = (_window$__forecast19 = window.__forecast) === null || _window$__forecast19 === void 0 ? void 0 : _window$__forecast19.getPastSnapshot;
    if (typeof fn !== "function") return;
    try {
      var next = {};
      var _iterator = _createForOfIteratorHelper(PAST_MODES),
        _step;
      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var m = _step.value;
          next[m] = fn(m);
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
      setSnapshots(next);
    } catch (e) {}
  };

  // Lazy init on first mount of this view
  useEffect(function () {
    var _window$__forecast20;
    if (typeof ((_window$__forecast20 = window.__forecast) === null || _window$__forecast20 === void 0 ? void 0 : _window$__forecast20.ensurePastInited) === "function") {
      window.__forecast.ensurePastInited();
    }
    var onReady = function onReady(e) {
      setReady(true);
      // refresh map/chart hosts in case past-elections.js re-created SVGs
      setRefreshKey(function (k) {
        return k + 1;
      });
      // Brief delay so DOM text has settled before we read it
      setTimeout(refreshSnapshots, 50);
      if (e && e.detail) setYear(e.detail);
    };
    window.addEventListener("past-ready", onReady);
    window.addEventListener("past-year-changed", onReady);
    // First-load: try once after a tick
    setTimeout(function () {
      var _window$__forecast21;
      // Maybe already-rendered from default 2025 init
      refreshSnapshots();
      var fn = (_window$__forecast21 = window.__forecast) === null || _window$__forecast21 === void 0 ? void 0 : _window$__forecast21.getPastMapSvg;
      if (typeof fn === "function" && fn("president")) setReady(true);
    }, 300);
    return function () {
      window.removeEventListener("past-ready", onReady);
      window.removeEventListener("past-year-changed", onReady);
    };
  }, []);
  var onYearSelect = function onYearSelect(y) {
    var _window$__forecast22;
    setYear(y);
    if (typeof ((_window$__forecast22 = window.__forecast) === null || _window$__forecast22 === void 0 ? void 0 : _window$__forecast22.setPastYear) === "function") {
      window.__forecast.setPastYear(y);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "pastView"
  }, /*#__PURE__*/React.createElement(YearBarA, {
    year: year,
    onSelect: onYearSelect
  }), /*#__PURE__*/React.createElement("div", {
    className: "cols pastCols"
  }, /*#__PURE__*/React.createElement(PastSection, {
    mode: "president",
    year: year,
    ready: ready,
    snapshot: snapshots.president,
    refreshKey: refreshKey
  }), /*#__PURE__*/React.createElement("div", {
    className: "colRule"
  }), /*#__PURE__*/React.createElement(PastSection, {
    mode: "senate",
    year: year,
    ready: ready,
    snapshot: snapshots.senate,
    refreshKey: refreshKey
  }), /*#__PURE__*/React.createElement("div", {
    className: "colRule"
  }), /*#__PURE__*/React.createElement(PastSection, {
    mode: "governor",
    year: year,
    ready: ready,
    snapshot: snapshots.governor,
    refreshKey: refreshKey
  }), /*#__PURE__*/React.createElement("div", {
    className: "colRule"
  }), /*#__PURE__*/React.createElement(PastSection, {
    mode: "house",
    year: year,
    ready: ready,
    snapshot: snapshots.house,
    refreshKey: refreshKey
  })));
}

/* ============================================================================
   v10: SWINGOMETER VIEW
   ============================================================================ */
function SwingMapHost(_ref14) {
  var mode = _ref14.mode,
    ready = _ref14.ready,
    refreshKey = _ref14.refreshKey;
  var hostRef = useRef(null);
  useEffect(function () {
    var _window$__forecast23;
    if (!ready || !hostRef.current) return;
    var fn = (_window$__forecast23 = window.__forecast) === null || _window$__forecast23 === void 0 ? void 0 : _window$__forecast23.getSwingMapSvg;
    if (typeof fn !== "function") return;
    var svg = fn(mode);
    if (!svg) return;
    if (svg.parentNode !== hostRef.current) {
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.display = "block";
      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(svg);
    }
  }, [mode, ready, refreshKey]);
  return /*#__PURE__*/React.createElement("div", {
    className: "mapHost",
    ref: hostRef,
    "data-swing-host": "map",
    "data-mode": mode
  });
}
function SwingCanvasHost(_ref15) {
  var mode = _ref15.mode,
    ready = _ref15.ready,
    refreshKey = _ref15.refreshKey;
  var hostRef = useRef(null);
  useEffect(function () {
    var _window$__forecast24;
    if (!ready || !hostRef.current) return;
    var fn = (_window$__forecast24 = window.__forecast) === null || _window$__forecast24 === void 0 ? void 0 : _window$__forecast24.getSwingSimCanvas;
    if (typeof fn !== "function") return;
    var canvas = fn(mode);
    if (!canvas) return;
    if (canvas.parentNode !== hostRef.current) {
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(canvas);
    }
    requestAnimationFrame(function () {
      var _window$__forecast25;
      if (typeof ((_window$__forecast25 = window.__forecast) === null || _window$__forecast25 === void 0 ? void 0 : _window$__forecast25.triggerResize) === "function") window.__forecast.triggerResize();else window.dispatchEvent(new Event("resize"));
    });
  }, [mode, ready, refreshKey]);
  return /*#__PURE__*/React.createElement("div", {
    className: "swingCanvasHost",
    ref: hostRef,
    "data-swing-host": "canvas",
    "data-mode": mode
  });
}
function SwingSection(_ref16) {
  var _s$pillD2, _s$pillR2, _s$seatsD2, _s$seatsR2, _s$margin;
  var mode = _ref16.mode,
    ready = _ref16.ready,
    snapshot = _ref16.snapshot,
    refreshKey = _ref16.refreshKey,
    onSlide = _ref16.onSlide;
  var meta = SWING_TITLES[mode];
  var s = snapshot || {};
  var sliderD = s.sliderD != null ? +s.sliderD : 50;
  var sliderR = s.sliderR != null ? +s.sliderR : 50;
  var pillD = (_s$pillD2 = s.pillD) !== null && _s$pillD2 !== void 0 ? _s$pillD2 : "50.0";
  var pillR = (_s$pillR2 = s.pillR) !== null && _s$pillR2 !== void 0 ? _s$pillR2 : "50.0";
  var seatsD = (_s$seatsD2 = s.seatsD) !== null && _s$seatsD2 !== void 0 ? _s$seatsD2 : "—";
  var seatsR = (_s$seatsR2 = s.seatsR) !== null && _s$seatsR2 !== void 0 ? _s$seatsR2 : "—";
  var margin = (_s$margin = s.margin) !== null && _s$margin !== void 0 ? _s$margin : "Tied";
  var marginSide = function () {
    if (!margin || margin === "Tied") return "tied";
    if (/^D/.test(margin)) return "d";
    if (/^R/.test(margin)) return "r";
    return "tied";
  }();
  return /*#__PURE__*/React.createElement("div", {
    className: "col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "secHead"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "secTitle"
  }, meta.title), /*#__PURE__*/React.createElement("div", {
    className: "secSub"
  }, meta.sub)), /*#__PURE__*/React.createElement("div", {
    className: "pills"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pill d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sw"
  }), /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "D"), /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, pillD), /*#__PURE__*/React.createElement("span", {
    className: "pct"
  }, "%")), /*#__PURE__*/React.createElement("div", {
    className: "pill r"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sw"
  }), /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "R"), /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, pillR), /*#__PURE__*/React.createElement("span", {
    className: "pct"
  }, "%")))), /*#__PURE__*/React.createElement("div", {
    className: "swingCard"
  }, /*#__PURE__*/React.createElement("div", {
    className: "swingCardLabel"
  }, "National Two-Party Vote"), /*#__PURE__*/React.createElement("div", {
    className: "swingRow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "swingPartyLabel d"
  }, "D"), /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "swingRangeA d",
    min: "30",
    max: "70",
    step: "0.1",
    value: sliderD,
    onChange: function onChange(e) {
      return onSlide("D", e.target.value);
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "swingRowVal"
  }, sliderD.toFixed(1))), /*#__PURE__*/React.createElement("div", {
    className: "swingRow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "swingPartyLabel r"
  }, "R"), /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "swingRangeA r",
    min: "30",
    max: "70",
    step: "0.1",
    value: sliderR,
    onChange: function onChange(e) {
      return onSlide("R", e.target.value);
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "swingRowVal"
  }, sliderR.toFixed(1))), /*#__PURE__*/React.createElement("div", {
    className: "swingMarginRow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "swingMarginLabel"
  }, "Margin"), /*#__PURE__*/React.createElement("span", {
    className: "swingMarginVal swing-" + marginSide
  }, margin))), /*#__PURE__*/React.createElement("div", {
    className: "seats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "seatsCol d"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Dem."), /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, seatsD)), /*#__PURE__*/React.createElement("div", {
    className: "seatsDash"
  }, "/"), /*#__PURE__*/React.createElement("div", {
    className: "seatsCol r"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Rep."), /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, seatsR))), /*#__PURE__*/React.createElement(SwingCanvasHost, {
    mode: mode,
    ready: ready,
    refreshKey: refreshKey
  }), /*#__PURE__*/React.createElement("div", {
    className: "mapBlock"
  }, /*#__PURE__*/React.createElement(SwingMapHost, {
    mode: mode,
    ready: ready,
    refreshKey: refreshKey
  }), /*#__PURE__*/React.createElement("div", {
    className: "mapHint"
  }, !ready ? "Loading swingometer…" : "Hover a state for details")));
}
function SwingometerView() {
  var _useState23 = useState(false),
    _useState24 = _slicedToArray(_useState23, 2),
    ready = _useState24[0],
    setReady = _useState24[1];
  var _useState25 = useState(0),
    _useState26 = _slicedToArray(_useState25, 2),
    refreshKey = _useState26[0],
    setRefreshKey = _useState26[1];
  var _useState27 = useState({}),
    _useState28 = _slicedToArray(_useState27, 2),
    snapshots = _useState28[0],
    setSnapshots = _useState28[1];
  var refreshSnapshots = function refreshSnapshots() {
    var _window$__forecast26;
    var fn = (_window$__forecast26 = window.__forecast) === null || _window$__forecast26 === void 0 ? void 0 : _window$__forecast26.getSwingSnapshot;
    if (typeof fn !== "function") return;
    try {
      var next = {};
      var _iterator2 = _createForOfIteratorHelper(SWING_MODES),
        _step2;
      try {
        for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
          var m = _step2.value;
          next[m] = fn(m);
        }
      } catch (err) {
        _iterator2.e(err);
      } finally {
        _iterator2.f();
      }
      setSnapshots(next);
    } catch (e) {}
  };
  useEffect(function () {
    var _window$__forecast27;
    if (typeof ((_window$__forecast27 = window.__forecast) === null || _window$__forecast27 === void 0 ? void 0 : _window$__forecast27.ensureSwingInited) === "function") {
      window.__forecast.ensureSwingInited();
    }
    var onReady = function onReady() {
      setReady(true);
      setRefreshKey(function (k) {
        return k + 1;
      });
      setTimeout(refreshSnapshots, 50);
    };
    window.addEventListener("swing-ready", onReady);
    // Maybe already-rendered (e.g., user came back to this tab)
    setTimeout(function () {
      var _window$__forecast28;
      refreshSnapshots();
      var fn = (_window$__forecast28 = window.__forecast) === null || _window$__forecast28 === void 0 ? void 0 : _window$__forecast28.getSwingMapSvg;
      if (typeof fn === "function" && fn("senate")) setReady(true);
    }, 300);
    return function () {
      return window.removeEventListener("swing-ready", onReady);
    };
  }, []);
  var onSlide = function onSlide(mode) {
    return function (party, value) {
      var _window$__forecast29;
      if (typeof ((_window$__forecast29 = window.__forecast) === null || _window$__forecast29 === void 0 ? void 0 : _window$__forecast29.setSwingSlider) === "function") {
        window.__forecast.setSwingSlider(mode, party, value);
      }
      // Read snapshot back immediately — swingometer.js's handler is sync
      refreshSnapshots();
    };
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "swingView"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cols"
  }, /*#__PURE__*/React.createElement(SwingSection, {
    mode: "senate",
    ready: ready,
    snapshot: snapshots.senate,
    refreshKey: refreshKey,
    onSlide: onSlide("senate")
  }), /*#__PURE__*/React.createElement("div", {
    className: "colRule"
  }), /*#__PURE__*/React.createElement(SwingSection, {
    mode: "governor",
    ready: ready,
    snapshot: snapshots.governor,
    refreshKey: refreshKey,
    onSlide: onSlide("governor")
  }), /*#__PURE__*/React.createElement("div", {
    className: "colRule"
  }), /*#__PURE__*/React.createElement(SwingSection, {
    mode: "house",
    ready: ready,
    snapshot: snapshots.house,
    refreshKey: refreshKey,
    onSlide: onSlide("house")
  })));
}

/* ============================================================================
   v11: STATE LEGISLATURES VIEW
   state-legs.js is a heavy, self-contained module that injects its own toolbar
   and styles into #stateLegsPage. Rather than re-implementing in Almanac, we
   teleport the whole element in/out of the Almanac host. The element lives
   offscreen by default so state-legs.js's init can wire up references against
   it; on tab mount we move it into Almanac's host, fire the .pageTab click
   that state-legs.js's IIFE handler responds to, and on unmount we put it back
   so a future tab visit re-mounts cleanly.
   ============================================================================ */
function StateLegsView() {
  var hostRef = useRef(null);
  useEffect(function () {
    var _window$__forecast30, _window$__forecast30$, _window$__forecast31;
    if (!hostRef.current) return;
    var page = (_window$__forecast30 = window.__forecast) === null || _window$__forecast30 === void 0 || (_window$__forecast30$ = _window$__forecast30.getStateLegsPage) === null || _window$__forecast30$ === void 0 ? void 0 : _window$__forecast30$.call(_window$__forecast30);
    if (!page) return;
    var originalParent = page.parentNode;
    var originalNextSibling = page.nextSibling;
    var originalDisplay = page.style.display;

    // Teleport into Almanac
    hostRef.current.appendChild(page);

    // Trigger state-legs.js's load (sets display:'grid', loads chamber, renders)
    if (typeof ((_window$__forecast31 = window.__forecast) === null || _window$__forecast31 === void 0 ? void 0 : _window$__forecast31.ensureStateLegsInited) === "function") {
      window.__forecast.ensureStateLegsInited();
    }
    return function () {
      // Teleport back to offscreen on unmount
      if (originalParent && page.parentNode !== originalParent) {
        if (originalNextSibling && originalNextSibling.parentNode === originalParent) {
          originalParent.insertBefore(page, originalNextSibling);
        } else {
          originalParent.appendChild(page);
        }
        page.style.display = originalDisplay || "none";
      }
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "stateLegsHost",
    ref: hostRef
  });
}

/* ============================================================================
   v12: FLORIDA REDISTRICTING VIEW
   Same teleport-and-return pattern as State Legs. fl_redistricting.js exposes
   window.initFloridaPage() (async) which we call directly on mount; on unmount
   we move the element back to offscreen.
   ============================================================================ */
function FloridaView() {
  var hostRef = useRef(null);
  useEffect(function () {
    var _window$__forecast32, _window$__forecast32$, _window$__forecast33;
    if (!hostRef.current) return;
    var page = (_window$__forecast32 = window.__forecast) === null || _window$__forecast32 === void 0 || (_window$__forecast32$ = _window$__forecast32.getFloridaPage) === null || _window$__forecast32$ === void 0 ? void 0 : _window$__forecast32$.call(_window$__forecast32);
    if (!page) return;
    var originalParent = page.parentNode;
    var originalNextSibling = page.nextSibling;
    hostRef.current.appendChild(page);
    page.style.display = "";
    if (typeof ((_window$__forecast33 = window.__forecast) === null || _window$__forecast33 === void 0 ? void 0 : _window$__forecast33.ensureFloridaInited) === "function") {
      window.__forecast.ensureFloridaInited();
    }
    // Nudge the FL resize observer so cards re-render at the new container size.
    requestAnimationFrame(function () {
      var _window$__forecast34;
      if (typeof ((_window$__forecast34 = window.__forecast) === null || _window$__forecast34 === void 0 ? void 0 : _window$__forecast34.triggerResize) === "function") window.__forecast.triggerResize();else window.dispatchEvent(new Event("resize"));
    });
    return function () {
      if (originalParent && page.parentNode !== originalParent) {
        if (originalNextSibling && originalNextSibling.parentNode === originalParent) {
          originalParent.insertBefore(page, originalNextSibling);
        } else {
          originalParent.appendChild(page);
        }
        page.style.display = "none";
      }
    };
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    className: "floridaHost",
    ref: hostRef
  });
}

/* ============================================================================
   v15: POLLS VIEW — Almanac-native 3-column rebuild (was a teleport in v13)
   Each column shows pills + a D/R-and-histogram strip, then a chart/map slot,
   then either the poll-list (GB column) or the state-detail chart (senate /
   governor columns). The histogram canvas, main chart SVG, map SVG, and
   state-chart SVG are all teleported out of the offscreen #pollsPage so
   polls.js continues to render into them; everything around them is React.
   ============================================================================ */
var POLLS_TITLES = {
  gb: {
    title: "Generic Ballot",
    sub: "Approval & national vote"
  },
  senate: {
    title: "Senate",
    sub: "Class II · 2026"
  },
  governor: {
    title: "Gubernatorial",
    sub: "Governor · 2026"
  }
};
function PollsCanvasHost(_ref17) {
  var mode = _ref17.mode,
    ready = _ref17.ready;
  var hostRef = useRef(null);
  useEffect(function () {
    var _window$__forecast35;
    if (!ready || !hostRef.current) return;
    var fn = (_window$__forecast35 = window.__forecast) === null || _window$__forecast35 === void 0 ? void 0 : _window$__forecast35.getPollsCanvas;
    if (typeof fn !== "function") return;
    var c = fn(mode);
    if (!c) return;
    if (c.parentNode !== hostRef.current) {
      c.style.width = "100%";
      c.style.height = "100%";
      c.style.display = "block";
      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(c);
    }
    requestAnimationFrame(function () {
      var _window$__forecast36;
      if (typeof ((_window$__forecast36 = window.__forecast) === null || _window$__forecast36 === void 0 ? void 0 : _window$__forecast36.triggerResize) === "function") window.__forecast.triggerResize();else window.dispatchEvent(new Event("resize"));
    });
  }, [mode, ready]);
  return /*#__PURE__*/React.createElement("div", {
    className: "pollsHistHost",
    ref: hostRef,
    "data-polls-host": "hist",
    "data-mode": mode
  });
}
function PollsChartHost(_ref18) {
  var mode = _ref18.mode,
    ready = _ref18.ready;
  var hostRef = useRef(null);
  useEffect(function () {
    var _window$__forecast37;
    if (!ready || !hostRef.current) return;
    var fn = (_window$__forecast37 = window.__forecast) === null || _window$__forecast37 === void 0 ? void 0 : _window$__forecast37.getPollsChartSvg;
    if (typeof fn !== "function") return;
    var svg = fn(mode);
    if (!svg) return;
    if (svg.parentNode !== hostRef.current) {
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.display = "block";
      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(svg);
    }
    requestAnimationFrame(function () {
      var _window$__forecast38;
      if (typeof ((_window$__forecast38 = window.__forecast) === null || _window$__forecast38 === void 0 ? void 0 : _window$__forecast38.triggerResize) === "function") window.__forecast.triggerResize();else window.dispatchEvent(new Event("resize"));
    });
  }, [mode, ready]);
  return /*#__PURE__*/React.createElement("div", {
    className: "chartHost",
    ref: hostRef,
    "data-polls-host": "chart",
    "data-mode": mode
  });
}
function PollsMapHost(_ref19) {
  var mode = _ref19.mode,
    ready = _ref19.ready;
  var hostRef = useRef(null);
  useEffect(function () {
    var _window$__forecast39;
    if (!ready || !hostRef.current) return;
    var fn = (_window$__forecast39 = window.__forecast) === null || _window$__forecast39 === void 0 ? void 0 : _window$__forecast39.getPollsMapSvg;
    if (typeof fn !== "function") return;
    var svg = fn(mode);
    if (!svg) return;
    if (svg.parentNode !== hostRef.current) {
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.display = "block";
      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(svg);
    }
  }, [mode, ready]);
  return /*#__PURE__*/React.createElement("div", {
    className: "mapHost",
    ref: hostRef,
    "data-polls-host": "map",
    "data-mode": mode
  });
}
function PollsStateChartHost(_ref20) {
  var mode = _ref20.mode,
    ready = _ref20.ready;
  var hostRef = useRef(null);
  useEffect(function () {
    var _window$__forecast40;
    if (!ready || !hostRef.current) return;
    var fn = (_window$__forecast40 = window.__forecast) === null || _window$__forecast40 === void 0 ? void 0 : _window$__forecast40.getPollsStateChartSvg;
    if (typeof fn !== "function") return;
    var svg = fn(mode);
    if (!svg) return;
    if (svg.parentNode !== hostRef.current) {
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.display = "block";
      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(svg);
    }
    requestAnimationFrame(function () {
      var _window$__forecast41;
      if (typeof ((_window$__forecast41 = window.__forecast) === null || _window$__forecast41 === void 0 ? void 0 : _window$__forecast41.triggerResize) === "function") window.__forecast.triggerResize();else window.dispatchEvent(new Event("resize"));
    });
  }, [mode, ready]);
  return /*#__PURE__*/React.createElement("div", {
    className: "chartHost",
    ref: hostRef,
    "data-polls-host": "stchart",
    "data-mode": mode
  });
}
function PollsListHost(_ref21) {
  var ready = _ref21.ready;
  var hostRef = useRef(null);
  useEffect(function () {
    var _window$__forecast42;
    if (!ready || !hostRef.current) return;
    var fn = (_window$__forecast42 = window.__forecast) === null || _window$__forecast42 === void 0 ? void 0 : _window$__forecast42.getPollsListEl;
    if (typeof fn !== "function") return;
    var el = fn();
    if (!el) return;
    if (el.parentNode !== hostRef.current) {
      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(el);
    }
  }, [ready]);
  return /*#__PURE__*/React.createElement("div", {
    className: "pollsListHost",
    ref: hostRef
  });
}
function PollsGBSection(_ref22) {
  var _s$pillD3, _s$pillR3, _s$dBig, _s$rBig;
  var snapshot = _ref22.snapshot,
    ready = _ref22.ready,
    leftTab = _ref22.leftTab,
    setLeftTab = _ref22.setLeftTab;
  var meta = POLLS_TITLES.gb;
  var s = snapshot || {};
  var pillD = (_s$pillD3 = s.pillD) !== null && _s$pillD3 !== void 0 ? _s$pillD3 : "—";
  var pillR = (_s$pillR3 = s.pillR) !== null && _s$pillR3 !== void 0 ? _s$pillR3 : "—";
  var dBig = (_s$dBig = s.dBig) !== null && _s$dBig !== void 0 ? _s$dBig : "—";
  var rBig = (_s$rBig = s.rBig) !== null && _s$rBig !== void 0 ? _s$rBig : "—";
  return /*#__PURE__*/React.createElement("div", {
    className: "col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "secHead"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "secTitle"
  }, meta.title), /*#__PURE__*/React.createElement("div", {
    className: "secSub"
  }, meta.sub)), /*#__PURE__*/React.createElement("div", {
    className: "pills"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pill d"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sw"
  }), /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "D"), /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, pillD), /*#__PURE__*/React.createElement("span", {
    className: "pct"
  }, "%")), /*#__PURE__*/React.createElement("div", {
    className: "pill r"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sw"
  }), /*#__PURE__*/React.createElement("span", {
    className: "l"
  }, "R"), /*#__PURE__*/React.createElement("span", {
    className: "n"
  }, pillR), /*#__PURE__*/React.createElement("span", {
    className: "pct"
  }, "%")))), /*#__PURE__*/React.createElement("div", {
    className: "seats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "seatsCol d"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Dem."), /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, dBig)), /*#__PURE__*/React.createElement("div", {
    className: "seatsDash"
  }, "/"), /*#__PURE__*/React.createElement("div", {
    className: "seatsCol r"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Rep."), /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, rBig))), /*#__PURE__*/React.createElement(PollsCanvasHost, {
    mode: "gb",
    ready: ready
  }), /*#__PURE__*/React.createElement("div", {
    className: "probBlock"
  }, /*#__PURE__*/React.createElement("div", {
    className: "probHead"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h"
  }, leftTab === "gb" ? "Generic ballot" : "Approval"), /*#__PURE__*/React.createElement("div", {
    className: "toggle"
  }, /*#__PURE__*/React.createElement("button", {
    className: leftTab === "gb" ? "active" : "",
    onClick: function onClick() {
      return setLeftTab("gb");
    }
  }, "gen ballot"), /*#__PURE__*/React.createElement("span", {
    className: "s"
  }, "/"), /*#__PURE__*/React.createElement("button", {
    className: leftTab === "approval" ? "active" : "",
    onClick: function onClick() {
      return setLeftTab("approval");
    }
  }, "approval"))), /*#__PURE__*/React.createElement(PollsChartHost, {
    mode: "gb",
    ready: ready
  })), /*#__PURE__*/React.createElement("div", {
    className: "pollsListWrap"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pollsListHead"
  }, "Recent polls"), /*#__PURE__*/React.createElement(PollsListHost, {
    ready: ready
  })));
}
function PollsRaceSection(_ref23) {
  var _s$dBig2, _s$rBig2;
  var mode = _ref23.mode,
    snapshot = _ref23.snapshot,
    ready = _ref23.ready;
  var meta = POLLS_TITLES[mode];
  var s = snapshot || {};
  var dBig = (_s$dBig2 = s.dBig) !== null && _s$dBig2 !== void 0 ? _s$dBig2 : "—";
  var rBig = (_s$rBig2 = s.rBig) !== null && _s$rBig2 !== void 0 ? _s$rBig2 : "—";
  var stTitle = s.stTitle || "Click a state to see polls";
  return /*#__PURE__*/React.createElement("div", {
    className: "col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "secHead"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "secTitle"
  }, meta.title), /*#__PURE__*/React.createElement("div", {
    className: "secSub"
  }, meta.sub))), /*#__PURE__*/React.createElement("div", {
    className: "seats"
  }, /*#__PURE__*/React.createElement("div", {
    className: "seatsCol d"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Dem."), /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, dBig)), /*#__PURE__*/React.createElement("div", {
    className: "seatsDash"
  }, "/"), /*#__PURE__*/React.createElement("div", {
    className: "seatsCol r"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Rep."), /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, rBig))), /*#__PURE__*/React.createElement(PollsCanvasHost, {
    mode: mode,
    ready: ready
  }), /*#__PURE__*/React.createElement("div", {
    className: "mapBlock"
  }, /*#__PURE__*/React.createElement(PollsMapHost, {
    mode: mode,
    ready: ready
  }), /*#__PURE__*/React.createElement("div", {
    className: "mapHint"
  }, !ready ? "Loading polls…" : "Click a state to see its polls")), /*#__PURE__*/React.createElement("div", {
    className: "probBlock"
  }, /*#__PURE__*/React.createElement("div", {
    className: "probHead"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h pollsStateTitle"
  }, stTitle)), /*#__PURE__*/React.createElement(PollsStateChartHost, {
    mode: mode,
    ready: ready
  })));
}
function PollsView() {
  var _useState29 = useState(false),
    _useState30 = _slicedToArray(_useState29, 2),
    ready = _useState30[0],
    setReady = _useState30[1];
  var _useState31 = useState("gb"),
    _useState32 = _slicedToArray(_useState31, 2),
    leftTab = _useState32[0],
    setLeftTabState = _useState32[1];
  var _useState33 = useState({}),
    _useState34 = _slicedToArray(_useState33, 2),
    snapshots = _useState34[0],
    setSnapshots = _useState34[1];
  var refreshSnapshots = function refreshSnapshots() {
    var _window$__forecast43;
    var fn = (_window$__forecast43 = window.__forecast) === null || _window$__forecast43 === void 0 ? void 0 : _window$__forecast43.getPollsSnapshot;
    if (typeof fn !== "function") return;
    try {
      setSnapshots({
        gb: fn("gb"),
        senate: fn("senate"),
        governor: fn("governor")
      });
    } catch (e) {}
  };
  useEffect(function () {
    var _window$__forecast44;
    if (typeof ((_window$__forecast44 = window.__forecast) === null || _window$__forecast44 === void 0 ? void 0 : _window$__forecast44.ensurePollsInited) === "function") {
      window.__forecast.ensurePollsInited();
    }
    // polls.js's initPollsPage awaits ~250ms internally before rendering — poll
    // a few times to detect when the chart svg has rendered content.
    var cancelled = false;
    var tries = 0;
    function check() {
      var _window$__forecast45;
      if (cancelled) return;
      var fn = (_window$__forecast45 = window.__forecast) === null || _window$__forecast45 === void 0 ? void 0 : _window$__forecast45.getPollsChartSvg;
      if (typeof fn === "function" && fn("gb") && fn("gb").children.length > 0) {
        setReady(true);
        refreshSnapshots();
        return;
      }
      if (++tries > 40) return;
      setTimeout(check, 200);
    }
    setTimeout(check, 300);

    // Also poll snapshots every 500ms while the view is mounted so live
    // state picks (clicking a senate state) reflect their new D/R numbers.
    var interval = setInterval(refreshSnapshots, 500);
    return function () {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);
  var setLeftTab = function setLeftTab(tab) {
    var _window$__forecast46;
    setLeftTabState(tab);
    if (typeof ((_window$__forecast46 = window.__forecast) === null || _window$__forecast46 === void 0 ? void 0 : _window$__forecast46.setPollsToggle) === "function") {
      window.__forecast.setPollsToggle(tab);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "pollsView"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cols"
  }, /*#__PURE__*/React.createElement(PollsGBSection, {
    snapshot: snapshots.gb,
    ready: ready,
    leftTab: leftTab,
    setLeftTab: setLeftTab
  }), /*#__PURE__*/React.createElement("div", {
    className: "colRule"
  }), /*#__PURE__*/React.createElement(PollsRaceSection, {
    mode: "senate",
    snapshot: snapshots.senate,
    ready: ready
  }), /*#__PURE__*/React.createElement("div", {
    className: "colRule"
  }), /*#__PURE__*/React.createElement(PollsRaceSection, {
    mode: "governor",
    snapshot: snapshots.governor,
    ready: ready
  })));
}

/* ============================================================================
   Methodology + Projects (unchanged from v8)
   ============================================================================ */
var RTG_TABLE_ROWS = [{
  key: "safeD",
  label: "Safe D",
  desc: "Strong Democratic advantage"
}, {
  key: "likelyD",
  label: "Likely D",
  desc: "Clear Democratic lead"
}, {
  key: "leanD",
  label: "Lean D",
  desc: "Slight Democratic edge"
}, {
  key: "tossup",
  label: "Tossup",
  desc: "Either party could win"
}, {
  key: "leanR",
  label: "Lean R",
  desc: "Slight Republican edge"
}, {
  key: "likelyR",
  label: "Likely R",
  desc: "Clear Republican lead"
}, {
  key: "safeR",
  label: "Safe R",
  desc: "Strong Republican advantage"
}];
function MethodologyView() {
  return /*#__PURE__*/React.createElement("div", {
    className: "methAlmanac"
  }, /*#__PURE__*/React.createElement("header", {
    className: "methHero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "methKicker"
  }, "Documentation"), /*#__PURE__*/React.createElement("h1", {
    className: "methTitle"
  }, "Methodology"), /*#__PURE__*/React.createElement("p", {
    className: "methLede"
  }, "How the 2026 midterm forecast works.")), /*#__PURE__*/React.createElement("section", {
    className: "methCard"
  }, /*#__PURE__*/React.createElement("p", {
    className: "methBody"
  }, "This forecast projects the outcome of every Senate, gubernatorial, and House race in the 2026 midterm elections. It combines national polling, state-level surveys, and historical voting patterns into a probabilistic model that runs thousands of election simulations daily.")), /*#__PURE__*/React.createElement("section", {
    className: "methCard"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "methH2"
  }, "Inputs"), /*#__PURE__*/React.createElement("p", {
    className: "methBody"
  }, "The model ingests three main signals: a ", /*#__PURE__*/React.createElement("strong", null, "generic ballot"), " average computed from a quality-filtered, weighted rolling window of national polls; ", /*#__PURE__*/React.createElement("strong", null, "state and district polls"), " where available; and", /*#__PURE__*/React.createElement("strong", null, " historical partisan ratios"), " derived from recent election results. These are blended together with weights that reflect their relative informativeness \u2014 state polls carry the most influence where they exist, and the generic ballot fills in everywhere else."), /*#__PURE__*/React.createElement("p", {
    className: "methBody"
  }, "A ", /*#__PURE__*/React.createElement("strong", null, "national indicator"), " is also computed by reverse-engineering the implied national environment from all available state polls, providing an additional cross-check on the generic ballot signal.")), /*#__PURE__*/React.createElement("section", {
    className: "methCard"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "methH2"
  }, "Adjustments"), /*#__PURE__*/React.createElement("p", {
    className: "methBody"
  }, "The model applies several corrections to improve accuracy. A ", /*#__PURE__*/React.createElement("strong", null, "pollster quality filter"), " screens polls by historical track record and weights them accordingly. A ", /*#__PURE__*/React.createElement("strong", null, "circuit breaker"), " in non-competitive states prevents the national trend from overriding strong local polling. A ", /*#__PURE__*/React.createElement("strong", null, "Hispanic voter adjustment"), "accounts for shifts in Hispanic voter preference relative to recent baselines, scaled by each district's demographic composition.")), /*#__PURE__*/React.createElement("section", {
    className: "methCard"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "methH2"
  }, "Simulation"), /*#__PURE__*/React.createElement("p", {
    className: "methBody"
  }, "Individual race win probabilities are derived from projected margins using a normal distribution that accounts for polling uncertainty. Chamber-level outcomes are determined through ", /*#__PURE__*/React.createElement("strong", null, "Monte Carlo simulation"), " \u2014 each run draws a correlated national swing and resolves every race, producing a full election map. The share of simulations in which each party reaches a majority determines the control probability.")), /*#__PURE__*/React.createElement("section", {
    className: "methCard"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "methH2"
  }, "Forecast vs. Nowcast"), /*#__PURE__*/React.createElement("p", {
    className: "methBody"
  }, /*#__PURE__*/React.createElement("strong", null, "Nowcast"), " reflects what would happen if the election were held today \u2014 a pure snapshot of current polling."), /*#__PURE__*/React.createElement("p", {
    className: "methBody"
  }, /*#__PURE__*/React.createElement("strong", null, "Forecast"), " projects forward to Election Day by modeling how the race is likely to evolve. Undecided voters are gradually allocated based on historical patterns, and a small structural adjustment is applied to account for the typical relationship between midterm polling and final results. Both adjustments ramp gradually to full strength by early fall.")), /*#__PURE__*/React.createElement("section", {
    className: "methCard"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "methH2"
  }, "Ratings"), /*#__PURE__*/React.createElement("p", {
    className: "methBody"
  }, "Each race is classified on a seven-point scale from Safe D to Safe R based on its projected margin. The thresholds are calibrated to reflect meaningful differences in competitiveness."), /*#__PURE__*/React.createElement("div", {
    className: "methTableWrap"
  }, /*#__PURE__*/React.createElement("table", {
    className: "methTableA"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Rating"), /*#__PURE__*/React.createElement("th", null, "Margin"), /*#__PURE__*/React.createElement("th", null, "Description"))), /*#__PURE__*/React.createElement("tbody", null, RTG_TABLE_ROWS.map(function (r, i) {
    var margins = [">15", "7.5–15", "2.5–7.5", "<2.5", "2.5–7.5", "7.5–15", ">15"];
    return /*#__PURE__*/React.createElement("tr", {
      key: r.key
    }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
      className: "methSwatch rtg-" + r.key
    }), /*#__PURE__*/React.createElement("span", {
      className: "methRatingName"
    }, r.label)), /*#__PURE__*/React.createElement("td", {
      className: "methMono"
    }, margins[i], " pp"), /*#__PURE__*/React.createElement("td", {
      className: "methDesc"
    }, r.desc));
  }))))), /*#__PURE__*/React.createElement("section", {
    className: "methCard"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "methH2"
  }, "Data Sources"), /*#__PURE__*/React.createElement("p", {
    className: "methBody"
  }, "National and state polls are sourced from public polling databases and manually curated releases. Election baselines come from recent presidential and congressional results. Demographic adjustments use Census population estimates. Maps use US Census Bureau shapefiles.")), /*#__PURE__*/React.createElement("footer", {
    className: "methFoot"
  }, "Built by ", /*#__PURE__*/React.createElement("a", {
    href: "https://x.com/The0_o7",
    target: "_blank",
    rel: "noreferrer"
  }, "Theo"), " \xB7 2026"));
}
var PROJECTS = [{
  label: "Projects",
  items: [{
    url: "fundraising-comparison.html",
    kicker: "Texas Senate '26",
    kickerKind: "red",
    title: "Talarico vs. the field: Texas Democratic fundraising",
    desc: "Cumulative inflation-adjusted fundraising for four recent Texas Democratic statewide challengers, charted by months to general election. Talarico's seven-month haul versus Beto '18, Beto '22 governor, and Allred '24.",
    meta: ["Chart", "FEC · TEC"]
  }, {
    url: "primary_turnout_combined.html",
    kicker: "National analysis",
    kickerKind: "neutral",
    title: "Primary turnout as a general election signal",
    desc: "State-by-state primary-to-general vote ratios for Democrats and Republicans, 2000–2026. Tests whether the primary enthusiasm gap predicts the national environment in November.",
    meta: ["Interactive", "FEC · State SOS"]
  }, {
    url: "nationalization-2.html",
    kicker: "Midterm races",
    kickerKind: "purple",
    title: "Nationalization indicator for 2026",
    desc: "A district-level measure of how closely individual Senate, House, and gubernatorial races are tracking the national environment. Filter by chamber, sort by deviation, and see who's running ahead or behind their baseline.",
    meta: ["Interactive", "2026 forecast model"]
  }, {
    url: "#",
    title: "CA gov model"
  }, {
    url: "#",
    title: "Lindsey Graham approval"
  }, {
    url: "#",
    title: "International polling averages"
  }, {
    url: "#",
    title: "Texas trends"
  }, {
    url: "#",
    title: "VoteHub publishment"
  }, {
    url: "#",
    title: "American shift"
  }, {
    url: "#",
    title: "Texas voter turnout dashboard"
  }, {
    url: "#",
    title: "Texas income to swing, 2020 and 2024"
  }]
}, {
  label: "Election Coverage",
  items: [{
    url: "#",
    title: "GA 14 jungle primary"
  }, {
    url: "#",
    title: "GA 14 runoff"
  }, {
    url: "#",
    title: "Wisconsin Supreme Court election turnout and model"
  }]
}];
function ProjectCard(_ref24) {
  var p = _ref24.p;
  var minimal = !p.desc;
  return /*#__PURE__*/React.createElement("a", {
    className: "projCardA" + (minimal ? " projCardA-mini" : ""),
    href: p.url,
    target: p.url && p.url !== "#" ? "_blank" : undefined,
    rel: "noreferrer"
  }, p.kicker && /*#__PURE__*/React.createElement("div", {
    className: "projCardAKicker projKick-" + (p.kickerKind || "neutral")
  }, p.kicker), /*#__PURE__*/React.createElement("h3", {
    className: "projCardATitle"
  }, p.title), p.desc && /*#__PURE__*/React.createElement("p", {
    className: "projCardADesc"
  }, p.desc), /*#__PURE__*/React.createElement("div", {
    className: "projCardAMeta"
  }, (p.meta || []).map(function (m, i) {
    return /*#__PURE__*/React.createElement("span", {
      key: i
    }, m);
  }), /*#__PURE__*/React.createElement("span", {
    className: "projCardAOpen"
  }, "Open \u2192")));
}
function ProjectsView() {
  return /*#__PURE__*/React.createElement("div", {
    className: "projAlmanac"
  }, /*#__PURE__*/React.createElement("header", {
    className: "projHero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "methKicker"
  }, "Index"), /*#__PURE__*/React.createElement("h1", {
    className: "methTitle"
  }, "Projects"), /*#__PURE__*/React.createElement("p", {
    className: "methLede"
  }, "Standalone analyses, dashboards, and election-night coverage.")), PROJECTS.map(function (section) {
    return /*#__PURE__*/React.createElement("section", {
      key: section.label,
      className: "projSectionA"
    }, /*#__PURE__*/React.createElement("div", {
      className: "projSectionALabel"
    }, section.label), /*#__PURE__*/React.createElement("div", {
      className: "projGridA"
    }, section.items.map(function (p, i) {
      return /*#__PURE__*/React.createElement(ProjectCard, {
        key: i,
        p: p
      });
    })));
  }));
}

/* ========== TopBar + ForecastToggle ========== */
function TopBar(_ref25) {
  var activeTab = _ref25.activeTab,
    setActiveTab = _ref25.setActiveTab;
  var tabs = ["Model", "Ratings", "Florida", "Polls", "Swingometer", "Past Elections", "State Legs.", "Projects", "Methodology"];
  var _useState35 = useState(function () {
      try {
        return localStorage.getItem("theo-theme") || "light";
      } catch (e) {
        return "light";
      }
    }),
    _useState36 = _slicedToArray(_useState35, 2),
    theme = _useState36[0],
    setTheme = _useState36[1];
  useEffect(function () {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theo-theme", theme);
    } catch (e) {}
  }, [theme]);
  return /*#__PURE__*/React.createElement("div", {
    className: "top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand"
  }, /*#__PURE__*/React.createElement("span", {
    className: "name"
  }, "Theo"), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", {
    className: "tag"
  }, "Election Forecast '26")), /*#__PURE__*/React.createElement("nav", {
    className: "nav"
  }, tabs.map(function (t, i) {
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: t
    }, i > 0 && /*#__PURE__*/React.createElement("span", {
      className: "dot"
    }, "\xB7"), /*#__PURE__*/React.createElement("a", {
      className: activeTab === t ? "active" : "",
      onClick: function onClick() {
        return setActiveTab(t);
      }
    }, t));
  })), /*#__PURE__*/React.createElement("div", {
    className: "actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "iconbtn",
    title: "Percent"
  }, "%"), /*#__PURE__*/React.createElement("button", {
    className: "iconbtn",
    title: theme === "dark" ? "Light mode" : "Dark mode",
    onClick: function onClick() {
      return setTheme(theme === "dark" ? "light" : "dark");
    }
  }, theme === "dark" ? "☀" : "☾"), /*#__PURE__*/React.createElement("button", {
    className: "donate",
    onClick: function onClick() {
      return window.open("https://buymeacoffee.com/the0", "_blank");
    }
  }, "Donate")));
}
function ForecastToggle(_ref26) {
  var forecastMode = _ref26.forecastMode,
    setForecastMode = _ref26.setForecastMode;
  var click = function click(mode) {
    var _window$__forecast47;
    setForecastMode(mode);
    if (typeof ((_window$__forecast47 = window.__forecast) === null || _window$__forecast47 === void 0 ? void 0 : _window$__forecast47.setForecastMode) === "function") window.__forecast.setForecastMode(mode);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "fcRow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "fcToggle"
  }, /*#__PURE__*/React.createElement("button", {
    className: forecastMode === "forecast" ? "active" : "",
    onClick: function onClick() {
      return click("forecast");
    }
  }, "Forecast"), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "\xB7"), /*#__PURE__*/React.createElement("button", {
    className: forecastMode === "nowcast" ? "active" : "",
    onClick: function onClick() {
      return click("nowcast");
    }
  }, "Nowcast")));
}
var TABS_WITH_FORECAST_TOGGLE = new Set(["Model", "Ratings"]);
function App() {
  var _useTweaks = useTweaks(window.TWEAK_DEFAULTS),
    _useTweaks2 = _slicedToArray(_useTweaks, 2),
    t = _useTweaks2[0],
    setTweak = _useTweaks2[1];
  var _useState37 = useState("Model"),
    _useState38 = _slicedToArray(_useState37, 2),
    activeTab = _useState38[0],
    setActiveTab = _useState38[1];
  var _useState39 = useState(function () {
      return makeLoadingSection("senate");
    }),
    _useState40 = _slicedToArray(_useState39, 2),
    senate = _useState40[0],
    setSenate = _useState40[1];
  var _useState41 = useState(function () {
      return makeLoadingSection("governor");
    }),
    _useState42 = _slicedToArray(_useState41, 2),
    governor = _useState42[0],
    setGovernor = _useState42[1];
  var _useState43 = useState(function () {
      return makeLoadingSection("house");
    }),
    _useState44 = _slicedToArray(_useState43, 2),
    house = _useState44[0],
    setHouse = _useState44[1];
  var _useState45 = useState(false),
    _useState46 = _slicedToArray(_useState45, 2),
    ready = _useState46[0],
    setReady = _useState46[1];
  var _useState47 = useState(false),
    _useState48 = _slicedToArray(_useState47, 2),
    dataReady = _useState48[0],
    setDataReady = _useState48[1];
  var _useState49 = useState("forecast"),
    _useState50 = _slicedToArray(_useState49, 2),
    forecastMode = _useState50[0],
    setForecastMode = _useState50[1];
  var _useState51 = useState({
      updated: "—",
      sims: "—",
      polls: "—",
      days: "—"
    }),
    _useState52 = _slicedToArray(_useState51, 2),
    foot = _useState52[0],
    setFoot = _useState52[1];
  useEffect(function () {
    document.documentElement.setAttribute("data-palette", t.palette);
    document.documentElement.setAttribute("data-density", t.density);
    document.documentElement.setAttribute("data-bg", t.background);
  }, [t.palette, t.density, t.background]);
  useEffect(function () {
    function refresh() {
      var F = window.__forecast;
      if (!F) return;
      var fm = F.forecastMode === "nowcast" ? "nowcast" : "forecast";
      setForecastMode(fm);
      setDataReady(true);
      try {
        setSenate(buildSectionData("senate", F.odds && F.odds.senate, F.hist && F.hist.senate, fm));
        setGovernor(buildSectionData("governor", F.odds && F.odds.governor, F.hist && F.hist.governor, fm));
        setHouse(buildSectionData("house", F.odds && F.odds.house, F.hist && F.hist.house, fm));
        var ELECTION_DAY = new Date(2026, 10, 3);
        var today = new Date();
        var days = Math.max(0, Math.ceil((ELECTION_DAY - today) / 86400000));
        var lastDateStr = F.odds && F.odds.senate && F.odds.senate.length ? F.odds.senate[F.odds.senate.length - 1].date : null;
        var updated = "—";
        if (lastDateStr) {
          var dt = new Date(lastDateStr);
          if (!isNaN(dt.getTime())) updated = dt.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric"
          });
        }
        var sims = F.config && isFinite(F.config.sims) ? F.config.sims.toLocaleString() : "—";
        var polls = isFinite(F.pollsCount) ? Number(F.pollsCount).toLocaleString() : "—";
        setFoot({
          updated: updated,
          sims: sims,
          polls: polls,
          days: String(days)
        });
      } catch (e) {}
    }
    function onMapsReady() {
      setReady(true);
      refresh();
    }
    refresh();
    if (window.__forecastMapsReady) setReady(true);
    if (window.__forecastDataReady) setDataReady(true);
    window.addEventListener("forecast-ready", refresh);
    window.addEventListener("forecast-update", refresh);
    window.addEventListener("forecast-maps-ready", onMapsReady);
    return function () {
      window.removeEventListener("forecast-ready", refresh);
      window.removeEventListener("forecast-update", refresh);
      window.removeEventListener("forecast-maps-ready", onMapsReady);
    };
  }, []);
  var viewContent;
  if (activeTab === "Model") {
    viewContent = /*#__PURE__*/React.createElement("div", {
      className: "cols"
    }, /*#__PURE__*/React.createElement(ModelSection, {
      d: senate,
      mode: "senate",
      ready: ready,
      forecastMode: forecastMode
    }), /*#__PURE__*/React.createElement("div", {
      className: "colRule"
    }), /*#__PURE__*/React.createElement(ModelSection, {
      d: governor,
      mode: "governor",
      ready: ready,
      forecastMode: forecastMode
    }), /*#__PURE__*/React.createElement("div", {
      className: "colRule"
    }), /*#__PURE__*/React.createElement(ModelSection, {
      d: house,
      mode: "house",
      ready: ready,
      forecastMode: forecastMode,
      isCongress: true
    }));
  } else if (activeTab === "Ratings") {
    viewContent = /*#__PURE__*/React.createElement(RatingsView, {
      forecastMode: forecastMode,
      dataReady: dataReady
    });
  } else if (activeTab === "Past Elections") {
    viewContent = /*#__PURE__*/React.createElement(PastElectionsView, null);
  } else if (activeTab === "Swingometer") {
    viewContent = /*#__PURE__*/React.createElement(SwingometerView, null);
  } else if (activeTab === "State Legs.") {
    viewContent = /*#__PURE__*/React.createElement(StateLegsView, null);
  } else if (activeTab === "Florida") {
    viewContent = /*#__PURE__*/React.createElement(FloridaView, null);
  } else if (activeTab === "Polls") {
    viewContent = /*#__PURE__*/React.createElement(PollsView, null);
  } else if (activeTab === "Methodology") {
    viewContent = /*#__PURE__*/React.createElement(MethodologyView, null);
  } else if (activeTab === "Projects") {
    viewContent = /*#__PURE__*/React.createElement(ProjectsView, null);
  } else {
    viewContent = /*#__PURE__*/React.createElement("div", {
      className: "comingSoon"
    }, /*#__PURE__*/React.createElement("div", {
      className: "comingSoonTitle"
    }, activeTab), /*#__PURE__*/React.createElement("div", {
      className: "comingSoonSub"
    }, "Not yet wired in this build."));
  }
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(TopBar, {
    activeTab: activeTab,
    setActiveTab: setActiveTab
  }), TABS_WITH_FORECAST_TOGGLE.has(activeTab) && /*#__PURE__*/React.createElement(ForecastToggle, {
    forecastMode: forecastMode,
    setForecastMode: setForecastMode
  }), viewContent, (activeTab === "Model" || activeTab === "Ratings") && /*#__PURE__*/React.createElement("div", {
    className: "foot"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "Updated"), " \xA0", foot.updated), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "Simulations"), " \xA0", foot.sims), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "Polls"), " \xA0", foot.polls), /*#__PURE__*/React.createElement("span", {
    className: "sep"
  }, "\xB7"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "Days to election"), " \xA0", foot.days)), /*#__PURE__*/React.createElement(TweaksPanel, {
    title: "Tweaks",
    defaultOpen: false
  }, /*#__PURE__*/React.createElement(TweakSection, {
    title: "Palette"
  }, /*#__PURE__*/React.createElement(TweakRadio, {
    value: t.palette,
    onChange: function onChange(v) {
      return setTweak("palette", v);
    },
    options: [{
      value: "almanac",
      label: "Almanac"
    }, {
      value: "foundry",
      label: "Foundry"
    }, {
      value: "atlas",
      label: "Atlas"
    }]
  })), /*#__PURE__*/React.createElement(TweakSection, {
    title: "Density"
  }, /*#__PURE__*/React.createElement(TweakRadio, {
    value: t.density,
    onChange: function onChange(v) {
      return setTweak("density", v);
    },
    options: [{
      value: "cozy",
      label: "Cozy"
    }, {
      value: "default",
      label: "Default"
    }, {
      value: "airy",
      label: "Airy"
    }]
  })), /*#__PURE__*/React.createElement(TweakSection, {
    title: "Background"
  }, /*#__PURE__*/React.createElement(TweakRadio, {
    value: t.background,
    onChange: function onChange(v) {
      return setTweak("background", v);
    },
    options: [{
      value: "plain",
      label: "Plain"
    }, {
      value: "lined",
      label: "Lined"
    }, {
      value: "grain",
      label: "Grain"
    }]
  }))));
}
ReactDOM.createRoot(document.getElementById("app")).render(/*#__PURE__*/React.createElement(App, null));

