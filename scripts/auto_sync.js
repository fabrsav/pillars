#!/usr/bin/env node
/*
  Auto-commit & push watcher for the current repo.
  - Watches source changes (excludes .git, node_modules, dist, tmp, build artifacts)
  - Debounces commits to avoid flooding
  - Pushes to origin, setting upstream on first run
*/
import { spawnSync } from 'node:child_process';
import chokidar from 'chokidar';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const DEBOUNCE_MS = Number(process.env.AUTOSYNC_DEBOUNCE_MS || 5000);
const MESSAGE_PREFIX = process.env.AUTOSYNC_PREFIX || 'autopush:';
// Target branch to push changes to. Defaults to 'HEAD' to preserve existing behavior.
// Set `AUTOSYNC_TARGET_BRANCH=main` to push commits directly to `main`.
const TARGET_BRANCH = process.env.AUTOSYNC_TARGET_BRANCH || 'HEAD';

function sh(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'pipe', encoding: 'utf-8', ...opts });
  return {
    code: res.status ?? 0,
    out: (res.stdout || '').trim(),
    err: (res.stderr || '').trim(),
  };
}

function ensureGitIdentity() {
  const email = sh('git', ['config', '--get', 'user.email']);
  const name = sh('git', ['config', '--get', 'user.name']);
  if (!email.out) sh('git', ['config', 'user.email', 'auto@local']);
  if (!name.out) sh('git', ['config', 'user.name', 'Auto Sync']);
}

function hasChanges() {
  const s = sh('git', ['status', '--porcelain']);
  return Boolean(s.out);
}

function currentBranch() {
  const b = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  return b.out || 'HEAD';
}

let timer = null;
let syncing = false;

function scheduleSync(reason) {
  if (syncing) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(runSync, DEBOUNCE_MS);
  log(`change detected (${reason}) → scheduled in ${DEBOUNCE_MS}ms`);
}

function log(...args) {
  console.log('[auto-sync]', ...args);
}

function runSync() {
  if (syncing) return;
  syncing = true;
  try {
    if (!hasChanges()) {
      log('no changes to sync');
      return;
    }
    ensureGitIdentity();
    const filesCount = sh('git', ['status', '--porcelain']).out.split('\n').filter(Boolean).length;
    // Stage all except noisy/derived folders
    sh('git', ['add', '-A', '--', ':!dist', ':!node_modules', ':!.vscode', ':!tmp']);
    const msg = `${MESSAGE_PREFIX} ${new Date().toISOString()} (${filesCount} files)`;
    const commit = sh('git', ['commit', '-m', msg]);
    if (commit.code !== 0) {
      log('commit failed:', commit.err || commit.out);
      return;
    }
    const branch = currentBranch();
    // Push and set upstream to the configured target branch (defaults to HEAD)
    const push = sh('git', ['push', '-u', 'origin', TARGET_BRANCH]);
    if (push.code !== 0) {
      log('push failed:', push.err || push.out || push.code);
    } else {
      log(`pushed ${branch} -> ${TARGET_BRANCH}`);
    }
  } finally {
    syncing = false;
  }
}

function main() {
  log('starting watcher in', ROOT);
  const watcher = chokidar.watch(['.'], {
    cwd: ROOT,
    ignoreInitial: true,
    ignored: [
      '**/.git/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/tmp/**',
      '**/.vscode/**',
      '**/*.log',
      '**/.DS_Store',
    ],
  });
  watcher.on('all', (event, filePath) => {
    const rel = path.relative(ROOT, path.join(ROOT, filePath));
    scheduleSync(`${event} ${rel}`);
  });
  log('watcher running. Debounce:', DEBOUNCE_MS, 'ms');
}

main();
