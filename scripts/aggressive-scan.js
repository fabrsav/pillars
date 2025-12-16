#!/usr/bin/env node
// Aggressive scan for remote and local branches.
// Flags branches by name patterns and inactivity thresholds.
// Usage: node scripts/aggressive-scan.js --output=branch-reports/report-aggressive.json

import {execSync} from 'child_process';
import fs from 'fs';
import {argv} from 'process';

function parseArgs() {
  const args = Object.fromEntries(argv.slice(2).map(a => {
    const [k,v] = a.split('=');
    return [k.replace(/^--/,'') , v ?? true];
  }));
  return {
    output: args.output || 'branch-reports/report-aggressive.json',
    prefix: args.prefix || 'origin/',
    patterns: (args.patterns && args.patterns.split(',')) || ['wip','merge','copilot','experimental','temp','backup','autopush'],
    days: Number(args.days || 30),
  };
}

function run(cmd) {
  try { return execSync(cmd, {encoding:'utf8'}).trim(); }
  catch(e) { return ''; }
}

function isoToDays(iso) {
  return (Date.now() - new Date(iso).getTime()) / (1000*60*60*24);
}

function listRemoteBranches(prefix='origin/') {
  // Use a delimiter to avoid problems with spaces in dates
  const raw = run(`git for-each-ref --sort=-committerdate --format "%(refname:short)|%(committerdate:iso8601)|%(objectname)" refs/remotes`);
  return raw.split('\n').filter(Boolean).map(line => {
    const parts = line.split('|');
    if(parts.length < 3) return null;
    const ref = parts[0].trim();
    const date = parts[1].trim();
    const sha = parts[2].trim();
    return {ref, date, sha, short: ref.replace(prefix,'')};
  }).filter(Boolean).filter(r => r.ref.startsWith(prefix));
}

function listLocalBranches() {
  // Use a delimiter to avoid issues with spaces in dates
  const raw = run(`git for-each-ref --sort=-committerdate --format "%(refname:short)|%(committerdate:iso8601)|%(objectname)" refs/heads`);
  return raw.split('\n').filter(Boolean).map(line => {
    const parts = line.split('|');
    if(parts.length < 3) return null;
    return {ref: parts[0].trim(), date: parts[1].trim(), sha: parts[2].trim()};
  }).filter(Boolean);
}

function isMergedToMain(sha) {
  try { execSync(`git merge-base --is-ancestor ${sha} origin/main`); return true;} catch(e) { return false; }
}

function hasOpenPRWithGh(branchShort) {
  const ghPath = run('which gh || where gh');
  if(!ghPath) return [];
  try {
    const out = run(`gh pr list --json number,url,headRefName,state --jq '.[] | select(.headRefName=="${branchShort}") | {number,url,state}'`);
    if(!out) return [];
    const lines = out.split('\n').filter(Boolean);
    return lines.map(l => JSON.parse(l));
  } catch(e) { return []; }
}

function matchPatterns(name, patterns) {
  const n = name.toLowerCase();
  return patterns.filter(p => n.includes(p));
}

function main() {
  const opts = parseArgs();
  console.log('Running aggressive scan with patterns:', opts.patterns, 'days threshold:', opts.days);

  const remotes = listRemoteBranches(opts.prefix);
  const locals = listLocalBranches();

  const now = new Date().toISOString();

  const processBranch = b => ({
    ref: b.ref,
    short: b.short ?? b.ref,
    date: b.date,
    sha: b.sha,
    ageDays: Math.round(isoToDays(b.date)),
    mergedToMain: isMergedToMain(b.sha),
    prs: hasOpenPRWithGh(b.short ?? b.ref),
    patternsMatched: matchPatterns(b.ref, opts.patterns),
  });

  const remoteResults = remotes.map(processBranch);
  const localResults = locals.map(processBranch);

  const flagged = remoteResults.filter(r => r.patternsMatched.length || r.ageDays > opts.days || (!r.mergedToMain && r.ageDays > (opts.days/2)));

  const report = {generatedAt: now, patterns: opts.patterns, thresholdDays: opts.days, remoteCount: remoteResults.length, localCount: localResults.length, flagged, remoteResults, localResults};

  fs.mkdirSync('branch-reports', {recursive: true});
  fs.writeFileSync(opts.output, JSON.stringify(report,null,2),'utf8');

  console.log(`Wrote aggressive report to ${opts.output}. Flagged ${flagged.length} branches.`);
}

try { main(); } catch(e) { console.error(e.message); process.exit(1); }
