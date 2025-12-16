#!/usr/bin/env node
// Lista branch remoti in base all'ultimo commit (in giorni)
// Usage: node scripts/list-stale-branches.js --days=90

import {execSync} from 'child_process';
import {argv} from 'process';

function parseArgs() {
  const args = Object.fromEntries(argv.slice(2).map(a => {
    const [k,v] = a.split('=');
    return [k.replace(/^--/,'') , v ?? true];
  }));
  return {
    days: Number(args.days || 90),
    prefix: args.prefix || 'origin/',
  };
}

function run(cmd) {
  return execSync(cmd, {encoding:'utf8'}).trim();
}

function isoToDays(iso) {
  return (Date.now() - new Date(iso).getTime()) / (1000*60*60*24);
}

function main() {
  const {days, prefix} = parseArgs();
  console.log(`Looking for remote branches older than ${days} days (prefix ${prefix})...`);

  const raw = run(`git for-each-ref --sort=-committerdate --format '%(refname:short) %(committerdate:iso8601)' refs/remotes`);
  const lines = raw.split('\n').filter(Boolean);

  const results = lines.map(line => {
    const m = line.match(/^(.*?)\s+(.*)$/);
    if(!m) return null;
    const ref = m[1];
    const date = m[2];
    return {ref, date, ageDays: isoToDays(date)};
  }).filter(Boolean).filter(r => r.ref.startsWith(prefix));

  const filtered = results.filter(r => {
    // exclude HEAD and main
    if(r.ref.endsWith('/HEAD')) return false;
    if(r.ref.endsWith('/main') || r.ref.endsWith('/master')) return false;
    return r.ageDays > days;
  });

  if(filtered.length === 0) {
    console.log('No stale remote branches found.');
    return;
  }

  console.log('\nStale branches:');
  for(const f of filtered) {
    console.log(`- ${f.ref} (last commit: ${f.date}, ~${Math.round(f.ageDays)} days)`);
  }

  console.log('\nSuggested actions: review each branch, merge or close PR, or reopen a clean PR if needed.');
}

try { main(); } catch(e) { console.error(e.message); process.exit(1); }
