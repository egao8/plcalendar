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
  const [isSettingPassword] = useState(!correctPassword);

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
    <div className="min-h-screen bg-quant-bg flex items-center justify-center p-4">
      <div className="bg-quant-card p-8 w-full max-w-md border border-quant-border">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-quant-surface p-4 mb-4 border border-quant-border">
            <Lock className="w-12 h-12 text-slate-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">EGAlpha Returns</h1>
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
              className="w-full px-3 py-2 bg-quant-surface border border-quant-border text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-quant-accent"
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
            className="w-full bg-quant-accent hover:bg-quant-accentDark text-white font-medium py-2 transition-colors duration-200"
          >
            {isSettingPassword ? 'Set Password' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </div>
  );
};

