#!/usr/bin/env node
/**
 * Export tailored resume JSON to PDF using selectable HTML/CSS designs.
 *
 * Usage:
 *   node export-pdf.mjs <input-json-path> [--design=<id>]
 *
 * Design resolution order: --design flag > state.export_design > RESUME_TAILOR_DESIGN env > default (ats)
 *
 * Do not pass a raw output path as second positional when using state.json; the script derives filenames.
 * Optional: node export-pdf.mjs <path> <output.pdf> [--design=x] (explicit output still supported)
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  buildHtmlDocument,
  defaultPdfFilename,
  loadDesignsManifest,
  parseExportArgv,
  pickDesignId,
} from './lib/resume-pdf-utils.mjs';
import { makeError, runCli } from './lib/error-taxonomy.mjs';
import {
  assertValidTailorState,
  isTailorStateCandidate,
  validateTailorStateStructure,
} from './lib/state-schema.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillRoot = resolve(__dirname, '..');

async function main(argv) {
  const manifest = loadDesignsManifest(skillRoot);
  const { positional, designFlag } = parseExportArgv(argv);
  if (positional.length < 1) {
    throw makeError(
      'RT_USAGE',
      'Usage: node export-pdf.mjs <input-json-path> [output.pdf] [--design=<id>]',
      {
        designs: Object.keys(manifest.designs),
      }
    );
  }

  const inputPath = resolve(positional[0] ?? '');

  if (!existsSync(inputPath)) {
    throw makeError('RT_INPUT_NOT_FOUND', 'Input JSON file not found.', {
      path: inputPath,
    });
  }

  /** @type {Record<string, unknown>} */
  let stateData;
  try {
    const raw = readFileSync(inputPath, 'utf-8');
    const parsed = JSON.parse(raw);
    stateData = typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (err) {
    throw makeError('RT_JSON_PARSE_FAILED', 'Failed to parse input JSON.', {
      path: inputPath,
      reason: err instanceof Error ? err.message : String(err),
    });
  }

  if (isTailorStateCandidate(stateData, { path: inputPath })) {
    const validation = validateTailorStateStructure(stateData);
    if (validation.valid) {
      assertValidTailorState(stateData, { path: inputPath });
    } else {
      // Compatibility fallback: if a file named state.json contains raw JSON Resume,
      // allow export without forcing the state wrapper contract.
      const looksLikeRawResume =
        typeof stateData === 'object' &&
        stateData !== null &&
        typeof stateData.basics === 'object' &&
        stateData.basics !== null &&
        Array.isArray(stateData.work) &&
        Array.isArray(stateData.skills);
      if (!looksLikeRawResume) {
        throw makeError('RT_STATE_SCHEMA_INVALID', 'State schema validation failed.', {
          path: inputPath,
          violations: validation.errors,
        });
      }
    }
  }

  const designId = pickDesignId(stateData, designFlag, manifest);
  const resume = stateData.tailored_content || stateData;

  let outputPath;
  if (positional[1] && !positional[1].startsWith('--')) {
    outputPath = resolve(positional[1]);
  } else {
    outputPath = join(dirname(inputPath), defaultPdfFilename(stateData, designId));
  }

  const basics = resume.basics || {};
  if (!basics.url || basics.url === '') {
    basics.url = 'https://your-portfolio.com';
  }
  const profiles = Array.isArray(basics.profiles) ? basics.profiles : [];
  const hasPortfolio = profiles.some(
    (p) =>
      p &&
      (p.network === 'Personal Website' ||
        (p.url && p.url.includes('your-portfolio.com')))
  );
  if (!hasPortfolio) {
    profiles.unshift({
      network: 'Personal Website',
      username: '',
      url: 'https://your-portfolio.com',
    });
    basics.profiles = profiles;
  }
  const hasLinkedIn = profiles.some(
    (p) =>
      p &&
      (/linkedin/i.test(p.network || '') ||
        (p.url && p.url.includes('linkedin')))
  );
  if (!hasLinkedIn) {
    profiles.push({
      network: 'LinkedIn',
      username: 'your-profile',
      url: 'https://linkedin.com/in/your-profile',
    });
    basics.profiles = profiles;
  }
  resume.basics = basics;

  const designDef = manifest.designs[designId];
  if (designDef && designDef.atsCompliant === false) {
    console.warn(
      '[resume-tailor] Design "' +
        designId +
        '" is not marked ATS-safe in designs.json. Use `ats` for job-board parsers unless you intend a visual PDF only.'
    );
  }

  const templateHtml = buildHtmlDocument(skillRoot, resume, designId, manifest);
  const htmlPath = join(dirname(outputPath), '_resume_temp.html');
  writeFileSync(htmlPath, templateHtml, 'utf-8');

  let puppeteer;
  try {
    puppeteer = await import('puppeteer');
  } catch {
    try {
      unlinkSync(htmlPath);
    } catch (_) {}
    throw makeError('RT_DEPENDENCY_MISSING', 'Puppeteer not installed.', {
      action: 'Run: cd scripts && npm install',
    });
  }

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      format: 'Letter',
      margin: { top: '0.75in', right: '0.75in', bottom: '0.75in', left: '0.75in' },
      printBackground: true,
    });
  } finally {
    await browser.close();
    try {
      unlinkSync(htmlPath);
    } catch (_) {}
  }

  console.log('PDF written to:', outputPath);
  console.log('Design:', designId, '(' + (designDef?.label || '') + ')');
}

await runCli(main, { defaultCode: 'RT_EXPORT_FAILED' });
