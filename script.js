/* ============================================================
   Dinner-Einladung — Interaktive Überraschungs-Mission
   Reines Vanilla-JS, kein Backend, keine Speicherung.
   ============================================================ */

/* ────────────────────────────────────────────────────────────
   ✏️  HIER ANPASSEN — die Details deiner Einladung
   ──────────────────────────────────────────────────────────── */
const CONFIG = {
  // ── Der Gewinn: Sommernachtskino 2026 bei Gerhart's Strauße ──
  filmTitle:   "Intouchables",                           // Film des Abends (frz. Originaltitel)
  inviteWhen:  "Vendredi · 26 juin 2026",                // Datum auf dem Ticket
  inviteTime:  "Ouverture 18h00 · Début du film 20h00",  // Zeiten
  invitePlace: "Gerhart's Strauße · Jechtingen am Kaiserstuhl", // Ort (Eigenname)
  photoCount:  31,            // Anzahl Bilder in /fotos (foto-01.jpg …)
  vaultCode:   "47193",       // Tresor-Code: je gewonnener Mission wird 1 Ziffer (von links) verraten.
                              //   Muss genauso viele Ziffern haben wie MISSION_DIGITS Einträge (aktuell 5).
  kisscamPhoto: "Bilder/Kisscam.jpeg",  // Kiss-Cam-Foto nach erfolgreicher Mission
  finalPhoto:  "charakter/Bild%20Final.jpeg", // euer Bild – formatfüllender Hintergrund auf der Finale-Seite
  finalFlyer:  "Bilder/Sommernachtskino.jpg", // Event-Flyer unter der Eintrittskarte

  // ── Geheime Benachrichtigung (ntfy.sh) ──
  // Du bekommst eine Push-Nachricht, sobald sie "Oui" tippt (und wenn sie das Finale erreicht).
  // Das Topic ist dein privater Kanal – behandle es wie ein Passwort. Zum Empfangen:
  //   • ntfy-App (iOS/Android) installieren → Topic unten abonnieren, ODER
  //   • im Browser https://ntfy.sh/<TOPIC> öffnen (geheime Feed-Seite).
  notifyTopic: "mon-soiree-k7p2x9aq4m",
};

// Reihenfolge der Missionen, die je eine Tresor-Ziffer verraten (1 Ziffer pro Eintrag, von links nach rechts)
const MISSION_DIGITS = ["screen-pairs", "screen-game", "screen-quiz", "screen-catch", "screen-kisscam"];

/* Geheime Push-Benachrichtigung an dich über ntfy.sh.
   Läuft im Hintergrund und stört das Erlebnis nie (Fehler werden verschluckt).
   Jedes Ereignis wird nur einmal gesendet. */
const _notified = new Set();
function notify(message, { title = "Soirée 🎬", tags = "heart", once = null } = {}) {
  if (once) { if (_notified.has(once)) return; _notified.add(once); }
  if (!CONFIG.notifyTopic) return;
  try {
    fetch("https://ntfy.sh/" + CONFIG.notifyTopic, {
      method: "POST",
      body: message,
      headers: { "Title": title, "Tags": tags, "Priority": "high" },
      keepalive: true,        // Nachricht geht auch raus, wenn die Seite gleich wechselt
    }).catch(() => {});
  } catch (e) {}
}

/* ────────────────────────────────────────────────────────────
   Kleine Helfer
   ──────────────────────────────────────────────────────────── */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* Touch-Gerät erkennen → D-Pad einblenden */
if ("ontouchstart" in window || navigator.maxTouchPoints > 0) {
  document.body.classList.add("touch");
}

/* ============================================================
   SOUND — alles synthetisiert (keine externen Dateien)
   ============================================================ */
const Sound = {
  ctx: null, master: null, musicOn: false, musicNodes: [], musicTimer: null,

  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;
    this.master.connect(this.ctx.destination);
  },
  resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); },

  tone(freq, dur, { type = "sine", vol = 0.2, when = 0, glideTo = null } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.05);
  },

  click()  { this.ensure(); this.tone(420, 0.08, { type: "triangle", vol: 0.12 }); },
  pop()    { this.ensure(); this.tone(680, 0.10, { type: "sine", vol: 0.16, glideTo: 880 }); },
  found()  {
    this.ensure();
    [659, 880, 1175].forEach((f, i) => this.tone(f, 0.18, { type: "triangle", vol: 0.18, when: i * 0.07 }));
  },
  achievement() {
    this.ensure();
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.22, { type: "sine", vol: 0.16, when: i * 0.08 }));
  },
  vault()  {
    this.ensure();
    this.tone(140, 0.5, { type: "sawtooth", vol: 0.14, glideTo: 70 });
    this.tone(300, 0.6, { type: "sine", vol: 0.10, when: 0.15 });
  },
  reveal() {
    this.ensure();
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) =>
      this.tone(f, 0.4, { type: "triangle", vol: 0.18, when: i * 0.11 }));
  },
  wrong()  { this.ensure(); this.tone(200, 0.18, { type: "sawtooth", vol: 0.14, glideTo: 120 }); },

  /* sanfte Hintergrundmusik — sphärischer Pad-Loop */
  chords: [[261.6, 329.6, 392.0], [220.0, 277.2, 329.6], [293.7, 349.2, 440.0], [196.0, 246.9, 392.0]],
  chordIdx: 0,
  playChord() {
    if (!this.musicOn || !this.ctx) return;
    const t = this.ctx.currentTime;
    const ch = this.chords[this.chordIdx % this.chords.length];
    this.chordIdx++;
    ch.forEach((f) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine"; osc.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05, t + 1.1);
      g.gain.linearRampToValueAtTime(0.0001, t + 3.6);
      osc.connect(g); g.connect(this.master);
      osc.start(t); osc.stop(t + 3.8);
    });
    // kleine Glockenmelodie obendrauf
    const mel = [523.3, 659.3, 784.0, 659.3][this.chordIdx % 4];
    this.tone(mel, 0.6, { type: "triangle", vol: 0.05, when: 0.4 });
  },
  toggleMusic() {
    this.ensure(); this.resume();
    this.musicOn = !this.musicOn;
    const btn = $("#musicBtn");
    btn.classList.toggle("playing", this.musicOn);
    if (this.musicOn) {
      this.playChord();
      this.musicTimer = setInterval(() => this.playChord(), 3500);
    } else {
      clearInterval(this.musicTimer);
    }
  },
};
$("#musicBtn").addEventListener("click", () => { Sound.click(); Sound.toggleMusic(); });

/* Musik läuft automatisch — startet bei der ersten Geste, da Browser echten Autostart
   von Audio ohne Nutzer-Interaktion blockieren. Der ♪-Button bleibt zum Abschalten. */
let musicAutoStarted = false;
function autoStartMusic() {
  if (musicAutoStarted) return;
  musicAutoStarted = true;
  if (!Sound.musicOn) Sound.toggleMusic();
}
["pointerdown", "keydown", "touchstart"].forEach((ev) =>
  window.addEventListener(ev, autoStartMusic, { once: true, passive: true })
);

/* ============================================================
   FX — Partikel (Herzen) & Konfetti auf Vollbild-Canvas
   ============================================================ */
const FX = (() => {
  const cv = $("#fx");
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1, particles = [], running = false, ambient = false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize); resize();

  const confettiColors = ["#f0c987", "#ff8da1", "#e0607a", "#f6dcab", "#ffd9e0", "#fff"];

  function spawnConfetti(n = 120) {
    for (let i = 0; i < n; i++) {
      particles.push({
        type: "confetti",
        x: rand(0, W), y: rand(-H * 0.3, 0),
        vx: rand(-40, 40), vy: rand(60, 200),
        rot: rand(0, Math.PI * 2), vr: rand(-6, 6),
        size: rand(6, 12), color: confettiColors[(Math.random() * confettiColors.length) | 0],
        life: rand(3, 5),
      });
    }
    start();
  }

  function spawnHeartsAt(x, y, n = 14) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), s = rand(40, 150);
      particles.push({
        type: "heart",
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
        rot: rand(-0.4, 0.4), vr: rand(-2, 2),
        size: rand(14, 26), color: ["#ff8da1", "#e0607a", "#f0c987"][(Math.random() * 3) | 0],
        life: rand(1.2, 2.2),
      });
    }
    start();
  }

  function ambientTick() {
    if (!ambient) return;
    if (Math.random() < 0.25) {
      particles.push({
        type: "heart",
        x: rand(0, W), y: H + 20,
        vx: rand(-15, 15), vy: rand(-50, -90),
        rot: rand(-0.3, 0.3), vr: rand(-1, 1),
        size: rand(12, 22), color: ["#ff8da1", "#e0607a", "#f0c987"][(Math.random() * 3) | 0],
        life: rand(4, 7),
      });
    }
  }
  function setAmbient(on) { ambient = on; if (on) start(); }

  function drawHeart(x, y, s, rot, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s / 20, s / 20);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(0, 2, -3, -4, -9, -4);
    ctx.bezierCurveTo(-18, -4, -18, 7, -18, 7);
    ctx.bezierCurveTo(-18, 13, -10, 19, 0, 26);
    ctx.bezierCurveTo(10, 19, 18, 13, 18, 7);
    ctx.bezierCurveTo(18, 7, 18, -4, 9, -4);
    ctx.bezierCurveTo(3, -4, 0, 2, 0, 6);
    ctx.fill();
    ctx.restore();
  }

  let last = 0;
  function frame(t) {
    if (!last) last = t;
    const dt = Math.min(0.05, (t - last) / 1000); last = t;
    ambientTick();
    ctx.clearRect(0, 0, W, H);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += (p.type === "confetti" ? 90 : 12) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const alpha = clamp(p.life, 0, 1);
      if (p.type === "confetti") {
        ctx.save();
        ctx.globalAlpha = alpha; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else {
        drawHeart(p.x, p.y, p.size, p.rot, p.color, alpha);
      }
    }
    if (particles.length || ambient) requestAnimationFrame(frame);
    else { running = false; last = 0; }
  }
  function start() { if (!running) { running = true; last = 0; requestAnimationFrame(frame); } }

  return { confetti: spawnConfetti, heartsAt: spawnHeartsAt, setAmbient };
})();

/* ============================================================
   ACHIEVEMENTS — kleine Toasts oben rechts
   ============================================================ */
const earned = new Set();
function achievement(emoji, title, sub = "") {
  if (earned.has(title)) return;
  earned.add(title);
  Sound.achievement();
  const el = document.createElement("div");
  el.className = "achv";
  el.innerHTML = `<span class="achv-emoji">${emoji}</span><span>${title}${sub ? `<span class="achv-sub">${sub}</span>` : ""}</span>`;
  $("#achievements").appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 600);
  }, 3600);
}

/* Tresor-Ziffer als Belohnung der gerade gewonnenen Mission anzeigen */
function showCodePrize(container) {
  if (!container) return;
  const idx = MISSION_DIGITS.indexOf(currentScreen);
  if (idx < 0) return;
  if (container.querySelector(".code-prize")) return;      // nicht doppelt
  const digit = CONFIG.vaultCode[idx] ?? "?";
  const el = document.createElement("div");
  el.className = "code-prize";
  el.innerHTML =
    `<span class="cp-label">Chiffre ${idx + 1} sur ${MISSION_DIGITS.length} pour le coffre-fort</span>` +
    `<span class="cp-digit">${digit}</span>` +
    `<span class="cp-note">✍️ Note-le bien !</span>`;
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  Sound.reveal();
}

/* ============================================================
   SCREEN-NAVIGATION
   ============================================================ */
const screens = {};
$$(".screen").forEach((s) => (screens[s.id] = s));
let currentScreen = "screen-intro";
const entered = new Set();

function goTo(id) {
  if (currentScreen === id) return;
  screens[currentScreen]?.classList.remove("active");
  if (currentScreen === "screen-game") Game.stop();
  if (currentScreen === "screen-catch") CatchGame.stop();
  if (currentScreen === "screen-kisscam") KissCam.stop();
  currentScreen = id;
  screens[id].classList.add("active");
  if (!entered.has(id)) { entered.add(id); onFirstEnter[id]?.(); }
  onEnter[id]?.();
}

/* ============================================================
   KAPITEL 1 — Intro (Typewriter)
   ============================================================ */
async function typeLine(el, text, speed = 55) {
  el.classList.add("typing"); el.textContent = "";
  for (const ch of text) { el.textContent += ch; await wait(speed); }
  el.classList.remove("typing"); el.classList.add("done");
}
async function runIntro() {
  await wait(700);
  await typeLine($("#introLine1"), "Coucou mon ❤️");
  await wait(900);
  await typeLine($("#introLine2"), "Es-tu prête à t'évader un instant du quotidien ? :)");
  await wait(500);
  const b = $("#startBtn"); b.hidden = false;
}
runIntro();

/* Sanfter Leucht-Schein im Intro, der dem Mauszeiger (bzw. Finger) weich folgt */
(function introGlowFollow() {
  const glow = $("#introGlow");
  const introScreen = $("#screen-intro");
  if (!glow || !introScreen) return;
  let tx = window.innerWidth / 2, ty = window.innerHeight * 0.42; // Ziel
  let cx = tx, cy = ty;                                           // aktuelle Position
  const setTarget = (x, y) => { tx = x; ty = y; };
  window.addEventListener("mousemove", (e) => setTarget(e.clientX, e.clientY), { passive: true });
  window.addEventListener("touchmove", (e) => { const t = e.touches[0]; if (t) setTarget(t.clientX, t.clientY); }, { passive: true });
  (function loop() {
    if (introScreen.classList.contains("active")) {
      cx += (tx - cx) * 0.12;   // weiches Nachziehen (Lerp)
      cy += (ty - cy) * 0.12;
      glow.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    }
    requestAnimationFrame(loop);
  })();
})();

$("#startBtn").addEventListener("click", () => {
  Sound.ensure(); Sound.resume(); Sound.click();
  goTo("screen-question");
});

/* ============================================================
   KAPITEL 2 — Die wichtige Frage (+ flüchtender Nein-Button)
   ============================================================ */
const noBtn = $("#noBtn");
const NO_MAX = 110;              // max. Auslenkung aus der Ruheposition (px) → kann nie verschwinden
let noDodges = 0, offX = 0, offY = 0, lastHop = 0;

// Kleiner Sprung weg vom Zeiger – der Button bleibt sonst statisch an seinem Platz
function nudgeNo(mx, my) {
  const now = performance.now();
  if (now - lastHop < 40) return;
  lastHop = now;
  const r = noBtn.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = cx - mx, dy = cy - my, len = Math.hypot(dx, dy);
  if (len < 1) { const a = rand(0, Math.PI * 2); dx = Math.cos(a); dy = Math.sin(a); len = 1; }
  dx /= len; dy /= len;
  const step = rand(45, 70);                       // nur ein kleines Stück
  offX = clamp(offX + dx * step, -NO_MAX, NO_MAX);
  offY = clamp(offY + dy * step, -NO_MAX, NO_MAX);
  noBtn.style.transform = `translate(${offX}px, ${offY}px)`;
  Sound.pop();
  noDodges++;
  if (noDodges === 14) achievement("🏆", "Chasseuse du bouton Non");
}

// Desktop: nur auslösen, wenn der Zeiger WIRKLICH innerhalb des Buttons ist
document.addEventListener("mousemove", (e) => {
  if (currentScreen !== "screen-question") return;
  const r = noBtn.getBoundingClientRect();
  if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
    nudgeNo(e.clientX, e.clientY);
  }
});
// Touch: beim Tippversuch ein kleines Stück wegspringen (Maus läuft über mousemove)
noBtn.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse") return;
  e.preventDefault(); nudgeNo(e.clientX, e.clientY);
});
noBtn.addEventListener("click", (e) => e.preventDefault());

$("#yesBtn").addEventListener("click", () => {
  Sound.click(); FX.heartsAt(window.innerWidth / 2, window.innerHeight / 2, 16);
  notify("Elle a dit OUI ❤️ — sie hat auf die Frage geantwortet!", { title: "Sie hat JA gesagt 💍", tags: "tada,heart", once: "oui" });
  goTo("screen-chat");
});

/* ============================================================
   KAPITEL 3 — Chatfenster
   ============================================================ */
const chatMessages = [
  "Ouf…",
  "Je suis content que tu aies dit oui.",
  "Je n’étais vraiment pas sûr que tu en aies envie.",
  "Mais cette fois, ce ne sera pas si simple : le secret est bien en sécurité dans le coffre-fort. Pour en connaître le code, tu dois réussir les prochaines missions.",
  "Bonne chance 😁",
];
const onFirstEnter = {};
const onEnter = {};

onFirstEnter["screen-chat"] = async () => {
  const body = $("#chatBody");
  for (const msg of chatMessages) {
    const typing = document.createElement("div");
    typing.className = "bubble typing-bubble";
    typing.innerHTML = "<span></span><span></span><span></span>";
    body.appendChild(typing);
    await wait(rand(900, 1500));
    typing.remove();
    const b = document.createElement("div");
    b.className = "bubble"; b.textContent = msg;
    body.appendChild(b);
    Sound.pop();
    await wait(700);
  }
  // Nach der Tresor-Nachricht: der Safe erscheint animiert
  await wait(450);
  const safe = $("#chatSafe");
  safe.hidden = false;
  requestAnimationFrame(() => safe.classList.add("in"));
  Sound.vault();
  await wait(1600);
  $("#chatNextBtn").hidden = false;
};
$("#chatNextBtn").addEventListener("click", () => { Sound.click(); goTo("screen-fly"); });

/* ============================================================
   Zwischenspiel — Erinnerungen fliegen wie ein Kartendeck vorbei
   ============================================================ */
let flyPlayed = false;
onEnter["screen-fly"] = () => {
  if (flyPlayed) { goTo("screen-pairs"); return; }   // beim erneuten Betreten direkt weiter
  flyPlayed = true;

  const stage = $("#flyStage");
  const title = $("#flyTitle");
  $$(".fly-card", stage).forEach((c) => c.remove());
  title.classList.remove("show");
  requestAnimationFrame(() => title.classList.add("show"));

  const order = shuffle([...Array(CONFIG.photoCount).keys()].map((i) => i + 1));
  const STEP = 230;       // Versatz zwischen den Karten (ms) — etwas mehr Abstand, ruhigeres Austeilen
  const FLIGHT = 6400;    // Flugdauer je Karte (ms) — deutlich langsamer, sanfter Flug pro Bild
  const ww = window.innerWidth, wh = window.innerHeight;

  order.forEach((n, i) => {
    const num = String(n).padStart(2, "0");
    const card = document.createElement("div");
    card.className = "fly-card";
    card.innerHTML = `<img src="fotos/foto-${num}.jpg" alt="" />`;
    stage.appendChild(card);

    // Aus allen Richtungen: zufälliger Eintrittswinkel rund um den Bildschirm.
    // Die Karte fliegt vom Rand herein, durch die Mitte und auf der
    // gegenüberliegenden Seite wieder hinaus.
    const ang  = Math.random() * Math.PI * 2;
    const dist = Math.max(ww, wh) * 1.3;
    const sx = Math.cos(ang) * dist, sy = Math.sin(ang) * dist;   // Startpunkt außerhalb
    const ex = -sx, ey = -sy;                                     // Austritt gegenüber
    const mx = rand(-ww * 0.12, ww * 0.12), my = rand(-wh * 0.12, wh * 0.12); // leichte Mitten-Streuung
    const r0 = rand(-60, 60), r1 = r0 + (Math.random() < 0.5 ? 1 : -1) * rand(220, 560);
    card.animate(
      [
        { transform: `translate(-50%,-50%) translate(${sx}px, ${sy}px) rotate(${r0}deg) scale(.85)`, opacity: 0 },
        { transform: `translate(-50%,-50%) translate(${mx}px, ${my}px) rotate(${(r0 + r1) / 2}deg) scale(1.05)`, opacity: 1, offset: 0.5 },
        { transform: `translate(-50%,-50%) translate(${ex}px, ${ey}px) rotate(${r1}deg) scale(.85)`, opacity: 0 },
      ],
      { duration: FLIGHT, delay: i * STEP, easing: "cubic-bezier(.4,.05,.55,.95)", fill: "both" }
    );
    if (i % 3 === 0) setTimeout(() => Sound.pop(), i * STEP);
  });

  const totalMs = (order.length - 1) * STEP + FLIGHT;
  setTimeout(() => goTo("screen-pairs"), totalMs + 220);
};

/* ============================================================
   KAPITEL 4b — Foto-Memory (Pärchen finden)
   ============================================================ */
const MemoryGame = (() => {
  const grid = $("#memoryGrid");
  const PAIRS = 6;
  let first = null, lock = false, matched = 0;

  function start() {
    matched = 0; first = null; lock = false;
    $("#pairsFoot").hidden = true;
    grid.innerHTML = "";
    const pool = shuffle([...Array(CONFIG.photoCount).keys()].map((i) => i + 1)).slice(0, PAIRS);
    const deck = shuffle(pool.flatMap((n) => [n, n]));
    deck.forEach((n) => {
      const num = String(n).padStart(2, "0");
      const card = document.createElement("div");
      card.className = "mcard"; card.dataset.n = n;
      card.innerHTML =
        `<div class="mcard-inner">
           <div class="mface mback">♥</div>
           <div class="mface mfront"><img src="fotos/foto-${num}.jpg" alt="" loading="lazy" /></div>
         </div>`;
      card.addEventListener("click", () => flip(card));
      grid.appendChild(card);
    });
  }

  function flip(card) {
    if (lock || card.classList.contains("flipped") || card.classList.contains("matched")) return;
    card.classList.add("flipped"); Sound.pop();
    if (!first) { first = card; return; }
    lock = true;
    const a = first, b = card;
    if (a.dataset.n === b.dataset.n) {
      setTimeout(() => {
        a.classList.add("matched"); b.classList.add("matched");
        Sound.found();
        const r = b.getBoundingClientRect();
        FX.heartsAt(r.left + r.width / 2, r.top + r.height / 2, 8);
        matched++; first = null; lock = false;
        if (matched === PAIRS) win();
      }, 380);
    } else {
      setTimeout(() => {
        a.classList.remove("flipped"); b.classList.remove("flipped");
        first = null; lock = false;
      }, 850);
    }
  }

  function win() {
    setTimeout(() => {
      $("#pairsFoot").hidden = false;
      showCodePrize($("#pairsFoot"));
      FX.confetti(80);
      achievement("🏆", "Reine des souvenirs", "Tu connais chaque photo ❤️");
    }, 450);
  }

  return { start };
})();
onEnter["screen-pairs"] = () => MemoryGame.start();
$("#pairsNextBtn").addEventListener("click", () => { Sound.click(); goTo("screen-game"); });

/* ============================================================
   KAPITEL 5 — Taschenlampen-Labyrinth (Canvas)
   ============================================================ */
const Game = (() => {
  const cv = $("#maze");
  const ctx = cv.getContext("2d");
  const COLS = 15, ROWS = 11;

  // Wände (Pfeiler) — offen gehalten, alles erreichbar
  const wallList = [
    [5,1],[10,1],
    [3,2],[4,2],[9,2],[10,2],
    [6,3],[7,3],
    [2,4],[3,4],[8,4],[11,4],[12,4],
    [5,5],[6,5],[11,5],
    [2,6],[3,6],[7,6],[8,6],[10,6],[11,6],
    [4,7],[9,7],
    [3,8],[4,8],[7,8],[8,8],[12,8],
    [6,9],
  ];
  const grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      grid[r][c] = (r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1) ? 1 : 0;
    }
  }
  wallList.forEach(([c, r]) => (grid[r][c] = 1));

  const objects = [
    { key: "heart",    emoji: "❤️", cell: [1, 7],  text: "Je t’aime déjà.",                          got: false },
    { key: "cocktail", emoji: "🍹", cell: [12, 3], text: "Tchin Tchin",                              got: false },
    { key: "ticket",   emoji: "✈️", cell: [13, 7], text: "Peut-être pas aujourd’hui… mais bientôt à nouveau.", got: false },
  ];

  let tile = 32, W = 0, H = 0, dpr = 1;
  let player = { x: 0, y: 0, fx: 0, fy: 1 };
  const keys = {};
  let running = false, lastT = 0, foundN = 0;
  let idleTimer = 0, hintShown = false, blinkActive = false;

  // Auswählbare Charaktere — Sprite-Sheets (4 Spalten × 5 Reihen), Hintergrund transparent
  const sprites = {
    alexia: Object.assign(new Image(), { src: "charakter/alexia_clean.png" }),
    leon:   Object.assign(new Image(), { src: "charakter/leon_clean.png" }),
  };
  let charName = "alexia";
  const SP_COLS = 4, SP_ROWS = 5;
  function setChar(n) { if (sprites[n]) charName = n; }

  function isWall(px, py) {
    const c = Math.floor(px / tile), r = Math.floor(py / tile);
    if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return true;
    return grid[r][c] === 1;
  }

  function resize() {
    const cssW = Math.min(cv.parentElement.clientWidth, 760);
    tile = Math.floor(cssW / COLS);
    W = tile * COLS; H = tile * ROWS;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function reset() {
    resize();
    player.x = 1.5 * tile; player.y = 1.5 * tile; player.fx = 0; player.fy = 1;
    foundN = 0; idleTimer = 0; hintShown = false; blinkActive = false;
    objects.forEach((o) => (o.got = false));
    $$(".collect-bar .slot").forEach((s) => s.classList.remove("got"));
    $("#foundCount").textContent = "0 / 3 trouvés";
    $("#gameWin").hidden = true;
    $("#gameHint").hidden = true;
  }

  function start() {
    reset();
    running = true; lastT = 0;
    requestAnimationFrame(loop);
  }
  function stop() { running = false; }

  function collect(o) {
    o.got = true; foundN++;
    $(`.collect-bar .slot[data-item="${o.key}"]`)?.classList.add("got");
    $("#foundCount").textContent = `${foundN} / 3 trouvés`;
    Sound.found();
    idleTimer = 0; $("#gameHint").hidden = true; hintShown = false;
    // Herzpartikel an Objektposition (Bildschirmkoordinaten)
    const rect = cv.getBoundingClientRect();
    const ox = rect.left + (o.cell[0] + 0.5) * tile;
    const oy = rect.top + (o.cell[1] + 0.5) * tile;
    FX.heartsAt(ox, oy, 12);
    showToast(o.text);
    if (foundN === 3) win();
  }

  let toastTimer = null;
  function showToast(txt) {
    const t = $("#gameToast"); t.textContent = txt; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  function win() {
    setTimeout(() => {
      $("#gameWin").hidden = false;
      showCodePrize($("#gameWin"));
      FX.confetti(90);
      const rect = cv.getBoundingClientRect();
      FX.heartsAt(rect.left + rect.width / 2, rect.top + rect.height / 2, 20);
      achievement("🏆", "Chercheuse de trésor", "Tous les trois trouvés ✨");
    }, 700);
  }

  function update(dt) {
    const speed = tile * 4.6 * dt;
    let dx = 0, dy = 0;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
      player.fx = dx; player.fy = dy;
      const hs = tile * 0.28;
      // X-Achse
      let nx = player.x + dx * speed;
      if (!isWall(nx - hs, player.y - hs) && !isWall(nx + hs, player.y - hs) &&
          !isWall(nx - hs, player.y + hs) && !isWall(nx + hs, player.y + hs)) player.x = nx;
      // Y-Achse
      let ny = player.y + dy * speed;
      if (!isWall(player.x - hs, ny - hs) && !isWall(player.x + hs, ny - hs) &&
          !isWall(player.x - hs, ny + hs) && !isWall(player.x + hs, ny + hs)) player.y = ny;
      idleTimer = 0;
      if (hintShown) { $("#gameHint").hidden = true; }
    } else {
      idleTimer += dt;
    }

    // Objekt einsammeln
    objects.forEach((o) => {
      if (o.got) return;
      const ox = (o.cell[0] + 0.5) * tile, oy = (o.cell[1] + 0.5) * tile;
      if (Math.hypot(player.x - ox, player.y - oy) < tile * 0.6) collect(o);
    });

    // Hilfe gegen Frust
    if (!hintShown && idleTimer > 9 && foundN < 3) {
      hintShown = true;
      const h = $("#gameHint"); h.hidden = false;
      h.textContent = "Petit conseil : la lampe de poche te montre le chemin.";
    }
    blinkActive = idleTimer > 16 && foundN < 3;
  }

  function draw(t) {
    // Boden & Wände
    ctx.clearRect(0, 0, W, H);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] === 1) {
          ctx.fillStyle = "#3a2c4d";
          ctx.fillRect(c * tile, r * tile, tile, tile);
          ctx.fillStyle = "#503a6a";
          ctx.fillRect(c * tile + 2, r * tile + 2, tile - 4, tile - 4);
        } else {
          ctx.fillStyle = "#15101d";
          ctx.fillRect(c * tile, r * tile, tile, tile);
        }
      }
    }
    // Objekte (im Hellen sichtbar)
    ctx.font = `${tile * 0.7}px serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    objects.forEach((o) => {
      if (o.got) return;
      const ox = (o.cell[0] + 0.5) * tile, oy = (o.cell[1] + 0.5) * tile;
      ctx.fillText(o.emoji, ox, oy);
    });

    // Dunkelheit mit Taschenlampen-Loch (Offscreen-Maske)
    const m = maskCv, mc = maskCtx;
    if (m.width !== cv.width || m.height !== cv.height) { m.width = cv.width; m.height = cv.height; }
    mc.setTransform(dpr, 0, 0, dpr, 0, 0);
    mc.clearRect(0, 0, W, H);
    mc.fillStyle = "rgba(4,2,8,0.97)";
    mc.fillRect(0, 0, W, H);
    mc.globalCompositeOperation = "destination-out";
    // Grundlicht um die Figur
    punch(mc, player.x, player.y, tile * 1.7);
    // Lichtkegel in Blickrichtung
    punch(mc, player.x + player.fx * tile * 1.4, player.y + player.fy * tile * 1.4, tile * 2.3);
    mc.globalCompositeOperation = "source-over";
    ctx.drawImage(m, 0, 0, W, H);

    // Warmer Lichtschimmer
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gx = player.x + player.fx * tile, gy = player.y + player.fy * tile;
    const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, tile * 2.4);
    grad.addColorStop(0, "rgba(255,210,140,0.22)");
    grad.addColorStop(1, "rgba(255,210,140,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Blinkende Objekte als Hilfe
    if (blinkActive && Math.floor(t / 500) % 2 === 0) {
      ctx.save(); ctx.globalAlpha = 0.85;
      objects.forEach((o) => {
        if (o.got) return;
        const ox = (o.cell[0] + 0.5) * tile, oy = (o.cell[1] + 0.5) * tile;
        ctx.shadowColor = "#ffd27a"; ctx.shadowBlur = 16;
        ctx.fillText(o.emoji, ox, oy);
      });
      ctx.restore();
    }

    // Spielfigur (16-Bit-Stil)
    drawPlayer(player.x, player.y, t);
  }

  function punch(c, x, y, radius) {
    const g = c.createRadialGradient(x, y, radius * 0.15, x, y, radius);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(0.7, "rgba(0,0,0,0.85)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.beginPath(); c.arc(x, y, radius, 0, Math.PI * 2); c.fill();
  }

  function drawPlayer(x, y, t) {
    const img = sprites[charName];
    if (img && img.complete && img.naturalWidth) {
      const cw = img.naturalWidth / SP_COLS, ch = img.naturalHeight / SP_ROWS;
      // Blickrichtung → Reihe (runter:0, hoch:2, links:3, rechts:4) — Beam ist passend ausgeschnitten
      let row;
      if (Math.abs(player.fy) >= Math.abs(player.fx)) row = player.fy < 0 ? 2 : 0;
      else row = player.fx < 0 ? 3 : 4;
      const moving = keysMoving();
      const col = moving ? (Math.floor(t / 150) % SP_COLS) : 0;
      const sbob = Math.sin(t / 160) * (moving ? tile * 0.05 : 0);
      const dh = tile * 2.0, dw = dh * (cw / ch), footY = y + tile * 0.5;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.42)";
      ctx.beginPath(); ctx.ellipse(x, footY, tile * 0.34, tile * 0.13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, col * cw, row * ch, cw, ch, x - dw / 2, footY + sbob - dh * 0.942, dw, dh);
      return;
    }
    const u = tile / 16;            // Pixel-Einheit (Fallback ohne Sprite)
    const bob = Math.sin(t / 120) * (keysMoving() ? u : 0);
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.imageSmoothingEnabled = false;
    // Schatten
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath(); ctx.ellipse(0, tile * 0.42, tile * 0.3, tile * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    // Körper (Kleid)
    ctx.fillStyle = "#ff8da1";
    ctx.fillRect(-4 * u, 0 * u, 8 * u, 6 * u);
    // Kopf
    ctx.fillStyle = "#f7d9b5";
    ctx.fillRect(-3 * u, -7 * u, 6 * u, 6 * u);
    // Haare
    ctx.fillStyle = "#5a3a2a";
    ctx.fillRect(-4 * u, -8 * u, 8 * u, 3 * u);
    ctx.fillRect(-4 * u, -8 * u, 2 * u, 6 * u);
    ctx.fillRect(2 * u, -8 * u, 2 * u, 6 * u);
    // Beine
    ctx.fillStyle = "#3a2a4a";
    ctx.fillRect(-3 * u, 6 * u, 2 * u, 3 * u);
    ctx.fillRect(1 * u, 6 * u, 2 * u, 3 * u);
    ctx.restore();
    // Taschenlampe (kleiner heller Punkt in Blickrichtung)
    ctx.save();
    ctx.fillStyle = "#fff3d0";
    ctx.beginPath();
    ctx.arc(x + player.fx * tile * 0.45, y + player.fy * tile * 0.45, u * 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function keysMoving() { return keys.up || keys.down || keys.left || keys.right; }

  // Offscreen-Maske
  const maskCv = document.createElement("canvas");
  const maskCtx = maskCv.getContext("2d");

  function loop(t) {
    if (!running) return;
    if (!lastT) lastT = t;
    const dt = Math.min(0.04, (t - lastT) / 1000); lastT = t;
    update(dt);
    draw(t);
    requestAnimationFrame(loop);
  }

  // ── Eingaben ──
  const keymap = {
    ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down",
    ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right",
  };
  window.addEventListener("keydown", (e) => {
    if (currentScreen !== "screen-game") return;
    const k = keymap[e.code];
    if (k) { keys[k] = true; e.preventDefault(); }
  });
  window.addEventListener("keyup", (e) => {
    const k = keymap[e.code];
    if (k) keys[k] = false;
  });

  // D-Pad (Touch & Maus)
  $$("#dpad .dpad-btn").forEach((btn) => {
    const dir = btn.dataset.dir;
    const on = (e) => { e.preventDefault(); keys[dir] = true; };
    const off = (e) => { e.preventDefault(); keys[dir] = false; };
    btn.addEventListener("pointerdown", on);
    btn.addEventListener("pointerup", off);
    btn.addEventListener("pointerleave", off);
    btn.addEventListener("pointercancel", off);
  });

  // Wischen auf dem Canvas
  let touchStart = null;
  cv.addEventListener("pointerdown", (e) => { touchStart = { x: e.clientX, y: e.clientY }; });
  cv.addEventListener("pointermove", (e) => {
    if (!touchStart) return;
    const dx = e.clientX - touchStart.x, dy = e.clientY - touchStart.y;
    if (Math.hypot(dx, dy) < 12) return;
    keys.up = keys.down = keys.left = keys.right = false;
    if (Math.abs(dx) > Math.abs(dy)) keys[dx > 0 ? "right" : "left"] = true;
    else keys[dy > 0 ? "down" : "up"] = true;
  });
  const endTouch = () => { touchStart = null; keys.up = keys.down = keys.left = keys.right = false; };
  cv.addEventListener("pointerup", endTouch);
  cv.addEventListener("pointercancel", endTouch);
  cv.addEventListener("pointerleave", () => { if (touchStart) endTouch(); });

  window.addEventListener("resize", () => { if (running) resize(); });

  return { start, stop, setChar };
})();

onEnter["screen-game"] = () => Game.start();
$("#gameNextBtn").addEventListener("click", () => { Sound.click(); goTo("screen-quiz"); });

// Charakter-Auswahl (Leon / Alexia) im Taschenlampen-Level
$$("#charSelect .char-opt").forEach((b) => {
  b.addEventListener("click", () => {
    Sound.click();
    $$("#charSelect .char-opt").forEach((o) => o.classList.remove("active"));
    b.classList.add("active");
    Game.setChar(b.dataset.char);
  });
});

/* ============================================================
   KAPITEL 6 — Mini-Quiz
   ============================================================ */
const quizData = [
  { q: "Qui prend le plus de photos en vacances ?",
    options: ["Toi", "Moi"],
    reaction: "Il n’y en a parfois jamais assez.." },
  { q: "Qui met le plus de temps à se préparer ?",
    options: ["Toi", "Moi"],
    reaction: "Ça dépend où on va.. ^^" },
  { q: "Qui commande le plus souvent des cocktails ?",
    options: ["Toi", "Moi", "Clairement l’aspirateur (Curlycoer)"],
    reaction: "" },
];
let quizIdx = 0;

onEnter["screen-quiz"] = () => { if (!entered.has("quiz-started")) { entered.add("quiz-started"); quizIdx = 0; renderQuiz(); } };

function renderQuiz() {
  const data = quizData[quizIdx];
  // Fortschrittspunkte
  const prog = $("#quizProgress"); prog.innerHTML = "";
  quizData.forEach((_, i) => {
    const d = document.createElement("span");
    d.className = "dot" + (i < quizIdx ? " done" : i === quizIdx ? " active" : "");
    prog.appendChild(d);
  });
  $("#quizQuestion").textContent = data.q;
  $("#quizReaction").hidden = true;
  $("#quizNextBtn").hidden = true;
  const wrap = $("#quizOptions"); wrap.innerHTML = "";
  data.options.forEach((opt) => {
    const b = document.createElement("button");
    b.className = "quiz-opt"; b.textContent = opt;
    b.addEventListener("click", () => chooseQuiz(b, wrap, data));
    wrap.appendChild(b);
  });
}
function chooseQuiz(btn, wrap, data) {
  Sound.pop();
  $$(".quiz-opt", wrap).forEach((o) => (o.disabled = true));
  btn.classList.add("chosen");
  const re = $("#quizReaction"); re.textContent = data.reaction; re.hidden = false;
  $("#quizNextBtn").hidden = false;
  if (quizIdx === quizData.length - 1) showCodePrize($(".quiz-card"));   // letzte Frage → Tresor-Ziffer
}
$("#quizNextBtn").addEventListener("click", () => {
  Sound.click();
  quizIdx++;
  if (quizIdx < quizData.length) renderQuiz();
  else { achievement("🏆", "Experte du couple", "Tu nous connais par cœur ❤️"); goTo("screen-catch"); }
});

/* ============================================================
   KAPITEL 6b — Herzen fangen (Canvas)
   ============================================================ */
const CatchGame = (() => {
  const cv = $("#catchCanvas");
  const ctx = cv.getContext("2d");
  const TARGET = 12;
  const kinds = [
    { e: "❤️", v: 1, w: 6 }, { e: "💕", v: 1, w: 4 },
    { e: "🍹", v: 1, w: 2 }, { e: "💋", v: 2, w: 1 },
    { e: "💣", v: 0, w: 3, bomb: true },          // Bombe → setzt den Zähler auf 0 zurück
  ];
  let W = 0, H = 0, dpr = 1, running = false, lastT = 0;
  let items = [], spawnAcc = 0, caught = 0, catcher = 0.5, won = false, started = false;

  function resize() {
    const cssW = Math.min(cv.parentElement.clientWidth, 760);
    W = cssW; H = Math.round(cssW * 0.62);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function reset() {
    resize(); items = []; spawnAcc = 0; caught = 0; catcher = 0.5; won = false; started = false;
    $("#catchWin").hidden = true; $("#catchCountdown").hidden = true; updateCount();
  }
  function updateCount() { $("#catchCount").textContent = `${Math.min(caught, TARGET)} / ${TARGET}`; }
  async function start() {
    reset(); running = true; lastT = 0; requestAnimationFrame(loop);
    await countdown();
  }
  function stop() { running = false; }

  // 5-Sekunden-Countdown, bevor Herzen & Bomben fallen
  async function countdown() {
    const el = $("#catchCountdown"); el.hidden = false; started = false;
    for (const n of [5, 4, 3, 2, 1]) {
      if (!running) { el.hidden = true; return; }
      el.innerHTML = `<span class="num">${n}</span>`;
      Sound.pop();
      await wait(1000);
    }
    if (!running) { el.hidden = true; return; }
    el.innerHTML = `<span class="num go">C’est parti ! 💛</span>`;
    Sound.found();
    await wait(650);
    el.hidden = true;
    started = true;
  }

  function pickKind() {
    const total = kinds.reduce((s, k) => s + k.w, 0);
    let r = Math.random() * total;
    for (const k of kinds) { if ((r -= k.w) < 0) return k; }
    return kinds[0];
  }
  function spawn() {
    const k = pickKind();
    items.push({ x: rand(0.08, 0.92), y: -0.06, vy: rand(0.30, 0.48), e: k.e, v: k.v, bomb: !!k.bomb, rot: rand(-0.3, 0.3), vr: rand(-1.5, 1.5) });
  }

  const CATCH_Y = 0.84, CATCH_W = 0.13;
  function update(dt, t) {
    if (!started) return;                 // 5-Sekunden-Countdown läuft noch
    if (!won) {
      spawnAcc += dt;
      const interval = Math.max(0.42, 0.78 - caught * 0.02);
      if (spawnAcc > interval) { spawnAcc = 0; spawn(); }
    }
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.y += it.vy * dt; it.rot += it.vr * dt;
      if (!won && it.y >= CATCH_Y && it.y <= CATCH_Y + 0.10 && Math.abs(it.x - catcher) < CATCH_W / 2 + 0.035) {
        const rect = cv.getBoundingClientRect();
        if (it.bomb) {
          caught = 0; updateCount(); Sound.wrong();      // Bombe gefangen → zurück auf 0
          cv.classList.add("boom"); setTimeout(() => cv.classList.remove("boom"), 320);
        } else {
          caught += it.v; updateCount(); Sound.pop();
          FX.heartsAt(rect.left + it.x * W, rect.top + CATCH_Y * H, 6);
          if (caught >= TARGET) win();
        }
        items.splice(i, 1);
        continue;
      }
      if (it.y > 1.15) items.splice(i, 1);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const size = Math.max(28, W * 0.052);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `${size}px serif`;
    items.forEach((it) => {
      ctx.save(); ctx.translate(it.x * W, it.y * H); ctx.rotate(it.rot);
      ctx.fillText(it.e, 0, 0); ctx.restore();
    });
    // Körbchen
    const bsize = Math.max(40, W * 0.1);
    ctx.font = `${bsize}px serif`;
    ctx.save();
    ctx.shadowColor = "rgba(240,201,135,0.6)"; ctx.shadowBlur = 18;
    ctx.fillText("🧺", catcher * W, CATCH_Y * H + bsize * 0.18);
    ctx.restore();
  }

  function loop(t) {
    if (!running) return;
    if (!lastT) lastT = t;
    const dt = Math.min(0.04, (t - lastT) / 1000); lastT = t;
    update(dt, t); draw();
    requestAnimationFrame(loop);
  }

  function win() {
    if (won) return; won = true;
    setTimeout(() => {
      $("#catchWin").hidden = false;
      showCodePrize($("#catchWin"));
      FX.confetti(90);
      achievement("🏆", "Attrapeuse de cœurs", "Tant de cœurs pour toi ❤️");
    }, 300);
  }

  // Steuerung: Körbchen folgt Maus / Finger
  function setCatcher(clientX) {
    const rect = cv.getBoundingClientRect();
    catcher = clamp((clientX - rect.left) / rect.width, 0.05, 0.95);
  }
  cv.addEventListener("pointermove", (e) => { setCatcher(e.clientX); });
  cv.addEventListener("pointerdown", (e) => { setCatcher(e.clientX); });
  window.addEventListener("keydown", (e) => {
    if (currentScreen !== "screen-catch") return;
    if (e.code === "ArrowLeft" || e.code === "KeyA") { catcher = clamp(catcher - 0.07, 0.05, 0.95); e.preventDefault(); }
    if (e.code === "ArrowRight" || e.code === "KeyD") { catcher = clamp(catcher + 0.07, 0.05, 0.95); e.preventDefault(); }
  });
  window.addEventListener("resize", () => { if (running) resize(); });

  return { start, stop };
})();
onEnter["screen-catch"] = () => CatchGame.start();
$("#catchNextBtn").addEventListener("click", () => { Sound.click(); goTo("screen-kisscam"); });

/* ============================================================
   KAPITEL 6c — Kiss-Cam (uns in der Menge finden & filmen)
   ============================================================ */
const KissCam = (() => {
  const cv = $("#kisscam"); const ctx = cv.getContext("2d");
  const mcv = document.createElement("canvas"); const mctx = mcv.getContext("2d");   // Abdunkel-Maske
  const scv = document.createElement("canvas"); const sctx = scv.getContext("2d");   // statische Szene (vorgerendert)
  const lerp = (a, b, t) => a + (b - a) * t;

  // ── Geometrie: ovale Stadion-Schüssel (Hufeisen, vorne offen zum Feld) ──
  const M = { x: 0.5, y: 0.43 }, Rx = 0.44, Ry = 0.40;          // Mittelpunkt + Radien der Tribünen-Ellipse
  const A0 = 212 * Math.PI / 180, A1 = -32 * Math.PI / 180;     // Winkelbereich (unten-links → über oben → unten-rechts)
  const FIELD = { cx: 0.5, cy: 0.70, rx: 0.30, ry: 0.165 };     // Eisfläche
  const JUMBO = { cx: 0.5, cy: 0.205, w: 0.30, h: 0.165 };      // Großer TV in der Mitte
  const jbBox = () => ({ x0: JUMBO.cx - JUMBO.w / 2, x1: JUMBO.cx + JUMBO.w / 2, y0: JUMBO.cy - JUMBO.h / 2, y1: JUMBO.cy + JUMBO.h / 2 });

  const skins = ["#f1c9a5", "#e6b48c", "#d49b73", "#b07a52", "#f3d2b3", "#c98a5f", "#a86b43"];
  const shirts = ["#3a6ea5", "#b5483f", "#d8a13a", "#4c8a5a", "#6a4a8a", "#7e8aa0", "#c9ccd4",
                  "#2f5f8a", "#a83f6a", "#43896f", "#c46a3a", "#5566aa"];

  let W = 0, H = 0, dpr = 1, running = false, lastT = 0;
  let cam = { x: 0.5, y: 0.42 }, crowd = [], couple = null;
  let captured = false, focus = 0, idle = 0, hintShown = false, flash = 0;
  let flashes = [];                              // aufblitzende Kamerablitze in der Menge

  function resize() {
    const cssW = Math.min(cv.parentElement.clientWidth, 980);
    W = cssW; H = Math.round(cssW * 0.74);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const o of [mcv, scv]) { if (o.width !== cv.width || o.height !== cv.height) { o.width = cv.width; o.height = cv.height; } }
    if (crowd.length) renderScene();
  }

  // Sitzposition aus Tier (0=vorn/innen … 1=hinten/oben) und Winkel
  function seatPos(t, theta) {
    const rf = lerp(0.50, 1.06, t);
    return { x: M.x + Rx * rf * Math.cos(theta), y: M.y - Ry * rf * Math.sin(theta) };
  }

  function buildCrowd() {
    crowd = [];
    const TIERS = 15;
    for (let ti = 0; ti < TIERS; ti++) {
      const t = ti / (TIERS - 1);
      const count = Math.round(lerp(52, 132, t));      // hintere Ränge sind länger → mehr Plätze
      const sz = lerp(0.0172, 0.0085, t);              // vorne größer, hinten kleiner (Tiefe)
      const bright = lerp(1.0, 0.6, t);                // atmosphärische Perspektive
      const stagger = (ti % 2) * 0.5;
      for (let i = 0; i < count; i++) {
        const f = (i + stagger + rand(-0.22, 0.22)) / count;
        const p = seatPos(t + rand(-0.014, 0.014), lerp(A0, A1, f));
        crowd.push({
          x: p.x, y: p.y + rand(-0.004, 0.004),
          s: sz * rand(0.88, 1.1),
          skin: skins[(Math.random() * skins.length) | 0],
          shirt: shirts[(Math.random() * shirts.length) | 0],
          bright, light: Math.random() < 0.05,
        });
      }
    }

    // Pärchen (wir): gut auffindbarer Platz – nicht hinter dem TV, nicht zu hoch/am Rand
    const jb = jbBox();
    let pick = null;
    for (let tries = 0; tries < 60 && !pick; tries++) {
      const t = rand(0.18, 0.5);
      const p = seatPos(t, lerp(A0, A1, rand(0.1, 0.9)));
      const inJumbo = p.y < jb.y1 + 0.04 && p.x > jb.x0 - 0.03 && p.x < jb.x1 + 0.03;
      if (!inJumbo && p.y > 0.34 && p.y < 0.6 && p.x > 0.16 && p.x < 0.84) pick = { x: p.x, y: p.y, s: lerp(0.0172, 0.0085, t) * 1.18 };
    }
    if (!pick) pick = { x: 0.30, y: 0.5, s: 0.018 };
    const spread = pick.s * 0.72;
    couple = { x1: pick.x - spread, x2: pick.x + spread, y: pick.y, cx: pick.x, cy: pick.y, s: pick.s };
    crowd = crowd.filter((p) => Math.hypot(p.x - couple.cx, p.y - couple.cy) > pick.s * 1.7);
  }

  function reset() {
    resize(); buildCrowd(); renderScene();
    cam = { x: 0.5, y: 0.42 }; captured = false; focus = 0; idle = 0; hintShown = false; flash = 0; flashes = [];
    $("#kisscamWin").hidden = true; $("#kisscamHint").hidden = true;
  }
  function start() { reset(); running = true; lastT = 0; requestAnimationFrame(loop); }
  function stop() { running = false; }

  // ── Zeichen-Helfer ──
  function rrCtx(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function heart(c, cx, cy, s) {
    c.beginPath();
    c.moveTo(cx, cy + s * 0.9);
    c.bezierCurveTo(cx + s * 1.12, cy + s * 0.1, cx + s * 0.55, cy - s * 0.9, cx, cy - s * 0.25);
    c.bezierCurveTo(cx - s * 0.55, cy - s * 0.9, cx - s * 1.12, cy + s * 0.1, cx, cy + s * 0.9);
    c.closePath();
  }
  // 16:9-Kamerarahmen-Maße um (cx,cy), abgeleitet aus dem Sucher-Radius r
  function camBox(cx, cy, r) {
    const hw = r * 1.34, hh = hw * 9 / 16;
    return { x: cx - hw, y: cy - hh, w: hw * 2, h: hh * 2, hw, hh, rad: hh * 0.16 };
  }
  function shade(hex, m) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((n >> 16) & 255) * m) | 0, g = Math.min(255, ((n >> 8) & 255) * m) | 0, b = Math.min(255, (n & 255) * m) | 0;
    return `rgb(${r},${g},${b})`;
  }
  // Zuschauer als Punkt (Schultern + Kopf) — wirkt als Menge
  function dot(c, px, py, s, skin, shirt, bright) {
    c.fillStyle = shade(shirt, bright);
    rrCtx(c, px - s * 0.5, py - s * 0.06, s, s * 0.72, s * 0.34); c.fill();
    c.fillStyle = shade(skin, bright);
    c.beginPath(); c.arc(px, py - s * 0.52, s * 0.42, 0, Math.PI * 2); c.fill();
  }
  function phoneLight(c, px, py, s) {
    c.save(); c.globalCompositeOperation = "lighter";
    const g = c.createRadialGradient(px, py, 0, px, py, s * 1.8);
    g.addColorStop(0, "rgba(255,244,210,0.95)"); g.addColorStop(1, "rgba(255,244,210,0)");
    c.fillStyle = g; c.beginPath(); c.arc(px, py, s * 1.8, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  // Hufeisen-Pfade
  function bowlRing(c, innerRf, outerRf) {
    const steps = 70; c.beginPath();
    for (let i = 0; i <= steps; i++) { const th = lerp(A0, A1, i / steps); const x = (M.x + Rx * outerRf * Math.cos(th)) * W, y = (M.y - Ry * outerRf * Math.sin(th)) * H; i ? c.lineTo(x, y) : c.moveTo(x, y); }
    for (let i = steps; i >= 0; i--) { const th = lerp(A0, A1, i / steps); c.lineTo((M.x + Rx * innerRf * Math.cos(th)) * W, (M.y - Ry * innerRf * Math.sin(th)) * H); }
    c.closePath();
  }
  function bowlArc(c, rf) {
    const steps = 70; c.beginPath();
    for (let i = 0; i <= steps; i++) { const th = lerp(A0, A1, i / steps); const x = (M.x + Rx * rf * Math.cos(th)) * W, y = (M.y - Ry * rf * Math.sin(th)) * H; i ? c.lineTo(x, y) : c.moveTo(x, y); }
  }
  function drawBowl(c) {
    c.save();
    bowlRing(c, 0.46, 1.07);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0f1426"); g.addColorStop(1, "#1c2440");
    c.fillStyle = g; c.fill();
    c.clip();
    c.strokeStyle = "rgba(0,0,0,0.28)"; c.lineWidth = 1;
    for (let k = 1; k < 12; k++) { bowlArc(c, lerp(0.46, 1.07, k / 12)); c.stroke(); }
    // sanftes oberes Highlight
    c.globalCompositeOperation = "lighter";
    const hl = c.createLinearGradient(0, 0, 0, H * 0.5);
    hl.addColorStop(0, "rgba(120,150,220,0.10)"); hl.addColorStop(1, "rgba(120,150,220,0)");
    c.fillStyle = hl; c.fillRect(0, 0, W, H * 0.5);
    c.restore();
  }

  // Spielfeld (Eisfläche)
  function drawField(c) {
    const cx = FIELD.cx * W, cy = FIELD.cy * H, rx = FIELD.rx * W, ry = FIELD.ry * H;
    c.save(); c.fillStyle = "rgba(0,0,0,0.40)"; c.beginPath(); c.ellipse(cx, cy + ry * 0.12, rx * 1.07, ry * 1.08, 0, 0, Math.PI * 2); c.fill(); c.restore();
    c.save();
    c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.clip();
    const g = c.createLinearGradient(0, cy - ry, 0, cy + ry);
    g.addColorStop(0, "#cfe0f5"); g.addColorStop(0.5, "#eef5ff"); g.addColorStop(1, "#d8e7fb");
    c.fillStyle = g; c.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    c.lineWidth = Math.max(1.5, W * 0.0028);
    c.strokeStyle = "rgba(70,110,200,0.5)";
    c.beginPath(); c.moveTo(cx - rx * 0.52, cy - ry); c.lineTo(cx - rx * 0.52, cy + ry); c.moveTo(cx + rx * 0.52, cy - ry); c.lineTo(cx + rx * 0.52, cy + ry); c.stroke();
    c.strokeStyle = "rgba(200,60,60,0.65)";
    c.beginPath(); c.moveTo(cx, cy - ry); c.lineTo(cx, cy + ry); c.stroke();
    c.strokeStyle = "rgba(70,110,200,0.5)";
    c.beginPath(); c.ellipse(cx, cy, rx * 0.17, ry * 0.42, 0, 0, Math.PI * 2); c.stroke();
    c.fillStyle = "rgba(200,60,60,0.55)";
    for (const fx of [-0.6, 0.6]) for (const fy of [-0.5, 0.5]) { c.beginPath(); c.ellipse(cx + rx * fx, cy + ry * fy, rx * 0.022, ry * 0.05, 0, 0, Math.PI * 2); c.fill(); }
    c.globalCompositeOperation = "lighter";
    const sh = c.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    sh.addColorStop(0, "rgba(255,255,255,0)"); sh.addColorStop(0.5, "rgba(255,255,255,0.16)"); sh.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = sh; c.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    c.restore();
    c.lineWidth = Math.max(2, W * 0.0055); c.strokeStyle = "rgba(255,255,255,0.72)";
    c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.stroke();
  }

  // Jumbotron-Gerüst (Bildschirm wird live gezeichnet)
  function drawJumboFrame(c) {
    const b = jbBox(), x0 = b.x0 * W, y0 = b.y0 * H, w = JUMBO.w * W, h = JUMBO.h * H, cx = JUMBO.cx * W;
    c.strokeStyle = "rgba(150,165,195,0.55)"; c.lineWidth = Math.max(2, W * 0.0035);
    c.beginPath();
    c.moveTo(cx - w * 0.30, 0); c.lineTo(x0 + w * 0.16, y0);
    c.moveTo(cx + w * 0.30, 0); c.lineTo(x0 + w * 0.84, y0);
    c.moveTo(cx, 0); c.lineTo(cx, y0 - 4);
    c.stroke();
    c.fillStyle = "#0a0c14"; rrCtx(c, x0 - 8, y0 - 8, w + 16, h + 16, 14); c.fill();
    c.strokeStyle = "rgba(255,255,255,0.10)"; c.lineWidth = 1; rrCtx(c, x0 - 8, y0 - 8, w + 16, h + 16, 14); c.stroke();
  }
  function drawJumboScreen(c, t) {
    const b = jbBox(), x0 = b.x0 * W, y0 = b.y0 * H, w = JUMBO.w * W, h = JUMBO.h * H, cx = JUMBO.cx * W, cy = JUMBO.cy * H;
    c.save(); c.globalCompositeOperation = "lighter";
    const gl = c.createRadialGradient(cx, cy, 0, cx, cy, w * 0.95);
    gl.addColorStop(0, "rgba(255,140,175,0.30)"); gl.addColorStop(1, "rgba(255,140,175,0)");
    c.fillStyle = gl; c.fillRect(x0 - w * 0.6, y0 - h * 0.6, w * 2.2, h * 2.2); c.restore();
    c.save();
    rrCtx(c, x0, y0, w, h, 8); c.clip();
    const sg = c.createLinearGradient(0, y0, 0, y0 + h);
    sg.addColorStop(0, "#3a1840"); sg.addColorStop(1, "#531f3b");
    c.fillStyle = sg; c.fillRect(x0, y0, w, h);
    c.fillStyle = "rgba(0,0,0,0.10)"; for (let yy = y0; yy < y0 + h; yy += 3) c.fillRect(x0, yy, w, 1);
    c.fillStyle = "#ffd884"; c.textAlign = "center"; c.textBaseline = "middle";
    c.font = `900 ${Math.max(11, h * 0.2)}px Nunito, sans-serif`;
    c.fillText("KISS CAM", cx, y0 + h * 0.26);
    const ps = 1 + Math.sin(t / 280) * 0.09;
    c.save(); c.shadowColor = "#ff6a8a"; c.shadowBlur = 16; c.fillStyle = "#ff5a7e";
    heart(c, cx, y0 + h * 0.64, h * 0.22 * ps); c.fill(); c.restore();
    c.globalCompositeOperation = "lighter";
    const gloss = c.createLinearGradient(0, y0, 0, y0 + h * 0.5);
    gloss.addColorStop(0, "rgba(255,255,255,0.14)"); gloss.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = gloss; c.fillRect(x0, y0, w, h * 0.5);
    c.restore();
    c.strokeStyle = "rgba(245,210,140,0.9)"; c.lineWidth = Math.max(2, W * 0.0032); rrCtx(c, x0, y0, w, h, 8); c.stroke();
  }

  function drawVignette(c) {
    const g = c.createRadialGradient(W * 0.5, H * 0.42, H * 0.2, W * 0.5, H * 0.52, H * 0.95);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.55)");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }

  // Kamera-Sucher-HUD: vermittelt das Gefühl, durch eine Kamera zu schauen und zu suchen
  function drawViewfinder(c, t) {
    c.save();
    const pad = Math.max(12, W * 0.028);
    const len = Math.max(16, W * 0.04);
    const fs  = Math.max(10, W * 0.016);
    // Ecken-Klammern des Suchers
    c.strokeStyle = "rgba(235,240,255,0.6)"; c.lineWidth = Math.max(2, W * 0.0035);
    for (const [x, y, sx, sy] of [[pad, pad, 1, 1], [W - pad, pad, -1, 1], [pad, H - pad, 1, -1], [W - pad, H - pad, -1, -1]]) {
      c.beginPath(); c.moveTo(x, y + sy * len); c.lineTo(x, y); c.lineTo(x + sx * len, y); c.stroke();
    }
    // Drittel-Raster (dezent)
    c.strokeStyle = "rgba(235,240,255,0.08)"; c.lineWidth = 1;
    c.beginPath();
    c.moveTo(W / 3, pad); c.lineTo(W / 3, H - pad); c.moveTo(2 * W / 3, pad); c.lineTo(2 * W / 3, H - pad);
    c.moveTo(pad, H / 3); c.lineTo(W - pad, H / 3); c.moveTo(pad, 2 * H / 3); c.lineTo(W - pad, 2 * H / 3);
    c.stroke();
    // REC + Timecode oben links
    c.textBaseline = "middle"; c.font = `700 ${fs}px Nunito, sans-serif`;
    const ry = pad + len + fs;
    if (Math.floor(t / 500) % 2 === 0) { c.fillStyle = "#ff4d4d"; c.beginPath(); c.arc(pad + fs * 0.5, ry, fs * 0.42, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = "rgba(235,240,255,0.85)"; c.textAlign = "left";
    c.fillText("REC", pad + fs * 1.3, ry);
    const sec = Math.floor(t / 1000), tc = `00:${String(((sec / 60) | 0) % 60).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
    c.fillStyle = "rgba(235,240,255,0.6)"; c.fillText(tc, pad + fs * 1.3, ry + fs * 1.4);
    // Batterie oben rechts
    const bw = fs * 2.2, bh = fs * 1.05, bx = W - pad - bw, by = ry - bh / 2;
    c.strokeStyle = "rgba(235,240,255,0.7)"; c.lineWidth = 1.5; rrCtx(c, bx, by, bw, bh, 2); c.stroke();
    c.fillStyle = "rgba(235,240,255,0.7)"; c.fillRect(bx + bw, by + bh * 0.3, 2, bh * 0.4);
    c.fillStyle = "rgba(120,230,140,0.9)"; c.fillRect(bx + 2, by + 2, (bw - 4) * 0.82, bh - 4);
    c.restore();
  }

  // ── Statische Szene einmalig vorrendern ──
  function renderScene() {
    const c = sctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    const bg = c.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0a0e1c"); bg.addColorStop(0.5, "#0e1426"); bg.addColorStop(1, "#070a14");
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.fillStyle = "#05070e"; c.fillRect(0, 0, W, H * 0.04);
    // Flutlicht
    c.save(); c.globalCompositeOperation = "lighter";
    for (const fx of [0.12, 0.32, 0.5, 0.68, 0.88]) {
      c.fillStyle = "rgba(255,250,235,0.85)"; c.fillRect(fx * W - 7, H * 0.012, 14, 5);
      const g = c.createRadialGradient(fx * W, H * 0.03, 0, fx * W, H * 0.03, H * 0.6);
      g.addColorStop(0, "rgba(180,205,255,0.10)"); g.addColorStop(1, "rgba(180,205,255,0)");
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    c.restore();
    // Tribünen-Schüssel
    drawBowl(c);
    // Zuschauer
    crowd.forEach((p) => dot(c, p.x * W, p.y * H, p.s * W, p.skin, p.shirt, p.bright));
    crowd.forEach((p) => { if (p.light) phoneLight(c, p.x * W, p.y * H - p.s * W * 0.52, p.s * W); });
    // Warmer Schein um uns (nur im Scheinwerfer sichtbar → bestätigt den Fund)
    c.save(); c.globalCompositeOperation = "lighter";
    const cg = c.createRadialGradient(couple.cx * W, couple.cy * H, 0, couple.cx * W, couple.cy * H, couple.s * W * 2.6);
    cg.addColorStop(0, "rgba(255,180,160,0.28)"); cg.addColorStop(1, "rgba(255,180,160,0)");
    c.fillStyle = cg; c.beginPath(); c.arc(couple.cx * W, couple.cy * H, couple.s * W * 2.6, 0, Math.PI * 2); c.fill(); c.restore();
    // Wir
    const cs = couple.s * W;
    dot(c, couple.x1 * W, couple.y * H, cs, "#f3d2b3", "#e06a86", 1.04);
    dot(c, couple.x2 * W, couple.y * H, cs, "#e8b58a", "#caa244", 1.04);
    // Spielfeld + Jumbotron-Gerüst + Vignette
    drawField(c);
    drawJumboFrame(c);
    drawVignette(c);
  }

  // Kamerablitze in der Menge erzeugen & altern lassen
  function updateFlashes(dt) {
    if (crowd.length && Math.random() < dt * 18) {          // ~18 Blitze pro Sekunde
      const p = crowd[(Math.random() * crowd.length) | 0];
      flashes.push({ x: p.x, y: p.y - p.s * 0.5, s: p.s, t: 0, life: rand(0.09, 0.18) });
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      flashes[i].t += dt;
      if (flashes[i].t >= flashes[i].life) flashes.splice(i, 1);
    }
  }
  // Blitze zeichnen — leuchten auch durch die Abdunklung (wie echte Blitze im dunklen Stadion)
  function drawFlashes(c) {
    if (!flashes.length) return;
    c.save(); c.globalCompositeOperation = "lighter";
    for (const f of flashes) {
      const a = Math.sin((f.t / f.life) * Math.PI);         // schneller An/Aus-Puls
      if (a <= 0) continue;
      const px = f.x * W, py = f.y * H, rad = f.s * W * (2.0 + a * 1.6);
      const g = c.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, `rgba(255,255,255,${0.95 * a})`);
      g.addColorStop(0.4, `rgba(220,235,255,${0.5 * a})`);
      g.addColorStop(1, "rgba(200,225,255,0)");
      c.fillStyle = g; c.beginPath(); c.arc(px, py, rad, 0, Math.PI * 2); c.fill();
      c.fillStyle = `rgba(255,255,255,${a})`;               // heller Kern
      c.beginPath(); c.arc(px, py, f.s * W * 0.5, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  function update(dt) {
    updateFlashes(dt);
    if (captured) { flash = Math.max(0, flash - dt); return; }
    const frameR = Math.min(W, H) * 0.0945;   // Suchfeld um 30 % verkleinert (war 0.135)
    const hw = frameR * 1.34, hh = hw * 9 / 16;   // 16:9-Trefferfeld passend zum Sucher
    const dx = Math.abs(cam.x * W - couple.cx * W), dy = Math.abs(cam.y * H - couple.cy * H);
    if (dx < hw * 0.82 && dy < hh * 0.82) { focus = Math.min(1, focus + dt / 1.1); idle = 0; }
    else { focus = Math.max(0, focus - dt / 0.6); idle += dt; }
    if (focus >= 1) capture();
    if (!hintShown && idle > 12) {
      hintShown = true;
      const h = $("#kisscamHint"); h.hidden = false;
      h.textContent = "Astuce : balaie lentement la foule et fais la mise au point.";
    }
  }
  function capture() {
    captured = true; flash = 0.5; Sound.reveal();
    const rect = cv.getBoundingClientRect();
    FX.confetti(120);
    FX.heartsAt(rect.left + couple.cx * W, rect.top + couple.cy * H, 22);
    $("#kisscamPhoto").src = CONFIG.kisscamPhoto;
    $("#kisscamHint").hidden = true;
    setTimeout(() => {
      $("#kisscamWin").hidden = false;
      showCodePrize($("#kisscamWin"));
      achievement("🏆", "Réalisatrice de la Kiss-Cam", "Trouvés – comme l’an dernier ❤️");
    }, 650);
  }

  function draw(t) {
    const frameR = Math.min(W, H) * 0.0945;   // Suchfeld um 30 % verkleinert
    const camx = cam.x * W, camy = cam.y * H;

    // Vorgerenderte Szene
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(scv, 0, 0, W, H);

    // Abdunkeln mit Herz-Scheinwerfer
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.clearRect(0, 0, W, H);
    mctx.fillStyle = "rgba(5,7,16,0.5)"; mctx.fillRect(0, 0, W, H);
    mctx.globalCompositeOperation = "destination-out";
    mctx.fillStyle = "#000";
    const mb = camBox(camx, camy, frameR);
    rrCtx(mctx, mb.x, mb.y, mb.w, mb.h, mb.rad); mctx.fill();
    mctx.globalCompositeOperation = "source-over";
    ctx.drawImage(mcv, 0, 0, W, H);

    // Warmes Licht im Scheinwerfer
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    const wl = ctx.createRadialGradient(camx, camy, 0, camx, camy, frameR * 1.4);
    wl.addColorStop(0, "rgba(255,225,180,0.10)"); wl.addColorStop(1, "rgba(255,225,180,0)");
    ctx.fillStyle = wl; ctx.beginPath(); ctx.arc(camx, camy, frameR * 1.4, 0, Math.PI * 2); ctx.fill(); ctx.restore();

    // Kamerablitze aus der fotografierenden Menge
    drawFlashes(ctx);

    // Großer TV in der Mitte (leuchtet über der Abdunklung)
    drawJumboScreen(ctx, t);

    // Kamera-Sucher: 16:9-Rahmen + Autofokus — KEIN Herz mehr
    if (!captured) {
      ctx.save();
      const fb = camBox(camx, camy, frameR);
      // 16:9-Rahmen
      rrCtx(ctx, fb.x, fb.y, fb.w, fb.h, fb.rad);
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(240,201,135,0.95)"; ctx.stroke();
      // Ecken-Winkel (Kamera-Framing-Look)
      const ct = Math.min(fb.w, fb.h) * 0.24;
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,255,0.9)";
      for (const [cx2, cy2, sx, sy] of [[fb.x, fb.y, 1, 1], [fb.x + fb.w, fb.y, -1, 1], [fb.x, fb.y + fb.h, 1, -1], [fb.x + fb.w, fb.y + fb.h, -1, -1]]) {
        ctx.beginPath(); ctx.moveTo(cx2, cy2 + sy * ct); ctx.lineTo(cx2, cy2); ctx.lineTo(cx2 + sx * ct, cy2); ctx.stroke();
      }
      // Beschriftung: KISS CAM oben, 16:9 unten rechts
      ctx.fillStyle = "#ffd27a"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.font = `800 ${Math.max(11, W * 0.02)}px Nunito, sans-serif`;
      ctx.fillText("KISS CAM", camx, fb.y - Math.max(8, W * 0.014));
      ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.textAlign = "right";
      ctx.font = `700 ${Math.max(9, W * 0.015)}px Nunito, sans-serif`;
      ctx.fillText("16:9", fb.x + fb.w - 6, fb.y + fb.h - 6);
      // Autofokus-Fadenkreuz in der Mitte
      ctx.strokeStyle = focus > 0.01 ? "rgba(255,141,161,0.97)" : "rgba(255,255,255,0.8)"; ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(camx - frameR * 0.28, camy); ctx.lineTo(camx + frameR * 0.28, camy);
      ctx.moveTo(camx, camy - frameR * 0.28); ctx.lineTo(camx, camy + frameR * 0.28);
      ctx.stroke();

      // Erfolgs-/Ladekreis: füllt sich, je länger man auf der richtigen Stelle bleibt
      if (focus > 0.01) {
        const rr = Math.max(fb.hw, fb.hh) + frameR * 0.28;
        ctx.save();
        // Hintergrundring
        ctx.beginPath(); ctx.lineWidth = 5; ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.arc(camx, camy, rr, 0, Math.PI * 2); ctx.stroke();
        // Ladebogen – wächst mit focus von oben im Uhrzeigersinn, glüht zunehmend
        ctx.lineCap = "round";
        ctx.shadowColor = "rgba(255,150,175,0.9)"; ctx.shadowBlur = 10 + focus * 22;
        ctx.beginPath(); ctx.lineWidth = 6;
        ctx.strokeStyle = `rgb(255,${(150 + focus * 70) | 0},${(175 + focus * 40) | 0})`;
        ctx.arc(camx, camy, rr, -Math.PI / 2, -Math.PI / 2 + focus * Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        // Prozent-Anzeige unter dem Kreis
        ctx.fillStyle = "rgba(255,255,255,0.92)"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = `800 ${Math.max(10, W * 0.02)}px Nunito, sans-serif`;
        ctx.fillText(`${Math.round(focus * 100)} %`, camx, camy + rr + Math.max(12, W * 0.026));
      }
      ctx.restore();
    }

    // Kamera-Sucher-HUD über alles — Gefühl, durch eine Kamera zu schauen
    drawViewfinder(ctx, t);

    if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, W, H); }
  }

  function loop(t) {
    if (!running) return;
    if (!lastT) lastT = t;
    const dt = Math.min(0.04, (t - lastT) / 1000); lastT = t;
    update(dt); draw(t);
    requestAnimationFrame(loop);
  }

  // Steuerung: Kamera folgt Maus / Finger
  function setCam(clientX, clientY) {
    const rect = cv.getBoundingClientRect();
    cam.x = clamp((clientX - rect.left) / rect.width, 0.04, 0.96);
    cam.y = clamp((clientY - rect.top) / rect.height, 0.04, 0.84);
  }
  cv.addEventListener("pointermove", (e) => { setCam(e.clientX, e.clientY); });
  cv.addEventListener("pointerdown", (e) => { setCam(e.clientX, e.clientY); });
  window.addEventListener("keydown", (e) => {
    if (currentScreen !== "screen-kisscam") return;
    if (e.code === "ArrowLeft" || e.code === "KeyA") { cam.x = clamp(cam.x - 0.04, 0.04, 0.96); e.preventDefault(); }
    if (e.code === "ArrowRight" || e.code === "KeyD") { cam.x = clamp(cam.x + 0.04, 0.04, 0.96); e.preventDefault(); }
    if (e.code === "ArrowUp" || e.code === "KeyW") { cam.y = clamp(cam.y - 0.04, 0.04, 0.84); e.preventDefault(); }
    if (e.code === "ArrowDown" || e.code === "KeyS") { cam.y = clamp(cam.y + 0.04, 0.04, 0.84); e.preventDefault(); }
  });
  window.addEventListener("resize", () => { if (running) resize(); });

  return { start, stop };
})();
onEnter["screen-kisscam"] = () => KissCam.start();
$("#kisscamNextBtn").addEventListener("click", () => { Sound.click(); goTo("screen-vault"); });

/* ============================================================
   KAPITEL 7 — Der Tresor
   ============================================================ */
let codeInput = "";
function renderCode() {
  const slots = $$("#codeDisplay .digit");
  slots.forEach((s, i) => (s.textContent = codeInput[i] || "_"));
}
$("#keypad").addEventListener("click", (e) => {
  const key = e.target.dataset.key;
  if (!key) return;
  Sound.click();
  if (key === "clear") { codeInput = codeInput.slice(0, -1); renderCode(); return; }
  if (key === "ok") { checkCode(); return; }
  const LEN = CONFIG.vaultCode.length;
  if (codeInput.length < LEN) { codeInput += key; renderCode(); }
  if (codeInput.length === LEN) setTimeout(checkCode, 250);
});
function checkCode() {
  if (codeInput === CONFIG.vaultCode) { openVault(); }
  else {
    Sound.wrong();
    const disp = $("#codeDisplay"); disp.classList.add("bad");
    $("#vaultDoor").classList.add("shake");
    setTimeout(() => { disp.classList.remove("bad"); $("#vaultDoor").classList.remove("shake"); codeInput = ""; renderCode(); }, 500);
  }
}
$("#vaultHelpBtn").addEventListener("click", () => {
  Sound.click();
  codeInput = CONFIG.vaultCode; renderCode();
  setTimeout(openVault, 400);
});
/* Dinner-Ticket (geteilt zwischen Safe-Auswurf und Finale) */
function ticketMarkup() {
  return (
    `<div class="ticket-main">` +
      `<span class="ticket-kicker">★ Sommernachtskino 2026 ★</span>` +
      `<p class="ticket-title ti-film"></p>` +
      `<div class="ticket-row"><span class="ti-ic">📅</span><span class="ti-when"></span></div>` +
      `<div class="ticket-row"><span class="ti-ic">🕦</span><span class="ti-time"></span></div>` +
      `<div class="ticket-row"><span class="ti-ic">📍</span><span class="ti-place"></span></div>` +
      `<p class="ticket-note">Finger food, cocktails au vin & coucher de soleil sur les vignes – cinéma à ciel ouvert. ❤️</p>` +
    `</div>` +
    `<div class="ticket-stub">` +
      `<span class="stub-heart">🎬</span>` +
      `<span class="stub-txt">Rang ❤<br>Place 2</span>` +
    `</div>`
  );
}
function fillTicket(root) {
  root.querySelector(".ti-film").textContent = CONFIG.filmTitle;
  root.querySelector(".ti-when").textContent = CONFIG.inviteWhen;
  root.querySelector(".ti-time").textContent = CONFIG.inviteTime;
  root.querySelector(".ti-place").textContent = CONFIG.invitePlace;
}

let vaultOpened = false;
function openVault() {
  if (vaultOpened) return; vaultOpened = true;
  Sound.vault();
  $(".vault-card").classList.add("opened");
  $("#vaultDoor").classList.add("open");
  $("#keypad").style.pointerEvents = "none";
  // Direkt nach der Code-Eingabe: das Video erscheint, sobald der Tresor offen ist.
  // (Das Ticket wird im großen Finale nach dem Video gezeigt.)
  FX.confetti(60);
  setTimeout(playFinaleVideo, 650);
}

/* ============================================================
   Kino-Sequenz — Video nach dem Öffnen des Tresors
   ============================================================ */
let cinemaDone = false;
function playFinaleVideo() {
  const cinema = $("#videoCinema");
  const video  = $("#finaleVideo");
  const playBtn = $("#cinemaPlay");
  const skipBtn = $("#cinemaSkip");
  if (!cinema || !video) { goTo("screen-final"); return; }

  // Hintergrundmusik leiser, damit der Ton des Videos im Vordergrund steht
  if (Sound.master) { Sound._preCinemaGain = Sound.master.gain.value; Sound.master.gain.value = 0.08; }

  cinema.hidden = false;
  requestAnimationFrame(() => cinema.classList.add("show"));
  skipBtn.hidden = false;

  // Fällt das Video aus (Fehler/keine Datei), trotzdem ins Finale
  video.addEventListener("error", () => endFinaleVideo(), { once: true });
  video.addEventListener("ended", () => endFinaleVideo(), { once: true });
  skipBtn.addEventListener("click", () => { Sound.click(); endFinaleVideo(); });

  // Abspielen versuchen (mit Ton). Blockiert der Browser den Autostart,
  // zeigen wir einen großen Play-Button.
  const attempt = video.play();
  if (attempt && typeof attempt.then === "function") {
    attempt.catch(() => {
      playBtn.hidden = false;
      playBtn.addEventListener("click", () => {
        playBtn.hidden = true;
        video.play().catch(() => endFinaleVideo());
      }, { once: true });
    });
  }
}

function endFinaleVideo() {
  if (cinemaDone) return; cinemaDone = true;
  const cinema = $("#videoCinema");
  const video  = $("#finaleVideo");
  try { video.pause(); } catch (e) {}
  // Musik wieder anheben
  if (Sound.master && Sound._preCinemaGain != null) Sound.master.gain.value = Sound._preCinemaGain;
  cinema.classList.remove("show");
  cinema.classList.add("hide");
  setTimeout(() => { cinema.hidden = true; goTo("screen-final"); }, 700);
}

/* ============================================================
   KAPITEL 8 — Finale Enthüllung
   ============================================================ */
onEnter["screen-final"] = () => {
  if (entered.has("final-played")) return;
  entered.add("final-played");

  notify("Elle a tout réussi 🏆 — sie hat das Finale erreicht & das Ticket gesehen!", { title: "Mission erfüllt 🎬❤️", tags: "trophy,sparkles", once: "finale" });

  // Euer Bild als formatfüllender Hintergrund
  const bg = $("#finalBg");
  if (bg) bg.src = CONFIG.finalPhoto;

  // Event-Flyer unter der Eintrittskarte
  const flyer = $("#finalFlyer");
  if (flyer) flyer.src = CONFIG.finalFlyer;

  const ft = $("#finalTicket");
  ft.innerHTML = ticketMarkup(); fillTicket(ft);
  $("#finalCard").hidden = false;
  requestAnimationFrame(() => ft.classList.add("reveal"));

  Sound.reveal();
  FX.confetti(160);
  FX.heartsAt(window.innerWidth / 2, window.innerHeight * 0.42, 26);
  FX.setAmbient(true);
  achievement("🏆", "Meilleure compagnie pour le cinéma d’été", "À bientôt, le 26 juin ❤️");
};

$("#replayBtn").addEventListener("click", () => location.reload());
