/**
 * Copy necessary Python files and data files to frontend directory for Vercel deployment
 * This script runs during the Vercel build process
 * Assumes root directory is set to 'frontend' in Vercel, so we access parent dir with ../
 */

const fs = require('fs');
const path = require('path');

// When root directory is 'frontend', we're already in frontend/
// Parent directory (repo root) is one level up
const frontendDir = __dirname; // Current directory (frontend/)
const rootDir = path.join(__dirname, '..'); // Parent directory (repo root)

// Create necessary directories in frontend
const dataDir = path.join(frontendDir, 'data');
const pythonDir = path.join(frontendDir, 'python');
const modelsDir = path.join(frontendDir, 'models');

[dataDir, pythonDir, modelsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Copy Python files from root to frontend/python
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

// Copy data files from root to frontend/data
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

// Copy models directory from root to frontend/models
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
