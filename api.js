/* =========================================================
   API.JS — all communication with the Google Apps Script
   backend lives here. Nothing else in the app should call
   fetch() directly.

   SESSION MODEL:
   - login(email, password) gets a short-lived token back
     from the backend (stored server-side in CacheService,
     max 6h lifetime — Apps Script's hard ceiling).
   - Every other action must include that token. The backend
     rejects anything without a valid, unexpired token with
     { error:"UNAUTHORIZED", needsLogin:true }.
   - This module holds the token in memory and attaches it
     automatically to every call/write — callers never
     handle it directly.

   CONFIG: paste your deployed Apps Script Web App URL below.
   Leave blank ("") to run the whole site on bundled sample
   data (useful for designing the frontend before the sheet
   / script is wired up).
========================================================= */
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzMTVgxGwXK6OkV2wGjTtpHiaP2VqXV0TQqukODDNrwiZf38H2Z2s5BLTAR4RoN4vNw/exec"; // e.g. "https://script.google.com/macros/s/XXXXX/exec"

/* =========================================================
   API.JS — all communication with the Google Apps Script
   backend lives here. Nothing else in the app should call
   fetch() directly.

   SESSION MODEL:
   - login(email, password) gets a short-lived token back
     from the backend (stored server-side in CacheService,
     max 6h lifetime — Apps Script's hard ceiling).
   - Every other action must include that token. The backend
     rejects anything without a valid, unexpired token with
     { error:"UNAUTHORIZED", needsLogin:true }.
   - This module holds the token in memory and attaches it
     automatically to every call/write — callers never
     handle it directly.

   CONFIG: paste your deployed Apps Script Web App URL below.
   Leave blank ("") to run the whole site on bundled sample
   data (useful for designing the frontend before the sheet
   / script is wired up).
========================================================= */

const API = (function () {

  let sessionToken = null;
  let unauthorizedHandler = null;

  /* ---------- Sample / offline data ---------- */
  const SAMPLE = {
    stats: {
      totalMembership: 4820,
      totalJilha: 6,
      jilhaCount: {"मध्य पुणे":980,"कात्रज":760,"हडपसर":890,"येरवडा":640,"विद्यापीठ":900,"कोथरूड":650},
      totalColleges: 42,
      totalActiveForms: 5
    },
    karyakarini: [
      {Jilha:"मध्य पुणे", Nagar:"शिवाजी नगर", Upnagar:"बुधवार पेठ", Name:"अमित जोशी", Jababdari:"नगर अध्यक्ष", Phone:"9876500001", Email:"amit@example.com", "Academic Year":"2025-26"},
      {Jilha:"मध्य पुणे", Nagar:"पर्वती", Upnagar:"दांडेकर पूल", Name:"सोनाली पवार", Jababdari:"नगर सचिव", Phone:"9876500002", Email:"sonali@example.com", "Academic Year":"2025-26"},
      {Jilha:"कात्रज", Nagar:"सिंहगड", Upnagar:"वडगाव", Name:"रोहन शिंदे", Jababdari:"नगर अध्यक्ष", Phone:"9876500003", Email:"rohan@example.com", "Academic Year":"2024-25"},
      {Jilha:"कोथरूड", Nagar:"कर्वेनगर", Upnagar:"पौड रोड", Name:"प्रिया देशपांडे", Jababdari:"नगर सचिव", Phone:"9876500004", Email:"priya@example.com", "Academic Year":"2025-26"}
    ],
    collegeKaryakarini: [
      {Jilha:"मध्य पुणे", Nagar:"शिवाजी नगर", Mahavidyalay:"बृहन् महाराष्ट्र कॉलेज ऑफ कॉमर्स", Jababdari:"अध्यक्ष", Naav:"निखिल कुलकर्णी", Shikshan:"बी.कॉम. द्वितीय वर्ष", Phone:"9876511001", Email:"nikhil@example.com", "Academic Year":"2025-26"},
      {Jilha:"कात्रज", Nagar:"सिंहगड", Mahavidyalay:"आबासाहेब गरवारे कॉलेज", Jababdari:"सचिव", Naav:"श्रुती भोसले", Shikshan:"बी.ए. तृतीय वर्ष", Phone:"9876511002", Email:"shruti@example.com", "Academic Year":"2025-26"},
      {Jilha:"कोथरूड", Nagar:"कर्वेनगर", Mahavidyalay:"MIT कॉलेज ऑफ इंजिनिअरिंग", Jababdari:"अध्यक्ष", Naav:"ओंकार पाटील", Shikshan:"बी.ई. प्रथम वर्ष", Phone:"9876511003", Email:"onkar@example.com", "Academic Year":"2024-25"}
    ],
    activeForms: [
      {"Form Name":"वार्षिक सदस्यत्व नोंदणी", Jilha:"मध्य पुणे", "Event Date":"2026-07-20", "Form Link":"#", Status:"Active", "Added By":"Sarthak"},
      {"Form Name":"कार्यकर्ता शिबिर नोंदणी", Jilha:"कोथरूड", "Event Date":"2026-07-25", "Form Link":"#", Status:"Active", "Added By":"Sarthak"},
      {"Form Name":"महाविद्यालय संपर्क अभियान", Jilha:"हडपसर", "Event Date":"2026-08-02", "Form Link":"#", Status:"Active", "Added By":"Gitesh"}
    ],
    membershipCalendar: [
      {Date:"2026-07-14", Jilha:"मध्य पुणे", Nagar:"शिवाजी नगर", "College Name":"बृहन् महाराष्ट्र कॉलेज ऑफ कॉमर्स", "Contact Person":"अमित जोशी", Phone:"9876500001", Status:"Scheduled"},
      {Date:"2026-07-14", Jilha:"कात्रज", Nagar:"सिंहगड", "College Name":"आबासाहेब गरवारे कॉलेज", "Contact Person":"रोहन शिंदे", Phone:"9876500003", Status:"Scheduled"},
      {Date:"2026-07-18", Jilha:"कोथरूड", Nagar:"कर्वेनगर", "College Name":"MIT कॉलेज ऑफ इंजिनिअरिंग", "Contact Person":"प्रिया देशपांडे", Phone:"9876500004", Status:"Scheduled"},
      {Date:"2026-07-22", Jilha:"हडपसर", Nagar:"हडपसर", "College Name":"मॉडर्न कॉलेज हडपसर", "Contact Person":"सागर कदम", Phone:"9876500005", Status:"Completed"}
    ],
    collegeList: [
      {Jilha:"मध्य पुणे", Nagar:"शिवाजी नगर", "College Name":"बृहन् महाराष्ट्र कॉलेज ऑफ कॉमर्स", Address:"शिवाजी नगर, पुणे", Principal:"डॉ. एस. देशमुख", Contact:"9876520001"},
      {Jilha:"कात्रज", Nagar:"सिंहगड", "College Name":"आबासाहेब गरवारे कॉलेज", Address:"सिंहगड रोड, पुणे", Principal:"डॉ. आर. पवार", Contact:"9876520002"},
      {Jilha:"कोथरूड", Nagar:"कर्वेनगर", "College Name":"MIT कॉलेज ऑफ इंजिनिअरिंग", Address:"कर्वेनगर, पुणे", Principal:"डॉ. एन. जोशी", Contact:"9876520003"},
      {Jilha:"हडपसर", Nagar:"हडपसर", "College Name":"मॉडर्न कॉलेज हडपसर", Address:"हडपसर, पुणे", Principal:"डॉ. के. साळुंखे", Contact:"9876520004"},
      {Jilha:"येरवडा", Nagar:"येरवडा", "College Name":"येरवडा आर्ट्स अँड कॉमर्स कॉलेज", Address:"येरवडा, पुणे", Principal:"डॉ. पी. काळे", Contact:"9876520005"},
      {Jilha:"विद्यापीठ", Nagar:"पाषाण", "College Name":"सावित्रीबाई फुले पुणे विद्यापीठ संलग्न कॉलेज", Address:"पाषाण, पुणे", Principal:"डॉ. एम. राव", Contact:"9876520006"}
    ],
    pravas: [
      {ID:"demo-1", Date:"2026-07-10", "Person Name":"Sarthak", "From Place":"पुणे", "To Place":"मुंबई", Jilha:"मध्य पुणे", Purpose:"बैठक", Contact:"9876500010", Status:"Completed", Note:"वेळेत पूर्ण झाले"},
      {ID:"demo-2", Date:"2026-07-16", "Person Name":"Gitesh", "From Place":"पुणे", "To Place":"नाशिक", Jilha:"कोथरूड", Purpose:"संघटन दौरा", Contact:"9876500011", Status:"Planned", Note:""}
    ],
    baithak: [
      {ID:"demo-b1", Date:"2026-07-15", Jilha:"मध्य पुणे", Nagar:"शिवाजी नगर", Vishay:"मासिक आढावा बैठक", Sthal:"कार्यालय", Status:"Planned"},
      {ID:"demo-b2", Date:"2026-07-05", Jilha:"कात्रज", Nagar:"सिंहगड", Vishay:"कार्यकर्ता बैठक", Sthal:"कात्रज कार्यालय", Status:"Completed"}
    ],
    abhiyan: [
      {ID:"demo-a1", "Abhiyan Name":"सदस्यता अभियान 2026", Jilha:"मध्य पुणे", "Start Date":"2026-07-01", "End Date":"2026-07-31", Status:"Ongoing"},
      {ID:"demo-a2", "Abhiyan Name":"महाविद्यालय संपर्क अभियान", Jilha:"हडपसर", "Start Date":"2026-06-01", "End Date":"2026-06-30", Status:"Completed"}
    ],
    activityLogs: [
      {Timestamp:"2026-07-13T10:12:00.000Z", Action:"Active Form Added", User:"Sarthak (sarthakvelapure5644@gmail.com)", Details:"वार्षिक सदस्यत्व नोंदणी"},
      {Timestamp:"2026-07-12T08:45:00.000Z", Action:"Pravas Added", User:"Gitesh (organizingsecretary.wz@gmail.com)", Details:"पुणे to नाशिक"},
      {Timestamp:"2026-07-11T17:20:00.000Z", Action:"College Karyakarini Added", User:"Sarthak (sarthakvelapure5644@gmail.com)", Details:"निखिल कुलकर्णी - बृहन् महाराष्ट्र कॉलेज ऑफ कॉमर्स"}
    ],
    membership: [
      {ID:"demo-m1", Date:"2026-07-09", "Institution Name":"Jalgaon Engineering College", "Institution Type":"College", Jilha:"मध्य पुणे", Nagar:"शिवाजी नगर", "Member Count":42, "Amount Collected":2100, "Handled By":"Gitesh Chavan"},
      {ID:"demo-m2", Date:"2026-07-05", "Institution Name":"MIT कॉलेज ऑफ इंजिनिअरिंग", "Institution Type":"College", Jilha:"कोथरूड", Nagar:"कर्वेनगर", "Member Count":30, "Amount Collected":1500, "Handled By":"Sneha More"}
    ],
    demoUsers: [
      { "Bhag/Jilha":"मध्य पुणे", Name:"Sarthak", Email:"sarthakvelapure5644@gmail.com", Role:"पुणे महानगर कार्यालय मंत्री", Prant:"Paschim Maharashtra Prant", Status:"Active", Password:"demo123" },
      { "Bhag/Jilha":"मध्य पुणे", Name:"Amogh", Email:"amogh4010@gmail.com", Role:"पुणे महानगर संगठन मंत्री", Prant:"Paschim Maharashtra Prant", Status:"Active", Password:"demo123" },
      { "Bhag/Jilha":"महानगर", Name:"Gitesh", Email:"organizingsecretary.wz@gmail.com", Role:"अभाविप पश्चिम क्षेत्र क्षेत्रीय संगठन मंत्री", Prant:"Western Zone", Status:"Active", Password:"demo123" }
    ]
  };

  /* ---------- Low level transport ---------- */
  async function getRequest(action, params = {}) {
    const url = new URL(SCRIPT_URL);
    url.searchParams.set("action", action);
    if (sessionToken) url.searchParams.set("token", sessionToken);
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null) url.searchParams.set(k, params[k]);
    });
    const res = await fetch(url);
    return res.json();
  }

  async function postRequest(action, body = {}) {
    const payload = { action, ...body };
    if (sessionToken && !("token" in payload)) payload.token = sessionToken;
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  function checkUnauthorized(result) {
    if (result && result.needsLogin) {
      sessionToken = null;
      if (unauthorizedHandler) unauthorizedHandler(result.message);
    }
    return result;
  }

  /* ---------- Offline mock (used only when SCRIPT_URL is blank) ---------- */
  function mock(action, p) {
    const jilhaReal = (p.jilha && p.jilha !== "All") ? p.jilha : null;
    const nagarReal = (p.nagar && p.nagar !== "All") ? p.nagar : null;
    switch (action) {
      case "login": {
        const user = SAMPLE.demoUsers.find(u => u.Email.toLowerCase() === String(p.email).toLowerCase().trim());
        if (!user) return { allowed: false, message: "हा ईमेल अधिकृत यादीत नाही." };
        if (user.Password !== p.password) return { allowed: false, message: "चुकीचा पासवर्ड." };
        const bhag = user["Bhag/Jilha"] || "";
        const isMahanagar = !bhag || bhag === "महानगर";
        return {
          allowed: true, token: "demo-token", expiresIn: 21600,
          user: { name: user.Name, email: user.Email, role: user.Role, prant: user.Prant, status: user.Status, bhag, isMahanagar }
        };
      }
      case "logout": return { message: "Logged out" };
      case "validateSession": return { valid: sessionToken === "demo-token" };
      case "getDashboardStats": return SAMPLE.stats;
      case "getUpnagarList": {
        const rows = SAMPLE.karyakarini.filter(r => (!jilhaReal || r.Jilha === jilhaReal) && (!nagarReal || r.Nagar === nagarReal));
        return [...new Set(rows.map(r => r.Upnagar))];
      }
      case "getJilhaNagarUpnagarKaryakarini":
        return SAMPLE.karyakarini.filter(r =>
          (!jilhaReal || r.Jilha === jilhaReal) &&
          (!nagarReal || r.Nagar === nagarReal) &&
          (!p.upnagar || p.upnagar === "All" || r.Upnagar === p.upnagar) &&
          (!p.academicYear || p.academicYear === "All" || r["Academic Year"] === p.academicYear));
      case "getCollegeListByJilha":
        return [...new Set(SAMPLE.collegeKaryakarini.filter(r => (!jilhaReal || r.Jilha === jilhaReal) && (!nagarReal || r.Nagar === nagarReal)).map(r => r.Mahavidyalay))];
      case "getCollegeKaryakarini":
        return SAMPLE.collegeKaryakarini.filter(r =>
          (!jilhaReal || r.Jilha === jilhaReal) &&
          (!nagarReal || r.Nagar === nagarReal) &&
          (!p.college || p.college === "All" || r.Mahavidyalay === p.college) &&
          (!p.academicYear || p.academicYear === "All" || r["Academic Year"] === p.academicYear));
      case "getActiveForms":
        return SAMPLE.activeForms.filter(r => !jilhaReal || r.Jilha === jilhaReal);
      case "getMembershipCalendarDates": {
        let dates = SAMPLE.membershipCalendar.filter(r => !jilhaReal || r.Jilha === jilhaReal).map(r => r.Date);
        return [...new Set(dates)];
      }
      case "getMembershipByDate":
        return SAMPLE.membershipCalendar.filter(r => r.Date === p.date && (!jilhaReal || r.Jilha === jilhaReal));
      case "getBhagCollegeList":
        return SAMPLE.collegeList.filter(r => (!jilhaReal || r.Jilha === jilhaReal) && (!nagarReal || r.Nagar === nagarReal));
      case "getPravasList":
        return SAMPLE.pravas.filter(r => (!jilhaReal || r.Jilha === jilhaReal) && (!nagarReal || r.Nagar === nagarReal));
      case "getBaithakList":
        return SAMPLE.baithak.filter(r => (!jilhaReal || r.Jilha === jilhaReal) && (!nagarReal || r.Nagar === nagarReal));
      case "getAbhiyanList":
        return SAMPLE.abhiyan.filter(r => !jilhaReal || r.Jilha === jilhaReal);
      case "getActivityLogs":
        return SAMPLE.activityLogs;
      case "getMembershipList":
        return SAMPLE.membership.filter(r => (!jilhaReal || r.Jilha === jilhaReal) && (!nagarReal || r.Nagar === nagarReal));
      case "addCollegeKaryakarini":
      case "addJilhaNagarUpnagarKaryakarini":
      case "addActiveForm":
      case "addCollege":
      case "addMembershipCalendarEntry":
        return { message: "(offline demo — काहीही सेव्ह झालेले नाही)" };
      case "addPravas": {
        const row = { ID: "demo-" + Date.now(), Date: p.date, "Person Name": p.personName, "From Place": p.fromPlace, "To Place": p.toPlace, Jilha: p.jilha, Nagar: p.nagar || "", Purpose: p.purpose, Contact: p.contact, Status: p.status || "Planned", Note: "", "Start Time": p.startTime || "", "End Time": p.endTime || "" };
        SAMPLE.pravas.unshift(row);
        return { message: "Pravas added successfully" };
      }
      case "updatePravas": {
        const row = SAMPLE.pravas.find(r => r.ID === p.id);
        if (row) Object.assign(row, { Date: p.date, "Person Name": p.personName, "From Place": p.fromPlace, "To Place": p.toPlace, Jilha: p.jilha, Nagar: p.nagar || "", Purpose: p.purpose, Contact: p.contact, Status: p.status, "Start Time": p.startTime || "", "End Time": p.endTime || "" });
        return { message: "Pravas updated successfully" };
      }
      case "updatePravasStatus": {
        const row = SAMPLE.pravas.find(r => r.ID === p.id);
        if (row) { row.Status = p.status || "Completed"; if (p.note) row.Note = p.note; }
        return { message: "Pravas updated successfully" };
      }
      case "deletePravas": {
        SAMPLE.pravas = SAMPLE.pravas.filter(r => r.ID !== p.id);
        return { message: "Pravas deleted successfully" };
      }
      case "addBaithak": {
        const row = { ID: "demo-" + Date.now(), Date: p.date, Jilha: p.jilha, Nagar: p.nagar || "", Vishay: p.vishay, Sthal: p.sthal, Status: p.status || "Planned", "Start Time": p.startTime || "", "End Time": p.endTime || "" };
        SAMPLE.baithak.unshift(row);
        return { message: "Baithak added successfully" };
      }
      case "updateBaithak": {
        const row = SAMPLE.baithak.find(r => r.ID === p.id);
        if (row) Object.assign(row, { Date: p.date, Jilha: p.jilha, Nagar: p.nagar || "", Vishay: p.vishay, Sthal: p.sthal, Status: p.status, "Start Time": p.startTime || "", "End Time": p.endTime || "" });
        return { message: "Baithak updated successfully" };
      }
      case "deleteBaithak": {
        SAMPLE.baithak = SAMPLE.baithak.filter(r => r.ID !== p.id);
        return { message: "Baithak deleted successfully" };
      }
      case "addAbhiyan": {
        const row = { ID: "demo-" + Date.now(), "Abhiyan Name": p.abhiyanName, Jilha: p.jilha, "Start Date": p.startDate, "End Date": p.endDate, Status: p.status || "Planned" };
        SAMPLE.abhiyan.unshift(row);
        return { message: "Abhiyan added successfully" };
      }
      case "updateAbhiyan": {
        const row = SAMPLE.abhiyan.find(r => r.ID === p.id);
        if (row) Object.assign(row, { "Abhiyan Name": p.abhiyanName, Jilha: p.jilha, "Start Date": p.startDate, "End Date": p.endDate, Status: p.status });
        return { message: "Abhiyan updated successfully" };
      }
      case "deleteAbhiyan": {
        SAMPLE.abhiyan = SAMPLE.abhiyan.filter(r => r.ID !== p.id);
        return { message: "Abhiyan deleted successfully" };
      }
      case "addMembership": {
        const row = { ID: "demo-" + Date.now(), Date: p.date, "Institution Name": p.institutionName, "Institution Type": p.institutionType, Jilha: p.jilha, Nagar: p.nagar, "Member Count": p.memberCount, "Amount Collected": p.amountCollected, "Handled By": p.handledBy };
        SAMPLE.membership.unshift(row);
        return { message: "Membership added successfully" };
      }
      case "updateMembership": {
        const row = SAMPLE.membership.find(r => r.ID === p.id);
        if (row) Object.assign(row, { Date: p.date, "Institution Name": p.institutionName, "Institution Type": p.institutionType, Jilha: p.jilha, Nagar: p.nagar, "Member Count": p.memberCount, "Amount Collected": p.amountCollected, "Handled By": p.handledBy });
        return { message: "Membership updated successfully" };
      }
      case "deleteMembership": {
        SAMPLE.membership = SAMPLE.membership.filter(r => r.ID !== p.id);
        return { message: "Membership deleted successfully" };
      }
      default:
        return [];
    }
  }

  /* ---------- Public API ---------- */

  function onUnauthorized(cb) { unauthorizedHandler = cb; }
  function restoreToken(token) { sessionToken = token; }
  function getToken() { return sessionToken; }

  async function call(action, params = {}) {
    if (!SCRIPT_URL) return checkUnauthorized(mock(action, params));
    try {
      const result = await getRequest(action, params);
      return checkUnauthorized(result);
    } catch (err) {
      console.error("API GET error:", err);
      return { error: String(err) };
    }
  }

  async function login(email, password) {
    const result = !SCRIPT_URL ? mock("login", { email, password }) : await (async () => {
      try { return await postRequest("login", { email, password }); }
      catch (err) { console.error("API login error:", err); return { allowed: false, message: "सर्व्हरशी संपर्क होऊ शकला नाही." }; }
    })();
    if (result && result.allowed && result.token) sessionToken = result.token;
    return result;
  }

  async function logout() {
    if (!SCRIPT_URL) { sessionToken = null; return mock("logout", {}); }
    try { return await postRequest("logout", {}); }
    finally { sessionToken = null; }
  }

  async function validateSession() {
    if (!sessionToken) return { valid: false };
    if (!SCRIPT_URL) return mock("validateSession", {});
    try { return await getRequest("validateSession", {}); }
    catch (err) { console.error("API validateSession error:", err); return { valid: false }; }
  }

  async function write(action, data = {}) {
    if (!SCRIPT_URL) return checkUnauthorized(mock(action, data));
    try {
      const result = await postRequest(action, data);
      return checkUnauthorized(result);
    } catch (err) {
      console.error("API write error:", err);
      return { error: String(err) };
    }
  }

  return {
    call, login, logout, validateSession, write,
    onUnauthorized, restoreToken, getToken,
    isLive: () => !!SCRIPT_URL
  };
})();