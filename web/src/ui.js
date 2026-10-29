const FORCES = ['Nu-7', 'Epsilon-11', 'Beta-7', 'Zeta-9'];
const DEFAULT_SETTINGS = { blood: true, reducedMotion: false, subtitles: true, sound: true, music: true, voice: true, quality: typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches ? 'balanced' : 'high' };
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const pad = value => String(value).padStart(2, '0');

/** DOM and canvas presentation only; gameplay state remains owned by the game. */
export function createUI({ canon, onAction }) {
  const root = document.querySelector('#app');
  if (!root) throw new Error('The game needs an #app element.');
  const disposers = [];
  const timers = new Set();
  let screen = 'intro';
  let force = FORCES[0];
  let mode = 'operative';
  let settings = { ...DEFAULT_SETTINGS };
  let currentView = null;
  let subtitleToken = 0;
  let noticeToken = 0;
  let deployedAt = 0;
  let minimapAt = 0;
  let bossAt = 0;
  const action = (type, value) => onAction({ type, value });

  root.innerHTML = `
    <div class="game-ui screen-intro">
      <div class="screen-noise" aria-hidden="true"></div>
      <header class="identity-strip">
        <div class="identity"><span class="foundation-mark" aria-hidden="true"><img src="./brand/scp-foundation-logo.svg" width="43" height="43" alt="" /></span><span>SCP FOUNDATION<small>EXCLUSION ZONE OPERATIONS</small></span></div>
        <div class="identity-right"><span class="status-dot"></span> LOCAL FIELD CONNECTION <b>CH / 04</b></div>
      </header>

      <section class="intro-screen menu-screen" aria-labelledby="game-title">
        <div class="intro-primary">
          <div class="eyebrow"><span class="classification">LEVEL 4</span> RESTRICTED DEPLOYMENT / 1986</div>
          <h1 id="game-title"><span>PROJECT</span>CHERNOBYL<span class="title-rule" aria-hidden="true"></span></h1>
          <p class="intro-tagline">The power is out.<br>The facility is <em>not empty.</em></p>
          <div class="warning-block" role="note">
            <span class="warning-symbol" aria-hidden="true">!</span>
            <div><strong>WARNING — ENTER AT YOUR DISCRETION</strong><p>Horror, gunfire, flashing effects, and stylized blood.<br>Reduce motion or disable blood in field settings below.</p></div>
          </div>

          <fieldset class="force-selection"><legend><span>01</span> SELECT YOUR TASK FORCE</legend>
            <div class="force-options">${FORCES.map((name, index) => `<button class="force-option ${index === 0 ? 'selected' : ''}" type="button" data-force="${name}" aria-pressed="${index === 0}"><span class="force-index">0${index + 1}</span>${name}<i aria-hidden="true">${index === 0 ? '●' : '○'}</i></button>`).join('')}</div>
          </fieldset>
          <fieldset class="mode-selection"><legend><span>02</span> DEPLOYMENT MODE</legend>
            <div class="mode-options"><button type="button" class="mode-option selected" data-mode="operative" aria-pressed="true"><b>OPERATIVE</b><small>Full combat · survive the zone</small></button><button type="button" class="mode-option" data-mode="tour" aria-pressed="false"><b>RECON TOUR</b><small>No player damage · explore freely</small></button></div>
          </fieldset>
          <button type="button" class="deploy-button" data-action="deploy"><span>DEPLOY TO THE ZONE</span><span class="deploy-arrow" aria-hidden="true">↗</span></button>
          <div class="deploy-caption"><span class="status-dot"></span> WEAPON LIGHT ISSUED · SINGLE-PLAYER BROWSER PROTOTYPE</div>
          <button type="button" class="execution-preview-button" data-action="preview-executions">EXECUTION LAB · VIEW 20 ANIMATIONS <span aria-hidden="true">↗</span></button>
          <div class="intro-settings" aria-label="Field settings">${settingButtons()}</div>
          <p class="audio-note">Ambient score · recorded weapon audio · recorded dialogue when supplied. Subtitles remain available.</p>
        </div>

        <aside class="intro-brief" aria-label="Operation briefing">
          <div class="brief-top"><span>OPERATION BRIEF / OVERWATCH</span><b>SECURE CHANNEL</b></div>
          <div class="zone-symbol" aria-hidden="true"><span>☢</span><i class="zone-line line-one"></i><i class="zone-line line-two"></i><b>51°23′ N / 30°06′ E</b></div>
          <div class="brief-copy"><h2>RECOVER. CONTAIN.<br>GET OUT ALIVE.</h2><p>Follow Overwatch through a dark industrial facility. Recover field data, isolate threats, and complete your objectives to unlock extraction.</p></div>
          <div class="operation-stats"><div><strong>06</strong><span>CONNECTED<br>SECTORS</span></div><div><strong>08</strong><span>UNIQUE<br>THREATS</span></div><div><strong>01</strong><span>EXTRACTION<br>POINT</span></div></div>
          <div class="brief-rules"><div><span>↳</span><p><b>KEEP YOUR LIGHT FORWARD.</b> Every weapon has a permanent flashlight. Facility lights stay off.</p></div><div><span>↳</span><p><b>WATCH YOUR STAMINA.</b> Sprinting buys distance. It does not buy safety.</p></div><div><span>↳</span><p><b>MAKE IT COUNT.</b> Regular infected return. Defeated bosses stay down for this run.</p></div></div>
          <div class="brief-controls"><span>FIELD CONTROLS</span><p><kbd>WASD</kbd> move <kbd>MOUSE</kbd> look <kbd>SHIFT</kbd> sprint<br><kbd>LMB</kbd> fire <kbd>RMB</kbd> aim <kbd>R</kbd> reload <kbd>E</kbd> interact</p></div>
          <div class="brief-footer"><span>REACTORS 1–4 / UNFINISHED 5–6</span><b>ALL SYSTEMS OFFLINE</b></div>
        </aside>
      </section>

      <section class="play-hud" aria-label="Field display">
        <div class="hud-location"><span class="tiny-label">CURRENT LOCATION</span><strong data-ref="sector">FOUNDATION CHECKPOINT</strong><span class="location-sub"><i class="status-dot"></i> FACILITY POWER OFF <b data-ref="heading">N / 000°</b></span></div>
        <div class="mission-panel"><div class="mission-heading"><span class="radio-icon" aria-hidden="true">◖))</span><b>OVERWATCH</b><span data-ref="mission-count">01 / --</span></div><h2 data-ref="mission-title">ESTABLISH CONTACT</h2><p data-ref="mission-text">Awaiting operational instructions.</p><div class="mission-distance"><i></i><span data-ref="mission-distance">FIELD OBJECTIVE</span></div></div>
        <div class="map-unit"><div class="map-heading"><span>TACTICAL MAP</span><b>N ↑</b></div><canvas class="minimap" width="512" height="512" aria-label="Minimap showing sectors, your position, and the active objective"></canvas><div class="map-legend"><span><i class="legend-player"></i> YOU</span><span><i class="legend-target"></i> OBJECTIVE</span><b data-ref="map-grid">CH / 06</b></div></div>
        <div class="boss-display" hidden><div><b data-ref="boss-name"></b><span data-ref="boss-class"></span></div><div class="boss-track"><i data-ref="boss-fill"></i></div><span data-ref="boss-hp"></span></div>
        <div class="reticle" aria-hidden="true"><i></i><i></i><i></i><i></i><b></b></div>
        <div class="hit-marker" aria-hidden="true">×</div>
        <div class="interaction-prompt" hidden><kbd>E</kbd><span data-ref="interaction-label">INTERACT</span><b>HOLD POSITION</b></div>
        <div class="health-unit"><div class="unit-label"><span>OPERATOR VITALS</span><b data-ref="force">NU-7</b></div><div class="health-number"><span class="medical-cross" aria-hidden="true">+</span><strong data-ref="health">100</strong><span>/ 100</span><b data-ref="condition">STABLE</b></div><div class="health-track"><i data-ref="health-fill"></i></div><div class="stamina-label"><span>STAMINA</span><b data-ref="stamina">100%</b></div><div class="stamina-track"><i data-ref="stamina-fill"></i></div></div>
        <div class="ammo-unit"><div class="unit-label"><span>PROTOTYPE RIFLE</span><b>5.56</b></div><div class="ammo-number"><strong data-ref="ammo">30</strong><span>/</span><b data-ref="reserve">240</b></div><div class="ammo-footer"><span data-ref="reload-status">R / RELOAD</span><b>● LIGHT ON</b></div></div>
        <div class="bottom-readout"><span data-ref="run-status">FIELD OPERATIVE</span><span><kbd>ESC</kbd> PAUSE <i>·</i> <kbd>C</kbd> CROUCH <i>·</i> <kbd>E</kbd> INTERACT</span><b data-ref="run-time">00:00</b></div>
        <button class="pause-button hud-clickable" type="button" data-action="pause" aria-label="Pause game">Ⅱ</button>
        <div class="subtitle-box" hidden aria-live="polite"><b data-ref="subtitle-speaker"></b><p data-ref="subtitle-text"></p></div>
        <div class="notice-box" hidden aria-live="polite"><span>FIELD UPDATE</span><p data-ref="notice"></p></div>
        <div class="damage-vignette" aria-hidden="true"></div>
      </section>

      <section class="pause-screen overlay-screen menu-screen" hidden aria-labelledby="pause-title"><div class="overlay-dossier"><span class="eyebrow">SECURE CHANNEL / STANDBY</span><h2 id="pause-title">OPERATION<br>PAUSED.</h2><p>Take a breath. Overwatch will hold the channel.</p><button class="deploy-button" type="button" data-action="resume"><span>RETURN TO FACILITY</span><span aria-hidden="true">↗</span></button><button class="execution-preview-button" type="button" data-action="preview-executions">EXECUTION LAB · VIEW 20 ANIMATIONS <span aria-hidden="true">↗</span></button><div class="overlay-settings">${settingButtons()}</div><div class="control-reference"><div><kbd>WASD</kbd><span>Move</span><kbd>SPACE</kbd><span>Jump</span></div><div><kbd>SHIFT</kbd><span>Sprint</span><kbd>C</kbd><span>Crouch</span></div><div><kbd>LMB</kbd><span>Fire</span><kbd>RMB</kbd><span>Aim</span></div><div><kbd>R</kbd><span>Reload</span><kbd>E</kbd><span>Interact</span></div></div><button class="text-button" type="button" data-action="restart">START A NEW RUN <span>↗</span></button><p class="small-note">A new run resets objectives and defeated bosses.</p></div></section>
      <section class="dead-screen overlay-screen menu-screen" hidden aria-labelledby="dead-title"><div class="overlay-dossier"><span class="eyebrow alert-text">OPERATOR SIGNAL LOST</span><h2 id="dead-title">CONNECTION<br>SEVERED.</h2><p>You fell in the exclusion zone. Overwatch can redeploy you at the checkpoint.</p><div class="persistence-note"><span>RUN STATE RETAINED</span><p>Completed objectives and defeated bosses remain.<br>Regular infected can return.</p></div><button class="deploy-button" type="button" data-action="respawn"><span>REDEPLOY AT CHECKPOINT</span><span aria-hidden="true">↗</span></button><button class="text-button" type="button" data-action="restart">START A NEW RUN <span>↗</span></button></div></section>
      <section class="won-screen overlay-screen menu-screen" hidden aria-labelledby="won-title"><div class="overlay-dossier"><span class="eyebrow">OVERWATCH / EXTRACTION CONFIRMED</span><h2 id="won-title">SIGNAL<br>RECOVERED.</h2><p>Operational objectives complete. You made it out of the zone.</p><div class="extraction-stats"><div><b data-ref="won-missions">--</b><span>OBJECTIVES</span></div><div><b data-ref="won-bosses">--</b><span>BOSSES DEFEATED</span></div><div><b data-ref="won-time">--</b><span>FIELD TIME</span></div></div><button class="deploy-button" type="button" data-action="restart"><span>BEGIN ANOTHER OPERATION</span><span aria-hidden="true">↗</span></button><p class="small-note">End of browser prototype. The facility still has secrets.</p></div></section>
      <div class="cinematic-bars" aria-hidden="true"><div class="cinematic-top"><span>OPERATOR COMPROMISED</span><b>THIRD-PERSON / LIVE FEED</b></div><div class="cinematic-bottom"><span data-ref="execution-label">CLOSE CONTACT</span><b>OVERWATCH / SIGNAL UNSTABLE</b></div></div>
      <div class="mobile-controls"><div class="touch-look" aria-label="Drag to look"></div><div class="touch-stick" aria-label="Drag to move"><div></div></div><div class="touch-actions"><button type="button" data-touch="fire" aria-label="Fire weapon">FIRE</button><button type="button" data-touch="aim" aria-label="Aim weapon">AIM</button><button type="button" data-touch="reload" aria-label="Reload">R</button><button type="button" data-touch="interact" aria-label="Interact">E</button><button type="button" data-touch="sprint" aria-label="Sprint">RUN</button><button type="button" data-touch="crouch" aria-label="Crouch">LOW</button></div></div>
      <footer class="intro-footer"><span>UNAUTHORIZED ACCESS PROHIBITED</span><span>BLOCKY 3D / BROWSER ADAPTATION</span><span>VISUAL UPDATE <b>0.5</b></span></footer>
    </div>`;

  const ui = root.querySelector('.game-ui');
  const refs = Object.fromEntries([...root.querySelectorAll('[data-ref]')].map(element => [element.dataset.ref, element]));
  const elements = {
    intro: root.querySelector('.intro-screen'), pause: root.querySelector('.pause-screen'), dead: root.querySelector('.dead-screen'), won: root.querySelector('.won-screen'),
    hud: root.querySelector('.play-hud'), subtitle: root.querySelector('.subtitle-box'), notice: root.querySelector('.notice-box'),
    boss: root.querySelector('.boss-display'), prompt: root.querySelector('.interaction-prompt'), hit: root.querySelector('.hit-marker'), damage: root.querySelector('.damage-vignette'),
  };
  const mapCanvas = root.querySelector('.minimap');
  const mapContext = mapCanvas.getContext('2d');
  const bind = (element, name, callback, options) => {
    element.addEventListener(name, callback, options);
    disposers.push(() => element.removeEventListener(name, callback, options));
  };
  const later = (callback, delay) => {
    const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay);
    timers.add(timer);
    return timer;
  };
  const setText = (name, value) => { if (refs[name] && refs[name].textContent !== String(value)) refs[name].textContent = value; };

  function settingButtons() {
    return Object.entries({ sound: 'MASTER SOUND', music: 'AMBIENT MUSIC', voice: 'RECORDED VOICE', subtitles: 'SUBTITLES', blood: 'BLOOD FX', reducedMotion: 'REDUCED MOTION' })
      .map(([key, label]) => `<button type="button" data-setting="${key}" aria-pressed="${DEFAULT_SETTINGS[key]}"><i aria-hidden="true"></i>${label}<b>${DEFAULT_SETTINGS[key] ? 'ON' : 'OFF'}</b></button>`).join('') + `<div class="quality-options" aria-label="Graphics quality"><span>GRAPHICS</span><button type="button" data-quality="high" aria-pressed="${DEFAULT_SETTINGS.quality === 'high'}">HIGH</button><button type="button" data-quality="balanced" aria-pressed="${DEFAULT_SETTINGS.quality === 'balanced'}">BALANCED</button></div>`;
  }

  function syncSettings() {
    root.querySelectorAll('[data-setting]').forEach(button => {
      const enabled = !!settings[button.dataset.setting];
      button.setAttribute('aria-pressed', String(enabled));
      button.querySelector('b').textContent = enabled ? 'ON' : 'OFF';
    });
    root.querySelectorAll('[data-quality]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.quality === settings.quality)));
    ui.classList.toggle('reduced-motion', !!settings.reducedMotion);
    if (!settings.subtitles) elements.subtitle.hidden = true;
  }

  root.querySelectorAll('[data-force]').forEach(button => bind(button, 'click', () => {
    force = button.dataset.force;
    root.querySelectorAll('[data-force]').forEach(option => {
      const selected = option === button;
      option.classList.toggle('selected', selected);
      option.setAttribute('aria-pressed', String(selected));
      option.querySelector('i').textContent = selected ? '●' : '○';
    });
  }));
  root.querySelectorAll('[data-mode]').forEach(button => bind(button, 'click', () => {
    mode = button.dataset.mode;
    root.querySelectorAll('[data-mode]').forEach(option => {
      const selected = option === button;
      option.classList.toggle('selected', selected);
      option.setAttribute('aria-pressed', String(selected));
    });
  }));
  root.querySelectorAll('[data-setting]').forEach(button => bind(button, 'click', () => {
    const key = button.dataset.setting;
    settings[key] = !settings[key];
    syncSettings();
    action('settings', { [key]: settings[key] });
  }));
  root.querySelectorAll('[data-quality]').forEach(button => bind(button, 'click', () => {
    settings.quality = button.dataset.quality;
    syncSettings();
    action('settings', { quality: settings.quality });
  }));
  root.querySelectorAll('[data-action]').forEach(button => bind(button, 'click', () => {
    const type = button.dataset.action;
    if (type === 'deploy') {
      deployedAt = performance.now();
      action('start', { force, mode });
    } else if (type === 'restart') {
      action('restart');
    } else action(type);
  }));

  // Touch controls use pointer capture so finger release outside a control
  // cannot leave firing or movement latched on.
  const activeTouch = new Set();
  root.querySelectorAll('[data-touch]').forEach(button => {
    const name = button.dataset.touch;
    const release = event => {
      if (!activeTouch.delete(button)) return;
      button.classList.remove('pressed');
      if (name === 'fire') action('fire-stop');
      if (name === 'aim') action('aim', false);
      if (name === 'sprint' || name === 'crouch') action('move', { name, active: false });
      if (event?.pointerId !== undefined && button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    };
    bind(button, 'pointerdown', event => {
      event.preventDefault(); event.stopPropagation();
      button.setPointerCapture(event.pointerId);
      activeTouch.add(button); button.classList.add('pressed');
      if (name === 'fire') action('fire-start');
      else if (name === 'aim') action('aim', true);
      else if (name === 'sprint' || name === 'crouch') action('move', { name, active: true });
      else action(name);
    });
    bind(button, 'pointerup', release);
    bind(button, 'pointercancel', release);
    bind(button, 'lostpointercapture', release);
  });
  const stick = root.querySelector('.touch-stick');
  const stickThumb = stick.firstElementChild;
  let stickPointer = null;
  const stickDirections = new Set();
  function releaseStick() {
    for (const name of stickDirections) action('move', { name, active: false });
    stickDirections.clear(); stickPointer = null;
    stickThumb.style.transform = 'translate(-50%, -50%)';
  }
  const moveStick = event => {
    if (event.pointerId !== stickPointer) return;
    const rect = stick.getBoundingClientRect();
    const dx = clamp((event.clientX - rect.left - rect.width / 2) / (rect.width * .36), -1, 1);
    const dy = clamp((event.clientY - rect.top - rect.height / 2) / (rect.height * .36), -1, 1);
    stickThumb.style.transform = `translate(calc(-50% + ${dx * 24}px), calc(-50% + ${dy * 24}px))`;
    const wanted = new Set();
    if (dx < -.23) wanted.add('left'); if (dx > .23) wanted.add('right');
    if (dy < -.23) wanted.add('forward'); if (dy > .23) wanted.add('backward');
    for (const name of ['left', 'right', 'forward', 'backward']) {
      if (wanted.has(name) !== stickDirections.has(name)) action('move', { name, active: wanted.has(name) });
    }
    stickDirections.clear(); for (const name of wanted) stickDirections.add(name);
  };
  bind(stick, 'pointerdown', event => {
    event.preventDefault(); stickPointer = event.pointerId; stick.setPointerCapture(event.pointerId); moveStick(event);
  });
  bind(stick, 'pointermove', moveStick);
  bind(stick, 'pointerup', releaseStick);
  bind(stick, 'pointercancel', releaseStick);
  bind(stick, 'lostpointercapture', releaseStick);
  const look = root.querySelector('.touch-look');
  let lookPointer = null;
  let previousLook = null;
  bind(look, 'pointerdown', event => {
    event.preventDefault(); lookPointer = event.pointerId; previousLook = [event.clientX, event.clientY]; look.setPointerCapture(event.pointerId);
  });
  bind(look, 'pointermove', event => {
    if (event.pointerId !== lookPointer || !previousLook) return;
    action('look', { dx: event.clientX - previousLook[0], dy: event.clientY - previousLook[1] });
    previousLook = [event.clientX, event.clientY];
  });
  const releaseLook = () => { lookPointer = null; previousLook = null; };
  bind(look, 'pointerup', releaseLook); bind(look, 'pointercancel', releaseLook); bind(look, 'lostpointercapture', releaseLook);

  function showScreen(name) {
    if (!['intro', 'playing', 'pause', 'dead', 'won'].includes(name)) return;
    if (screen !== name) {
      action('fire-stop'); action('aim', false); releaseStick(); releaseLook();
    }
    screen = name;
    ui.classList.remove('screen-intro', 'screen-playing', 'screen-pause', 'screen-dead', 'screen-won');
    ui.classList.add(`screen-${name}`);
    for (const key of ['intro', 'pause', 'dead', 'won']) elements[key].hidden = key !== name;
    elements.hud.hidden = name === 'intro' || name === 'won';
    if (name === 'won' && currentView) {
      setText('won-missions', currentView.mission?.total || '--');
      setText('won-bosses', currentView.state?.deadBosses?.size ?? 0);
      setText('won-time', timeString((performance.now() - deployedAt) / 1000));
    }
    if (name !== 'playing') {
      ui.classList.remove('cinematic');
      for (const button of activeTouch) {
        button.classList.remove('pressed');
        const name = button.dataset.touch;
        if (name === 'sprint' || name === 'crouch') action('move', { name, active: false });
      }
      activeTouch.clear();
    }
  }

  function timeString(seconds) {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${pad(Math.floor(value / 60))}:${pad(value % 60)}`;
  }

  function minimap(view) {
    if (!mapContext || !view.world || !view.player?.position) return;
    const ctx = mapContext;
    const width = mapCanvas.width, height = mapCanvas.height;
    const cx = width / 2, cy = height / 2, radius = width * .455;
    const data = view.world.minimap;
    const player = view.player.position;
    // A local, north-up tactical view avoids exposing distant enemies. The
    // objective clamps to the edge when it lies beyond the local radar range.
    const scale = radius / 31;
    const mapX = x => cx + (x - player.x) * scale;
    const mapZ = z => cy + (z - player.z) * scale;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip();
    const ground = ctx.createRadialGradient(cx,cy,20,cx,cy,radius);
    ground.addColorStop(0,'rgba(13,19,18,.70)'); ground.addColorStop(1,'rgba(4,8,8,.90)');
    ctx.fillStyle = ground; ctx.fillRect(0,0,width,height);
    ctx.strokeStyle = 'rgba(148,163,153,.09)'; ctx.lineWidth = 1;
    const grid = 5;
    for(let x=Math.floor((player.x-31)/grid)*grid;x<player.x+31;x+=grid){ctx.beginPath();ctx.moveTo(mapX(x),0);ctx.lineTo(mapX(x),height);ctx.stroke();}
    for(let z=Math.floor((player.z-31)/grid)*grid;z<player.z+31;z+=grid){ctx.beginPath();ctx.moveTo(0,mapZ(z));ctx.lineTo(width,mapZ(z));ctx.stroke();}
    for(const sector of view.world.sectors || []) {
      const c=sector.center,s=sector.size;if(!c||!s)continue;
      ctx.fillStyle='rgba(88,102,91,.12)';
      ctx.fillRect(mapX(c.x-s.x/2),mapZ(c.z-s.z/2),s.x*scale,s.z*scale);
      ctx.strokeStyle='rgba(149,164,143,.25)';ctx.lineWidth=1.3;
      ctx.strokeRect(mapX(c.x-s.x/2),mapZ(c.z-s.z/2),s.x*scale,s.z*scale);
      ctx.font='bold 16px monospace';ctx.fillStyle='rgba(188,201,172,.5)';ctx.textAlign='center';
      ctx.fillText(pad(sector.id),mapX(c.x),mapZ(c.z)+6);
    }
    ctx.fillStyle='rgba(160,169,158,.5)';
    for(const wall of data?.walls || [])ctx.fillRect(mapX(wall.x-wall.w/2),mapZ(wall.z-wall.d/2),Math.max(1,wall.w*scale),Math.max(1,wall.d*scale));
    ctx.strokeStyle='rgba(158,172,154,.11)';ctx.lineWidth=1;
    for(const fraction of [.35,.7]){ctx.beginPath();ctx.arc(cx,cy,radius*fraction,0,Math.PI*2);ctx.stroke();}
    const target=view.mission?.targetPosition;
    if(target){
      let tx=mapX(target.x??target[0])-cx,tz=mapZ(target.z??target[2])-cy;
      if(Number.isFinite(tx)&&Number.isFinite(tz)){
        const distance=Math.hypot(tx,tz);if(distance>radius-24){tx*=((radius-24)/distance);tz*=((radius-24)/distance);}
        ctx.save();ctx.translate(cx+tx,cy+tz);ctx.strokeStyle='#c9bd7c';ctx.lineWidth=2.4;
        ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(9,7);ctx.lineTo(-9,7);ctx.closePath();ctx.stroke();
        ctx.fillStyle='#c9bd7c';ctx.fillRect(-2,-2,4,4);ctx.restore();
      }
    }
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-(Number(view.player.yaw)||0));
    ctx.fillStyle='#d3e3b3';ctx.shadowColor='#b5c9a3';ctx.shadowBlur=6;
    ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(7,8);ctx.lineTo(0,4);ctx.lineTo(-7,8);ctx.closePath();ctx.fill();ctx.restore();
    ctx.restore();
    ctx.strokeStyle='rgba(185,197,177,.55)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='rgba(179,192,166,.5)';ctx.lineWidth=1;
    for(let i=0;i<32;i++){const a=i*Math.PI/16;const inner=radius-(i%8===0?10:4);ctx.beginPath();ctx.moveTo(cx+Math.sin(a)*inner,cy-Math.cos(a)*inner);ctx.lineTo(cx+Math.sin(a)*radius,cy-Math.cos(a)*radius);ctx.stroke();}
    ctx.fillStyle='#c2cbb4';ctx.font='bold 18px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    for(const [text,x,y]of [['N',cx,cy-radius+24],['E',cx+radius-23,cy],['S',cx,cy+radius-22],['W',cx-radius+24,cy]])ctx.fillText(text,x,y);
  }

  function updateBoss(view) {
    const position = view.player?.position;
    const records = view.state?.bosses;
    if (!position || !records) { elements.boss.hidden = true; return; }
    let nearest = null, distance = 23;
    const entries = records instanceof Map ? records.values() : Object.values(records);
    for (const boss of entries) {
      if (boss.active === false || boss.dead || boss.hp <= 0 || !boss.position) continue;
      const dx = boss.position.x - position.x, dz = boss.position.z - position.z;
      const value = Math.hypot(dx, dz);
      if (value < distance) { distance = value; nearest = boss; }
    }
    elements.boss.hidden = !nearest || !!view.state.execution;
    if (!nearest) return;
    const definition = canon.Bosses?.[nearest.id] || {};
    setText('boss-name', definition.NameTag || nearest.id);
    setText('boss-class', definition.Classification || 'UNIQUE THREAT');
    setText('boss-hp', `${Math.ceil(nearest.hp).toLocaleString()} / ${(nearest.maxHp || definition.MaxHealth || 1).toLocaleString()} HP`);
    refs['boss-fill'].style.width = `${clamp(nearest.hp / Math.max(1, nearest.maxHp || definition.MaxHealth), 0, 1) * 100}%`;
  }

  function update(view) {
    currentView = view;
    const state = view.state || {};
    if (view.settings && Object.keys(view.settings).some(key => settings[key] !== view.settings[key])) { settings = { ...settings, ...view.settings }; syncSettings(); }
    const hp = Math.ceil(state.hp ?? 100), maxHp = state.maxHp || 100;
    setText('health', Math.max(0, hp)); setText('force', state.force || force);
    setText('condition', hp <= 25 ? 'CRITICAL' : hp <= 50 ? 'INJURED' : 'STABLE');
    refs['health-fill'].style.width = `${clamp(hp / maxHp, 0, 1) * 100}%`;
    ui.classList.toggle('critical-health', hp <= 25 && hp > 0);
    const stamina = Math.round(clamp((view.stamina ?? 100) / (view.maxStamina || 100), 0, 1) * 100);
    setText('stamina', `${stamina}%`); refs['stamina-fill'].style.width = `${stamina}%`;
    ui.classList.toggle('low-stamina', stamina <= 20);
    setText('ammo', pad(Math.max(0, state.ammo ?? 30))); setText('reserve', state.reserve ?? 240);
    setText('reload-status', state.reloading ? 'RELOADING…' : state.ammo === 0 ? 'EMPTY / PRESS R' : 'R / RELOAD');
    ui.classList.toggle('low-ammo', (state.ammo ?? 30) <= 5);
    const sector = typeof view.sector === 'string' ? view.sector : view.sector?.name;
    setText('sector', sector || 'FOUNDATION CHECKPOINT');
    const heading = ((-(Number(view.player?.yaw) || 0) * 180 / Math.PI) % 360 + 360) % 360;
    setText('heading', `${['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(heading / 45) % 8]} / ${String(Math.round(heading) % 360).padStart(3, '0')}°`);
    const mission = view.mission || {};
    setText('mission-count', `${pad(mission.index || 1)} / ${pad(mission.total || 1)}`);
    setText('mission-title', mission.title || 'ESTABLISH CONTACT');
    setText('mission-text', mission.text || 'Awaiting Overwatch instructions.');
    const target = mission.targetPosition;
    if (target && view.player?.position) {
      const tx = target.x ?? target[0], tz = target.z ?? target[2];
      const p = view.player.position;
      const distance = Math.hypot(tx - p.x, tz - p.z);
      setText('mission-distance', `${Math.round(distance * 4)} M / ${mission.complete ? 'EXTRACTION' : 'OBJECTIVE'}`);
    } else setText('mission-distance', mission.complete ? 'OBJECTIVES COMPLETE' : 'FIELD OBJECTIVE');
    const nearest = view.nearestInteraction;
    elements.prompt.hidden = !nearest || screen !== 'playing' || !!state.execution;
    if (nearest) setText('interaction-label', typeof nearest === 'string' ? nearest : nearest.label || 'INTERACT');
    ui.classList.toggle('aiming', !!view.aiming);
    ui.classList.toggle('cinematic', !!state.execution && screen === 'playing');
    setText('execution-label', state.execution ? `CLOSE CONTACT / ${(state.execution.variant || '').replaceAll('_', ' ').toUpperCase()}` : 'CLOSE CONTACT');
    setText('run-status', (state.mode || view.player?.mode || mode) === 'tour' ? 'RECON TOUR / DAMAGE DISABLED' : 'FIELD OPERATIVE');
    setText('run-time', timeString(state.elapsed ?? (deployedAt ? (performance.now() - deployedAt) / 1000 : 0)));
    const now = performance.now();
    if (now >= minimapAt) { minimapAt = now + 100; minimap(view); }
    if (now >= bossAt) { bossAt = now + 150; updateBoss(view); }
  }

  function event(payload) {
    if (!payload) return;
    if (payload.type === 'subtitle') {
      if (!settings.subtitles) return;
      const token = ++subtitleToken;
      setText('subtitle-speaker', payload.speaker || 'OVERWATCH');
      setText('subtitle-text', payload.text || '');
      elements.subtitle.hidden = false;
      later(() => { if (subtitleToken === token) elements.subtitle.hidden = true; }, clamp((payload.duration || 4) * 1000, 1000, 14000));
    } else if (payload.type === 'hurt') {
      elements.damage.classList.remove('hurt'); void elements.damage.offsetWidth; elements.damage.classList.add('hurt');
      later(() => elements.damage.classList.remove('hurt'), 350);
    } else if (payload.type === 'shot' && payload.own && payload.hit) {
      elements.hit.classList.add('visible'); later(() => elements.hit.classList.remove('visible'), 100);
    } else if (payload.type === 'boss-defeated') {
      notify(`${canon.Bosses?.[payload.id]?.NameTag || payload.id} DEFEATED — WILL NOT RETURN THIS RUN`);
    } else if (payload.type === 'mission' || payload.type === 'notice') {
      notify(payload.text || payload.title || 'Objective updated.');
    } else if (payload.type === 'execution-start') {
      elements.boss.hidden = true;
    }
  }

  function notify(text) {
    const token = ++noticeToken;
    setText('notice', text); elements.notice.hidden = false;
    later(() => { if (noticeToken === token) elements.notice.hidden = true; }, 4800);
  }

  syncSettings();
  showScreen('intro');
  return {
    update, event, showScreen,
    dispose() {
      releaseStick(); action('fire-stop');
      for (const cleanup of disposers) cleanup();
      for (const timer of timers) clearTimeout(timer);
      root.replaceChildren();
    },
  };
}
