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
    return new Date(ticket.dueAt).getTime() < Date.now();
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

    var tableClass = mode === "admin" ? "tickets-table tickets-table--admin" : "tickets-table tickets-table--user";
    var headers =
      mode === "admin"
        ? ["Номер", "Тема", "Статус", "Приоритет", "Исполнитель", "Срок", "Действия"]
        : ["Номер", "Тема", "Статус", "Приоритет", "Срок", "Обновлено"];

    var thead = "<thead><tr>" + headers.map(function (h) {
      return "<th scope=\"col\">" + h + "</th>";
    }).join("") + "</tr></thead>";

    var rows = tickets.map(function (ticket) {
      var statusMeta = ITN.STATUS_META[ticket.status] || { label: ticket.status, badge: "" };
      var priorityMeta = ITN.PRIORITY_META[ticket.priority] || { label: ticket.priority, badge: "" };
      var overdueClass = ITN.tickets.isOverdue(ticket) ? " is-overdue" : "";
      var detailUrl = detailBase + "?id=" + encodeURIComponent(ticket.id);

      var cells =
        "<td data-label=\"" + headers[0] + "\"><a class=\"ticket-id\" href=\"" + detailUrl + "\">" + ticket.id + "</a></td>" +
        "<td data-label=\"" + headers[1] + "\"><div class=\"ticket-title-cell\"><strong>" + escapeHtml(ticket.title) + "</strong><span>" + escapeHtml(getCategoryTitle(ticket.category)) + "</span></div></td>" +
        "<td data-label=\"" + headers[2] + "\"><span class=\"badge " + statusMeta.badge + "\">" + statusMeta.label + "</span></td>" +
        "<td data-label=\"" + headers[3] + "\"><span class=\"badge " + priorityMeta.badge + "\">" + priorityMeta.label + "</span></td>";

      if (mode === "admin") {
        cells +=
          "<td data-label=\"" + headers[4] + "\">" + escapeHtml(getSpecialistName(ticket.assigneeId)) + "</td>" +
          "<td data-label=\"" + headers[5] + "\"><span class=\"ticket-date\">" + ITN.tickets.formatDate(ticket.dueAt) + "</span></td>" +
          "<td data-label=\"" + headers[6] + "\">" +
          "<button type=\"button\" class=\"button button--ghost button--small\" data-action=\"open\" data-id=\"" + ticket.id + "\">Открыть</button>" +
          "</td>";
      } else {
        cells +=
          "<td data-label=\"" + headers[4] + "\"><span class=\"ticket-date\">" + ITN.tickets.formatDate(ticket.dueAt) + "</span></td>" +
          "<td data-label=\"" + headers[5] + "\"><span class=\"ticket-date\">" + ITN.tickets.formatDate(ticket.updatedAt) + "</span></td>";
      }

      return "<tr class=\"" + overdueClass.trim() + "\" data-ticket-id=\"" + ticket.id + "\">" + cells + "</tr>";
    }).join("");

    container.innerHTML =
      '<div class="table-wrap"><table class="' + tableClass + '">' +
      thead +
      "<tbody>" + rows + "</tbody></table></div>";

    container.querySelectorAll("tbody tr").forEach(function (row) {
      row.addEventListener("click", function (event) {
        if (event.target.closest("button, a")) {
          return;
        }
        var id = row.getAttribute("data-ticket-id");
        window.location.href = detailBase + "?id=" + encodeURIComponent(id);
      });
    });

    container.querySelectorAll("[data-action]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        if (onAction) {
          onAction(button.getAttribute("data-action"), button.getAttribute("data-id"));
        } else {
          window.location.href = detailBase + "?id=" + encodeURIComponent(button.getAttribute("data-id"));
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
