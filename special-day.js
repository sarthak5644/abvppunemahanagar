/* =========================================================
   SPECIAL-DAY.JS — everything about the "Membership Time
   Table" calendar: rendering the month grid, marking the
   days that have a scheduled college visit ("special days"),
   and showing the detail list for a selected date.
========================================================= */
const SpecialDayCalendar = (function () {

  let calMonth = new Date().getMonth();
  let calYear = new Date().getFullYear();
  let calSelectedDate = null;
  let getCurrentJilha = () => "All"; // injected by app.js

  const MARATHI_MONTHS = ["जानेवारी","फेब्रुवारी","मार्च","एप्रिल","मे","जून","जुलै","ऑगस्ट","सप्टेंबर","ऑक्टोबर","नोव्हेंबर","डिसेंबर"];
  const DOWS = ["सो","मं","बु","गु","शु","श","र"];

  function init(jilhaGetter) {
    getCurrentJilha = jilhaGetter;
    document.getElementById("prevMonth").onclick = () => {
      calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; }
      render();
    };
    document.getElementById("nextMonth").onclick = () => {
      calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; }
      render();
    };
  }

  async function load() {
    await render();
  }

  async function render() {
    document.getElementById("monthLabel").textContent = `${MARATHI_MONTHS[calMonth]} ${calYear}`;

    const specialDays = await API.call("getMembershipCalendarDates", {
      jilha: getCurrentJilha(), month: calMonth + 1, year: calYear
    });
    const specialSet = new Set(specialDays);

    const first = new Date(calYear, calMonth, 1);
    const startDow = (first.getDay() + 6) % 7; // Monday-first week
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);

    const grid = document.getElementById("calGrid");
    grid.innerHTML = DOWS.map(d => `<div class="dow">${d}</div>`).join("");

    for (let i = 0; i < startDow; i++) {
      grid.innerHTML += `<div class="cal-day blank"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const classes = ["cal-day"];
      if (specialSet.has(dateStr)) classes.push("has-entry");
      if (dateStr === todayStr) classes.push("today");
      if (dateStr === calSelectedDate) classes.push("selected");
      grid.innerHTML += `<div class="${classes.join(' ')}" data-date="${dateStr}">${d}</div>`;
    }

    grid.querySelectorAll(".cal-day:not(.blank)").forEach(el => {
      el.onclick = () => {
        calSelectedDate = el.dataset.date;
        render();
        showDetail(el.dataset.date);
      };
    });
  }

  async function showDetail(dateStr) {
    document.getElementById("calDetailDate").textContent = dateStr;
    const rows = await API.call("getMembershipByDate", { date: dateStr, jilha: getCurrentJilha() });
    const body = document.getElementById("calDetailBody");

    if (!rows || !rows.length) {
      body.innerHTML = `<div class="empty-state">या तारखेला कोणतीही membership drive नाही</div>`;
      return;
    }

    body.innerHTML = rows.map(r => `
      <div class="cal-entry">
        <div class="college">${r["College Name"] || ""}</div>
        <div class="meta">${r.Jilha || ""} · ${r.Nagar || ""}</div>
        <div class="meta">संपर्क: ${r["Contact Person"] || "-"} ${r.Phone ? "· " + r.Phone : ""}</div>
        <span class="badge ${String(r.Status).toLowerCase() === 'completed' ? 'active' : 'scheduled'}">${r.Status || "Scheduled"}</span>
      </div>
    `).join("");
  }

  return { init, load };
})();