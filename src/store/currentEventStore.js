import { create } from 'zustand';

const STORAGE_KEY = 'aegis_current_event';

const loadFromStorage = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

const saveToStorage = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const useCurrentEventStore = create((set) => ({
  eventData: null,
  loading: false,

  fetchEvent: () => {
    const data = loadFromStorage();
    set({ eventData: data, loading: false });
  },

  updateEvent: (data) => {
    const updated = { ...data, lastUpdated: new Date().toISOString() };
    saveToStorage(updated);
    set({ eventData: updated });
  },
}));
