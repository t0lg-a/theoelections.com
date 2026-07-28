/* ground.js — the ground is decided before the first paint.
 *
 * [2.2][2.16] There is one masthead in this system and one ground switch
 * behind it. The app used to decide the ground in a React effect, which
 * means the paper ground painted first and the ink ground arrived a frame
 * later: a reader who chose dark got a white flash on every navigation. The
 * landing page did not read the choice at all.
 *
 * This file is loaded blocking in <head>, before any stylesheet paints, so
 * the attribute is on <html> by the time the first rule is resolved. It is
 * deliberately tiny and dependency-free for that reason.
 *
 * On pages without React it also wires the masthead's ground toggle.
 */
(function () {
  var KEY = "theo-theme";
  var root = document.documentElement;

  function read() {
    try {
      var v = localStorage.getItem(KEY);
      return v === "dark" || v === "light" ? v : "light";
    } catch (e) {
      return "light";
    }
  }

  function apply(ground) {
    root.setAttribute("data-theme", ground);
  }

  /* [2.21] The mobile browser's own chrome takes the ground's paper, read
     from the token rather than written twice. This runs after the sheet is
     parsed; the <meta> in the document carries the light value so the very
     first paint is already right. */
  function paintBrowserChrome() {
    var meta = document.querySelector('meta[name="theme-color"][data-ground]');
    if (!meta) return;
    var paper = getComputedStyle(root).getPropertyValue("--t-paper").trim();
    if (paper) meta.setAttribute("content", paper);
  }

  var ground = read();
  apply(ground);

  window.__ground = {
    get: function () { return ground; },
    set: function (next) {
      ground = next === "dark" ? "dark" : "light";
      try { localStorage.setItem(KEY, ground); } catch (e) {}
      apply(ground);
      sync();
      if (typeof window.__repaintFigures === "function") window.__repaintFigures();
    },
    toggle: function () { window.__ground.set(ground === "dark" ? "light" : "dark"); }
  };

  /* The toggle names the ground it will switch to, so its label is the
     opposite of the ground in force. */
  function sync() {
    var btns = document.querySelectorAll("[data-ground-toggle]");
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var next = ground === "dark" ? "light" : "dark";
      b.textContent = next;
      b.setAttribute("aria-pressed", ground === "dark" ? "true" : "false");
      b.setAttribute("aria-label", "Switch to the " + next + " ground");
      b.setAttribute("title", next.charAt(0).toUpperCase() + next.slice(1) + " ground");
    }
    paintBrowserChrome();
  }

  function wire() {
    var btns = document.querySelectorAll("[data-ground-toggle]");
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].__wired) continue;
      btns[i].__wired = true;
      btns[i].addEventListener("click", function () { window.__ground.toggle(); });
    }
    sync();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
