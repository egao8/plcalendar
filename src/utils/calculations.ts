import { DayEntry } from '../types';

// Helper function to parse date string without timezone issues
// entry.id format is "YYYY-MM-DD"
const parseDateString = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date in local timezone
  return new Date(year, month - 1, day);
};

// Filter out outlier entries (10,000+ profit) for stats calculations
export const filterOutliers = (entries: DayEntry[]): DayEntry[] => {
  return entries.filter(entry => entry.totalPL < 10000);
};

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
  // Daily Sharpe ratio (not annualized since we're using dollar P&L, not returns)
  // For a more realistic ratio with dollar amounts
  return mean / stdDev;
};

export const calculateSortinoRatio = (entries: DayEntry[]): number => {
  const sortedEntries = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  if (sortedEntries.length === 0) return 0;

  const returns = sortedEntries.map(e => e.totalPL);
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  // Calculate downside deviation (only negative returns below mean)
  const downsideReturns = returns.filter(r => r < mean);
  if (downsideReturns.length === 0) return mean > 0 ? Infinity : 0;

  const downsideVariance = downsideReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const downsideDeviation = Math.sqrt(downsideVariance);

  if (downsideDeviation === 0) return mean > 0 ? Infinity : 0;
  // Daily Sortino ratio (not annualized since we're using dollar P&L, not returns)
  return mean / downsideDeviation;
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
    const date = parseDateString(entry.id);
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

  // Only count weekdays (Monday-Friday)
  const weekdayEntries = entries.filter(entry => {
    const date = parseDateString(entry.id);
    const dayOfWeek = date.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5; // 1 = Monday, 5 = Friday
  });

  if (weekdayEntries.length === 0) return 0;
  const totalTrades = weekdayEntries.reduce((sum, e) => sum + e.numberOfTrades, 0);
  return totalTrades / weekdayEntries.length;
};

export const calculateMonthlyPL = (entries: DayEntry[], month: Date): number => {
  const monthEntries = entries.filter(entry => {
    // Parse date string directly to avoid timezone issues
    // entry.id format is "YYYY-MM-DD"
    const [year, monthStr] = entry.id.split('-').map(Number);
    return monthStr === month.getMonth() + 1 &&
           year === month.getFullYear();
  });
  return monthEntries.reduce((sum, entry) => sum + entry.totalPL, 0);
};

export const calculateWeeklyPL = (entries: DayEntry[]): number => {
  if (entries.length === 0) return 0;

  // Get the most recent entry date
  const sortedEntries = [...entries].sort((a, b) => b.id.localeCompare(a.id));
  const mostRecentDate = parseDateString(sortedEntries[0].id);

  // Calculate start of the week (Sunday) for the most recent entry
  const startOfWeek = new Date(mostRecentDate);
  startOfWeek.setDate(mostRecentDate.getDate() - mostRecentDate.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Calculate end of week (Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Filter entries for this week
  const weekEntries = entries.filter(entry => {
    const entryDate = parseDateString(entry.id);
    return entryDate >= startOfWeek && entryDate <= endOfWeek;
  });

  return weekEntries.reduce((sum, entry) => sum + entry.totalPL, 0);
};

export const getMostRecentMonthWithData = (entries: DayEntry[]): Date => {
  if (entries.length === 0) {
    return new Date(); // Current month if no data
  }

  const sortedEntries = [...entries].sort((a, b) => b.id.localeCompare(a.id));
  const mostRecentDate = parseDateString(sortedEntries[0].id);
  return new Date(mostRecentDate.getFullYear(), mostRecentDate.getMonth(), 1);
};

// Falling Knife Stats
export const getTotalFallingKnives = (entries: DayEntry[]): number => {
  return entries.reduce((sum, entry) => sum + (entry.fallingKnives || 0), 0);
};

export const getMonthlyFallingKnives = (entries: DayEntry[], month: Date): number => {
  const monthEntries = entries.filter(entry => {
    // Parse date string directly to avoid timezone issues
    // entry.id format is "YYYY-MM-DD"
    const [year, monthStr] = entry.id.split('-').map(Number);
    return monthStr === month.getMonth() + 1 &&
           year === month.getFullYear();
  });
  return monthEntries.reduce((sum, entry) => sum + (entry.fallingKnives || 0), 0);
};

export const calculateFKWinRate = (entries: DayEntry[]): number => {
  // Win rate excluding days with falling knives
  const nonFKDays = entries.filter(e => e.totalPL !== 0 && (e.fallingKnives || 0) === 0);
  if (nonFKDays.length === 0) return 0;
  const wins = nonFKDays.filter(e => e.totalPL > 0).length;
  return (wins / nonFKDays.length) * 100;
};

