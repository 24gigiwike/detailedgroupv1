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

  var id = (location.hash || "").replace("#", "");
  if (!id) return;
  var chapter = document.getElementById(id);
  if (!chapter) return;
  requestAnimationFrame(function () {
    chapter.scrollIntoView({ block: "start" });
  });
})();
