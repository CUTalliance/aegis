/**
 * Excel Export/Import Service
 * Handles importing and exporting member data to/from Excel (.xlsx) files
 */
import XLSX from 'xlsx-js-style';

/**
 * Export members to Excel file with proper formatting
 * @param {Array} members - Array of member objects
 * @returns {void}
 */
export const exportMembersToExcel = (members) => {
  // Define column headers matching Python version layout
  const headers = [
    'Chief Name',
    'Base Power',
    'Score KOTH',
    'Score RR',
    'Score SVS',
    'Aeroplane Lvl',
    'Aeroplane Power',
    'Barracks Plasma',
    'Range Plasma',
    'Garage Plasma',
    'T11 Infantry',
    'T11 Hunter',
    'T11 Rider',
    'Rank',
    'Combat Role',
  ];

  // Build data rows
  const data = members.map((m) => [
    m.chief_name,
    m.base_power,
    m.score_koth,
    m.score_rr,
    (m.score_koth + m.score_rr) / 2,  // score_svs is calculated
    m.aeroplane_level,
    m.aeroplane_power,
    m.barracks_plasma,
    m.range_plasma,
    m.garage_plasma,
    m.t11_infantry ? 'Yes' : 'No',
    m.t11_hunter ? 'Yes' : 'No',
    m.t11_rider ? 'Yes' : 'No',
    m.Rank || 'R1',
    m.CombatRole || 'Joiner',
  ]);

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Set column widths for readability
  const columnWidths = [
    { wch: 20 }, // Chief Name
    { wch: 12 }, // Base Power
    { wch: 12 }, // Score KOTH
    { wch: 12 }, // Score RR
    { wch: 12 }, // Score SVS
    { wch: 15 }, // Aeroplane Lvl
    { wch: 15 }, // Aeroplane Power
    { wch: 15 }, // Barracks Plasma
    { wch: 15 }, // Range Plasma
    { wch: 15 }, // Garage Plasma
    { wch: 12 }, // T11 Infantry
    { wch: 12 }, // T11 Hunter
    { wch: 12 }, // T11 Rider
    { wch: 10 }, // Rank
    { wch: 15 }, // Combat Role
  ];
  ws['!cols'] = columnWidths;

  // --- CUT Orange header styling ---
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
    fill: { fgColor: { rgb: 'E67E22' } },
    alignment: { horizontal: 'center' },
  };
  for (let c = 0; c < headers.length; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) ws[addr].s = headerStyle;
  }

  // --- Conditional formatting: Master Scores green scale & T11 green/red ---
  const scoreColIndices = [2, 3, 4]; // KOTH, RR, SVS columns
  const t11ColIndices = [10, 11, 12]; // T11 Infantry, Hunter, Rider columns

  // Collect max score per score column for green scale
  const maxScores = scoreColIndices.map((colIdx) => {
    let max = 0;
    for (let r = 0; r < data.length; r++) {
      const val = Number(data[r][colIdx]) || 0;
      if (val > max) max = val;
    }
    return max;
  });

  for (let r = 0; r < data.length; r++) {
    // Green scale for score columns
    scoreColIndices.forEach((colIdx, si) => {
      const addr = XLSX.utils.encode_cell({ r: r + 1, c: colIdx });
      if (!ws[addr]) return;
      const val = Number(data[r][colIdx]) || 0;
      const ratio = maxScores[si] > 0 ? val / maxScores[si] : 0;
      // Interpolate from white (ratio=0) to rich green (ratio=1)
      const g = Math.round(180 + (255 - 180) * ratio);
      const rb = Math.round(255 - 255 * ratio * 0.6);
      const hex = (c) => c.toString(16).padStart(2, '0').toUpperCase();
      ws[addr].s = {
        fill: { fgColor: { rgb: `${hex(rb)}${hex(g)}${hex(rb)}` } },
        alignment: { horizontal: 'center' },
      };
    });

    // T11 columns: green fill for Yes, red fill for No
    t11ColIndices.forEach((colIdx) => {
      const addr = XLSX.utils.encode_cell({ r: r + 1, c: colIdx });
      if (!ws[addr]) return;
      const isYes = data[r][colIdx] === 'Yes';
      ws[addr].s = {
        fill: { fgColor: { rgb: isYes ? '27AE60' : 'E74C3C' } },
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'center' },
      };
    });
  }

  // Create workbook with single sheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Alliance Roster');

  // Generate filename with date
  const filename = `aegis-members-${new Date().toISOString().split('T')[0]}.xlsx`;

  // Save file
  XLSX.writeFile(wb, filename);

  return filename;
};

/**
 * Import members from Excel file
 * @param {File} file - Excel file object from input
 * @returns {Promise<Array>} - Promise that resolves to array of member objects
 */
export const importMembersFromExcel = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, defval: '' });

        if (!jsonData || jsonData.length < 2) {
          throw new Error('Excel file is empty or has no data rows');
        }

        // First row should be headers
        // Normalize: lowercase, trim, replace multiple spaces, remove special chars
        const normalizeHeader = (h) => {
          return String(h || '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
            .replace(/[^\w\s]/g, '') // Remove special characters except letters, numbers, spaces
            .replace(/\s/g, ' ');  // Ensure consistent spacing
        };

        const headers = jsonData[0].map(normalizeHeader);

        // Map column names to indices (flexible matching)
        const colMap = {};
        const requiredColumns = [
          'chief name',
          'base power',
          'score koth',
          'score rr',
          'aeroplane lvl',
          'aeroplane power',
          'barracks plasma',
          'range plasma',
          'garage plasma',
          't11 infantry',
          't11 hunter',
          't11 rider',
        ];

        // Optional columns that get default values if missing
        const optionalColumns = [
          'rank',
          'combat role',
        ];

        // Also normalize required columns for comparison
        const normalizedRequired = requiredColumns.map(normalizeHeader);

        headers.forEach((header, idx) => {
          if (header) {  // Skip empty headers
            colMap[header] = idx;
          }
        });

        // Check for required columns with normalized comparison
        const missingColumns = [];
        const columnMapping = {};
        
        normalizedRequired.forEach((reqCol, reqIdx) => {
          const found = Object.keys(colMap).find(h => {
            // Exact match first
            if (h === reqCol) return true;
            
            // Handle common typos: "aeroplane ivl" vs "aeroplane lvl"
            if (reqCol === 'aeroplane lvl' && h === 'aeroplane ivl') return true;
            
            // Partial match (for flexibility) - remove all spaces and compare
            const normalized1 = h.replace(/\s/g, '').toLowerCase();
            const normalized2 = reqCol.replace(/\s/g, '').toLowerCase();
            if (normalized1 === normalized2) return true;
            
            // Check if it contains the key words
            if (reqCol.includes('aeroplane') && reqCol.includes('lvl')) {
              return h.includes('aeroplane') && (h.includes('lvl') || h.includes('ivl'));
            }
            
            return false;
          });
          
          if (found) {
            columnMapping[requiredColumns[reqIdx]] = colMap[found];
          } else {
            missingColumns.push(requiredColumns[reqIdx]);
          }
        });

        // Map optional columns (no error if missing)
        optionalColumns.forEach((optCol) => {
          const normalizedOpt = normalizeHeader(optCol);
          const found = Object.keys(colMap).find(h => {
            if (h === normalizedOpt) return true;
            const n1 = h.replace(/\s/g, '').toLowerCase();
            const n2 = normalizedOpt.replace(/\s/g, '').toLowerCase();
            return n1 === n2;
          });
          if (found) {
            columnMapping[optCol] = colMap[found];
          }
        });

        if (missingColumns.length > 0) {
          throw new Error(
            `Missing required columns: ${missingColumns.join(', ')}.\n\n` +
            `Found columns: ${Object.keys(colMap).join(', ')}\n\n` +
            `Required columns: ${requiredColumns.join(', ')}\n\n` +
            `Hint: Column names must match exactly (case-insensitive). Check for typos like "Ivl" vs "lvl".`
          );
        }

        // Use the columnMapping instead of colMap for getting values
        const getCol = (row, name) => {
          const idx = columnMapping[name];
          return idx !== undefined ? row[idx] : undefined;
        };

        // Helper to parse boolean
        const parseBool = (val) => {
          if (val === undefined || val === null) return false;
          const str = String(val).trim().toLowerCase();
          return str === 'yes' || str === 'true' || str === '1' || str === '✓';
        };

        // Parse data rows
        const members = [];
        const errors = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          // Skip empty rows
          if (!row || row.length === 0 || !getCol(row, 'chief name')) {
            continue;
          }

          try {
            const chiefName = String(getCol(row, 'chief name')).trim();
            if (!chiefName) {
              errors.push(`Row ${i + 1}: Missing chief name`);
              continue;
            }

            // In the import, we don't assign a random id if it's going to be replaced
            // but we assign it provisionally as it might be a new member.
            const member = {
              id: String(getCol(row, 'id') || crypto.randomUUID()),
              chief_name: chiefName,
              base_power: parseInt(getCol(row, 'base power')) || 0,
              score_koth: parseFloat(getCol(row, 'score koth')) || 0,
              score_rr: parseFloat(getCol(row, 'score rr')) || 0,
              // score_svs is calculated from KOTH and RR, but we read it for compatibility
              // It will be recalculated anyway: (score_koth + score_rr) / 2
              aeroplane_level: String(getCol(row, 'aeroplane lvl') || 'Lvl3'),
              aeroplane_power: parseInt(getCol(row, 'aeroplane power')) || 0,
              barracks_plasma: String(getCol(row, 'barracks plasma') || 'P1'),
              range_plasma: String(getCol(row, 'range plasma') || 'P1'),
              garage_plasma: String(getCol(row, 'garage plasma') || 'P1'),
              t11_infantry: parseBool(getCol(row, 't11 infantry')),
              t11_hunter: parseBool(getCol(row, 't11 hunter')),
              t11_rider: parseBool(getCol(row, 't11 rider')),
              Rank: String(getCol(row, 'rank') || 'R1'),
              CombatRole: String(getCol(row, 'combat role') || 'Joiner'),
            };

            members.push(member);
          } catch (err) {
            errors.push(`Row ${i + 1}: ${err.message}`);
          }
        }

        if (errors.length > 0) {
          console.warn('Import warnings:', errors);
        }

        if (members.length === 0) {
          throw new Error('No valid members found in Excel file');
        }

        resolve(members);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'));
    };

    reader.readAsBinaryString(file);
  });
};

/**
 * Export event teams to Excel file
 * @param {string} eventName - Name of the event
 * @param {string} eventType - Type of event (KOTH, RR, SVS)
 * @param {Array} teams - Array of teams (each team is an array of members)
 * @param {string} generalInstructions - General instructions for all teams
 * @param {Object} teamInstructions - Instructions for each team (keyed by team number)
 * @returns {string} - Filename of exported file
 */
export const exportEventToExcel = (
  eventName,
  eventType,
  teams,
  generalInstructions,
  teamInstructions,
  reservePool,
  teamLeaders
) => {
  const wb = XLSX.utils.book_new();

  // ══════════════════════════════════════════════════════════════
  // Sheet 1: Strategic Overview
  // ══════════════════════════════════════════════════════════════
  const overviewData = [
    ['Component', 'Details'],
    ['Alliance', 'CUT — Calm Until Troubled'],
    ['State', '1404'],
    ['Event Name', eventName],
    ['Event Type', eventType === 'KOTH' ? 'King of the Hill' : eventType === 'RR' ? 'Reservoir Raid' : 'State Warfare'],
    ['General Instructions', generalInstructions || '—'],
  ];

  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  wsOverview['!cols'] = [{ wch: 28 }, { wch: 65 }];
  // Style overview header row
  const ovHeaderStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
    fill: { fgColor: { rgb: 'E67E22' } },
    alignment: { horizontal: 'center' },
  };
  for (let c = 0; c < 2; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (wsOverview[addr]) wsOverview[addr].s = ovHeaderStyle;
  }
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Strategic Overview');

  // ══════════════════════════════════════════════════════════════
  // Sheet 2: Deployment Plan
  // ══════════════════════════════════════════════════════════════
  const deploymentData = [];

  teams.forEach((team, teamIdx) => {
    const teamNum = teamIdx + 1;
    const leaderId = teamLeaders ? teamLeaders[teamNum] : null;
    const leaderName = leaderId ? team.find((m) => m.id === leaderId)?.chief_name : null;
    const teamName = leaderName ? `TEAM ${teamNum} (${leaderName})` : `TEAM ${teamNum}`;
    
    // Team header
    deploymentData.push([teamName, '', '']);
    deploymentData.push(['Chief Name', `Score (${eventType})`, 'Power']);

    // Team members
    team.forEach((member) => {
      const score = calculateMasterScore(member, eventType);
      const power = member.base_power + member.aeroplane_power;
      deploymentData.push([member.chief_name, Math.round(score), power]);
    });

    // Team instructions
    const instr = teamInstructions[teamNum];
    if (instr && instr.trim()) {
      deploymentData.push(['']);
      deploymentData.push(['📋 Team Instructions:', instr]);
    }

    // Spacer between teams
    deploymentData.push(['']);
  });

  // Reserve List
  if (reservePool && reservePool.length > 0) {
    deploymentData.push(['RESERVE LIST', '', '']);
    deploymentData.push(['Chief Name', `Score (${eventType})`, 'Power']);
    reservePool.forEach((member) => {
      const score = calculateMasterScore(member, eventType);
      const power = member.base_power + member.aeroplane_power;
      deploymentData.push([member.chief_name, Math.round(score), power]);
    });
    deploymentData.push(['']);
  }

  const wsDeployment = XLSX.utils.aoa_to_sheet(deploymentData);
  wsDeployment['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 15 }];
  // Style deployment sheet: orange headers for TEAM rows and column headers
  const depHeaderStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
    fill: { fgColor: { rgb: 'E67E22' } },
    alignment: { horizontal: 'center' },
  };
  for (let r = 0; r < deploymentData.length; r++) {
    const cellVal = String(deploymentData[r][0] || '');
    if (cellVal.startsWith('TEAM ') || cellVal === 'RESERVE LIST' || cellVal === 'Chief Name') {
      for (let c = 0; c < 3; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (wsDeployment[addr]) wsDeployment[addr].s = depHeaderStyle;
      }
    }
  }
  XLSX.utils.book_append_sheet(wb, wsDeployment, 'Deployment Plan');

  // Generate filename with date
  const filename = `${eventName.replace(/[^a-z0-9]/gi, '_')}_teams.xlsx`;

  // Save file
  XLSX.writeFile(wb, filename);

  return filename;
};

// Helper function to get score by event type
// Uses game-provided scores directly
const calculateMasterScore = (member, eventType) => {
  if (eventType === 'KOTH') {
    return member.score_koth;
  } else if (eventType === 'RR') {
    return member.score_rr;
  } else {
    // SVS = average of KOTH and RR
    return (member.score_koth + member.score_rr) / 2;
  }
};
