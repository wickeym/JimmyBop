import { createBot } from "./bot.js";
import { createAudio } from "./audio.js";
import { draw } from "./draw.js";
import { fetchBoard, qualifies, submitScore } from "./board.js";
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
const nameForm = document.getElementById("nameForm");
const initials = document.getElementById("initials");
const nameError = document.getElementById("nameError");
const boardEl = document.getElementById("board");
const titleBoard = document.getElementById("titleBoard");
const boardStatus = document.getElementById("boardStatus");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const touchUI = window.matchMedia("(pointer: coarse), (hover: none)").matches;
const audio = createAudio();
const keys = { jump: false, sprint: false, brake: false, drop: false };
let jumpQueued = false;
let helpQueued = false;
let pointerJump = false;
let canvasPointer = null;
const held = { jump: false, sprint: false, brake: false, drop: false };

let best = Number(localStorage.getItem("jimmy-bop-best") || 0);
if (!Number.isFinite(best)) best = 0;
let bestMeters = Number(localStorage.getItem("jimmy-bop-best-meters") || 0);
if (!Number.isFinite(bestMeters)) bestMeters = 0;
let bestLevel = Number(localStorage.getItem("jimmy-bop-best-level") || 1);
if (!Number.isFinite(bestLevel) || bestLevel < 1) bestLevel = 1;
audio.setMuted(localStorage.getItem("jimmy-bop-mute") === "1");

let game = createGame(7);
game.best = best;
let bot = createBot();
let acc = 0;
let last = performance.now();
let shownOver = false;

function fit() {
  const view = window.visualViewport;
  const w = view ? view.width : window.innerWidth;
  const h = view ? view.height : window.innerHeight;
  const scale = Math.min(w / VIEW_W, h / VIEW_H);
  canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
}
window.addEventListener("resize", fit);
window.visualViewport?.addEventListener("resize", fit);
fit();
document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
document.addEventListener("contextmenu", (e) => e.preventDefault());

function saveBest() {
  if (game.mode !== "run") return;
  if (game.best > best) {
    best = game.best;
    localStorage.setItem("jimmy-bop-best", String(best));
  }
  if (game.meters > bestMeters) {
    bestMeters = game.meters;
    bestLevel = game.levelNumber || 1;
    localStorage.setItem("jimmy-bop-best-meters", String(bestMeters));
    localStorage.setItem("jimmy-bop-best-level", String(bestLevel));
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
  bestEl.hidden = !(bestMeters > 0);
  bestEl.textContent = bestMeters > 0 ? `Best: Level ${bestLevel} · ${bestMeters} m` : "";
  if (game.state === "over" && !shownOver) {
    shownOver = true;
    saveBest();
    openBoard();
  }
  if (game.state === "over") {
    overScore.textContent = `Level ${game.levelNumber} · ${game.levelName}  ·  ${game.meters} m  ·  ${game.score} pts`;
    overLine.textContent = game.line || "Jimmy melted.";
    overBest.textContent = `Best: Level ${Math.max(bestLevel, game.levelNumber)} · ${Math.max(bestMeters, game.meters)} m`;
  }
  syncMute();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function paintBoard(list, highlightId) {
  const rows = (list || []).slice(0, 10);
  const html = rows.map((row, i) => {
    const mine = row.id === highlightId ? " class=\"mine\"" : "";
    return `<li${mine}><span>${i + 1}</span><span>${escapeHtml(row.name)}</span><span>${row.score}<span class="meters"> ${row.meters}m</span></span></li>`;
  }).join("");
  boardEl.innerHTML = html;
  boardEl.hidden = rows.length === 0;
  titleBoard.innerHTML = html;
  titleBoard.hidden = rows.length === 0;
}

async function refreshTitleBoard() {
  try {
    paintBoard(await fetchBoard());
  } catch {
    titleBoard.hidden = true;
  }
}

async function openBoard() {
  nameForm.hidden = true;
  nameError.hidden = true;
  initials.value = localStorage.getItem("jimmy-bop-name") || "";
  boardStatus.hidden = false;
  boardStatus.textContent = "Checking the board…";
  let scores = [];
  try {
    scores = await fetchBoard();
    paintBoard(scores);
    boardStatus.hidden = true;
  } catch {
    boardStatus.textContent = "The board is out. Your run is still saved on this phone.";
    return;
  }
  if (qualifies(scores, game.score)) {
    nameForm.hidden = false;
    initials.focus();
  }
}

nameForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  e.stopPropagation();
  nameError.hidden = true;
  const name = initials.value;
  try {
    const result = await submitScore({
      name,
      score: game.score,
      meters: game.meters,
      level: game.levelNumber,
      levelName: game.levelName,
      coins: game.coins,
    });
    localStorage.setItem("jimmy-bop-name", name.toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim().slice(0, 10));
    nameForm.hidden = true;
    paintBoard(result.scores, result.saved ? result.scores[result.rank - 1]?.id : "");
    boardStatus.hidden = false;
    boardStatus.textContent = result.saved ? `You're number ${result.rank}.` : "Not quite the top ten. Run it back.";
  } catch (err) {
    nameError.hidden = false;
    nameError.textContent = err.message || "Couldn't save that.";
  }
});

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

function holdButton(id, key, onPress) {
  const el = document.getElementById(id);
  const ids = new Set();
  const press = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    try { el.setPointerCapture(e.pointerId); } catch { /* already captured or a synthetic tap */ }
    const first = ids.size === 0;
    ids.add(e.pointerId);
    held[key] = true;
    if (first && onPress) onPress();
    audio.resume();
  };
  const release = (e) => {
    ids.delete(e.pointerId);
    if (ids.size === 0) held[key] = false;
  };
  el.addEventListener("pointerdown", press);
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);
}

holdButton("btnJump", "jump", () => {
  jumpQueued = true;
});
holdButton("btnSprint", "sprint");
holdButton("btnBrake", "brake");
holdButton("btnDrop", "drop");
holdButton("btnPhin", "phin", () => {
  helpQueued = true;
});

canvas.addEventListener("pointerdown", (e) => {
  if (e.target !== canvas) return;
  if (game.mode === "demo") {
    beginRun();
    return;
  }
  if (game.state === "over") {
    if (!nameForm.hidden) return;
    beginRun();
    return;
  }
  if (game.state === "pause") return;
  canvasPointer = e.pointerId;
  pointerJump = true;
  jumpQueued = true;
});
window.addEventListener("pointerup", (e) => {
  if (e.pointerId === canvasPointer) {
    pointerJump = false;
    canvasPointer = null;
  }
});
window.addEventListener("pointercancel", () => {
  pointerJump = false;
  canvasPointer = null;
});

window.addEventListener("keydown", (e) => {
  if (document.activeElement === initials) return;
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
    if (!keys.jump) jumpQueued = true;
    keys.jump = true;
  }
  if (e.code === "ArrowRight" || e.code === "KeyD") keys.sprint = true;
  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.brake = true;
  if (e.code === "ArrowDown" || e.code === "KeyS") keys.drop = true;
  if ((e.code === "KeyF" || e.code === "KeyH") && !e.repeat) helpQueued = true;
  if (e.code === "KeyP" || e.code === "Escape") togglePause();
  if (e.code === "KeyM") {
    audio.resume();
    const muted = audio.toggle();
    localStorage.setItem("jimmy-bop-mute", muted ? "1" : "0");
  }
  if (e.code === "Enter") {
    if (!nameForm.hidden) return;
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
    jumpHeld: keys.jump || pointerJump || held.jump,
    jumpPressed: jumpQueued,
    sprint: keys.sprint || held.sprint,
    brake: keys.brake || held.brake,
    drop: keys.drop || held.drop,
    help: helpQueued,
  };
  jumpQueued = false;
  helpQueued = false;
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
  draw(ctx, game, { reduceMotion, touch: touchUI });
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
refreshTitleBoard();
requestAnimationFrame(frame);
