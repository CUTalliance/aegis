import React from 'react';
import { X, Shield } from 'lucide-react';
import { COLORS } from '../utils/theme';

const AboutDialog = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="relative rounded-xl shadow-2xl w-[380px] border"
        style={{
          backgroundColor: COLORS.bg_card,
          borderColor: COLORS.border,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded hover:opacity-80 transition-opacity"
          style={{ color: COLORS.text_muted }}
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="px-8 py-10 text-center">
          {/* Icon */}
          <div
            className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5"
            style={{ backgroundColor: COLORS.bg_primary }}
          >
            <Shield size={32} style={{ color: COLORS.accent }} />
          </div>

          {/* App name */}
          <h2 className="text-xl font-bold text-white mb-1">Aegis Planner</h2>
          <p
            className="text-sm font-semibold mb-4"
            style={{ color: COLORS.accent }}
          >
            v3.0.0
          </p>

          {/* Divider */}
          <div
            className="w-12 h-0.5 mx-auto mb-5 rounded"
            style={{ backgroundColor: COLORS.accent }}
          />

          {/* Credits */}
          <p className="text-sm text-white mb-1">Developed by</p>
          <p
            className="text-lg font-bold mb-1"
            style={{ color: COLORS.accent }}
          >
            Ash-Baal
          </p>
          <p className="text-sm mb-4" style={{ color: COLORS.text_secondary }}>
            State 1404
          </p>

          <p className="text-sm text-white mb-1">Built for</p>
          <p
            className="text-lg font-bold mb-1"
            style={{ color: COLORS.accent }}
          >
            CUT Alliance
          </p>
          <p
            className="text-xs italic"
            style={{ color: COLORS.text_muted }}
          >
            Calm Until Troubled
          </p>
        </div>

        {/* Footer */}
        <div
          className="px-8 py-4 rounded-b-xl text-center border-t"
          style={{
            backgroundColor: COLORS.bg_primary,
            borderColor: COLORS.border,
          }}
        >
          <p className="text-xs" style={{ color: COLORS.text_muted }}>
            React + Vite + Tailwind CSS + Zustand
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutDialog;
