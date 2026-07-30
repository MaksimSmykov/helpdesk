(function () {
  "use strict";

  window.ITN = window.ITN || {};
  var ITN = window.ITN;

  ITN.nav = ITN.nav || {};

  var PAGE_TITLES = {
    home: "Профиль",
    index: "Профиль",
    profile: "Профиль",
    devices: "Устройства",
    missions: "Навыки",
    tickets: "Мои заявки",
    ticket: "Заявка",
    help: "Нужна помощь",
    solution: "Диагностика",
    "knowledge-base": "База знаний",
    "create-ticket": "Создать заявку"
  };

  var ICONS = {
    profile:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 19c1.6-3.2 4-4.8 6.5-4.8S17 15.8 18.5 19"/></svg>',
    devices:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></svg>',
    skills:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.2 4.5L19 8.2l-3.5 3.4.8 4.9L12 14.8 7.7 16.5l.8-4.9L5 8.2l4.8-.7L12 3z"/></svg>',
    tickets:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 9h8M8 13h5"/></svg>',
    help:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.7.9c0 1.5-2.3 2-2.3 3.4"/><path d="M12 17.2h.01"/></svg>',
    kb:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16H7.5A2.5 2.5 0 0 0 5 21.5z"/><path d="M5 5.5V21"/></svg>',
    create:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
  };

  ITN.nav.getBasePath = function () {
    var path = window.location.pathname.replace(/\\/g, "/");
    if (path.indexOf("/pages/") !== -1) {
      return "../";
    }
    return "./";
  };

  ITN.nav.resolvePath = function (relativePath) {
    var base = ITN.nav.getBasePath();
    if (!relativePath) {
      return base;
    }
    if (relativePath.indexOf("http") === 0 || relativePath.indexOf("/") === 0) {
      return relativePath;
    }
    return base + relativePath.replace(/^\.\//, "");
  };

  ITN.nav.getCurrentPage = function () {
    var path = window.location.pathname.replace(/\\/g, "/");
    var file = path.split("/").pop() || "index.html";
    if (file === "" || file === "/") {
      return "home";
    }
    return file.replace(/\.html$/i, "");
  };

  ITN.nav.initHeader = function () {
    ensureAppShell();
    bindSidebarToggle();
    markActiveLinks();
  };

  function ensureAppShell() {
    if (document.querySelector(".app-sidebar")) {
      markActiveLinks();
      return;
    }

    var body = document.body;
    var page = body.getAttribute("data-page") || ITN.nav.getCurrentPage();
    var main = document.querySelector("main.page-main") || document.querySelector("main");
    if (!main) {
      return;
    }

    body.classList.add("app-shell", "page-shell");

    var openCount = 0;
    try {
      if (ITN.profile && ITN.profile.getOpenTicketsCount) {
        openCount = ITN.profile.getOpenTicketsCount() || 0;
      }
    } catch (e) {}

    var backdrop = document.createElement("div");
    backdrop.className = "app-sidebar-backdrop";
    backdrop.setAttribute("aria-hidden", "true");
    body.insertBefore(backdrop, body.firstChild);

    var sidebar = document.createElement("aside");
    sidebar.className = "app-sidebar";
    sidebar.id = "appSidebar";
    sidebar.setAttribute("aria-label", "Навигация кабинета");
    sidebar.innerHTML = buildSidebarHtml(openCount);
    body.insertBefore(sidebar, backdrop.nextSibling);

    var frame = document.createElement("div");
    frame.className = "app-frame";

    var topbar = document.createElement("header");
    topbar.className = "app-topbar";
    topbar.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;">' +
      '<button type="button" class="sidebar-toggle" aria-label="Открыть меню" aria-expanded="false" aria-controls="appSidebar">☰</button>' +
      '<div class="app-topbar__title">' +
      (PAGE_TITLES[page] || "IT Navigator") +
      "</div></div>" +
      '<div class="app-topbar__actions">' +
      '<a class="button button--primary button--small" href="' +
      ITN.nav.resolvePath("pages/help.html") +
      '">Нужна помощь</a></div>';

    var appMain = document.createElement("div");
    appMain.className = "app-main";

    main.classList.remove("page-main");
    main.parentNode.insertBefore(frame, main);
    frame.appendChild(topbar);
    frame.appendChild(appMain);
    appMain.appendChild(main);

    var oldHeader = document.querySelector(".site-header");
    var oldFooter = document.querySelector(".site-footer");
    var oldMobile = document.querySelector(".nav-mobile");
    if (oldHeader) oldHeader.remove();
    if (oldFooter) oldFooter.remove();
    if (oldMobile) oldMobile.remove();

    backdrop.addEventListener("click", closeSidebar);
  }

  function buildSidebarHtml(openCount) {
    var homeHref = ITN.nav.resolvePath("index.html");
    var badge =
      openCount > 0
        ? '<span class="app-sidebar__badge" title="Открытые заявки">' + openCount + "</span>"
        : "";

    return (
      '<a class="app-sidebar__brand" href="' +
      homeHref +
      '">' +
      '<span class="brand-mark" aria-hidden="true">IN</span>' +
      '<span class="app-sidebar__brand-text">IT Navigator</span></a>' +
      '<nav class="app-sidebar__nav">' +
      '<div class="app-sidebar__section">' +
      '<p class="app-sidebar__label">Кабинет</p>' +
      linkHtml("home", homeHref, ICONS.profile, "Профиль") +
      linkHtml("devices", ITN.nav.resolvePath("pages/devices.html"), ICONS.devices, "Устройства") +
      linkHtml("missions", ITN.nav.resolvePath("pages/missions.html"), ICONS.skills, "Навыки") +
      linkHtml("tickets", ITN.nav.resolvePath("pages/tickets.html"), ICONS.tickets, "Мои заявки", badge) +
      "</div>" +
      '<div class="app-sidebar__section">' +
      '<p class="app-sidebar__label">Помощь</p>' +
      linkHtml("help", ITN.nav.resolvePath("pages/help.html"), ICONS.help, "Нужна помощь") +
      linkHtml("knowledge-base", ITN.nav.resolvePath("pages/knowledge-base.html"), ICONS.kb, "База знаний") +
      linkHtml("create-ticket", ITN.nav.resolvePath("pages/create-ticket.html"), ICONS.create, "Создать заявку") +
      "</div></nav>" +
      '<div class="app-sidebar__cta">' +
      '<a class="button button--primary" href="' +
      ITN.nav.resolvePath("pages/help.html") +
      '">Нужна помощь</a></div>'
    );
  }

  function linkHtml(pageKey, href, icon, label, badgeHtml) {
    return (
      '<a class="app-sidebar__link" data-nav-page="' +
      pageKey +
      '" href="' +
      href +
      '">' +
      '<span class="app-sidebar__icon">' +
      icon +
      '</span><span class="app-sidebar__text">' +
      label +
      "</span>" +
      (badgeHtml || "") +
      "</a>"
    );
  }

  function markActiveLinks() {
    var page = document.body.getAttribute("data-page") || ITN.nav.getCurrentPage();
    var map = {
      home: "home",
      index: "home",
      profile: "home",
      devices: "devices",
      missions: "missions",
      tickets: "tickets",
      ticket: "tickets",
      help: "help",
      solution: "help",
      "knowledge-base": "knowledge-base",
      "create-ticket": "create-ticket"
    };
    var activeKey = map[page] || page;

    document.querySelectorAll(".app-sidebar__link").forEach(function (link) {
      var key = link.getAttribute("data-nav-page");
      var isActive = key === activeKey;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function bindSidebarToggle() {
    var toggle = document.querySelector(".sidebar-toggle");
    if (!toggle || toggle.getAttribute("data-bound") === "true") {
      return;
    }
    toggle.setAttribute("data-bound", "true");
    toggle.addEventListener("click", function () {
      var open = document.body.classList.toggle("sidebar-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function closeSidebar() {
    document.body.classList.remove("sidebar-open");
    var toggle = document.querySelector(".sidebar-toggle");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
    }
  }

  ITN.nav.showToast = function (message, type) {
    type = type || "info";
    var region = document.getElementById("toastRegion");

    if (!region) {
      region = document.createElement("div");
      region.id = "toastRegion";
      region.className = "toast-region";
      region.setAttribute("aria-live", "polite");
      region.setAttribute("aria-atomic", "true");
      document.body.appendChild(region);
    }

    var toast = document.createElement("div");
    toast.className = "toast toast--" + type;
    toast.setAttribute("role", "status");
    toast.textContent = message;
    region.appendChild(toast);

    window.setTimeout(function () {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(6px)";
      toast.style.transition = "opacity 200ms ease, transform 200ms ease";
      window.setTimeout(function () {
        toast.remove();
      }, 220);
    }, 4200);
  };
})();
