// Styled hardsub builder: SRT (+ optional word timestamps) → ASS → ffmpeg burn-in.
// Presets live in ../assets/presets.json; sizes there are fractions of video height so they scale to any resolution.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname, basename } from 'node:path';
import { pickVideoEncoder, encoderVideoArgs } from '../../dubbing/lib/ffmpeg.mjs';

const exec = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));

let _data;
export function presetData() {
  if (!_data) _data = JSON.parse(readFileSync(join(HERE, '..', 'assets', 'presets.json'), 'utf8'));
  return _data;
}
export function listPresets() { return presetData().presets; }
export function findPreset(idOrName) {
  if (!idOrName) return null;
  const k = String(idOrName).trim().toLowerCase();
  return listPresets().find((p) => p.id === k || p.name.toLowerCase() === k) ?? null;
}
export function defaultPresetFor(width, height) {
  const d = presetData().defaults;
  return findPreset(height > width ? d.shortform : d.longform);
}

// ── SRT parsing ─────────────────────────────────────────
const srtTimeToSec = (s) => {
  const m = /(\d+):(\d+):(\d+)[,.](\d+)/.exec(s);
  if (!m) return null;
  return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000;
};
export function parseSrt(text) {
  const cues = [];
  const blocks = text.replace(/^﻿/, '').split(/\r?\n\r?\n+/);
  for (const b of blocks) {
    const lines = b.split(/\r?\n/).filter((l) => l.length);
    const tl = lines.find((l) => l.includes('-->'));
    if (!tl) continue;
    const [a, z] = tl.split('-->');
    const start = srtTimeToSec(a), end = srtTimeToSec(z);
    if (start == null || end == null) continue;
    const textLines = lines.slice(lines.indexOf(tl) + 1);
    if (textLines.length) cues.push({ start, end, textLines });
  }
  return cues;
}

// ── ASS helpers ─────────────────────────────────────────
// ASS color is &HAABBGGRR (AA alpha: 00 opaque, FF transparent). Input is RRGGBB hex + opacity 0..1.
function assColor(rgb, opacity = 1) {
  const r = rgb.slice(0, 2), g = rgb.slice(2, 4), b = rgb.slice(4, 6);
  const aa = Math.round((1 - opacity) * 255).toString(16).padStart(2, '0').toUpperCase();
  return `&H${aa}${b}${g}${r}&`;
}
const assTime = (t) => {
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
};
// Sanitize user text for an ASS event line: strip backslashes and braces (block override injection), newlines → \N.
const assText = (s) => s.replace(/\\/g, '').replace(/[{}]/g, '').replace(/\r?\n/g, '\\N');

function styleLine(p, W, H) {
  const px = (frac) => Math.max(0, Math.round(H * frac));
  const pos = presetData().positions[p.position] ?? presetData().positions.bottom;
  const fontPx = px(p.fontFrac);
  // BorderStyle=3 (opaque box) draws the box in OutlineColour, sized by the Outline value (= chip padding).
  const box = p.box;
  const borderStyle = box ? 3 : 1;
  const outline = box ? Math.max(3, Math.round(fontPx * 0.22)) : px(p.outlineFrac);
  const shadow = box ? 0 : px(p.shadowFrac || 0);
  const outlineColor = box ? assColor(box.color, box.opacity) : assColor(p.outline);
  const back = box ? assColor(box.color, box.opacity) : assColor('000000', 1);
  const marginV = Math.round(H * pos.marginVFrac);
  const font = String(p.font).replace(/[,\r\n{}]/g, ' ').trim(); // commas/newlines would shift or inject Style fields
  // Name,Fontname,Fontsize,Primary,Secondary,Outline,Back,Bold,Italic,U,S,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Align,ML,MR,MV,Enc
  return `Style: Base,${font},${fontPx},${assColor(p.primary)},&H000000FF,${outlineColor},${back},`
    + `${p.bold ? 1 : 0},0,0,0,100,100,0,0,${borderStyle},${outline},${shadow},${pos.an},${Math.round(W * 0.06)},${Math.round(W * 0.06)},${marginV},1`;
}

function header(p, W, H) {
  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${W}
PlayResY: ${H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${styleLine(p, W, H)}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, Effect, Text
`;
}

// Distribute a cue's [a,b] span across its words by weight (fallback when no measured word timings).
function approxWords(words, a, b) {
  const weights = words.map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length + 1);
  const total = weights.reduce((x, y) => x + y, 0) || 1;
  let acc = 0; const out = [];
  for (let i = 0; i < words.length; i++) {
    const s = a + (b - a) * acc / total; acc += weights[i];
    out.push({ word: words[i], start: s, end: a + (b - a) * acc / total });
  }
  return out;
}

// scriptTimestamps JSON (array of {text_original, words:[[{word,start,end}]]}) → flat per-cue word lists.
export function wordCuesFromTimestamps(json) {
  return json.map((seg) => {
    const w = (seg.words || []).flat();
    return { words: w.map((x) => ({ word: String(x?.word ?? '').trim(), start: x.start, end: x.end })).filter((x) => x.word) };
  }).filter((c) => c.words.length);
}

function karaokeEvents(cueWords, p) {
  const H_ON = assColor(p.highlight || '39E639');
  const H_OFF = assColor(p.primary);
  const sc = p.highlightScale || 112;
  let out = '';
  for (const cue of cueWords) {
    const w = cue.words;
    for (let i = 0; i < w.length; i++) {
      const start = w[i].start;
      const end = i < w.length - 1 ? w[i + 1].start : w[i].end; // hold highlight through inter-word gaps
      if (!(end > start)) continue;
      const line = w.map((x, j) => {
        const t = assText(p.uppercase ? x.word.toUpperCase() : x.word);
        return j === i ? `{\\c${H_ON}\\fscx${sc}\\fscy${sc}}${t}{\\c${H_OFF}\\fscx100\\fscy100}` : t;
      }).join(' ');
      out += `Dialogue: 0,${assTime(start)},${assTime(end)},Base,,0,0,,${line}\n`;
    }
  }
  return out;
}

function plainEvents(cues, p) {
  let out = '';
  for (const c of cues) {
    let txt = c.textLines.join('\n');
    if (p.uppercase) txt = txt.toUpperCase();
    out += `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Base,,0,0,,${assText(txt)}\n`;
  }
  return out;
}

/** Build ASS for a preset. For karaoke: wordTimestamps (measured) if given, else approximate from cues. */
export function buildAss(cues, preset, { width, height, wordTimestamps = null }) {
  let events;
  if (preset.karaoke) {
    const cueWords = wordTimestamps
      ? wordCuesFromTimestamps(wordTimestamps)
      : cues.map((c) => ({ words: approxWords(c.textLines.join(' ').split(/\s+/).filter(Boolean), c.start, c.end) }));
    events = karaokeEvents(cueWords, preset);
  } else {
    events = plainEvents(cues, preset);
  }
  return header(preset, width, height) + events;
}

/** Burn an .ass file into a video. Runs ffmpeg with cwd=ass dir + basename filter to dodge Windows drive-letter
 * escaping. fontsDir (optional) is a subfolder of the ass dir holding loose .ttf/.otf files, so a font that isn't
 * installed on the system still renders (ass filter's fontsdir option — relative path for the same escaping reason). */
export async function burn(videoPath, assPath, outPath, { fontsDir = null } = {}) {
  const filter = `ass=${basename(assPath)}${fontsDir ? `:fontsdir=${fontsDir}` : ''}`;
  const mkArgs = (enc) => ['-y', '-hide_banner', '-loglevel', 'error', '-i', videoPath,
    '-vf', filter, ...encoderVideoArgs(enc), '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', outPath];
  const enc = await pickVideoEncoder();
  try {
    await exec('ffmpeg', mkArgs(enc), { cwd: dirname(assPath), maxBuffer: 1 << 20 });
  } catch (e) {
    if (enc === 'libx264') throw e; // HW encoder failed at runtime → retry with libx264
    await exec('ffmpeg', mkArgs('libx264'), { cwd: dirname(assPath), maxBuffer: 1 << 20 });
  }
  return outPath;
}

export function writeAss(content, path) { writeFileSync(path, content, 'utf8'); return path; }

/** Family name from a .ttf/.otf/.ttc file's name table (nameID 16, then 1) — so --font-file users
 * don't have to know the exact family string libass matches on. Returns null if unreadable. */
export function fontFamilyName(fontPath) {
  try {
    const buf = readFileSync(fontPath);
    let base = 0;
    if (buf.toString('latin1', 0, 4) === 'ttcf') base = buf.readUInt32BE(12); // first face of a collection
    const numTables = buf.readUInt16BE(base + 4);
    let nameOff = -1;
    for (let i = 0; i < numTables; i++) {
      const rec = base + 12 + i * 16;
      if (buf.toString('latin1', rec, rec + 4) === 'name') { nameOff = buf.readUInt32BE(rec + 8); break; }
    }
    if (nameOff < 0) return null;
    const count = buf.readUInt16BE(nameOff + 2);
    const strOff = nameOff + buf.readUInt16BE(nameOff + 4);
    let best = null;
    for (let i = 0; i < count; i++) {
      const r = nameOff + 6 + i * 12;
      const platform = buf.readUInt16BE(r), nameId = buf.readUInt16BE(r + 6);
      if (nameId !== 16 && nameId !== 1) continue;
      const len = buf.readUInt16BE(r + 8), off = strOff + buf.readUInt16BE(r + 10);
      const raw = Buffer.from(buf.subarray(off, off + len));
      // platform 3 (Windows) / 0 (Unicode) store UTF-16BE; platform 1 (Mac) is single-byte
      const text = platform === 3 || platform === 0 ? raw.swap16().toString('utf16le') : raw.toString('latin1');
      if (nameId === 16) return text; // typographic family wins immediately
      best = best ?? text;
    }
    return best;
  } catch { return null; }
}
