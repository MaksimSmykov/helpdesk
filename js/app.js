(function () {
  "use strict";

  window.ITN = window.ITN || {};
  var ITN = window.ITN;

  ITN.app = ITN.app || {};

  function ensureToastRegion() {
    if (!document.getElementById("toastRegion")) {
      var region = document.createElement("div");
      region.id = "toastRegion";
      region.className = "toast-region";
      region.setAttribute("aria-live", "polite");
      region.setAttribute("aria-atomic", "true");
      document.body.appendChild(region);
    }
  }

  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getTicketStatusTone(status) {
    var map = {
      accepted: "ticket-feed-item--accepted",
      assigned: "ticket-feed-item--assigned",
      diagnostics: "ticket-feed-item--diagnostics",
      waiting: "ticket-feed-item--waiting",
      resolved: "ticket-feed-item--resolved"
    };
    return map[status] || "";
  }

  var GLASS_GRADIENTS = {
    blue: "linear-gradient(hsl(223, 90%, 50%), hsl(208, 90%, 50%))",
    indigo: "linear-gradient(hsl(253, 90%, 50%), hsl(238, 90%, 50%))",
    orange: "linear-gradient(hsl(43, 90%, 50%), hsl(28, 90%, 50%))",
    green: "linear-gradient(hsl(123, 90%, 40%), hsl(108, 90%, 40%))",
    red: "linear-gradient(hsl(3, 90%, 50%), hsl(348, 90%, 50%))",
    teal: "linear-gradient(hsl(174, 80%, 36%), hsl(186, 80%, 36%))"
  };

  var GLASS_ACCENTS = {
    blue: "hsl(223, 90%, 55%)",
    indigo: "hsl(253, 90%, 58%)",
    orange: "hsl(35, 95%, 52%)",
    green: "hsl(123, 70%, 42%)",
    red: "hsl(3, 90%, 55%)",
    teal: "hsl(174, 75%, 38%)"
  };

  var SKILL_GLASS_COLORS = {
    "mission-2fa": "blue",
    "mission-vpn": "indigo",
    "mission-browser": "orange",
    "mission-mail": "green"
  };

  function glassIconHtml(iconSvg, color, options) {
    options = options || {};
    var colorKey = GLASS_GRADIENTS[color] ? color : "blue";
    var gradient = GLASS_GRADIENTS[colorKey];
    var accent = GLASS_ACCENTS[colorKey];
    var size = options.size === "md" ? "icon-btn--md" : "icon-btn--sm";
    var doneClass = options.done ? " icon-btn--done" : "";
    var custom = options.customClass ? " " + options.customClass : "";
    var labelAttr = options.label
      ? ' aria-label="' + escapeHtml(options.label) + '"'
      : ' aria-hidden="true"';
    var labelHtml =
      options.showLabel && options.label
        ? '<span class="icon-btn__label">' + escapeHtml(options.label) + "</span>"
        : "";

    return (
      '<span class="icon-btn icon-btn--' +
      colorKey +
      " " +
      size +
      doneClass +
      custom +
      '" style="--glass-accent:' +
      accent +
      '"' +
      labelAttr +
      ">" +
      '<span class="icon-btn__back" style="background:' +
      gradient +
      '"></span>' +
      '<span class="icon-btn__front"><span class="icon-btn__icon">' +
      iconSvg +
      "</span></span>" +
      labelHtml +
      "</span>"
    );
  }

  function detailItemHtml(iconSvg, label, value, full, color) {
    return (
      '<div class="detail-item' +
      (full ? " detail-item--full" : "") +
      '">' +
      glassIconHtml(iconSvg, color || "blue", { label: label, size: "sm" }) +
      '<div class="detail-item__body"><span>' +
      escapeHtml(label) +
      "</span><b>" +
      escapeHtml(value) +
      "</b></div></div>"
    );
  }

  function getSkillGlassColor(missionId) {
    return SKILL_GLASS_COLORS[missionId] || "blue";
  }

  function buildTicketStatusStepperHtml(currentStatus) {
    var statuses = ["accepted", "assigned", "diagnostics", "waiting", "resolved"];
    var currentOrder =
      (ITN.STATUS_META[currentStatus] && ITN.STATUS_META[currentStatus].order) || 1;
    var html =
      '<section class="ticket-stepper" aria-label="Прогресс статуса заявки">' +
      '<div class="step-indicator-row">';

    statuses.forEach(function (key, index) {
      var meta = ITN.STATUS_META[key] || { label: key, order: index + 1 };
      var state =
        currentOrder === meta.order ? "active" : currentOrder > meta.order ? "complete" : "inactive";
      var inner;

      if (state === "complete") {
        inner =
          '<svg class="check-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
      } else if (state === "active") {
        inner = '<div class="active-dot" aria-hidden="true"></div>';
      } else {
        inner = '<span class="step-number">' + meta.order + "</span>";
      }

      html +=
        '<div class="step-indicator-wrap">' +
        '<div class="step-indicator is-' +
        state +
        '" aria-current="' +
        (state === "active" ? "step" : "false") +
        '">' +
        '<div class="step-indicator-inner">' +
        inner +
        "</div></div>" +
        '<span class="step-caption">' +
        escapeHtml(meta.label) +
        "</span></div>";

      if (index < statuses.length - 1) {
        html +=
          '<div class="step-connector" aria-hidden="true"><div class="step-connector-inner' +
          (currentOrder > meta.order ? " is-complete" : "") +
          '"></div></div>';
      }
    });

    html += "</div></section>";
    return html;
  }

  var PROFILE_ICONS = {
    email:
      '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>',
    phone:
      '<svg viewBox="0 0 24 24"><path d="M7 3h3l1.5 4.5-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2L21 14v3a2 2 0 0 1-2.2 2A16 16 0 0 1 5 7.2 2 2 0 0 1 7 3z"/></svg>',
    laptop:
      '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 18h20"/></svg>',
    device:
      '<svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    network:
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>'
  };

  var SKILL_ICONS = {
    "mission-2fa":
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z"/><path d="M9.5 12.5l1.8 1.8 3.7-3.8"/></svg>',
    "mission-vpn":
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
    "mission-browser":
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5"/></svg>',
    "mission-mail":
      '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 8l9 6 9-6"/></svg>'
  };

  function getSkillIcon(missionId) {
    return (
      SKILL_ICONS[missionId] ||
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2.5"/></svg>'
    );
  }

  function buildSkillProgressItemHtml(skill, progress, options) {
    options = options || {};
    var isComplete = progress.percent === 100;
    var barClass =
      "progress-bar progress-bar--skill" + (isComplete ? " progress-bar--complete" : "");
    var badge = isComplete ? '<span class="badge badge--done">Готово</span>' : "";
    var titleHtml = options.omitTitle
      ? '<span class="skill-progress-pct">' + progress.percent + "%</span>"
      : "<strong>" + escapeHtml(skill.title) + "</strong>";
    var headRight = options.omitTitle
      ? badge
      : '<span class="skill-progress-pct">' + progress.percent + "%</span>";
    var metaRight = options.hideChoice
      ? options.omitTitle
        ? ""
        : badge
      : badge ||
        '<span>' + escapeHtml(skill.choice || "Выбор ещё не указан") + "</span>";

    return (
      '<div class="skill-progress-item' +
      (options.omitTitle ? " skill-progress-item--compact" : "") +
      '">' +
      glassIconHtml(getSkillIcon(skill.id), getSkillGlassColor(skill.id), {
        label: skill.title,
        size: "md",
        done: isComplete
      }) +
      '<div class="skill-progress-main">' +
      '<div class="skill-progress-head">' +
      titleHtml +
      headRight +
      "</div>" +
      '<div class="' +
      barClass +
      '" role="progressbar" aria-valuenow="' +
      progress.percent +
      '" aria-valuemin="0" aria-valuemax="100" aria-label="Прогресс навыка ' +
      escapeHtml(skill.title) +
      '"><span style="width:' +
      progress.percent +
      '%"></span></div>' +
      '<div class="skill-progress-meta">' +
      "<span>" +
      progress.done +
      " из " +
      progress.total +
      " шагов</span>" +
      metaRight +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function ensureButtonRippleStructure(button) {
    if (!button || button.getAttribute("data-ripple-ready") === "true") {
      return;
    }

    var ripples = button.querySelector(":scope > .button__ripples");
    if (!ripples) {
      ripples = document.createElement("span");
      ripples.className = "button__ripples";
      ripples.setAttribute("aria-hidden", "true");
      var fx = button.querySelector(":scope > .specular-button__fx");
      if (fx && fx.nextSibling) {
        button.insertBefore(ripples, fx.nextSibling);
      } else if (fx) {
        button.appendChild(ripples);
      } else {
        button.insertBefore(ripples, button.firstChild);
      }
    }

    var label = button.querySelector(":scope > .button__label, :scope > .specular-button__label");
    if (!label) {
      label = document.createElement("span");
      label.className = "button__label specular-button__label";
      var node = button.firstChild;
      while (node) {
        var next = node.nextSibling;
        if (
          !(
            node.classList &&
            (node.classList.contains("button__ripples") ||
              node.classList.contains("specular-button__fx"))
          )
        ) {
          label.appendChild(node);
        }
        node = next;
      }
      button.appendChild(label);
    } else {
      label.classList.add("button__label", "specular-button__label");
    }

    button.setAttribute("data-ripple-ready", "true");
  }

  function createButtonRipple(button, event) {
    ensureButtonRippleStructure(button);

    var layer = button.querySelector(":scope > .button__ripples");
    if (!layer) {
      return;
    }

    var rect = button.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height);
    var x = event.clientX - rect.left - size / 2;
    var y = event.clientY - rect.top - size / 2;
    var duration = 600;

    var ripple = document.createElement("span");
    ripple.className = "button__ripple";
    ripple.style.width = size + "px";
    ripple.style.height = size + "px";
    ripple.style.left = x + "px";
    ripple.style.top = y + "px";
    ripple.style.setProperty("--ripple-duration", duration + "ms");
    layer.appendChild(ripple);

    window.setTimeout(function () {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, duration);
  }

  function initRippleButtons() {
    document.addEventListener(
      "click",
      function (event) {
        var button = event.target.closest(".button");
        if (!button || button.hasAttribute("disabled") || button.getAttribute("aria-disabled") === "true") {
          return;
        }
        createButtonRipple(button, event);
      },
      true
    );
  }

  function getPhaseOrder(phase) {
    var order = { problem: 1, check: 2, solution: 3, ticket: 4 };
    return order[phase] || 0;
  }

  function bindCategoryCards() {
    document.querySelectorAll("[data-category]").forEach(function (card) {
      card.addEventListener("click", function () {
        var categoryId = card.getAttribute("data-category");
        ITN.diagnostics.start(categoryId);
        window.location.href = ITN.nav.resolvePath("pages/solution.html");
      });
    });
  }

  function bootHelp() {
    bindCategoryCards();
  }

  function bootSolution() {
    var params = new URLSearchParams(window.location.search);
    var categoryId = params.get("category");

    if (categoryId && !ITN.diagnostics.getSession()) {
      ITN.diagnostics.start(categoryId);
    }

    if (!ITN.diagnostics.getSession()) {
      window.location.href = ITN.nav.resolvePath("pages/help.html");
      return;
    }

    var container = document.getElementById("diagnosticContainer");
    var progressBar = document.getElementById("diagProgressBar");
    var progressLabel = document.getElementById("diagProgressLabel");
    var phaseSteps = document.querySelectorAll("[data-diag-phase]");

    function renderStep() {
      var step = ITN.diagnostics.getCurrentStep();
      var progress = ITN.diagnostics.getProgress();

      if (progressBar) {
        progressBar.style.width = progress.percent + "%";
      }
      if (progressLabel) {
        progressLabel.textContent = progress.label;
      }

      phaseSteps.forEach(function (el) {
        var phase = el.getAttribute("data-diag-phase");
        el.classList.toggle("is-active", phase === progress.phase);
        el.classList.toggle("is-current", phase === progress.phase);
        el.classList.toggle("is-done", getPhaseOrder(phase) < getPhaseOrder(progress.phase));
      });

      if (!container || !step) {
        return;
      }

      var html = '<div class="card card-pad step-panel">';
      html += "<h2>" + escapeHtml(step.title) + "</h2>";
      html += '<p class="text-muted" style="margin-top:8px;">' + escapeHtml(step.text) + "</p>";

      if (step.type === "check" && step.checks) {
        html += '<div class="check-list">';
        step.checks.forEach(function (check) {
          html += '<div class="check-item"><span>✓</span><span>' + escapeHtml(check) + "</span></div>";
        });
        html += "</div>";
      }

      if (step.type === "solution" && step.solution) {
        html += '<div class="check-item" style="margin-top:16px;"><span>→</span><span>' + escapeHtml(step.solution) + "</span></div>";
      }

      if (step.options && step.options.length) {
        html += '<div class="diag-actions">';
        step.options.forEach(function (option) {
          html += '<button type="button" class="button button--secondary" data-option-id="' + option.id + '">' + escapeHtml(option.label) + "</button>";
        });
        html += "</div>";
      }

      html += "</div>";
      container.innerHTML = html;

      container.querySelectorAll("[data-option-id]").forEach(function (button) {
        button.addEventListener("click", function () {
          ITN.diagnostics.answer(button.getAttribute("data-option-id"));
          renderStep();
        });
      });
    }

    var resolvedBtn = document.getElementById("diagResolvedBtn");
    if (resolvedBtn) {
      resolvedBtn.addEventListener("click", function () {
        ITN.diagnostics.markResolved();
        ITN.nav.showToast("Отлично! Проблема решена самостоятельно.", "success");
        window.setTimeout(function () {
          window.location.href = ITN.nav.resolvePath("pages/profile.html");
        }, 900);
      });
    }

    var continueBtn = document.getElementById("diagContinueBtn");
    if (continueBtn) {
      continueBtn.addEventListener("click", function () {
        ITN.diagnostics.continueFlow();
        renderStep();
      });
    }

    var escalateBtn = document.getElementById("diagEscalateBtn");
    if (escalateBtn) {
      escalateBtn.addEventListener("click", function () {
        ITN.diagnostics.escalate();
        window.location.href = ITN.nav.resolvePath("pages/create-ticket.html?from=diagnostic");
      });
    }

    renderStep();
  }

  function bootCreateTicket() {
    var form = document.getElementById("createTicketForm");
    if (!form) {
      return;
    }

    var draft = ITN.diagnostics.buildTicketDraft();
    var hint = getQueryParam("hint");
    var titleInput = form.querySelector('[name="title"]');
    var descInput = form.querySelector('[name="description"]');
    var categoryInput = form.querySelector('[name="category"]');
    var priorityInput = form.querySelector('[name="priority"]');
    var deviceInput = form.querySelector('[name="device"]');
    var commentInput = form.querySelector('[name="comment"]');
    var draftBanner = document.getElementById("draftBanner");
    var fileInput = form.querySelector('[name="attachments"]');
    var fileList = document.getElementById("fileList");
    var selectedFiles = [];

    if (draft) {
      if (titleInput) titleInput.value = draft.title || "";
      if (descInput) descInput.value = draft.description || "";
      if (categoryInput) categoryInput.value = draft.category || "other";
      if (priorityInput) priorityInput.value = draft.priority || "medium";
      if (deviceInput) deviceInput.value = draft.device || "";
      if (draftBanner) {
        draftBanner.classList.remove("hidden");
        var summaryEl = draftBanner.querySelector("[data-draft-summary]");
        if (summaryEl) {
          summaryEl.textContent =
            (draft.diagnosticSummary && draft.diagnosticSummary.suggestedCause) ||
            "Данные диагностики перенесены в заявку.";
        }
      }
    } else if (hint && titleInput) {
      titleInput.value = hint;
      if (descInput) {
        descInput.value = "Проблема при выполнении навыка: " + hint;
      }
    }

    if (deviceInput && !deviceInput.value) {
      var profileForDevice = ITN.profile.get();
      if (profileForDevice && profileForDevice.devices && profileForDevice.devices[0]) {
        deviceInput.value =
          profileForDevice.devices[0].name + " (" + profileForDevice.devices[0].inventory + ")";
      }
    }

    if (fileInput && fileList) {
      fileInput.addEventListener("change", function () {
        selectedFiles = Array.prototype.slice.call(fileInput.files || []);
        fileList.innerHTML = selectedFiles
          .map(function (f) {
            return '<div class="file-item"><span>' + escapeHtml(f.name) + "</span></div>";
          })
          .join("");
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var profile = ITN.profile.get();

      var description = descInput ? descInput.value.trim() : "";
      if (commentInput && commentInput.value.trim()) {
        description += (description ? "\n\n" : "") + "Комментарий сотрудника: " + commentInput.value.trim();
      }

      var ticket = ITN.tickets.create({
        title: titleInput ? titleInput.value.trim() : "Новая заявка",
        description: description,
        category: categoryInput ? categoryInput.value : "other",
        priority: priorityInput ? priorityInput.value : "medium",
        device: deviceInput ? deviceInput.value.trim() : "",
        authorId: profile ? profile.id : "user-1",
        authorName: profile ? profile.name : "Сотрудник",
        diagnosticSummary: draft ? draft.diagnosticSummary : null,
        attachments: selectedFiles.map(function (f) {
          return { name: f.name, size: f.size };
        })
      });

      ITN.diagnostics.clearSession();
      ITN.nav.showToast("Заявка " + ticket.id + " создана", "success");
      window.location.href = ITN.nav.resolvePath("pages/ticket.html?id=" + encodeURIComponent(ticket.id));
    });
  }

  function bootTickets() {
    var container = document.getElementById("ticketsList");
    if (!container) {
      return;
    }

    var searchInput = document.getElementById("ticketSearch");
    var statusSelect = document.getElementById("ticketStatusFilter");
    var prioritySelect = document.getElementById("ticketPriorityFilter");

    function render() {
      var tickets = ITN.tickets
        .filterTickets({
          search: searchInput ? searchInput.value : "",
          status: statusSelect ? statusSelect.value : "",
          priority: prioritySelect ? prioritySelect.value : ""
        })
        .filter(function (t) {
          return t.authorId === "user-1";
        });

      ITN.tickets.renderList(container, tickets, {
        mode: "user",
        emptyMessage: "У вас пока нет заявок. Начните с диагностики или создайте заявку вручную.",
        emptyActionHtml:
          '<a class="button button--primary" href="' + ITN.nav.resolvePath("pages/help.html") + '">Нужна помощь</a>'
      });
    }

    [searchInput, statusSelect, prioritySelect].forEach(function (el) {
      if (el) {
        el.addEventListener("input", render);
        el.addEventListener("change", render);
      }
    });

    render();
  }

  function bootTicketDetail() {
    var ticketId = getQueryParam("id");
    var ticket = ticketId ? ITN.tickets.getById(ticketId) : null;
    var container = document.getElementById("ticketDetail");

    if (!ticket || !container) {
      if (container) {
        container.innerHTML =
          '<div class="empty-state"><h3>Заявка не найдена</h3><p>Проверьте номер заявки или вернитесь к списку.</p></div>';
      }
      return;
    }

    var statusMeta = ITN.STATUS_META[ticket.status] || { label: ticket.status, badge: "" };
    var priorityMeta = ITN.PRIORITY_META[ticket.priority] || { label: ticket.priority, badge: "" };
    var assignee = ITN.SPECIALISTS.find(function (s) {
      return s.id === ticket.assigneeId;
    });

    var statusTone = getTicketStatusTone(ticket.status);

    container.innerHTML =
      buildTicketStatusStepperHtml(ticket.status) +
      '<div class="ticket-detail-layout">' +
      '<article class="ticket-feed-item ' +
      statusTone +
      ' ticket-detail-summary">' +
      '<div class="ticket-feed-top"><span class="ticket-id">' +
      escapeHtml(ticket.id) +
      '</span><span class="badge ' +
      (statusMeta.badge || "") +
      '">' +
      escapeHtml(statusMeta.label) +
      "</span></div>" +
      "<h2>" +
      escapeHtml(ticket.title) +
      '</h2><p class="ticket-detail-body">' +
      escapeHtml(ticket.description) +
      "</p></article>" +
      '<aside class="inventory-block ticket-meta-block">' +
      '<p class="block-kicker">Параметры</p>' +
      '<ul class="inventory-ledger">' +
      '<li class="inventory-row"><span class="inventory-id">Статус</span><div class="inventory-copy"><strong>' +
      escapeHtml(statusMeta.label) +
      '</strong></div><span class="badge ' +
      (priorityMeta.badge || "") +
      '">' +
      escapeHtml(priorityMeta.label) +
      "</span></li>" +
      '<li class="inventory-row"><span class="inventory-id">Исполнитель</span><div class="inventory-copy"><strong>' +
      escapeHtml(assignee ? assignee.name : "Не назначен") +
      "</strong></div></li>" +
      '<li class="inventory-row"><span class="inventory-id">Срок</span><div class="inventory-copy"><strong>' +
      ITN.tickets.formatDate(ticket.dueAt) +
      "</strong></div></li>" +
      '<li class="inventory-row"><span class="inventory-id">Устройство</span><div class="inventory-copy"><strong>' +
      escapeHtml(ticket.device || "Не указано") +
      "</strong></div></li>" +
      "</ul></aside></div>" +
      '<section class="timeline-block"><header class="block-head"><p class="block-kicker">Хронология</p><h2>История изменений</h2></header><ul class="timeline">' +
      (ticket.history || [])
        .map(function (item) {
          return (
            '<li class="timeline-item"><strong>' +
            escapeHtml((ITN.STATUS_META[item.status] && ITN.STATUS_META[item.status].label) || item.status) +
            "</strong><p>" +
            escapeHtml(item.note) +
            "</p><small>" +
            ITN.tickets.formatDate(item.at) +
            " · " +
            escapeHtml(item.actor) +
            "</small></li>"
          );
        })
        .join("") +
      "</ul></section>";
  }

  function getCategoryLabel(categoryId) {
    var labels = {
      login: "Вход и пароли",
      network: "Сеть и VPN",
      software: "Программы",
      access: "Доступ",
      device: "Устройства",
      install: "Установка ПО",
      other: "Другое"
    };
    return labels[categoryId] || categoryId || "Другое";
  }

  function normalizeDeviceStatus(status) {
    var raw = String(status || "").trim().toLowerCase();
    if (!raw) {
      return { label: "В работе", tone: "ok" };
    }
    if (raw === "в работе" || raw === "активен" || raw === "активна" || raw === "корпоративный") {
      return { label: "В работе", tone: "ok" };
    }
    if (raw === "подключена" || raw === "подключён" || raw === "подключен") {
      return { label: "Подключена", tone: "ok" };
    }
    return { label: status, tone: "" };
  }

  function buildOpenTicketsFeedHtml() {
    var tickets = ITN.tickets
      .getAll()
      .filter(function (ticket) {
        return ticket.authorId === "user-1" && ticket.status !== "resolved";
      })
      .slice(0, 4);

    if (!tickets.length) {
      return '<p class="text-muted">Открытых обращений нет.</p>';
    }

    return tickets
      .map(function (ticket) {
        var statusMeta = ITN.STATUS_META[ticket.status] || { label: ticket.status, badge: "" };
        var tone = getTicketStatusTone(ticket.status);
        var assignee = ITN.SPECIALISTS.find(function (s) {
          return s.id === ticket.assigneeId;
        });

        return (
          '<a class="ticket-feed-item' +
          (tone ? " " + tone : "") +
          '" href="' +
          ITN.nav.resolvePath("pages/ticket.html?id=" + encodeURIComponent(ticket.id)) +
          '">' +
          '<div class="ticket-feed-top"><span class="ticket-id">' +
          escapeHtml(ticket.id) +
          '</span><span class="badge ' +
          (statusMeta.badge || "") +
          '">' +
          escapeHtml(statusMeta.label) +
          "</span></div>" +
          "<strong>" +
          escapeHtml(ticket.title) +
          "</strong>" +
          "<small>Исполнитель · " +
          escapeHtml(assignee ? assignee.name : "Не назначен") +
          "</small></a>"
        );
      })
      .join("");
  }

  function bootKnowledgeBase() {
    var grid = document.getElementById("kbGrid");
    var searchInput = document.getElementById("kbSearch");
    var filterButtons = document.querySelectorAll("[data-kb-filter]");
    if (!grid) {
      return;
    }

    var activeFilter = "";
    var focusArticleId = getQueryParam("id") || getQueryParam("article") || "";
    var initialQuery = getQueryParam("q") || getQueryParam("query");
    var initialCategory = getQueryParam("category");
    if (searchInput && initialQuery && !focusArticleId) {
      searchInput.value = initialQuery;
    }
    if (initialCategory) {
      activeFilter = initialCategory;
    }
    if (focusArticleId) {
      var focusedArticle = (ITN.KB_ARTICLES || []).find(function (article) {
        return article.id === focusArticleId;
      });
      if (focusedArticle) {
        activeFilter = "";
        if (searchInput) {
          searchInput.value = "";
          searchInput.placeholder = "Открыта статья: " + focusedArticle.title;
        }
      } else {
        focusArticleId = "";
      }
    }

    function syncFilterButtons() {
      filterButtons.forEach(function (button) {
        var value = button.getAttribute("data-kb-filter") || "";
        var isActive = value === activeFilter;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    }

    function render() {
      var query = searchInput ? searchInput.value.trim().toLowerCase() : "";
      var articles = ITN.KB_ARTICLES.filter(function (article) {
        if (focusArticleId && !query) {
          return article.id === focusArticleId;
        }
        if (activeFilter && article.category !== activeFilter) {
          return false;
        }
        if (!query) return true;
        return (
          (article.title + " " + article.summary + " " + getCategoryLabel(article.category) + " " + (article.steps || []).join(" "))
            .toLowerCase()
            .indexOf(query) !== -1
        );
      });

      if (!articles.length) {
        grid.innerHTML =
          '<div class="empty-state"><h3>Ничего не найдено</h3><p>Попробуйте другой запрос или сбросьте фильтр категории.</p></div>';
        return;
      }

      grid.innerHTML = articles
        .map(function (article) {
          var steps = (article.steps || [])
            .map(function (step, stepIndex) {
              return "<li>" + (stepIndex + 1) + ". " + escapeHtml(step) + "</li>";
            })
            .join("");
          var isFocused = focusArticleId && article.id === focusArticleId;

          return (
            '<article class="kb-article' +
            (isFocused ? " kb-article--focused" : "") +
            '" data-article-id="' +
            article.id +
            '" id="article-' +
            article.id +
            '">' +
            '<div class="kb-article-body">' +
            '<span class="badge badge--teal">' +
            escapeHtml(getCategoryLabel(article.category)) +
            "</span>" +
            "<h3>" +
            escapeHtml(article.title) +
            "</h3>" +
            "<p>" +
            escapeHtml(article.summary) +
            "</p>" +
            (steps ? '<ol class="kb-steps">' + steps + "</ol>" : "") +
            '<div class="rating-row">' +
            '<button type="button" class="button button--success button--small" data-rate="helpful">Полезно</button>' +
            '<button type="button" class="button button--danger button--small" data-rate="notHelpful">Не помогло — создать заявку</button>' +
            "</div></div></article>"
          );
        })
        .join("");

      if (focusArticleId && !query) {
        var focusedCard = grid.querySelector("#article-" + focusArticleId);
        if (focusedCard && typeof focusedCard.scrollIntoView === "function") {
          window.setTimeout(function () {
            focusedCard.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 40);
        }
      }

      grid.querySelectorAll("[data-rate]").forEach(function (button) {
        button.addEventListener("click", function () {
          var card = button.closest("[data-article-id]");
          var articleId = card.getAttribute("data-article-id");
          var ratings = ITN.loadJSON(ITN.STORAGE_KEYS.kbRatings, {});
          ratings[articleId] = ratings[articleId] || { helpful: 0, notHelpful: 0 };
          if (button.getAttribute("data-rate") === "helpful") {
            ratings[articleId].helpful += 1;
            ITN.nav.showToast("Спасибо за отзыв!", "success");
          } else {
            ratings[articleId].notHelpful += 1;
            ITN.nav.showToast("Переходим к созданию заявки", "info");
            window.location.href = ITN.nav.resolvePath("pages/create-ticket.html");
            return;
          }
          ITN.saveJSON(ITN.STORAGE_KEYS.kbRatings, ratings);
        });
      });
    }

    filterButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        focusArticleId = "";
        if (searchInput && searchInput.placeholder.indexOf("Открыта статья:") === 0) {
          searchInput.placeholder = "Например: VPN, пароль, Teams, доступ";
        }
        activeFilter = button.getAttribute("data-kb-filter") || "";
        syncFilterButtons();
        render();
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        if (searchInput.value.trim()) {
          focusArticleId = "";
          if (searchInput.placeholder.indexOf("Открыта статья:") === 0) {
            searchInput.placeholder = "Например: VPN, пароль, Teams, доступ";
          }
        }
        render();
      });
    }

    syncFilterButtons();
    render();
  }

  function buildEmployeeSkillRows() {
    return ITN.missions.getAll()
      .map(function (skill) {
        return buildSkillProgressItemHtml(skill, ITN.missions.getProgress(skill.id));
      })
      .join("");
  }

  function bootHome() {
    var box = document.getElementById("homeArticles");
    if (!box) {
      return;
    }

    var preferredIds = ["kb-002", "kb-003", "kb-004", "kb-001"];
    var byId = {};
    (ITN.KB_ARTICLES || []).forEach(function (article) {
      byId[article.id] = article;
    });

    var articles = preferredIds
      .map(function (id) {
        return byId[id];
      })
      .filter(Boolean);

    if (!articles.length) {
      articles = (ITN.KB_ARTICLES || []).slice(0, 4);
    }

    box.innerHTML = articles
      .map(function (article) {
        return (
          '<a class="article-shelf-item" href="' +
          ITN.nav.resolvePath("pages/knowledge-base.html?q=" + encodeURIComponent(article.title)) +
          '">' +
          '<span class="article-shelf-copy"><strong>' +
          escapeHtml(article.title) +
          "</strong><small>" +
          escapeHtml(getCategoryLabel(article.category)) +
          '</small></span><span class="article-shelf-arrow" aria-hidden="true">→</span></a>'
        );
      })
      .join("");
  }

  function bootMissions() {
    var grid = document.getElementById("missionsGrid");
    var sidebar = document.getElementById("skillSidebar");
    if (!grid) {
      return;
    }

    var selectedMissionId = null;

    function render() {
      var missions = ITN.missions.getAll();
      if (!selectedMissionId && missions[0]) {
        selectedMissionId = missions[0].id;
      }

      grid.innerHTML = missions
        .map(function (mission) {
          var progress = ITN.missions.getProgress(mission.id);
          var doneMark = progress.percent === 100 ? '<span class="badge badge--done">Готово</span>' : "";

          return (
            '<button type="button" class="skill-tile' +
            (selectedMissionId === mission.id ? " is-selected" : "") +
            '" data-open-skill="' +
            mission.id +
            '" aria-pressed="' +
            (selectedMissionId === mission.id ? "true" : "false") +
            '">' +
            glassIconHtml(getSkillIcon(mission.id), getSkillGlassColor(mission.id), {
              label: mission.title,
              size: "md",
              done: progress.percent === 100
            }) +
            '<span class="skill-tile__copy">' +
            '<span class="skill-tile__header"><h3>' +
            escapeHtml(mission.title) +
            "</h3>" +
            doneMark +
            '</span><span class="skill-tile__bar" aria-hidden="true"><span style="width:' +
            progress.percent +
            '%"></span></span>' +
            '<span class="skill-tile__meta">' +
            progress.done +
            " из " +
            progress.total +
            " шагов · " +
            escapeHtml(mission.choice || "Выбор ещё не указан") +
            "</span></span>" +
            '<span class="skill-tile__pct">' +
            progress.percent +
            "%</span></button>"
          );
        })
        .join("");

      grid.querySelectorAll("[data-open-skill]").forEach(function (button) {
        button.addEventListener("click", function () {
          selectedMissionId = button.getAttribute("data-open-skill");
          render();
        });
      });

      renderSidebar(selectedMissionId);
    }

    function renderSidebar(missionId) {
      var mission = ITN.missions.getById(missionId);
      if (!sidebar || !mission) return;

      var progress = ITN.missions.getProgress(mission.id);
      var stepsHtml = mission.steps
        .map(function (step) {
          var article =
            step.articleId &&
            (ITN.KB_ARTICLES || []).find(function (item) {
              return item.id === step.articleId;
            });
          var kbLink = article
            ? '<a class="button button--ghost button--small" href="' +
              ITN.nav.resolvePath(
                "pages/knowledge-base.html?id=" + encodeURIComponent(article.id)
              ) +
              '">Инструкция по шагу</a>'
            : '<span class="text-muted" style="font-size:0.85rem;">Инструкция пока не привязана</span>';

          return (
            '<div class="check-item">' +
            '<input type="checkbox" data-mission="' +
            mission.id +
            '" data-step="' +
            step.id +
            '"' +
            (step.done ? " checked" : "") +
            " />" +
            "<span><b>" +
            escapeHtml(step.title) +
            "</b>" +
            "<br>" +
            kbLink +
            "</span></div>"
          );
        })
        .join("");

      sidebar.innerHTML =
        "<h2>" +
        escapeHtml(mission.title) +
        "</h2>" +
        '<p class="text-muted" style="margin-top:8px;">' +
        escapeHtml(mission.description) +
        "</p>" +
        '<div class="skill-choice" style="margin-top:14px;">' +
        escapeHtml(mission.choice || "Выбор ещё не указан") +
        "</div>" +
        buildSkillProgressItemHtml(mission, progress, { hideChoice: true, omitTitle: true }) +
        '<div class="check-list">' +
        stepsHtml +
        "</div>" +
        '<a class="button button--primary button--block" href="' +
        ITN.nav.resolvePath("pages/create-ticket.html?hint=" + encodeURIComponent(mission.ticketHint)) +
        '">Не получается — создать заявку</a>' +
        '<form id="addSkillStepForm" class="stack-sm" style="margin-top:16px;">' +
        '<label class="field-label" for="customSkillStep">Добавить свой шаг</label>' +
        '<input class="control" id="customSkillStep" name="customSkillStep" type="text" placeholder="Например: проверить доступ из домашней сети" />' +
        '<button class="button button--secondary button--block" type="submit">Добавить чекбокс</button>' +
        "</form>";

      sidebar.querySelectorAll("input[type=checkbox][data-mission]").forEach(function (checkbox) {
        checkbox.addEventListener("change", function () {
          ITN.missions.toggleStep(checkbox.getAttribute("data-mission"), checkbox.getAttribute("data-step"));
          render();
        });
      });

      var addStepForm = sidebar.querySelector("#addSkillStepForm");
      if (addStepForm) {
        addStepForm.addEventListener("submit", function (event) {
          event.preventDefault();
          var input = addStepForm.querySelector("#customSkillStep");
          if (input && input.value.trim()) {
            ITN.missions.addStep(mission.id, input.value.trim());
            render();
          }
        });
      }
    }

    render();
  }

  function bootProfile() {
    var container = document.getElementById("profileContainer");
    var profile = ITN.profile.get();
    if (!container || !profile) {
      return;
    }

    var locationLabel = profile.location || profile.workplace || "Локация не указана";

    container.innerHTML =
      '<article class="card employee-profile-card reveal">' +
      '<span class="hero-eyebrow">Профиль сотрудника</span>' +
      "<h1>" +
      escapeHtml(profile.name) +
      "</h1>" +
      '<p class="lead">' +
      escapeHtml(profile.position || "Сотрудник") +
      ", " +
      escapeHtml(profile.department) +
      "</p>" +
      '<div class="employee-meta">' +
      '<span class="badge badge--teal">' +
      escapeHtml(locationLabel) +
      "</span>" +
      '<span class="badge badge--teal">' +
      escapeHtml(profile.workplace || "Рабочее место не указано") +
      "</span>" +
      '<span class="badge badge--accepted">Внутренний номер ' +
      escapeHtml(profile.internalPhone || "—") +
      "</span></div>" +
      '<div class="detail-grid">' +
      detailItemHtml(PROFILE_ICONS.email, "Email", profile.email, false, "blue") +
      detailItemHtml(PROFILE_ICONS.phone, "Телефон", profile.phone || "Не указан", false, "green") +
      detailItemHtml(PROFILE_ICONS.laptop, "Ноутбук", profile.laptop || "Не указан", false, "orange") +
      detailItemHtml(PROFILE_ICONS.device, "Подключено", profile.connectedDevice || "Не указано", false, "red") +
      detailItemHtml(PROFILE_ICONS.network, "Сеть", profile.networkProfile || "Не указана", true, "indigo") +
      "</div></article>";
  }

  function bootDevices() {
    var container = document.getElementById("devicesContainer");
    var profile = ITN.profile.get();
    if (!container || !profile) {
      return;
    }

    var devicesHtml = (profile.devices || [])
      .map(function (device) {
        var status = normalizeDeviceStatus(device.status);
        return (
          '<li class="inventory-row">' +
          '<span class="inventory-id">' +
          escapeHtml(device.inventory || "—") +
          '</span><div class="inventory-copy"><strong>' +
          escapeHtml(device.name) +
          "</strong><small>" +
          escapeHtml(device.os || "") +
          '</small></div><span class="inventory-status' +
          (status.tone === "ok" ? " inventory-status--ok" : "") +
          '">' +
          escapeHtml(status.label) +
          "</span></li>"
        );
      })
      .join("");

    if (!devicesHtml) {
      devicesHtml = '<li class="inventory-row"><div class="inventory-copy"><strong>Устройств пока нет</strong><small>Когда техника будет закреплена, она появится здесь.</small></div></li>';
    }

    container.innerHTML =
      '<header class="page-intro reveal">' +
      '<p class="block-kicker">Инвентарь</p>' +
      "<h1>Мои устройства</h1>" +
      "<p>Устройства, закреплённые за сотрудником и рабочим местом.</p></header>" +
      '<section class="inventory-block reveal reveal-delay-1" aria-labelledby="devices-heading">' +
      '<h2 id="devices-heading" class="sr-only">Список устройств</h2>' +
      '<ul class="inventory-ledger">' +
      devicesHtml +
      "</ul></section>";
  }

  var pageBootHandlers = {
    home: bootProfile,
    profile: bootProfile,
    devices: bootDevices,
    help: bootHelp,
    solution: bootSolution,
    "create-ticket": bootCreateTicket,
    tickets: bootTickets,
    ticket: bootTicketDetail,
    "knowledge-base": bootKnowledgeBase,
    missions: bootMissions
  };

  ITN.app.init = function () {
    ITN.tickets.ensureSeed();
    ITN.profile.ensureSeed();
    ITN.missions.ensureSeed();

    if (!ITN.loadJSON(ITN.STORAGE_KEYS.stats, null)) {
      ITN.saveJSON(ITN.STORAGE_KEYS.stats, ITN.DEFAULT_STATS);
    }

    ITN.nav.initHeader();
    ensureToastRegion();
    initRippleButtons();
    if (ITN.specularButtons && typeof ITN.specularButtons.init === "function") {
      ITN.specularButtons.init();
    }

    var page = document.body.getAttribute("data-page") || ITN.nav.getCurrentPage();
    var boot = pageBootHandlers[page];

    if (typeof boot === "function") {
      boot();
    }

    document.dispatchEvent(
      new CustomEvent("itn:ready", {
        detail: { page: page }
      })
    );
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ITN.app.init);
  } else {
    ITN.app.init();
  }
})();
