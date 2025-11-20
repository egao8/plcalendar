import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { DayEntry } from '../types';
import {
  calculateWinRate,
  calculateAverageReturn,
  calculateMaxDrawdown,
  calculateProfitFactor,
  calculateSharpeRatio,
  calculateExpectancy,
  calculateAvgWinLossRatio,
  getLargestWinLoss,
  getWinLossStreaks,
  getPLByTicker,
  getPLByDayOfWeek,
  getPLByTag,
  getReturnDistribution,
  calculateRecoveryFactor,
  calculateAverageTradesPerDay,
  calculateFKWinRate,
  getTotalFallingKnives,
  formatCurrency,
  formatPercent
} from '../utils/calculations';

interface AnalyticsProps {
  entries: DayEntry[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ entries }) => {
  const sortedEntries = useMemo(() => 
    [...entries].sort((a, b) => a.id.localeCompare(b.id)),
    [entries]
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

  // Core metrics
  const metrics = useMemo(() => {
    const winLoss = getLargestWinLoss(entries);
    const streaks = getWinLossStreaks(entries);
    return {
      winRate: calculateWinRate(entries),
      fkWinRate: calculateFKWinRate(entries),
      avgReturn: calculateAverageReturn(entries),
      maxDrawdown: calculateMaxDrawdown(entries),
      profitFactor: calculateProfitFactor(entries),
      sharpeRatio: calculateSharpeRatio(entries),
      expectancy: calculateExpectancy(entries),
      avgWinLossRatio: calculateAvgWinLossRatio(entries),
      largestWin: winLoss.largestWin,
      largestLoss: winLoss.largestLoss,
      currentStreak: streaks.currentStreak,
      longestWinStreak: streaks.longestWinStreak,
      longestLossStreak: streaks.longestLossStreak,
      recoveryFactor: calculateRecoveryFactor(entries),
      avgTradesPerDay: calculateAverageTradesPerDay(entries),
      totalFK: getTotalFallingKnives(entries)
    };
  }, [entries]);

  // P&L by ticker
  const plByTicker = useMemo(() => 
    getPLByTicker(entries).slice(0, 10),
    [entries]
  );

  // P&L by day of week
  const plByDay = useMemo(() => getPLByDayOfWeek(entries), [entries]);

  // P&L by tag/strategy
  const plByTag = useMemo(() => getPLByTag(entries), [entries]);

  // Return distribution (histogram)
  const returnDistribution = useMemo(() => {
    const returns = getReturnDistribution(entries);
    const bins: { range: string; count: number }[] = [];
    const binSize = 5;
    const minReturn = Math.floor(Math.min(...returns, 0) / binSize) * binSize;
    const maxReturn = Math.ceil(Math.max(...returns, 0) / binSize) * binSize;

    for (let i = minReturn; i < maxReturn; i += binSize) {
      const count = returns.filter(r => r >= i && r < i + binSize).length;
      bins.push({
        range: `${i}% to ${i + binSize}%`,
        count
      });
    }

    return bins;
  }, [entries]);

  const MetricCard: React.FC<{ title: string; value: string | number; subtitle?: string; color?: string }> = 
    ({ title, value, subtitle, color = 'text-quant-accent' }) => (
      <div className="bg-quant-surface rounded-lg p-5 border border-quant-border hover:border-quant-accent/50 transition-colors">
        <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider font-semibold">{title}</div>
        <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
        {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
      </div>
    );

  if (entries.length === 0) {
    return (
      <div className="bg-quant-card rounded-xl shadow-quant border border-quant-border p-12 text-center">
        <div className="text-slate-400 text-lg">
          No trading data yet. Start by adding entries to the calendar!
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Core Performance Metrics */}
      <div className="bg-quant-card rounded-xl shadow-xl border border-quant-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-6 bg-quant-accent rounded-full"></div>
          <h2 className="text-xl font-bold text-white tracking-tight">Core Performance Metrics</h2>
        </div>
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
            title="Max Drawdown"
            value={formatPercent(metrics.maxDrawdown)}
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
      <div className="bg-quant-card rounded-xl shadow-xl border border-quant-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-6 bg-quant-accent rounded-full"></div>
          <h2 className="text-xl font-bold text-white tracking-tight">Cumulative P&L Over Time</h2>
        </div>
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
              contentStyle={{ backgroundColor: '#1a1f3a', border: '1px solid #6366f1', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(value: number) => [formatCurrency(value), 'P&L']}
            />
            <Area 
              type="monotone" 
              dataKey="pl" 
              stroke="#6366f1" 
              fill="url(#plGradient)"
              strokeWidth={2}
            />
            <defs>
              <linearGradient id="plGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Daily P&L Chart */}
      <div className="bg-quant-card rounded-xl shadow-quant-lg border border-quant-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1 h-6 bg-quant-accent rounded-full"></div>
          <h2 className="text-xl font-bold text-white tracking-tight">Daily P&L</h2>
        </div>
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
              contentStyle={{ backgroundColor: '#1a1f3a', border: '1px solid #6366f1', borderRadius: '8px' }}
              labelStyle={{ color: '#e2e8f0' }}
              formatter={(value: number) => [formatCurrency(value), 'P&L']}
            />
            <Bar dataKey="pl" radius={[4, 4, 0, 0]}>
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
    </div>
  );
};

