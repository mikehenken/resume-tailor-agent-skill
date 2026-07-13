#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { select, input, confirm } from '@inquirer/prompts';
import { execSync } from 'child_process';
import { program } from 'commander';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

program
  .option('--test', 'Run in test/dry-run mode')
  .option('--platform <type>', 'Platform: cursor | claude | opencode')
  .option('--install-location <type>', 'Install location: global | project | custom')
  .option('--custom-path <path>', 'Custom skill install directory (with --install-location custom)')
  .option(
    '--resume <source>',
    'Profile seed: none | example | path to PDF/DOCX/TXT/MD/JSON'
  )
  .option('--profile-id <id>', 'Profile id when seeding a resume (default: derived or "default")')
  .option('--install-deps', 'Install PDF export dependencies (puppeteer)')
  .option('--no-install-deps', 'Skip PDF export dependency install')
  .option(
    '--non-interactive',
    'Skip questions; use flags and defaults (alias: --yes). Does NOT mean npx --yes.'
  )
  .option('--yes', 'Alias for --non-interactive')
  .parse(process.argv);

const options = program.opts();
const nonInteractive = Boolean(options.nonInteractive || options.yes);

/**
 * @returns {boolean}
 */
function canPromptInteractively() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/**
 * Resolve a value from a CLI flag, non-interactive default, or interactive prompt.
 * @template T
 * @param {{
 *   flagValue: T | undefined,
 *   defaultValue: T,
 *   flagName: string,
 *   prompt: () => Promise<T>,
 * }} args
 * @returns {Promise<T>}
 */
async function resolveChoice(args) {
  if (args.flagValue !== undefined && args.flagValue !== null && args.flagValue !== '') {
    return args.flagValue;
  }
  if (nonInteractive) {
    return args.defaultValue;
  }
  if (!canPromptInteractively()) {
    console.error(`
  Interactive prompts need a real terminal (TTY).

  Re-run in your terminal (Git Bash / PowerShell / macOS Terminal), not a pipe:

    npx @mikehenken/create-resume-tailor

  Or pass flags for a non-interactive install:

    npx @mikehenken/create-resume-tailor --non-interactive --platform claude --install-location global --resume example

  Note: \`npx --yes\` only skips *npx's* "install this package?" prompt.
  Installer questions are skipped only with \`--non-interactive\` / \`--yes\` *after* the package name.
`);
    process.exit(1);
  }
  return args.prompt();
}

/**
 * @param {string} src
 * @param {string} dest
 */
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

/**
 * @param {string} value
 * @returns {string}
 */
function slugifyProfileId(value) {
  return (
    String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'default'
  );
}

/**
 * @param {unknown} profile
 * @returns {{ portfolio: string, linkedin: string }}
 */
function urlsFromProfile(profile) {
  const basics =
    profile && typeof profile === 'object' && profile !== null && 'basics' in profile
      ? /** @type {{ basics?: Record<string, unknown> }} */ (profile).basics
      : undefined;
  const portfolio =
    basics && typeof basics.url === 'string' && basics.url.trim() !== ''
      ? basics.url.trim()
      : 'https://your-portfolio.example';
  const profiles = basics && Array.isArray(basics.profiles) ? basics.profiles : [];
  /** @type {string} */
  let linkedin = 'https://linkedin.com/in/your-profile';
  for (const p of profiles) {
    if (
      p &&
      typeof p === 'object' &&
      typeof /** @type {{ url?: string }} */ (p).url === 'string' &&
      /linkedin/i.test(String(/** @type {{ network?: string }} */ (p).network || ''))
    ) {
      linkedin = /** @type {{ url: string }} */ (p).url;
      break;
    }
    if (
      p &&
      typeof p === 'object' &&
      typeof /** @type {{ url?: string }} */ (p).url === 'string' &&
      /linkedin\.com/i.test(/** @type {{ url: string }} */ (p).url)
    ) {
      linkedin = /** @type {{ url: string }} */ (p).url;
      break;
    }
  }
  return { portfolio, linkedin };
}

async function run() {
  console.log('\n  🎯 Resume Tailor — AI-Powered Resume Tailoring Agent');
  console.log('  ────────────────────────────────────────────────────');
  if (nonInteractive) {
    console.log('  Mode: non-interactive (--non-interactive / --yes)\n');
  } else if (canPromptInteractively()) {
    console.log('  Mode: interactive — answer the questions below\n');
  } else {
    console.log('  Mode: interactive required (no TTY detected)\n');
  }

  if (options.test) {
    console.log('Running in test/dry-run mode. Exiting with success.');
    process.exit(0);
  }

  const platformChoice = await resolveChoice({
    flagValue: options.platform,
    defaultValue: 'claude',
    flagName: '--platform',
    prompt: () =>
      select({
        message: 'Which platform are you using?',
        choices: [
          { name: 'Cursor', value: 'cursor' },
          { name: 'Claude Code', value: 'claude' },
          { name: 'OpenCode', value: 'opencode' },
        ],
      }),
  });

  if (!['cursor', 'claude', 'opencode'].includes(platformChoice)) {
    console.error(`Unsupported platform: ${platformChoice}`);
    process.exit(1);
  }

  const installType = await resolveChoice({
    flagValue: options.installLocation,
    defaultValue: 'global',
    flagName: '--install-location',
    prompt: () =>
      select({
        message: 'Where should the skill be installed?',
        choices: [
          {
            name: `Global (~/.${platformChoice === 'opencode' ? 'config/opencode' : platformChoice}/skills/resume-tailor)`,
            value: 'global',
          },
          {
            name: `Project (.${platformChoice === 'opencode' ? 'opencode' : platformChoice}/skills/resume-tailor)`,
            value: 'project',
          },
          { name: 'Custom path', value: 'custom' },
        ],
      }),
  });

  let targetDir = '';
  const homedir = os.homedir();
  const cwd = process.cwd();

  const platformPaths = {
    cursor: { global: path.join(homedir, '.cursor'), project: path.join(cwd, '.cursor') },
    claude: { global: path.join(homedir, '.claude'), project: path.join(cwd, '.claude') },
    opencode: {
      global: path.join(homedir, '.config', 'opencode'),
      project: path.join(cwd, '.opencode'),
    },
  };

  /** @type {string} */
  let platformRootFs;
  if (installType === 'global') {
    platformRootFs = platformPaths[platformChoice].global;
    targetDir = path.join(platformRootFs, 'skills', 'resume-tailor');
  } else if (installType === 'project') {
    platformRootFs = platformPaths[platformChoice].project;
    targetDir = path.join(platformRootFs, 'skills', 'resume-tailor');
  } else if (installType === 'custom') {
    targetDir = await resolveChoice({
      flagValue: options.customPath,
      defaultValue: '',
      flagName: '--custom-path',
      prompt: () => input({ message: 'Enter custom path to install the skill folder:' }),
    });
    if (!targetDir) {
      console.error('Custom install requires --custom-path in non-interactive mode.');
      process.exit(1);
    }
    platformRootFs = path.dirname(path.dirname(targetDir));
  } else {
    console.error(`Unsupported location: ${installType}`);
    process.exit(1);
  }

  const agentTargetDir =
    installType === 'custom'
      ? path.join(path.dirname(targetDir), 'agents')
      : path.join(platformRootFs, 'agents');

  const userRootFs = path.join(platformRootFs, 'resume-tailor');

  const resumeSource = await resolveChoice({
    flagValue: options.resume,
    defaultValue: 'example',
    flagName: '--resume',
    prompt: () =>
      select({
        message: 'Do you have an existing resume to import?',
        choices: [
          { name: "No (I'll onboard via chat later)", value: 'none' },
          { name: 'Use example profile (Alex Applicant)', value: 'example' },
          { name: 'Import file path (PDF/DOCX/TXT/MD/JSON)', value: 'file' },
        ],
      }),
  });

  let resumeFilePath = '';
  if (resumeSource === 'file' && !options.resume) {
    resumeFilePath = await resolveChoice({
      flagValue: undefined,
      defaultValue: '',
      flagName: '--resume <file>',
      prompt: () => input({ message: 'Path to resume file:' }),
    });
    if (!resumeFilePath) {
      console.error('File import requires a path (interactive answer or --resume <path>).');
      process.exit(1);
    }
  } else if (
    resumeSource !== 'none' &&
    resumeSource !== 'example' &&
    resumeSource !== 'no' &&
    resumeSource !== 'file'
  ) {
    resumeFilePath = resumeSource;
  }

  /** @type {boolean | undefined} */
  let installDepsFlag = undefined;
  if (options.installDeps === true) installDepsFlag = true;
  if (options.installDeps === false) installDepsFlag = false;

  const installDeps = await resolveChoice({
    flagValue: installDepsFlag,
    defaultValue: true,
    flagName: '--install-deps / --no-install-deps',
    prompt: () =>
      confirm({
        message: 'Install PDF export dependencies? (puppeteer ~300MB)',
        default: true,
      }),
  });

  if (nonInteractive) {
    console.log('  Using:');
    console.log(`    platform:         ${platformChoice}`);
    console.log(`    install-location: ${installType}`);
    console.log(`    resume:           ${resumeSource}${resumeFilePath ? ` (${resumeFilePath})` : ''}`);
    console.log(`    install-deps:     ${installDeps}`);
    console.log('');
  }

  console.log(`\nCreating directories...`);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.mkdirSync(agentTargetDir, { recursive: true });
  fs.mkdirSync(path.join(userRootFs, 'profiles'), { recursive: true });
  fs.mkdirSync(path.join(userRootFs, 'tailors'), { recursive: true });
  fs.mkdirSync(path.join(userRootFs, 'research', 'extension'), { recursive: true });

  const skillSourceDir = path.join(REPO_ROOT, 'skill');

  console.log('Copying Canonical skill...');
  copyRecursiveSync(skillSourceDir, targetDir);

  const agentBody = fs.readFileSync(path.join(REPO_ROOT, 'adapters', 'agent-body.tmpl'), 'utf-8');
  const agentTmpl = fs.readFileSync(
    path.join(REPO_ROOT, 'adapters', platformChoice, 'agent.md.tmpl'),
    'utf-8'
  );
  const frontmatterYaml = fs.readFileSync(
    path.join(REPO_ROOT, 'adapters', platformChoice, 'skill-frontmatter.yaml'),
    'utf-8'
  );

  const platformRootConfig =
    installType === 'global'
      ? `~/.${platformChoice === 'opencode' ? 'config/opencode' : platformChoice}`
      : installType === 'project'
        ? `.${platformChoice === 'opencode' ? 'opencode' : platformChoice}`
        : platformRootFs.replace(/\\/g, '/');

  const userRootConfig = `${platformRootConfig}/resume-tailor`;
  const skillRootConfig = targetDir.replace(/\\/g, '/');

  /** @type {unknown} */
  let seededProfile = null;
  /** @type {string | null} */
  let seededProfileId = null;

  const normalizedResume =
    resumeSource === 'no' || resumeSource === 'none'
      ? 'none'
      : resumeFilePath
        ? 'file'
        : resumeSource === 'example'
          ? 'example'
          : resumeSource === 'file'
            ? 'file'
            : 'none';

  if (normalizedResume === 'example') {
    const examplePath = path.join(REPO_ROOT, 'examples', 'profile.example.json');
    seededProfile = JSON.parse(fs.readFileSync(examplePath, 'utf-8'));
    seededProfileId = options.profileId
      ? slugifyProfileId(options.profileId)
      : 'alex-applicant';
  } else if (normalizedResume === 'file') {
    if (!resumeFilePath || !fs.existsSync(resumeFilePath)) {
      console.error(`Resume file not found: ${resumeFilePath || '(empty)'}`);
      process.exit(1);
    }
    const ext = path.extname(resumeFilePath).toLowerCase();
    if (ext === '.json') {
      seededProfile = JSON.parse(fs.readFileSync(resumeFilePath, 'utf-8'));
    } else {
      const extractScript = path.join(targetDir, 'scripts', 'extract-from-resume.mjs');
      const outPath = path.join(os.tmpdir(), `resume-tailor-extract-${Date.now()}.json`);
      try {
        execSync(`node "${extractScript}" "${resumeFilePath}" -o "${outPath}"`, {
          stdio: 'inherit',
        });
        seededProfile = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
      } catch (e) {
        console.warn(
          'Extract failed. You can onboard via chat later. Error:',
          e instanceof Error ? e.message : e
        );
        seededProfile = null;
      }
    }
    const nameFromProfile =
      seededProfile &&
      typeof seededProfile === 'object' &&
      seededProfile !== null &&
      'basics' in seededProfile &&
      /** @type {{ basics?: { name?: string } }} */ (seededProfile).basics?.name
        ? /** @type {{ basics: { name: string } }} */ (seededProfile).basics.name
        : path.basename(resumeFilePath, path.extname(resumeFilePath));
    seededProfileId = slugifyProfileId(options.profileId || nameFromProfile || 'candidate');
  }

  const { portfolio, linkedin } = urlsFromProfile(seededProfile);

  let finalAgent = agentTmpl.replace('{AGENT_BODY}', agentBody);
  let finalSkillMd = fs.readFileSync(path.join(targetDir, 'SKILL.md'), 'utf-8');

  finalAgent = finalAgent.replace(/\{PLATFORM_ROOT\}/g, platformRootConfig);
  finalAgent = finalAgent.replace(/\{USER_ROOT\}/g, userRootConfig);
  finalAgent = finalAgent.replace(/\{SKILL_ROOT\}/g, skillRootConfig);
  finalAgent = finalAgent.replace(/\{PORTFOLIO_URL\}/g, portfolio);
  finalAgent = finalAgent.replace(/\{LINKEDIN_URL\}/g, linkedin);

  if (platformChoice === 'cursor') {
    finalAgent = finalAgent.replace(
      /\{PLATFORM_TOOLS\}/g,
      'Read, Write, StrReplace, Glob, Grep, WebSearch, Shell, Task, mcp_web_fetch'
    );
  }

  finalSkillMd = `---\n${frontmatterYaml}---\n\n` + finalSkillMd;
  finalSkillMd = finalSkillMd.replace(/\{PLATFORM_ROOT\}/g, platformRootConfig);
  finalSkillMd = finalSkillMd.replace(/\{USER_ROOT\}/g, userRootConfig);
  finalSkillMd = finalSkillMd.replace(/\{SKILL_ROOT\}/g, skillRootConfig);

  fs.writeFileSync(path.join(targetDir, 'SKILL.md'), finalSkillMd);
  fs.writeFileSync(path.join(agentTargetDir, 'resume-tailor.md'), finalAgent);

  if (seededProfile && seededProfileId) {
    const profileDir = path.join(userRootFs, 'profiles', seededProfileId);
    fs.mkdirSync(profileDir, { recursive: true });
    fs.writeFileSync(
      path.join(profileDir, 'profile.json'),
      JSON.stringify(seededProfile, null, 2) + '\n',
      'utf-8'
    );
    fs.writeFileSync(
      path.join(userRootFs, 'config.json'),
      JSON.stringify({ defaultProfileId: seededProfileId }, null, 2) + '\n',
      'utf-8'
    );
  }

  if (installDeps) {
    console.log('Installing scripts dependencies...');
    try {
      execSync('npm install', { cwd: path.join(targetDir, 'scripts'), stdio: 'inherit' });
    } catch {
      console.warn(
        'Failed to install dependencies cleanly. You can run `npm install` inside the scripts folder manually.'
      );
    }
  }

  console.log(`\n  ✓ Skill installed to ${targetDir}`);
  console.log(`  ✓ Agent installed to ${path.join(agentTargetDir, 'resume-tailor.md')}`);
  console.log(`  ✓ User data root ${userRootFs}`);
  if (seededProfile && seededProfileId) {
    console.log(
      `  ✓ Profile seeded at ${path.join(userRootFs, 'profiles', seededProfileId, 'profile.json')}`
    );
  }

  console.log('\n  Next steps:');
  console.log(`    1. Open ${platformChoice}`);
  console.log(`    2. Say: "List profiles" or "Onboard a new candidate from this resume"`);
  console.log(`    3. Say: "Tailor my resume for Platform Engineer at Acme Corp"\n`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
