import { create } from 'zustand';

const ROLE_KEY = 'aegis_role';

export const useAuthStore = create((set, get) => ({
  role: localStorage.getItem(ROLE_KEY) || null, // 'R4' | 'MEMBER' | null

  isR4: () => get().role === 'R4',
  isMember: () => get().role === 'MEMBER',
  isAuthenticated: () => !!get().role,

  login: (role) => {
    localStorage.setItem(ROLE_KEY, role);
    set({ role });
  },

  logout: () => {
    localStorage.removeItem(ROLE_KEY);
    set({ role: null });
  },
}));
