import React, { useState } from 'react';
import { EVENT_COLORS, COLORS } from '../utils/theme';
import { calculateMasterScore } from '../utils/balancer';

const TeamCard = ({ teamNum, members, leaderId, onLeaderChange, eventType, instructions, onInstructionsChange, onMemberDrop }) => {
  const [dragOverActive, setDragOverActive] = useState(false);
  const totalScore = members.reduce((sum, m) => sum + calculateMasterScore(m, eventType), 0);
  const avgScore = members.length > 0 ? totalScore / members.length : 0;
  const eventColor = EVENT_COLORS[eventType] || COLORS.accent;

  const handleDragStart = (e, member) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ memberId: member.id, fromTeam: teamNum }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverActive(true);
  };

  const handleDragLeave = () => {
    setDragOverActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOverActive(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.fromTeam !== teamNum && onMemberDrop) {
        onMemberDrop(data.memberId, data.fromTeam, teamNum);
      }
    } catch { /* ignore invalid drops */ }
  };

  return (
    <div
      className="rounded-lg p-6 border-2 transition-all"
      style={{
        backgroundColor: dragOverActive ? COLORS.bg_card_hover : COLORS.bg_card,
        borderColor: dragOverActive ? COLORS.accent : eventColor,
        opacity: dragOverActive ? 0.95 : 1,
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Team Header */}
      <div className="mb-4">
        <h3 className="text-xl font-bold mb-2 flex items-center justify-between" style={{ color: eventColor }}>
          <span>
            {leaderId && members.find(m => m.id === leaderId) 
               ? `Team ${members.find(m => m.id === leaderId).chief_name}` 
               : `Team ${teamNum}`}
          </span>
        </h3>
        <div className="space-y-1">
          <p style={{ color: COLORS.text_secondary }}>
            Members: <span style={{ color: '#fff' }} className="font-bold">{members.length}</span>
          </p>
          <p style={{ color: COLORS.text_secondary }}>
            Total Score: <span style={{ color: '#fff' }} className="font-bold">{Math.round(totalScore)}</span>
          </p>
          <p style={{ color: COLORS.text_secondary }}>
            Avg Score: <span style={{ color: eventColor }} className="font-bold">{Math.round(avgScore)}</span>
          </p>
        </div>
      </div>

      {/* Members List */}
      <div className="mb-4 space-y-2">
        <h4 style={{ color: COLORS.text_secondary }} className="text-sm font-semibold">
          Members <span className="text-xs font-normal italic" style={{ color: COLORS.text_muted }}>(drag to reorder)</span>
        </h4>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {members.map((member, idx) => (
            <div
              key={idx}
              className="p-2 rounded text-sm cursor-grab active:cursor-grabbing"
              style={{ backgroundColor: COLORS.bg_primary }}
              draggable
              onDragStart={(e) => handleDragStart(e, member)}
            >
              <div className="flex items-center justify-between">
                <span style={{ color: COLORS.text_primary }} className="flex items-center gap-2">
                  <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       onLeaderChange(leaderId === member.id ? null : member.id);
                     }}
                     className="focus:outline-none hover:scale-110 transition-transform"
                     title={leaderId === member.id ? "Remove Team Leader" : "Make Team Leader"}
                  >
                     {leaderId === member.id ? "⭐" : <span className="text-gray-600 hover:text-gray-400">☆</span>}
                  </button>
                  {member.isGuest && <span title="SVS Guest">✈️ </span>}
                  {member.chief_name}
                </span>
                <span style={{ color: COLORS.text_secondary }} className="font-mono">
                  {Math.round(calculateMasterScore(member, eventType))}
                </span>
              </div>
              {/* T11 Badges */}
              <div className="flex gap-1 mt-1">
                {member.t11_infantry && (
                  <span
                    className="px-1 py-0.5 rounded text-xs font-bold"
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
                    className="px-1 py-0.5 rounded text-xs font-bold"
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
                    className="px-1 py-0.5 rounded text-xs font-bold"
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
      </div>

      {/* Team Instructions */}
      <div>
        <label
          className="block text-sm font-semibold mb-2"
          style={{ color: COLORS.text_secondary }}
        >
          Team Instructions
        </label>
        <textarea
          value={instructions}
          onChange={(e) => onInstructionsChange(e.target.value)}
          placeholder="Add specific instructions for this team..."
          className="w-full px-3 py-2 rounded border text-xs"
          rows="3"
          style={{
            backgroundColor: COLORS.bg_input,
            borderColor: COLORS.border,
            color: COLORS.text_primary,
          }}
        />
      </div>
    </div>
  );
};

export default TeamCard;
