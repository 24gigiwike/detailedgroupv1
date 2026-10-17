(function () {
  if (window.__dgLenis || typeof window.Lenis !== "function") return;
  window.__dgLenis = new window.Lenis({
    autoRaf: true,
    autoToggle: true,
    anchors: true,
    allowNestedScroll: true,
    naiveDimensions: true,
    stopInertiaOnNavigate: true,
    syncTouch: false,
    respectReducedMotion: true
  });
})();
