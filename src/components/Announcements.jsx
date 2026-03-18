import React, { useState, useEffect } from 'react';
import { COLORS } from '../utils/theme';
import { useAuthStore } from '../store/authStore';

const STORAGE_KEY = 'aegis_announcement';

const Announcements = () => {
  const [announcement, setAnnouncement] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const role = useAuthStore((s) => s.role);
  const canEdit = role === 'R4';

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setAnnouncement(stored || 'No announcements yet.');
  }, []);

  useEffect(() => {
    if (!canEdit && isEditing) setIsEditing(false);
  }, [canEdit, isEditing]);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, newAnnouncement);
    setAnnouncement(newAnnouncement);
    setIsEditing(false);
  };

  return (
    <div
      className="p-4 rounded-lg"
      style={{ backgroundColor: COLORS.bg_card, border: `1px solid ${COLORS.border}` }}
    >
      <h3 className="text-lg font-bold mb-2" style={{ color: COLORS.text_primary }}>
        Announcements
      </h3>
      <div className="mb-4">
        {isEditing ? (
          <div>
            <textarea
              className="w-full p-2 rounded-md"
              style={{
                backgroundColor: COLORS.bg_input,
                color: COLORS.text_primary,
                border: `1px solid ${COLORS.border}`,
              }}
              value={newAnnouncement}
              onChange={(e) => setNewAnnouncement(e.target.value)}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-md font-semibold"
                title="Save the announcement"
                style={{ backgroundColor: COLORS.accent, color: '#1a1c1e' }}
              >
                Save
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-md"
                title="Cancel editing the announcement"
                style={{
                  backgroundColor: COLORS.bg_input,
                  color: COLORS.text_primary,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          canEdit ? (
            <button
              onClick={() => {
                setNewAnnouncement(announcement);
                setIsEditing(true);
              }}
              className="px-4 py-2 rounded-md font-semibold"
              title="Edit the announcement"
              style={{ backgroundColor: COLORS.accent, color: '#1a1c1e' }}
            >
              Edit Announcement
            </button>
          ) : null
        )}
      </div>
      <p style={{ color: COLORS.text_primary, whiteSpace: 'pre-wrap' }}>{announcement}</p>
    </div>
  );
};

export default Announcements;
