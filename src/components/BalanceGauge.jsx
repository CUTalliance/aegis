import React from 'react';
import { COLORS } from '../utils/theme';
import { calculateMasterScore } from '../utils/balancer';

const BalanceGauge = ({ teams, eventType }) => {
  if (!teams || teams.length < 2) return null;

  // Calculate avg score per team
  const teamAvgs = teams.map((team) => {
    if (team.length === 0) return 0;
    const total = team.reduce((sum, m) => sum + calculateMasterScore(m, eventType), 0);
    return total / team.length;
  });

  // Build pairwise comparisons for all adjacent team pairs
  const pairs = [];
  for (let i = 0; i < teams.length - 1; i++) {
    const avgA = teamAvgs[i];
    const avgB = teamAvgs[i + 1];
    const ratio = avgB > 0 ? (avgA / avgB) * 100 : avgA > 0 ? 200 : 100;
    pairs.push({ a: i + 1, b: i + 2, avgA, avgB, ratio: Math.round(ratio) });
  }

  const getBarColor = (ratio) => {
    const diff = Math.abs(ratio - 100);
    if (diff <= 5) return COLORS.success;
    if (diff <= 15) return COLORS.warning;
    return COLORS.danger;
  };

  const getLabel = (ratio) => {
    const diff = Math.abs(ratio - 100);
    if (diff <= 5) return 'Balanced';
    if (diff <= 15) return 'Slight Edge';
    return 'Imbalanced';
  };

  return (
    <div
      className="rounded-lg p-6 border"
      style={{
        backgroundColor: COLORS.bg_card,
        borderColor: COLORS.border,
      }}
    >
      <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.text_primary }}>
        ⚖️ Strength Meter
      </h3>

      <div className="space-y-4">
        {pairs.map(({ a, b, avgA, avgB, ratio }) => {
          const clampedRatio = Math.max(50, Math.min(150, ratio));
          // Map 50-150 → 0%-100% for the needle position
          const needlePos = ((clampedRatio - 50) / 100) * 100;
          const color = getBarColor(ratio);
          const label = getLabel(ratio);

          return (
            <div key={`${a}-${b}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold" style={{ color: COLORS.text_secondary }}>
                  Team {a} vs Team {b}
                </span>
                <span className="text-sm font-bold" style={{ color }}>
                  {ratio}% — {label}
                </span>
              </div>

              {/* Gauge bar */}
              <div className="relative h-5 rounded-full overflow-hidden" style={{ backgroundColor: COLORS.bg_input }}>
                {/* Left gradient (Team A stronger) */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to right, ${COLORS.danger}40, ${COLORS.success}40, ${COLORS.danger}40)`,
                  }}
                />
                {/* Center mark */}
                <div
                  className="absolute top-0 bottom-0 w-0.5"
                  style={{ left: '50%', backgroundColor: COLORS.text_muted }}
                />
                {/* Needle */}
                <div
                  className="absolute top-0 bottom-0 w-1.5 rounded transition-all"
                  style={{
                    left: `calc(${needlePos}% - 3px)`,
                    backgroundColor: color,
                    boxShadow: `0 0 6px ${color}`,
                  }}
                />
              </div>

              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: COLORS.text_muted }}>
                  T{a}: {Math.round(avgA)}
                </span>
                <span className="text-xs" style={{ color: COLORS.text_muted }}>
                  T{b}: {Math.round(avgB)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BalanceGauge;
