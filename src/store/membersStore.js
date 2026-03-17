import { create } from 'zustand';

const STORAGE_KEY = 'aegis_members';

const loadFromStorage = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (members) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
};

export const useMembersStore = create((set, get) => ({
  members: [],
  myIdentityId: localStorage.getItem('myIdentityId') || null,

  setMyIdentityId: (id) => {
    localStorage.setItem('myIdentityId', id);
    set({ myIdentityId: id });
  },

  initialize: () => {
    const members = loadFromStorage();
    set({ members });
  },

  getMember: (id) => {
    const { members } = get();
    return members.find((m) => m.id === id);
  },

  calculateMasterScores: (member) => {
    const masterKOTH = member.score_koth;
    const masterRR = member.score_rr;
    const masterSVS = (member.score_koth + member.score_rr) / 2;
    return { masterKOTH, masterRR, masterSVS };
  },

  getMasterScore: (member, eventType) => {
    if (eventType === 'KOTH') return member.score_koth;
    if (eventType === 'RR') return member.score_rr;
    return (member.score_koth + member.score_rr) / 2;
  },

  addMember: (memberData) => {
    const { members } = get();

    const normalizedNewName = (memberData.chief_name || '').trim().toLowerCase();
    const isDuplicate = members.some((m) => (m.chief_name || '').trim().toLowerCase() === normalizedNewName);
    if (isDuplicate) {
      throw new Error(`A member named "${memberData.chief_name.trim()}" already exists!`);
    }

    const newMember = { ...memberData, id: Date.now().toString() };
    const updated = [...members, newMember];
    saveToStorage(updated);
    set({ members: updated });
  },

  updateMember: (id, updates) => {
    const { members } = get();

    if (updates.chief_name) {
      const normalizedNewName = updates.chief_name.trim().toLowerCase();
      const isDuplicate = members.some(
        (m) => m.id !== id && (m.chief_name || '').trim().toLowerCase() === normalizedNewName
      );
      if (isDuplicate) {
        throw new Error(`Another member is already named "${updates.chief_name.trim()}"!`);
      }
    }

    const updated = members.map((m) => (m.id === id ? { ...m, ...updates } : m));
    saveToStorage(updated);
    set({ members: updated });
  },

  deleteMember: (id) => {
    const { members } = get();
    const updated = members.filter((m) => m.id !== id);
    saveToStorage(updated);
    set({ members: updated });
  },

  getMembers: () => get().members,

  getTotalCount: () => get().members.length,

  purgeGuests: () => {
    const { members } = get();
    const guestMembers = members.filter((m) => m.isGuest);
    const updated = members.filter((m) => !m.isGuest);
    saveToStorage(updated);
    set({ members: updated });
    return guestMembers.length;
  },

  exportMembers: () => {
    const { members } = get();
    const membersToExport = members.map(({ id, ...rest }) => rest);
    return JSON.stringify(membersToExport, null, 2);
  },

  importMembers: (jsonString) => {
    try {
      const newMembers = JSON.parse(jsonString);
      if (!Array.isArray(newMembers)) {
        console.error("Import failed: JSON is not an array.");
        return false;
      }

      const membersWithIds = newMembers.map((m) => ({
        ...m,
        id: m.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
      }));

      saveToStorage(membersWithIds);
      set({ members: membersWithIds });
      return true;
    } catch (error) {
      console.error("Error importing members from JSON:", error);
      return false;
    }
  },

  syncMembers: (importedMembers) => {
    const { members: existingMembers } = get();
    const existingMembersMap = new Map(
      existingMembers.map((m) => [(m.chief_name || '').trim().toLowerCase(), m])
    );
    let updatedCount = 0;
    let addedCount = 0;
    const finalMembers = [];

    for (const importedMember of importedMembers) {
      const existingMember = existingMembersMap.get(
        (importedMember.chief_name || '').trim().toLowerCase()
      );

      if (existingMember) {
        const merged = { ...existingMember, ...importedMember, id: existingMember.id };
        finalMembers.push(merged);
        existingMembersMap.delete((importedMember.chief_name || '').trim().toLowerCase());
        importedMember.id = existingMember.id;
        updatedCount++;
      } else {
        const newId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const newMember = { ...importedMember, id: newId };
        finalMembers.push(newMember);
        importedMember.id = newId;
        addedCount++;
      }
    }

    // Keep existing members that weren't in the import
    for (const remaining of existingMembersMap.values()) {
      finalMembers.push(remaining);
    }

    saveToStorage(finalMembers);
    set({ members: finalMembers });
    return { updatedCount, addedCount, finalMembers: importedMembers };
  },
}));
