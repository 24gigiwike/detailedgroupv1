(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  initChapterNav();
  initResponsiveMedia();
  initImageFallbacks();
  initLaunchHeroAudio();
  initVideoPlayback();
  initKeynoteCarousel();
  initInvestorCarousel();
  initScrollReveal();

  function initChapterNav() {
    var root = document.querySelector(".chapter-nav");
    if (!root) return;
    var toggle = root.querySelector(".chapter-toggle");
    var menu = root.querySelector(".chapter-menu");
    var closeButton = root.querySelector(".chapter-close");
    if (!toggle || !menu || !closeButton) return;

    function setOpen(open) {
      root.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      menu.hidden = !open;
      if (open) closeButton.focus({ preventScroll: true });
    }

    toggle.addEventListener("click", function (event) {
      event.stopPropagation();
      setOpen(menu.hidden);
    });
    closeButton.addEventListener("click", function (event) {
      event.stopPropagation();
      setOpen(false);
      toggle.focus({ preventScroll: true });
    });
    document.addEventListener("click", function (event) {
      if (!menu.hidden && !root.contains(event.target)) setOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !menu.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  function initResponsiveMedia() {
    var query = window.matchMedia("(max-width: 767px)");
    var media = Array.from(document.querySelectorAll("video[data-responsive-media]"));
    if (!media.length) return;

    function updateSources() {
      media.forEach(function (video) {
        var source = video.querySelector("source");
        if (!source) return;
        var desired = query.matches && video.dataset.mobileSrc
          ? video.dataset.mobileSrc
          : video.dataset.desktopSrc;
        if (!desired || source.getAttribute("src") === desired) return;
        source.src = desired;
        source.type = getVideoType(desired);
        video.load();
      });
    }

    function initImageFallbacks() {
      document.querySelectorAll("img[data-poster]").forEach(function (image) {
        image.addEventListener("error", function () {
          var fallback = image.dataset.poster;
          if (!fallback || image.src === new URL(fallback, window.location.href).href) return;
          var picture = image.closest("picture");
          if (picture) picture.querySelectorAll("source").forEach(function (source) { source.remove(); });
          image.src = fallback;
          image.removeAttribute("data-poster");
        }, { once: true });
      });
    }

    updateSources();
    if (query.addEventListener) query.addEventListener("change", updateSources);
    else if (query.addListener) query.addListener(updateSources);
  }

  function initLaunchHeroAudio() {
    var hero = document.querySelector("[data-launch-audio]");
    if (!hero) return;
    var video = hero.querySelector("video.land-video");
    var toggle = hero.querySelector(".hero-sound-toggle");
    if (!video || !toggle) return;
    var userEnabledAudio = false;
    var userChoseMute = false;
    var browserAllowedAudio = false;

    function updateToggle() {
      var enabled = !video.muted;
      toggle.textContent = enabled ? "Sound on" : "Sound off";
      toggle.setAttribute("aria-label", enabled ? "Turn sound off" : "Turn sound on");
      toggle.setAttribute("aria-pressed", enabled ? "true" : "false");
    }

    function playMuted() {
      video.muted = true;
      updateToggle();
      var playback = video.play();
      if (playback && playback.catch) playback.catch(function () {});
    }

    function playWithSound() {
      video.muted = false;
      updateToggle();
      var playback = video.play();
      if (playback && playback.then) {
        playback.then(function () {
          if (!userChoseMute && !video.muted) browserAllowedAudio = true;
        }).catch(function () {
          browserAllowedAudio = false;
          playMuted();
        });
      } else {
        browserAllowedAudio = !video.muted;
      }
    }

    toggle.addEventListener("click", function () {
      if (!video.muted) {
        userEnabledAudio = false;
        userChoseMute = true;
        video.muted = true;
        updateToggle();
        return;
      }
      userEnabledAudio = true;
      userChoseMute = false;
      playWithSound();
    });

    if (!("IntersectionObserver" in window)) {
      if (reducedMotion.matches) video.pause();
      else playWithSound();
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || reducedMotion.matches) {
          video.muted = true;
          updateToggle();
          video.pause();
          return;
        }
        if (userEnabledAudio || (browserAllowedAudio && !userChoseMute)) playWithSound();
        else playMuted();
      });
    }, { threshold: 0.25 });
    observer.observe(hero);
    if (reducedMotion.addEventListener) {
      reducedMotion.addEventListener("change", function () {
        if (reducedMotion.matches) {
          video.muted = true;
          updateToggle();
          video.pause();
        } else {
          observer.observe(hero);
        }
      });
    }
  }

  function initVideoPlayback() {
    var videos = Array.from(document.querySelectorAll("video")).filter(function (video) {
      return !video.closest("[data-launch-audio]") && !video.closest("#keynote");
    });
    if (!videos.length) return;
    if (reducedMotion.matches) videos.forEach(function (video) { video.pause(); });

    function updatePlayback(entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (reducedMotion.matches || !entry.isIntersecting) {
          video.pause();
          return;
        }
        var playback = video.play();
        if (playback && playback.catch) playback.catch(function () {});
      });
    }

    if (!("IntersectionObserver" in window)) {
      if (!reducedMotion.matches) videos.forEach(function (video) {
        var playback = video.play();
        if (playback && playback.catch) playback.catch(function () {});
      });
      return;
    }

    var observer = new IntersectionObserver(updatePlayback, { threshold: 0.25 });
    videos.forEach(function (video) { observer.observe(video); });
    if (reducedMotion.addEventListener) {
      reducedMotion.addEventListener("change", function () {
        videos.forEach(function (video) {
          if (reducedMotion.matches) video.pause();
          else observer.observe(video);
        });
      });
    }
  }

  function initKeynoteCarousel() {
    var section = document.getElementById("keynote");
    if (!section) return;
    var stage = section.querySelector(".keynote-stage");
    var slides = Array.from(section.querySelectorAll(".keynote-slide"));
    var currentCounter = section.querySelector(".keynote-counter .current-slide");
    var totalCounter = section.querySelector(".keynote-counter .total-slides");
    var currentTitle = section.querySelector(".keynote-current-title");
    var previous = section.querySelector(".keynote-nav-btn.prev");
    var next = section.querySelector(".keynote-nav-btn.next");
    if (!stage || !slides.length || !currentCounter || !totalCounter || !currentTitle || !previous || !next) return;

    var index = 0;
    totalCounter.textContent = String(slides.length).padStart(2, "0");

    function updateSoundToggle(button, video) {
      var enabled = !video.muted;
      button.textContent = enabled ? "Sound on" : "Sound off";
      button.setAttribute("aria-label", enabled ? "Turn sound off" : "Turn sound on");
      button.setAttribute("aria-pressed", enabled ? "true" : "false");
    }

    slides.forEach(function (slide) {
      var video = slide.querySelector("video.slide-media");
      var toggle = slide.querySelector(".keynote-sound-toggle");
      if (!video || !toggle) return;
      toggle.addEventListener("click", function (event) {
        event.stopPropagation();
        video.muted = !video.muted;
        updateSoundToggle(toggle, video);
        var playback = video.play();
        if (playback && playback.catch) playback.catch(function () {
          video.muted = true;
          updateSoundToggle(toggle, video);
        });
      });
    });

    function showSlide(nextIndex) {
      if (nextIndex < 0 || nextIndex >= slides.length) return;
      var previousVideo = slides[index].querySelector("video.slide-media");
      if (previousVideo) {
        previousVideo.pause();
        previousVideo.muted = true;
        var previousToggle = slides[index].querySelector(".keynote-sound-toggle");
        if (previousToggle) updateSoundToggle(previousToggle, previousVideo);
      }

      slides[index].classList.remove("is-active");
      index = nextIndex;
      var currentSlide = slides[index];
      currentSlide.classList.add("is-active");
      var currentVideo = currentSlide.querySelector("video.slide-media");
      if (currentVideo && !reducedMotion.matches) {
        currentVideo.currentTime = 0;
        var playback = currentVideo.play();
        if (playback && playback.catch) playback.catch(function () {});
      }

      currentCounter.textContent = String(index + 1).padStart(2, "0");
      currentTitle.textContent = currentSlide.dataset.title || "";
      previous.disabled = index === 0;
      next.disabled = index === slides.length - 1;
    }

    previous.addEventListener("click", function () { showSlide(index - 1); });
    next.addEventListener("click", function () { showSlide(index + 1); });
    window.addEventListener("keydown", function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      var target = event.target;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName))) return;
      var bounds = section.getBoundingClientRect();
      if (bounds.top >= window.innerHeight || bounds.bottom <= 0) return;
      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        showSlide(index - 1);
      } else if (event.key === "ArrowRight" && index < slides.length - 1) {
        event.preventDefault();
        showSlide(index + 1);
      }
    });

    var touchStartX = 0;
    var touchStartY = 0;
    stage.addEventListener("touchstart", function (event) {
      if (event.touches.length !== 1) return;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }, { passive: true });
    stage.addEventListener("touchend", function (event) {
      if (event.changedTouches.length !== 1) return;
      var deltaX = event.changedTouches[0].clientX - touchStartX;
      var deltaY = event.changedTouches[0].clientY - touchStartY;
      if (Math.abs(deltaX) <= 40 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      showSlide(index + (deltaX < 0 ? 1 : -1));
    }, { passive: true });

    showSlide(0);
    if (reducedMotion.addEventListener) {
      reducedMotion.addEventListener("change", function () {
        var video = slides[index].querySelector("video.slide-media");
        if (!video) return;
        if (reducedMotion.matches) video.pause();
        else {
          var playback = video.play();
          if (playback && playback.catch) playback.catch(function () {});
        }
      });
    }
  }

  function initInvestorCarousel() {
    var root = document.querySelector(".investor-carousel");
    var dialog = document.querySelector(".investor-viewer");
    if (!root || !dialog || typeof dialog.showModal !== "function") return;
    var slideData = Array.from(root.querySelectorAll(".investor-slide-data [data-url]"))
      .map(function (item) {
        return { url: item.dataset.url, alt: item.dataset.alt || "", title: item.dataset.title || "" };
      })
      .filter(function (item) { return !!item.url; });
    var button = root.querySelector(".investor-image-button");
    var image = root.querySelector(".investor-carousel-image");
    var placeholder = root.querySelector(".investor-carousel-placeholder");
    var counter = root.querySelector(".investor-carousel-counter");
    var previous = root.querySelector(".investor-carousel-prev");
    var next = root.querySelector(".investor-carousel-next");
    var viewerImage = dialog.querySelector(".investor-viewer-image");
    var viewerCounter = dialog.querySelector(".investor-viewer-counter");
    var close = dialog.querySelector(".investor-viewer-close");
    var viewerPrevious = dialog.querySelector(".investor-viewer-prev");
    var viewerNext = dialog.querySelector(".investor-viewer-next");
    if (!slideData.length || !button || !image || !placeholder || !counter || !previous || !next ||
        !viewerImage || !viewerCounter || !close || !viewerPrevious || !viewerNext) return;

    var index = 0;
    var timer = 0;
    var hovered = root.matches(":hover");
    var focused = false;
    var savedFocus = null;
    var savedScroll = 0;
    var savedBodyStyles;
    var renderTimer = 0;

    function formatCounter() {
      return `${String(index + 1).padStart(2, "0")} / ${String(slideData.length).padStart(2, "0")}`;
    }

    function render() {
      var current = slideData[index];
      counter.textContent = formatCounter();
      viewerCounter.textContent = formatCounter();
      button.setAttribute("aria-label", current.title
        ? `Open slide ${index + 1}: ${current.title} in image viewer`
        : `Open slide ${index + 1} in image viewer`);
      image.alt = current.alt;
      viewerImage.alt = current.alt;
      button.hidden = false;
      placeholder.hidden = true;
      image.onerror = function () {
        button.hidden = true;
        placeholder.hidden = false;
        placeholder.textContent = "Investor deck image unavailable";
      };
      image.onload = function () {
        button.hidden = false;
        placeholder.hidden = true;
      };
      window.clearTimeout(renderTimer);
      image.classList.add("is-changing");
      renderTimer = window.setTimeout(function () {
        image.src = current.url;
        viewerImage.src = current.url;
        image.classList.remove("is-changing");
      }, 120);
    }

    function move(delta) {
      index = (index + delta + slideData.length) % slideData.length;
      render();
    }

    function stopAutoplay() {
      window.clearInterval(timer);
      timer = 0;
    }

    function updateAutoplay() {
      stopAutoplay();
      if (!reducedMotion.matches && !hovered && !focused && !dialog.open && slideData.length > 1) {
        timer = window.setInterval(function () { move(1); }, 5000);
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
      document.body.style.top = `-${savedScroll}px`;
      document.body.style.width = "100%";
      render();
      dialog.showModal();
      close.focus();
    }

    button.addEventListener("click", openViewer);
    previous.addEventListener("click", function () { move(-1); });
    next.addEventListener("click", function () { move(1); });
    viewerPrevious.addEventListener("click", function () { move(-1); });
    viewerNext.addEventListener("click", function () { move(1); });
    close.addEventListener("click", function () { dialog.close(); });
    root.addEventListener("mouseenter", function () { hovered = true; updateAutoplay(); });
    root.addEventListener("mouseleave", function () { hovered = false; updateAutoplay(); });
    root.addEventListener("focusin", function () { focused = true; updateAutoplay(); });
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

    if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", updateAutoplay);
    render();
    updateAutoplay();
  }

  function initScrollReveal() {
    if (reducedMotion.matches || !("IntersectionObserver" in window)) return;
    var targets = document.querySelectorAll(
      ".editorial-copy > .editorial-intro, .editorial-copy > .editorial-body, " +
      ".gallery-item img, .gallery-item video, .keynote-header > .kicker, " +
      ".keynote-header > .keynote-heading, .keynote-header > .keynote-subtitle, " +
      ".investor-deck-intro, .next-chapter .next-label"
    );
    if (!targets.length) return;

    targets.forEach(function (target) {
      var group = target.closest(".editorial-copy, .gallery-container, .keynote-header");
      if (!group) return;
      var selector = group.classList.contains("editorial-copy")
        ? ":scope > .editorial-intro, :scope > .editorial-body"
        : group.classList.contains("gallery-container")
          ? ".gallery-item img, .gallery-item video"
          : ":scope > .kicker, :scope > .keynote-heading, :scope > .keynote-subtitle";
      var position = Array.from(group.querySelectorAll(selector)).indexOf(target);
      if (position > 0) target.style.setProperty("--reveal-delay", `${Math.min(position * 90, 270)}ms`);
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
    if (reducedMotion.addEventListener) {
      reducedMotion.addEventListener("change", function () {
        if (!reducedMotion.matches) return;
        targets.forEach(function (target) {
          target.classList.add("is-revealed");
          observer.unobserve(target);
        });
      });
    }
  }

  function getVideoType(url) {
    if (/\.webm(?:[?#].*)?$/i.test(url)) return "video/webm";
    if (/\.mov(?:[?#].*)?$/i.test(url)) return "video/quicktime";
    return "video/mp4";
  }
})();
