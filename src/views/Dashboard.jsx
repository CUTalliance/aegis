import React, { useEffect } from 'react';
import { Users, Zap, Calendar, Crown, Droplets, Swords } from 'lucide-react';
import { useMembersStore } from '../store/membersStore';
import { useEventsStore } from '../store/eventsStore';
import { COLORS, EVENT_COLORS } from '../utils/theme';
import Announcements from '../components/Announcements';

const Dashboard = () => {
  const members = useMembersStore((state) => state.members);
  const initialize = useMembersStore((state) => state.initialize);
  const events = useEventsStore((state) => state.events);
  const finishedEvents = useEventsStore((state) => state.finishedEvents);
  const eventsInitialize = useEventsStore((state) => state.initialize);

  useEffect(() => {
    initialize();
    eventsInitialize();
  }, [initialize, eventsInitialize]);

  const stats = [
    {
      label: 'Total Members',
      value: members.length,
      icon: Users,
      color: COLORS.accent,
    },
    {
      label: 'Total Power',
      value: members
        .reduce((sum, m) => sum + m.base_power + m.aeroplane_power, 0)
        .toLocaleString(),
      icon: Zap,
      color: COLORS.rr_blue,
    },
    {
      label: 'Saved Events',
      value: events.length,
      icon: Calendar,
      color: COLORS.koth_gold,
    },
  ];

  const recentMembers = members.slice(-3).reverse();

  // History Overview: count finished events by type
  const historyStats = [
    {
      type: 'KOTH',
      label: 'King of the Hill',
      count: finishedEvents.filter((e) => e.event_type === 'KOTH').length,
      icon: Crown,
      color: EVENT_COLORS.KOTH,
    },
    {
      type: 'RR',
      label: 'Reservoir Raid',
      count: finishedEvents.filter((e) => e.event_type === 'RR').length,
      icon: Droplets,
      color: EVENT_COLORS.RR,
    },
    {
      type: 'SVS',
      label: 'State Warfare',
      count: finishedEvents.filter((e) => e.event_type === 'SVS').length,
      icon: Swords,
      color: EVENT_COLORS.SVS,
    },
  ];

  const totalFinished = finishedEvents.length;
  const totalWins = finishedEvents.filter((e) => e.outcome === 'Winner').length;

  return (
    <div
      className="min-h-screen p-8"
      style={{ backgroundColor: COLORS.bg_primary }}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" style={{ color: COLORS.text_primary }}>
          Dashboard
        </h1>
      </div>

      {/* Announcements */}
      <div className="mb-8">
        <Announcements />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-lg p-6 border"
            style={{
              backgroundColor: COLORS.bg_card,
              borderColor: COLORS.border,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ color: COLORS.text_secondary }}>{label}</h3>
              <Icon size={24} style={{ color }} />
            </div>
            <p
              className="text-3xl font-bold"
              style={{ color }}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* History Overview */}
      <div className="rounded-lg p-6 border mb-8" style={{
        backgroundColor: COLORS.bg_card,
        borderColor: COLORS.border,
      }}>
        <h2 className="text-xl font-bold mb-2" style={{ color: COLORS.text_primary }}>
          History Overview
        </h2>
        <p className="text-sm mb-4" style={{ color: COLORS.text_secondary }}>
          {totalFinished} finished event{totalFinished !== 1 ? 's' : ''} — {totalWins} win{totalWins !== 1 ? 's' : ''}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {historyStats.map(({ type, label, count, icon: Icon, color }) => (
            <div
              key={type}
              className="rounded-lg p-4 border flex items-center gap-4"
              style={{
                backgroundColor: COLORS.bg_primary,
                borderColor: COLORS.border,
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${color}20` }}
              >
                <Icon size={24} style={{ color }} />
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color }}>{count}</p>
                <p className="text-sm" style={{ color: COLORS.text_secondary }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Members */}
      <div className="rounded-lg p-6 border" style={{
        backgroundColor: COLORS.bg_card,
        borderColor: COLORS.border,
      }}>
        <h2 className="text-xl font-bold mb-4" style={{ color: COLORS.text_primary }}>
          Recently Added Members
        </h2>

        {recentMembers.length > 0 ? (
          <div className="space-y-3">
            {recentMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded"
                style={{ backgroundColor: COLORS.bg_primary }}
              >
                <div>
                  <p className="font-semibold" style={{ color: COLORS.text_primary }}>
                    {member.chief_name}
                  </p>
                  <p style={{ color: COLORS.text_secondary }}>
                    Base Power: {member.base_power.toLocaleString()} | AP: {member.aeroplane_power.toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {member.t11_infantry && (
                    <span
                      className="px-2 py-1 rounded text-xs font-semibold"
                      style={{
                        backgroundColor: COLORS.badge_on,
                        color: '#fff',
                      }}
                    >
                      I
                    </span>
                  )}
                  {member.t11_hunter && (
                    <span
                      className="px-2 py-1 rounded text-xs font-semibold"
                      style={{
                        backgroundColor: COLORS.badge_on,
                        color: '#fff',
                      }}
                    >
                      H
                    </span>
                  )}
                  {member.t11_rider && (
                    <span
                      className="px-2 py-1 rounded text-xs font-semibold"
                      style={{
                        backgroundColor: COLORS.badge_on,
                        color: '#fff',
                      }}
                    >
                      R
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: COLORS.text_muted }}>No members yet</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
