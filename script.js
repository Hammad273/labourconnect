const searchForm = document.getElementById("searchForm");
const skillSearch = document.getElementById("skillSearch");
const locationSearch = document.getElementById("locationSearch");
const jobCards = [...document.querySelectorAll(".job-card")];
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");
const toast = document.getElementById("toast");
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const skill = skillSearch.value.trim().toLowerCase();
  const location = locationSearch.value.trim().toLowerCase();
  let visible = 0;

  jobCards.forEach((card) => {
    const matchesSkill = !skill || card.dataset.skill.includes(skill) || card.querySelector("h3").textContent.toLowerCase().includes(skill);
    const matchesLocation = !location || card.dataset.location.includes(location) || card.querySelector(".job-meta").textContent.toLowerCase().includes(location);
    const show = matchesSkill && matchesLocation;
    card.hidden = !show;
    if (show) visible++;
  });

  resultCount.textContent = visible + (visible === 1 ? " sample job" : " sample jobs");
  emptyState.hidden = visible !== 0;
});

const backdrop = document.getElementById("modalBackdrop");
const modalTitle = document.getElementById("modalTitle");
const accountForm = document.getElementById("accountForm");
const accountName = document.getElementById("accountName");
const accountPhone = document.getElementById("accountPhone");
const accountPassword = document.getElementById("accountPassword");
const accountRole = document.getElementById("accountRole");

let accountMode = "register";

/* Create the extra field needed for worker or contractor registration. */
const extraAccountField = document.createElement("label");
extraAccountField.id = "extraAccountField";
extraAccountField.hidden = true;
accountRole.closest("label").insertAdjacentElement("afterend", extraAccountField);

function updateAccountFields() {
  const isLogin = accountMode === "login";
  const role = accountRole.value;

  modalTitle.textContent = isLogin
    ? "Log in to LabourConnect"
    : "Create your LabourConnect account";

  accountName.closest("label").hidden = isLogin;
  accountRole.closest("label").hidden = isLogin;

  accountName.required = !isLogin;
  accountPhone.required = true;
  accountPassword.required = true;

  if (isLogin) {
    extraAccountField.hidden = true;
    extraAccountField.replaceChildren();
  } else {
    extraAccountField.hidden = false;

    const labelText = role === "worker"
      ? "Primary skill"
      : "Organization name";

    const placeholder = role === "worker"
      ? "e.g. Electrician"
      : "e.g. ABC Constructions";

    const field = document.createElement("input");
    field.id = role === "worker"
      ? "accountPrimarySkill"
      : "accountOrganization";

    field.type = "text";
    field.required = true;
    field.maxLength = 100;
    field.placeholder = placeholder;

    extraAccountField.replaceChildren(
      document.createTextNode(labelText),
      field
    );
  }

  accountPassword.placeholder = isLogin
    ? "Enter your password"
    : "Create a password";
}

function openModal(mode) {
  accountMode = mode === "login" ? "login" : "register";
  updateAccountFields();

  backdrop.hidden = false;

  (accountMode === "login" ? accountPhone : accountName).focus();
}

function closeModal() {
  backdrop.hidden = true;
}

document.querySelectorAll("[data-open]").forEach((button) => {
  button.addEventListener("click", () => openModal(button.dataset.open));
});

document.getElementById("modalClose").addEventListener("click", closeModal);

backdrop.addEventListener("click", (event) => {
  if (event.target === backdrop) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeModal();
});

accountRole.addEventListener("change", updateAccountFields);

/* Supabase Auth: phone + password. Public publishable key only. */
const SUPABASE_URL = "https://qpmvfruulxiosovschdk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_2CRIid36vvgj7Giq86Apcg_Zlmwkbr_";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

function toE164IndianMobile(value) {
  const digits = value.replace(/\\D/g, "");
  if (!/^[6-9]\\d{9}$/.test(digits)) {
    throw new Error("Enter a valid 10-digit Indian mobile number.");
  }
  return "+91" + digits;
}

async function showSignedInUser(user) {
  if (!user) return;
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("user_id", user.id)
    .single();

  if (error) {
    showToast("Signed in, but your profile is not ready yet. Please refresh.");
    return;
  }

  const displayRole = data.role === "contractor" ? "Contractor" : "Worker";
  localStorage.setItem("labourConnectDemoUser", JSON.stringify({
    name: data.full_name,
    phone: user.phone || "",
    role: displayRole,
    user_id: user.id
  }));
  setDashboardRole(displayRole);
}

accountForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const mobile = accountPhone.value.trim();
  const password = accountPassword.value;

  try {
    const phone = toE164IndianMobile(mobile);

    if (accountMode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({
        phone,
        password
      });
      if (error) throw error;
      await showSignedInUser(data.user);
      closeModal();
      accountForm.reset();
      updateAccountFields();
      showToast("Welcome back!");
      return;
    }

    const role = accountRole.value;
    const fullName = accountName.value.trim();
    const extra = role === "worker"
      ? { primary_skill: document.getElementById("accountPrimarySkill").value.trim() }
      : { organization_name: document.getElementById("accountOrganization").value.trim() };

    const { data, error } = await supabase.auth.signUp({
      phone,
      password,
      options: {
        data: { full_name: fullName, role, ...extra }
      }
    });
    if (error) throw error;

    accountForm.reset();
    accountRole.value = "worker";
    accountMode = "login";
    updateAccountFields();
    backdrop.hidden = false;
    accountPhone.value = mobile;
    accountPassword.focus();

    showToast(data.session
      ? "Account created. You are signed in."
      : "Account created. Complete phone verification if prompted, then log in.");
    if (data.session) await showSignedInUser(data.user);
  } catch (error) {
    showToast(error.message || "Authentication failed. Please try again.");
  }
});

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "SIGNED_IN" && session?.user) {
    await showSignedInUser(session.user);
  }
});

async function restoreLoginSession() {
  const { data, error } = await supabase.auth.getSession();
  if (!error && data.session?.user) {
    await showSignedInUser(data.session.user);
  }
}
restoreLoginSession();

document.querySelectorAll("[data-apply]").forEach((button) => {
  button.addEventListener("click", () => {
    showToast(
      "Demo listing: " +
      button.dataset.apply +
      ". Live applications are not enabled yet."
    );
  });
});

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

menuToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => navLinks.classList.remove("open"));
});
/* English, Hindi and Telugu interface translations */
const translations = {
  en: {
    findJobs:"Find jobs", howWorks:"How it works", about:"About",
    mobileLabel:"Mobile number",
    heroTitle:"Good work starts with the right connection.",
    heroText:"Helping contractors find skilled workers and helping workers discover job opportunities around them.",
    explore:"Explore jobs", joinWorker:"Join as a worker",
    opportunities:"OPPORTUNITIES", findWork:"Find the work you need",
    searchHint:"Search sample job listings by skill or location.",
    skill:"Skill or job title", location:"Location", search:"Search jobs",
    recent:"Recent opportunities", simple:"SIMPLE PROCESS",
    twoWays:"One platform. Two ways to move forward.",
    purpose:"OUR PURPOSE",
    purposeTitle:"Making work connections easier.",
    getStarted:"GET STARTED", join:"Join LabourConnect",
    mobilePlaceholder:"10-digit mobile number"
  },
  hi: {
    findJobs:"काम खोजें", howWorks:"यह कैसे काम करता है", about:"हमारे बारे में",
    mobileLabel:"मोबाइल नंबर",
    heroTitle:"अच्छा काम सही संपर्क से शुरू होता है।",
    heroText:"ठेकेदारों को कुशल मजदूर खोजने और मजदूरों को आसपास काम ढूँढ़ने में मदद।",
    explore:"काम देखें", joinWorker:"मजदूर के रूप में जुड़ें",
    opportunities:"काम के अवसर", findWork:"अपने लिए काम खोजें",
    searchHint:"कौशल या स्थान के आधार पर नमूना नौकरियाँ खोजें।",
    skill:"कौशल या काम का नाम", location:"स्थान", search:"काम खोजें",
    recent:"हाल के अवसर", simple:"आसान प्रक्रिया",
    twoWays:"एक मंच। आगे बढ़ने के दो तरीके।",
    purpose:"हमारा उद्देश्य",
    purposeTitle:"काम के संपर्क आसान बनाना।",
    getStarted:"शुरू करें", join:"LabourConnect से जुड़ें",
    mobilePlaceholder:"10 अंकों का मोबाइल नंबर"
  },
  te: {
    findJobs:"పనులు వెతకండి", howWorks:"ఇది ఎలా పనిచేస్తుంది", about:"మా గురించి",
    mobileLabel:"మొబైల్ నంబర్",
    heroTitle:"మంచి పని సరైన పరిచయంతో ప్రారంభమవుతుంది.",
    heroText:"కాంట్రాక్టర్లు నైపుణ్యం కలిగిన కార్మికులను కనుగొనడానికి, కార్మికులు సమీపంలో పనులు వెతకడానికి సహాయం.",
    explore:"పనులు చూడండి", joinWorker:"కార్మికుడిగా చేరండి",
    opportunities:"ఉద్యోగ అవకాశాలు", findWork:"మీకు కావలసిన పని వెతకండి",
    searchHint:"నైపుణ్యం లేదా ప్రాంతం ఆధారంగా నమూనా పనులను వెతకండి.",
    skill:"నైపుణ్యం లేదా పని పేరు", location:"ప్రాంతం",
    search:"పనులు వెతకండి", recent:"ఇటీవలి అవకాశాలు",
    simple:"సులభమైన విధానం",
    twoWays:"ఒక వేదిక. ముందుకు వెళ్లడానికి రెండు మార్గాలు.",
    purpose:"మా లక్ష్యం",
    purposeTitle:"పని అవకాశాల పరిచయాలను సులభతరం చేయడం.",
    getStarted:"ప్రారంభించండి", join:"LabourConnectలో చేరండి",
    mobilePlaceholder:"10 అంకెల మొబైల్ నంబర్"
  }
};

function setLanguage(lang) {
  const t = translations[lang] || translations.en;
  document.documentElement.lang = lang;

  const set = (selector, key) => {
    const el = document.querySelector(selector);
    if (el && t[key]) el.textContent = t[key];
  };

  document.querySelectorAll("#navLinks a[href='#jobs']").forEach(el => el.textContent = t.findJobs);
  document.querySelectorAll("#navLinks a[href='#how']").forEach(el => el.textContent = t.howWorks);
  document.querySelectorAll("#navLinks a[href='#about']").forEach(el => el.textContent = t.about);

  set(".hero h1", "heroTitle");
  set(".hero-content>p", "heroText");

  document.querySelector(".hero-actions a").childNodes[0].textContent = t.explore + " ";
  document.querySelector(".hero-actions button").textContent = t.joinWorker;

  set(".search-panel .section-kicker", "opportunities");
  set(".search-panel h2", "findWork");
  set(".search-panel>div:first-child p", "searchHint");

  const labels = document.querySelectorAll(".search-form label");
  if (labels[0]) labels[0].querySelector("span").textContent = t.skill;
  if (labels[1]) labels[1].querySelector("span").textContent = t.location;

  document.querySelector(".search-form button").textContent = t.search;
  set(".job-results-heading h3", "recent");
  set(".how-section .section-kicker", "simple");
  set(".section-heading h2", "twoWays");
  set(".about-section .section-kicker", "purpose");
  set(".about-section h2", "purposeTitle");
  set(".cta-section .section-kicker", "getStarted");

  document.querySelectorAll("[data-open='register']").forEach(el => {
    if (el.textContent.includes("Join LabourConnect")) el.textContent = t.join;
  });

  const mobile = document.querySelector("#accountForm label");
  const mobileInput = document.getElementById("accountPhone");

  if (mobile) mobile.childNodes[0].textContent = t.mobileLabel;
  if (mobileInput) mobileInput.placeholder = t.mobilePlaceholder;
}

document.getElementById("languageSelect").addEventListener("change", e => {
  setLanguage(e.target.value);
});


/* Interactive demonstrations for the ten LabourConnect features */

const crewForm = document.getElementById("crewForm");

crewForm.addEventListener("submit", event => {
  event.preventDefault();

  const fields = [
    ["Masons", "crewMasons"],
    ["Helpers", "crewHelpers"],
    ["Electricians", "crewElectricians"]
  ];

  const parts = fields.map(([label, id]) =>
    label + ": " + Number(document.getElementById(id).value || 0)
  );

  const total = fields.reduce((sum, item) =>
    sum + Number(document.getElementById(item[1]).value || 0), 0
  );

  document.getElementById("crewOutput").textContent = total
    ? "Sample crew for " +
      (document.getElementById("crewLocation").value.trim() || "your project") +
      " — " + total + " positions. " + parts.join(" · ") +
      ". Each worker would need to accept individually in a real service."
    : "Add at least one role to build a crew.";
});


const radarArea = document.getElementById("radarArea");
const radarRadius = document.getElementById("radarRadius");

function updateRadar() {
  const area = radarArea.value;

  const cards = jobCards.filter(card =>
    area === "all" || card.dataset.location.includes(area)
  );

  document.getElementById("radarOutput").textContent = cards.length
    ? cards.length + " sample listing(s) in the selected area: " +
      cards.map(card => card.querySelector("h3").textContent).join(", ") +
      ". The " + radarRadius.value +
      " km radius is a demo filter only; exact distances are not calculated."
    : "No sample listings in this area. Try another area.";
}

radarArea.addEventListener("change", updateRadar);
radarRadius.addEventListener("change", updateRadar);


document.getElementById("passportForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = document.getElementById("passportName").value.trim() || "Demo worker";

  document.getElementById("passportOutput").textContent =
    name + " · " +
    document.getElementById("passportSkill").value + " · " +
    document.getElementById("passportExperience").value +
    " experience · Languages: " +
    (document.getElementById("passportLanguages").value.trim() || "Not added") +
    ". Sample profile preview only; no identity or skill verification.";
});


document.getElementById("voiceStart").addEventListener("click", () => {
  const output = document.getElementById("voiceOutput");

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    output.textContent =
      "Speech recognition is not supported in this browser. Use the job search field to type instead.";
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = document.getElementById("voiceLanguage").value;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  output.textContent = "Listening… Please speak a job title.";

  recognition.onresult = event => {
    const phrase = event.results[0][0].transcript;

    output.textContent =
      "Heard: " + phrase +
      ". The phrase has been placed in the job search field; press Search jobs to filter sample listings.";

    skillSearch.value = phrase;
    locationSearch.value = "";
  };

  recognition.onerror = () => {
    output.textContent =
      "Voice input could not be completed. Check microphone permission or type your search instead.";
  };

  recognition.start();
});


document.getElementById("wageForm").addEventListener("submit", event => {
  event.preventDefault();

  const days = Number(document.getElementById("wageDays").value);
  const rate = Number(document.getElementById("dailyWage").value);
  const total = days * rate;

  document.getElementById("wageOutput").textContent =
    days + " days × ₹" + rate.toLocaleString("en-IN") +
    " = ₹" + total.toLocaleString("en-IN") +
    ". Status selected: " +
    document.getElementById("paymentStatus").value +
    ". Demo calculation only; no payment is recorded.";
});


document.getElementById("safetyReview").addEventListener("click", () => {
  const checks = [...document.querySelectorAll(".safety-checks input")];
  const done = checks.filter(input => input.checked).length;

  document.getElementById("safetyOutput").textContent =
    done + " of " + checks.length +
    " reminders checked. Review every site-specific hazard with the responsible supervisor; this checklist is not a substitute for proper training or site safety procedures.";
});


document.getElementById("crewSaveForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = document.getElementById("savedCrewName").value.trim();
  const skills = document.getElementById("savedCrewSkills").value.trim();

  if (!name || !skills) {
    showToast("Enter a crew name and skills first.");
    return;
  }

  let crews = [];

  try {
    crews = JSON.parse(localStorage.getItem("lcDemoCrews") || "[]");
  } catch {}

  crews.push({ name, skills });

  try {
    localStorage.setItem("lcDemoCrews", JSON.stringify(crews));
    renderSavedCrews();
    event.target.reset();
  } catch {
    showToast("Could not save this demo crew in this browser.");
  }
});


function renderSavedCrews() {
  const list = document.getElementById("savedCrewList");
  let crews = [];

  try {
    crews = JSON.parse(localStorage.getItem("lcDemoCrews") || "[]");
  } catch {}

  list.replaceChildren();

  if (!crews.length) {
    const li = document.createElement("li");
    li.textContent = "No demo crews saved yet.";
    list.append(li);
    return;
  }

  crews.forEach(crew => {
    const li = document.createElement("li");
    li.textContent = crew.name + " — " + crew.skills;
    list.append(li);
  });
}

renderSavedCrews();


document.getElementById("fairForm").addEventListener("submit", event => {
  event.preventDefault();

  const wage = Number(document.getElementById("fairWage").value);
  const days = Number(document.getElementById("fairDays").value);
  const fee = Number(document.getElementById("fairFee").value);

  const workerTotal = wage * days;

  document.getElementById("fairOutput").textContent =
    "Worker wage: ₹" + workerTotal.toLocaleString("en-IN") +
    " · Separately stated platform fee: ₹" + fee.toLocaleString("en-IN") +
    " · Total shown: ₹" + (workerTotal + fee).toLocaleString("en-IN") +
    ". Agree all terms before work starts; this is an example breakdown.";
});


document.getElementById("matchForm").addEventListener("submit", event => {
  event.preventDefault();

  const skill = document.getElementById("matchSkill").value;
  const area = document.getElementById("matchArea").value;

  const matches = jobCards.filter(card =>
    card.dataset.skill.includes(skill) &&
    (area === "all" || card.dataset.location.includes(area))
  );

  document.getElementById("matchOutput").textContent = matches.length
    ? "Sample matches: " +
      matches.map(card =>
        card.querySelector("h3").textContent +
        " (" +
        card.querySelector(".job-meta").textContent.replace("⌖ ", "") +
        ")"
      ).join("; ") +
      ". These are job listings, not verified workers."
    : "No sample matches found. Try another skill or area.";
});


/* Worker and contractor dashboard switching */

function setDashboardRole(role) {
  const worker = String(role).toLowerCase() !== "contractor";

  const workerPanel = document.getElementById("workerDashboard");
  const contractorPanel = document.getElementById("contractorDashboard");

  if (!workerPanel || !contractorPanel) return;

  workerPanel.hidden = !worker;
  contractorPanel.hidden = worker;

  document.getElementById("dashboardTitle").textContent =
    "Welcome to your " + (worker ? "Worker" : "Contractor") + " dashboard";

  document.getElementById("dashboardIntro").textContent = worker
    ? "Explore work opportunities and organise your skills in one place."
    : "Plan project teams, review sample matches and organise work costs.";

  document.querySelectorAll("[data-dashboard]").forEach(button => {
    const active =
      button.dataset.dashboard === (worker ? "Worker" : "Contractor");

    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  try {
    localStorage.setItem("lcDashboardRole", worker ? "Worker" : "Contractor");
  } catch {}
}

document.querySelectorAll("[data-dashboard]").forEach(button => {
  button.addEventListener("click", () =>
    setDashboardRole(button.dataset.dashboard)
  );
});

let preferredDashboard = "Worker";

try {
  const savedDemoUser = JSON.parse(
    localStorage.getItem("labourConnectDemoUser") || "null"
  );

  preferredDashboard =
    savedDemoUser && savedDemoUser.role
      ? savedDemoUser.role
      : (localStorage.getItem("lcDashboardRole") || "Worker");
} catch {}

setDashboardRole(preferredDashboard);
async function restoreLoginSession() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/me`, {
      method: "GET",
      credentials: "include"
    });

    if (!response.ok) return;

    const user = await response.json();

    localStorage.setItem("labourConnectDemoUser", JSON.stringify(user));
    setDashboardRole(user.role);
    document.getElementById("dashboards").scrollIntoView({
  behavior: "smooth"
});
  } catch (error) {
    console.error("Session restoration failed:", error);
  }
}

restoreLoginSession();


/* Supervised crew-observation learning preview */

const shadowForm = document.getElementById("shadowForm");

if (shadowForm) {
  shadowForm.addEventListener("submit", event => {
    event.preventDefault();

    const output = document.getElementById("shadowOutput");

    if (!document.getElementById("shadowAdult").checked) {
      output.textContent =
        "This proposed site-observation option is for adult learners aged 18 or older only.";
      return;
    }

    const trade = document.getElementById("shadowTrade").value;
    const area =
      document.getElementById("shadowArea").value.trim() ||
      "your preferred area";

    output.textContent =
      "Demo request preview: you are interested in observing " +
      trade + " work near " + area +
      ". A real programme would require a confirmed slot, site-manager approval, a named adult supervisor, safety induction and appropriate protective equipment. No visit has been booked.";
  });
}


/* Digital work agreement: demo preview only, not authenticated signing */

let currentAgreementText = "";

const agreementForm = document.getElementById("agreementForm");
const printAgreementButton = document.getElementById("printAgreement");

function escapeAgreementHTML(value) {
  return String(value).replace(/[&<>"']/g, char =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char])
  );
}

if (agreementForm) {
  agreementForm.addEventListener("submit", event => {
    event.preventDefault();

    const value = id => document.getElementById(id).value.trim();

    const contractor = value("agreementContractor");
    const worker = value("agreementWorker");
    const trade = value("agreementTrade");
    const location = value("agreementLocation");
    const wage = Number(value("agreementWage"));
    const days = Number(value("agreementDays"));

    if (
      !contractor || !worker || !trade || !location ||
      !value("agreementPaymentDate") || wage < 1 || days < 1
    ) return;

    if (
      !document.getElementById("contractorAdult").checked ||
      !document.getElementById("workerAdult").checked ||
      !document.getElementById("agreementConsent").checked
    ) {
      document.getElementById("agreementPreview").textContent =
        "Both parties must be adults aged 18 or older and confirm that they freely agree. This demo cannot be used to create an agreement for a minor.";

      printAgreementButton.disabled = true;
      currentAgreementText = "";
      return;
    }

    const total = wage * days;
    const other = value("agreementOther") || "None stated.";

    currentAgreementText = [
      "LABOURCONNECT — SAMPLE WORK AGREEMENT PREVIEW",
      "Generated on: " + new Date().toLocaleString("en-IN"),
      "",
      "Contractor: " + contractor,
      "Worker: " + worker,
      "Work / trade: " + trade,
      "Work location: " + location,
      "Agreed daily wage: ₹" + wage.toLocaleString("en-IN"),
      "Expected workdays: " + days,
      "Estimated total at the stated rate: ₹" + total.toLocaleString("en-IN"),
      "Payment schedule: " + value("agreementSchedule"),
      "Payment date / details: " + value("agreementPaymentDate"),
      "Other agreed terms: " + other,
      "",
      "WAGE CLARITY: The stated wage is the agreed rate for the described work. Any proposed change must be discussed and recorded with the free agreement of both parties before it takes effect, and must comply with applicable law. No unlawful deduction is authorised by this document.",
      "RECORD KEEPING: Both parties should keep their own copy and retain relevant attendance, work-completion and payment records.",
      "DISPUTES: If wages are unpaid or unlawfully reduced, the worker may seek advice from the appropriate labour authority or a qualified lawyer. This preview does not guarantee a legal outcome and does not waive statutory rights.",
      "",
      "ACKNOWLEDGEMENT: The form records that both parties indicated they were adults and agreed to review these terms. This prototype does NOT authenticate identity, capture electronic signatures, or prove who clicked the checkboxes.",
      "",
      "IMPORTANT: SAMPLE ONLY — NOT A LAWYER-APPROVED OR AUTHENTICATED LEGAL CONTRACT. Have the wording and signing process reviewed by an Indian labour-law professional before real-world use."
    ].join("\n");

    document.getElementById("agreementPreview").textContent =
      currentAgreementText;

    printAgreementButton.disabled = false;
  });

  printAgreementButton.addEventListener("click", () => {
    if (!currentAgreementText) return;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      showToast("Allow pop-ups to print this preview, or try again from your browser settings.");
      return;
    }

    printWindow.document.write(
      "<!doctype html><html><head><meta charset=\"utf-8\">" +
      "<title>Work Agreement Preview</title>" +
      "<style>body{font:14px/1.6 Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 24px;color:#222}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}</style>" +
      "</head><body><pre>" +
      escapeAgreementHTML(currentAgreementText) +
      "</pre></body></html>"
    );

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  });
}