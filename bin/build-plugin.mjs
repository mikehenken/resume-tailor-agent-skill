#!/usr/bin/env node
/**
 * Assemble plugins/resume-tailor from canonical skill/ + agent templates,
 * then zip for GitHub Releases (resume-tailor-plugin-v{version}.zip).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN_ROOT = path.join(REPO_ROOT, 'plugins', 'resume-tailor');
const SKILL_SRC = path.join(REPO_ROOT, 'skill');
const SKILL_DST = path.join(PLUGIN_ROOT, 'skills', 'resume-tailor');
const AGENTS_DST = path.join(PLUGIN_ROOT, 'agents');
const PLUGIN_JSON = path.join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json');

/** Plugin path tokens baked into SKILL.md and agent frontmatter. */
const PLUGIN_SKILL_ROOT = '$CLAUDE_PLUGIN_DIR/skills/resume-tailor';
const PLUGIN_USER_ROOT = './.resume-tailor';
const PLUGIN_PLATFORM_ROOT = '.';

const COPY_SKIP_DIRS = new Set(['node_modules', '.git', '__pycache__']);
const COPY_SKIP_FILES = new Set(['.DS_Store', 'Thumbs.db']);

/**
 * @param {string} md
 * @returns {string}
 */
function stripYamlFrontmatter(md) {
  if (!md.startsWith('---\n')) {
    return md;
  }
  const end = md.indexOf('\n---\n', 4);
  if (end === -1) {
    return md;
  }
  return md.slice(end + 5).replace(/^\n+/, '');
}

/**
 * @param {string} text
 * @param {{ skillRoot: string, userRoot: string, platformRoot: string }} paths
 * @returns {string}
 */
function applyPathTokens(text, paths) {
  return text
    .replace(/\{SKILL_ROOT\}/g, paths.skillRoot)
    .replace(/\{USER_ROOT\}/g, paths.userRoot)
    .replace(/\{PLATFORM_ROOT\}/g, paths.platformRoot);
}

/**
 * @param {string} src
 * @param {string} dest
 */
function copyRecursiveSync(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      if (COPY_SKIP_DIRS.has(name)) {
        continue;
      }
      copyRecursiveSync(path.join(src, name), path.join(dest, name));
    }
    return;
  }
  if (COPY_SKIP_FILES.has(path.basename(src))) {
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

/**
 * @param {string} dir
 */
function rimrafSync(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * @param {string[]} argv
 * @returns {string}
 */
function resolveVersion(argv) {
  const flag = argv.find((a) => a.startsWith('--version='));
  if (flag) {
    const v = flag.slice('--version='.length).trim();
    if (v) {
      return v;
    }
  }
  const pkgPath = path.join(REPO_ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (typeof pkg.version === 'string' && pkg.version.trim() !== '') {
    return pkg.version.trim();
  }
  throw new Error('Could not resolve plugin version (pass --version= or set package.json version)');
}

/**
 * @param {string} pluginDir
 * @param {string} outZip
 */
function createPluginZip(pluginDir, outZip) {
  const absPlugin = path.resolve(pluginDir);
  const absOut = path.resolve(outZip);
  rimrafSync(absOut);

  if (process.platform === 'win32') {
    const escapedPlugin = absPlugin.replace(/'/g, "''");
    const escapedOut = absOut.replace(/'/g, "''");
    execSync(
      `powershell -NoProfile -Command "Compress-Archive -Path '${escapedPlugin}\\*' -DestinationPath '${escapedOut}' -Force"`,
      { stdio: 'inherit' }
    );
    return;
  }

  const parent = path.dirname(absPlugin);
  const base = path.basename(absPlugin);
  execSync(`cd "${parent}" && zip -r "${absOut}" "${base}"`, { stdio: 'inherit' });
}

/**
 * @param {string} version
 */
function buildPlugin(version) {
  const paths = {
    skillRoot: PLUGIN_SKILL_ROOT,
    userRoot: PLUGIN_USER_ROOT,
    platformRoot: PLUGIN_PLATFORM_ROOT,
  };

  console.log(`Building resume-tailor plugin v${version}...`);

  rimrafSync(SKILL_DST);
  rimrafSync(AGENTS_DST);
  fs.mkdirSync(SKILL_DST, { recursive: true });
  fs.mkdirSync(AGENTS_DST, { recursive: true });

  console.log('  Copying skill/ → skills/resume-tailor/');
  copyRecursiveSync(SKILL_SRC, SKILL_DST);

  const frontmatterYaml = fs.readFileSync(
    path.join(REPO_ROOT, 'adapters', 'claude', 'skill-frontmatter.yaml'),
    'utf8'
  );
  const skillBodyRaw = fs.readFileSync(path.join(SKILL_SRC, 'SKILL.md'), 'utf8');
  const skillBody = stripYamlFrontmatter(skillBodyRaw);
  let finalSkillMd = `---\n${frontmatterYaml}---\n\n${skillBody}`;
  finalSkillMd = applyPathTokens(finalSkillMd, paths);
  fs.writeFileSync(path.join(SKILL_DST, 'SKILL.md'), finalSkillMd, 'utf8');

  const agentBody = fs.readFileSync(
    path.join(REPO_ROOT, 'adapters', 'agent-body.tmpl'),
    'utf8'
  );
  const agentTmpl = fs.readFileSync(
    path.join(REPO_ROOT, 'adapters', 'claude', 'agent-plugin.md.tmpl'),
    'utf8'
  );
  let finalAgent = agentTmpl.replace('{AGENT_BODY}', agentBody);
  finalAgent = applyPathTokens(finalAgent, paths);
  fs.writeFileSync(path.join(AGENTS_DST, 'resume-tailor.md'), finalAgent, 'utf8');

  const licenseSrc = path.join(REPO_ROOT, 'LICENSE');
  if (fs.existsSync(licenseSrc)) {
    fs.copyFileSync(licenseSrc, path.join(PLUGIN_ROOT, 'LICENSE'));
  }

  const pluginJson = JSON.parse(fs.readFileSync(PLUGIN_JSON, 'utf8'));
  pluginJson.version = version;
  fs.writeFileSync(PLUGIN_JSON, JSON.stringify(pluginJson, null, 2) + '\n', 'utf8');

  const zipName = `resume-tailor-plugin-v${version}.zip`;
  const zipPath = path.join(REPO_ROOT, zipName);
  console.log(`  Creating ${zipName}`);
  createPluginZip(PLUGIN_ROOT, zipPath);

  console.log(`Done: ${zipPath}`);
}

const version = resolveVersion(process.argv.slice(2));
buildPlugin(version);
