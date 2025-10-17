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
  const [currentMonth, setCurrentMonth] = useState(new Date(2025, 8, 1)); // September 2025
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-white mb-2">Trading P&L Calendar</h1>
          <p className="text-slate-400">Track your performance and analyze your trading patterns</p>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Sidebar
              entries={entries}
              settings={settings}
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

