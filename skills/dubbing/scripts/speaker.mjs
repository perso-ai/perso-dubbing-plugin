#!/usr/bin/env node
// /speaker — assign a NEW SPEAKER to specific sentence(s) of a dubbing project.
//   project ref → space (auto-locate) → dubbing-only gate → read script (retry) → match target(s) → confirm/write → verify.
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { preloadKeyEnv } from './resolve_key.mjs';
import { ExitCode, UsageError, ensureKey, ensureSpace, friendlyError, errorClass, errorCode } from '../lib/gates.mjs';
import { findSpaceForProject, spacePlanProps } from '../lib/space.mjs';
import { getProjectDetail, getProjectScript, addSpeakerFromSentence } from '../lib/api_adapter.mjs';
import { projectUrl } from '../lib/messages.mjs';
import { track, initTelemetry, setTelemetrySpace, setAgentHost, setKeyUsed } from '../lib/telemetry.mjs';

const notify = (m) => console.log('[progress] ' + m);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const USAGE = [
  'Usage: node scripts/speaker.mjs "<project URL|projectSeq>" --at "5s,22s,98s" [--space "space name"] [--host <agent>]',
  '       node scripts/speaker.mjs "<project URL|projectSeq>" --text "first sentence|second sentence"',
  '       node scripts/speaker.mjs "<project URL|projectSeq>" --sentence 1234,1288,1301',
  '       node scripts/speaker.mjs "<project URL|projectSeq>" --list',
  '',
  '  --at        comma-separated timecodes/ranges (mm:ss, hh:mm:ss, 12.5s, 4120ms, bare N=seconds); a bare time means',
  '              the sentence STARTING at that time (falls back to the sentence containing it); a range is "00:04-00:08"',
  '  --text      pipe-separated quoted text to match against the original/translated sentences',
  '  --sentence  comma-separated sentence reference numbers (from a prior [sentence-select] re-run)',
  '  --list      print every sentence in the project (time label + text) — no write',
].join('\n');

function parseArgs(argv) {
  const a = { inputs: [] };
  const VALUE_FLAGS = { '--at': 'at', '--text': 'text', '--sentence': 'sentence', '--space': 'space', '--host': 'host' };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--help' || t === '-h') a.help = true;
    else if (t === '--list') a.list = true;
    else if (t in VALUE_FLAGS) {
      const v = argv[++i];
      if (v === undefined || v.startsWith('--')) throw new UsageError(`Missing value for ${t}`);
      a[VALUE_FLAGS[t]] = v;
    } else if (t.startsWith('--')) {
      throw new UsageError(`Unknown option: ${t}`);
    } else a.inputs.push(t);
  }
  return a;
}

// ── project reference parsing ──────────────────────────
const KIND_LABEL = { STT: 'subtitle (STT) project', AUDIO_SEPARATION: 'audio-separation project', LIP_SYNC: 'lip-sync project' };
const article = (label) => (/^[aeiou]/i.test(label) ? 'an' : 'a');

// A full URL immediately reveals a non-dubbing kind for stt/audio-separation (no network call needed).
// A /vt/detail/<seq> URL can still be a lip-sync project (same path as dubbing) — resolved after fetching detail.
function parseProjectRef(raw) {
  const s = String(raw ?? '').trim();
  if (/^\d+$/.test(s)) return { seq: Number(s) };
  const m = /\/vt\/(detail|stt|audio-separation)\/(\d+)/.exec(s);
  if (!m) throw new UsageError(`Could not find a project reference in "${raw}" — pass a Perso project URL or a bare project number.`);
  const seq = Number(m[2]);
  if (m[1] === 'stt') return { seq, blocked: KIND_LABEL.STT };
  if (m[1] === 'audio-separation') return { seq, blocked: KIND_LABEL.AUDIO_SEPARATION };
  return { seq };
}

function notDubbingMessage(detail) {
  if (detail.projectGenerationType === 'DUBBING' && detail.isEditable !== false) return null;
  const label = KIND_LABEL[detail.projectGenerationType] ?? 'non-dubbing project';
  return `This is ${article(label)} ${label}, not a dubbing project — speaker assignment only works on dubbing projects.`;
}

// --space/PERSO_SPACE_SEQ → resolve that space directly (normal ensureSpace gate). Otherwise auto-locate
// the project across every accessible space instead of asking the user which one to use.
async function resolveProjectAndSpace(seq, args) {
  const pinnedEnv = Number(process.env.PERSO_SPACE_SEQ) || 0;
  const hasHint = String(args.space ?? '').trim() !== '' || pinnedEnv > 0;
  if (hasHint) {
    const spaceSeq = await ensureSpace(args);
    setTelemetrySpace(spaceSeq);
    try {
      const detail = await getProjectDetail(seq, spaceSeq);
      return { spaceSeq, detail };
    } catch (e) {
      if (e?.name === 'PersoApiError' && (e.httpStatus === 403 || e.httpStatus === 404)) return { spaceSeq, detail: null };
      throw e;
    }
  }
  const found = await findSpaceForProject(seq);
  if (!found) return { spaceSeq: null, detail: null };
  setTelemetrySpace(found.spaceSeq);
  return found;
}

// ── time parsing ────────────────────────────────────────
// mm:ss / hh:mm:ss / 12.5s / 4120ms / bare integer = SECONDS (an agent passing "5" means 5 seconds).
function parseTimeToMs(raw) {
  const s = String(raw).trim();
  let m;
  if ((m = /^(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/.exec(s))) return (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) * 1000;
  if ((m = /^(\d+):(\d{1,2}(?:\.\d+)?)$/.exec(s))) return (Number(m[1]) * 60 + Number(m[2])) * 1000;
  if ((m = /^(\d+(?:\.\d+)?)ms$/i.exec(s))) return Number(m[1]);
  if ((m = /^(\d+(?:\.\d+)?)s$/i.exec(s))) return Number(m[1]) * 1000;
  if (/^\d+$/.test(s)) return Number(s) * 1000;
  return null;
}
// A single time value never contains '-' in any accepted format, so any '-' means a range.
function parseTimeSpec(raw) {
  const s = String(raw).trim();
  const dash = s.indexOf('-');
  if (dash > 0) {
    const a = parseTimeToMs(s.slice(0, dash));
    const b = parseTimeToMs(s.slice(dash + 1));
    if (a != null && b != null) return { type: 'range', startMs: a, endMs: b };
  }
  const ms = parseTimeToMs(s);
  return ms != null ? { type: 'point', ms } : null;
}

// ── display labels (must match the Perso UI) ────────────
function fmtTime(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), sec = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
const timeRangeOnly = (sent) => `${fmtTime(sent.offsetMs)} - ${fmtTime(sent.offsetMs + sent.durationMs)}`;
const sentenceLabel = (sent) => `${timeRangeOnly(sent)}  (${(sent.durationMs / 1000).toFixed(2)}s)`;
const truncate = (s, max = 40) => { const t = String(s ?? '').trim(); return t.length > max ? t.slice(0, max) + '…' : t; };

// Effective text precedence chain (do not branch on "was it edited").
function effectiveText(sent) {
  const original = sent.originalDraftText || sent.proofRead?.originalText || sent.originalText;
  const translated = sent.translatedText || sent.proofRead?.translatedText;
  return { original, translated };
}

// ── text matching ───────────────────────────────────────
const normalizeText = (s) => String(s ?? '')
  .normalize('NFKC')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}\s]/gu, ' ') // strip punctuation
  .replace(/\s+/g, ' ')
  .trim();

function matchByText(sentences, query) {
  const q = normalizeText(query);
  const exact = [], substr = [];
  for (const s of sentences) {
    const { original, translated } = effectiveText(s);
    const no = normalizeText(original), nt = normalizeText(translated);
    if (no === q || (nt && nt === q)) exact.push(s);
    else if ((no && no.includes(q)) || (nt && nt.includes(q))) substr.push(s);
  }
  return { matches: exact.length ? exact : substr };
}

// Word-overlap (Jaccard) similarity — used only to suggest candidates when a text query hits nothing.
function textSimilarity(a, b) {
  const wa = new Set(a.split(' ').filter(Boolean)), wb = new Set(b.split(' ').filter(Boolean));
  if (!wa.size || !wb.size) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  return inter / (wa.size + wb.size - inter);
}
function nearestTextCandidates(sentences, query, limit = 5) {
  const q = normalizeText(query);
  return sentences
    .map((s) => {
      const { original, translated } = effectiveText(s);
      const score = Math.max(textSimilarity(q, normalizeText(original)), translated ? textSimilarity(q, normalizeText(translated)) : 0);
      return { s, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.s);
}

// ── time matching ───────────────────────────────────────
// Point resolution, tiered (the Perso UI labels every sentence by its START, so a bare time means
// "the sentence that starts here", not "some moment inside a sentence"):
//   1) START MATCH — sentence(s) whose displayed start second equals T's second. Wins outright: one hit
//      resolves, more than one is ambiguous (candidates), and either way tiers 2/3 are skipped.
//   2) CONTAINMENT — no sentence starts at that second: fall back to T falling inside a sentence's span
//      (keeps mid-sentence times working, e.g. "04:52" inside a sentence running 04:49 - 04:58).
//   3) NEAREST — still nothing: sentences within 1500ms, offered as ambiguous candidates.
// candidates carries which tier produced it ('start' | 'gap') so the caller can print an accurate note —
// a tier-1 multi-hit is NOT a gap, it's several sentences that all start at the same displayed second.
function matchByTime(sentences, ms) {
  const wantSec = Math.floor(ms / 1000);
  const startHits = sentences.filter((s) => Math.floor(s.offsetMs / 1000) === wantSec);
  if (startHits.length === 1) return { matches: startHits };
  if (startHits.length > 1) return { matches: [], candidates: startHits, tier: 'start' };

  const hit = sentences.find((s) => ms >= s.offsetMs && ms < s.offsetMs + s.durationMs);
  if (hit) return { matches: [hit] };

  const scored = sentences
    .map((s) => {
      const end = s.offsetMs + s.durationMs;
      const dist = ms < s.offsetMs ? s.offsetMs - ms : ms >= end ? ms - end : 0;
      return { s, dist };
    })
    .filter((x) => x.dist <= 1500)
    .sort((a, b) => a.dist - b.dist);
  return { matches: [], candidates: scored.map((x) => x.s), tier: 'gap' };
}
function matchByRange(sentences, startMs, endMs) {
  const wantStart = Math.floor(startMs / 1000), wantEnd = Math.floor(endMs / 1000);
  const exact = sentences.filter((s) => Math.floor(s.offsetMs / 1000) === wantStart && Math.floor((s.offsetMs + s.durationMs) / 1000) === wantEnd);
  if (exact.length) return { matches: exact };
  return { matches: sentences.filter((s) => s.offsetMs < endMs && s.offsetMs + s.durationMs > startMs) };
}

// ── target resolution ───────────────────────────────────
function buildRequestedTargets(args) {
  const list = [];
  if (args.at) for (const raw of String(args.at).split(',').map((x) => x.trim()).filter(Boolean)) list.push({ type: 'time', raw });
  if (args.text) for (const raw of String(args.text).split('|').map((x) => x.trim()).filter(Boolean)) list.push({ type: 'text', raw });
  if (args.sentence) for (const raw of String(args.sentence).split(',').map((x) => x.trim()).filter(Boolean)) list.push({ type: 'seq', raw });
  return list;
}
function matchModeOf(targets) {
  const types = new Set(targets.map((t) => t.type));
  if (!types.size) return null;
  return types.size > 1 ? 'mixed' : [...types][0];
}

function resolveOne(target, sentences) {
  if (target.type === 'seq') {
    const n = Number(target.raw);
    const hit = sentences.find((s) => s.seq === n);
    return hit ? { status: 'resolved', sentence: hit, raw: target.raw }
      : { status: 'unmatched', candidates: [], raw: target.raw, note: 'does not match any sentence reference number' };
  }
  if (target.type === 'text') {
    const { matches } = matchByText(sentences, target.raw);
    if (matches.length === 1) return { status: 'resolved', sentence: matches[0], raw: target.raw };
    if (matches.length > 1) return { status: 'ambiguous', candidates: matches, raw: target.raw, note: 'matches more than one sentence' };
    return { status: 'unmatched', candidates: nearestTextCandidates(sentences, target.raw), raw: target.raw, note: 'did not match any sentence — nearest candidates' };
  }
  const spec = parseTimeSpec(target.raw);
  if (!spec) return { status: 'unmatched', candidates: [], raw: target.raw, note: 'could not be parsed as a time' };
  if (spec.type === 'point') {
    const { matches, candidates, tier } = matchByTime(sentences, spec.ms);
    if (matches.length === 1) return { status: 'resolved', sentence: matches[0], raw: target.raw };
    if (candidates?.length) {
      const note = tier === 'start' ? 'matches more than one sentence starting at that time' : 'falls between two segments';
      return { status: 'ambiguous', candidates, raw: target.raw, note };
    }
    return { status: 'unmatched', candidates: [], raw: target.raw, note: 'does not fall within any sentence' };
  }
  const { matches } = matchByRange(sentences, spec.startMs, spec.endMs);
  if (matches.length === 1) return { status: 'resolved', sentence: matches[0], raw: target.raw };
  if (matches.length > 1) return { status: 'ambiguous', candidates: matches, raw: target.raw, note: 'overlaps more than one sentence' };
  return { status: 'unmatched', candidates: [], raw: target.raw, note: 'does not overlap any sentence' };
}

// Collapse targets that resolve to the same sentence (double-write prevention); ambiguous/unmatched
// targets can't provably be duplicates of each other so they are kept as separate entries.
function mergeResolved(results) {
  const seen = new Map();
  const unresolved = [];
  for (const r of results) {
    if (r.status === 'resolved') { if (!seen.has(r.sentence.seq)) seen.set(r.sentence.seq, r); }
    else unresolved.push(r);
  }
  return { resolved: [...seen.values()], unresolved };
}

// Print a JSON map of displayed-number -> sentenceSeq right after a numbered block. This is the agent's
// own lookup table (never shown to / read aloud to the user — the numbered lines above it are the safe,
// relay-as-is part); keyed by the SAME number the user sees, so "the user picked 2" maps to a value with
// no counting required. Kept off the human lines by structure, not by instruction.
const sentenceRefLine = (numberedSentences) => {
  const ref = {};
  numberedSentences.forEach((s, i) => { ref[String(i + 1)] = s.seq; });
  return `[sentence-ref] ${JSON.stringify(ref)}`;
};

function printUnresolved(r) {
  if (r.candidates?.length) {
    console.log(`[sentence-select] "${r.raw}" ${r.note} — ask the user which one:`);
    r.candidates.forEach((s, i) => console.log(`  ${i + 1}) ${sentenceLabel(s)}  "${truncate(effectiveText(s).original)}"`));
    console.log(sentenceRefLine(r.candidates));
  } else {
    console.log(`[sentence-select] "${r.raw}" ${r.note} — ask the user for a different target.`);
  }
}

function printList(sentences) {
  console.log(`${sentences.length} sentence${sentences.length === 1 ? '' : 's'}:`);
  for (const s of sentences) {
    const { original, translated } = effectiveText(s);
    const line = [`  ${sentenceLabel(s)}`, `"${truncate(original, 60)}"`];
    if (translated) line.push(`→ "${truncate(translated, 60)}"`);
    console.log(line.join('  '));
  }
}

// ── write ────────────────────────────────────────────────
async function postWithRetry(seq, spaceSeq, sentenceSeq) {
  const delays = [1000, 3000];
  for (let attempt = 0; ; attempt++) {
    try {
      return await addSpeakerFromSentence(seq, spaceSeq, sentenceSeq);
    } catch (e) {
      const retryable = e?.name === 'PersoApiError' && (e.httpStatus === 429 || e.httpStatus >= 500);
      if (!retryable || attempt >= delays.length) throw e;
      await sleep(delays[attempt]);
    }
  }
}
// One [speaker-added] line per created sentence. The POST response never carries the new speaker's
// identity (verified live), so bySeq (from the post-write script re-fetch, which already runs
// unconditionally for verification) is the only source; null bySeq (the re-fetch itself failed) falls
// back to the generic label.
function reportCreated(created, bySeq) {
  for (const s of created) {
    const idx = bySeq?.get(s.seq)?.speakerOrderIndex ?? null;
    console.log(`[speaker-added] ${JSON.stringify({ label: timeRangeOnly(s), speaker: idx != null ? `Speaker ${idx}` : 'new speaker' })}`);
  }
}

async function trackAdd(spaceSeq, matchMode, requestedCount, addedCount, failedCount) {
  track('speaker_add', {
    match_mode: matchMode,
    requested_count: requestedCount,
    added_count: addedCount,
    failed_count: failedCount,
    ...(spaceSeq ? await spacePlanProps(spaceSeq) : {}),
  });
}

// ── main run ─────────────────────────────────────────────
async function run(args) {
  await ensureKey();
  const ref = parseProjectRef(args.inputs[0]);
  if (ref.blocked) {
    console.log(`This is ${article(ref.blocked)} ${ref.blocked}, not a dubbing project — speaker assignment only works on dubbing projects.`);
    track('speaker_blocked', { reason: 'not_dubbing' });
    throw new ExitCode(1);
  }

  const { spaceSeq, detail } = await resolveProjectAndSpace(ref.seq, args);
  if (!spaceSeq || !detail) {
    console.log('[project-check] Could not find this project in any accessible workspace — ask the user to confirm the project link.');
    track('speaker_blocked', { reason: 'not_found' });
    throw new ExitCode(0);
  }

  const gateMsg = notDubbingMessage(detail);
  if (gateMsg) {
    console.log(gateMsg);
    track('speaker_blocked', { reason: 'not_dubbing' });
    throw new ExitCode(1);
  }

  notify('Reading the project script…');
  let script = await getProjectScript(ref.seq, spaceSeq);
  if (!script.sentences.length) {
    for (const delay of [2000, 5000]) {
      await sleep(delay);
      script = await getProjectScript(ref.seq, spaceSeq);
      if (script.sentences.length) break;
    }
  }
  if (!script.sentences.length) {
    const reason = detail.progressReason;
    const msg = reason === 'Failed'
      ? 'The project finished with a failure, so its script is not available.'
      : reason === 'Completed'
        ? 'The script could not be read right now. Try again in a moment.'
        : 'The project is still being generated — try again once it finishes.';
    console.log(`[script-unavailable] ${msg}`);
    const project_status = reason === 'Failed' ? 'failed' : reason === 'Completed' ? 'completed' : reason ? 'processing' : 'unknown';
    track('speaker_blocked', { reason: 'script_unavailable', project_status });
    throw new ExitCode(0);
  }

  if (args.list) { printList(script.sentences); return; }

  const requested = buildRequestedTargets(args);
  const matchMode = matchModeOf(requested);
  if (!requested.length) {
    console.log('[sentence-select] No target given — ask the user which sentence(s) should get a new speaker (by time, quoted text, or run with --list to browse), then re-run with --at/--text/--sentence.');
    await trackAdd(spaceSeq, matchMode, 0, 0, 0);
    throw new ExitCode(0);
  }

  const results = requested.map((t) => resolveOne(t, script.sentences));
  const { resolved, unresolved } = mergeResolved(results);
  const requestedCount = resolved.length + unresolved.length;

  if (unresolved.length) {
    if (resolved.length) {
      console.log(`[speaker-resolve] ${resolved.length} of ${requestedCount} resolved. Nothing added yet — ask about the rest, then re-run with --sentence (carrying forward these already-resolved targets too):`);
      const resolvedSentences = [...resolved].sort((a, b) => a.sentence.offsetMs - b.sentence.offsetMs).map((r) => r.sentence);
      resolvedSentences.forEach((s, i) => console.log(`  ${i + 1}) ${timeRangeOnly(s)}  "${truncate(effectiveText(s).original)}"`));
      console.log(sentenceRefLine(resolvedSentences));
    }
    // Each unresolved target prints its own [sentence-select] group + [sentence-ref] — the numbering
    // (and so the ref keys) restarts per group; they must never be read across groups.
    for (const r of unresolved) printUnresolved(r);
    await trackAdd(spaceSeq, matchMode, requestedCount, 0, 0);
    throw new ExitCode(0);
  }

  // Every target resolved cleanly. Sort by timeline so server-assigned speaker order follows it.
  const targets = resolved.map((r) => r.sentence).sort((a, b) => a.offsetMs - b.offsetMs);

  if (targets.length > 10) {
    console.log(`[speaker-confirm] ${targets.length} speakers would be added — confirm with the user before writing:`);
    targets.forEach((s, i) => console.log(`  ${i + 1}) ${sentenceLabel(s)}  "${truncate(effectiveText(s).original)}"`));
    console.log(sentenceRefLine(targets));
    console.log('On confirmation, re-run with --sentence containing exactly these targets.');
    await trackAdd(spaceSeq, matchMode, requestedCount, 0, 0);
    throw new ExitCode(0);
  }

  notify(`Adding ${targets.length} speaker${targets.length > 1 ? 's' : ''}:`);
  targets.forEach((s, i) => console.log(`  ${i + 1}) ${sentenceLabel(s)}  "${truncate(effectiveText(s).original)}"`));

  const before = new Map(targets.map((s) => [s.seq, s.speakerOrderIndex]));
  const created = []; // sentences whose POST succeeded — identity is learned entirely from the re-fetch below
  let added = 0;
  for (let i = 0; i < targets.length; i++) {
    const s = targets[i];
    try {
      await postWithRetry(ref.seq, spaceSeq, s.seq);
    } catch (e) {
      // Report identities for what already succeeded before surfacing the failure — one re-fetch, best-effort.
      let bySeq = null;
      try { const rs = await getProjectScript(ref.seq, spaceSeq); bySeq = new Map(rs.sentences.map((x) => [x.seq, x])); } catch { /* ignore */ }
      reportCreated(created, bySeq);
      const remaining = targets.slice(i).map((x) => x.seq).join(',');
      console.log(`Failed to add a speaker for ${sentenceLabel(s)}: ${friendlyError(e)}`);
      console.log(`${added} of ${targets.length} added. Re-run with the rest:`);
      console.log(`  node scripts/speaker.mjs "${projectUrl(ref.seq, 'dub')}" --sentence ${remaining}`);
      await trackAdd(spaceSeq, matchMode, requestedCount, added, requestedCount - added);
      track('error', { error_class: errorClass(e), code: errorCode(e), mode: 'speaker' });
      throw new ExitCode(1);
    }
    added++;
    created.push(s);
  }

  // Re-fetch once: fills any speaker identity the POST response didn't reveal, and confirms the effect
  // (speakerOrderIndex changed, or the speakers list grew).
  let after = null;
  try { after = await getProjectScript(ref.seq, spaceSeq); } catch { /* best-effort — writes already succeeded */ }
  const bySeq = after ? new Map(after.sentences.map((s) => [s.seq, s])) : null;
  reportCreated(created, bySeq);

  let changed = 0;
  if (bySeq) for (const [seq, idx] of before) { const now = bySeq.get(seq)?.speakerOrderIndex; if (now !== undefined && now !== idx) changed++; }
  if (changed > 0) {
    console.log(changed === 1 ? 'Verified: 1 segment now uses a new speaker.' : `Verified: ${changed} segments now use the new speakers.`);
  } else if (after && after.speakers.length > script.speakers.length) {
    console.log(`Verified: the project now has ${after.speakers.length} speakers (was ${script.speakers.length}).`);
  } else {
    console.log('Could not verify the change — check the project in Perso.');
  }

  await trackAdd(spaceSeq, matchMode, requestedCount, added, 0);
}

async function main() {
  let exitCode = 0;
  try {
    preloadKeyEnv(); // pre-inject the key into env before async (at a clean point)
    const args = parseArgs(process.argv.slice(2));
    if (args.host) setAgentHost(args.host); // agent self-report (telemetry only) — before any track()
    setKeyUsed(true); // speaker operations run against a Perso project → key always used
    if (args.help) console.log(USAGE);
    else {
      initTelemetry();
      if (!args.inputs.length) throw new UsageError('Missing project reference (URL or projectSeq).');
      await run(args);
    }
  } catch (e) {
    if (e?.name === 'ExitCode') exitCode = e.code; // message already printed at the throw site
    else if (e?.name === 'UsageError') { console.error(`${e.message}\n${USAGE}`); exitCode = 1; }
    else { track('error', { error_class: errorClass(e), code: errorCode(e), mode: 'speaker' }); console.error(friendlyError(e)); exitCode = 1; }
  }
  process.exitCode = exitCode;
  // Natural exit (loop drain) — process.exit() while fetch sockets are closing hits a Windows libuv assert
  // (async.c) that corrupts the exit code. The unref'd timer is a hard-exit fallback if a handle ever hangs.
  setTimeout(() => process.exit(exitCode), 5000).unref();
}

// Pure helper exports for testing (when run directly, only main below executes).
export {
  parseArgs, parseProjectRef, notDubbingMessage, parseTimeToMs, parseTimeSpec, fmtTime, sentenceLabel, timeRangeOnly,
  effectiveText, normalizeText, matchByText, matchByTime, matchByRange, buildRequestedTargets, matchModeOf,
  resolveOne, mergeResolved, reportCreated, sentenceRefLine,
};

// main only when run directly (CLI). realpath both sides so a symlink/junction install still runs main.
const isMain = (() => {
  if (!process.argv[1]) return false;
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) await main();
