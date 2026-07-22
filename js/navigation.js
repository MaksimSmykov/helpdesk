(function () {
  "use strict";

  window.ITN = window.ITN || {};
  var ITN = window.ITN;

  ITN.nav = ITN.nav || {};

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
    var toggle = document.querySelector(".nav-toggle");
    var mobileNav = document.querySelector(".nav-mobile");
    var roleSwitch = document.querySelector("#roleSwitch");
    var currentPath = window.location.pathname.replace(/\\/g, "/");
    var savedRole = localStorage.getItem("itn_user_role") || "employee";

    function applyRole(role) {
      localStorage.setItem("itn_user_role", role);
      document.documentElement.dataset.userRole = role;

      document.querySelectorAll("[data-role-nav]").forEach(function (item) {
        var allowed = item.getAttribute("data-role-nav").split(/\s+/);
        item.classList.toggle("hidden", allowed.indexOf(role) === -1);
      });
    }

    if (roleSwitch) {
      roleSwitch.value = savedRole;
      roleSwitch.addEventListener("change", function () {
        applyRole(roleSwitch.value);
      });
    }

    applyRole(savedRole);

    if (toggle && mobileNav) {
      toggle.addEventListener("click", function () {
        var isOpen = mobileNav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      });

      mobileNav.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
          mobileNav.classList.remove("is-open");
          toggle.setAttribute("aria-expanded", "false");
        });
      });
    }

    document.querySelectorAll(".nav-link, .side-nav a, .nav-mobile a").forEach(function (link) {
      var href = link.getAttribute("href");
      if (!href || href.indexOf("#") === 0 || href.indexOf("http") === 0) {
        return;
      }

      var linkPath = href.split("?")[0].split("#")[0];
      var normalizedLink = linkPath.replace(/^\.\//, "").replace(/^\.\.\//, "pages/");

      if (
        currentPath.endsWith(linkPath) ||
        currentPath.endsWith(normalizedLink) ||
        (linkPath === "index.html" && (currentPath.endsWith("/") || currentPath.endsWith("index.html")))
      ) {
        link.classList.add("is-active");
        link.setAttribute("aria-current", "page");
      }
    });
  };

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
