// =========================================================================
// OURO CASE-STUDY MEDIA CONFIGURATION
// Paste new image/video URLs into the corresponding asset slots below.
// Unfilled slots ("" or bracketed placeholders) will automatically display
// a clean neutral placeholder panel with a subtle "Media pending" label.
// =========================================================================
const ouroMedia = {
  // [BRAND_HERO_MEDIA_URL] - Brand Identity Hero Background Video/Image
  brandHero: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792948648/VID_i2hl0y.mp4",

  // [BRAND_EXTRA_IMAGE_URL] - Brand Identity Gallery 5th Asset
  brandExtraImage: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792948648/VID_i2hl0y.mp4",

  // [EVENT_HERO_MEDIA_URL] - Event Brand Identity Hero Background Video/Image
  eventHero: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792948648/VID_i2hl0y.mp4",

  // [INVESTOR_HERO_VIDEO_URL] - Reused automatically from Overview & Story
  investorHero: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792075835/OURO_hero_Video_converted_xjca8t.webm",

  keynote: {
    // [KEYNOTE_SLIDE_01_MEDIA_URL] - Slide 01: Opening Film
    openingFilm: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792948648/VID_i2hl0y.mp4",

    // [KEYNOTE_SLIDE_02_MEDIA_URL] - Slide 02: NEXT '26
    next26: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792948648/VID_i2hl0y.mp4",

    // [KEYNOTE_SLIDE_03_MEDIA_URL] - Slide 03: The Future Isn't Louder
    futureNotLouder: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792948648/VID_i2hl0y.mp4",

    // [KEYNOTE_SLIDE_04_MEDIA_URL] - Slide 04: Designed Around Life
    designedAroundLife: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792948648/VID_i2hl0y.mp4",

    // [KEYNOTE_SLIDE_05_MEDIA_URL] - Slide 05: One Question
    oneQuestion: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792948648/VID_i2hl0y.mp4",

    // [KEYNOTE_SLIDE_06_MEDIA_URL] - Slide 06: How Should Personal Audio Feel?
    personalAudioQuestion: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792948648/VID_i2hl0y.mp4",

    // [KEYNOTE_SLIDE_07_MEDIA_URL] - Slide 07: Built With Intention
    builtWithIntention: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792948648/VID_i2hl0y.mp4",

    // [KEYNOTE_SLIDE_08_MEDIA_URL] - Slide 08: Product Film
    productFilm: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792948648/VID_i2hl0y.mp4",

    // [KEYNOTE_SLIDE_09_MEDIA_URL] - Slide 09: Product Reveal
    productReveal: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792948648/VID_i2hl0y.mp4",

    // [KEYNOTE_SLIDE_10_MEDIA_URL] - Slide 10: Designed To Disappear
    designedToDisappear: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792948648/VID_i2hl0y.mp4",

    // [KEYNOTE_SLIDE_11_MEDIA_URL] - Slide 11: Craftsmanship
    craftsmanship: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792948648/VID_i2hl0y.mp4",

    // [KEYNOTE_SLIDE_12_MEDIA_URL] - Slide 12: Companion App
    companionApp: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792948648/VID_i2hl0y.mp4",

    // [KEYNOTE_CLOSING_IMAGE_URL] - Slide 13: Closing
    closing: ""
  }
};

(function () {
  var reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = reducedQuery.matches;

  function isValidUrl(val) {
    if (!val || typeof val !== "string") return false;
    var trimmed = val.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) return false;
    return true;
  }

  function isVideo(url) {
    return /\.(mp4|webm|mov)(\?.*)?$/i.test(url) || /\/video\/upload\//i.test(url);
  }

  initChapterNav();
  syncMediaSlots();
  initKeynoteCarousel();

  if (!reduced && "IntersectionObserver" in window) {
    var watch = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var video = entry.target;
          // Do not autoplay video if it belongs to an inactive keynote slide
          var keynoteSlide = video.closest(".keynote-slide");
          if (keynoteSlide && !keynoteSlide.classList.contains("is-active")) {
            video.pause();
            return;
          }
          if (entry.isIntersecting) {
            var play = video.play();
            if (play && play.catch) play.catch(function () {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.25 }
    );
    document.querySelectorAll("video").forEach(function (video) {
      watch.observe(video);
    });
  }

  initPhotoContrast();
  revealChapter(location.hash);

  // Synchronize media slots from ouroMedia configuration
  function syncMediaSlots() {
    var brandHeroSlot = document.querySelector("[data-media-slot='brandHero']");
    if (brandHeroSlot && isValidUrl(ouroMedia.brandHero)) {
      var bv = brandHeroSlot.querySelector("video source");
      if (bv && bv.src !== ouroMedia.brandHero) {
        bv.src = ouroMedia.brandHero;
        if (bv.parentElement) bv.parentElement.load();
      }
    }

    var eventHeroSlot = document.querySelector("[data-media-slot='eventHero']");
    if (eventHeroSlot && isValidUrl(ouroMedia.eventHero)) {
      var ev = eventHeroSlot.querySelector("video source");
      if (ev && ev.src !== ouroMedia.eventHero) {
        ev.src = ouroMedia.eventHero;
        if (ev.parentElement) ev.parentElement.load();
      }
    }

    var brandExtraSlot = document.querySelector("[data-media-slot='brandExtraImage']");
    if (brandExtraSlot && isValidUrl(ouroMedia.brandExtraImage)) {
      var url = ouroMedia.brandExtraImage;
      if (isVideo(url)) {
        var bEv = brandExtraSlot.querySelector("video source");
        if (bEv) {
          if (bEv.src !== url) {
            bEv.src = url;
            if (bEv.parentElement) bEv.parentElement.load();
          }
        } else {
          brandExtraSlot.innerHTML =
            '<video class="gallery-media" autoplay muted loop playsinline preload="metadata">' +
            '<source src="' + url + '" type="' + (url.indexOf(".webm") !== -1 ? "video/webm" : "video/mp4") + '">' +
            '</video>';
        }
      } else {
        brandExtraSlot.innerHTML =
          '<img alt="OURO Brand Identity visual 5" width="1200" height="800" loading="lazy" decoding="async" src="' + url + '">';
      }
    }
  }

  // Keynote Carousel functionality
  function initKeynoteCarousel() {
    var section = document.getElementById("keynote");
    if (!section) return;
    var stage = section.querySelector(".keynote-stage");
    var slides = Array.from(section.querySelectorAll(".keynote-slide"));
    if (!stage || !slides.length) return;

    var counterCurrent = section.querySelector(".keynote-counter .current-slide");
    var counterTotal = section.querySelector(".keynote-counter .total-slides");
    var currentTitle = section.querySelector(".keynote-current-title");
    var prevBtn = section.querySelector(".keynote-nav-btn.prev");
    var nextBtn = section.querySelector(".keynote-nav-btn.next");

    if (counterTotal) {
      counterTotal.textContent = ("0" + slides.length).slice(-2);
    }

    // Populate media into slides
    slides.forEach(function (slide) {
      var wrap = slide.querySelector(".slide-media-wrap");
      if (!wrap) return;
      var slot = slide.getAttribute("data-keynote-slot");
      var title = slide.getAttribute("data-title") || "";
      var url = (ouroMedia.keynote && ouroMedia.keynote[slot]) || "";

      if (isValidUrl(url)) {
        if (isVideo(url)) {
          var video = document.createElement("video");
          video.className = "slide-media";
          video.autoplay = false;
          video.muted = true;
          video.loop = true;
          video.playsInline = true;
          video.preload = "metadata";
          var source = document.createElement("source");
          source.src = url;
          source.type = url.indexOf(".webm") !== -1 ? "video/webm" : "video/mp4";
          video.appendChild(source);
          wrap.appendChild(video);
        } else {
          var img = document.createElement("img");
          img.className = "slide-media";
          img.alt = title;
          img.loading = "lazy";
          img.decoding = "async";
          img.src = url;
          wrap.appendChild(img);
        }
        var shade = document.createElement("div");
        shade.className = "slide-shade";
        shade.setAttribute("aria-hidden", "true");
        wrap.appendChild(shade);
      } else {
        var placeholder = document.createElement("div");
        placeholder.className = "keynote-placeholder";
        placeholder.setAttribute("aria-label", "Media pending");
        placeholder.innerHTML =
          '<div class="placeholder-inner">' +
          '<div class="placeholder-mark" aria-hidden="true">' +
          '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">' +
          '<rect x="2" y="2" width="20" height="20" rx="3" ry="3"></rect>' +
          '<circle cx="8.5" cy="8.5" r="1.5"></circle>' +
          '<polyline points="21 15 16 10 5 21"></polyline>' +
          '</svg>' +
          '</div>' +
          '<p class="placeholder-title">' + (title || "Presentation Slide") + '</p>' +
          '<p class="placeholder-status">Media pending</p>' +
          '</div>';
        wrap.appendChild(placeholder);
      }
    });

    var currentIndex = 0;

    function setSlide(index) {
      if (index < 0 || index >= slides.length) return;

      var prevSlide = slides[currentIndex];
      var nextSlide = slides[index];

      // Close open script drawers
      slides.forEach(function (s) {
        var drawer = s.querySelector(".keynote-script-drawer");
        var toggle = s.querySelector(".keynote-script-toggle");
        if (drawer) drawer.classList.remove("is-open");
        if (toggle) {
          toggle.setAttribute("aria-expanded", "false");
          toggle.classList.remove("is-open");
        }
      });

      // Pause old video
      if (prevSlide) {
        prevSlide.classList.remove("is-active");
        var oldVideo = prevSlide.querySelector("video");
        if (oldVideo) {
          oldVideo.pause();
        }
      }

      // Activate next slide
      nextSlide.classList.add("is-active");
      var newVideo = nextSlide.querySelector("video");
      if (newVideo && !reduced) {
        newVideo.currentTime = 0;
        var playPromise = newVideo.play();
        if (playPromise && playPromise.catch) playPromise.catch(function () {});
      }

      // Update UI
      currentIndex = index;
      if (counterCurrent) {
        counterCurrent.textContent = ("0" + (currentIndex + 1)).slice(-2);
      }
      if (currentTitle) {
        currentTitle.textContent = nextSlide.getAttribute("data-title") || "";
      }
      if (prevBtn) prevBtn.disabled = currentIndex === 0;
      if (nextBtn) nextBtn.disabled = currentIndex === slides.length - 1;
    }

    // Script drawer controls per slide
    slides.forEach(function (slide) {
      var toggle = slide.querySelector(".keynote-script-toggle");
      var drawer = slide.querySelector(".keynote-script-drawer");
      var closeBtn = slide.querySelector(".script-drawer-close");

      if (toggle && drawer) {
        toggle.addEventListener("click", function (e) {
          e.stopPropagation();
          var open = drawer.classList.toggle("is-open");
          toggle.setAttribute("aria-expanded", open ? "true" : "false");
          toggle.classList.toggle("is-open", open);
        });
      }
      if (closeBtn && drawer) {
        closeBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          drawer.classList.remove("is-open");
          if (toggle) {
            toggle.setAttribute("aria-expanded", "false");
            toggle.classList.remove("is-open");
            toggle.focus({ preventScroll: true });
          }
        });
      }
    });

    // Navigation buttons
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        setSlide(currentIndex - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        setSlide(currentIndex + 1);
      });
    }

    // Keyboard navigation when keynote section is in view
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        var openDrawer = section.querySelector(".keynote-script-drawer.is-open");
        if (openDrawer) {
          openDrawer.classList.remove("is-open");
          var activeToggle = section.querySelector(".keynote-script-toggle.is-open");
          if (activeToggle) {
            activeToggle.setAttribute("aria-expanded", "false");
            activeToggle.classList.remove("is-open");
            activeToggle.focus();
          }
          return;
        }
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        var rect = section.getBoundingClientRect();
        var inView = rect.top < window.innerHeight && rect.bottom > 0;
        if (inView) {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            setSlide(currentIndex - 1);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            setSlide(currentIndex + 1);
          }
        }
      }
    });

    // Touch / swipe navigation on mobile
    var touchStartX = 0;
    var touchStartY = 0;
    stage.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches && e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      },
      { passive: true }
    );

    stage.addEventListener(
      "touchend",
      function (e) {
        if (e.changedTouches && e.changedTouches.length === 1) {
          var deltaX = e.changedTouches[0].clientX - touchStartX;
          var deltaY = e.changedTouches[0].clientY - touchStartY;
          if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX < 0) {
              setSlide(currentIndex + 1);
            } else {
              setSlide(currentIndex - 1);
            }
          }
        }
      },
      { passive: true }
    );

    // Initial slide
    setSlide(0);
  }

  // Floating chapter menu
  function initChapterNav() {
    var root = document.querySelector(".chapter-nav");
    if (!root) return;
    var toggle = root.querySelector(".chapter-toggle");
    var menu = root.querySelector(".chapter-menu");
    var closeBtn = root.querySelector(".chapter-close");
    if (!toggle || !menu || !closeBtn) return;

    function setOpen(on) {
      root.classList.toggle("is-open", on);
      toggle.setAttribute("aria-expanded", on ? "true" : "false");
      menu.hidden = !on;
      if (on) closeBtn.focus({ preventScroll: true });
    }

    toggle.addEventListener("click", function (event) {
      event.stopPropagation();
      setOpen(menu.hidden);
    });
    closeBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      setOpen(false);
      toggle.focus({ preventScroll: true });
    });
    document.addEventListener("click", function (event) {
      if (menu.hidden || root.contains(event.target)) return;
      setOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !menu.hidden) {
        event.preventDefault();
        setOpen(false);
        toggle.focus();
      }
    });
  }

  // Chapter anchor reveal
  function revealChapter(hash) {
    var id = (hash || "").replace("#", "");
    var el = id && document.getElementById(id);
    if (!el) return;
    requestAnimationFrame(function () {
      if (window.__dgLenis && window.__dgLenis.scrollTo) {
        window.__dgLenis.scrollTo(el, { immediate: true, force: true });
      } else {
        el.scrollIntoView({ block: "start" });
      }
    });
  }
  addEventListener("hashchange", function () {
    revealChapter(location.hash);
  });

  // Photo contrast calculations for hero headers with photos
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
      values.sort(function (a, b) {
        return a - b;
      });
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
      probe.onload = function () {
        paint(section);
      };
      probe.onerror = function () {
        fallback(section);
      };
    });

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var section = entry.target;
            io.unobserve(section);
            var shown = section.querySelector(".land-bg");
            var probe = probes[section.id];
            if (shown && probe && !probe.src)
              probe.src = shown.getAttribute("data-probe") || shown.currentSrc || shown.src;
          });
        },
        { rootMargin: "200px 0px" }
      );
      sections.forEach(function (section) {
        io.observe(section);
      });
    } else {
      sections.forEach(function (section) {
        var shown = section.querySelector(".land-bg");
        if (shown)
          probes[section.id].src = shown.getAttribute("data-probe") || shown.currentSrc || shown.src;
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
