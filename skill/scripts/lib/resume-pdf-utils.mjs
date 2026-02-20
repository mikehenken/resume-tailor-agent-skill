/**
 * Pure helpers and HTML assembly for export-pdf.mjs (unit-tested).
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * @typedef {{ defaultDesignId: string, designs: Record<string, { label: string, atsCompliant?: boolean, styleFile: string, aliases?: string[], inspiredBy?: string }> }} DesignsManifest
 */

/**
 * @param {string} skillRoot
 * @returns {DesignsManifest}
 */
export function loadDesignsManifest(skillRoot) {
  const path = join(skillRoot, 'designs.json');
  if (!existsSync(path)) {
    throw new Error('designs.json not found at ' + path);
  }
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw);
}

/**
 * @param {string} input
 * @param {DesignsManifest} manifest
 * @returns {string}
 */
export function resolveDesignId(input, manifest) {
  const normalized = (input || '').trim().toLowerCase();
  if (!normalized) {
    return manifest.defaultDesignId;
  }
  if (manifest.designs[normalized]) {
    return normalized;
  }
  const entries = Object.entries(manifest.designs);
  for (let i = 0; i < entries.length; i += 1) {
    const id = entries[i][0];
    const def = entries[i][1];
    const aliases = def.aliases || [];
    for (let j = 0; j < aliases.length; j += 1) {
      if (aliases[j].toLowerCase() === normalized) {
        return id;
      }
    }
  }
  throw new Error(
    'Unknown design "' +
      input +
      '". Valid ids: ' +
      Object.keys(manifest.designs).join(', ')
  );
}

/**
 * Serialize JSON for safe embedding in an inline HTML &lt;script&gt; assignment.
 * @param {unknown} value
 * @returns {string}
 */
export function jsonForInlineScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * @param {unknown} v
 * @returns {string} YYYY-MM-DD
 */
export function isoDatePrefix(v) {
  if (typeof v === 'string' && v.length >= 10) {
    const slice = v.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(slice)) {
      return slice;
    }
  }
  return new Date().toISOString().slice(0, 10);
}

export function slugify(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  return (
    text
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .trim() || ''
  );
}

/**
 * @param {Record<string, unknown>} data
 * @param {string} designId
 */
export function defaultPdfFilename(data, designId) {
  const role =
    data.target?.role ||
    data.tailored_content?.basics?.label ||
    data.basics?.label ||
    'Resume';
  const company = data.target?.company || '';
  const createdRaw = data.created_at || data.updated_at || new Date().toISOString();
  const date = isoDatePrefix(createdRaw);

  const roleSlug =
    slugify(role.split(/[,(]|[-|]/)[0]?.trim() || role) || 'Resume';
  const companySlug = slugify(company) || 'General';

  const designSuffix = designId && designId !== 'ats' ? '_' + designId : '';

  if (companySlug && companySlug !== 'General') {
    return `Henken_Resume_${roleSlug}_${companySlug}_${date}${designSuffix}.pdf`;
  }
  return `Henken_Resume_${roleSlug}_${date}${designSuffix}.pdf`;
}

/**
 * @param {string[]} argv
 * @returns {{ positional: string[], designFlag: string | null }}
 */
export function parseExportArgv(argv) {
  const positional = [];
  let designFlag = null;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--design=')) {
      designFlag = a.slice('--design='.length);
    } else if (a === '--design' && i + 1 < argv.length) {
      i += 1;
      designFlag = argv[i] ?? null;
    } else {
      positional.push(a);
    }
  }
  return { positional, designFlag };
}

/**
 * @param {Record<string, unknown>} stateData
 * @param {string | null} designFlag
 * @param {DesignsManifest} manifest
 * @returns {string}
 */
export function pickDesignId(stateData, designFlag, manifest) {
  if (designFlag) {
    return resolveDesignId(designFlag, manifest);
  }
  const fromState = stateData.export_design;
  if (typeof fromState === 'string' && fromState.trim() !== '') {
    return resolveDesignId(fromState, manifest);
  }
  const fromEnv = process.env.RESUME_TAILOR_DESIGN;
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') {
    return resolveDesignId(fromEnv, manifest);
  }
  return manifest.defaultDesignId;
}

/**
 * @param {string} skillRoot
 * @param {unknown} resume
 * @param {string} designId
 * @param {DesignsManifest} manifest
 */
export function buildHtmlDocument(skillRoot, resume, designId, manifest) {
  const def = manifest.designs[designId];
  if (!def || !def.styleFile) {
    throw new Error('Invalid design definition for ' + designId);
  }
  const cssPath = join(skillRoot, 'templates', 'styles', def.styleFile);
  if (!existsSync(cssPath)) {
    throw new Error('Style file not found: ' + cssPath);
  }
  const css = readFileSync(cssPath, 'utf-8');
  const renderPath = join(skillRoot, 'partials', 'render-body.js');
  if (!existsSync(renderPath)) {
    throw new Error('render-body.js not found: ' + renderPath);
  }
  const renderJs = readFileSync(renderPath, 'utf-8');

  const resumeLiteral = jsonForInlineScript(resume);
  const designLiteral = jsonForInlineScript(designId);
  return (
    '<!DOCTYPE html>\n' +
    '<html lang="en">\n' +
    '<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '  <title>Resume</title>\n' +
    '  <style>\n' +
    css +
    '\n  </style>\n' +
    '</head>\n' +
    '<body>\n' +
    '  <div id="resume"></div>\n' +
    '  <script>window.__RESUME_DESIGN__=' +
    designLiteral +
    ';window.__RESUME__=' +
    resumeLiteral +
    ';<\/script>\n' +
    '  <script>\n' +
    renderJs +
    '\n  <\/script>\n' +
    '</body>\n' +
    '</html>\n'
  );
}
