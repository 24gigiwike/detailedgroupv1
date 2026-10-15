(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var page = document.body.getAttribute("data-page") || "";
  var root = document.documentElement;
  var deckOpen = false;
  var leaving = false;
  var gallery = { track: null, setW: 1, x: 0, target: 0, vel: 0, drag: false, last: 0 };
  var ring = { el: null, next: "", target: 0, shown: 0, armed: false };

  function go(href) {
    if (leaving) return;
    leaving = true;
    document.body.classList.add("is-leaving");
    setTimeout(function () { location.href = href; }, reduced ? 0 : 420);
  }

  function layoutDeck() {
    var w = innerWidth;
    var h = innerHeight;
    var narrow = w < 800;
    var factor = Math.min(1, h / 950);
    var gap = narrow ? 10 : w * 0.01 * factor * 2.64;
    var side = narrow ? 0 : w * 0.01 * factor * 4.47 * 2;
    var card = (w - side - gap * 3) / 4;
    var scale = narrow ? 1 : (2 * card + gap) / w;
    var show = narrow ? 0 : Math.min(h * 0.16, 150);
    var sink = narrow ? 0 : Math.max(0, h * scale - show);
    root.style.setProperty("--scale", String(scale));
    root.style.setProperty("--sink", sink + "px");
    root.style.setProperty("--show", show + "px");
  }

  function setDeck(open) {
    deckOpen = open;
    document.body.classList.toggle("is-deck", open);
    var b = document.querySelector("[data-selection]");
    if (b) {
      var label = b.querySelector("span") || b;
      label.textContent = open ? "Close" : "Our Selection";
    }
    layoutDeck();
  }

  function setMenu(open) {
    document.body.classList.toggle("menu-open", open);
  }

  function initPreloader() {
    var el = document.getElementById("preloader");
    if (!el) return;
    if (reduced || sessionStorage.getItem("ouro-seen") === "1") { el.remove(); return; }
    var n = 27;
    var label = el.querySelector("span");
    var timer = setInterval(function () {
      n += Math.ceil(Math.random() * 8);
      if (n >= 99) {
        n = 99;
        clearInterval(timer);
        sessionStorage.setItem("ouro-seen", "1");
        if (label) label.textContent = "99";
        el.classList.add("is-done");
        setTimeout(function () { el.remove(); }, 820);
        return;
      }
      if (label) label.textContent = String(n).padStart(2, "0");
    }, 45);
  }

  function initExpand() {
    var still = document.querySelector(".expand-scale");
    var stage = document.querySelector(".hero-stage");
    if (!still || !stage || reduced || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    gsap.fromTo(still, { scale: 1 }, {
      scale: 5.4,
      ease: "none",
      scrollTrigger: { trigger: stage, start: "top top", end: "bottom bottom", scrub: true }
    });
    document.querySelectorAll(".parallax img").forEach(function (img) {
      gsap.to(img, {
        yPercent: 10,
        ease: "none",
        scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true }
      });
    });
  }

  function initGallery() {
    var wrap = document.querySelector(".gallery");
    var track = document.querySelector(".gallery-track");
    if (!wrap || !track) return;
    gallery.track = track;
    var originals = [].slice.call(track.children);
    originals.forEach(function (n) { track.appendChild(n.cloneNode(true)); });
    originals.forEach(function (n) { track.appendChild(n.cloneNode(true)); });
    function measure() {
      var kids = track.children;
      var third = Math.floor(kids.length / 3);
      var gap = parseFloat(getComputedStyle(track).gap) || 0;
      var width = 0;
      for (var i = 0; i < third; i++) width += kids[i].offsetWidth;
      gallery.setW = Math.max(width + gap * third, 1);
      track.dataset.angle = innerWidth < 800 ? "-4" : "-8";
    }
    measure();
    addEventListener("resize", measure);
    wrap.querySelectorAll("[data-gallery]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        gallery.target += btn.getAttribute("data-gallery") === "next" ? 360 : -360;
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
    function end() { gallery.drag = false; track.classList.remove("is-drag"); }
    track.addEventListener("pointerup", end);
    track.addEventListener("pointercancel", end);
    var lastY = scrollY;
    addEventListener("scroll", function () {
      var dy = scrollY - lastY;
      lastY = scrollY;
      var r = wrap.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) gallery.target += dy;
    }, { passive: true });
  }

  function initRing() {
    var band = document.querySelector(".next-band");
    ring.el = document.querySelector(".scroll-ring");
    if (!band || !ring.el || reduced) return;
    ring.next = band.getAttribute("data-next") || "";
    addEventListener("pointermove", function (e) {
      if (!ring.armed) return;
      ring.el.style.left = (e.clientX - 37) + "px";
      ring.el.style.top = (e.clientY - 37) + "px";
    });
    addEventListener("wheel", function (e) {
      if (!ring.armed) return;
      var atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 6;
      if (!atBottom) return;
      var delta = Math.max(-64, Math.min(64, e.deltaY));
      if (delta > 0) {
        ring.target = Math.min(1100, ring.target + delta * 0.8);
        e.preventDefault();
      } else ring.target = Math.max(0, ring.target + delta * 3.2);
    }, { passive: false });
  }

  function frame() {
    if (gallery.track) {
      if (!gallery.drag) gallery.vel *= 0.94;
      gallery.target += gallery.vel;
      gallery.x += (gallery.target - gallery.x) * 0.2;
      var w = gallery.setW || 1;
      var wrapped = ((gallery.x % w) + w) % w;
      gallery.track.style.transform = "rotate(" + (gallery.track.dataset.angle || "-8") + "deg) translate3d(" + (-wrapped) + "px,-50%,0)";
    }
    if (ring.el) {
      var band = document.querySelector(".next-band");
      if (band) {
        var r = band.getBoundingClientRect();
        ring.armed = r.top < innerHeight * 0.8 && r.bottom > innerHeight * 0.25;
        ring.el.classList.toggle("on", ring.armed || ring.shown > 8);
      }
      var follow = ring.target > ring.shown ? 0.08 : 0.32;
      ring.shown += (ring.target - ring.shown) * follow;
      var p = Math.max(0, Math.min(1, ring.shown / 1100));
      ring.el.style.setProperty("--p", p.toFixed(4));
      if (p > 0.985 && ring.next) go(ring.next);
    }
    requestAnimationFrame(frame);
  }

  function bind() {
    var sel = document.querySelector("[data-selection]");
    if (sel) sel.addEventListener("click", function (e) {
      e.preventDefault();
      setMenu(false);
      setDeck(!deckOpen);
    });
    var menu = document.querySelector("[data-menu]");
    if (menu) menu.addEventListener("click", function () { setMenu(!document.body.classList.contains("menu-open")); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { setMenu(false); setDeck(false); }
    });
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      if (a.hasAttribute("data-selection")) return;
      e.preventDefault();
      setMenu(false);
      go(url.href);
    });
    if (page === "overview" && !reduced) {
      addEventListener("wheel", function (e) {
        if (document.body.classList.contains("menu-open")) return;
        if (deckOpen) {
          if (e.deltaY < -24) setDeck(false);
          e.preventDefault();
          return;
        }
        if (e.deltaY > 6) { setDeck(true); e.preventDefault(); }
      }, { passive: false });
    }
    var play = document.querySelector("[data-play]");
    if (play) play.addEventListener("click", function () {
      var v = document.querySelector(".video-frame video");
      if (!v) return;
      if (v.paused) { v.play(); play.hidden = true; }
      else { v.pause(); play.hidden = false; }
    });
  }

  function ensureDeck() {
    if (document.querySelector(".deck") || page === "overview") return;
    var chapters = [
      { id: "vision", href: "/ouro/vision/", name: "The Vision", note: "One product, several rooms", img: "/ouro/media/sea-1.jpg" },
      { id: "identity", href: "/ouro/identity/", name: "Brand Identity", note: "A story that stays recognizable", img: "/ouro/media/forest-1.jpg" },
      { id: "direction", href: "/ouro/creative-direction/", name: "Creative Direction", note: "Placed for each moment", img: "/ouro/media/city-1.jpg" },
      { id: "launch", href: "/ouro/launch/", name: "Launch Communications", note: "Carry the product outward", img: "/ouro/media/rare-1.jpg" }
    ];
    var deck = document.createElement("div");
    deck.className = "deck";
    var items = chapters.filter(function (c) { return c.id !== page; });
    if (page !== "story") {
      items.unshift({ href: "/ouro/", name: "Overview", note: "Return", img: "", back: true });
    }
    items.forEach(function (item) {
      var a = document.createElement("a");
      a.className = "deck-card" + (item.back ? " is-back" : "");
      a.href = item.href;
      a.innerHTML = '<span class="deck-name">' + item.name + '</span><span class="deck-note">' + item.note + "</span>";
      if (item.img) {
        var img = document.createElement("img");
        img.src = item.img;
        img.alt = "";
        a.appendChild(img);
      }
      deck.appendChild(a);
    });
    document.body.appendChild(deck);
  }

  function init() {
    ensureDeck();
    layoutDeck();
    addEventListener("resize", layoutDeck);
    initPreloader();
    initExpand();
    initGallery();
    initRing();
    bind();
    requestAnimationFrame(frame);
    addEventListener("pagehide", function () {
      if (window.ScrollTrigger) ScrollTrigger.getAll().forEach(function (t) { t.kill(); });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
