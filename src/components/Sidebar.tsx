import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Settings, BarChart3 } from 'lucide-react';
import { DayEntry, UserSettings } from '../types';
import { calculateCumulativePL, formatCurrency } from '../utils/calculations';

interface SidebarProps {
  entries: DayEntry[];
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
  onNavigateToAnalytics: () => void;
  currentView: 'calendar' | 'analytics';
}

export const Sidebar: React.FC<SidebarProps> = ({
  entries,
  settings,
  onUpdateSettings,
  onNavigateToAnalytics,
  currentView
}) => {
  const [isEditingNetWorth, setIsEditingNetWorth] = useState(false);
  const [netWorthInput, setNetWorthInput] = useState(settings.netWorth.toString());

  const cumulativePL = calculateCumulativePL(entries);
  const currentNetWorth = settings.netWorth;

  const handleSaveNetWorth = () => {
    const newNetWorth = parseFloat(netWorthInput);
    if (!isNaN(newNetWorth)) {
      onUpdateSettings({ ...settings, netWorth: newNetWorth });
    }
    setIsEditingNetWorth(false);
  };

  const plPercentage = settings.startingBalance > 0 
    ? (cumulativePL / settings.startingBalance) * 100 
    : 0;

  return (
    <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-6 space-y-6">
      {/* Navigation */}
      <div className="flex gap-2">
        <button
          onClick={() => currentView === 'analytics' && onNavigateToAnalytics()}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            currentView === 'calendar'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Calendar
        </button>
        <button
          onClick={onNavigateToAnalytics}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            currentView === 'analytics'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Account Net Worth */}
      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-5 border border-blue-500/20">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-slate-400">Account Net Worth</h3>
          <button
            onClick={() => setIsEditingNetWorth(!isEditingNetWorth)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        
        {isEditingNetWorth ? (
          <div className="flex gap-2">
            <input
              type="number"
              value={netWorthInput}
              onChange={(e) => setNetWorthInput(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleSaveNetWorth}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Save
            </button>
          </div>
        ) : (
          <div className="text-3xl font-bold text-white">
            {formatCurrency(currentNetWorth)}
          </div>
        )}
      </div>

      {/* Cumulative P&L */}
      <div className={`rounded-xl p-5 border ${
        cumulativePL > 0
          ? 'bg-green-500/10 border-green-500/30'
          : cumulativePL < 0
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-slate-700 border-slate-600'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {cumulativePL > 0 ? (
            <TrendingUp className="w-5 h-5 text-green-400" />
          ) : cumulativePL < 0 ? (
            <TrendingDown className="w-5 h-5 text-red-400" />
          ) : (
            <DollarSign className="w-5 h-5 text-slate-400" />
          )}
          <h3 className="text-sm font-medium text-slate-400">Cumulative P&L</h3>
        </div>
        
        <div className={`text-3xl font-bold ${
          cumulativePL > 0
            ? 'text-green-400'
            : cumulativePL < 0
            ? 'text-red-400'
            : 'text-slate-300'
        }`}>
          {formatCurrency(cumulativePL)}
        </div>
        
        <div className={`text-sm font-medium mt-1 ${
          plPercentage > 0
            ? 'text-green-400'
            : plPercentage < 0
            ? 'text-red-400'
            : 'text-slate-400'
        }`}>
          {plPercentage > 0 ? '+' : ''}{plPercentage.toFixed(2)}% from start
        </div>
      </div>

      {/* Quick Stats */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
          Quick Stats
        </h3>
        
        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="text-sm text-slate-400 mb-1">Total Trading Days</div>
          <div className="text-2xl font-bold text-white">
            {entries.length}
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="text-sm text-slate-400 mb-1">Total Trades</div>
          <div className="text-2xl font-bold text-white">
            {entries.reduce((sum, e) => sum + e.numberOfTrades, 0)}
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="text-sm text-slate-400 mb-1">Profitable Days</div>
          <div className="text-2xl font-bold text-green-400">
            {entries.filter(e => e.totalPL > 0).length}
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="text-sm text-slate-400 mb-1">Loss Days</div>
          <div className="text-2xl font-bold text-red-400">
            {entries.filter(e => e.totalPL < 0).length}
          </div>
        </div>
      </div>
    </div>
  );
};

