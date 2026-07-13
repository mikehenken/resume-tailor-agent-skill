/**
 * Multi-profile path helpers for resume-tailor user data.
 *
 * Layout:
 *   {USER_ROOT}/config.json                 — { defaultProfileId?: string }
 *   {USER_ROOT}/profiles/{id}/profile.json  — candidate baseline (JSON Resume)
 *   {USER_ROOT}/tailors/{tailor-id}/         — sessions; state.profile_id binds candidate
 *
 * Legacy (still resolved, read-only preference order documented in SKILL.md):
 *   {USER_ROOT}/profile.json
 *   {SKILL_ROOT}/profile.json
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} value
 * @returns {string}
 */
export function slugifyProfileId(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'candidate';
}

/**
 * @param {string} userRoot
 * @returns {{ defaultProfileId?: string }}
 */
export function readUserConfig(userRoot) {
  const configPath = path.join(userRoot, 'config.json');
  if (!fs.existsSync(configPath)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const defaultProfileId =
        typeof parsed.defaultProfileId === 'string' &&
        parsed.defaultProfileId.trim() !== ''
          ? parsed.defaultProfileId.trim()
          : undefined;
      return defaultProfileId ? { defaultProfileId } : {};
    }
  } catch {
    return {};
  }
  return {};
}

/**
 * @param {string} userRoot
 * @param {{ defaultProfileId?: string }} config
 */
export function writeUserConfig(userRoot, config) {
  fs.mkdirSync(userRoot, { recursive: true });
  const out = {};
  if (
    typeof config.defaultProfileId === 'string' &&
    config.defaultProfileId.trim() !== ''
  ) {
    out.defaultProfileId = config.defaultProfileId.trim();
  }
  fs.writeFileSync(
    path.join(userRoot, 'config.json'),
    JSON.stringify(out, null, 2) + '\n',
    'utf8'
  );
}

/**
 * @param {string} userRoot
 * @returns {string[]}
 */
export function listProfileIds(userRoot) {
  const profilesDir = path.join(userRoot, 'profiles');
  if (!fs.existsSync(profilesDir)) {
    return [];
  }
  return fs
    .readdirSync(profilesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((id) => fs.existsSync(path.join(profilesDir, id, 'profile.json')))
    .sort();
}

/**
 * Resolve which profile.json to load for a new or continuing session.
 *
 * Priority for an explicit id: profiles/{id}/profile.json
 * For default/new (no id): config.defaultProfileId → legacy USER_ROOT/profile.json → SKILL_ROOT/profile.json
 *
 * @param {{
 *   userRoot: string,
 *   skillRoot?: string,
 *   profileId?: string | null,
 * }} opts
 * @returns {{ profileId: string | null, profilePath: string | null, source: string }}
 */
export function resolveProfilePath(opts) {
  const userRoot = opts.userRoot;
  const skillRoot = opts.skillRoot;
  const requested =
    typeof opts.profileId === 'string' && opts.profileId.trim() !== ''
      ? opts.profileId.trim()
      : null;

  if (requested) {
    const multi = path.join(userRoot, 'profiles', requested, 'profile.json');
    if (fs.existsSync(multi)) {
      return { profileId: requested, profilePath: multi, source: 'profiles' };
    }
    return { profileId: requested, profilePath: null, source: 'missing' };
  }

  const config = readUserConfig(userRoot);
  if (config.defaultProfileId) {
    const multi = path.join(
      userRoot,
      'profiles',
      config.defaultProfileId,
      'profile.json'
    );
    if (fs.existsSync(multi)) {
      return {
        profileId: config.defaultProfileId,
        profilePath: multi,
        source: 'default',
      };
    }
  }

  const legacyUser = path.join(userRoot, 'profile.json');
  if (fs.existsSync(legacyUser)) {
    return { profileId: null, profilePath: legacyUser, source: 'legacy-user' };
  }

  if (skillRoot) {
    const legacySkill = path.join(skillRoot, 'profile.json');
    if (fs.existsSync(legacySkill)) {
      return {
        profileId: null,
        profilePath: legacySkill,
        source: 'legacy-skill',
      };
    }
  }

  const ids = listProfileIds(userRoot);
  if (ids.length === 1) {
    const only = ids[0];
    return {
      profileId: only,
      profilePath: path.join(userRoot, 'profiles', only, 'profile.json'),
      source: 'sole-profile',
    };
  }

  return { profileId: null, profilePath: null, source: 'none' };
}

/**
 * @param {string} userRoot
 * @param {string} profileId
 * @param {unknown} profileJson
 * @param {{ setDefault?: boolean }} [opts]
 * @returns {string} absolute path written
 */
export function writeProfile(userRoot, profileId, profileJson, opts = {}) {
  const id = slugifyProfileId(profileId);
  const dir = path.join(userRoot, 'profiles', id);
  fs.mkdirSync(dir, { recursive: true });
  const profilePath = path.join(dir, 'profile.json');
  fs.writeFileSync(profilePath, JSON.stringify(profileJson, null, 2) + '\n', 'utf8');
  if (opts.setDefault) {
    writeUserConfig(userRoot, { defaultProfileId: id });
  }
  return profilePath;
}
