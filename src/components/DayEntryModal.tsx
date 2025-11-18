import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { DayEntry, Trade } from '../types';
import { format } from 'date-fns';

interface DayEntryModalProps {
  date: Date;
  existingEntry?: DayEntry;
  onSave: (entry: DayEntry) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const COMMON_TAGS = [
  'Blue Chip Scalp',
  'Momentum',
  'Dip Buy',
  'Explosion',
  'Swing Trade',
  'Day Trade',
  'Options',
  'Breakout',
  'Reversal',
  'Gap Play'
];

export const DayEntryModal: React.FC<DayEntryModalProps> = ({
  date,
  existingEntry,
  onSave,
  onDelete,
  onClose
}) => {
  const [totalPL, setTotalPL] = useState(existingEntry?.totalPL.toString() || '');
  const [trades, setTrades] = useState<Trade[]>(existingEntry?.trades || [{ symbol: '', percentReturn: 0 }]);
  const [notes, setNotes] = useState(existingEntry?.notes || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(existingEntry?.tags || []);
  const [customTag, setCustomTag] = useState('');
  const [fallingKnives, setFallingKnives] = useState(existingEntry?.fallingKnives || 0);
  // Track raw input strings for percentages to allow typing "0.05"
  const [percentInputs, setPercentInputs] = useState<{[key: number]: string}>({});

  const dateStr = format(date, 'yyyy-MM-dd');

  const addTrade = () => {
    setTrades([...trades, { symbol: '', percentReturn: 0 }]);
  };

  const removeTrade = (index: number) => {
    setTrades(trades.filter((_, i) => i !== index));
  };

  const updateTrade = (index: number, field: keyof Trade, value: string | number) => {
    const newTrades = [...trades];
    if (field === 'symbol') {
      newTrades[index] = { ...newTrades[index], symbol: value as string };
    } else if (field === 'percentReturn') {
      // Store raw string value for display
      setPercentInputs(prev => ({ ...prev, [index]: value as string }));
      // Parse to number for the trade object
      const numValue = typeof value === 'string' ? (value === '' ? 0 : parseFloat(value) || 0) : value;
      newTrades[index] = { ...newTrades[index], percentReturn: numValue };
    }
    setTrades(newTrades);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags([...selectedTags, customTag.trim()]);
      setCustomTag('');
    }
  };

  const handleSave = () => {
    const validTrades = trades.filter(t => t.symbol.trim() !== '');
    const entry: DayEntry = {
      id: dateStr,
      totalPL: parseFloat(totalPL) || 0,
      trades: validTrades,
      numberOfTrades: validTrades.length,
      notes,
      tags: selectedTags,
      fallingKnives: fallingKnives
    };
    onSave(entry);
    onClose();
  };

  const handleDelete = () => {
    if (existingEntry && onDelete && confirm('Are you sure you want to delete this entry?')) {
      onDelete(existingEntry.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-slate-700">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {format(date, 'MMMM d, yyyy')}
            </h2>
            <p className="text-slate-400 text-sm">{format(date, 'EEEE')}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Total P&L */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Total P&L ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={totalPL}
              onChange={(e) => setTotalPL(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          {/* Trades */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-slate-300">
                Trades ({trades.filter(t => t.symbol).length})
              </label>
              <button
                onClick={addTrade}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Trade
              </button>
            </div>

            <div className="space-y-3">
              {trades.map((trade, index) => (
                <div key={index} className="flex gap-3">
                  <input
                    type="text"
                    value={trade.symbol}
                    onChange={(e) => updateTrade(index, 'symbol', e.target.value.toUpperCase())}
                    className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Symbol (e.g., AAPL)"
                  />
                  <input
                    type="number"
                    step="any"
                    value={percentInputs[index] !== undefined ? percentInputs[index] : (trade.percentReturn || '')}
                    onChange={(e) => updateTrade(index, 'percentReturn', e.target.value)}
                    className="w-32 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="% Return"
                  />
                  {trades.length > 1 && (
                    <button
                      onClick={() => removeTrade(index)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {COMMON_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {selectedTags.filter(t => !COMMON_TAGS.includes(t)).map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500 text-white rounded-lg text-sm font-medium mr-2 mb-2"
              >
                {tag}
                <button onClick={() => toggleTag(tag)}>
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add custom tag..."
              />
              <button
                onClick={addCustomTag}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Falling Knife Counter */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Falling Knives 🔪
            </label>
            <div className="flex items-center gap-4 bg-slate-700/50 rounded-lg p-4">
              <button
                onClick={() => setFallingKnives(Math.max(0, fallingKnives - 1))}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-xl transition-colors"
              >
                −
              </button>
              <div className="flex-1 text-center">
                <div className="text-3xl font-bold text-red-400">{fallingKnives}</div>
                <div className="text-xs text-slate-500 mt-1">Caught today</div>
              </div>
              <button
                onClick={() => setFallingKnives(fallingKnives + 1)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-xl transition-colors"
              >
                +
              </button>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              Track when you caught a falling knife (bought too early on a dip)
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
              placeholder="What happened today? Strategy notes, market conditions, lessons learned..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-t border-slate-700">
          <div>
            {existingEntry && onDelete && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-medium"
              >
                Delete Entry
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
            >
              Save Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

