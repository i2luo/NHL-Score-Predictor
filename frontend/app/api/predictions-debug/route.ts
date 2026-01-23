import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Diagnostic endpoint to check why predictions aren't working on Vercel
 * 
 * Usage: https://your-app.vercel.app/api/predictions-debug
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: {},
    issues: [],
    recommendations: []
  };

  // Check 1: Python availability
  try {
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    execSync(`${pythonCmd} --version`, { encoding: 'utf-8', timeout: 5000 });
    diagnostics.checks.pythonAvailable = true;
    diagnostics.checks.pythonCommand = pythonCmd;
  } catch (error: any) {
    diagnostics.checks.pythonAvailable = false;
    diagnostics.checks.pythonError = error.message;
    diagnostics.issues.push('Python is not available on this runtime');
    diagnostics.recommendations.push('Vercel Node.js runtime does not include Python. You need to use a different approach.');
  }

  // Check 2: Python script exists
  const possiblePythonPaths = [
    path.join(process.cwd(), 'python', 'predict_batch.py'),
    path.join(process.cwd(), '..', 'python', 'predict_batch.py'),
    path.join(process.cwd(), '..', 'predict_batch.py'),
  ];

  let pythonScriptFound = false;
  let pythonScriptPath = null;
  for (const scriptPath of possiblePythonPaths) {
    if (fs.existsSync(scriptPath)) {
      pythonScriptFound = true;
      pythonScriptPath = scriptPath;
      break;
    }
  }

  diagnostics.checks.pythonScriptExists = pythonScriptFound;
  diagnostics.checks.pythonScriptPath = pythonScriptPath;
  diagnostics.checks.checkedPaths = possiblePythonPaths;

  if (!pythonScriptFound) {
    diagnostics.issues.push('predict_batch.py script not found');
    diagnostics.recommendations.push('Ensure copy-files-for-vercel.js is running during build');
  }

  // Check 3: Model files exist
  const possibleModelPaths = [
    path.join(process.cwd(), 'models'),
    path.join(process.cwd(), '..', 'models'),
  ];

  let modelsFound = false;
  let modelsPath = null;
  let modelFiles: string[] = [];

  for (const modelPath of possibleModelPaths) {
    if (fs.existsSync(modelPath)) {
      modelsFound = true;
      modelsPath = modelPath;
      const files = fs.readdirSync(modelPath);
      modelFiles = files.filter(f => f.endsWith('.pkl') || f.endsWith('.txt'));
      break;
    }
  }

  diagnostics.checks.modelsExist = modelsFound;
  diagnostics.checks.modelsPath = modelsPath;
  diagnostics.checks.modelFiles = modelFiles;

  if (!modelsFound) {
    diagnostics.issues.push('Model files not found');
    diagnostics.recommendations.push('Ensure model files are copied to frontend/models/ during build');
  }

  // Check 4: Data files exist
  const possibleDataPaths = [
    path.join(process.cwd(), 'data', 'nhl_games_2021_2026.json'),
    path.join(process.cwd(), '..', 'nhl_games_2021_2026.json'),
  ];

  let dataFileFound = false;
  let dataFilePath = null;

  for (const dataPath of possibleDataPaths) {
    if (fs.existsSync(dataPath)) {
      dataFileFound = true;
      dataFilePath = dataPath;
      break;
    }
  }

  diagnostics.checks.dataFileExists = dataFileFound;
  diagnostics.checks.dataFilePath = dataFilePath;

  if (!dataFileFound) {
    diagnostics.issues.push('Game data file not found');
  }

  // Check 5: Runtime environment
  diagnostics.checks.runtime = process.env.VERCEL ? 'Vercel' : 'Local';
  diagnostics.checks.nodeVersion = process.version;
  diagnostics.checks.platform = process.platform;
  diagnostics.checks.cwd = process.cwd();

  // Summary
  const allChecksPass = 
    diagnostics.checks.pythonAvailable &&
    diagnostics.checks.pythonScriptExists &&
    diagnostics.checks.modelsExist &&
    diagnostics.checks.dataFileExists;

  diagnostics.summary = {
    allChecksPass,
    status: allChecksPass ? 'READY' : 'ISSUES_FOUND',
    totalIssues: diagnostics.issues.length
  };

  // Main issue: Python not available on Vercel
  if (!diagnostics.checks.pythonAvailable && diagnostics.checks.runtime === 'Vercel') {
    diagnostics.mainIssue = 'Python is not available in Vercel\'s Node.js runtime';
    diagnostics.solutions = [
      {
        title: 'Option 1: Use Vercel Python Runtime (Recommended)',
        description: 'Create a separate Python serverless function for predictions',
        steps: [
          'Create api/predict-python/route.py (Python function)',
          'Use Vercel\'s Python runtime',
          'Call this function from your Node.js API route'
        ]
      },
      {
        title: 'Option 2: External Python API',
        description: 'Deploy Python API separately (Railway, Render, etc.)',
        steps: [
          'Deploy Python API to Railway/Render/Heroku',
          'Call external API from Vercel API route',
          'Handle CORS if needed'
        ]
      },
      {
        title: 'Option 3: Pre-compute Predictions',
        description: 'Generate predictions during build and store in JSON',
        steps: [
          'Run predictions locally or in CI/CD',
          'Save predictions to JSON file',
          'Load predictions in API route'
        ]
      }
    ];
  }

  return NextResponse.json(diagnostics, {
    headers: {
      'Content-Type': 'application/json',
    }
  });
}
