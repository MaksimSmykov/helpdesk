(function () {
  "use strict";

  window.ITN = window.ITN || {};
  var ITN = window.ITN;

  ITN.missions = ITN.missions || {};

  ITN.missions.getAll = function () {
    return ITN.loadJSON(ITN.STORAGE_KEYS.missions, []);
  };

  ITN.missions.saveAll = function (missions) {
    return ITN.saveJSON(ITN.STORAGE_KEYS.missions, missions);
  };

  ITN.missions.ensureSeed = function () {
    var missions = ITN.missions.getAll();
    if (!missions.length) {
      ITN.missions.saveAll(JSON.parse(JSON.stringify(ITN.MISSIONS)));
      return;
    }

    ITN.missions.saveAll(mergeMissionDefaults(JSON.parse(JSON.stringify(ITN.MISSIONS)), missions));
  };

  function mergeMissionDefaults(defaultMissions, savedMissions) {
    return defaultMissions.map(function (defaultMission) {
      var savedMission = savedMissions.find(function (mission) {
        return mission.id === defaultMission.id;
      });

      if (!savedMission) {
        return defaultMission;
      }

      var isLegacyMission = !savedMission.choice || !(savedMission.steps || []).some(function (step) {
        return step.articleId;
      });

      if (isLegacyMission) {
        return defaultMission;
      }

      defaultMission.steps = defaultMission.steps.map(function (defaultStep) {
        var savedStep = (savedMission.steps || []).find(function (step) {
          return step.id === defaultStep.id;
        });
        return savedStep ? Object.assign({}, defaultStep, { done: Boolean(savedStep.done) }) : defaultStep;
      });

      return Object.assign({}, defaultMission, {
        choice: savedMission.choice || defaultMission.choice,
        steps: defaultMission.steps
      });
    });
  }

  ITN.missions.getById = function (missionId) {
    return ITN.missions.getAll().find(function (m) {
      return m.id === missionId;
    }) || null;
  };

  ITN.missions.toggleStep = function (missionId, stepId) {
    var missions = ITN.missions.getAll();
    var mission = missions.find(function (m) {
      return m.id === missionId;
    });

    if (!mission) {
      return null;
    }

    var step = mission.steps.find(function (s) {
      return s.id === stepId;
    });

    if (!step) {
      return mission;
    }

    step.done = !step.done;
    ITN.missions.saveAll(missions);

    var progress = ITN.missions.getProgress(missionId);
    if (progress.percent === 100) {
      ITN.profile.addTimeSaved(10);
      ITN.profile.rateSkill("skill-self", 1);
    }

    return mission;
  };

  ITN.missions.addStep = function (missionId, title) {
    var missions = ITN.missions.getAll();
    var mission = missions.find(function (m) {
      return m.id === missionId;
    });

    if (!mission || !title || !title.trim()) {
      return null;
    }

    mission.steps = mission.steps || [];
    mission.steps.push({
      id: "custom-" + Date.now(),
      title: title.trim(),
      done: false,
      articleId: "custom"
    });

    ITN.missions.saveAll(missions);
    return mission;
  };

  ITN.missions.getProgress = function (missionId) {
    var mission = ITN.missions.getById(missionId);
    if (!mission || !mission.steps.length) {
      return { done: 0, total: 0, percent: 0 };
    }

    var done = mission.steps.filter(function (s) {
      return s.done;
    }).length;
    var total = mission.steps.length;
    var percent = Math.round((done / total) * 100);

    return { done: done, total: total, percent: percent };
  };
})();
