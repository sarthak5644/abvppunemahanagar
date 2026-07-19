/* =========================================================
   APP-CORE.JS — shared state, session/login handling, the
   Jilha "toran" navigation, tab switching, and the generic
   add/edit form + delete helpers every feature module reuses.

   Load order matters: this file must load BEFORE all the
   module-*.js files, since they call the helpers defined here
   (setupAddForm, deleteRecord, allowedJilhaOptions, etc.) and
   register their tab-load functions which app-core dispatches
   to from refreshActivePanel().
========================================================= */

const JILHAS = ["महानगर", "मध्य पुणे", "कात्रज", "हडपसर", "येरवडा", "विद्यापीठ", "कोथरूड"];

const NAGAR_MAP = {
  "मध्य पुणे": ["मध्यपुणे", "शिवाजी नगर", "पर्वती"],
  "कात्रज": ["कात्रज", "सिंहगड", "Narhe"],
  "हडपसर": ["हडपसर", "कोंढवा", "लोणी काळभोर"],
  "येरवडा": ["येरवडा", "Lohegaon", "वाघोली"],
  "विद्यापीठ": ["विद्यापीठ", "गणेश खिंड", "पाषाण"],
  "कोथरूड": ["कोथरूड", "कर्वेनगर", "एरंडवणे", "डेक्कन"]
};

function nagarsForJilha(jilha) {
  if (!jilha || jilha === "All") {
    return [...new Set(Object.values(NAGAR_MAP).flat())].sort();
  }
  return NAGAR_MAP[jilha] || [];
}

// Generates academic-year options like "2024-25", "2025-26", ... a couple
// of years either side of the current one, so the list keeps making sense
// year over year without needing a code change.
function academicYearOptions() {
  const now = new Date();
  const startYear = now.getMonth() >= 5 ? now.getFullYear() : now.getFullYear() - 1;
  const years = [];
  for (let y = startYear - 2; y <= startYear + 2; y++) {
    years.push(`${y}-${String((y + 1) % 100).padStart(2, "0")}`);
  }
  return years;
}

function statusBadgeClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "completed" || s === "active") return "active";
  if (s === "cancelled") return "cancelled";
  return "scheduled"; // Planned / Ongoing / Scheduled / Postponed / default
}

// Populates a <select> with "सर्व नगर" + the Nagar list for a Jilha.
// Shared by every panel that has an independent Nagar filter dropdown.
function populateNagarSelect(selectId, jilha) {
  const sel = document.getElementById(selectId);
  const nagars = nagarsForJilha(jilha);
  sel.innerHTML = `<option value="All">सर्व नगर</option>` + nagars.map(n => `<option value="${n}">${n}</option>`).join("");
}

let currentJilha = "All";
let currentUser = null;
const SESSION_KEY = "pmn_session";

// A Bhag/Jilha-locked user only ever sees their own Jilha as an option.
// A Mahanagar-level user (isMahanagar) sees everything.
function allowedJilhaOptions(includeMahanagar) {
  if (currentUser && !currentUser.isMahanagar) {
    return [currentUser.bhag];
  }
  return includeMahanagar ? JILHAS : JILHAS.filter(j => j !== "महानगर");
}

/* ================= LOGIN / SESSION ================= */

function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function setSession(user, token) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user, token }));
}
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
function showLogin(message) {
  const loginEl = document.getElementById("loginScreen");
  const dashEl = document.getElementById("dashboardScreen");
  if (loginEl) loginEl.style.display = "flex";
  if (dashEl) dashEl.style.display = "none";
  if (message) {
    const errBox = document.getElementById("loginError");
    if (errBox) {
      errBox.textContent = message;
      errBox.classList.add("show");
    } else {
      console.error("[app-core] #loginError not found; message was:", message);
    }
  }
}
function showDashboard(user) {
  const loginEl = document.getElementById("loginScreen");
  const dashEl = document.getElementById("dashboardScreen");
  if (loginEl) loginEl.style.display = "none";
  if (dashEl) dashEl.style.display = "block";
  currentUser = user;
  if (!user.isMahanagar && user.bhag) {
    currentJilha = user.bhag;
  }
  const displayName = user.name || user.email || "—";
  const userChipEl = document.getElementById("userChip");
  if (userChipEl) userChipEl.textContent = `${displayName} · ${user.role || ""}`;
  initDashboard();
}

// Null-safe addEventListener: logs an error instead of throwing if the
// element doesn't exist (e.g. its partial hasn't finished injecting, or a
// filename typo means it 404'd). This is the fix for a nasty failure mode:
// a single top-level `document.getElementById(x).addEventListener(...)`
// throwing would previously stop EVERY statement after it in this file —
// including the boot() call at the very bottom that shows the login
// screen — leaving the whole page blank with no visible error to the user.
function on(id, event, handler) {
  const el = document.getElementById(id);
  if (!el) {
    console.error(`[app-core] Element #${id} not found — its "${event}" handler was not attached. Check that its partial loaded correctly.`);
    return;
  }
  el.addEventListener(event, handler);
}

on("loginForm", "submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const btn = document.getElementById("loginBtn");
  const errBox = document.getElementById("loginError");
  errBox.classList.remove("show");
  btn.disabled = true; btn.textContent = "तपासत आहे...";
  const result = await API.login(email, password);
  btn.disabled = false; btn.textContent = "प्रवेश करा";
  if (!result || !result.allowed) {
    errBox.textContent = (result && result.message) || "प्रवेश नाकारला.";
    errBox.classList.add("show");
    return;
  }
  setSession(result.user, result.token);
  showDashboard(result.user);
});

on("togglePw", "click", () => {
  const pw = document.getElementById("loginPassword");
  const btn = document.getElementById("togglePw");
  const show = pw.type === "password";
  pw.type = show ? "text" : "password";
  btn.textContent = show ? "लपवा" : "दाखवा";
});

on("logoutBtn", "click", async () => {
  await API.logout();
  clearSession();
  dashboardInitDone = false;
  showLogin();
});

API.onUnauthorized((message) => {
  clearSession();
  dashboardInitDone = false;
  showLogin(message || "Session संपली आहे, कृपया पुन्हा login करा.");
});

/* ================= GENERIC "ADD / EDIT RECORD" FORM HELPER ================= */
/* Handles: toggle open/close, optional Jilha->Nagar cascading selects,
   required-field validation, calling API.write (add or update), reset,
   and switching into/out of edit mode via a hidden ID field.
   Every module-*.js file below uses this instead of writing its own
   form-handling logic. */

function setupAddForm({ toggleBtnId, formId, msgId, jilhaId, nagarId, action, updateAction, editIdFieldId, fieldMap, requiredKeys, includeMahanagar, onSuccess }) {
  const toggleBtn = document.getElementById(toggleBtnId);
  const form = document.getElementById(formId);

  toggleBtn.addEventListener("click", () => form.classList.toggle("open"));

  function refreshNagarOptions() {
    if (!nagarId) return;
    const jilhaSel = document.getElementById(jilhaId);
    const nagarSel = document.getElementById(nagarId);
    const jVal = jilhaSel.value;
    const nagars = jVal === "All" ? nagarsForJilha("All") : nagarsForJilha(jVal);
    nagarSel.innerHTML = nagars.map(n => `<option value="${n}">${n}</option>`).join("");
  }

  if (jilhaId) {
    const jilhaSel = document.getElementById(jilhaId);
    const opts = allowedJilhaOptions(includeMahanagar);
    jilhaSel.innerHTML = opts.map(j => `<option value="${j === 'महानगर' ? 'All' : j}">${j}</option>`).join("");
    if (nagarId) {
      jilhaSel.addEventListener("change", refreshNagarOptions);
      refreshNagarOptions();
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgBox = document.getElementById(msgId);
    msgBox.textContent = "";
    msgBox.className = "add-form-msg";

    const session = getSession();
    const data = {};
    Object.keys(fieldMap).forEach(key => {
      const el = document.getElementById(fieldMap[key]);
      data[key] = el ? el.value.trim() : "";
    });

    const editId = editIdFieldId ? document.getElementById(editIdFieldId).value : "";
    const isEdit = !!editId;

    if (isEdit) {
      data.id = editId;
      data.updatedBy = (session && session.user && (session.user.name || session.user.email)) || "Unknown";
    } else {
      data.addedBy = (session && session.user && (session.user.name || session.user.email)) || "Unknown";
    }

    const missing = (requiredKeys || []).filter(k => !data[k]);
    if (missing.length) {
      msgBox.textContent = "आवश्यक फिल्ड भरा.";
      msgBox.classList.add("err");
      return;
    }

    const result = await API.write(isEdit ? updateAction : action, data);
    if (result && result.error) {
      msgBox.textContent = "जतन करताना त्रुटी आली.";
      msgBox.classList.add("err");
      return;
    }

    msgBox.textContent = isEdit ? "यशस्वीरित्या अपडेट केले ✓" : "यशस्वीरित्या जतन केले ✓";
    msgBox.classList.add("ok");
    form.reset();
    if (editIdFieldId) document.getElementById(editIdFieldId).value = "";
    const submitBtn = form.querySelector("button[type=submit]");
    if (submitBtn && submitBtn.dataset.defaultLabel) submitBtn.textContent = submitBtn.dataset.defaultLabel;
    if (jilhaId && nagarId) refreshNagarOptions();
    if (onSuccess) onSuccess();
  });

  // Pre-fills the form with an existing record's values and switches it into
  // edit mode (submit will call updateAction instead of action).
  function openForEdit(values, idValue) {
    // Set Jilha first (and let its change handler populate Nagar options) before setting other fields.
    if (jilhaId && fieldMap.jilha !== undefined) {
      document.getElementById(jilhaId).value = values.jilha || "";
      if (nagarId) refreshNagarOptions();
    }
    Object.keys(fieldMap).forEach(key => {
      if (key === "jilha") return;
      const el = document.getElementById(fieldMap[key]);
      if (el) el.value = values[key] !== undefined ? values[key] : "";
    });
    if (editIdFieldId) document.getElementById(editIdFieldId).value = idValue;
    const submitBtn = form.querySelector("button[type=submit]");
    if (submitBtn) {
      if (!submitBtn.dataset.defaultLabel) submitBtn.dataset.defaultLabel = submitBtn.textContent;
      submitBtn.textContent = "अपडेट करा";
    }
    form.classList.add("open");
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return { openForEdit };
}

// Shared delete confirmation + call, used by every entity's Delete button.
async function deleteRecord(action, id, onSuccess) {
  if (!confirm("ही नोंद कायमची डिलीट करायची आहे का?")) return;
  const session = getSession();
  const deletedBy = (session && session.user && (session.user.name || session.user.email)) || "Unknown";
  const result = await API.write(action, { id, deletedBy });
  if (result && result.error) {
    alert("डिलीट करताना त्रुटी आली.");
    return;
  }
  if (onSuccess) onSuccess();
}

/* ================= DASHBOARD INIT (runs once per session, after login) ================= */

let dashboardInitDone = false;

function initDashboard() {
  if (dashboardInitDone) { refreshActivePanel(); return; }
  dashboardInitDone = true;

  if (API.isLive()) document.getElementById("configNote").style.display = "none";

  renderToran();
  SpecialDayCalendar.init(() => currentJilha);

  if (currentUser && !currentUser.isMahanagar) {
    const logsTabBtn = document.querySelector('#tabs button[data-tab="activity-logs"]');
    if (logsTabBtn) logsTabBtn.style.display = "none";
  }

  document.getElementById("tabs").addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON") return;
    document.querySelectorAll("#tabs button").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    document.getElementById("panel-" + e.target.dataset.tab).classList.add("active");
    refreshActivePanel();
  });

  // Each module's own setup*Module() function is called here. These are
  // defined in the module-*.js files, which are all loaded before this
  // function ever runs (it only runs after a successful login).
  //
  // Each call is wrapped so that if ONE module has a bug and throws, it
  // only breaks that module's buttons — not every module listed after it.
  // Open the browser console (F12) to see any "Module setup failed" errors.
  const moduleSetups = [
    ["Karyakarini", setupKaryakariniModule],
    ["College Karyakarini", setupCollegeKaryakariniModule],
    ["Active Forms", setupActiveFormsModule],
    ["College List", setupCollegeListModule],
    ["Membership", setupMembershipModule],
    ["Mahanagar Upakram", setupMahanagarUpakramModule]
  ];
  moduleSetups.forEach(([name, fn]) => {
    try {
      fn();
    } catch (err) {
      console.error(`Module setup failed: ${name}`, err);
    }
  });

  loadOverview();
}

/* ================= JILHA TORAN ================= */

function renderToran() {
  const wrap = document.getElementById("jilhaToran");
  wrap.innerHTML = "";

  if (currentUser && !currentUser.isMahanagar) {
    const label = document.createElement("div");
    label.className = "jilha-leaf active";
    label.style.cursor = "default";
    label.textContent = `${currentUser.bhag} (आपला विभाग)`;
    wrap.appendChild(label);
    return;
  }

  JILHAS.forEach(j => {
    const btn = document.createElement("button");
    const isAll = (j === "महानगर");
    btn.className = "jilha-leaf" + (isAll ? " all" : "") + (((isAll && currentJilha === "All") || currentJilha === j) ? " active" : "");
    btn.textContent = j;
    btn.onclick = () => {
      currentJilha = isAll ? "All" : j;
      renderToran();
      refreshActivePanel();
    };
    wrap.appendChild(btn);
  });
}

// Dispatches to the correct module's load function for whichever tab is
// currently active. Each load function lives in its own module-*.js file.
// Wrapped in try/catch: a bug in one tab's load function shouldn't leave
// the person stuck with no visible error and no way to tell what happened.
function refreshActivePanel() {
  const activeTab = document.querySelector("#tabs button.active").dataset.tab;
  try {
    if (activeTab === "overview") loadOverview();
    if (activeTab === "karyakarini") loadKaryakarini();
    if (activeTab === "college-karyakarini") loadCollegeKaryakarini();
    if (activeTab === "active-forms") loadActiveForms();
    if (activeTab === "calendar") SpecialDayCalendar.load();
    if (activeTab === "college-list") loadCollegeList();
    if (activeTab === "membership") loadMembership();
    if (activeTab === "mahanagar-karya") loadMahanagarSubtab(currentMahanagarSubtab);
    if (activeTab === "activity-logs") loadActivityLogs();
  } catch (err) {
    console.error(`Tab load failed: ${activeTab}`, err);
  }
}

/* ================= BOOTSTRAP ================= */
// This must run last (see index.html script order) — after every
// module-*.js file has defined its load/setup functions, so that
// showDashboard() -> initDashboard() -> refreshActivePanel() has
// everything it needs already in place.

(async function boot() {
  try {
    const existing = getSession();
    if (existing && existing.token) {
      API.restoreToken(existing.token);
      const check = await API.validateSession();
      if (check && check.valid) {
        showDashboard(existing.user);
        return;
      }
      clearSession();
    }
    showLogin();
  } catch (err) {
    console.error("[app-core] boot() failed:", err);
    showLogin("अनपेक्षित त्रुटी आली. कृपया पान रिफ्रेश करा.");
  }
})();
