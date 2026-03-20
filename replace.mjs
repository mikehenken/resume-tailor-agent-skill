import fs from 'fs';
import path from 'path';

function replaceInDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') replaceInDir(fullPath);
    } else if (entry.isFile()) {
      if (fullPath.endsWith('.md') || fullPath.endsWith('.yaml') || fullPath.endsWith('.json') || fullPath.endsWith('.js') || fullPath.endsWith('.mjs')) {
        let content = fs.readFileSync(fullPath, 'utf-8');
        let changed = false;
        if (content.includes('~/.cursor')) {
          content = content.replace(/~\/\.cursor/g, '{PLATFORM_ROOT}');
          changed = true;
        }
        if (content.includes('mikehenken.pages.dev')) {
          content = content.replace(/mikehenken\.pages\.dev/g, 'your-portfolio.com');
          changed = true;
        }
        if (content.includes('mike-henken-72bb4428')) {
          content = content.replace(/mike-henken-72bb4428/g, 'your-profile');
          changed = true;
        }
        if (changed) {
          fs.writeFileSync(fullPath, content, 'utf-8');
        }
      }
    }
  }
}

replaceInDir('./skill');
replaceInDir('./adapters');
console.log('Done replacements');
