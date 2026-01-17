import { Game, GoalieType, RestStatus } from '@/types/game';

/**
 * NHL Team abbreviations to full names mapping
 */
const TEAM_NAMES: Record<string, string> = {
  'ANA': 'Anaheim Ducks',
  'ARI': 'Arizona Coyotes',
  'BOS': 'Boston Bruins',
  'BUF': 'Buffalo Sabres',
  'CGY': 'Calgary Flames',
  'CAR': 'Carolina Hurricanes',
  'CHI': 'Chicago Blackhawks',
  'COL': 'Colorado Avalanche',
  'CBJ': 'Columbus Blue Jackets',
  'DAL': 'Dallas Stars',
  'DET': 'Detroit Red Wings',
  'EDM': 'Edmonton Oilers',
  'FLA': 'Florida Panthers',
  'LAK': 'Los Angeles Kings',
  'MIN': 'Minnesota Wild',
  'MTL': 'Montreal Canadiens',
  'NSH': 'Nashville Predators',
  'NJD': 'New Jersey Devils',
  'NYI': 'New York Islanders',
  'NYR': 'New York Rangers',
  'OTT': 'Ottawa Senators',
  'PHI': 'Philadelphia Flyers',
  'PIT': 'Pittsburgh Penguins',
  'SJS': 'San Jose Sharks',
  'SEA': 'Seattle Kraken',
  'STL': 'St. Louis Blues',
  'TBL': 'Tampa Bay Lightning',
  'TOR': 'Toronto Maple Leafs',
  'UTA': 'Utah',
  'VAN': 'Vancouver Canucks',
  'VEG': 'Vegas Golden Knights',
  'WSH': 'Washington Capitals',
  'WPG': 'Winnipeg Jets',
};

/**
 * Get full team name from abbreviation
 */
export function getTeamName(abbreviation: string): string {
  return TEAM_NAMES[abbreviation] || abbreviation;
}

/**
 * Calculate adjusted win probability based on game factors
 * Adjusts the base probability from the ML model based on:
 * - Injuries (each injury reduces team's chance by ~1-2%)
 * - Goalie status (backup/3rd string reduces chance)
 * - Rest days (B2B and fatigue reduce chance)
 */
export function calculateWinProb(game: Game): number {
  let prob = game.baseWinProb || 50;
  
  // Adjust for home team injuries (reduce home advantage)
  const homeInjuryPenalty = (game.homeInjuries || 0) * 1.5;
  prob -= homeInjuryPenalty;
  
  // Adjust for away team injuries (increase home advantage)
  const awayInjuryBonus = (game.awayInjuries || 0) * 1.5;
  prob += awayInjuryBonus;
  
  // Adjust for goalie status
  if (game.homeGoalie === 'backup') {
    prob -= 3; // Backup goalie reduces home team's chance
  } else if (game.homeGoalie === 'third-string') {
    prob -= 5; // 3rd string goalie reduces more
  }
  
  if (game.awayGoalie === 'backup') {
    prob += 3; // Opponent's backup increases home team's chance
  } else if (game.awayGoalie === 'third-string') {
    prob += 5; // Opponent's 3rd string increases more
  }
  
  // Adjust for rest days
  if (game.homeRestDays === 'back-to-back') {
    prob -= 2; // B2B reduces home team's chance
  } else if (game.homeRestDays === 'three-in-four') {
    prob -= 1.5;
  } else if (game.homeRestDays === 'four-in-six') {
    prob -= 2.5;
  }
  
  if (game.awayRestDays === 'back-to-back') {
    prob += 2; // Opponent's B2B increases home team's chance
  } else if (game.awayRestDays === 'three-in-four') {
    prob += 1.5;
  } else if (game.awayRestDays === 'four-in-six') {
    prob += 2.5;
  }
  
  // Clamp probability between 5% and 95%
  prob = Math.max(5, Math.min(95, prob));
  
  return Math.round(prob);
}
