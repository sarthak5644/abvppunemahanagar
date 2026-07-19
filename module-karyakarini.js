/* =========================================================
   MODULE-KARYAKARINI.JS — two tabs:
   1. जिल्हा → नगर → उपनगर कार्यकारिणी
   2. College कार्यकारिणी
========================================================= */

/* ---------- 1. Jilha > Nagar > Upnagar Karyakarini ---------- */

function setupKaryakariniModule() {
  document.getElementById("nagarFilter").addEventListener("change", async (e) => {
    const upnagars = await API.call("getUpnagarList", { jilha: currentJilha, nagar: e.target.value });
    const upSel = document.getElementById("upnagarFilter");
    upSel.innerHTML = `<option value="All">सर्व उपनगर</option>` + upnagars.map(n => `<option value="${n}">${n}</option>`).join("");
    renderKaryakariniTable();
  });
  document.getElementById("upnagarFilter").addEventListener("change", renderKaryakariniTable);
  document.getElementById("karyakariniYearFilter").addEventListener("change", renderKaryakariniTable);

  document.getElementById("addKAcademicYear").innerHTML = academicYearOptions().map(y => `<option value="${y}">${y}</option>`).join("");

  setupAddForm({
    toggleBtnId: "toggleAddKaryakarini", formId: "addKaryakariniForm", msgId: "addKMsg",
    jilhaId: "addKJilha", nagarId: "addKNagar", action: "addJilhaNagarUpnagarKaryakarini",
    fieldMap: { jilha: "addKJilha", nagar: "addKNagar", upnagar: "addKUpnagar", name: "addKName", jababdari: "addKJababdari", phone: "addKPhone", email: "addKEmail", academicYear: "addKAcademicYear" },
    requiredKeys: ["jilha", "nagar", "name", "jababdari"],
    onSuccess: () => renderKaryakariniTable()
  });
}

async function loadKaryakarini() {
  const nagars = nagarsForJilha(currentJilha);
  const nagarSel = document.getElementById("nagarFilter");
  nagarSel.innerHTML = `<option value="All">सर्व नगर</option>` + nagars.map(n => `<option value="${n}">${n}</option>`).join("");

  const upnagars = await API.call("getUpnagarList", { jilha: currentJilha, nagar: "All" });
  const upSel = document.getElementById("upnagarFilter");
  upSel.innerHTML = `<option value="All">सर्व उपनगर</option>` + upnagars.map(n => `<option value="${n}">${n}</option>`).join("");

  const yearSel = document.getElementById("karyakariniYearFilter");
  yearSel.innerHTML = `<option value="All">सर्व शैक्षणिक वर्ष</option>` + academicYearOptions().map(y => `<option value="${y}">${y}</option>`).join("");

  await renderKaryakariniTable();
}

async function renderKaryakariniTable() {
  const nagar = document.getElementById("nagarFilter").value;
  const upnagar = document.getElementById("upnagarFilter").value;
  const academicYear = document.getElementById("karyakariniYearFilter").value;
  const rows = await API.call("getJilhaNagarUpnagarKaryakarini", { jilha: currentJilha, nagar, upnagar, academicYear });
  const wrap = document.getElementById("karyakariniTableWrap");
  if (!rows || !rows.length) {
    wrap.innerHTML = `<div class="empty-state">या फिल्टरसाठी कार्यकारिणी सदस्य आढळले नाहीत</div>`;
    return;
  }
  wrap.innerHTML = `<table class="data-table">
    <tr><th>जिल्हा</th><th>नगर</th><th>उपनगर</th><th>जबाबदारी</th><th>नाव</th><th>फोन</th><th>शैक्षणिक वर्ष</th></tr>
    ${rows.map(r => `<tr><td>${r.Jilha || ""}</td><td>${r.Nagar || ""}</td><td>${r.Upnagar || ""}</td><td>${r.Jababdari || ""}</td><td>${r.Name || ""}</td><td class="num">${r.Phone || ""}</td><td>${r["Academic Year"] || ""}</td></tr>`).join("")}
  </table>`;
}

/* ---------- 2. College Karyakarini ---------- */

function setupCollegeKaryakariniModule() {
  document.getElementById("collegeNagarFilter").addEventListener("change", async (e) => {
    await populateCollegeSelect(e.target.value);
    renderCollegeKaryakariniTable();
  });
  document.getElementById("collegeFilterForKaryakarini").addEventListener("change", renderCollegeKaryakariniTable);
  document.getElementById("collegeKaryakariniYearFilter").addEventListener("change", renderCollegeKaryakariniTable);

  setupAddCollegeKaryakariniForm();
}

async function loadCollegeKaryakarini() {
  const nagars = nagarsForJilha(currentJilha);
  const nagarSel = document.getElementById("collegeNagarFilter");
  nagarSel.innerHTML = `<option value="All">सर्व नगर</option>` + nagars.map(n => `<option value="${n}">${n}</option>`).join("");

  const yearSel = document.getElementById("collegeKaryakariniYearFilter");
  yearSel.innerHTML = `<option value="All">सर्व शैक्षणिक वर्ष</option>` + academicYearOptions().map(y => `<option value="${y}">${y}</option>`).join("");

  await populateCollegeSelect("All");
  await renderCollegeKaryakariniTable();
  populateAddCollegeKaryakariniDropdowns();
}

async function populateCollegeSelect(nagar) {
  const colleges = await API.call("getCollegeListByJilha", { jilha: currentJilha, nagar });
  const sel = document.getElementById("collegeFilterForKaryakarini");
  sel.innerHTML = `<option value="All">सर्व College</option>` + colleges.map(c => `<option value="${c}">${c}</option>`).join("");
}

async function renderCollegeKaryakariniTable() {
  const nagar = document.getElementById("collegeNagarFilter").value;
  const college = document.getElementById("collegeFilterForKaryakarini").value;
  const academicYear = document.getElementById("collegeKaryakariniYearFilter").value;
  const rows = await API.call("getCollegeKaryakarini", { jilha: currentJilha, nagar, college, academicYear });
  const wrap = document.getElementById("collegeKaryakariniTableWrap");
  if (!rows || !rows.length) {
    wrap.innerHTML = `<div class="empty-state">या फिल्टरसाठी कार्यकारिणी सदस्य आढळले नाहीत</div>`;
    return;
  }
  wrap.innerHTML = `<table class="data-table">
    <tr><th>जिल्हा</th><th>नगर</th><th>महाविद्यालय</th><th>जबाबदारी</th><th>नाव</th><th>फोन</th><th>शैक्षणिक वर्ष</th></tr>
    ${rows.map(r => `<tr><td>${r.Jilha || ""}</td><td>${r.Nagar || ""}</td><td>${r.Mahavidyalay || ""}</td><td>${r.Jababdari || ""}</td><td>${r.Naav || ""}</td><td class="num">${r.Phone || ""}</td><td>${r["Academic Year"] || ""}</td></tr>`).join("")}
  </table>`;
}

// College Karyakarini's add-form is bespoke (not the generic setupAddForm)
// because its College dropdown depends on a separate lookup list rather
// than a fixed Jilha->Nagar map.
function setupAddCollegeKaryakariniForm() {
  const toggleBtn = document.getElementById("toggleAddCollegeKaryakarini");
  const form = document.getElementById("addCollegeKaryakariniForm");

  toggleBtn.addEventListener("click", () => form.classList.toggle("open"));
  document.getElementById("addCKJilha").addEventListener("change", (e) => populateAddCollegeKaryakariniNagar(e.target.value));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgBox = document.getElementById("addCKMsg");
    msgBox.textContent = ""; msgBox.className = "add-form-msg";

    const session = getSession();
    const data = {
      jilha: document.getElementById("addCKJilha").value,
      nagar: document.getElementById("addCKNagar").value,
      mahavidyalay: document.getElementById("addCKMahavidyalay").value.trim(),
      jababdari: document.getElementById("addCKJababdari").value.trim(),
      naav: document.getElementById("addCKNaav").value.trim(),
      shikshan: document.getElementById("addCKShikshan").value.trim(),
      phone: document.getElementById("addCKPhone").value.trim(),
      email: document.getElementById("addCKEmail").value.trim(),
      academicYear: document.getElementById("addCKAcademicYear").value,
      addedBy: (session && session.user && (session.user.name || session.user.email)) || "Unknown"
    };

    if (!data.jilha || !data.nagar || !data.mahavidyalay || !data.naav) {
      msgBox.textContent = "जिल्हा, नगर, महाविद्यालय आणि नाव भरणे आवश्यक आहे.";
      msgBox.classList.add("err");
      return;
    }

    const result = await API.write("addCollegeKaryakarini", data);
    if (result && result.error) {
      msgBox.textContent = "जतन करताना त्रुटी आली.";
      msgBox.classList.add("err");
      return;
    }

    msgBox.textContent = "यशस्वीरित्या जतन केले ✓";
    msgBox.classList.add("ok");
    form.reset();
    await populateCollegeSelect(document.getElementById("collegeNagarFilter").value);
    await renderCollegeKaryakariniTable();
  });
}

function populateAddCollegeKaryakariniDropdowns() {
  const jilhaSel = document.getElementById("addCKJilha");
  jilhaSel.innerHTML = allowedJilhaOptions(false).map(j => `<option value="${j}">${j}</option>`).join("");
  populateAddCollegeKaryakariniNagar(jilhaSel.value);
  document.getElementById("addCKAcademicYear").innerHTML = academicYearOptions().map(y => `<option value="${y}">${y}</option>`).join("");
}

function populateAddCollegeKaryakariniNagar(jilha) {
  const nagarSel = document.getElementById("addCKNagar");
  nagarSel.innerHTML = nagarsForJilha(jilha).map(n => `<option value="${n}">${n}</option>`).join("");
}