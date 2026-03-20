import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { loadDesignsManifest, parseExportArgv, pickDesignId } from '../lib/resume-pdf-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptsDir = join(__dirname, '..');
const skillRoot = resolve(scriptsDir, '..');
const node = process.execPath;

/**
 * @param {string} scriptRelative
 * @param {string[]} args
 * @param {Record<string, string | undefined>} [env]
 * @returns {import('node:child_process').SpawnSyncReturns<string>}
 */
function runScript(scriptRelative, args, env) {
  const scriptPath = join(scriptsDir, scriptRelative);
  return spawnSync(node, [scriptPath, ...args], {
    encoding: 'utf-8',
    env: { ...process.env, ...env },
    cwd: scriptsDir,
  });
}

/**
 * @param {string} prefix
 * @returns {string}
 */
function makeTmpDir(prefix) {
  const dir = join(tmpdir(), `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

test('scenario: migrated input normalizes then validates successfully', () => {
  const dir = makeTmpDir('resume-tailor-scenario-normalize-validate');
  const input = join(dir, 'resume.json');
  const schema = join(skillRoot, 'research', 'bundled', 'json-resume-schema.json');

  try {
    copyFileSync(join(__dirname, 'fixtures', 'before-normalize.json'), input);

    const normalizeResult = runScript('normalize-json-resume.mjs', [input]);
    assert.equal(normalizeResult.status, 0, normalizeResult.stderr || normalizeResult.stdout);

    const normalized = JSON.parse(readFileSync(input, 'utf-8'));
    assert.ok(Array.isArray(normalized.references), 'customRecommendations should migrate into references');
    assert.equal(normalized.work[0].endDate, undefined, 'null endDate should be removed');
    assert.equal(normalized.work[0].url, undefined, 'empty work.url should be removed');

    const validateResult = runScript('validate-resume.mjs', [input, schema]);
    assert.equal(validateResult.status, 0, validateResult.stderr || validateResult.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('scenario: extract --text-only for txt writes stdout and does not create output JSON', () => {
  const dir = makeTmpDir('resume-tailor-scenario-text-only');
  const input = join(dir, 'resume-source.txt');
  const explicitOut = join(dir, 'should-not-exist.json');

  try {
    writeFileSync(input, readFileSync(join(__dirname, 'fixtures', 'sample-resume.txt'), 'utf-8'));

    const result = runScript('extract-from-resume.mjs', [input, '--text-only', '-o', explicitOut]);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.ok((result.stdout || '').includes('Platform Lead'), 'stdout should include extracted text');
    assert.equal(existsSync(explicitOut), false, 'output JSON file must not be created in --text-only mode');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('scenario: design selection precedence picks CLI flag over state and env', () => {
  const manifest = loadDesignsManifest(skillRoot);
  const previousEnv = process.env.RESUME_TAILOR_DESIGN;

  process.env.RESUME_TAILOR_DESIGN = 'findmyprofession';
  try {
    const parsed = parseExportArgv(['state.json', '--design=design-4']);
    assert.equal(parsed.designFlag, 'design-4', 'CLI parser should capture design alias');
    const selected = pickDesignId({ export_design: 'amin-ariana' }, parsed.designFlag, manifest);
    assert.equal(selected, 'alex-gervais', 'CLI alias should resolve and win over state+env');
  } finally {
    if (previousEnv === undefined) {
      delete process.env.RESUME_TAILOR_DESIGN;
    } else {
      process.env.RESUME_TAILOR_DESIGN = previousEnv;
    }
  }
});

test('scenario: design selection precedence picks state over env when CLI flag absent', () => {
  const manifest = loadDesignsManifest(skillRoot);
  const previousEnv = process.env.RESUME_TAILOR_DESIGN;

  process.env.RESUME_TAILOR_DESIGN = 'findmyprofession';
  try {
    const parsed = parseExportArgv(['state.json']);
    assert.equal(parsed.designFlag, null);
    const selected = pickDesignId({ export_design: 'amin-ariana' }, parsed.designFlag, manifest);
    assert.equal(selected, 'amin-ariana');
  } finally {
    if (previousEnv === undefined) {
      delete process.env.RESUME_TAILOR_DESIGN;
    } else {
      process.env.RESUME_TAILOR_DESIGN = previousEnv;
    }
  }
});

test('scenario: unknown design fails through CLI parsing + picker resolution', () => {
  const manifest = loadDesignsManifest(skillRoot);
  const parsed = parseExportArgv(['state.json', '--design', 'unknown-design-id']);

  assert.equal(parsed.designFlag, 'unknown-design-id');
  assert.throws(
    () => pickDesignId({ export_design: 'ats' }, parsed.designFlag, manifest),
    /Unknown design/
  );
});
