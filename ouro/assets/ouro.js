(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var video = document.querySelector(".land-video");
  if (video && !reduced && "IntersectionObserver" in window) {
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var play = video.play();
          if (play && play.catch) play.catch(function () {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.2 });
    watch.observe(video.parentElement || video);
  }

  initPhotoContrast();

  var id = (location.hash || "").replace("#", "");
  if (!id) return;
  var chapter = document.getElementById(id);
  if (!chapter) return;
  requestAnimationFrame(function () {
    if (window.__dgLenis) window.__dgLenis.scrollTo(chapter, { immediate: true, force: true });
    else chapter.scrollIntoView({ block: "start" });
  });

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
      apply(section.querySelector(".land-copy"), theme, false);
      apply(section.querySelector(".arrow"), theme, false);
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
        apply(section.querySelector(".land-copy"), mode, false);
        apply(section.querySelector(".arrow"), mode, false);
        return;
      }
      var probe = probes[section.id];
      if (!probe || !probe.complete || !probe.naturalWidth) {
        fallback(section);
        return;
      }
      try {
        var copy = sample(probe, section, section.querySelector(".land-copy"));
        var arrow = sample(probe, section, section.querySelector(".arrow"));
        section.setAttribute("data-contrast-source", "image");
        apply(section.querySelector(".land-copy"), copy.theme, copy.mixed);
        apply(section.querySelector(".arrow"), arrow.theme, arrow.mixed);
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
      }, { rootMargin: "240px 0px" });
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
