/* =========================================================
   MODULE-MAHANAGAR-UPAKRAM.JS — the "महानगर उपक्रम" tab and
   its three sub-tabs: प्रवास (Pravas), बैठक (Baithak),
   अभियान (Abhiyan). Each add-form also creates a Google
   Calendar event (handled backend-side).
========================================================= */

let currentMahanagarSubtab = "pravas";
let mahaJilha = "All";
let mahaNagar = "All";
let pravasFormApi = null;
let baithakFormApi = null;
let abhiyanFormApi = null;

function setupMahanagarUpakramModule() {
  document.getElementById("mahanagarSubtabs").addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON") return;
    document.querySelectorAll("#mahanagarSubtabs button").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
    document.querySelectorAll(".subpanel").forEach(p => p.classList.remove("active"));
    document.getElementById("subpanel-" + e.target.dataset.subtab).classList.add("active");
    currentMahanagarSubtab = e.target.dataset.subtab;
    loadMahanagarSubtab(currentMahanagarSubtab);
  });

  const jilhaSel = document.getElementById("mahaJilhaFilter");
  const opts = allowedJilhaOptions(true);
  jilhaSel.innerHTML = opts.map(j => `<option value="${j === 'महानगर' ? 'All' : j}">${j}</option>`).join("");
  const optionValues = Array.from(jilhaSel.options).map(o => o.value);
  jilhaSel.value = optionValues.includes(currentJilha) ? currentJilha : (optionValues[0] || "All");
  mahaJilha = jilhaSel.value;
  populateNagarSelect("mahaNagarFilter", mahaJilha);

  jilhaSel.addEventListener("change", () => {
    mahaJilha = jilhaSel.value;
    populateNagarSelect("mahaNagarFilter", mahaJilha);
    mahaNagar = "All";
    loadMahanagarSubtab(currentMahanagarSubtab);
  });
  document.getElementById("mahaNagarFilter").addEventListener("change", (e) => {
    mahaNagar = e.target.value;
    loadMahanagarSubtab(currentMahanagarSubtab);
  });

  pravasFormApi = setupAddForm({
    toggleBtnId: "toggleAddPravas", formId: "addPravasForm", msgId: "addPravasMsg",
    jilhaId: "addPravasJilha", action: "addPravas", includeMahanagar: true,
    updateAction: "updatePravas", editIdFieldId: "addPravasEditId",
    fieldMap: { date: "addPravasDate", personName: "addPravasPerson", fromPlace: "addPravasFrom", toPlace: "addPravasTo", jilha: "addPravasJilha", purpose: "addPravasPurpose", contact: "addPravasContact", status: "addPravasStatus", startTime: "addPravasStartTime", endTime: "addPravasEndTime" },
    requiredKeys: ["date", "personName", "fromPlace", "toPlace"],
    onSuccess: () => loadMahanagarSubtab("pravas")
  });

  baithakFormApi = setupAddForm({
    toggleBtnId: "toggleAddBaithak", formId: "addBaithakForm", msgId: "addBaithakMsg",
    jilhaId: "addBaithakJilha", nagarId: "addBaithakNagar", action: "addBaithak", includeMahanagar: true,
    updateAction: "updateBaithak", editIdFieldId: "addBaithakEditId",
    fieldMap: { date: "addBaithakDate", jilha: "addBaithakJilha", nagar: "addBaithakNagar", vishay: "addBaithakVishay", sthal: "addBaithakSthal", status: "addBaithakStatus", startTime: "addBaithakStartTime", endTime: "addBaithakEndTime" },
    requiredKeys: ["date", "jilha", "vishay"],
    onSuccess: () => loadMahanagarSubtab("baithak")
  });

  abhiyanFormApi = setupAddForm({
    toggleBtnId: "toggleAddAbhiyan", formId: "addAbhiyanForm", msgId: "addAbhiyanMsg",
    jilhaId: "addAbhiyanJilha", action: "addAbhiyan", includeMahanagar: true,
    updateAction: "updateAbhiyan", editIdFieldId: "addAbhiyanEditId",
    fieldMap: { abhiyanName: "addAbhiyanName", jilha: "addAbhiyanJilha", startDate: "addAbhiyanStart", endDate: "addAbhiyanEnd", status: "addAbhiyanStatus" },
    requiredKeys: ["abhiyanName", "jilha", "startDate"],
    onSuccess: () => loadMahanagarSubtab("abhiyan")
  });
}

async function loadMahanagarSubtab(name) {
  if (name === "pravas") return loadPravas();
  if (name === "baithak") return loadBaithak();
  if (name === "abhiyan") return loadAbhiyan();
}

/* ---------- प्रवास (Pravas) ---------- */

async function loadPravas() {
  const rows = await API.call("getPravasList", { jilha: mahaJilha, nagar: mahaNagar });
  const wrap = document.getElementById("pravasTableWrap");
  if (!rows || !rows.length) {
    wrap.innerHTML = `<div class="empty-state">कोणताही प्रवास नोंदवलेला नाही</div>`;
    return;
  }
  wrap.innerHTML = `<table class="data-table">
    <tr><th>Date</th><th>नाव</th><th>From</th><th>To</th><th>जिल्हा</th><th>Purpose</th><th>Contact</th><th>Status</th><th>Note</th><th>Complete</th><th>Action</th></tr>
    ${rows.map(r => {
      const isDone = ["completed", "cancelled"].includes(String(r.Status || "").toLowerCase());
      const completeCell = !r.ID
        ? `<span class="eng" style="color:var(--muted);font-size:11.5px;">(जुनी नोंद)</span>`
        : isDone
          ? ""
          : `<div class="pravas-complete-row">
               <input type="text" class="pravas-note-input" data-id="${r.ID}" placeholder="टीप (note)">
               <button type="button" class="btn pravas-complete-btn" data-id="${r.ID}">पूर्ण करा</button>
             </div>`;
      const actionCell = r.ID
        ? `<button type="button" class="btn ghost row-edit-btn" data-id="${r.ID}">Edit</button>
           <button type="button" class="btn ghost row-delete-btn" data-id="${r.ID}">Delete</button>`
        : "";
      return `<tr>
        <td class="num">${r.Date || ""}</td><td>${r["Person Name"] || ""}</td><td>${r["From Place"] || ""}</td><td>${r["To Place"] || ""}</td>
        <td>${r.Jilha || ""}</td><td>${r.Purpose || ""}</td><td class="num">${r.Contact || ""}</td>
        <td><span class="badge ${statusBadgeClass(r.Status)}">${r.Status || ""}</span></td>
        <td>${r.Note || ""}</td>
        <td>${completeCell}</td>
        <td class="row-actions" data-row='${JSON.stringify(r).replace(/'/g, "&apos;")}'>${actionCell}</td>
      </tr>`;
    }).join("")}
  </table>`;

  wrap.querySelectorAll(".pravas-complete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const noteInput = wrap.querySelector(`.pravas-note-input[data-id="${id}"]`);
      const note = noteInput ? noteInput.value.trim() : "";
      const session = getSession();
      btn.disabled = true;
      btn.textContent = "जतन करत आहे...";
      await API.write("updatePravasStatus", {
        id, status: "Completed", note,
        updatedBy: (session && session.user && (session.user.name || session.user.email)) || "Unknown"
      });
      loadPravas();
    });
  });
  wrap.querySelectorAll(".row-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const row = JSON.parse(btn.closest(".row-actions").dataset.row);
      pravasFormApi.openForEdit({
        date: row.Date, personName: row["Person Name"], fromPlace: row["From Place"], toPlace: row["To Place"],
        jilha: row.Jilha, purpose: row.Purpose, contact: row.Contact, status: row.Status,
        startTime: row["Start Time"], endTime: row["End Time"]
      }, row.ID);
    });
  });
  wrap.querySelectorAll(".row-delete-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteRecord("deletePravas", btn.dataset.id, loadPravas));
  });
}

/* ---------- बैठक (Baithak) ---------- */

async function loadBaithak() {
  const rows = await API.call("getBaithakList", { jilha: mahaJilha, nagar: mahaNagar });
  const wrap = document.getElementById("baithakTableWrap");
  if (!rows || !rows.length) {
    wrap.innerHTML = `<div class="empty-state">कोणतीही बैठक नोंदवलेली नाही</div>`;
    return;
  }
  wrap.innerHTML = `<table class="data-table">
    <tr><th>Date</th><th>जिल्हा</th><th>नगर</th><th>विषय</th><th>स्थळ</th><th>Status</th><th>Action</th></tr>
    ${rows.map(r => {
      const actionCell = r.ID
        ? `<button type="button" class="btn ghost row-edit-btn" data-id="${r.ID}">Edit</button>
           <button type="button" class="btn ghost row-delete-btn" data-id="${r.ID}">Delete</button>`
        : `<span class="eng" style="color:var(--muted);font-size:11px;">(जुनी नोंद)</span>`;
      return `<tr>
        <td class="num">${r.Date || ""}</td><td>${r.Jilha || ""}</td><td>${r.Nagar || ""}</td><td>${r.Vishay || ""}</td><td>${r.Sthal || ""}</td>
        <td><span class="badge ${statusBadgeClass(r.Status)}">${r.Status || ""}</span></td>
        <td class="row-actions" data-row='${JSON.stringify(r).replace(/'/g, "&apos;")}'>${actionCell}</td>
      </tr>`;
    }).join("")}
  </table>`;

  wrap.querySelectorAll(".row-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const row = JSON.parse(btn.closest(".row-actions").dataset.row);
      baithakFormApi.openForEdit({
        date: row.Date, jilha: row.Jilha, nagar: row.Nagar, vishay: row.Vishay, sthal: row.Sthal,
        status: row.Status, startTime: row["Start Time"], endTime: row["End Time"]
      }, row.ID);
    });
  });
  wrap.querySelectorAll(".row-delete-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteRecord("deleteBaithak", btn.dataset.id, loadBaithak));
  });
}

/* ---------- अभियान (Abhiyan) ---------- */

async function loadAbhiyan() {
  const rows = await API.call("getAbhiyanList", { jilha: mahaJilha });
  const wrap = document.getElementById("abhiyanTableWrap");
  if (!rows || !rows.length) {
    wrap.innerHTML = `<div class="empty-state">कोणतेही अभियान नोंदवलेले नाही</div>`;
    return;
  }
  wrap.innerHTML = `<table class="data-table">
    <tr><th>अभियान</th><th>जिल्हा</th><th>Start</th><th>End</th><th>Status</th><th>Action</th></tr>
    ${rows.map(r => {
      const actionCell = r.ID
        ? `<button type="button" class="btn ghost row-edit-btn" data-id="${r.ID}">Edit</button>
           <button type="button" class="btn ghost row-delete-btn" data-id="${r.ID}">Delete</button>`
        : `<span class="eng" style="color:var(--muted);font-size:11px;">(जुनी नोंद)</span>`;
      return `<tr>
        <td>${r["Abhiyan Name"] || ""}</td><td>${r.Jilha || ""}</td>
        <td class="num">${r["Start Date"] || ""}</td><td class="num">${r["End Date"] || ""}</td>
        <td><span class="badge ${statusBadgeClass(r.Status)}">${r.Status || ""}</span></td>
        <td class="row-actions" data-row='${JSON.stringify(r).replace(/'/g, "&apos;")}'>${actionCell}</td>
      </tr>`;
    }).join("")}
  </table>`;

  wrap.querySelectorAll(".row-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const row = JSON.parse(btn.closest(".row-actions").dataset.row);
      abhiyanFormApi.openForEdit({
        abhiyanName: row["Abhiyan Name"], jilha: row.Jilha, startDate: row["Start Date"],
        endDate: row["End Date"], status: row.Status
      }, row.ID);
    });
  });
  wrap.querySelectorAll(".row-delete-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteRecord("deleteAbhiyan", btn.dataset.id, loadAbhiyan));
  });
}
