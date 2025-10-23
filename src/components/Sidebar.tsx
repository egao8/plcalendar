import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Settings } from 'lucide-react';
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
  const [isEditingPL, setIsEditingPL] = useState(false);
  const [plAdjustment, setPlAdjustment] = useState('0');

  const calculatedPL = calculateCumulativePL(entries);
  const manualAdjustment = settings.startingBalance || 0;
  const cumulativePL = calculatedPL + manualAdjustment;

  const handleSavePLAdjustment = () => {
    const adjustment = parseFloat(plAdjustment);
    if (!isNaN(adjustment)) {
      onUpdateSettings({ ...settings, startingBalance: adjustment });
    }
    setIsEditingPL(false);
  };

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

      {/* Cumulative P&L */}
      <div className={`rounded-xl p-5 border ${
        cumulativePL > 0
          ? 'bg-green-500/10 border-green-500/30'
          : cumulativePL < 0
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-slate-700 border-slate-600'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {cumulativePL > 0 ? (
              <TrendingUp className="w-5 h-5 text-green-400" />
            ) : cumulativePL < 0 ? (
              <TrendingDown className="w-5 h-5 text-red-400" />
            ) : (
              <DollarSign className="w-5 h-5 text-slate-400" />
            )}
            <h3 className="text-sm font-medium text-slate-400">Cumulative P&L</h3>
          </div>
          <button
            onClick={() => {
              setIsEditingPL(!isEditingPL);
              if (!isEditingPL) setPlAdjustment(manualAdjustment.toString());
            }}
            className="text-slate-400 hover:text-white transition-colors"
            title="Adjust cumulative P&L"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
        
        {isEditingPL ? (
          <div className="space-y-2">
            <div className="text-sm text-slate-400">
              Calculated: {formatCurrency(calculatedPL)}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={plAdjustment}
                onChange={(e) => setPlAdjustment(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Manual adjustment"
                autoFocus
              />
              <button
                onClick={handleSavePLAdjustment}
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
            cumulativePL > 0
              ? 'text-green-400'
              : cumulativePL < 0
              ? 'text-red-400'
              : 'text-slate-300'
          }`}>
            {formatCurrency(cumulativePL)}
          </div>
        )}
        
        {manualAdjustment !== 0 && !isEditingPL && (
          <div className="text-xs text-slate-500 mt-1">
            (incl. {formatCurrency(manualAdjustment)} adjustment)
          </div>
        )}
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

