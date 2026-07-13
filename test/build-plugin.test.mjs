import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('build-plugin stages agent, skill, and zip', () => {
  execSync('node bin/build-plugin.mjs', { cwd: REPO_ROOT, stdio: 'pipe' });

  const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));
  const version = pkg.version;
  const pluginRoot = path.join(REPO_ROOT, 'plugins', 'resume-tailor');
  const zipPath = path.join(REPO_ROOT, `resume-tailor-plugin-v${version}.zip`);

  assert.ok(fs.existsSync(zipPath), `expected zip at ${zipPath}`);
  assert.ok(fs.existsSync(path.join(pluginRoot, 'agents', 'resume-tailor.md')));
  assert.ok(fs.existsSync(path.join(pluginRoot, 'skills', 'resume-tailor', 'SKILL.md')));

  const skillMd = fs.readFileSync(
    path.join(pluginRoot, 'skills', 'resume-tailor', 'SKILL.md'),
    'utf8'
  );
  assert.match(skillMd, /\$CLAUDE_PLUGIN_DIR\/skills\/resume-tailor/);
  assert.match(skillMd, /chat-only.*no setup commands/i);

  const agentMd = fs.readFileSync(path.join(pluginRoot, 'agents', 'resume-tailor.md'), 'utf8');
  assert.match(agentMd, /never ask the user to run setup/i);

  const pluginJson = JSON.parse(
    fs.readFileSync(path.join(pluginRoot, '.claude-plugin', 'plugin.json'), 'utf8')
  );
  assert.equal(pluginJson.version, version);
});
