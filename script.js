(function () {
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
const accountEmail = document.getElementById("accountEmail");
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
  accountEmail.required = true;
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

  (accountMode === "login" ? accountEmail : accountName).focus();
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

/* Supabase Auth: email + password. Public publishable key only. */
const SUPABASE_URL = "https://qpmvfruulxiosovschdk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_2CRIid36vvgj7Giq86Apcg_Zlmwkbr_";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

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
    email: user.email || "",
    role: displayRole,
    user_id: user.id
  }));
  setDashboardRole(displayRole);
  await loadAccountProfile();
  await loadLiveJobs();
  await loadApplications();
  await loadAgreements();
  await loadAttendanceAndPayments();
}

accountForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = accountEmail.value.trim().toLowerCase();
  const password = accountPassword.value;

  try {
    if (accountMode === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
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
      email,
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
    accountEmail.value = email;
    accountPassword.focus();

    showToast(data.session
      ? "Account created. You are signed in."
      : "Account created, but no session was returned. Check that phone confirmation is disabled in Supabase Auth settings before logging in.");
    if (data.session) await showSignedInUser(data.user);
  } catch (error) {
    showToast(error.message || "Authentication failed. Please try again.");
  }
});

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" && session?.user) {
    Promise.resolve().then(() => showSignedInUser(session.user));
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
    emailLabel:"Email address",
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
    emailPlaceholder:"you@example.com"
  },
  hi: {
    findJobs:"काम खोजें", howWorks:"यह कैसे काम करता है", about:"हमारे बारे में",
    emailLabel:"ईमेल पता",
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
    emailPlaceholder:"you@example.com"
  },
  te: {
    findJobs:"పనులు వెతకండి", howWorks:"ఇది ఎలా పనిచేస్తుంది", about:"మా గురించి",
    emailLabel:"ఇమెయిల్ చిరునామా",
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
    emailPlaceholder:"you@example.com"
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

  const emailInput = document.getElementById("accountEmail");
  if (emailInput) emailInput.placeholder = "you@example.com";
}

document.getElementById("languageSelect").addEventListener("change", e => {
  setLanguage(e.target.value);
});



/* Supabase-backed profile management */
async function loadAccountProfile() {
  const output = document.getElementById("profileOutput");
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) {
    output.textContent = "Sign in to load your account profile.";
    return;
  }
  const { data: base, error: baseError } = await supabase
    .from("profiles").select("role").eq("user_id", user.id).single();
  if (baseError) { output.textContent = baseError.message; return; }

  const workerForm = document.getElementById("workerProfileForm");
  const contractorForm = document.getElementById("contractorProfileForm");
  workerForm.hidden = base.role !== "worker";
  contractorForm.hidden = base.role !== "contractor";

  if (base.role === "worker") {
    const { data, error } = await supabase.from("worker_profiles")
      .select("primary_skill,experience_years,preferred_area,languages")
      .eq("user_id", user.id).single();
    if (error) { output.textContent = error.message; return; }
    document.getElementById("profileSkill").value = data.primary_skill || "";
    document.getElementById("profileExperience").value = data.experience_years ?? 0;
    document.getElementById("profileArea").value = data.preferred_area || "";
    document.getElementById("profileLanguages").value = data.languages || "";
  } else {
    const { data, error } = await supabase.from("contractor_profiles")
      .select("organization_name,work_area").eq("user_id", user.id).single();
    if (error) { output.textContent = error.message; return; }
    document.getElementById("profileOrganization").value = data.organization_name || "";
    document.getElementById("contractorWorkArea").value = data.work_area || "";
  }
  output.textContent = "Profile loaded from your Supabase account.";
}
document.getElementById("workerProfileForm").addEventListener("submit", async event => {
  event.preventDefault();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) { showToast("Please sign in first."); return; }
  const { error } = await supabase.from("worker_profiles").update({
    primary_skill: document.getElementById("profileSkill").value.trim(),
    experience_years: Number(document.getElementById("profileExperience").value || 0),
    preferred_area: document.getElementById("profileArea").value.trim(),
    languages: document.getElementById("profileLanguages").value.trim()
  }).eq("user_id", authData.user.id);
  document.getElementById("profileOutput").textContent = error
    ? "Could not save profile: " + error.message
    : "Worker profile saved successfully.";
});
document.getElementById("contractorProfileForm").addEventListener("submit", async event => {
  event.preventDefault();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) { showToast("Please sign in first."); return; }
  const { error } = await supabase.from("contractor_profiles").update({
    organization_name: document.getElementById("profileOrganization").value.trim(),
    work_area: document.getElementById("contractorWorkArea").value.trim()
  }).eq("user_id", authData.user.id);
  document.getElementById("profileOutput").textContent = error
    ? "Could not save profile: " + error.message
    : "Contractor profile saved successfully.";
});


/* Supabase-backed job board and contractor job management */
function escapeJobText(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
}
async function loadLiveJobs() {
  const output = document.getElementById("jobOutput");
  const list = document.getElementById("liveJobList");
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) {
    output.textContent = "Please sign in to browse live jobs.";
    list.replaceChildren();
    return;
  }
  const { data: profile } = await supabase.from("profiles")
    .select("role").eq("user_id", user.id).single();
  document.getElementById("createJobForm").hidden = profile?.role !== "contractor";
  const { data: jobs, error } = await supabase.from("jobs")
    .select("job_id,contractor_id,job_title,description,work_location,daily_wage,workers_required,start_date,end_date,status,created_at")
    .eq("status", "open").order("created_at", { ascending: false });
  if (error) { output.textContent = "Could not load jobs: " + error.message; return; }
  list.replaceChildren();
  if (!jobs?.length) {
    output.textContent = "No open jobs yet. Contractors can post the first listing.";
    return;
  }
  output.textContent = jobs.length + " open job(s) available.";
  jobs.forEach(job => {
    const card = document.createElement("article");
    card.className = "job-card";
    const own = job.contractor_id === user.id;
    card.innerHTML = `
      <div class="job-top"><span class="job-tag">Live listing</span><span class="job-type">${own ? "Your job" : "Open"}</span></div>
      <h3>${escapeJobText(job.job_title)}</h3>
      <p class="job-meta">⌖ ${escapeJobText(job.work_location)}</p>
      <p class="job-description">${escapeJobText(job.description || "No additional description.")}</p>
      <div class="job-bottom"><strong>₹${Number(job.daily_wage).toLocaleString("en-IN")} <small>/ day</small></strong><span>${Number(job.workers_required)} worker(s)</span></div>
      ${job.start_date ? `<p class="job-meta">Start: ${escapeJobText(job.start_date)}</p>` : ""}
      ${own ? `<button class="text-button" type="button" data-close-job="${job.job_id}">Close listing</button>` : `<button class="text-button" type="button" data-apply-job="${job.job_id}">Apply for this job</button>` }
    `;
    list.append(card);
  });
  list.querySelectorAll("[data-apply-job]").forEach(button => button.addEventListener("click", () => applyToJob(button.dataset.applyJob)));
  list.querySelectorAll("[data-close-job]").forEach(button => {
    button.addEventListener("click", async () => {
      const id = Number(button.dataset.closeJob);
      const { error } = await supabase.from("jobs")
        .update({ status: "closed" }).eq("job_id", id).eq("contractor_id", user.id);
      if (error) showToast("Could not close job: " + error.message);
      else { showToast("Job listing closed."); await loadLiveJobs(); }
    });
  });
}
document.getElementById("createJobForm").addEventListener("submit", async event => {
  event.preventDefault();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) { showToast("Please sign in as a contractor."); return; }
  const title = document.getElementById("newJobTitle").value.trim();
  const location = document.getElementById("newJobLocation").value.trim();
  const wage = Number(document.getElementById("newJobWage").value);
  const count = Number(document.getElementById("newJobCount").value);
  const start = document.getElementById("newJobStart").value || null;
  const end = document.getElementById("newJobEnd").value || null;
  if (end && start && end < start) { showToast("End date cannot be before start date."); return; }
  const { error } = await supabase.from("jobs").insert({
    contractor_id: authData.user.id,
    job_title: title,
    description: document.getElementById("newJobDescription").value.trim(),
    work_location: location,
    daily_wage: wage,
    workers_required: count,
    start_date: start,
    end_date: end
  });
  if (error) { document.getElementById("jobOutput").textContent = "Could not post job: " + error.message; return; }
  event.target.reset();
  showToast("Job posted successfully.");
  await loadLiveJobs();
});


async function loadApplications() {
  const output = document.getElementById("applicationOutput");
  const list = document.getElementById("applicationList");
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  list.replaceChildren();
  if (!user) { output.textContent = "Please sign in to manage applications."; return; }
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  if (profile?.role === "worker") {
    const { data: apps, error } = await supabase.from("applications")
      .select("application_id,status,applied_at,job_id,jobs(job_title,work_location,daily_wage)")
      .eq("worker_id", user.id).order("applied_at", { ascending: false });
    if (error) { output.textContent = "Could not load your applications: " + error.message; return; }
    output.textContent = apps.length ? "Your applications" : "You have not applied to any jobs yet.";
    apps.forEach(app => {
      const job = app.jobs || {};
      const card = document.createElement("article"); card.className = "job-card";
      card.innerHTML = `<span class="job-tag">Application</span><h3>${escapeJobText(job.job_title || "Job listing")}</h3><p class="job-meta">${escapeJobText(job.work_location || "")}</p><p>Status: <strong>${escapeJobText(app.status)}</strong></p>`;
      list.append(card);
    });
    return;
  }
  if (profile?.role !== "contractor") { output.textContent = "This account cannot manage applications."; return; }
  const { data: jobs, error: jobsError } = await supabase.from("jobs")
    .select("job_id,job_title").eq("contractor_id", user.id);
  if (jobsError) { output.textContent = "Could not load your jobs: " + jobsError.message; return; }
  const ids = (jobs || []).map(job => job.job_id);
  if (!ids.length) { output.textContent = "Post a job first to receive applications."; return; }
  const { data: apps, error } = await supabase.from("applications")
    .select("application_id,worker_id,status,applied_at,job_id")
    .in("job_id", ids).order("applied_at", { ascending: false });
  if (error) { output.textContent = "Could not load applications: " + error.message; return; }
  if (!apps?.length) { output.textContent = "No applications received yet."; return; }
  const names = await supabase.from("profiles").select("user_id,full_name").in("user_id", [...new Set(apps.map(a => a.worker_id))]);
  const nameMap = new Map((names.data || []).map(p => [p.user_id, p.full_name]));
  const jobMap = new Map(jobs.map(j => [j.job_id, j.job_title]));
  output.textContent = apps.length + " application(s) received.";
  apps.forEach(app => {
    const card = document.createElement("article"); card.className = "job-card";
    const name = nameMap.get(app.worker_id) || "Worker";
    card.innerHTML = `<span class="job-tag">Application #${app.application_id}</span><h3>${escapeJobText(name)}</h3><p class="job-meta">${escapeJobText(jobMap.get(app.job_id) || "Your job")}</p><p>Status: <strong>${escapeJobText(app.status)}</strong></p><label>Update status <select data-app-status="${app.application_id}"><option value="pending">Pending</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option></select></label>`;
    const select = card.querySelector("select"); select.value = app.status;
    select.addEventListener("change", async () => {
      const { error } = await supabase.from("applications").update({status:select.value}).eq("application_id", app.application_id);
      if (error) { showToast("Could not update application: " + error.message); select.value = app.status; }
      else { showToast("Application status updated."); app.status = select.value; }
    });
    list.append(card);
  });
}
async function applyToJob(jobId) {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) { showToast("Please sign in as a worker to apply."); return; }
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", authData.user.id).single();
  if (profile?.role !== "worker") { showToast("Only worker accounts can apply."); return; }
  const { error } = await supabase.from("applications").insert({job_id:Number(jobId),worker_id:authData.user.id});
  if (error) {
    showToast(error.code === "23505" ? "You have already applied to this job." : "Could not apply: " + error.message);
  } else {
    showToast("Application submitted.");
    await loadApplications();
  }
}


async function loadAgreements() {
  const output = document.getElementById("agreementOutput");
  const list = document.getElementById("agreementList");
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  list.replaceChildren();
  if (!user) { output.textContent = "Please sign in to view agreements."; return; }
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  const contractor = profile?.role === "contractor";
  const query = supabase.from("agreements")
    .select("agreement_id,job_id,contractor_id,worker_id,agreed_daily_wage,expected_days,payment_schedule,terms_text,status,created_at")
    .order("created_at", {ascending:false});
  const { data: agreements, error } = await query;
  if (error) { output.textContent = "Could not load agreements: " + error.message; return; }
  const mine = (agreements || []).filter(a => contractor ? a.contractor_id === user.id : a.worker_id === user.id);
  output.textContent = mine.length ? mine.length + " agreement(s)." : "No agreements yet.";
  if (contractor) {
    const { data: jobs } = await supabase.from("jobs").select("job_id,job_title").eq("contractor_id", user.id);
    const accepted = await supabase.from("applications")
      .select("application_id,job_id,worker_id,status").eq("status","accepted");
    const jobMap = new Map((jobs || []).map(j => [j.job_id,j.job_title]));
    const applicants = (accepted.data || []).filter(a => jobMap.has(a.job_id));
    const known = new Set(mine.map(a => a.job_id + ":" + a.worker_id));
    for (const app of applicants) {
      if (known.has(app.job_id + ":" + app.worker_id)) continue;
      const card = document.createElement("article"); card.className = "job-card";
      card.innerHTML = `<span class="job-tag">Accepted applicant</span><h3>${escapeJobText(jobMap.get(app.job_id))}</h3><p>Worker ID: ${escapeJobText(app.worker_id.slice(0,8))}…</p><form class="agreement-create-form tool-form" data-job="${app.job_id}" data-worker="${app.worker_id}">
        <label>Agreed daily wage (₹)<input name="wage" type="number" min="1" max="1000000" required></label>
        <label>Expected days<input name="days" type="number" min="1" max="3650" required></label>
        <label>Payment schedule<input name="schedule" maxlength="100" placeholder="e.g. Weekly"></label>
        <label>Additional terms<textarea name="terms" rows="2" maxlength="3000"></textarea></label>
        <button class="button button-primary" type="submit">Create draft agreement</button></form>`;
      list.append(card);
    }
  }
  mine.forEach(a => {
    const card = document.createElement("article"); card.className = "job-card";
    card.innerHTML = `<span class="job-tag">Agreement #${a.agreement_id}</span><h3>₹${Number(a.agreed_daily_wage).toLocaleString("en-IN")} / day</h3><p>${a.expected_days} expected day(s) · ${escapeJobText(a.payment_schedule || "Payment schedule not specified")}</p><p>Status: <strong>${escapeJobText(a.status)}</strong></p><p>${escapeJobText(a.terms_text || "No additional terms.")}</p>`;
    if (!contractor && ["draft","pending"].includes(a.status)) {
      const accept = document.createElement("button"); accept.type="button"; accept.className="button button-primary"; accept.textContent="Accept";
      const reject = document.createElement("button"); reject.type="button"; reject.className="text-button"; reject.textContent="Reject";
      const respond = async status => {
        const { error } = await supabase.from("agreements").update({status,accepted_at:new Date().toISOString()}).eq("agreement_id",a.agreement_id);
        if (error) showToast("Could not respond: "+error.message);
        else { showToast("Agreement "+status+"."); await loadAgreements(); }
      };
      accept.addEventListener("click",()=>respond("accepted")); reject.addEventListener("click",()=>respond("rejected"));
      card.append(accept,reject);
    }
    list.append(card);
  });
  list.querySelectorAll(".agreement-create-form").forEach(form => form.addEventListener("submit",async event => {
    event.preventDefault();
    const fields = new FormData(form);
    const { error } = await supabase.from("agreements").insert({
      job_id:Number(form.dataset.job), contractor_id:user.id, worker_id:form.dataset.worker,
      agreed_daily_wage:Number(fields.get("wage")), expected_days:Number(fields.get("days")),
      payment_schedule:String(fields.get("schedule")||"").trim()||null,
      terms_text:String(fields.get("terms")||"").trim()||null,status:"draft"
    });
    if(error) showToast("Could not create agreement: "+error.message);
    else { showToast("Draft agreement created."); await loadAgreements(); }
  }));
}

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

/* Supabase-backed attendance and wage record management (no money transfers). */
async function getMyAgreements() {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { user:null, agreements:[], role:null };
  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id",authData.user.id).single();
  const column = profile?.role === "contractor" ? "contractor_id" : "worker_id";
  const { data, error } = await supabase.from("agreements")
    .select("agreement_id,job_id,contractor_id,worker_id,agreed_daily_wage,expected_days,status,created_at")
    .eq(column,authData.user.id).order("created_at",{ascending:false});
  if(error) throw error;
  return {user:authData.user,agreements:data||[],role:profile?.role};
}
function fillAgreementOptions(select, agreements) {
  select.replaceChildren();
  agreements.filter(a=>a.status==="accepted").forEach(a=>{
    const option=document.createElement("option");
    option.value=a.agreement_id;
    option.textContent="Agreement #"+a.agreement_id+" · ₹"+Number(a.agreed_daily_wage).toLocaleString("en-IN")+"/day";
    select.append(option);
  });
  select.disabled=!select.options.length;
}
async function loadAttendanceAndPayments() {
  const ao=document.getElementById("attendanceOutput");
  const al=document.getElementById("attendanceList");
  const po=document.getElementById("paymentOutput");
  const pl=document.getElementById("paymentList");
  try {
    const {user,agreements,role}=await getMyAgreements();
    if(!user){ao.textContent="Sign in to view attendance records.";po.textContent="Sign in to view wage records.";return;}
    const accepted=agreements.filter(a=>a.status==="accepted");
    const af=document.getElementById("attendanceForm");
    const pf=document.getElementById("paymentForm");
    af.hidden=role!=="contractor"||!accepted.length;
    pf.hidden=role!=="contractor"||!accepted.length;
    fillAgreementOptions(document.getElementById("attendanceAgreement"),accepted);
    fillAgreementOptions(document.getElementById("paymentAgreement"),accepted);
    const ids=agreements.map(a=>a.agreement_id);
    if(!ids.length){ao.textContent="No work agreements yet.";po.textContent="No work agreements yet.";return;}
    const [{data:attendance,error:ae},{data:payments,error:pe}]=await Promise.all([
      supabase.from("attendance").select("attendance_id,agreement_id,work_date,attendance_status,notes").in("agreement_id",ids).order("work_date",{ascending:false}),
      supabase.from("payments").select("payment_id,agreement_id,amount,payment_date,payment_method,status,notes").in("agreement_id",ids).order("payment_date",{ascending:false})
    ]);
    if(ae) throw ae;if(pe) throw pe;
    al.replaceChildren();pl.replaceChildren();
    (attendance||[]).forEach(row=>{
      const card=document.createElement("article");card.className="job-card";
      const date=escapeJobText(row.work_date);
      card.innerHTML="<h3>Agreement #"+Number(row.agreement_id)+"</h3><p class='job-meta'>"+date+"</p><p>"+escapeJobText(row.attendance_status.replace("_"," "))+"</p><p>"+escapeJobText(row.notes||"")+"</p>";
      al.append(card);
    });
    (payments||[]).forEach(row=>{
      const card=document.createElement("article");card.className="job-card";
      card.innerHTML="<h3>₹"+Number(row.amount).toLocaleString("en-IN")+"</h3><p class='job-meta'>Agreement #"+Number(row.agreement_id)+" · "+escapeJobText(row.payment_date||"Date not set")+"</p><p>Status: "+escapeJobText(row.status)+"</p><p>"+escapeJobText(row.payment_method||"")+" "+escapeJobText(row.notes||"")+"</p>";
      pl.append(card);
    });
    ao.textContent=(attendance||[]).length+" attendance record(s).";
    po.textContent=(payments||[]).length+" wage payment record(s).";
  } catch(error){ao.textContent="Could not load attendance: "+error.message;po.textContent="Could not load payments: "+error.message;}
}
document.getElementById("attendanceForm").addEventListener("submit",async event=>{
  event.preventDefault();
  const {data:authData}=await supabase.auth.getUser();
  if(!authData.user){showToast("Please sign in first.");return;}
  const agreementId=Number(document.getElementById("attendanceAgreement").value);
  const {error}=await supabase.from("attendance").insert({
    agreement_id:agreementId,
    work_date:document.getElementById("attendanceDate").value,
    attendance_status:document.getElementById("attendanceStatus").value,
    notes:document.getElementById("attendanceNotes").value.trim()||null
  });
  if(error)showToast("Could not save attendance: "+error.message);
  else{showToast("Attendance record saved.");document.getElementById("attendanceNotes").value="";await loadAttendanceAndPayments();}
});
document.getElementById("paymentForm").addEventListener("submit",async event=>{
  event.preventDefault();
  const {data:authData}=await supabase.auth.getUser();
  if(!authData.user){showToast("Please sign in first.");return;}
  const {error}=await supabase.from("payments").insert({
    agreement_id:Number(document.getElementById("paymentAgreement").value),
    amount:Number(document.getElementById("paymentAmount").value),
    payment_date:document.getElementById("paymentDate").value,
    payment_method:document.getElementById("paymentMethod").value.trim()||null,
    status:document.getElementById("paymentStatusRecord").value,
    notes:document.getElementById("paymentNotes").value.trim()||null
  });
  if(error)showToast("Could not save payment record: "+error.message);
  else{showToast("Wage record saved. No money was transferred.");document.getElementById("paymentForm").reset();await loadAttendanceAndPayments();}
});

})();
