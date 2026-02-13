import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { DayEntry, UserSettings } from '../types';
import {
  filterOutliers,
  calculateWinRate,
  calculateAverageReturn,
  calculateMaxDrawdown,
  calculateProfitFactor,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateExpectancy,
  calculateAvgWinLossRatio,
  getLargestWinLoss,
  getWinLossStreaks,
  getPLByTicker,
  getPLByDayOfWeek,
  getPLByTag,
  getReturnDistribution,
  calculateAverageTradesPerDay,
  calculateFKWinRate,
  getTotalFallingKnives,
  calculateRollingMetrics,
  calculateMonthlyReturns,
  calculateVolatilitySeries,
  calculateRiskMetrics,
  calculateCumulativePL,
  calculateSkewness,
  calculateExcessKurtosis,
  calculateCornishFisherVaR,
  calculateAlphaDecomposition,
  calculateRollingAlpha,
  formatCurrency,
  formatPercent
} from '../utils/calculations';
import { fetchBenchmarkReturns } from '../utils/benchmarkService';

interface AnalyticsProps {
  entries: DayEntry[];
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
}

export const Analytics: React.FC<AnalyticsProps> = ({ entries, settings, onUpdateSettings }) => {
  const [isEditingDrawdown, setIsEditingDrawdown] = useState(false);
  const [drawdownInput, setDrawdownInput] = useState('');
  const [benchmarkReturns, setBenchmarkReturns] = useState<{ date: string; return: number }[]>([]);
  const [benchmarkLoading, setBenchmarkLoading] = useState(true);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);

  // Fetch SPY benchmark data on mount
  useEffect(() => {
    let cancelled = false;
    setBenchmarkLoading(true);
    setBenchmarkError(null);
    fetchBenchmarkReturns('SPY')
      .then(returns => {
        if (!cancelled) {
          setBenchmarkReturns(returns);
          if (returns.length === 0) setBenchmarkError('Unable to fetch benchmark data');
        }
      })
      .catch(() => {
        if (!cancelled) setBenchmarkError('Failed to load benchmark data');
      })
      .finally(() => {
        if (!cancelled) setBenchmarkLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Filter out outliers (10,000+ profit days) for all stats calculations
  const filteredEntries = useMemo(() => filterOutliers(entries), [entries]);

  const sortedEntries = useMemo(() =>
    [...filteredEntries].sort((a, b) => a.id.localeCompare(b.id)),
    [filteredEntries]
  );

  // Calculate cumulative P&L over time
  const cumulativePLData = useMemo(() => {
    let cumulative = 0;
    return sortedEntries.map(entry => {
      cumulative += entry.totalPL;
      return {
        date: entry.id,
        pl: cumulative
      };
    });
  }, [sortedEntries]);

  // Daily P&L
  const dailyPLData = useMemo(() =>
    sortedEntries.map(entry => ({
      date: entry.id,
      pl: entry.totalPL
    })),
    [sortedEntries]
  );

  // Core metrics (using filtered entries to exclude outliers)
  const metrics = useMemo(() => {
    const winLoss = getLargestWinLoss(filteredEntries);
    const streaks = getWinLossStreaks(filteredEntries);
    const riskMetrics = calculateRiskMetrics(filteredEntries);
    const calculatedMaxDD = calculateMaxDrawdown(filteredEntries);
    const totalPL = calculateCumulativePL(filteredEntries);

    // If user has a manual override, compute effective max DD %
    // Override is in dollars, so convert to % of peak equity
    let effectiveMaxDD = calculatedMaxDD;
    if (settings.maxDrawdownOverride && settings.maxDrawdownOverride > 0) {
      // Use the override dollar amount relative to peak equity (totalPL + override gives approximate peak)
      const peakEquity = totalPL + settings.maxDrawdownOverride;
      effectiveMaxDD = peakEquity > 0 ? (settings.maxDrawdownOverride / peakEquity) * 100 : calculatedMaxDD;
    }

    // Recompute Calmar with effective max DD
    const sorted = [...filteredEntries].sort((a, b) => a.id.localeCompare(b.id));
    const dayCount = sorted.length;
    const annualizedReturn = dayCount > 0 ? (totalPL / dayCount) * 252 : 0;
    const effectiveCalmar = effectiveMaxDD === 0 ? (annualizedReturn > 0 ? Infinity : 0) : annualizedReturn / effectiveMaxDD;

    // Recompute Recovery Factor with effective max DD
    const effectiveRecovery = effectiveMaxDD === 0 ? (totalPL > 0 ? Infinity : 0) : totalPL / effectiveMaxDD;

    return {
      winRate: calculateWinRate(filteredEntries),
      fkWinRate: calculateFKWinRate(filteredEntries),
      avgReturn: calculateAverageReturn(filteredEntries),
      maxDrawdown: effectiveMaxDD,
      maxDrawdownDollars: settings.maxDrawdownOverride || 0,
      profitFactor: calculateProfitFactor(filteredEntries),
      sharpeRatio: calculateSharpeRatio(filteredEntries),
      sortinoRatio: calculateSortinoRatio(filteredEntries),
      calmarRatio: effectiveCalmar,
      expectancy: calculateExpectancy(filteredEntries),
      avgWinLossRatio: calculateAvgWinLossRatio(filteredEntries),
      largestWin: winLoss.largestWin,
      largestLoss: winLoss.largestLoss,
      currentStreak: streaks.currentStreak,
      longestWinStreak: streaks.longestWinStreak,
      longestLossStreak: streaks.longestLossStreak,
      recoveryFactor: effectiveRecovery,
      avgTradesPerDay: calculateAverageTradesPerDay(filteredEntries),
      totalFK: getTotalFallingKnives(filteredEntries),
      ...riskMetrics
    };
  }, [filteredEntries, settings.maxDrawdownOverride]);

  // P&L by ticker (using filtered entries)
  const plByTicker = useMemo(() =>
    getPLByTicker(filteredEntries).slice(0, 10),
    [filteredEntries]
  );

  // P&L by day of week (using filtered entries)
  const plByDay = useMemo(() => getPLByDayOfWeek(filteredEntries), [filteredEntries]);

  // P&L by tag/strategy (using filtered entries)
  const plByTag = useMemo(() => getPLByTag(filteredEntries), [filteredEntries]);

  // Return distribution (histogram) — granular bins from 0-5%, with outlier buckets
  const returnDistribution = useMemo(() => {
    const returns = getReturnDistribution(filteredEntries);
    if (returns.length === 0) return [];

    // Use absolute values for distribution (magnitude of returns)
    const absReturns = returns.map(r => Math.abs(r));

    // Define granular bins
    const binEdges = [0, 0.1, 0.3, 0.6, 1.0, 1.5, 2.0, 3.0, 5.0];
    const bins: { range: string; count: number }[] = [];

    for (let i = 0; i < binEdges.length - 1; i++) {
      const low = binEdges[i];
      const high = binEdges[i + 1];
      const count = absReturns.filter(r => r >= low && r < high).length;
      bins.push({ range: `${low}-${high}%`, count });
    }

    // Outlier bucket: 5%+
    const outlierCount = absReturns.filter(r => r >= 5.0).length;
    if (outlierCount > 0) {
      bins.push({ range: '5%+ (outlier)', count: outlierCount });
    }

    return bins;
  }, [filteredEntries]);

  // Advanced analytics data
  const rollingMetrics = useMemo(() => calculateRollingMetrics(filteredEntries, 20), [filteredEntries]);
  const monthlyReturns = useMemo(() => calculateMonthlyReturns(filteredEntries), [filteredEntries]);
  const volatilitySeries = useMemo(() => calculateVolatilitySeries(filteredEntries, 20), [filteredEntries]);

  // Tail Risk metrics
  const tailRisk = useMemo(() => ({
    skewness: calculateSkewness(filteredEntries),
    excessKurtosis: calculateExcessKurtosis(filteredEntries),
    cornishFisherVaR: calculateCornishFisherVaR(filteredEntries, 0.95),
  }), [filteredEntries]);

  // Alpha Decomposition (depends on benchmark data)
  const alphaMetrics = useMemo(() => {
    if (benchmarkReturns.length === 0) return null;
    return calculateAlphaDecomposition(filteredEntries, benchmarkReturns);
  }, [filteredEntries, benchmarkReturns]);

  const rollingAlpha = useMemo(() => {
    if (benchmarkReturns.length === 0) return [];
    return calculateRollingAlpha(filteredEntries, benchmarkReturns);
  }, [filteredEntries, benchmarkReturns]);


  const MetricCard: React.FC<{ title: string; value: string | number; subtitle?: string; color?: string }> =
    ({ title, value, subtitle, color = 'text-white' }) => (
      <div className="bg-quant-surface p-3 border-l-2 border-l-quant-border hover:border-l-quant-accent transition-colors">
        <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide font-medium">{title}</div>
        <div className={`text-xl font-semibold font-mono ${color}`}>{value}</div>
        {subtitle && <div className="text-xs text-slate-600 mt-1">{subtitle}</div>}
      </div>
    );

  if (entries.length === 0) {
    return (
      <div className="bg-quant-card border border-quant-border p-12 text-center">
        <div className="text-slate-400 text-sm">
          No trading data yet. Start by adding entries to the calendar!
        </div>
      </div>
    );
  }

  const outlierCount = entries.length - filteredEntries.length;

  return (
    <div className="space-y-4">
      {/* Outlier Notice */}
      {outlierCount > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 p-3 rounded">
          <div className="text-yellow-400 text-sm">
            <strong>Note:</strong> {outlierCount} outlier day{outlierCount !== 1 ? 's' : ''} with 10,000+ profit excluded from statistics to ensure accuracy.
          </div>
        </div>
      )}
      {/* Core Performance Metrics */}
      <div className="bg-quant-card border border-quant-border p-4">
        <h2 className="text-sm font-semibold text-white tracking-tight mb-4 pb-2 border-b border-quant-border">CORE PERFORMANCE METRICS</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <MetricCard
            title="Win Rate"
            value={formatPercent(metrics.winRate)}
            subtitle="All trading days"
            color="text-green-400"
          />
          <MetricCard
            title="FK Win Rate"
            value={formatPercent(metrics.fkWinRate)}
            subtitle={`Excluding ${metrics.totalFK} FK days`}
            color="text-cyan-400"
          />
          <MetricCard
            title="Average Return per Trade"
            value={formatCurrency(metrics.avgReturn)}
            color={metrics.avgReturn >= 0 ? 'text-green-400' : 'text-red-400'}
          />
          <MetricCard
            title="Expectancy"
            value={formatCurrency(metrics.expectancy)}
            subtitle="Expected value per trade"
            color={metrics.expectancy >= 0 ? 'text-green-400' : 'text-red-400'}
          />
          <MetricCard
            title="Avg Win/Loss Ratio"
            value={metrics.avgWinLossRatio === Infinity ? '∞' : metrics.avgWinLossRatio.toFixed(2)}
            subtitle="Average win ÷ average loss"
            color="text-blue-400"
          />
          <MetricCard
            title="Profit Factor"
            value={metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
            subtitle="Total profit ÷ total loss"
            color="text-blue-400"
          />
          <MetricCard
            title="Sharpe Ratio"
            value={metrics.sharpeRatio.toFixed(2)}
            subtitle="Risk-adjusted return"
            color="text-purple-400"
          />
          <MetricCard
            title="Sortino Ratio"
            value={metrics.sortinoRatio === Infinity ? '∞' : metrics.sortinoRatio.toFixed(2)}
            subtitle="Downside risk-adjusted return"
            color="text-purple-400"
          />
          <MetricCard
            title="Calmar Ratio"
            value={metrics.calmarRatio === Infinity ? '∞' : metrics.calmarRatio.toFixed(2)}
            subtitle="Annual return ÷ max DD"
            color="text-purple-400"
          />
          <div className="bg-quant-surface p-3 border-l-2 border-l-quant-border hover:border-l-quant-accent transition-colors">
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500 mb-1 uppercase tracking-wide font-medium">Max Drawdown</div>
              <button
                onClick={() => {
                  setIsEditingDrawdown(!isEditingDrawdown);
                  if (!isEditingDrawdown) setDrawdownInput((settings.maxDrawdownOverride || '').toString());
                }}
                className="text-slate-500 hover:text-white transition-colors"
                title="Set actual max drawdown"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
              </button>
            </div>
            {isEditingDrawdown ? (
              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="100"
                    value={drawdownInput}
                    onChange={(e) => setDrawdownInput(e.target.value)}
                    className="flex-1 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 1300"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      const val = parseFloat(drawdownInput);
                      if (!isNaN(val) && val >= 0) {
                        onUpdateSettings({ ...settings, maxDrawdownOverride: val });
                      }
                      setIsEditingDrawdown(false);
                    }}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors"
                  >
                    Save
                  </button>
                </div>
                <div className="text-xs text-slate-500">Enter actual max drawdown in $ (unrealized)</div>
                {settings.maxDrawdownOverride && settings.maxDrawdownOverride > 0 && (
                  <button
                    onClick={() => {
                      onUpdateSettings({ ...settings, maxDrawdownOverride: undefined });
                      setIsEditingDrawdown(false);
                    }}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Clear override (use calculated)
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="text-xl font-semibold font-mono text-red-400">
                  {settings.maxDrawdownOverride && settings.maxDrawdownOverride > 0
                    ? `${formatCurrency(-settings.maxDrawdownOverride)} (${formatPercent(metrics.maxDrawdown)})`
                    : formatPercent(metrics.maxDrawdown)
                  }
                </div>
                {settings.maxDrawdownOverride && settings.maxDrawdownOverride > 0 && (
                  <div className="text-xs text-slate-600 mt-1">Manual override active</div>
                )}
              </>
            )}
          </div>
          <MetricCard
            title="CVaR (95%)"
            value={formatCurrency(metrics.conditionalVaR95)}
            subtitle="Expected tail loss"
            color="text-red-400"
          />
          <MetricCard
            title="Recovery Factor"
            value={metrics.recoveryFactor === Infinity ? '∞' : metrics.recoveryFactor.toFixed(2)}
            subtitle="Net profit ÷ max drawdown"
            color="text-cyan-400"
          />
          <MetricCard
            title="Largest Win"
            value={formatCurrency(metrics.largestWin)}
            color="text-green-400"
          />
          <MetricCard
            title="Largest Loss"
            value={formatCurrency(metrics.largestLoss)}
            color="text-red-400"
          />
          <MetricCard
            title="Longest Win Streak"
            value={`${metrics.longestWinStreak} days`}
            color="text-green-400"
          />
          <MetricCard
            title="Longest Loss Streak"
            value={`${metrics.longestLossStreak} days`}
            color="text-red-400"
          />
          <MetricCard
            title="Current Streak"
            value={`${Math.abs(metrics.currentStreak)} ${metrics.currentStreak >= 0 ? 'wins' : 'losses'}`}
            color={metrics.currentStreak >= 0 ? 'text-green-400' : 'text-red-400'}
          />
          <MetricCard
            title="Avg Trades/Day"
            value={metrics.avgTradesPerDay.toFixed(1)}
            subtitle="Weekdays only"
            color="text-slate-300"
          />
        </div>
      </div>

      {/* Cumulative P&L Chart */}
      <div className="bg-quant-card border border-quant-border p-4">
        <h2 className="text-sm font-semibold text-white tracking-tight mb-4 pb-2 border-b border-quant-border">CUMULATIVE P&L</h2>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={cumulativePLData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3348" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(value: number) => [formatCurrency(value), 'P&L']}
            />
            <Area
              type="monotone"
              dataKey="pl"
              stroke="#3b82f6"
              fill="url(#plGradient)"
              strokeWidth={1.5}
            />
            <defs>
              <linearGradient id="plGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Daily P&L Chart */}
      <div className="bg-quant-card border border-quant-border p-4">
        <h2 className="text-sm font-semibold text-white tracking-tight mb-4 pb-2 border-b border-quant-border">DAILY P&L</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyPLData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3348" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(value: number) => [formatCurrency(value), 'P&L']}
            />
            <Bar dataKey="pl">
              {dailyPLData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.pl > 0 ? '#10b981' : entry.pl < 0 ? '#ef4444' : '#fbbf24'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* P&L by Ticker */}
      <div className="bg-quant-card rounded-xl shadow-quant-lg border border-quant-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-6 bg-quant-accent rounded-full"></div>
          <h2 className="text-xl font-bold text-white tracking-tight">Top 10 Tickers by P&L</h2>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={plByTicker} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3348" />
            <XAxis
              type="number"
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <YAxis
              type="category"
              dataKey="ticker"
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(value: number) => [formatCurrency(value), 'P&L']}
            />
            <Bar dataKey="pl">
              {plByTicker.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.pl > 0 ? '#10b981' : '#ef4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* P&L by Day of Week */}
      <div className="bg-quant-card rounded-xl shadow-quant-lg border border-quant-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-6 bg-quant-accent rounded-full"></div>
          <h2 className="text-xl font-bold text-white tracking-tight">P&L by Day of Week</h2>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={plByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3348" />
            <XAxis
              dataKey="day"
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(value: number) => [formatCurrency(value), 'P&L']}
            />
            <Bar dataKey="pl">
              {plByDay.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.pl > 0 ? '#10b981' : entry.pl < 0 ? '#ef4444' : '#fbbf24'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* P&L by Tag/Strategy */}
      {plByTag.length > 0 && (
        <div className="bg-quant-card rounded-xl shadow-xl border border-quant-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-quant-accent rounded-full"></div>
            <h2 className="text-xl font-bold text-white tracking-tight">P&L by Strategy/Tag</h2>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(300, plByTag.length * 50)}>
            <BarChart data={plByTag} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3348" />
              <XAxis
                type="number"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <YAxis
                type="category"
                dataKey="tag"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
                width={150}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value: number, _name: string, props: any) => [
                  `${formatCurrency(value)} (${props.payload.count} trades)`,
                  'P&L'
                ]}
              />
              <Bar dataKey="pl">
                {plByTag.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.pl > 0 ? '#10b981' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Return Distribution */}
      <div className="bg-quant-card rounded-xl shadow-quant-lg border border-quant-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-6 bg-quant-accent rounded-full"></div>
          <h2 className="text-xl font-bold text-white tracking-tight">Trade Return Distribution</h2>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={returnDistribution}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3348" />
            <XAxis
              dataKey="range"
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
              label={{ value: 'Number of Trades', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
            />
            <Bar dataKey="count" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Rolling Win Rate (20-day) */}
      {rollingMetrics.length > 0 && (
        <div className="bg-quant-card border border-quant-border p-4">
          <h2 className="text-sm font-semibold text-white tracking-tight mb-4 pb-2 border-b border-quant-border">ROLLING WIN RATE (20-DAY)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={rollingMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3348" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis
                yAxisId="left"
                stroke="#10b981"
                tick={{ fill: '#10b981' }}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#3b82f6"
                tick={{ fill: '#3b82f6' }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value: number, name: string) => {
                  if (name === 'Win Rate') return [`${value.toFixed(1)}%`, name];
                  if (name === 'Avg P&L') return [formatCurrency(value), name];
                  return [formatCurrency(value), name];
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="winRate"
                stroke="#10b981"
                name="Win Rate"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgPL"
                stroke="#3b82f6"
                name="Avg P&L"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}



      {/* Monthly Returns */}
      {monthlyReturns.length > 0 && (
        <div className="bg-quant-card border border-quant-border p-4">
          <h2 className="text-sm font-semibold text-white tracking-tight mb-4 pb-2 border-quant-border">MONTHLY PERFORMANCE</h2>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={monthlyReturns}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3348" />
              <XAxis
                dataKey="month"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis
                yAxisId="left"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#10b981"
                tick={{ fill: '#10b981' }}
                tickFormatter={(value) => `${value.toFixed(0)}%`}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value: number, name: string) => {
                  if (name === 'Win Rate') return [`${value.toFixed(1)}%`, name];
                  if (name === 'P&L') return [formatCurrency(value), name];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="pl"
                name="P&L"
              >
                {monthlyReturns.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.pl > 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="winRate"
                stroke="#10b981"
                name="Win Rate"
                strokeWidth={2}
                dot={{ fill: '#10b981', r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Volatility Chart */}
      {volatilitySeries.length > 0 && (
        <div className="bg-quant-card border border-quant-border p-4">
          <h2 className="text-sm font-semibold text-white tracking-tight mb-4 pb-2 border-b border-quant-border">ROLLING VOLATILITY (20-DAY, ANNUALIZED)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={volatilitySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3348" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value: number) => [formatCurrency(value), 'Volatility']}
              />
              <Line
                type="monotone"
                dataKey="volatility"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* TAIL RISK PROFILE */}
      <div className="bg-quant-card border border-quant-border p-4">
        <h2 className="text-sm font-semibold text-white tracking-tight mb-4 pb-2 border-b border-quant-border">TAIL RISK PROFILE (NON-GAUSSIAN)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard
            title="Skewness"
            value={tailRisk.skewness.toFixed(3)}
            subtitle={tailRisk.skewness > 0 ? 'Right-skewed (positive)' : tailRisk.skewness < 0 ? 'Left-skewed (negative)' : 'Symmetric'}
            color={tailRisk.skewness > 0 ? 'text-green-400' : tailRisk.skewness < 0 ? 'text-red-400' : 'text-white'}
          />
          <MetricCard
            title="Excess Kurtosis"
            value={tailRisk.excessKurtosis.toFixed(3)}
            subtitle={tailRisk.excessKurtosis > 0 ? 'Fat tails (leptokurtic)' : tailRisk.excessKurtosis < 0 ? 'Thin tails (platykurtic)' : 'Normal'}
            color={tailRisk.excessKurtosis > 1 ? 'text-orange-400' : 'text-white'}
          />
          <MetricCard
            title="Cornish-Fisher VaR"
            value={formatCurrency(tailRisk.cornishFisherVaR)}
            subtitle="95% adjusted for skew/kurt"
            color="text-orange-400"
          />
          <MetricCard
            title="CVaR (97.5%)"
            value={formatCurrency(metrics.conditionalVaR975)}
            subtitle="Expected shortfall 97.5%"
            color="text-red-400"
          />
          <MetricCard
            title="Worst Realized Loss"
            value={formatCurrency(metrics.worstRealizedLoss)}
            subtitle="Actual worst day (not modeled)"
            color="text-red-400"
          />
        </div>
      </div>

      {/* ALPHA DECOMPOSITION */}
      <div className="bg-quant-card border border-quant-border p-4">
        <h2 className="text-sm font-semibold text-white tracking-tight mb-4 pb-2 border-b border-quant-border">ALPHA DECOMPOSITION (vs SPY)</h2>
        {benchmarkLoading ? (
          <div className="text-slate-500 text-sm py-4 text-center">Loading benchmark data...</div>
        ) : benchmarkError || !alphaMetrics ? (
          <div className="text-slate-500 text-sm py-4 text-center">{benchmarkError || 'Insufficient data for alpha decomposition'}</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <MetricCard
              title="Jensen's Alpha"
              value={formatCurrency(alphaMetrics.annualizedAlpha)}
              subtitle={`Daily: ${formatCurrency(alphaMetrics.jensensAlpha)}`}
              color={alphaMetrics.annualizedAlpha > 0 ? 'text-green-400' : 'text-red-400'}
            />
            <MetricCard
              title="Beta to SPY"
              value={alphaMetrics.beta.toFixed(4)}
              subtitle={Math.abs(alphaMetrics.beta) < 0.1 ? 'Market-neutral' : alphaMetrics.beta > 0 ? 'Positive exposure' : 'Negative exposure'}
              color={Math.abs(alphaMetrics.beta) < 0.1 ? 'text-green-400' : 'text-yellow-400'}
            />
            <MetricCard
              title="Alpha t-stat"
              value={alphaMetrics.alphaTStat.toFixed(2)}
              subtitle={Math.abs(alphaMetrics.alphaTStat) > 2 ? 'Statistically significant' : 'Not significant'}
              color={Math.abs(alphaMetrics.alphaTStat) > 2 ? 'text-green-400' : 'text-slate-400'}
            />
            <MetricCard
              title="R²"
              value={(alphaMetrics.r2 * 100).toFixed(2) + '%'}
              subtitle="Variance explained by market"
              color="text-blue-400"
            />
            <MetricCard
              title="Residual Alpha"
              value={formatCurrency(alphaMetrics.residualAlpha)}
              subtitle="Pure alpha (regression residual)"
              color={alphaMetrics.residualAlpha > 0 ? 'text-green-400' : 'text-red-400'}
            />
          </div>
        )}
      </div>

      {/* Rolling Alpha Chart */}
      {rollingAlpha.length > 0 && (
        <div className="bg-quant-card border border-quant-border p-4">
          <h2 className="text-sm font-semibold text-white tracking-tight mb-4 pb-2 border-b border-quant-border">ROLLING ALPHA (ANNUALIZED, vs SPY)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={rollingAlpha}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3348" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a' }}
                labelStyle={{ color: '#e2e8f0' }}
                formatter={(value: number, name: string) => [formatCurrency(value), name]}
              />
              <Legend />
              <Line type="monotone" dataKey="alpha30d" stroke="#10b981" strokeWidth={2} dot={false} name="30-Day Alpha" />
              <Line type="monotone" dataKey="alpha60d" stroke="#3b82f6" strokeWidth={2} dot={false} name="60-Day Alpha" />
              <Line type="monotone" dataKey="alpha90d" stroke="#8b5cf6" strokeWidth={2} dot={false} name="90-Day Alpha" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

    </div>
  );
};
