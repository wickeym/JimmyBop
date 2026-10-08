import { jumpReach, lookAhead } from "./game.js";

// A careful autoplayer used for the title-screen demo and for playtests.
export function createBot() {
  let hold = 0;
  let prev = false;
  return function bot(g, dt) {
    const p = g.player;
    const look = lookAhead(g);
    if (!g.phin && g.helps > 0 && g.mode === "run") {
      const cooked = p.heat > 86;
      const caught = !p.inPit && look.lead < 46 && p.mercy <= 0;
      if (cooked || caught) {
        return { jumpHeld: false, jumpPressed: false, sprint: false, brake: false, drop: false, help: true };
      }
    }
    let want = false;
    let sprint = false;
    let drop = false;

    if (p.inPit) {
      const fill = look.pitHere ? look.pitHere.fill : 0;
      want = p.heat < 30 || fill > 0.48 || look.lead < 78;
    } else if (p.onGround) {
      const spd = Math.max(p.vx, look.cruise * 0.98);
      const pitNear = look.pit && look.pit.dist < 36 && look.pit.dist > -8;
      const soak = pitNear && (!look.pit.skippable || p.heat > 40);
      if (soak) {
        want = false;
        drop = look.pit.dist < 24;
      } else if (look.gap && look.gap.dist > 0) {
        const maxDist = Math.min(48, jumpReach(spd) - look.gap.w - 6);
        if (look.gap.dist < maxDist && look.gap.dist > 3) want = true;
      }
      if (!want && !soak && look.obs && look.obs.dist < 40 && look.obs.dist > 6 && p.y > look.obs.top + 3) {
        want = true;
      }
      if (!want && pitNear && look.pit.skippable && p.heat <= 40) {
        const maxDist = Math.min(42, jumpReach(spd) - look.pit.w - 8);
        if (look.pit.dist < maxDist && look.pit.dist > 4) want = true;
      }
    }

    if (p.inPit) sprint = false;
    else if (look.lead < 210) sprint = true;
    else if (p.heat < 48 && !(look.pit && look.pit.dist < 160 && p.heat > 60)) sprint = true;

    if (want) hold = Math.max(hold, p.inPit ? 0.22 : 0.4);
    const jumpHeld = hold > 0;
    hold = Math.max(0, hold - dt);
    const jumpPressed = jumpHeld && !prev;
    prev = jumpHeld;
    return { jumpHeld, jumpPressed, sprint, brake: false, drop };
  };
}
