// SoiLink landing page interactions
//
// Motion stack: Lenis (smooth scroll) + GSAP (ScrollTrigger, SplitText),
// with three.js + Vanta lazy-loaded for the backgrounds (DOTS in the hero,
// NET behind the investor section).
//
// Several effects are vanilla ports of React Bits components
// (https://github.com/DavidHDev/react-bits): RotatingText, SplitText,
// ScrollReveal, ScrollVelocity, Counter, CountUp, DecryptedText, Magnet and
// SpotlightCard. React Bits © David Haz — MIT + Commons Clause.
//
// Everything degrades: without JS or the CDN scripts the page shows its final
// state; with prefers-reduced-motion there is no smooth scroll, no WebGL and
// no scroll-driven motion.

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
const hasSplit = hasGSAP && typeof window.SplitText !== 'undefined';
// If the <head> failsafe already revealed the hero, don't hide it again.
const introStillHidden = root.classList.contains('js-intro');
const releaseIntro = () => root.classList.remove('js-intro');
// <html lang> is set by js/i18n.js; t() picks the string for it.
const isEn = root.lang === 'en';
const t = (ru, en) => (isEn ? en : ru);

const VANTA_SRC = {
  three: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js',
  dots: 'https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.dots.min.js',
};

document.getElementById('year').textContent = new Date().getFullYear();

/* =========================================================
   Basics (no library needed)
   ========================================================= */

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const mobileNav = document.getElementById('mobileNav');

navToggle.addEventListener('click', () => {
  const isOpen = mobileNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
  navToggle.setAttribute('aria-label', isOpen ? t('Закрыть меню', 'Close menu') : t('Открыть меню', 'Open menu'));
});

mobileNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mobileNav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', t('Открыть меню', 'Open menu'));
  });
});

// Pitch deck form — submits to Formspree (see action= on the <form>)
const pitchForm = document.getElementById('pitchForm');
const formNote = document.getElementById('formNote');
const submitBtn = pitchForm.querySelector('button[type="submit"]');

pitchForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!pitchForm.checkValidity()) {
    pitchForm.reportValidity();
    return;
  }

  submitBtn.disabled = true;
  formNote.textContent = t('Отправка…', 'Sending…');

  try {
    const response = await fetch(pitchForm.action, {
      method: 'POST',
      body: new FormData(pitchForm),
      headers: { Accept: 'application/json' },
    });

    if (response.ok) {
      formNote.textContent = t('Спасибо! Мы свяжемся с вами в ближайшее время и вышлем Pitch Deck.', 'Thank you! We’ll be in touch shortly and send you the pitch deck.');
      pitchForm.reset();
    } else {
      formNote.textContent = t('Не удалось отправить заявку. Попробуйте ещё раз или напишите нам напрямую.', 'Couldn’t send your request. Please try again or contact us directly.');
    }
  } catch (err) {
    formNote.textContent = t('Не удалось отправить заявку — проверьте соединение и попробуйте снова.', 'Couldn’t send your request — check your connection and try again.');
  } finally {
    submitBtn.disabled = false;
  }
});

// Header state, scroll progress and the current-section nav highlight
// (native scroll events fire under Lenis too). The highlight checks which
// section crosses the middle of the screen — this also holds while the
// architecture section is pinned, since it then sits right there.
const header = document.getElementById('siteHeader');
const progressBar = document.getElementById('scrollProgress');
const navTargets = Array.from(document.querySelectorAll('.nav a[href^="#"]'))
  .map((link) => ({ link, section: document.querySelector(link.getAttribute('href')) }))
  .filter((t) => t.section);
let scrollTicking = false;
const updateScrollState = () => {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const mid = window.innerHeight / 2;
  header.classList.toggle('is-scrolled', y > 8);
  progressBar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
  navTargets.forEach(({ link, section }) => {
    const r = section.getBoundingClientRect();
    link.classList.toggle('is-current', r.top <= mid && r.bottom > mid);
  });
  scrollTicking = false;
};
window.addEventListener('scroll', () => {
  if (!scrollTicking) {
    scrollTicking = true;
    requestAnimationFrame(updateScrollState);
  }
}, { passive: true });
updateScrollState();

// SpotlightCard — a light pool follows the cursor inside each AI card
if (canHover) {
  document.querySelectorAll('.scenario-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${event.clientX - r.left}px`);
      card.style.setProperty('--my', `${event.clientY - r.top}px`);
    });
  });
}

// Partner marquee — with only a few logos one list can be narrower than the
// screen, which would leave a gap in the loop. Repeat the logos (hidden from
// screen readers) until each list is at least a viewport wide.
const fillMarquee = () => {
  document.querySelectorAll('.marquee-list').forEach((list) => {
    const originals = Array.from(list.children).filter((li) => !li.dataset.clone);
    if (!originals.length || !list.offsetWidth) return;
    for (let i = 0; i < 10 && list.offsetWidth < window.innerWidth; i++) {
      originals.forEach((li) => {
        const copy = li.cloneNode(true);
        copy.dataset.clone = '1';
        copy.setAttribute('aria-hidden', 'true');
        list.appendChild(copy);
      });
    }
  });
};
fillMarquee();
window.addEventListener('resize', fillMarquee);

// Screenshot placeholders — until the real product screens are dropped into
// assets/, show a labelled placeholder instead of a broken-image icon.
document.querySelectorAll('.shot-frame img').forEach((img) => {
  const markMissing = () => {
    img.closest('.shot-frame').classList.add('is-missing');
    img.removeAttribute('alt');
  };
  img.addEventListener('error', markMissing);
  if (img.complete && img.naturalWidth === 0) markMissing();
});

/* =========================================================
   Live telemetry — Counter (odometer digits) + sparkline
   ========================================================= */

const fmtNum = (n, decimals) => n.toLocaleString(root.lang, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

// Counter: each digit is a 0–9 strip that rolls to its value.
function createRoller(el) {
  let shape = '';
  return (text) => {
    const nextShape = text.replace(/\d/g, '0');
    if (nextShape !== shape) {
      el.textContent = '';
      for (const ch of text) {
        if (/\d/.test(ch)) {
          const digit = document.createElement('span');
          digit.className = 'digit';
          const strip = document.createElement('span');
          strip.className = 'digit-strip';
          strip.style.transform = `translateY(${-Number(ch)}em)`;
          for (let n = 0; n < 10; n++) {
            const s = document.createElement('span');
            s.textContent = n;
            strip.appendChild(s);
          }
          digit.appendChild(strip);
          el.appendChild(digit);
        } else {
          const sep = document.createElement('span');
          sep.className = 'digit-sep';
          sep.textContent = ch;
          el.appendChild(sep);
        }
      }
      shape = nextShape;
    } else {
      const strips = el.querySelectorAll('.digit-strip');
      let i = 0;
      for (const ch of text) {
        if (/\d/.test(ch)) strips[i++].style.transform = `translateY(${-Number(ch)}em)`;
      }
    }
    el.setAttribute('aria-label', text);
  };
}

const sensors = Array.from(document.querySelectorAll('[data-tele]')).map((el) => {
  const min = parseFloat(el.dataset.min);
  const max = parseFloat(el.dataset.max);
  return {
    min,
    max,
    decimals: parseInt(el.dataset.decimals || '1', 10),
    value: parseFloat(el.textContent.replace(',', '.')) || (min + max) / 2,
    render: createRoller(el),
    bar: el.closest('.tele-cell').querySelector('.tele-bar i'),
  };
});

const paintSensor = (s) => {
  s.render(fmtNum(s.value, s.decimals));
  if (s.bar) s.bar.style.width = `${((s.value - s.min) / (s.max - s.min)) * 100}%`;
};
sensors.forEach(paintSensor);

// Values drift within a plausible band so the panel reads as a real feed.
const driftSensors = () => {
  if (document.hidden) return;
  sensors.forEach((s) => {
    const step = (Math.random() - 0.5) * (s.max - s.min) * 0.2;
    s.value = Math.min(s.max, Math.max(s.min, s.value + step));
    paintSensor(s);
  });
};
if (!reduceMotion && sensors.length) setInterval(driftSensors, 2400);

// Sparkline for the 24h chart
const teleChart = document.querySelector('.tele-chart');
if (teleChart) {
  const w = 240;
  const h = 56;
  const points = 26;
  const vals = [];
  let v = 0.5;
  for (let i = 0; i < points; i++) {
    v = Math.min(0.92, Math.max(0.12, v + (Math.random() - 0.48) * 0.22));
    vals.push(v);
  }
  const coords = vals.map((val, i) => [(i / (points - 1)) * w, h - val * h]);
  // smooth the path with midpoint curves
  let d = `M ${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)}`;
  for (let i = 1; i < coords.length; i++) {
    const [px, py] = coords[i - 1];
    const [cx, cy] = coords[i];
    d += ` Q ${px.toFixed(1)} ${py.toFixed(1)} ${((px + cx) / 2).toFixed(1)} ${((py + cy) / 2).toFixed(1)}`;
  }
  d += ` T ${coords[coords.length - 1][0].toFixed(1)} ${coords[coords.length - 1][1].toFixed(1)}`;

  teleChart.querySelector('.tele-line').setAttribute('d', d);
  teleChart.querySelector('.tele-area').setAttribute('d', `${d} L ${w} ${h} L 0 ${h} Z`);
}

/* =========================================================
   Motion layer (GSAP + Lenis)
   ========================================================= */

if (hasGSAP) {
  initMotion();
} else {
  releaseIntro();
}

function initMotion() {
  gsap.registerPlugin(ScrollTrigger);
  if (hasSplit) gsap.registerPlugin(SplitText);

  // ---------- Lenis smooth scroll, driven by GSAP's ticker ----------
  if (!reduceMotion && typeof window.Lenis !== 'undefined') {
    const lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // Anchor links glide with Lenis. Positions are measured here rather than
    // by Lenis so the pinned architecture section lands at its pin start.
    const anchorY = (el) => {
      if (el.id === 'top') return 0;
      const pinned = ScrollTrigger.getAll().find((t) => t.pin === el);
      if (pinned) return pinned.start;
      return el.getBoundingClientRect().top + window.scrollY - header.offsetHeight;
    };
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      const target = link && link.hash.length > 1 && document.querySelector(link.hash);
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(anchorY(target));
      history.replaceState(null, '', link.hash);
    });
  }

  // Layout shifts once web fonts land — re-measure every trigger.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  const mm = gsap.matchMedia();
  initArchitecture(mm);

  if (reduceMotion) {
    releaseIntro();
    return;
  }

  const introStartedAt = performance.now();
  heroIntro();
  initRotator(document.querySelector('.rotator'));
  initDecrypt(introStartedAt);
  initMagnets();
  initHeadingReveals();
  initScrollReveal(document.querySelector('[data-scroll-reveal]'));
  initCountUp();
  initShowcase(mm);
  initVelocityMarquee();
  ScrollTrigger.sort();

  if (document.readyState === 'complete') initVanta();
  else window.addEventListener('load', initVanta, { once: true });
}

// ---------- Hero intro: the page's one orchestrated moment ----------
function heroIntro() {
  if (!introStillHidden) return;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // SplitText — the headline assembles letter by letter
  let chars = [];
  if (hasSplit) {
    document.querySelectorAll('.hero-title [data-split]').forEach((el) => {
      chars = chars.concat(SplitText.create(el, { type: 'words,chars' }).chars);
    });
  }

  tl.from('.hero-pill', { y: 14, opacity: 0, duration: 0.6 }, 0);
  if (chars.length) {
    tl.from(chars, { yPercent: 70, opacity: 0, duration: 0.9, stagger: 0.022 }, 0.1);
  } else {
    tl.from('.hero-title', { y: 30, opacity: 0, duration: 0.9 }, 0.1);
  }
  tl.from('.rotator', { scale: 0.6, opacity: 0, duration: 0.9, ease: 'back.out(1.8)' }, 0.55)
    .from('.hero-sub', { y: 18, opacity: 0, duration: 0.8 }, 0.6)
    .from('.hero-actions', { y: 18, opacity: 0, duration: 0.8 }, 0.72)
    .from('.scenario-frame', { y: 90, opacity: 0, scale: 0.96, duration: 1.3, ease: 'expo.out' }, 0.82)
    .add(() => driftSensorsOnce(), 1.3);

  // gsap.from() has already applied the start state, so the guard can go
  releaseIntro();
}

function driftSensorsOnce() {
  sensors.forEach((s) => {
    s.value = Math.min(s.max, Math.max(s.min, s.value + (Math.random() - 0.5) * (s.max - s.min) * 0.3));
    paintSensor(s);
  });
}

// ---------- RotatingText: аграриев → агрономов → фермеров ----------
function initRotator(box) {
  if (!box) return;
  const words = box.dataset.words.split(',');
  let index = 0;
  let heroVisible = true;

  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => { heroVisible = self.isActive; },
  });

  const build = (text) => {
    const word = document.createElement('span');
    word.className = 'rotator-word';
    for (const ch of text) {
      const c = document.createElement('span');
      c.className = 'rotator-char';
      c.textContent = ch;
      word.appendChild(c);
    }
    return word;
  };

  let current = build(words[0]);
  box.replaceChildren(current);

  const swap = () => {
    index = (index + 1) % words.length;
    const next = build(words[index]);
    const cs = getComputedStyle(box);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);

    // The incoming word sits on top of the outgoing one while the chip resizes
    Object.assign(next.style, { position: 'absolute', left: cs.paddingLeft, top: cs.paddingTop });
    box.appendChild(next);
    const fromW = box.offsetWidth;
    const toW = next.offsetWidth + padX;
    const outgoing = current;
    current = next;

    gsap.timeline({
      onComplete: () => {
        outgoing.remove();
        next.removeAttribute('style');
        gsap.set(box, { clearProps: 'width' });
      },
    })
      .set(box, { width: fromW })
      .to(outgoing.children, { yPercent: -120, opacity: 0, duration: 0.4, ease: 'power3.in', stagger: 0.018 }, 0)
      .to(box, { width: toW, duration: 0.6, ease: 'power3.inOut' }, 0.15)
      .fromTo(next.children,
        { yPercent: 110, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.65, ease: 'back.out(1.5)', stagger: 0.024 }, 0.28);
  };

  const loop = () => {
    if (heroVisible && !document.hidden) swap();
    gsap.delayedCall(2.6, loop);
  };
  gsap.delayedCall(3.4, loop);
}

// ---------- DecryptedText: AI commands resolve out of noise ----------
function initDecrypt(introStartedAt) {
  const POOL = t('абвгдежзиклмнопрстуфхцчшщэюя', 'abcdefghijklmnopqrstuvwxyz') + '0123456789';
  const KEEP = /[\s«»“”().,:%\-–—/]/;

  document.querySelectorAll('[data-decrypt]').forEach((el, i) => {
    const text = el.textContent;
    const chars = Array.from(text);
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    const visual = document.createElement('span');
    visual.setAttribute('aria-hidden', 'true');
    el.replaceChildren(sr, visual);

    let revealed = 0;
    const paint = () => {
      const rest = chars.slice(revealed)
        .map((c) => (KEEP.test(c) ? c : POOL[(Math.random() * POOL.length) | 0]))
        .join('');
      visual.textContent = chars.slice(0, revealed).join('');
      if (rest) {
        const s = document.createElement('span');
        s.className = 'is-scrambled';
        s.textContent = rest;
        visual.appendChild(s);
      }
    };
    paint();

    const play = () => {
      // Lock the final height so lines don't jump while glyph widths churn
      visual.textContent = text;
      el.style.minHeight = `${el.offsetHeight}px`;
      paint();
      const timer = setInterval(() => {
        revealed = Math.min(chars.length, revealed + 2);
        paint();
        if (revealed === chars.length) clearInterval(timer);
      }, 28);
    };

    ScrollTrigger.create({
      trigger: el,
      start: 'top 92%',
      once: true,
      onEnter: () => {
        // Cards visible on load wait for the frame to rise, then go in turn
        const wait = Math.max(0, 1500 - (performance.now() - introStartedAt));
        setTimeout(play, wait + i * 260);
      },
    });
  });
}

// ---------- Magnet: hero CTAs lean toward the cursor ----------
function initMagnets() {
  if (!canHover) return;
  document.querySelectorAll('[data-magnet]').forEach((el) => {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    const pad = 70;
    const strength = 5;
    let active = false;

    window.addEventListener('pointermove', (event) => {
      const r = el.getBoundingClientRect();
      // measure from the resting centre so the pull doesn't feed back on itself
      const cx = r.left + r.width / 2 - gsap.getProperty(el, 'x');
      const cy = r.top + r.height / 2 - gsap.getProperty(el, 'y');
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const inside = Math.abs(dx) < r.width / 2 + pad && Math.abs(dy) < r.height / 2 + pad;
      if (inside) {
        active = true;
        xTo(dx / strength);
        yTo(dy / strength);
      } else if (active) {
        active = false;
        xTo(0);
        yTo(0);
      }
    }, { passive: true });
  });
}

// ---------- Section headings: masked line reveal (SplitText lines) ----------
function initHeadingReveals() {
  if (hasSplit) {
    document.querySelectorAll('[data-reveal-lines]').forEach((el) => {
      SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'split-line',
        autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, {
          yPercent: 110,
          duration: 1,
          ease: 'power4.out',
          stagger: 0.1,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }),
      });
    });
  }

  document.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 26,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
      delay: el.matches('.invest-list li:nth-child(2)') ? 0.1 : 0.08,
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
}

// ---------- ScrollReveal: the statement sharpens word by word ----------
function initScrollReveal(el) {
  if (!el || !hasSplit) return;
  const { words } = SplitText.create(el, { type: 'words' });

  gsap.fromTo(el, { rotate: 2.5, transformOrigin: '0% 50%' }, {
    rotate: 0,
    ease: 'none',
    scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom 55%', scrub: true },
  });
  gsap.fromTo(words, { opacity: 0.1, filter: 'blur(6px)' }, {
    opacity: 1,
    filter: 'blur(0px)',
    ease: 'none',
    stagger: 0.05,
    scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 55%', scrub: true },
  });
}

// ---------- CountUp: stats count in when they reach the screen ----------
// The final value lives in the HTML, so the real numbers are on screen if
// this never runs; the tween only rewinds to zero and plays back up.
function initCountUp() {
  document.querySelectorAll('[data-count-to]').forEach((el) => {
    const target = parseFloat(el.dataset.countTo);
    if (!Number.isFinite(target)) return;
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const counter = { v: 0 };

    gsap.to(counter, {
      v: target,
      duration: 2.2,
      ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top bottom', once: true },
      onUpdate: () => { el.textContent = prefix + fmtNum(counter.v, decimals) + suffix; },
    });
  });
}

// ---------- Product screens: dashboard lands flat, phone drifts ----------
function initShowcase(mm) {
  mm.add('(min-width: 761px)', () => {
    gsap.fromTo('.shot-frame-browser',
      { rotateX: 24, scale: 0.9, y: 40 },
      {
        rotateX: 0, scale: 1, y: 0, ease: 'none',
        scrollTrigger: { trigger: '.showcase-grid', start: 'top 95%', end: 'top 30%', scrub: 0.6 },
      });
    // move the whole figure so the caption travels with the phone
    gsap.fromTo('.shot-mobile', { y: 140 }, {
      y: -30,
      ease: 'none',
      scrollTrigger: { trigger: '.showcase-grid', start: 'top bottom', end: 'bottom top', scrub: 0.6 },
    });
  });
}

// ---------- ScrollVelocity: partner marquee reacts to scroll speed ----------
function initVelocityMarquee() {
  const track = document.querySelector('.marquee-track');
  const list = track && track.querySelector('.marquee-list');
  if (!list) return;

  track.classList.add('is-velocity');
  let width = list.offsetWidth;
  window.addEventListener('resize', () => { width = list.offsetWidth; });

  const setX = gsap.quickSetter(track, 'x', 'px');
  const zone = ScrollTrigger.create({ trigger: '.trust-strip', start: 'top bottom', end: 'bottom top' });
  const baseSpeed = 42; // px per second
  let x = -width / 2;
  let direction = 1;
  let lastY = window.scrollY;
  let velocity = 0;

  gsap.ticker.add((time, deltaMs) => {
    const y = window.scrollY;
    velocity += ((y - lastY) - velocity) * 0.12; // smoothed px per frame
    lastY = y;
    if (!zone.isActive) return;

    if (velocity > 0.2) direction = 1;
    else if (velocity < -0.2) direction = -1;
    const boost = Math.min(8, Math.abs(velocity) / 3);
    x = gsap.utils.wrap(-width, 0, x + direction * baseSpeed * (deltaMs / 1000) * (1 + boost));
    setX(x);
  });
}

// ---------- Architecture: a data packet travels sensor → phone ----------
function initArchitecture(mm) {
  const section = document.getElementById('architecture');
  const flow = document.getElementById('archFlow');
  if (!flow) return;

  const track = flow.querySelector('.arch-track');
  const fill = flow.querySelector('.arch-track-fill');
  const rail = flow.querySelector('.arch-rail');
  const packet = flow.querySelector('.arch-packet');
  const steps = Array.from(flow.querySelectorAll('.arch-step'));
  const nodes = steps.map((s) => s.querySelector('.arch-node'));
  let vertical = false;

  flow.classList.add('is-animated');

  // Stretch the track from the first node's centre to the last one's
  const measure = () => {
    const f = flow.getBoundingClientRect();
    const centre = (n) => {
      const r = n.getBoundingClientRect();
      return [r.left + r.width / 2 - f.left, r.top + r.height / 2 - f.top];
    };
    const [ax, ay] = centre(nodes[0]);
    const [bx, by] = centre(nodes[nodes.length - 1]);
    vertical = Math.abs(bx - ax) < 2;
    track.classList.toggle('is-vertical', vertical);
    Object.assign(track.style, vertical
      ? { left: `${ax - 1}px`, top: `${ay}px`, width: '2px', height: `${by - ay}px` }
      : { left: `${ax}px`, top: `${ay - 1}px`, width: `${bx - ax}px`, height: '2px' });
  };
  ScrollTrigger.addEventListener('refresh', measure);

  const setActive = (p) => {
    steps.forEach((s, i) => s.classList.toggle('is-active', p >= i / (steps.length - 1) - 0.01));
  };

  mm.add({
    desktop: '(min-width: 901px) and (min-height: 640px)',
    compact: '(max-width: 900px), (max-height: 639px)',
    reduce: '(prefers-reduced-motion: reduce)',
  }, (ctx) => {
    measure();
    const { desktop, reduce } = ctx.conditions;

    if (reduce) {
      setActive(1);
      return undefined;
    }

    setActive(0);
    const scaleProp = vertical ? 'scaleY' : 'scaleX';
    const moveProp = vertical ? 'yPercent' : 'xPercent';

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      onUpdate: () => setActive(tl.progress()),
      scrollTrigger: desktop
        ? {
          trigger: section,
          // centre the section while pinned when it fits, otherwise pin at its top
          start: () => (section.offsetHeight < window.innerHeight ? 'center center' : 'top top'),
          end: '+=150%',
          pin: true,
          // refresh before the triggers below it, so they account for the pin spacer
          refreshPriority: 1,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        }
        : { trigger: flow, start: 'top 70%', end: 'bottom 55%', scrub: 0.6 },
    });

    tl.fromTo(fill, { [scaleProp]: 0 }, { [scaleProp]: 1, duration: 1 }, 0)
      .fromTo(rail, { [moveProp]: 0 }, { [moveProp]: 100, duration: 1 }, 0)
      .fromTo(packet, { opacity: 0 }, { opacity: 1, duration: 0.03 }, 0)
      .to(packet, { opacity: 0, duration: 0.03 }, 0.97);

    return () => {
      gsap.set([fill, rail, packet], { clearProps: 'all' });
      steps.forEach((s) => s.classList.remove('is-active'));
    };
  });
}

/* =========================================================
   Vanta backgrounds (three.js, lazy-loaded)
   ========================================================= */

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (err) {
    return false;
  }
}

function mountVanta(el, effect, options) {
  const instance = effect({
    el,
    mouseControls: canHover,
    touchControls: false,
    gyroControls: false,
    minHeight: 200,
    minWidth: 200,
    scale: 1,
    scaleMobile: 1,
    ...options,
  });
  el.classList.add('has-vanta');
  requestAnimationFrame(() => el.classList.add('is-visible'));
  return instance;
}

async function initVanta() {
  if (!supportsWebGL()) return;
  try {
    await loadScript(VANTA_SRC.three);
    await loadScript(VANTA_SRC.dots);
  } catch (err) {
    return; // the static CSS backgrounds stay in place
  }

  // Hero: a field of sensors in perspective, rolling gently like terrain
  mountVanta(document.getElementById('heroBg'), VANTA.DOTS, {
    color: 0x0a6cff,
    color2: 0x7ec4ff,
    backgroundColor: 0xffffff,
    size: 2.6,
    spacing: 32,
    showLines: false,
  });
}
