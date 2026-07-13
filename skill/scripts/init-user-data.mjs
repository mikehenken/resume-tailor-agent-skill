#!/usr/bin/env node
/**
 * Agent-internal helper — NOT for end users.
 * The resume-tailor agent runs this silently when creating user data layout.
 * Users onboard and tailor in chat only; they never run this script.
 *
 * Usage (agent only): node init-user-data.mjs [--json]
 */

import { ensureUserDataLayout, resolveUserRoot } from './lib/user-paths.mjs';
import { runCli } from './lib/error-taxonomy.mjs';

/**
 * @param {string[]} argv
 */
async function main(argv) {
  const jsonOut = argv.includes('--json');
  const { userRoot, created } = ensureUserDataLayout();
  const payload = {
    userRoot,
    created,
    hint:
      'Set RESUME_TAILOR_USER_DIR to relocate (e.g. Cowork granted folder). Profiles live under profiles/{id}/profile.json.',
  };
  if (jsonOut) {
    console.log(JSON.stringify({ ok: true, data: payload }));
    return;
  }
  console.log('User data root:', userRoot);
  console.log(created ? 'Created new layout.' : 'Layout already present.');
  console.log('Profiles:', `${userRoot}/profiles/{id}/profile.json`);
  console.log('Tailors:', `${userRoot}/tailors/{tailor-id}/state.json`);
}

await runCli(main, { defaultCode: 'RT_INIT_FAILED' });
