import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Puck-drop instant for a game. Real games carry an absolute `startTime` from
 * the API; mock games only have a local date/time string.
 */
export function gameStart(game: { startTime?: string; date: string; time: string }): Date {
  return game.startTime ? new Date(game.startTime) : new Date(`${game.date}T${game.time}`);
}
