import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Search, Download, Upload, UserMinus } from 'lucide-react';
import { useMembersStore } from '../store/membersStore';
import MemberForm from '../components/MemberForm';
import { COLORS } from '../utils/theme';
import { exportMembersToExcel, importMembersFromExcel } from '../services/excelExport';

const Roster = () => {
  const members = useMembersStore((state) => state.members);
  const getMember = useMembersStore((state) => state.getMember);
  const addMember = useMembersStore((state) => state.addMember);
  const updateMember = useMembersStore((state) => state.updateMember);
  const deleteMember = useMembersStore((state) => state.deleteMember);
  const purgeGuests = useMembersStore((state) => state.purgeGuests);
  const initialize = useMembersStore((state) => state.initialize);
  const exportMembers = useMembersStore((state) => state.exportMembers);
  const importMembers = useMembersStore((state) => state.importMembers);
  const syncMembers = useMembersStore((state) => state.syncMembers);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleAddMember = (data) => {
    try {
      if (editingId) {
        updateMember(editingId, data);
        setEditingId(null);
        alert('✅ Member updated successfully!');
      } else {
        addMember(data);
        alert('✅ Member added successfully!');
      }
      setShowForm(false);
    } catch (error) {
      console.error('Error saving member:', error);
      alert('❌ Failed to save member: ' + error.message);
    }
  };

  const handleEditClick = (id) => {
    setEditingId(id);
    setShowForm(true);
  };

  const handleDeleteClick = (id) => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      try {
        deleteMember(id);
        alert('✅ Member deleted successfully!');
      } catch (error) {
        console.error('Error deleting member:', error);
        alert('❌ Failed to delete member: ' + error.message);
      }
    }
  };

  const handleExportJSON = () => {
    try {
      const jsonData = exportMembers();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aegis-members-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert('✅ Members exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Failed to export members: ' + error.message);
    }
  };

  const handleExportCSV = () => {
    try {
      let csv = 'Chief Name,Base Power,Aeroplane Level,Aeroplane Power,Barracks Plasma,Range Plasma,Garage Plasma,T11 Infantry,T11 Hunter,T11 Rider,KOTH Score,RR Score\n';
      
      members.forEach((member) => {
        csv += `"${member.chief_name}",${member.base_power},"${member.aeroplane_level}",${member.aeroplane_power},"${member.barracks_plasma}","${member.range_plasma}","${member.garage_plasma}",${member.t11_infantry},${member.t11_hunter},${member.t11_rider},${member.score_koth},${member.score_rr}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aegis-members-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert('✅ Members exported to CSV successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Failed to export CSV: ' + error.message);
    }
  };

  const handleExportExcel = () => {
    try {
      if (members.length === 0) {
        alert('⚠️ No members to export');
        return;
      }
      const filename = exportMembersToExcel(members);
      alert(`✅ Members exported to Excel successfully!\nFile: ${filename}`);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('❌ Failed to export to Excel: ' + error.message);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const fileName = file.name.toLowerCase();
      let importedMembers = [];

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        importedMembers = await importMembersFromExcel(file);
      } else if (fileName.endsWith('.json')) {
        const jsonString = await file.text();
        importedMembers = JSON.parse(jsonString);
      } else {
        alert('⚠️ Unsupported file format. Please select a JSON or Excel (.xlsx) file.');
        return;
      }

      if (!importedMembers || importedMembers.length === 0) {
        throw new Error('No valid members found in the file');
      }

      if (window.confirm('Do you want to sync members? This will update existing members and add new ones.')) {
        const { updatedCount, addedCount } = syncMembers(importedMembers);
        alert(`✅ Sync complete!\n- ${updatedCount} members updated\n- ${addedCount} members added`);
      } else if (window.confirm('Do you want to replace all members? This will delete all current members and import the new list.')) {
        importMembers(JSON.stringify(importedMembers));
        alert(`✅ Successfully replaced all members with ${importedMembers.length} new members!`);
      }

    } catch (error) {
      console.error('Import error:', error);
      alert('❌ Failed to import members:\n' + error.message);
    }
    
    event.target.value = '';
  };

  const filteredMembers = members.filter((member) =>
    member.chief_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      className="min-h-screen p-8"
      style={{ backgroundColor: COLORS.bg_primary }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold" style={{ color: COLORS.text_primary }}>
              Member List
            </h1>
            <span 
              className="px-3 py-1 rounded-full text-sm font-bold"
              style={{ 
                backgroundColor: COLORS.accent, 
                color: '#1a1c1e' 
              }}>
              {members.length} {members.length === 1 ? 'member' : 'members'}
            </span>
          </div>
          <p style={{ color: COLORS.text_secondary }}>
            Manage your alliance members and track their statistics
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleImportClick}
            className="flex items-center gap-2 px-4 py-3 rounded-lg font-semibold"
            title="Import members from a JSON or Excel file"
            style={{
              backgroundColor: COLORS.bg_input,
              color: COLORS.text_primary,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <Upload size={20} />
            Import
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-3 rounded-lg font-semibold"
            title="Export members to an Excel file"
            style={{
              backgroundColor: COLORS.bg_input,
              color: COLORS.text_primary,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <Download size={20} />
            Export Excel
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-4 py-3 rounded-lg font-semibold"
            title="Export members as JSON"
            style={{
              backgroundColor: COLORS.bg_input,
              color: COLORS.text_primary,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <Download size={20} />
            Export JSON
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-3 rounded-lg font-semibold"
            title="Export members as CSV"
            style={{
              backgroundColor: COLORS.bg_input,
              color: COLORS.text_primary,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <Download size={20} />
            Export CSV
          </button>
          {members.some((m) => m.isGuest) && (
            <button
              onClick={() => {
                if (window.confirm('Purge all temporary SVS guests from the roster?')) {
                  const count = purgeGuests();
                  alert(`✅ ${count} guest(s) removed from roster.`);
                }
              }}
              className="flex items-center gap-2 px-4 py-3 rounded-lg font-semibold"
              title="Remove all temporary SVS guest members from roster"
              style={{
                backgroundColor: COLORS.danger,
                color: '#ffffff',
              }}
            >
              <UserMinus size={20} />
              Purge Guests
            </button>
          )}
          <button
            onClick={() => {
              setEditingId(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 px-4 py-3 rounded-lg font-semibold"
            title="Add a new member to the roster"
            style={{
              backgroundColor: COLORS.accent,
              color: '#1a1c1e',
            }}
          >
            <Plus size={20} />
            Add Member
          </button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.xlsx,.xls"
        onChange={handleFileImport}
        className="hidden"
      />

      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex items-center gap-2 px-4 rounded-lg border" style={{
          backgroundColor: COLORS.bg_card,
          borderColor: COLORS.border,
        }}>
          <Search size={20} style={{ color: COLORS.text_secondary }} />
          <input
            type="text"
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 py-3 bg-transparent text-white outline-none"
            style={{ color: COLORS.text_primary }}
          />
        </div>
      </div>

      {/* Members Table */}
      <div className="rounded-lg overflow-hidden border" style={{
        backgroundColor: COLORS.bg_card,
        borderColor: COLORS.border,
      }}>
        {filteredMembers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: COLORS.bg_primary }}>
                <tr>
                  <th className="px-6 py-4 text-left font-semibold" style={{ color: COLORS.accent }}>
                    Chief Name
                  </th>
                  <th className="px-6 py-4 text-left font-semibold" style={{ color: COLORS.accent }}>
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left font-semibold" style={{ color: COLORS.accent }}>
                    Combat Role
                  </th>
                  <th className="px-6 py-4 text-left font-semibold" style={{ color: COLORS.accent }}>
                    Base Power
                  </th>
                  <th className="px-6 py-4 text-left font-semibold" style={{ color: COLORS.accent }}>
                    Aeroplane
                  </th>
                  <th className="px-6 py-4 text-left font-semibold" style={{ color: COLORS.accent }}>
                    T11 Units
                  </th>
                  <th className="px-6 py-4 text-left font-semibold" style={{ color: COLORS.accent }}>
                    Scores
                  </th>
                  <th className="px-6 py-4 text-center font-semibold" style={{ color: COLORS.accent }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member, idx) => (
                  <tr
                    key={member.id}
                    style={{
                      backgroundColor: idx % 2 === 0 ? COLORS.bg_card : COLORS.bg_primary,
                    }}
                  >
                    <td className="px-6 py-4" style={{ color: COLORS.text_primary }}>
                      <div className="font-semibold">
                        {member.isGuest && <span title="SVS Guest">✈️ </span>}
                        {member.chief_name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-2 py-1 rounded text-xs font-bold"
                        style={{
                          backgroundColor:
                            member.Rank === 'R5' ? COLORS.koth_gold :
                            member.Rank === 'R4' ? COLORS.accent :
                            COLORS.bg_input,
                          color:
                            member.Rank === 'R5' || member.Rank === 'R4' ? '#1a1c1e' : COLORS.text_secondary,
                        }}
                      >
                        {member.Rank || 'R1'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="px-2 py-1 rounded text-xs font-bold"
                        style={{
                          backgroundColor:
                            member.CombatRole === 'Rally Leader' ? COLORS.svs_red :
                            member.CombatRole === 'Garrison' ? COLORS.rr_blue :
                            member.CombatRole === 'Reserve' ? COLORS.warning :
                            COLORS.bg_input,
                          color:
                            member.CombatRole === 'Rally Leader' || member.CombatRole === 'Garrison'
                              ? '#ffffff'
                              : member.CombatRole === 'Reserve' ? '#1a1c1e' : COLORS.text_secondary,
                        }}
                      >
                        {member.CombatRole || 'Joiner'}
                      </span>
                    </td>
                    <td className="px-6 py-4" style={{ color: COLORS.text_secondary }}>
                      {member.base_power.toLocaleString()}
                    </td>
                    <td className="px-6 py-4" style={{ color: COLORS.text_secondary }}>
                      {member.aeroplane_level} ({member.aeroplane_power.toLocaleString()})
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1">
                        {member.t11_infantry && (
                          <span
                            className="px-2 py-1 rounded text-xs font-bold"
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
                            className="px-2 py-1 rounded text-xs font-bold"
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
                            className="px-2 py-1 rounded text-xs font-bold"
                            style={{
                              backgroundColor: COLORS.badge_on,
                              color: '#fff',
                            }}
                          >
                            R
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4" style={{ color: COLORS.text_secondary }}>
                      <div className="font-mono text-sm">
                        K: {member.score_koth} | R: {member.score_rr}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditClick(member.id)}
                          className="p-2 rounded hover:opacity-80"
                          style={{ color: COLORS.accent }}
                          title="Edit this member"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(member.id)}
                          className="p-2 rounded hover:opacity-80"
                          style={{ color: COLORS.danger }}
                          title="Delete this member"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center" style={{ color: COLORS.text_muted }}>
            {searchTerm ? 'No members found matching your search' : 'No members yet. Add one to get started!'}
          </div>
        )}
      </div>

      {/* Member Form Modal */}
      {showForm && (
        <MemberForm
          member={editingId ? getMember(editingId) : null}
          onSave={handleAddMember}
          onCancel={() => {
            setShowForm(false);
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
};

export default Roster;
