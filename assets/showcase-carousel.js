(function () {
  const carousel = document.querySelector('.showcase-carousel');
  if (!carousel) return;

  const cards = Array.from(carousel.querySelectorAll('.showcase-card'));
  const total = cards.length;

  const states = {
    '-2': { xPercent: -50, yPercent: -50, x: -580, scale: 0.6,  zIndex: 1,  opacity: 0 },
    '-1': { xPercent: -50, yPercent: -50, x: -330, scale: 0.8,  zIndex: 5,  opacity: 0.85 },
    '0':  { xPercent: -50, yPercent: -50, x: 0,    scale: 1,    zIndex: 10, opacity: 1 },
    '1':  { xPercent: -50, yPercent: -50, x: 330,  scale: 0.8,  zIndex: 5,  opacity: 0.85 },
    '2':  { xPercent: -50, yPercent: -50, x: 580,  scale: 0.6,  zIndex: 1,  opacity: 0 }
  };

  let activeIndex = 3;
  let timer = null;

  function isCompact() {
    return window.innerWidth <= 1024;
  }

  function normalize(i) {
    return ((i % total) + total) % total;
  }

  function updateCarousel(animate) {
    if (isCompact()) return;
    cards.forEach((card, i) => {
      let offset = i - activeIndex;
      if (offset > 2) offset -= total;
      if (offset < -2) offset += total;

      const s = states[String(offset)] || states['2'];

      card.style.pointerEvents = s.opacity === 0 ? 'none' : 'auto';

      gsap.to(card, {
        xPercent: s.xPercent,
        yPercent: s.yPercent,
        x: s.x,
        scale: s.scale,
        opacity: s.opacity,
        zIndex: s.zIndex,
        duration: animate ? 0.6 : 0,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    });
  }

  function resetCompactStyles() {
    cards.forEach((card) => {
      gsap.set(card, { clearProps: 'transform,opacity,zIndex' });
      card.style.pointerEvents = '';
    });
  }

  function goTo(index) {
    if (isCompact()) return;
    activeIndex = normalize(index);
    updateCarousel(true);
  }

  function next() {
    goTo(activeIndex + 1);
  }

  function startAuto() {
    if (isCompact()) return;
    stopAuto();
    timer = setInterval(next, 2000);
  }

  function stopAuto() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  cards.forEach((card, i) => {
    card.addEventListener('click', () => {
      goTo(i);
      startAuto();
    });
  });

  function applyModeForWidth() {
    if (isCompact()) {
      stopAuto();
      resetCompactStyles();
    } else {
      updateCarousel(false);
    }
  }

  applyModeForWidth();
  window.addEventListener('resize', applyModeForWidth);

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !isCompact()) {
          startAuto();
        } else {
          stopAuto();
        }
      });
    }, { threshold: 0.2 });
    io.observe(carousel);
  } else if (!isCompact()) {
    startAuto();
  }
})();
