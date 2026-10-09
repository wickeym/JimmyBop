import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { qualifies } from "../js/board.js";
import { createBot } from "../js/bot.js";
import {
  AIR_TIME,
  GROUND_Y,
  JUMP_V,
  PIT_DEPTH,
  STEP,
  LEVEL_METERS,
  cruiseOf,
  createGame,
  generate,
  jumpReach,
  levelLook,
  pressureOf,
  startRun,
  update,
} from "../js/game.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const failures = [];

function assert(cond, message) {
  if (!cond) failures.push(message);
}

function run(g, seconds, inputFn) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    const input = inputFn ? inputFn(g, STEP) : none();
    update(g, STEP, input);
    if (g.needsReset) break;
  }
  return g;
}

function none() {
  return { jumpHeld: false, jumpPressed: false, sprint: false, brake: false, drop: false };
}

function finishMelt(g) {
  let guard = 0;
  while (g.state === "melt" && guard < 400) {
    update(g, STEP, none());
    guard += 1;
  }
}

assert(html.includes("Created by"), "credits missing the author line");
assert(html.includes(">Silas<"), "credits should name Silas");
assert(html.includes("Jimmy Bop is Phin"), "title should say Jimmy Bop is Phin’s best friend");
assert(html.includes("best friend"), "title should call Jimmy Phin’s best friend");
assert(!html.includes("Williams") && !html.includes("Looper"), "last names should be removed");
assert(AIR_TIME > 0.5 && AIR_TIME < 0.8, `air time out of range: ${AIR_TIME}`);

const layout = createGame(1);
const introPit = layout.segments.find((s) => s.kind === "pit");
const introGap = layout.segments.find((s) => s.kind === "gap");
assert(introPit, "missing tutorial ice pit");
assert(introGap, "missing tutorial gap");
const sprintReach = jumpReach(cruiseOf(0) * 1.25);
assert(introPit.w > sprintReach, `tutorial pit should be unskippable (${introPit.w} vs reach ${sprintReach.toFixed(1)})`);
assert(introGap.w < jumpReach(cruiseOf(0)) * 0.8, "tutorial gap is too wide");
assert(html.includes("F calls Phin"), "title should tell you how to call Phin");
assert(html.includes("id=\"initials\""), "game over should ask for a name");
assert(qualifies([], 10), "an empty board should take the first score");
assert(qualifies([{ score: 5 }], 1), "a short board should stay open");
assert(!qualifies(Array.from({ length: 10 }, (_, i) => ({ score: 100 - i })), 10), "a full board should reject a low score");
assert(qualifies(Array.from({ length: 10 }, (_, i) => ({ score: 100 - i })), 92), "a better score should make the board");

const rescue = startRun(0, 1);
assert(rescue.helps === 1, "Jimmy should start with one ride from Phin");
rescue.player.heat = 92;
run(rescue, STEP, () => ({ ...none(), help: true }));
assert(rescue.helps === 0, "calling Phin should spend the ride");
assert(rescue.phin && rescue.phin.phase === "drop", "Phin should drop out of the sky");
let ranOnSnow = false;
const rescueSteps = Math.round(6.5 / STEP);
for (let i = 0; i < rescueSteps; i++) {
  update(rescue, STEP, none());
  const phin = rescue.phin;
  if (phin && phin.phase === "carry" && Math.abs(phin.y - GROUND_Y) < 3) ranOnSnow = true;
  if (rescue.player.inPit && (!phin || phin.phase === "leap")) break;
}
assert(ranOnSnow, "Phin should run along the snow with Jimmy");
assert(rescue.state === "play", `Phin should not get Jimmy melted (${rescue.state})`);
assert(rescue.player.inPit, "Phin should leave Jimmy in an ice pit");
assert(rescue.player.heat < 70, `the ice should cool him (${rescue.player.heat.toFixed(1)})`);
assert(rescue.player.x - rescue.lavaX > 80, "landing should leave room to hop out");

const earned = startRun(0, 2);
assert(earned.helps === 1, "a fresh run starts with one Phin");
earned.coins = 50;
run(earned, 0.05, () => none());
assert(earned.helps === 2, `50 coins should earn another Phin (${earned.helps})`);
earned.coins = 100;
run(earned, 0.05, () => none());
assert(earned.helps === 3, `100 coins should earn a third Phin (${earned.helps})`);
earned.helps = 0;
run(earned, 0.05, () => ({ ...none(), help: true }));
assert(!earned.phin, "Phin stays up when there are no rides left");

for (const seg of layout.segments) {
  if (seg.kind !== "gap") continue;
  const reach = jumpReach(cruiseOf(pressureOf(seg.x)));
  assert(seg.w < reach * 0.95, `gap at ${seg.x} width ${seg.w} exceeds reach ${reach.toFixed(1)}`);
}

const far = createGame(3);
far.player.x = 150 + LEVEL_METERS * 8 * 4;
generate(far);
const marker = far.segments.find((s) => s.marker && s.marker.level === 2);
assert(marker, "a level 2 distance marker should be built into the world");
assert(levelLook(0).name === "Snowfield" && levelLook(LEVEL_METERS).number === 2, "level names should advance every 350 m");
const cruiseStart = cruiseOf(pressureOf(150));
const cruiseLater = cruiseOf(pressureOf(150 + LEVEL_METERS * 8 * 3));
assert(cruiseLater - cruiseStart >= 50, `speed should keep climbing (${cruiseStart.toFixed(0)} -> ${cruiseLater.toFixed(0)})`);

const afk = startRun(0, 1);
run(afk, 12, () => none());
assert(afk.deathLog.length >= 1, "standing around should get Jimmy melted");
assert(afk.deathLog[0]?.reason === "lava" || afk.deathLog[0]?.reason === "heat", `unexpected afk death ${afk.deathLog[0]?.reason}`);

const pitGame = startRun(0, 1);
const pit = pitGame.segments.find((s) => s.kind === "pit");
pitGame.player.x = pit.x + pit.w * 0.55;
pitGame.player.y = GROUND_Y + PIT_DEPTH;
pitGame.player.vy = 0;
pitGame.player.vx = 0;
pitGame.player.onGround = true;
pitGame.player.inPit = true;
pitGame.player.heat = 88;
pitGame.player.mercy = 0;
pitGame.lavaX = pit.x - 400;
const heatBefore = pitGame.player.heat;
run(pitGame, 1.0, () => none());
assert(pitGame.player.heat < heatBefore - 30, `ice should cool Jimmy fast (${heatBefore} -> ${pitGame.player.heat.toFixed(1)})`);
assert(pitGame.state === "play", "cooling in a safe pit should not kill");

const fall = startRun(0, 1);
const gap = fall.segments.find((s) => s.kind === "gap");
fall.player.x = gap.x + gap.w / 2;
fall.player.y = GROUND_Y;
fall.player.onGround = false;
fall.player.vy = 40;
fall.player.mercy = 0;
fall.lavaX = -500;
run(fall, 2, () => none());
assert(fall.deathLog.some((d) => d.reason === "fall"), "missing a jump should drop Jimmy into lava");

const lives = startRun(0, 4);
run(lives, 8, createBot());
const farX = lives.player.x;
lives.player.mercy = 0;
lives.lavaX = lives.player.x - 2;
run(lives, 0.2, () => none());
assert(lives.state === "melt", "lava touch should start the melt");
const diedAt = lives.deathX;
finishMelt(lives);
assert(lives.player.lives === 2, `expected 2 lives, got ${lives.player.lives}`);
assert(Math.abs(lives.player.x - diedAt) < 520, `respawn should be near the melt (${lives.player.x} vs ${diedAt})`);
assert(lives.player.x > farX - 520, "respawn should not send Jimmy back to the start");
lives.player.mercy = 0;
lives.lavaX = lives.player.x - 2;
run(lives, 0.2, () => none());
finishMelt(lives);
assert(lives.player.lives === 1, `expected 1 life, got ${lives.player.lives}`);
lives.player.mercy = 0;
lives.lavaX = lives.player.x - 2;
run(lives, 0.2, () => none());
finishMelt(lives);
assert(lives.state === "over", "third melt should end the run");

const seeds = [1, 3, 7, 11, 21];
const reports = [];
for (const seed of seeds) {
  const g = startRun(0, seed);
  const bot = createBot();
  run(g, 42, bot);
  assert(g.deathLog.length === 0, `seed ${seed} died in the opening: ${g.deathLog.map((d) => d.reason + "@" + Math.round(d.x)).join(", ")}`);
  run(g, 33, bot);
  reports.push({
    seed,
    state: g.state,
    deaths: g.deathLog.length,
    reasons: g.deathLog.map((d) => `${d.reason}@${Math.round(d.x)}`).join(", "),
    meters: g.meters,
    level: g.levelNumber,
    name: g.levelName,
    pits: g.pitVisits,
    escapes: g.pitEscapes,
    heatMax: Math.round(g.heatMax),
    heatMin: Math.round(g.heatMin),
    minLead: Number.isFinite(g.minLead) ? Math.round(g.minLead) : null,
    coins: g.coins,
    jumps: g.jumps,
  });
  assert(g.levelNumber >= 2, `seed ${seed} never reached level 2 (${g.meters} m)`);
  assert(g.pitVisits >= 2, `seed ${seed} only visited ${g.pitVisits} ice holes`);
  assert(g.heatMax >= 60, `seed ${seed} never got warm (${g.heatMax.toFixed(0)})`);
  assert(g.heatMin <= 40, `seed ${seed} never cooled (${g.heatMin.toFixed(0)})`);
  assert(g.meters > 700, `seed ${seed} only reached ${g.meters} m`);
  assert(g.minLead < 280, `seed ${seed} lava never pressured (lead ${g.minLead})`);
}

console.log("Jimmy Bop playtest");
console.log("jump", JUMP_V, "air", AIR_TIME.toFixed(3), "cruise reach", jumpReach(cruiseOf(0)).toFixed(1), "sprint reach", sprintReach.toFixed(1));
for (const row of reports) console.log(JSON.stringify(row));

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed:`);
  for (const f of failures) console.error(" - " + f);
  process.exit(1);
}
console.log("\nAll playtest checks passed.");
