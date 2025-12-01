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

  // Standard Sharpe calculation with annualization
  return (mean / stdDev) * Math.sqrt(252);
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

  // Standard Sortino calculation with annualization
  return (mean / downsideDeviation) * Math.sqrt(252);
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

// Advanced Analytics Functions

export const calculateRollingMetrics = (
  entries: DayEntry[],
  windowSize: number = 20
): { date: string; avgPL: number; winRate: number; cumulative: number }[] => {
  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  const results: { date: string; avgPL: number; winRate: number; cumulative: number }[] = [];
  let cumulative = 0;

  for (let i = 0; i < sorted.length; i++) {
    cumulative += sorted[i].totalPL;
    const windowStart = Math.max(0, i - windowSize + 1);
    const window = sorted.slice(windowStart, i + 1);

    const avgPL = window.reduce((sum, e) => sum + e.totalPL, 0) / window.length;
    const tradingDays = window.filter(e => e.totalPL !== 0);
    const wins = tradingDays.filter(e => e.totalPL > 0).length;
    const winRate = tradingDays.length > 0 ? (wins / tradingDays.length) * 100 : 0;

    results.push({
      date: sorted[i].id,
      avgPL,
      winRate,
      cumulative
    });
  }

  return results;
};

export const calculateDrawdownSeries = (entries: DayEntry[]): { date: string; drawdown: number; underwater: number }[] => {
  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  let peak = 0;
  let cumulative = 0;
  const results: { date: string; drawdown: number; underwater: number }[] = [];

  sorted.forEach(entry => {
    cumulative += entry.totalPL;
    if (cumulative > peak) peak = cumulative;

    const drawdownDollars = peak - cumulative;
    const drawdownPercent = peak > 0 ? (drawdownDollars / peak) * 100 : 0;

    results.push({
      date: entry.id,
      drawdown: drawdownPercent,
      underwater: drawdownDollars
    });
  });

  return results;
};

export const calculateMonthlyReturns = (entries: DayEntry[]): { month: string; pl: number; trades: number; winRate: number }[] => {
  const monthMap = new Map<string, DayEntry[]>();

  entries.forEach(entry => {
    const date = parseDateString(entry.id);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthEntries = monthMap.get(monthKey) || [];
    monthEntries.push(entry);
    monthMap.set(monthKey, monthEntries);
  });

  return Array.from(monthMap.entries())
    .map(([month, monthEntries]) => {
      const pl = monthEntries.reduce((sum, e) => sum + e.totalPL, 0);
      const trades = monthEntries.reduce((sum, e) => sum + e.numberOfTrades, 0);
      const tradingDays = monthEntries.filter(e => e.totalPL !== 0);
      const wins = tradingDays.filter(e => e.totalPL > 0).length;
      const winRate = tradingDays.length > 0 ? (wins / tradingDays.length) * 100 : 0;

      return { month, pl, trades, winRate };
    })
    .sort((a, b) => a.month.localeCompare(b.month));
};

export const calculateVolatilitySeries = (entries: DayEntry[], windowSize: number = 20): { date: string; volatility: number }[] => {
  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  const results: { date: string; volatility: number }[] = [];

  for (let i = windowSize - 1; i < sorted.length; i++) {
    const window = sorted.slice(i - windowSize + 1, i + 1);
    const returns = window.map(e => e.totalPL);
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    results.push({
      date: sorted[i].id,
      volatility: volatility * Math.sqrt(252) // Annualized volatility
    });
  }

  return results;
};

// Calculate Calmar Ratio (Annual Return / Max Drawdown)
export const calculateCalmarRatio = (entries: DayEntry[]): number => {
  if (entries.length === 0) return 0;

  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  const totalPL = sorted.reduce((sum, e) => sum + e.totalPL, 0);
  const dayCount = sorted.length;

  // Annualized return estimate
  const annualizedReturn = (totalPL / dayCount) * 252;

  const maxDrawdownPercent = calculateMaxDrawdown(entries);

  if (maxDrawdownPercent === 0) return annualizedReturn > 0 ? Infinity : 0;
  return (annualizedReturn / maxDrawdownPercent);
};

// Calculate win/loss by hour (if we had intraday data, but we'll use tags as proxy)
export const getConsecutiveWinsLosses = (entries: DayEntry[]): { consecutive: number; type: 'win' | 'loss' }[] => {
  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id)).filter(e => e.totalPL !== 0);
  const results: { consecutive: number; type: 'win' | 'loss' }[] = [];
  let currentStreak = 0;
  let currentType: 'win' | 'loss' | null = null;

  sorted.forEach(entry => {
    const type: 'win' | 'loss' = entry.totalPL > 0 ? 'win' : 'loss';

    if (type === currentType) {
      currentStreak++;
    } else {
      if (currentType !== null) {
        results.push({ consecutive: currentStreak, type: currentType });
      }
      currentType = type;
      currentStreak = 1;
    }
  });

  if (currentType !== null) {
    results.push({ consecutive: currentStreak, type: currentType });
  }

  return results;
};

// R-Multiple analysis (how many times your average loss do you make on winners)
export const calculateRMultiples = (entries: DayEntry[]): { avgWinR: number; avgLossR: number; rMultiples: number[] } => {
  const wins = entries.filter(e => e.totalPL > 0);
  const losses = entries.filter(e => e.totalPL < 0);

  const avgWin = wins.length > 0 ? wins.reduce((sum, e) => sum + e.totalPL, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, e) => sum + e.totalPL, 0) / losses.length) : 1;

  const rMultiples = entries.map(e => {
    if (avgLoss === 0) return 0;
    return e.totalPL / avgLoss;
  });

  return {
    avgWinR: avgLoss > 0 ? avgWin / avgLoss : 0,
    avgLossR: -1, // By definition
    rMultiples
  };
};

// Monte Carlo simulation for risk of ruin
export const calculateRiskMetrics = (entries: DayEntry[]): {
  valueAtRisk95: number;
  valueAtRisk99: number;
  conditionalVaR95: number;
} => {
  const sorted = [...entries].sort((a, b) => a.totalPL - b.totalPL);

  const index95 = Math.floor(sorted.length * 0.05);
  const index99 = Math.floor(sorted.length * 0.01);

  const valueAtRisk95 = sorted[index95]?.totalPL || 0;
  const valueAtRisk99 = sorted[index99]?.totalPL || 0;

  // Conditional VaR (expected loss beyond VaR)
  const tailLosses = sorted.slice(0, index95);
  const conditionalVaR95 = tailLosses.length > 0
    ? tailLosses.reduce((sum, e) => sum + e.totalPL, 0) / tailLosses.length
    : 0;

  return {
    valueAtRisk95,
    valueAtRisk99,
    conditionalVaR95
  };
};

