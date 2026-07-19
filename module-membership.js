/* =========================================================
   MODULE-MEMBERSHIP.JS — the "सदस्यत्व" tab: institution-level
   membership drives (member count + amount collected), with
   Jilha/Nagar filters and full Add / Edit / Delete.
========================================================= */

let membershipJilha = "All";
let membershipFormApi = null;

function setupMembershipModule() {
  const jilhaSel = document.getElementById("membershipJilhaFilter");

  const opts = allowedJilhaOptions(true);
  jilhaSel.innerHTML = opts.map(j => `<option value="${j === 'महानगर' ? 'All' : j}">${j}</option>`).join("");
  // Only assign .value if a matching <option> actually exists — assigning a
  // value with no matching option leaves the select showing blank/nothing
  // rather than falling back to the first option.
  const optionValues = Array.from(jilhaSel.options).map(o => o.value);
  jilhaSel.value = optionValues.includes(currentJilha) ? currentJilha : (optionValues[0] || "All");
  membershipJilha = jilhaSel.value;
  populateNagarSelect("membershipNagarFilter", membershipJilha);

  jilhaSel.addEventListener("change", () => {
    membershipJilha = jilhaSel.value;
    populateNagarSelect("membershipNagarFilter", membershipJilha);
    renderMembershipTable();
  });
  document.getElementById("membershipNagarFilter").addEventListener("change", renderMembershipTable);

  membershipFormApi = setupAddForm({
    toggleBtnId: "toggleAddMembership", formId: "addMembershipForm", msgId: "addMemMsg",
    jilhaId: "addMemJilha", nagarId: "addMemNagar", action: "addMembership",
    updateAction: "updateMembership", editIdFieldId: "addMemEditId",
    fieldMap: { date: "addMemDate", institutionName: "addMemInstitutionName", institutionType: "addMemInstitutionType", jilha: "addMemJilha", nagar: "addMemNagar", memberCount: "addMemCount", amountCollected: "addMemAmount", handledBy: "addMemHandledBy" },
    requiredKeys: ["date", "institutionName", "jilha", "memberCount"],
    onSuccess: () => renderMembershipTable()
  });
}

async function loadMembership() {
  await renderMembershipTable();
}

async function renderMembershipTable() {
  const jilha = document.getElementById("membershipJilhaFilter").value;
  const nagar = document.getElementById("membershipNagarFilter").value;
  const rows = await API.call("getMembershipList", { jilha, nagar });
  const wrap = document.getElementById("membershipTableWrap");
  if (!rows || !rows.length) {
    wrap.innerHTML = `<div class="empty-state">कोणतीही सदस्यत्व नोंद नाही</div>`;
    return;
  }
  wrap.innerHTML = `<table class="data-table">
    <tr><th>Date</th><th>संस्था</th><th>प्रकार</th><th>जिल्हा</th><th>नगर</th><th>सदस्य संख्या</th><th>जमा रक्कम</th><th>जबाबदार व्यक्ती</th><th>Action</th></tr>
    ${rows.map(r => {
      const actionCell = r.ID
        ? `<button type="button" class="btn ghost row-edit-btn" data-id="${r.ID}">Edit</button>
           <button type="button" class="btn ghost row-delete-btn" data-id="${r.ID}">Delete</button>`
        : `<span class="eng" style="color:var(--muted);font-size:11px;">(जुनी नोंद)</span>`;
      return `<tr>
        <td class="num">${r.Date || ""}</td><td>${r["Institution Name"] || r.Name || r.College || ""}</td>
        <td>${r["Institution Type"] || ""}</td><td>${r.Jilha || ""}</td><td>${r.Nagar || ""}</td>
        <td class="num">${r["Member Count"] || ""}</td><td class="num">${r["Amount Collected"] ? "₹" + r["Amount Collected"] : ""}</td>
        <td>${r["Handled By"] || ""}</td>
        <td class="row-actions" data-row='${JSON.stringify(r).replace(/'/g, "&apos;")}'>${actionCell}</td>
      </tr>`;
    }).join("")}
  </table>`;

  wrap.querySelectorAll(".row-edit-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const row = JSON.parse(btn.closest(".row-actions").dataset.row);
      membershipFormApi.openForEdit({
        date: row.Date, institutionName: row["Institution Name"], institutionType: row["Institution Type"],
        jilha: row.Jilha, nagar: row.Nagar, memberCount: row["Member Count"],
        amountCollected: row["Amount Collected"], handledBy: row["Handled By"]
      }, row.ID);
    });
  });
  wrap.querySelectorAll(".row-delete-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteRecord("deleteMembership", btn.dataset.id, renderMembershipTable));
  });
}