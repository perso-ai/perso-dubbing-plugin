#!/usr/bin/env node
// Bake per-locale copy into the static HTML.
//
// The landing page ships Korean markup and swaps 100+ elements to the target
// language in the browser via applyLang(). Crawlers read the first HTML pass,
// so every locale was being indexed as Korean. This writes the translated copy
// straight into docs/<locale>/index.html at build time; applyLang() stays in
// place as a runtime fallback and simply re-applies identical text.
//
// docs/ko/index.html is the translation source and is never rewritten.
//
// Usage: node scripts/prerender-locales.mjs [--check]

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Locale -> file. Korean is the source copy, so it is not listed.
const TARGETS = [
  { lang: "en", file: "docs/index.html" },
  { lang: "es", file: "docs/es/index.html" },
  { lang: "pt", file: "docs/pt/index.html" },
];

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);
// Raw-text elements: their content may contain "<" and must not be parsed.
const RAW_TAGS = new Set(["script", "style"]);

/** Pull the `var S = {...}` translation dictionary out of the page. */
function extractDict(html) {
  const anchor = html.indexOf("var S = {");
  if (anchor === -1) throw new Error("translation dictionary (var S) not found");

  const start = html.indexOf("{", anchor);
  let depth = 0;
  let inStr = false;
  let quote = "";

  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (c === "\\") i++;
      else if (c === quote) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; quote = c; continue; }
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      return JSON.parse(html.slice(start, i + 1));
    }
  }
  throw new Error("translation dictionary is not balanced");
}

/**
 * Walk the markup and record the innerHTML span of every element carrying a
 * data-i key, plus <title> and the typing-demo line. Nesting is tracked with a
 * stack so elements containing same-named children resolve correctly.
 */
function collectSlots(html) {
  const slots = [];
  const stack = [];
  let i = 0;

  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) break;

    // Comments and doctype carry no elements.
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith("<!", lt)) {
      const end = html.indexOf(">", lt);
      i = end === -1 ? html.length : end + 1;
      continue;
    }

    // Closing tag.
    if (html[lt + 1] === "/") {
      const end = html.indexOf(">", lt);
      if (end === -1) break;
      const name = html.slice(lt + 2, end).trim().toLowerCase();
      for (let s = stack.length - 1; s >= 0; s--) {
        if (stack[s].name !== name) continue;
        const open = stack[s];
        if (open.key !== null || open.id === "type-line" || name === "title") {
          slots.push({
            key: open.key,
            id: open.id,
            tag: name,
            start: open.innerStart,
            end: lt,
          });
        }
        stack.length = s;
        break;
      }
      i = end + 1;
      continue;
    }

    // Opening tag: find ">" while skipping quoted attribute values.
    const nameMatch = /^<([a-zA-Z][a-zA-Z0-9]*)/.exec(html.slice(lt, lt + 32));
    if (!nameMatch) { i = lt + 1; continue; }
    const name = nameMatch[1].toLowerCase();

    let j = lt + 1 + name.length;
    let inStr = false;
    let quote = "";
    for (; j < html.length; j++) {
      const c = html[j];
      if (inStr) { if (c === quote) inStr = false; continue; }
      if (c === '"' || c === "'") { inStr = true; quote = c; continue; }
      if (c === ">") break;
    }
    const openTag = html.slice(lt, j + 1);
    const innerStart = j + 1;

    if (VOID_TAGS.has(name) || openTag.endsWith("/>")) { i = innerStart; continue; }

    // Skip raw-text content wholesale — the dictionary lives inside <script>.
    if (RAW_TAGS.has(name)) {
      const close = html.toLowerCase().indexOf(`</${name}`, innerStart);
      i = close === -1 ? html.length : close;
      continue;
    }

    const key = /\sdata-i="([^"]+)"/.exec(openTag)?.[1] ?? null;
    const id = /\sid="([^"]+)"/.exec(openTag)?.[1] ?? null;
    stack.push({ name, key, id, innerStart });
    i = innerStart;
  }

  return slots;
}

function prerender(html, lang) {
  const dict = extractDict(html);
  const table = dict[lang];
  if (!table) throw new Error(`dictionary has no "${lang}" entry`);

  const slots = collectSlots(html);
  const missing = new Set();
  let replaced = 0;

  // Apply back-to-front so earlier offsets stay valid.
  const ordered = slots.sort((a, b) => b.start - a.start);
  let out = html;

  for (const slot of ordered) {
    let value;
    if (slot.tag === "title") value = table._title;
    else if (slot.key) value = table[slot.key];
    else if (slot.id === "type-line") value = table._type;

    if (value == null) {
      if (slot.key) missing.add(slot.key);
      continue;
    }
    if (out.slice(slot.start, slot.end) === value) continue;
    out = out.slice(0, slot.start) + value + out.slice(slot.end);
    replaced++;
  }

  return { out, replaced, missing: [...missing] };
}

const checkOnly = process.argv.includes("--check");
let failed = false;

for (const { lang, file } of TARGETS) {
  const path = resolve(ROOT, file);
  const html = readFileSync(path, "utf8");
  const { out, replaced, missing } = prerender(html, lang);

  if (missing.length) {
    console.warn(`  ! ${file}: no ${lang} copy for ${missing.join(", ")} — left as-is`);
  }

  if (checkOnly) {
    if (out !== html) {
      console.error(`✗ ${file} is stale (${replaced} element(s) would change)`);
      failed = true;
    } else {
      console.log(`✓ ${file} up to date`);
    }
    continue;
  }

  if (out === html) {
    console.log(`= ${file} already current`);
  } else {
    writeFileSync(path, out);
    console.log(`✓ ${file}: baked ${replaced} element(s) as ${lang}`);
  }
}

if (failed) {
  console.error("\nRun: node scripts/prerender-locales.mjs");
  process.exit(1);
}
