export interface Trade {
  symbol: string;
  percentReturn: number;
}

export interface DayEntry {
  id: string; // format: YYYY-MM-DD
  totalPL: number;
  trades: Trade[];
  numberOfTrades: number;
  notes: string;
  tags: string[];
  fallingKnives?: number; // Count of falling knife catches
}

export interface UserSettings {
  password: string;
  netWorth: number;
  startingBalance: number;
}

export type PLStatus = 'profit' | 'loss' | 'neutral';

