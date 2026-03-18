import React, { useState } from 'react';
import { useMembersStore } from '../store/membersStore';
import { useEventsStore } from '../store/eventsStore';
import { useAuthStore } from '../store/authStore';
import { UserCircle, Map, ShieldAlert, CheckCircle2, Download } from 'lucide-react';

const MyOrders = () => {
  const members = useMembersStore((state) => state.members);
  const myIdentityId = useMembersStore((state) => state.myIdentityId);
  const setMyIdentityId = useMembersStore((state) => state.setMyIdentityId);
  const events = useEventsStore((state) => state.events);
  const role = useAuthStore((s) => s.role);

  const [isSelecting, setIsSelecting] = useState(!myIdentityId);

  const myIdentity = members.find((m) => m.id === myIdentityId);

  // Find the deployed event — look for Status === 'Deployed' or status === 'Deployed'
  // Only an event explicitly marked as Deployed will be considered active.
  let activeEvent = events.find((e) => e.Status === 'Deployed' || e.status === 'Deployed');

  // Determine alliance state: CALM if no deployed event
  const allianceState = activeEvent ? 'WAR' : 'CALM';

  // Resolve teams from saved event (teams store member IDs, not full objects)
  let myTeam = null;
  let myTeamIndex = -1;
  let myLeader = null;

  if (activeEvent && myIdentity) {
    const resolvedTeams = (activeEvent.teams || []).map((team) =>
      team.map((entry) => members.find((m) => m.id === entry || m.chief_name === entry)).filter(Boolean)
    );

    myTeamIndex = resolvedTeams.findIndex((team) =>
      team.some((m) => m.id === myIdentity.id)
    );

    if (myTeamIndex !== -1) {
      myTeam = resolvedTeams[myTeamIndex];
      myLeader = myTeam.find((m) => m.CombatRole === 'Rally Leader');

      // Also check team_leaders from event data
      if (!myLeader && activeEvent.team_leaders) {
        const leaderId = activeEvent.team_leaders[myTeamIndex + 1];
        if (leaderId) {
          myLeader = myTeam.find((m) => m.id === leaderId);
        }
      }
    }
  }

  const eventType = activeEvent?.event_type || activeEvent?.EventType || '';
  const eventName = activeEvent?.event_name || activeEvent?.EventName || '';

  const getThemeColor = () => {
    if (eventType === 'KOTH') return '#f1c40f';
    if (eventType === 'RR') return '#3498db';
    return '#e74c3c';
  };

  if (isSelecting || !myIdentity) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#1a1c1e' }}>
        <div className="w-full max-w-2xl bg-[#25282c] rounded-xl p-8 shadow-2xl flex flex-col items-center">
          <UserCircle className="w-16 h-16 text-[#e67e22] mb-6" />
          <h2 className="text-3xl font-bold text-white uppercase tracking-wider mb-2">Identify Yourself</h2>
          <p className="text-gray-400 mb-8 text-center">Select your in-game identity to receive personalized deployment orders during weekend events.</p>

          <select
            className="no-print w-full max-w-md bg-gray-900 border border-gray-700 rounded-lg p-4 text-white text-lg mb-6"
            value={myIdentityId || ''}
            onChange={(e) => {
              setMyIdentityId(e.target.value);
              if (e.target.value) setIsSelecting(false);
            }}
          >
            <option value="">Select your character...</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.chief_name} {member.CombatRole ? `(${member.CombatRole})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#1a1c1e' }}>
      <div className="w-full max-w-4xl mx-auto bg-[#25282c] rounded-xl p-8 shadow-2xl flex flex-col">
        <style>{`
          @media print {
            .no-print { display: none !important; }
            .screen-only { display: none !important; }
            .print-only { display: block !important; }
            body { -webkit-print-color-adjust: exact; color-adjust: exact; }
            @page { size: A4 portrait; margin: 10mm; }
            .print-container { font-size: 12px; line-height: 1.15; color: #111; background: #fff; }
            .print-container h2, .print-container h3 { color: #111; }
            .no-break { page-break-inside: avoid; }
          }
          @media screen {
            .print-only { display: none; }
          }
        `}</style>
        <div className="flex justify-between items-start mb-8 border-b border-gray-800 pb-6">
          <div>
            <h2 className="text-3xl font-bold text-white uppercase tracking-wider flex items-center gap-3">
              <UserCircle className="w-8 h-8 text-[#e67e22]" />
              {myIdentity.chief_name}
            </h2>
            <div className="flex items-center gap-4 mt-2">
              {myIdentity.Rank && (
                <p className="text-gray-400 flex items-center gap-2">
                  Rank: <span className="text-[#f1c40f] font-bold">{myIdentity.Rank}</span>
                </p>
              )}
              {myIdentity.CombatRole && (
                <p className="text-gray-400 flex items-center gap-2">
                  Combat Role: <span className="text-[#e67e22] font-bold">{myIdentity.CombatRole}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsSelecting(true)}
            className="no-print text-sm text-gray-500 hover:text-white transition-colors"
            title="Choose a different in-game identity"
          >
            Change Identity
          </button>
        </div>

        {allianceState === 'CALM' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-800/30 rounded-xl border border-gray-800">
            <CheckCircle2 className="w-16 h-16 text-[#27ae60] mb-6 opacity-50" />
            <h3 className="text-2xl font-bold text-white mb-2">Calm State Active</h3>
            <p className="text-gray-400 max-w-md">There are no active deployment orders. Focus on daily intel, gathering resources, and preparing for the weekend.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-6">
            {!activeEvent ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-800/30 rounded-xl border border-gray-800">
                <ShieldAlert className="w-16 h-16 text-[#f1c40f] mb-6 opacity-50" />
                <h3 className="text-2xl font-bold text-white mb-2">Awaiting Orders</h3>
                <p className="text-gray-400 max-w-md">The War Room is currently drafting the plan. Stand by for deployment instructions.</p>
              </div>
            ) : myTeam ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Team Info */}
                <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <ShieldAlert className="w-6 h-6" style={{ color: getThemeColor() }} />
                    {eventType} Deployment
                  </h3>

                  <div className="mb-6">
                    <p className="text-sm text-gray-400 mb-1">Your Assignment</p>
                    <p className="text-2xl font-bold text-[#e67e22]">{myLeader ? `Team ${myLeader.chief_name}` : `Team ${myTeamIndex + 1}`}</p>
                  </div>

                  <div className="mb-6">
                    <p className="text-sm text-gray-400 mb-1">Rally Leader</p>
                    <p className="text-lg font-bold text-white">{myLeader ? myLeader.chief_name : 'None Assigned'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-400 mb-2">Team Roster</p>
                    <ul className="space-y-1">
                      {myTeam.map((m) => (
                        <li key={m.id} className={`text-sm ${m.id === myIdentity.id ? 'text-[#e67e22] font-bold' : 'text-gray-300'}`}>
                          {m.chief_name} <span className="text-gray-500 text-xs">({m.CombatRole || 'Joiner'})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Tactical Instructions (no map image for members) */}
                <div className="screen-only bg-gray-800/50 border border-gray-700 rounded-xl p-6 flex flex-col">
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Map className="w-6 h-6 text-[#3498db]" />
                    Tactical Instructions
                  </h3>
                  <div className="flex-1 bg-gray-900 rounded-lg border border-gray-800 p-4 text-sm text-gray-300 no-break">
                    {/* General Instructions */}
                    {activeEvent?.general_instructions ? (
                      <div className="mb-4">
                        <div className="text-xs text-[#f1c40f] font-bold mb-2">📢 General Instructions</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{activeEvent.general_instructions}</div>
                      </div>
                    ) : (
                      <div className="mb-4 text-gray-500">No general instructions provided.</div>
                    )}

                    {/* Team Instructions for this member's team */}
                    {activeEvent?.team_instructions && activeEvent.team_instructions[myTeamIndex + 1] ? (
                      <div>
                        <div className="text-xs text-[#e67e22] font-bold mb-2">📋 Team Instructions</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{activeEvent.team_instructions[myTeamIndex + 1]}</div>
                      </div>
                    ) : (
                      <div className="text-gray-500">No team-specific instructions.</div>
                    )}
                  </div>
                </div>
                </div>

                {/* Download Orders Button */}
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => window.print()}
                    className="no-print flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-90"
                    title="Print or download your personalized orders"
                    style={{ backgroundColor: getThemeColor(), color: '#1a1c1e' }}
                  >
                    <Download className="w-5 h-5" />
                    Download Orders
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-800/30 rounded-xl border border-gray-800">
                <UserCircle className="w-16 h-16 text-gray-600 mb-6" />
                <h3 className="text-2xl font-bold text-white mb-2">No Assignment</h3>
                <p className="text-gray-400 max-w-md">
                  You are not assigned to a team for the current {eventType} deployment. You may be listed as Reserve.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Print-only rearranged instructions placed under My Orders for single-page printing */}
      {activeEvent && (
        <div className="print-only print-container mt-6 p-4 rounded-lg" style={{ display: 'none' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '6px' }}>{myIdentity.chief_name} — {myLeader ? `Team ${myLeader.chief_name}` : (myTeamIndex !== -1 ? `Team ${myTeamIndex + 1}` : '')}</h2>
          <div className="no-break" style={{ background: '#f5f5f5', padding: '8px', borderRadius: '6px', marginBottom: '8px' }}>
            <div style={{ color: '#b8860b', fontWeight: '700', fontSize: '12px', marginBottom: '6px' }}>📢 General Instructions</div>
            <div style={{ whiteSpace: 'pre-wrap', color: '#111' }}>{activeEvent.general_instructions || 'No general instructions provided.'}</div>
          </div>
          <div className="no-break" style={{ background: '#fafafa', padding: '8px', borderRadius: '6px' }}>
            <div style={{ color: '#d35400', fontWeight: '700', fontSize: '12px', marginBottom: '6px' }}>📋 Team Instructions</div>
            <div style={{ whiteSpace: 'pre-wrap', color: '#111' }}>{(activeEvent.team_instructions && activeEvent.team_instructions[myTeamIndex + 1]) || 'No team-specific instructions.'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrders;
