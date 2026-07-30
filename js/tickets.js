(function () {
  "use strict";

  window.ITN = window.ITN || {};
  var ITN = window.ITN;

  ITN.tickets = ITN.tickets || {};

  function getSpecialistName(id) {
    if (!id) {
      return "Не назначен";
    }
    var spec = ITN.SPECIALISTS.find(function (s) {
      return s.id === id;
    });
    return spec ? spec.name : "Неизвестно";
  }

  function getCategoryTitle(id) {
    var cat = ITN.CATEGORIES.find(function (c) {
      return c.id === id;
    });
    return cat ? cat.title : id || "—";
  }

  ITN.tickets.getAll = function () {
    return ITN.loadJSON(ITN.STORAGE_KEYS.tickets, []);
  };

  ITN.tickets.saveAll = function (tickets) {
    return ITN.saveJSON(ITN.STORAGE_KEYS.tickets, tickets);
  };

  ITN.tickets.ensureSeed = function () {
    var tickets = ITN.tickets.getAll();
    if (!tickets.length) {
      ITN.tickets.saveAll(JSON.parse(JSON.stringify(ITN.DEMO_TICKETS)));
    }
  };

  ITN.tickets.getById = function (id) {
    return ITN.tickets.getAll().find(function (t) {
      return t.id === id;
    }) || null;
  };

  ITN.tickets.create = function (ticketData) {
    var tickets = ITN.tickets.getAll();
    var now = ITN.nowISO();
    var priority = ticketData.priority || "medium";
    var slaHours = ITN.PRIORITY_META[priority]
      ? ITN.PRIORITY_META[priority].slaHours
      : 24;
    var dueAt = new Date(Date.now() + slaHours * 3600000).toISOString();

    var ticket = {
      id: ticketData.id || "TKT-" + new Date().getFullYear() + "-" + String(tickets.length + 1).padStart(4, "0"),
      title: ticketData.title || "Новая заявка",
      description: ticketData.description || "",
      category: ticketData.category || "other",
      status: "accepted",
      priority: priority,
      assigneeId: ticketData.assigneeId || null,
      authorId: ticketData.authorId || "user-1",
      authorName: ticketData.authorName || "Сотрудник",
      device: ticketData.device || "",
      createdAt: now,
      updatedAt: now,
      dueAt: ticketData.dueAt || dueAt,
      diagnosticSummary: ticketData.diagnosticSummary || null,
      attachment: ticketData.attachments || ticketData.attachment || null,
      history: [
        {
          at: now,
          status: "accepted",
          note: ticketData.historyNote || "Заявка создана",
          actor: ticketData.authorName || "Сотрудник"
        }
      ]
    };

    tickets.unshift(ticket);
    ITN.tickets.saveAll(tickets);
    return ticket;
  };

  ITN.tickets.updateStatus = function (id, status, note, actor) {
    var tickets = ITN.tickets.getAll();
    var ticket = tickets.find(function (t) {
      return t.id === id;
    });

    if (!ticket) {
      return null;
    }

    var now = ITN.nowISO();
    ticket.status = status;
    ticket.updatedAt = now;
    ticket.history = ticket.history || [];
    ticket.history.push({
      at: now,
      status: status,
      note: note || ITN.STATUS_META[status].label,
      actor: actor || "IT-отдел"
    });

    ITN.tickets.saveAll(tickets);
    return ticket;
  };

  ITN.tickets.assign = function (id, specialistId, actor) {
    var tickets = ITN.tickets.getAll();
    var ticket = tickets.find(function (t) {
      return t.id === id;
    });

    if (!ticket) {
      return null;
    }

    var now = ITN.nowISO();
    ticket.assigneeId = specialistId;
    ticket.status = ticket.status === "accepted" ? "assigned" : ticket.status;
    ticket.updatedAt = now;
    ticket.history = ticket.history || [];
    ticket.history.push({
      at: now,
      status: "assigned",
      note: "Назначен специалист: " + getSpecialistName(specialistId),
      actor: actor || "Диспетчер IT"
    });

    ITN.tickets.saveAll(tickets);
    return ticket;
  };

  ITN.tickets.filterTickets = function (filters) {
    filters = filters || {};
    var search = (filters.search || "").trim().toLowerCase();
    var status = filters.status || "";
    var priority = filters.priority || "";
    var assignee = filters.assignee || "";

    return ITN.tickets.getAll().filter(function (ticket) {
      if (status && ticket.status !== status) {
        return false;
      }
      if (priority && ticket.priority !== priority) {
        return false;
      }
      if (assignee === "none" && ticket.assigneeId) {
        return false;
      }
      if (assignee && assignee !== "none" && ticket.assigneeId !== assignee) {
        return false;
      }
      if (search) {
        var haystack = [
          ticket.id,
          ticket.title,
          ticket.description,
          ticket.authorName,
          getCategoryTitle(ticket.category),
          getSpecialistName(ticket.assigneeId)
        ]
          .join(" ")
          .toLowerCase();
        if (haystack.indexOf(search) === -1) {
          return false;
        }
      }
      return true;
    });
  };

  ITN.tickets.formatDate = function (iso) {
    if (!iso) {
      return "—";
    }
    try {
      return new Intl.DateTimeFormat("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(iso));
    } catch (error) {
      return iso;
    }
  };

  ITN.tickets.isOverdue = function (ticket) {
    if (!ticket || !ticket.dueAt || ticket.status === "resolved") {
      return false;
    }
    var dueMs = new Date(ticket.dueAt).getTime();
    if (isNaN(dueMs)) {
      return false;
    }
    return dueMs < Date.now();
  };

  ITN.tickets.renderList = function (container, tickets, options) {
    if (!container) {
      return;
    }

    options = options || {};
    var mode = options.mode || "user";
    var emptyMessage = options.emptyMessage || "Заявок пока нет";
    var detailBase = options.detailBase || ITN.nav.resolvePath("pages/ticket.html");
    var onAction = typeof options.onAction === "function" ? options.onAction : null;

    if (!tickets.length) {
      container.innerHTML =
        '<div class="empty-state">' +
        "<h3>Нет заявок</h3>" +
        "<p>" + emptyMessage + "</p>" +
        (options.emptyActionHtml || "") +
        "</div>";
      return;
    }

    var isAdmin = mode === "admin";
    var headers = isAdmin
      ? ["№ заявки", "Тема", "Статус", "Приоритет", "Исполнитель", "Срок", "Действия"]
      : ["№ заявки", "Тема", "Статус", "Приоритет", "Исполнитель", "Срок", "Обновлено"];

    var headCells = headers
      .map(function (h) {
        return '<div class="tickets-grid-table__cell tickets-grid-table__cell--head" role="columnheader">' + h + "</div>";
      })
      .join("");

    var rows = tickets
      .map(function (ticket, index) {
        var statusMeta = ITN.STATUS_META[ticket.status] || { label: ticket.status, badge: "" };
        var priorityMeta = ITN.PRIORITY_META[ticket.priority] || { label: ticket.priority, badge: "" };
        var overdueClass = ITN.tickets.isOverdue(ticket) ? " is-overdue" : "";
        var detailUrl = detailBase + "?id=" + encodeURIComponent(ticket.id);
        var toneClass = "tickets-row--" + (ticket.status || "accepted");
        var statusKey = ticket.status || "accepted";
        var cells =
          '<div class="tickets-grid-table__cell" data-label="' +
          headers[0] +
          '" role="cell"><a class="ticket-id-pill ticket-id-pill--' +
          escapeHtml(statusKey) +
          '" href="' +
          detailUrl +
          '">' +
          escapeHtml(ticket.id) +
          "</a></div>" +
          '<div class="tickets-grid-table__cell" data-label="' +
          headers[1] +
          '" role="cell"><div class="ticket-title-cell"><strong>' +
          escapeHtml(ticket.title) +
          "</strong><span>" +
          escapeHtml(getCategoryTitle(ticket.category)) +
          "</span></div></div>" +
          '<div class="tickets-grid-table__cell" data-label="' +
          headers[2] +
          '" role="cell"><span class="badge ' +
          statusMeta.badge +
          '">' +
          escapeHtml(statusMeta.label) +
          "</span></div>" +
          '<div class="tickets-grid-table__cell" data-label="' +
          headers[3] +
          '" role="cell"><span class="badge ' +
          priorityMeta.badge +
          '">' +
          escapeHtml(priorityMeta.label) +
          "</span></div>" +
          '<div class="tickets-grid-table__cell" data-label="' +
          headers[4] +
          '" role="cell">' +
          escapeHtml(getSpecialistName(ticket.assigneeId)) +
          "</div>" +
          '<div class="tickets-grid-table__cell tickets-grid-table__cell--due" data-label="' +
          headers[5] +
          '" role="cell"><div class="ticket-due-stack">' +
          '<span class="ticket-date ticket-date--due' +
          (ITN.tickets.isOverdue(ticket) ? " ticket-date--overdue" : "") +
          '">' +
          ITN.tickets.formatDate(ticket.dueAt) +
          "</span>" +
          (ITN.tickets.isOverdue(ticket)
            ? '<span class="ticket-overdue-mark" title="Срок выполнения уже прошёл, заявка ещё не решена">Срок истёк</span>'
            : "") +
          "</div></div>";

        if (isAdmin) {
          cells +=
            '<div class="tickets-grid-table__cell" data-label="' +
            headers[6] +
            '" role="cell"><button type="button" class="button button--ghost button--small" data-action="open" data-id="' +
            escapeHtml(ticket.id) +
            '">Открыть</button></div>';
        } else {
          cells +=
            '<div class="tickets-grid-table__cell" data-label="' +
            headers[6] +
            '" role="cell"><span class="ticket-date ticket-date--updated">' +
            ITN.tickets.formatDate(ticket.updatedAt) +
            "</span></div>";
        }

        return (
          '<div class="animated-list-item tickets-grid-table__row ' +
          toneClass +
          overdueClass +
          '" role="row" data-ticket-id="' +
          escapeHtml(ticket.id) +
          '" data-index="' +
          index +
          '" tabindex="0">' +
          cells +
          "</div>"
        );
      })
      .join("");

    var cards = tickets
      .map(function (ticket, index) {
        var statusMeta = ITN.STATUS_META[ticket.status] || { label: ticket.status, badge: "" };
        var priorityMeta = ITN.PRIORITY_META[ticket.priority] || { label: ticket.priority, badge: "" };
        var detailUrl = detailBase + "?id=" + encodeURIComponent(ticket.id);
        var statusKey = ticket.status || "accepted";
        var overdue = ITN.tickets.isOverdue(ticket);

        return (
          '<a class="ticket-card ticket-card--' +
          escapeHtml(statusKey) +
          (overdue ? " is-overdue" : "") +
          ' animated-list-item" data-index="' +
          index +
          '" href="' +
          detailUrl +
          '">' +
          '<div class="ticket-card__top">' +
          '<span class="ticket-id-pill ticket-id-pill--' +
          escapeHtml(statusKey) +
          '">' +
          escapeHtml(ticket.id) +
          "</span>" +
          '<span class="badge ' +
          statusMeta.badge +
          '">' +
          escapeHtml(statusMeta.label) +
          "</span></div>" +
          '<h3 class="ticket-card__title">' +
          escapeHtml(ticket.title) +
          "</h3>" +
          '<div class="ticket-card__meta">' +
          '<div class="ticket-card__row"><span class="ticket-card__label">Категория</span><span class="ticket-card__value">' +
          escapeHtml(getCategoryTitle(ticket.category)) +
          "</span></div>" +
          '<div class="ticket-card__row"><span class="ticket-card__label">Приоритет</span><span class="ticket-card__value"><span class="badge ' +
          priorityMeta.badge +
          '">' +
          escapeHtml(priorityMeta.label) +
          "</span></span></div>" +
          '<div class="ticket-card__row"><span class="ticket-card__label">Исполнитель</span><span class="ticket-card__value">' +
          escapeHtml(getSpecialistName(ticket.assigneeId)) +
          "</span></div>" +
          '<div class="ticket-card__row"><span class="ticket-card__label">Срок</span><span class="ticket-card__value"><span class="ticket-due-stack">' +
          '<span class="ticket-date ticket-date--due' +
          (overdue ? " ticket-date--overdue" : "") +
          '">' +
          ITN.tickets.formatDate(ticket.dueAt) +
          "</span>" +
          (overdue
            ? '<span class="ticket-overdue-mark" title="Срок выполнения уже прошёл, заявка ещё не решена">Срок истёк</span>'
            : "") +
          "</span></span></div>" +
          '<div class="ticket-card__row"><span class="ticket-card__label">Обновлено</span><span class="ticket-card__value ticket-date ticket-date--updated">' +
          ITN.tickets.formatDate(ticket.updatedAt) +
          "</span></div>" +
          "</div></a>"
        );
      })
      .join("");

    container.innerHTML =
      '<div class="scroll-list-container tickets-animated-list">' +
      '<div class="scroll-list tickets-scroll-list" data-tickets-scroll>' +
      '<div class="tickets-desktop">' +
      '<div class="tickets-grid-table' +
      (isAdmin ? " tickets-grid-table--admin" : " tickets-grid-table--user") +
      '" role="table" aria-label="Список заявок">' +
      '<div class="tickets-grid-table__head" role="row">' +
      headCells +
      "</div>" +
      '<div class="tickets-grid-table__body" role="rowgroup">' +
      rows +
      "</div></div></div>" +
      '<div class="tickets-mobile" aria-label="Список заявок">' +
      cards +
      "</div>" +
      "</div>" +
      '<div class="tickets-list-gradient tickets-list-gradient--top" aria-hidden="true"></div>' +
      '<div class="tickets-list-gradient tickets-list-gradient--bottom" aria-hidden="true"></div>' +
      "</div>";

    var scrollList = container.querySelector("[data-tickets-scroll]");
    var topGradient = container.querySelector(".tickets-list-gradient--top");
    var bottomGradient = container.querySelector(".tickets-list-gradient--bottom");
    var selectedIndex = -1;

    function getVisibleItems() {
      var mobile =
        window.matchMedia && window.matchMedia("(max-width: 900px)").matches;
      return container.querySelectorAll(
        mobile
          ? ".tickets-mobile .animated-list-item"
          : ".tickets-desktop .animated-list-item"
      );
    }

    function updateGradients() {
      if (!scrollList || !topGradient || !bottomGradient) {
        return;
      }
      var scrollTop = scrollList.scrollTop;
      var scrollHeight = scrollList.scrollHeight;
      var clientHeight = scrollList.clientHeight;
      topGradient.style.opacity = String(Math.min(scrollTop / 50, 1));
      var bottomDistance = scrollHeight - (scrollTop + clientHeight);
      bottomGradient.style.opacity = String(
        scrollHeight <= clientHeight + 2 ? 0 : Math.min(bottomDistance / 50, 1)
      );
    }

    function setSelected(index) {
      selectedIndex = index;
      getVisibleItems().forEach(function (item) {
        var itemIndex = Number(item.getAttribute("data-index"));
        item.classList.toggle("is-selected", itemIndex === selectedIndex);
      });
    }

    function openByIndex(index) {
      var ticket = tickets[index];
      if (!ticket) {
        return;
      }
      window.location.href = detailBase + "?id=" + encodeURIComponent(ticket.id);
    }

    if (scrollList) {
      scrollList.setAttribute("tabindex", "0");
      scrollList.addEventListener("scroll", updateGradients, { passive: true });
      updateGradients();
      scrollList.addEventListener("keydown", function (event) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelected(Math.min((selectedIndex < 0 ? -1 : selectedIndex) + 1, tickets.length - 1));
          var next = scrollList.querySelector(
            '.animated-list-item[data-index="' + selectedIndex + '"]'
          );
          if (next && next.scrollIntoView) {
            next.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelected(Math.max(selectedIndex - 1, 0));
          var prev = scrollList.querySelector(
            '.animated-list-item[data-index="' + selectedIndex + '"]'
          );
          if (prev && prev.scrollIntoView) {
            prev.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }
        } else if (event.key === "Enter" && selectedIndex >= 0) {
          event.preventDefault();
          openByIndex(selectedIndex);
        }
      });
    }

    var itemObserver = null;

    function bindItemAnimations(items) {
      if (itemObserver) {
        itemObserver.disconnect();
        itemObserver = null;
      }

      if (typeof IntersectionObserver !== "undefined" && scrollList) {
        /* AnimatedList: useInView({ amount: 0.5, once: false }) */
        itemObserver = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                entry.target.classList.add("is-inview");
              } else {
                entry.target.classList.remove("is-inview");
              }
            });
          },
          { root: scrollList, threshold: 0.5 }
        );
        items.forEach(function (item) {
          /* AnimatedList: transition delay 0.1s */
          item.style.transitionDelay = "0.1s";
          itemObserver.observe(item);
        });
      } else {
        items.forEach(function (item) {
          item.classList.add("is-inview");
        });
      }

      items.forEach(function (item) {
        if (item.getAttribute("data-anim-bound") === "true") {
          return;
        }
        item.setAttribute("data-anim-bound", "true");
        item.addEventListener("mouseenter", function () {
          setSelected(Number(item.getAttribute("data-index")));
        });
      });
    }

    bindItemAnimations(getVisibleItems());
    if (typeof window.matchMedia === "function") {
      window.matchMedia("(max-width: 900px)").addEventListener("change", function () {
        bindItemAnimations(getVisibleItems());
        updateGradients();
      });
    }

    container.querySelectorAll(".tickets-desktop .tickets-grid-table__row").forEach(function (row) {
      function openRow() {
        var id = row.getAttribute("data-ticket-id");
        window.location.href = detailBase + "?id=" + encodeURIComponent(id);
      }
      row.addEventListener("click", function (event) {
        if (event.target.closest("button, a")) {
          return;
        }
        openRow();
      });
      row.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openRow();
        }
      });
    });

    container.querySelectorAll("[data-action]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        if (onAction) {
          onAction(button.getAttribute("data-action"), button.getAttribute("data-id"));
        } else {
          window.location.href =
            detailBase + "?id=" + encodeURIComponent(button.getAttribute("data-id"));
        }
      });
    });
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
