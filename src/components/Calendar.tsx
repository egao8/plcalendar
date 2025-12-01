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
    // Use local date components to avoid timezone shifting
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return entries.find(e => e.id === dateStr);
  };

  const getDayColor = (entry?: DayEntry): string => {
    if (!entry) return 'bg-quant-surface hover:bg-quant-card border-quant-border';
    if (entry.totalPL > 0) return 'bg-quant-surface hover:bg-quant-card border-l-4 border-l-emerald-500 border-t border-r border-b border-quant-border';
    if (entry.totalPL < 0) return 'bg-quant-surface hover:bg-quant-card border-l-4 border-l-red-500 border-t border-r border-b border-quant-border';
    return 'bg-quant-surface hover:bg-quant-card border-l-4 border-l-amber-500 border-t border-r border-b border-quant-border';
  };

  return (
    <div className="bg-quant-card border border-quant-border">
      {/* Header */}
      <div className="bg-quant-surface px-4 py-3 flex justify-between items-center border-b border-quant-border">
        <button
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="p-1 hover:bg-quant-surface transition-colors text-slate-400 hover:text-white"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <h2 className="text-base font-semibold text-white tracking-tight uppercase">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        
        <button
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="p-1 hover:bg-quant-surface transition-colors text-slate-400 hover:text-white"
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
              className="text-center text-xs font-medium text-slate-500 uppercase tracking-wide py-2 border-b border-quant-border"
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
                  min-h-[100px] p-2 transition-colors
                  ${isCurrentMonth ? getDayColor(entry) : 'bg-quant-bg opacity-20 border border-quant-border'}
                  ${isToday ? 'ring-1 ring-inset ring-quant-accent' : ''}
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
                      <div className={`text-lg font-mono font-bold ${
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

