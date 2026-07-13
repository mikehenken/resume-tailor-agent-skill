/**
 * Portable user-data root for resume-tailor (Code, Cowork, cloud, plugin).
 *
 * Default: ./.resume-tailor relative to workspace (cwd) — no ~/.claude requirement.
 * Override: RESUME_TAILOR_USER_DIR (absolute path; use Cowork granted folder).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * @param {string} [cwd]
 * @returns {string} Absolute path to user data root
 */
export function resolveUserRoot(cwd = process.cwd()) {
  const fromEnv = process.env.RESUME_TAILOR_USER_DIR;
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') {
    return path.resolve(fromEnv.trim());
  }

  const workspaceRoot = path.resolve(cwd, '.resume-tailor');
  if (fs.existsSync(workspaceRoot)) {
    return workspaceRoot;
  }

  const homedir = os.homedir();
  const legacyClaude = path.join(homedir, '.claude', 'resume-tailor');
  if (fs.existsSync(legacyClaude)) {
    return legacyClaude;
  }

  const legacyCursor = path.join(homedir, '.cursor', 'resume-tailor');
  if (fs.existsSync(legacyCursor)) {
    return legacyCursor;
  }

  const homeNeutral = path.join(homedir, '.resume-tailor');
  if (fs.existsSync(homeNeutral)) {
    return homeNeutral;
  }

  return workspaceRoot;
}

/**
 * Ensure standard user-data directories exist at an explicit root.
 *
 * @param {string} userRoot
 * @returns {{ userRoot: string, created: boolean }}
 */
export function ensureUserDataLayoutAt(userRoot) {
  const root = path.resolve(userRoot);
  const existed = fs.existsSync(root);
  const dirs = [
    root,
    path.join(root, 'profiles'),
    path.join(root, 'tailors'),
    path.join(root, 'research', 'extension'),
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const extReadme = path.join(root, 'research', 'extension', 'README.md');
  if (!fs.existsSync(extReadme)) {
    fs.writeFileSync(
      extReadme,
      '# User extension research\n\nOptional private markdown add-ons for resume tailoring.\n',
      'utf8'
    );
  }
  return { userRoot: root, created: !existed };
}

/**
 * Ensure standard user-data directories exist (resolved from cwd / env).
 *
 * @param {string} [cwd]
 * @returns {{ userRoot: string, created: boolean }}
 */
export function ensureUserDataLayout(cwd = process.cwd()) {
  return ensureUserDataLayoutAt(resolveUserRoot(cwd));
}

/**
 * Resolve skill root from env (plugin) or derive from this module location.
 *
 * @param {string} [fallbackDir] dirname of scripts/ caller
 * @returns {string}
 */
export function resolveSkillRoot(fallbackDir) {
  const fromEnv = process.env.RESUME_TAILOR_SKILL_DIR;
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') {
    return path.resolve(fromEnv.trim());
  }
  if (typeof fallbackDir === 'string' && fallbackDir !== '') {
    return path.resolve(fallbackDir, '..');
  }
  return path.resolve('.');
}
