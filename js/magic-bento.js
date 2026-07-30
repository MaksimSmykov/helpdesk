(function () {
  "use strict";

  window.ITN = window.ITN || {};
  var ITN = window.ITN;

  var MOBILE_BREAKPOINT = 768;
  var SPOTLIGHT_RADIUS = 260;
  /* muted green matching --primary / border accents */
  var GLOW_RGB = "100, 150, 90";

  var SELECTOR = [
    ".category-tile",
    ".skill-tile",
    ".ticket-card",
    ".ticket-feed-item"
  ].join(", ");

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function shouldDisable() {
    return isMobile() || prefersReducedMotion();
  }

  function allowsMotionTransform(card) {
    return (
      !card.classList.contains("animated-list-item") &&
      !card.classList.contains("ticket-feed-item")
    );
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function enhanceCard(card) {
    if (!card || card.getAttribute("data-magic-bento") === "true") {
      return;
    }
    if (card.closest(".app-sidebar")) {
      return;
    }

    card.classList.add("magic-bento-card", "magic-bento-card--border-glow");
    card.setAttribute("data-magic-bento", "true");
    card.style.setProperty("--glow-color", GLOW_RGB);
    card.style.setProperty("--glow-x", "50%");
    card.style.setProperty("--glow-y", "50%");
    card.style.setProperty("--glow-intensity", "0");
    card.style.setProperty("--glow-radius", SPOTLIGHT_RADIUS + "px");

    if (shouldDisable()) {
      return;
    }

    var useTransform = allowsMotionTransform(card);
    var rafTilt = 0;
    var target = { rx: 0, ry: 0, x: 0, y: 0, glow: 0 };
    var current = { rx: 0, ry: 0, x: 0, y: 0, glow: 0 };

    function tick() {
      current.rx = lerp(current.rx, target.rx, 0.18);
      current.ry = lerp(current.ry, target.ry, 0.18);
      current.x = lerp(current.x, target.x, 0.16);
      current.y = lerp(current.y, target.y, 0.16);
      current.glow = lerp(current.glow, target.glow, 0.2);

      if (useTransform) {
        card.style.transform =
          "perspective(1000px) translate3d(" +
          current.x.toFixed(2) +
          "px," +
          current.y.toFixed(2) +
          "px,0) rotateX(" +
          current.rx.toFixed(2) +
          "deg) rotateY(" +
          current.ry.toFixed(2) +
          "deg)";
      }
      card.style.setProperty("--glow-intensity", current.glow.toFixed(3));

      var moving =
        Math.abs(current.rx - target.rx) > 0.05 ||
        Math.abs(current.ry - target.ry) > 0.05 ||
        Math.abs(current.x - target.x) > 0.05 ||
        Math.abs(current.y - target.y) > 0.05 ||
        Math.abs(current.glow - target.glow) > 0.01;

      if (moving) {
        rafTilt = requestAnimationFrame(tick);
      } else {
        rafTilt = 0;
      }
    }

    function startTick() {
      if (!rafTilt) {
        rafTilt = requestAnimationFrame(tick);
      }
    }

    function onMove(event) {
      if (shouldDisable()) {
        return;
      }
      var rect = card.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      var centerX = rect.width / 2;
      var centerY = rect.height / 2;

      if (useTransform) {
        target.ry = ((x - centerX) / centerX) * 8;
        target.rx = ((y - centerY) / centerY) * -8;
        target.x = (x - centerX) * 0.04;
        target.y = (y - centerY) * 0.04;
      }
      target.glow = 1;

      card.style.setProperty("--glow-x", ((x / rect.width) * 100).toFixed(2) + "%");
      card.style.setProperty("--glow-y", ((y / rect.height) * 100).toFixed(2) + "%");
      startTick();
    }

    function onLeave() {
      target.rx = 0;
      target.ry = 0;
      target.x = 0;
      target.y = 0;
      target.glow = 0;
      startTick();
    }

    function onClick(event) {
      if (shouldDisable()) {
        return;
      }
      var rect = card.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      var maxDistance = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height)
      );

      var ripple = document.createElement("span");
      ripple.className = "magic-bento-ripple";
      ripple.style.width = maxDistance * 2 + "px";
      ripple.style.height = maxDistance * 2 + "px";
      ripple.style.left = x - maxDistance + "px";
      ripple.style.top = y - maxDistance + "px";
      card.appendChild(ripple);

      window.setTimeout(function () {
        if (ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      }, 700);
    }

    card.addEventListener("mousemove", onMove);
    card.addEventListener("mouseleave", onLeave);
    card.addEventListener("click", onClick, true);
  }

  function enhanceAll(root) {
    var scope = root || document;
    scope.querySelectorAll(SELECTOR).forEach(enhanceCard);
  }

  ITN.magicBento = {
    enhance: enhanceCard,
    enhanceAll: enhanceAll,
    init: function () {
      enhanceAll(document);
      if (typeof MutationObserver === "undefined") {
        return;
      }
      var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) {
              return;
            }
            if (node.matches && node.matches(SELECTOR)) {
              enhanceCard(node);
            }
            if (node.querySelectorAll) {
              enhanceAll(node);
            }
          });
        });
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  };
})();
