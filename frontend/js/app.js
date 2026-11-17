 "use strict";

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const STORAGE_KEY = "sentinel_workspace_v1";

  const defaultProjects = [
    { id: "p1", name: "Sentinel Core", description: "Advanced monitoring and reliability system.", type: "Python", status: "active", created: new Date().toISOString() },
    { id: "p2", name: "QueryDoctor", description: "AI query analyser and database assistant.", type: "Python", status: "active", created: new Date().toISOString() },
    { id: "p3", name: "RippleMap", description: "Intelligent dependency and impact mapping.", type: "Python", status: "active", created: new Date().toISOString() },
    { id: "p4", name: "Groveglass", description: "Client discovery and project blueprint workspace.", type: "Web Application", status: "active", created: new Date().toISOString() },
    { id: "p5", name: "Buyzen", description: "Hyperlocal grocery delivery platform.", type: "Web Application", status: "completed", created: new Date().toISOString() },
    { id: "p6", name: "Yugant", description: "Developer tools and productivity workspace.", type: "Web Application", status: "archived", created: new Date().toISOString() }
  ];

  let state = loadState();
  let activeFilter = "all";
  let scanTimer = null;
  let scanProgress = 0;
  let toastTimer = null;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved.projects)) {
        return {
          projects: saved.projects,
          history: Array.isArray(saved.history) ? saved.history : [],
          settings: saved.settings || {}
        };
      }
    } catch (error) {
      console.warn("Could not load workspace data:", error);
    }

    return {
      projects: defaultProjects.map(project => ({ ...project })),
      history: [],
      settings: {
        workspaceName: "My Sentinel Workspace",
        notifications: true,
        darkMode: false
      }
    };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      showToast("Could not save data in this browser.");
      console.error(error);
    }
  }

  function makeId() {
    return "p-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function showToast(message) {
    const toast = $("#toast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2600);
  }

  function navigate(pageName) {
    const page = $("#page-" + pageName);
    if (!page) return;

    $$(".page").forEach(item => item.classList.remove("active"));
    page.classList.add("active");

    $$(".nav-link").forEach(link => {
      link.classList.toggle("active", link.dataset.page === pageName);
    });

    const activeLink = $(`.nav-link[data-page="${pageName}"]`);
    $("#crumb").textContent = activeLink
      ? activeLink.textContent.trim()
      : pageName.charAt(0).toUpperCase() + pageName.slice(1);

    $("#sidebar").classList.remove("open");

    renderAll();

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function getTime(value) {
    if (!value) return "";
    return new Date(value).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function statusLabel(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  // NAVIGATION
  function initNavigation() {
    $$(".nav-link").forEach(button => {
      button.addEventListener("click", () => navigate(button.dataset.page));
    });

    $$("[data-go]").forEach(button => {
      button.addEventListener("click", () => navigate(button.dataset.go));
    });

    $$(".brand").forEach(brand => {
      brand.addEventListener("click", event => {
        event.preventDefault();
        navigate("dashboard");
      });
    });

    $("#mobileMenu").addEventListener("click", () => {
      $("#sidebar").classList.toggle("open");
    });

    $("#profileButton").addEventListener("click", () => {
      navigate("settings");
    });

    $("#notificationButton").addEventListener("click", () => {
      showToast("No new workspace notifications.");
    });

    $("#globalSearch").addEventListener("keydown", event => {
      if (event.key !== "Enter") return;

      const query = event.target.value.trim().toLowerCase();
      if (!query) return;

      const pages = {
        dashboard: ["dashboard", "home"],
        projects: ["project", "projects"],
        scanner: ["scan", "scanner"],
        history: ["history"],
        reports: ["report", "reports"],
        analytics: ["analytics", "insights"],
        settings: ["settings", "preferences"],
        security: ["security", "protection"],
        about: ["about"]
      };

      for (const [page, words] of Object.entries(pages)) {
        if (words.some(word => word.includes(query) || query.includes(word))) {
          navigate(page);
          event.target.value = "";
          return;
        }
      }

      const project = state.projects.find(item =>
        item.name.toLowerCase().includes(query)
      );

      if (project) {
        navigate("projects");
        $("#projectSearch").value = project.name;
        renderProjects();
      } else {
        showToast("No matching page or project found.");
      }
    });

    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        $("#globalSearch").focus();
      }

      if (event.key === "Escape") {
        closeModal();
        $("#sidebar").classList.remove("open");
      }
    });
  }

  // PROJECTS
  function renderProjects() {
    const query = $("#projectSearch").value.trim().toLowerCase();

    const projects = state.projects.filter(project => {
      const matchesFilter = activeFilter === "all" || project.status === activeFilter;
      const matchesSearch =
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query) ||
        project.type.toLowerCase().includes(query);

      return matchesFilter && matchesSearch;
    });

    $("#projectGrid").innerHTML = projects.map(project => `
      <article class="project-card">
        <div class="project-card-top">
          <span class="project-symbol">${project.type === "Python" ? "‹›" : "◈"}</span>
          <button class="project-menu" data-edit="${escapeHTML(project.id)}" title="Edit project">···</button>
        </div>
        <h3>${escapeHTML(project.name)}</h3>
        <p>${escapeHTML(project.description || "No description added.")}</p>
        <div class="project-meta">
          <span class="project-status ${escapeHTML(project.status)}">${statusLabel(project.status)}</span>
          <span>${escapeHTML(project.type)}</span>
        </div>
        <div class="project-actions">
          <button data-scan="${escapeHTML(project.id)}">Start Review →</button>
          <button data-edit="${escapeHTML(project.id)}">Edit</button>
          <button data-delete="${escapeHTML(project.id)}">Delete</button>
        </div>
      </article>
    `).join("");

    $("#projectEmpty").hidden = projects.length !== 0;

    $$("[data-edit]").forEach(button => {
      button.addEventListener("click", () => openModal(button.dataset.edit));
    });

    $$("[data-delete]").forEach(button => {
      button.addEventListener("click", () => deleteProject(button.dataset.delete));
    });

    $$("[data-scan]").forEach(button => {
      button.addEventListener("click", () => {
        navigate("scanner");
        $("#scanProject").value = button.dataset.scan;
      });
    });

    updateProjectSelect();
  }

  function updateProjectSelect() {
    const select = $("#scanProject");
    const current = select.value;

    select.innerHTML = `<option value="">Choose a project</option>` +
      state.projects
        .filter(project => project.status !== "archived")
        .map(project => `<option value="${escapeHTML(project.id)}">${escapeHTML(project.name)}</option>`)
        .join("");

    if (state.projects.some(project => project.id === current)) {
      select.value = current;
    }
  }

  function openModal(projectId = "") {
    const project = state.projects.find(item => item.id === projectId);

    $("#projectForm").reset();
    $("#editProjectId").value = project ? project.id : "";
    $("#modalTitle").textContent = project ? "Edit project" : "Create project";

    if (project) {
      $("#projectName").value = project.name;
      $("#projectDescription").value = project.description;
      $("#projectType").value = project.type;
      $("#projectStatus").value = project.status;
    }

    $("#projectModal").hidden = false;
    $("#projectName").focus();
  }

  function closeModal() {
    $("#projectModal").hidden = true;
  }

  function saveProject(event) {
    event.preventDefault();

    const name = $("#projectName").value.trim();
    if (!name) return;

    const projectId = $("#editProjectId").value;
    const existing = state.projects.find(item => item.id === projectId);

    const projectData = {
      id: existing ? existing.id : makeId(),
      name,
      description: $("#projectDescription").value.trim(),
      type: $("#projectType").value,
      status: $("#projectStatus").value,
      created: existing ? existing.created : new Date().toISOString()
    };

    if (existing) {
      state.projects = state.projects.map(item =>
        item.id === projectId ? projectData : item
      );
      showToast("Project updated.");
    } else {
      state.projects.unshift(projectData);
      showToast("Project created.");
    }

    saveState();
    closeModal();
    renderAll();
  }

  function deleteProject(projectId) {
    const project = state.projects.find(item => item.id === projectId);
    if (!project) return;

    if (!confirm(`Delete "${project.name}" from this workspace?`)) return;

    state.projects = state.projects.filter(item => item.id !== projectId);
    saveState();
    renderAll();
    showToast("Project deleted.");
  }

  function initProjects() {
    $("#addProject").addEventListener("click", () => openModal());
    $("#emptyAddProject").addEventListener("click", () => openModal());
    $("#closeModal").addEventListener("click", closeModal);
    $("#cancelModal").addEventListener("click", closeModal);
    $("#projectForm").addEventListener("submit", saveProject);

    $("#projectModal").addEventListener("click", event => {
      if (event.target.id === "projectModal") closeModal();
    });

    $("#projectSearch").addEventListener("input", renderProjects);

    $("#projectFilters").addEventListener("click", event => {
      const button = event.target.closest("[data-filter]");
      if (!button) return;

      activeFilter = button.dataset.filter;

      $$(".filter-tab").forEach(tab => {
        tab.classList.toggle("active", tab === button);
      });

      renderProjects();
    });
  }

  // SCANNER PREVIEW
  function resetScanner() {
    clearInterval(scanTimer);
    scanTimer = null;
    scanProgress = 0;

    $("#scanProgress").hidden = true;
    $("#scanResult").hidden = true;
    $("#scanVisual").hidden = false;
    $("#scanState").textContent = "IDLE";
    $("#scanTitle").textContent = "Ready when you are";
    $("#progressBar").style.width = "0%";
    $("#scanPercent").textContent = "0%";
  }

  function startScan() {
    if (scanTimer) {
      showToast("A preview is already running.");
      return;
    }

    const projectId = $("#scanProject").value;
    const profile = $("#scanType").value;
    const authorised = $("#authorized").checked;

    if (!projectId) {
      showToast("Please select a project first.");
      return;
    }

    if (!authorised) {
      showToast("Please confirm project authorisation.");
      return;
    }

    const project = state.projects.find(item => item.id === projectId);
    if (!project) {
      showToast("Selected project could not be found.");
      return;
    }

    scanProgress = 0;
    $("#scanVisual").hidden = true;
    $("#scanResult").hidden = true;
    $("#scanProgress").hidden = false;
    $("#scanTitle").textContent = "Scan preview in progress";
    $("#scanState").textContent = "RUNNING";
    $("#scanStage").textContent = "Preparing scan preview...";

    const steps = $$("#scanSteps div");
    steps.forEach(step => {
      step.classList.remove("done");
      step.textContent = "◷ " + step.textContent.replace(/^[✓◷]\s*/, "");
    });

    const stages = [
      { at: 10, label: "Preparing preview workflow", step: 0 },
      { at: 38, label: "Reviewing demonstration stages", step: 1 },
      { at: 72, label: "Preparing local activity record", step: 2 },
      { at: 100, label: "Preview completed", step: 2 }
    ];

    scanTimer = setInterval(() => {
      scanProgress += 4;

      $("#progressBar").style.width = scanProgress + "%";
      $("#scanPercent").textContent = scanProgress + "%";

      const stage = [...stages].reverse().find(item => scanProgress >= item.at);
      if (stage) {
        $("#scanStage").textContent = stage.label;

        steps.forEach((step, index) => {
          if (index <= stage.step) {
            step.classList.add("done");
            step.textContent = "✓ " + step.textContent.replace(/^[✓◷]\s*/, "");
          }
        });
      }

      if (scanProgress >= 100) {
        clearInterval(scanTimer);
        scanTimer = null;
        completeScan(project, profile);
      }
    }, 120);
  }

  function completeScan(project, profile) {
    const record = {
      id: makeId(),
      projectId: project.id,
      projectName: project.name,
      profile,
      date: new Date().toISOString(),
      result: "Preview completed",
      type: "Frontend demonstration"
    };

    state.history.unshift(record);
    saveState();

    $("#scanState").textContent = "COMPLETED";
    $("#scanTitle").textContent = "Preview completed";
    $("#scanProgress").hidden = true;
    $("#scanResult").hidden = false;

    $("#scanResult").innerHTML = `
      <div class="security-shield" style="margin:0 auto 15px">✓</div>
      <h3>Workflow recorded</h3>
      <p><strong>${escapeHTML(project.name)}</strong><br>
      ${escapeHTML(statusLabel(profile))} review preview completed.<br><br>
      This is a frontend demonstration record, not a source-code or security analysis.</p>
      <button class="btn btn-dark" id="viewScanHistory">View Scan History →</button>
      <button class="btn btn-outline" id="newScan">New Preview</button>
    `;

    $("#viewScanHistory").addEventListener("click", () => navigate("history"));
    $("#newScan").addEventListener("click", resetScanner);

    renderAll();
    showToast("Preview record saved.");
  }

  function stopScan() {
    if (!scanTimer) return;

    clearInterval(scanTimer);
    scanTimer = null;
    resetScanner();
    showToast("Preview cancelled.");
  }

  function initScanner() {
    $("#runScan").addEventListener("click", startScan);
    $("#stopScan").addEventListener("click", stopScan);
  }

  // HISTORY
  function renderHistory() {
    const rows = $("#historyRows");

    rows.innerHTML = state.history.map(record => `
      <tr>
        <td><strong>${escapeHTML(record.projectName)}</strong></td>
        <td>${escapeHTML(statusLabel(record.profile))}</td>
        <td>${getDate(record.date)} · ${getTime(record.date)}</td>
        <td><span class="project-status">${escapeHTML(record.result)}</span></td>
        <td>${escapeHTML(record.type)}</td>
      </tr>
    `).join("");

    $("#historyEmpty").hidden = state.history.length > 0;
  }

  function initHistory() {
    $("#clearHistory").addEventListener("click", () => {
      if (!state.history.length) {
        showToast("History is already empty.");
        return;
      }

      if (!confirm("Clear all scan history records?")) return;

      state.history = [];
      saveState();
      renderAll();
      showToast("History cleared.");
    });
  }

  // REPORTS
  function renderReports() {
    const query = $("#reportSearch").value.trim().toLowerCase();

    const records = state.history.filter(record =>
      record.projectName.toLowerCase().includes(query) ||
      record.profile.toLowerCase().includes(query)
    );

    $("#reportRows").innerHTML = records.map(record => `
      <tr>
        <td><strong>${escapeHTML(record.projectName)}</strong></td>
        <td>${escapeHTML(statusLabel(record.profile))}</td>
        <td>${getDate(record.date)}</td>
        <td>${escapeHTML(record.result)}</td>
        <td><button class="table-action" data-export="${escapeHTML(record.id)}">Export</button></td>
      </tr>
    `).join("");

    $("#reportEmpty").hidden = records.length > 0;

    $$("[data-export]").forEach(button => {
      button.addEventListener("click", () => {
        const record = state.history.find(item => item.id === button.dataset.export);
        if (record) downloadCSV([record], "sentinel-report.csv");
      });
    });
  }

  function downloadCSV(records, filename) {
    if (!records.length) {
      showToast("There are no records to export.");
      return;
    }

    const columns = ["projectName", "profile", "date", "result", "type"];
    const csv = [
      columns.join(","),
      ...records.map(record =>
        columns.map(column =>
          `"${String(record[column] ?? "").replace(/"/g, '""')}"`
        ).join(",")
      )
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
    showToast("CSV export downloaded.");
  }

  function initReports() {
    $("#reportSearch").addEventListener("input", renderReports);
    $("#exportAll").addEventListener("click", () =>
      downloadCSV(state.history, "sentinel-workspace-reports.csv")
    );
  }

  // ANALYTICS
  function drawChart(canvasId, values) {
    const canvas = $("#" + canvasId);
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 200);
    const height = Math.max(rect.height, 120);
    const ratio = window.devicePixelRatio || 1;

    canvas.width = width * ratio;
    canvas.height = height * ratio;

    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);

    const pad = { top: 15, right: 12, bottom: 12, left: 12 };
    const chartWidth = width - pad.left - pad.right;
    const chartHeight = height - pad.top - pad.bottom;

    ctx.clearRect(0, 0, width, height);

    ctx.font = "9px DM Sans";
    ctx.strokeStyle = "#eeeae2";
    ctx.lineWidth = 1;

    for (let i = 0; i < 4; i++) {
      const y = pad.top + chartHeight * i / 3;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
    }

    const max = Math.max(100, ...values);
    const points = values.map((value, index) => ({
      x: pad.left + chartWidth * index / Math.max(values.length - 1, 1),
      y: pad.top + chartHeight - (value / max) * chartHeight
    }));

    if (!points.length) return;

    const gradient = ctx.createLinearGradient(0, pad.top, 0, height);
    gradient.addColorStop(0, "rgba(197,155,72,.25)");
    gradient.addColorStop(1, "rgba(197,155,72,0)");

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.forEach(point => ctx.lineTo(point.x, point.y));
    ctx.lineTo(points[points.length - 1].x, height - pad.bottom);
    ctx.lineTo(points[0].x, height - pad.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });

    ctx.strokeStyle = "#c59b48";
    ctx.lineWidth = 2;
    ctx.stroke();

    points.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#c59b48";
      ctx.fill();
    });
  }

  function renderAnalytics() {
    const active = state.projects.filter(project => project.status === "active").length;
    const completed = state.projects.filter(project => project.status === "completed").length;
    const archived = state.projects.filter(project => project.status === "archived").length;
    const total = state.projects.length || 1;

    $("#analyticsProjects").textContent = state.projects.length;
    $("#analyticsScans").textContent = state.history.length;
    $("#analyticsActive").textContent = active;
    $("#analyticsCompleted").textContent = completed;

    $("#distribution").innerHTML = [
      ["Active", active, "#c59b48"],
      ["Completed", completed, "#72a47d"],
      ["Archived", archived, "#9c9a93"]
    ].map(([label, count, color]) => `
      <div class="distribution-row">
        <span>${label}</span>
        <div class="distribution-track"><div class="distribution-fill" style="width:${count / total * 100}%;background:${color}"></div></div>
        <strong>${count}</strong>
      </div>
    `).join("");

    const daily = Array(7).fill(0);
    state.history.forEach(record => {
      const daysAgo = Math.floor((Date.now() - new Date(record.date).getTime()) / 86400000);
      if (daysAgo >= 0 && daysAgo < 7) daily[6 - daysAgo]++;
    });

    drawChart("activityChart", daily);
  }

  // DASHBOARD
  function renderDashboard() {
    $("#statProjects").textContent = state.projects.length;
    $("#statScans").textContent = state.history.length;

    $("#statHealth").textContent = state.projects.length ? "Ready" : "—";
    $("#statIssues").textContent = "—";

    const activity = $("#recentActivity");

    if (!state.history.length) {
      activity.innerHTML = `<div class="empty-inline">No activity yet. Start a preview to create a record.</div>`;
    } else {
      activity.innerHTML = state.history.slice(0, 5).map(record => `
        <div class="activity-item">
          <span class="activity-dot"></span>
          <div><strong>${escapeHTML(record.projectName)} · Preview recorded</strong><small>${getDate(record.date)} at ${getTime(record.date)}</small></div>
        </div>
      `).join("");
    }

    const chartValues = state.history.length
      ? Array.from({ length: 7 }, (_, index) => {
          const day = 6 - index;
          return state.history.filter(record =>
            Math.floor((Date.now() - new Date(record.date).getTime()) / 86400000) === day
          ).length * 12 + 15;
        })
      : [35, 48, 42, 63, 55, 72, 68];

    drawChart("reliabilityChart", chartValues);
  }

  // SETTINGS
  function initSettings() {
    $$(".settings-tab").forEach(button => {
      button.addEventListener("click", () => {
        $$(".settings-tab").forEach(tab => tab.classList.remove("active"));
        $$(".settings-pane").forEach(pane => pane.classList.remove("active"));

        button.classList.add("active");
        $("#tab-" + button.dataset.tab).classList.add("active");
      });
    });

    $("#saveSettings").addEventListener("click", () => {
      state.settings.workspaceName = $("#workspaceName").value.trim() || "My Sentinel Workspace";
      state.settings.notifications = $("#notificationsToggle").checked;

      saveState();
      $("#settingsMessage").textContent = "Preferences saved.";
      showToast("Settings saved.");
    });

    $("#toggleAppearance").addEventListener("click", toggleTheme);
    $("#themeButton").addEventListener("click", toggleTheme);

    $("#clearData").addEventListener("click", () => {
      if (!confirm("This will delete all projects, history and settings stored by this workspace in this browser. Continue?")) return;

      clearInterval(scanTimer);
      scanTimer = null;

      localStorage.removeItem(STORAGE_KEY);
      state = {
        projects: [],
        history: [],
        settings: {
          workspaceName: "My Sentinel Workspace",
          notifications: true,
          darkMode: false
        }
      };

      applyTheme();
      $("#workspaceName").value = state.settings.workspaceName;
      $("#notificationsToggle").checked = true;
      resetScanner();
      saveState();
      renderAll();
      showToast("Workspace data cleared.");
    });

    $("#workspaceName").value = state.settings.workspaceName || "My Sentinel Workspace";
    $("#notificationsToggle").checked = state.settings.notifications !== false;
  }

  function toggleTheme() {
    state.settings.darkMode = !state.settings.darkMode;
    applyTheme();
    saveState();
  }

  function applyTheme() {
    document.body.classList.toggle("dark-mode", Boolean(state.settings.darkMode));
    $("#themeButton").textContent = state.settings.darkMode ? "☾" : "☼";
  }

  // RENDER EVERYTHING
  function renderAll() {
    renderProjects();
    renderHistory();
    renderReports();
    renderDashboard();
    renderAnalytics();
  }

  function init() {
    initNavigation();
    initProjects();
    initScanner();
    initHistory();
    initReports();
    initSettings();

    applyTheme();
    renderAll();

    window.addEventListener("resize", () => {
      const activePage = $(".page.active");
      if (activePage && activePage.id === "page-dashboard") renderDashboard();
      if (activePage && activePage.id === "page-analytics") renderAnalytics();
    });

    console.log("Sentinel AI workspace initialised.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();