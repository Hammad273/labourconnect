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
function openModal(mode) {
  modalTitle.textContent = mode === "login" ? "Log in to the demo" : "Create your demo account";
  backdrop.hidden = false;
  document.getElementById("accountName").focus();
}
function closeModal() { backdrop.hidden = true; }

document.querySelectorAll("[data-open]").forEach((button) => {
  button.addEventListener("click", () => openModal(button.dataset.open));
});
document.getElementById("modalClose").addEventListener("click", closeModal);
backdrop.addEventListener("click", (event) => { if (event.target === backdrop) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeModal(); });

accountForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const demoUser = {
    name: document.getElementById("accountName").value.trim(),
    phone: document.getElementById("accountPhone").value.trim(),
    role: document.getElementById("accountRole").value
  };
  try {
    localStorage.setItem("labourConnectDemoUser", JSON.stringify(demoUser));
    closeModal();
    showToast("Welcome, " + demoUser.name + "! Demo profile saved in this browser. No OTP or real login is enabled.");
    accountForm.reset();
  } catch {
    closeModal();
    showToast("This browser could not save the demo profile.");
  }
});

document.querySelectorAll("[data-apply]").forEach((button) => {
  button.addEventListener("click", () => showToast("Demo listing: " + button.dataset.apply + ". Live applications are not enabled yet."));
});

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
menuToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});
navLinks.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => navLinks.classList.remove("open")));
/* English, Hindi and Telugu interface translations */
const translations = {
  en:{findJobs:"Find jobs",howWorks:"How it works",about:"About",mobileLabel:"Mobile number",heroTitle:"Good work starts with the right connection.",heroText:"Helping contractors find skilled workers and helping workers discover job opportunities around them.",explore:"Explore jobs",joinWorker:"Join as a worker",opportunities:"OPPORTUNITIES",findWork:"Find the work you need",searchHint:"Search sample job listings by skill or location.",skill:"Skill or job title",location:"Location",search:"Search jobs",recent:"Recent opportunities",simple:"SIMPLE PROCESS",twoWays:"One platform. Two ways to move forward.",purpose:"OUR PURPOSE",purposeTitle:"Making work connections easier.",getStarted:"GET STARTED",join:"Join LabourConnect",mobilePlaceholder:"10-digit mobile number"},
  hi:{findJobs:"काम खोजें",howWorks:"यह कैसे काम करता है",about:"हमारे बारे में",mobileLabel:"मोबाइल नंबर",heroTitle:"अच्छा काम सही संपर्क से शुरू होता है।",heroText:"ठेकेदारों को कुशल मजदूर खोजने और मजदूरों को आसपास काम ढूँढ़ने में मदद।",explore:"काम देखें",joinWorker:"मजदूर के रूप में जुड़ें",opportunities:"काम के अवसर",findWork:"अपने लिए काम खोजें",searchHint:"कौशल या स्थान के आधार पर नमूना नौकरियाँ खोजें।",skill:"कौशल या काम का नाम",location:"स्थान",search:"काम खोजें",recent:"हाल के अवसर",simple:"आसान प्रक्रिया",twoWays:"एक मंच। आगे बढ़ने के दो तरीके।",purpose:"हमारा उद्देश्य",purposeTitle:"काम के संपर्क आसान बनाना।",getStarted:"शुरू करें",join:"LabourConnect से जुड़ें",mobilePlaceholder:"10 अंकों का मोबाइल नंबर"},
  te:{findJobs:"పనులు వెతకండి",howWorks:"ఇది ఎలా పనిచేస్తుంది",about:"మా గురించి",mobileLabel:"మొబైల్ నంబర్",heroTitle:"మంచి పని సరైన పరిచయంతో ప్రారంభమవుతుంది.",heroText:"కాంట్రాక్టర్లు నైపుణ్యం కలిగిన కార్మికులను కనుగొనడానికి, కార్మికులు సమీపంలో పనులు వెతకడానికి సహాయం.",explore:"పనులు చూడండి",joinWorker:"కార్మికుడిగా చేరండి",opportunities:"ఉద్యోగ అవకాశాలు",findWork:"మీకు కావలసిన పని వెతకండి",searchHint:"నైపుణ్యం లేదా ప్రాంతం ఆధారంగా నమూనా పనులను వెతకండి.",skill:"నైపుణ్యం లేదా పని పేరు",location:"ప్రాంతం",search:"పనులు వెతకండి",recent:"ఇటీవలి అవకాశాలు",simple:"సులభమైన విధానం",twoWays:"ఒక వేదిక. ముందుకు వెళ్లడానికి రెండు మార్గాలు.",purpose:"మా లక్ష్యం",purposeTitle:"పని అవకాశాల పరిచయాలను సులభతరం చేయడం.",getStarted:"ప్రారంభించండి",join:"LabourConnectలో చేరండి",mobilePlaceholder:"10 అంకెల మొబైల్ నంబర్"}
};
function setLanguage(lang){
  const t=translations[lang]||translations.en;
  document.documentElement.lang=lang;
  const set=(selector,key)=>{const el=document.querySelector(selector);if(el&&t[key])el.textContent=t[key];};
  document.querySelectorAll("#navLinks a[href='#jobs']").forEach(el=>el.textContent=t.findJobs);
  document.querySelectorAll("#navLinks a[href='#how']").forEach(el=>el.textContent=t.howWorks);
  document.querySelectorAll("#navLinks a[href='#about']").forEach(el=>el.textContent=t.about);
  set(".hero h1","heroTitle");set(".hero-content>p","heroText");
  document.querySelector(".hero-actions a").childNodes[0].textContent=t.explore+" ";
  document.querySelector(".hero-actions button").textContent=t.joinWorker;
  set(".search-panel .section-kicker","opportunities");set(".search-panel h2","findWork");
  set(".search-panel>div:first-child p","searchHint");
  const labels=document.querySelectorAll(".search-form label");
  if(labels[0])labels[0].querySelector("span").textContent=t.skill;
  if(labels[1])labels[1].querySelector("span").textContent=t.location;
  document.querySelector(".search-form button").textContent=t.search;
  set(".job-results-heading h3","recent");set(".how-section .section-kicker","simple");
  set(".section-heading h2","twoWays");set(".about-section .section-kicker","purpose");
  set(".about-section h2","purposeTitle");set(".cta-section .section-kicker","getStarted");
  document.querySelectorAll("[data-open='register']").forEach(el=>{if(el.textContent.includes("Join LabourConnect"))el.textContent=t.join;});
  const mobile=document.querySelector("#accountForm label");
  const mobileLabel=document.querySelector("#accountPhone");
  if(mobile){mobile.childNodes[0].textContent=t.mobileLabel;}
  if(mobileLabel)mobileLabel.placeholder=t.mobilePlaceholder;
}
document.getElementById("languageSelect").addEventListener("change",e=>setLanguage(e.target.value));
