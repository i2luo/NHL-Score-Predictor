# How to Check Vercel Logs for Prediction Issues

## Quick Steps

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**
3. **Click on "Deployments"** → Latest deployment
4. **Click "Functions" tab** OR **Click "Logs" tab**
5. **Look for `/api/games` function logs**

## What to Look For

### ✅ Success Indicators
```
[API] Found Python script at: /var/task/python/predict_batch.py
[API] Running batch predictions for 13 games...
[API] ✓ Applied prediction to TBL @ DAL: 65%
[API] Prediction summary: 13 applied, 0 failed out of 13 games
```

### ❌ Failure Indicators

#### Issue 1: Script Not Found
```
[API] ⚠️ CRITICAL: Batch prediction script not found at: ...
[API] Directory structure check:
```
**Solution**: Check if `copy-files-for-vercel.js` ran during build. Check build logs.

#### Issue 2: Python Not Available
```
[API] ⚠️ Python command 'python3' not found or not working!
```
**Solution**: Vercel may not have Python installed. Check Vercel build settings.

#### Issue 3: Script Execution Fails
```
[API] Python script execution error: ...
[API] Python stderr: ...
```
**Solution**: Check the stderr output for specific Python errors (missing dependencies, missing models, etc.)

#### Issue 4: No Output from Script
```
[API] No output from Python script
```
**Solution**: Script may be crashing silently. Check for import errors or missing files.

#### Issue 5: JSON Parse Error
```
[API] Failed to parse JSON from Python output: ...
```
**Solution**: Script is outputting errors instead of JSON. Check stderr output.

## Most Common Issues

### 1. **Python Script Not Copied During Build**
- Check Vercel build logs for `copy-files-for-vercel.js` output
- Verify files are being copied to `frontend/python/`
- Ensure `copy-files-for-vercel.js` is in `package.json` build script

### 2. **Python Not Available on Vercel**
- Vercel Serverless Functions may not have Python by default
- May need to use a different approach (external API, edge functions, etc.)

### 3. **Missing Dependencies**
- Python script may be missing required packages
- Check if `requirements.txt` is being installed
- May need to bundle dependencies differently

### 4. **Missing Model Files**
- Models may not be copied during build
- Check if `models/` directory exists in deployment
- Verify model files are in git (not ignored)

### 5. **Missing Data Files**
- `nhl_games_2021_2026.json` may not be available
- Check if data files are copied to `frontend/data/`
- Verify data files are committed to git

## Next Steps After Checking Logs

1. **Copy the relevant error messages** from Vercel logs
2. **Identify which issue** matches your logs
3. **Fix the root cause** based on the error
4. **Redeploy** and check logs again

## Alternative: Test Locally First

Before deploying, test the prediction script locally:

```bash
# Test the batch prediction script directly
echo '[{"id":"test","homeTeam":"TOR","awayTeam":"MTL"}]' | python3 frontend/python/predict_batch.py

# Test the API route locally
npm run dev
# Then visit: http://localhost:3000/api/games?upcoming=true
# Check terminal for [API] logs
```
