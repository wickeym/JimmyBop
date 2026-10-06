import {
  GROUND_Y,
  PIT_DEPTH,
  VIEW_H,
  VIEW_W,
  expression,
} from "./game.js";

function mix(a, b, t) {
  t = Math.max(0, Math.min(1, t));
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ar = (pa >> 16) & 255;
  const ag = (pa >> 8) & 255;
  const ab = pa & 255;
  const br = (pb >> 16) & 255;
  const bg = (pb >> 8) & 255;
  const bb = pb & 255;
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
  const grd = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grd.addColorStop(0, "#2a2158");
  grd.addColorStop(0.35, "#6d7ec4");
  grd.addColorStop(0.62, "#f08a62");
  grd.addColorStop(1, "#ffcf8a");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const cam = g.camX;
  ctx.fillStyle = "rgba(255,214,186,0.45)";
  for (let i = 0; i < 6; i++) {
    const x = ((i * 180 - cam * 0.12) % (VIEW_W + 160)) - 40;
    const y = 28 + (i % 3) * 16;
    ellipse(ctx, x, y, 28, 10);
    ellipse(ctx, x + 18, y + 2, 18, 8);
  }
}

function drawMountains(ctx, g) {
  const ranges = [
    { y: 118, color: "#5c4a78", parallax: 0.15, h: 46, step: 46 },
    { y: 142, color: "#3e335c", parallax: 0.28, h: 38, step: 36 },
  ];
  for (const range of ranges) {
    const off = (g.camX * range.parallax) % range.step;
    ctx.fillStyle = range.color;
    ctx.beginPath();
    ctx.moveTo(-20, VIEW_H);
    for (let x = -off - range.step; x <= VIEW_W + range.step; x += range.step) {
      const peak = range.y - hash(Math.floor((x + g.camX * range.parallax) / range.step) + range.step) * range.h;
      ctx.lineTo(x, range.y);
      ctx.lineTo(x + range.step * 0.5, peak);
    }
    ctx.lineTo(VIEW_W + 20, VIEW_H);
    ctx.fill();
  }

  const vx = VIEW_W * 0.72 - (g.camX * 0.08) % (VIEW_W + 200);
  ctx.fillStyle = "#2c2344";
  ctx.beginPath();
  ctx.moveTo(vx - 70, 168);
  ctx.lineTo(vx, 58);
  ctx.lineTo(vx + 78, 168);
  ctx.fill();
  ctx.fillStyle = "#ff5a1f";
  ctx.beginPath();
  ctx.moveTo(vx - 10, 78);
  ctx.lineTo(vx, 58);
  ctx.lineTo(vx + 12, 80);
  ctx.fill();
  ctx.fillStyle = "#ffd56a";
  const pulse = 6 + Math.sin(g.time * 5) * 3;
  ctx.beginPath();
  ctx.moveTo(vx - 4, 74);
  ctx.lineTo(vx, 62);
  ctx.lineTo(vx + 5, 74 + pulse * 0.2);
  ctx.fill();
}

function drawGround(ctx, seg) {
  const y = seg.y;
  ctx.fillStyle = "#3a2d4a";
  ctx.fillRect(seg.x, y + 8, seg.w, VIEW_H - y);
  ctx.fillStyle = "#2a2138";
  for (let x = seg.x; x < seg.x + seg.w; x += 16) {
    ctx.fillRect(x, y + 18, 14, 5);
    ctx.fillRect(x + 8, y + 28, 14, 5);
  }
  ctx.fillStyle = "#d7e6f4";
  ctx.fillRect(seg.x, y + 4, seg.w, 8);
  ctx.fillStyle = "#f7fbff";
  ctx.beginPath();
  ctx.moveTo(seg.x, y + 6);
  for (let x = seg.x; x <= seg.x + seg.w; x += 8) {
    ctx.lineTo(x, y + 2 + Math.sin(x * 0.35) * 1.4);
  }
  ctx.lineTo(seg.x + seg.w, y + 10);
  ctx.lineTo(seg.x, y + 10);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  for (let x = seg.x + 6; x < seg.x + seg.w; x += 22) {
    if (hash(x) > 0.55) ellipse(ctx, x, y + 1, 4 + hash(x + 3) * 4, 2.2);
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
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ellipse(ctx, seg.x + seg.w * 0.35, y + 8, 8, 2);
  ctx.fillStyle = "#f7fbff";
  ctx.fillRect(seg.x, y + 1, seg.w, 4);
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
  const x = o.x;
  const y = groundY - o.h;
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
  } else {
    ctx.fillStyle = "#3a3148";
    ellipse(ctx, x + o.w / 2, y + o.h * 0.65, o.w / 2, o.h * 0.55);
    ctx.fillStyle = "#f7fbff";
    ellipse(ctx, x + o.w / 2, y + 4, o.w / 2.2, 4);
  }
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

function drawLava(ctx, g) {
  const x = g.lavaX;
  const grd = ctx.createLinearGradient(x - 180, 0, x + 16, 0);
  grd.addColorStop(0, "#8a140c");
  grd.addColorStop(0.55, "#ff3b12");
  grd.addColorStop(1, "#ffe08a");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.moveTo(x - 700, 168);
  for (let i = 0; i <= 28; i++) {
    const fy = 150 + i * 4.2;
    const tongue = 10 + Math.sin(g.time * 7 + i * 0.7) * 8 + (i % 4 === 0 ? 10 : 0);
    ctx.lineTo(x + tongue, fy);
  }
  ctx.lineTo(x - 700, VIEW_H);
  ctx.fill();

  ctx.fillStyle = "#ffd56a";
  for (let i = 0; i < 10; i++) {
    const fy = 168 + i * 10;
    const h = 6 + Math.sin(g.time * 9 + i) * 5;
    ctx.beginPath();
    ctx.moveTo(x - 2, fy);
    ctx.lineTo(x + h, fy + 3);
    ctx.lineTo(x - 2, fy + 7);
    ctx.fill();
  }
}

function drawRiver(ctx, seg) {
  const top = GROUND_Y + 10;
  const grd = ctx.createLinearGradient(0, top, 0, VIEW_H);
  grd.addColorStop(0, "#ffd56a");
  grd.addColorStop(0.35, "#ff5a1f");
  grd.addColorStop(1, "#9a160c");
  ctx.fillStyle = grd;
  ctx.fillRect(seg.x, top, seg.w, VIEW_H - top);
  ctx.fillStyle = "rgba(255,244,180,0.7)";
  for (let i = 0; i < 3; i++) {
    const bx = seg.x + ((i * 29 + seg.x * 0.1) % seg.w);
    ellipse(ctx, bx, top + 8 + (i % 2) * 6, 3, 2);
  }
}

function drawHUD(ctx, g) {
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

  ctx.textAlign = "right";
  ctx.font = "800 12px Trebuchet MS, sans-serif";
  ctx.fillStyle = "#ffd56a";
  ctx.beginPath();
  ctx.arc(VIEW_W - 52, 16, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillText(String(g.coins), VIEW_W - 16, 20);

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
    ctx.restore();
  }

  if (g.mode === "run" && g.time < 6 && g.jumps === 0 && g.state === "play") {
    ctx.textAlign = "center";
    ctx.font = "800 12px Trebuchet MS, sans-serif";
    ctx.fillStyle = "#172033";
    ctx.fillText("SPACE TO JUMP", VIEW_W / 2 + 1, 96);
    ctx.fillStyle = "#fff";
    ctx.fillText("SPACE TO JUMP", VIEW_W / 2, 94);
  }

  let ty = 78;
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

  for (const seg of g.segments) {
    if (seg.x > g.camX + VIEW_W + 30 || seg.x + seg.w < g.camX - 30) continue;
    if (seg.kind === "gap") drawRiver(ctx, seg);
    else if (seg.kind === "pit") drawPit(ctx, seg, g.time);
    else drawGround(ctx, seg);
  }
  for (const seg of g.segments) {
    if (seg.kind !== "ground") continue;
    if (seg.x > g.camX + VIEW_W + 30 || seg.x + seg.w < g.camX - 30) continue;
    for (const o of seg.obs) drawObstacle(ctx, o, seg.y);
    for (const c of seg.coins) if (!c.got) drawCoin(ctx, c, g.time);
  }
  for (const seg of g.segments) {
    if (seg.kind === "pit" && seg.sign && seg.x < g.camX + VIEW_W) drawSign(ctx, seg);
    if (seg.kind === "gap") {
      for (const c of seg.coins) if (!c.got) drawCoin(ctx, c, g.time);
    }
  }

  drawLava(ctx, g);

  for (const q of g.particles) {
    if (q.x < g.camX - 10 || q.x > g.camX + VIEW_W + 10) continue;
    ctx.globalAlpha = Math.max(0, Math.min(1, q.life / (q.max || 0.5)));
    ctx.fillStyle = q.color;
    ellipse(ctx, q.x, q.y, q.r, q.r);
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
  if (g.mode === "run" && g.state !== "title") drawHUD(ctx, g);
  ctx.restore();
}

function clampTilt(p) {
  if (p.inPit) return 0;
  return Math.max(-0.18, Math.min(0.18, -p.vy * 0.00022));
}
