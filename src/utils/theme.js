/**
 * Aegis Planner Theme Configuration
 * Dark gaming dashboard aesthetic
 */

export const COLORS = {
  // Backgrounds
  bg_primary: '#1a1c1e',
  bg_card: '#25282c',
  bg_card_hover: '#2e3238',
  bg_input: '#1e2127',

  // Sidebar
  sidebar: '#111314',
  sidebar_btn_hover: '#2a2d31',

  // Accent (CUT Brand Orange)
  accent: '#e67e22',
  accent_hover: '#d35400',
  accent_light: '#f39c49',

  // Text
  text_primary: '#ffffff',
  text_secondary: '#8e9297',
  text_muted: '#5c6066',

  // Borders
  border: '#333640',
  border_light: '#444950',

  // Semantic
  success: '#27ae60',
  danger: '#e74c3c',
  warning: '#f39c12',

  // Event-specific
  rr_blue: '#3498db',
  svs_red: '#e74c3c',
  koth_gold: '#f1c40f',

  // T11 Badges
  badge_on: '#e67e22',
  badge_off: '#444950',
};

export const EVENT_COLORS = {
  KOTH: COLORS.koth_gold,
  RR: COLORS.rr_blue,
  SVS: COLORS.svs_red,
};

export const TEAM_COLORS = [
  '#e67e22', // Orange
  '#3498db', // Blue
  '#27ae60', // Green
  '#e74c3c', // Red
  '#9b59b6', // Purple
  '#f1c40f', // Gold
  '#1abc9c', // Teal
  '#34495e', // Dark gray
];

// Tailwind CSS class generation
export const getThemeClasses = () => ({
  // Container & Card classes
  container: 'min-h-screen bg-[#1a1c1e] text-white',
  card: 'bg-[#25282c] rounded-lg border border-[#333640]',
  cardHover: 'hover:bg-[#2e3238] transition-colors',
  input: 'bg-[#1e2127] border border-[#333640] text-white rounded px-3 py-2',

  // Button classes
  btnPrimary: 'bg-[#e67e22] hover:bg-[#d35400] text-white px-4 py-2 rounded font-medium transition-colors',
  btnSecondary: 'bg-[#25282c] hover:bg-[#2e3238] text-white px-4 py-2 rounded border border-[#333640]',
  btnDanger: 'bg-[#e74c3c] hover:bg-[#c0392b] text-white px-4 py-2 rounded font-medium',
  btnSuccess: 'bg-[#27ae60] hover:bg-[#229954] text-white px-4 py-2 rounded font-medium',

  // Text classes
  textPrimary: 'text-white',
  textSecondary: 'text-[#8e9297]',
  textMuted: 'text-[#5c6066]',
});