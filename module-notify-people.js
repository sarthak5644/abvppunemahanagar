/* =========================================================
   MODULE-NOTIFY-PEOPLE.JS — the "सूचना यादी" tab: manage the
   simple Name+Email contact list that every other add-form's
   "सूचना द्यायची व्यक्ती" multi-select picker pulls from.
========================================================= */

let notifyPeopleFormApi = null;

function setupNotifyPeopleModule() {
  notifyPeopleFormApi = setupAddForm({
    toggleBtnId: "toggleAddNotifyPerson", formId: "addNotifyPersonForm", msgId: "addNPMsg",
    action: "addNotifyPerson",
    fieldMap: { name: "addNPName", email: "addNPEmail" },
    requiredKeys: ["name", "email"],
    onSuccess: () => loadNotifyPeople()
  });
}

async function loadNotifyPeople() {
  const rows = await API.call("getNotifyPeopleList", {});
  const wrap = document.getElementById("notifyPeopleTableWrap");
  if (!rows || !rows.length) {
    wrap.innerHTML = `<div class="empty-state">अजून कोणीही जोडलेलं नाही</div>`;
    return;
  }
  wrap.innerHTML = `<table class="data-table">
    <tr><th>नाव</th><th>ईमेल</th><th>Action</th></tr>
    ${rows.map(r => {
      const actionCell = r.ID
        ? `<button type="button" class="btn ghost row-delete-btn" data-id="${r.ID}">Delete</button>`
        : `<span class="eng" style="color:var(--muted);font-size:11px;">(जुनी नोंद)</span>`;
      return `<tr><td>${r.Name || ""}</td><td>${r.Email || ""}</td><td class="row-actions">${actionCell}</td></tr>`;
    }).join("")}
  </table>`;

  wrap.querySelectorAll(".row-delete-btn").forEach(btn => {
    btn.addEventListener("click", () => deleteRecord("deleteNotifyPerson", btn.dataset.id, loadNotifyPeople));
  });
}