#!/usr/bin/env node
// generate_study_calendar.js
// Reads `db/exam_topics.json` and `db/pillars_goals.json` to build a study calendar
// Output: `db/study_calendar.json`

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..');
const DB = path.join(ROOT, 'db');
const topicsFile = path.join(DB, 'exam_topics.json');
const goalsFile = path.join(DB, 'pillars_goals.json');
const outFile = path.join(DB, 'study_calendar.json');

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveJSON(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}

(async function main(){
  if (!fs.existsSync(topicsFile)) {
    console.error('Missing', topicsFile);
    process.exit(1);
  }

  const topics = loadJSON(topicsFile);
  const goals = fs.existsSync(goalsFile) ? loadJSON(goalsFile) : {};
  const dailyStudyMinutes = (goals.exams_prep && goals.exams_prep.metrics && goals.exams_prep.metrics.dailyStudyMinutes) || 120;

  // Build calendar per exam
  const calendar = { generatedAt: new Date().toISOString(), exams: [] };

  for (const exam of topics.exams) {
    const examDate = new Date(exam.examDate);
    // Start date: today or a configurable start (use today)
    const startDate = new Date();
    startDate.setHours(0,0,0,0);

    // Number of study days = days between start and examDate - reserve last 2 days for review
    const diffDays = Math.max(1, Math.ceil((examDate - startDate)/(1000*60*60*24)));
    const studyDays = Math.max(1, diffDays - 2);

    // Collect all cards
    const cards = [];
    for (const t of (exam.topics || [])) {
      for (const c of (t.cards || [])) {
        cards.push({ q: c.q, a: c.a, topic: t.title });
      }
    }

    // Distribute cards across studyDays
    const perDay = Math.ceil(cards.length / studyDays) || 1;
    const schedule = [];

    let cardIndex = 0;
    for (let d = 0; d < studyDays; d++) {
      const date = addDays(startDate, d);
      const dayCards = [];
      for (let i = 0; i < perDay && cardIndex < cards.length; i++, cardIndex++) {
        dayCards.push(cards[cardIndex]);
      }
      schedule.push({ date, newCards: dayCards.length, cards: dayCards });
    }

    // If remaining cards, append them to last days
    while (cardIndex < cards.length) {
      schedule[schedule.length-1].cards.push(cards[cardIndex]);
      schedule[schedule.length-1].newCards = schedule[schedule.length-1].cards.length;
      cardIndex++;
    }

    calendar.exams.push({ id: exam.id, name: exam.name, examDate: exam.examDate, dailyStudyMinutes, schedule });
  }

  saveJSON(outFile, calendar);
  console.log('Study calendar generated ->', outFile);
})();
