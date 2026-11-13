"use strict";

const pageTitles = {
  dashboard: "Dashboard",
  projects: "Projects",
  scanner: "Project scanner",
  analysis: "Analysis",
  reports: "Reports",
  history: "Scan history",
  settings: "Settings",
  about: "About Sentinel"
};

const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("mobileOverlay");
const toast = document.getElementById("toast");

let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

function closeSidebar() {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
}

function navigateTo(page) {
  if (!pageTitles[page]) return;

  document.querySelectorAll(".page-view").forEach(section => {
    section.classList.remove("active");
  });

  const target = document.getElementById(`page-${page}`);

  if (target) {
    target.classList.add("active");
  }

  document.querySelectorAll(".nav-item[data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  document.getElementById("breadcrumbCurrent").textContent =
    pageTitles[page];

  closeSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Sidebar navigation
document.querySelectorAll(".nav-item[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    navigateTo(button.dataset.page);
  });
});

// Internal page navigation buttons
document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => {
    navigateTo(button.dataset.go);
  });
});

// Mobile navigation
document.getElementById("menuToggle").addEventListener("click", () => {
  sidebar.classList.add("open");
  overlay.classList.add("show");
});

document.getElementById("sidebarClose").addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);

// Project search
const projectSearch = document.getElementById("projectSearch");

if (projectSearch) {
  projectSearch.addEventListener("input", event => {
    const query = event.target.value.trim().toLowerCase();

    document.querySelectorAll(".project-row").forEach(row => {
      const searchableText = row.dataset.search || row.textContent.toLowerCase();
      row.style.display = searchableText.includes(query) ? "flex" : "none";
    });
  });
}

// Report search — currently an empty-state screen.
const reportSearch = document.getElementById("reportSearch");

if (reportSearch) {
  reportSearch.addEventListener("input", () => {
    showToast("Reports will be searchable after backend integration.");
  });
}

// Scanner folder selection placeholder.
// A browser-based frontend cannot safely scan a full project by itself.
// Folder access and analysis will be implemented through the Python backend.
document.getElementById("chooseFolder").addEventListener("click", () => {
  showToast(
    "Local folder selection will be enabled when the Python backend is connected."
  );
});

document.getElementById("dropZone").addEventListener("dragover", event => {
  event.preventDefault();
  event.currentTarget.style.borderColor = "rgba(240,199,117,.8)";
});

document.getElementById("dropZone").addEventListener("dragleave", event => {
  event.currentTarget.style.borderColor = "";
});

document.getElementById("dropZone").addEventListener("drop", event => {
  event.preventDefault();
  event.currentTarget.style.borderColor = "";
  showToast(
    "Folder scanning is not connected yet. Use the integrated Python scanner after setup."
  );
});

// Start scan action
document.getElementById("startScan").addEventListener("click", () => {
  showToast(
    "Scanner interface is ready. Connect the existing Python analysis engine to run real scans."
  );
});

// Keyboard accessibility: close mobile sidebar with Escape.
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeSidebar();
  }
});

// Initial page
navigateTo("dashboard");