import { DayEntry } from '../types';

export const calculateCumulativePL = (entries: DayEntry[]): number => {
  return entries.reduce((sum, entry) => sum + entry.totalPL, 0);
};

export const calculateWinRate = (entries: DayEntry[]): number => {
  const tradingDays = entries.filter(e => e.totalPL !== 0);
  if (tradingDays.length === 0) return 0;
  const wins = tradingDays.filter(e => e.totalPL > 0).length;
  return (wins / tradingDays.length) * 100;
};

export const calculateAverageReturn = (entries: DayEntry[]): number => {
  const totalTrades = entries.reduce((sum, e) => sum + e.numberOfTrades, 0);
  if (totalTrades === 0) return 0;
  const totalPL = calculateCumulativePL(entries);
  return totalPL / totalTrades;
};

export const calculateMaxDrawdown = (entries: DayEntry[]): number => {
  const sortedEntries = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  let peak = 0;
  let maxDrawdown = 0;
  let cumulative = 0;

  sortedEntries.forEach(entry => {
    cumulative += entry.totalPL;
    if (cumulative > peak) {
      peak = cumulative;
    }
    const drawdown = ((peak - cumulative) / (peak || 1)) * 100;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  return maxDrawdown;
};

export const calculateProfitFactor = (entries: DayEntry[]): number => {
  const profits = entries.filter(e => e.totalPL > 0).reduce((sum, e) => sum + e.totalPL, 0);
  const losses = Math.abs(entries.filter(e => e.totalPL < 0).reduce((sum, e) => sum + e.totalPL, 0));
  
  if (losses === 0) return profits > 0 ? Infinity : 0;
  return profits / losses;
};

export const calculateSharpeRatio = (entries: DayEntry[]): number => {
  const sortedEntries = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  if (sortedEntries.length === 0) return 0;

  const returns = sortedEntries.map(e => e.totalPL);
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;
  // Assuming risk-free rate of 0 for simplicity, annualized (sqrt(252) trading days)
  return (mean / stdDev) * Math.sqrt(252);
};

export const getPLByTicker = (entries: DayEntry[]): { ticker: string; pl: number; trades: number }[] => {
  const tickerMap = new Map<string, { pl: number; trades: number }>();

  entries.forEach(entry => {
    entry.trades.forEach(trade => {
      const current = tickerMap.get(trade.symbol) || { pl: 0, trades: 0 };
      tickerMap.set(trade.symbol, {
        pl: current.pl + (entry.totalPL / entry.trades.length), // Distribute P&L proportionally
        trades: current.trades + 1
      });
    });
  });

  return Array.from(tickerMap.entries())
    .map(([ticker, data]) => ({ ticker, ...data }))
    .sort((a, b) => b.pl - a.pl);
};

export const getPLByDayOfWeek = (entries: DayEntry[]): { day: string; pl: number }[] => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayMap = new Map<number, number>();

  entries.forEach(entry => {
    const date = new Date(entry.id);
    const dayIndex = date.getDay();
    dayMap.set(dayIndex, (dayMap.get(dayIndex) || 0) + entry.totalPL);
  });

  return days.map((day, index) => ({
    day,
    pl: dayMap.get(index) || 0
  }));
};

export const getReturnDistribution = (entries: DayEntry[]): number[] => {
  const allReturns: number[] = [];
  entries.forEach(entry => {
    entry.trades.forEach(trade => {
      allReturns.push(trade.percentReturn);
    });
  });
  return allReturns;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const formatPercent = (value: number): string => {
  return `${value.toFixed(2)}%`;
};

// New Advanced Metrics

export const calculateExpectancy = (entries: DayEntry[]): number => {
  const tradingDays = entries.filter(e => e.totalPL !== 0);
  if (tradingDays.length === 0) return 0;
  
  const wins = tradingDays.filter(e => e.totalPL > 0);
  const losses = tradingDays.filter(e => e.totalPL < 0);
  
  const avgWin = wins.length > 0 ? wins.reduce((sum, e) => sum + e.totalPL, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, e) => sum + e.totalPL, 0) / losses.length) : 0;
  
  const winRate = (wins.length / tradingDays.length);
  const lossRate = (losses.length / tradingDays.length);
  
  return (avgWin * winRate) - (avgLoss * lossRate);
};

export const calculateAvgWinLossRatio = (entries: DayEntry[]): number => {
  const wins = entries.filter(e => e.totalPL > 0);
  const losses = entries.filter(e => e.totalPL < 0);
  
  const avgWin = wins.length > 0 ? wins.reduce((sum, e) => sum + e.totalPL, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, e) => sum + e.totalPL, 0) / losses.length) : 0;
  
  if (avgLoss === 0) return avgWin > 0 ? Infinity : 0;
  return avgWin / avgLoss;
};

export const getLargestWinLoss = (entries: DayEntry[]): { largestWin: number; largestLoss: number } => {
  if (entries.length === 0) return { largestWin: 0, largestLoss: 0 };
  
  const wins = entries.filter(e => e.totalPL > 0);
  const losses = entries.filter(e => e.totalPL < 0);
  
  const largestWin = wins.length > 0 ? Math.max(...wins.map(e => e.totalPL)) : 0;
  const largestLoss = losses.length > 0 ? Math.min(...losses.map(e => e.totalPL)) : 0;
  
  return { largestWin, largestLoss };
};

export const getWinLossStreaks = (entries: DayEntry[]): { currentStreak: number; longestWinStreak: number; longestLossStreak: number } => {
  const sortedEntries = [...entries].sort((a, b) => a.id.localeCompare(b.id)).filter(e => e.totalPL !== 0);
  
  let currentStreak = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;
  
  sortedEntries.forEach((entry, index) => {
    if (entry.totalPL > 0) {
      tempWinStreak++;
      tempLossStreak = 0;
      if (tempWinStreak > longestWinStreak) longestWinStreak = tempWinStreak;
      if (index === sortedEntries.length - 1) currentStreak = tempWinStreak;
    } else {
      tempLossStreak++;
      tempWinStreak = 0;
      if (tempLossStreak > longestLossStreak) longestLossStreak = tempLossStreak;
      if (index === sortedEntries.length - 1) currentStreak = -tempLossStreak;
    }
  });
  
  return { currentStreak, longestWinStreak, longestLossStreak };
};

export const getPLByTag = (entries: DayEntry[]): { tag: string; pl: number; count: number }[] => {
  const tagMap = new Map<string, { pl: number; count: number }>();
  
  entries.forEach(entry => {
    entry.tags.forEach(tag => {
      const current = tagMap.get(tag) || { pl: 0, count: 0 };
      tagMap.set(tag, {
        pl: current.pl + entry.totalPL,
        count: current.count + 1
      });
    });
  });
  
  return Array.from(tagMap.entries())
    .map(([tag, data]) => ({ tag, ...data }))
    .sort((a, b) => b.pl - a.pl);
};

export const calculateRecoveryFactor = (entries: DayEntry[]): number => {
  const netProfit = calculateCumulativePL(entries);
  const maxDrawdownPercent = calculateMaxDrawdown(entries);
  
  if (maxDrawdownPercent === 0) return netProfit > 0 ? Infinity : 0;
  return netProfit / maxDrawdownPercent;
};

export const calculateAverageTradesPerDay = (entries: DayEntry[]): number => {
  if (entries.length === 0) return 0;
  const totalTrades = entries.reduce((sum, e) => sum + e.numberOfTrades, 0);
  return totalTrades / entries.length;
};

