import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Settings, Calendar as CalendarIcon } from 'lucide-react';
import { DayEntry, UserSettings } from '../types';
import { 
  calculateMonthlyPL, 
  calculateWeeklyPL, 
  getTotalFallingKnives,
  getMonthlyFallingKnives,
  formatCurrency 
} from '../utils/calculations';
import { format } from 'date-fns';

interface SidebarProps {
  entries: DayEntry[];
  settings: UserSettings;
  currentMonth: Date;
  onUpdateSettings: (settings: UserSettings) => void;
  onNavigateToAnalytics: () => void;
  currentView: 'calendar' | 'analytics';
}

export const Sidebar: React.FC<SidebarProps> = ({
  entries,
  settings,
  currentMonth,
  onUpdateSettings,
  onNavigateToAnalytics,
  currentView
}) => {
  const [isEditingMonthlyPL, setIsEditingMonthlyPL] = useState(false);
  const [monthlyAdjustment, setMonthlyAdjustment] = useState('0');

  const calculatedMonthlyPL = calculateMonthlyPL(entries, currentMonth);
  const monthlyManualAdjustment = settings.startingBalance || 0;
  const monthlyPL = calculatedMonthlyPL + monthlyManualAdjustment;
  
  const weeklyPL = calculateWeeklyPL(entries);
  
  const totalFK = getTotalFallingKnives(entries);
  const monthlyFK = getMonthlyFallingKnives(entries, currentMonth);

  const handleSaveMonthlyAdjustment = () => {
    const adjustment = parseFloat(monthlyAdjustment);
    if (!isNaN(adjustment)) {
      onUpdateSettings({ ...settings, startingBalance: adjustment });
    }
    setIsEditingMonthlyPL(false);
  };

  return (
    <div className="bg-quant-card rounded-xl shadow-quant border border-quant-border p-6 space-y-5">
      {/* Navigation */}
      <div className="flex gap-2 p-1 bg-quant-surface rounded-lg">
        <button
          onClick={() => currentView === 'analytics' && onNavigateToAnalytics()}
          className={`flex-1 py-2.5 px-4 rounded-md font-semibold text-sm transition-all ${
            currentView === 'calendar'
              ? 'bg-gradient-to-r from-quant-accent to-quant-accentDark text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-quant-card'
          }`}
        >
          Calendar
        </button>
        <button
          onClick={onNavigateToAnalytics}
          className={`flex-1 py-2.5 px-4 rounded-md font-semibold text-sm transition-all ${
            currentView === 'analytics'
              ? 'bg-gradient-to-r from-quant-accent to-quant-accentDark text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-quant-card'
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Monthly P&L */}
      <div className={`rounded-xl p-5 border backdrop-blur-sm ${
        monthlyPL > 0
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : monthlyPL < 0
          ? 'bg-red-500/5 border-red-500/20'
          : 'bg-quant-surface border-quant-border'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {monthlyPL > 0 ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : monthlyPL < 0 ? (
              <TrendingDown className="w-5 h-5 text-red-400" />
            ) : (
              <CalendarIcon className="w-5 h-5 text-slate-400" />
            )}
            <h3 className="text-sm font-medium text-slate-400">
              {format(currentMonth, 'MMMM yyyy')} P&L
            </h3>
          </div>
          <button
            onClick={() => {
              setIsEditingMonthlyPL(!isEditingMonthlyPL);
              if (!isEditingMonthlyPL) setMonthlyAdjustment(monthlyManualAdjustment.toString());
            }}
            className="text-slate-400 hover:text-white transition-colors"
            title="Adjust monthly P&L"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        
        {isEditingMonthlyPL ? (
          <div className="space-y-2">
            <div className="text-sm text-slate-400">
              Calculated: {formatCurrency(calculatedMonthlyPL)}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={monthlyAdjustment}
                onChange={(e) => setMonthlyAdjustment(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Manual adjustment"
                autoFocus
              />
              <button
                onClick={handleSaveMonthlyAdjustment}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
              >
                Save
              </button>
            </div>
            <div className="text-xs text-slate-500">
              Add/subtract from calculated P&L
            </div>
          </div>
        ) : (
          <div className={`text-3xl font-bold ${
            monthlyPL > 0
              ? 'text-green-400'
              : monthlyPL < 0
              ? 'text-red-400'
              : 'text-slate-300'
          }`}>
            {formatCurrency(monthlyPL)}
          </div>
        )}
        
        {monthlyManualAdjustment !== 0 && !isEditingMonthlyPL && (
          <div className="text-xs text-slate-500 mt-1">
            (incl. {formatCurrency(monthlyManualAdjustment)} adjustment)
          </div>
        )}
      </div>

      {/* Weekly P&L (Most Recent Week) */}
      <div className={`rounded-xl p-5 border backdrop-blur-sm ${
        weeklyPL > 0
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : weeklyPL < 0
          ? 'bg-red-500/5 border-red-500/20'
          : 'bg-quant-surface border-quant-border'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {weeklyPL > 0 ? (
            <TrendingUp className="w-5 h-5 text-green-400" />
          ) : weeklyPL < 0 ? (
            <TrendingDown className="w-5 h-5 text-red-400" />
          ) : (
            <DollarSign className="w-5 h-5 text-slate-400" />
          )}
          <h3 className="text-sm font-medium text-slate-400">This Week P&L</h3>
        </div>
        
        <div className={`text-3xl font-bold ${
          weeklyPL > 0
            ? 'text-green-400'
            : weeklyPL < 0
            ? 'text-red-400'
            : 'text-slate-300'
        }`}>
          {formatCurrency(weeklyPL)}
        </div>
        
        <div className="text-xs text-slate-500 mt-1">
          Most recent week (Sun-Sat)
        </div>
      </div>

      {/* Quick Stats */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-quant-accent uppercase tracking-widest border-b border-quant-border pb-2">
          Performance Metrics
        </h3>
        
        <div className="bg-quant-surface/50 rounded-lg p-4 border border-quant-border/50">
          <div className="text-sm text-slate-400 mb-1">Total Trading Days</div>
          <div className="text-2xl font-bold text-white">
            {entries.length}
          </div>
        </div>

        <div className="bg-quant-surface/50 rounded-lg p-4 border border-quant-border/50">
          <div className="text-sm text-slate-400 mb-1">Total Trades</div>
          <div className="text-2xl font-bold text-white font-mono">
            {entries.reduce((sum, e) => sum + e.numberOfTrades, 0)}
          </div>
        </div>

        <div className="bg-quant-surface/50 rounded-lg p-4 border border-emerald-500/20">
          <div className="text-sm text-slate-400 mb-1">Profitable Days</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {entries.filter(e => e.totalPL > 0).length}
          </div>
        </div>

        <div className="bg-quant-surface/50 rounded-lg p-4 border border-red-500/20">
          <div className="text-sm text-slate-400 mb-1">Loss Days</div>
          <div className="text-2xl font-bold text-red-400 font-mono">
            {entries.filter(e => e.totalPL < 0).length}
          </div>
        </div>

        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
          <div className="text-sm text-red-400 mb-1">🔪 Falling Knives</div>
          <div className="flex justify-between items-end">
            <div>
              <div className="text-2xl font-bold text-red-400">
                {totalFK}
              </div>
              <div className="text-xs text-slate-500 mt-1">All time</div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-red-300">
                {monthlyFK}
              </div>
              <div className="text-xs text-slate-500 mt-1">This month</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

