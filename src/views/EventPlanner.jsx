import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Copy, DownloadCloud, Map, Image, FileSpreadsheet, Upload, CheckCircle, Trophy } from 'lucide-react';
import { useMembersStore } from '../store/membersStore';
import { useEventsStore } from '../store/eventsStore';
import { performSnakeDraft, calculateTeamStats, calculateMasterScore } from '../utils/balancer';
import { COLORS, EVENT_COLORS } from '../utils/theme';
import TeamCard from '../components/TeamCard';
import MemberSelector from '../components/MemberSelector';
import TacticalMapDialog from '../components/TacticalMapDialog';

import { exportAllPNGs } from '../services/pngExport';
import { exportEventToExcel } from '../services/excelExport';
import EventReportView from './EventReportView';

const EventPlanner = () => {
  const allMembers = useMembersStore((state) => state.members);
  const members = allMembers.filter(m => !m.isGuest); // Exclude guests
  const initMembers = useMembersStore((state) => state.initialize);
  const events = useEventsStore((state) => state.events);
  const finishedEvents = useEventsStore((state) => state.finishedEvents);
  const createEvent = useEventsStore((state) => state.createEvent);
  const updateEvent = useEventsStore((state) => state.updateEvent);
  const deleteEvent = useEventsStore((state) => state.deleteEvent);
  const markAsFinished = useEventsStore((state) => state.markAsFinished);
  const updateFinishedEvent = useEventsStore((state) => state.updateFinishedEvent);
  const deleteFinishedEvent = useEventsStore((state) => state.deleteFinishedEvent);
  const initEvents = useEventsStore((state) => state.initialize);

  const [activeTab, setActiveTab] = useState('active');
  const [eventType, setEventType] = useState('KOTH');
  const [eventName, setEventName] = useState('KOTH ' + new Date().toLocaleDateString());
  const [numTeams, setNumTeams] = useState(2);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [teams, setTeams] = useState([]);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [generalInstructions, setGeneralInstructions] = useState('');
  const [teamInstructions, setTeamInstructions] = useState({});
  const [teamLeaders, setTeamLeaders] = useState({});
  const [showTacticalMap, setShowTacticalMap] = useState(false);
  const [expandedFinishedId, setExpandedFinishedId] = useState(null);
  const [reservePoolIds, setReservePoolIds] = useState([]);
  const [showAAR, setShowAAR] = useState(null);

  useEffect(() => {
    initMembers();
    initEvents();
  }, [initMembers, initEvents]);

  // Update event name when type changes
  useEffect(() => {
    setEventName(eventType + ' ' + new Date().toLocaleDateString());
  }, [eventType]);

  const selectedMembers = selectedMemberIds
    .map((id) => members.find((m) => m.id === id))
    .filter(Boolean);

  const reservePoolMembers = reservePoolIds
    .map((id) => members.find((m) => m.id === id))
    .filter(Boolean);

  // Members available for auto-split (selected minus reserve)
  const availableForSplit = selectedMembers.filter(
    (m) => !reservePoolIds.includes(m.id)
  );

  const handleAutoSplit = () => {
    if (availableForSplit.length === 0) {
      alert('Please select members first (members in the Reserve Pool are excluded).');
      return;
    }

    if (numTeams < 2) {
      alert('At least 2 teams are required.');
      return;
    }

    if (availableForSplit.length < numTeams) {
      alert('Not enough non-reserve members for the number of teams requested.');
      return;
    }

    const result = performSnakeDraft(availableForSplit, numTeams, eventType);
    setTeams(result.teams);
    setTeamInstructions({});
    setTeamLeaders({});

    // Auto-add CombatRole='Reserve' members to reserve pool
    if (result.reservePool && result.reservePool.length > 0) {
      const autoReserveIds = result.reservePool.map((m) => m.id);
      setReservePoolIds((prev) => [...new Set([...prev, ...autoReserveIds])]);
    }
  };

  const handleClearTeams = () => {
    setTeams([]);
    setTeamInstructions({});
    setTeamLeaders({});
  };

  const handleMoveMember = (memberId, fromTeamNum, toTeamNum) => {
    setTeams((prev) => {
      const fromIdx = fromTeamNum - 1;
      const toIdx = toTeamNum - 1;
      const member = prev[fromIdx].find((m) => m.id === memberId);
      if (!member) return prev;
      const updated = prev.map((team, i) => {
        if (i === fromIdx) return team.filter((m) => m.id !== memberId);
        if (i === toIdx) return [...team, member];
        return team;
      });
      return updated;
    });
  };

  const handleSaveEvent = () => {
    if (teams.length === 0) {
      alert('Please create teams first before saving.');
      return;
    }

    const eventData = {
      event_name: eventName,
      event_type: eventType,
      num_teams: numTeams,
      teams: teams.map((team) => team.map((m) => m.id)),
      reservePool: reservePoolMembers.map((m) => m.id),
      general_instructions: generalInstructions,
      team_instructions: teamInstructions,
      team_leaders: teamLeaders,
      created_at: new Date().toISOString(),
    };

    createEvent(eventData);
    alert('✅ Event saved to your planner!');
  };

  const handleDeployEvent = (event) => {
    // Remove Deployed status from all other events first
    const allEvents = useEventsStore.getState().events;
    allEvents.forEach((e) => {
      if (e.status === 'Deployed' || e.Status === 'Deployed') {
        useEventsStore.getState().updateEvent(e.id, { status: undefined, Status: undefined });
      }
    });
    // Set this event as Deployed
    useEventsStore.getState().updateEvent(event.id, { status: 'Deployed', Status: 'Deployed' });
    alert(`\u2705 "${event.event_name}" is now deployed! Members can see their orders in My Orders.`);
  };

  const handleUndeployEvent = (event) => {
    useEventsStore.getState().updateEvent(event.id, { status: undefined, Status: undefined });
    alert(`\u2705 "${event.event_name}" has been undeployed.`);
  };

  // Resolve a saved entry (could be member ID or legacy chief_name) to a member object
  const resolveMember = (entry) => {
    return members.find((m) => m.id === entry) || members.find((m) => m.chief_name === entry);
  };

  const handleLoadEvent = (event) => {
    try {
      // Reconstruct teams from saved member IDs (with fallback to names for legacy events)
      const reconstructedTeams = event.teams.map((teamEntries) => {
        return teamEntries
          .map((entry) => resolveMember(entry))
          .filter(Boolean);
      });

      // Count missing members
      const savedMemberCount = event.teams.reduce((sum, team) => sum + team.length, 0);
      const foundMemberCount = reconstructedTeams.reduce((sum, team) => sum + team.length, 0);
      const missingCount = savedMemberCount - foundMemberCount;

      // Set all state variables
      setEventName(event.event_name);
      setEventType(event.event_type);
      setNumTeams(event.num_teams || reconstructedTeams.length);
      setTeams(reconstructedTeams);
      setGeneralInstructions(event.general_instructions || '');
      setTeamInstructions(event.team_instructions || {});
      setTeamLeaders(event.team_leaders || {});

      // Reconstruct reserve pool
      const reserveEntries = event.reservePool || [];
      const reserveIds = reserveEntries
        .map((entry) => resolveMember(entry))
        .filter(Boolean)
        .map((m) => m.id);
      setReservePoolIds(reserveIds);

      // Set selected members (all members in all teams + reserve)
      const allMemberIds = [
        ...reconstructedTeams.flat().map((m) => m.id),
        ...reserveIds,
      ];
      setSelectedMemberIds(allMemberIds);

      // Switch to active planner tab
      setActiveTab('active');

      // Show warning if some members are missing
      if (missingCount > 0) {
        alert(
          `✅ Event loaded successfully!\n\n⚠️ Warning: ${missingCount} member(s) from the saved event were not found in your current roster. They have been excluded from the teams.`
        );
      } else {
        alert('✅ Event loaded successfully!');
      }
    } catch (error) {
      console.error('Load event error:', error);
      alert('❌ Failed to load event. Some data may be missing or corrupted.');
    }
  };

  const handleExport = (format) => {
    if (teams.length === 0) {
      alert('No teams to export. Please create teams first.');
      return;
    }

    const eventPrefix = `${eventName}_teams`;

    if (format === 'json') {
      const exportData = {
        event_name: eventName,
        event_type: eventType,
        teams: teams.map((team, idx) => {
          const leaderId = teamLeaders && teamLeaders[idx + 1];
          const leaderName = leaderId ? team.find((m) => m.id === leaderId)?.chief_name : null;
          const teamName = leaderName ? `Team ${idx + 1} (${leaderName})` : `Team ${idx + 1}`;
          return {
            team_number: idx + 1,
            team_name: teamName,
            members: team.map((m) => ({
              name: m.chief_name,
              power: m.base_power + m.aeroplane_power,
              master_score: calculateMasterScore(m, eventType),
            })),
          };
        }),
        general_instructions: generalInstructions,
        team_instructions: teamInstructions,
      };
      const json = JSON.stringify(exportData, null, 2);
      downloadFile(json, `${eventPrefix}.json`, 'application/json');
    } else if (format === 'txt') {
      let txt = `${eventName} (${eventType})\n`;
      txt += `${'='.repeat(50)}\n\n`;

      if (generalInstructions.trim()) {
        txt += `📢 GENERAL INSTRUCTIONS\n${generalInstructions}\n\n`;
      }

      // Reserve pool
      if (reservePoolMembers.length > 0) {
        txt += `🪑 RESERVE LIST (${reservePoolMembers.length})\n`;
        txt += `${'-'.repeat(40)}\n`;
        reservePoolMembers.forEach((member) => {
          const score = Math.round(calculateMasterScore(member, eventType));
          txt += `  • ${member.chief_name} - Score: ${score}\n`;
        });
        txt += '\n';
      }

      teams.forEach((team, idx) => {
        const teamNum = idx + 1;
        const leaderId = teamLeaders && teamLeaders[teamNum];
        const leaderName = leaderId ? team.find((m) => m.id === leaderId)?.chief_name : null;
        const teamName = leaderName ? `TEAM ${teamNum} (${leaderName})` : `TEAM ${teamNum}`;
        txt += `${teamName} (${team.length} members)\n`;
        txt += `${'-'.repeat(40)}\n`;
        team.forEach((member) => {
          const score = Math.round(calculateMasterScore(member, eventType));
          txt += `  • ${member.chief_name} - Score: ${score}\n`;
        });
        
        const teamInstr = teamInstructions[idx + 1];
        if (teamInstr && teamInstr.trim()) {
          txt += `\n  📋 Instructions: ${teamInstr}\n`;
        }
        txt += '\n';
      });

      // Stats
      const teamStats = calculateTeamStats(teams, eventType);
      txt += `\n${'='.repeat(50)}\n`;
      txt += `STATISTICS\n`;
      txt += `${'='.repeat(50)}\n`;
      teamStats.teams.forEach(t => {
        txt += `Team ${t.teamNum}: ${t.memberCount} members, Avg Score: ${t.avgScore}\n`;
      });
      txt += `\nOverall Balance: ${teamStats.balancePercentage.toFixed(1)}%\n`;

      downloadFile(txt, `${eventPrefix}.txt`, 'text/plain');
    }
  };

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleExportPNG = async () => {
    if (teams.length === 0) {
      alert('No teams to export. Please create teams first.');
      return;
    }

    try {
      const result = await exportAllPNGs(
        eventName,
        eventType,
        teams,
        generalInstructions,
        teamInstructions,
        reservePoolMembers
      );

      alert(`✅ Exported ${result.count} team card images!`);
    } catch (error) {
      console.error('PNG export error:', error);
      alert('❌ Failed to export team card images. Please try again.');
    }
  };

  const handleExportExcel = () => {
    if (teams.length === 0) {
      alert('No teams to export. Please create teams first.');
      return;
    }

    try {
      const filename = exportEventToExcel(
        eventName,
        eventType,
        teams,
        generalInstructions,
        teamInstructions,
        reservePoolMembers,
        teamLeaders
      );
      alert(`✅ Event exported to spreadsheet successfully!`);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('❌ Failed to export spreadsheet. Please try again.');
    }
  };

  const handleCopyToClipboard = () => {
    if (teams.length === 0) {
      alert('No teams to copy. Please create teams first.');
      return;
    }

    let text = `${eventName} (${eventType})\n\n`;
    teams.forEach((team, idx) => {
      const leaderId = teamLeaders[idx + 1];
      const leaderName = leaderId ? team.find((m) => m.id === leaderId)?.chief_name : null;
      const teamName = leaderName ? `Team ${leaderName}` : `Team ${idx + 1}`;
      text += `${teamName}:\n`;
      team.forEach((member) => {
        text += `  - ${member.chief_name}\n`;
      });
      text += '\n';
    });

    navigator.clipboard.writeText(text);
    alert('✅ Teams copied to clipboard!');
  };

  const handleOpenTacticalMap = () => {
    if (teams.length === 0) {
      alert('Please run Auto-Split first to create teams.');
      return;
    }
    setShowTacticalMap(true);
  };

  const handleMarkAsFinished = (event) => {
    if (window.confirm(`Mark "${event.event_name}" as finished?`)) {
      markAsFinished(event.id);
      alert('✅ Event moved to Events Done.');
    }
  };

  const stats = calculateTeamStats(teams, eventType);

  const TAB_CONFIG = [
    { key: 'active', label: '🎯 Active Planner' },
    { key: 'saved', label: '💾 Saved Events' },
    { key: 'done', label: '✅ Events Done' },
  ];

  return (
    <div
      className="min-h-screen p-8"
      style={{ backgroundColor: COLORS.bg_primary }}
    >
      {/* Tabs */}
      <div className="flex gap-4 mb-8">
        {TAB_CONFIG.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="px-6 py-3 rounded-lg font-semibold transition-all"
            style={{
              backgroundColor: activeTab === key ? COLORS.accent : COLORS.bg_card,
              color: activeTab === key ? '#1a1c1e' : COLORS.text_primary,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Active Planner Tab */}
      {activeTab === 'active' && (
        <div className="space-y-6">
          {/* Event Setup Card */}
          <div
            className="rounded-lg p-6 border"
            style={{
              backgroundColor: COLORS.bg_card,
              borderColor: COLORS.border,
            }}
          >
            <h2 className="text-2xl font-bold mb-6" style={{ color: COLORS.text_primary }}>
              Event Setup
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Event Type */}
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: COLORS.text_secondary }}
                >
                  Event Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: COLORS.bg_input,
                    borderColor: COLORS.border,
                    color: COLORS.text_primary,
                  }}
                >
                  <option value="KOTH">KOTH</option>
                  <option value="RR">RR</option>
                  <option value="SVS">SVS</option>
                </select>
              </div>

              {/* Event Name */}
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: COLORS.text_secondary }}
                >
                  Event Name
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: COLORS.bg_input,
                    borderColor: COLORS.border,
                    color: COLORS.text_primary,
                  }}
                />
              </div>

              {/* Number of Teams */}
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: COLORS.text_secondary }}
                >
                  Number of Teams
                </label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={numTeams}
                  onChange={(e) => setNumTeams(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: COLORS.bg_input,
                    borderColor: COLORS.border,
                    color: COLORS.text_primary,
                  }}
                />
              </div>

              {/* Selected Count */}
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: COLORS.text_secondary }}
                >
                  Selected Members
                </label>
                <div
                  className="px-3 py-2 rounded border flex items-center justify-center"
                  style={{
                    backgroundColor: COLORS.bg_input,
                    borderColor: COLORS.border,
                    color: COLORS.accent,
                  }}
                >
                  <span className="font-bold text-lg">{selectedMembers.length}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setShowMemberSelector(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold"
                style={{
                  backgroundColor: COLORS.bg_primary,
                  color: COLORS.text_primary,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <Plus size={18} />
                Select Members
              </button>
              <button
                onClick={handleAutoSplit}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold"
                style={{
                  backgroundColor: COLORS.accent,
                  color: '#1a1c1e',
                }}
              >
                ⚡ Auto-Split
              </button>
              <button
                onClick={handleSaveEvent}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold"
                style={{
                  backgroundColor: COLORS.success,
                  color: '#fff',
                }}
              >
                <Save size={18} />
                Save Event
              </button>
              <button
                onClick={handleClearTeams}
                className="flex items-center gap-2 px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: COLORS.bg_primary,
                  color: COLORS.text_secondary,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                Clear
              </button>
            </div>

            {/* Export Buttons */}
            <div className="mt-4 flex gap-3 flex-wrap">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold"
                style={{
                  backgroundColor: COLORS.accent,
                  color: '#1a1c1e',
                }}
              >
                <FileSpreadsheet size={16} />
                Export Excel
              </button>
              {['json', 'txt'].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => handleExport(fmt)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold"
                  style={{
                    backgroundColor: COLORS.bg_input,
                    color: COLORS.text_primary,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <DownloadCloud size={16} />
                  Export {fmt.toUpperCase()}
                </button>
              ))}
              <button
                onClick={handleExportPNG}
                className="flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold"
                style={{
                  backgroundColor: COLORS.bg_input,
                  color: COLORS.text_primary,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <Image size={16} />
                Export PNG
              </button>
              <button
                onClick={handleCopyToClipboard}
                className="flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold"
                style={{
                  backgroundColor: COLORS.accent,
                  color: '#1a1c1e',
                }}
              >
                <Copy size={16} />
                Copy to Clipboard
              </button>
              <button
                onClick={handleOpenTacticalMap}
                className="flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold"
                style={{
                  backgroundColor: COLORS.rr_blue,
                  color: '#ffffff',
                }}
              >
                <Map size={16} />
                🗺️ Tactical Map
              </button>
            </div>
          </div>

          {/* Selected Members */}
          <div
            className="rounded-lg p-6 border"
            style={{
              backgroundColor: COLORS.bg_card,
              borderColor: COLORS.border,
            }}
          >
            <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.text_primary }}>
              Selected Members ({selectedMembers.length})
              {reservePoolIds.length > 0 && (
                <span className="text-sm font-normal ml-2" style={{ color: COLORS.text_secondary }}>
                  ({availableForSplit.length} active, {reservePoolIds.length} in reserve)
                </span>
              )}
            </h3>
            {selectedMembers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                {selectedMembers.filter((m) => !reservePoolIds.includes(m.id)).map((member) => (
                  <div
                    key={member.id}
                    className="p-3 rounded flex items-center justify-between"
                    style={{ backgroundColor: COLORS.bg_primary }}
                  >
                    <span style={{ color: COLORS.text_primary }}>
                      {member.isGuest && <span title="SVS Guest">✈️ </span>}
                      {member.chief_name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        style={{ color: COLORS.text_secondary }}
                        className="text-sm font-mono"
                      >
                        {Math.round(calculateMasterScore(member, eventType))}
                      </span>
                      <button
                        onClick={() => setReservePoolIds([...reservePoolIds, member.id])}
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{ backgroundColor: COLORS.warning, color: '#1a1c1e' }}
                        title="Move to Reserve"
                      >
                        Reserve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: COLORS.text_muted }}>
                No members selected. Click &quot;Select Members&quot; to choose.
              </p>
            )}
          </div>

          {/* Reserve Pool */}
          {reservePoolMembers.length > 0 && (
            <div
              className="rounded-lg p-6 border-2"
              style={{
                backgroundColor: COLORS.bg_card,
                borderColor: COLORS.warning,
              }}
            >
              <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.warning }}>
                🪑 Reserve Pool ({reservePoolMembers.length})
              </h3>
              <p className="text-xs mb-3" style={{ color: COLORS.text_secondary }}>
                These members are excluded from Auto-Split. Click &quot;Activate&quot; to move back.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-36 overflow-y-auto">
                {reservePoolMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-3 rounded flex items-center justify-between"
                    style={{ backgroundColor: COLORS.bg_primary, opacity: 0.8 }}
                  >
                    <span style={{ color: COLORS.text_primary }}>
                      {member.isGuest && <span title="SVS Guest">✈️ </span>}
                      🪑 {member.chief_name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        style={{ color: COLORS.text_secondary }}
                        className="text-sm font-mono"
                      >
                        {Math.round(calculateMasterScore(member, eventType))}
                      </span>
                      <button
                        onClick={() => setReservePoolIds(reservePoolIds.filter((id) => id !== member.id))}
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{ backgroundColor: COLORS.success, color: '#ffffff' }}
                        title="Move back to Active"
                      >
                        Activate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teams Display */}
          {teams.length > 0 && (
            <div>
              <h3 className="text-2xl font-bold mb-6" style={{ color: COLORS.text_primary }}>
                Teams
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map((team, idx) => (
                  <TeamCard
                    key={idx}
                    teamNum={idx + 1}
                    members={team}
                    leaderId={teamLeaders[idx + 1] || null}
                    onLeaderChange={(memberId) => {
                      setTeamLeaders({ ...teamLeaders, [idx + 1]: memberId });
                    }}
                    eventType={eventType}
                    instructions={teamInstructions[idx + 1] || ''}
                    onInstructionsChange={(instr) => {
                      setTeamInstructions({
                        ...teamInstructions,
                        [idx + 1]: instr,
                      });
                    }}
                    onMemberDrop={handleMoveMember}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Team Balance & Stats */}
          {teams.length > 0 && (
            <div
              className="rounded-lg p-6 border"
              style={{
                backgroundColor: COLORS.bg_card,
                borderColor: COLORS.border,
              }}
            >
              <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.text_primary }}>
                Team Balance
              </h3>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span style={{ color: COLORS.text_secondary }}>Balance Score</span>
                  <span
                    className="text-lg font-bold"
                    style={{ color: EVENT_COLORS[eventType] || COLORS.accent }}
                  >
                    {stats.balancePercentage.toFixed(1)}%
                  </span>
                </div>
                <div
                  className="w-full h-3 rounded-full overflow-hidden"
                  style={{ backgroundColor: COLORS.bg_input }}
                >
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${stats.balancePercentage}%`,
                      backgroundColor: stats.balancePercentage > 80 ? COLORS.success : COLORS.warning,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                {stats.teams.map((team) => (
                  <div key={team.teamNum} className="p-3 rounded" style={{ backgroundColor: COLORS.bg_primary }}>
                    <div style={{ color: COLORS.text_secondary }}>Team {team.teamNum}</div>
                    <div style={{ color: COLORS.text_primary }} className="font-bold">
                      {team.memberCount} members
                    </div>
                    <div style={{ color: COLORS.accent }} className="font-mono">
                      Avg: {team.avgScore}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* General Instructions */}
          {teams.length > 0 && (
            <div
              className="rounded-lg p-6 border"
              style={{
                backgroundColor: COLORS.bg_card,
                borderColor: COLORS.koth_gold,
                borderWidth: '2px',
              }}
            >
              <h3 className="text-lg font-bold mb-4" style={{ color: COLORS.koth_gold }}>
                📢 General Instructions (All Teams)
              </h3>
              <textarea
                value={generalInstructions}
                onChange={(e) => setGeneralInstructions(e.target.value)}
                placeholder="Enter instructions that apply to all teams..."
                className="w-full px-4 py-3 rounded border"
                rows="4"
                style={{
                  backgroundColor: COLORS.bg_input,
                  borderColor: COLORS.border,
                  color: COLORS.text_primary,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Saved Events Tab */}
      {activeTab === 'saved' && (
        <div>
          <h2 className="text-2xl font-bold mb-6" style={{ color: COLORS.text_primary }}>
            Saved Events
          </h2>
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg p-4 border flex items-center justify-between"
                  style={{
                    backgroundColor: COLORS.bg_card,
                    borderColor: COLORS.border,
                  }}
                >
                  <div className="flex-1">
                    <h3 style={{ color: COLORS.text_primary }} className="font-bold flex items-center gap-2">
                      {event.event_name}
                      {(event.status === 'Deployed' || event.Status === 'Deployed') && (
                        <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: COLORS.success, color: '#fff' }}>
                          DEPLOYED
                        </span>
                      )}
                    </h3>
                    <p style={{ color: COLORS.text_secondary }} className="text-sm">
                      Type: {event.event_type} | Teams: {event.num_teams} | Members: {' '}
                      {event.teams?.reduce((sum, t) => sum + t.length, 0) || 0}
                    </p>
                    {event.created_at && (
                      <p style={{ color: COLORS.text_muted }} className="text-xs mt-1">
                        Created: {new Date(event.created_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {(event.status === 'Deployed' || event.Status === 'Deployed') ? (
                      <button
                        onClick={() => handleUndeployEvent(event)}
                        className="flex items-center gap-2 px-4 py-2 rounded font-semibold hover:opacity-80"
                        style={{
                          backgroundColor: COLORS.warning,
                          color: '#1a1c1e',
                        }}
                      >
                        Undeploy
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeployEvent(event)}
                        className="flex items-center gap-2 px-4 py-2 rounded font-semibold hover:opacity-80"
                        style={{
                          backgroundColor: COLORS.success,
                          color: '#ffffff',
                        }}
                      >
                        Deploy
                      </button>
                    )}
                    <button
                      onClick={() => handleLoadEvent(event)}
                      className="flex items-center gap-2 px-4 py-2 rounded font-semibold hover:opacity-80"
                      style={{
                        backgroundColor: COLORS.accent,
                        color: '#1a1c1e',
                      }}
                    >
                      <Upload size={18} />
                      Load
                    </button>
                    <button
                      onClick={() => handleMarkAsFinished(event)}
                      className="flex items-center gap-2 px-4 py-2 rounded font-semibold hover:opacity-80"
                      style={{
                        backgroundColor: COLORS.success,
                        color: '#ffffff',
                      }}
                    >
                      <CheckCircle size={18} />
                      Finished
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to delete "${event.event_name}"?`)) {
                          deleteEvent(event.id);
                        }
                      }}
                      className="p-2 rounded hover:opacity-80"
                      style={{ 
                        backgroundColor: COLORS.danger,
                        color: '#ffffff',
                      }}
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: COLORS.text_muted }}>No saved events yet</p>
          )}
        </div>
      )}

      {/* Events Done Tab */}
      {activeTab === 'done' && (
        <div>
          <h2 className="text-2xl font-bold mb-6" style={{ color: COLORS.text_primary }}>
            Events Done
          </h2>
          {finishedEvents.length > 0 ? (
            <div className="space-y-4">
              {finishedEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border overflow-hidden"
                  style={{
                    backgroundColor: COLORS.bg_card,
                    borderColor: expandedFinishedId === event.id ? COLORS.accent : COLORS.border,
                  }}
                >
                  {/* Header row — always visible */}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:opacity-90"
                    onClick={() =>
                      setExpandedFinishedId(
                        expandedFinishedId === event.id ? null : event.id
                      )
                    }
                  >
                    <div className="flex-1">
                      <h3 style={{ color: COLORS.text_primary }} className="font-bold text-lg">
                        {event.event_name}
                      </h3>
                      <p style={{ color: COLORS.text_secondary }} className="text-sm">
                        Type: {event.event_type} | Teams: {event.teams?.length || 0} | Finished: {' '}
                        {new Date(event.finishedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {event.outcome && (
                        <span
                          className="px-3 py-1 rounded-full text-sm font-bold"
                          style={{
                            backgroundColor:
                              event.outcome === 'Winner' ? COLORS.success : COLORS.danger,
                            color: '#fff',
                          }}
                        >
                          <Trophy size={14} className="inline mr-1" />
                          {event.outcome}
                        </span>
                      )}
                      <span style={{ color: COLORS.text_muted }}>
                        {expandedFinishedId === event.id ? '▲' : '▼'}
                      </span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expandedFinishedId === event.id && (
                    <div
                      id={`finished-event-${event.id}`}
                      className="p-6 border-t"
                      style={{ borderColor: COLORS.border, backgroundColor: COLORS.bg_primary }}
                    >
                      {/* Outcome selector */}
                      <div className="mb-6">
                        <label
                          className="block text-sm font-semibold mb-2"
                          style={{ color: COLORS.text_secondary }}
                        >
                          Outcome
                        </label>
                        <div className="flex gap-3">
                          {['Winner', 'Loser'].map((opt) => (
                            <button
                              key={opt}
                              onClick={() => updateFinishedEvent(event.id, { outcome: opt })}
                              className="px-5 py-2 rounded-lg font-semibold transition-all"
                              style={{
                                backgroundColor:
                                  event.outcome === opt
                                    ? opt === 'Winner'
                                      ? COLORS.success
                                      : COLORS.danger
                                    : COLORS.bg_card,
                                color:
                                  event.outcome === opt ? '#fff' : COLORS.text_secondary,
                                border: `1px solid ${
                                  event.outcome === opt
                                    ? 'transparent'
                                    : COLORS.border
                                }`,
                              }}
                            >
                              {opt === 'Winner' ? '🏆' : '❌'} {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Rapport textarea */}
                      <div className="mb-6">
                        <label
                          className="block text-sm font-semibold mb-2"
                          style={{ color: COLORS.text_secondary }}
                        >
                          Final Rapport
                        </label>
                        <textarea
                          value={event.rapport || ''}
                          onChange={(e) =>
                            updateFinishedEvent(event.id, { rapport: e.target.value })
                          }
                          placeholder="Write the final rapport on this event..."
                          className="w-full px-4 py-3 rounded border"
                          rows="4"
                          style={{
                            backgroundColor: COLORS.bg_input,
                            borderColor: COLORS.border,
                            color: COLORS.text_primary,
                          }}
                        />
                      </div>

                      {/* Participants list */}
                      <div className="mb-6">
                        <h4
                          className="text-md font-bold mb-3"
                          style={{ color: COLORS.text_primary }}
                        >
                          Participants
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {event.teams.map((team, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg p-4 border"
                              style={{
                                backgroundColor: COLORS.bg_card,
                                borderColor: COLORS.border,
                              }}
                            >
                              <h5
                                className="font-bold mb-2"
                                style={{ color: COLORS.accent }}
                              >
                                Team {idx + 1} ({team.length} members)
                              </h5>
                              <ul className="space-y-1">
                                {team.map((entry, i) => {
                                  const m = resolveMember(entry);
                                  return (
                                    <li
                                      key={i}
                                      className="text-sm"
                                      style={{ color: COLORS.text_primary }}
                                    >
                                      • {m ? m.chief_name : entry}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Export + Delete buttons */}
                      <div className="flex gap-3 flex-wrap">
                        <button
                          onClick={() => setShowAAR(event)}
                          className="flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold"
                          style={{
                            backgroundColor: event.outcome === 'Winner' ? '#f1c40f' : '#3498db',
                            color: '#1a1c1e',
                          }}
                        >
                          <Trophy size={16} />
                          View AAR
                        </button>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete finished event "${event.event_name}"?`
                              )
                            ) {
                              deleteFinishedEvent(event.id);
                              setExpandedFinishedId(null);
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold ml-auto"
                          style={{
                            backgroundColor: COLORS.danger,
                            color: '#ffffff',
                          }}
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: COLORS.text_muted }}>No finished events yet</p>
          )}
        </div>
      )}

      {/* Member Selector Modal */}
      {showMemberSelector && (
        <MemberSelector
          members={members}
          selectedIds={selectedMemberIds}
          onSelectionChange={setSelectedMemberIds}
          onClose={() => setShowMemberSelector(false)}
        />
      )}

      {/* Tactical Map Dialog */}
      <TacticalMapDialog
        isOpen={showTacticalMap}
        onClose={() => setShowTacticalMap(false)}
        teams={teams}
        teamInstructions={teamInstructions}
        eventType={eventType}
      />

      {/* After Action Report Dialog */}
      {showAAR && (
        <EventReportView
          event={showAAR}
          onClose={() => setShowAAR(null)}
        />
      )}
    </div>
  );
};

export default EventPlanner;
