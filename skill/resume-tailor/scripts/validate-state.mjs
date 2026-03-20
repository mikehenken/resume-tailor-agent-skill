#!/usr/bin/env node
/**
 * Validate resume-tailor state.json structure.
 *
 * Usage: node validate-state.mjs <path-to-state.json>
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { makeError, runCli } from './lib/error-taxonomy.mjs';
import { assertValidTailorState } from './lib/state-schema.mjs';

await runCli(async (argv) => {
  const inputPath = resolve(argv[0] || '../state.json');

  if (!existsSync(inputPath)) {
    throw makeError('RT_INPUT_NOT_FOUND', 'State file not found.', {
      path: inputPath,
    });
  }

  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(inputPath, 'utf-8'));
  } catch (err) {
    throw makeError('RT_JSON_PARSE_FAILED', 'Failed to parse JSON state file.', {
      path: inputPath,
      reason: err instanceof Error ? err.message : String(err),
    });
  }

  assertValidTailorState(parsed, { path: inputPath });
  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        data: {
          path: inputPath,
          message: 'State schema valid.',
        },
      },
      null,
      2
    ) + '\n'
  );
}, { defaultCode: 'RT_VALIDATE_STATE_FAILED' });

