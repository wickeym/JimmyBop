import {
  GROUND_Y,
  LEVEL_METERS,
  PIT_DEPTH,
  VIEW_H,
  VIEW_W,
  expression,
} from "./game.js?v=walk";

const SCENES = [
  { sky: ["#241848", "#6d7ec4", "#f08a62", "#ffd0a0"], mountain: ["#9b8cbe", "#64548a", "#3c3158"], snow: "#f7fbff", crust: "#d7e6f4", dirt: "#3a2d4a", brick: "#2a2138", volcano: "#2c2344", trees: "pine", bits: "stars", light: "moon", snowCaps: true, relief: 1 },
  { sky: ["#4a1840", "#d06050", "#ff8a3c", "#ffd27a"], mountain: ["#a06058", "#6a3834", "#3a201c"], snow: "#f0d2c4", crust: "#e7b8a4", dirt: "#4a241c", brick: "#321810", volcano: "#4a2018", trees: "pine", bits: "stars", light: "sun", snowCaps: true, relief: 1.05 },
  { sky: ["#3a342c", "#8a7464", "#c8aa90", "#ead6c4"], mountain: ["#7a7068", "#524c46", "#2e2a26"], snow: "#c8beb4", crust: "#b0a498", dirt: "#3a342e", brick: "#2a2622", volcano: "#3a3028", trees: "dead", bits: "dust", light: "sun", snowCaps: false, relief: 0.62 },
  { sky: ["#2a0814", "#9a2018", "#ff4a1c", "#ffb050"], mountain: ["#6a2430", "#3a1218", "#1c0a10"], snow: "#c47a62", crust: "#a45a48", dirt: "#3a1410", brick: "#240c0a", volcano: "#4a140c", trees: "none", bits: "embers", light: "none", snowCaps: false, relief: 1.2 },
  { sky: ["#140810", "#6a1428", "#e02810", "#ff7a30"], mountain: ["#4a1824", "#2a0e16", "#14080c"], snow: "#8a4030", crust: "#6a2818", dirt: "#2a100c", brick: "#1a0a08", volcano: "#5a180c", trees: "none", bits: "embers", light: "sun", snowCaps: false, relief: 0.78 },
  { sky: ["#0c0608", "#3a1014", "#c03810", "#ffc060"], mountain: ["#2a1214", "#1a0c0e", "#0c0608"], snow: "#5a3028", crust: "#3a1c16", dirt: "#1c0c0a", brick: "#100806", volcano: "#6a1c08", trees: "none", bits: "embers", light: "none", snowCaps: false, relief: 0.9 },
  { sky: ["#3a0c08", "#ff3a10", "#ff9a30", "#ffe090"], mountain: ["#5a1c14", "#2a0c0a", "#140604"], snow: "#e07040", crust: "#c04820", dirt: "#4a140c", brick: "#2a0c08", volcano: "#ff5a1f", trees: "none", bits: "embers", light: "sun", snowCaps: false, relief: 1.35 },
  { sky: ["#070814", "#16182e", "#4a2858", "#d06048"], mountain: ["#2a2c44", "#141624", "#0a0c14"], snow: "#3a3c55", crust: "#2a2c40", dirt: "#12121c", brick: "#0c0c14", volcano: "#1a1028", trees: "none", bits: "stars", light: "moon", snowCaps: false, relief: 1.15 },
];

function sceneAt(index) {
  if (index < SCENES.length) return SCENES[index];
  return SCENES[4 + ((index - 4) % 4)];
}

function worldLook(g) {
  const index = Math.max(0, (g.levelNumber || 1) - 1);
  const frac = ((g.meters || 0) % LEVEL_METERS) / LEVEL_METERS;
  const next = sceneAt(index);
  if (index === 0) return { ...next, index };
  const prev = sceneAt(index - 1);
  const t = Math.min(1, 0.62 + frac / 0.08);
  const pick = (key) => (t > 0.5 ? next[key] : prev[key]);
  return {
    index,
    sky: next.sky.map((c, i) => mix(prev.sky[i], c, t)),
    mountain: next.mountain.map((c, i) => mix(prev.mountain[i], c, t)),
    snow: mix(prev.snow, next.snow, t),
    crust: mix(prev.crust, next.crust, t),
    dirt: mix(prev.dirt, next.dirt, t),
    brick: mix(prev.brick, next.brick, t),
    volcano: mix(prev.volcano, next.volcano, t),
    relief: prev.relief + (next.relief - prev.relief) * t,
    trees: pick("trees"),
    bits: pick("bits"),
    light: pick("light"),
    snowCaps: pick("snowCaps"),
  };
}

function parseColor(c) {
  if (c[0] === "#") {
    const hex = c.length === 4 ? c.slice(1).replace(/./g, (ch) => ch + ch) : c.slice(1);
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/\d+/g);
  return [+m[0], +m[1], +m[2]];
}

function mix(a, b, t) {
  t = Math.max(0, Math.min(1, t));
  const [ar, ag, ab] = parseColor(a);
  const [br, bg, bb] = parseColor(b);
  return `rgb(${(ar + (br - ar) * t) | 0},${(ag + (bg - ag) * t) | 0},${(ab + (bb - ab) * t) | 0})`;
}

function hash(n) {
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.4, rx), Math.max(0.4, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawSky(ctx, g) {
  const look = worldLook(g);
  const grd = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grd.addColorStop(0, look.sky[0]);
  grd.addColorStop(0.32, look.sky[1]);
  grd.addColorStop(0.58, look.sky[2]);
  grd.addColorStop(0.82, look.sky[3]);
  grd.addColorStop(1, mix(look.sky[3], "#fff1d4", look.bits === "embers" ? 0.08 : 0.28));
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const cam = g.camX;
  if (look.bits === "stars") {
    for (let i = 0; i < 32; i++) {
      const span = VIEW_W + 40;
      const x = ((hash(i * 19) * span - cam * 0.015) % span + span) % span - 16;
      const y = 6 + hash(i * 7) * 78;
      const tw = 0.25 + Math.abs(Math.sin(g.time * 1.4 + i * 1.7)) * 0.75;
      ctx.globalAlpha = tw * 0.85;
      ctx.fillStyle = hash(i * 3) > 0.82 ? "#fff4c8" : "#ffffff";
      const s = hash(i * 11) > 0.8 ? 2 : 1;
      ctx.fillRect(x, y, s, s);
    }
  } else if (look.bits === "embers") {
    for (let i = 0; i < 18; i++) {
      const span = VIEW_W + 30;
      const rise = (g.time * (18 + (i % 5) * 8) + hash(i) * span) % (VIEW_H * 0.7);
      const x = ((hash(i * 13) * span - cam * 0.04) % span + span) % span;
      ctx.globalAlpha = 0.35 + (i % 3) * 0.2;
      ctx.fillStyle = i % 2 ? "#ffb15a" : "#ff5a1f";
      ctx.fillRect(x, VIEW_H * 0.62 - rise, 2, 2);
    }
  } else {
    for (let i = 0; i < 16; i++) {
      const span = VIEW_W + 40;
      const x = ((i * 40 - cam * 0.05 + g.time * 8) % span + span) % span - 10;
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "#d9d0c6";
      ellipse(ctx, x, 30 + (i % 5) * 14, 1.4, 1.4);
    }
  }
  ctx.globalAlpha = 1;

  if (look.light !== "none") {
    const mx = VIEW_W - 132;
    const my = 48;
    ctx.fillStyle = look.light === "sun" ? "#ffd27a" : "#fff6e4";
    ctx.globalAlpha = 0.28;
    ellipse(ctx, mx, my, 22, 22);
    ctx.globalAlpha = 1;
    ellipse(ctx, mx, my, 11, 11);
    if (look.light === "moon") {
      ctx.fillStyle = look.sky[0];
      ellipse(ctx, mx - 4, my - 2, 9, 9);
    }
  }

  const cloud = look.bits === "embers" ? "rgba(80, 30, 24, 0.35)" : "rgba(255, 236, 220, 0.4)";
  const bands = [
    { parallax: 0.05, y: 46, scale: 1.15 },
    { parallax: 0.14, y: 62, scale: 1 },
  ];
  ctx.fillStyle = cloud;
  for (const band of bands) {
    for (let i = 0; i < 5; i++) {
      const span = VIEW_W + 180;
      const x = ((i * 150 - cam * band.parallax) % span + span) % span - 50;
      const y = band.y + (i % 3) * 12;
      const w = 26 * band.scale;
      ellipse(ctx, x, y, w, 8 * band.scale);
      ellipse(ctx, x + 16 * band.scale, y + 2, w * 0.7, 6 * band.scale);
    }
  }
}

function drawMountains(ctx, g) {
  const look = worldLook(g);
  const relief = look.relief || 1;
  const ranges = [
    { y: 104, color: look.mountain[0], parallax: 0.08, h: 28 * relief, step: 58 / relief, snow: 0.35 },
    { y: 122, color: look.mountain[1], parallax: 0.16, h: 42 * relief, step: 46 / relief, snow: 0.7 },
    { y: 146, color: look.mountain[2], parallax: 0.3, h: 34 * relief, step: 34 / relief, snow: 1 },
  ];
  for (const range of ranges) {
    const off = (g.camX * range.parallax) % range.step;
    const peaks = [];
    ctx.fillStyle = range.color;
    ctx.beginPath();
    ctx.moveTo(-20, VIEW_H);
    for (let x = -off - range.step; x <= VIEW_W + range.step; x += range.step) {
      const peak = range.y - hash(Math.floor((x + g.camX * range.parallax) / range.step) + range.step) * range.h;
      const px = x + range.step * 0.5;
      peaks.push({ x: px, y: peak });
      ctx.lineTo(x, range.y);
      ctx.lineTo(px, peak);
    }
    ctx.lineTo(VIEW_W + 20, VIEW_H);
    ctx.fill();
    if (look.snowCaps) {
      ctx.fillStyle = look.snow;
      ctx.globalAlpha = range.snow;
      for (const peak of peaks) {
        ctx.beginPath();
        ctx.moveTo(peak.x - 7, peak.y + 8);
        ctx.lineTo(peak.x, peak.y);
        ctx.lineTo(peak.x + 7, peak.y + 8);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  if (look.trees !== "none") {
    const treeOff = (g.camX * 0.38) % 28;
    ctx.fillStyle = look.trees === "dead" ? look.mountain[2] : mix("#243044", look.mountain[2], 0.35);
    for (let x = -treeOff; x < VIEW_W + 28; x += 28) {
      const h = 10 + hash(Math.floor((x + g.camX * 0.38) / 28)) * 12;
      const y = 168;
      ctx.beginPath();
      if (look.trees === "dead") {
        ctx.moveTo(x + 4, y);
        ctx.lineTo(x + 5, y - h);
        ctx.lineTo(x + 6, y);
      } else {
        ctx.moveTo(x, y);
        ctx.lineTo(x + 5, y - h);
        ctx.lineTo(x + 10, y);
      }
      ctx.fill();
    }
  }

  const spread = 70 + Math.min(look.index, 6) * 8;
  const vx = VIEW_W * 0.72 - (g.camX * 0.08) % (VIEW_W + 200);
  ctx.fillStyle = look.volcano;
  ctx.beginPath();
  ctx.moveTo(vx - spread, 168);
  ctx.lineTo(vx, 58 - Math.min(look.index, 5) * 3);
  ctx.lineTo(vx + spread + 8, 168);
  ctx.fill();
  const peakY = 58 - Math.min(look.index, 5) * 3;
  ctx.fillStyle = "#ff5a1f";
  ctx.beginPath();
  ctx.moveTo(vx - 10, peakY + 20);
  ctx.lineTo(vx, peakY);
  ctx.lineTo(vx + 12, peakY + 22);
  ctx.fill();
  if (look.index < 3) {
    ctx.strokeStyle = look.mountain[2];
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      const span = VIEW_W + 60;
      const bx = ((i * 190 + g.time * 16 - g.camX * 0.22) % span + span) % span - 20;
      const by = 88 + i * 16 + Math.sin(g.time * 1.6 + i) * 4;
      const flap = Math.sin(g.time * 9 + i * 2) * 3;
      ctx.beginPath();
      ctx.moveTo(bx - 5, by + flap);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + 5, by + flap);
      ctx.stroke();
    }
  }

  ctx.fillStyle = "#ffd56a";
  const pulse = 6 + Math.min(look.index, 6) * 2 + Math.sin(g.time * 5) * 3;
  ctx.beginPath();
  ctx.moveTo(vx - 4, peakY + 16);
  ctx.lineTo(vx, peakY + 4);
  ctx.lineTo(vx + 5, peakY + 16 + pulse * 0.2);
  ctx.fill();
}

function drawGround(ctx, seg, g) {
  const y = seg.y;
  const look = g ? worldLook(g) : null;
  ctx.fillStyle = look ? look.dirt : "#3a2d4a";
  ctx.fillRect(seg.x, y + 8, seg.w, VIEW_H - y);
  ctx.fillStyle = look ? look.brick : "#2a2138";
  for (let x = seg.x; x < seg.x + seg.w; x += 16) {
    ctx.fillRect(x, y + 18, 14, 5);
    ctx.fillRect(x + 8, y + 28, 14, 5);
  }
  ctx.fillStyle = look ? look.crust : "#d7e6f4";
  ctx.fillRect(seg.x, y + 4, seg.w, 8);
  ctx.fillStyle = look ? look.snow : "#f7fbff";
  ctx.beginPath();
  ctx.moveTo(seg.x, y + 6);
  for (let x = seg.x; x <= seg.x + seg.w; x += 8) {
    ctx.lineTo(x, y + 2 + Math.sin(x * 0.35) * 1.4);
  }
  ctx.lineTo(seg.x + seg.w, y + 10);
  ctx.lineTo(seg.x, y + 10);
  ctx.fill();
  if (!look || look.snowCaps) {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    for (let x = seg.x + 6; x < seg.x + seg.w; x += 22) {
      if (hash(x) > 0.55) ellipse(ctx, x, y + 1, 4 + hash(x + 3) * 4, 2.2);
    }
  }
}

function drawPit(ctx, seg, time) {
  const y = seg.y;
  const floor = y + PIT_DEPTH;
  ctx.fillStyle = "#3a2d4a";
  ctx.fillRect(seg.x, floor, seg.w, VIEW_H - floor);
  const water = ctx.createLinearGradient(seg.x, y, seg.x + seg.w, y);
  const fill = seg.fill;
  water.addColorStop(0, mix("#7fe0ff", "#ff6a1a", Math.min(1, fill * 1.3)));
  water.addColorStop(Math.max(0.02, Math.min(0.98, fill)), mix("#d8f7ff", "#ffb703", fill));
  water.addColorStop(1, "#e9fbff");
  ctx.fillStyle = water;
  ctx.fillRect(seg.x + 1, y + 3, seg.w - 2, PIT_DEPTH - 1);
  ctx.fillStyle = mix("#f7fbff", "#ffe7a8", Math.min(1, fill));
  ctx.fillRect(seg.x, y + 1, seg.w, 3);
  const bergs = seg.w > 150 ? 3 : 2;
  const heat = Math.min(1, fill * 1.15);
  for (let i = 0; i < bergs; i++) {
    const span = Math.max(16, seg.w - 24);
    const bx = seg.x + 10 + ((i * 42 + time * 12) % span);
    const by = y + 8 + Math.sin(time * 2.1 + i * 1.4) * 1.3;
    const s = 10 + (i % 2) * 4;
    ctx.fillStyle = mix("#f4fbff", "#ffd0a0", heat * 0.4);
    ctx.beginPath();
    ctx.moveTo(bx, y + 7);
    ctx.lineTo(bx + s * 0.45, y - 7);
    ctx.lineTo(bx + s, y + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = mix("#d7f3ff", "#7ec8ea", heat * 0.3);
    ctx.beginPath();
    ctx.moveTo(bx + 2, y + 7);
    ctx.lineTo(bx + s * 0.45, y + 2);
    ctx.lineTo(bx + s - 2, y + 6);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 1;
  const shimmer = (time * 30) % seg.w;
  ctx.beginPath();
  ctx.moveTo(seg.x + 4, y + 9);
  ctx.quadraticCurveTo(seg.x + shimmer, y + 6, seg.x + seg.w - 4, y + 9);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    const bx = seg.x + 12 + ((i * 37 + time * 18) % (seg.w - 16));
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ellipse(ctx, bx, y + 8 + Math.sin(time * 4 + i) * 2, 1.4, 1.4);
  }
}

function drawObstacle(ctx, o, groundY) {
  const melt = o.melt || 0;
  ctx.save();
  ctx.translate(o.x + o.w * 0.3, groundY);
  ctx.rotate((o.tip || 0) * 0.8);
  ctx.translate(-(o.x + o.w * 0.3), -groundY);
  const x = o.x;
  const y = groundY - o.h;
  ctx.save();
  if (melt > 0.02) {
    const keep = Math.max(2, o.h * (1 - melt * 0.94));
    ctx.beginPath();
    ctx.rect(x - 16, y - 18, o.w + 36, keep + 18);
    ctx.clip();
  }
  if (o.k === "crate") {
    ctx.fillStyle = "#6b3d22";
    ctx.fillRect(x, y, o.w, o.h);
    ctx.fillStyle = "#8a532c";
    ctx.fillRect(x + 2, y + 2, o.w - 4, o.h - 4);
    ctx.strokeStyle = "#3d2416";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 3);
    ctx.lineTo(x + o.w - 3, y + o.h - 3);
    ctx.moveTo(x + o.w - 3, y + 3);
    ctx.lineTo(x + 3, y + o.h - 3);
    ctx.stroke();
    ctx.fillStyle = "#f7fbff";
    ctx.fillRect(x - 1, y - 3, o.w + 2, 5);
  } else if (o.k === "pillar") {
    ctx.fillStyle = "#2e263c";
    ctx.fillRect(x, y, o.w, o.h);
    ctx.fillStyle = "#4a3d5c";
    for (let i = 4; i < o.h; i += 8) ctx.fillRect(x + 2, y + i, o.w - 4, 3);
    ctx.fillStyle = "#f7fbff";
    ctx.beginPath();
    ctx.moveTo(x - 2, y + 4);
    ctx.lineTo(x + o.w / 2, y - 6);
    ctx.lineTo(x + o.w + 2, y + 4);
    ctx.fill();
  } else if (o.k === "lamp") {
    ctx.fillStyle = "#4a3424";
    ctx.fillRect(x + o.w / 2 - 2, y + 8, 4, o.h - 8);
    ctx.fillStyle = "#ffb703";
    ellipse(ctx, x + o.w / 2, y + 6, 6, 6);
    ctx.fillStyle = "#fff4c4";
    ellipse(ctx, x + o.w / 2, y + 5, 3, 3);
    ctx.fillStyle = "rgba(255, 190, 80, 0.35)";
    ellipse(ctx, x + o.w / 2, y + 6, 11, 10);
    ctx.fillStyle = "#f7fbff";
    ctx.fillRect(x + 1, y + o.h - 4, o.w - 2, 4);
  } else if (o.k === "fence") {
    ctx.fillStyle = "#f4fbff";
    ctx.fillRect(x, y + o.h - 4, o.w, 4);
    ctx.fillStyle = "#8d6a43";
    ctx.fillRect(x + 2, y, 3, o.h);
    ctx.fillRect(x + o.w - 5, y, 3, o.h);
    ctx.fillRect(x, y + 4, o.w, 3);
    ctx.fillRect(x, y + 10, o.w, 3);
  } else if (o.k === "mailbox") {
    ctx.fillStyle = "#6b3d22";
    ctx.fillRect(x + o.w / 2 - 2, y + 10, 4, o.h - 10);
    ctx.fillStyle = "#3d7dff";
    ctx.fillRect(x, y, o.w, 12);
    ctx.fillStyle = "#ff5a1f";
    ctx.beginPath();
    ctx.moveTo(x + o.w, y + 4);
    ctx.lineTo(x + o.w + 6, y + 6);
    ctx.lineTo(x + o.w, y + 8);
    ctx.fill();
  } else if (o.k === "car") {
    ctx.fillStyle = "#e23b2f";
    ctx.fillRect(x, y + 6, o.w, o.h - 8);
    ctx.fillStyle = "#c4322a";
    ctx.fillRect(x + 6, y, o.w - 14, 8);
    ctx.fillStyle = "#8fd4ff";
    ctx.fillRect(x + 8, y + 2, 6, 4);
    ctx.fillRect(x + o.w - 16, y + 2, 6, 4);
    ctx.fillStyle = "#172033";
    ellipse(ctx, x + 8, y + o.h - 3, 4, 4);
    ellipse(ctx, x + o.w - 8, y + o.h - 3, 4, 4);
  } else {
    ctx.fillStyle = "#3a3148";
    ellipse(ctx, x + o.w / 2, y + o.h * 0.65, o.w / 2, o.h * 0.55);
    ctx.fillStyle = "#f7fbff";
    ellipse(ctx, x + o.w / 2, y + 4, o.w / 2.2, 4);
  }
  ctx.restore();
  if (melt > 0.02) {
    const cut = y + o.h * melt * 0.94;
    ctx.fillStyle = "#1a0a08";
    ctx.fillRect(x - 1, cut - 3, o.w + 2, 4);
    ctx.fillStyle = "#ffb15a";
    ctx.fillRect(x, cut - 1, o.w, 2);
    ctx.fillStyle = "rgba(255, 70, 16, 0.9)";
    ctx.beginPath();
    ctx.moveTo(x - 2, groundY);
    ctx.quadraticCurveTo(x + o.w * 0.5, cut - 6, x + o.w + 8, groundY);
    ctx.lineTo(x + o.w, groundY);
    ctx.fill();
    ctx.fillStyle = "#fff1c4";
    ellipse(ctx, x + o.w * 0.45, cut, 2.2, 1.4);
  }
  ctx.restore();
}

function drawSign(ctx, seg) {
  const x = seg.x + 8;
  const y = seg.y;
  ctx.fillStyle = "#6b3d22";
  ctx.fillRect(x + 10, y - 22, 4, 22);
  ctx.fillStyle = "#f4d7a2";
  ctx.fillRect(x, y - 36, 28, 16);
  ctx.strokeStyle = "#172033";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y - 36, 28, 16);
  ctx.fillStyle = "#172033";
  ctx.font = "700 7px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ICE", x + 14, y - 25);
}

function drawSlug(ctx, slug) {
  const y = GROUND_Y;
  const flat = slug.alive ? 1 : Math.max(0.2, 1 - slug.gone * 3);
  ctx.save();
  ctx.translate(slug.x + slug.w / 2, y);
  ctx.globalAlpha = slug.alive ? 1 : Math.max(0, 1 - slug.gone * 2);
  ctx.fillStyle = "rgba(170, 210, 90, 0.55)";
  ellipse(ctx, -10 * Math.sign(slug.vx || 1), -1, 7, 2);
  ctx.fillStyle = "#5d7a28";
  ellipse(ctx, 0, -4 * flat, slug.w / 2, 5.2 * flat);
  ctx.fillStyle = "#8fbf45";
  ellipse(ctx, -1, -6 * flat, 7, 3.2 * flat);
  if (slug.alive) {
    const bob = Math.sin(slug.t * 7) * 1.6;
    ctx.strokeStyle = "#3d5a18";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -7);
    ctx.lineTo(-6, -13 - bob);
    ctx.moveTo(4, -7);
    ctx.lineTo(6, -13 + bob);
    ctx.stroke();
    ctx.fillStyle = "#172033";
    ellipse(ctx, -6, -13 - bob, 1.4, 1.4);
    ellipse(ctx, 6, -13 + bob, 1.4, 1.4);
  }
  ctx.restore();
}

function drawCoin(ctx, c, time) {
  const spin = 0.35 + Math.abs(Math.sin(time * 5 + c.x)) * 0.65;
  ctx.save();
  ctx.translate(c.x, c.y + Math.sin(time * 3 + c.x) * 2);
  ctx.scale(spin, 1);
  ctx.fillStyle = "#8a5a12";
  ellipse(ctx, 0, 0, 6, 6);
  ctx.fillStyle = "#ffd56a";
  ellipse(ctx, 0, 0, 4.5, 4.5);
  ctx.fillStyle = "#fff4c4";
  ellipse(ctx, -1.2, -1.2, 1.6, 1.6);
  ctx.restore();
}

function drawJimmy(ctx, x, y, o) {
  const k = o.melt || 0;
  const bob = o.bob || 0;
  const pop = o.pop == null ? 1 : 0.4 + 0.6 * o.pop;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(o.tilt || 0);
  if (k > 0) ctx.translate(Math.sin(k * 50) * 1.4 * (1 - k), k * 4);
  ctx.scale((o.squash || 1) * (1 + k * 0.35) * pop, (o.stretch || 1) * (1 - bob) * (1 - k * 0.72) * pop);

  ctx.fillStyle = "rgba(20,12,28,0.28)";
  ellipse(ctx, 0, -1, 11, 3);

  const hot = Math.max(k, Math.max(0, (o.heat || 0) - 40) / 70);
  const body = mix("#f7fbff", "#ffb08a", hot);
  const shade = mix("#c5dff6", "#e86a3a", hot * 0.85);

  ctx.fillStyle = "#8d1d16";
  ellipse(ctx, -15, -21, 7.4, 7.4);
  ellipse(ctx, 15, -21, 7.4, 7.4);
  ctx.fillStyle = "#e23b2f";
  ellipse(ctx, -15, -21.5, 6.1, 6.1);
  ellipse(ctx, 15, -21.5, 6.1, 6.1);
  ctx.fillStyle = "#ffb1a8";
  ellipse(ctx, -16.4, -23, 2, 1.6);
  ellipse(ctx, 13.6, -23, 2, 1.6);

  ctx.fillStyle = "#1c2438";
  ellipse(ctx, 0, -16, 14.6, 13.6);
  ctx.fillStyle = shade;
  ellipse(ctx, 1.5, -14.5, 12.2, 11.4);
  ctx.fillStyle = body;
  ellipse(ctx, -1.2, -17.2, 10.4, 9.6);

  ctx.fillStyle = "#3a2418";
  ctx.fillRect(-11, -26, 22, 5);
  ctx.fillStyle = "#2a1a12";
  ctx.fillRect(-11, -24.5, 22, 1.4);

  if (o.alpha != null) ctx.globalAlpha = o.alpha;

  const blink = o.blink || o.expr === "chill";
  const eyeY = -19;
  if (blink) {
    ctx.strokeStyle = "#1c2438";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(-5, eyeY, 2.4, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(5, eyeY, 2.4, 0.15, Math.PI - 0.15);
    ctx.stroke();
  } else if (o.expr === "panic" || k > 0.15) {
    ctx.fillStyle = "#fff";
    ellipse(ctx, -5, eyeY, 3.3, 3.6);
    ellipse(ctx, 5, eyeY, 3.3, 3.6);
    ctx.fillStyle = "#1c2438";
    ellipse(ctx, -4.6, eyeY + 0.4, 1.5, 1.8);
    ellipse(ctx, 5.4, eyeY + 0.4, 1.5, 1.8);
  } else {
    ctx.fillStyle = "#1c2438";
    ellipse(ctx, -5, eyeY, 2.5, 3);
    ellipse(ctx, 5, eyeY, 2.5, 3);
    ctx.fillStyle = "#fff";
    ellipse(ctx, -5.8, eyeY - 0.8, 0.9, 0.9);
    ellipse(ctx, 4.2, eyeY - 0.8, 0.9, 0.9);
  }

  if (k < 0.55) {
    ctx.fillStyle = "#f29a3a";
    ctx.beginPath();
    ctx.moveTo(1, -16.5);
    ctx.lineTo(9, -15.2);
    ctx.lineTo(2.2, -13.4);
    ctx.fill();
  }

  ctx.fillStyle = o.expr === "panic" || k > 0.2 ? "#ff8d9a" : "#ffb3c0";
  ellipse(ctx, -8.5, -15, 2.3, 1.4);
  ellipse(ctx, 7.2, -15, 2.3, 1.4);

  ctx.fillStyle = "#1c2438";
  if (o.expr === "panic" || (k > 0.05 && k < 0.45)) {
    ellipse(ctx, 0, -12.2, 2.3, 2.6);
  } else if (o.expr === "warm") {
    ctx.beginPath();
    ctx.arc(0, -13.2, 2.6, 0.2, Math.PI - 0.2);
    ctx.strokeStyle = "#c4322a";
    ctx.lineWidth = 1.3;
    ctx.stroke();
  } else {
    ctx.fillStyle = "#e23b2f";
    ctx.beginPath();
    ctx.ellipse(0, -12.2, 3.4, 2.6, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = "#ff8f7a";
    ellipse(ctx, 0.6, -11.2, 1.5, 1);
  }

  if (k < 0.6) {
    ctx.fillStyle = "#241c28";
    ellipse(ctx, 0, -9.2, 1.7, 1.5);
    ellipse(ctx, 0, -6.2, 1.8, 1.55);
    ellipse(ctx, 0, -3.4, 1.6, 1.4);
  }

  if (o.expr === "warm" || o.expr === "panic" || hot > 0.4) {
    ctx.fillStyle = "#8fd4ff";
    ctx.beginPath();
    ctx.ellipse(8, -24, 1.3, 2, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  if ((o.heat || 0) > 40 && k < 0.3) {
    const drip = Math.min(1, ((o.heat || 0) - 40) / 45);
    ctx.fillStyle = "rgba(186,226,255,0.95)";
    ellipse(ctx, 3, -4, 1.15, 2.2 + drip * 2.4);
    ellipse(ctx, -5, -3.2, 0.9, 1.6 + drip * 1.4);
    if (drip > 0.45) ellipse(ctx, 0.5, -1.2, 1.3, 2.6);
  }

  ctx.restore();

  if (k > 0.35) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = mix("#ffd0b0", "#ff5a1f", k);
    ctx.globalAlpha = Math.min(1, (k - 0.35) * 1.5);
    ellipse(ctx, 0, -2, 12 + k * 10, 3.2 + k * 2);
    ctx.restore();
  }
}

function drawBits(ctx, g) {
  for (const b of g.meltBits) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    if (b.k === "nose") {
      ctx.fillStyle = "#f29a3a";
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.lineTo(8, 2);
      ctx.lineTo(-1, 5);
      ctx.fill();
    } else if (b.k === "muff") {
      ctx.fillStyle = "#e23b2f";
      ellipse(ctx, 0, 0, 5, 5);
    } else {
      ctx.fillStyle = "#241c28";
      ellipse(ctx, 0, 0, 2, 2);
    }
    ctx.restore();
  }
}

function lavaSurface(x, px, t) {
  const dist = Math.max(0, x - px);
  const crest = Math.exp(-(dist * dist) / 2200);
  const roll = Math.sin(t * 2.2 + px * 0.045) * 3.2 + Math.sin(t * 4.1 + px * 0.09) * 1.6;
  return GROUND_Y - 30 - crest * 34 + roll;
}

function drawLava(ctx, g) {
  const x = g.lavaX;
  const t = g.time;
  const left = Math.min(g.camX - 30, x - 30);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(left, VIEW_H + 10);
  ctx.lineTo(left, lavaSurface(x, left, t));
  const steps = Math.max(8, Math.ceil((x - left) / 18));
  for (let i = 1; i <= steps; i++) {
    const px = left + ((x - left) * i) / steps;
    ctx.lineTo(px, lavaSurface(x, px, t));
  }
  const nose = lavaSurface(x, x, t);
  ctx.quadraticCurveTo(x + 16, nose - 6, x + 26, GROUND_Y - 18);
  ctx.quadraticCurveTo(x + 34, GROUND_Y + 6, x + 8, GROUND_Y + 14);
  ctx.lineTo(x - 8, VIEW_H + 10);
  ctx.closePath();

  const body = ctx.createLinearGradient(0, GROUND_Y - 70, 0, VIEW_H);
  body.addColorStop(0, "#ffe7a8");
  body.addColorStop(0.08, "#ff7a22");
  body.addColorStop(0.28, "#e02810");
  body.addColorStop(0.7, "#8a140c");
  body.addColorStop(1, "#3a0806");
  ctx.fillStyle = body;
  ctx.fill();
  ctx.clip();

  ctx.strokeStyle = "rgba(255, 236, 170, 0.9)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(left, lavaSurface(x, left, t));
  for (let i = 1; i <= steps; i++) {
    const px = left + ((x - left) * i) / steps;
    ctx.lineTo(px, lavaSurface(x, px, t) + 2);
  }
  ctx.stroke();

  for (let i = 0; i < 8; i++) {
    const cycle = 160 + hash(i * 3) * 80;
    const px = x - 20 - ((t * (22 + hash(i) * 18) + hash(i * 5) * cycle) % cycle);
    if (px < g.camX - 20) continue;
    const py = lavaSurface(x, px, t) + 10 + (i % 3) * 8;
    ctx.fillStyle = i % 2 ? "rgba(255, 210, 90, 0.75)" : "rgba(120, 24, 12, 0.45)";
    ellipse(ctx, px, py, 12, 2.4);
  }
  ctx.restore();

  ctx.fillStyle = "#fff6d2";
  ctx.beginPath();
  ctx.moveTo(x + 4, nose + 4);
  ctx.quadraticCurveTo(x + 20, GROUND_Y - 28, x + 30, GROUND_Y - 6);
  ctx.quadraticCurveTo(x + 18, GROUND_Y - 10, x + 6, nose + 10);
  ctx.fill();

  const glow = ctx.createLinearGradient(x, GROUND_Y, x + 36, GROUND_Y);
  glow.addColorStop(0, "rgba(255, 150, 40, 0.45)");
  glow.addColorStop(1, "rgba(255, 80, 10, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x + 8, GROUND_Y - 8, 36, 14);
  drawSpills(ctx, g);
}

function drawSpills(ctx, g) {
  for (const s of g.segments) {
    if (s.kind !== "ground") continue;
    if (s.x > g.camX + VIEW_W + 40 || s.x + s.w < g.camX - 40) continue;
    for (const o of s.obs) {
      if (!o.spill || (o.melt || 0) > 0.92) continue;
      const melt = o.melt || 0;
      const crest = GROUND_Y - o.h * (1 - melt * 0.9);
      ctx.fillStyle = "rgba(255, 120, 30, 0.85)";
      ctx.beginPath();
      ctx.moveTo(o.x - 4, GROUND_Y);
      ctx.quadraticCurveTo(o.x + o.w * 0.4, crest, o.x + o.w + 6, GROUND_Y - 2);
      ctx.lineTo(o.x + o.w, GROUND_Y);
      ctx.fill();
      ctx.fillStyle = "#fff6d0";
      ellipse(ctx, o.x + o.w * 0.5, crest + 1, 2.4, 1.3);
    }
  }
}

const BLOCK_BACK = 122;
const BLOCK_SHEAR = 46;
const LOT = 118;
const BLOCK_SPAN = GROUND_Y - BLOCK_BACK;

function blockAt(worldX, depth) {
  return [worldX + depth * BLOCK_SHEAR, GROUND_Y - depth * BLOCK_SPAN];
}

function fillPoly(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

function drawNeighborhood(ctx, g) {
  const look = worldLook(g);
  const burn = Math.min(1, (look.index || 0) / 5);
  const grass = mix("#7eae5c", look.dirt, burn * 0.85);
  const grassFar = mix("#4d7a3e", look.dirt, Math.min(1, burn * 0.9 + 0.15));
  const walk = mix("#e4ddd2", "#5c463c", burn * 0.72);
  const hedge = mix("#2c5a30", "#140c0a", Math.min(1, burn * 1.1));
  const walls = ["#f6d7b8", "#f3eee4", "#e07d64", "#d7e0cc", "#f7f3ea", "#f0c56e"];
  const roofs = ["#8d4530", "#4a5c78", "#a33b32", "#3d4e3c", "#6b3d22", "#8a5a28"];
  const x0 = g.camX - 90;
  const x1 = g.camX + VIEW_W + 90;

  const yard = ctx.createLinearGradient(0, BLOCK_BACK, 0, GROUND_Y);
  yard.addColorStop(0, grassFar);
  yard.addColorStop(1, grass);
  ctx.fillStyle = yard;
  fillPoly(ctx, [blockAt(x0, 0), blockAt(x1, 0), blockAt(x1, 1), blockAt(x0, 1)]);

  ctx.fillStyle = hedge;
  fillPoly(ctx, [blockAt(x0, 0.86), blockAt(x1, 0.86), blockAt(x1, 1), blockAt(x0, 1)]);

  const i0 = Math.floor((x0 - BLOCK_SHEAR) / LOT) - 1;
  const i1 = Math.ceil(x1 / LOT) + 1;
  for (let i = i0; i <= i1; i++) {
    drawLot(ctx, g, i, { burn, grass, walk, walls, roofs });
  }

  const dWalk = 0.16;
  ctx.fillStyle = walk;
  fillPoly(ctx, [blockAt(x0, 0), blockAt(x1, 0), blockAt(x1, dWalk), blockAt(x0, dWalk)]);
  ctx.strokeStyle = mix("#c8bfb2", "#2a1814", burn * 0.6);
  ctx.lineWidth = 1;
  const seam0 = Math.floor(x0 / 32) * 32;
  for (let x = seam0; x < x1; x += 32) {
    const a = blockAt(x, 0.01);
    const b = blockAt(x, dWalk);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath();
  const lipL = blockAt(x0, dWalk);
  const lipR = blockAt(x1, dWalk);
  ctx.moveTo(lipL[0], lipL[1]);
  ctx.lineTo(lipR[0], lipR[1]);
  ctx.stroke();
  ctx.fillStyle = mix("#8d847a", "#241410", burn * 0.5);
  ctx.fillRect(x0, GROUND_Y - 3, x1 - x0, 3);

  for (let i = i0; i <= i1; i++) drawMailbox(ctx, g, i, burn);
}

function drawLot(ctx, g, i, theme) {
  const lotX = i * LOT;
  const eaten = Math.max(0, Math.min(1, ((g.lavaX || 0) - lotX) / LOT));
  const lawn = mix(hash(i * 19) > 0.48 ? theme.grass : mix(theme.grass, "#d2e29a", 0.45), "#1c0c0a", eaten * 0.82);
  ctx.fillStyle = lawn;
  fillPoly(ctx, [blockAt(lotX, 0.16), blockAt(lotX + LOT, 0.16), blockAt(lotX + LOT, 0.88), blockAt(lotX, 0.88)]);
  ctx.strokeStyle = "rgba(20, 16, 8, 0.22)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  const edgeA = blockAt(lotX, 0.16);
  const edgeB = blockAt(lotX, 0.88);
  ctx.moveTo(edgeA[0], edgeA[1]);
  ctx.lineTo(edgeB[0], edgeB[1]);
  ctx.stroke();

  if (eaten > 0.97) return;

  const kind = Math.floor(hash(i * 3) * 5);
  let hw = 46 + Math.floor(hash(i * 5) * 14);
  if (kind === 2 || kind === 3) hw += 12;
  const inset = 18 + Math.floor(hash(i * 9) * 8);
  hw = Math.min(hw, LOT - inset - 16);
  const hx = lotX + inset;
  let wallH = 24 + Math.floor(hash(i * 11) * 8);
  let rise = 11;
  if (kind === 1) wallH += 12;
  if (kind === 4) {
    wallH = 12;
    rise = 24;
    hw = Math.min(hw, 50);
  }
  if (kind === 2 || kind === 3) {
    wallH = kind === 3 ? 22 : 20;
    rise = 0;
  }
  const d0 = 0.46;
  const d1 = 0.8;
  const doorX = hx + hw * 0.5;
  const pathHalf = kind === 3 ? 13 : 5;
  ctx.fillStyle = mix(theme.walk, lawn, 0.22);
  fillPoly(ctx, [
    blockAt(doorX - pathHalf, 0.15),
    blockAt(doorX + pathHalf, 0.15),
    blockAt(doorX + pathHalf, d0 - 0.02),
    blockAt(doorX - pathHalf, d0 - 0.02),
  ]);

  const wall = mix(theme.walls[Math.floor(hash(i * 7) * theme.walls.length)], "#2a1210", Math.max(theme.burn * 0.35, eaten * 0.88));
  const roof = mix(theme.roofs[Math.floor(hash(i * 11) * theme.roofs.length)], "#1a0c0a", Math.max(theme.burn * 0.45, eaten));
  const win = eaten > 0.35 || theme.burn > 0.55 ? "#ffb15a" : "#b7e4fb";

  ctx.save();
  if (eaten > 0.04) {
    const anchor = blockAt(hx, d0);
    ctx.translate(anchor[0], anchor[1]);
    ctx.scale(1, Math.max(0.12, 1 - eaten * 0.78));
    ctx.translate(-anchor[0], -anchor[1]);
  }
  drawHouseBlock(ctx, { hx, hw, d0, d1, wallH, rise, kind, wall, roof, win, i });
  ctx.restore();

  if (eaten < 0.45 && theme.burn < 0.7) {
    const treeX = hx + hw + 12;
    if (treeX < lotX + LOT - 8 && hash(i + 4) > 0.42) {
      const [tx, ty] = blockAt(treeX, 0.32);
      ctx.fillStyle = "rgba(20, 16, 8, 0.22)";
      ellipse(ctx, tx + 2, ty + 1, 7, 2.2);
      ctx.fillStyle = "#6b4228";
      ctx.fillRect(tx - 1, ty - 14, 2, 14);
      ctx.fillStyle = mix("#3f8a3a", "#1a120c", theme.burn);
      ellipse(ctx, tx, ty - 16, 8, 6.5);
      ellipse(ctx, tx + 4, ty - 13, 5, 4.5);
    } else if (hash(i + 6) > 0.5) {
      const [bx, by] = blockAt(lotX + 10, 0.34);
      ctx.fillStyle = mix("#3f8a3a", "#1a120c", theme.burn);
      ellipse(ctx, bx, by - 3, 5, 3.5);
    }
    if (theme.burn < 0.35 && hash(i + 21) > 0.55) {
      const [fx, fy] = blockAt(hx - 8, 0.36);
      ctx.fillStyle = hash(i + 2) > 0.5 ? "#e23b2f" : "#ffd56a";
      ellipse(ctx, fx, fy, 1.5, 1.5);
    }
  }

  if (eaten > 0.05 && eaten < 0.96) {
    ctx.fillStyle = "#ff6a1a";
    ctx.globalAlpha = 0.28 + eaten * 0.4;
    fillPoly(ctx, [blockAt(lotX, 0.2), blockAt(lotX + 7, 0.2), blockAt(lotX + 10, 0.86), blockAt(lotX, 0.86)]);
    ctx.globalAlpha = 1;
  }
}

function drawHouseBlock(ctx, spec) {
  const { hx, hw, d0, d1, wallH, rise, kind, wall, roof, win } = spec;
  const fl = blockAt(hx, d0);
  const fr = blockAt(hx + hw, d0);
  const br = blockAt(hx + hw, d1);
  const bl = blockAt(hx, d1);
  const up = (p, h) => [p[0], p[1] - h];
  const ftl = up(fl, wallH);
  const ftr = up(fr, wallH);
  const btr = up(br, wallH);
  const btl = up(bl, wallH);

  ctx.fillStyle = "rgba(28, 14, 10, 0.28)";
  fillPoly(ctx, [
    blockAt(hx + 2, d0 - 0.07),
    blockAt(hx + hw + 5, d0 - 0.07),
    blockAt(hx + hw + 1, d0 + 0.01),
    blockAt(hx + 3, d0 + 0.01),
  ]);

  ctx.fillStyle = mix(wall, "#140c0a", 0.28);
  fillPoly(ctx, [fr, br, btr, ftr]);
  ctx.fillStyle = wall;
  fillPoly(ctx, [fl, fr, ftr, ftl]);

  if (rise <= 0) {
    const slab = 5;
    const tl = [ftl[0] - 2, ftl[1] - slab];
    const tr = [ftr[0] + 3, ftr[1] - slab];
    const tbr = [btr[0] + 3, btr[1] - slab];
    const tbl = [btl[0] - 2, btl[1] - slab];
    ctx.fillStyle = mix(roof, "#140c0a", 0.22);
    fillPoly(ctx, [ftr, btr, tbr, tr]);
    ctx.fillStyle = roof;
    fillPoly(ctx, [ftl, ftr, tr, tl]);
    ctx.fillStyle = mix(roof, "#fff4e0", 0.16);
    fillPoly(ctx, [tl, tr, tbr, tbl]);
  } else {
    const peak = [(ftl[0] + ftr[0]) / 2, ftl[1] - rise];
    const peakB = [peak[0] + (br[0] - fr[0]), peak[1] + (br[1] - fr[1])];
    ctx.fillStyle = mix(roof, "#140c0a", 0.2);
    fillPoly(ctx, [ftr, peak, peakB, btr]);
    ctx.fillStyle = roof;
    fillPoly(ctx, [[ftl[0] - 2, ftl[1]], peak, [ftr[0] + 2, ftr[1]]]);
  }

  if (hash(spec.i + 4) > 0.4 && kind !== 4) {
    const along = rise <= 0 ? 0.55 : 0.4;
    const c = blockAt(hx + hw * 0.68, d0 + (d1 - d0) * along);
    const top = rise <= 0 ? wallH + 8 : wallH + rise * 0.55;
    ctx.fillStyle = mix(wall, "#140c0a", 0.18);
    ctx.fillRect(c[0], c[1] - top - 6, 4, 8);
    ctx.fillStyle = mix(roof, "#140c0a", 0.35);
    ctx.fillRect(c[0] - 1, c[1] - top - 7, 6, 2);
  }

  const doorW = kind === 3 ? Math.min(24, hw * 0.46) : 7;
  const doorH = Math.min(wallH - 4, kind === 1 ? 16 : 12);
  const doorLeft = fl[0] + hw * 0.5 - doorW / 2;
  ctx.fillStyle = kind === 3 ? "#d7c2a4" : "#5c3828";
  ctx.fillRect(doorLeft, fl[1] - doorH, doorW, doorH);
  if (kind === 3) {
    ctx.fillStyle = "rgba(30, 16, 10, 0.35)";
    ctx.fillRect(doorLeft, fl[1] - doorH * 0.55, doorW, 1);
  } else {
    ctx.fillStyle = "#ffd56a";
    ctx.fillRect(doorLeft + doorW - 2.5, fl[1] - doorH * 0.48, 1.4, 1.4);
  }

  ctx.fillStyle = win;
  if (kind !== 3 && kind !== 4) {
    const wy = fl[1] - wallH + (kind === 1 ? 5 : 6);
    ctx.fillRect(fl[0] + 5, wy, 6, 5);
    if (hw > 50) ctx.fillRect(fl[0] + hw - 12, wy, 6, 5);
    if (kind === 1) {
      ctx.fillRect(fl[0] + 5, wy + 11, 6, 5);
      if (hw > 50) ctx.fillRect(fl[0] + hw - 12, wy + 11, 6, 5);
    }
  } else if (kind === 4) {
    ctx.fillRect(fl[0] + hw * 0.5 - 3, fl[1] - wallH - rise * 0.45, 6, 5);
  }

  const winPts = [];
  for (const [t, hgt] of [[0.22, 7], [0.58, 7], [0.58, 13], [0.22, 13]]) {
    const x = fr[0] + (br[0] - fr[0]) * t;
    const y = fr[1] + (br[1] - fr[1]) * t - hgt;
    winPts.push([x, y]);
  }
  if (kind !== 4) fillPoly(ctx, winPts);
}

function drawMailbox(ctx, g, i, burn) {
  const lotX = i * LOT;
  const eaten = Math.max(0, Math.min(1, ((g.lavaX || 0) - lotX) / LOT));
  if (eaten > 0.55) return;
  const [mx, my] = blockAt(lotX + 11, 0.07);
  ctx.fillStyle = mix("#6b4632", "#1a0c0a", burn * 0.6);
  ctx.fillRect(mx, my - 12, 2, 12);
  ctx.fillStyle = mix("#3c5c92", "#1a0c0a", burn * 0.7);
  ctx.fillRect(mx - 4, my - 16, 10, 5);
  ctx.fillStyle = hash(i + 8) > 0.55 ? "#e23b2f" : "#f0d36a";
  ctx.fillRect(mx + 6, my - 18, 1.5, 5);
}

function drawRiver(ctx, seg, time) {
  const top = GROUND_Y + 8;
  const t = time || 0;
  const grd = ctx.createLinearGradient(0, top, 0, VIEW_H);
  grd.addColorStop(0, "#fff0b0");
  grd.addColorStop(0.16, "#ff7a18");
  grd.addColorStop(0.5, "#d81e0e");
  grd.addColorStop(1, "#3c0806");
  ctx.fillStyle = grd;
  ctx.fillRect(seg.x, top, seg.w, VIEW_H - top);
  ctx.fillStyle = "rgba(255, 236, 170, 0.9)";
  ctx.fillRect(seg.x + 1, top, Math.max(2, seg.w - 2), 3);
  ctx.fillStyle = "#4a0c08";
  const span = Math.max(8, seg.w);
  for (let i = 0; i < 3; i++) {
    const bx = seg.x + ((i * 22 + t * 10 + seg.x * 0.15) % span);
    ellipse(ctx, bx, top + 7 + (i % 2) * 8, 4, 2.2);
  }
  ctx.fillStyle = "#ffd56a";
  ellipse(ctx, seg.x + span * 0.45, top + 14 + Math.sin(t * 3) * 2, 2.2, 1.6);
}

function drawPhin(ctx, x, y, pose, time = 0) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  const carry = pose === "carry" || pose === "land" || pose === "hop";
  const stride = pose === "carry" ? Math.sin(time * 16) * 4 : 0;
  const leg = pose === "leap" || pose === "hop" ? -4 : pose === "drop" ? 2 : stride;

  ctx.fillStyle = "#243044";
  ctx.fillRect(-6, -16, 4, 12 + (pose === "carry" ? stride : 0));
  ctx.fillRect(2, -16 - (pose === "carry" ? stride : leg), 4, 12);
  ctx.fillStyle = "#6b3a22";
  ctx.fillRect(-7, -5 + (pose === "carry" ? stride : 0), 6, 5);
  ctx.fillRect(1, -5 - (pose === "carry" ? stride : leg), 6, 5);

  ctx.fillStyle = "#3d7dff";
  ctx.beginPath();
  ctx.moveTo(-8, -30);
  ctx.lineTo(9, -30);
  ctx.lineTo(8, -15);
  ctx.lineTo(-7, -15);
  ctx.fill();
  ctx.fillStyle = "#ffb703";
  ctx.fillRect(-7, -30, 14, 4);
  if (!carry) ctx.fillRect(5, -27, 3, 8 + Math.sin(time * 8) * 1);

  ctx.fillStyle = "#f0c7a0";
  ellipse(ctx, 1, -38, 7, 7.2);
  ctx.fillStyle = "#5c3317";
  ctx.beginPath();
  ctx.ellipse(1, -40, 7.1, 5.2, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-6, -40, 14, 3);
  ctx.fillStyle = "#1c2438";
  ellipse(ctx, -1.6, -37.2, 1, 1.25);
  ellipse(ctx, 3.6, -37.2, 1, 1.25);
  ctx.fillStyle = "#fff";
  ellipse(ctx, -2, -37.7, 0.4, 0.4);
  ellipse(ctx, 3.2, -37.7, 0.4, 0.4);
  ctx.strokeStyle = "#c46b58";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(1, -34.6, 2.3, 0.15, Math.PI - 0.15);
  ctx.stroke();

  ctx.fillStyle = "#3d7dff";
  if (carry) {
    ctx.fillRect(-12, -28, 5, 11);
    ctx.fillRect(8, -28, 5, 11);
    ctx.fillStyle = "#f0c7a0";
    ellipse(ctx, -10, -17, 2.2, 2.2);
    ellipse(ctx, 11, -17, 2.2, 2.2);
  } else {
    ctx.fillRect(-12, -28, 4, 10);
    ctx.fillRect(8, -28, 4, 10);
    ctx.fillStyle = "#f0c7a0";
    ellipse(ctx, -10, -18, 2, 2);
    ellipse(ctx, 10, -18, 2, 2);
  }
  ctx.restore();
}

function drawHUD(ctx, g, opts = {}) {
  const p = g.player;
  ctx.save();
  ctx.textAlign = "left";
  ctx.font = "700 11px Trebuchet MS, sans-serif";

  for (let i = 0; i < 3; i++) {
    const x = 18 + i * 28;
    if (i < p.lives) {
      ctx.save();
      ctx.translate(x, 28);
      ctx.scale(0.42, 0.42);
      drawJimmy(ctx, 0, 0, { expr: "happy", squash: 1, stretch: 1, heat: 0, pop: 1 });
      ctx.restore();
    } else {
      ctx.fillStyle = "#ff7a3c";
      ellipse(ctx, x, 26, 8, 3);
      ctx.fillStyle = "#e23b2f";
      ellipse(ctx, x - 6, 22, 3, 3);
    }
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#172033";
  ctx.font = "800 20px Trebuchet MS, sans-serif";
  ctx.fillText(`${g.meters} m`, VIEW_W / 2 + 1, 23);
  ctx.fillStyle = "#fff";
  ctx.fillText(`${g.meters} m`, VIEW_W / 2, 21);
  ctx.font = "700 9px Trebuchet MS, sans-serif";
  ctx.fillStyle = "#172033";
  ctx.fillText(`LV ${g.levelNumber || 1}  ${g.levelName || "Snowfield"}`, VIEW_W / 2 + 1, 35);
  ctx.fillStyle = "#ffe7c2";
  ctx.fillText(`LV ${g.levelNumber || 1}  ${g.levelName || "Snowfield"}`, VIEW_W / 2, 34);

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(23,32,51,0.72)";
  ctx.fillRect(8, 66, 54, 16);
  ctx.fillStyle = "#ffd56a";
  ctx.beginPath();
  ctx.arc(18, 74, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "800 12px Trebuchet MS, sans-serif";
  ctx.fillStyle = "#172033";
  ctx.fillText(String(g.coins), 28, 79);
  ctx.fillStyle = "#fff";
  ctx.fillText(String(g.coins), 27, 78);

  if (g.mode === "run") {
    ctx.save();
    ctx.globalAlpha = g.helps > 0 ? 1 : 0.4;
    ctx.translate(18, 58);
    ctx.scale(0.42, 0.42);
    drawPhin(ctx, 0, 0, "idle");
    ctx.restore();
    ctx.textAlign = "left";
    ctx.font = "800 11px Trebuchet MS, sans-serif";
    ctx.fillStyle = "#172033";
    ctx.fillText(`×${g.helps || 0}`, 35, 57);
    ctx.fillStyle = g.helps > 0 ? "#fff" : "#d7deea";
    ctx.fillText(`×${g.helps || 0}`, 34, 56);
    ctx.font = "700 8px Trebuchet MS, sans-serif";
    ctx.fillStyle = "#ffe7c2";
    ctx.fillText("F", 52, 56);
  }

  const barX = VIEW_W / 2 - 70;
  const barY = VIEW_H - 18;
  ctx.fillStyle = "rgba(23,32,51,0.8)";
  ctx.fillRect(barX, barY, 140, 8);
  const heat = p.heat / 100;
  ctx.fillStyle = mix("#7ee0ff", heat > 0.72 ? "#ff3b12" : "#ffb703", heat);
  ctx.fillRect(barX, barY, 140 * heat, 8);
  ctx.strokeStyle = "#172033";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(barX, barY, 140, 8);
  ctx.font = "700 8px Trebuchet MS, sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "#e7f7ff";
  ctx.fillText("COOL", barX, barY - 2);
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffd0b0";
  ctx.fillText("HOT", barX + 140, barY - 2);

  if (g.spicy) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffb703";
    ctx.font = "800 12px Trebuchet MS, sans-serif";
    ctx.fillText("SPICY", VIEW_W / 2, barY - 2);
  }

  if (g.bannerT > 0 && g.banner) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, g.bannerT * 2);
    ctx.textAlign = "center";
    ctx.font = "800 22px Trebuchet MS, sans-serif";
    ctx.fillStyle = "#172033";
    ctx.fillText(g.banner, VIEW_W / 2 + 2, 72);
    ctx.fillStyle = "#fff";
    ctx.fillText(g.banner, VIEW_W / 2, 70);
    if (g.bannerSub) {
      ctx.font = "700 12px Trebuchet MS, sans-serif";
      ctx.fillStyle = "#172033";
      ctx.fillText(g.bannerSub, VIEW_W / 2 + 1, 89);
      ctx.fillStyle = "#ffe7c2";
      ctx.fillText(g.bannerSub, VIEW_W / 2, 87);
    }
    ctx.restore();
  }

  if (!opts.touch && g.mode === "run" && g.time < 6 && g.jumps === 0 && g.state === "play" && !(g.bannerT > 0) && !g.phin) {
    ctx.textAlign = "center";
    ctx.font = "800 12px Trebuchet MS, sans-serif";
    ctx.fillStyle = "#172033";
    ctx.fillText("SPACE TO JUMP", VIEW_W / 2 + 1, 96);
    ctx.fillStyle = "#fff";
    ctx.fillText("SPACE TO JUMP", VIEW_W / 2, 94);
  }

  let ty = g.phin ? 108 : g.bannerT > 0 && g.bannerSub ? 108 : 78;
  ctx.textAlign = "center";
  ctx.font = "800 13px Trebuchet MS, sans-serif";
  for (const t of g.toasts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, t.life * 2));
    ctx.fillStyle = "#172033";
    ctx.fillText(t.text, VIEW_W / 2 + 1, ty + 1);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, VIEW_W / 2, ty);
    ty += 16;
  }
  ctx.restore();
}

function heatVignette(ctx, g) {
  const p = g.player;
  const lead = p.x - g.lavaX;
  const danger = Math.max(p.heat / 140, lead < 120 ? (120 - lead) / 200 : 0);
  if (danger < 0.08 || g.state === "title") return;
  const grd = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, 80, VIEW_W / 2, VIEW_H / 2, 280);
  grd.addColorStop(0, "rgba(255,40,0,0)");
  grd.addColorStop(1, `rgba(255,40,0,${Math.min(0.45, danger)})`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

export function draw(ctx, g, opts = {}) {
  const reduce = !!opts.reduceMotion;
  ctx.save();
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawSky(ctx, g);
  drawMountains(ctx, g);

  ctx.save();
  const shake = reduce ? 0 : g.shake;
  const sx = shake > 0.15 ? (Math.random() - 0.5) * shake : 0;
  const sy = shake > 0.15 ? (Math.random() - 0.5) * shake : 0;
  const showcase = g.mode === "demo" ? -24 : 0;
  ctx.translate(-Math.round(g.camX) + sx, sy + showcase);

  drawNeighborhood(ctx, g);

  for (const seg of g.segments) {
    if (seg.x > g.camX + VIEW_W + 30 || seg.x + seg.w < g.camX - 30) continue;
    if (seg.kind === "gap") drawRiver(ctx, seg, g.time);
    else if (seg.kind === "pit") drawPit(ctx, seg, g.time);
    else drawGround(ctx, seg, g);
    if (seg.marker) drawMarker(ctx, seg);
  }
  for (const seg of g.segments) {
    if (seg.kind !== "ground") continue;
    if (seg.x > g.camX + VIEW_W + 30 || seg.x + seg.w < g.camX - 30) continue;
    for (const o of seg.obs) if (!o.spill) drawObstacle(ctx, o, seg.y);
    for (const slug of seg.slugs || []) drawSlug(ctx, slug);
    for (const c of seg.coins) if (!c.got) drawCoin(ctx, c, g.time);
  }
  for (const seg of g.segments) {
    if (seg.kind === "pit" && seg.sign && seg.x < g.camX + VIEW_W) drawSign(ctx, seg);
    if (seg.kind === "gap") {
      for (const c of seg.coins) if (!c.got) drawCoin(ctx, c, g.time);
    }
  }

  drawLava(ctx, g);
  for (const seg of g.segments) {
    if (seg.kind !== "ground") continue;
    if (seg.x > g.camX + VIEW_W + 40 || seg.x + seg.w < g.camX - 40) continue;
    for (const o of seg.obs) if (o.spill) drawObstacle(ctx, o, seg.y);
  }
  drawMeltTrail(ctx, g);

  for (const q of g.particles) {
    if (q.x < g.camX - 10 || q.x > g.camX + VIEW_W + 10) continue;
    ctx.globalAlpha = Math.max(0, Math.min(1, q.life / (q.max || 0.5)));
    ctx.fillStyle = q.color;
    if (q.drip) ellipse(ctx, q.x, q.y, q.r * 0.72, q.r * 1.55);
    else ellipse(ctx, q.x, q.y, q.r, q.r);
    ctx.globalAlpha = 1;
  }

  const p = g.player;
  const expr = expression(g);
  const bob = p.onGround && !p.inPit ? Math.sin(p.runPhase) * 0.08 : 0;
  const mercyBlink = p.mercy > 0 && Math.sin(g.time * 22) > 0;
  if (g.state !== "melt" || g.meltT < 1.05) {
    drawJimmy(ctx, p.x, p.y, {
      expr,
      squash: p.squash,
      stretch: p.stretch,
      heat: p.heat,
      bob,
      pop: p.pop,
      blink: p.blink > 0,
      tilt: clampTilt(p),
      melt: g.state === "melt" ? Math.min(1, g.meltT / 1.05) : 0,
      alpha: mercyBlink ? 0.45 : 1,
    });
  }
  if (g.phin) {
    const hopping = g.phin.phase === "carry" && (g.phin.vy || 0) < -40;
    if (hopping || g.phin.y < GROUND_Y - 10) {
      ctx.fillStyle = "rgba(20, 12, 28, 0.28)";
      ellipse(ctx, g.phin.x + 8, GROUND_Y + 2, 18, 4);
    }
    drawPhin(ctx, g.phin.x, g.phin.y, hopping ? "hop" : g.phin.phase, g.time);
  }
  if (g.state === "melt") drawBits(ctx, g);

  ctx.font = "800 10px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  for (const f of g.floaters) {
    ctx.globalAlpha = Math.max(0, f.life * 2);
    ctx.fillStyle = "#ffd56a";
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  heatVignette(ctx, g);
  if (g.mode === "run" && g.state !== "title") drawHUD(ctx, g, opts);
  ctx.restore();
}

function drawMarker(ctx, seg) {
  const x = seg.marker.x;
  const y = seg.y;
  ctx.fillStyle = "#6b3d22";
  ctx.fillRect(x - 2, y - 32, 4, 32);
  ctx.fillStyle = "#ffb703";
  ctx.fillRect(x + 2, y - 30, 26, 14);
  ctx.strokeStyle = "#172033";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 2, y - 30, 26, 14);
  ctx.fillStyle = "#172033";
  ctx.font = "800 8px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`LV ${seg.marker.level}`, x + 15, y - 20);
}

function drawMeltTrail(ctx, g) {
  const pts = g.trail;
  if (!pts || !pts.length) return;
  const width = Math.max(2.2, pts[pts.length - 1].w || 2);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  let moved = false;
  for (const p of pts) {
    if (p.life <= 0.05) continue;
    if (!moved) {
      ctx.moveTo(p.x, p.y);
      moved = true;
    } else ctx.lineTo(p.x, p.y);
  }
  if (moved) {
    ctx.strokeStyle = "rgba(120, 190, 235, 0.45)";
    ctx.lineWidth = width + 3.5;
    ctx.stroke();
    ctx.strokeStyle = "rgba(214, 242, 255, 0.9)";
    ctx.lineWidth = Math.max(1.6, width * 0.55);
    ctx.stroke();
  }
  for (const p of pts) {
    ctx.globalAlpha = Math.max(0, Math.min(0.85, p.life));
    ctx.fillStyle = "rgba(232, 247, 255, 0.9)";
    ellipse(ctx, p.x, p.y, Math.max(1.2, p.w || 2), 1.35);
  }
  ctx.restore();
}

function clampTilt(p) {
  if (p.inPit) return 0;
  return Math.max(-0.18, Math.min(0.18, -p.vy * 0.00022));
}
