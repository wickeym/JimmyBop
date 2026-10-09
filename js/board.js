export const BOARD_URL = "https://jimmy-bop-board.wickeym.workers.dev";

export function qualifies(scores, score) {
  if (!Array.isArray(scores) || scores.length < 10) return true;
  return score > scores[scores.length - 1].score;
}

export async function fetchBoard() {
  const response = await fetch(BOARD_URL, { method: "GET" });
  if (!response.ok) throw new Error("board");
  const data = await response.json();
  return Array.isArray(data.scores) ? data.scores : [];
}

export async function submitScore(entry) {
  const response = await fetch(BOARD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entry),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "board");
  return data;
}
