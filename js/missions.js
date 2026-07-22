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
    }
  };

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
