// Shared [status] heartbeat: a coarse "still working" line for the agent to relay to chat.
// Stage + item counts only — never a percentage, elapsed time, or ETA (user-facing rule).
// First line ~3 min after start, then every intervalMs; the `next check ~Nm` hint tells the
// relaying agent when to look again. tick(textFn) is cheap to call on every poll — it prints
// only when due and asks for the text lazily so callers don't build a string each poll.
const FIRST_DELAY_MS = 3 * 60_000;

// Media length → check cadence: ≤10 min → every 10 min, longer → every 30 min (unknown → 10 min).
export const statusIntervalMs = (sec) => ((sec != null && sec > 600) ? 30 : 10) * 60_000;

export function makeStatusTicker(intervalMs) {
  const hint = `next check ~${Math.round(intervalMs / 60_000)}m`;
  let nextAt = Date.now() + FIRST_DELAY_MS;
  return {
    tick(textFn) {
      if (Date.now() < nextAt) return;
      nextAt = Date.now() + intervalMs;
      let text = '';
      try { text = textFn() ?? ''; } catch { /* status text must never break the run */ }
      if (text) console.log(`[status] ${text} | ${hint}`);
    },
  };
}
