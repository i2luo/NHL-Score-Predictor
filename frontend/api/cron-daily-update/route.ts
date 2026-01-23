import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Vercel Cron Job endpoint for daily updates
 * 
 * Configure in vercel.json to run at 12pm Eastern (5pm UTC)
 * 
 * This endpoint:
 * 1. Updates game results
 * 2. Scrapes injury data
 * 3. Regenerates predictions
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

// Verify this is a cron job request (Vercel adds this header)
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  
  // Vercel cron jobs include an authorization header
  // You should set CRON_SECRET in Vercel environment variables
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const startTime = new Date();
  console.log(`[CRON] Daily update started at ${startTime.toISOString()}`);

  try {
    const results: any = {
      success: true,
      startTime: startTime.toISOString(),
      steps: {}
    };

    // Step 1: Update game results
    console.log('[CRON] Step 1: Updating game results...');
    try {
      const pythonScript = path.join(process.cwd(), '..', 'scripts', 'daily_update.py');
      
      if (!fs.existsSync(pythonScript)) {
        // Try alternative path
        const altPath = path.join(process.cwd(), 'scripts', 'daily_update.py');
        if (fs.existsSync(altPath)) {
          const result = execSync(
            `python3 "${altPath}"`,
            {
              encoding: 'utf-8',
              timeout: 240000, // 4 minutes
              maxBuffer: 1024 * 1024 * 10,
              cwd: path.dirname(altPath)
            }
          );
          results.steps.updateResults = {
            success: true,
            output: result.substring(0, 500) // First 500 chars
          };
        } else {
          throw new Error('daily_update.py not found');
        }
      } else {
        const result = execSync(
          `python3 "${pythonScript}"`,
          {
            encoding: 'utf-8',
            timeout: 240000,
            maxBuffer: 1024 * 1024 * 10,
            cwd: path.dirname(pythonScript)
          }
        );
        results.steps.updateResults = {
          success: true,
          output: result.substring(0, 500)
        };
      }
      console.log('[CRON] ✓ Game results updated');
    } catch (error: any) {
      console.error('[CRON] ✗ Error updating game results:', error.message);
      results.steps.updateResults = {
        success: false,
        error: error.message
      };
      results.success = false;
    }

    // Step 2: Regenerate predictions
    console.log('[CRON] Step 2: Regenerating predictions...');
    try {
      const predictionScript = path.join(process.cwd(), '..', 'scripts', 'generate-predictions.js');
      
      if (!fs.existsSync(predictionScript)) {
        const altPath = path.join(process.cwd(), 'scripts', 'generate-predictions.js');
        if (fs.existsSync(altPath)) {
          const result = execSync(
            `node "${altPath}"`,
            {
              encoding: 'utf-8',
              timeout: 120000, // 2 minutes
              maxBuffer: 1024 * 1024 * 10,
              cwd: path.dirname(altPath)
            }
          );
          results.steps.regeneratePredictions = {
            success: true,
            output: result.substring(0, 500)
          };
        } else {
          throw new Error('generate-predictions.js not found');
        }
      } else {
        const result = execSync(
          `node "${predictionScript}"`,
          {
            encoding: 'utf-8',
            timeout: 120000,
            maxBuffer: 1024 * 1024 * 10,
            cwd: path.dirname(predictionScript)
          }
        );
        results.steps.regeneratePredictions = {
          success: true,
          output: result.substring(0, 500)
        };
      }
      console.log('[CRON] ✓ Predictions regenerated');
    } catch (error: any) {
      console.error('[CRON] ✗ Error regenerating predictions:', error.message);
      results.steps.regeneratePredictions = {
        success: false,
        error: error.message
      };
      results.success = false;
    }

    const endTime = new Date();
    results.endTime = endTime.toISOString();
    results.duration = `${((endTime.getTime() - startTime.getTime()) / 1000).toFixed(2)}s`;

    console.log(`[CRON] Daily update completed in ${results.duration}`);

    return NextResponse.json(results, {
      status: results.success ? 200 : 500
    });

  } catch (error: any) {
    console.error('[CRON] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
