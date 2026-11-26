
// ── PAGE LOADER ──
(function () {
  var loader = document.getElementById('loader');
  var curtain = document.querySelector('.loader-curtain');
  var root = document.documentElement;
  if (!loader) { root.classList.remove('loading'); root.classList.add('site-ready'); return; }

  function remove(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }

  function reveal() {
    root.classList.remove('loading');
    root.classList.add('site-ready');
    remove(loader);
    remove(curtain);
  }

  // Only run the full loader once per browser session; repeat visits go straight in.
  var seen = false;
  try { seen = sessionStorage.getItem('loaderSeen') === '1'; sessionStorage.setItem('loaderSeen', '1'); } catch (e) {}
  if (seen) { reveal(); return; }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var fill = loader.querySelector('.loader-bar-fill');
  var count = loader.querySelector('.loader-count');

  var COUNT_MS = reduce ? 400 : 1200; // count + fill duration
  var start = null;
  var settled = false; // guards against exit()/reveal() running twice

  function ease(t) { return 1 - Math.pow(1 - t, 3); } // easeOutCubic

  function tick(ts) {
    if (settled) return;
    if (start === null) start = ts;
    var t = Math.min((ts - start) / COUNT_MS, 1);
    var v = ease(t);
    var pct = Math.round(v * 100);
    if (count) count.textContent = (pct < 10 ? '0' : '') + pct;
    if (fill) fill.style.width = (v * 100) + '%';
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      if (count) count.textContent = '100';
      // brief beat, then curtain wipe reveal
      setTimeout(exit, reduce ? 80 : 240);
    }
  }

  function exit() {
    if (settled) return;
    settled = true;
    if (reduce) { reveal(); return; }
    // bring the live site to life so it's already animating as the loader lifts away
    root.classList.add('site-ready');
    loader.classList.add('loader-exit');
    var done = false;
    function finish(e) {
      if (done) return;
      if (e && e.target !== loader) return; // ignore animationend bubbling from inner content
      done = true;
      loader.removeEventListener('animationend', finish);
      root.classList.remove('loading'); // unlock scroll once the loader has cleared
      remove(loader);
      remove(curtain);
    }
    loader.addEventListener('animationend', finish);
    setTimeout(finish, 1600); // safety fallback (> 1.1s slide)
  }

  // Failsafe: requestAnimationFrame is suspended entirely in a background tab,
  // so a page opened in one can leave the bar parked at 00 indefinitely.
  // setTimeout is only throttled, never stopped, so use it as a hard backstop.
  setTimeout(function () {
    if (settled) return;
    settled = true;
    reveal();
  }, COUNT_MS + 4000);

  requestAnimationFrame(tick);
})();


// ── HERO SUMMARY: TERMINAL-STYLE TYPING ──
// Streams the summary out character by character once the loader curtain has
// lifted, so the animation is actually seen rather than played behind it.
(function () {
  var p = document.querySelector('.hero-summary');
  if (!p) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Source of truth is the markup, so the paragraph still renders (and indexes)
  // without JS. Collapse the source's indentation to single spaces.
  var text = p.textContent.replace(/\s+/g, ' ').trim();
  if (!text) return;

  var ghost = document.createElement('span');
  ghost.className = 'hs-ghost';
  ghost.textContent = text;

  var type = document.createElement('span');
  type.className = 'hs-type';
  type.setAttribute('aria-hidden', 'true'); // the ghost is the accessible copy

  // typed text | caret | untyped remainder (transparent). The overlay always
  // holds the full sentence, so its line breaks never move while it types.
  var out = document.createElement('span');
  var caret = document.createElement('span');
  caret.className = 'hs-caret';
  var rest = document.createElement('span');
  rest.className = 'hs-rest';
  rest.textContent = text;
  type.appendChild(out);
  type.appendChild(caret);
  type.appendChild(rest);

  p.textContent = '';
  p.appendChild(ghost);
  p.appendChild(type);

  // Output streams at a steady character rate, driven off rAF rather than a
  // per-character setTimeout: frame-synced and drift-corrected, so the line
  // reads as smooth output instead of a stuttering timer. The only breaks in
  // cadence are short settles at punctuation.
  var CPS = 65;                                   // characters per second
  var HOLD = { '.': 150, ',': 80, '—': 80 };      // ms settle after these
  var MAX_DT = 100;                               // clamp catch-up after a tab switch

  var i = 0, prev = null, credit = 0, hold = 0;

  function frame(ts) {
    if (prev === null) prev = ts;
    var dt = Math.min(ts - prev, MAX_DT);
    prev = ts;

    if (hold > 0) { hold -= dt; requestAnimationFrame(frame); return; }

    // Fractional carry keeps the rate honest across uneven frame durations.
    credit += dt * (CPS / 1000);
    var n = Math.floor(credit);
    if (n > 0) {
      credit -= n;
      i = Math.min(i + n, text.length);
      out.textContent = text.slice(0, i);
      rest.textContent = text.slice(i);
      hold = HOLD[text.charAt(i - 1)] || 0;
    }

    if (i >= text.length) { caret.classList.add('is-blinking'); return; }
    requestAnimationFrame(frame);
  }

  var root = document.documentElement;
  // Beat after the curtain clears, then stream.
  function start() { setTimeout(function () { requestAnimationFrame(frame); }, 260); }

  if (root.classList.contains('site-ready')) { start(); return; }
  var mo = new MutationObserver(function () {
    if (!root.classList.contains('site-ready')) return;
    mo.disconnect();
    start();
  });
  mo.observe(root, { attributes: true, attributeFilter: ['class'] });
})();


// ── THEME TOGGLE ──
const toggle = document.getElementById('themeToggle');
const html = document.documentElement;
const saved = localStorage.getItem('theme') || 'light';
function syncToggle(dark) {
  toggle.textContent = dark ? '☀' : '☽';
  toggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
  toggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
}
if(saved === 'dark') { html.setAttribute('data-theme','dark'); }
syncToggle(saved === 'dark');

function applyTheme(dark) {
  html.setAttribute('data-theme', dark ? 'dark' : 'light');
  syncToggle(dark);
  try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
}

let themeTimer = null;
let themeRun = 0;
toggle.addEventListener('click', () => {
  const dark = html.getAttribute('data-theme') !== 'dark';
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const run = ++themeRun;
  clearTimeout(themeTimer);

  // .theme-switching holds per-element colour transitions off while the
  // theme changes, so nothing trails behind.
  html.classList.add('theme-switching');

  // Fallback (no View Transitions, or reduced motion): the palette fades in
  // CSS via registered custom properties on <html>.
  if (!document.startViewTransition || reduce) {
    html.classList.remove('theme-wipe');
    applyTheme(dark);
    themeTimer = setTimeout(() => html.classList.remove('theme-switching'), 700);
    return;
  }

  // Circular wipe that grows out of the toggle button.
  const r = toggle.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  html.classList.add('theme-wipe'); // before the snapshot: lifts the nav out of it (see CSS)
  const vt = document.startViewTransition(() => applyTheme(dark));
  vt.ready.then(() => {
    html.animate(
      { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
      { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' }
    );
  }).catch(() => {});
  // Only the latest switch cleans up — a rapid second click skips the first.
  vt.finished.finally(() => {
    if (run === themeRun) html.classList.remove('theme-switching', 'theme-wipe');
  });
});

// ── HAMBURGER ──
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
function setMenu(open) {
  navLinks.classList.toggle('open', open);
  hamburger.classList.toggle('is-open', open);
  hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
}
hamburger.addEventListener('click', (e) => {
  e.stopPropagation();
  setMenu(!navLinks.classList.contains('open'));
});
// Hold the menu open briefly after a tap so the glass block is seen gliding
// to the chosen link, then close. (On desktop there is no menu to close.)
let menuCloseTimer = null;
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  clearTimeout(menuCloseTimer);
  menuCloseTimer = setTimeout(() => setMenu(false), 560);
}));
// Dismiss on a tap outside the menu, or Escape
document.addEventListener('click', (e) => {
  if (navLinks.classList.contains('open') && !navLinks.contains(e.target)) setMenu(false);
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

// ── NAV ACTIVE STATE ──
const sections = document.querySelectorAll('section[id]');
const navAs = document.querySelectorAll('.nav-links a');
let activeId = '';

// Park the sliding glass block (.nav-links::before) behind the active link.
// Measured from the <li>, whose offsets are relative to the list itself.
function placeIndicator() {
  const a = navLinks.querySelector('a.is-active');
  if (!a) { navLinks.style.setProperty('--ind-o', '0'); return; }
  const li = a.parentElement;
  navLinks.style.setProperty('--ind-x', li.offsetLeft + 'px');
  navLinks.style.setProperty('--ind-y', li.offsetTop + 'px');
  navLinks.style.setProperty('--ind-w', li.offsetWidth + 'px');
  navLinks.style.setProperty('--ind-h', li.offsetHeight + 'px');
  navLinks.style.setProperty('--ind-o', '1');
}

function setActive(id) {
  activeId = id;
  navAs.forEach(a => {
    const on = a.getAttribute('href') === '#' + id;
    a.style.color = on ? 'var(--ink)' : '';
    a.classList.toggle('is-active', on);
  });
  placeIndicator();
}

function currentSection() {
  let cur = '';
  sections.forEach(s => { if(window.scrollY >= s.offsetTop - 120) cur = s.id; });
  return cur;
}

// A click sends the block straight to its target. While the page is still
// smooth-scrolling there, scroll tracking is held off so the block doesn't
// hop through every section it passes on the way.
let navLockTimer = null;
function lockNavTo(id) {
  setActive(id);
  clearTimeout(navLockTimer);
  navLockTimer = setTimeout(unlockNav, 1500); // fallback where 'scrollend' is missing
}
function unlockNav() {
  if (navLockTimer === null) return;
  clearTimeout(navLockTimer);
  navLockTimer = null;
  setActive(currentSection());
}
window.addEventListener('scrollend', unlockNav);

window.addEventListener('scroll', () => {
  if (navLockTimer !== null) return;
  const cur = currentSection();
  if (cur !== activeId) setActive(cur);
}, { passive: true });

// Link widths change with the viewport and once the web fonts arrive
window.addEventListener('resize', placeIndicator);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeIndicator);
setActive(currentSection());

// ── REVEAL ON SCROLL ──
// Section headings join the reveal here rather than in the markup, so they
// stay visible if this script never runs.
document.querySelectorAll('.section-header, .project-category-label, .skills-grid').forEach(el => el.classList.add('reveal'));

const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  // Stagger only among the elements arriving together in this batch
  let n = 0;
  entries.forEach((e) => {
    if(e.isIntersecting) {
      const el = e.target;
      const delay = (n++ % 4) * 0.09;
      el.style.transitionDelay = delay + 's';
      el.classList.add('visible');
      observer.unobserve(el);
      // Once it has landed, drop .reveal and the stagger delay so the element's
      // own hover transition takes over (otherwise hovers inherit a slow,
      // delayed reveal transition).
      setTimeout(() => {
        el.style.transitionDelay = '';
        el.classList.remove('reveal');
      }, delay * 1000 + 1700);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
reveals.forEach(r => observer.observe(r));

// ── SMOOTH ACTIVE NAV ──
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if(target) {
      e.preventDefault();
      lockNavTo(target.id);
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ── GLASS: NAV DENSITY ON SCROLL ──
// Transparent over the hero, denser once content is passing underneath.
(function () {
  var nav = document.getElementById('navbar');
  if (!nav) return;
  function sync() { nav.classList.toggle('is-scrolled', (window.scrollY || 0) > 24); }
  window.addEventListener('scroll', sync, { passive: true });
  sync();
})();


// ── CUSTOM OVERLAY SCROLLBAR (appears on scroll/edge-hover, fades when idle, no layout space) ──
(function () {
  var track = document.createElement('div');
  track.className = 'scrollbar-track';
  track.setAttribute('aria-hidden', 'true');
  var bar = document.createElement('div');
  bar.className = 'scrollbar';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(track);
  document.body.appendChild(bar);

  var root = document.documentElement;
  var hideTimer = null;
  var dragging = false;
  var EDGE = 24; // how close to the right edge counts as "the scrollbar area"

  function maxScroll() { return root.scrollHeight - window.innerHeight; }

  function setVisible(on) {
    bar.classList.toggle('is-visible', on);
    track.classList.toggle('is-visible', on);
  }

  function update() {
    var max = maxScroll();
    if (max <= 0) { bar.style.display = 'none'; return; } // nothing to scroll
    bar.style.display = 'block';
    var vh = window.innerHeight;
    var thumbH = Math.max(vh * vh / root.scrollHeight, 40); // proportional, min 40px
    var scrolled = window.scrollY || root.scrollTop;
    bar.style.height = thumbH + 'px';
    bar.style.transform = 'translateY(' + (scrolled / max) * (vh - thumbH) + 'px)';
  }

  function flash() {
    setVisible(true);
    if (hideTimer) clearTimeout(hideTimer);
    if (!dragging) hideTimer = setTimeout(function () { setVisible(false); }, 700);
  }

  window.addEventListener('scroll', function () { update(); flash(); }, { passive: true });
  window.addEventListener('resize', function () { update(); flash(); });
  if (window.ResizeObserver) new ResizeObserver(update).observe(document.body);
  window.addEventListener('load', update);
  update();

  // Reveal the bar when the pointer nears the right edge, so the track is reachable
  window.addEventListener('mousemove', function (e) {
    if (dragging || maxScroll() <= 0) return;
    if (e.clientX >= window.innerWidth - EDGE) flash();
  });
  track.addEventListener('mouseenter', function () { if (hideTimer) clearTimeout(hideTimer); });
  track.addEventListener('mouseleave', function () { flash(); });

  // Click the track (but not the thumb) jumps the thumb to that spot
  track.addEventListener('mousedown', function (e) {
    if (e.target !== track) return;
    var max = maxScroll();
    if (max <= 0) return;
    var thumbH = bar.offsetHeight;
    var ratio = (e.clientY - thumbH / 2) / (window.innerHeight - thumbH);
    ratio = Math.min(Math.max(ratio, 0), 1);
    window.scrollTo({ top: ratio * max, behavior: 'smooth' });
    flash();
  });

  // Drag the thumb to scroll
  bar.addEventListener('mousedown', function (e) {
    e.preventDefault();
    dragging = true;
    setVisible(true);
    document.body.style.userSelect = 'none';
    var prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto'; // instant tracking while dragging
    var startY = e.clientY;
    var startScroll = window.scrollY;
    var range = window.innerHeight - bar.offsetHeight;

    function move(ev) {
      window.scrollTo(0, startScroll + ((ev.clientY - startY) / range) * maxScroll());
    }
    function up() {
      dragging = false;
      document.body.style.userSelect = '';
      root.style.scrollBehavior = prevBehavior;
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      flash();
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
})();

// ── BACKGROUND: DRIFTING CONTOUR LINES ──
// A fixed canvas behind the page draws the level lines of a slowly changing
// noise field, like a topographic map that never quite settles. The lines
// are traced fresh each frame (marching squares over a coarse grid), in the
// page's ink colour at low opacity, so they follow the theme on their own.
// Reduced-motion users get one still frame; hidden tabs draw nothing, and the
// lines hold still while the page scrolls.
(function () {
  var canvas = document.createElement('canvas');
  canvas.className = 'contours';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(canvas, document.body.firstChild);
  var ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }

  var CELL = 16;          // grid spacing in CSS px — smaller is smoother, costlier
  var SCALE = 1 / 620;    // noise zoom: larger divisor = broader, calmer shapes
  var LINES = 9;          // how many level lines the field is cut into
  var SPEED = 0.000028;   // drift per millisecond
  var SCROLL_REST = 150;  // ms without a scroll event before the drift resumes

  // Classic 3D gradient noise with a fixed, seeded permutation so the pattern
  // is the same on every visit.
  var perm = new Uint8Array(512);
  (function () {
    var p = new Uint8Array(256), i, seed = 20261123;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      var j = seed % (i + 1), t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (i = 0; i < 512; i++) perm[i] = p[i & 255];
  })();
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function grad(h, x, y, z) {
    h &= 15;
    var u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  }
  function noise(x, y, z) {
    var X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    x -= X; y -= Y; z -= Z; X &= 255; Y &= 255; Z &= 255;
    var u = fade(x), v = fade(y), w = fade(z);
    var A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z;
    var B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    var x1 = grad(perm[AA], x, y, z),         x2 = grad(perm[BA], x - 1, y, z);
    var x3 = grad(perm[AB], x, y - 1, z),     x4 = grad(perm[BB], x - 1, y - 1, z);
    var x5 = grad(perm[AA + 1], x, y, z - 1), x6 = grad(perm[BA + 1], x - 1, y, z - 1);
    var x7 = grad(perm[AB + 1], x, y - 1, z - 1), x8 = grad(perm[BB + 1], x - 1, y - 1, z - 1);
    var a = x1 + u * (x2 - x1), b = x3 + u * (x4 - x3);
    var c = x5 + u * (x6 - x5), d = x7 + u * (x8 - x7);
    var e = a + v * (b - a), f = c + v * (d - c);
    return e + w * (f - e);
  }

  var W = 0, H = 0, cols = 0, rows = 0, field = null, dpr = 1;
  var root = document.documentElement;
  var ink = null;         // cached stroke colour, see draw()

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    cols = Math.ceil(W / CELL) + 1;
    rows = Math.ceil(H / CELL) + 1;
    field = new Float32Array(cols * rows);
  }

  function draw(time) {
    var z = time * SPEED, i, j, k;

    // Sample the field: one broad octave plus a little finer detail.
    for (j = 0; j < rows; j++) {
      var ny = j * CELL * SCALE;
      for (i = 0; i < cols; i++) {
        var nx = i * CELL * SCALE;
        field[j * cols + i] =
          (noise(nx, ny, z) + 0.32 * noise(nx * 2.3 + 40, ny * 2.3 + 40, z * 1.6)) * LINES;
      }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.beginPath();

    // Marching squares: wherever a whole-number level passes between two
    // corners of a cell, find where it crosses each edge and join the points.
    var px = [0, 0, 0, 0], py = [0, 0, 0, 0];
    for (j = 0; j < rows - 1; j++) {
      var y0 = j * CELL, y1 = y0 + CELL;
      for (i = 0; i < cols - 1; i++) {
        var o = j * cols + i;
        var a = field[o], b = field[o + 1], c = field[o + cols + 1], d = field[o + cols];
        var lo = Math.min(a, b, c, d), hi = Math.max(a, b, c, d);
        var first = Math.ceil(lo), last = Math.floor(hi);
        if (first > last) continue;
        var x0 = i * CELL, x1 = x0 + CELL;
        for (k = first; k <= last; k++) {
          var n = 0;
          if ((a < k) !== (b < k)) { px[n] = x0 + CELL * (k - a) / (b - a); py[n++] = y0; }   // top
          if ((b < k) !== (c < k)) { px[n] = x1; py[n++] = y0 + CELL * (k - b) / (c - b); }   // right
          if ((d < k) !== (c < k)) { px[n] = x0 + CELL * (k - d) / (c - d); py[n++] = y1; }   // bottom
          if ((a < k) !== (d < k)) { px[n] = x0; py[n++] = y0 + CELL * (k - a) / (d - a); }   // left
          if (n >= 2) { ctx.moveTo(px[0], py[0]); ctx.lineTo(px[1], py[1]); }
          if (n === 4) { ctx.moveTo(px[2], py[2]); ctx.lineTo(px[3], py[3]); }
        }
      }
    }

    // The canvas's CSS colour is var(--ink). Reading it forces a style
    // recalc, so it is cached and only re-read every frame while the theme
    // is changing (so the lines follow the palette fade).
    if (!ink || root.classList.contains('theme-switching')) ink = getComputedStyle(canvas).color;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var still = !!(reduce && reduce.matches);
  var raf = 0;

  // The drift runs on its own clock, which only advances while the lines are
  // moving, so they pick up exactly where they stopped after a pause.
  var clock = performance.now(), prev = 0;

  // Frame pacing: draw on every Nth screen refresh, with N picked so the
  // drift lands near 60fps at an even cadence: every refresh on a 60-100Hz
  // screen, every 2nd at 120-165Hz, every 4th at 240Hz. A "have 13.7ms
  // passed?" gate can't do this: a 75Hz screen refreshes every 13.3ms, so
  // the gate skipped every other frame and the lines ran at 37fps.
  var refresh = 1000 / 60, nth = 1, count = 0;

  // While the page scrolls, the lines hold still. Redrawing a full-screen
  // canvas every frame competes with the scroll for the frame budget, and a
  // pause in a drift this slow can't be seen.
  var scrolling = false, scrollTimer = 0;
  window.addEventListener('scroll', function () {
    scrolling = true;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(function () { scrolling = false; }, SCROLL_REST);
  }, { passive: true });

  function tick(now) {
    raf = requestAnimationFrame(tick);
    var dt = prev ? now - prev : 0;
    prev = now;
    if (dt > 0 && dt < 50) {
      refresh += (dt - refresh) * 0.05;   // smoothed time between refreshes
      nth = Math.max(1, Math.floor(1000 / 60 / refresh + 0.2));
    }
    if (scrolling) return;
    clock += Math.min(dt, 100);           // no leap forward after a stall
    if (++count % nth) return;
    draw(clock);
  }
  function start() { if (!raf && !still && !document.hidden) raf = requestAnimationFrame(tick); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } prev = 0; }

  resize();
  draw(clock);
  start();

  window.addEventListener('resize', function () { resize(); draw(clock); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  if (reduce && reduce.addEventListener) {
    reduce.addEventListener('change', function (e) { still = e.matches; if (still) stop(); else start(); });
  }
  // Any theme change drops the cached ink colour so the next frame picks up
  // the new one. A still frame has to be repainted by hand when that happens;
  // wait out the palette fade first.
  new MutationObserver(function (records) {
    ink = null;
    var themed = records.some(function (r) { return r.attributeName === 'data-theme'; });
    if (still && themed) setTimeout(function () { ink = null; draw(clock); }, 700);
  }).observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] });
})();
