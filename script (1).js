/* =========================================================
   Lunettes intelligentes — comportements & animations
   Aucune dépendance : JavaScript natif uniquement.
   ========================================================= */
(function () {
  "use strict";

  var d = document, root = d.documentElement, body = d.body;

  /* ---------- Utilitaires ---------- */
  function $(s, c) { return (c || d).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function fmt(n, dec) { return n.toFixed(dec).replace(".", ","); }
  function safe(fn) { try { fn(); } catch (e) { if (window.console) console.error(e); } }

  var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var fine = !!(window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches);
  var NS = "http://www.w3.org/2000/svg";
  var HEAD = '"Space Grotesk", system-ui, sans-serif';
  var MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';

  function rgba(hex, a) {
    hex = String(hex).replace("#", "").trim();
    if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(hex, 16);
    if (isNaN(n)) return "rgba(120,200,200," + a + ")";
    return "rgba(" + (n >> 16 & 255) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + a + ")";
  }

  /* Couleurs du thème, relues pour les canvas */
  var C = {};
  function readColors() {
    var cs = getComputedStyle(root);
    function g(n) { return cs.getPropertyValue(n).trim(); }
    C = {
      ink: g("--ink") || "#e8f0fa", muted: g("--muted") || "#93a6bd",
      accent: g("--accent") || "#2dd4bf", accent2: g("--accent2") || "#60a5fa",
      accent3: g("--accent3") || "#a78bfa", solid: g("--surface-solid") || "#0e1c30",
      warn: "#f87171"
    };
  }
  readColors();

  /* Observateur « une seule fois » */
  function onView(el, cb, threshold) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { cb(); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); cb(); } });
    }, { threshold: threshold || 0.25 });
    io.observe(el);
  }

  /* Observateur de visibilité continue */
  function watchVisible(el, cb) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { cb(true); return; }
    new IntersectionObserver(function (es) { cb(es[0].isIntersecting); }, { threshold: 0 }).observe(el);
  }

  /* ---------- Thème clair / sombre ---------- */
  safe(function () {
    var btn = $("#themeBtn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var t = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", t);
      try { localStorage.setItem("theme", t); } catch (e) {}
      readColors();
      d.dispatchEvent(new CustomEvent("themechange"));
    });
  });

  /* ---------- Compteurs ---------- */
  function countUp(el) {
    var to = parseFloat(el.getAttribute("data-count")),
        dec = parseInt(el.getAttribute("data-dec") || "0", 10),
        pre = el.getAttribute("data-prefix") || "",
        suf = el.getAttribute("data-suffix") || "";
    if (reduce) { el.textContent = pre + fmt(to, dec) + suf; return; }
    var dur = 1900, t0 = performance.now();
    (function f(now) {
      var p = clamp((now - t0) / dur, 0, 1);
      el.textContent = pre + fmt(to * ease(p), dec) + suf;
      if (p < 1) requestAnimationFrame(f);
    })(t0);
  }
  var heroCounters = $$("[data-count-hero]");
  if (!reduce) {
    heroCounters.forEach(function (el) {
      el.textContent = (el.getAttribute("data-prefix") || "") + "0" + (el.getAttribute("data-suffix") || "");
    });
  }

  /* ---------- Préchargeur + séquence d'entrée ---------- */
  safe(function () {
    var pre = $("#preloader"), num = $("#plCount"), finished = false;

    function startIntro() {
      body.classList.add("ready");
      setTimeout(function () { heroCounters.forEach(countUp); }, reduce ? 0 : 1300);
    }
    var finish = function () {
      if (finished) return;
      finished = true;
      if (num) num.textContent = "100";
      if (pre) {
        pre.classList.add("done");
        setTimeout(function () { pre.style.display = "none"; }, 1300);
      }
      startIntro();
    };

    if (!pre || !root.classList.contains("js") || reduce) { finished = true; startIntro(); if (pre) pre.style.display = "none"; return; }

    var t0 = performance.now(), dur = 1700, loaded = d.readyState === "complete";
    window.addEventListener("load", function () { loaded = true; });
    setTimeout(finish, 6000);
    (function tick(now) {
      if (finished) return;
      var p = clamp((now - t0) / dur, 0, 1), shown = Math.round(ease(p) * 100);
      if (!loaded && shown > 99) shown = 99;
      if (num) num.textContent = shown;
      if (p >= 1 && loaded) finish(); else requestAnimationFrame(tick);
    })(t0);
  });

  /* ---------- Titres découpés mot par mot ---------- */
  safe(function () {
    $$(".split").forEach(function (el) {
      var idx = 0;
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = d.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (p) {
              if (!p) return;
              if (/^\s+$/.test(p)) { frag.appendChild(d.createTextNode(" ")); return; }
              var w = d.createElement("span"), i = d.createElement("span");
              w.className = "w"; i.className = "wi";
              i.style.transitionDelay = (idx++ * 70) + "ms";
              i.textContent = p;
              w.appendChild(i); frag.appendChild(w);
            });
            node.replaceChild(frag, n);
          } else if (n.nodeType === 1) { walk(n); }
        });
      })(el);
    });
  });

  /* ---------- Révélations au défilement ---------- */
  safe(function () {
    $$("[data-stagger]").forEach(function (p) {
      Array.prototype.slice.call(p.children).forEach(function (c, i) {
        if (!c.hasAttribute("data-reveal")) c.setAttribute("data-reveal", "");
        c.style.setProperty("--d", (i * 0.09) + "s");
      });
    });
    var targets = $$("[data-reveal], .sec-head, .sec .split");
    if (!("IntersectionObserver" in window)) { targets.forEach(function (t) { t.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    targets.forEach(function (t) { io.observe(t); });
  });

  /* ---------- Curseurs de plage : remplissage ---------- */
  function fillRange(inp) {
    var p = (inp.value - inp.min) / (inp.max - inp.min) * 100;
    inp.style.setProperty("--p", p + "%");
  }
  $$("input[type=range]").forEach(function (r) { fillRange(r); r.addEventListener("input", function () { fillRange(r); }); });

  /* ---------- Barre, navigation, défilement ---------- */
  safe(function () {
    var topbar = $("#topbar"), prog = $("#progress"), nav = $("#nav"), burger = $("#burger"),
        toTop = $("#toTop"), ring = $("#toTopRing"), tl = $("#tl"), tlFill = $("#tlFill"),
        lastY = window.scrollY, ticking = false, navOpen = false;
    var RING = 119.38;

    var yr = $("#year"); if (yr) yr.textContent = new Date().getFullYear();

    function setNav(open) {
      navOpen = open;
      nav.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
      if (open) topbar.classList.remove("hide");
    }
    burger.addEventListener("click", function () { setNav(!navOpen); });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", function () { setNav(false); }); });
    d.addEventListener("keydown", function (e) { if (e.key === "Escape" && navOpen) setNav(false); });

    function update() {
      ticking = false;
      var y = window.scrollY, h = root.scrollHeight - root.clientHeight, p = h > 0 ? clamp(y / h, 0, 1) : 0;
      prog.style.transform = "scaleX(" + p + ")";
      topbar.classList.toggle("scrolled", y > 24);
      if (!navOpen) {
        if (y > lastY + 6 && y > 240) topbar.classList.add("hide");
        else if (y < lastY - 6 || y < 240) topbar.classList.remove("hide");
      }
      lastY = y;
      toTop.classList.toggle("show", y > 700);
      ring.style.strokeDashoffset = RING * (1 - p);

      if (tl && tlFill) {
        var r = tl.getBoundingClientRect(), f = clamp((window.innerHeight * 0.62 - r.top) / r.height, 0, 1);
        tlFill.style.transform = "scaleY(" + f + ")";
        $$(".tl-item", tl).forEach(function (it) {
          it.classList.toggle("lit", it.getBoundingClientRect().top < window.innerHeight * 0.62);
        });
      }
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();

    toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });

    /* Points de navigation + lien actif */
    var secs = $$("section[data-title]"), dots = d.createElement("nav");
    dots.className = "dots"; dots.setAttribute("aria-label", "Sections");
    secs.forEach(function (s) {
      var a = d.createElement("a");
      a.href = "#" + s.id; a.setAttribute("data-label", s.getAttribute("data-title")); a.setAttribute("aria-label", s.getAttribute("data-title"));
      dots.appendChild(a);
    });
    body.appendChild(dots);

    if ("IntersectionObserver" in window) {
      var spy = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var id = "#" + e.target.id;
          $$("a", dots).forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === id); });
          $$("a", nav).forEach(function (a) { a.classList.toggle("active", a.getAttribute("href") === id); });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      secs.forEach(function (s) { spy.observe(s); });
    }
  });

  /* ---------- Halo du curseur, projecteurs, inclinaison, aimant ---------- */
  safe(function () {
    if (!fine || reduce) return;

    var glow = d.createElement("div"); glow.className = "cursor-glow"; body.appendChild(glow);
    var tx = 0, ty = 0, cx = 0, cy = 0, run = false;
    function gl() {
      cx = lerp(cx, tx, 0.12); cy = lerp(cy, ty, 0.12);
      glow.style.transform = "translate(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px)";
      if (Math.abs(tx - cx) > 0.4 || Math.abs(ty - cy) > 0.4) requestAnimationFrame(gl); else run = false;
    }
    d.addEventListener("pointermove", function (e) {
      tx = e.clientX; ty = e.clientY; glow.classList.add("on");
      if (!run) { run = true; requestAnimationFrame(gl); }
    }, { passive: true });
    root.addEventListener("mouseleave", function () { glow.classList.remove("on"); });

    $$(".spot").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (e.clientX - r.left) + "px");
        el.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });

    $$(".tilt").forEach(function (el) {
      var raf = 0;
      el.addEventListener("pointermove", function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform = "perspective(900px) rotateX(" + (-py * 8).toFixed(2) + "deg) rotateY(" + (px * 10).toFixed(2) + "deg) translateY(-4px)";
        });
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; });
    });

    $$(".magnetic").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = "translate(" + ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + "px," + ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + "px)";
      });
      el.addEventListener("pointerleave", function () { el.style.transform = ""; el.style.transition = "transform .5s cubic-bezier(.2,.8,.2,1), box-shadow .4s"; setTimeout(function () { el.style.transition = ""; }, 520); });
    });
  });

  /* ---------- Hero : réseau de particules + parallaxe ---------- */
  safe(function () {
    var cv = $("#heroCanvas"), hero = $(".hero"), vis = $("#heroVisual");
    if (!cv || !hero) return;
    var ctx = cv.getContext("2d"), W = 0, H = 0, dpr = 1, parts = [], mouse = { x: -999, y: -999, on: false }, running = false, inView = true;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.clientWidth; H = hero.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(clamp(W * H / 15000, 28, 95));
      parts = [];
      for (var i = 0; i < n; i++) {
        parts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, r: Math.random() * 1.5 + 0.6 });
      }
      if (reduce) draw(false);
    }

    function draw(move) {
      ctx.clearRect(0, 0, W, H);
      var i, j, p, q, dx, dy, dist, a, LINK = 125;
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        if (move) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
          if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
          if (mouse.on) {
            dx = mouse.x - p.x; dy = mouse.y - p.y; dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 170 && dist > 1) { p.x += dx / dist * 0.35; p.y += dy / dist * 0.35; }
          }
        }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(120,230,215,.75)"; ctx.fill();
      }
      ctx.lineWidth = 1;
      for (i = 0; i < parts.length; i++) {
        p = parts[i];
        for (j = i + 1; j < parts.length; j++) {
          q = parts[j]; dx = p.x - q.x; dy = p.y - q.y;
          if (Math.abs(dx) > LINK || Math.abs(dy) > LINK) continue;
          dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK) {
            a = (1 - dist / LINK) * 0.32;
            ctx.strokeStyle = "rgba(96,165,250," + a.toFixed(3) + ")";
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        if (mouse.on) {
          dx = p.x - mouse.x; dy = p.y - mouse.y; dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 170) {
            ctx.strokeStyle = "rgba(45,212,191," + ((1 - dist / 170) * 0.55).toFixed(3) + ")";
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
          }
        }
      }
    }

    function loop() {
      if (!inView || reduce) { running = false; return; }
      draw(true);
      requestAnimationFrame(loop);
    }
    function start() { if (!running && inView && !reduce) { running = true; requestAnimationFrame(loop); } }

    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.on = true;
      if (vis && fine && !reduce) {
        vis.style.setProperty("--px", ((e.clientX - r.left) / r.width * 2 - 1).toFixed(3));
        vis.style.setProperty("--py", ((e.clientY - r.top) / r.height * 2 - 1).toFixed(3));
      }
    });
    hero.addEventListener("pointerleave", function () {
      mouse.on = false;
      if (vis) { vis.style.setProperty("--px", 0); vis.style.setProperty("--py", 0); }
    });

    resize(); start();
    var rt = 0;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 150); });
    watchVisible(hero, function (v) { inView = v; if (v) start(); });
  });

  /* ---------- Anatomie interactive ---------- */
  safe(function () {
    var svg = $("#anatomy"), panel = $("#anatomyPanel");
    if (!svg || !panel) return;
    var DATA = {
      camera: { n: "01", t: "Caméra frontale", p: "Capture la scène vue par le porteur. Ses images alimentent la localisation (SLAM), la reconnaissance d’objets ou de texte, et la prise de photos ou de vidéos. Un voyant signale l’enregistrement aux personnes alentour.", l: ["Vision par ordinateur", "SLAM", "Photo / vidéo"] },
      waveguide: { n: "02", t: "Micro-afficheur & guide d’onde", p: "Un micro-afficheur (micro-OLED, LCoS ou micro-LED) forme l’image. Un guide d’onde la transporte par réflexion totale interne puis l’extrait devant la pupille, tout en laissant passer la lumière du monde réel.", l: ["Réflexion totale interne", "Réseaux de diffraction", "Luminance élevée"] },
      imu: { n: "03", t: "Centrale inertielle (IMU)", p: "Accéléromètre et gyroscope (parfois magnétomètre) mesurent les mouvements de la tête à plusieurs centaines de hertz. Fusionnés avec les images, ils donnent la pose de la tête en six degrés de liberté.", l: ["6 DoF", "Plusieurs centaines de Hz", "Fusion de capteurs"] },
      cpu: { n: "04", t: "Processeur basse consommation", p: "Un système sur puce exécute la fusion de capteurs et l’inférence de petits modèles. Lorsque le budget thermique ou énergétique est dépassé, une partie du calcul est déportée vers un téléphone ou le nuage.", l: ["SoC", "Accélérateur d’IA", "Budget thermique"] },
      battery: { n: "05", t: "Batterie", p: "Une cellule lithium de quelques centaines de milliampères-heures, logée dans les branches pour équilibrer la masse. L’étui de transport sert souvent de chargeur nomade.", l: ["Quelques centaines de mAh", "Répartition de la masse", "Charge par l’étui"] },
      speaker: { n: "06", t: "Audio directionnel", p: "De petits haut-parleurs orientés vers l’oreille, ou la conduction osseuse, diffusent la voix et les notifications sans boucher le conduit auditif. Un réseau de microphones isole la voix du porteur.", l: ["Haut-parleurs ouverts", "Conduction osseuse", "Beamforming"] }
    };
    var ORDER = ["camera", "waveguide", "imu", "cpu", "battery", "speaker"];
    var hs = $$(".hs", svg), zones = $$(".zone", svg), cur = null, auto = 0, userTouched = false;

    function select(key, fromUser) {
      if (fromUser) { userTouched = true; clearInterval(auto); }
      if (key === cur) return;
      cur = key;
      var o = DATA[key];
      $("#apNum").textContent = o.n; $("#apTitle").textContent = o.t; $("#apText").textContent = o.p;
      var ul = $("#apList"); ul.innerHTML = "";
      o.l.forEach(function (t) { var li = d.createElement("li"); li.textContent = t; ul.appendChild(li); });
      panel.classList.remove("show"); void panel.offsetWidth; panel.classList.add("show");
      hs.forEach(function (h) { h.classList.toggle("active", h.getAttribute("data-key") === key); });
      zones.forEach(function (z) { z.classList.toggle("on", z.getAttribute("data-zone") === key); });
    }
    hs.forEach(function (h) {
      var k = h.getAttribute("data-key");
      h.addEventListener("click", function () { select(k, true); });
      h.addEventListener("mouseenter", function () { select(k, true); });
      h.addEventListener("focus", function () { select(k, true); });
      h.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(k, true); } });
    });
    select("camera", false);

    if (!reduce) {
      var visible = false, idx = 0;
      watchVisible(svg, function (v) { visible = v; });
      auto = setInterval(function () {
        if (!visible || userTouched) return;
        idx = (idx + 1) % ORDER.length; select(ORDER[idx], false);
      }, 4200);
    }
  });

  /* ---------- Laboratoire : réflexion totale interne ---------- */
  safe(function () {
    var cv = $("#tirCanvas");
    if (!cv) return;
    var ctx = cv.getContext("2d"), box = cv.parentNode;
    var angle = $("#tirAngle"), idx = $("#tirIndex"), outA = $("#tirAngleOut"), outN = $("#tirIndexOut"),
        outC = $("#tirCrit"), outS = $("#tirState"), outR = $("#tirRefl"), badge = $("#tirBadge"), btn = $("#tirPause");
    var W = 0, H = 0, dpr = 1, T = 40, yT = 0, yB = 0, xIn = 0, xOut0 = 0, xOut1 = 0;
    var S = { theta: 55, n: 1.5 }, path = null, paused = false, visible = false, raf = 0, t = 0;

    function rr(x, y, w, h, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    function layout() {
      T = clamp(W * 0.055, 26, 54);
      yT = H * 0.36; yB = yT + T;
      xIn = Math.max(W * 0.13, 64);
      xOut0 = W * 0.58; xOut1 = Math.min(W - 24, xOut0 + W * 0.2);
    }

    function build() {
      var th = S.theta * Math.PI / 180, thc = Math.asin(1 / S.n), dx = T * Math.tan(th);
      var pts = [{ x: xIn, y: yT - 54 }, { x: xIn, y: yT }], trapped = th >= thc - 1e-6, exit = null, phi = 0, refl = null;
      if (!trapped) {
        var x1 = xIn + dx;
        pts.push({ x: x1, y: yB });
        phi = Math.asin(Math.min(1, S.n * Math.sin(th)));
        var L = (H - yB - 20) * 0.92;
        pts.push({ x: x1 + Math.sin(phi) * L, y: yB + Math.cos(phi) * L });
      } else {
        var x = xIn, down = true, k = 0;
        while (x < W * 1.15 && k < 80) {
          x += dx; pts.push({ x: x, y: down ? yB : yT });
          if (down && x >= xOut0) { exit = { x: x, y: yB }; pts.push({ x: x, y: H - 36 }); break; }
          down = !down; k++;
        }
        if (exit) refl = pts.length - 4;
      }
      var cum = [0], i;
      for (i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
      path = { pts: pts, cum: cum, len: cum[cum.length - 1], trapped: trapped, exit: exit, phi: phi, dx: dx, thc: thc, refl: refl };

      outA.textContent = S.theta + "°"; outN.textContent = fmt(S.n, 2);
      outC.textContent = fmt(thc * 180 / Math.PI, 1) + "°";
      outS.textContent = trapped ? "Piégé (RTI)" : "Fuite";
      outR.textContent = trapped ? (refl !== null ? String(refl) : "> bord") : "0";
      badge.textContent = trapped ? "Réflexion totale interne ✓" : "Fuite : θ < θc ✗";
      badge.className = "badge " + (trapped ? "ok" : "bad");
    }

    function at(p, s) {
      var i = 1;
      while (i < p.cum.length - 1 && p.cum[i] < s) i++;
      var a = p.pts[i - 1], b = p.pts[i], seg = p.cum[i] - p.cum[i - 1], u = seg ? (s - p.cum[i - 1]) / seg : 0;
      return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
    }

    function gratings(x0, x1, y, dir, col) {
      ctx.strokeStyle = col; ctx.lineWidth = 1.7; ctx.beginPath();
      for (var x = x0; x <= x1; x += 6) { ctx.moveTo(x, y - dir * 5); ctx.lineTo(x + 3, y + dir * 5); }
      ctx.stroke();
    }

    function eye(x, y, col, alpha, glow) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.8;
      if (glow) { ctx.shadowColor = col; ctx.shadowBlur = 16; }
      ctx.beginPath(); ctx.ellipse(x, y, 20, 10, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function draw(time) {
      if (!path) return;
      var P = path, th = S.theta * Math.PI / 180, i, g;
      ctx.clearRect(0, 0, W, H);

      /* Lame de verre */
      g = ctx.createLinearGradient(0, yT, 0, yB);
      g.addColorStop(0, rgba(C.accent2, 0.32)); g.addColorStop(1, rgba(C.accent, 0.14));
      rr(18, yT, W - 36, T, 6); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = rgba(C.accent2, 0.75); ctx.lineWidth = 1.4; ctx.stroke();

      ctx.font = "500 11px " + MONO; ctx.textBaseline = "middle";
      ctx.textAlign = "right"; ctx.fillStyle = C.muted; ctx.fillText("Air  n = 1", W - 14, yT - 12);
      ctx.fillStyle = C.ink; ctx.fillText("Verre  n = " + fmt(S.n, 2), W - 14, yT + T / 2);
      ctx.textAlign = "left"; ctx.fillStyle = C.muted; ctx.fillText("Air  n = 1", 14, yB + 14);

      /* Réseaux */
      ctx.fillStyle = rgba(C.accent3, 0.1); ctx.fillRect(xOut0, yB - 7, xOut1 - xOut0, 14);
      gratings(xIn - 22, xIn + 22, yT, 1, rgba(C.accent, 0.95));
      gratings(xOut0, xOut1, yB, -1, rgba(C.accent3, 0.95));
      ctx.font = "500 10px " + MONO; ctx.fillStyle = C.muted;
      ctx.fillText("Réseau d’entrée", xIn + 28, yT - 9);
      ctx.fillText("Réseau de sortie", xOut0, yB + 16);

      /* Micro-afficheur */
      rr(xIn - 48, yT - 78, 96, 24, 7); ctx.fillStyle = rgba(C.accent, 0.18); ctx.fill();
      ctx.strokeStyle = rgba(C.accent, 0.85); ctx.lineWidth = 1.3; ctx.stroke();
      ctx.textAlign = "center"; ctx.fillStyle = C.ink; ctx.font = "500 9.5px " + MONO; ctx.fillText("Micro-afficheur", xIn, yT - 66);

      /* Trajet (tracé léger) */
      for (i = 1; i < P.pts.length; i++) {
        var leak = !P.trapped && i >= 3;
        ctx.strokeStyle = leak ? rgba(C.warn, 0.45) : rgba(C.accent, 0.32); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(P.pts[i - 1].x, P.pts[i - 1].y); ctx.lineTo(P.pts[i].x, P.pts[i].y); ctx.stroke();
      }
      if (!P.trapped) {
        ctx.setLineDash([4, 5]); ctx.strokeStyle = rgba(C.accent, 0.2); ctx.beginPath();
        ctx.moveTo(P.pts[2].x, yB); ctx.lineTo(P.pts[2].x + P.dx, yT); ctx.stroke(); ctx.setLineDash([]);
      }

      /* Normale et angle au premier impact */
      var h1 = P.pts[2], r = T * 0.55;
      ctx.setLineDash([3, 3]); ctx.strokeStyle = rgba(C.ink, 0.38); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(h1.x, yB + (P.trapped ? 0 : 30)); ctx.lineTo(h1.x, yB - T * 0.95); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = C.accent2; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.arc(h1.x, yB, r, -Math.PI / 2 - th, -Math.PI / 2, false); ctx.stroke();
      ctx.fillStyle = C.accent2; ctx.font = "600 11px " + MONO; ctx.textAlign = "center";
      ctx.fillText("θ", h1.x + Math.cos(-Math.PI / 2 - th / 2) * (r + 11), yB + Math.sin(-Math.PI / 2 - th / 2) * (r + 11));

      /* Photons */
      var speed = Math.max(170, W * 0.27), gap = 64, period = P.len + gap, count = Math.ceil(period / gap), base = time * speed, k, j, s, sj, pos, col, a;
      for (k = 0; k < count; k++) {
        s = (((base - k * gap) % period) + period) % period;
        if (s > P.len) continue;
        for (j = 11; j >= 0; j--) {
          sj = s - j * 5; if (sj < 0) continue;
          pos = at(P, sj); col = (!P.trapped && sj > P.cum[2]) ? C.warn : C.accent;
          a = j === 0 ? 1 : 0.5 * (1 - j / 12);
          ctx.beginPath(); ctx.arc(pos.x, pos.y, j === 0 ? 3.8 : 3.2 * (1 - j / 14), 0, Math.PI * 2);
          ctx.fillStyle = rgba(col, a);
          if (j === 0) { ctx.shadowColor = col; ctx.shadowBlur = 14; }
          ctx.fill(); ctx.shadowBlur = 0;
        }
      }

      /* Œil / fuite */
      ctx.font = "500 11px " + MONO; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      if (P.trapped && P.exit) {
        eye(P.exit.x, H - 18, C.accent, 1, true);
        ctx.fillStyle = C.ink; ctx.fillText("Œil", Math.min(P.exit.x + 28, W - 30), H - 18);
      } else if (!P.trapped) {
        eye(W * 0.78, H - 18, C.muted, 0.28, false);
        var fe = P.pts[3];
        ctx.fillStyle = C.warn; ctx.fillText("Fuite", clamp(fe.x + 8, 8, W - 50), clamp(fe.y - 8, 12, H - 12));
      } else {
        eye(W * 0.78, H - 18, C.muted, 0.28, false);
      }
    }

    function frame() { draw(t); }

    function loop(now) {
      raf = 0;
      if (!visible || paused || reduce) return;
      t = now / 1000; draw(t);
      raf = requestAnimationFrame(loop);
    }
    function kick() { if (!raf && visible && !paused && !reduce) raf = requestAnimationFrame(loop); }

    function resize() {
      var w = box.clientWidth; if (!w) return;
      W = w; H = Math.round(clamp(w * 0.42, 270, 390));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      layout(); build(); if (reduce) t = 1.6; frame();
    }

    function onInput() { S.theta = parseFloat(angle.value); S.n = parseFloat(idx.value); build(); frame(); }
    angle.addEventListener("input", onInput);
    idx.addEventListener("input", onInput);
    btn.addEventListener("click", function () {
      paused = !paused;
      btn.textContent = paused ? "▶ Reprendre" : "⏸ Pause";
      if (!paused) kick();
    });
    d.addEventListener("themechange", frame);

    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(box); else window.addEventListener("resize", resize);
    watchVisible(cv, function (v) { visible = v; if (v) kick(); });
    resize();
  });

  /* ---------- Radar comparatif ---------- */
  safe(function () {
    var svg = $("#radar");
    if (!svg) return;
    var AX = ["Finesse", "Luminosité", "Champ de vision", "Couleurs", "Fabrication"];
    var SER = [
      { name: "Guide d’onde diffractif", color: "#2dd4bf", v: [5, 2, 3, 2, 2], txt: "Des réseaux de diffraction gravés sur le verre couplent la lumière en entrée et la libèrent en sortie. C’est l’architecture la plus fine, mais le rendement lumineux est faible et la dispersion colore parfois l’image." },
      { name: "Guide d’onde réflectif", color: "#60a5fa", v: [4, 3, 3, 4, 2], txt: "Une série de miroirs semi-réfléchissants noyés dans la lame extrait la lumière. Les couleurs sont plus uniformes, au prix d’un assemblage et d’un alignement plus complexes." },
      { name: "Birdbath", color: "#a78bfa", v: [2, 5, 3, 4, 4], txt: "Un combinateur semi-transparent courbe renvoie l’image d’un micro-afficheur vers l’œil. L’image est lumineuse et nette, mais l’encombrement devant l’œil est plus important." },
      { name: "Projection rétinienne", color: "#fbbf24", v: [4, 4, 2, 3, 2], txt: "Un faisceau laser balayé forme l’image directement sur la rétine : la mise au point est toujours nette. En contrepartie, la pupille de sortie est étroite et la sécurité oculaire doit être rigoureusement maîtrisée." }
    ];
    var cx = 230, cy = 200, R = 118, sel = 0, gr = 0, i;

    function el(n, a, p) { var e = d.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); (p || svg).appendChild(e); return e; }
    function pt(ix, val) { var ang = -Math.PI / 2 + ix * 2 * Math.PI / AX.length; return [cx + Math.cos(ang) * R * val / 5, cy + Math.sin(ang) * R * val / 5]; }

    for (var l = 1; l <= 5; l++) {
      el("polygon", { points: AX.map(function (_, ix) { return pt(ix, l).join(","); }).join(" "), "class": "r-ring" });
    }
    AX.forEach(function (a, ix) {
      var p = pt(ix, 5), q = pt(ix, 6.4);
      el("line", { x1: cx, y1: cy, x2: p[0], y2: p[1], "class": "r-axis" });
      var tx = el("text", { x: q[0], y: q[1] + 4, "class": "r-label", "text-anchor": Math.abs(q[0] - cx) < 8 ? "middle" : (q[0] > cx ? "start" : "end") });
      tx.textContent = a;
    });
    var polys = SER.map(function (s) { var p = el("polygon", { "class": "r-series", fill: s.color, stroke: s.color }); p.style.color = s.color; return p; });
    var dots = AX.map(function () { return el("circle", { r: 4.5, "class": "r-dot" }); });

    function render() {
      SER.forEach(function (s, si) {
        polys[si].setAttribute("points", s.v.map(function (v, ix) { return pt(ix, v * gr).join(","); }).join(" "));
        polys[si].classList.toggle("on", si === sel);
      });
      dots.forEach(function (c, ix) {
        var p = pt(ix, SER[sel].v[ix] * gr);
        c.setAttribute("cx", p[0]); c.setAttribute("cy", p[1]); c.setAttribute("fill", SER[sel].color);
      });
    }

    var chips = $("#radarChips"), title = $("#radarTitle"), text = $("#radarText"), bars = $("#radarBars"), btns = [];
    function info() {
      var s = SER[sel];
      title.textContent = s.name; text.textContent = s.txt; bars.innerHTML = "";
      AX.forEach(function (a, ix) {
        var row = d.createElement("div"); row.className = "r-bar"; row.style.setProperty("--c", s.color);
        row.innerHTML = "<span>" + a + "</span><i></i><b>" + s.v[ix] + "/5</b>";
        bars.appendChild(row);
      });
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        $$(".r-bar i", bars).forEach(function (b, ix) { b.style.setProperty("--w", (s.v[ix] * 20) + "%"); });
      }); });
    }
    function select(ix) {
      sel = ix;
      svg.appendChild(polys[ix]); dots.forEach(function (c) { svg.appendChild(c); });
      btns.forEach(function (b, bi) { b.classList.toggle("active", bi === ix); b.setAttribute("aria-pressed", bi === ix ? "true" : "false"); });
      info(); render();
    }
    SER.forEach(function (s, ix) {
      var b = d.createElement("button"); b.type = "button"; b.className = "chip";
      b.style.setProperty("--c", s.color);
      b.innerHTML = "<i></i>" + s.name;
      b.addEventListener("click", function () { select(ix); });
      chips.appendChild(b); btns.push(b);
    });
    select(0);

    if (reduce) { gr = 1; render(); return; }
    render();
    onView(svg, function () {
      var t0 = performance.now(), dur = 1300;
      (function f(now) {
        var p = clamp((now - t0) / dur, 0, 1); gr = ease(p); render();
        if (p < 1) requestAnimationFrame(f);
      })(t0);
    }, 0.3);
  });

  /* ---------- Onglets ---------- */
  safe(function () {
    $$(".tablist").forEach(function (list) {
      var tabs = $$(".tab", list), wrap = list.parentNode, panels = $$(".tabpanel", wrap);
      function activate(tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle("active", on); t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1;
        });
        panels.forEach(function (p) {
          var on = p.id === tab.getAttribute("aria-controls");
          p.classList.toggle("active", on); p.hidden = !on;
        });
        if (focus) tab.focus();
      }
      tabs.forEach(function (tab, i) {
        tab.addEventListener("click", function () { activate(tab, false); });
        tab.addEventListener("keydown", function (e) {
          var n = null;
          if (e.key === "ArrowRight") n = tabs[(i + 1) % tabs.length];
          else if (e.key === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
          else if (e.key === "Home") n = tabs[0];
          else if (e.key === "End") n = tabs[tabs.length - 1];
          if (n) { e.preventDefault(); activate(n, true); }
        });
      });
    });
  });

  /* ---------- Barres d'étendue ---------- */
  safe(function () {
    var box = $(".ranges");
    if (!box) return;
    onView(box, function () {
      $$(".range", box).forEach(function (r) {
        var sc = parseFloat(r.getAttribute("data-scale"));
        $$(".rg", r).forEach(function (g) {
          var mn = parseFloat(g.getAttribute("data-min")), mx = parseFloat(g.getAttribute("data-max"));
          g.style.left = (mn / sc * 100) + "%"; g.style.width = ((mx - mn) / sc * 100) + "%";
        });
      });
      box.classList.add("in");
    }, 0.3);
  });

  /* ---------- Simulateur d'autonomie ---------- */
  safe(function () {
    var cap = $("#cap"), volt = $("#volt"), pow = $("#power");
    if (!cap) return;
    var outE = $("#energy"), outA = $("#autonomy"), arc = $("#gaugeArc"), gTxt = $("#gaugeTxt"),
        grid = $("#curveGrid"), line = $("#curvePath"), area = $("#curveArea"), dot = $("#curveDot"), lbl = $("#curveLbl");
    var CIRC = 326.73, X0 = 52, X1 = 500, Y0 = 18, Y1 = 214, PMIN = 50, PMAX = 1500;

    function niceCeil(v) {
      var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), m = [1, 2, 5, 10], i;
      for (i = 0; i < m.length; i++) if (m[i] * p >= v) return m[i] * p;
      return 10 * p;
    }
    function xP(p) { return X0 + (p - PMIN) / (PMAX - PMIN) * (X1 - X0); }
    function dur(h) {
      if (h >= 100) return Math.round(h) + " h";
      var hh = Math.floor(h), mm = Math.round((h - hh) * 60);
      if (mm === 60) { hh += 1; mm = 0; }
      return hh + " h " + (mm < 10 ? "0" : "") + mm;
    }

    function update() {
      var Cc = parseFloat(cap.value), U = parseFloat(volt.value), P = parseFloat(pow.value);
      if (!(Cc > 0 && U > 0 && P > 0)) { outE.textContent = "—"; outA.textContent = "—"; gTxt.textContent = "—"; return; }
      var wh = Cc * U / 1000, hours = Cc * U / P;
      outE.textContent = fmt(wh, 2); outA.textContent = dur(hours) + (hours < 100 ? " min" : "");
      gTxt.textContent = hours >= 100 ? "99+ h" : dur(hours);
      arc.style.strokeDashoffset = CIRC * (1 - clamp(hours / 24, 0, 1));

      var ymax = niceCeil(Cc * U / PMIN);
      function yT(tt) { return Y1 - (tt / ymax) * (Y1 - Y0); }
      var html = "", k, pp, dpath = "", i;
      for (k = 0; k <= 4; k++) {
        var yy = Y1 - k * (Y1 - Y0) / 4, v = ymax * k / 4;
        html += '<line class="c-grid" x1="' + X0 + '" x2="' + X1 + '" y1="' + yy + '" y2="' + yy + '"/><text class="c-axis-t" x="' + (X0 - 8) + '" y="' + (yy + 3) + '" text-anchor="end">' + (v % 1 ? v.toFixed(1) : v) + ' h</text>';
      }
      for (pp = 250; pp <= PMAX; pp += 250) {
        html += '<text class="c-axis-t" x="' + xP(pp) + '" y="' + (Y1 + 20) + '" text-anchor="middle">' + pp + '</text>';
      }
      html += '<text class="c-axis-t" x="' + X1 + '" y="' + (Y1 + 38) + '" text-anchor="end">puissance P (mW)</text>';
      grid.innerHTML = html;

      for (i = 0, pp = PMIN; pp <= PMAX; pp += 25, i++) {
        dpath += (i ? "L" : "M") + xP(pp).toFixed(1) + " " + yT(Cc * U / pp).toFixed(1) + " ";
      }
      line.setAttribute("d", dpath);
      area.setAttribute("d", dpath + "L" + X1 + " " + Y1 + " L" + X0 + " " + Y1 + " Z");

      var Pc = clamp(P, PMIN, PMAX), dx = xP(Pc), dy = yT(Cc * U / Pc);
      dot.style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px)";
      lbl.textContent = "t = " + dur(hours) + (hours < 100 ? " min" : "");
      lbl.setAttribute("text-anchor", dx > 380 ? "end" : "start");
      lbl.setAttribute("x", dx > 380 ? -12 : 12);
    }
    [cap, volt, pow].forEach(function (e) { e.addEventListener("input", update); });
    $$("[data-preset]").forEach(function (b) {
      b.addEventListener("click", function () {
        cap.value = b.getAttribute("data-c"); volt.value = b.getAttribute("data-u"); pow.value = b.getAttribute("data-p"); update();
      });
    });
    update();
    arc.style.strokeDashoffset = CIRC;
    onView($(".gauge"), update, 0.2);
  });

  /* ---------- Simulateur de densité angulaire ---------- */
  safe(function () {
    var px = $("#px"), fov = $("#fov");
    if (!px) return;
    var out = $("#ppd"), note = $("#ppdNote"), fill = $("#ppdFill"), cv = $("#ppdCanvas");
    var ctx = cv.getContext("2d"), off = d.createElement("canvas"), octx = off.getContext("2d"), CW = 320, CH = 110, fillOn = false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = CW * dpr; cv.height = CH * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    function preview(v) {
      var r = clamp(v / 60, 0.07, 1);
      off.width = Math.max(8, Math.round(CW * r)); off.height = Math.max(4, Math.round(CH * r));
      octx.fillStyle = C.solid; octx.fillRect(0, 0, off.width, off.height);
      octx.fillStyle = C.ink; octx.textBaseline = "middle";
      octx.font = "700 " + (36 * r) + "px " + HEAD; octx.fillText("Lunettes", 14 * r, CH * r * 0.36);
      octx.fillStyle = C.accent; octx.font = "500 " + (14 * r) + "px " + MONO;
      octx.fillText("champ " + fov.value + "° · " + px.value + " px", 14 * r, CH * r * 0.74);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, CW, CH);
      ctx.drawImage(off, 0, 0, off.width, off.height, 0, 0, CW, CH);
    }
    function update() {
      var N = parseFloat(px.value), Th = parseFloat(fov.value);
      if (!(N > 0 && Th > 0)) { out.textContent = "—"; note.textContent = ""; fill.style.width = "0"; return; }
      var v = N / Th;
      out.textContent = fmt(v, 1);
      note.textContent = "≈ " + Math.round(v / 60 * 100) + " % de l’acuité visuelle normale (60 px/°)";
      fill.style.width = fillOn ? clamp(v / 72 * 100, 0, 100) + "%" : "0";
      preview(v);
    }
    [px, fov].forEach(function (e) { e.addEventListener("input", update); });
    d.addEventListener("themechange", update);
    update();
    onView($(".meter"), function () { fillOn = true; update(); }, 0.3);
  });

  /* ---------- Accordéon ---------- */
  safe(function () {
    $$(".acc-item").forEach(function (item) {
      var btn = $(".acc-btn", item);
      btn.addEventListener("click", function () {
        var open = !item.classList.contains("open");
        item.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    });
  });

})();
