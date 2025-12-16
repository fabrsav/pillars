#!/usr/bin/env node
// parse_anki_pdf.js
// Parse Anki exported PDF statistics from a given directory and save structured JSON

import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';

const DEFAULT_DIR = `C:/Users/PC-FabrizioSavona25/OneDrive - FORINT SPA SOCIETA'' UNIPERSONALE/Desktop/Statistiche Anki`;
const DB = path.join(path.resolve(new URL(import.meta.url).pathname, '..', '..'), 'db');
const OUT = path.join(DB, 'anki_stats.json');

function loadExisting() {
  try {
    if (!fs.existsSync(OUT)) return [];
    return JSON.parse(fs.readFileSync(OUT, 'utf8')) || [];
  } catch (e) { return []; }
}

function saveAll(arr) {
  fs.mkdirSync(DB, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(arr, null, 2));
}

function parseDateFromFilename(name) {
  // tries to match anki-statistiche-YYYY-MM-DD@HH-MM-SS
  const m = name.match(/(\d{4}-\d{2}-\d{2})@?(\d{2}-\d{2}-\d{2})?/);
  if (!m) return null;
  const date = m[1];
  const time = m[2] ? m[2].replace(/-/g, ':') : '00:00:00';
  return `${date}T${time}`;
}

function extractNumbers(text) {
  // returns map of candidate metrics by heuristics
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const out = {};

  lines.forEach(l => {
    // Total reviews
    let m = l.match(/Total reviews:\s*([0-9,.]+)/i) || l.match(/Reviews:\s*([0-9,.]+)/i);
    if (m) out.totalReviews = Number(m[1].replace(/,/g, ''));

    m = l.match(/New cards:\s*([0-9,.]+)/i);
    if (m) out.newCards = Number(m[1].replace(/,/g, ''));

    m = l.match(/Due cards:\s*([0-9,.]+)/i);
    if (m) out.dueCards = Number(m[1].replace(/,/g, ''));

    m = l.match(/Retention rate:\s*([0-9,.]+)%/i) || l.match(/Retention:\s*([0-9,.]+)%/i);
    if (m) out.retention = Number(m[1].replace(/,/g, ''));

    m = l.match(/Study time:\s*([0-9,.]+)\s*min/i) || l.match(/Study time:\s*([0-9,.]+)\s*minutes/i);
    if (m) out.studyMinutes = Number(m[1].replace(/,/g, ''));
  });

  // fallback heuristics: look for common labels
  if (!out.totalReviews) {
    const m = text.match(/(\d{1,4})(?:\s+)reviews/i);
    if (m) out.totalReviews = Number(m[1]);
  }

  return out;
}

async function parseFile(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const { text } = await pdf(dataBuffer);
  const filename = path.basename(filePath);
  const recordedAt = parseDateFromFilename(filename) || new Date().toISOString();
  const metrics = extractNumbers(text);
  return { filename, recordedAt, metrics, rawTextSample: text.split(/\r?\n/).slice(0,50).join('\n') };
}

export async function parseDir(dirPath = DEFAULT_DIR) {
  const files = fs.existsSync(dirPath) ? fs.readdirSync(dirPath) : [];
  const pdfs = files.filter(f => f.toLowerCase().endsWith('.pdf'));
  const existing = loadExisting();
  const results = [];

  for (const f of pdfs) {
    try {
      const full = path.join(dirPath, f);
      const parsed = await parseFile(full);
      // avoid duplicates by filename
      if (!existing.find(e => e.filename === parsed.filename)) results.push(parsed);
    } catch (e) {
      console.warn('Failed to parse', f, e && e.message ? e.message : e);
    }
  }

  const all = [...existing, ...results].sort((a,b) => (a.recordedAt < b.recordedAt ? 1 : -1));
  saveAll(all);
  return { added: results.length, total: all.length };
}

if (process.argv[1] && process.argv[1].endsWith('parse_anki_pdf.js')) {
  // CLI
  const dir = process.argv[2] || DEFAULT_DIR;
  (async () => {
    const res = await parseDir(dir);
    console.log('Parsed', res);
  })();
}
