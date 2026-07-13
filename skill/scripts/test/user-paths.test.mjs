import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  ensureUserDataLayout,
  ensureUserDataLayoutAt,
  resolveSkillRoot,
  resolveUserRoot,
} from '../lib/user-paths.mjs';

test('resolveUserRoot prefers RESUME_TAILOR_USER_DIR', () => {
  const custom = path.join(os.tmpdir(), `rt-user-${Date.now()}`);
  fs.mkdirSync(custom, { recursive: true });
  const prev = process.env.RESUME_TAILOR_USER_DIR;
  process.env.RESUME_TAILOR_USER_DIR = custom;
  try {
    assert.equal(resolveUserRoot('/unused'), path.resolve(custom));
  } finally {
    if (prev === undefined) {
      delete process.env.RESUME_TAILOR_USER_DIR;
    } else {
      process.env.RESUME_TAILOR_USER_DIR = prev;
    }
    fs.rmSync(custom, { recursive: true, force: true });
  }
});

test('resolveUserRoot defaults to workspace .resume-tailor when no legacy dirs', () => {
  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'rt-home-'));
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'rt-cwd-'));
  const prevProfile = process.env.USERPROFILE;
  const prevHome = process.env.HOME;
  const prevUserDir = process.env.RESUME_TAILOR_USER_DIR;
  delete process.env.RESUME_TAILOR_USER_DIR;
  process.env.USERPROFILE = tmpHome;
  process.env.HOME = tmpHome;
  try {
    const root = resolveUserRoot(cwd);
    assert.equal(root, path.join(cwd, '.resume-tailor'));
  } finally {
    if (prevProfile === undefined) {
      delete process.env.USERPROFILE;
    } else {
      process.env.USERPROFILE = prevProfile;
    }
    if (prevHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = prevHome;
    }
    if (prevUserDir === undefined) {
      delete process.env.RESUME_TAILOR_USER_DIR;
    } else {
      process.env.RESUME_TAILOR_USER_DIR = prevUserDir;
    }
    fs.rmSync(tmpHome, { recursive: true, force: true });
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('ensureUserDataLayoutAt creates profiles and tailors dirs', () => {
  const userRoot = path.join(os.tmpdir(), `rt-layout-at-${Date.now()}`);
  try {
    const { userRoot: root, created } = ensureUserDataLayoutAt(userRoot);
    assert.equal(created, true);
    assert.equal(root, path.resolve(userRoot));
    assert.ok(fs.existsSync(path.join(root, 'profiles')));
    assert.ok(fs.existsSync(path.join(root, 'tailors')));
    assert.ok(fs.existsSync(path.join(root, 'research', 'extension', 'README.md')));
  } finally {
    fs.rmSync(userRoot, { recursive: true, force: true });
  }
});

test('ensureUserDataLayout creates profiles and tailors dirs', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'rt-layout-'));
  const prev = process.env.RESUME_TAILOR_USER_DIR;
  process.env.RESUME_TAILOR_USER_DIR = path.join(cwd, '.resume-tailor');
  try {
    const { userRoot, created } = ensureUserDataLayout(cwd);
    assert.equal(created, true);
    assert.ok(fs.existsSync(path.join(userRoot, 'profiles')));
    assert.ok(fs.existsSync(path.join(userRoot, 'tailors')));
    assert.ok(fs.existsSync(path.join(userRoot, 'research', 'extension', 'README.md')));
  } finally {
    if (prev === undefined) {
      delete process.env.RESUME_TAILOR_USER_DIR;
    } else {
      process.env.RESUME_TAILOR_USER_DIR = prev;
    }
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('resolveSkillRoot honors RESUME_TAILOR_SKILL_DIR', () => {
  const custom = path.join(os.tmpdir(), `rt-skill-${Date.now()}`);
  fs.mkdirSync(custom, { recursive: true });
  const prev = process.env.RESUME_TAILOR_SKILL_DIR;
  process.env.RESUME_TAILOR_SKILL_DIR = custom;
  try {
    assert.equal(resolveSkillRoot('/fallback/scripts'), path.resolve(custom));
  } finally {
    if (prev === undefined) {
      delete process.env.RESUME_TAILOR_SKILL_DIR;
    } else {
      process.env.RESUME_TAILOR_SKILL_DIR = prev;
    }
    fs.rmSync(custom, { recursive: true, force: true });
  }
});
