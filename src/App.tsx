import { useState } from 'react';
import { Calendar } from './components/Calendar';
import { DayEntryModal } from './components/DayEntryModal';
import { Sidebar } from './components/Sidebar';
import { Analytics } from './components/Analytics';
import { PasswordProtection } from './components/PasswordProtection';
import { useFirebaseData } from './hooks/useFirebaseData';

type View = 'calendar' | 'analytics';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentView, setCurrentView] = useState<View>('calendar');

  const {
    entries,
    settings,
    loading,
    saveEntry,
    deleteEntry,
    saveSettings
  } = useFirebaseData();

  // Keep the current month as-is (defaults to today's month)
  // No need to auto-navigate to most recent month with data

  const handleSetPassword = (password: string) => {
    saveSettings({ ...settings, password });
  };

  const handleUpdateSettings = (newSettings: typeof settings) => {
    saveSettings(newSettings);
  };

  const selectedEntry = selectedDate
    ? entries.find(e => e.id === selectedDate.toISOString().split('T')[0])
    : undefined;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <PasswordProtection
        correctPassword={settings.password}
        onAuthenticated={() => setIsAuthenticated(true)}
        onSetPassword={handleSetPassword}
      />
    );
  }

  return (
    <div className="min-h-screen bg-quant-bg p-4 md:p-6">
      <div className="max-w-[1900px] mx-auto">
        {/* Header */}
        <div className="mb-4 pb-4 border-b border-quant-border">
          <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">
            EGAlpha Returns
          </h1>
          <p className="text-slate-500 text-xs">P&L tracking and analytics</p>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Sidebar
              entries={entries}
              settings={settings}
              currentMonth={currentMonth}
              onUpdateSettings={handleUpdateSettings}
              onNavigateToAnalytics={() => setCurrentView(currentView === 'calendar' ? 'analytics' : 'calendar')}
              currentView={currentView}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {currentView === 'calendar' ? (
              <Calendar
                entries={entries}
                onDayClick={setSelectedDate}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
              />
            ) : (
              <Analytics entries={entries} />
            )}
          </div>
        </div>
      </div>

      {/* Day Entry Modal */}
      {selectedDate && (
        <DayEntryModal
          date={selectedDate}
          existingEntry={selectedEntry}
          onSave={saveEntry}
          onDelete={deleteEntry}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}

export default App;

