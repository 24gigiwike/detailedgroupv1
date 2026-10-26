// =========================================================================
// OURO CASE-STUDY MEDIA CONFIGURATION
// Paste new image/video URLs into the corresponding asset slots below.
// Unfilled slots ("" or bracketed placeholders) will automatically display
// a clean neutral placeholder panel with a subtle "Media pending" label.
// =========================================================================
const ouroMedia = {
  // [LAUNCH_HERO_MEDIA_URL] - Launch Communications Hero Video
  launchHero: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792483605/OPENING_FILM_converted_1_otfynh.webm",

  // [BRAND_HERO_MEDIA_URL] - Brand Identity Hero Background Video/Image
  brandHero: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792948648/VID_i2hl0y.mp4",

  // [EVENT_HERO_MEDIA_URL] - Event Brand Identity Hero Background Video/Image
  eventHero: "https://res.cloudinary.com/dtkluxukm/video/upload/v1793020793/1012_uehfly.webm",

  // [INVESTOR_HERO_IMAGE_URL] - Investor Communications static hero image
  investorHero: "https://res.cloudinary.com/dtkluxukm/image/upload/v1793010915/SLIDE_3_ytoouv.png",

  investorDeck: [
    "https://res.cloudinary.com/dtkluxukm/image/upload/v1793010916/SLIDE_1_av2ch4.png",
    "https://res.cloudinary.com/dtkluxukm/image/upload/v1793010917/SLIDE_2_y58w9w.png",
    "https://res.cloudinary.com/dtkluxukm/image/upload/v1793010915/SLIDE_3_ytoouv.png",
    "https://res.cloudinary.com/dtkluxukm/image/upload/v1793010915/SLIDE_4_vbt64l.png",
    "https://res.cloudinary.com/dtkluxukm/image/upload/v1793010915/SLIDE_5_hkuvkw.png",
    "https://res.cloudinary.com/dtkluxukm/image/upload/v1793010916/SLIDE_6_nyebrq.png",
    "https://res.cloudinary.com/dtkluxukm/image/upload/v1793010916/SLIDE_7_ntfck3.png",
    "https://res.cloudinary.com/dtkluxukm/image/upload/v1793010914/SLIDE_8_zsm4n1.png",
    "https://res.cloudinary.com/dtkluxukm/image/upload/v1793010915/SLIDE_9_oajmjc.png",
    "https://res.cloudinary.com/dtkluxukm/image/upload/v1793010916/SLIDE_10_hkrgsv.png",
    "https://res.cloudinary.com/dtkluxukm/image/upload/v1793010916/SLIDE_11_k5i05u.png",
    "https://res.cloudinary.com/dtkluxukm/image/upload/v1793010916/SLIDE_12_sgllp2.png",
    "https://res.cloudinary.com/dtkluxukm/image/upload/v1793010916/SLIDE_13_zlxlrt.png"
  ],

  keynote: {
    // [KEYNOTE_SLIDE_01_MEDIA_URL] - Slide 01: Opening Film
    openingFilm: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792483605/OPENING_FILM_converted_1_otfynh.webm",

    // Slides 02–12: Genuinely pending unique media assets (left empty to display clean placeholders)
    next26: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792948648/VID_i2hl0y.mp4",
    futureNotLouder: "https://res.cloudinary.com/dtkluxukm/image/upload/v1792952042/2_1_pvka94.png",
    designedAroundLife: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792951626/designed_around_life_pjxyzg.mp4",
    oneQuestion: "https://res.cloudinary.com/dtkluxukm/image/upload/v1792951947/3_1_xpfbk4.png",
    personalAudioQuestion: "https://res.cloudinary.com/dtkluxukm/image/upload/v1792327282/ouro-vision_cmzfuv.jpg",
    builtWithIntention: "https://res.cloudinary.com/dtkluxukm/image/upload/v1792951904/4_1_yb2xsg.png",
    productFilm: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792075835/OURO_hero_Video_converted_xjca8t.webm",
    productReveal: "https://res.cloudinary.com/dtkluxukm/video/upload/v1792075835/OURO_hero_Video_converted_xjca8t.webm",
    designedToDisappear: "https://res.cloudinary.com/dtkluxukm/image/upload/v1792951776/OURO_CEO_LAUNCH_KEYNOTE.001_1_ivgaai.png",
    craftsmanship: "https://res.cloudinary.com/dtkluxukm/image/upload/v1792951723/OURO_CEO_LAUNCH_KEYNOTE.006_cvnxrg.png",
    companionApp: "https://res.cloudinary.com/dtkluxukm/image/upload/v1792478377/launch_visuals_one_ggdl7n.jpg",

    // [KEYNOTE_CLOSING_IMAGE_URL] - Slide 13: Closing
    closing: "https://res.cloudinary.com/dtkluxukm/image/upload/v1792478854/OURO_CEO_LAUNCH_KEYNOTE.002_pe3k3w.png"
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

  function videoType(url) {
    if (/\.webm(\?.*)?$/i.test(url)) return "video/webm";
    if (/\.mov(\?.*)?$/i.test(url)) return "video/quicktime";
    return "video/mp4";
  }

  initChapterNav();
  syncMediaSlots();
  initKeynoteCarousel();
  initInvestorDeckCarousel();
  initScrollReveal();

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
        ev.type = videoType(ouroMedia.eventHero);
        if (ev.parentElement) ev.parentElement.load();
      }
    }

    var investorHeroSlot = document.querySelector("[data-media-slot='investorHero']");
    if (investorHeroSlot && isValidUrl(ouroMedia.investorHero)) {
      var investorImage = investorHeroSlot.querySelector(".investor-hero-image");
      if (investorImage && investorImage.src !== ouroMedia.investorHero) {
        investorImage.src = ouroMedia.investorHero;
      }
    }

    // Dynamically sync next-chapter CTA backgrounds with ouroMedia destinations
    syncCtaBackgrounds();
  }

  function syncCtaBackgrounds() {
    var ctaMap = {
      launch: ouroMedia.launchHero,
      brand: ouroMedia.brandHero,
      event: ouroMedia.eventHero,
      investor: ouroMedia.investorHero
    };

    var ctas = document.querySelectorAll(".next-chapter[data-cta-dest]");
    ctas.forEach(function (cta) {
      var dest = cta.getAttribute("data-cta-dest");
      var url = ctaMap[dest];
      if (!isValidUrl(url)) return;

      var video = cta.querySelector("video");
      var source = cta.querySelector("video source");
      var img = cta.querySelector("img");

      if (isVideo(url)) {
        if (source) {
          if (source.src !== url) {
            source.src = url;
            source.type = videoType(url);
            if (video) video.load();
          }
        } else {
          var v = document.createElement("video");
          v.autoplay = true;
          v.muted = true;
          v.loop = true;
          v.playsInline = true;
          v.preload = "none";
          v.setAttribute("aria-hidden", "true");
          v.innerHTML = '<source src="' + url + '" type="' + videoType(url) + '">';
          if (img) {
            cta.replaceChild(v, img);
          } else {
            cta.insertBefore(v, cta.firstChild);
          }
        }
      } else {
        if (img) {
          if (img.src !== url) img.src = url;
        } else if (video) {
          var newImg = document.createElement("img");
          newImg.src = url;
          newImg.alt = "Next Chapter Background";
          newImg.setAttribute("aria-hidden", "true");
          cta.replaceChild(newImg, video);
        }
      }
    });
  }

  function initInvestorDeckCarousel() {
    var root = document.querySelector(".investor-carousel");
    var dialog = document.querySelector(".investor-viewer");
    if (!root || !dialog || typeof dialog.showModal !== "function") return;

    var images = Array.isArray(ouroMedia.investorDeck) ? ouroMedia.investorDeck : [];
    var button = root.querySelector(".investor-image-button");
    var image = root.querySelector(".investor-carousel-image");
    var placeholder = root.querySelector(".investor-carousel-placeholder");
    var counter = root.querySelector(".investor-carousel-counter");
    var previous = root.querySelector(".investor-carousel-prev");
    var next = root.querySelector(".investor-carousel-next");
    var viewerImage = dialog.querySelector(".investor-viewer-image");
    var viewerCounter = dialog.querySelector(".investor-viewer-counter");
    var viewerClose = dialog.querySelector(".investor-viewer-close");
    var viewerPrevious = dialog.querySelector(".investor-viewer-prev");
    var viewerNext = dialog.querySelector(".investor-viewer-next");
    if (!button || !image || !placeholder || !counter || !previous || !next ||
      !viewerImage || !viewerCounter || !viewerClose || !viewerPrevious || !viewerNext || !images.length) return;

    var index = 0;
    var timer = 0;
    var hovered = root.matches(":hover");
    var focused = false;
    var savedFocus = null;
    var savedScroll = 0;
    var savedBodyStyles = null;
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function formatIndex(value) {
      return ("0" + (value + 1)).slice(-2) + " / " + ("0" + images.length).slice(-2);
    }

    function render() {
      var url = images[index];
      var valid = isValidUrl(url);
      var label = "Investor deck slide " + (index + 1);
      counter.textContent = formatIndex(index);
      viewerCounter.textContent = formatIndex(index);
      button.setAttribute("aria-label", "Open slide " + (index + 1) + " in image viewer");
      image.alt = label;
      viewerImage.alt = label;
      button.hidden = !valid;
      placeholder.hidden = valid;
      if (!valid) return;
      image.onerror = function () {
        button.hidden = true;
        placeholder.hidden = false;
        placeholder.textContent = "Investor deck image pending";
      };
      image.onload = null;
      image.classList.add("is-changing");
      window.setTimeout(function () {
        image.src = url;
        image.classList.remove("is-changing");
      }, 120);
      viewerImage.src = url;
    }

    function move(delta) {
      index = (index + delta + images.length) % images.length;
      render();
    }

    function stopAutoplay() {
      window.clearInterval(timer);
      timer = 0;
    }

    function updateAutoplay() {
      stopAutoplay();
      if (!reducedMotion.matches && !hovered && !focused && !dialog.open) {
        timer = window.setInterval(function () {
          move(1);
        }, 5000);
      }
    }

    function openViewer() {
      savedFocus = document.activeElement;
      savedScroll = window.scrollY;
      savedBodyStyles = {
        position: document.body.style.position,
        top: document.body.style.top,
        width: document.body.style.width
      };
      stopAutoplay();
      if (window.__dgLenis && window.__dgLenis.stop) window.__dgLenis.stop();
      document.body.style.position = "fixed";
      document.body.style.top = "-" + savedScroll + "px";
      document.body.style.width = "100%";
      render();
      dialog.showModal();
      viewerClose.focus();
    }

    button.addEventListener("click", openViewer);
    previous.addEventListener("click", function () { move(-1); });
    next.addEventListener("click", function () { move(1); });
    viewerPrevious.addEventListener("click", function () { move(-1); });
    viewerNext.addEventListener("click", function () { move(1); });
    viewerClose.addEventListener("click", function () { dialog.close(); });

    root.addEventListener("mouseenter", function () {
      hovered = true;
      updateAutoplay();
    });
    root.addEventListener("mouseleave", function () {
      hovered = false;
      updateAutoplay();
    });
    root.addEventListener("focusin", function () {
      focused = true;
      updateAutoplay();
    });
    root.addEventListener("focusout", function (event) {
      if (root.contains(event.relatedTarget)) return;
      focused = false;
      updateAutoplay();
    });

    dialog.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        event.preventDefault();
        dialog.close();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      }
    });
    dialog.addEventListener("close", function () {
      if (savedBodyStyles) {
        document.body.style.position = savedBodyStyles.position;
        document.body.style.top = savedBodyStyles.top;
        document.body.style.width = savedBodyStyles.width;
      }
      if (window.__dgLenis && window.__dgLenis.start) {
        window.__dgLenis.start();
        window.__dgLenis.scrollTo(savedScroll, { immediate: true, force: true });
      } else {
        window.scrollTo(0, savedScroll);
      }
      if (savedFocus && savedFocus.focus) savedFocus.focus({ preventScroll: true });
      updateAutoplay();
    });

    var touchStartX = 0;
    var touchStartY = 0;
    dialog.addEventListener("touchstart", function (event) {
      if (event.touches.length !== 1) return;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }, { passive: true });
    dialog.addEventListener("touchend", function (event) {
      if (event.changedTouches.length !== 1) return;
      var deltaX = event.changedTouches[0].clientX - touchStartX;
      var deltaY = event.changedTouches[0].clientY - touchStartY;
      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) move(deltaX < 0 ? 1 : -1);
    }, { passive: true });

    if (reducedMotion.addEventListener) {
      reducedMotion.addEventListener("change", updateAutoplay);
    }
    render();
    updateAutoplay();
  }

  function initScrollReveal() {
    if (reduced || !("IntersectionObserver" in window)) return;
    var targets = document.querySelectorAll(
      ".editorial-copy > h2, .editorial-copy > .essay-support, .editorial-copy > .editorial-body, " +
      ".gallery-item img, .gallery-item video, .keynote-header > .kicker, " +
      ".keynote-header > .keynote-heading, .keynote-header > .keynote-subtitle, .investor-deck-intro"
    );
    if (!targets.length) return;

    targets.forEach(function (target) {
      var group = target.closest(".editorial-copy, .gallery-container, .keynote-header");
      if (!group) return;
      var selector = group.classList.contains("editorial-copy")
        ? ":scope > h2, :scope > .essay-support, :scope > .editorial-body"
        : group.classList.contains("gallery-container")
          ? ".gallery-item img, .gallery-item video"
          : ":scope > .kicker, :scope > .keynote-heading, :scope > .keynote-subtitle";
      var siblings = Array.from(group.querySelectorAll(selector));
      var position = siblings.indexOf(target);
      if (position > 0) target.style.setProperty("--reveal-delay", Math.min(position * 90, 270) + "ms");
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    targets.forEach(function (target) {
      target.classList.add("scroll-reveal");
      observer.observe(target);
    });
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
