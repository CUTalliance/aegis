import React, { useState, useMemo } from 'react';
import { X, Trophy, Shield, Image } from 'lucide-react';
import { COLORS } from '../utils/theme';
import { useMembersStore } from '../store/membersStore';
import { useEventsStore } from '../store/eventsStore';
import { exportAARPNG } from '../services/pngExport';

const ALLIANCE = 'CUT';
const STATE = '1404';

const WIN_THEME = {
  bg: 'linear-gradient(135deg, #2d2a1a 0%, #3d2f10 50%, #2d2a1a 100%)',
  accent: '#f1c40f',
  accentSecondary: '#e67e22',
  border: '#f1c40f',
  title: 'VICTORY',
  subtitle: `${ALLIANCE} [${STATE}] DOMINATES`,
  icon: '🏆',
  cardBg: '#3a3520',
  cardBorder: '#f1c40f',
};

const LOSS_THEME = {
  bg: 'linear-gradient(135deg, #1a2332 0%, #1e3a5f 50%, #1a2332 100%)',
  accent: '#3498db',
  accentSecondary: '#95a5a6',
  border: '#3498db',
  title: 'DEFEAT',
  subtitle: 'WE REGROUP & REVENGE',
  icon: '🛡️',
  cardBg: '#1e2d40',
  cardBorder: '#3498db',
};

const EventReportView = ({ event, onClose }) => {
  const members = useMembersStore((state) => state.members);
  const updateFinishedEvent = useEventsStore((state) => state.updateFinishedEvent);

  const isWin = event.outcome === 'Winner';
  const theme = isWin ? WIN_THEME : LOSS_THEME;

  // Participant evaluations stored in the event
  const [participantEvals, setParticipantEvals] = useState(
    event.participantEvals || {}
  );

  // Resolve a saved entry (could be member ID or legacy chief_name) to a member object
  const resolveMember = (entry) => {
    return members.find((m) => m.id === entry) || members.find((m) => m.chief_name === entry);
  };

  // Find all participants and resolve their member data for scores
  const allParticipantNames = useMemo(() => {
    return (event.teams || []).flat().map((entry) => {
      const m = members.find((mem) => mem.id === entry) || members.find((mem) => mem.chief_name === entry);
      return m ? m.chief_name : entry;
    });
  }, [event, members]);

  // MVP: participant with the highest performance rating (star rating from AAR eval)
  const mvp = useMemo(() => {
    let best = null;
    let bestRating = 0;

    for (const name of allParticipantNames) {
      const eval_ = participantEvals[name];
      const rating = eval_?.rating || 0;
      if (rating > bestRating) {
        bestRating = rating;
        const member = members.find((m) => m.chief_name === name);
        best = { name, rating, member };
      }
    }
    return bestRating > 0 ? best : null;
  }, [allParticipantNames, members, participantEvals]);

  const handleEvalChange = (name, field, value) => {
    const updated = {
      ...participantEvals,
      [name]: {
        ...(participantEvals[name] || {}),
        [field]: value,
      },
    };
    setParticipantEvals(updated);
    updateFinishedEvent(event.id, { participantEvals: updated });
  };

  const NumberRating = ({ value, onChange }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
        <button
          key={num}
          onClick={() => onChange(num)}
          className="transition-transform hover:scale-110 rounded"
          title={`Set rating to ${num}`}
          style={{
            color: num <= (value || 0) ? '#1a1c1e' : COLORS.text_muted,
            backgroundColor: num <= (value || 0) ? theme.accent : 'transparent',
            fontSize: '12px',
            fontWeight: num <= (value || 0) ? 'bold' : 'normal',
            background: num <= (value || 0) ? theme.accent : 'none',
            border: `1px solid ${num <= (value || 0) ? theme.accent : COLORS.text_muted}`,
            cursor: 'pointer',
            padding: '2px 6px',
            minWidth: '28px',
            textAlign: 'center',
          }}
        >
          {num}
        </button>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div
        className="rounded-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto"
        style={{ background: COLORS.bg_primary }}
      >
        {/* Themed Banner */}
        <div
          className="p-8 rounded-t-xl relative"
          style={{ background: theme.bg }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:opacity-80"
            style={{ color: COLORS.text_primary, backgroundColor: 'rgba(0,0,0,0.3)' }}
            title="Close report"
          >
            <X size={20} />
          </button>

          <div className="text-center">
            <div className="text-5xl mb-3">{theme.icon}</div>
            <h1
              className="text-4xl font-black tracking-wider mb-1"
              style={{ color: theme.accent }}
            >
              {theme.title}
            </h1>
            <p
              className="text-lg font-bold tracking-wide"
              style={{ color: theme.accentSecondary }}
            >
              {theme.subtitle}
            </p>
            <div className="mt-4 flex items-center justify-center gap-6">
              <span style={{ color: COLORS.text_secondary }} className="text-sm">
                {event.event_name}
              </span>
              <span style={{ color: COLORS.text_muted }}>•</span>
              <span style={{ color: COLORS.text_secondary }} className="text-sm">
                {event.event_type === 'KOTH' ? 'King of the Hill' : event.event_type === 'RR' ? 'Reservoir Raid' : 'State Warfare'}
              </span>
              <span style={{ color: COLORS.text_muted }}>•</span>
              <span style={{ color: COLORS.text_secondary }} className="text-sm">
                {new Date(event.finishedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* MVP Commendation Card */}
          {mvp && (
            <div
              className="rounded-xl p-6 border-2 text-center"
              style={{
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
              }}
            >
              <div className="text-3xl mb-2">
                {isWin ? <Trophy size={36} className="inline" style={{ color: theme.accent }} /> : <Shield size={36} className="inline" style={{ color: theme.accent }} />}
              </div>
              <h2
                className="text-xs font-bold tracking-[0.3em] uppercase mb-2"
                style={{ color: theme.accentSecondary }}
              >
                — COMMENDATION —
              </h2>
              <h3
                className="text-2xl font-black mb-1"
                style={{ color: theme.accent }}
              >
                {mvp.member?.isGuest && '✈️ '}{mvp.name}
              </h3>
              <p style={{ color: COLORS.text_secondary }} className="text-sm">
                Performance Rating: <span className="font-bold" style={{ color: theme.accent }}>{mvp.rating}/10</span>
              </p>
              <p style={{ color: COLORS.text_muted }} className="text-xs mt-1">
                Most Valuable Player — {event.event_type} Event
              </p>
            </div>
          )}

          {/* Rapport */}
          {event.rapport?.trim() && (
            <div
              className="rounded-lg p-5 border"
              style={{ backgroundColor: COLORS.bg_card, borderColor: COLORS.border }}
            >
              <h3 className="font-bold mb-2" style={{ color: theme.accent }}>
                📝 Final Rapport
              </h3>
              <p style={{ color: COLORS.text_primary, whiteSpace: 'pre-wrap' }} className="text-sm leading-relaxed">
                {event.rapport}
              </p>
            </div>
          )}

          {/* Participant Evaluations (flat list, no teams) */}
          <div>
            <h3
              className="text-xl font-bold mb-4"
              style={{ color: COLORS.text_primary }}
            >
              📋 Participant Evaluation ({allParticipantNames.length})
            </h3>
            <div className="space-y-2">
              {allParticipantNames.map((name, i) => {
                const member = members.find((m) => m.chief_name === name);
                const eval_ = participantEvals[name] || {};
                const isMVP = mvp && mvp.name === name;

                return (
                  <div
                    key={i}
                    className="rounded-lg p-4 border flex flex-col md:flex-row md:items-center gap-3"
                    style={{
                      backgroundColor: isMVP ? theme.cardBg : COLORS.bg_card,
                      borderColor: isMVP ? theme.cardBorder : COLORS.border,
                    }}
                  >
                    {/* Name & Score */}
                    <div className="flex-1 flex items-center gap-2">
                      {isMVP && (
                        <span style={{ color: theme.accent }} title="MVP">
                          {isWin ? '🏆' : '🛡️'}
                        </span>
                      )}
                      {member?.isGuest && (
                        <span title="SVS Guest">✈️</span>
                      )}
                      <span
                        className="font-semibold"
                        style={{ color: COLORS.text_primary }}
                      >
                        {name}
                      </span>
                      {member && (
                        <span
                          className="text-xs font-mono ml-1"
                          style={{ color: COLORS.text_secondary }}
                        >
                          ({event.event_type === 'KOTH' ? member.score_koth : event.event_type === 'RR' ? member.score_rr : Math.round((member.score_koth + member.score_rr) / 2)})
                        </span>
                      )}
                    </div>

                    {/* Performance Number Rating (1-10) */}
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs"
                        style={{ color: COLORS.text_secondary }}
                      >
                        Performance:
                      </span>
                      <NumberRating
                        value={eval_.rating || 0}
                        onChange={(val) => handleEvalChange(name, 'rating', val)}
                      />
                    </div>

                    {/* Notes */}
                    <div className="md:w-48">
                      <input
                        type="text"
                        placeholder="Notes..."
                        value={eval_.notes || ''}
                        onChange={(e) => handleEvalChange(name, 'notes', e.target.value)}
                        className="w-full px-2 py-1 rounded border text-sm"
                        style={{
                          backgroundColor: COLORS.bg_input,
                          borderColor: COLORS.border,
                          color: COLORS.text_primary,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reserve List (if present) */}
          {event.reservePool && event.reservePool.length > 0 && (
            <div
              className="rounded-lg p-5 border"
              style={{ backgroundColor: COLORS.bg_card, borderColor: COLORS.warning }}
            >
              <h3 className="font-bold mb-2" style={{ color: COLORS.warning }}>
                🪑 Reserve List
              </h3>
              <div className="flex flex-wrap gap-2">
                {event.reservePool.map((entry, i) => {
                  const m = resolveMember(entry);
                  return (
                    <span
                      key={i}
                      className="px-3 py-1 rounded text-sm"
                      style={{ backgroundColor: COLORS.bg_primary, color: COLORS.text_secondary }}
                    >
                      {m ? m.chief_name : entry}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Export AAR PNG */}
          <div className="flex justify-center">
            <button
              onClick={async () => {
                try {
                  await exportAARPNG(event, participantEvals, members);
                  alert('✅ AAR exported as PNG!');
                } catch (err) {
                  console.error('AAR PNG export error:', err);
                  alert('❌ Failed to export AAR PNG');
                }
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold"
              title="Export the After Action Report as a PNG image"
              style={{
                backgroundColor: theme.accent,
                color: '#1a1c1e',
              }}
            >
              <Image size={18} />
              Export AAR as PNG
            </button>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 border-t" style={{ borderColor: COLORS.border }}>
            <p className="text-xs" style={{ color: COLORS.text_muted }}>
              Aegis Planner — {ALLIANCE} Alliance [{STATE}] — After Action Report
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventReportView;
