/**
 * Copy necessary Python files and data files to frontend directory for Vercel deployment
 * This script runs during the Vercel build process
 */

const fs = require('fs');
const path = require('path');

// Determine root directory - script can be run from root or frontend
// If __dirname is scripts/, root is parent. If __dirname is frontend/, root is parent.
const scriptDir = __dirname;
const isInScriptsDir = scriptDir.endsWith('scripts');
const rootDir = isInScriptsDir ? path.join(scriptDir, '..') : path.join(scriptDir, '..');
const frontendDir = isInScriptsDir ? path.join(rootDir, 'frontend') : scriptDir;

// Create necessary directories
const dataDir = path.join(frontendDir, 'data');
const pythonDir = path.join(frontendDir, 'python');
const modelsDir = path.join(frontendDir, 'models');

[dataDir, pythonDir, modelsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Copy Python files
const pythonFiles = ['predict_api.py', 'predict_batch.py', 'predict_game.py', 'preprocess_data.py'];
console.log('\nCopying Python files...');
pythonFiles.forEach(file => {
  const src = path.join(rootDir, file);
  const dest = path.join(pythonDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  ✓ Copied ${file}`);
  } else {
    console.log(`  ✗ Missing ${file}`);
  }
});

// Copy data files
const dataFiles = [
  'nhl_games_2021_2026.json',
  'nhl_games_2025_2026.json', 
  'nhl_injuries.json',
  'nhl_injuries_detailed.json'
];
console.log('\nCopying data files...');
dataFiles.forEach(file => {
  const src = path.join(rootDir, file);
  const dest = path.join(dataDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  ✓ Copied ${file}`);
  } else {
    console.log(`  ✗ Missing ${file} (optional)`);
  }
});

// Copy models directory
console.log('\nCopying model files...');
const modelsSrc = path.join(rootDir, 'models');
if (fs.existsSync(modelsSrc)) {
  const files = fs.readdirSync(modelsSrc);
  let copiedCount = 0;
  files.forEach(file => {
    const src = path.join(modelsSrc, file);
    const dest = path.join(modelsDir, file);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dest);
      console.log(`  ✓ Copied model: ${file}`);
      copiedCount++;
    }
  });
  if (copiedCount === 0) {
    console.log('  ✗ No model files found');
  }
} else {
  console.log('  ✗ Models directory not found');
}

console.log('\n✓ File copy complete!\n');
