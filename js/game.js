// Jimmy Bop — side-scrolling lava runner. Physics only; no DOM.

export const VIEW_W = 480;
export const VIEW_H = 270;
export const GROUND_Y = 208;
export const PIT_DEPTH = 18;
export const PLAYER_W = 18;
export const PLAYER_H = 26;
export const GRAVITY = 1900;
export const JUMP_V = -590;
export const PIT_JUMP_V = -760;
export const PIT_JUMP_VX = 300;
export const MAX_FALL = 900;
export const MELT_TIME = 1.28;
export const STEP = 1 / 120;
export const AIR_TIME = (2 * Math.abs(JUMP_V)) / GRAVITY;

export function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

export function jumpReach(speed) {
  return Math.abs(speed) * AIR_TIME;
}

export function difficultyOf(runX) {
  return clamp((runX - 700) / 4600, 0, 1);
}

export function cruiseOf(d) {
  return 188 + d * 104;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LINES = {
  lava: [
    "The lava gave Jimmy a hug.",
    "Earmuffs: fine. Jimmy: puddle.",
    "That is one warm snowman.",
  ],
  heat: [
    "Too toasty. Even for a daredevil plush.",
    "Jimmy forgot the ice hole.",
    "Melted from sheer enthusiasm.",
  ],
  fall: [
    "That hole was not ice.",
    "Jimmy tried flying. Briefly.",
    "Straight into the soup.",
  ],
};

function makePlayer(x, y) {
  return {
    x,
    y,
    vx: 150,
    vy: 0,
    onGround: true,
    inPit: false,
    heat: 42,
    lives: 3,
    mercy: 0.35,
    hopping: 0,
    coyote: 0.12,
    jumpBuf: 0,
    squash: 1,
    stretch: 1,
    bonk: 0,
    blink: 0,
    blinkT: 1.4,
    runPhase: 0,
    pop: 0.02,
  };
}

function pushSegment(g, spec) {
  const seg = {
    x: g.genX,
    w: spec.w,
    kind: spec.kind,
    y: GROUND_Y,
    fill: 0,
    sign: spec.sign || null,
    obs: [],
    coins: [],
  };
  if (spec.obs) {
    for (const o of spec.obs) {
      seg.obs.push({
        k: o.k,
        x: seg.x + o.at,
        w: o.w,
        h: o.h,
        cleared: false,
      });
    }
  }
  if (spec.coins) {
    const n = spec.coins;
    for (let i = 0; i < n; i++) {
      seg.coins.push({
        x: seg.x + 28 + i * 26,
        y: GROUND_Y - 34,
        got: false,
      });
    }
  }
  if (spec.kind === "gap" && spec.arc) {
    for (let i = 0; i < 3; i++) {
      const t = (i + 1) / 4;
      seg.coins.push({
        x: seg.x + seg.w * t,
        y: GROUND_Y - 62 - Math.sin(t * Math.PI) * 18,
        got: false,
      });
    }
  }
  g.segments.push(seg);
  g.genX += spec.w;
  g.lastKind = spec.kind;
  if (spec.kind === "pit") g.lastPitX = seg.x;
}

const INTRO = [
  { kind: "ground", w: 380, coins: 5 },
  { kind: "ground", w: 360, obs: [{ k: "crate", w: 22, h: 22, at: 80 }] },
  { kind: "gap", w: 62, arc: true },
  { kind: "ground", w: 320, coins: 4 },
  { kind: "pit", w: 220, sign: "COOL OFF" },
  { kind: "ground", w: 300, coins: 4 },
  {
    kind: "ground",
    w: 460,
    obs: [
      { k: "rock", w: 34, h: 16, at: 140 },
      { k: "pillar", w: 18, h: 40, at: 300 },
    ],
  },
  { kind: "gap", w: 66, arc: true },
  { kind: "ground", w: 240, coins: 3 },
  { kind: "pit", w: 168, sign: "ICE" },
  { kind: "ground", w: 340, coins: 3 },
];

function randomObs(rng, d) {
  const r = rng();
  if (r < 0.34) return { k: "crate", w: 22, h: 22 };
  if (r < 0.62) return { k: "rock", w: 32, h: 16 };
  const tall = 34 + Math.floor(rng() * (d > 0.5 ? 16 : 10));
  return { k: "pillar", w: 18, h: tall };
}

function addProcedural(g) {
  const d = difficultyOf(g.genX);
  const cruise = cruiseOf(d);
  const reach = jumpReach(cruise);
  const sincePit = g.genX - g.lastPitX;
  const roll = g.rng();
  let kind = "ground";
  if (sincePit > 700) kind = "pit";
  else if (sincePit > 380 && roll < 0.34) kind = "pit";
  else if (roll < 0.22) kind = "gap";

  if ((kind === "gap" || kind === "pit") && (g.lastKind === "gap" || g.lastKind === "pit")) {
    kind = "ground";
  }

  if (kind === "gap") {
    const w = Math.round(clamp(reach * (0.5 + g.rng() * 0.12), 56, 108));
    pushSegment(g, { kind, w, arc: g.rng() < 0.75 });
    return;
  }

  if (kind === "pit") {
    const w = Math.round(clamp(reach * (0.72 + g.rng() * 0.1), 84, 140));
    pushSegment(g, { kind, w, sign: g.rng() < 0.35 ? "ICE" : null });
    return;
  }

  let w = Math.round(280 + g.rng() * 180 + d * 70);
  let pad = 110;
  if (g.lastKind === "pit") {
    w = Math.max(w, 380);
    pad = 270;
  } else if (g.lastKind === "gap") {
    w = Math.max(w, 280);
    pad = 150;
  }
  const spec = { kind: "ground", w, obs: [] };
  const endPad = Math.round(190 + d * 60);
  if (w > pad + endPad + 40 && g.rng() < 0.55 + d * 0.35) {
    let cursor = pad;
    const limit = w - endPad;
    let guard = 0;
    while (cursor < limit - 30 && guard < 3) {
      guard += 1;
      const o = randomObs(g.rng, d);
      if (cursor + o.w > limit) break;
      spec.obs.push({ ...o, at: Math.round(cursor) });
      cursor += o.w + 170 + Math.floor(g.rng() * 50);
      if (g.rng() > 0.42 + d * 0.2) break;
    }
  }
  if (!spec.obs.length) delete spec.obs;
  if (g.rng() < 0.62) spec.coins = 2 + Math.floor(g.rng() * 3);
  pushSegment(g, spec);
}

export function generate(g) {
  const target = Math.max(g.player.x, 0) + 1700;
  let guard = 0;
  while (g.genX < target && guard < 80) {
    guard += 1;
    if (g.introI < INTRO.length) pushSegment(g, INTRO[g.introI++]);
    else addProcedural(g);
  }
  const keep = Math.min(g.lavaX, g.player.x) - 900;
  while (g.segments.length > 8 && g.segments[0].x + g.segments[0].w < keep) {
    g.segments.shift();
  }
}

export function createGame(seed = 7) {
  const g = {
    seed,
    rng: mulberry32(seed || 1),
    mode: "demo",
    state: "title",
    player: makePlayer(150, GROUND_Y),
    lavaX: 12,
    segments: [],
    genX: 0,
    introI: 0,
    lastPitX: -9999,
    lastKind: "ground",
    particles: [],
    floaters: [],
    toasts: [],
    sfx: [],
    coins: 0,
    style: 0,
    runX: 150,
    meters: 0,
    score: 0,
    best: 0,
    time: 0,
    camX: 0,
    shake: 0,
    meltT: 0,
    meltReason: "",
    line: "",
    deathX: 0,
    checkpoint: { x: 150, y: GROUND_Y },
    wasClose: false,
    spicy: false,
    banner: "",
    bannerT: 0,
    needsReset: false,
    jumps: 0,
    pitVisits: 0,
    pitEscapes: 0,
    heatMax: 42,
    heatMin: 42,
    minLead: Infinity,
    closeCalls: 0,
    deathLog: [],
    hintedHeat: false,
    hintedOut: false,
    hintedPit: false,
    meltBits: [],
  };
  generate(g);
  g.player.y = GROUND_Y;
  return g;
}

export function startRun(best = 0, seed = 1) {
  const g = createGame(seed || 1);
  g.best = best || 0;
  g.mode = "run";
  g.state = "play";
  g.player.mercy = 1.05;
  g.player.heat = 36;
  g.heatMin = 36;
  g.heatMax = 36;
  g.banner = "RUN!";
  g.bannerT = 1.25;
  g.player.pop = 0.02;
  return g;
}

export function segmentAt(g, x) {
  for (const s of g.segments) {
    if (s.x > x) break;
    if (x >= s.x && x <= s.x + s.w) return s;
  }
  return null;
}

export function pitAt(g, x) {
  const s = segmentAt(g, x);
  return s && s.kind === "pit" ? s : null;
}

function nearSegments(g, x) {
  const out = [];
  for (const s of g.segments) {
    if (s.x > x + 70) break;
    if (s.x + s.w >= x - 70) out.push(s);
  }
  return out;
}

function solidWalls(s) {
  if (s.kind !== "ground") return [];
  const rects = [{ x: s.x, y: s.y, w: s.w, h: 640 }];
  for (const o of s.obs) rects.push({ x: o.x, y: s.y - o.h, w: o.w, h: o.h });
  return rects;
}

function floorsOf(s) {
  if (s.kind === "gap") return [];
  if (s.kind === "pit") return [{ x: s.x + 1, w: Math.max(4, s.w - 2), y: s.y + PIT_DEPTH, pit: true }];
  const list = [{ x: s.x, w: s.w, y: s.y, pit: false }];
  for (const o of s.obs) list.push({ x: o.x, w: o.w, y: s.y - o.h, pit: false });
  return list;
}

function feetOverlap(x, f) {
  return x + 5 > f.x && x - 5 < f.x + f.w;
}

function resolveX(g, p) {
  if (p.hopping > 0) return;
  for (let n = 0; n < 2; n++) {
    const left = p.x - PLAYER_W / 2;
    const right = p.x + PLAYER_W / 2;
    const top = p.y - PLAYER_H;
    const bottom = p.y;
    let hit = null;
    for (const s of nearSegments(g, p.x)) {
      for (const r of solidWalls(s)) {
        if (right <= r.x || left >= r.x + r.w) continue;
        if (bottom <= r.y + 5) continue;
        if (top >= r.y + r.h) continue;
        const pushLeft = right - r.x;
        const pushRight = r.x + r.w - left;
        hit = pushLeft < pushRight ? -pushLeft : pushRight;
        break;
      }
      if (hit !== null) break;
    }
    if (hit === null) break;
    p.x += hit;
    p.vx = 0;
    if (Math.abs(hit) > 1.15 && !p.inPit) {
      p.bonk = 0.09;
      p.squash = Math.max(p.squash, 1.14);
      g.sfx.push("bonk");
    }
  }
}

function tryLand(g, p, prevY) {
  if (p.vy < 0) return false;
  let best = null;
  for (const s of nearSegments(g, p.x)) {
    for (const f of floorsOf(s)) {
      if (!feetOverlap(p.x, f)) continue;
      if (prevY <= f.y + 1.4 && p.y >= f.y - 0.2) {
        if (!best || f.y < best.y) best = f;
      }
    }
  }
  if (!best) return false;
  const impact = p.vy;
  p.y = best.y;
  p.vy = 0;
  p.onGround = true;
  p.inPit = !!best.pit;
  p.coyote = 0.12;
  if (best.pit && impact > 40) {
    g.sfx.push("splash");
    burst(g, p.x, p.y - 8, 8, "#d7f6ff", 90);
  } else if (impact > 300) {
    p.squash = 1.3;
    p.stretch = 0.76;
    g.sfx.push("land");
    g.shake = Math.max(g.shake, Math.min(3.5, impact / 340));
    burst(g, p.x, p.y, 5, "#ffffff", 50);
  }
  return true;
}

function burst(g, x, y, n, color, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random() * 0.75);
    g.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - Math.abs(speed) * 0.15,
      life: 0.35 + Math.random() * 0.35,
      max: 0.7,
      color,
      r: 1.2 + Math.random() * 1.8,
      grav: 280,
    });
  }
  if (g.particles.length > 220) g.particles.splice(0, g.particles.length - 220);
}

function toast(g, text, color = "#fff7e8") {
  g.toasts.unshift({ text, color, life: 1.2, max: 1.2 });
  if (g.toasts.length > 3) g.toasts.pop();
}

function isClear(g, x) {
  const s = segmentAt(g, x);
  if (!s || s.kind !== "ground") return false;
  if (x < s.x + 18 || x > s.x + s.w - 42) return false;
  for (const o of s.obs) {
    if (x > o.x - 18 && x < o.x + o.w + 18) return false;
  }
  return true;
}

function kill(g, reason) {
  if (g.player.mercy > 0) return;
  if (g.state !== "play" && g.state !== "title") return;
  const p = g.player;
  g.meltReason = reason;
  g.meltT = 0;
  g.deathX = p.x;
  g.line = LINES[reason][g.deathLog.length % LINES[reason].length];
  g.shake = reason === "lava" ? 7 : 5;
  g.state = "melt";
  g.sfx.push("melt");
  if (g.mode === "run") p.lives = Math.max(0, p.lives - 1);
  g.deathLog.push({ reason, x: p.x, t: g.time, lives: p.lives });
  g.meltBits = [
    { k: "nose", x: p.x + 6, y: p.y - 16, vx: 110, vy: -260, rot: 0 },
    { k: "muff", x: p.x - 14, y: p.y - 22, vx: -90, vy: -200, rot: 0 },
    { k: "muff", x: p.x + 16, y: p.y - 22, vx: 140, vy: -180, rot: 0 },
    { k: "coal", x: p.x - 1, y: p.y - 12, vx: -40, vy: -120, rot: 0 },
    { k: "coal", x: p.x + 2, y: p.y - 8, vx: 70, vy: -80, rot: 0 },
    { k: "coal", x: p.x, y: p.y - 5, vx: 10, vy: -40, rot: 0 },
  ];
  const word = reason === "heat" ? "TOO TOASTY!" : reason === "fall" ? "YIKES!" : "CAUGHT!";
  toast(g, word, reason === "heat" ? "#ffd56a" : "#ffe08a");
}

function respawn(g) {
  const p = g.player;
  const cp = g.checkpoint;
  p.x = cp.x;
  p.y = cp.y;
  p.vx = cruiseOf(difficultyOf(g.runX)) * 0.85;
  p.vy = 0;
  p.onGround = true;
  p.inPit = false;
  p.heat = 22;
  p.mercy = 1.45;
  p.hopping = 0;
  p.jumpBuf = 0;
  p.coyote = 0.12;
  p.pop = 0.02;
  p.squash = 1.35;
  p.stretch = 0.62;
  const pull = p.x - 430;
  if (g.lavaX > pull) g.lavaX = pull;
  g.shake = 3;
  g.sfx.push("respawn");
  toast(g, "BACK IN THE SNOW");
  burst(g, p.x, p.y - 16, 14, "#f4fbff", 120);
}

function advanceMelt(g, dt) {
  g.meltT += dt;
  g.time += dt;
  const ground = GROUND_Y;
  for (const b of g.meltBits) {
    b.vy += 1700 * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.rot += dt * 6;
    if (b.y > ground) {
      b.y = ground;
      b.vy *= -0.38;
      b.vx *= 0.62;
    }
  }
  stepDecor(g, dt);
  if (g.meltT < MELT_TIME) return;
  if (g.mode === "demo") {
    g.needsReset = true;
    return;
  }
  if (g.player.lives <= 0) {
    g.state = "over";
    if (g.score > g.best) g.best = g.score;
    return;
  }
  respawn(g);
  g.state = "play";
}

function stepDecor(g, dt) {
  if (Math.random() < 0.55) {
    g.particles.push({
      x: g.camX - 10 + Math.random() * (VIEW_W + 30),
      y: -6,
      vx: -18 - Math.random() * 16,
      vy: 22 + Math.random() * 18,
      life: 4,
      max: 4,
      color: "#ffffff",
      r: Math.random() < 0.5 ? 1 : 1.6,
      grav: 0,
      snow: true,
    });
  }
  for (let i = g.particles.length - 1; i >= 0; i--) {
    const q = g.particles[i];
    q.life -= dt;
    q.vy += (q.grav || 0) * dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    if (q.life <= 0 || q.y > VIEW_H + 20) g.particles.splice(i, 1);
  }
  if (g.particles.length > 240) g.particles.splice(0, g.particles.length - 240);
  for (let i = g.floaters.length - 1; i >= 0; i--) {
    const f = g.floaters[i];
    f.life -= dt;
    f.y -= 22 * dt;
    if (f.life <= 0) g.floaters.splice(i, 1);
  }
  for (const t of g.toasts) t.life -= dt;
  g.toasts = g.toasts.filter((t) => t.life > 0);
}

function stepPlay(g, dt, input) {
  const p = g.player;
  const wasPit = p.inPit;
  g.time += dt;
  if (g.bannerT > 0) g.bannerT -= dt;

  const d = difficultyOf(g.runX);
  const cruise = cruiseOf(d);

  p.hopping = Math.max(0, p.hopping - dt);
  p.mercy = Math.max(0, p.mercy - dt);
  p.bonk = Math.max(0, p.bonk - dt);
  if (p.blink > 0) p.blink -= dt;
  p.blinkT -= dt;
  if (p.blinkT <= 0) {
    p.blink = 0.1;
    p.blinkT = 1.8 + Math.random() * 2.4;
  }
  if (p.pop < 1) p.pop = Math.min(1, p.pop + dt * 2.6);
  p.squash += (1 - p.squash) * Math.min(1, dt * 12);
  p.stretch += (1 - p.stretch) * Math.min(1, dt * 12);

  if (input.jumpPressed) p.jumpBuf = 0.12;
  else p.jumpBuf = Math.max(0, p.jumpBuf - dt);

  const canJump = p.onGround || p.coyote > 0;
  if (p.jumpBuf > 0 && canJump) {
    if (p.inPit) {
      const pit = pitAt(g, p.x);
      if (pit && pit.fill > 0.42) {
        g.style += 50;
        g.pitEscapes += 1;
        g.sfx.push("clutch");
        toast(g, "JUST IN TIME!");
      } else {
        g.sfx.push("boing");
      }
      p.x += 8;
      p.y -= 8;
      p.vy = PIT_JUMP_V;
      p.vx = Math.max(PIT_JUMP_VX, cruise * 1.2);
      p.hopping = 0.3;
      p.squash = 0.68;
      p.stretch = 1.38;
      burst(g, p.x, p.y, 10, "#e7fbff", 110);
    } else {
      p.vy = JUMP_V;
      p.squash = 0.8;
      p.stretch = 1.24;
      g.sfx.push("jump");
      g.jumps += 1;
      burst(g, p.x, p.y, 4, "#ffffff", 40);
    }
    p.onGround = false;
    p.inPit = false;
    p.coyote = 0;
    p.jumpBuf = 0;
  } else if (!input.jumpHeld && p.vy < -360 && p.hopping <= 0) {
    p.vy = -360;
  }

  const sprinting = !!(input.sprint && !input.brake && !p.inPit);
  let target = cruise;
  if (p.inPit && p.onGround) target = 0;
  else if (sprinting) target = cruise * 1.25;
  else if (input.brake && !p.inPit) target = cruise * 0.64;
  const accel = p.inPit ? 14 : 4.6;
  p.vx += (target - p.vx) * Math.min(1, dt * accel);

  p.x += p.vx * dt;
  resolveX(g, p);

  p.vy = Math.min(MAX_FALL, p.vy + GRAVITY * dt);
  if (input.drop && !p.onGround && p.vy > -20) p.vy = Math.min(MAX_FALL, p.vy + 2500 * dt);

  const prevY = p.y;
  p.y += p.vy * dt;
  const landed = tryLand(g, p, prevY);
  if (!landed) {
    p.onGround = false;
    if (!(p.inPit && p.y < GROUND_Y + PIT_DEPTH - 1)) p.inPit = false;
    if (p.vy >= 0) p.coyote = Math.max(0, p.coyote - dt);
  }

  if (p.onGround && !p.inPit) p.runPhase += dt * (9 + Math.abs(p.vx) * 0.045);
  else p.runPhase += dt * 3;

  let lead = p.x - g.lavaX;
  let rate = 6.4 + d * 5.2;
  if (lead < 190) rate += ((190 - Math.max(0, lead)) / 190) * 16;
  if (sprinting) rate += 2.6;
  if (p.inPit && p.onGround) rate = -48;
  if (p.mercy > 0) rate = Math.min(0, rate);
  p.heat = clamp(p.heat + rate * dt, 0, 100);
  g.heatMax = Math.max(g.heatMax, p.heat);
  g.heatMin = Math.min(g.heatMin, p.heat);

  const desired = 236 - d * 56;
  let lspd = 124 + d * 28;
  if (p.inPit && p.onGround) lspd = 102 + d * 22;
  else if (lead > desired) {
    const extra = Math.min(p.mercy > 0 ? 70 : 150, (lead - desired) * 0.8);
    lspd = Math.max(lspd, p.vx + extra);
  } else if (p.mercy > 0) lspd *= 0.7;
  g.lavaX += lspd * dt;
  lead = p.x - g.lavaX;

  for (const s of g.segments) {
    if (s.kind === "pit") s.fill = clamp((g.lavaX - s.x) / s.w, 0, 1);
  }

  if (p.inPit && !wasPit) {
    g.pitVisits += 1;
    if (g.mode === "run" && !g.hintedOut) {
      g.hintedOut = true;
      toast(g, "NOW JUMP OUT");
    }
  }

  if (p.mercy <= 0 && (g.state === "play" || g.state === "title")) {
    if (p.y > VIEW_H + 36) kill(g, "fall");
    else if (p.x - PLAYER_W * 0.4 < g.lavaX) kill(g, "lava");
    else if (p.heat >= 100) kill(g, "heat");
  }
  if (g.state === "melt") {
    stepDecor(g, dt);
    return;
  }

  if (p.mercy <= 0) g.minLead = Math.min(g.minLead, lead);

  for (const s of nearSegments(g, p.x)) {
    for (const c of s.coins) {
      if (c.got) continue;
      const dx = c.x - p.x;
      const dy = c.y - (p.y - 14);
      if (dx * dx + dy * dy < 24 * 24) {
        c.got = true;
        g.coins += 1;
        g.sfx.push("coin");
        g.floaters.push({ text: "+25", x: c.x, y: c.y, life: 0.7, max: 0.7 });
      }
    }
    if (s.kind === "ground") {
      for (const o of s.obs) {
        if (!o.cleared && p.x > o.x + o.w + 4 && p.y < s.y - 2) {
          o.cleared = true;
          g.style += 5;
        }
      }
    }
  }

  if (p.onGround && !p.inPit && p.mercy < 0.2 && isClear(g, p.x)) {
    g.checkpoint.x = p.x;
    g.checkpoint.y = p.y;
  }

  g.runX = Math.max(g.runX, p.x);
  g.meters = Math.max(0, Math.floor((g.runX - 150) / 8));
  g.score = g.meters + g.coins * 25 + g.style;
  if (g.mode === "run" && g.score > g.best) g.best = g.score;

  const close = lead < 58 && lead > 6 && !p.inPit && p.mercy <= 0;
  if (close && !g.wasClose) {
    g.style += 20;
    g.closeCalls += 1;
    g.sfx.push("close");
    toast(g, "SPICY!");
  }
  g.wasClose = close;
  g.spicy = close;

  if (g.mode === "run" && !g.hintedPit && p.x > 760) {
    g.hintedPit = true;
    toast(g, "DIVE IN TO COOL");
  }
  if (g.mode === "run" && !g.hintedHeat && p.heat > 78) {
    g.hintedHeat = true;
    toast(g, "FIND AN ICE HOLE");
  }

  if (p.heat > 58 && Math.random() < dt * (p.heat - 50) * 0.2) {
    g.particles.push({
      x: p.x + (Math.random() - 0.5) * 8,
      y: p.y - 24,
      vx: (Math.random() - 0.5) * 12,
      vy: -28 - Math.random() * 18,
      life: 0.55,
      max: 0.55,
      color: "rgba(255,255,255,0.85)",
      r: 1.5 + Math.random(),
      grav: -20,
    });
  }
  if (p.inPit && Math.random() < dt * 10) {
    g.particles.push({
      x: p.x + (Math.random() - 0.5) * 10,
      y: p.y - 4,
      vx: (Math.random() - 0.5) * 8,
      vy: -16 - Math.random() * 10,
      life: 0.45,
      max: 0.45,
      color: "#f4fbff",
      r: 1.2,
      grav: -30,
    });
  }

  let cam = p.x - 206;
  if (lead < 340) cam = Math.min(cam, g.lavaX - 8);
  if (cam < 0) cam = 0;
  g.camX += (cam - g.camX) * Math.min(1, dt * 5.5);
  g.shake = Math.max(0, g.shake - dt * 10);
  if (lead < 78 && lead > 0 && p.mercy <= 0) g.shake = Math.max(g.shake, ((78 - lead) / 78) * 1.6);

  generate(g);
  stepDecor(g, dt);
  if (g.sfx.length > 10) g.sfx.splice(0, g.sfx.length - 10);
}

export function update(g, dt, input) {
  const none = input || {
    jumpHeld: false,
    jumpPressed: false,
    sprint: false,
    brake: false,
    drop: false,
  };
  if (g.state === "pause" || g.state === "over") return;
  if (g.state === "melt") {
    advanceMelt(g, dt);
    return;
  }
  if (g.state === "title" || g.state === "play") stepPlay(g, dt, none);
}

export function expression(g) {
  const p = g.player;
  if (g.state === "melt") return "melt";
  if (p.inPit) return "chill";
  const lead = p.x - g.lavaX;
  if (p.heat > 86 || (lead < 64 && p.mercy <= 0)) return "panic";
  if (p.heat > 64) return "warm";
  if (!p.onGround) return "jump";
  if (p.vx > cruiseOf(difficultyOf(g.runX)) + 36) return "zoom";
  return "happy";
}

export function lookAhead(g) {
  const p = g.player;
  const d = difficultyOf(g.runX);
  const cruise = cruiseOf(d);
  const reach = jumpReach(Math.max(cruise, 1));
  let gap = null;
  let pit = null;
  let obs = null;
  for (const s of g.segments) {
    if (s.x + s.w < p.x - 30) continue;
    if (s.x > p.x + 260) break;
    if (s.kind === "gap" && !gap) {
      const dist = s.x - (p.x + PLAYER_W * 0.5);
      if (dist > -20) gap = { dist, w: s.w, x: s.x };
    } else if (s.kind === "pit" && !pit) {
      const dist = s.x - (p.x + PLAYER_W * 0.5);
      if (dist > -s.w) {
        pit = {
          dist,
          w: s.w,
          x: s.x,
          fill: s.fill,
          skippable: s.w < reach - 8,
        };
      }
    }
    if (s.kind === "ground") {
      for (const o of s.obs) {
        const dist = o.x - (p.x + PLAYER_W * 0.5);
        if (!obs && dist > -o.w && dist < 160) {
          obs = { dist, w: o.w, h: o.h, x: o.x, top: s.y - o.h };
        }
      }
    }
  }
  const here = pitAt(g, p.x);
  const pitHere = p.inPit ? here : null;
  return {
    gap,
    pit,
    obs,
    pitHere,
    lead: p.x - g.lavaX,
    cruise,
    reach,
  };
}

export function pullSfx(g) {
  if (!g.sfx.length) return [];
  const out = g.sfx.slice();
  g.sfx.length = 0;
  return out;
}
