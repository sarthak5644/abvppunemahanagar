/* =========================================================
   MODULE-OVERVIEW.JS — the "विहंगावलोकन" (Overview) tab:
   summary stat cards + the Jilha-wise membership bar chart.
========================================================= */

async function loadOverview() {
  const stats = await API.call("getDashboardStats", { jilha: currentJilha });
  const grid = document.getElementById("statGrid");
  grid.innerHTML = `
    <div class="stat-card"><span class="num">${stats.totalMembership ?? "-"}</span><span class="label">एकूण सदस्यत्व</span></div>
    <div class="stat-card"><span class="num">${stats.totalJilha ?? 6}</span><span class="label">एकूण जिल्हा</span></div>
    <div class="stat-card"><span class="num">${stats.totalColleges ?? "-"}</span><span class="label">एकूण College</span></div>
    <div class="stat-card"><span class="num">${stats.totalActiveForms ?? "-"}</span><span class="label">Active Forms</span></div>
  `;
  const bars = document.getElementById("jilhaBars");
  const jc = stats.jilhaCount || {};
  const max = Math.max(1, ...Object.values(jc));
  bars.innerHTML = Object.keys(jc).map(j => `
    <div class="jbar-row">
      <div class="jbar-label">${j}</div>
      <div class="jbar-track"><div class="jbar-fill" style="width:${(jc[j] / max * 100).toFixed(0)}%"></div></div>
      <div class="jbar-count num">${jc[j]}</div>
    </div>
  `).join("");
}
