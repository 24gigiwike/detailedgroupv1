(function () {
  var CHAPTERS = [
    { id: "vision", href: "/ouro/vision/", title: "The Vision", kicker: "01", note: "One product, several rooms", theme: "vision", image: "/exec.jpg", pos: "70% 40%" },
    { id: "identity", href: "/ouro/identity/", title: "Brand Identity", kicker: "02", note: "A story that stays recognizable", theme: "identity", image: "/detailed-clarity.jpeg", pos: "center" },
    { id: "direction", href: "/ouro/creative-direction/", title: "Creative Direction", kicker: "03", note: "Placed for each moment", theme: "direction", image: "/exec.jpg", pos: "30% 60%" },
    { id: "launch", href: "/ouro/launch/", title: "Launch Communications", kicker: "04", note: "Carry the product outward", theme: "launch", image: "/exec.jpg", pos: "80% 50%" }
  ];

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var page = document.body.getAttribute("data-page") || "overview";
  var root = document.documentElement;
  var deckOpen = false;
  var selectionOpen = false;
  var leaving = false;
  var raf = 0;

  var gallery = { el: null, track: null, setW: 1, x: 0, target: 0, vel: 0, drag: false, last: 0 };
  var ring = { el: null, door: null, target: 0, shown: 0, next: "" };

  function prefersFinePointer() {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  function cleanup() {
    if (raf) cancelAnimationFrame(raf);
    if (window.ScrollTrigger) window.ScrollTrigger.getAll().forEach(function (t) { t.kill(); });
  }

  function go(href) {
    if (leaving) return;
    leaving = true;
    document.body.classList.add("is-leaving");
    window.setTimeout(function () { window.location.href = href; }, reduced ? 0 : 460);
  }

  function layoutDeck() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    var narrow = w < 900;
    var show = narrow ? 0 : Math.round(Math.min(h * 0.14, 140));
    var gap = 10;
    var cardW = (w - gap * 5) / 4;
    var scale = narrow ? 1 : (2 * cardW + gap) / w;
    var sink = narrow ? 0 : Math.max(0, h * scale - show);
    root.style.setProperty("--deck-scale", String(scale));
    root.style.setProperty("--deck-sink", sink + "px");
    root.style.setProperty("--deck-show", show + "px");
  }

  function setDeck(open) {
    deckOpen = open;
    document.body.classList.toggle("is-deck", open);
    var btn = document.querySelector("[data-selection]");
    if (btn && page === "overview") btn.textContent = open ? "Close" : "Selection";
    layoutDeck();
  }

  function buildCard(item) {
    var a = document.createElement("a");
    a.className = "deck-card" + (item.back ? " is-back" : "");
    a.href = item.href;
    a.setAttribute("data-theme", item.theme);
    a.setAttribute("data-transition", "");
    a.innerHTML =
      '<span class="deck-kicker">' + item.kicker + "</span>" +
      '<span class="deck-name">' + item.title + "</span>" +
      '<span class="deck-note">' + item.note + "</span>";
    if (!item.back && item.image) {
      var img = document.createElement("img");
      img.className = "deck-photo";
      img.src = item.image;
      img.alt = "";
      img.style.objectPosition = item.pos || "center";
      a.appendChild(img);
    }
    return a;
  }

  function fillSelection() {
    var box = document.getElementById("selection");
    if (!box || box.childElementCount) return;
    var items = CHAPTERS.filter(function (c) { return c.id !== page; });
    if (page !== "overview") {
      items.unshift({
        id: "overview",
        href: "/ouro/",
        title: "Overview",
        kicker: "Return",
        note: "OURO",
        theme: "paper",
        back: true
      });
    }
    items.forEach(function (item) { box.appendChild(buildCard(item)); });
  }

  function setSelection(open) {
    if (page === "overview") {
      setDeck(open);
      return;
    }
    fillSelection();
    selectionOpen = open;
    document.body.classList.toggle("selection-open", open);
    var btn = document.querySelector("[data-selection]");
    if (btn) btn.textContent = open ? "Close" : "Selection";
  }

  function setMenu(open) {
    document.body.classList.toggle("menu-open", open);
    var panel = document.getElementById("menu");
    var opener = document.querySelector("[data-menu-open]");
    if (panel) panel.setAttribute("aria-hidden", open ? "false" : "true");
    if (opener) opener.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function initPreloader() {
    var el = document.getElementById("preloader");
    if (!el) {
      root.classList.remove("is-loading");
      return;
    }
    if (reduced || sessionStorage.getItem("ouro-seen") === "1") {
      el.remove();
      root.classList.remove("is-loading");
      return;
    }
    var count = el.querySelector(".preloader-count");
    var n = 27;
    var timer = window.setInterval(function () {
      n += Math.ceil(Math.random() * 9);
      if (n >= 100) {
        n = 100;
        window.clearInterval(timer);
        sessionStorage.setItem("ouro-seen", "1");
        if (count) count.textContent = "99";
        el.classList.add("is-done");
        window.setTimeout(function () {
          el.remove();
          root.classList.remove("is-loading");
        }, 760);
        return;
      }
      if (count) count.textContent = String(Math.min(n, 99)).padStart(2, "0");
    }, 48);
  }

  function initMotion() {
    if (reduced || !window.gsap) return;
    var gsap = window.gsap;
    if (window.ScrollTrigger) gsap.registerPlugin(window.ScrollTrigger);

    var hero = document.querySelector(".chapter-hero");
    var still = document.querySelector(".hero-still-scale");
    if (hero && still && window.ScrollTrigger) {
      gsap.to(still, {
        scale: 4,
        ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom bottom", scrub: true }
      });
      var title = hero.querySelector("h1");
      if (title) {
        gsap.to(title, {
          opacity: 0.12,
          ease: "none",
          scrollTrigger: { trigger: hero, start: "top top", end: "45% top", scrub: true }
        });
      }
    }

    document.querySelectorAll(".bleed-media").forEach(function (media) {
      if (!window.ScrollTrigger) return;
      gsap.to(media, {
        yPercent: 12,
        ease: "none",
        scrollTrigger: { trigger: media.parentElement, start: "top bottom", end: "bottom top", scrub: true }
      });
    });

    if (window.ScrollTrigger) {
      gsap.utils.toArray("[data-reveal]").forEach(function (el) {
        gsap.from(el, {
          y: 28,
          autoAlpha: 0,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%" }
        });
      });
    }
  }

  function measureGallery() {
    if (!gallery.track) return;
    var kids = gallery.track.children;
    if (!kids.length) return;
    var third = Math.floor(kids.length / 3);
    var width = 0;
    var gap = parseFloat(getComputedStyle(gallery.track).gap) || 0;
    for (var i = 0; i < third; i++) width += kids[i].offsetWidth;
    width += gap * third;
    gallery.setW = Math.max(width, 1);
    if (gallery.track) gallery.track.dataset.angle = window.innerWidth < 800 ? "-4" : "-8";
  }

  function initGallery() {
    var wrap = document.querySelector(".gallery");
    var track = document.querySelector(".gallery-track");
    if (!wrap || !track) return;
    gallery.el = wrap;
    gallery.track = track;
    var originals = Array.prototype.slice.call(track.children);
    originals.forEach(function (node) { track.appendChild(node.cloneNode(true)); });
    originals.forEach(function (node) { track.appendChild(node.cloneNode(true)); });
    measureGallery();

    var angle = window.innerWidth < 800 ? -4 : -8;
    track.dataset.angle = String(angle);

    wrap.querySelectorAll("[data-gallery]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        gallery.target += btn.getAttribute("data-gallery") === "next" ? 320 : -320;
      });
    });

    track.addEventListener("pointerdown", function (e) {
      gallery.drag = true;
      gallery.last = e.clientX;
      gallery.vel = 0;
      track.classList.add("is-drag");
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener("pointermove", function (e) {
      if (!gallery.drag) return;
      var dx = e.clientX - gallery.last;
      gallery.last = e.clientX;
      gallery.target -= dx * 2.5;
      gallery.vel = -dx * 2.5;
    });
    function endDrag() {
      gallery.drag = false;
      track.classList.remove("is-drag");
    }
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);

    var lastScroll = window.scrollY;
    window.addEventListener("scroll", function () {
      var dy = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      var rect = wrap.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) gallery.target += dy;
    }, { passive: true });
    window.addEventListener("resize", measureGallery);
  }

  function initRing() {
    var door = document.querySelector(".next-door");
    if (!door) return;
    ring.door = door;
    ring.el = door.querySelector(".scroll-ring");
    ring.next = door.getAttribute("data-next") || "";
    if (reduced) return;

    window.addEventListener("wheel", function (e) {
      if (!ring.door.classList.contains("is-armed")) return;
      var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (!atBottom) return;
      var delta = Math.max(-64, Math.min(64, e.deltaY));
      if (delta > 0) {
        ring.target = Math.min(1100, ring.target + delta * 0.8);
        e.preventDefault();
      } else {
        ring.target = Math.max(0, ring.target + delta * 3.2);
      }
    }, { passive: false });

    var touchY = 0;
    window.addEventListener("touchstart", function (e) {
      touchY = e.touches[0].clientY;
    }, { passive: true });
    window.addEventListener("touchmove", function (e) {
      if (!ring.door.classList.contains("is-armed")) return;
      var y = e.touches[0].clientY;
      var dy = touchY - y;
      touchY = y;
      var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;
      if (atBottom && dy > 0) ring.target = Math.min(1100, ring.target + dy * 1.6);
      else ring.target = Math.max(0, ring.target - Math.abs(dy));
    }, { passive: true });
  }

  function updateGallery() {
    if (!gallery.track) return;
    if (!gallery.drag) {
      gallery.vel *= 0.94;
      if (Math.abs(gallery.vel) < 0.05) gallery.vel = 0;
      gallery.target += gallery.vel;
      if (!reduced) gallery.target += 0.18;
    }
    gallery.x += (gallery.target - gallery.x) * 0.18;
    var w = gallery.setW || 1;
    var wrapped = ((gallery.x % w) + w) % w;
    var angle = gallery.track.dataset.angle || "-8";
    gallery.track.style.transform = "rotate(" + angle + "deg) translate3d(" + (-wrapped) + "px, -50%, 0)";
  }

  function updateRing() {
    if (!ring.door || !ring.el || reduced) return;
    var rect = ring.door.getBoundingClientRect();
    var visible = rect.top < window.innerHeight * 0.72 && rect.bottom > window.innerHeight * 0.35;
    ring.door.classList.toggle("is-armed", visible);
    if (!visible && ring.target > 0) ring.target *= 0.9;
    var follow = ring.target > ring.shown ? 0.08 : 0.32;
    ring.shown += (ring.target - ring.shown) * follow;
    var p = Math.max(0, Math.min(1, ring.shown / 1100));
    ring.el.style.setProperty("--p", p.toFixed(4));
    if (p > 0.985 && ring.next) go(ring.next);
  }

  function frame() {
    updateGallery();
    updateRing();
    raf = window.requestAnimationFrame(frame);
  }

  function bindUI() {
    document.querySelector("[data-menu-open]") && document.querySelector("[data-menu-open]").addEventListener("click", function () {
      setSelection(false);
      setMenu(true);
    });
    document.querySelector("[data-menu-close]") && document.querySelector("[data-menu-close]").addEventListener("click", function () {
      setMenu(false);
    });
    document.querySelector("[data-selection]") && document.querySelector("[data-selection]").addEventListener("click", function () {
      setMenu(false);
      if (page === "overview") setDeck(!deckOpen);
      else setSelection(!selectionOpen);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      setMenu(false);
      setSelection(false);
      if (page === "overview") setDeck(false);
    });

    document.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (!a) return;
      if (a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var url;
      try { url = new URL(a.href, window.location.href); } catch (err) { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.hash) return;
      e.preventDefault();
      setMenu(false);
      go(url.href);
    });

    if (page === "overview" && !reduced && prefersFinePointer()) {
      window.addEventListener("wheel", function (e) {
        if (document.body.classList.contains("menu-open")) return;
        if (deckOpen) {
          if (e.deltaY < -28) setDeck(false);
          e.preventDefault();
          return;
        }
        if (e.deltaY > 8) {
          setDeck(true);
          e.preventDefault();
        }
      }, { passive: false });
    }

    var touchStart = 0;
    if (page === "overview") {
      window.addEventListener("touchstart", function (e) { touchStart = e.touches[0].clientY; }, { passive: true });
      window.addEventListener("touchend", function (e) {
        if (document.body.classList.contains("menu-open") || reduced) return;
        var dy = touchStart - e.changedTouches[0].clientY;
        if (!deckOpen && dy > 48) setDeck(true);
        else if (deckOpen && dy < -48) setDeck(false);
      }, { passive: true });
    }
  }

  function init() {
    layoutDeck();
    window.addEventListener("resize", layoutDeck);
    initPreloader();
    initMotion();
    initGallery();
    initRing();
    bindUI();
    raf = window.requestAnimationFrame(frame);
    window.addEventListener("pagehide", cleanup);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
