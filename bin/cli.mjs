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
  .option('--platform <type>', 'Specify platform for automated runs')
  .parse(process.argv);

const options = program.opts();

async function run() {
  console.log('\n  🎯 Resume Tailor — AI-Powered Resume Tailoring Agent');
  console.log('  ────────────────────────────────────────────────────\n');

  if (options.test) {
    console.log('Running in test/dry-run mode. Exiting with success.');
    process.exit(0);
  }

  const platformChoice = options.platform || await select({
    message: 'Which platform are you using?',
    choices: [
      { name: 'Cursor', value: 'cursor' },
      { name: 'Claude Code', value: 'claude' },
      { name: 'OpenCode', value: 'opencode' }
    ]
  });

  const installType = await select({
    message: 'Where should the skill be installed?',
    choices: [
      { name: `Global (~/.${platformChoice === 'opencode' ? 'config/opencode' : platformChoice}/skills/resume-tailor)`, value: 'global' },
      { name: `Project (.${platformChoice === 'opencode' ? 'opencode' : platformChoice}/skills/resume-tailor)`, value: 'project' },
      { name: 'Custom path', value: 'custom' }
    ]
  });

  let targetDir = '';
  const homedir = os.homedir();
  const cwd = process.cwd();

  const platformPaths = {
    cursor: { global: path.join(homedir, '.cursor'), project: path.join(cwd, '.cursor') },
    claude: { global: path.join(homedir, '.claude'), project: path.join(cwd, '.claude') },
    opencode: { global: path.join(homedir, '.config', 'opencode'), project: path.join(cwd, '.opencode') }
  };

  if (installType === 'global') {
    targetDir = path.join(platformPaths[platformChoice].global, 'skills', 'resume-tailor');
  } else if (installType === 'project') {
    targetDir = path.join(platformPaths[platformChoice].project, 'skills', 'resume-tailor');
  } else {
    targetDir = await input({ message: 'Enter custom path to install the folder:' });
  }

  const agentTargetDir = installType === 'global' ? path.join(platformPaths[platformChoice].global, 'agents') : (installType === 'project' ? path.join(platformPaths[platformChoice].project, 'agents') : path.join(path.dirname(targetDir), 'agents'));

  const resumeSource = await select({
    message: 'Do you have an existing resume to import?',
    choices: [
      { name: 'No (I\'ll set up profile.json manually)', value: 'no' },
      { name: 'Use example profile', value: 'example' }
      // Skipping actual file import for MVP to avoid unneeded complexity unless user explicitly provides one
      // { name: 'Yes (TXT/JSON/MD)', value: 'yes' }
    ]
  });

  const installDeps = await confirm({
    message: 'Install PDF export dependencies? (puppeteer ~300MB)',
    default: true
  });

  // Execute copying
  console.log(`\nCreating directories...`);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.mkdirSync(agentTargetDir, { recursive: true });

  const skillSourceDir = path.join(REPO_ROOT, 'skill');
  
  // Recursively copy skill directory
  function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      fs.readdirSync(src).forEach(childItemName => {
        copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  };

  console.log('Copying Canonical skill...');
  copyRecursiveSync(skillSourceDir, targetDir);

  // Read templates
  const agentBody = fs.readFileSync(path.join(REPO_ROOT, 'adapters', 'agent-body.tmpl'), 'utf-8');
  const agentTmpl = fs.readFileSync(path.join(REPO_ROOT, 'adapters', platformChoice, 'agent.md.tmpl'), 'utf-8');
  const frontmatterYaml = fs.readFileSync(path.join(REPO_ROOT, 'adapters', platformChoice, 'skill-frontmatter.yaml'), 'utf-8');
  
  const platformRootConfig = (installType === 'global') ? `~/.${platformChoice === 'opencode' ? 'config/opencode' : platformChoice}` : `.${platformChoice === 'opencode' ? 'opencode' : platformChoice}`;
  const skillRootConfig = targetDir;
  
  let finalAgent = agentTmpl.replace('{AGENT_BODY}', agentBody);
  let finalSkillMd = fs.readFileSync(path.join(targetDir, 'SKILL.md'), 'utf-8');

  // String Replacements
  finalAgent = finalAgent.replace(/\{PLATFORM_ROOT\}/g, platformRootConfig);
  finalAgent = finalAgent.replace(/\{USER_ROOT\}/g, platformRootConfig);
  finalAgent = finalAgent.replace(/\{SKILL_ROOT\}/g, skillRootConfig);
  finalAgent = finalAgent.replace(/\{PORTFOLIO_URL\}/g, 'https://mikehenken.pages.dev'); // can be asked or extracted
  finalAgent = finalAgent.replace(/\{LINKEDIN_URL\}/g, 'https://linkedin.com/in/mike-henken-72bb4428');
  
  if (platformChoice === 'cursor') {
    finalAgent = finalAgent.replace(/\{PLATFORM_TOOLS\}/g, 'Read, Write, StrReplace, Glob, Grep, WebSearch, Shell, Task, mcp_web_fetch');
  }

  finalSkillMd = `---\n${frontmatterYaml}---\n\n` + finalSkillMd;
  finalSkillMd = finalSkillMd.replace(/\{PLATFORM_ROOT\}/g, platformRootConfig);

  fs.writeFileSync(path.join(targetDir, 'SKILL.md'), finalSkillMd);
  fs.writeFileSync(path.join(agentTargetDir, 'resume-tailor.md'), finalAgent);

  if (resumeSource === 'example') {
    fs.copyFileSync(path.join(REPO_ROOT, 'examples', 'profile.example.json'), path.join(targetDir, 'profile.json'));
  }

  if (installDeps) {
    console.log('Installing scripts dependencies...');
    try {
      execSync('npm install', { cwd: path.join(targetDir, 'scripts'), stdio: 'inherit' });
    } catch (e) {
      console.warn('Failed to install dependencies cleanly. You can run `npm install` inside the scripts folder manually.');
    }
  }

  console.log(`\n  ✓ Skill installed to ${targetDir}`);
  console.log(`  ✓ Agent installed to ${path.join(agentTargetDir, 'resume-tailor.md')}`);
  if (resumeSource === 'example') {
    console.log(`  ✓ Example profile copied to ${path.join(targetDir, 'profile.json')}`);
  }
  
  console.log('\n  Next steps:');
  console.log(`    1. Open ${platformChoice}`);
  console.log(`    2. Say: "Tailor my resume for Platform Engineer at Acme Corp"`);
  console.log(`    3. The agent will read your profile and guide you through tailoring\n`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
