(function () {
  "use strict";

  window.ITN = window.ITN || {};
  var ITN = window.ITN;

  ITN.profile = ITN.profile || {};

  ITN.profile.get = function () {
    return ITN.loadJSON(ITN.STORAGE_KEYS.profile, null);
  };

  ITN.profile.save = function (profile) {
    return ITN.saveJSON(ITN.STORAGE_KEYS.profile, profile);
  };

  ITN.profile.ensureSeed = function () {
    if (!ITN.profile.get()) {
      ITN.profile.save(JSON.parse(JSON.stringify(ITN.DEMO_PROFILE)));
    }
  };

  ITN.profile.addResolvedProblem = function (title) {
    var profile = ITN.profile.get();
    if (!profile) {
      ITN.profile.ensureSeed();
      profile = ITN.profile.get();
    }

    profile.resolvedProblems = profile.resolvedProblems || [];
    profile.resolvedProblems.unshift({
      title: title,
      date: new Date().toISOString().slice(0, 10)
    });

    if (profile.resolvedProblems.length > 20) {
      profile.resolvedProblems = profile.resolvedProblems.slice(0, 20);
    }

    ITN.profile.save(profile);
    return profile;
  };

  ITN.profile.addTimeSaved = function (minutes) {
    var profile = ITN.profile.get();
    if (!profile) {
      ITN.profile.ensureSeed();
      profile = ITN.profile.get();
    }

    profile.timeSavedMinutes = (profile.timeSavedMinutes || 0) + (minutes || 0);
    ITN.profile.save(profile);
    return profile;
  };

  ITN.profile.rateSkill = function (skillId, delta) {
    var profile = ITN.profile.get();
    if (!profile) {
      ITN.profile.ensureSeed();
      profile = ITN.profile.get();
    }

    delta = typeof delta === "number" ? delta : 1;
    profile.skills = profile.skills || [];

    var skill = profile.skills.find(function (s) {
      return s.id === skillId;
    });

    if (!skill) {
      return profile;
    }

    skill.level = Math.min(skill.maxLevel || 5, Math.max(0, (skill.level || 0) + delta));
    ITN.profile.save(profile);
    return profile;
  };

  ITN.profile.getOpenTicketsCount = function () {
    return ITN.tickets.getAll().filter(function (t) {
      return t.authorId === "user-1" && t.status !== "resolved";
    }).length;
  };

  ITN.profile.formatTimeSaved = function (minutes) {
    minutes = minutes || 0;
    if (minutes < 60) {
      return minutes + " мин";
    }
    var hours = Math.floor(minutes / 60);
    var mins = minutes % 60;
    return mins ? hours + " ч " + mins + " мин" : hours + " ч";
  };
})();
