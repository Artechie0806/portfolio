
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

  // Show the loader on every page load.
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var fill = loader.querySelector('.loader-bar-fill');
  var count = loader.querySelector('.loader-count');

  var COUNT_MS = reduce ? 500 : 3600; // count + fill duration (slow, deliberate fill)
  var start = null;

  function ease(t) { return 1 - Math.pow(1 - t, 3); } // easeOutCubic

  function tick(ts) {
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
      setTimeout(exit, reduce ? 80 : 420);
    }
  }

  function exit() {
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

  var out = document.createElement('span');
  var caret = document.createElement('span');
  caret.className = 'hs-caret';
  type.appendChild(out);
  type.appendChild(caret);

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
if(saved === 'dark') { html.setAttribute('data-theme','dark'); toggle.textContent = '☀'; }

toggle.addEventListener('click', () => {
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  toggle.textContent = isDark ? '☽' : '☀';
  localStorage.setItem('theme', isDark ? 'light' : 'dark');
});

// ── HAMBURGER ──
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

// ── NAV ACTIVE STATE ──
const sections = document.querySelectorAll('section[id]');
const navAs = document.querySelectorAll('.nav-links a');
window.addEventListener('scroll', () => {
  let cur = '';
  sections.forEach(s => { if(window.scrollY >= s.offsetTop - 120) cur = s.id; });
  navAs.forEach(a => {
    a.style.color = a.getAttribute('href') === '#' + cur ? 'var(--ink)' : '';
  });
});

// ── REVEAL ON SCROLL ──
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if(e.isIntersecting) {
      e.target.style.transitionDelay = (i % 3) * 0.1 + 's';
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
reveals.forEach(r => observer.observe(r));

// ── FORM SUBMIT ──
function handleFormSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('submitBtn');
  const msg = document.getElementById('formMsg');
  btn.textContent = 'Sending...';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = 'Sent ✓';
    msg.style.display = 'block';
    msg.textContent = '→ Message received. I\'ll get back to you soon!';
    e.target.reset();
    setTimeout(() => { btn.textContent = 'Send Message →'; btn.disabled = false; msg.style.display = 'none'; }, 4000);
  }, 1200);
}

// ── SMOOTH ACTIVE NAV ──
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if(target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
  });
});

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