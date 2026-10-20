(function () {
  var MEDIA = {
    ouroMark: "https://res.cloudinary.com/dtkluxukm/image/upload/v1792429070/copy_of_6_tjnzkw.png",
    launchVideo: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792483605/OPENING_FILM_converted_1_otfynh.webm",
    brandMosaic: [
      "https://res.cloudinary.com/dtkluxukm/image/upload/v1792478377/launch_visuals_one_ggdl7n.jpg",
      "https://res.cloudinary.com/dtkluxukm/image/upload/v1792478377/2_u5fpfm.jpg",
      "https://res.cloudinary.com/dtkluxukm/image/upload/v1792478379/3_1_ncwi4e.jpg",
      "https://res.cloudinary.com/dtkluxukm/image/upload/v1792478381/1_b6dibw.jpg"
    ],
    eventColumns: [
      "https://res.cloudinary.com/dtkluxukm/image/upload/v1792478418/5_u5u2ci.jpg",
      "https://res.cloudinary.com/dtkluxukm/image/upload/v1792478418/7_unfepv.jpg",
      "https://res.cloudinary.com/dtkluxukm/image/upload/v1792478382/next26two_z38jhu.jpg",
      "https://res.cloudinary.com/dtkluxukm/image/upload/v1792478418/8_m3zlvn.jpg"
    ],
    eventPair: [
      "https://res.cloudinary.com/dtkluxukm/image/upload/v1792478414/2_rb5bfi.jpg",
      "https://res.cloudinary.com/dtkluxukm/image/upload/v1792478377/next26one_bax8kv.jpg"
    ],
    eventEditorial: "https://res.cloudinary.com/dtkluxukm/image/upload/v1792327304/ouro-launchcomm_huamhi.jpg",
    investorHero: "https://res.cloudinary.com/dtkluxukm/image/upload/v1792478854/OURO_CEO_LAUNCH_KEYNOTE.002_pe3k3w.png"
  };

  var reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = reducedQuery.matches;

  if (/^https?:\/\//.test(MEDIA.launchVideo)) {
    var slot = document.querySelector("[data-video-slot='launch']");
    if (slot && !slot.querySelector("video")) {
      var launchVideo = document.createElement("video");
      launchVideo.className = "land-video";
      launchVideo.autoplay = true;
      launchVideo.muted = true;
      launchVideo.loop = true;
      launchVideo.playsInline = true;
      launchVideo.preload = "none";
      launchVideo.src = MEDIA.launchVideo;
      slot.insertBefore(launchVideo, slot.firstChild);
    }
  }

  initSequences();

  if (!reduced && "IntersectionObserver" in window) {
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (entry.isIntersecting) {
          var play = video.play();
          if (play && play.catch) play.catch(function () {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.25 });
    document.querySelectorAll("video").forEach(function (video) { watch.observe(video); });
  }

  initPhotoContrast();
  revealChapter(location.hash);

  function initSequences() {
    var seqs = [].slice.call(document.querySelectorAll(".h-seq"));
    if (!seqs.length) return;
    var active = false;

    function measure() {
      active = !reducedQuery.matches;
      document.documentElement.classList.toggle("is-horizontal", active);
      var narrow = window.matchMedia("(max-width: 700px)").matches;
      seqs.forEach(function (seq) {
        var pin = seq.querySelector(".h-pin");
        var track = seq.querySelector(".h-track");
        var panels = track.children;
        var full = pin.clientWidth;
        var banner = narrow ? Math.round(full * 0.78) : Math.round(full * 0.4);
        for (var i = 0; i < panels.length; i++) {
          var panel = panels[i];
          if (!active) {
            panel.style.width = "";
            panel.style.flexBasis = "";
            continue;
          }
          var width = panel.classList.contains("is-banner") ? banner : full;
          panel.style.width = width + "px";
          panel.style.flexBasis = width + "px";
        }
        if (!active) {
          seq.style.height = "";
          track.style.transform = "";
          return;
        }
        var distance = Math.max(0, track.scrollWidth - full);
        seq.style.height = (pin.clientHeight + distance) + "px";
      });
      if (window.__dgLenis && window.__dgLenis.resize) window.__dgLenis.resize();
      apply();
    }

    function apply() {
      if (!active) return;
      var y = window.scrollY;
      seqs.forEach(function (seq) {
        var pin = seq.querySelector(".h-pin");
        var track = seq.querySelector(".h-track");
        var distance = Math.max(0, track.scrollWidth - pin.clientWidth);
        var max = Math.max(0, seq.offsetHeight - pin.clientHeight);
        var start = seq.getBoundingClientRect().top + y;
        var local = y - start;
        if (local < 0) local = 0;
        if (local > max) local = max;
        var x = max > 0 ? (local / max) * distance : 0;
        track.style.transform = "translate3d(" + (-x) + "px,0,0)";
      });
    }

    var frame = 0;
    function requestApply() {
      if (frame) return;
      frame = requestAnimationFrame(function () {
        frame = 0;
        apply();
      });
    }

    measure();
    addEventListener("scroll", requestApply, { passive: true });
    var resizeTimer;
    addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, 80);
    });
    reducedQuery.addEventListener("change", measure);
    window.addEventListener("load", measure);

    window.__ouroScrollToChapter = function (id, immediate) {
      var el = document.getElementById(id);
      if (!el) return;
      var seq = el.closest(".h-seq");
      if (!active || !seq) {
        el.scrollIntoView({ block: "start" });
        return;
      }
      var start = seq.getBoundingClientRect().top + window.scrollY;
      var y = start + el.offsetLeft;
      if (window.__dgLenis && window.__dgLenis.scrollTo) {
        window.__dgLenis.scrollTo(y, { immediate: !!immediate, force: true });
      } else {
        window.scrollTo(0, y);
      }
      apply();
    };
  }

  function revealChapter(hash) {
    var id = (hash || "").replace("#", "");
    if (!id || !document.getElementById(id)) return;
    requestAnimationFrame(function () {
      if (window.__ouroScrollToChapter) window.__ouroScrollToChapter(id, true);
    });
  }
  addEventListener("hashchange", function () { revealChapter(location.hash); });

  function initPhotoContrast() {
    var sections = document.querySelectorAll(".land.has-photo");
    if (!sections.length) return;
    var probes = {};

    function lum(r, g, b) {
      function f(c) {
        c /= 255;
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    }

    function apply(el, theme, mixed) {
      el.classList.toggle("is-theme-light", theme === "light");
      el.classList.toggle("is-theme-dark", theme === "dark");
      el.classList.toggle("is-mixed", !!mixed);
      el.setAttribute("data-theme", theme);
    }

    function fallback(section) {
      var theme = section.getAttribute("data-fallback") === "dark" ? "dark" : "light";
      section.setAttribute("data-contrast-source", "fallback");
      var copy = section.querySelector(".land-copy");
      if (copy) apply(copy, theme, false);
    }

    function contentRect(el) {
      if (el.classList.contains("arrow")) return el.getBoundingClientRect();
      var range = document.createRange();
      range.selectNodeContents(el);
      var rects = range.getClientRects();
      if (!rects.length) return el.getBoundingClientRect();
      var top = Infinity;
      var left = Infinity;
      var right = -Infinity;
      var bottom = -Infinity;
      for (var i = 0; i < rects.length; i++) {
        top = Math.min(top, rects[i].top);
        left = Math.min(left, rects[i].left);
        right = Math.max(right, rects[i].right);
        bottom = Math.max(bottom, rects[i].bottom);
      }
      return { top: top - 8, left: left - 8, right: right + 8, bottom: bottom + 8 };
    }

    function sample(img, section, el) {
      var sr = section.getBoundingClientRect();
      var er = contentRect(el);
      var iw = img.naturalWidth;
      var ih = img.naturalHeight;
      var cw = section.clientWidth;
      var ch = section.clientHeight;
      var scale = Math.max(cw / iw, ch / ih);
      var ox = (cw - iw * scale) / 2;
      var oy = (ch - ih * scale) / 2;
      var x0 = (er.left - sr.left - ox) / scale;
      var y0 = (er.top - sr.top - oy) / scale;
      var x1 = (er.right - sr.left - ox) / scale;
      var y1 = (er.bottom - sr.top - oy) / scale;
      x0 = Math.max(0, Math.min(iw - 1, x0));
      y0 = Math.max(0, Math.min(ih - 1, y0));
      x1 = Math.max(x0 + 1, Math.min(iw, x1));
      y1 = Math.max(y0 + 1, Math.min(ih, y1));
      var cols = 8;
      var rows = 6;
      var canvas = document.createElement("canvas");
      canvas.width = cols;
      canvas.height = rows;
      var ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(img, x0, y0, x1 - x0, y1 - y0, 0, 0, cols, rows);
      var data = ctx.getImageData(0, 0, cols, rows).data;
      var values = [];
      var dark = 0;
      var bright = 0;
      for (var i = 0; i < data.length; i += 4) {
        var y = lum(data[i], data[i + 1], data[i + 2]);
        values.push(y);
        if (y < 0.25) dark += 1;
        if (y > 0.72) bright += 1;
      }
      values.sort(function (a, b) { return a - b; });
      var mid = values[Math.floor(values.length / 2)];
      var n = values.length;
      var p20 = values[Math.floor(n * 0.2)];
      var p80 = values[Math.min(n - 1, Math.floor(n * 0.8))];
      var mixed = p20 < 0.28 && p80 > 0.62;
      return { theme: mid > 0.22 ? "dark" : "light", mixed: mixed };
    }

    function paint(section) {
      var mode = section.getAttribute("data-contrast") || "auto";
      if (mode === "light" || mode === "dark") {
        section.setAttribute("data-contrast-source", "manual");
        var manualCopy = section.querySelector(".land-copy");
        if (manualCopy) apply(manualCopy, mode, false);
        return;
      }
      var probe = probes[section.id];
      if (!probe || !probe.complete || !probe.naturalWidth) {
        fallback(section);
        return;
      }
      try {
        var copyEl = section.querySelector(".land-copy");
        if (!copyEl) return;
        var copy = sample(probe, section, copyEl);
        section.setAttribute("data-contrast-source", "image");
        apply(copyEl, copy.theme, copy.mixed);
      } catch (err) {
        fallback(section);
      }
    }

    sections.forEach(function (section) {
      fallback(section);
      var probe = new Image();
      probe.crossOrigin = "anonymous";
      probes[section.id] = probe;
      probe.onload = function () { paint(section); };
      probe.onerror = function () { fallback(section); };
    });

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var section = entry.target;
          io.unobserve(section);
          var shown = section.querySelector(".land-bg");
          var probe = probes[section.id];
          if (shown && probe && !probe.src) probe.src = shown.getAttribute("data-probe") || shown.currentSrc || shown.src;
        });
      }, { rootMargin: "0px 100% 0px 0px" });
      sections.forEach(function (section) { io.observe(section); });
    } else {
      sections.forEach(function (section) {
        var shown = section.querySelector(".land-bg");
        if (shown) probes[section.id].src = shown.getAttribute("data-probe") || shown.currentSrc || shown.src;
      });
    }

    var timer;
    addEventListener("resize", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        sections.forEach(paint);
      }, 160);
    });
  }
})();
