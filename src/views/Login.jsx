import React, { useState } from 'react';
import { Shield, LogIn } from 'lucide-react';
import { COLORS } from '../utils/theme';
import { R4_LEADER_KEY, ALLIANCE_MEMBER_KEY } from '../config';

const Login = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      if (password === R4_LEADER_KEY) {
        onLogin('R4');
      } else if (password === ALLIANCE_MEMBER_KEY) {
        onLogin('MEMBER');
      } else {
        setError('Invalid access key. Contact your R4 leadership.');
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: COLORS.bg_primary }}
    >
      <div
        className="w-full max-w-md rounded-xl p-8 shadow-2xl border"
        style={{
          backgroundColor: COLORS.bg_card,
          borderColor: COLORS.border,
        }}
      >
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4"
            style={{ backgroundColor: COLORS.bg_primary }}>
            <Shield size={40} style={{ color: COLORS.accent }} />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Aegis Planner</h1>
          <p className="text-sm font-semibold" style={{ color: COLORS.accent }}>
            CUT Alliance Strategic Manager
          </p>
          <p className="text-xs italic mt-1" style={{ color: COLORS.text_muted }}>
            Calm Until Troubled
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: COLORS.text_secondary }}
            >
              Access Key
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your alliance access key..."
              className="w-full px-4 py-3 rounded-lg border text-lg"
              style={{
                backgroundColor: COLORS.bg_input,
                borderColor: COLORS.border,
                color: COLORS.text_primary,
              }}
              autoFocus
            />
          </div>

          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-sm text-center"
              style={{
                backgroundColor: `${COLORS.danger}20`,
                color: COLORS.danger,
                border: `1px solid ${COLORS.danger}40`,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-lg transition-all"
            style={{
              backgroundColor: loading || !password ? COLORS.border : COLORS.accent,
              color: loading || !password ? COLORS.text_muted : '#1a1c1e',
              cursor: loading || !password ? 'not-allowed' : 'pointer',
            }}
          >
            <LogIn size={20} />
            {loading ? 'Authenticating...' : 'Enter War Room'}
          </button>
        </form>

        {/* Footer hint */}
        <div className="mt-6 text-center">
          <p className="text-xs" style={{ color: COLORS.text_muted }}>
            R4 Officers and Alliance Members use different access keys.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
