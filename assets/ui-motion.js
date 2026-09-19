/* =============================================================
   xzd1314.top — 动效增强脚本 (drop-in)
   用法：在 home.html </body> 前引入
   <script src="/assets/ui-motion.js" defer></script>
   依赖 ui-upgrade.css 中的 --i / --p / --mx / --my 变量。
   全部特性在 prefers-reduced-motion: reduce 下自动关闭。
   ============================================================= */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var coarse = window.matchMedia('(pointer: coarse)');
  function motionOK() { return !reduce.matches; }

  /* ---------- 1. 3D 倾斜 + Spotlight：同一 pointermove 同时驱动两者 ---------- */
  // --rx / --ry 由 CSS 用于 rotateX/rotateY
  // --mx / --my 由 CSS 用于 spotlight 径向渐变定位
  function initTilt() {
    if (coarse.matches || !motionOK()) return;
    var SEL = '.skill-card, .link-card, .project-item, .project-cover';

    function onMove(e) {
      var el = e.currentTarget;
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;

      // 倾斜强度：横向的项目条目用得小一些，方块卡片用大一些
      var max = el.dataset.tilt ? parseFloat(el.dataset.tilt)
              : (el.classList.contains('project-item') ? 14 : 24);
      // 与站点原来的 3D Card Hover 同向：鼠标在上方 → 上沿后仰；在右侧 → 右沿后仰
      var rx = (0.5 - py) * max;
      var ry = (px - 0.5) * max;
      el.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      el.style.setProperty('--ry', ry.toFixed(2) + 'deg');

      el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    }
    function onLeave(e) {
      var el = e.currentTarget;
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    }

    document.querySelectorAll(SEL).forEach(function (el) {
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerleave', onLeave);
    });
  }

  /* ---------- 2. Stagger：自动给同组元素编号 --i ---------- */
  function initStagger() {
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      var step = parseInt(group.dataset.stagger, 10) || 70;
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.style.setProperty('--i', i);
        child.style.transitionDelay = (i * step) + 'ms';
      });
    });
  }

  /* ---------- 3. Parallax：滚动视差，rAF 节流 ---------- */
  function initParallax() {
    var items = document.querySelectorAll('[data-parallax]');
    if (!items.length) return;
    var ticking = false;

    function update() {
      ticking = false;
      var vh = window.innerHeight;
      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        // 元素中心相对视口中心的归一化位置：-1(下) ~ 1(上)
        var p = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.setProperty('--p', p.toFixed(4));
      });
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
  }

  /* ---------- 4. Magnetic：磁吸按钮 ---------- */
  function initMagnetic() {
    if (coarse.matches) return;
    document.querySelectorAll('.magnetic').forEach(function (el) {
      var strength = parseFloat(el.dataset.magnetic) || 0.28;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var tx = (e.clientX - (r.left + r.width / 2)) * strength;
        var ty = (e.clientY - (r.top + r.height / 2)) * strength;
        // 限幅，避免位移过大
        tx = Math.max(-14, Math.min(14, tx));
        ty = Math.max(-10, Math.min(10, ty));
        el.style.setProperty('--tx', tx.toFixed(2) + 'px');
        el.style.setProperty('--ty', ty.toFixed(2) + 'px');
        el.classList.add('is-pulling');
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--tx', '0px');
        el.style.setProperty('--ty', '0px');
        el.classList.remove('is-pulling');
      });
    });
  }

  /* ---------- 5. Ripple：按钮按压水波 ---------- */
  function initRipple() {
    document.querySelectorAll('.ripple').forEach(function (btn) {
      btn.style.position = btn.style.position || 'relative';
      btn.style.overflow = 'hidden';
      btn.addEventListener('pointerdown', function (e) {
        var r = btn.getBoundingClientRect();
        var d = Math.max(r.width, r.height) * 2;
        var s = document.createElement('span');
        s.style.cssText =
          'position:absolute;border-radius:50%;pointer-events:none;' +
          'left:' + (e.clientX - r.left - d / 2) + 'px;' +
          'top:' + (e.clientY - r.top - d / 2) + 'px;' +
          'width:' + d + 'px;height:' + d + 'px;' +
          'background:currentColor;opacity:.22;transform:scale(0);' +
          'transition:transform 520ms cubic-bezier(.22,1,.36,1),opacity 620ms ease;';
        btn.appendChild(s);
        requestAnimationFrame(function () {
          s.style.transform = 'scale(1)';
          s.style.opacity = '0';
        });
        setTimeout(function () { s.remove(); }, 700);
      });
    });
  }

  /* ---------- 6. 导航：向下滚隐藏 / 向上滚显现 ---------- */
  function initNavHide() {
    var nav = document.getElementById('nav');
    if (!nav) return;
    var last = window.scrollY, ticking = false;
    function update() {
      ticking = false;
      var y = window.scrollY;
      if (y < 120) { nav.classList.remove('hide'); }
      else if (y > last + 6) { nav.classList.add('hide'); }
      else if (y < last - 6) { nav.classList.remove('hide'); }
      last = y;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
  }

  /* ---------- 7. 主题切换：View Transitions 圆形扩散 ---------- */
  function initThemeTransition() {
    var btn = document.getElementById('themeBtn');
    if (!btn || !document.startViewTransition) return;
    var replaying = false;

    btn.addEventListener('click', function (e) {
      if (replaying || !motionOK()) return;
      e.preventDefault();
      e.stopPropagation();

      var r = btn.getBoundingClientRect();
      var root = document.documentElement;
      root.style.setProperty('--vt-x', (r.left + r.width / 2) + 'px');
      root.style.setProperty('--vt-y', (r.top + r.height / 2) + 'px');
      root.classList.add('vt-theme');

      var t = document.startViewTransition(function () {
        replaying = true;
        btn.dispatchEvent(new MouseEvent('click', { bubbles: false, cancelable: true }));
        replaying = false;
      });
      t.finished.finally(function () { root.classList.remove('vt-theme'); });
    }, true);
  }

  /* ---------- 8. 数字滚动计数 ---------- */
  function countUp(el, to, dur) {
    if (!motionOK()) { el.textContent = to.toLocaleString(); return; }
    dur = dur || 1100;
    var from = parseInt(String(el.textContent).replace(/[^\d]/g, ''), 10) || 0;
    var start = performance.now();
    function frame(now) {
      var t = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      el.textContent = Math.round(from + (to - from) * eased).toLocaleString();
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function initCounters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        countUp(en.target, parseInt(en.target.dataset.count, 10) || 0);
        io.unobserve(en.target);
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 9. 逐行文字揭示 ---------- */
  function splitLines(el) {
    if (el.dataset.split === 'done') return;
    var text = el.textContent.trim();
    el.innerHTML = '';
    var words = text.split(/(\s+)/);
    words.forEach(function (w, i) {
      var span = document.createElement('span');
      span.textContent = w;
      span.style.cssText =
        'display:inline-block;opacity:0;transform:translateY(0.5em) rotateX(-35deg);' +
        'transition:opacity 520ms cubic-bezier(.22,1,.36,1),transform 620ms cubic-bezier(.22,1,.36,1);' +
        'transition-delay:' + (i * 28) + 'ms;';
      el.appendChild(span);
    });
    el.dataset.split = 'done';
    requestAnimationFrame(function () {
      Array.prototype.forEach.call(el.children, function (s) {
        s.style.opacity = '1';
        s.style.transform = 'none';
      });
    });
  }
  function initLineReveal() {
    var els = document.querySelectorAll('[data-split]');
    if (!els.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { splitLines(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.35 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    if (motionOK()) {
      initTilt();
      initParallax();
      initMagnetic();
      initRipple();
      initLineReveal();
    }
    initStagger();
    initNavHide();
    initThemeTransition();
    initCounters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }

  window.XZD = { countUp: countUp, splitLines: splitLines };
})();


/* ---------- 9. 站点数据看板（GitHub stars + repos + 访客数） ---------- */
(function(){
  var SUPABASE_URL='https://bvtcdknbvpyeyqvotmrk.supabase.co';
  var SUPABASE_KEY='sb_publishable_NRo4jlxhWuDP1YEYeSMbbQ_Kjjmsj3b';

  var visitorEl=document.getElementById('statVisitors');
  var starsEl=document.getElementById('statStars');
  var reposEl=document.getElementById('statRepos');

  // 访客数：复用现有的 Supabase RPC
  if(visitorEl){
    fetch(SUPABASE_URL+'/rest/v1/rpc/increment_visitor_count',{
      method:'POST',
      headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+SUPABASE_KEY,'Content-Type':'application/json'}
    }).then(function(r){return r.json();}).then(function(result){
      var n=typeof result==='number'?result:(result&&result.result)||0;
      visitorEl.textContent=n.toLocaleString();
    }).catch(function(){visitorEl.textContent='---'});
  }

  // GitHub stars 与 repos：公开 API，无速率限制（未认证 60/h，超了就显示 ---）
  function fetchGH(){
    fetch('https://api.github.com/users/xzd1314/repos?per_page=100',{
      headers:{'Accept':'application/vnd.github+json'}
    }).then(function(r){return r.ok?r.json():Promise.reject(r.status);})
      .then(function(repos){
        var stars=repos.reduce(function(s,r){return s+(r.stargazers_count||0);},0);
        if(starsEl)starsEl.textContent=stars.toLocaleString();
        if(reposEl)reposEl.textContent=repos.length.toLocaleString();
      }).catch(function(){
        if(starsEl)starsEl.textContent='---';
        if(reposEl)reposEl.textContent='---';
      });
  }
  fetchGH();
  setInterval(fetchGH, 60000);   // 每分钟刷新
})();
