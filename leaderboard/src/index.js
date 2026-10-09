const BOARD_KEY = "board";
const LIMIT = 10;
const ALLOWED = new Set([
  "https://wickeym.github.io",
  "http://127.0.0.1:5179",
  "http://localhost:5179",
]);

function cors(request) {
  const origin = request.headers.get("Origin") || "";
  const allow = ALLOWED.has(origin) ? origin : "https://wickeym.github.io";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(request) },
  });
}

function cleanName(value) {
  const name = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 10);
  return name;
}

function cleanEntry(body) {
  const name = cleanName(body.name);
  const score = Math.floor(Number(body.score));
  const meters = Math.floor(Number(body.meters));
  const level = Math.floor(Number(body.level));
  const coins = Math.floor(Number(body.coins));
  const levelName = String(body.levelName || "").replace(/[^\w ']/g, "").trim().slice(0, 24);
  if (!name) return { error: "Enter a name." };
  if (!Number.isFinite(score) || score < 0 || score > 5000000) return { error: "That score does not count." };
  if (!Number.isFinite(meters) || meters < 0 || meters > 500000) return { error: "That score does not count." };
  if (!Number.isFinite(level) || level < 1 || level > 200) return { error: "That score does not count." };
  if (!Number.isFinite(coins) || coins < 0 || coins > 100000) return { error: "That score does not count." };
  if (score < meters) return { error: "That score does not count." };
  return {
    entry: {
      id: crypto.randomUUID(),
      name,
      score,
      meters,
      level,
      levelName: levelName || `Level ${level}`,
      coins,
      at: Date.now(),
    },
  };
}

function byRank(a, b) {
  return b.score - a.score || b.meters - a.meters || a.at - b.at;
}

async function readBoard(env) {
  const saved = await env.SCORES.get(BOARD_KEY, "json");
  return Array.isArray(saved) ? saved : [];
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(request) });
    }
    if (request.method === "GET") {
      const scores = (await readBoard(env)).sort(byRank).slice(0, LIMIT);
      return json(request, { scores });
    }
    if (request.method !== "POST") return json(request, { error: "Nope." }, 405);

    const ip = request.headers.get("CF-Connecting-IP") || "anon";
    const gateKey = `rate:${ip}`;
    const last = Number(await env.SCORES.get(gateKey));
    if (Number.isFinite(last) && Date.now() - last < 2500) {
      return json(request, { error: "Hang on a second." }, 429);
    }

    let body;
    try {
      const text = await request.text();
      if (text.length > 800) return json(request, { error: "Nope." }, 400);
      body = JSON.parse(text);
    } catch {
      return json(request, { error: "Nope." }, 400);
    }

    const cleaned = cleanEntry(body);
    if (cleaned.error) return json(request, { error: cleaned.error }, 400);

    const board = await readBoard(env);
    board.push(cleaned.entry);
    board.sort(byRank);
    const kept = board.slice(0, LIMIT);
    const saved = kept.some((row) => row.id === cleaned.entry.id);
    await env.SCORES.put(BOARD_KEY, JSON.stringify(kept));
    await env.SCORES.put(gateKey, String(Date.now()), { expirationTtl: 60 });
    const rank = kept.findIndex((row) => row.id === cleaned.entry.id) + 1;
    return json(request, { scores: kept, saved, rank });
  },
};
