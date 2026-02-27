#!/usr/bin/env node
/**
 * Validate resume JSON against JSON Resume schema (local copy).
 *
 * Usage: node validate-resume.mjs <path-to-resume.json>
 *
 * Schema: ../research/bundled/json-resume-schema.json
 * (from https://github.com/jsonresume/resume-schema )
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { makeError, runCli } from './lib/error-taxonomy.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultSchema = join(
  __dirname,
  '..',
  'research',
  'bundled',
  'json-resume-schema.json'
);

await runCli(async (argv) => {
  const resumePath = resolve(argv[0] || join(__dirname, '..', 'profile.json'));
  const schemaPath = resolve(argv[1] || defaultSchema);

  if (!existsSync(schemaPath)) {
    throw makeError('RT_SCHEMA_NOT_FOUND', 'Schema not found.', {
      path: schemaPath,
      source:
        'https://raw.githubusercontent.com/jsonresume/resume-schema/master/schema.json',
    });
  }
  if (!existsSync(resumePath)) {
    throw makeError('RT_INPUT_NOT_FOUND', 'Resume not found.', { path: resumePath });
  }

  /** @type {unknown} */
  let schema;
  /** @type {unknown} */
  let data;
  try {
    schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    data = JSON.parse(readFileSync(resumePath, 'utf-8'));
  } catch (err) {
    throw makeError('RT_JSON_PARSE_FAILED', 'Failed to parse JSON.', {
      resumePath,
      schemaPath,
      reason: err instanceof Error ? err.message : String(err),
    });
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  if (validate(data)) {
    process.stdout.write(
      JSON.stringify(
        {
          ok: true,
          data: {
            path: resumePath,
            schemaPath,
            message: 'Valid against JSON Resume schema.',
          },
        },
        null,
        2
      ) + '\n'
    );
    return;
  }

  throw makeError('RT_SCHEMA_VALIDATION_FAILED', 'Resume failed schema validation.', {
    path: resumePath,
    errors: validate.errors ?? [],
  });
}, { defaultCode: 'RT_VALIDATE_RESUME_FAILED' });
