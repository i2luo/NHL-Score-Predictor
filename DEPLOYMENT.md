# Vercel Deployment Guide

This guide explains how to deploy the NHL Score Predictor to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Vercel CLI** (optional): `npm i -g vercel`
3. **GitHub Repository**: Your code should be pushed to GitHub

## Important Notes

### File Size Limits
- Vercel has a **50MB limit** per serverless function
- Your model files and data files must fit within this limit
- If files are too large, consider:
  - Using Vercel Blob Storage
  - External storage (AWS S3, etc.)
  - Reducing model file size

### Timeout Limits
- **Hobby Plan**: 10 seconds max
- **Pro Plan**: 60 seconds max (configured in `vercel.json`)
- Batch predictions take ~15-30 seconds, so **Pro plan is required**

### Python Runtime
- Vercel doesn't natively support Python in serverless functions
- This deployment uses Node.js subprocess calls to execute Python scripts
- Python 3.x must be available in the Vercel runtime (it is by default)

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Go to Vercel Dashboard**:
   - Visit [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository

3. **Configure Project**:
   - **Framework Preset**: Next.js
   - **Root Directory**: Leave as root (Vercel will detect `vercel.json`)
   - **Build Command**: `cd frontend && npm run vercel-build`
   - **Output Directory**: `frontend/.next`
   - **Install Command**: `cd frontend && npm install`

4. **Environment Variables** (if needed):
   - Add any environment variables in the Vercel dashboard

5. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete

### Option 2: Deploy via CLI

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   cd /Users/ivany/Documents/NHLScorePredictor
   vercel
   ```

4. **Follow prompts**:
   - Link to existing project or create new
   - Confirm settings
   - Deploy

## How It Works

### Build Process

1. **Pre-build Script** (`scripts/copy-files-for-vercel.js`):
   - Copies Python scripts to `frontend/python/`
   - Copies data files to `frontend/data/`
   - Copies model files to `frontend/models/`

2. **Next.js Build**:
   - Builds the Next.js application
   - Includes copied files in the deployment

3. **Runtime**:
   - API routes use Vercel-compatible paths
   - Python scripts are executed via subprocess
   - Files are accessed from the copied locations

### Path Resolution

The code uses helper functions to resolve paths:
- **Vercel**: Files in `frontend/data/`, `frontend/python/`, `frontend/models/`
- **Local Dev**: Files in parent directory (`../`)

## Troubleshooting

### Build Fails

**Error**: "File not found"
- **Solution**: Ensure all required files exist before deploying
- Check that `nhl_games_2021_2026.json` and model files are present

**Error**: "Python script not found"
- **Solution**: Verify `scripts/copy-files-for-vercel.js` runs successfully
- Check build logs for copy errors

### Runtime Errors

**Error**: "Timeout exceeded"
- **Solution**: Upgrade to Vercel Pro plan (60s timeout)
- Or optimize predictions to run faster

**Error**: "Permission denied" when running Python
- **Solution**: Python should be available by default in Vercel
- Check that Python scripts have execute permissions

**Error**: "Model file not found"
- **Solution**: Verify models are copied during build
- Check that model files are in `frontend/models/` after build

### File Size Issues

**Error**: "Function size exceeds limit"
- **Solution**: 
  - Use external storage for large files
  - Compress model files
  - Remove unnecessary data files

## Post-Deployment

1. **Test the API**:
   - Visit `https://your-app.vercel.app/api/games?upcoming=true`
   - Should return game data with predictions

2. **Monitor Logs**:
   - Check Vercel dashboard for function logs
   - Look for any errors or warnings

3. **Update Data** (if needed):
   - Re-run scrapers locally
   - Commit updated data files
   - Redeploy

## Local Testing

Test the Vercel build locally:

```bash
cd frontend
npm run vercel-build
```

This will:
1. Copy files to `frontend/data/`, `frontend/python/`, `frontend/models/`
2. Build the Next.js app

Then test:

```bash
npm start
```

## Alternative: Separate Backend

If Vercel deployment is problematic, consider:

1. **Deploy Frontend to Vercel** (UI only)
2. **Deploy Backend Separately**:
   - Railway (Python-friendly)
   - Render (Python support)
   - AWS Lambda (with Python runtime)
3. **Update API routes** to call external backend

This approach avoids Vercel's limitations but requires managing two deployments.
