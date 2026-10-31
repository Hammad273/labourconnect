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
    email: document.getElementById("accountEmail").value.trim(),
    role: document.getElementById("accountRole").value
  };
  try {
    localStorage.setItem("labourConnectDemoUser", JSON.stringify(demoUser));
    closeModal();
    showToast("Welcome, " + demoUser.name + "! Demo profile saved in this browser.");
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