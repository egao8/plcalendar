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
  // Include days with either P&L or falling knives as active trading days
  const tradingDays = entries.filter(e => e.totalPL !== 0 || (e.fallingKnives || 0) > 0);
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
    // Only calculate drawdown when peak is meaningfully positive
    if (peak > 0) {
      const drawdown = ((peak - cumulative) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
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
  // Only consider days with actual trading activity
  const tradingDays = [...entries].filter(e => e.totalPL !== 0).sort((a, b) => a.id.localeCompare(b.id));
  if (tradingDays.length < 2) return 0;

  const returns = tradingDays.map(e => e.totalPL);
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  // Annualized Sharpe: (mean daily return / daily std dev) * sqrt(trading days per year)
  return (mean / stdDev) * Math.sqrt(252);
};

export const calculateSortinoRatio = (entries: DayEntry[]): number => {
  // Only consider days with actual trading activity
  const tradingDays = [...entries].filter(e => e.totalPL !== 0).sort((a, b) => a.id.localeCompare(b.id));
  if (tradingDays.length < 2) return 0;

  const returns = tradingDays.map(e => e.totalPL);
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const target = 0; // Risk-free target return

  // Downside deviation: squared differences of returns below target, divided by total count
  const downsideSquaredSum = returns.reduce((sum, r) => {
    if (r < target) {
      return sum + Math.pow(r - target, 2);
    }
    return sum;
  }, 0);

  const downsideDeviation = Math.sqrt(downsideSquaredSum / (returns.length - 1));

  if (downsideDeviation === 0) return mean > 0 ? Infinity : 0;

  // Annualized Sortino: (mean daily return / downside deviation) * sqrt(trading days per year)
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
  conditionalVaR975: number;
  worstRealizedLoss: number;
} => {
  const sorted = [...entries].sort((a, b) => a.totalPL - b.totalPL);

  const index95 = Math.floor(sorted.length * 0.05);
  const index99 = Math.floor(sorted.length * 0.01);
  const index975 = Math.floor(sorted.length * 0.025);

  const valueAtRisk95 = sorted[index95]?.totalPL || 0;
  const valueAtRisk99 = sorted[index99]?.totalPL || 0;

  // Conditional VaR (expected loss beyond VaR) at 95%
  const tailLosses95 = sorted.slice(0, index95);
  const conditionalVaR95 = tailLosses95.length > 0
    ? tailLosses95.reduce((sum, e) => sum + e.totalPL, 0) / tailLosses95.length
    : 0;

  // Conditional VaR at 97.5%
  const tailLosses975 = sorted.slice(0, index975);
  const conditionalVaR975 = tailLosses975.length > 0
    ? tailLosses975.reduce((sum, e) => sum + e.totalPL, 0) / tailLosses975.length
    : 0;

  // Worst realized loss (absolute minimum P&L)
  const worstRealizedLoss = sorted.length > 0 ? sorted[0].totalPL : 0;

  return {
    valueAtRisk95,
    valueAtRisk99,
    conditionalVaR95,
    conditionalVaR975,
    worstRealizedLoss
  };
};

// === TAIL RISK (NON-GAUSSIAN) METRICS ===

// Sample Skewness — measures asymmetry of the return distribution
// Positive skew = more extreme positive returns, Negative = more extreme losses
export const calculateSkewness = (entries: DayEntry[]): number => {
  const returns = entries.filter(e => e.totalPL !== 0).map(e => e.totalPL);
  const n = returns.length;
  if (n < 3) return 0;

  const mean = returns.reduce((sum, r) => sum + r, 0) / n;
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (n - 1));
  if (stdDev === 0) return 0;

  // Sample skewness with bias correction: [n/((n-1)(n-2))] * Σ((xi - mean)/σ)³
  const m3 = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 3), 0);
  return (n / ((n - 1) * (n - 2))) * m3;
};

// Excess Kurtosis — measures tail heaviness relative to normal distribution
// Positive = fat tails (more extreme events), 0 = normal, Negative = thin tails
export const calculateExcessKurtosis = (entries: DayEntry[]): number => {
  const returns = entries.filter(e => e.totalPL !== 0).map(e => e.totalPL);
  const n = returns.length;
  if (n < 4) return 0;

  const mean = returns.reduce((sum, r) => sum + r, 0) / n;
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (n - 1));
  if (stdDev === 0) return 0;

  // Sample excess kurtosis with bias correction
  const m4 = returns.reduce((sum, r) => sum + Math.pow((r - mean) / stdDev, 4), 0);
  const kurtosis = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) * m4;
  const correction = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  return kurtosis - correction;
};

// Cornish-Fisher VaR — adjusts normal VaR for skewness and kurtosis
// More accurate than Gaussian VaR when returns are non-normal
export const calculateCornishFisherVaR = (entries: DayEntry[], confidence: number = 0.95): number => {
  const returns = entries.filter(e => e.totalPL !== 0).map(e => e.totalPL);
  const n = returns.length;
  if (n < 4) return 0;

  const mean = returns.reduce((sum, r) => sum + r, 0) / n;
  const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (n - 1));
  if (stdDev === 0) return 0;

  const skew = calculateSkewness(entries);
  const kurt = calculateExcessKurtosis(entries);

  // Standard normal quantile for the confidence level (e.g., -1.645 for 95%)
  // Using rational approximation for inverse normal CDF
  const p = 1 - confidence;
  const t = Math.sqrt(-2 * Math.log(p));
  const z_normal = -(t - (2.515517 + 0.802853 * t + 0.010328 * t * t) /
    (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t));

  // Cornish-Fisher expansion: adjust z for skew and kurtosis
  const z_cf = z_normal
    + (1 / 6) * (Math.pow(z_normal, 2) - 1) * skew
    + (1 / 24) * (Math.pow(z_normal, 3) - 3 * z_normal) * kurt
    - (1 / 36) * (2 * Math.pow(z_normal, 3) - 5 * z_normal) * Math.pow(skew, 2);

  return mean + z_cf * stdDev;
};

// === ALPHA DECOMPOSITION METRICS ===

// OLS Linear Regression helper: returns { alpha, beta, r2, alphaStdErr, residuals }
export const olsRegression = (
  portfolioReturns: number[],
  benchmarkReturns: number[]
): { alpha: number; beta: number; r2: number; alphaStdErr: number; residuals: number[] } => {
  const n = portfolioReturns.length;
  if (n < 3 || n !== benchmarkReturns.length) {
    return { alpha: 0, beta: 0, r2: 0, alphaStdErr: 0, residuals: [] };
  }

  const meanY = portfolioReturns.reduce((s, r) => s + r, 0) / n;
  const meanX = benchmarkReturns.reduce((s, r) => s + r, 0) / n;

  let ssXX = 0, ssXY = 0, ssYY = 0;
  for (let i = 0; i < n; i++) {
    const dx = benchmarkReturns[i] - meanX;
    const dy = portfolioReturns[i] - meanY;
    ssXX += dx * dx;
    ssXY += dx * dy;
    ssYY += dy * dy;
  }

  if (ssXX === 0) return { alpha: 0, beta: 0, r2: 0, alphaStdErr: 0, residuals: [] };

  const beta = ssXY / ssXX;
  const alpha = meanY - beta * meanX;
  const r2 = ssYY > 0 ? Math.pow(ssXY, 2) / (ssXX * ssYY) : 0;

  // Residuals and standard error of alpha
  const residuals = portfolioReturns.map((y, i) => y - (alpha + beta * benchmarkReturns[i]));
  const sse = residuals.reduce((s, r) => s + r * r, 0);
  const mse = sse / (n - 2);
  const sumX2 = benchmarkReturns.reduce((s, x) => s + x * x, 0);
  const alphaStdErr = Math.sqrt(mse * sumX2 / (n * ssXX));

  return { alpha, beta, r2, alphaStdErr, residuals };
};

// Full Alpha Decomposition: Jensen's Alpha, Beta, Alpha t-stat, Residual Alpha
export const calculateAlphaDecomposition = (
  entries: DayEntry[],
  benchmarkReturns: { date: string; return: number }[],
  riskFreeRate: number = 0.0525 // annual, default ~5.25%
): {
  jensensAlpha: number;
  annualizedAlpha: number;
  beta: number;
  alphaTStat: number;
  r2: number;
  residualAlpha: number;
} => {
  const dailyRf = riskFreeRate / 252;

  // Align dates between portfolio and benchmark
  const benchmarkMap = new Map(benchmarkReturns.map(b => [b.date, b.return]));
  const sortedEntries = [...entries].sort((a, b) => a.id.localeCompare(b.id));

  const aligned: { portfolioReturn: number; benchmarkReturn: number }[] = [];
  for (const entry of sortedEntries) {
    const bmReturn = benchmarkMap.get(entry.id);
    if (bmReturn !== undefined) {
      aligned.push({
        portfolioReturn: entry.totalPL, // dollar P&L as "return"
        benchmarkReturn: bmReturn
      });
    }
  }

  if (aligned.length < 10) {
    return { jensensAlpha: 0, annualizedAlpha: 0, beta: 0, alphaTStat: 0, r2: 0, residualAlpha: 0 };
  }

  // Excess returns over risk-free rate
  const excessPortfolio = aligned.map(a => a.portfolioReturn - dailyRf);
  const excessBenchmark = aligned.map(a => a.benchmarkReturn - dailyRf);

  const regression = olsRegression(excessPortfolio, excessBenchmark);

  // Jensen's Alpha = daily alpha from regression
  const jensensAlpha = regression.alpha;
  const annualizedAlpha = jensensAlpha * 252;

  // Alpha t-statistic = alpha / SE(alpha)
  const alphaTStat = regression.alphaStdErr > 0 ? jensensAlpha / regression.alphaStdErr : 0;

  // Residual alpha = mean of residuals (should be ~0 for a well-specified model)
  const residualAlpha = regression.residuals.length > 0
    ? regression.residuals.reduce((s, r) => s + r, 0) / regression.residuals.length
    : 0;

  return {
    jensensAlpha,
    annualizedAlpha,
    beta: regression.beta,
    alphaTStat,
    r2: regression.r2,
    residualAlpha
  };
};

// Rolling Alpha: computes Jensen's Alpha over rolling windows
export const calculateRollingAlpha = (
  entries: DayEntry[],
  benchmarkReturns: { date: string; return: number }[],
  windowSizes: number[] = [30, 60, 90],
  riskFreeRate: number = 0.0525
): { date: string; alpha30d?: number; alpha60d?: number; alpha90d?: number }[] => {
  const dailyRf = riskFreeRate / 252;
  const benchmarkMap = new Map(benchmarkReturns.map(b => [b.date, b.return]));
  const sortedEntries = [...entries].sort((a, b) => a.id.localeCompare(b.id));

  // Build aligned series
  const alignedSeries: { date: string; portfolioReturn: number; benchmarkReturn: number }[] = [];
  for (const entry of sortedEntries) {
    const bmReturn = benchmarkMap.get(entry.id);
    if (bmReturn !== undefined) {
      alignedSeries.push({
        date: entry.id,
        portfolioReturn: entry.totalPL,
        benchmarkReturn: bmReturn
      });
    }
  }

  const maxWindow = Math.max(...windowSizes);
  if (alignedSeries.length < maxWindow) return [];

  const result: { date: string; alpha30d?: number; alpha60d?: number; alpha90d?: number }[] = [];

  for (let i = maxWindow - 1; i < alignedSeries.length; i++) {
    const point: { date: string; alpha30d?: number; alpha60d?: number; alpha90d?: number } = {
      date: alignedSeries[i].date
    };

    for (const window of windowSizes) {
      if (i >= window - 1) {
        const slice = alignedSeries.slice(i - window + 1, i + 1);
        const excessP = slice.map(s => s.portfolioReturn - dailyRf);
        const excessB = slice.map(s => s.benchmarkReturn - dailyRf);
        const reg = olsRegression(excessP, excessB);
        const key = `alpha${window}d` as keyof typeof point;
        (point as Record<string, number | string | undefined>)[key] = reg.alpha * 252; // annualized
      }
    }

    result.push(point);
  }

  return result;
};
