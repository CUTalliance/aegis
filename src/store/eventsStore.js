import { create } from 'zustand';

const EVENTS_KEY = 'aegis_events';
const FINISHED_EVENTS_KEY = 'aegis_finished_events';
const MAP_LAYOUT_KEY = 'aegis_map_layout';

const loadFromStorage = (key, fallback) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
};

const saveToStorage = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

const DEFAULT_MAP_LAYOUT = {
  RR: { tokens: [], zones: [] },
  SVS: { tokens: [], zones: [] },
  KOTH: { tokens: [], zones: [], drawings: [] },
};

export const useEventsStore = create((set, get) => ({
  events: [],
  finishedEvents: [],
  mapLayout: { ...DEFAULT_MAP_LAYOUT },

  initialize: () => {
    const events = loadFromStorage(EVENTS_KEY, []);
    const finishedEvents = loadFromStorage(FINISHED_EVENTS_KEY, []);
    const storedLayout = loadFromStorage(MAP_LAYOUT_KEY, null);

    let mapLayout = { ...DEFAULT_MAP_LAYOUT };
    if (storedLayout) {
      // Handle legacy format migration (flat tokens/zones → per-type)
      if (storedLayout.tokens || storedLayout.zones) {
        mapLayout = {
          ...DEFAULT_MAP_LAYOUT,
          RR: {
            tokens: storedLayout.tokens || [],
            zones: storedLayout.zones || [],
          },
        };
        saveToStorage(MAP_LAYOUT_KEY, mapLayout);
      } else {
        mapLayout = { ...DEFAULT_MAP_LAYOUT, ...storedLayout };
      }
    }

    set({ events, finishedEvents, mapLayout });
  },

  createEvent: (eventData) => {
    const { events } = get();

    // If an event with the same name and type exists, overwrite it
    const existingIndex = events.findIndex(
      (e) => e.event_name === eventData.event_name && e.event_type === eventData.event_type
    );

    if (existingIndex !== -1) {
      const existing = events[existingIndex];
      const updatedEvent = {
        ...existing,
        ...eventData,
        id: existing.id,
        // keep original createdAt if present, update modified time
        createdAt: existing.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updated = [...events];
      updated[existingIndex] = updatedEvent;
      saveToStorage(EVENTS_KEY, updated);
      set({ events: updated });
      return { action: 'updated', id: existing.id };
    }

    const newEvent = {
      ...eventData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newEvent, ...events];
    saveToStorage(EVENTS_KEY, updated);
    set({ events: updated });
    return { action: 'created', id: newEvent.id };
  },

  updateEvent: (id, updates) => {
    const { events } = get();
    const updated = events.map((e) => (e.id === id ? { ...e, ...updates } : e));
    saveToStorage(EVENTS_KEY, updated);
    set({ events: updated });
  },

  deleteEvent: (id) => {
    const { events } = get();
    const updated = events.filter((e) => e.id !== id);
    saveToStorage(EVENTS_KEY, updated);
    set({ events: updated });
  },

  markAsFinished: (id) => {
    const { events, finishedEvents } = get();
    const event = events.find((e) => e.id === id);
    if (!event) return;

    const finishedEvent = { ...event, finishedAt: new Date().toISOString() };

    // If a finished event with same name and type exists, overwrite it
    const existingIndex = finishedEvents.findIndex(
      (fe) => fe.event_name === finishedEvent.event_name && fe.event_type === finishedEvent.event_type
    );

    const updatedEvents = events.filter((e) => e.id !== id);

    if (existingIndex !== -1) {
      const existing = finishedEvents[existingIndex];
      const updatedFinishedEvent = {
        ...existing,
        ...finishedEvent,
        id: existing.id,
        createdAt: existing.createdAt || finishedEvent.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const updatedFinished = [...finishedEvents];
      updatedFinished[existingIndex] = updatedFinishedEvent;

      saveToStorage(EVENTS_KEY, updatedEvents);
      saveToStorage(FINISHED_EVENTS_KEY, updatedFinished);
      set({ events: updatedEvents, finishedEvents: updatedFinished });
      return { action: 'updated', id: updatedFinishedEvent.id };
    }

    const updatedFinished = [finishedEvent, ...finishedEvents];

    saveToStorage(EVENTS_KEY, updatedEvents);
    saveToStorage(FINISHED_EVENTS_KEY, updatedFinished);
    set({ events: updatedEvents, finishedEvents: updatedFinished });
    return { action: 'created', id: finishedEvent.id };
  },

  updateFinishedEvent: (id, updates) => {
    const { finishedEvents } = get();
    const updated = finishedEvents.map((e) => (e.id === id ? { ...e, ...updates } : e));
    saveToStorage(FINISHED_EVENTS_KEY, updated);
    set({ finishedEvents: updated });
  },

  deleteFinishedEvent: (id) => {
    const { finishedEvents } = get();
    const updated = finishedEvents.filter((e) => e.id !== id);
    saveToStorage(FINISHED_EVENTS_KEY, updated);
    set({ finishedEvents: updated });
  },

  saveMapLayout: (eventType, layout) => {
    if (!eventType || !['RR', 'SVS', 'KOTH'].includes(eventType)) return;
    const { mapLayout } = get();
    const updated = { ...mapLayout, [eventType]: layout };
    saveToStorage(MAP_LAYOUT_KEY, updated);
    set({ mapLayout: updated });
  },

  exportEvents: () => {
    const { events, finishedEvents, mapLayout } = get();
    return JSON.stringify({ events, finishedEvents, mapLayout }, null, 2);
  },

  importEvents: (jsonString) => {
    try {
      const data = JSON.parse(jsonString);
      if (data.events) {
        saveToStorage(EVENTS_KEY, data.events);
      }
      if (data.finishedEvents) {
        saveToStorage(FINISHED_EVENTS_KEY, data.finishedEvents);
      }
      if (data.mapLayout) {
        saveToStorage(MAP_LAYOUT_KEY, data.mapLayout);
      }
      set({
        events: data.events || [],
        finishedEvents: data.finishedEvents || [],
        mapLayout: data.mapLayout || { ...DEFAULT_MAP_LAYOUT },
      });
      return true;
    } catch (error) {
      console.error("Error importing events:", error);
      return false;
    }
  },
}));
