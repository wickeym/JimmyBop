import { createBot } from "./bot.js";
import { createAudio } from "./audio.js";
import { draw } from "./draw.js";
import { STEP, VIEW_H, VIEW_W, createGame, lookAhead, pullSfx, startRun, update } from "./game.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const titleEl = document.getElementById("title");
const pauseEl = document.getElementById("pause");
const overEl = document.getElementById("over");
const touchEl = document.getElementById("touch");
const playBtn = document.getElementById("play");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resume");
const retryBtn = document.getElementById("retry");
const quitBtn = document.getElementById("quit");
const muteBtn = document.getElementById("mute");
const bestEl = document.getElementById("best");
const overScore = document.getElementById("overScore");
const overLine = document.getElementById("overLine");
const overBest = document.getElementById("overBest");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const audio = createAudio();
const keys = { jump: false, sprint: false, brake: false, drop: false };
let jumpQueued = false;
let pointerJump = false;
let touchJump = false;
let touchSprint = false;

let best = Number(localStorage.getItem("jimmy-bop-best") || 0);
if (!Number.isFinite(best)) best = 0;
audio.setMuted(localStorage.getItem("jimmy-bop-mute") === "1");

let game = createGame(7);
game.best = best;
let bot = createBot();
let acc = 0;
let last = performance.now();
let shownOver = false;

function fit() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = `${VIEW_W * scale}px`;
  canvas.style.height = `${VIEW_H * scale}px`;
}
window.addEventListener("resize", fit);
fit();

function saveBest() {
  if (game.mode === "run" && game.best > best) {
    best = game.best;
    localStorage.setItem("jimmy-bop-best", String(best));
  }
}

function beginRun() {
  audio.resume();
  saveBest();
  game = startRun(best, (Date.now() % 90000) + 1);
  bot = createBot();
  shownOver = false;
  acc = 0;
}

function backToTitle() {
  saveBest();
  game = createGame(7);
  game.best = best;
  bot = createBot();
  shownOver = false;
}

function togglePause() {
  if (game.mode !== "run") return;
  if (game.state === "play") game.state = "pause";
  else if (game.state === "pause") game.state = "play";
}

function syncMute() {
  muteBtn.textContent = audio.muted ? "Sound off" : "Sound on";
}

function syncUI() {
  const demo = game.mode === "demo";
  titleEl.hidden = !demo;
  pauseEl.hidden = game.state !== "pause";
  overEl.hidden = game.state !== "over";
  touchEl.hidden = game.mode !== "run" || game.state === "over" || game.state === "pause";
  pauseBtn.hidden = game.mode !== "run" || game.state === "over";
  bestEl.hidden = !(best > 0);
  bestEl.textContent = best > 0 ? `Best score ${best}` : "";
  if (game.state === "over" && !shownOver) {
    shownOver = true;
    saveBest();
  }
  if (game.state === "over") {
    overScore.textContent = `${game.score} points  ·  ${game.meters} m  ·  ${game.coins} coins`;
    overLine.textContent = game.line || "Jimmy melted.";
    overBest.textContent = `Best ${Math.max(best, game.best)}`;
  }
  syncMute();
}

playBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  beginRun();
});
retryBtn.addEventListener("click", beginRun);
resumeBtn.addEventListener("click", () => {
  if (game.state === "pause") game.state = "play";
});
quitBtn.addEventListener("click", backToTitle);
pauseBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  togglePause();
});
muteBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  audio.resume();
  const muted = audio.toggle();
  localStorage.setItem("jimmy-bop-mute", muted ? "1" : "0");
  syncMute();
});

document.getElementById("btnJump").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  touchJump = true;
  jumpQueued = true;
});
document.getElementById("btnSprint").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  touchSprint = true;
});
window.addEventListener("pointerup", () => {
  touchJump = false;
  touchSprint = false;
  pointerJump = false;
});

canvas.addEventListener("pointerdown", (e) => {
  if (e.target !== canvas) return;
  if (game.mode === "demo") {
    beginRun();
    return;
  }
  if (game.state === "over") {
    beginRun();
    return;
  }
  pointerJump = true;
  jumpQueued = true;
});

window.addEventListener("keydown", (e) => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
    if (!keys.jump) jumpQueued = true;
    keys.jump = true;
  }
  if (e.code === "ArrowRight" || e.code === "KeyD") keys.sprint = true;
  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.brake = true;
  if (e.code === "ArrowDown" || e.code === "KeyS") keys.drop = true;
  if (e.code === "KeyP" || e.code === "Escape") togglePause();
  if (e.code === "KeyM") {
    audio.resume();
    const muted = audio.toggle();
    localStorage.setItem("jimmy-bop-mute", muted ? "1" : "0");
  }
  if (e.code === "Enter") {
    if (game.mode === "demo" || game.state === "over") beginRun();
    else if (game.state === "pause") game.state = "play";
  }
  if (e.code === "KeyK" && new URLSearchParams(location.search).has("debug")) {
    game.player.mercy = 0;
    game.lavaX = game.player.x - 4;
  }
});
window.addEventListener("keyup", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") keys.jump = false;
  if (e.code === "ArrowRight" || e.code === "KeyD") keys.sprint = false;
  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.brake = false;
  if (e.code === "ArrowDown" || e.code === "KeyS") keys.drop = false;
});

function playerInput() {
  const input = {
    jumpHeld: keys.jump || pointerJump || touchJump,
    jumpPressed: jumpQueued,
    sprint: keys.sprint || touchSprint,
    brake: keys.brake,
    drop: keys.drop,
  };
  jumpQueued = false;
  return input;
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  acc += dt;
  let steps = 0;
  while (acc >= STEP && steps < 8) {
    const input = game.mode === "demo" ? bot(game, STEP) : playerInput();
    updateSafe(input);
    acc -= STEP;
    steps += 1;
  }
  if (game.needsReset) {
    const keep = Math.max(best, game.best);
    game = createGame(7);
    game.best = keep;
    bot = createBot();
  }
  saveBest();
  audio.sync(game, dt);
  audio.playList(pullSfx(game));
  draw(ctx, game, { reduceMotion });
  syncUI();
  requestAnimationFrame(frame);
}

function updateSafe(input) {
  update(game, STEP, input);
}

window.__jimmy = {
  get game() {
    return game;
  },
  start: beginRun,
  kill() {
    game.player.mercy = 0;
    game.lavaX = game.player.x - 2;
  },
  look() {
    return lookAhead(game);
  },
  audio,
};

syncUI();
requestAnimationFrame(frame);
