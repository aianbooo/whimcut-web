(function () {
  var ASPECT       = 469 / 601;
  var SNAP_RADIUS  = 24;
  var CLOSE_RADIUS = 20;
  var BOOK_W       = 651.61;
  var BOOK_H       = 505;

  var heroDemo    = document.getElementById('hero-demo');
  var bgCanvas    = document.getElementById('hero-bg-canvas');
  var lassoCanvas = document.getElementById('hero-lasso-canvas');
  var bgCtx       = bgCanvas.getContext('2d');
  var lassoCtx    = lassoCanvas.getContext('2d');
  var heroImage   = new Image();
  heroImage.src   = 'assets/images/hero-cut-scene.png';

  var W          = 0;
  var H          = 0;
  var DPR        = 1;
  var phase      = 'cut';
  var lassoState = 'idle';
  var pts        = [];
  var instructionHidden = false;

  var bookScale   = 1;
  var offsetX     = 0;
  var offsetY     = 0;
  var userSticker = null;
  var papers      = {};
  var stickerScale = 1;
  var bookBackCanvas  = null;
  var bookFrontCanvas = null;

  // ── Canvas init ─────────────────────────────────────────────
  function initCanvases() {
    DPR = window.devicePixelRatio || 1;
    W = Math.floor(heroDemo.offsetWidth);
    H = Math.round(W * ASPECT);

    heroDemo.style.height = H + 'px';

    bgCanvas.width        = W * DPR;
    bgCanvas.height       = H * DPR;
    bgCanvas.style.width  = W + 'px';
    bgCanvas.style.height = H + 'px';

    lassoCanvas.width        = W * DPR;
    lassoCanvas.height       = H * DPR;
    lassoCanvas.style.width  = W + 'px';
    lassoCanvas.style.height = H + 'px';

    bgCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
    bgCtx.drawImage(heroImage, 0, 0, W, H);
    lassoCtx.setTransform(DPR, 0, 0, DPR, 0, 0);

    if (lassoState !== 'idle') {
      lassoState = 'idle';
      pts = [];
    }
    lassoCtx.clearRect(0, 0, W, H);
  }

  // ── Coordinate helper ────────────────────────────────────────
  function getXY(e) {
    var rect = lassoCanvas.getBoundingClientRect();
    var src  = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * (W / rect.width),
      y: (src.clientY - rect.top)  * (H / rect.height)
    };
  }

  function getTouchEndXY(e) {
    var rect  = lassoCanvas.getBoundingClientRect();
    var touch = e.changedTouches[0];
    return {
      x: (touch.clientX - rect.left) * (W / rect.width),
      y: (touch.clientY - rect.top)  * (H / rect.height)
    };
  }

  // ── Render ───────────────────────────────────────────────────
  function renderLasso() {
    var c = lassoCtx;
    c.clearRect(0, 0, W, H);
    if (pts.length === 0) return;
    c.save();
    c.lineCap  = 'round';
    c.lineJoin = 'round';

    if (pts.length >= 2) {
      c.setLineDash([6, 4]);
      c.strokeStyle = '#FFFFFF';
      c.lineWidth   = 1.5;
      c.beginPath();
      c.moveTo(pts[0].x, pts[0].y);
      pts.forEach(function (p) { c.lineTo(p.x, p.y); });
      c.stroke();
    }

    c.setLineDash([]);
    c.fillStyle = '#FFFFFF';
    c.beginPath();
    c.arc(pts[0].x, pts[0].y, 4, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  function renderCloseRing() {
    var c = lassoCtx;
    c.save();
    c.setLineDash([]);
    c.strokeStyle = '#FFFFFF';
    c.lineWidth   = 1.5;
    c.beginPath();
    c.arc(pts[0].x, pts[0].y, 12, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  function renderPauseIndicator(mousePos) {
    var last     = pts[pts.length - 1];
    var snapping = mousePos &&
      Math.hypot(last.x - mousePos.x, last.y - mousePos.y) < SNAP_RADIUS;
    var c = lassoCtx;
    c.save();
    c.setLineDash([]);
    c.lineWidth = 1.5;
    if (snapping) {
      c.fillStyle = '#FFFFFF';
      c.beginPath();
      c.arc(last.x, last.y, 8, 0, Math.PI * 2);
      c.fill();
    } else {
      c.strokeStyle = '#FFFFFF';
      c.beginPath();
      c.arc(last.x, last.y, 8, 0, Math.PI * 2);
      c.stroke();
    }
    c.restore();
  }

  // ── Instruction ──────────────────────────────────────────────
  function hideInstruction() {
    if (instructionHidden) return;
    instructionHidden = true;
    var el = document.getElementById('hero-instruction');
    if (el) {
      el.style.animation = 'none';
      el.style.opacity   = '0';
    }
  }

  // ── Scrapbook helpers ────────────────────────────────────────
  function toScene(x, y) {
    return {
      left: offsetX + x * bookScale,
      top:  offsetY + y * bookScale
    };
  }

  var STICKER_DEFS = [
    { id: 'dark', file: 'scrapbook-paper-right-dark.png',  x: 345, y: -45, anim: 'X', from: 40 },
    { id: 'top',  file: 'scrapbook-paper-top.png',         x: 328, y: -20, anim: 'Y', from: -40 },
    { id: 'dot',  file: 'scrapbook-paper-right-dot.png',   x: 437, y: 67,  anim: 'X', from: 40 },
    { id: 'quoteOpen',  file: 'scrapbook-quote-mark-open.png',   x: 51,  y: 195 },
    { id: 'quoteMake',  file: 'scrapbook-quote-make.png',        x: 100, y: 218 },
    { id: 'quoteIt',    file: 'scrapbook-quote-it.png',          x: 224, y: 213 },
    { id: 'quoteYours', file: 'scrapbook-quote-yours.png',       x: 143, y: 258 },
    { id: 'quoteClose', file: 'scrapbook-quote-mark-close.png',  x: 248, y: 281 }
  ];

  function buildStickers() {
    var overlay = document.getElementById('hero-sticker-overlay');
    var scrapScene = document.getElementById('hero-scene-scrapbook');
    STICKER_DEFS.forEach(function (cfg) {
      var img = new Image();
      img.className = 'hero-sticker';
      img.style.position = 'absolute';
      img.style.cursor = 'grab';
      var p = toScene(cfg.x, cfg.y);
      img.style.left = p.left + 'px';
      img.style.top = p.top + 'px';
      if (cfg.anim) {
        img.style.opacity = '0';
        img.style.transform = cfg.anim === 'X'
          ? 'translateX(' + cfg.from + 'px)'
          : 'translateY(' + cfg.from + 'px)';
      } else {
        img.style.opacity = '1';
      }

      (function (el) {
        function applySize() {
          var s = stickerScale * (cfg.scale || 1);
          el.style.width  = Math.round(el.naturalWidth  * s) + 'px';
          el.style.height = Math.round(el.naturalHeight * s) + 'px';
        }
        if (el.complete && el.naturalWidth > 0) {
          applySize();
        } else {
          el.addEventListener('load', applySize);
        }
      }(img));

      img.src = 'assets/images/' + cfg.file;
      if (cfg.id === 'dark' || cfg.id === 'top') {
        scrapScene.insertBefore(img, bookBackCanvas);
      } else if (cfg.id === 'dot') {
        scrapScene.insertBefore(img, bookFrontCanvas);
      } else {
        overlay.appendChild(img);
      }
      if (cfg.anim) papers[cfg.id] = img;
    });
  }

  function initScrapbook() {
    var scrapScene = document.getElementById('hero-scene-scrapbook');
    scrapScene.style.transform = 'translateY(100%)';

    bookBackCanvas = document.getElementById('hero-book-back-canvas');
    if (!bookBackCanvas) {
      bookBackCanvas = document.createElement('canvas');
      bookBackCanvas.id = 'hero-book-back-canvas';
      bookBackCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
      scrapScene.appendChild(bookBackCanvas);
    }
    bookBackCanvas.width  = W * DPR;
    bookBackCanvas.height = H * DPR;
    bookBackCanvas.style.width  = W + 'px';
    bookBackCanvas.style.height = H + 'px';
    var backCtx = bookBackCanvas.getContext('2d');
    backCtx.setTransform(DPR, 0, 0, DPR, 0, 0);

    bookFrontCanvas = document.getElementById('hero-book-front-canvas');
    if (!bookFrontCanvas) {
      bookFrontCanvas = document.createElement('canvas');
      bookFrontCanvas.id = 'hero-book-front-canvas';
      bookFrontCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
      scrapScene.appendChild(bookFrontCanvas);
    }
    bookFrontCanvas.width  = W * DPR;
    bookFrontCanvas.height = H * DPR;
    bookFrontCanvas.style.width  = W + 'px';
    bookFrontCanvas.style.height = H + 'px';
    var frontCtx = bookFrontCanvas.getContext('2d');
    frontCtx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var backImg = new Image();
    var frontImg = new Image();
    var bookLoaded = 0;
    function onBookLoad() {
      bookLoaded++;
      if (bookLoaded < 2) return;

      var EXPORT_SCALE = Math.round(backImg.naturalWidth / BOOK_W);
      if (EXPORT_SCALE < 1) EXPORT_SCALE = 1;

      var PAPER_TOP = 45; // 纸上翘出书顶的 book 单位，顶部预留空间避免被裁
      bookScale = Math.min(W / BOOK_W, H / (BOOK_H + PAPER_TOP));
      offsetX = (W - BOOK_W * bookScale) / 2;
      offsetY = PAPER_TOP * bookScale;
      stickerScale = bookScale / EXPORT_SCALE;

      var scaleX = (BOOK_W * bookScale) / backImg.naturalWidth;
      var scaleY = (BOOK_H * bookScale) / backImg.naturalHeight;
      backCtx.drawImage(backImg, offsetX, offsetY, BOOK_W * bookScale, BOOK_H * bookScale);
      frontCtx.drawImage(frontImg, 0, 0, frontImg.naturalWidth, frontImg.naturalHeight,
                         offsetX + 1, offsetY + 1,
                         frontImg.naturalWidth * scaleX,
                         frontImg.naturalHeight * scaleY);
      buildStickers();
    }
    backImg.onload = onBookLoad;
    frontImg.onload = onBookLoad;
    backImg.src = 'assets/images/scrapbook-base-back.png';
    frontImg.src = 'assets/images/scrapbook-base-front.png';
  }

  function insertPaper(el, axis) {
    if (!el) return;
    el.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    el.style.opacity = '1';
    el.style.transform = axis === 'Y' ? 'translateY(0)' : 'translateX(0)';
  }

  // ── Cut (full animation sequence) ───────────────────────────
  function smoothPoints(pts, radius) {
    var n = pts.length;
    var out = [];
    for (var i = 0; i < n; i++) {
      var sx = 0, sy = 0, wsum = 0;
      for (var k = -radius; k <= radius; k++) {
        var idx = (i + k + n) % n;
        var w = radius + 1 - Math.abs(k);
        sx += pts[idx].x * w;
        sy += pts[idx].y * w;
        wsum += w;
      }
      out.push({ x: sx / wsum, y: sy / wsum });
    }
    return out;
  }

  function traceSmoothPath(ctx, pts, ox, oy) {
    var n = pts.length;
    ctx.moveTo((pts[0].x + pts[n - 1].x) / 2 - ox,
               (pts[0].y + pts[n - 1].y) / 2 - oy);
    for (var i = 0; i < n; i++) {
      var j = (i + 1) % n;
      ctx.quadraticCurveTo(pts[i].x - ox, pts[i].y - oy,
                           (pts[i].x + pts[j].x) / 2 - ox,
                           (pts[i].y + pts[j].y) / 2 - oy);
    }
    ctx.closePath();
  }

  function doCut() {
    lassoCtx.clearRect(0, 0, W, H);
    lassoState = 'idle';
    phase = 'transition';
    var raw = pts.slice();
    pts = [];
    var shape = smoothPoints(raw, 3);

    var xs = raw.map(function (p) { return p.x; });
    var ys = raw.map(function (p) { return p.y; });
    var x0 = Math.min.apply(null, xs);
    var y0 = Math.min.apply(null, ys);
    var x1 = Math.max.apply(null, xs);
    var y1 = Math.max.apply(null, ys);
    var bw = Math.max(1, x1 - x0);
    var bh = Math.max(1, y1 - y0);

    // 提取贴纸（DPR 分辨率 + 平滑边缘）
    var sc = document.createElement('canvas');
    sc.width = bw * DPR;
    sc.height = bh * DPR;
    var sx = sc.getContext('2d');
    sx.setTransform(DPR, 0, 0, DPR, 0, 0);
    sx.save();
    sx.beginPath();
    traceSmoothPath(sx, shape, x0, y0);
    sx.clip();
    sx.fillStyle = '#fff';
    sx.fillRect(0, 0, bw, bh);
    sx.drawImage(bgCanvas, 0, 0, bgCanvas.width, bgCanvas.height,
                 -x0, -y0, W, H);
    sx.restore();
    var stickerURL = sc.toDataURL();

    // 贴纸浮起
    var hfi = document.getElementById('hero-sticker-float');
    hfi.style.backgroundImage = 'url(' + stickerURL + ')';
    hfi.style.backgroundSize = '100% 100%';
    hfi.style.position = 'absolute';
    hfi.style.left = x0 + 'px';
    hfi.style.top = y0 + 'px';
    hfi.style.width = bw + 'px';
    hfi.style.height = bh + 'px';
    hfi.style.display = 'block';
    hfi.style.zIndex = '50';
    hfi.style.transition = 'none';
    hfi.style.transform = 'scale(1.03) translateY(-8px) rotate(-5deg)';
    hfi.dataset.src = stickerURL;

    // 落点：本子右页中心偏上，落地等比缩放 0.8，并约束在 heroDemo 内（不被截断）
    var margin = 16;
    var landScale = 0.8;
    var landW = bw * landScale;
    var landH = bh * landScale;
    var targetX = offsetX + (BOOK_W * bookScale) * 0.75 - landW / 2;
    var targetY = offsetY + (BOOK_H * bookScale) * 0.3 - landH / 2;
    targetX = Math.max(margin, Math.min(targetX, W - margin - landW));
    targetY = Math.max(margin, Math.min(targetY, H - margin - landH));

    var cutScene   = document.getElementById('hero-scene-cut');
    var scrapScene = document.getElementById('hero-scene-scrapbook');
    var overlay    = document.getElementById('hero-sticker-overlay');

    // t=300ms：场景一淡出 + 本子滑入
    setTimeout(function () {
      cutScene.style.transition = 'opacity 0.4s ease';
      cutScene.style.opacity = '0';
      scrapScene.style.pointerEvents = 'auto';
      scrapScene.style.transition = 'transform 0.5s cubic-bezier(.25,.46,.45,.94), opacity 0.4s ease';
      scrapScene.style.transform = 'translateY(0)';
      scrapScene.style.opacity = '1';
    }, 300);

    // t=500ms：贴纸下落到右页
    setTimeout(function () {
      hfi.style.transition = 'left 0.4s cubic-bezier(.32,.72,.35,1.4), top 0.4s cubic-bezier(.32,.72,.35,1.4), width 0.4s ease, height 0.4s ease, transform 0.4s ease, box-shadow 0.3s ease';
      hfi.style.width = landW + 'px';
      hfi.style.height = landH + 'px';
      hfi.style.left = targetX + 'px';
      hfi.style.top = targetY + 'px';
      hfi.style.transform = 'rotate(3deg)';
      userSticker = { el: hfi, x: targetX, y: targetY };
    }, 500);

    // t=800ms：显示 overlay
    setTimeout(function () {
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'auto';
    }, 800);

    // t=900ms：三张纸依次插入
    setTimeout(function () { insertPaper(papers.top, 'Y'); }, 900);
    setTimeout(function () { insertPaper(papers.dark, 'X'); }, 1000);
    setTimeout(function () { insertPaper(papers.dot, 'X'); }, 1100);

    // t=1300ms：全部就位
    setTimeout(function () {
      phase = 'scrapbook';
      var btn = document.getElementById('hero-cut-again');
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      var hfi = document.getElementById('hero-sticker-float');
      hfi.style.cursor = 'grab';
    }, 1300);
  }

  // ── Shared pointer logic ─────────────────────────────────────
  function onPointerDown(pos) {
    if (phase !== 'cut') return;

    if (lassoState === 'idle') {
      lassoState = 'drawing';
      pts = [pos];
      renderLasso();
      hideInstruction();
      return;
    }

    if (lassoState === 'paused') {
      var last = pts[pts.length - 1];
      if (Math.hypot(last.x - pos.x, last.y - pos.y) < SNAP_RADIUS) {
        lassoState = 'drawing';
      } else {
        lassoState = 'idle';
        pts = [];
        lassoCtx.clearRect(0, 0, W, H);
      }
    }
  }

  function onPointerMove(pos) {
    if (phase !== 'cut') return;

    if (lassoState === 'drawing') {
      var last = pts[pts.length - 1];
      if (Math.hypot(pos.x - last.x, pos.y - last.y) > 4) {
        pts.push(pos);
        renderLasso();
        if (pts.length > 15) {
          var distToStart = Math.hypot(pts[0].x - pos.x, pts[0].y - pos.y);
          if (distToStart < CLOSE_RADIUS) {
            renderCloseRing();
          }
        }
      }
      return;
    }

    if (lassoState === 'paused') {
      renderLasso();
      renderPauseIndicator(pos);
    }
  }

  function onPointerUp(pos) {
    if (lassoState !== 'drawing') return;
    if (pts.length > 15 && pos &&
        Math.hypot(pts[0].x - pos.x, pts[0].y - pos.y) < CLOSE_RADIUS) {
      doCut();
      return;
    }
    if (pts.length < 3) {
      lassoState = 'idle';
      pts = [];
      lassoCtx.clearRect(0, 0, W, H);
    } else {
      lassoState = 'paused';
      renderLasso();
      renderPauseIndicator(null);
    }
  }

  function onCancel() {
    if (lassoState === 'idle') return;
    lassoState = 'idle';
    pts = [];
    lassoCtx.clearRect(0, 0, W, H);
  }

  // ── Mouse events ─────────────────────────────────────────────
  lassoCanvas.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    onPointerDown(getXY(e));
  });
  lassoCanvas.addEventListener('mousemove', function (e) {
    onPointerMove(getXY(e));
  });
  lassoCanvas.addEventListener('mouseup', function (e) {
    onPointerUp(getXY(e));
  });
  lassoCanvas.addEventListener('mouseleave', function () {
    onCancel();
  });
  lassoCanvas.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    onCancel();
  });

  // ── Touch events ─────────────────────────────────────────────
  lassoCanvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    onPointerDown(getXY(e));
  }, { passive: false });

  lassoCanvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    onPointerMove(getXY(e));
  }, { passive: false });

  lassoCanvas.addEventListener('touchend', function (e) {
    e.preventDefault();
    onPointerUp(getTouchEndXY(e));
  }, { passive: false });

  // ── Drag (scrapbook stickers) ───────────────────────────────
  var dragEl = null, dragOX = 0, dragOY = 0;

  function onDragStart(e) {
    if (phase !== 'scrapbook') return;
    var target = e.target.closest
      ? e.target.closest('#hero-sticker-float, .hero-sticker')
      : null;
    if (!target) return;
    e.preventDefault();
    dragEl = target;
    var cr = heroDemo.getBoundingClientRect();
    var tr = target.getBoundingClientRect();
    var src = e.touches ? e.touches[0] : e;
    dragOX = src.clientX - tr.left;
    dragOY = src.clientY - tr.top;
    target.style.zIndex = '55';
    target.style.cursor = 'grabbing';
    target.style.transition = 'none';
  }

  function onDragMove(e) {
    if (!dragEl) return;
    e.preventDefault();
    var cr = heroDemo.getBoundingClientRect();
    var src = e.touches ? e.touches[0] : e;
    dragEl.style.left = (src.clientX - cr.left - dragOX) + 'px';
    dragEl.style.top = (src.clientY - cr.top - dragOY) + 'px';
  }

  function onDragEnd() {
    if (!dragEl) return;
    dragEl.style.cursor = 'grab';
    dragEl.style.zIndex = '';
    dragEl = null;
  }

  heroDemo.addEventListener('mousedown', onDragStart);
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
  heroDemo.addEventListener('touchstart', onDragStart, { passive: false });
  document.addEventListener('touchmove', onDragMove, { passive: false });
  document.addEventListener('touchend', onDragEnd);

  // ── Cut Again ───────────────────────────────────────────────
  document.getElementById('hero-cut-again')
    .addEventListener('click', function () {
      if (phase !== 'scrapbook') return;
      var btn = document.getElementById('hero-cut-again');
      btn.style.opacity = '0';
      btn.style.pointerEvents = 'none';

      var hfi = document.getElementById('hero-sticker-float');
      var hs1 = document.getElementById('hero-scene-cut');
      var hs2 = document.getElementById('hero-scene-scrapbook');
      var hsov = document.getElementById('hero-sticker-overlay');

      // 提交当前用户贴纸为永久贴纸（保留在 sticker overlay 内）
      if (hfi && hfi.style.display !== 'none') {
        var cr = heroDemo.getBoundingClientRect();
        var fr = hfi.getBoundingClientRect();
        var img = document.createElement('img');
        img.src = hfi.dataset.src;
        img.style.cssText = 'position:absolute;cursor:grab;display:block;'
          + 'left:' + Math.round(fr.left - cr.left) + 'px;'
          + 'top:' + Math.round(fr.top - cr.top) + 'px;'
          + 'width:' + hfi.offsetWidth + 'px;'
          + 'height:' + hfi.offsetHeight + 'px;';
        img.className = 'hero-sticker';
        hsov.appendChild(img);
        hfi.style.display = 'none';
      }

      // 剪贴本场景淡出，贴纸 overlay 淡出
      hs2.style.opacity = '0';
      hs2.style.pointerEvents = 'none';
      hsov.style.opacity = '0';
      hsov.style.pointerEvents = 'none';

      // 场景一淡入并重置状态
      setTimeout(function () {
        hs1.style.opacity = '1';
        hs1.style.pointerEvents = 'auto';
        hs2.style.transform = 'translateY(100%)';

        // 重置动效纸（opacity 与位移都回到初始，保证下次插入动效可循环）
        STICKER_DEFS.forEach(function (cfg) {
          if (cfg.anim && papers[cfg.id]) {
            papers[cfg.id].style.opacity = '0';
            papers[cfg.id].style.transition = 'none';
            papers[cfg.id].style.transform = cfg.anim === 'X'
              ? 'translateX(' + cfg.from + 'px)'
              : 'translateY(' + cfg.from + 'px)';
          }
        });

        // 重置 lasso 状态
        lassoState = 'idle';
        pts = [];
        lassoCtx.clearRect(0, 0, W, H);

        // 重绘背景
        bgCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
        bgCtx.drawImage(heroImage, 0, 0, W, H);

        // 提示文字重置
        instructionHidden = false;
        var inst = document.getElementById('hero-instruction');
        if (inst) {
          inst.style.opacity = '1';
          inst.style.animation = 'hero-hint 3s ease-in-out infinite';
        }
        phase = 'cut';
      }, 450);
    });

  // ── Init ─────────────────────────────────────────────────────
  heroImage.onload = function () {
    initCanvases();
    initScrapbook();
    var ro = new ResizeObserver(function () { initCanvases(); });
    ro.observe(heroDemo);
  };
  heroImage.onerror = function () {
    console.warn('[Whimcut] hero-cut-scene.png not found');
  };
})();
