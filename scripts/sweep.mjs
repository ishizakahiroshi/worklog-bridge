#!/usr/bin/env node
// Cross-repo secrets-scan sweep — runs secrets-scan.mjs (dry-run, json) against
// every git repo found under a parent directory and aggregates the result.
//
// Usage:
//   node scripts/sweep.mjs [parent_dir]
//   SWEEP_ROOT=/path/to/repos node scripts/sweep.mjs
//
// Default parent_dir: parent of this repo (../). On a typical layout where
// multiple sibling repos sit next to each other, this scans all of them.
//
// Writes:
//   docs/local/sweep-report_YYYY-MM-DD/sweep.json    (raw aggregate)
//   docs/local/sweep-report_YYYY-MM-DD/sweep.txt     (text summary)
//
// Exits 0 always (report-only).

import { readdirSync, statSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(__dirname);
const SCAN_SCRIPT = join(__dirname, 'secrets-scan.mjs');

const PARENT = process.argv[2] || process.env.SWEEP_ROOT || resolve(REPO_ROOT, '..');
const today = new Date().toISOString().slice(0, 10);
const REPORT_DIR = join(REPO_ROOT, 'docs', 'local', `sweep-report_${today}`);

console.log(`Sweep parent: ${PARENT}`);
console.log(`Scan script : ${SCAN_SCRIPT}`);
console.log(`Report dir  : ${REPORT_DIR}`);
console.log('');

if (!existsSync(PARENT)) {
  console.error(`ERROR: parent directory not found: ${PARENT}`);
  process.exit(2);
}

const dirs = readdirSync(PARENT)
  .map(name => ({ name, path: join(PARENT, name) }))
  .filter(d => {
    try { return statSync(d.path).isDirectory() && existsSync(join(d.path, '.git')); }
    catch { return false; }
  });

console.log(`Found ${dirs.length} git repos. Scanning...\n`);

const aggregate = {
  generated_at: new Date().toISOString(),
  parent_dir: PARENT,
  scan_script: SCAN_SCRIPT,
  repos: [],
};

for (const { name, path } of dirs) {
  process.stdout.write(`  [${name}]`.padEnd(40));
  const r = spawnSync('node', [SCAN_SCRIPT, '--all-tracked', '--dry-run', '--format=json'], {
    cwd: path, encoding: 'utf8', shell: false, timeout: 60000,
  });
  if (r.error || r.status === 2) {
    console.log(`  ERROR: ${r.error?.message || r.stderr}`);
    aggregate.repos.push({ repo: name, error: r.error?.message || r.stderr || `exit ${r.status}` });
    continue;
  }
  let data;
  try { data = JSON.parse(r.stdout); }
  catch (e) {
    console.log(`  JSON parse error: ${e.message}`);
    aggregate.repos.push({ repo: name, error: `parse: ${e.message}`, raw_stdout: r.stdout.slice(0, 500) });
    continue;
  }
  const hits = data.hits || [];
  console.log(`  ${String(hits.length).padStart(4)} hits   (${data.scanned} files scanned)`);
  aggregate.repos.push({ repo: name, ...data });
}

// === Summary ===
console.log('\n=== Summary ===');
let totalHits = 0;
let totalFiles = 0;
const reposWithHits = [];
for (const r of aggregate.repos) {
  if (r.error) continue;
  totalHits += (r.hits?.length || 0);
  totalFiles += (r.scanned || 0);
  if (r.hits && r.hits.length > 0) reposWithHits.push(r);
}
console.log(`Repos       : ${aggregate.repos.length}`);
console.log(`Files       : ${totalFiles}`);
console.log(`Hits total  : ${totalHits}`);
console.log(`Repos hit   : ${reposWithHits.length}`);

if (reposWithHits.length > 0) {
  console.log('\n=== Detail (repos with hits) ===');
  for (const r of reposWithHits) {
    console.log(`\n  --- ${r.repo} (${r.hits.length} hits) ---`);
    // Group by file
    const byFile = new Map();
    for (const h of r.hits) {
      if (!byFile.has(h.file)) byFile.set(h.file, []);
      byFile.get(h.file).push(h);
    }
    for (const [file, hs] of byFile) {
      console.log(`    ${file}:`);
      for (const h of hs) {
        console.log(`      L${h.lineNumber}  '${h.matched}'  (${h.source})`);
      }
    }
  }
}

// === Write report files ===
mkdirSync(REPORT_DIR, { recursive: true });
const jsonPath = join(REPORT_DIR, 'sweep.json');
writeFileSync(jsonPath, JSON.stringify(aggregate, null, 2));

const txtLines = [];
txtLines.push(`Sweep report — ${aggregate.generated_at}`);
txtLines.push(`Parent: ${PARENT}`);
txtLines.push('');
txtLines.push(`Repos: ${aggregate.repos.length}  Files: ${totalFiles}  Hits: ${totalHits}  Repos-hit: ${reposWithHits.length}`);
txtLines.push('');
for (const r of aggregate.repos) {
  if (r.error) {
    txtLines.push(`  [ERR] ${r.repo}: ${r.error}`);
  } else {
    const flag = (r.hits?.length || 0) > 0 ? '[HIT]' : '[OK ]';
    txtLines.push(`  ${flag} ${r.repo}: ${r.hits?.length || 0} hits / ${r.scanned} files`);
  }
}
txtLines.push('');
for (const r of reposWithHits) {
  txtLines.push(`--- ${r.repo} ---`);
  for (const h of r.hits) {
    txtLines.push(`  ${h.file}:${h.lineNumber}  '${h.matched}'  (${h.source})`);
  }
  txtLines.push('');
}
const txtPath = join(REPORT_DIR, 'sweep.txt');
writeFileSync(txtPath, txtLines.join('\n'));

console.log(`\nReport written to:\n  ${jsonPath}\n  ${txtPath}`);
