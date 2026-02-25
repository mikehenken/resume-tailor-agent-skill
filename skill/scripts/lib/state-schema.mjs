/**
 * State schema guards for resume-tailor state.json.
 */

import { makeError } from './error-taxonomy.mjs';

const MODES = new Set(['role_only', 'company_role']);
const APPLICATION_STATUSES = new Set([
  'not_applied',
  'applied',
  'replied',
  'interviewing',
  'offer',
  'rejected',
]);

const STATE_MARKER_KEYS = [
  'tailor_id',
  'created_at',
  'updated_at',
  'target',
  'mode',
  'tailored_content',
  'decisions',
  'change_report_path',
];

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isJsonResumeLike(value) {
  if (!isObject(value)) {
    return false;
  }
  const basics = value.basics;
  const work = value.work;
  const skills = value.skills;
  return isObject(basics) && Array.isArray(work) && Array.isArray(skills);
}

/**
 * @param {string | undefined} path
 * @returns {boolean}
 */
function isStateFilePath(path) {
  if (typeof path !== 'string' || path.trim() === '') {
    return false;
  }
  const normalized = path.replace(/\\/g, '/').toLowerCase();
  return normalized.endsWith('/state.json') || normalized === 'state.json';
}

/**
 * Decide whether JSON should be treated as resume-tailor state.
 *
 * @param {unknown} input
 * @param {{ path?: string }} [context]
 * @returns {boolean}
 */
export function isTailorStateCandidate(input, context = {}) {
  if (!isObject(input)) {
    return false;
  }
  if (isStateFilePath(context.path)) {
    return true;
  }
  for (let i = 0; i < STATE_MARKER_KEYS.length; i += 1) {
    if (Object.prototype.hasOwnProperty.call(input, STATE_MARKER_KEYS[i])) {
      return true;
    }
  }
  return false;
}

/**
 * @param {unknown} stateData
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTailorStateStructure(stateData) {
  /** @type {string[]} */
  const errors = [];
  if (!isObject(stateData)) {
    return { valid: false, errors: ['State root must be a JSON object.'] };
  }

  if (!isNonEmptyString(stateData.tailor_id)) {
    errors.push('tailor_id must be a non-empty string.');
  }
  if (!isNonEmptyString(stateData.created_at)) {
    errors.push('created_at must be a non-empty string.');
  }
  if (!isNonEmptyString(stateData.updated_at)) {
    errors.push('updated_at must be a non-empty string.');
  }
  if (!isNonEmptyString(stateData.change_report_path)) {
    errors.push('change_report_path must be a non-empty string.');
  }
  if (!isObject(stateData.target) || !isNonEmptyString(stateData.target.role)) {
    errors.push('target.role must be a non-empty string.');
  }

  if (!isNonEmptyString(stateData.mode) || !MODES.has(stateData.mode)) {
    errors.push("mode must be either 'role_only' or 'company_role'.");
  }

  if (!isJsonResumeLike(stateData.tailored_content)) {
    errors.push(
      'tailored_content must be a JSON Resume-like object with basics/work/skills.'
    );
  }

  if (!Array.isArray(stateData.decisions)) {
    errors.push('decisions must be an array.');
  }

  if (
    stateData.application_status !== undefined &&
    (!isNonEmptyString(stateData.application_status) ||
      !APPLICATION_STATUSES.has(stateData.application_status))
  ) {
    errors.push(
      "application_status must be one of: not_applied, applied, replied, interviewing, offer, rejected."
    );
  }

  if (
    stateData.export_design !== undefined &&
    !isNonEmptyString(stateData.export_design)
  ) {
    errors.push('export_design must be a non-empty string when provided.');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * @param {unknown} stateData
 * @param {{ path?: string }} [context]
 */
export function assertValidTailorState(stateData, context = {}) {
  const result = validateTailorStateStructure(stateData);
  if (!result.valid) {
    throw makeError('RT_STATE_SCHEMA_INVALID', 'State schema validation failed.', {
      path: context.path ?? null,
      violations: result.errors,
    });
  }
}

