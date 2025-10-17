import React, { useState } from 'react';
import { Lock } from 'lucide-react';

interface PasswordProtectionProps {
  correctPassword: string;
  onAuthenticated: () => void;
  onSetPassword: (password: string) => void;
}

export const PasswordProtection: React.FC<PasswordProtectionProps> = ({
  correctPassword,
  onAuthenticated,
  onSetPassword
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(!correctPassword);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSettingPassword) {
      if (password.length < 4) {
        setError('Password must be at least 4 characters');
        return;
      }
      onSetPassword(password);
      onAuthenticated();
    } else {
      if (password === correctPassword) {
        onAuthenticated();
      } else {
        setError('Incorrect password');
        setPassword('');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-slate-700">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-500/10 p-4 rounded-full mb-4">
            <Lock className="w-12 h-12 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">P&L Calendar</h1>
          <p className="text-slate-400 text-center">
            {isSettingPassword ? 'Set your password to get started' : 'Enter password to access'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={isSettingPassword ? "Create a password" : "Enter password"}
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors duration-200"
          >
            {isSettingPassword ? 'Set Password' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

