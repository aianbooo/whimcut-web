(function () {
  'use strict';

  if (!window.gsap || !window.MotionPathPlugin) return;
  gsap.registerPlugin(window.MotionPathPlugin);

  var stage = document.querySelector('.cut-stage');
  if (!stage) return;

  var cursor   = stage.querySelector('.cut-cursor');
  var wrap     = stage.querySelector('.cut-sticker-wrap');
  var dashPath = stage.querySelector('.cut-dash-path');
  var maskLine = stage.querySelector('.cut-path-mask-line');
  var pathSvg  = stage.querySelector('.cut-path-svg');

  if (!cursor || !wrap || !dashPath || !pathSvg) return;

  var holdTimer = null;

  // 准备虚线「描边生成」遮罩：先整段隐藏，随后跟随光标同步揭示
  var length = dashPath.getTotalLength();
  if (maskLine) {
    gsap.set(maskLine, { strokeDasharray: length, strokeDashoffset: length });
  }

  // 光标初始停留在路径起点并隐藏
  var startPt = dashPath.getPointAtLength(0);
  gsap.set(cursor, { x: startPt.x, y: startPt.y, opacity: 0, transformOrigin: '0 0' });

  // 重置贴纸：移除 .is-cutout（scale/rotate 随 base 过渡平滑归位）
  function resetSticker() {
    wrap.classList.remove('is-cutout');
  }

  // 拟人化变速缓动：起点较缓切入 → 拐弯处放慢 → 直线段快速 → 闭合前微停放慢
  function handEase(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    var keyframes = [
      [0.00, 0.00],
      [0.20, 0.24],
      [0.50, 0.50],
      [0.85, 0.96],
      [1.00, 1.00]
    ];
    for (var i = 0; i < keyframes.length - 1; i++) {
      var a = keyframes[i];
      var b = keyframes[i + 1];
      if (t >= a[0] && t <= b[0]) {
        var k = (t - a[0]) / (b[0] - a[0]);
        return a[1] + k * (b[1] - a[1]);
      }
    }
    return 1;
  }

  var tl = gsap.timeline({
    paused: true,
    repeat: -1,
    repeatDelay: 0.8,
    defaults: { ease: 'sine.inOut' }
  });

  // 1. 光标显现（起点处浮现）
  tl.to(cursor, { opacity: 1, duration: 0.35, ease: 'power1.out' }, 0);

  // 2. 拟人化变速描边：光标沿外扩路径时快时慢移动，虚线同步生成（0.4x 速度 = 6.25s）
  tl.to(cursor, {
    motionPath: { path: dashPath, alignOrigin: [0, 0] },
    duration: 6.25,
    ease: handEase
  }, 0.25);
  if (maskLine) {
    tl.to(maskLine, { strokeDashoffset: 0, duration: 6.25, ease: handEase }, 0.25);
  }

  // 3. 路径闭合：光标回到首尾相接点（留 0.15s 停顿）

  // 4. 闭合瞬间：虚线淡出隐藏 + 光标淡出 + 贴纸翘起（触发 .is-cutout）
  tl.to(pathSvg, { opacity: 0, duration: 0.4, ease: 'power1.inOut' }, 6.5);
  tl.add(function () { wrap.classList.add('is-cutout'); }, 6.65);
  tl.to(cursor, { opacity: 0, duration: 0.3, ease: 'power1.in' }, 6.65);

  // 5. 单轮结束：重置贴纸（虚线/光标/遮罩等 tween 状态由 repeat 自动归位）
  tl.add(resetSticker, 7.4);

  // 滚动触发：进入视口 30% 且持续停留 1 秒才播放；滑走则取消定时器并暂停重置
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        if (holdTimer || tl.isActive()) return;
        holdTimer = setTimeout(function () {
          holdTimer = null;
          tl.play(0);
        }, 1000);
      } else {
        if (holdTimer) {
          clearTimeout(holdTimer);
          holdTimer = null;
        }
        resetSticker();
        tl.pause(0);
      }
    });
  }, { threshold: 0.3 });

  observer.observe(stage);
})();
