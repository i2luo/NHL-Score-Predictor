# Injury Data Debugging Guide

## Summary of Changes

I've added comprehensive logging throughout the data flow to help identify where injury data might be getting lost:

1. **API Route (`frontend/app/api/games/route.ts`)**:
   - Logs when injury data file is found/not found
   - Logs how many injuries are loaded and grouped by team
   - Logs specific teams (NYR, PIT, PHI) for debugging
   - Logs when injuries are assigned to games

2. **Frontend API Client (`frontend/lib/api.ts`)**:
   - Logs API requests and responses
   - Logs injury data in received games
   - Logs specific NYR games for debugging

3. **Frontend Page (`frontend/app/page.tsx`)**:
   - Logs when games are fetched
   - Logs games with injury data
   - Logs sample game with injuries

4. **SimulatorView (`frontend/components/SimulatorView.tsx`)**:
   - Logs game data when received
   - Shows fallback message if injury count > 0 but player data missing

## How to Test

### 1. Check Server Console (Next.js dev server)
When you load the page, you should see logs like:
```
[API] Looking for injury data at: /path/to/nhl_injuries_detailed.json
[API] File exists: true
[API] Loaded 139 total injuries from file
[API] Loaded detailed injury data: 139 injured players
[API] Injuries grouped by team: ANA: 2, BOS: 2, ..., NYR: 4, ...
[API] NYR injuries: ['Sheary, Conor', 'Shesterkin, Igor', 'Edstrom, Adam', 'Fox, Adam']
[API] Game TOR @ NYR: Home injuries: 4, Away injuries: 2
[API]   Home players: ['Sheary, Conor', 'Shesterkin, Igor', 'Edstrom, Adam', 'Fox, Adam']
```

### 2. Check Browser Console
When you load the page and click on a game, you should see:
```
[API] Fetching upcoming games from: /api/games?upcoming=true
[API] Received 12 games from API
[API] Games with injury data: 8
[API] Sample game with injuries: {id: '...', teams: 'TOR @ NYR', homeInjuries: 4, homePlayers: [...]}
[Frontend] Received 12 games
[Frontend] Games with injury data: 8
[Frontend] Using API data
[SimulatorView] Game received: {id: '...', teams: 'TOR @ NYR', homeInjuries: 4, homeInjuredPlayers: 4, homePlayers: [...]}
```

### 3. What to Look For

**If you see "File not found" in server logs:**
- The API can't find `nhl_injuries_detailed.json`
- Check that the file is in the project root (same level as `frontend/` folder)
- The API looks for: `process.cwd() + '/../nhl_injuries_detailed.json'`

**If you see "No games from API, using mock data":**
- The API is returning empty array or failing
- Check server logs for API errors
- Mock data includes random players (Cale Makar, Jake Oettinger) - this is expected if API fails

**If you see injury counts but no player names:**
- The API loaded injury counts but not detailed injuries
- Check if `nhl_injuries_detailed.json` exists and is valid JSON
- Check server logs for parsing errors

**If you see "injured but player data not available":**
- Injury count > 0 but `homeInjuredPlayers`/`awayInjuredPlayers` arrays are empty
- This means the API assigned injury counts but not the detailed player data

## Expected Data

Based on the scraped data file:
- **NYR** should have 4 injured players: Sheary, Shesterkin, Edstrom, Fox
- **PIT** should have 6 injured players: Howe, Jones, Karlsson, McGroarty, Hallander, Kettles
- **PHI** should have 2 injured players: Brink, Foerster
- **Cale Makar** and **Jake Oettinger** should NOT appear in any team's injuries

## Next Steps

1. **Start your Next.js dev server** and watch the server console
2. **Open browser console** (F12 → Console tab)
3. **Load the page** and check both consoles for the logs above
4. **Click on a game** (especially one with NYR) and check SimulatorView logs
5. **Report back** what you see in the logs - this will tell us exactly where the data is being lost

## Files Modified

- `frontend/app/api/games/route.ts` - Added comprehensive API logging
- `frontend/lib/api.ts` - Added frontend API client logging
- `frontend/app/page.tsx` - Added page-level logging
- `frontend/components/SimulatorView.tsx` - Added component-level logging and fallback display
