/**
 * 鼠标点击特效：烟花
 * 点击页面任意处，在光标位置炸开一团彩色烟花（带拖尾、重力、渐隐）。
 * 动画结束后自动停止渲染，不常驻占用性能；适配 Butterfly 的 pjax 翻页。
 */
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 每朵烟花随机选一个主色系
  var PALETTES = [
    ['#ffd166', '#ffb703', '#ffe29a', '#fff3c4'],          // 金黄
    ['#ff6b9d', '#ff9ec7', '#ffc2d8', '#ffe3ee'],          // 粉
    ['#6ec6ff', '#9ad9ff', '#4facfe', '#d6f0ff'],          // 冰蓝
    ['#b388ff', '#d0bfff', '#8e6bff', '#e9ddff'],          // 紫
    ['#7bffb2', '#b6ffd3', '#3ddc84', '#e2fff0'],          // 青绿
    ['#ff8a5c', '#ffb28a', '#ff6b35', '#ffe0d1']           // 橙红
  ];

  var canvas = document.createElement('canvas');
  canvas.id = 'click-firework-canvas';
  canvas.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:99999;';
  var ctx = canvas.getContext('2d');
  var parts = [];
  var running = false;

  function ensure() {
    if (!canvas.isConnected) document.body.appendChild(canvas);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = canvas.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || window.innerHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function rand(a, b) { return a + Math.random() * (b - a); }

  function burst(x, y) {
    var pal = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    var count = 46 + Math.floor(Math.random() * 26);
    var baseSpeed = rand(3.2, 5.2);
    var i, ang, sp;

    // 中心闪光
    parts.push({
      type: 'flash', x: x, y: y, r: 2, life: 1,
      color: pal[2], decay: 0.09
    });

    for (i = 0; i < count; i++) {
      ang = (Math.PI * 2 * i) / count + rand(-0.08, 0.08);
      sp = baseSpeed * rand(0.45, 1.15);
      parts.push({
        type: 'spark',
        x: x, y: y, px: x, py: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        size: rand(1.4, 2.6),
        color: pal[Math.floor(Math.random() * pal.length)],
        life: 1,
        decay: rand(0.010, 0.020),
        drag: rand(0.972, 0.988)
      });
    }

    // 几颗缓慢飘落的余烬
    for (i = 0; i < 10; i++) {
      ang = Math.random() * Math.PI * 2;
      sp = rand(0.6, 1.8);
      parts.push({
        type: 'spark',
        x: x, y: y, px: x, py: y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - rand(0.2, 1),
        size: rand(1, 1.8),
        color: pal[3],
        life: 1,
        decay: rand(0.006, 0.012),
        drag: 0.995
      });
    }

    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  }

  function tick() {
    ensure();
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.globalCompositeOperation = 'lighter';
    var alive = false;

    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.life <= 0) continue;
      alive = true;

      if (p.type === 'flash') {
        p.life -= p.decay;
        p.r += 2.2;
        ctx.globalAlpha = Math.max(p.life, 0) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        continue;
      }

      p.px = p.x; p.py = p.y;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.075;           // 重力
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.life -= p.decay;

      var a = Math.max(p.life, 0);
      // 拖尾：由上一位置画到当前位置
      ctx.globalAlpha = a * 0.55;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * 0.9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.px, p.py);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    if (alive) requestAnimationFrame(tick);
    else {
      parts = [];
      running = false;
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    }
  }

  function onClick(e) {
    ensure();
    burst(e.clientX, e.clientY);
  }

  document.addEventListener('pointerdown', onClick, { passive: true });
  document.addEventListener('pjax:complete', ensure);
})();
