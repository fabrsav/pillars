#!/usr/bin/env node
// Produce un report dettagliato dei branch remoti e suggerisce azioni.
// Usage: node scripts/prepare-branch-report.js --days=90 --output=report.json

import {execSync} from 'child_process';
import fs from 'fs';
import {argv} from 'process';

function parseArgs() {
  const args = Object.fromEntries(argv.slice(2).map(a => {
    const [k,v] = a.split('=');
    return [k.replace(/^--/,'') , v ?? true];
  }));
  return {
    days: Number(args.days || 90),
    prefix: args.prefix || 'origin/',
    output: args.output || null,
    dry: !!args.dry,
  };
}

function run(cmd) {
  try { return execSync(cmd, {encoding:'utf8'}).trim(); }
  catch(e) { return ''; }
}

function isoToDays(iso) {
  return (Date.now() - new Date(iso).getTime()) / (1000*60*60*24);
}

function getRemoteBranches(prefix='origin/') {
  const raw = run(`git for-each-ref --sort=-committerdate --format '%(refname:short) %(committerdate:iso8601) %(objectname)' refs/remotes`);
  return raw.split('\n').filter(Boolean).map(line => {
    const m = line.match(/^(.*?)\s+(.*?)\s+(.*?)$/);
    if(!m) return null;
    return {ref: m[1], date: m[2], sha: m[3]};
  }).filter(Boolean).filter(r => r.ref.startsWith(prefix));
}

function isMergedToMain(sha) {
  // returns true if sha is ancestor of origin/main
  try {
    execSync(`git merge-base --is-ancestor ${sha} origin/main`);
    return true;
  } catch(e) { return false; }
}

function hasOpenPRWithGh(branchShort) {
  // requires `gh` CLI configured; returns array of PR urls
  const gh = run('which gh || where gh').trim();
  if(!gh) return [];
  try {
    const out = run(`gh pr list --json number,url,headRefName,state --jq '.[] | select(.headRefName=="${branchShort}") | {number,url,state}'`);
    if(!out) return [];
    // collect all matching (jq returns multiple json objects separated by newlines)
    const lines = out.split('\n').filter(Boolean);
    return lines.map(l => JSON.parse(l));
  } catch(e) { return []; }
}

function main() {
  const opts = parseArgs();
  console.log(`Running branch report for branches older than ${opts.days} days...`);

  const branches = getRemoteBranches(opts.prefix);
  const results = branches.map(b => ({
    ref: b.ref,
    short: b.ref.replace(opts.prefix,'') ,
    date: b.date,
    sha: b.sha,
    ageDays: Math.round(isoToDays(b.date)),
    mergedToMain: isMergedToMain(b.sha),
    prs: []
  }));

  for(const r of results) {
    if(r.ageDays > opts.days) {
      r.prs = hasOpenPRWithGh(r.short);
    }
  }

  const filtered = results.filter(r => r.ageDays > opts.days);
  if(filtered.length === 0) {
    console.log('No candidate branches found for the given threshold.');
  } else {
    console.log('\nCandidates:');
    for(const c of filtered) {
      console.log(`- ${c.ref}: ${c.ageDays}d, mergedToMain=${c.mergedToMain}, prs=${c.prs.length}`);
    }
  }

  if(opts.output) {
    const payload = {generatedAt: new Date().toISOString(), thresholdDays: opts.days, candidates: filtered};
    fs.writeFileSync(opts.output, JSON.stringify(payload,null,2), 'utf8');
    console.log(`\nWrote report to ${opts.output}`);
  }
}

try { main(); } catch(e) { console.error(e.message); process.exit(1); }
