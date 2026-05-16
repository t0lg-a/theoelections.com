"use strict";

function _toArray(r) { return _arrayWithHoles(r) || _iterableToArray(r) || _unsupportedIterableToArray(r) || _nonIterableRest(); }
function _iterableToArray(r) { if ("undefined" != typeof Symbol && null != r[Symbol.iterator] || null != r["@@iterator"]) return Array.from(r); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
// tweaks-panel.jsx
// Reusable Tweaks shell + form-control helpers.
//
// Owns the host protocol (listens for __activate_edit_mode / __deactivate_edit_mode,
// posts __edit_mode_available / __edit_mode_set_keys / __edit_mode_dismissed) so
// individual prototypes don't re-roll it. Ships a consistent set of controls so you
// don't hand-draw <input type="range">, segmented radios, steppers, etc.
//
// Usage (in an HTML file that loads React + Babel):
//
//   const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
//     "primaryColor": "#D97757",
//     "palette": ["#D97757", "#29261b", "#f6f4ef"],
//     "fontSize": 16,
//     "density": "regular",
//     "dark": false
//   }/*EDITMODE-END*/;
//
//   function App() {
//     const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
//     return (
//       <div style={{ fontSize: t.fontSize, color: t.primaryColor }}>
//         Hello
//         <TweaksPanel>
//           <TweakSection label="Typography" />
//           <TweakSlider label="Font size" value={t.fontSize} min={10} max={32} unit="px"
//                        onChange={(v) => setTweak('fontSize', v)} />
//           <TweakRadio  label="Density" value={t.density}
//                        options={['compact', 'regular', 'comfy']}
//                        onChange={(v) => setTweak('density', v)} />
//           <TweakSection label="Theme" />
//           <TweakColor  label="Primary" value={t.primaryColor}
//                        options={['#D97757', '#2A6FDB', '#1F8A5B', '#7A5AE0']}
//                        onChange={(v) => setTweak('primaryColor', v)} />
//           <TweakColor  label="Palette" value={t.palette}
//                        options={[['#D97757', '#29261b', '#f6f4ef'],
//                                  ['#475569', '#0f172a', '#f1f5f9']]}
//                        onChange={(v) => setTweak('palette', v)} />
//           <TweakToggle label="Dark mode" value={t.dark}
//                        onChange={(v) => setTweak('dark', v)} />
//         </TweaksPanel>
//       </div>
//     );
//   }
//
// ─────────────────────────────────────────────────────────────────────────────

var __TWEAKS_STYLE = "\n  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;\n    max-height:calc(100vh - 32px);display:flex;flex-direction:column;\n    transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom right;\n    background:rgba(250,249,247,.78);color:#29261b;\n    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);\n    border:.5px solid rgba(255,255,255,.6);border-radius:14px;\n    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);\n    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}\n  .twk-hd{display:flex;align-items:center;justify-content:space-between;\n    padding:10px 8px 10px 14px;cursor:move;user-select:none}\n  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}\n  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);\n    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}\n  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}\n  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;\n    overflow-y:auto;overflow-x:hidden;min-height:0;\n    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}\n  .twk-body::-webkit-scrollbar{width:8px}\n  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}\n  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;\n    border:2px solid transparent;background-clip:content-box}\n  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);\n    border:2px solid transparent;background-clip:content-box}\n  .twk-row{display:flex;flex-direction:column;gap:5px}\n  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}\n  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;\n    color:rgba(41,38,27,.72)}\n  .twk-lbl>span:first-child{font-weight:500}\n  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}\n\n  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;\n    color:rgba(41,38,27,.45);padding:10px 0 0}\n  .twk-sect:first-child{padding-top:0}\n\n  .twk-field{appearance:none;box-sizing:border-box;width:100%;min-width:0;height:26px;padding:0 8px;\n    border:.5px solid rgba(0,0,0,.1);border-radius:7px;\n    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}\n  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}\n  select.twk-field{padding-right:22px;\n    background-image:url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>\");\n    background-repeat:no-repeat;background-position:right 8px center}\n\n  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;\n    border-radius:999px;background:rgba(0,0,0,.12);outline:none}\n  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;\n    width:14px;height:14px;border-radius:50%;background:#fff;\n    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}\n  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;\n    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}\n\n  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;\n    background:rgba(0,0,0,.06);user-select:none}\n  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;\n    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);\n    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}\n  .twk-seg.dragging .twk-seg-thumb{transition:none}\n  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;\n    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;\n    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;\n    overflow-wrap:anywhere}\n\n  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;\n    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}\n  .twk-toggle[data-on=\"1\"]{background:#34c759}\n  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;\n    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}\n  .twk-toggle[data-on=\"1\"] i{transform:translateX(14px)}\n\n  .twk-num{display:flex;align-items:center;box-sizing:border-box;min-width:0;height:26px;padding:0 0 0 8px;\n    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}\n  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;\n    user-select:none;padding-right:8px}\n  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;\n    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;\n    outline:none;color:inherit;-moz-appearance:textfield}\n  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{\n    -webkit-appearance:none;margin:0}\n  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}\n\n  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;\n    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}\n  .twk-btn:hover{background:rgba(0,0,0,.88)}\n  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}\n  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}\n\n  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;\n    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;\n    background:transparent;flex-shrink:0}\n  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}\n  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}\n  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}\n\n  .twk-chips{display:flex;gap:6px}\n  .twk-chip{position:relative;appearance:none;flex:1;min-width:0;height:46px;\n    padding:0;border:0;border-radius:6px;overflow:hidden;cursor:default;\n    box-shadow:0 0 0 .5px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.06);\n    transition:transform .12s cubic-bezier(.3,.7,.4,1),box-shadow .12s}\n  .twk-chip:hover{transform:translateY(-1px);\n    box-shadow:0 0 0 .5px rgba(0,0,0,.18),0 4px 10px rgba(0,0,0,.12)}\n  .twk-chip[data-on=\"1\"]{box-shadow:0 0 0 1.5px rgba(0,0,0,.85),\n    0 2px 6px rgba(0,0,0,.15)}\n  .twk-chip>span{position:absolute;top:0;bottom:0;right:0;width:34%;\n    display:flex;flex-direction:column;box-shadow:-1px 0 0 rgba(0,0,0,.1)}\n  .twk-chip>span>i{flex:1;box-shadow:0 -1px 0 rgba(0,0,0,.1)}\n  .twk-chip>span>i:first-child{box-shadow:none}\n  .twk-chip svg{position:absolute;top:6px;left:6px;width:13px;height:13px;\n    filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))}\n";

// ── useTweaks ───────────────────────────────────────────────────────────────
// Single source of truth for tweak values. setTweak persists via the host
// (__edit_mode_set_keys → host rewrites the EDITMODE block on disk).
function useTweaks(defaults) {
  var _React$useState = React.useState(defaults),
    _React$useState2 = _slicedToArray(_React$useState, 2),
    values = _React$useState2[0],
    setValues = _React$useState2[1];
  // Accepts either setTweak('key', value) or setTweak({ key: value, ... }) so a
  // useState-style call doesn't write a "[object Object]" key into the persisted
  // JSON block.
  var setTweak = React.useCallback(function (keyOrEdits, val) {
    var edits = _typeof(keyOrEdits) === 'object' && keyOrEdits !== null ? keyOrEdits : _defineProperty({}, keyOrEdits, val);
    setValues(function (prev) {
      return _objectSpread(_objectSpread({}, prev), edits);
    });
    window.parent.postMessage({
      type: '__edit_mode_set_keys',
      edits: edits
    }, '*');
    // Same-window signal so in-page listeners (deck-stage rail thumbnails)
    // can react — the parent message only reaches the host, not peers.
    window.dispatchEvent(new CustomEvent('tweakchange', {
      detail: edits
    }));
  }, []);
  return [values, setTweak];
}

// ── TweaksPanel ─────────────────────────────────────────────────────────────
// Floating shell. Registers the protocol listener BEFORE announcing
// availability — if the announce ran first, the host's activate could land
// before our handler exists and the toolbar toggle would silently no-op.
// The close button posts __edit_mode_dismissed so the host's toolbar toggle
// flips off in lockstep; the host echoes __deactivate_edit_mode back which
// is what actually hides the panel.
function TweaksPanel(_ref2) {
  var _ref2$title = _ref2.title,
    title = _ref2$title === void 0 ? 'Tweaks' : _ref2$title,
    _ref2$noDeckControls = _ref2.noDeckControls,
    noDeckControls = _ref2$noDeckControls === void 0 ? false : _ref2$noDeckControls,
    children = _ref2.children;
  var _React$useState3 = React.useState(false),
    _React$useState4 = _slicedToArray(_React$useState3, 2),
    open = _React$useState4[0],
    setOpen = _React$useState4[1];
  var dragRef = React.useRef(null);
  // Auto-inject a rail toggle when a <deck-stage> is on the page. The
  // toggle drives the deck's per-viewer _railVisible via window message;
  // state is mirrored from the same localStorage key the deck reads so
  // the control reflects reality across reloads. The mechanism is the
  // message — authors who want custom placement can post it directly
  // and pass noDeckControls to suppress this one.
  var hasDeckStage = React.useMemo(function () {
    return typeof document !== 'undefined' && !!document.querySelector('deck-stage');
  }, []);
  // Hide the toggle until the host has actually enabled the rail (the
  // __omelette_rail_enabled window message, posted only when the
  // omelette_deck_rail_enabled flag is on for this user). The initial read
  // covers TweaksPanel mounting after the message already arrived; the
  // listener covers the common case of mounting first.
  var _React$useState5 = React.useState(function () {
      var _document$querySelect;
      return hasDeckStage && !!((_document$querySelect = document.querySelector('deck-stage')) !== null && _document$querySelect !== void 0 && _document$querySelect._railEnabled);
    }),
    _React$useState6 = _slicedToArray(_React$useState5, 2),
    railEnabled = _React$useState6[0],
    setRailEnabled = _React$useState6[1];
  React.useEffect(function () {
    if (!hasDeckStage || railEnabled) return undefined;
    var onMsg = function onMsg(e) {
      if (e.data && e.data.type === '__omelette_rail_enabled') setRailEnabled(true);
    };
    window.addEventListener('message', onMsg);
    return function () {
      return window.removeEventListener('message', onMsg);
    };
  }, [hasDeckStage, railEnabled]);
  var _React$useState7 = React.useState(function () {
      try {
        return localStorage.getItem('deck-stage.railVisible') !== '0';
      } catch (e) {
        return true;
      }
    }),
    _React$useState8 = _slicedToArray(_React$useState7, 2),
    railVisible = _React$useState8[0],
    setRailVisible = _React$useState8[1];
  var toggleRail = function toggleRail(on) {
    setRailVisible(on);
    window.postMessage({
      type: '__deck_rail_visible',
      on: on
    }, '*');
  };
  var offsetRef = React.useRef({
    x: 16,
    y: 16
  });
  var PAD = 16;
  var clampToViewport = React.useCallback(function () {
    var panel = dragRef.current;
    if (!panel) return;
    var w = panel.offsetWidth,
      h = panel.offsetHeight;
    var maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    var maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y))
    };
    panel.style.right = offsetRef.current.x + 'px';
    panel.style.bottom = offsetRef.current.y + 'px';
  }, []);
  React.useEffect(function () {
    if (!open) return;
    clampToViewport();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', clampToViewport);
      return function () {
        return window.removeEventListener('resize', clampToViewport);
      };
    }
    var ro = new ResizeObserver(clampToViewport);
    ro.observe(document.documentElement);
    return function () {
      return ro.disconnect();
    };
  }, [open, clampToViewport]);
  React.useEffect(function () {
    var onMsg = function onMsg(e) {
      var _e$data;
      var t = e === null || e === void 0 || (_e$data = e.data) === null || _e$data === void 0 ? void 0 : _e$data.type;
      if (t === '__activate_edit_mode') setOpen(true);else if (t === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return function () {
      return window.removeEventListener('message', onMsg);
    };
  }, []);
  var dismiss = function dismiss() {
    setOpen(false);
    window.parent.postMessage({
      type: '__edit_mode_dismissed'
    }, '*');
  };
  var onDragStart = function onDragStart(e) {
    var panel = dragRef.current;
    if (!panel) return;
    var r = panel.getBoundingClientRect();
    var sx = e.clientX,
      sy = e.clientY;
    var startRight = window.innerWidth - r.right;
    var startBottom = window.innerHeight - r.bottom;
    var move = function move(ev) {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy)
      };
      clampToViewport();
    };
    var _up = function up() {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', _up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', _up);
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, __TWEAKS_STYLE), /*#__PURE__*/React.createElement("div", {
    ref: dragRef,
    className: "twk-panel",
    "data-noncommentable": "",
    style: {
      right: offsetRef.current.x,
      bottom: offsetRef.current.y
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-hd",
    onMouseDown: onDragStart
  }, /*#__PURE__*/React.createElement("b", null, title), /*#__PURE__*/React.createElement("button", {
    className: "twk-x",
    "aria-label": "Close tweaks",
    onMouseDown: function onMouseDown(e) {
      return e.stopPropagation();
    },
    onClick: dismiss
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "twk-body"
  }, children, hasDeckStage && railEnabled && !noDeckControls && /*#__PURE__*/React.createElement(TweakSection, {
    label: "Deck"
  }, /*#__PURE__*/React.createElement(TweakToggle, {
    label: "Thumbnail rail",
    value: railVisible,
    onChange: toggleRail
  })))));
}

// ── Layout helpers ──────────────────────────────────────────────────────────

function TweakSection(_ref3) {
  var label = _ref3.label,
    children = _ref3.children;
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "twk-sect"
  }, label), children);
}
function TweakRow(_ref4) {
  var label = _ref4.label,
    value = _ref4.value,
    children = _ref4.children,
    _ref4$inline = _ref4.inline,
    inline = _ref4$inline === void 0 ? false : _ref4$inline;
  return /*#__PURE__*/React.createElement("div", {
    className: inline ? 'twk-row twk-row-h' : 'twk-row'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label), value != null && /*#__PURE__*/React.createElement("span", {
    className: "twk-val"
  }, value)), children);
}

// ── Controls ────────────────────────────────────────────────────────────────

function TweakSlider(_ref5) {
  var label = _ref5.label,
    value = _ref5.value,
    _ref5$min = _ref5.min,
    min = _ref5$min === void 0 ? 0 : _ref5$min,
    _ref5$max = _ref5.max,
    max = _ref5$max === void 0 ? 100 : _ref5$max,
    _ref5$step = _ref5.step,
    step = _ref5$step === void 0 ? 1 : _ref5$step,
    _ref5$unit = _ref5.unit,
    unit = _ref5$unit === void 0 ? '' : _ref5$unit,
    _onChange = _ref5.onChange;
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label,
    value: "".concat(value).concat(unit)
  }, /*#__PURE__*/React.createElement("input", {
    type: "range",
    className: "twk-slider",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: function onChange(e) {
      return _onChange(Number(e.target.value));
    }
  }));
}
function TweakToggle(_ref6) {
  var label = _ref6.label,
    value = _ref6.value,
    onChange = _ref6.onChange;
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-row twk-row-h"
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-lbl"
  }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "twk-toggle",
    "data-on": value ? '1' : '0',
    role: "switch",
    "aria-checked": !!value,
    onClick: function onClick() {
      return onChange(!value);
    }
  }, /*#__PURE__*/React.createElement("i", null)));
}
function TweakRadio(_ref7) {
  var _$3$options$length;
  var label = _ref7.label,
    value = _ref7.value,
    options = _ref7.options,
    _onChange2 = _ref7.onChange;
  var trackRef = React.useRef(null);
  var _React$useState9 = React.useState(false),
    _React$useState0 = _slicedToArray(_React$useState9, 2),
    dragging = _React$useState0[0],
    setDragging = _React$useState0[1];
  // The active value is read by pointer-move handlers attached for the lifetime
  // of a drag — ref it so a stale closure doesn't fire onChange for every move.
  var valueRef = React.useRef(value);
  valueRef.current = value;

  // Segments wrap mid-word once per-segment width runs out. The track is
  // ~248px (280 panel − 28 body pad − 4 seg pad), each button loses 12px
  // to its own padding, and 11.5px system-ui averages ~6.3px/char — so 2
  // options fit ~16 chars each, 3 fit ~10. Past that (or >3 options), fall
  // back to a dropdown rather than wrap.
  var labelLen = function labelLen(o) {
    return String(_typeof(o) === 'object' ? o.label : o).length;
  };
  var maxLen = options.reduce(function (m, o) {
    return Math.max(m, labelLen(o));
  }, 0);
  var fitsAsSegments = maxLen <= ((_$3$options$length = {
    2: 16,
    3: 10
  }[options.length]) !== null && _$3$options$length !== void 0 ? _$3$options$length : 0);
  if (!fitsAsSegments) {
    // <select> emits strings — map back to the original option value so the
    // fallback stays type-preserving (numbers, booleans) like the segment path.
    var resolve = function resolve(s) {
      var m = options.find(function (o) {
        return String(_typeof(o) === 'object' ? o.value : o) === s;
      });
      return m === undefined ? s : _typeof(m) === 'object' ? m.value : m;
    };
    return /*#__PURE__*/React.createElement(TweakSelect, {
      label: label,
      value: value,
      options: options,
      onChange: function onChange(s) {
        return _onChange2(resolve(s));
      }
    });
  }
  var opts = options.map(function (o) {
    return _typeof(o) === 'object' ? o : {
      value: o,
      label: o
    };
  });
  var idx = Math.max(0, opts.findIndex(function (o) {
    return o.value === value;
  }));
  var n = opts.length;
  var segAt = function segAt(clientX) {
    var r = trackRef.current.getBoundingClientRect();
    var inner = r.width - 4;
    var i = Math.floor((clientX - r.left - 2) / inner * n);
    return opts[Math.max(0, Math.min(n - 1, i))].value;
  };
  var onPointerDown = function onPointerDown(e) {
    setDragging(true);
    var v0 = segAt(e.clientX);
    if (v0 !== valueRef.current) _onChange2(v0);
    var move = function move(ev) {
      if (!trackRef.current) return;
      var v = segAt(ev.clientX);
      if (v !== valueRef.current) _onChange2(v);
    };
    var _up2 = function up() {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', _up2);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', _up2);
  };
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    ref: trackRef,
    role: "radiogroup",
    onPointerDown: onPointerDown,
    className: dragging ? 'twk-seg dragging' : 'twk-seg'
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-seg-thumb",
    style: {
      left: "calc(2px + ".concat(idx, " * (100% - 4px) / ").concat(n, ")"),
      width: "calc((100% - 4px) / ".concat(n, ")")
    }
  }), opts.map(function (o) {
    return /*#__PURE__*/React.createElement("button", {
      key: o.value,
      type: "button",
      role: "radio",
      "aria-checked": o.value === value
    }, o.label);
  })));
}
function TweakSelect(_ref8) {
  var label = _ref8.label,
    value = _ref8.value,
    options = _ref8.options,
    _onChange3 = _ref8.onChange;
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("select", {
    className: "twk-field",
    value: value,
    onChange: function onChange(e) {
      return _onChange3(e.target.value);
    }
  }, options.map(function (o) {
    var v = _typeof(o) === 'object' ? o.value : o;
    var l = _typeof(o) === 'object' ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })));
}
function TweakText(_ref9) {
  var label = _ref9.label,
    value = _ref9.value,
    placeholder = _ref9.placeholder,
    _onChange4 = _ref9.onChange;
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("input", {
    className: "twk-field",
    type: "text",
    value: value,
    placeholder: placeholder,
    onChange: function onChange(e) {
      return _onChange4(e.target.value);
    }
  }));
}
function TweakNumber(_ref0) {
  var label = _ref0.label,
    value = _ref0.value,
    min = _ref0.min,
    max = _ref0.max,
    _ref0$step = _ref0.step,
    step = _ref0$step === void 0 ? 1 : _ref0$step,
    _ref0$unit = _ref0.unit,
    unit = _ref0$unit === void 0 ? '' : _ref0$unit,
    _onChange5 = _ref0.onChange;
  var clamp = function clamp(n) {
    if (min != null && n < min) return min;
    if (max != null && n > max) return max;
    return n;
  };
  var startRef = React.useRef({
    x: 0,
    val: 0
  });
  var onScrubStart = function onScrubStart(e) {
    e.preventDefault();
    startRef.current = {
      x: e.clientX,
      val: value
    };
    var decimals = (String(step).split('.')[1] || '').length;
    var move = function move(ev) {
      var dx = ev.clientX - startRef.current.x;
      var raw = startRef.current.val + dx * step;
      var snapped = Math.round(raw / step) * step;
      _onChange5(clamp(Number(snapped.toFixed(decimals))));
    };
    var _up3 = function up() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', _up3);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', _up3);
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "twk-num"
  }, /*#__PURE__*/React.createElement("span", {
    className: "twk-num-lbl",
    onPointerDown: onScrubStart
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: value,
    min: min,
    max: max,
    step: step,
    onChange: function onChange(e) {
      return _onChange5(clamp(Number(e.target.value)));
    }
  }), unit && /*#__PURE__*/React.createElement("span", {
    className: "twk-num-unit"
  }, unit));
}

// Relative-luminance contrast pick — checkmarks drawn over a swatch need to
// read on both #111 and #fafafa without per-option configuration. Hex input
// only (#rgb / #rrggbb); named or rgb()/hsl() colors fall through to "light".
function __twkIsLight(hex) {
  var h = String(hex).replace('#', '');
  var x = h.length === 3 ? h.replace(/./g, function (c) {
    return c + c;
  }) : h.padEnd(6, '0');
  var n = parseInt(x.slice(0, 6), 16);
  if (Number.isNaN(n)) return true;
  var r = n >> 16 & 255,
    g = n >> 8 & 255,
    b = n & 255;
  return r * 299 + g * 587 + b * 114 > 148000;
}
var __TwkCheck = function __TwkCheck(_ref1) {
  var light = _ref1.light;
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 14 14",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M3 7.2 5.8 10 11 4.2",
    fill: "none",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    stroke: light ? 'rgba(0,0,0,.78)' : '#fff'
  }));
};

// TweakColor — curated color/palette picker. Each option is either a single
// hex string or an array of 1-5 hex strings; the card adapts — a lone color
// renders solid, a palette renders colors[0] as the hero (left ~2/3) with the
// rest stacked in a sharp column on the right. onChange emits the
// option in the shape it was passed (string stays string, array stays array).
// Without options it falls back to the native color input for back-compat.
function TweakColor(_ref10) {
  var label = _ref10.label,
    value = _ref10.value,
    options = _ref10.options,
    _onChange6 = _ref10.onChange;
  if (!options || !options.length) {
    return /*#__PURE__*/React.createElement("div", {
      className: "twk-row twk-row-h"
    }, /*#__PURE__*/React.createElement("div", {
      className: "twk-lbl"
    }, /*#__PURE__*/React.createElement("span", null, label)), /*#__PURE__*/React.createElement("input", {
      type: "color",
      className: "twk-swatch",
      value: value,
      onChange: function onChange(e) {
        return _onChange6(e.target.value);
      }
    }));
  }
  // Native <input type=color> emits lowercase hex per the HTML spec, so
  // compare case-insensitively. String() guards JSON.stringify(undefined),
  // which returns the primitive undefined (no .toLowerCase).
  var key = function key(o) {
    return String(JSON.stringify(o)).toLowerCase();
  };
  var cur = key(value);
  return /*#__PURE__*/React.createElement(TweakRow, {
    label: label
  }, /*#__PURE__*/React.createElement("div", {
    className: "twk-chips",
    role: "radiogroup"
  }, options.map(function (o, i) {
    var colors = Array.isArray(o) ? o : [o];
    var _colors = _toArray(colors),
      hero = _colors[0],
      rest = _arrayLikeToArray(_colors).slice(1);
    var sup = rest.slice(0, 4);
    var on = key(o) === cur;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      className: "twk-chip",
      role: "radio",
      "aria-checked": on,
      "data-on": on ? '1' : '0',
      "aria-label": colors.join(', '),
      title: colors.join(' · '),
      style: {
        background: hero
      },
      onClick: function onClick() {
        return _onChange6(o);
      }
    }, sup.length > 0 && /*#__PURE__*/React.createElement("span", null, sup.map(function (c, j) {
      return /*#__PURE__*/React.createElement("i", {
        key: j,
        style: {
          background: c
        }
      });
    })), on && /*#__PURE__*/React.createElement(__TwkCheck, {
      light: __twkIsLight(hero)
    }));
  })));
}
function TweakButton(_ref11) {
  var label = _ref11.label,
    onClick = _ref11.onClick,
    _ref11$secondary = _ref11.secondary,
    secondary = _ref11$secondary === void 0 ? false : _ref11$secondary;
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: secondary ? 'twk-btn secondary' : 'twk-btn',
    onClick: onClick
  }, label);
}
Object.assign(window, {
  useTweaks: useTweaks,
  TweaksPanel: TweaksPanel,
  TweakSection: TweakSection,
  TweakRow: TweakRow,
  TweakSlider: TweakSlider,
  TweakToggle: TweakToggle,
  TweakRadio: TweakRadio,
  TweakSelect: TweakSelect,
  TweakText: TweakText,
  TweakNumber: TweakNumber,
  TweakColor: TweakColor,
  TweakButton: TweakButton
});

