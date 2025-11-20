import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isSameDay
} from 'date-fns';
import { DayEntry } from '../types';
import { formatCurrency } from '../utils/calculations';

interface CalendarProps {
  entries: DayEntry[];
  onDayClick: (date: Date) => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
}

export const Calendar: React.FC<CalendarProps> = ({
  entries,
  onDayClick,
  currentMonth,
  onMonthChange
}) => {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getEntryForDate = (date: Date): DayEntry | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return entries.find(e => e.id === dateStr);
  };

  const getDayColor = (entry?: DayEntry): string => {
    if (!entry) return 'bg-quant-surface hover:bg-quant-card';
    if (entry.totalPL > 0) return 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30';
    if (entry.totalPL < 0) return 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30';
    return 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30';
  };

  return (
    <div className="bg-quant-card rounded-xl shadow-xl border border-quant-border overflow-hidden">
      {/* Header */}
      <div className="bg-quant-surface px-6 py-4 flex justify-between items-center border-b border-quant-border">
        <button
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-quant-accent/10 rounded-lg transition-all text-slate-400 hover:text-quant-accent"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-bold text-white tracking-tight">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        
        <button
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-quant-accent/10 rounded-lg transition-all text-slate-400 hover:text-quant-accent"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map(day => (
            <div
              key={day}
              className="text-center text-xs font-bold text-quant-accent/70 uppercase tracking-wider py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const entry = getEntryForDate(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={day.toString()}
                onClick={() => onDayClick(day)}
                className={`
                  min-h-[120px] p-3 rounded-lg border transition-colors duration-200
                  ${isCurrentMonth ? getDayColor(entry) : 'bg-quant-bg/50 opacity-30'}
                  ${isToday ? 'ring-2 ring-quant-accent' : 'border-transparent'}
                  ${isCurrentMonth ? 'cursor-pointer' : ''}
                `}
              >
                <div className="flex flex-col h-full">
                  <div className={`text-sm font-semibold mb-2 ${
                    isCurrentMonth ? 'text-white' : 'text-slate-500'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  
                  {entry && isCurrentMonth && (
                    <div className="flex-1 flex flex-col justify-between">
                      <div className={`text-lg font-bold ${
                        entry.totalPL > 0 ? 'text-green-400' :
                        entry.totalPL < 0 ? 'text-red-400' :
                        'text-yellow-400'
                      }`}>
                        {formatCurrency(entry.totalPL)}
                      </div>
                      
                      {entry.numberOfTrades > 0 && (
                        <div className="text-xs text-slate-400 mt-1">
                          {entry.numberOfTrades} trade{entry.numberOfTrades !== 1 ? 's' : ''}
                        </div>
                      )}
                      
                      {entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {entry.tags.slice(0, 2).map(tag => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 bg-slate-900/50 text-slate-300 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {entry.tags.length > 2 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-900/50 text-slate-300 rounded">
                              +{entry.tags.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

