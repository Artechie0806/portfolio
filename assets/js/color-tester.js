// ── TEMPORARY ACCENT COLOUR TESTER ──
// A floating panel with hue / saturation / lightness sliders that recolours
// the site's accent live. Nothing is saved: pick a colour, copy the hex, and
// paste it into the palette at the top of assets/css/style.css.
// To remove: delete this file and its <script> tag in index.html.
(function () {
  const root = document.documentElement;

  // h 0-360, s/l 0-100 → "#RRGGBB"
  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const v = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return Math.round(v * 255).toString(16).padStart(2, '0');
    };
    return ('#' + f(0) + f(8) + f(4)).toUpperCase();
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
  }

  // Read the accent the stylesheet is currently using, whatever its notation.
  function currentAccent(prop) {
    const probe = document.createElement('span');
    probe.style.color = `var(${prop})`;
    document.body.appendChild(probe);
    const m = getComputedStyle(probe).color.match(/[\d.]+/g) || [184, 110, 0];
    probe.remove();
    return rgbToHsl(+m[0], +m[1], +m[2]);
  }

  const panel = document.createElement('div');
  panel.innerHTML = `
    <style>
      #ct { position: fixed; right: 24px; bottom: 24px; z-index: 9990; width: 250px;
            padding: 14px 16px; border-radius: 14px; background: var(--gf-1);
            border: 1px solid var(--glass-edge); box-shadow: 0 12px 32px -12px rgba(0,0,0,0.35);
            font-family: 'DM Mono', monospace; font-size: 11px; color: var(--ink); }
      #ct.ct-min .ct-body { display: none; }
      #ct .ct-head { display: flex; justify-content: space-between; align-items: center;
                     letter-spacing: 0.1em; text-transform: uppercase; }
      #ct .ct-body { margin-top: 12px; }
      #ct label { display: flex; justify-content: space-between; margin: 10px 0 4px; color: var(--ink-muted); }
      #ct input[type=range] { width: 100%; accent-color: var(--accent-warm); }
      #ct .ct-out { display: flex; align-items: center; gap: 10px; margin-top: 14px; }
      #ct button.ct-on { background: var(--ink); color: var(--cream); border-color: var(--ink); }
      #ct .ct-swatch { width: 28px; height: 28px; border-radius: 8px;
                       border: 1px solid var(--glass-edge); flex-shrink: 0; }
      #ct .ct-hex { flex: 1; font-size: 13px; user-select: all; }
      #ct button { font: inherit; color: var(--ink); background: var(--chip-fill);
                   border: 1px solid var(--chip-edge); border-radius: 999px;
                   padding: 4px 10px; cursor: pointer; }
      #ct .ct-note { margin-top: 10px; color: var(--ink-muted); line-height: 1.5; }
    </style>
    <div id="ct">
      <div class="ct-head"><span>Accent tester</span><button type="button" data-ct="min">–</button></div>
      <div class="ct-body">
        <div class="ct-out" style="margin-top:0">
          <button type="button" data-ct="t1">Main</button>
          <button type="button" data-ct="t2">Second</button>
        </div>
        <label>Hue <span data-ct="hv"></span></label>
        <input type="range" min="0" max="360" data-ct="h">
        <label>Saturation <span data-ct="sv"></span></label>
        <input type="range" min="0" max="100" data-ct="s">
        <label>Lightness <span data-ct="lv"></span></label>
        <input type="range" min="0" max="100" data-ct="l">
        <div class="ct-out">
          <span class="ct-swatch"></span>
          <span class="ct-hex" data-ct="hex"></span>
          <button type="button" data-ct="copy">Copy</button>
        </div>
        <div class="ct-out"><button type="button" data-ct="reset">Reset to stylesheet</button></div>
        <div class="ct-note">Preview only — nothing is saved. Check both light and dark.</div>
      </div>
    </div>`;
  document.body.appendChild(panel);

  const $ = name => panel.querySelector(`[data-ct="${name}"]`);
  const sliders = { h: $('h'), s: $('s'), l: $('l') };

  function syncLabels() {
    $('hv').textContent = sliders.h.value + '°';
    $('sv').textContent = sliders.s.value + '%';
    $('lv').textContent = sliders.l.value + '%';
  }

  // Which accent the sliders are editing: the main one or the second one.
  let target = '--accent-warm';
  const swatch = panel.querySelector('.ct-swatch');

  function apply() {
    const h = +sliders.h.value, s = +sliders.s.value, l = +sliders.l.value;
    const hex = hslToHex(h, s, l);
    if (target === '--accent-warm') {
      root.style.setProperty('--accent-warm', hex);
      root.style.setProperty('--accent-green', hex);
      // hover / pressed variant: same hue, a step darker
      root.style.setProperty('--accent-rust', hslToHex(h, s, Math.max(0, l - 9)));
    } else {
      root.style.setProperty('--accent-2', hex);
    }
    $('hex').textContent = hex;
    swatch.style.background = hex;
    syncLabels();
  }

  // Point the sliders at whatever the chosen accent currently is on the page
  // (including any colour already previewed for it).
  function loadSliders() {
    const [h, s, l] = currentAccent(target);
    sliders.h.value = h; sliders.s.value = s; sliders.l.value = l;
    const hex = hslToHex(h, s, l);
    $('hex').textContent = hex;
    swatch.style.background = hex;
    syncLabels();
    $('t1').classList.toggle('ct-on', target === '--accent-warm');
    $('t2').classList.toggle('ct-on', target === '--accent-2');
  }

  function loadFromStylesheet() {
    ['--accent-warm', '--accent-green', '--accent-rust', '--accent-2'].forEach(p => root.style.removeProperty(p));
    loadSliders();
  }

  $('t1').addEventListener('click', () => { target = '--accent-warm'; loadSliders(); });
  $('t2').addEventListener('click', () => { target = '--accent-2'; loadSliders(); });

  Object.values(sliders).forEach(sl => {
    // The palette normally fades over 0.6s (theme switch); suspend that while
    // dragging so the colour tracks the slider instantly.
    sl.addEventListener('input', () => { root.style.transition = 'none'; apply(); });
    sl.addEventListener('change', () => { root.style.transition = ''; });
  });

  $('copy').addEventListener('click', () => {
    const hex = $('hex').textContent;
    const done = () => { $('copy').textContent = 'Copied'; setTimeout(() => { $('copy').textContent = 'Copy'; }, 1200); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(hex).then(done, () => {});
    else {
      // file:// pages have no clipboard API — select the hex so Ctrl+C works
      const range = document.createRange();
      range.selectNodeContents($('hex'));
      const sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);
      try { if (document.execCommand('copy')) done(); } catch (e) {}
    }
  });

  $('reset').addEventListener('click', loadFromStylesheet);
  $('min').addEventListener('click', () => {
    const min = panel.querySelector('#ct').classList.toggle('ct-min');
    $('min').textContent = min ? '+' : '–';
  });

  loadFromStylesheet();
})();
