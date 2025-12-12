#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

function candidates() {
  const homedir = os.homedir();
  return [
    path.join(homedir, '.config', 'Code', 'User', 'settings.json'),
    path.join(homedir, '.config', 'Code - OSS', 'User', 'settings.json'),
    path.join(homedir, '.config', 'Code - Insiders', 'User', 'settings.json'),
    path.join(homedir, '.vscode', 'settings.json')
  ];
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return null;
  }
}

function writeJson(file, obj) {
  fs.copyFileSync(file, file + '.bak');
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

const changes = {
  // Prefer internal console and never open it automatically
  'debug.internalConsoleOptions': 'neverOpen',
  // When tasks run, don't reveal the integrated terminal by default (some VS Code versions support task presentation defaults)
  'task.presentation.reveal': 'never'
};

const found = candidates().filter((p) => fs.existsSync(p));
if (!found.length) {
  console.error('No VS Code user settings found in standard locations.');
  console.error('Checked:', candidates().join(', '));
  console.error('You can still run this script from your machine; it will ask where to write settings.');
  process.exit(1);
}

const target = found[0];
console.log('Using settings file:', target);
const cfg = readJson(target) || {};

console.log('\nProposed changes (will be merged into your settings):');
Object.entries(changes).forEach(([k, v]) => {
  console.log(` - ${k}: ${JSON.stringify(cfg[k])} => ${JSON.stringify(v)}`);
});

const autoYes = process.argv.includes('--yes') || process.env.CI_APPLY === '1';
if (autoYes) {
  Object.entries(changes).forEach(([k, v]) => {
    cfg[k] = v;
  });
  writeJson(target, cfg);
  console.log('Settings updated (auto). Backup created at ' + target + '.bak');
  process.exit(0);
}

const readline = require('readline').createInterface({ input: process.stdin, output: process.stdout });
readline.question('\nApply these changes to your global VS Code settings? (y/N) ', (ans) => {
  readline.close();
  if (!/^y(es)?$/i.test(ans)) {
    console.log('Aborted. No changes made.');
    process.exit(0);
  }
  Object.entries(changes).forEach(([k, v]) => {
    cfg[k] = v;
  });
  writeJson(target, cfg);
  console.log('Settings updated. Backup created at ' + target + '.bak');
  process.exit(0);
});
