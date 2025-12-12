#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const tasksPath = path.resolve(__dirname, '..', '.vscode', 'tasks.json');
if (!fs.existsSync(tasksPath)) {
  console.error('No .vscode/tasks.json found');
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
} catch (err) {
  console.error('Failed to parse .vscode/tasks.json:', err.message);
  process.exit(1);
}

const tasks = data.tasks || [];
const bad = [];

tasks.forEach((t) => {
  const presentation = t.presentation || {};
  const reveal = presentation.reveal;
  if (reveal !== 'never' && reveal !== 'silent') {
    bad.push({ label: t.label || '<no-label>', reveal });
  }
});

if (bad.length) {
  console.error('Found tasks that may reveal the integrated Terminal:');
  bad.forEach((b) => console.error(` - ${b.label}: reveal=${b.reveal}`));
  console.error('\nPlease set "presentation.reveal": "never" or "silent" for these tasks.');
  process.exit(2);
}

console.log('All tasks have safe presentation.reveal settings.');
process.exit(0);
