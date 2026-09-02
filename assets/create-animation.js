(function () {
  'use strict';

  if (!window.gsap) return;

  var stage  = document.querySelector('.create-stage');
  if (!stage) return;

  var canvas   = stage.querySelector('.create-canvas');
  var cursor   = stage.querySelector('.create-cursor');
  var vase     = stage.querySelector('.item-vase');
  var yellow   = stage.querySelector('.item-yellow-1');
  var red      = stage.querySelector('.item-red');
  var purple   = stage.querySelector('.item-purple');
  var yellow2  = stage.querySelector('.item-yellow-2');
  var box      = stage.querySelector('.bounding-box');
  var copyBtn  = stage.querySelector('.btn-copy');
  var layerBtn = stage.querySelector('.btn-layer');
  var saveBtn  = stage.querySelector('.btn-save');

  if (!canvas || !cursor || !vase || !yellow || !red || !purple || !yellow2 || !box || !copyBtn || !layerBtn || !saveBtn) return;

  // 光标基准位置（CSS 中的 left/top：画布右下角之外）
  var BASE_X = 442;
  var BASE_Y = 326;

  // 光标尖端关键点（stage 绝对坐标）
  var P = {
    // 步骤 2：拖拽组装
    vaseGrab:    { x: 365, y: 181 },     // 花瓶顶部中心
    vaseDrop:    { x: 270, y: 178 },     // 花瓶落定后顶部中心
    yellowGrab:  { x: 177, y: 114 },     // 黄花中心
    yellowDrop:  { x: 233, y: 166 },     // 黄花落定中心（瓶口上方）
    redGrab:     { x: 197, y: 219.5 },   // 红花中心
    redDrop:     { x: 265, y: 173.5 },   // 红花落定中心（瓶口偏右前）
    // 步骤 3：选中 / 复制 / 旋转 / 缩放
    yellowSel:   { x: 233, y: 166 },     // 选中黄花：其落定中心
    copyBtn:     { x: 35,  y: 74  },     // Copy 按钮中心
    yellow2Sel:  { x: 293, y: 169 },     // 选中新黄花：其中心
    rotStart:    { x: 293, y: 123 },     // 旋转手柄起点（黄花上方）
    rotEnd:      { x: 325, y: 136 },     // 旋转手柄终点（45°顺时针后）
    scaleStart:  { x: 333, y: 170 },     // 右上角手柄（旋转后位置）
    scaleEnd:    { x: 321, y: 169 },     // 右上角手柄（0.7 缩放后）
    // 步骤 4：图层调换
    vaseSel:     { x: 270, y: 240 },     // 点击花瓶：其中心
    layerBtn:    { x: 66,  y: 74  },     // Layer 按钮中心
    // 步骤 5：最终微调拖拽
    purpleGrab:  { x: 333, y: 122.5 },   // 紫色花中心
    purpleDrop:  { x: 270, y: 140 },     // 紫色花落点：瓶口中上方
    // 步骤 6：保存
    saveBtn:     { x: 51,  y: 210 }      // Save 按钮中心
  };

  // 素材目标位移（相对其 base left/top）
  var D = {
    vase:   { x: -95, y: -3 },          // -> 画布中下方中央
    yellow: { x:  56, y: 52 },          // -> 瓶口上方中心
    red:    { x:  68, y: -46 }          // -> 瓶口偏右前
  };

  // 复制偏移量（yellow2 相对黄花组装后位置）
  var COPY_DX = 60;
  var COPY_DY = 3;

  // 步骤 5 微调落点
  var T5 = {
    purple: { x: -63, y: 17.5 }         // 紫色花 -> 花束最顶部中心
  };

  // 关键点 -> 相对光标基准的偏移
  function off(p) {
    return { x: p.x - BASE_X, y: p.y - BASE_Y };
  }
  var G = {};
  for (var k in P) {
    G[k] = off(P[k]);
  }

  function resetState() {
    copyBtn.classList.remove('is-active');
    layerBtn.classList.remove('is-active');
    saveBtn.classList.remove('is-active');
    saveBtn.textContent = 'Save';
    canvas.classList.remove('is-layered');
  }

  var tl = gsap.timeline({
    paused: true,
    repeat: -1,
    repeatDelay: 1.5
  });

  // 每轮开始复位（也用于离开视口 pause(0) 时归位）
  tl.set(cursor, { x: 0, y: 0, scale: 1, opacity: 0, transformOrigin: '0 0' }, 0);
  tl.set([vase, yellow, red, purple], { x: 0, y: 0 }, 0);
  tl.set(yellow2, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 0 }, 0);
  tl.set(box, { x: 0, y: 0, width: 58, height: 56, rotation: 0, scale: 1, opacity: 0 }, 0);
  tl.add(resetState, 0);

  // ==================== 步骤 2：拖拽组装 ====================
  // ---- 动作 1：拖拽花瓶至画布中央 ----
  tl.to(cursor, { opacity: 1, x: G.vaseGrab.x, y: G.vaseGrab.y, duration: 0.6, ease: 'power2.inOut' }, 0);
  tl.to(cursor, { scale: 0.9, duration: 0.12, ease: 'power1.in' }, 0.6);
  tl.to(cursor, { x: G.vaseDrop.x, y: G.vaseDrop.y, duration: 0.6, ease: 'power2.inOut' }, 0.72);
  tl.to(vase,   { x: D.vase.x,     y: D.vase.y,     duration: 0.6, ease: 'power2.inOut' }, 0.72);
  tl.to(cursor, { scale: 1, duration: 0.12, ease: 'power1.out' }, 1.32);

  // ---- 动作 2：拖拽黄色大花至花瓶上方 ----
  tl.to(cursor, { x: G.yellowGrab.x, y: G.yellowGrab.y, duration: 0.55, ease: 'power2.inOut' }, 1.44);
  tl.to(cursor, { scale: 0.9, duration: 0.12, ease: 'power1.in' }, 1.99);
  tl.to(cursor, { x: G.yellowDrop.x, y: G.yellowDrop.y, duration: 0.6, ease: 'power2.inOut' }, 2.11);
  tl.to(yellow, { x: D.yellow.x,     y: D.yellow.y,     duration: 0.6, ease: 'power2.inOut' }, 2.11);
  tl.to(cursor, { scale: 1, duration: 0.12, ease: 'power1.out' }, 2.71);

  // ---- 动作 3：拖拽红色小花至花瓶上方 ----
  tl.to(cursor, { x: G.redGrab.x, y: G.redGrab.y, duration: 0.55, ease: 'power2.inOut' }, 2.83);
  tl.to(cursor, { scale: 0.9, duration: 0.12, ease: 'power1.in' }, 3.38);
  tl.to(cursor, { x: G.redDrop.x, y: G.redDrop.y, duration: 0.6, ease: 'power2.inOut' }, 3.50);
  tl.to(red,    { x: D.red.x,     y: D.red.y,     duration: 0.6, ease: 'power2.inOut' }, 3.50);
  tl.to(cursor, { scale: 1, duration: 0.12, ease: 'power1.out' }, 4.10);

  // ==================== 步骤 3：选中 / 复制 / 旋转 / 缩放 ====================
  // ---- 1. 选中大黄花：光标点击，选中框瞬间显示并对齐 ----
  tl.to(cursor, { x: G.yellowSel.x, y: G.yellowSel.y, duration: 0.45, ease: 'power2.inOut' }, 4.40);
  tl.to(cursor, { scale: 0.9, duration: 0.12, ease: 'power1.in' }, 4.85);
  tl.set(box, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 }, 4.85);
  tl.to(cursor, { scale: 1, duration: 0.12, ease: 'power1.out' }, 4.97);

  // ---- 2. 点击 Copy 按钮：反色高亮 0.2s，画布生成第二朵黄花 ----
  tl.to(cursor, { x: G.copyBtn.x, y: G.copyBtn.y, duration: 0.5, ease: 'power2.inOut' }, 5.15);
  tl.to(cursor, { scale: 0.9, duration: 0.12, ease: 'power1.in' }, 5.65);
  tl.add(function () { copyBtn.classList.add('is-active'); }, 5.65);
  tl.add(function () { copyBtn.classList.remove('is-active'); }, 5.85);
  tl.to(cursor, { scale: 1, duration: 0.12, ease: 'power1.out' }, 5.77);
  tl.to(yellow2, { x: COPY_DX, y: COPY_DY, opacity: 1, duration: 0.25, ease: 'power1.out' }, 5.85);

  // ---- 3. 选中新黄花：光标点击，选中框从大黄花消失后在小黄花上出现 ----
  tl.to(cursor, { x: G.yellow2Sel.x, y: G.yellow2Sel.y, duration: 0.45, ease: 'power2.inOut' }, 6.25);
  tl.to(cursor, { scale: 0.9, duration: 0.12, ease: 'power1.in' }, 6.70);
  tl.to(box, { opacity: 0, duration: 0.15, ease: 'power1.in' }, 6.70);
  tl.set(box, { x: COPY_DX, y: COPY_DY }, 6.85);
  tl.to(box, { opacity: 1, duration: 0.15, ease: 'power1.out' }, 6.85);
  tl.to(cursor, { scale: 1, duration: 0.12, ease: 'power1.out' }, 6.82);

  // ---- 4. 旋转 45°：光标到旋转手柄，按下顺时针拖 ----
  tl.to(cursor, { x: G.rotStart.x, y: G.rotStart.y, duration: 0.4, ease: 'power2.inOut' }, 7.05);
  tl.to(cursor, { scale: 0.9, duration: 0.12, ease: 'power1.in' }, 7.45);
  tl.to(cursor, { x: G.rotEnd.x, y: G.rotEnd.y, duration: 0.7, ease: 'power2.inOut' }, 7.57);
  tl.to([yellow2, box], { rotation: 45, duration: 0.7, ease: 'power2.inOut' }, 7.57);
  tl.to(cursor, { scale: 1, duration: 0.12, ease: 'power1.out' }, 8.27);

  // ---- 5. 缩小至 70%：光标到右上角手柄，按下向内拖 ----
  tl.to(cursor, { x: G.scaleStart.x, y: G.scaleStart.y, duration: 0.35, ease: 'power2.inOut' }, 8.39);
  tl.to(cursor, { scale: 0.9, duration: 0.12, ease: 'power1.in' }, 8.74);
  tl.to(cursor, { x: G.scaleEnd.x, y: G.scaleEnd.y, duration: 0.6, ease: 'power2.inOut' }, 8.86);
  tl.to([yellow2, box], { scale: 0.7, duration: 0.6, ease: 'power2.inOut' }, 8.86);
  tl.to(cursor, { scale: 1, duration: 0.12, ease: 'power1.out' }, 9.46);

  // ---- 6. 完成：选中框与光标淡出 ----
  tl.to(box, { opacity: 0, duration: 0.35, ease: 'power1.in' }, 9.58);
  tl.to(cursor, { opacity: 0, duration: 0.3, ease: 'power1.in' }, 9.93);

  // ==================== 步骤 4：图层调换 ====================
  // ---- 光标点击花瓶 ----
  tl.to(cursor, { opacity: 1, x: G.vaseSel.x, y: G.vaseSel.y, duration: 0.5, ease: 'power2.inOut' }, 10.35);
  tl.to(cursor, { scale: 0.9, duration: 0.12, ease: 'power1.in' }, 10.85);
  tl.set(box, { x: 21, y: 40, width: 90, height: 123, rotation: 0, scale: 1, opacity: 1 }, 10.85);
  tl.to(cursor, { scale: 1, duration: 0.12, ease: 'power1.out' }, 10.97);
  // ---- 光标点击 Layer 按钮：反色 0.2s + 花瓶下沉 ----
  tl.to(cursor, { x: G.layerBtn.x, y: G.layerBtn.y, duration: 0.5, ease: 'power2.inOut' }, 11.09);
  tl.to(cursor, { scale: 0.9, duration: 0.12, ease: 'power1.in' }, 11.59);
  tl.add(function () {
    layerBtn.classList.add('is-active');
    canvas.classList.add('is-layered');
  }, 11.59);
  tl.add(function () { layerBtn.classList.remove('is-active'); }, 11.79);
  tl.to(cursor, { scale: 1, duration: 0.12, ease: 'power1.out' }, 11.71);

  // ==================== 步骤 5：最终微调拖拽 ====================
  // ---- 拖拽紫色花至花束最顶部中心 ----
  tl.to(box, { opacity: 0, duration: 0.3, ease: 'power1.in' }, 11.95);
  tl.to(cursor, { x: G.purpleGrab.x, y: G.purpleGrab.y, duration: 0.5, ease: 'power2.inOut' }, 11.95);
  tl.to(cursor, { scale: 0.9, duration: 0.12, ease: 'power1.in' }, 12.45);
  tl.to(cursor, { x: G.purpleDrop.x, y: G.purpleDrop.y, duration: 0.7, ease: 'power2.inOut' }, 12.57);
  tl.to(purple, { x: T5.purple.x,   y: T5.purple.y,   duration: 0.7, ease: 'power2.inOut' }, 12.57);
  tl.to(cursor, { scale: 1, duration: 0.12, ease: 'power1.out' }, 13.27);

  // 插花完成，光标移开
  tl.to(cursor, { opacity: 0, duration: 0.3, ease: 'power1.in' }, 13.39);

  // ==================== 步骤 6：保存与循环 ====================
  // 作品静止 1.0 秒（13.69 -> 14.69 留白）
  // ---- 点击 Save：高亮 + 文案更新为 ✓ Saved ----
  tl.to(cursor, { opacity: 1, x: G.saveBtn.x, y: G.saveBtn.y, duration: 0.5, ease: 'power2.inOut' }, 14.69);
  tl.to(cursor, { scale: 0.9, duration: 0.12, ease: 'power1.in' }, 15.19);
  tl.add(function () {
    saveBtn.classList.add('is-active');
    saveBtn.textContent = '✓ Saved';
  }, 15.19);
  tl.to(cursor, { scale: 1, duration: 0.12, ease: 'power1.out' }, 15.31);

  // 保存完成状态停留 1.5 秒（15.31 -> 16.81 留白），随后光标淡出
  tl.to(cursor, { opacity: 0, duration: 0.3, ease: 'power1.in' }, 16.81);

  var holdTimer = null;

  // 进入视口 1 秒后播放；离开视口立即复位暂停
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
        resetState();
        tl.pause(0);
      }
    });
  }, { threshold: 0.3 });

  observer.observe(stage);
})();
