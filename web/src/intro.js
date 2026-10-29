import './intro.css';

// A user gesture opens the audio context; the black screen is present before
// that gesture so loading the level cannot expose the world behind the ident.
export function createIntro({ onBegin = () => {}, onComplete = () => {}, getReducedMotion,
  logoUrl = './brand/scp-foundation-logo.svg' } = {}) {
  const overlay = document.createElement('section');
  overlay.className = 'foundation-intro';
  overlay.dataset.stage = 'awaiting';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'SCP Foundation introduction');
  overlay.innerHTML = `
    <div class="foundation-intro__start">
      <span class="foundation-intro__overline">PROJECT CHERNOBYL</span>
      <button type="button" class="foundation-intro__begin">BEGIN</button>
      <span class="foundation-intro__hint">PRESS ENTER OR CLICK TO BEGIN</span>
      <span class="foundation-intro__audio">HEADPHONES RECOMMENDED</span>
    </div>
    <div class="foundation-intro__ident" hidden>
      <img class="foundation-intro__logo" alt="SCP Foundation emblem" width="232" height="232" />
      <h1>SCP FOUNDATION</h1>
      <p>SECURE. CONTAIN. PROTECT.</p>
    </div>
    <button type="button" class="foundation-intro__skip" hidden>SKIP INTRO <span>ESC</span></button>
    <a class="foundation-intro__credit" href="./brand/CREDITS.md" target="_blank" rel="noopener" hidden>EMBLEM CREDITS</a>`;
  const begin = overlay.querySelector('.foundation-intro__begin');
  const ident = overlay.querySelector('.foundation-intro__ident');
  const skip = overlay.querySelector('.foundation-intro__skip');
  const credit = overlay.querySelector('.foundation-intro__credit');
  overlay.querySelector('img').src = new URL(logoUrl, document.baseURI).href;
  const app = document.querySelector('#app');
  const previousInert = app?.inert ?? false;
  const timers = new Set();
  let stage = 'awaiting', completed = false, disposed = false, transition = null;
  const reduced = () => (typeof getReducedMotion === 'function' && !!getReducedMotion())
    || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const later = (fn, delay) => {
    const timer = setTimeout(() => { timers.delete(timer); if (!disposed) fn(); }, delay);
    timers.add(timer); return timer;
  };
  const clearTimers = () => { for (const timer of timers) clearTimeout(timer); timers.clear(); };
  const setStage = value => {
    stage = value; overlay.dataset.stage = value;
    document.documentElement.dataset.introStage = value;
  };
  const show = () => {
    overlay.hidden = false;
    if (app) app.inert = true;
  };
  const hide = () => {
    overlay.hidden = true;
    if (app) app.inert = previousInert;
    setStage('finished');
  };

  function finish() {
    if (disposed) return;
    clearTimers();
    const callback = transition; transition = null;
    hide();
    if (!completed) { completed = true; onComplete(); }
    callback?.();
  }

  function play() {
    if (disposed || stage !== 'awaiting') return false;
    clearTimers();
    show();
    ident.hidden = skip.hidden = credit.hidden = false;
    overlay.classList.toggle('foundation-intro--reduced', reduced());
    setStage('ident');
    onBegin();
    skip.focus({ preventScroll: true });
    const still = reduced();
    later(() => setStage('fade-out'), still ? 1800 : 4800);
    later(finish, still ? 2050 : 5800);
    return true;
  }

  function fadeToGame(callback = () => {}) {
    if (disposed) { callback(); return; }
    // A route/test may open the preview before watching the ident. Complete its
    // lifecycle first so heartbeat/music cannot remain in intro mode.
    if (!completed) finish();
    clearTimers();
    transition = callback;
    ident.hidden = skip.hidden = credit.hidden = true;
    overlay.classList.add('foundation-intro--handoff');
    overlay.classList.toggle('foundation-intro--reduced', reduced());
    setStage('cover-start'); show();
    const fade = reduced() ? 140 : 520;
    overlay.style.setProperty('--foundation-transition', `${fade}ms`);
    later(() => setStage('cover'), 24);
    later(() => {
      const next = transition; transition = null;
      next?.();
      later(() => setStage('reveal'), 40);
      later(() => { hide(); overlay.classList.remove('foundation-intro--handoff'); }, fade + 60);
    }, fade + 32);
  }

  const onKey = event => {
    if (disposed || stage === 'finished') return;
    if (event.code === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); finish(); }
    else if (stage === 'awaiting' && (event.code === 'Enter' || event.code === 'Space')) {
      event.preventDefault(); event.stopImmediatePropagation(); play();
    } else {
      // Main's movement/shortcut listeners must not act behind the dark screen.
      event.stopImmediatePropagation();
    }
  };
  begin.addEventListener('click', play);
  skip.addEventListener('click', finish);
  document.addEventListener('keydown', onKey, true);
  document.body.append(overlay);
  if (app) app.inert = true;
  document.documentElement.dataset.introStage = stage;
  begin.focus({ preventScroll: true });

  return {
    play, finish, fadeToGame,
    get isActive() { return !disposed && stage !== 'finished'; },
    get stage() { return stage; },
    dispose() {
      if (disposed) return;
      clearTimers(); disposed = true; transition = null;
      document.removeEventListener('keydown', onKey, true);
      begin.removeEventListener('click', play); skip.removeEventListener('click', finish);
      if (app) app.inert = previousInert;
      overlay.remove();
      delete document.documentElement.dataset.introStage;
    },
  };
}
