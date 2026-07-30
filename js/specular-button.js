(function () {
  "use strict";

  window.ITN = window.ITN || {};
  var ITN = window.ITN;

  var PAD = 20;
  var VERT =
    "#version 300 es\n" +
    "in vec2 position;\n" +
    "void main() {\n" +
    "  gl_Position = vec4(position, 0.0, 1.0);\n" +
    "}\n";

  var FRAG =
    "#version 300 es\n" +
    "precision highp float;\n" +
    "uniform vec2 uCenter;\n" +
    "uniform vec2 uHalfSize;\n" +
    "uniform float uRadius;\n" +
    "uniform float uAngle;\n" +
    "uniform float uPx;\n" +
    "uniform vec3 uLineColor;\n" +
    "uniform vec3 uBaseColor;\n" +
    "uniform float uIntensity;\n" +
    "uniform float uShineSize;\n" +
    "uniform float uShineFade;\n" +
    "uniform float uThickness;\n" +
    "uniform float uBaseWidth;\n" +
    "out vec4 fragColor;\n" +
    "float sdRoundedRect(vec2 p, vec2 b, float r) {\n" +
    "  vec2 q = abs(p) - b + r;\n" +
    "  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;\n" +
    "}\n" +
    "float shapeSDF(vec2 p) { return sdRoundedRect(p, uHalfSize, uRadius); }\n" +
    "float gaussianLine(float d, float sigma) {\n" +
    "  float x = d / (sigma + 1e-6);\n" +
    "  float k = mix(1.0, 1.6, smoothstep(0.0, 1.5, x));\n" +
    "  return exp(-k * x * x);\n" +
    "}\n" +
    "void main() {\n" +
    "  vec2 p = gl_FragCoord.xy - uCenter;\n" +
    "  float d = shapeSDF(p);\n" +
    "  vec2 L = vec2(cos(uAngle), sin(uAngle));\n" +
    "  float base = (1.0 - smoothstep(0.0, uBaseWidth, abs(d))) * 0.45;\n" +
    "  vec2 nEll = normalize(p / (uHalfSize * uHalfSize) + 1e-6);\n" +
    "  float phi = acos(clamp(abs(dot(nEll, L)), 0.0, 1.0));\n" +
    "  float rim = 1.0 - smoothstep(uShineSize - uShineFade, uShineSize + uShineFade + 1e-4, phi);\n" +
    "  float line = gaussianLine(d, uThickness);\n" +
    "  float edgeClamp = 1.0 - smoothstep(0.5 * uPx, 3.0 * uPx, abs(d));\n" +
    "  float hi = line * rim * edgeClamp * uIntensity;\n" +
    "  vec3 col = uBaseColor * base + uLineColor * hi;\n" +
    "  float a = clamp(base + hi, 0.0, 1.0);\n" +
    "  fragColor = vec4(col, a);\n" +
    "}\n";

  var PRESETS = {
    primary: {
      radius: 10,
      tint: "#64965a",
      tintOpacity: 1,
      blur: 0,
      textColor: "#ffffff",
      lineColor: "#d2e4cb",
      baseColor: "#456b40",
      intensity: 0.68,
      shineSize: 9,
      shineFade: 36,
      thickness: 1,
      speed: 0.22,
      followMouse: true,
      proximity: 180,
      autoAnimate: false
    },
    teal: {
      radius: 10,
      tint: "#5a8f6a",
      tintOpacity: 1,
      blur: 0,
      textColor: "#ffffff",
      lineColor: "#cfe3d5",
      baseColor: "#3f6b4c",
      intensity: 0.68,
      shineSize: 9,
      shineFade: 36,
      thickness: 1,
      speed: 0.22,
      followMouse: true,
      proximity: 180,
      autoAnimate: false
    },
    secondary: {
      radius: 10,
      tint: "#ffffff",
      tintOpacity: 1,
      blur: 0,
      textColor: "#1f2a22",
      lineColor: "#7bc45a",
      baseColor: "#9aab94",
      intensity: 0.55,
      shineSize: 8,
      shineFade: 34,
      thickness: 1,
      speed: 0.18,
      followMouse: true,
      proximity: 160,
      autoAnimate: false
    },
    success: {
      radius: 10,
      tint: "#e6f7ef",
      tintOpacity: 1,
      blur: 0,
      textColor: "#0f7a4c",
      lineColor: "#6ee7b7",
      baseColor: "#6b9f86",
      intensity: 0.5,
      shineSize: 8,
      shineFade: 34,
      thickness: 1,
      speed: 0.18,
      followMouse: true,
      proximity: 160,
      autoAnimate: false
    },
    danger: {
      radius: 10,
      tint: "#fdecea",
      tintOpacity: 1,
      blur: 0,
      textColor: "#b42318",
      lineColor: "#fca5a5",
      baseColor: "#c48a86",
      intensity: 0.5,
      shineSize: 8,
      shineFade: 34,
      thickness: 1,
      speed: 0.18,
      followMouse: true,
      proximity: 160,
      autoAnimate: false
    },
    ghost: {
      radius: 10,
      tint: "#ffffff",
      tintOpacity: 0,
      blur: 0,
      textColor: "#5f6b62",
      lineColor: "#7bc45a",
      baseColor: "#9aab94",
      intensity: 0.35,
      shineSize: 8,
      shineFade: 34,
      thickness: 1,
      speed: 0.16,
      followMouse: true,
      proximity: 140,
      autoAnimate: false
    },
    default: {
      radius: 10,
      tint: "#ffffff",
      tintOpacity: 1,
      blur: 0,
      textColor: "#1f2a22",
      lineColor: "#7bc45a",
      baseColor: "#9aab94",
      intensity: 0.55,
      shineSize: 8,
      shineFade: 34,
      thickness: 1,
      speed: 0.18,
      followMouse: true,
      proximity: 160,
      autoAnimate: false
    }
  };

  function parseColor(input) {
    var c = String(input || "#ffffff").trim();
    if (c.charAt(0) === "#") {
      c = c.slice(1);
    }
    if (c.length === 3) {
      c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    var n = parseInt(c, 16);
    if (isNaN(n)) {
      return [1, 1, 1];
    }
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }

  function getPreset(button) {
    if (button.classList.contains("button--primary")) {
      return PRESETS.primary;
    }
    if (button.classList.contains("button--teal")) {
      return PRESETS.teal;
    }
    if (button.classList.contains("button--secondary")) {
      return PRESETS.secondary;
    }
    if (button.classList.contains("button--success")) {
      return PRESETS.success;
    }
    if (button.classList.contains("button--danger")) {
      return PRESETS.danger;
    }
    if (button.classList.contains("button--ghost")) {
      return PRESETS.ghost;
    }
    return PRESETS.default;
  }

  function getSizeClass(button) {
    if (button.classList.contains("button--small")) {
      return "specular-button--sm";
    }
    return "specular-button--md";
  }

  function compileShader(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(gl, vertSrc, fragSrc) {
    var vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
    var fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) {
      return null;
    }
    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.bindAttribLocation(program, 0, "position");
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  function applyCssVars(button, preset) {
    button.style.setProperty("--sb-radius", preset.radius + "px");
    button.style.setProperty("--sb-tint", preset.tint);
    button.style.setProperty("--sb-tint-opacity", String(preset.tintOpacity));
    button.style.setProperty("--sb-blur", (preset.blur || 0) + "px");
    button.style.setProperty("--sb-text-color", preset.textColor);
  }

  function createFx(button, preset) {
    var fx = document.createElement("span");
    fx.className = "specular-button__fx";
    fx.setAttribute("aria-hidden", "true");
    button.insertBefore(fx, button.firstChild);

    var canvas = document.createElement("canvas");
    fx.appendChild(canvas);

    var gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true
    });
    if (!gl) {
      return null;
    }

    var dpr = window.devicePixelRatio || 1;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    var program = createProgram(gl, VERT, FRAG);
    if (!program) {
      return null;
    }

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    var uniforms = {
      uCenter: gl.getUniformLocation(program, "uCenter"),
      uHalfSize: gl.getUniformLocation(program, "uHalfSize"),
      uRadius: gl.getUniformLocation(program, "uRadius"),
      uAngle: gl.getUniformLocation(program, "uAngle"),
      uPx: gl.getUniformLocation(program, "uPx"),
      uLineColor: gl.getUniformLocation(program, "uLineColor"),
      uBaseColor: gl.getUniformLocation(program, "uBaseColor"),
      uIntensity: gl.getUniformLocation(program, "uIntensity"),
      uShineSize: gl.getUniformLocation(program, "uShineSize"),
      uShineFade: gl.getUniformLocation(program, "uShineFade"),
      uThickness: gl.getUniformLocation(program, "uThickness"),
      uBaseWidth: gl.getUniformLocation(program, "uBaseWidth")
    };

    var sizeRef = { w: 1, h: 1 };
    var props = {
      radius: preset.radius,
      lineColor: preset.lineColor,
      baseColor: preset.baseColor,
      intensity: preset.intensity,
      shineSize: preset.shineSize,
      shineFade: preset.shineFade,
      thickness: preset.thickness,
      speed: preset.speed,
      followMouse: preset.followMouse,
      proximity: preset.proximity,
      autoAnimate: preset.autoAnimate
    };

    var pointerAngle = null;
    var proximityT = 0;
    var angle = 2.4;
    var idleAngle = 2.4;
    var bright = 0;
    var last = performance.now();
    var raf = 0;
    var destroyed = false;

    function resize() {
      var rect = button.getBoundingClientRect();
      var w = Math.max(rect.width, 1);
      var h = Math.max(rect.height, 1);
      sizeRef.w = w;
      sizeRef.h = h;
      var cssW = w + PAD * 2;
      var cssH = h + PAD * 2;
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function onPointerMove(e) {
      var rect = button.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
      var dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom);
      var dist = Math.hypot(dx, dy);
      if (dist === 0) {
        var nx = (e.clientX - cx) / (rect.width / 2 || 1);
        var ny = (cy - e.clientY) / (rect.height / 2 || 1);
        pointerAngle = Math.atan2(2 / rect.height, -2 / rect.width) + nx * 0.3 + ny * 0.15;
      } else {
        pointerAngle = Math.atan2(cy - e.clientY, e.clientX - cx);
      }
      var t = Math.max(0, 1 - dist / Math.max(props.proximity, 1));
      proximityT = t * t * (3 - 2 * t);
    }

    function update(now) {
      if (destroyed) {
        return;
      }
      raf = requestAnimationFrame(update);
      var dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      idleAngle += props.speed * dt;
      var steer = props.followMouse && pointerAngle != null && (!props.autoAnimate || proximityT > 0);
      var target = steer ? pointerAngle : idleAngle;
      var diff = ((target - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      angle += diff * (1 - Math.exp(-dt * 7));

      var brightTarget = props.autoAnimate ? 1 : proximityT;
      bright += (brightTarget - bright) * (1 - Math.exp(-dt * 8));

      var lineC = parseColor(props.lineColor);
      var baseC = parseColor(props.baseColor);

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(uniforms.uCenter, (PAD + sizeRef.w / 2) * dpr, (PAD + sizeRef.h / 2) * dpr);
      gl.uniform2f(uniforms.uHalfSize, (sizeRef.w / 2) * dpr, (sizeRef.h / 2) * dpr);
      gl.uniform1f(
        uniforms.uRadius,
        Math.min(props.radius, Math.min(sizeRef.w, sizeRef.h) / 2) * dpr
      );
      gl.uniform1f(uniforms.uAngle, angle);
      gl.uniform1f(uniforms.uPx, dpr);
      gl.uniform3fv(uniforms.uLineColor, lineC);
      gl.uniform3fv(uniforms.uBaseColor, baseC);
      gl.uniform1f(uniforms.uIntensity, props.intensity * bright);
      gl.uniform1f(uniforms.uShineSize, (props.shineSize * Math.PI) / 180);
      gl.uniform1f(uniforms.uShineFade, (props.shineFade * Math.PI) / 180);
      gl.uniform1f(uniforms.uThickness, props.thickness * dpr);
      gl.uniform1f(uniforms.uBaseWidth, dpr);

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointerMove);
      if (ro) {
        ro.disconnect();
      }
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      var lose = gl.getExtension("WEBGL_lose_context");
      if (lose) {
        lose.loseContext();
      }
    }

    var ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (ro) {
      ro.observe(button);
    }
    resize();
    window.addEventListener("pointermove", onPointerMove);
    raf = requestAnimationFrame(update);

    return { destroy: destroy, props: props };
  }

  function ensureLabel(button) {
    var label = button.querySelector(":scope > .button__label, :scope > .specular-button__label");
    if (label) {
      label.classList.add("button__label", "specular-button__label");
      return label;
    }
    label = document.createElement("span");
    label.className = "button__label specular-button__label";
    var child = button.firstChild;
    while (child) {
      var next = child.nextSibling;
      if (
        !(
          child.classList &&
          (child.classList.contains("specular-button__fx") ||
            child.classList.contains("button__ripples"))
        )
      ) {
        label.appendChild(child);
      }
      child = next;
    }
    button.appendChild(label);
    return label;
  }

  function enhance(button) {
    if (!button || button.getAttribute("data-specular-ready") === "true") {
      return;
    }
    if (button.closest(".app-sidebar")) {
      return;
    }
    /* Compact / soft-action buttons keep plain CSS — specular FX ломает их вид */
    if (
      button.classList.contains("button--small") ||
      button.classList.contains("button--success") ||
      button.classList.contains("button--danger") ||
      button.classList.contains("button--ghost") ||
      button.closest(".rating-row")
    ) {
      button.setAttribute("data-specular-ready", "skip");
      return;
    }

    var preset = getPreset(button);
    button.classList.add("specular-button", getSizeClass(button));
    applyCssVars(button, preset);
    ensureLabel(button);

    var reduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced) {
      createFx(button, preset);
    }

    button.setAttribute("data-specular-ready", "true");
  }

  function enhanceAll(root) {
    var scope = root || document;
    scope.querySelectorAll("a.button, button.button").forEach(enhance);
  }

  ITN.specularButtons = {
    enhance: enhance,
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
            if (node.matches && node.matches("a.button, button.button")) {
              enhance(node);
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
