export type GoalieType = 'starter' | 'backup' | 'third-string';
export type RestStatus = 'fresh' | 'back-to-back' | 'three-in-four' | 'four-in-six';

export interface InjuredPlayer {
  player: string;
  status: string;
  timeline: string;
  reason: string;
}

export interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  homeGoalie: GoalieType;
  awayGoalie: GoalieType;
  isHomeBackToBack: boolean;
  isAwayBackToBack: boolean;
  homeRestDays: RestStatus;
  awayRestDays: RestStatus;
  homeInjuries: number;
  awayInjuries: number;
  homeInjuredPlayers?: InjuredPlayer[];
  awayInjuredPlayers?: InjuredPlayer[];
  baseWinProb: number; // The AI's initial prediction (0-100)
  currentWinProb?: number; // Current calculated probability after adjustments
}

export interface Team {
  abbreviation: string;
  name: string;
  city: string;
}
