import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { COLORS } from '../utils/theme';

const MemberSelector = ({ members, selectedIds, onSelectionChange, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMembers = members.filter((m) =>
    m.chief_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggle = (id) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    const filteredIds = filteredMembers.map((m) => m.id);
    const allFilteredSelected = filteredIds.every((id) => selectedIds.includes(id));

    if (allFilteredSelected) {
      // Deselect only the filtered ones
      onSelectionChange(selectedIds.filter((id) => !filteredIds.includes(id)));
    } else {
      // Select the filtered ones, merging with existing selection
      const newSelections = new Set([...selectedIds, ...filteredIds]);
      onSelectionChange(Array.from(newSelections));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className="rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: COLORS.bg_card }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{ color: COLORS.text_primary }}>
            Select Members
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:opacity-80"
            style={{ color: COLORS.text_primary }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Search bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 rounded border"
            style={{
              backgroundColor: COLORS.bg_input,
              borderColor: COLORS.border,
              color: COLORS.text_primary,
            }}
          />
        </div>

        {/* Select All button */}
        <button
          onClick={handleSelectAll}
          className="mb-4 px-4 py-2 rounded font-semibold"
          style={{
            backgroundColor: COLORS.bg_primary,
            color: COLORS.accent,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          {selectedIds.length === members.length ? 'Deselect All' : 'Select All'}
        </button>

        {/* Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 max-h-96 overflow-y-auto">
          {filteredMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => handleToggle(member.id)}
              className="p-3 rounded border text-left transition-all flex items-center gap-3"
              style={{
                backgroundColor: selectedIds.includes(member.id)
                  ? COLORS.accent
                  : COLORS.bg_input,
                borderColor: selectedIds.includes(member.id)
                  ? COLORS.accent
                  : COLORS.border,
                color: selectedIds.includes(member.id)
                  ? '#1a1c1e'
                  : COLORS.text_primary,
              }}
            >
              <div
                className="w-5 h-5 rounded border flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: selectedIds.includes(member.id)
                    ? COLORS.accent
                    : 'transparent',
                  borderColor: COLORS.border,
                }}
              >
                {selectedIds.includes(member.id) && <Check size={16} />}
              </div>
              <div className="flex-1">
                <div className="font-semibold">
                  {member.isGuest && <span title="SVS Guest">✈️ </span>}
                  {member.chief_name}
                </div>
                <div className="text-xs opacity-75">
                  Base: {member.base_power} | AP: {member.aeroplane_power}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded font-semibold"
            style={{
              backgroundColor: COLORS.accent,
              color: '#1a1c1e',
            }}
          >
            Done
          </button>
          <button
            onClick={() => onSelectionChange([])}
            className="flex-1 py-2 rounded font-semibold border"
            style={{
              backgroundColor: COLORS.bg_primary,
              borderColor: COLORS.border,
              color: COLORS.text_primary,
            }}
          >
            Clear Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberSelector;
