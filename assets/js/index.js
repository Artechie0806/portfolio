
// ── PAGE LOADER ──
(function () {
  var loader = document.getElementById('loader');
  var root = document.documentElement;
  if (!loader) { root.classList.remove('loading'); root.classList.add('site-ready'); return; }

  function reveal() {
    root.classList.remove('loading');
    root.classList.add('site-ready');
    loader.classList.add('loader-done');
    setTimeout(function () { if (loader && loader.parentNode) loader.parentNode.removeChild(loader); }, 700);
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
    loader.classList.add('loader-exit');
    var curtain = loader.querySelector('.loader-curtain');
    var done = false;
    function finish() { if (done) return; done = true; reveal(); }
    if (curtain) curtain.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, 1400); // safety fallback
  }

  requestAnimationFrame(tick);
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