import React, { useState } from 'react';
import { X } from 'lucide-react';
import { COLORS } from '../utils/theme';

const FormField = ({ label, field, type = 'text', formData, handleChange }) => (
  <div className="mb-4">
    <label
      className="block text-sm font-semibold mb-2"
      style={{ color: COLORS.text_secondary }}
    >
      {label}
    </label>
    <input
      type={type}
      value={formData[field]}
      onChange={(e) => handleChange(field, e.target.value)}
      className="w-full px-3 py-2 rounded border"
      style={{
        backgroundColor: COLORS.bg_input,
        borderColor: COLORS.border,
        color: COLORS.text_primary,
      }}
    />
  </div>
);

const MemberForm = ({ member, onSave, onCancel }) => {
  const [formData, setFormData] = useState(
    member || {
      chief_name: '',
      base_power: 1000,
      aeroplane_level: 'Lvl1',
      aeroplane_power: 10000,
      barracks_plasma: 'P1',
      range_plasma: 'P1',
      garage_plasma: 'P1',
      t11_infantry: false,
      t11_hunter: false,
      t11_rider: false,
      score_koth: 0,
      score_rr: 0,
      isGuest: false,
      Rank: 'R1',
      CombatRole: 'Joiner',
    }
  );

  const handleChange = (field, value) => {
    // Ensure numeric fields are stored as numbers
    const isNumeric = [
      'base_power',
      'aeroplane_power',
      'score_koth',
      'score_rr',
    ].includes(field);
    
    setFormData((prev) => ({
      ...prev,
      [field]: isNumeric ? Number(value) : value,
    }));
  };

  const handleCheckbox = (field) => {
    setFormData((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSubmit = () => {
    // Before saving, ensure all numeric fields are proper numbers
    const dataToSave = {
      ...formData,
      base_power: Number(formData.base_power) || 0,
      aeroplane_power: Number(formData.aeroplane_power) || 0,
      score_koth: Number(formData.score_koth) || 0,
      score_rr: Number(formData.score_rr) || 0,
    };
    onSave(dataToSave);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div
        className="rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: COLORS.bg_card }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold" style={{ color: COLORS.text_primary }}>
            {member ? 'Edit Member' : 'Add New Member'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 rounded hover:opacity-80"
            style={{ color: COLORS.text_primary }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <FormField label="Chief Name" field="chief_name" formData={formData} handleChange={handleChange} />
          <FormField label="Base Power" field="base_power" type="number" formData={formData} handleChange={handleChange} />

          <div className="mb-4">
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: COLORS.text_secondary }}
            >
              Aeroplane Level
            </label>
            <select
              value={formData.aeroplane_level}
              onChange={(e) => handleChange('aeroplane_level', e.target.value)}
              className="w-full px-3 py-2 rounded border"
              style={{
                backgroundColor: COLORS.bg_input,
                borderColor: COLORS.border,
                color: COLORS.text_primary,
              }}
            >
              {['Lvl1', 'Lvl2', 'Lvl3', 'Lvl4', 'Lvl5'].map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          <FormField label="Aeroplane Power" field="aeroplane_power" type="number" formData={formData} handleChange={handleChange} />

          {['barracks_plasma', 'range_plasma', 'garage_plasma'].map((field) => (
            <div key={field} className="mb-4">
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: COLORS.text_secondary }}
              >
                {field.replace('_', ' ').toUpperCase()}
              </label>
              <select
                value={formData[field]}
                onChange={(e) => handleChange(field, e.target.value)}
                className="w-full px-3 py-2 rounded border"
                style={{
                  backgroundColor: COLORS.bg_input,
                  borderColor: COLORS.border,
                  color: COLORS.text_primary,
                }}
              >
                {['P1', 'P2', 'P3', 'P4', 'P5'].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <FormField label="Score (RR)" field="score_rr" type="number" formData={formData} handleChange={handleChange} />
          <FormField label="Score (KOTH)" field="score_koth" type="number" formData={formData} handleChange={handleChange} />

          {/* Rank Dropdown */}
          <div className="mb-4">
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: COLORS.text_secondary }}
            >
              Rank
            </label>
            <select
              value={formData.Rank || 'R1'}
              onChange={(e) => handleChange('Rank', e.target.value)}
              className="w-full px-3 py-2 rounded border"
              style={{
                backgroundColor: COLORS.bg_input,
                borderColor: COLORS.border,
                color: COLORS.text_primary,
              }}
            >
              {['R1', 'R2', 'R3', 'R4', 'R5'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Combat Role Dropdown */}
          <div className="mb-4">
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: COLORS.text_secondary }}
            >
              Combat Role
            </label>
            <select
              value={formData.CombatRole || 'Joiner'}
              onChange={(e) => handleChange('CombatRole', e.target.value)}
              className="w-full px-3 py-2 rounded border"
              style={{
                backgroundColor: COLORS.bg_input,
                borderColor: COLORS.border,
                color: COLORS.text_primary,
              }}
            >
              {['Rally Leader', 'Garrison', 'Joiner', 'Reserve'].map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>

        {/* SVS Guest Toggle */}
        <div className="mb-6 p-4 rounded border" style={{ borderColor: formData.isGuest ? COLORS.warning : COLORS.border }}>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className="relative w-12 h-6 rounded-full transition-colors"
              style={{ backgroundColor: formData.isGuest ? COLORS.warning : COLORS.border }}
              onClick={() => handleCheckbox('isGuest')}
            >
              <div
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                style={{ left: formData.isGuest ? '26px' : '2px' }}
              />
            </div>
            <span style={{ color: COLORS.text_primary }}>
              ✈️ Temporary SVS Guest
            </span>
          </label>
          {formData.isGuest && (
            <p className="text-xs mt-2" style={{ color: COLORS.warning }}>
              This member is marked as a temporary guest (mercenary) for SVS events.
            </p>
          )}
        </div>

        {/* T11 checkboxes */}
        <div className="mb-6 p-4 rounded border" style={{ borderColor: COLORS.border }}>
          <p
            className="text-sm font-semibold mb-4"
            style={{ color: COLORS.text_secondary }}
          >
            T11 Units
          </p>
          <div className="space-y-3">
            {[
              { field: 't11_infantry', label: 'Infantry' },
              { field: 't11_hunter', label: 'Hunter' },
              { field: 't11_rider', label: 'Rider' },
            ].map(({ field, label }) => (
              <label key={field} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData[field]}
                  onChange={() => handleCheckbox(field)}
                  className="w-4 h-4"
                />
                <span style={{ color: COLORS.text_primary }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            className="flex-1 py-2 rounded font-semibold"
            style={{
              backgroundColor: COLORS.accent,
              color: '#1a1c1e',
            }}
          >
            {member ? 'Save Changes' : 'Add Member'}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded font-semibold border"
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
  );
};

export default MemberForm;
