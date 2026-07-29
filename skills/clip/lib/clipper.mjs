// Clipper logic: turn an STT project's sentence timeline into short clips at agent-chosen order ranges.
// The script does the mechanical parts (order→time, cut, reframe); the agent picks the ranges.
const sanitize = (s) => (s ? String(s).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) : '');
export { sanitize };

// scriptTimestamps (array of {order, text_original, words:[[{word,start,end}]]}) → Map order → sentence record.
export function orderMap(timestamps) {
  const m = new Map();
  for (const seg of timestamps) {
    const words = (seg.words || []).flat()
      .map((w) => ({ word: String(w?.word ?? '').trim(), start: w.start, end: w.end }))
      .filter((w) => w.word && Number.isFinite(w.start) && Number.isFinite(w.end));
    if (!words.length) continue;
    m.set(seg.order, {
      order: seg.order,
      text: (seg.text_original ?? words.map((w) => w.word).join(' ')).trim(),
      start: words[0].start,
      end: words[words.length - 1].end,
      words,
    });
  }
  return m;
}

// [start,end] seconds spanning start_order..end_order (inclusive). Returns null if either order is missing.
export function clipRange(map, startOrder, endOrder) {
  const a = map.get(startOrder), b = map.get(endOrder);
  if (!a || !b || !(b.end > a.start)) return null;
  return { start: a.start, end: b.end };
}

// Reframe filter for the cut: landscape → 9:16 letterbox (drama-shorts), else keep. Returns {filter, width, height}.
export function reframe(w, h) {
  if (w > h) return { filter: 'scale=1080:-2,pad=1080:1920:0:(1920-ih)/2:color=black', width: 1080, height: 1920 };
  return { filter: null, width: w, height: h };
}

// Cues for the clip's own subtitles, times re-based so the clip starts at 0.
export function clipCues(map, startOrder, endOrder, t0) {
  const cues = [];
  for (let o = startOrder; o <= endOrder; o++) {
    const s = map.get(o);
    if (s) cues.push({ start: Math.max(0, s.start - t0), end: Math.max(0, s.end - t0), textLines: [s.text] });
  }
  return cues;
}

// scriptTimestamps-shaped subset for the clip (re-based) so karaoke can use measured word timing.
export function clipTimestamps(map, startOrder, endOrder, t0) {
  const out = [];
  for (let o = startOrder; o <= endOrder; o++) {
    const s = map.get(o);
    if (!s) continue;
    out.push({ order: s.order, text_original: s.text, words: [s.words.map((w) => ({ word: `${w.word} `, start: Math.max(0, w.start - t0), end: Math.max(0, w.end - t0) }))] });
  }
  return out;
}
