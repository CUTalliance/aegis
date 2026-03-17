import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import Roster from './views/Roster';
import EventPlanner from './views/EventPlanner';
import CurrentEvent from './views/CurrentEvent';
import MyOrders from './views/MyOrders';
import Login from './views/Login';
import { COLORS } from './utils/theme';
import { useAuthStore } from './store/authStore';
import { useMembersStore } from './store/membersStore';
import { useEventsStore } from './store/eventsStore';
import { fetchLatestPlan } from './services/githubSync';

function App() {
  const role = useAuthStore((s) => s.role);
  const login = useAuthStore((s) => s.login);
  const isR4 = role === 'R4';

  const [currentPage, setCurrentPage] = useState('dashboard');
  const [syncStatus, setSyncStatus] = useState(null); // 'loading' | 'success' | 'error' | null

  // Auto-load from GitHub on login
  const syncFromGithub = useCallback(async () => {
    setSyncStatus('loading');
    try {
      const data = await fetchLatestPlan();
      if (data) {
        if (data.members) {
          useMembersStore.getState().importMembers(JSON.stringify(data.members));
        }
        if (data.events || data.finishedEvents || data.mapLayout) {
          useEventsStore.getState().importEvents(JSON.stringify({
            events: data.events || [],
            finishedEvents: data.finishedEvents || [],
            mapLayout: data.mapLayout || {},
          }));
        }
        if (data.announcement) {
          localStorage.setItem('aegis_announcement', data.announcement);
        }
        setSyncStatus('success');
      } else {
        // No remote data — fall back to local storage
        useMembersStore.getState().initialize();
        useEventsStore.getState().initialize();
        setSyncStatus(null);
      }
    } catch {
      // On error, fall back to local
      useMembersStore.getState().initialize();
      useEventsStore.getState().initialize();
      setSyncStatus('error');
    }
  }, []);

  useEffect(() => {
    if (role) {
      syncFromGithub();
    }
  }, [role, syncFromGithub]);

  // Clear sync toast after 3s
  useEffect(() => {
    if (syncStatus === 'success' || syncStatus === 'error') {
      const timer = setTimeout(() => setSyncStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [syncStatus]);

  const handleLogin = (newRole) => {
    login(newRole);
    setCurrentPage('dashboard');
  };

  // If not logged in, show Login screen
  if (!role) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'roster':
        return isR4 ? <Roster /> : <Dashboard />;
      case 'planner':
        return isR4 ? <EventPlanner /> : <Dashboard />;
      case 'current-event':
        return isR4 ? <CurrentEvent /> : <Dashboard />;
      case 'my-orders':
        return <MyOrders />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div
      className="flex h-screen relative"
      style={{ backgroundColor: COLORS.bg_primary }}
    >
      <Sidebar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>

      {/* Sync Status Toast */}
      {syncStatus && (
        <div
          className="fixed bottom-6 right-6 px-5 py-3 rounded-lg shadow-lg text-sm font-semibold z-50 transition-all"
          style={{
            backgroundColor:
              syncStatus === 'loading' ? COLORS.bg_card :
              syncStatus === 'success' ? COLORS.success :
              COLORS.danger,
            color: '#fff',
            border: `1px solid ${syncStatus === 'loading' ? COLORS.border : 'transparent'}`,
          }}
        >
          {syncStatus === 'loading' && '⏳ Downloading latest orders from the War Room...'}
          {syncStatus === 'success' && '✅ Alliance data loaded successfully!'}
          {syncStatus === 'error' && '⚠️ Could not reach the War Room — using saved data from this device'}
        </div>
      )}
    </div>
  );
}

export default App;
