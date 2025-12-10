#!/usr/bin/env node
// anki_schedule_sync.js
// Reads `db/study_calendar.json` and `db/exam_topics.json`, then uses AnkiConnect
// to create a deck `Pillars Study` and add notes tagged with the study date.
// It will also create a filtered deck for the day's tag so you can study only that day's cards.

import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..');
const DB = path.join(ROOT, 'db');
const calendarFile = path.join(DB, 'study_calendar.json');
const topicsFile = path.join(DB, 'exam_topics.json');
const ANKI_CONNECT_URL = 'http://localhost:8765';

function loadJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }

async function ankiRequest(action, params = {}) {
  const body = { action, version: 6, params };
  const r = await fetch(ANKI_CONNECT_URL, { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
  return r.json();
}

(async function main(){
  if (!fs.existsSync(calendarFile)) {
    console.error('Missing study_calendar.json. Run scripts/generate_study_calendar.js first.');
    process.exit(1);
  }
  const calendar = loadJSON(calendarFile);

  try {
    // Ensure AnkiConnect reachable
    const ping = await ankiRequest('version');
    if (!ping || ping.error) throw new Error('AnkiConnect not reachable');
  } catch (e) {
    console.error('Cannot reach AnkiConnect at', ANKI_CONNECT_URL, '-', e.message);
    console.error('Start Anki and the AnkiConnect add-on (https://ankiweb.net/shared/info/2055492159) then retry.');
    process.exit(1);
  }

  // Create base deck
  const deckName = 'Pillars Study';
  await ankiRequest('createDeck', { deck: deckName });

  // For safety, only sync next 7 days by default
  const maxDays = 7;
  for (const exam of calendar.exams) {
    for (const day of exam.schedule.slice(0, maxDays)) {
      const tag = `pillars-${exam.id}-${day.date}`;
      // Add notes for that day
      const notes = (day.cards || []).map(c => ({
        deckName,
        modelName: 'Basic',
        fields: { Front: c.q, Back: c.a },
        options: { allowDuplicate: false },
        tags: [tag, 'pillars']
      }));

      if (notes.length === 0) continue;

      const addRes = await ankiRequest('addNotes', { notes });
      if (addRes.error) {
        console.error('addNotes error:', addRes.error);
      } else {
        console.log(`Added ${notes.length} notes for ${day.date} (exam ${exam.name})`);
      }

      // Create a filtered deck so you can study today's cards easily
      const fdName = `Pillars ${exam.id} ${day.date}`;
      const search = `tag:${tag}`;
      // limit equals number of notes added
      const limit = notes.length;
      await ankiRequest('createFilteredDeck', { name: fdName, query: search, limit, order: 1 });
      console.log('Created/updated filtered deck:', fdName);
    }
  }

  console.log('Anki sync completed (next 7 days).');
})();
