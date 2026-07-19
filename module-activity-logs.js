/* =========================================================
   MODULE-ACTIVITY-LOGS.JS — the "Activity Logs" tab
   (Mahanagar-level users only; hidden for Bhag-locked users
   in app-core.js's initDashboard).
========================================================= */

async function loadActivityLogs() {
  const rows = await API.call("getActivityLogs", {});
  const wrap = document.getElementById("activityLogsWrap");
  if (!rows || !rows.length) {
    wrap.innerHTML = `<div class="empty-state">अजून कोणतीही नोंद नाही</div>`;
    return;
  }
  wrap.innerHTML = `<table class="data-table">
    <tr><th>Timestamp</th><th>Action</th><th>User</th><th>Details</th></tr>
    ${rows.map(r => `<tr>
      <td class="num">${r.Timestamp || ""}</td>
      <td>${r.Action || ""}</td>
      <td>${r.User || ""}</td>
      <td>${r.Details || ""}</td>
    </tr>`).join("")}
  </table>`;
}