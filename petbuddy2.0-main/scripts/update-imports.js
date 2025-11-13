#!/usr/bin/env node
/**
 * Script to update model imports from relative paths to @petbuddy/shared
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SHARED_MODELS = [
  'Appointment',
  'Contact',
  'Pet',
  'Company',
  'Location',
  'ServiceCategory',
  'ServiceItem',
  'User',
  'Message'
];

const PATHS_TO_UPDATE = [
  'packages/backend/src',
  'packages/meta-bot'
];

// Find all JS files in a directory recursively
function findJsFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory() && item.name !== 'node_modules' && item.name !== '.git') {
      files.push(...findJsFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Update imports in a file
function updateImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  const importedModels = new Set();

  // Find all model imports
  for (const model of SHARED_MODELS) {
    // Match default imports: import Model from '../models/Model.js'
    const defaultImportPattern = new RegExp(
      `import\\s+${model}\\s+from\\s+['"](\\.\\.?\\/)+models\\/${model}\\.js['"]`,
      'g'
    );

    // Match named imports: import { Message } from './models/Message.js'
    const namedImportPattern = new RegExp(
      `import\\s+\\{\\s*${model}\\s*\\}\\s+from\\s+['"](\\.\\.?\\/)+models\\/${model}\\.js['"]`,
      'g'
    );

    if (defaultImportPattern.test(content) || namedImportPattern.test(content)) {
      importedModels.add(model);
      // Remove the old import line
      content = content.replace(defaultImportPattern, '');
      content = content.replace(namedImportPattern, '');
      modified = true;
    }
  }

  if (modified && importedModels.size > 0) {
    // Check if there's already an import from @petbuddy/shared
    const existingSharedImport = content.match(/import\s+\{([^}]+)\}\s+from\s+['"]@petbuddy\/shared['"]/);

    if (existingSharedImport) {
      // Add to existing import
      const existingModels = existingSharedImport[1].split(',').map(m => m.trim());
      const allModels = new Set([...existingModels, ...importedModels]);
      const newImport = `import { ${Array.from(allModels).join(', ')} } from '@petbuddy/shared'`;
      content = content.replace(existingSharedImport[0], newImport);
    } else {
      // Find the last import statement
      const importLines = content.match(/^import\s+.+$/gm) || [];
      if (importLines.length > 0) {
        const lastImport = importLines[importLines.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport) + lastImport.length;
        // Add new import statement
        const newImport = `\nimport { ${Array.from(importedModels).join(', ')} } from '@petbuddy/shared';`;
        content = content.slice(0, lastImportIndex) + newImport + content.slice(lastImportIndex);
      } else {
        // No imports found, add at the beginning
        const newImport = `import { ${Array.from(importedModels).join(', ')} } from '@petbuddy/shared';\n\n`;
        content = newImport + content;
      }
    }

    // Clean up multiple consecutive blank lines
    content = content.replace(/\n{3,}/g, '\n\n');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Updated ${path.relative(rootDir, filePath)}`);
    return true;
  }

  return false;
}

// Main execution
let totalUpdated = 0;

for (const searchPath of PATHS_TO_UPDATE) {
  const fullPath = path.join(rootDir, searchPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠ Path not found: ${searchPath}`);
    continue;
  }

  console.log(`\nUpdating imports in ${searchPath}...`);
  const files = findJsFiles(fullPath);
  let pathUpdated = 0;

  for (const file of files) {
    if (updateImports(file)) {
      pathUpdated++;
      totalUpdated++;
    }
  }

  console.log(`  ${pathUpdated} file(s) updated in ${searchPath}`);
}

console.log(`\n✓ Done! Updated ${totalUpdated} file(s) total.\n`);
console.log('Next steps:');
console.log('  1. Run: npm install');
console.log('  2. Remove duplicate models from packages/backend/src/models/');
console.log('  3. Remove duplicate models from packages/meta-bot/models/');
console.log('  4. Test the services\n');
