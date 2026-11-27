#!/usr/bin/env node
/**
 * Normalize resume JSON toward JSON Resume schema validation hygiene.
 * - Omits endDate when null on work, projects, and education entries.
 * - Omits url when it is an empty string on work and projects entries (invalid uri format).
 * - Migrates customRecommendations -> references (schema + extension fields).
 * - Sets $schema for editor/tooling.
 *
 * Usage: node normalize-json-resume.mjs <path-to.json>
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { makeError, runCli } from './lib/error-taxonomy.mjs';

const SCHEMA_URL =
  'https://raw.githubusercontent.com/jsonresume/resume-schema/master/schema.json';

await runCli(async (argv) => {
  const inputPath = resolve(argv[0] || '../profile.json');
  let raw;
  try {
    raw = readFileSync(inputPath, 'utf-8');
  } catch (err) {
    throw makeError('RT_INPUT_NOT_FOUND', 'Input resume JSON not found.', {
      path: inputPath,
      reason: err instanceof Error ? err.message : String(err),
    });
  }
  /** @type {Record<string, unknown>} */
  let data;
  try {
    const parsed = JSON.parse(raw);
    data = typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (err) {
    throw makeError('RT_JSON_PARSE_FAILED', 'Failed to parse JSON resume.', {
      path: inputPath,
      reason: err instanceof Error ? err.message : String(err),
    });
  }

  if (Array.isArray(data.work)) {
    for (const w of data.work) {
      if (!w || typeof w !== 'object') {
        continue;
      }
      if (w.endDate === null) {
        delete w.endDate;
      }
      if (w.url === '') {
        delete w.url;
      }
    }
  }

  if (Array.isArray(data.projects)) {
    for (const p of data.projects) {
      if (!p || typeof p !== 'object') {
        continue;
      }
      if (p.endDate === null) {
        delete p.endDate;
      }
      if (p.url === '') {
        delete p.url;
      }
    }
  }

  if (Array.isArray(data.education)) {
    for (const e of data.education) {
      if (!e || typeof e !== 'object') {
        continue;
      }
      if (e.endDate === null) {
        delete e.endDate;
      }
    }
  }

  if (
    Array.isArray(data.customRecommendations) &&
    data.customRecommendations.length > 0
  ) {
    const existing = Array.isArray(data.references) ? data.references : [];
    const migrated = data.customRecommendations
      .map((c) => {
        if (!c || typeof c !== 'object') {
          return null;
        }
        const rec = /** @type {Record<string, string>} */ (c);
        const name = rec.recommender || rec.name || '';
        const reference = rec.quote || rec.reference || '';
        const title = rec.title || '';
        /** @type {Record<string, string>} */
        const item = { name, reference };
        if (title) {
          item.title = title;
        }
        return item;
      })
      .filter(Boolean);
    data.references = [...existing, ...migrated];
    delete data.customRecommendations;
  } else if ('customRecommendations' in data) {
    delete data.customRecommendations;
  }

  const output = {
    $schema: SCHEMA_URL,
    ...data,
  };

  writeFileSync(inputPath, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        data: {
          path: inputPath,
          message: 'Resume normalized.',
        },
      },
      null,
      2
    ) + '\n'
  );
}, { defaultCode: 'RT_NORMALIZE_FAILED' });
