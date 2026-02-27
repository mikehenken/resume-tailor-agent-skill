#!/usr/bin/env node
/**
 * Extract plain text from an existing resume file and emit a JSON Resume skeleton
 * for manual / LLM-assisted completion. Does not call remote AI (offline-only).
 *
 * Formats: .pdf (pdf-parse v2), .docx (mammoth), .txt, .md
 *
 * Inspiration: resumai-react uses JSON Resume for PDF *generation* (see
 * backend/app/services/pdf_service.py) but has no PDF→JSON pipeline; this
 * script fills that gap for resume-tailor / open-source installs.
 *
 * Usage:
 *   node extract-from-resume.mjs <input.{pdf,docx,txt,md}> [-o out.json] [--text-only]
 *
 *   --text-only     Print extracted text to stdout (no JSON). Implies -o ignored.
 *   -o <path>       Write JSON (default: <inputBasename>-extracted.json next to input)
 *
 * The JSON document validates against JSON Resume when meta.resumeTailor is accepted
 * (meta.additionalProperties is true). For a minimal valid shell without rawText in-file,
 * use --text-only and paste into Cursor, or delete meta.resumeTailor.rawText after structuring.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { basename, dirname, join, resolve } from 'path';
import { makeError, runCli } from './lib/error-taxonomy.mjs';
const SCHEMA_URL =
  'https://raw.githubusercontent.com/jsonresume/resume-schema/master/schema.json';

/**
 * @param {string} filePath
 * @returns {Promise<string>}
 */
async function extractPlainText(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.txt') || lower.endsWith('.md')) {
    return readFileSync(filePath, 'utf-8');
  }
  if (lower.endsWith('.pdf')) {
    const { PDFParse } = await import('pdf-parse');
    const data = readFileSync(filePath);
    const parser = new PDFParse({ data });
    try {
      const result = await parser.getText();
      const text = typeof result?.text === 'string' ? result.text : '';
      return text.trim();
    } finally {
      try {
        if (typeof parser.destroy === 'function') {
          await parser.destroy();
        }
      } catch {
        /* ignore */
      }
    }
  }
  if (lower.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const mod = mammoth?.default ?? mammoth;
    const extractRawText = mod.extractRawText;
    if (typeof extractRawText !== 'function') {
      throw new Error('mammoth.extractRawText not available');
    }
    const result = await extractRawText({ path: filePath });
    return (result.value || '').trim();
  }
  throw new Error(
    'Unsupported extension. Use .pdf, .docx, .txt, or .md — got: ' + basename(filePath)
  );
}

/**
 * @param {string} rawText
 * @param {string} sourceFile
 * @returns {Record<string, unknown>}
 */
function buildJsonResumeSkeleton(rawText, sourceFile) {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  return {
    $schema: SCHEMA_URL,
    meta: {
      lastModified: now,
      resumeTailor: {
        extractedFrom: basename(sourceFile),
        extractedAt: now,
        extractor: 'resume-tailor/scripts/extract-from-resume.mjs',
        note:
          'Plain text below is for structuring into basics/work/skills. Remove or trim meta.resumeTailor.rawText after migrating content; keep resume JSON Resume–valid.',
        rawText,
      },
    },
    basics: {
      name: '',
      label: '',
      summary: '',
      location: {
        city: '',
        region: '',
        countryCode: '',
      },
      profiles: [],
    },
    work: [],
    volunteer: [],
    education: [],
    awards: [],
    certificates: [],
    publications: [],
    skills: [],
    languages: [],
    interests: [],
    references: [],
    projects: [],
  };
}

function parseArgv(argv) {
  const positional = [];
  let outPath = null;
  let textOnly = false;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--text-only') {
      textOnly = true;
    } else if (a === '-o' && i + 1 < argv.length) {
      i += 1;
      outPath = argv[i] ?? null;
    } else if (a.startsWith('-')) {
      throw makeError('RT_USAGE', 'Unknown flag.', { flag: a });
    } else {
      positional.push(a);
    }
  }
  return { positional, outPath, textOnly };
}

async function main(argv) {
  const { positional, outPath, textOnly } = parseArgv(argv);
  if (positional.length < 1) {
    throw makeError(
      'RT_USAGE',
      'Usage: node extract-from-resume.mjs <file.pdf|docx|txt|md> [-o out.json] [--text-only]'
    );
  }

  const inputPath = resolve(positional[0] ?? '');
  if (!existsSync(inputPath)) {
    throw makeError('RT_INPUT_NOT_FOUND', 'Input file not found.', {
      path: inputPath,
    });
  }

  let text;
  try {
    text = await extractPlainText(inputPath);
  } catch (err) {
    throw makeError(
      'RT_EXTRACT_FAILED',
      'Failed to extract plain text from resume file.',
      {
        path: inputPath,
        reason: err instanceof Error ? err.message : String(err),
      }
    );
  }

  if (textOnly) {
    process.stdout.write(text + (text.endsWith('\n') ? '' : '\n'));
    return;
  }

  const json = buildJsonResumeSkeleton(text, inputPath);
  const defaultOut = join(
    dirname(inputPath),
    basename(inputPath).replace(/\.[^.]+$/, '') + '-extracted.json'
  );
  const dest = outPath ? resolve(outPath) : defaultOut;

  writeFileSync(dest, JSON.stringify(json, null, 2) + '\n', 'utf-8');
  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        data: {
          path: dest,
          sourcePath: inputPath,
          message:
            'Extracted text to JSON Resume skeleton. Map meta.resumeTailor.rawText into basics/work/skills, then run normalize + validate.',
        },
      },
      null,
      2
    ) + '\n'
  );
}

await runCli(main, { defaultCode: 'RT_EXTRACT_CLI_FAILED' });
