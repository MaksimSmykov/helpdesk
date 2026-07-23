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

  function getPhaseOrder(phase) {
    var order = { problem: 1, check: 2, solution: 3, ticket: 4 };
    return order[phase] || 0;
  }

  function getServiceFieldOptions(fieldName) {
    var map = {
      duration: ["1 день", "1 неделя", "1 месяц", "Постоянный"],
      urgency: ["Обычная", "До конца недели", "Срочно"],
      client: ["Outlook", "Outlook Web", "Мобильный Outlook", "Другой"]
    };
    return map[fieldName] || ["Да", "Нет"];
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
    var serviceId = getQueryParam("service");
    var hint = getQueryParam("hint");
    var titleInput = form.querySelector('[name="title"]');
    var descInput = form.querySelector('[name="description"]');
    var categoryInput = form.querySelector('[name="category"]');
    var priorityInput = form.querySelector('[name="priority"]');
    var deviceInput = form.querySelector('[name="device"]');
    var commentInput = form.querySelector('[name="comment"]');
    var serviceFieldsBox = document.getElementById("serviceFields");
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
    } else if (serviceId) {
      var service = (ITN.SERVICES || []).find(function (s) {
        return s.id === serviceId;
      });
      if (service) {
        var serviceCategoryMap = {
          "svc-access": "access",
          "svc-install": "install",
          "svc-workplace": "device",
          "svc-equipment": "device",
          "svc-account": "access",
          "svc-email": "software"
        };
        if (titleInput) titleInput.value = service.title;
        if (descInput) descInput.value = service.description;
        if (categoryInput) {
          categoryInput.value = service.category || serviceCategoryMap[service.id] || "other";
        }
        if (serviceFieldsBox && service.fields) {
          serviceFieldsBox.classList.remove("hidden");
          serviceFieldsBox.innerHTML =
            "<h3>Поля услуги</h3><div class=\"form-grid\">" +
            service.fields
              .map(function (field) {
                var req = field.required ? " required" : "";
                var labelClass = field.required ? "field-label required" : "field-label";
                var id = "sf-" + field.name;
                if (field.type === "textarea") {
                  return (
                    '<div class="field field--full"><label class="' +
                    labelClass +
                    '" for="' +
                    id +
                    '">' +
                    escapeHtml(field.label) +
                    '</label><textarea class="control" id="' +
                    id +
                    '" name="sf_' +
                    field.name +
                    '"' +
                    req +
                    "></textarea></div>"
                  );
                }
                if (field.type === "select") {
                  var options = getServiceFieldOptions(field.name)
                    .map(function (opt) {
                      return '<option value="' + escapeHtml(opt) + '">' + escapeHtml(opt) + "</option>";
                    })
                    .join("");
                  return (
                    '<div class="field"><label class="' +
                    labelClass +
                    '" for="' +
                    id +
                    '">' +
                    escapeHtml(field.label) +
                    '</label><select class="control" id="' +
                    id +
                    '" name="sf_' +
                    field.name +
                    '"' +
                    req +
                    '><option value="">Выберите</option>' +
                    options +
                    "</select></div>"
                  );
                }
                return (
                  '<div class="field"><label class="' +
                  labelClass +
                  '" for="' +
                  id +
                  '">' +
                  escapeHtml(field.label) +
                  '</label><input class="control" id="' +
                  id +
                  '" name="sf_' +
                  field.name +
                  '" type="' +
                  (field.type || "text") +
                  '"' +
                  req +
                  " /></div>"
                );
              })
              .join("") +
            "</div>";
        }
      }
    } else if (hint && titleInput) {
      titleInput.value = hint;
      if (descInput) {
        descInput.value = "Проблема при выполнении IT-миссии: " + hint;
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
      var extra = [];

      form.querySelectorAll("[name^=sf_]").forEach(function (el) {
        if (!el.value.trim()) return;
        var labelEl = form.querySelector('label[for="' + el.id + '"]');
        var label = labelEl ? labelEl.textContent.replace(/\s*\*$/, "").trim() : el.name;
        extra.push(label + ": " + el.value.trim());
      });

      var description = descInput ? descInput.value.trim() : "";
      if (commentInput && commentInput.value.trim()) {
        description += (description ? "\n\n" : "") + "Комментарий сотрудника: " + commentInput.value.trim();
      }
      if (extra.length) {
        description += (description ? "\n\n" : "") + "Данные услуги:\n" + extra.join("\n");
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

    var historyHtml = (ticket.history || [])
      .map(function (item) {
        return (
          '<li class="history-item"><strong>' +
          escapeHtml((ITN.STATUS_META[item.status] && ITN.STATUS_META[item.status].label) || item.status) +
          "</strong><br>" +
          escapeHtml(item.note) +
          "<br><small>" +
          ITN.tickets.formatDate(item.at) +
          " · " +
          escapeHtml(item.actor) +
          "</small></li>"
        );
      })
      .join("");

    container.innerHTML =
      '<div class="detail-grid">' +
      '<div class="card card-pad"><span class="ticket-id">' +
      escapeHtml(ticket.id) +
      "</span><h2 style=\"margin-top:8px;\">" +
      escapeHtml(ticket.title) +
      '</h2><p class="text-muted" style="margin-top:10px;white-space:pre-wrap;">' +
      escapeHtml(ticket.description) +
      "</p></div>" +
      '<div class="card card-pad">' +
      '<p><strong>Статус:</strong> <span class="badge ' +
      (statusMeta.badge || "") +
      '">' +
      escapeHtml(statusMeta.label) +
      "</span></p>" +
      '<p style="margin-top:8px;"><strong>Приоритет:</strong> <span class="badge ' +
      (priorityMeta.badge || "") +
      '">' +
      escapeHtml(priorityMeta.label) +
      "</span></p>" +
      '<p style="margin-top:8px;"><strong>Исполнитель:</strong> ' +
      escapeHtml(assignee ? assignee.name : "Не назначен") +
      "</p>" +
      '<p style="margin-top:8px;"><strong>Срок:</strong> ' +
      ITN.tickets.formatDate(ticket.dueAt) +
      "</p>" +
      '<p style="margin-top:8px;"><strong>Устройство:</strong> ' +
      escapeHtml(ticket.device || "Не указано") +
      "</p></div></div>" +
      '<div class="card card-pad" style="margin-top:16px;"><h3>История изменений</h3><ul class="history-list">' +
      historyHtml +
      "</ul></div>";
  }

  function bootKnowledgeBase() {
    var grid = document.getElementById("kbGrid");
    var searchInput = document.getElementById("kbSearch");
    if (!grid) {
      return;
    }

    function render() {
      var query = searchInput ? searchInput.value.trim().toLowerCase() : "";
      var articles = ITN.KB_ARTICLES.filter(function (article) {
        if (!query) return true;
        return (article.title + " " + article.summary + " " + article.category).toLowerCase().indexOf(query) !== -1;
      });

      grid.innerHTML = articles
        .map(function (article) {
          var steps = (article.steps || [])
            .map(function (step, index) {
              return "<li>" + (index + 1) + ". " + escapeHtml(step) + "</li>";
            })
            .join("");

          return (
            '<article class="card article-card" data-article-id="' +
            article.id +
            '">' +
            '<span class="badge badge--teal">' +
            escapeHtml(article.category) +
            "</span>" +
            "<h3>" +
            escapeHtml(article.title) +
            "</h3>" +
            "<p>" +
            escapeHtml(article.summary) +
            "</p>" +
            (steps
              ? '<ol style="padding-left:18px;color:var(--text-muted);font-size:0.88rem;margin:8px 0;">' +
                steps +
                "</ol>"
              : "") +
            '<div class="rating-row">' +
            '<button type="button" class="button button--ghost button--small" data-rate="helpful">Полезно</button>' +
            '<button type="button" class="button button--ghost button--small" data-rate="notHelpful">Не помогло — создать заявку</button>' +
            "</div></article>"
          );
        })
        .join("");

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

    if (searchInput) {
      searchInput.addEventListener("input", render);
    }
    render();
  }

  function bootServices() {
    var grid = document.getElementById("servicesGrid");
    if (!grid) {
      return;
    }

    grid.innerHTML = ITN.SERVICES.map(function (service) {
      var fields = service.fields
        .map(function (field) {
          return "<li>" + escapeHtml(field.label) + (field.required ? " *" : "") + "</li>";
        })
        .join("");

      return (
        '<article class="card service-card">' +
        "<h3>" +
        escapeHtml(service.title) +
        "</h3>" +
        "<p>" +
        escapeHtml(service.description) +
        "</p>" +
        '<ul style="padding-left:18px;color:var(--text-muted);font-size:0.88rem;">' +
        fields +
        "</ul>" +
        '<a class="button button--secondary" href="' +
        ITN.nav.resolvePath("pages/create-ticket.html?service=" + encodeURIComponent(service.id)) +
        '">Оформить</a>' +
        "</article>"
      );
    }).join("");
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
            '<button type="button" class="card mission-card card--hover" data-open-skill="' +
            mission.id +
            '" aria-pressed="' +
            (selectedMissionId === mission.id ? "true" : "false") +
            '">' +
            doneMark +
            "<h3>" +
            escapeHtml(mission.title) +
            "</h3>" +
            "<p>" +
            escapeHtml(mission.description) +
            "</p>" +
            '<div class="progress-bar" aria-hidden="true"><span style="width:' +
            progress.percent +
            '%"></span></div>' +
            "<small>" +
            progress.done +
            " / " +
            progress.total +
            " шагов</small>" +
            '<div class="skill-choice">' +
            escapeHtml(mission.choice || "Выбор ещё не указан") +
            "</div>" +
            "</button>"
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
          var kbLink =
            '<a class="button button--ghost button--small" href="' +
            ITN.nav.resolvePath("pages/knowledge-base.html") +
            '">Открыть инструкцию</a>';

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
            (!step.done ? "<br>" + kbLink : "") +
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
        '<div class="progress-bar" style="margin-top:16px;"><span style="width:' +
        progress.percent +
        '%"></span></div>' +
        '<p class="text-muted" style="margin-top:8px;">Прогресс: ' +
        progress.done +
        " из " +
        progress.total +
        " шагов (" +
        progress.percent +
        "%)</p>" +
        '<div class="check-list">' +
        stepsHtml +
        "</div>" +
        '<a class="button button--primary button--block" href="' +
        ITN.nav.resolvePath("pages/create-ticket.html?hint=" + encodeURIComponent(mission.ticketHint)) +
        '">Не получается — создать заявку</a>';

      sidebar.querySelectorAll("input[type=checkbox][data-mission]").forEach(function (checkbox) {
        checkbox.addEventListener("change", function () {
          ITN.missions.toggleStep(checkbox.getAttribute("data-mission"), checkbox.getAttribute("data-step"));
          render();
        });
      });
    }

    render();
  }

  function bootProfile() {
    var container = document.getElementById("profileContainer");
    var profile = ITN.profile.get();
    if (!container || !profile) {
      return;
    }

    var openCount = ITN.profile.getOpenTicketsCount();
    var skillsHtml = ITN.missions.getAll()
      .map(function (skill) {
        var progress = ITN.missions.getProgress(skill.id);
        var doneMark = progress.percent === 100 ? " ✓" : "";
        return (
          '<div class="skill-row"><strong>' +
          escapeHtml(skill.title) +
          doneMark +
          '</strong><div class="progress-bar"><span style="width:' +
          progress.percent +
          '%"></span></div><small>' +
          progress.done +
          " из " +
          progress.total +
          " шагов · " +
          escapeHtml(skill.choice || "Выбор ещё не указан") +
          "</small></div>"
        );
      })
      .join("");

    var devicesHtml = (profile.devices || [])
      .map(function (device) {
        return (
          '<div class="device-row"><strong>' +
          escapeHtml(device.name) +
          "</strong><br><small>" +
          escapeHtml(device.inventory) +
          " · " +
          escapeHtml(device.status) +
          (device.os ? " · " + escapeHtml(device.os) : "") +
          "</small></div>"
        );
      })
      .join("");

    var resolvedHtml = (profile.resolvedProblems || [])
      .map(function (item) {
        return (
          '<div class="history-item"><strong>' +
          escapeHtml(item.title) +
          "</strong><br><small>" +
          escapeHtml(item.date) +
          "</small></div>"
        );
      })
      .join("");

    var servicesHtml = (profile.services || [])
      .map(function (svc) {
        return '<span class="badge badge--teal">' + escapeHtml(svc) + "</span>";
      })
      .join(" ");

    var achievementsHtml = (profile.achievements || [])
      .map(function (item) {
        return '<div class="history-item">' + escapeHtml(item) + "</div>";
      })
      .join("");

    container.innerHTML =
      '<div class="profile-grid">' +
      '<div class="card card-pad"><h2>' +
      escapeHtml(profile.name) +
      "</h2>" +
      '<p class="text-muted">' +
      escapeHtml(profile.position || "Сотрудник") +
      " · " +
      escapeHtml(profile.department) +
      " · " +
      escapeHtml(profile.email) +
      "</p>" +
      '<div class="detail-grid" style="margin-top:16px;">' +
      '<div class="detail-item"><span>Телефон</span><b>' +
      escapeHtml(profile.phone || "Не указан") +
      "</b></div>" +
      '<div class="detail-item"><span>Внутренний номер</span><b>' +
      escapeHtml(profile.internalPhone || "Не указан") +
      "</b></div>" +
      '<div class="detail-item"><span>Рабочее место</span><b>' +
      escapeHtml(profile.workplace || "Не указано") +
      "</b></div>" +
      '<div class="detail-item"><span>Руководитель</span><b>' +
      escapeHtml(profile.manager || "Не указан") +
      "</b></div>" +
      '<div class="detail-item detail-item--full"><span>Ноутбук</span><b>' +
      escapeHtml(profile.laptop || "Не указан") +
      "</b></div>" +
      '<div class="detail-item detail-item--full"><span>Подключённое устройство</span><b>' +
      escapeHtml(profile.connectedDevice || "Не указано") +
      "</b></div>" +
      '<div class="detail-item detail-item--full"><span>Сеть</span><b>' +
      escapeHtml(profile.networkProfile || "Не указана") +
      "</b></div></div>" +
      '<p style="margin-top:10px;"><strong>Открытых заявок:</strong> ' +
      openCount +
      "</p>" +
      "<p><strong>Сэкономлено времени:</strong> " +
      ITN.profile.formatTimeSaved(profile.timeSavedMinutes) +
      '</p><div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:8px;">' +
      servicesHtml +
      "</div></div>" +
      '<div class="card card-pad"><h3>Устройства</h3><div class="device-list">' +
      devicesHtml +
      "</div></div></div>" +
      '<div class="card card-pad" style="margin-top:16px;"><h3>Цифровые навыки</h3><div class="skill-list">' +
      skillsHtml +
      "</div></div>" +
      '<div class="profile-grid" style="margin-top:16px;">' +
      '<div class="card card-pad"><h3>Решённые проблемы</h3><div class="history-list">' +
      resolvedHtml +
      "</div></div>" +
      '<div class="card card-pad"><h3>Полезные достижения</h3><div class="history-list">' +
      achievementsHtml +
      "</div></div></div>";
  }

  function statCard(label, value) {
    return (
      '<div class="card stat-card"><span>' +
      escapeHtml(label) +
      "</span><strong>" +
      escapeHtml(String(value)) +
      "</strong></div>"
    );
  }

  function bootDashboard() {
    var stats = ITN.loadJSON(ITN.STORAGE_KEYS.stats, ITN.DEFAULT_STATS);
    var container = document.getElementById("dashboardStats");
    var ticketsContainer = document.getElementById("adminTicketsContainer");

    if (container) {
      container.innerHTML =
        '<div class="stats-grid">' +
        statCard("Входящие", stats.incoming) +
        statCard("В работе", stats.inProgress) +
        statCard("Решено", stats.resolved) +
        statCard("Предотвращено", stats.prevented) +
        statCard("Часы сэкономлены", stats.hoursSaved) +
        statCard("SLA, %", stats.slaCompliance) +
        "</div>";
    }

    var recurringBox = document.getElementById("recurringIssuesList");
    if (recurringBox && stats.recurringIssues) {
      recurringBox.innerHTML = stats.recurringIssues
        .map(function (item) {
          return (
            '<div class="history-item"><strong>' +
            escapeHtml(item.title) +
            "</strong><br><small>" +
            item.count +
            " обращений</small></div>"
          );
        })
        .join("");
    }

    var loadBox = document.getElementById("specialistLoadList");
    if (loadBox && stats.specialistLoad) {
      loadBox.innerHTML = stats.specialistLoad
        .map(function (item) {
          return (
            '<div class="skill-row"><strong>' +
            escapeHtml(item.name) +
            " — " +
            item.tickets +
            ' заявок</strong><div class="progress-bar" aria-hidden="true"><span style="width:' +
            item.workload +
            '%"></span></div></div>'
          );
        })
        .join("");
    }

    var popularBox = document.getElementById("popularCategoriesList");
    if (popularBox && stats.popularCategories) {
      popularBox.innerHTML = stats.popularCategories
        .map(function (item) {
          return (
            '<div class="history-item"><strong>' +
            escapeHtml(item.label) +
            "</strong><br><small>" +
            item.count +
            " заявок</small></div>"
          );
        })
        .join("");
    }

    if (ticketsContainer) {
      var searchInput = document.getElementById("adminTicketSearch");
      var statusSelect = document.getElementById("adminStatusFilter");
      var prioritySelect = document.getElementById("adminPriorityFilter");
      var assigneeSelect = document.getElementById("adminAssigneeFilter");

      function renderTickets() {
        var tickets = ITN.tickets.filterTickets({
          search: searchInput ? searchInput.value : "",
          status: statusSelect ? statusSelect.value : "",
          priority: prioritySelect ? prioritySelect.value : "",
          assignee: assigneeSelect ? assigneeSelect.value : ""
        });

        ITN.tickets.renderList(ticketsContainer, tickets, {
          mode: "admin",
          onAction: function (action, id) {
            window.location.href =
              ITN.nav.resolvePath("pages/ticket.html?id=" + encodeURIComponent(id) + "&admin=1");
          }
        });
      }

      [searchInput, statusSelect, prioritySelect, assigneeSelect].forEach(function (el) {
        if (el) {
          el.addEventListener("input", renderTickets);
          el.addEventListener("change", renderTickets);
        }
      });

      var bulkBtn = document.getElementById("adminBulkAssign");
      if (bulkBtn) {
        bulkBtn.addEventListener("click", function () {
          ITN.nav.showToast("Выберите заявку и назначьте специалиста на странице деталей", "info");
        });
      }

      renderTickets();
    }
  }

  function bindTicketAdminForms() {
    var assignForm = document.getElementById("ticketAssignForm");
    if (assignForm) {
      assignForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var ticketId = getQueryParam("id");
        var specialistId = document.getElementById("assignSpecialist")
          ? document.getElementById("assignSpecialist").value
          : "";
        if (ticketId && specialistId) {
          ITN.tickets.assign(ticketId, specialistId);
          ITN.nav.showToast("Специалист назначен", "success");
          bootTicketDetail();
        }
      });
    }

    var statusForm = document.getElementById("ticketStatusForm");
    if (statusForm) {
      statusForm.addEventListener("submit", function (event) {
        event.preventDefault();
        var ticketId = getQueryParam("id");
        var status = document.getElementById("ticketStatus")
          ? document.getElementById("ticketStatus").value
          : "";
        if (ticketId && status) {
          ITN.tickets.updateStatus(
            ticketId,
            status,
            "Статус обновлён через панель специалиста",
            "IT-оператор"
          );
          ITN.nav.showToast("Статус обновлён", "success");
          bootTicketDetail();
        }
      });
    }
  }

  var pageBootHandlers = {
    home: function () {},
    help: bootHelp,
    solution: bootSolution,
    "create-ticket": bootCreateTicket,
    tickets: bootTickets,
    ticket: function () {
      bootTicketDetail();
      bindTicketAdminForms();
    },
    "knowledge-base": bootKnowledgeBase,
    services: bootServices,
    missions: bootMissions,
    profile: bootProfile,
    dashboard: bootDashboard
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
