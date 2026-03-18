/**
 * PNG Export Service for Event Planner
 * Generates professional PNG images of team deployments (overview + individual team cards)
 */
import { toPng } from 'html-to-image';

// Alliance branding
const ALLIANCE = 'CUT';
const ALLIANCE_FULL = 'Calm Until Troubled';
const STATE = '1404';

// SVG Theme Colors (dark gaming dashboard)
const COLORS = {
  bg: '#1a1c1e',
  cardBg: '#25282c',
  cardBgAlt: '#2e3238',
  bannerBg: '#111314',
  bannerAccent: '#e67e22',
  headerBg: '#e67e22',
  headerText: '#ffffff',
  subtitleBg: '#25282c',
  subtitleText: '#e67e22',
  subtitleRight: '#8e9297',
  textPrimary: '#e0e0e0',
  textSecondary: '#8e9297',
  textMuted: '#5c6066',
  border: '#333640',
  footerBg: '#111314',
  footerText: '#8e9297',
  stateBadgeBg: '#1a1c1e',
  stateBadgeBorder: '#333640',
  stateLabel: '#3498db',
  gold: '#f1c40f',
  tableHeaderBg: '#e67e22',
  tableHeaderText: '#ffffff',
  rowEven: '#25282c',
  rowOdd: '#2e3238',
  rowText: '#e0e0e0',
};

const TEAM_PALETTE = [
  { bg: '#1a2332', accent: '#3498db', light: '#1e3a5f', tag: '#5dade2' },
  { bg: '#2d1a1a', accent: '#e74c3c', light: '#4a2020', tag: '#ec7063' },
  { bg: '#1a2d1e', accent: '#27ae60', light: '#1e4a2d', tag: '#52be80' },
  { bg: '#2d2a1a', accent: '#f39c12', light: '#4a3f1e', tag: '#f5b041' },
  { bg: '#261a2d', accent: '#8e44ad', light: '#3d1e4a', tag: '#a569bd' },
  { bg: '#1a2d2a', accent: '#1abc9c', light: '#1e4a3f', tag: '#48c9b0' },
  { bg: '#2d231a', accent: '#e67e22', light: '#4a3a1e', tag: '#eb984e' },
  { bg: '#2d1a23', accent: '#e91e63', light: '#4a1e30', tag: '#f06292' },
  { bg: '#1e1a2d', accent: '#3f51b5', light: '#2a1e4a', tag: '#7986cb' },
  { bg: '#231f1a', accent: '#795548', light: '#3a321e', tag: '#a1887f' },
];

/**
 * Get score for a member based on event type
 * Uses game-provided scores directly
 */
const getMasterScore = (member, eventType) => {
  if (eventType === 'KOTH') return member.score_koth;
  if (eventType === 'RR') return member.score_rr;
  // SVS = average of KOTH and RR
  return (member.score_koth + member.score_rr) / 2;
};

/**
 * Calculate team statistics
 */
const calculateTeamStats = (teams, eventType) => {
  const teamStats = teams.map((team, idx) => {
    const scores = team.map(m => getMasterScore(m, eventType));
    const total = scores.reduce((sum, s) => sum + s, 0);
    const avg = team.length > 0 ? total / team.length : 0;
    
    return {
      teamNum: idx + 1,
      memberCount: team.length,
      avgScore: Math.round(avg),
      totalScore: Math.round(total),
    };
  });

  const avgScores = teamStats.map(t => t.avgScore);
  const maxAvg = Math.max(...avgScores);
  const minAvg = Math.min(...avgScores);
  const spread = maxAvg - minAvg;
  const balancePercentage = maxAvg > 0 ? (1 - spread / maxAvg) * 100 : 100;

  return {
    teams: teamStats,
    spread,
    balancePercentage,
  };
};

/**
 * Generate overview PNG with all teams summary
 */
export const exportOverviewPNG = async (
  eventName,
  eventType,
  teams,
  generalInstructions,
  teamInstructions,
  reservePool,
  teamLeaders
) => {
  const stats = calculateTeamStats(teams, eventType);
  const width = 1200;
  
  // Calculate height based on content
  const bannerHeight = 100;
  const generalInstrHeight = generalInstructions?.trim() ? 120 : 0;
  const balanceHeight = 140;
  const teamCardHeight = 60;
  const teamCardsHeight = teams.length * (teamCardHeight + 10) + 40;
  const reserveHeight = reservePool && reservePool.length > 0 ? 60 + reservePool.length * 28 : 0;
  const footerHeight = 60;
  const height = bannerHeight + generalInstrHeight + balanceHeight + teamCardsHeight + reserveHeight + footerHeight + 60;

  // Create container
  const container = document.createElement('div');
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  container.style.backgroundColor = COLORS.bg;
  container.style.padding = '20px';
  container.style.fontFamily = 'Segoe UI, sans-serif';
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';

  // Banner
  const banner = document.createElement('div');
  banner.style.cssText = `
    background: linear-gradient(90deg, ${COLORS.bannerBg} 0%, #1b2838 50%, ${COLORS.bannerBg} 100%);
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  banner.innerHTML = `
    <div>
      <div style="color: ${COLORS.bannerAccent}; font-size: 26px; font-weight: bold; margin-bottom: 4px;">
        [${ALLIANCE}]
      </div>
      <div style="color: ${COLORS.textSecondary}; font-size: 13px; font-style: italic;">
        ${ALLIANCE_FULL}
      </div>
    </div>
    <div style="text-align: center;">
      <div style="color: ${COLORS.bannerAccent}; font-size: 24px; font-weight: bold;">
        ${eventName}
      </div>
      <div style="color: ${COLORS.textSecondary}; font-size: 12px;">
        ${eventType === 'KOTH' ? 'King of the Hill' : eventType === 'RR' ? 'Reservoir Raid' : 'State Warfare'}
      </div>
    </div>
    <div style="
      background: ${COLORS.stateBadgeBg};
      border: 1px solid ${COLORS.stateBadgeBorder};
      border-radius: 10px;
      padding: 10px 20px;
      text-align: center;
    ">
      <div style="color: ${COLORS.stateLabel}; font-size: 11px; font-weight: bold; margin-bottom: 2px;">
        STATE
      </div>
      <div style="color: ${COLORS.gold}; font-size: 20px; font-weight: bold;">
        ${STATE}
      </div>
    </div>
  `;
  container.appendChild(banner);

  // General Instructions
  if (generalInstructions?.trim()) {
    const giBox = document.createElement('div');
    giBox.style.cssText = `
      background: ${COLORS.cardBg};
      border: 2px solid ${COLORS.gold};
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    `;
    giBox.innerHTML = `
      <div style="color: ${COLORS.gold}; font-size: 14px; font-weight: bold; margin-bottom: 8px;">
        📢 GENERAL INSTRUCTIONS
      </div>
      <div style="color: ${COLORS.textPrimary}; font-size: 12px; line-height: 1.5;">
        ${escapeHtml(generalInstructions)}
      </div>
    `;
    container.appendChild(giBox);
  }

  // Balance Summary
  const balanceBox = document.createElement('div');
  balanceBox.style.cssText = `
    background: ${COLORS.cardBg};
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
  `;
  // Build teams summary HTML using leader names when available
  const teamsStatsHtml = stats.teams.map(t => {
    const leaderId = teamLeaders ? teamLeaders[t.teamNum] : null;
    const leaderName = leaderId && teams[t.teamNum - 1]
      ? teams[t.teamNum - 1].find((m) => m.id === leaderId)?.chief_name
      : null;
    const label = leaderName ? `Team ${leaderName}` : `Team ${t.teamNum}`;
    return `
      <div style="color: ${COLORS.textMuted}; font-size: 11px;">
        ${label}: ${t.memberCount} members, Avg: ${t.avgScore}
      </div>
    `;
  }).join('');

  balanceBox.innerHTML = `
    <div style="color: ${COLORS.textPrimary}; font-size: 14px; font-weight: bold; margin-bottom: 8px;">
      ⚖️ Team Balance
    </div>
    <div style="color: ${COLORS.textSecondary}; font-size: 12px; margin-bottom: 8px;">
      Balance: ${stats.balancePercentage.toFixed(1)}% | Spread: ${stats.spread}
    </div>
    <div style="
      background: ${COLORS.bg};
      height: 14px;
      border-radius: 7px;
      overflow: hidden;
      margin-bottom: 8px;
    ">
      <div style="
        background: linear-gradient(90deg, ${COLORS.bannerAccent}, ${COLORS.gold});
        height: 100%;
        width: ${stats.balancePercentage}%;
        transition: width 0.3s;
      "></div>
    </div>
    <div style="display: flex; gap: 16px; margin-top: 8px;">
      ${teamsStatsHtml}
    </div>
  `;
  container.appendChild(balanceBox);

  // Team Cards
  const teamsTitle = document.createElement('div');
  teamsTitle.style.cssText = `
    color: ${COLORS.textPrimary};
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 12px;
  `;
  teamsTitle.textContent = `📋 Teams (${teams.length})`;
  container.appendChild(teamsTitle);

  teams.forEach((team, idx) => {
    const palette = TEAM_PALETTE[idx % TEAM_PALETTE.length];
    const teamBox = document.createElement('div');
    teamBox.style.cssText = `
      background: ${palette.bg};
      border-left: 4px solid ${palette.accent};
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const memberNames = team.map(m => m.chief_name).join(', ');
    const teamInstr = teamInstructions[idx + 1];
    
    const leaderId = teamLeaders ? teamLeaders[idx + 1] : null;
    const leaderName = leaderId ? team.find((m) => m.id === leaderId)?.chief_name : null;
    const teamName = leaderName ? `Team ${leaderName}` : `Team ${idx + 1}`;

    teamBox.innerHTML = `
      <div style="flex: 1;">
        <div style="color: ${palette.accent}; font-size: 14px; font-weight: bold; margin-bottom: 4px;">
          ${teamName}
        </div>
        <div style="color: ${COLORS.textSecondary}; font-size: 11px;">
          ${memberNames}
        </div>
        ${teamInstr ? `
          <div style="color: ${COLORS.textMuted}; font-size: 10px; margin-top: 4px; font-style: italic;">
            📋 ${escapeHtml(teamInstr)}
          </div>
        ` : ''}
      </div>
      <div style="text-align: right;">
        <div style="color: ${COLORS.textSecondary}; font-size: 11px;">
          ${team.length} members
        </div>
        <div style="color: ${palette.accent}; font-size: 13px; font-weight: bold;">
          Avg: ${stats.teams[idx].avgScore}
        </div>
      </div>
    `;
    container.appendChild(teamBox);
  });

  // Reserve Pool
  if (reservePool && reservePool.length > 0) {
    const reserveTitle = document.createElement('div');
    reserveTitle.style.cssText = `
      color: #f39c12;
      font-size: 14px;
      font-weight: bold;
      margin-top: 16px;
      margin-bottom: 10px;
    `;
    reserveTitle.textContent = `🪑 Reserve List (${reservePool.length})`;
    container.appendChild(reserveTitle);

    const reserveBox = document.createElement('div');
    reserveBox.style.cssText = `
      background: ${COLORS.cardBg};
      border-left: 4px solid #f39c12;
      border-radius: 8px;
      padding: 12px 16px;
    `;
    const reserveNames = reservePool.map(m => m.chief_name).join(', ');
    reserveBox.innerHTML = `
      <div style="color: ${COLORS.textSecondary}; font-size: 11px;">
        ${escapeHtml(reserveNames)}
      </div>
    `;
    container.appendChild(reserveBox);
  }

  // Footer
  const footer = document.createElement('div');
  footer.style.cssText = `
    margin-top: 20px;
    padding: 12px;
    background: ${COLORS.footerBg};
    border-radius: 8px;
    text-align: center;
    color: ${COLORS.footerText};
    font-size: 11px;
  `;
  footer.innerHTML = `
    Aegis Planner — ${ALLIANCE} Alliance [${STATE}] — Generated ${new Date().toLocaleDateString()}
  `;
  container.appendChild(footer);

  // Append to body temporarily and measure actual height to avoid clipping
  document.body.appendChild(container);

  try {
    // Wait for next frame to ensure DOM is rendered
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Measure actual content height (use scrollHeight to include overflow)
    const actualHeight = Math.max(container.scrollHeight, container.offsetHeight, height);
    container.style.height = `${actualHeight}px`;

    // Generate PNG with measured height to avoid clipping
    const dataUrl = await toPng(container, {
      width,
      height: actualHeight,
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: COLORS.bg,
      style: {
        position: 'static',
        left: 'auto',
        top: 'auto',
      },
    });

    // Download
    const link = document.createElement('a');
    link.download = `${eventName.replace(/[^a-z0-9]/gi, '_')}_overview.png`;
    link.href = dataUrl;
    link.click();

    return dataUrl;
  } catch (error) {
    console.error('PNG Export Error:', error);
    throw new Error(`Failed to generate overview PNG: ${error.message}`);
  } finally {
    // Clean up
    document.body.removeChild(container);
  }
};

/**
 * Generate individual team detail PNGs
 */
export const exportTeamPNGs = async (
  eventName,
  eventType,
  teams,
  teamInstructions,
  teamLeaders
) => {
  const results = [];

  for (let idx = 0; idx < teams.length; idx++) {
    const team = teams[idx];
    const teamNum = idx + 1;
    const palette = TEAM_PALETTE[idx % TEAM_PALETTE.length];
    const width = 900;
    
    // Calculate height
    const bannerHeight = 80;
    const memberRows = team.length;
    const memberTableHeight = 60 + (memberRows * 35);
    const instrHeight = teamInstructions[teamNum]?.trim() ? 100 : 0;
    const footerHeight = 50;
    const height = bannerHeight + memberTableHeight + instrHeight + footerHeight + 60;

    const container = document.createElement('div');
    container.style.width = `${width}px`;
    container.style.height = `${height}px`;
    container.style.backgroundColor = COLORS.bg;
    container.style.padding = '20px';
    container.style.fontFamily = 'Segoe UI, sans-serif';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';

    // Team Banner
    const leaderId = teamLeaders ? teamLeaders[idx + 1] : null;
    const leaderName = leaderId ? team.find((m) => m.id === leaderId)?.chief_name : null;
    const teamName = leaderName ? `Team ${leaderName}` : `Team ${teamNum}`;

    const banner = document.createElement('div');
    banner.style.cssText = `
      background: linear-gradient(135deg, ${palette.bg}, ${palette.light});
      border-left: 4px solid ${palette.accent};
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 16px;
    `;
    banner.innerHTML = `
      <div style="color: ${palette.accent}; font-size: 24px; font-weight: bold; margin-bottom: 4px;">
        ${teamName}
      </div>
      <div style="color: ${COLORS.textSecondary}; font-size: 13px;">
        ${eventName} (${eventType})
      </div>
    `;
    container.appendChild(banner);

    // Member Table
    const table = document.createElement('div');
    table.style.cssText = `
      background: ${COLORS.cardBg};
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 16px;
    `;
    
    let tableHTML = `
      <div style="
        background: ${palette.accent};
        color: ${COLORS.headerText};
        padding: 12px 16px;
        font-weight: bold;
        font-size: 13px;
        display: grid;
        grid-template-columns: 1fr;
        gap: 12px;
      ">
        <div>Chief Name</div>
      </div>
    `;

    team.forEach((member, mIdx) => {
      const rowBg = mIdx % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd;
      const isLeader = leaderId === member.id;
      
      tableHTML += `
        <div style="
          background: ${rowBg};
          color: ${COLORS.rowText};
          padding: 10px 16px;
          font-size: 12px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          border-bottom: 1px solid ${COLORS.border};
        ">
          <div>${isLeader ? '⭐ ' : '• '}${escapeHtml(member.chief_name)}</div>
        </div>
      `;
    });

    table.innerHTML = tableHTML;
    container.appendChild(table);

    // Team Instructions
    if (teamInstructions[teamNum]?.trim()) {
      const instrBox = document.createElement('div');
      instrBox.style.cssText = `
        background: ${palette.light};
        border-left: 3px solid ${palette.accent};
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 16px;
      `;
      instrBox.innerHTML = `
        <div style="color: ${palette.accent}; font-size: 12px; font-weight: bold; margin-bottom: 6px;">
          📋 Team Instructions
        </div>
        <div style="color: ${COLORS.textPrimary}; font-size: 11px; line-height: 1.5;">
          ${escapeHtml(teamInstructions[teamNum])}
        </div>
      `;
      container.appendChild(instrBox);
    }

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 10px;
      text-align: center;
      color: ${COLORS.footerText};
      font-size: 10px;
    `;
    footer.textContent = `${ALLIANCE} Alliance [${STATE}] — ${new Date().toLocaleDateString()}`;
    container.appendChild(footer);

    document.body.appendChild(container);

    try {
      // Wait for next frame to ensure DOM is rendered
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Measure actual content height to avoid clipping
      const actualHeight = Math.max(container.scrollHeight, container.offsetHeight, height);
      container.style.height = `${actualHeight}px`;

      const dataUrl = await toPng(container, {
        width,
        height: actualHeight,
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: COLORS.bg,
        style: {
          position: 'static',
          left: 'auto',
          top: 'auto',
        },
      });

      const link = document.createElement('a');
      link.download = `${eventName.replace(/[^a-z0-9]/gi, '_')}_team${teamNum}.png`;
      link.href = dataUrl;
      link.click();

      results.push({ teamNum, dataUrl });
    } catch (error) {
      console.error(`Team ${teamNum} PNG Export Error:`, error);
      throw new Error(`Failed to generate team ${teamNum} PNG: ${error.message}`);
    } finally {
      document.body.removeChild(container);
    }

    // Delay between exports to avoid overwhelming the browser
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return results;
};

/**
 * Export all PNG images (overview + all team cards)
 */
export const exportAllPNGs = async (
  eventName,
  eventType,
  teams,
  generalInstructions,
  teamInstructions,
  reservePool,
  teamLeaders
) => {
  try {
    // Export overview
    await exportOverviewPNG(eventName, eventType, teams, generalInstructions, teamInstructions, reservePool, teamLeaders);
    
    // Export individual team cards
    await exportTeamPNGs(eventName, eventType, teams, teamInstructions, teamLeaders);
    
    return {
      success: true,
      count: teams.length + 1,
    };
  } catch (error) {
    console.error('PNG Export Error:', error);
    throw error;
  }
};

// Helper function to escape HTML
const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

/**
 * Export a finished event rapport as a professionally styled PNG
 */
export const exportFinishedEventPNG = async (event, membersList) => {
  // Helper to resolve saved entry (ID or legacy name) to display name
  const resolveDisplayName = (entry) => {
    if (!membersList) return entry;
    const m = membersList.find((mem) => mem.id === entry) || membersList.find((mem) => mem.chief_name === entry);
    return m ? m.chief_name : entry;
  };
  const width = 1000;
  const teamCount = event.teams?.length || 0;
  const totalMembers = event.teams?.reduce((s, t) => s + t.length, 0) || 0;

  // Calculate dynamic height
  const bannerH = 110;
  const outcomeH = 80;
  const rapportH = event.rapport?.trim() ? 40 + Math.ceil(event.rapport.length / 100) * 20 + 30 : 0;
  const teamHeaderH = 50;
  const teamRows = event.teams?.reduce((s, t) => s + t.length + 2, 0) || 0; // +2 per team for header + spacing
  const teamsH = teamHeaderH + teamRows * 30 + 20;
  const footerH = 60;
  const height = bannerH + outcomeH + rapportH + teamsH + footerH + 80;

  const container = document.createElement('div');
  container.style.width = `${width}px`;
  container.style.minHeight = `${height}px`;
  container.style.backgroundColor = COLORS.bg;
  container.style.padding = '24px';
  container.style.fontFamily = 'Segoe UI, sans-serif';
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';

  // ── Banner ──
  const banner = document.createElement('div');
  banner.style.cssText = `
    background: linear-gradient(90deg, ${COLORS.bannerBg} 0%, #1b2838 50%, ${COLORS.bannerBg} 100%);
    border-radius: 12px;
    padding: 20px 28px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;

  const isWinner = event.outcome === 'Winner';
  const outcomeColor = isWinner ? '#27ae60' : event.outcome === 'Loser' ? '#e74c3c' : COLORS.textMuted;
  const outcomeIcon = isWinner ? '🏆' : event.outcome === 'Loser' ? '❌' : '—';

  banner.innerHTML = `
    <div>
      <div style="color: ${COLORS.bannerAccent}; font-size: 26px; font-weight: bold; margin-bottom: 4px;">
        [${ALLIANCE}]
      </div>
      <div style="color: ${COLORS.textSecondary}; font-size: 13px; font-style: italic;">
        ${ALLIANCE_FULL}
      </div>
    </div>
    <div style="text-align: center;">
      <div style="color: ${COLORS.bannerAccent}; font-size: 22px; font-weight: bold;">
        ${escapeHtml(event.event_name)}
      </div>
      <div style="color: ${COLORS.textSecondary}; font-size: 12px; margin-top: 2px;">
        ${event.event_type === 'KOTH' ? 'King of the Hill' : event.event_type === 'RR' ? 'Reservoir Raid' : 'State Warfare'}
        &nbsp;•&nbsp; Finished ${new Date(event.finishedAt).toLocaleDateString()}
      </div>
    </div>
    <div style="
      background: ${COLORS.stateBadgeBg};
      border: 1px solid ${COLORS.stateBadgeBorder};
      border-radius: 10px;
      padding: 10px 20px;
      text-align: center;
    ">
      <div style="color: ${COLORS.stateLabel}; font-size: 11px; font-weight: bold; margin-bottom: 2px;">STATE</div>
      <div style="color: ${COLORS.gold}; font-size: 20px; font-weight: bold;">${STATE}</div>
    </div>
  `;
  container.appendChild(banner);

  // ── Outcome Badge ──
  const outcomeBox = document.createElement('div');
  outcomeBox.style.cssText = `
    background: ${COLORS.cardBg};
    border-radius: 12px;
    padding: 18px 24px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-left: 5px solid ${outcomeColor};
  `;
  outcomeBox.innerHTML = `
    <div>
      <div style="color: ${COLORS.textSecondary}; font-size: 12px; margin-bottom: 4px;">OUTCOME</div>
      <div style="color: ${outcomeColor}; font-size: 22px; font-weight: bold;">
        ${outcomeIcon} ${event.outcome || 'Not set'}
      </div>
    </div>
    <div style="display: flex; gap: 24px;">
      <div style="text-align: center;">
        <div style="color: ${COLORS.textMuted}; font-size: 11px;">Teams</div>
        <div style="color: ${COLORS.textPrimary}; font-size: 20px; font-weight: bold;">${teamCount}</div>
      </div>
      <div style="text-align: center;">
        <div style="color: ${COLORS.textMuted}; font-size: 11px;">Participants</div>
        <div style="color: ${COLORS.textPrimary}; font-size: 20px; font-weight: bold;">${totalMembers}</div>
      </div>
    </div>
  `;
  container.appendChild(outcomeBox);

  // ── Rapport ──
  if (event.rapport?.trim()) {
    const rapportBox = document.createElement('div');
    rapportBox.style.cssText = `
      background: ${COLORS.cardBg};
      border: 2px solid ${COLORS.gold};
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 20px;
    `;
    rapportBox.innerHTML = `
      <div style="color: ${COLORS.gold}; font-size: 14px; font-weight: bold; margin-bottom: 8px;">
        📝 FINAL RAPPORT
      </div>
      <div style="color: ${COLORS.textPrimary}; font-size: 13px; line-height: 1.6; white-space: pre-wrap;">
        ${escapeHtml(event.rapport)}
      </div>
    `;
    container.appendChild(rapportBox);
  }

  // ── Participants ──
  const partTitle = document.createElement('div');
  partTitle.style.cssText = `
    color: ${COLORS.textPrimary};
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 14px;
  `;
  partTitle.textContent = `📋 Participants (${totalMembers})`;
  container.appendChild(partTitle);

  const teamsGrid = document.createElement('div');
  teamsGrid.style.cssText = `
    display: grid;
    grid-template-columns: repeat(${Math.min(teamCount, 3)}, 1fr);
    gap: 14px;
    margin-bottom: 20px;
  `;

  event.teams.forEach((team, idx) => {
    const palette = TEAM_PALETTE[idx % TEAM_PALETTE.length];
    const card = document.createElement('div');
    card.style.cssText = `
      background: ${palette.bg};
      border-left: 4px solid ${palette.accent};
      border-radius: 10px;
      overflow: hidden;
    `;

    let cardHTML = `
      <div style="
        background: ${palette.accent};
        color: #fff;
        padding: 10px 16px;
        font-weight: bold;
        font-size: 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <span>TEAM ${idx + 1}</span>
        <span style="font-size: 12px; font-weight: normal;">${team.length} members</span>
      </div>
    `;

    team.forEach((entry, mIdx) => {
      const displayName = resolveDisplayName(entry);
      const rowBg = mIdx % 2 === 0 ? palette.bg : palette.light;
      cardHTML += `
        <div style="
          padding: 8px 16px;
          color: ${COLORS.textPrimary};
          font-size: 12px;
          background: ${rowBg};
          border-bottom: 1px solid ${COLORS.border};
        ">
          • ${escapeHtml(displayName)}
        </div>
      `;
    });

    card.innerHTML = cardHTML;
    teamsGrid.appendChild(card);
  });

  container.appendChild(teamsGrid);

  // ── Footer ──
  const footer = document.createElement('div');
  footer.style.cssText = `
    margin-top: 16px;
    padding: 14px;
    background: ${COLORS.footerBg};
    border-radius: 8px;
    text-align: center;
    color: ${COLORS.footerText};
    font-size: 11px;
  `;
  footer.innerHTML = `Aegis Planner — ${ALLIANCE} Alliance [${STATE}] — Event Rapport — Generated ${new Date().toLocaleDateString()}`;
  container.appendChild(footer);

  // ── Render to PNG ──
  document.body.appendChild(container);

  try {
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 100));

    const dataUrl = await toPng(container, {
      width,
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: COLORS.bg,
      style: {
        position: 'static',
        left: 'auto',
        top: 'auto',
      },
    });

    const link = document.createElement('a');
    link.download = `${event.event_name.replace(/[^a-z0-9]/gi, '_')}_rapport.png`;
    link.href = dataUrl;
    link.click();

    return dataUrl;
  } catch (error) {
    console.error('Finished Event PNG Export Error:', error);
    throw new Error(`Failed to generate rapport PNG: ${error.message}`);
  } finally {
    document.body.removeChild(container);
  }
};

/**
 * Export the After Action Report (AAR) as a professionally styled PNG
 */
export const exportAARPNG = async (event, participantEvals, membersList) => {
  const isWin = event.outcome === 'Winner';
  const accentColor = isWin ? '#f1c40f' : '#3498db';
  const accentSecondary = isWin ? '#e67e22' : '#95a5a6';
  const themeCardBg = isWin ? '#3a3520' : '#1e2d40';
  const themeBannerBg = isWin
    ? 'linear-gradient(135deg, #2d2a1a 0%, #3d2f10 50%, #2d2a1a 100%)'
    : 'linear-gradient(135deg, #1a2332 0%, #1e3a5f 50%, #1a2332 100%)';
  const themeTitle = isWin ? 'VICTORY' : 'DEFEAT';
  const themeSubtitle = isWin ? `${ALLIANCE} [${STATE}] DOMINATES` : 'WE REGROUP & REVENGE';
  const themeIcon = isWin ? '🏆' : '🛡️';

  const evals = participantEvals || event.participantEvals || {};
  const allNames = (event.teams || []).flat().map((entry) => {
    const m = membersList?.find((mem) => mem.id === entry) || membersList?.find((mem) => mem.chief_name === entry);
    return m ? m.chief_name : entry;
  });

  // Build rated participants sorted by rating descending
  const ratedParticipants = allNames
    .map((name) => ({
      name,
      rating: evals[name]?.rating || 0,
      notes: evals[name]?.notes || '',
      member: membersList?.find((m) => m.chief_name === name),
    }))
    .filter((p) => p.rating > 0)
    .sort((a, b) => b.rating - a.rating);

  // Top 5: 1 MVP + 4 best participants
  const top5 = ratedParticipants.slice(0, 5);
  const mvp = top5.length > 0 ? top5[0] : null;
  const bestParticipants = top5.slice(1);

  const width = 1100;
  // Dynamic height
  const bannerH = 160;
  const mvpH = mvp ? 140 : 0;
  const rapportH = event.rapport?.trim() ? 40 + Math.ceil(event.rapport.length / 110) * 18 + 30 : 0;
  const evalHeaderH = top5.length > 0 ? 50 : 0;
  const memberRowH = bestParticipants.length * 42;
  const reserveH = event.reservePool?.length > 0 ? 70 : 0;
  const footerH = 60;
  const height = bannerH + mvpH + rapportH + evalHeaderH + memberRowH + reserveH + footerH + 80;

  const container = document.createElement('div');
  container.style.width = `${width}px`;
  container.style.minHeight = `${height}px`;
  container.style.backgroundColor = COLORS.bg;
  container.style.padding = '24px';
  container.style.fontFamily = 'Segoe UI, sans-serif';
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';

  // ── Banner ──
  const banner = document.createElement('div');
  banner.style.cssText = `
    background: ${themeBannerBg};
    border-radius: 14px;
    padding: 28px 32px;
    margin-bottom: 20px;
    text-align: center;
  `;
  banner.innerHTML = `
    <div style="font-size: 42px; margin-bottom: 6px;">${themeIcon}</div>
    <div style="color: ${accentColor}; font-size: 32px; font-weight: 900; letter-spacing: 4px; margin-bottom: 4px;">
      ${themeTitle}
    </div>
    <div style="color: ${accentSecondary}; font-size: 16px; font-weight: bold; letter-spacing: 2px; margin-bottom: 12px;">
      ${themeSubtitle}
    </div>
    <div style="display: flex; justify-content: center; gap: 18px; color: ${COLORS.textSecondary}; font-size: 12px;">
      <span>${escapeHtml(event.event_name)}</span>
      <span style="color: ${COLORS.textMuted};">•</span>
      <span>${event.event_type === 'KOTH' ? 'King of the Hill' : event.event_type === 'RR' ? 'Reservoir Raid' : 'State Warfare'}</span>
      <span style="color: ${COLORS.textMuted};">•</span>
      <span>${new Date(event.finishedAt).toLocaleDateString()}</span>
    </div>
  `;
  container.appendChild(banner);

  // ── MVP Commendation ──
  if (mvp) {
    const mvpBox = document.createElement('div');
    mvpBox.style.cssText = `
      background: ${themeCardBg};
      border: 2px solid ${accentColor};
      border-radius: 14px;
      padding: 22px;
      margin-bottom: 20px;
      text-align: center;
    `;
    mvpBox.innerHTML = `
      <div style="color: ${accentSecondary}; font-size: 10px; font-weight: bold; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 6px;">
        — COMMENDATION —
      </div>
      <div style="color: ${accentColor}; font-size: 24px; font-weight: 900; margin-bottom: 4px;">
        ${mvp.member?.isGuest ? '✈️ ' : ''}${escapeHtml(mvp.name)}
      </div>
      <div style="color: ${accentColor}; font-size: 18px; font-weight: bold; margin-bottom: 4px;">${mvp.rating}/10</div>
      <div style="color: ${COLORS.textMuted}; font-size: 11px;">Most Valuable Player — ${event.event_type} Event</div>
    `;
    container.appendChild(mvpBox);
  }

  // ── Rapport ──
  if (event.rapport?.trim()) {
    const rapportBox = document.createElement('div');
    rapportBox.style.cssText = `
      background: ${COLORS.cardBg};
      border: 2px solid ${COLORS.gold};
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 20px;
    `;
    rapportBox.innerHTML = `
      <div style="color: ${COLORS.gold}; font-size: 14px; font-weight: bold; margin-bottom: 8px;">📝 FINAL RAPPORT</div>
      <div style="color: ${COLORS.textPrimary}; font-size: 12px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(event.rapport)}</div>
    `;
    container.appendChild(rapportBox);
  }

  // ── Best Participants (top 4 after MVP) ──
  if (bestParticipants.length > 0) {
    const evalTitle = document.createElement('div');
    evalTitle.style.cssText = `
      color: ${COLORS.textPrimary};
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 14px;
    `;
    evalTitle.textContent = `🏅 Best Participants`;
    container.appendChild(evalTitle);

    bestParticipants.forEach((p, mIdx) => {
      const rowBg = mIdx % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd;

      const row = document.createElement('div');
      row.style.cssText = `
        background: ${rowBg};
        border-left: 3px solid ${accentColor};
        border-radius: 6px;
        padding: 10px 14px;
        margin-bottom: 4px;
        display: grid;
        grid-template-columns: 2fr 1fr 2fr;
        align-items: center;
        gap: 12px;
      `;
      row.innerHTML = `
        <div style="color: ${COLORS.textPrimary}; font-size: 13px;">
          ${p.member?.isGuest ? '✈️ ' : ''}${escapeHtml(p.name)}
        </div>
        <div style="color: ${accentColor}; font-size: 14px; font-weight: bold; text-align: center;">
          ${p.rating}/10
        </div>
        <div style="color: ${COLORS.textSecondary}; font-size: 11px; text-align: right; font-style: italic;">
          ${p.notes ? escapeHtml(p.notes) : ''}
        </div>
      `;
      container.appendChild(row);
    });
  }

  // ── Reserve List ──
  if (event.reservePool && event.reservePool.length > 0) {
    const reserveBox = document.createElement('div');
    reserveBox.style.cssText = `
      background: ${COLORS.cardBg};
      border-left: 4px solid #f39c12;
      border-radius: 8px;
      padding: 12px 16px;
      margin-top: 16px;
    `;
    reserveBox.innerHTML = `
      <div style="color: #f39c12; font-size: 13px; font-weight: bold; margin-bottom: 6px;">🪑 Reserve List</div>
      <div style="color: ${COLORS.textSecondary}; font-size: 11px;">${event.reservePool.map(entry => {
        const m = membersList?.find(mem => mem.id === entry) || membersList?.find(mem => mem.chief_name === entry);
        return escapeHtml(m ? m.chief_name : entry);
      }).join(', ')}</div>
    `;
    container.appendChild(reserveBox);
  }

  // ── Footer ──
  const footer = document.createElement('div');
  footer.style.cssText = `
    margin-top: 20px;
    padding: 14px;
    background: ${COLORS.footerBg};
    border-radius: 8px;
    text-align: center;
    color: ${COLORS.footerText};
    font-size: 11px;
  `;
  footer.innerHTML = `Aegis Planner — ${ALLIANCE} Alliance [${STATE}] — After Action Report — Generated ${new Date().toLocaleDateString()}`;
  container.appendChild(footer);

  // ── Render ──
  document.body.appendChild(container);

  try {
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 100));

    const dataUrl = await toPng(container, {
      width,
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: COLORS.bg,
      style: {
        position: 'static',
        left: 'auto',
        top: 'auto',
      },
    });

    const link = document.createElement('a');
    link.download = `${event.event_name.replace(/[^a-z0-9]/gi, '_')}_AAR.png`;
    link.href = dataUrl;
    link.click();

    return dataUrl;
  } catch (error) {
    console.error('AAR PNG Export Error:', error);
    throw new Error(`Failed to generate AAR PNG: ${error.message}`);
  } finally {
    document.body.removeChild(container);
  }
};
