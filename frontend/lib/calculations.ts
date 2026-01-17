import { Game, GoalieType, RestStatus } from '@/types/game';

/**
 * Calculate win probability based on game state
 * This is a mock function that will be replaced with actual AI model predictions
 */
export function calculateWinProb(game: Game): number {
  let prob = game.baseWinProb;
  
  // Goalie adjustments
  const goalieAdjustments: Record<GoalieType, number> = {
    'starter': 0,
    'backup': -8,
    'third-string': -15,
  };
  
  prob += goalieAdjustments[game.homeGoalie];
  prob -= goalieAdjustments[game.awayGoalie];
  
  // Rest day adjustments
  const restAdjustments: Record<RestStatus, number> = {
    'fresh': 0,
    'back-to-back': -5,
    'three-in-four': -8,
    'four-in-six': -12,
  };
  
  prob += restAdjustments[game.homeRestDays];
  prob -= restAdjustments[game.awayRestDays];
  
  // Injury adjustments (each key player injured reduces win prob by 3%)
  prob -= game.homeInjuries * 3;
  prob += game.awayInjuries * 3;
  
  // Back-to-back adjustments (additional to rest days)
  if (game.isHomeBackToBack) prob -= 2;
  if (game.isAwayBackToBack) prob += 2;
  
  // Clamp between 5% and 95%
  prob = Math.max(5, Math.min(95, prob));
  
  return Math.round(prob);
}

/**
 * Get team name from abbreviation
 */
export function getTeamName(abbreviation: string): string {
  const teams: Record<string, string> = {
    'ANA': 'Anaheim Ducks', 'ARI': 'Arizona Coyotes', 'BOS': 'Boston Bruins',
    'BUF': 'Buffalo Sabres', 'CGY': 'Calgary Flames', 'CAR': 'Carolina Hurricanes',
    'CHI': 'Chicago Blackhawks', 'COL': 'Colorado Avalanche', 'CBJ': 'Columbus Blue Jackets',
    'DAL': 'Dallas Stars', 'DET': 'Detroit Red Wings', 'EDM': 'Edmonton Oilers',
    'FLA': 'Florida Panthers', 'LAK': 'Los Angeles Kings', 'MIN': 'Minnesota Wild',
    'MTL': 'Montreal Canadiens', 'NSH': 'Nashville Predators', 'NJD': 'New Jersey Devils',
    'NYI': 'NY Islanders', 'NYR': 'NY Rangers', 'OTT': 'Ottawa Senators',
    'PHI': 'Philadelphia Flyers', 'PIT': 'Pittsburgh Penguins', 'SJS': 'San Jose Sharks',
    'SEA': 'Seattle Kraken', 'STL': 'St. Louis Blues', 'TBL': 'Tampa Bay Lightning',
    'TOR': 'Toronto Maple Leafs', 'UTA': 'Utah', 'VAN': 'Vancouver Canucks',
    'VEG': 'Vegas Golden Knights', 'WSH': 'Washington Capitals', 'WPG': 'Winnipeg Jets',
  };
  return teams[abbreviation] || abbreviation;
}
