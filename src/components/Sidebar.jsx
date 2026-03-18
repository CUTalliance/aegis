import React, { useState, useEffect } from 'react';
import { Sword, Users, Target, Info, Megaphone, Download, ClipboardList, Upload, LogOut, Settings, Key } from 'lucide-react';
import { COLORS } from '../utils/theme';
import AboutDialog from './AboutDialog';
import { useMembersStore } from '../store/membersStore';
import { useEventsStore } from '../store/eventsStore';
import { useAuthStore } from '../store/authStore';
import { publishPlanToGithub } from '../services/githubSync';

const Sidebar = ({ currentPage, onPageChange }) => {
  const [showAbout, setShowAbout] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [publishStatus, setPublishStatus] = useState(null); // 'loading' | 'success' | 'error'
  const [publishMsg, setPublishMsg] = useState('');
  const [blinkSync, setBlinkSync] = useState(false);

  const role = useAuthStore((s) => s.role);
  const logout = useAuthStore((s) => s.logout);
  const isR4 = role === 'R4';

  const members = useMembersStore((state) => state.members);
  const events = useEventsStore((state) => state.events);
  const finishedEvents = useEventsStore((state) => state.finishedEvents);
  const fileInputRef = React.useRef(null);

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Sword, adminOnly: false },
    { id: 'my-orders', label: 'My Orders', icon: ClipboardList, adminOnly: false },
    { id: 'roster', label: 'Member List', icon: Users, adminOnly: true },
    { id: 'planner', label: 'Event Planner', icon: Target, adminOnly: true },
  ];

  const navItems = allNavItems.filter((item) => !item.adminOnly || isR4);

  // --- Publish to Alliance ---
  const handlePublish = async () => {
    const token = localStorage.getItem('github_pat');
    if (!token) {
      setShowTokenModal(true);
      return;
    }

    setPublishStatus('loading');
    setPublishMsg('');

    const data = {
      members: useMembersStore.getState().members,
      events: useEventsStore.getState().events,
      finishedEvents: useEventsStore.getState().finishedEvents,
      mapLayout: JSON.parse(localStorage.getItem('aegis_map_layout') || '{}'),
      announcement: localStorage.getItem('aegis_announcement') || '',
      publishedAt: new Date().toISOString(),
    };

    const result = await publishPlanToGithub(data, token);
    setPublishStatus(result.success ? 'success' : 'error');
    setPublishMsg(result.message);

    setTimeout(() => {
      setPublishStatus(null);
      setPublishMsg('');
    }, 4000);
  };

  // --- Token Modal ---
  const handleSaveToken = () => {
    if (tokenInput.trim()) {
      localStorage.setItem('github_pat', tokenInput.trim());
    }
    setTokenInput('');
    setShowTokenModal(false);
  };

  const handleClearToken = () => {
    localStorage.removeItem('github_pat');
    setTokenInput('');
    setShowTokenModal(false);
  };

  // --- Backup / Restore (R4 only) ---
  const handleBackup = () => {
    try {
      const backupData = {
        members: members,
        events: events,
        finishedEvents: finishedEvents,
        mapLayout: JSON.parse(localStorage.getItem('aegis_map_layout') || '{}'),
        exportedAt: new Date().toISOString(),
      };
      const json = JSON.stringify(backupData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aegis-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert('✅ Backup saved successfully! Keep this file safe.');
    } catch (error) {
      console.error('Backup error:', error);
      alert('❌ Backup failed. Please try again or contact Ash-baal.');
    }
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let text;
    try {
      text = await file.text();
    } catch (err) {
      console.error('Failed to read file:', err);
      alert('Unable to read the selected file. Please choose a valid backup.');
      e.target.value = '';
      return;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      alert('This file is not a valid Aegis backup. Please select the correct file.');
      e.target.value = '';
      return;
    }

    const incomingMembers = data.members || [];
    const incomingEvents = data.events || [];
    const incomingFinished = data.finishedEvents || [];
    const incomingMap = data.mapLayout || {};
    // current-event removed; ignore currentEvent from backups

    const replace = window.confirm(
      'How would you like to restore?\n\nOK = Replace all current data with the backup.\nCancel = Merge new members and events into existing data.'
    );

    try {
      if (replace) {
        useMembersStore.getState().importMembers(JSON.stringify(incomingMembers || []));
      } else {
        useMembersStore.getState().syncMembers(incomingMembers || []);
      }

      const eventsState = useEventsStore.getState();
      if (replace) {
        eventsState.importEvents(JSON.stringify({
          events: incomingEvents || [],
          finishedEvents: incomingFinished || [],
          mapLayout: incomingMap || {},
        }));
      } else {
        const existing = eventsState.events || [];
        const existingFinished = eventsState.finishedEvents || [];
        const mergedEvents = [
          ...(incomingEvents || []).filter((ev) => !existing.some((x) => x.id === ev.id)),
          ...existing,
        ];
        const mergedFinished = [
          ...(incomingFinished || []).filter((ev) => !existingFinished.some((x) => x.id === ev.id)),
          ...existingFinished,
        ];
        const mergedMap = { ...(eventsState.mapLayout || {}), ...(incomingMap || {}) };
        eventsState.importEvents(JSON.stringify({
          events: mergedEvents,
          finishedEvents: mergedFinished,
          mapLayout: mergedMap,
        }));
      }

      // no-op: current-event handling removed

      alert('✅ Backup restored successfully!');
    } catch (err) {
      console.error('Restore error:', err);
      alert('❌ Restore failed. The backup file may be corrupted. Please try again or contact Ash-baal.');
    } finally {
      e.target.value = '';
    }
  };

  // logout guard: ask R4 to sync before leaving
  useEffect(() => {
    if (!isR4) return undefined;
    const beforeUnload = (e) => {
      // modern browsers show a native prompt when returnValue is set
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [isR4]);

  const handleLogoutAttempt = () => {
    const confirmed = window.confirm('Have you synchronized the data to the Alliance?\n\nPress OK to proceed with logout, Cancel to stay and synchronize.');
    if (confirmed) {
      logout();
    } else {
      setBlinkSync(true);
      setTimeout(() => setBlinkSync(false), 4000);
    }
  };

  return (
    <div
      className="no-print w-56 h-screen flex flex-col"
      style={{ backgroundColor: COLORS.sidebar }}
    >
      {/* Branding */}
      <div className="px-6 py-8 border-b border-[#444950]">
        <div className="text-center">
          <div className="text-4xl font-bold mb-2" style={{ color: COLORS.accent }}>⚔</div>
          <h1 className="text-lg font-bold text-white mb-1">Aegis Planner</h1>
          <p className="text-sm font-bold mb-2" style={{ color: COLORS.accent }}>
            CUT Alliance Strategic Manager
          </p>
          <p className="text-xs italic" style={{ color: COLORS.text_muted }}>
            Calm Until Troubled
          </p>
          {/* Role badge */}
          <div
            className="mt-3 inline-block px-3 py-1 rounded-full text-xs font-bold"
            style={{
              backgroundColor: isR4 ? `${COLORS.accent}30` : `${COLORS.rr_blue}30`,
              color: isR4 ? COLORS.accent : COLORS.rr_blue,
            }}
          >
            {isR4 ? '⭐ R4 Officer' : '🛡️ Member'}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onPageChange(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
              currentPage === id ? 'font-semibold' : 'hover:opacity-80'
            }`}
            title={`Go to ${label}`}
            style={{
              backgroundColor: currentPage === id ? COLORS.accent : 'transparent',
              color: currentPage === id ? '#1a1c1e' : COLORS.text_primary,
            }}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}

        {/* R4-only: Publish to Alliance (synchronize) */}
        {isR4 && (
          <>
            <div className="mt-8 mb-2 px-2">
              <p style={{ color: COLORS.danger, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                Reminder: synchronize the data to the Alliance before leaving or logging out.
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: COLORS.text_muted }}>
                Alliance Sync
              </p>
            </div>

            <style>{`@keyframes blink-border { 0% { box-shadow: 0 0 0 0 rgba(255,0,0,0.0); } 50% { box-shadow: 0 0 0 6px rgba(255,0,0,0.12); } 100% { box-shadow: 0 0 0 0 rgba(255,0,0,0.0); } }`}</style>

            <button
              onClick={handlePublish}
              disabled={publishStatus === 'loading'}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all hover:opacity-90"
              title="Synchronize current plan to the Alliance (GitHub)"
              style={{
                backgroundColor: publishStatus === 'success' ? COLORS.success
                  : publishStatus === 'error' ? COLORS.danger
                  : COLORS.accent,
                color: '#1a1c1e',
                cursor: publishStatus === 'loading' ? 'wait' : 'pointer',
                animation: blinkSync ? 'blink-border 1s infinite' : 'none',
                border: blinkSync ? `2px solid ${COLORS.danger}` : undefined,
              }}
            >
              <Upload size={20} />
              <span className="text-sm font-semibold">
                {publishStatus === 'loading' ? 'Publishing...'
                  : publishStatus === 'success' ? 'Published!'
                  : publishStatus === 'error' ? 'Failed!'
                  : 'synchronize the data'}
              </span>
            </button>

            {publishMsg && (
              <p className="text-xs px-2 mb-2" style={{ color: publishStatus === 'error' ? COLORS.danger : COLORS.success }}>
                {publishMsg}
              </p>
            )}

            <button
              onClick={() => {
                setTokenInput(localStorage.getItem('github_pat') || '');
                setShowTokenModal(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all hover:opacity-80"
              title="Set or update the R4 command key"
              style={{ backgroundColor: '#ffffff10', color: 'white' }}
            >
              <Key size={20} />
              <span className="text-sm">Command Key</span>
            </button>

            {/* Backup / Restore */}
            <div className="mt-2">
              <button
                onClick={handleBackup}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all hover:opacity-80"
                title="Download a local backup of current data"
                style={{ backgroundColor: '#ffffff10', color: 'white' }}
              >
                <Download size={20} />
                <span className="text-sm">Backup Data</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                onClick={handleRestoreClick}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-all hover:opacity-80"
                title="Restore data from a backup file"
                style={{ backgroundColor: '#ffffff10', color: 'white' }}
              >
                <Download size={20} />
                <span className="text-sm">Restore Backup</span>
              </button>
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[#444950] space-y-2">
        <button
          onClick={isR4 ? handleLogoutAttempt : logout}
          className="w-full flex items-center justify-center gap-2 text-xs hover:opacity-80 transition-opacity cursor-pointer py-2 rounded"
          title="Log out of Aegis Planner"
          style={{ color: COLORS.danger, backgroundColor: `${COLORS.danger}15` }}
        >
          <LogOut size={14} />
          Logout
        </button>
        <button
          onClick={() => setShowAbout(true)}
          className="w-full flex items-center justify-center gap-2 text-xs hover:opacity-80 transition-opacity cursor-pointer"
          title="About Aegis Planner"
          style={{ color: COLORS.text_muted }}
        >
          <Info size={14} />
          v3.2.0 — About
        </button>
      </div>

      <AboutDialog isOpen={showAbout} onClose={() => setShowAbout(false)} />

      {/* Token Settings Modal */}
      {showTokenModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          onClick={() => setShowTokenModal(false)}
        >
          <div
            className="rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl border"
            style={{ backgroundColor: COLORS.bg_card, borderColor: COLORS.border }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <Settings size={24} style={{ color: COLORS.accent }} />
              <h2 className="text-xl font-bold text-white">R4 Command Key</h2>
            </div>

            <p className="text-sm mb-4" style={{ color: COLORS.text_secondary }}>
              Enter the R4 Command Key provided by Ash-baal.
              You only need to enter this secure code once per device.
            </p>

            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="Enter your command key..."
              className="w-full px-4 py-3 rounded-lg border mb-4"
              style={{
                backgroundColor: COLORS.bg_input,
                borderColor: COLORS.border,
                color: COLORS.text_primary,
              }}
            />

            <div className="flex gap-3">
              <button
                onClick={handleSaveToken}
                className="flex-1 py-2 rounded-lg font-semibold"
                title="Save the R4 command key to this device"
                style={{ backgroundColor: COLORS.accent, color: '#1a1c1e' }}
              >
                Save Key
              </button>
              <button
                onClick={handleClearToken}
                className="py-2 px-4 rounded-lg font-semibold border"
                title="Clear the saved command key from this device"
                style={{
                  backgroundColor: COLORS.bg_primary,
                  borderColor: COLORS.danger,
                  color: COLORS.danger,
                }}
              >
                Clear
              </button>
              <button
                onClick={() => setShowTokenModal(false)}
                className="py-2 px-4 rounded-lg font-semibold border"
                title="Cancel and close token dialog"
                style={{
                  backgroundColor: COLORS.bg_primary,
                  borderColor: COLORS.border,
                  color: COLORS.text_primary,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
