(function () {
  var root = document.documentElement;
  var reduce = root.classList.contains('reduce') || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) root.classList.add('reduce');

  var scenes = Array.prototype.slice.call(document.querySelectorAll('main section[id]'));
  var railLinks = Array.prototype.slice.call(document.querySelectorAll('.rail a'));
  var readoutNow = document.getElementById('rail-now');
  var readoutName = document.getElementById('rail-name');
  var names = {
    'scene-intro': 'Introduction',
    'scene-thesis': 'Thesis',
    'scene-form': 'Form',
    'scene-system': 'System',
    'scene-product': 'Product',
    'scene-launch': 'Launch',
    'scene-event': 'Event',
    'scene-investor': 'Investor',
    'scene-connected': 'Connected',
    'scene-close': 'Close'
  };
  var streamForScene = {
    'scene-product': 'product',
    'scene-launch': 'launch',
    'scene-event': 'event',
    'scene-investor': 'investor'
  };

  function setCurrent(id) {
    railLinks.forEach(function (link) {
      if (link.getAttribute('href') === '#' + id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    var order = scenes.findIndex(function (section) { return section.id === id; });
    if (readoutNow) readoutNow.textContent = String(order + 1).padStart(2, '0');
    if (readoutName) readoutName.textContent = names[id] || '';
    var stream = streamForScene[id];
    var focusInside = streamList && streamList.contains(document.activeElement);
    if (stream && !systemHot && !focusInside) showStream(stream);
  }

  var streams = Array.prototype.slice.call(document.querySelectorAll('.stream'));
  var plates = Array.prototype.slice.call(document.querySelectorAll('.plate'));
  var systemIndex = document.getElementById('system-index');
  var systemHot = false;

  function showStream(id) {
    streams.forEach(function (link) {
      link.classList.toggle('is-on', link.getAttribute('data-stream') === id);
    });
    plates.forEach(function (plate) {
      plate.classList.toggle('is-on', plate.getAttribute('data-stream') === id);
    });
    var current = streams.filter(function (link) { return link.getAttribute('data-stream') === id; })[0];
    if (systemIndex && current) systemIndex.textContent = current.getAttribute('data-index') || '01';
  }

  var streamList = document.querySelector('.streams');
  streams.forEach(function (link) {
    link.addEventListener('pointerenter', function (event) {
      if (event.pointerType === 'touch') return;
      systemHot = true;
      showStream(link.getAttribute('data-stream'));
    });
    link.addEventListener('focus', function () {
      systemHot = true;
      showStream(link.getAttribute('data-stream'));
    });
    link.addEventListener('click', function () {
      showStream(link.getAttribute('data-stream'));
    });
  });
  if (streamList) {
    streamList.addEventListener('focusout', function () {
      window.requestAnimationFrame(function () {
        if (!streamList.contains(document.activeElement)) systemHot = false;
      });
    });
  }
  if (streamList) {
    streamList.addEventListener('pointerleave', function () {
      systemHot = false;
    });
  }
  showStream('product');

  if ('IntersectionObserver' in window) {
    var ratios = new Map();
    var sceneObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
      });
      var best = null;
      var bestRatio = 0;
      ratios.forEach(function (ratio, id) {
        if (ratio > bestRatio) {
          best = id;
          bestRatio = ratio;
        }
      });
      if (best) setCurrent(best);
    }, { threshold: [0.25, 0.45, 0.7] });
    scenes.forEach(function (section) { sceneObserver.observe(section); });

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        var mask = entry.target.querySelector ? entry.target.querySelector('.mask') : null;
        if (mask) mask.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px 12% 0px' });
    Array.prototype.forEach.call(document.querySelectorAll('.rise, .fragment, .frame, .tile, .form-plate, .mosaic figure'), function (node) {
      revealObserver.observe(node);
    });
  } else {
    root.classList.remove('js');
  }

  var cue = document.querySelector('.scroll-cue');
  var parallaxNodes = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
  var eventPhoto = document.querySelector('.event-photo');
  var ticking = false;

  function strength() {
    if (window.innerWidth < 768) return 0;
    if (window.innerWidth < 1024) return 0.45;
    return 1;
  }

  function frame() {
    ticking = false;
    if (cue) cue.classList.toggle('is-gone', window.scrollY > 150);
    if (reduce) return;
    var factor = strength();
    var vh = window.innerHeight || 1;
    if (factor > 0) {
      parallaxNodes.forEach(function (node) {
        var rate = Number(node.getAttribute('data-parallax')) || 0.04;
        var rect = node.getBoundingClientRect();
        var center = rect.top + rect.height / 2 - vh / 2;
        var shift = Math.max(-28, Math.min(28, -center * rate * factor));
        node.style.transform = 'translate3d(0,' + shift.toFixed(2) + 'px,0)';
      });
    } else {
      parallaxNodes.forEach(function (node) { node.style.transform = 'none'; });
    }
    if (eventPhoto) {
      var rect = eventPhoto.getBoundingClientRect();
      var progress = 1 - Math.min(1, Math.max(0, rect.top / vh));
      var maxScale = window.innerWidth < 768 ? 1.04 : 1.1;
      var scale = maxScale - progress * (maxScale - 1);
      eventPhoto.style.transform = 'scale(' + scale.toFixed(3) + ')';
    }
  }

  function requestFrame() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(frame);
  }

  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame);
  requestFrame();

  var dialog = document.getElementById('lightbox');
  var dialogImg = document.getElementById('lightbox-img');
  var dialogCaption = document.getElementById('lightbox-caption');
  var dialogClose = document.getElementById('lightbox-close');
  var opener = null;
  if (dialog && dialogImg && typeof dialog.showModal === 'function') {
    Array.prototype.forEach.call(document.querySelectorAll('.shot'), function (button) {
      button.addEventListener('click', function () {
        var source = button.querySelector('img');
        if (!source) return;
        opener = button;
        dialogImg.src = source.src;
        dialogImg.alt = source.alt;
        if (dialogCaption) dialogCaption.textContent = button.getAttribute('data-caption') || source.alt;
        dialog.showModal();
      });
    });
    if (dialogClose) dialogClose.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', function () {
      if (opener) opener.focus();
    });
  }
})();
