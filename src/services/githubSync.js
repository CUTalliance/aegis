/**
 * GitHub Sync Service
 * Allows the static GitHub Pages app to read/write a JSON workspace file
 * via the GitHub API, acting as a pseudo-database.
 */
import { GITHUB_OWNER, GITHUB_REPO, DATA_FILE_PATH } from '../config';

/**
 * Fetch the latest published plan from GitHub (public, no auth required).
 * Uses raw.githubusercontent.com so any alliance member can download on page load.
 * @returns {Promise<Object|null>} The parsed workspace data, or null on failure.
 */
export async function fetchLatestPlan() {
  const url = `https://raw.githubusercontent.com/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/main/${DATA_FILE_PATH}`;

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      if (response.status === 404) {
        console.warn('[GitHubSync] No workspace.json found in repo yet.');
        return null;
      }
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[GitHubSync] Failed to fetch latest plan:', error);
    return null;
  }
}

/**
 * Publish the current workspace state to GitHub (requires PAT with repo scope).
 * Step A: GET the file's current SHA.
 * Step B: PUT to overwrite the file with new Base64-encoded content.
 *
 * @param {Object} data - The full workspace state to publish (members, events, etc.)
 * @param {string} token - GitHub Personal Access Token (from localStorage, never hardcoded)
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function publishPlanToGithub(data, token) {
  if (!token) {
    return { success: false, message: 'No R4 Command Key found. Please enter your key in the Command Key settings.' };
  }

  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${DATA_FILE_PATH}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github.v3+json',
  };

  try {
    // Step A: Get current file SHA (may not exist yet)
    let sha = null;
    const getResponse = await fetch(apiUrl, { headers });
    if (getResponse.ok) {
      const fileInfo = await getResponse.json();
      sha = fileInfo.sha;
    } else if (getResponse.status !== 404) {
      throw new Error(`Failed to read file info: HTTP ${getResponse.status}`);
    }

    // Step B: PUT the updated file
    const jsonString = JSON.stringify(data, null, 2);
    const content = btoa(unescape(encodeURIComponent(jsonString)));

    const body = {
      message: `R4 Update: Aegis Roster — ${new Date().toISOString()}`,
      content,
    };
    if (sha) {
      body.sha = sha;
    }

    const putResponse = await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    if (!putResponse.ok) {
      const errData = await putResponse.json().catch(() => ({}));
      throw new Error(errData.message || `HTTP ${putResponse.status}`);
    }

    return { success: true, message: 'Deployment plan published to the alliance successfully!' };
  } catch (error) {
    console.error('[GitHubSync] Publish failed:', error);

    // Provide user-friendly messages based on common error types
    let userMessage = 'Failed to contact the War Room. Please try again later.';
    const msg = error.message || '';
    if (msg.includes('401') || msg.toLowerCase().includes('bad credentials')) {
      userMessage = 'Invalid R4 Command Key. Please check your key in settings and try again.';
    } else if (msg.includes('403')) {
      userMessage = 'Access denied. Your R4 Command Key may not have the required permissions.';
    } else if (msg.includes('404')) {
      userMessage = 'The Alliance Database could not be found. Please contact Ash-baal.';
    } else if (msg.includes('409')) {
      userMessage = 'Conflict detected — someone else may have published at the same time. Please try again.';
    }

    return { success: false, message: userMessage };
  }
}
