(function () {
  'use strict';
  var frames = document.querySelectorAll('.how-image-frame');
  if (!frames.length) return;

  function rescale() {
    var isCompact = window.innerWidth <= 1024;
    frames.forEach(function (frame) {
      var stage = frame.firstElementChild;
      if (!stage) return;
      if (!isCompact) {
        stage.style.transform = '';
        return;
      }
      var scale = frame.clientWidth / 472;
      stage.style.transform = 'scale(' + scale + ')';
    });
  }

  rescale();
  window.addEventListener('resize', rescale);
})();
