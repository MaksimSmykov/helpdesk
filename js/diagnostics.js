(function () {
  "use strict";

  window.ITN = window.ITN || {};
  var ITN = window.ITN;

  ITN.diagnostics = ITN.diagnostics || {};

  function getFlow(categoryId) {
    return ITN.DIAGNOSTIC_FLOWS[categoryId] || ITN.DIAGNOSTIC_FLOWS.other;
  }

  function findStep(categoryId, stepId) {
    var flow = getFlow(categoryId);
    return flow.find(function (step) {
      return step.id === stepId;
    }) || null;
  }

  function getCategoryMeta(categoryId) {
    return ITN.CATEGORIES.find(function (c) {
      return c.id === categoryId;
    }) || { id: categoryId, title: "Другая проблема" };
  }

  ITN.diagnostics.getSession = function () {
    return ITN.loadJSON(ITN.STORAGE_KEYS.diagnosticSession, null);
  };

  ITN.diagnostics.saveSession = function (session) {
    return ITN.saveJSON(ITN.STORAGE_KEYS.diagnosticSession, session);
  };

  ITN.diagnostics.clearSession = function () {
    localStorage.removeItem(ITN.STORAGE_KEYS.diagnosticSession);
  };

  ITN.diagnostics.start = function (categoryId) {
    var flow = getFlow(categoryId);
    var firstStep = flow[0];

    if (!firstStep) {
      return null;
    }

    var session = {
      categoryId: categoryId,
      startedAt: ITN.nowISO(),
      currentStepId: firstStep.id,
      stepHistory: [firstStep.id],
      answers: [],
      completedChecks: [],
      resolved: false,
      escalated: false,
      finished: false
    };

    ITN.diagnostics.saveSession(session);
    return session;
  };

  ITN.diagnostics.getCurrentStep = function () {
    var session = ITN.diagnostics.getSession();
    if (!session) {
      return null;
    }
    return findStep(session.categoryId, session.currentStepId);
  };

  ITN.diagnostics.answer = function (optionId) {
    var session = ITN.diagnostics.getSession();
    if (!session || session.finished) {
      return session;
    }

    var step = findStep(session.categoryId, session.currentStepId);
    if (!step || !step.options) {
      return session;
    }

    var option = step.options.find(function (o) {
      return o.id === optionId;
    });

    if (!option) {
      return session;
    }

    session.answers.push({
      stepId: step.id,
      stepTitle: step.title,
      optionId: option.id,
      label: option.label,
      at: ITN.nowISO()
    });

    if (step.type === "check" && step.checks) {
      session.completedChecks = session.completedChecks.concat(step.checks);
    }

    if (option.next) {
      session.currentStepId = option.next;
      if (session.stepHistory.indexOf(option.next) === -1) {
        session.stepHistory.push(option.next);
      }
    }

    var nextStep = findStep(session.categoryId, session.currentStepId);
    if (nextStep && nextStep.type === "solution") {
      session.finished = true;
    }

    ITN.diagnostics.saveSession(session);
    return session;
  };

  ITN.diagnostics.continueFlow = function () {
    var session = ITN.diagnostics.getSession();
    if (!session) {
      return null;
    }

    var step = findStep(session.categoryId, session.currentStepId);
    if (!step) {
      return session;
    }

    if (step.type === "check" && step.checks) {
      session.completedChecks = session.completedChecks.concat(step.checks);
    }

    if (step.options) {
      var continueOption = step.options.find(function (o) {
        return o.id === "continue" || o.label.indexOf("продолж") !== -1;
      });
      if (continueOption) {
        return ITN.diagnostics.answer(continueOption.id);
      }
    }

    session.finished = true;
    ITN.diagnostics.saveSession(session);
    return session;
  };

  ITN.diagnostics.markResolved = function () {
    var session = ITN.diagnostics.getSession();
    if (!session) {
      return null;
    }

    session.resolved = true;
    session.finished = true;

    var step = findStep(session.categoryId, session.currentStepId);
    if (step && step.options) {
      var fixedOption = step.options.find(function (o) {
        return o.id === "fixed" || o.label.indexOf("Помогло") !== -1 || o.label.indexOf("реш") !== -1;
      });
      if (fixedOption && fixedOption.next) {
        session.currentStepId = fixedOption.next;
        session.stepHistory.push(fixedOption.next);
      }
    }

    ITN.diagnostics.saveSession(session);

    var profile = ITN.profile.get();
    var category = getCategoryMeta(session.categoryId);
    ITN.profile.addResolvedProblem("Самостоятельно: " + category.title);
    ITN.profile.addTimeSaved(15);

    return session;
  };

  ITN.diagnostics.escalate = function () {
    var session = ITN.diagnostics.getSession();
    if (!session) {
      return null;
    }

    session.escalated = true;
    session.finished = true;
    ITN.diagnostics.saveSession(session);
    return session;
  };

  ITN.diagnostics.getProgress = function () {
    var session = ITN.diagnostics.getSession();
    if (!session) {
      return { phase: "problem", percent: 0, label: "Проблема" };
    }

    var step = findStep(session.categoryId, session.currentStepId);
    var phase = "problem";
    var percent = 25;

    if (step) {
      if (step.type === "check") {
        phase = "check";
        percent = 50;
      } else if (step.type === "solution") {
        phase = session.escalated ? "ticket" : "solution";
        percent = session.escalated || session.finished ? 100 : 75;
      } else if (step.type === "question" && session.answers.length > 0) {
        phase = "problem";
        percent = 35;
      }
    }

    if (session.resolved) {
      phase = "solution";
      percent = 100;
    }

    if (session.escalated) {
      phase = "ticket";
      percent = 100;
    }

    var labels = {
      problem: "Проблема",
      check: "Проверка",
      solution: "Решение",
      ticket: "Заявка"
    };

    return {
      phase: phase,
      percent: percent,
      label: labels[phase] || "Проблема"
    };
  };

  ITN.diagnostics.buildTicketDraft = function () {
    var session = ITN.diagnostics.getSession();
    if (!session) {
      return null;
    }

    var category = getCategoryMeta(session.categoryId);
    var profile = ITN.profile.get();
    var step = findStep(session.categoryId, session.currentStepId);
    var answerLines = session.answers.map(function (a) {
      return "• " + a.stepTitle + ": " + a.label;
    });
    var checkLines = session.completedChecks.map(function (c) {
      return "• " + c;
    });

    var suggestedCause = step && step.type === "solution" && step.solution
      ? step.solution
      : "Требуется диагностика специалистом после самостоятельных шагов";

    var priority = "medium";
    if (session.categoryId === "network" || session.categoryId === "login") {
      priority = "high";
    }
    if (session.escalated) {
      priority = "high";
    }

    var description = [
      "Категория: " + category.title,
      "",
      "Ответы пользователя:",
      answerLines.length ? answerLines.join("\n") : "• Нет ответов",
      "",
      "Выполненные проверки:",
      checkLines.length ? checkLines.join("\n") : "• Базовая диагностика не зафиксирована",
      "",
      "Предполагаемая причина:",
      suggestedCause
    ].join("\n");

    return {
      category: session.categoryId,
      categoryTitle: category.title,
      title: category.title + " — требуется помощь IT",
      description: description,
      priority: priority,
      device: profile.devices && profile.devices[0]
        ? profile.devices[0].name + " (" + profile.devices[0].inventory + ")"
        : "",
      diagnosticSummary: {
        answers: session.answers.map(function (a) {
          return a.label;
        }),
        checks: session.completedChecks,
        suggestedCause: suggestedCause,
        path: session.stepHistory.slice()
      }
    };
  };
})();
