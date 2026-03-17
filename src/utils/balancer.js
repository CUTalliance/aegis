/**
 * Team Balancer Utility - Snake Draft Algorithm
 * Implements the snake-draft balancing algorithm for distributing members
 * into balanced teams based on their master scores for the event type.
 */

/**
 * Get the score for a member based on event type
 * Uses game-provided scores directly (no calculation)
 * @param {Object} member - Member object
 * @param {string} eventType - Event type (KOTH, RR, or SVS)
 * @returns {number} Score for the event type
 */
export const calculateMasterScore = (member, eventType) => {
  if (eventType === 'KOTH') return member.score_koth;
  if (eventType === 'RR') return member.score_rr;
  // SVS = average of KOTH and RR scores
  return (member.score_koth + member.score_rr) / 2;
};

/**
 * Perform snake-draft team balancing
 * Sorts members by score and distributes them in alternating order:
 * 1, 2, 3, 3, 2, 1, 1, 2, 3, 3, 2, 1...
 *
 * CombatRole-aware:
 * - Members with CombatRole 'Reserve' are excluded and returned in reservePool
 * - 'Rally Leader' members are distributed evenly across teams first
 * - Remaining members fill via standard snake draft
 *
 * @param {Array} selectedMembers - Array of member objects to distribute
 * @param {number} numTeams - Number of teams to create
 * @param {string} eventType - Event type for scoring (KOTH, RR, SVS)
 * @returns {{ teams: Array<Array>, reservePool: Array }} Teams and auto-reserved members
 */
export const performSnakeDraft = (selectedMembers, numTeams, eventType) => {
  if (!selectedMembers || selectedMembers.length === 0) {
    return {
      teams: Array(numTeams).fill().map(() => []),
      reservePool: [],
    };
  }

  if (numTeams < 2) {
    throw new Error('At least 2 teams are required');
  }

  // Separate Reserve members
  const reservePool = selectedMembers.filter((m) => m.CombatRole === 'Reserve');
  const activePlayers = selectedMembers.filter((m) => m.CombatRole !== 'Reserve');

  if (activePlayers.length < numTeams) {
    throw new Error(
      `Not enough active members (${activePlayers.length}) for ${numTeams} teams. ${reservePool.length} member(s) auto-reserved.`
    );
  }

  // Separate Rally Leaders from other active players
  const rallyLeaders = activePlayers
    .filter((m) => m.CombatRole === 'Rally Leader')
    .sort((a, b) => calculateMasterScore(b, eventType) - calculateMasterScore(a, eventType));
  const otherPlayers = activePlayers
    .filter((m) => m.CombatRole !== 'Rally Leader')
    .sort((a, b) => calculateMasterScore(b, eventType) - calculateMasterScore(a, eventType));

  // Initialize teams
  const teams = Array(numTeams).fill().map(() => []);

  // Distribute Rally Leaders evenly (round-robin)
  rallyLeaders.forEach((leader, idx) => {
    teams[idx % numTeams].push(leader);
  });

  // Snake-draft remaining players
  let direction = 1;
  let teamIdx = 0;

  for (const member of otherPlayers) {
    teams[teamIdx].push(member);

    teamIdx += direction;

    if (teamIdx >= numTeams) {
      direction = -1;
      teamIdx = numTeams - 1;
    } else if (teamIdx < 0) {
      direction = 1;
      teamIdx = 0;
    }
  }

  return { teams, reservePool };
};

/**
 * Calculate team statistics
 * @param {Array<Array>} teams - Array of teams (each team is array of members)
 * @param {string} eventType - Event type for scoring
 * @returns {Object} Statistics object
 */
export const calculateTeamStats = (teams, eventType) => {
  const stats = teams.map((team, index) => {
    const totalScore = team.reduce((sum, member) => {
      return sum + calculateMasterScore(member, eventType);
    }, 0);

    const avgScore = team.length > 0 ? totalScore / team.length : 0;

    return {
      teamNum: index + 1,
      memberCount: team.length,
      totalScore: Math.round(totalScore),
      avgScore: Math.round(avgScore * 100) / 100,
    };
  });

  // Calculate balance percentage
  if (stats.length > 0) {
    const maxScore = Math.max(...stats.map((s) => s.avgScore));
    const minScore = Math.min(...stats.map((s) => s.avgScore));
    const spread = maxScore - minScore;
    const balancePercentage =
      maxScore > 0 ? 100 - (spread / maxScore) * 100 : 100;

    return {
      teams: stats,
      balancePercentage: Math.round(balancePercentage * 100) / 100,
      maxAvgScore: maxScore,
      minAvgScore: minScore,
      scoreSpread: Math.round(spread * 100) / 100,
    };
  }

  return {
    teams: stats,
    balancePercentage: 0,
    maxAvgScore: 0,
    minAvgScore: 0,
    scoreSpread: 0,
  };
};

/**
 * Validate team distribution
 * @param {Array<Array>} teams - Array of teams
 * @param {Array} selectedMembers - Original selected members
 * @returns {Object} Validation result
 */
export const validateTeamDistribution = (teams, selectedMembers) => {
  let isValid = true;
  const errors = [];

  // Check total member count
  const totalMembers = teams.reduce((sum, team) => sum + team.length, 0);
  if (totalMembers !== selectedMembers.length) {
    isValid = false;
    errors.push(
      `Member count mismatch: ${totalMembers} distributed vs ${selectedMembers.length} selected`
    );
  }

  // Check for duplicate members
  const seen = new Set();
  for (const team of teams) {
    for (const member of team) {
      if (seen.has(member.id)) {
        isValid = false;
        errors.push(`Duplicate member found: ${member.chief_name}`);
      }
      seen.add(member.id);
    }
  }

  return {
    isValid,
    errors,
  };
};

/**
 * Rebalance teams by swapping members
 * Attempts to improve balance by swapping members between teams
 * @param {Array<Array>} teams - Current teams
 * @param {string} eventType - Event type for scoring
 * @returns {Array<Array>} Rebalanced teams
 */
export const rebalanceTeams = (teams, eventType) => {
  const rebalanced = teams.map((team) => [...team]); // Deep copy

  // Simple rebalancing: if difference is high, attempt swaps
  let improved = true;
  let iterations = 0;
  const maxIterations = 100;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < rebalanced.length; i++) {
      for (let j = i + 1; j < rebalanced.length; j++) {
        const teamI = rebalanced[i];
        const teamJ = rebalanced[j];

        for (let mi = 0; mi < teamI.length; mi++) {
          for (let mj = 0; mj < teamJ.length; mj++) {
            const memberI = teamI[mi];
            const memberJ = teamJ[mj];

            // Calculate current state
            const scoreBeforeI = teamI.reduce(
              (sum, m) => sum + calculateMasterScore(m, eventType),
              0
            );
            const scoreBeforeJ = teamJ.reduce(
              (sum, m) => sum + calculateMasterScore(m, eventType),
              0
            );

            // Simulate swap
            const scoreAfterI =
              scoreBeforeI -
              calculateMasterScore(memberI, eventType) +
              calculateMasterScore(memberJ, eventType);
            const scoreAfterJ =
              scoreBeforeJ -
              calculateMasterScore(memberJ, eventType) +
              calculateMasterScore(memberI, eventType);

            // Check if swap improves balance
            const diffBefore = Math.abs(scoreBeforeI - scoreBeforeJ);
            const diffAfter = Math.abs(scoreAfterI - scoreAfterJ);

            if (diffAfter < diffBefore) {
              // Perform swap
              [teamI[mi], teamJ[mj]] = [teamJ[mj], teamI[mi]];
              improved = true;
            }
          }
        }
      }
    }
  }

  return rebalanced;
};
