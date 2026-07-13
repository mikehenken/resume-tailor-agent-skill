import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  listProfileIds,
  readUserConfig,
  resolveProfilePath,
  slugifyProfileId,
  writeProfile,
  writeUserConfig,
} from '../lib/profile-paths.mjs';

test('slugifyProfileId normalizes names', () => {
  assert.equal(slugifyProfileId('Jordan Lee'), 'jordan-lee');
  assert.equal(slugifyProfileId('  MIKE HENKEN  '), 'mike-henken');
});

test('write/list/resolve profiles and defaultProfileId', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rt-profiles-'));
  try {
    const profile = {
      basics: { name: 'Jordan Lee', label: 'Engineer' },
      work: [],
      skills: [],
    };
    writeProfile(root, 'Jordan Lee', profile, { setDefault: true });
    assert.deepEqual(listProfileIds(root), ['jordan-lee']);
    assert.deepEqual(readUserConfig(root), { defaultProfileId: 'jordan-lee' });

    const resolvedDefault = resolveProfilePath({ userRoot: root });
    assert.equal(resolvedDefault.profileId, 'jordan-lee');
    assert.equal(resolvedDefault.source, 'default');
    assert.ok(resolvedDefault.profilePath && fs.existsSync(resolvedDefault.profilePath));

    writeProfile(root, 'alex-applicant', {
      basics: { name: 'Alex Applicant' },
      work: [],
      skills: [],
    });
    writeUserConfig(root, { defaultProfileId: 'alex-applicant' });

    const byId = resolveProfilePath({ userRoot: root, profileId: 'jordan-lee' });
    assert.equal(byId.profileId, 'jordan-lee');
    assert.equal(byId.source, 'profiles');

    const otherDefault = resolveProfilePath({ userRoot: root });
    assert.equal(otherDefault.profileId, 'alex-applicant');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('resolveProfilePath prefers legacy user profile when no multi-profile default', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rt-legacy-'));
  try {
    const legacy = path.join(root, 'profile.json');
    fs.writeFileSync(
      legacy,
      JSON.stringify({ basics: { name: 'Legacy' }, work: [], skills: [] }),
      'utf8'
    );
    const resolved = resolveProfilePath({ userRoot: root });
    assert.equal(resolved.source, 'legacy-user');
    assert.equal(resolved.profilePath, legacy);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
