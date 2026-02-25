/**
 * Shared error taxonomy for resume-tailor scripts.
 */

/**
 * @typedef {{
 *   code: string,
 *   message: string,
 *   details?: Record<string, unknown>
 * }} ResumeTailorErrorShape
 */

/**
 * @extends Error
 */
export class ResumeTailorError extends Error {
  /**
   * @param {ResumeTailorErrorShape} payload
   */
  constructor(payload) {
    super(payload.message);
    this.name = 'ResumeTailorError';
    this.code = payload.code;
    this.details = payload.details ?? {};
  }
}

/**
 * @param {string} code
 * @param {string} message
 * @param {Record<string, unknown>} [details]
 * @returns {ResumeTailorError}
 */
export function makeError(code, message, details) {
  return new ResumeTailorError({ code, message, details });
}

/**
 * @param {unknown} err
 * @param {string} fallbackCode
 * @returns {ResumeTailorErrorShape}
 */
export function toErrorShape(err, fallbackCode = 'RT_UNKNOWN') {
  if (err instanceof ResumeTailorError) {
    return {
      code: err.code,
      message: err.message,
      details: err.details ?? {},
    };
  }
  if (err instanceof Error) {
    return {
      code: fallbackCode,
      message: err.message,
      details: {},
    };
  }
  return {
    code: fallbackCode,
    message: String(err),
    details: {},
  };
}

/**
 * @param {ResumeTailorErrorShape} shape
 */
export function printErrorShape(shape) {
  process.stderr.write(
    JSON.stringify(
      {
        ok: false,
        error: shape,
      },
      null,
      2
    ) + '\n'
  );
}

/**
 * @param {(args: string[]) => Promise<void> | void} fn
 * @param {{ defaultCode?: string }} [options]
 */
export async function runCli(fn, options = {}) {
  const defaultCode = options.defaultCode ?? 'RT_UNKNOWN';
  try {
    await fn(process.argv.slice(2));
  } catch (err) {
    const shape = toErrorShape(err, defaultCode);
    printErrorShape(shape);
    process.exit(1);
  }
}
