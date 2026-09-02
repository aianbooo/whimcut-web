(function () {
  'use strict';

  if (!window.gsap) return;

  var stage = document.querySelector('.collect-stage');
  if (!stage) return;

  var flower    = stage.querySelector('.item-flower');
  var triangle  = stage.querySelector('.item-1');
  var square    = stage.querySelector('.item-2');
  var bars      = stage.querySelector('.item-3');
  var circle    = stage.querySelector('.item-4');
  var rtriangle = stage.querySelector('.item-5');
  var squircle  = stage.querySelector('.item-6');
  var cursor    = stage.querySelector('.collect-cursor');

  if (!flower || !triangle || !square || !bars || !circle || !rtriangle || !squircle || !cursor) return;

  // 网格步长：列宽 80 + 列间距 56 = 136；行高 80 + 行间距 32 = 112
  var COL = 136;
  var ROW = 112;

  // 光标尖端落点：第一排图形中心偏上（指向花心/图形内部，不再贴顶边）
  var TIP_Y  = 130;  // 中心 y=138，偏上 8px
  var F_X    = 86;   // 花朵中心 x
  var T_X    = 222;  // 正三角形（级联后）中心 x
  var S_X    = 358;  // 圆角矩形（级联后）中心 x
  var REST_X = 400;  // 右下角停靠 x
  var REST_Y = 300;  // 右下角停靠 y
  var FLOAT  = -6;   // 悬停上浮量

  var items = [triangle, square, bars, circle, rtriangle, squircle];

  // 初始状态：花朵左侧窗口外、光标右下角（均隐藏）
  gsap.set(flower, { x: -160, y: -16, opacity: 0, scale: 0.8 });
  gsap.set(cursor, { x: REST_X, y: REST_Y, opacity: 0 });

  var holdTimer = null;

  var tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 1.5 });

  // 每轮循环开始前复位（也用于离开视口 pause(0) 时归位，避免级联位移残留）
  tl.set(flower, { x: -160, y: -16, opacity: 0, scale: 0.8 }, 0);
  tl.set(items,  { x: 0, y: 0, opacity: 1 }, 0);
  tl.set(cursor, { x: REST_X, y: REST_Y, opacity: 0 }, 0);

  // 阶段一：花朵优雅划入第 1 格
  // 透明度先快速到位（避免半透明穿过左侧黑框露底），位移与缩放再用 back.out 划入
  tl.to(flower, { opacity: 1, duration: 0.15, ease: 'power1.out' }, 0);
  tl.to(flower, {
    x: 0, y: 0, scale: 1,
    duration: 1.0, ease: 'back.out(0.7)'
  }, 0);

  // 阶段二：Launchpad 磁吸流体级联让位
  var offsets = [
    { x: COL,      y: 0,   opacity: 1 },   // 1 -> 2
    { x: COL,      y: 0,   opacity: 1 },   // 2 -> 3
    { x: -2 * COL, y: ROW, opacity: 1 },   // 3 -> 4（左下）
    { x: COL,      y: 0,   opacity: 1 },   // 4 -> 5
    { x: COL,      y: 0,   opacity: 1 },   // 5 -> 6
    { x: 80,       y: 0,   opacity: 0 }    // 6 淡出
  ];

  tl.to(items, {
    x: function (i) { return offsets[i].x; },
    y: function (i) { return offsets[i].y; },
    opacity: function (i) { return offsets[i].opacity; },
    duration: 0.9,
    ease: 'back.out(0.7)',
    stagger: { amount: 0.25, ease: 'power1.out' }
  }, '<0.2');

  // 阶段三：光标横扫第一排（花朵 -> 正三角形 -> 圆角矩形），逐个上浮落回
  // 3.1 光标从右下角划入花朵
  tl.to(cursor, { opacity: 1, x: F_X, y: TIP_Y, duration: 0.6, ease: 'power2.inOut' }, 1.6);
  // 3.2 花朵上浮
  tl.to(flower, { y: FLOAT, duration: 0.25, ease: 'power2.out' }, 2.2);
  // 3.3 光标移向正三角形，花朵落回
  tl.to(cursor, { x: T_X, duration: 0.45, ease: 'power2.inOut' }, 2.75);
  tl.to(flower, { y: 0, duration: 0.25, ease: 'power2.inOut' }, 2.75);
  // 3.4 三角形上浮
  tl.to(triangle, { y: FLOAT, duration: 0.25, ease: 'power2.out' }, 3.2);
  // 3.5 光标移向圆角矩形，三角形落回
  tl.to(cursor, { x: S_X, duration: 0.45, ease: 'power2.inOut' }, 3.75);
  tl.to(triangle, { y: 0, duration: 0.25, ease: 'power2.inOut' }, 3.75);
  // 3.6 圆角矩形上浮
  tl.to(square, { y: FLOAT, duration: 0.25, ease: 'power2.out' }, 4.2);
  // 3.7 光标向右下角淡出，圆角矩形落回
  tl.to(cursor, { opacity: 0, x: REST_X, y: REST_Y, duration: 0.5, ease: 'power2.inOut' }, 4.75);
  tl.to(square, { y: 0, duration: 0.25, ease: 'power2.inOut' }, 4.75);

  function reset() {
    tl.pause(0);
  }

  // 进入视口 1 秒后播放；离开视口立即重置
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
        reset();
      }
    });
  }, { threshold: 0.3 });

  observer.observe(stage);
})();
