import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptsDir = join(__dirname, '..');
const node = process.execPath;

function runScript(scriptRelative, args, env) {
  const scriptPath = join(scriptsDir, scriptRelative);
  return spawnSync(node, [scriptPath, ...args], {
    encoding: 'utf-8',
    env: { ...process.env, ...env },
    cwd: scriptsDir,
  });
}

function parseErrorEnvelope(result) {
  const combined = `${result.stderr || ''}\n${result.stdout || ''}`.trim();
  const startIndex = combined.indexOf('{');
  if (startIndex < 0) {
    return null;
  }
  try {
    return JSON.parse(combined.slice(startIndex));
  } catch {
    return null;
  }
}

test('validate-resume: valid fixture exits 0', () => {
  const fixture = join(__dirname, 'fixtures', 'valid-minimal.json');
  const schema = join(scriptsDir, '..', 'research', 'bundled', 'json-resume-schema.json');
  const r = runScript('validate-resume.mjs', [fixture, schema]);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const envelope = r.stdout?.trim() ? JSON.parse(r.stdout.trim()) : null;
  assert.ok(envelope && envelope.ok === true, r.stdout);
  assert.ok(typeof envelope.data?.path === 'string' && envelope.data.path.length > 0);
});

test('validate-resume: invalid email exits non-zero', () => {
  const fixture = join(__dirname, 'fixtures', 'invalid-email.json');
  const schema = join(scriptsDir, '..', 'research', 'bundled', 'json-resume-schema.json');
  const r = runScript('validate-resume.mjs', [fixture, schema]);
  assert.notEqual(r.status, 0);
  const envelope = parseErrorEnvelope(r);
  assert.ok(envelope && envelope.ok === false, r.stderr || r.stdout);
  assert.equal(envelope.error.code, 'RT_SCHEMA_VALIDATION_FAILED');
});

test('validate-resume: missing resume file exits non-zero', () => {
  const schema = join(scriptsDir, '..', 'research', 'bundled', 'json-resume-schema.json');
  const missing = join(tmpdir(), 'missing-resume-' + Date.now() + '.json');
  const r = runScript('validate-resume.mjs', [missing, schema]);
  assert.notEqual(r.status, 0);
  const envelope = parseErrorEnvelope(r);
  assert.ok(envelope && envelope.ok === false, r.stderr || r.stdout);
  assert.equal(envelope.error.code, 'RT_INPUT_NOT_FOUND');
});

test('normalize-json-resume: migrates customRecommendations and fixes work fields', () => {
  const dir = join(tmpdir(), 'resume-tailor-test-' + Date.now());
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, 'normalize-target.json');
  try {
    copyFileSync(join(__dirname, 'fixtures', 'before-normalize.json'), dest);
    const r = runScript('normalize-json-resume.mjs', [dest]);
    assert.equal(r.status, 0, r.stderr);
    const envelope = r.stdout?.trim() ? JSON.parse(r.stdout.trim()) : null;
    assert.ok(envelope && envelope.ok === true, r.stdout);
    assert.ok(envelope.data?.path, 'stdout success envelope includes path');
    const out = JSON.parse(readFileSync(dest, 'utf-8'));
    assert.ok(Array.isArray(out.references));
    assert.equal(out.references.length, 1);
    assert.equal(out.references[0].name, 'Jane Q.');
    assert.ok(!('customRecommendations' in out));
    assert.equal(out.work[0].endDate, undefined);
    assert.equal(out.work[0].url, undefined);
    assert.ok(typeof out.$schema === 'string');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('normalize-json-resume: second run is idempotent (byte-stable output)', () => {
  const dir = join(tmpdir(), 'resume-tailor-idem-' + Date.now());
  mkdirSync(dir, { recursive: true });
  const dest = join(dir, 'normalize-idem.json');
  try {
    copyFileSync(join(__dirname, 'fixtures', 'before-normalize.json'), dest);
    const r1 = runScript('normalize-json-resume.mjs', [dest]);
    assert.equal(r1.status, 0, r1.stderr);
    const afterFirst = readFileSync(dest, 'utf-8');
    const r2 = runScript('normalize-json-resume.mjs', [dest]);
    assert.equal(r2.status, 0, r2.stderr);
    const afterSecond = readFileSync(dest, 'utf-8');
    assert.equal(afterSecond, afterFirst);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('extract-from-resume: txt produces skeleton with rawText', () => {
  const dir = join(tmpdir(), 'resume-tailor-extract-' + Date.now());
  mkdirSync(dir, { recursive: true });
  const input = join(dir, 'in.txt');
  const output = join(dir, 'out.json');
  try {
    writeFileSync(
      input,
      readFileSync(join(__dirname, 'fixtures', 'sample-resume.txt'), 'utf-8')
    );
    const r = runScript('extract-from-resume.mjs', [input, '-o', output]);
    assert.equal(r.status, 0, r.stderr);
    const stdoutEnv = r.stdout?.trim() ? JSON.parse(r.stdout.trim()) : null;
    assert.ok(stdoutEnv && stdoutEnv.ok === true, r.stdout);
    assert.equal(stdoutEnv.data?.path, output);
    const json = JSON.parse(readFileSync(output, 'utf-8'));
    assert.ok(json.meta && typeof json.meta === 'object');
    assert.ok(json.meta.resumeTailor && typeof json.meta.resumeTailor === 'object');
    assert.ok(
      String(json.meta.resumeTailor.rawText || '').includes('Platform Lead'),
      'raw text preserved'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('extract-from-resume: --text-only prints text to stdout and skips JSON write', () => {
  const dir = join(tmpdir(), 'resume-tailor-textonly-' + Date.now());
  mkdirSync(dir, { recursive: true });
  const input = join(dir, 'in.txt');
  const wouldBeDefaultOut = join(dir, 'in-extracted.json');
  try {
    writeFileSync(
      input,
      readFileSync(join(__dirname, 'fixtures', 'sample-resume.txt'), 'utf-8')
    );
    const r = runScript('extract-from-resume.mjs', [input, '--text-only', '-o', wouldBeDefaultOut]);
    assert.equal(r.status, 0, r.stderr);
    assert.ok((r.stdout || '').includes('Platform Lead'), r.stdout);
    assert.ok(!existsSync(wouldBeDefaultOut), '-o ignored when --text-only');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('extract-from-resume: missing input file exits non-zero', () => {
  const missing = join(tmpdir(), 'missing-extract-' + Date.now() + '.txt');
  const r = runScript('extract-from-resume.mjs', [missing]);
  assert.notEqual(r.status, 0);
  const envelope = parseErrorEnvelope(r);
  assert.ok(envelope && envelope.ok === false, r.stderr || r.stdout);
  assert.equal(envelope.error.code, 'RT_INPUT_NOT_FOUND');
});

test('extract-from-resume: unknown flag exits non-zero', () => {
  const dir = join(tmpdir(), 'resume-tailor-badflag-' + Date.now());
  mkdirSync(dir, { recursive: true });
  const input = join(dir, 'in.txt');
  try {
    writeFileSync(input, 'x');
    const r = runScript('extract-from-resume.mjs', [input, '--not-a-real-flag']);
    assert.notEqual(r.status, 0);
    const envelope = parseErrorEnvelope(r);
    assert.ok(envelope && envelope.ok === false, r.stderr || r.stdout);
    assert.equal(envelope.error.code, 'RT_USAGE');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validate-state: valid minimal state exits 0 with success envelope', () => {
  const dir = join(tmpdir(), 'resume-tailor-state-valid-' + Date.now());
  mkdirSync(dir, { recursive: true });
  const statePath = join(dir, 'state.json');
  try {
    writeFileSync(
      statePath,
      JSON.stringify(
        {
          tailor_id: 'tailor-qa-1',
          created_at: '2025-01-01',
          updated_at: '2025-01-02',
          change_report_path: join(dir, 'change-report.md'),
          target: { role: 'Platform Engineer' },
          mode: 'role_only',
          tailored_content: {
            basics: { name: 'Test User', label: 'Engineer' },
            work: [],
            skills: [],
          },
          decisions: [],
        },
        null,
        2
      )
    );
    const r = runScript('validate-state.mjs', [statePath]);
    assert.equal(r.status, 0, r.stderr || r.stdout);
    const envelope = r.stdout?.trim() ? JSON.parse(r.stdout.trim()) : null;
    assert.ok(envelope && envelope.ok === true, r.stdout);
    assert.ok(typeof envelope.data?.message === 'string');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('validate-state: invalid state returns structured schema error envelope', () => {
  const dir = join(tmpdir(), 'resume-tailor-state-invalid-' + Date.now());
  mkdirSync(dir, { recursive: true });
  const statePath = join(dir, 'state.json');
  try {
    writeFileSync(
      statePath,
      JSON.stringify(
        {
          tailor_id: 'tailor-1',
          target: { role: 'Platform Engineer' },
        },
        null,
        2
      )
    );
    const r = runScript('validate-state.mjs', [statePath]);
    assert.notEqual(r.status, 0);
    const envelope = parseErrorEnvelope(r);
    assert.ok(envelope && envelope.ok === false, r.stderr || r.stdout);
    assert.equal(envelope.error.code, 'RT_STATE_SCHEMA_INVALID');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('export-pdf: state.json candidate enforces state schema before export', () => {
  const dir = join(tmpdir(), 'resume-tailor-export-invalid-state-' + Date.now());
  mkdirSync(dir, { recursive: true });
  const statePath = join(dir, 'state.json');
  try {
    writeFileSync(
      statePath,
      JSON.stringify(
        {
          tailor_id: 'tailor-1',
          target: { role: 'Director' },
        },
        null,
        2
      )
    );
    const r = runScript('export-pdf.mjs', [statePath]);
    assert.notEqual(r.status, 0);
    const envelope = parseErrorEnvelope(r);
    assert.ok(envelope && envelope.ok === false, r.stderr || r.stdout);
    assert.equal(envelope.error.code, 'RT_STATE_SCHEMA_INVALID');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
