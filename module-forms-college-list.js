/* =========================================================
   MODULE-FORMS-COLLEGE-LIST.JS — three related tabs:
   1. Active Forms
   2. Membership Calendar (add-form only — the calendar grid
      itself is rendered by special-day.js)
   3. भाग-wise College List
========================================================= */

/* ---------- 1. Active Forms ---------- */

function setupActiveFormsModule() {
  setupAddForm({
    toggleBtnId: "toggleAddActiveForm", formId: "addActiveFormForm", msgId: "addAFMsg",
    jilhaId: "addAFJilha", action: "addActiveForm",
    fieldMap: { formName: "addAFName", jilha: "addAFJilha", eventDate: "addAFDate", formLink: "addAFLink", status: "addAFStatus" },
    requiredKeys: ["formName", "jilha", "eventDate"],
    onSuccess: () => loadActiveForms()
  });

  // Membership Calendar's add-form lives on this module too, since it's a
  // single small form and doesn't warrant its own file.
  setupAddForm({
    toggleBtnId: "toggleAddCalendar", formId: "addCalendarForm", msgId: "addCalMsg",
    jilhaId: "addCalJilha", nagarId: "addCalNagar", action: "addMembershipCalendarEntry",
    fieldMap: { date: "addCalDate", jilha: "addCalJilha", nagar: "addCalNagar", college: "addCalCollege", contactPerson: "addCalContact", phone: "addCalPhone", status: "addCalStatus" },
    requiredKeys: ["date", "jilha", "college"],
    onSuccess: () => SpecialDayCalendar.load()
  });
}

async function loadActiveForms() {
  const rows = await API.call("getActiveForms", { jilha: currentJilha });
  const wrap = document.getElementById("activeFormsWrap");
  if (!rows || !rows.length) {
    wrap.innerHTML = `<div class="empty-state">सध्या कोणतेही Active Form नाही</div>`;
    return;
  }
  wrap.innerHTML = `<table class="data-table">
    <tr><th>Form Name</th><th>जिल्हा</th><th>Event Date</th><th>Status</th><th>Added By</th><th>Link</th></tr>
    ${rows.map(r => `<tr>
      <td>${r["Form Name"] || ""}</td><td>${r.Jilha || ""}</td>
      <td class="num">${r["Event Date"] || ""}</td>
      <td><span class="badge ${statusBadgeClass(r.Status)}">${r.Status || ""}</span></td>
      <td>${r["Added By"] || ""}</td>
      <td>${r["Form Link"] ? `<a href="${r["Form Link"]}" target="_blank">Open ↗</a>` : "-"}</td>
    </tr>`).join("")}
  </table>`;
}

/* ---------- 3. Bhag-wise College List ---------- */

function setupCollegeListModule() {
  document.getElementById("collegeListJilhaFilter").addEventListener("change", (e) => {
    populateCollegeListNagarOptions(e.target.value);
    renderCollegeListTable();
  });
  document.getElementById("collegeListNagarFilter").addEventListener("change", renderCollegeListTable);

  setupAddForm({
    toggleBtnId: "toggleAddCollegeList", formId: "addCollegeListForm", msgId: "addCLMsg",
    jilhaId: "addCLJilha", nagarId: "addCLNagar", action: "addCollege",
    fieldMap: { jilha: "addCLJilha", nagar: "addCLNagar", college: "addCLName", address: "addCLAddress", principal: "addCLPrincipal", contact: "addCLContact" },
    requiredKeys: ["jilha", "nagar", "college"],
    onSuccess: () => loadCollegeList()
  });
}

async function loadCollegeList() {
  const jilhaSel = document.getElementById("collegeListJilhaFilter");
  const opts = allowedJilhaOptions(true);
  jilhaSel.innerHTML = opts.map(j => `<option value="${j === 'महानगर' ? 'All' : j}">${j}</option>`).join("");
  const optionValues = Array.from(jilhaSel.options).map(o => o.value);
  jilhaSel.value = optionValues.includes(currentJilha) ? currentJilha : (optionValues[0] || "All");

  populateCollegeListNagarOptions(jilhaSel.value);
  await renderCollegeListTable();
}

function populateCollegeListNagarOptions(jilha) {
  populateNagarSelect("collegeListNagarFilter", jilha);
}

async function renderCollegeListTable() {
  const jilha = document.getElementById("collegeListJilhaFilter").value;
  const nagar = document.getElementById("collegeListNagarFilter").value;
  const rows = await API.call("getBhagCollegeList", { jilha, nagar });
  const wrap = document.getElementById("collegeListTableWrap");
  if (!rows || !rows.length) {
    wrap.innerHTML = `<div class="empty-state">या फिल्टरसाठी College आढळले नाहीत</div>`;
    return;
  }
  wrap.innerHTML = `<table class="data-table">
    <tr><th>जिल्हा</th><th>नगर</th><th>College Name</th></tr>
    ${rows.map(r => `<tr><td>${r.Jilha || ""}</td><td>${r.Nagar || ""}</td><td>${r["College Name"] || ""}</td></tr>`).join("")}
  </table>`;
}