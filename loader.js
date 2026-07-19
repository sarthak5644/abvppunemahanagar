/* =========================================================
   LOADER.JS — fetches every HTML partial (login screen,
   header, each tab's panel markup, footer) and injects them
   into their placeholder elements, THEN loads the app's JS
   files in the order they depend on.

   Why JS is loaded here instead of via <script> tags in
   index.html: api.js/module-*.js/app-core.js look up DOM
   elements by ID as soon as they run (e.g. app-core.js does
   document.getElementById("loginForm").addEventListener(...)
   at the top level). If those scripts ran before the partials
   above finished loading, those elements wouldn't exist yet
   and the lookups would fail. So this file guarantees:
   1) all partials are in the DOM, THEN
   2) the scripts run, in the correct dependency order.

   To add a new tab/panel: create partials/panel-xxx.html,
   add a <section class="panel" id="panel-xxx"></section> in
   index.html's <main>, add one line to PARTIALS below, and a
   module-xxx.js to SCRIPTS below (before app-core.js).
========================================================= */

(function () {
  const PARTIALS = [
    { url: "partials/login.html", target: "#mount-login" },
    { url: "partials/header.html", target: "#mount-header" },
    { url: "partials/config-note.html", target: "#mount-config-note" },
    { url: "partials/panel-overview.html", target: "#panel-overview" },
    { url: "partials/panel-karyakarini.html", target: "#panel-karyakarini" },
    { url: "partials/panel-college-karyakarini.html", target: "#panel-college-karyakarini" },
    { url: "partials/panel-active-forms.html", target: "#panel-active-forms" },
    { url: "partials/panel-calendar.html", target: "#panel-calendar" },
    { url: "partials/panel-college-list.html", target: "#panel-college-list" },
    { url: "partials/panel-membership.html", target: "#panel-membership" },
    { url: "partials/panel-mahanagar-karya.html", target: "#panel-mahanagar-karya" },
    { url: "partials/panel-activity-logs.html", target: "#panel-activity-logs" },
    { url: "partials/footer.html", target: "#mount-footer" }
  ];

  // Order matters: api.js first, then the calendar module, then every
  // feature module (any order relative to each other), then app-core.js
  // LAST (it wires login/session/tabs and calls the functions the
  // modules above define).
  const SCRIPTS = [
    "api.js",
    "special-day.js",
    "module-overview.js",
    "module-karyakarini.js",
    "module-forms-college-list.js",
    "module-membership.js",
    "module-mahanagar-upakram.js",
    "module-activity-logs.js",
    "app-core.js"
  ];

  async function loadPartial({ url, target }) {
    const el = document.querySelector(target);
    if (!el) {
      console.error("Partial mount point not found in index.html:", target);
      return;
    }
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      el.innerHTML = await res.text();
    } catch (err) {
      console.error("Failed to load partial:", url, err);
      el.innerHTML = `<div class="empty-state">या विभागाचा भाग (${url}) लोड होऊ शकला नाही. पान रिफ्रेश करून पहा.</div>`;
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src + "?v=" + Date.now();
      s.onload = resolve;
      s.onerror = () => reject(new Error("Failed to load script: " + src));
      document.body.appendChild(s);
    });
  }

  async function boot() {
    // Partials are independent chunks of static markup — load them all in
    // parallel for speed.
    await Promise.all(PARTIALS.map(loadPartial));

    // Scripts must load in order — each one is appended and awaited before
    // the next begins, since later files call functions/expect globals
    // defined by earlier ones.
    for (const src of SCRIPTS) {
      try {
        await loadScript(src);
      } catch (err) {
        console.error(err);
        // Stop here — every later script assumes this one succeeded.
        break;
      }
    }
  }

  boot();
})();
