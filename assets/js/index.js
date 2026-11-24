
// ── MIRROR ──
// The cursor rift (bottom of this file) loads this page a second time inside
// a frame, in the opposite theme, and shows it through the cursor's tail.
// That copy is the "mirror". It runs this same script with MIRROR true: no
// loader, no scrollbar, no rift of its own, and its nav and menu state are
// pushed to it from the real page rather than worked out for itself.
// On the real page, mirrorWin is the copy's window once it has loaded.
const MIRROR = document.documentElement.classList.contains('is-mirror');
let mirrorWin = null;
function toMirror(fn, arg) {
  if (!mirrorWin) return;
  try { mirrorWin[fn](arg); } catch (e) {}
}

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

  if (MIRROR) { reveal(); return; }

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

  // The mirror goes straight to the finished line.
  if (MIRROR) {
    out.textContent = text;
    rest.textContent = '';
    caret.classList.add('is-blinking');
    return;
  }

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
let saved = localStorage.getItem('theme') || 'light';
if (MIRROR) saved = saved === 'dark' ? 'light' : 'dark'; // always the other theme
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
  toMirror('setMenu', open);
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
  toMirror('setActive', id);
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
// (The mirror doesn't track its own scroll: setActive forwards each change.)
if (!MIRROR) {
  window.addEventListener('scrollend', unlockNav);

  window.addEventListener('scroll', () => {
    if (navLockTimer !== null) return;
    const cur = currentSection();
    if (cur !== activeId) setActive(cur);
  }, { passive: true });
}

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
if (MIRROR) {
  // The mirror jumps around rather than being scrolled through, so it would
  // miss entrances; everything simply starts in its landed state.
  reveals.forEach(el => { el.classList.add('visible'); el.classList.remove('reveal'); });
} else {
  reveals.forEach(r => observer.observe(r));
}

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
  if (MIRROR) return; // the real page's bar sits above the rift
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
// Reduced-motion users get one still frame; hidden tabs draw nothing.
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
  var FRAME_MS = 1000 / 30;

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

    // The canvas's CSS colour is var(--ink), so this tracks the theme fade.
    ctx.strokeStyle = getComputedStyle(canvas).color;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  var still = !!(reduce && reduce.matches);
  var raf = 0, lastFrame = 0;
  var root = document.documentElement;

  // In the mirror the lines have to land exactly where the real page draws
  // them, so it runs on the real page's clock (a frame's own clock starts
  // when the frame loads). It also only redraws while the rift is open.
  var CLOCK = 0;
  if (MIRROR) {
    try { CLOCK = performance.timeOrigin - window.parent.performance.timeOrigin; } catch (e) {}
  }
  function clock() { return performance.now() + CLOCK; }
  function shown() { return !MIRROR || root.classList.contains('rift-live'); }

  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (!shown() || now - lastFrame < FRAME_MS) return;
    lastFrame = now;
    draw(now + CLOCK);
  }
  function start() { if (!raf && !still && !document.hidden) raf = requestAnimationFrame(tick); }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  resize();
  draw(clock());
  start();

  // Catch up the moment the rift opens, rather than showing a stale frame.
  if (MIRROR) {
    new MutationObserver(function () { if (shown()) draw(clock()); })
      .observe(root, { attributes: true, attributeFilter: ['class'] });
  }

  window.addEventListener('resize', function () { resize(); draw(clock()); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
  if (reduce && reduce.addEventListener) {
    reduce.addEventListener('change', function (e) { still = e.matches; if (still) stop(); else start(); });
  }
  // A still frame has to be repainted by hand when the theme (and so the ink
  // colour) changes; wait out the palette fade first.
  new MutationObserver(function () {
    if (still) setTimeout(function () { draw(clock()); }, 700);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
})();


// ── CURSOR RIFT ──
// Moving the pointer rips a short-lived tear in the page that shows the other
// theme underneath. The cursor is the tip of the rip: the tear splits open
// behind it with a jagged, faceted edge, throws out hairline cracks and
// spinning shards, burns with a lit rim, and then heals shut.
//
// What shows through is the real other theme, not a colour inversion: this
// same page, loaded a second time in a frame fixed over the viewport (the
// "mirror", see the top of this file), set to the opposite theme and kept
// scrolled in step. The frame is clipped to the shape of the tear, so once
// the pointer rests and the tear has healed, nothing of the frame shows.
//
// The tear is glass rather than a hole. Three layers, bottom to top, all
// clipped by the shapes built here (styling is in style.css):
//   1. frosting — blurs the real page showing through the tear;
//   2. the mirror — whose page background is only a tint, so the frosted
//      page shows through behind its content;
//   3. the lit rim — a hollow accent band around the tear, with a glow that
//      spreads outward over the page and inward across the glass.
//
// Mouse only. Off for touch, for reduced motion, and where the page can't be
// framed (opened straight from disk).
(function () {
  if (MIRROR || !window.matchMedia) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (!window.CSS || !CSS.supports || !CSS.supports('clip-path', 'path("M0 0h1v1z")')) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce.matches) return;

  var RADIUS = 64;   // half-width of the tear at its widest, px (fast strokes)
  var LIFE = 640;    // ms before a stretch of the tear has healed shut
  var OPEN = 130;    // ms a stretch takes to split fully open behind the tip
  var FOLLOW = 40;   // lag of the tear's tip behind the pointer, ms
  var STEP = 14;     // px between edge vertices: larger = longer, sharper facets
  var EDGE = 5;      // typical thickness of the lit rim, px
  var MAX_SHARDS = 36, MAX_CRACKS = 10;

  var root = document.documentElement;
  var view = null, mdoc = null, mroot = null;   // the frame, its document, its <html>
  var glow = null, edge = null;                 // the lit rim: glow wrapper and clipped fill
  var glass = null;                             // the frosting under the mirror
  var live = false;                             // is the rift showing right now

  // The tear's spine, oldest first. Each point carries its birth time, its
  // size (0..1), and the fixed random offsets that make its edges jagged.
  var pts = [];
  var shards = [];              // loose triangles flung out of the tear
  var cracks = [];              // hairline fractures branching off it
  var mx = 0, my = 0;           // pointer
  var hx = 0, hy = 0;           // tip of the tear, easing after the pointer
  var size = 0;                 // 0..1: how wide new tear opens; swells with speed
  var tracking = false;         // false until the pointer's position is known
  var lastMove = 0, lastTick = 0, raf = 0;
  var hovered = null;

  function n1(v) { return Math.round(v * 10) / 10; }

  function rnd(a, b) { return a + Math.random() * (b - a); }

  // A value 0..1 that re-rolls every 70ms: makes the rim crackle.
  function flick(seed, now) {
    var v = Math.sin(seed + Math.floor(now / 70) * 12.9898) * 43758.5453;
    return v - Math.floor(v);
  }

  // Everything is drawn as triangles, all wound the same way. Under the
  // nonzero rule they then merge into one solid shape however the tear
  // doubles back on itself — mixed windings would cancel and punch holes.
  function tri(x1, y1, x2, y2, x3, y3) {
    var area = (x2 - x1) * (y3 - y1) - (x3 - x1) * (y2 - y1);
    if (area > -0.5 && area < 0.5) return '';
    if (area < 0) { var tx = x2, ty = y2; x2 = x3; y2 = y3; x3 = tx; y3 = ty; }
    return 'M' + n1(x1) + ' ' + n1(y1) + 'L' + n1(x2) + ' ' + n1(y2) + 'L' + n1(x3) + ' ' + n1(y3) + 'Z';
  }

  // A band between a left and a right run of vertices (from index `from`).
  function strip(lx, ly, rx, ry, m, from) {
    var d = '';
    for (var i = from || 0; i < m - 1; i++) {
      d += tri(lx[i], ly[i], lx[i + 1], ly[i + 1], rx[i + 1], ry[i + 1]) +
           tri(lx[i], ly[i], rx[i + 1], ry[i + 1], rx[i], ry[i]);
    }
    return d;
  }

  // Scratch vertex runs: inner left/right (the tear) and outer left/right (the rim).
  var ilx = [], ily = [], irx = [], iry = [], olx = [], oly = [], orx = [], ory = [];
  var dIn = '', dOut = '';

  // Builds both outlines for this instant. dIn is the tear itself: it clips
  // the mirror and the frosting under it. dOut is the rim, a hollow band
  // hugging the outside of that shape — hollow, because the tear is glass and
  // a solid fill behind it would show through.
  function build(now) {
    var i, j, m = 0, nx = 0, ny = 1;
    dIn = ''; dOut = '';

    // The tear: at each spine point, an edge vertex either side. A stretch
    // splits open over OPEN ms, holds, then pinches shut as it nears LIFE.
    for (i = 0; i < pts.length; i++) {
      var p = pts[i], prev = pts[i - 1] || p, next = pts[i + 1];
      var tx = (next ? next.x : hx) - prev.x, ty = (next ? next.y : hy) - prev.y;
      var len = Math.sqrt(tx * tx + ty * ty);
      if (len > 0.01) { nx = -ty / len; ny = tx / len; }
      var age = now - p.t, k = age / LIFE;
      var o = age < OPEN ? age / OPEN : 1;
      var r = RADIUS * p.s * o * o * (3 - 2 * o) * (1 - k * k);
      if (r < 0.5) r = 0;
      var rim = EDGE * Math.min(1, r / 12);         // the rim dies with the tear
      var l = r * p.jl, rr = r * p.jr;
      var lo = l + rim * p.el * (0.5 + flick(p.seed, now));
      var ro = rr + rim * p.er * (0.5 + flick(p.seed + 7, now));
      ilx[m] = p.x + nx * l;  ily[m] = p.y + ny * l;
      irx[m] = p.x - nx * rr; iry[m] = p.y - ny * rr;
      olx[m] = p.x + nx * lo; oly[m] = p.y + ny * lo;
      orx[m] = p.x - nx * ro; ory[m] = p.y - ny * ro;
      m++;
    }
    if (m) {
      // Both edges meet at the tip, under the cursor.
      ilx[m] = irx[m] = olx[m] = orx[m] = hx;
      ily[m] = iry[m] = oly[m] = ory[m] = hy;
      m++;
      dIn = strip(ilx, ily, irx, iry, m);
      dOut = strip(ilx, ily, olx, oly, m) + strip(irx, iry, orx, ory, m);
    }

    // Cracks: a zigzag sliver that shoots out from the spine, tapering to a
    // point, then thins away.
    for (i = 0; i < cracks.length; i++) {
      var c = cracks[i], ca = (now - c.t) / c.life;
      var g = Math.min(1, (now - c.t) / 110); g = 1 - (1 - g) * (1 - g);   // shoots out, easing
      var fade = 1 - ca * ca, last = c.qx.length - 1;
      for (j = 0; j <= last; j++) {
        var a = Math.max(j - 1, 0), b = Math.min(j + 1, last);
        var cx = c.qx[b] - c.qx[a], cy = c.qy[b] - c.qy[a], cl = Math.sqrt(cx * cx + cy * cy) || 1;
        var ux = -cy / cl, uy = cx / cl;
        var x = c.x + c.qx[j] * g, y = c.y + c.qy[j] * g;
        var w = c.w * fade * (1 - j / last), wo = j < last ? w + 1.8 * fade : 0;
        ilx[j] = x + ux * w;  ily[j] = y + uy * w;
        irx[j] = x - ux * w;  iry[j] = y - uy * w;
        olx[j] = x + ux * wo; oly[j] = y + uy * wo;
        orx[j] = x - ux * wo; ory[j] = y - uy * wo;
      }
      dIn += strip(ilx, ily, irx, iry, last + 1);
      // Rim from the second vertex on: the first leg lies inside the tear.
      dOut += strip(ilx, ily, olx, oly, last + 1, 1) + strip(irx, iry, orx, ory, last + 1, 1);
    }

    // Shards: triangles thrown clear of the tear, slowing, spinning and
    // shrinking to nothing. Each is a window too, with its own lit rim.
    for (i = 0; i < shards.length; i++) {
      var s = shards[i], sec = (now - s.t) / 1000, left = 1 - (now - s.t) / s.life;
      var d = (1 - Math.exp(-3 * sec)) / 3;         // distance under drag
      var sx = s.x + s.vx * d, sy = s.y + s.vy * d, rot = s.rot + s.spin * sec;
      var lit = Math.min(1, (now - s.t) / 100);     // the rim flares up as it breaks off
      var r1 = s.r * left, r2 = r1 * s.k1, r3 = r1 * s.k2, pad = 2.6 * left * lit;
      var c1 = Math.cos(rot), s1 = Math.sin(rot);
      var c2 = Math.cos(rot + s.a1), s2 = Math.sin(rot + s.a1);
      var c3 = Math.cos(rot + s.a2), s3 = Math.sin(rot + s.a2);
      // Corners of the shard (inner) and of its rim (outer), as closed runs.
      ilx[0] = ilx[3] = sx + c1 * r1; ily[0] = ily[3] = sy + s1 * r1;
      ilx[1] = sx + c2 * r2;          ily[1] = sy + s2 * r2;
      ilx[2] = sx + c3 * r3;          ily[2] = sy + s3 * r3;
      olx[0] = olx[3] = sx + c1 * (r1 + pad); oly[0] = oly[3] = sy + s1 * (r1 + pad);
      olx[1] = sx + c2 * (r2 + pad);          oly[1] = sy + s2 * (r2 + pad);
      olx[2] = sx + c3 * (r3 + pad);          oly[2] = sy + s3 * (r3 + pad);
      dIn += tri(ilx[0], ily[0], ilx[1], ily[1], ilx[2], ily[2]);
      dOut += strip(ilx, ily, olx, oly, 4);
    }
  }

  // Lays a new spine point at the tip. (nx, ny) is the normal to the
  // direction of travel; a point that starts a fresh tear has no width, so
  // the tear begins at a point rather than a blunt end.
  function lay(now, first, nx, ny) {
    var spike = Math.random() < 0.22 ? rnd(1.25, 1.6) : 1;   // the odd long facet
    var p = {
      x: hx, y: hy, t: now, s: first ? 0 : size, seed: Math.random() * 1000,
      jl: rnd(0.62, 1.1) * (Math.random() < 0.5 ? spike : 1),
      jr: rnd(0.62, 1.1) * (Math.random() < 0.5 ? spike : 1),
      el: rnd(0.4, 1.7), er: rnd(0.4, 1.7)
    };
    pts.push(p);
    if (first) return;

    var side = Math.random() < 0.5 ? 1 : -1;
    if (p.s > 0.45 && shards.length < MAX_SHARDS && Math.random() < 0.55 * p.s) {
      // Shards break off where the tear's edge is about to be, not from its
      // middle: inside the glass a shard is a window within a window, and
      // only its rim would show, as a stray outline.
      var v = rnd(90, 300) * p.s, drift = rnd(-50, 50), off = RADIUS * p.s * rnd(0.6, 1) * side;
      shards.push({
        x: p.x + nx * off, y: p.y + ny * off, t: now, life: rnd(420, 820),
        vx: nx * side * v - ny * drift, vy: ny * side * v + nx * drift,
        rot: rnd(0, 6.28), spin: rnd(-8, 8), r: rnd(5, 13) * (0.5 + p.s),
        a1: rnd(1.6, 2.6), a2: rnd(3.7, 4.7), k1: rnd(0.5, 1), k2: rnd(0.5, 1)
      });
    }
    if (p.s > 0.55 && cracks.length < MAX_CRACKS && Math.random() < 0.16) {
      // First leg carries it out to the tear's edge; the rest zigzag beyond.
      var ang = Math.atan2(ny * -side, nx * -side) + rnd(-0.5, 0.5);
      var legs = Math.random() < 0.5 ? 3 : 4, bend = Math.random() < 0.5 ? 1 : -1;
      var qx = [0], qy = [0], x = 0, y = 0;
      for (var j = 0; j < legs; j++) {
        var reach = j ? rnd(16, 42) * (0.5 + p.s) : RADIUS * p.s * 0.85;
        x += Math.cos(ang) * reach; y += Math.sin(ang) * reach;
        qx.push(x); qy.push(y);
        bend = -bend;
        ang += bend * rnd(0.35, 0.9);
      }
      cracks.push({ x: p.x, y: p.y, t: now, life: LIFE * rnd(0.55, 0.85), w: rnd(4, 8) * p.s, qx: qx, qy: qy });
    }
  }

  function syncScroll() {
    var w = view.contentWindow;
    if (w.scrollY !== window.scrollY) w.scrollTo(0, window.scrollY);
  }

  // Hover can't reach the mirror (it takes no pointer events), so the element
  // under the pointer there is marked by hand; see cloneHover.
  function hover(el) {
    if (el === hovered) return;
    var n;
    for (n = hovered; n && n !== mdoc.body; n = n.parentElement) n.classList.remove('rh');
    for (n = el; n && n !== mdoc.body; n = n.parentElement) n.classList.add('rh');
    hovered = el;
  }

  // Give every :hover rule in the mirror a twin that answers to .rh instead.
  function cloneHover(list) {
    for (var i = 0; i < list.length; i++) {
      var rule = list[i];
      if (rule.selectorText) {
        if (rule.selectorText.indexOf(':hover') === -1) continue;
        var owner = rule.parentRule || rule.parentStyleSheet;
        owner.insertRule(rule.selectorText.replace(/:hover/g, '.rh') + '{' + rule.style.cssText + '}', i + 1);
        i++;  // step over the twin just inserted
      } else {
        // A stylesheet, or an @media / @supports block. Reading the rules of
        // a stylesheet from another origin (the web fonts) throws: skip it.
        var inner = null;
        try { inner = rule.cssRules; } catch (e) {}
        if (inner) cloneHover(inner);
      }
    }
  }

  // Line the mirror's CSS animations up with the page's, so a pulsing dot or
  // blinking caret is caught at the same instant on both sides of the edge.
  function syncMotion() {
    if (!document.getAnimations) return;
    function key(a, counts) {
      var t = a.effect && a.effect.target;
      if (!a.animationName || !t) return null;
      var k = a.animationName + '|' + (a.effect.pseudoElement || '') + '|' + t.tagName + '.' + t.className;
      counts[k] = (counts[k] || 0) + 1;
      return k + '#' + counts[k];
    }
    var mine = {}, counts = {};
    document.getAnimations().forEach(function (a) { var k = key(a, counts); if (k) mine[k] = a; });
    counts = {};
    mdoc.getAnimations().forEach(function (a) {
      var k = key(a, counts), b = k && mine[k];
      if (b && b.currentTime !== null) a.currentTime = b.currentTime;
    });
  }

  function syncTheme() {
    var want = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    if (mroot.getAttribute('data-theme') === want) return;
    mroot.setAttribute('data-theme', want);
    toMirror('syncToggle', want === 'dark');
  }

  function setLive(on) {
    if (on === live) return;
    live = on;
    view.style.visibility = glow.style.visibility = glass.style.visibility = on ? 'visible' : '';
    mroot.classList.toggle('rift-live', on);
    if (on) { syncScroll(); syncMotion(); }
    else { view.style.clipPath = edge.style.clipPath = glass.style.clipPath = ''; hover(null); }
  }

  function close() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    pts.length = shards.length = cracks.length = 0;
    size = 0;
    tracking = false;
    if (view && mroot) setLive(false);
  }

  function tick(now) {
    raf = 0;
    var dt = Math.min(Math.max(now - lastTick, 1), 50);
    lastTick = now;

    // The head eases after the pointer; its speed sets how wide the rift opens.
    var k = 1 - Math.exp(-dt / FOLLOW);
    var nx = hx + (mx - hx) * k, ny = hy + (my - hy) * k;
    var speed = Math.sqrt((nx - hx) * (nx - hx) + (ny - hy) * (ny - hy)) / dt * 1000; // px/s
    hx = nx; hy = ny;
    var want = speed > 24 ? Math.min(1, 0.4 + speed / 1200) : 0;
    size += (want - size) * (1 - Math.exp(-dt / (want > size ? 110 : 200)));
    if (!want && size < 0.05) size = 0;  // don't let a speck linger at the cursor

    var tip = pts[pts.length - 1];
    if (!tip) {
      if (size > 0.02) lay(now, true, 0, 1);
    } else {
      var gx = hx - tip.x, gy = hy - tip.y, gap = Math.sqrt(gx * gx + gy * gy);
      if (gap >= STEP && size > 0.02) lay(now, false, -gy / gap, gx / gap);
    }
    while (pts.length && now - pts[0].t > LIFE) pts.shift();
    shards = shards.filter(function (s) { return now - s.t < s.life; });
    cracks = cracks.filter(function (c) { return now - c.t < c.life; });

    build(now);
    if (dIn || dOut) {
      setLive(true);
      view.style.clipPath = glass.style.clipPath = dIn ? 'path("' + dIn + '")' : '';
      edge.style.clipPath = dOut ? 'path("' + dOut + '")' : '';
      syncScroll();
      hover(mdoc.elementFromPoint(mx, my));
    } else {
      setLive(false);
      if (now - lastMove > 120) { pts.length = 0; return; }  // healed and at rest
    }
    raf = requestAnimationFrame(tick);
  }

  function onMove(e) {
    if (e.pointerType === 'touch' || !mroot) return;
    if (reduce.matches || root.classList.contains('theme-switching')) return;
    mx = e.clientX; my = e.clientY;
    if (!tracking) { hx = mx; hy = my; tracking = true; }  // no streak in from wherever it was last
    lastMove = performance.now();
    if (!raf) { lastTick = lastMove; raf = requestAnimationFrame(tick); }
  }

  function boot() {
    view = document.createElement('iframe');
    view.className = 'rift';
    view.setAttribute('aria-hidden', 'true');
    view.setAttribute('inert', '');           // keeps focus and find-in-page out of the copy
    view.tabIndex = -1;
    // The query string matters: a frame pointing at its own page's exact URL
    // is refused as a loop. It is also how the copy knows what it is.
    view.src = location.pathname + '?rift=1';
    view.addEventListener('load', function () {
      try {
        mdoc = view.contentDocument;
        if (!mdoc.documentElement.classList.contains('is-mirror')) throw 0;
        cloneHover(mdoc.styleSheets);
      } catch (e) {
        // Not reachable (file://) or not our page: no rift.
        mdoc = null;
        view.remove();
        glow.remove();
        glass.remove();
        return;
      }
      mroot = mdoc.documentElement;
      mirrorWin = view.contentWindow;
      syncTheme();
      toMirror('setActive', activeId);
      toMirror('setMenu', navLinks.classList.contains('open'));
      window.addEventListener('pointermove', onMove, { passive: true });
    });
    glow = document.createElement('div');
    glow.className = 'rift-glow';
    glow.setAttribute('aria-hidden', 'true');
    edge = document.createElement('div');
    edge.className = 'rift-edge';
    glow.appendChild(edge);
    glass = document.createElement('div');
    glass.className = 'rift-glass';
    glass.setAttribute('aria-hidden', 'true');
    document.body.appendChild(glass);
    document.body.appendChild(glow);
    document.body.appendChild(view);
  }

  // Leaving the window drops the pointer's position, so coming back in
  // elsewhere starts a fresh tail instead of a streak across the page.
  root.addEventListener('pointerleave', function () { tracking = false; });

  // A theme switch closes the rift (the wipe snapshots the page, and a rift
  // caught in the snapshot would hang there), then the mirror swaps sides.
  new MutationObserver(function () {
    if (!mroot) return;
    if (root.classList.contains('theme-switching')) close();
    syncTheme();
  }).observe(root, { attributes: true, attributeFilter: ['class', 'data-theme'] });

  // Load the copy once the page has made its entrance, so it never competes
  // with the loader for the first paint.
  function whenReady(fn) {
    if (root.classList.contains('site-ready')) { fn(); return; }
    var mo = new MutationObserver(function () {
      if (!root.classList.contains('site-ready')) return;
      mo.disconnect();
      fn();
    });
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
  }
  whenReady(function () { setTimeout(boot, 900); });
})();
