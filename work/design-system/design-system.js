(function () {
  var root = document.documentElement;
  var reduce = root.classList.contains("reduce");
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var rail = Array.prototype.slice.call(document.querySelectorAll(".rail a"));
  var sections = ["open", "signal", "ground", "north", "close"].map(function (id) {
    return document.getElementById(id);
  }).filter(Boolean);
  var worlds = { signal: "world-signal", ground: "world-ground", north: "world-north" };

  function setCurrent(id) {
    rail.forEach(function (link) {
      if (link.getAttribute("href") === "#" + id) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    document.body.classList.remove("world-signal", "world-ground", "world-north");
    if (worlds[id]) document.body.classList.add(worlds[id]);
  }

  if ("IntersectionObserver" in window) {
    var ratios = new Map();
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
      });
      var best = "open";
      var score = 0;
      ratios.forEach(function (ratio, id) {
        if (ratio > score) { best = id; score = ratio; }
      });
      if (score > 0) setCurrent(best);
    }, { threshold: [0.25, 0.5, 0.75] });
    sections.forEach(function (section) { observer.observe(section); });
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function scrub() {
    var vh = window.innerHeight || 1;
    if (window.innerWidth >= 768) {
      document.querySelectorAll(".reel").forEach(function (reel) {
        var track = reel.querySelector(".reel-track");
        if (!track) return;
        var rect = reel.getBoundingClientRect();
        var distance = reel.offsetHeight - vh;
        var progress = distance > 0 ? clamp(-rect.top / distance, 0, 1) : 0;
        var max = Math.max(0, track.scrollWidth - reel.clientWidth + 48);
        track.style.transform = "translate3d(" + (-max * progress).toFixed(1) + "px,0,0)";
      });
    }
    document.querySelectorAll("[data-depth]").forEach(function (node) {
      var parent = node.closest(".cluster") || node;
      var rect = parent.getBoundingClientRect();
      var shift = (rect.top + rect.height / 2 - vh / 2) * parseFloat(node.getAttribute("data-depth") || "0");
      node.style.transform = "translate3d(0," + clamp(-shift, -22, 22).toFixed(1) + "px,0)";
    });
    document.querySelectorAll("[data-scale]").forEach(function (img) {
      var frame = img.parentElement;
      var rect = frame.getBoundingClientRect();
      var progress = clamp(1 - rect.top / vh, 0, 1);
      var scale = 1.14 - progress * 0.14;
      img.style.transform = "scale(" + scale.toFixed(3) + ")";
    });
    document.querySelectorAll("[data-drift]").forEach(function (word) {
      var rect = word.getBoundingClientRect();
      var progress = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
      word.style.transform = "translate3d(" + ((0.5 - progress) * 28).toFixed(1) + "vw,0,0)";
    });
    var kinetic = document.querySelector("[data-kinetic]");
    if (kinetic) {
      var rect = kinetic.getBoundingClientRect();
      var progress = clamp((vh * 0.65 - rect.top) / (rect.height + vh * 0.2), 0, 0.999);
      var step = Math.floor(progress * 3);
      kinetic.querySelectorAll(".kinetic-word").forEach(function (word) {
        word.classList.toggle("is-on", Number(word.getAttribute("data-step")) === step);
      });
    }
  }

  if (!reduce) {
    var ticking = false;
    function requestScrub() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; scrub(); });
    }
    window.addEventListener("scroll", requestScrub, { passive: true });
    window.addEventListener("resize", requestScrub);
    requestScrub();

    if (fine) {
      document.querySelectorAll("[data-tilt], .tilt").forEach(function (node) {
        node.addEventListener("pointermove", function (event) {
          var rect = node.getBoundingClientRect();
          var x = (event.clientX - rect.left) / rect.width - 0.5;
          var y = (event.clientY - rect.top) / rect.height - 0.5;
          node.querySelectorAll("img").forEach(function (img) {
            img.style.translate = (x * -18).toFixed(1) + "px " + (y * -12).toFixed(1) + "px";
          });
        });
        node.addEventListener("pointerleave", function () {
          node.querySelectorAll("img").forEach(function (img) { img.style.translate = "0 0"; });
        });
      });
    }
  } else {
    document.querySelectorAll(".kinetic-word").forEach(function (word) {
      word.classList.add("is-on");
    });
  }
})();
