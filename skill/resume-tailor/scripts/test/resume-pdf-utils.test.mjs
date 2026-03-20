import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
  buildHtmlDocument,
  defaultPdfFilename,
  isoDatePrefix,
  jsonForInlineScript,
  loadDesignsManifest,
  parseExportArgv,
  pickDesignId,
  resolveDesignId,
} from '../lib/resume-pdf-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(__dirname, '..', '..');

test('jsonForInlineScript escapes < for script context', () => {
  const s = jsonForInlineScript({ inject: '</script><script>evil' });
  assert.ok(!s.includes('</script>'), 'must not contain raw closing script tag');
  assert.ok(s.includes('\\u003c'), 'less-than emitted as JSON-style u003c escapes');
});

test('jsonForInlineScript escapes U+2028 LINE SEPARATOR for inline script', () => {
  const s = jsonForInlineScript({ lineSep: '\u2028' });
  assert.ok(s.includes('\\u2028'), 'U+2028 must appear as JSON-style escape');
  assert.ok(!s.includes('\u2028'), 'raw U+2028 must not appear in output');
});

test('jsonForInlineScript escapes U+2029 PARAGRAPH SEPARATOR for inline script', () => {
  const s = jsonForInlineScript({ paraSep: '\u2029' });
  assert.ok(s.includes('\\u2029'), 'U+2029 must appear as JSON-style escape');
  assert.ok(!s.includes('\u2029'), 'raw U+2029 must not appear in output');
});

test('jsonForInlineScript escapes both U+2028 and U+2029 when both present', () => {
  const s = jsonForInlineScript({ u: '\u2028\u2029' });
  assert.ok(s.includes('\\u2028') && s.includes('\\u2029'), 'both separators escaped');
});

test('isoDatePrefix accepts YYYY-MM-DD prefix', () => {
  assert.equal(isoDatePrefix('2024-06-15T10:00:00Z'), '2024-06-15');
});

test('resolveDesignId resolves canonical and alias', () => {
  const manifest = loadDesignsManifest(skillRoot);
  assert.equal(resolveDesignId('ats', manifest), 'ats');
  assert.equal(resolveDesignId('design-4', manifest), 'alex-gervais');
});

test('resolveDesignId throws for unknown', () => {
  const manifest = loadDesignsManifest(skillRoot);
  assert.throws(() => resolveDesignId('no-such-design-xyz', manifest), /Unknown design/);
});

test('pickDesignId honors CLI flag over state and env', () => {
  const manifest = loadDesignsManifest(skillRoot);
  const prev = process.env.RESUME_TAILOR_DESIGN;
  process.env.RESUME_TAILOR_DESIGN = 'findmyprofession';
  try {
    const id = pickDesignId(
      { export_design: 'amin-ariana' },
      'alex-gervais',
      manifest
    );
    assert.equal(id, 'alex-gervais');
  } finally {
    if (prev === undefined) {
      delete process.env.RESUME_TAILOR_DESIGN;
    } else {
      process.env.RESUME_TAILOR_DESIGN = prev;
    }
  }
});

test('pickDesignId uses state export_design when no design flag (over env)', () => {
  const manifest = loadDesignsManifest(skillRoot);
  const prev = process.env.RESUME_TAILOR_DESIGN;
  process.env.RESUME_TAILOR_DESIGN = 'findmyprofession';
  try {
    const id = pickDesignId({ export_design: 'amin-ariana' }, null, manifest);
    assert.equal(id, 'amin-ariana');
  } finally {
    if (prev === undefined) {
      delete process.env.RESUME_TAILOR_DESIGN;
    } else {
      process.env.RESUME_TAILOR_DESIGN = prev;
    }
  }
});

test('pickDesignId uses env when no flag and no export_design in state', () => {
  const manifest = loadDesignsManifest(skillRoot);
  const prev = process.env.RESUME_TAILOR_DESIGN;
  process.env.RESUME_TAILOR_DESIGN = 'alex-gervais';
  try {
    const id = pickDesignId({}, null, manifest);
    assert.equal(id, 'alex-gervais');
  } finally {
    if (prev === undefined) {
      delete process.env.RESUME_TAILOR_DESIGN;
    } else {
      process.env.RESUME_TAILOR_DESIGN = prev;
    }
  }
});

test('pickDesignId falls back to manifest default when no flag, state, or env', () => {
  const manifest = loadDesignsManifest(skillRoot);
  const prev = process.env.RESUME_TAILOR_DESIGN;
  delete process.env.RESUME_TAILOR_DESIGN;
  try {
    const id = pickDesignId({}, null, manifest);
    assert.equal(id, manifest.defaultDesignId);
  } finally {
    if (prev === undefined) {
      delete process.env.RESUME_TAILOR_DESIGN;
    } else {
      process.env.RESUME_TAILOR_DESIGN = prev;
    }
  }
});

test('parseExportArgv captures --design=value and leaves positionals', () => {
  const r = parseExportArgv(['in.json', '--design=alex-gervais', '--verbose']);
  assert.deepEqual(r.positional, ['in.json', '--verbose']);
  assert.equal(r.designFlag, 'alex-gervais');
});

test('parseExportArgv captures --design <value> form', () => {
  const r = parseExportArgv(['--design', 'amin-ariana', 'profile.json']);
  assert.deepEqual(r.positional, ['profile.json']);
  assert.equal(r.designFlag, 'amin-ariana');
});

test('defaultPdfFilename appends design suffix when not ats', () => {
  const name = defaultPdfFilename(
    {
      basics: { label: 'Director' },
      created_at: '2025-01-10',
    },
    'alex-gervais'
  );
  assert.ok(name.endsWith('_alex-gervais.pdf'), name);
});

test('buildHtmlDocument includes resume shell and escaped literals', () => {
  const manifest = loadDesignsManifest(skillRoot);
  const html = buildHtmlDocument(
    skillRoot,
    { basics: { name: 'T', summary: '</script>' } },
    'ats',
    manifest
  );
  assert.ok(html.includes('<!DOCTYPE html>'), 'doctype');
  assert.ok(html.includes('<div id="resume">'), 'mount point');
  assert.ok(html.includes('window.__RESUME__='), 'resume injection');
  assert.ok(html.includes('\\u003c/script>'), 'angle brackets in summary escaped in inline JSON');
});
