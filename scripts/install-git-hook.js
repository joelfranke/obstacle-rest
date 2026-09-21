#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const source = path.join(__dirname, 'git-hooks', 'pre-push');
const hooksDir = path.join(root, '.git', 'hooks');
const dest = path.join(hooksDir, 'pre-push');

if (!fs.existsSync(hooksDir)) {
  console.log('No .git/hooks directory; skipping Heroku pre-push hook install.');
  process.exit(0);
}

fs.copyFileSync(source, dest);
fs.chmodSync(dest, 0o755);
console.log('Installed Heroku pre-push hook.');
