/**
 * Commits page loader
 * - Fetches commits.json from each project's data folder
 * - Renders commit cards in a 2-column grid
 * - Manual refresh button + auto-refresh every 3 hours
 */

const REFRESH_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours
const MAX_COMMITS_DISPLAY = 8;

let refreshTimer = null;

async function loadProjects() {
  try {
    const resp = await fetch('config/projects.json');
    if (!resp.ok) throw new Error('Failed to load projects.json');
    const data = await resp.json();
    return data.projects || [];
  } catch (err) {
    console.error('Error loading projects:', err);
    return [];
  }
}

async function discoverDataKeys() {
  // Try to discover project keys from data-index.json (generated at build time)
  try {
    const resp = await fetch('data/data-index.json');
    if (!resp.ok) return [];
    const keys = await resp.json();
    return keys || [];
  } catch (err) {
    return [];
  }
}

function getProjectInfo(projects, key) {
  // Exact match first
  const exactMatch = projects.find(p => p.key === key);
  if (exactMatch) return { ...exactMatch, key };
  
  // Fuzzy match: same owner (GitHub username)
  const [owner, repo] = key.split('__');
  
  // Check primary owner
  let ownerMatch = projects.find(p => p.owner === owner);
  
  // Check additional_owners if no primary match
  if (!ownerMatch) {
    ownerMatch = projects.find(p => 
      p.additional_owners && p.additional_owners.includes(owner)
    );
  }
  
  if (ownerMatch) {
    // If the project had "TBD" as repo, replace it with the actual repo name
    const actualRepo = (ownerMatch.repo === 'TBD' || !ownerMatch.repo) ? repo : ownerMatch.repo;
    
    return {
      ...ownerMatch,
      key,
      repo: actualRepo,
      display_name: ownerMatch.display_name,
      member: ownerMatch.member
    };
  }
  
  // Auto-generate info from key (owner__repo format)
  return {
    key,
    display_name: repo || key,
    member: owner || 'Unknown',
    owner,
    repo
  };
}

async function loadCommits(key) {
  try {
    // Add timestamp to prevent caching issues during active debugging
    const resp = await fetch(`data/${key}/commits.json?t=${Date.now()}`);
    if (!resp.ok) {
      console.warn(`Failed to fetch commits.json for ${key}: ${resp.status}`);
      return null;
    }
    const data = await resp.json();
    
    // Handle backward compatibility: if data is an array (old format), normalize it
    if (Array.isArray(data)) {
      const normalized = {
        commits: data.map(commit => ({
          sha_short: commit.sha || commit.sha_short || '—',
          message: commit.message || '',
          committed_at: commit.timestamp || commit.committed_at || ''
        }))
      };
      console.log(`Normalized old format for ${key}: ${normalized.commits.length} commits`);
      return normalized;
    }
    
    // New format: ensure commits array exists and normalize field names
    if (data.commits && Array.isArray(data.commits)) {
      const normalized = {
        ...data,
        commits: data.commits.map(commit => ({
          sha_short: commit.sha_short || commit.sha || '—',
          message: commit.message || '',
          committed_at: commit.committed_at || commit.timestamp || ''
        }))
      };
      console.log(`Normalized new format for ${key}: ${normalized.commits.length} commits`);
      return normalized;
    }
    
    console.warn(`Unexpected data format for ${key}:`, data);
    return { commits: [] };
  } catch (err) {
    console.error(`Error loading commits for ${key}:`, err);
    return null;
  }
}

function formatTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffHours < 1) return 'just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

function renderCommitCard(project, commitsData) {
  const card = document.createElement('div');
  card.className = 'commit-card';
  
  const header = document.createElement('div');
  header.className = 'commit-card-header';
  // Extract repo name from key if repo is TBD or missing
  const displayRepo = (project.repo && project.repo !== 'TBD') 
    ? project.repo 
    : (project.key ? project.key.split('__')[1] || project.key : 'Unknown');
  header.innerHTML = `
    <div class="commit-card-member">${project.member || 'Unknown'}</div>
    <div class="commit-card-repo">${displayRepo}</div>
  `;
  card.appendChild(header);
  
  const body = document.createElement('div');
  body.className = 'commit-card-body';
  
  // Handle both normalized format and edge cases
  const commits = commitsData?.commits || (Array.isArray(commitsData) ? commitsData : []);
  
  if (!commits || commits.length === 0) {
    body.innerHTML = '<div class="commit-card-empty">No commits yet</div>';
  } else {
    const commitsToShow = commits.slice(0, MAX_COMMITS_DISPLAY);
    commitsToShow.forEach(commit => {
      const item = document.createElement('div');
      item.className = 'commit-item';
      item.innerHTML = `
        <span class="commit-sha">${commit.sha_short || '—'}</span>
        <span class="commit-message">${escapeHtml(commit.message || '')}</span>
        <span class="commit-time">${formatTime(commit.committed_at)}</span>
      `;
      body.appendChild(item);
    });
  }
  
  card.appendChild(body);
  return card;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateLastUpdated() {
  const el = document.getElementById('lastUpdated');
  if (el) {
    const now = new Date();
    el.textContent = `Last updated: ${now.toLocaleTimeString('ko-KR')}`;
  }
}

async function refresh() {
  const container = document.getElementById('commitsContainer');
  const refreshBtn = document.getElementById('refreshBtn');
  
  if (refreshBtn) refreshBtn.disabled = true;
  container.innerHTML = '<div class="loading">Loading commits...</div>';
  
  try {
    const [projects, discoveredKeys] = await Promise.all([
      loadProjects(),
      discoverDataKeys()
    ]);
    
    // Consolidate keys:
    // If we have a discovered key for an owner, use that instead of the placeholder "TBD" key in projects.json
    
    // Map owner -> discovered key(s)
    const ownerToDiscoveredKeys = {};
    for (const key of discoveredKeys) {
      const owner = key.split('__')[0];
      if (!ownerToDiscoveredKeys[owner]) ownerToDiscoveredKeys[owner] = [];
      ownerToDiscoveredKeys[owner].push(key);
    }
    
    // Build final list of keys to render
    const finalKeys = new Set();
    
    // 1. Add keys from projects.json (replacing TBDs if discovered)
    for (const p of projects) {
      const owner = p.owner;
      // If this is a TBD project and we found a real key for this owner, use the real key(s)
      if (p.key.includes('__TBD') && ownerToDiscoveredKeys[owner]) {
        ownerToDiscoveredKeys[owner].forEach(k => finalKeys.add(k));
      } else {
        finalKeys.add(p.key);
      }
    }
    
    // 2. Add any remaining discovered keys not yet covered
    for (const key of discoveredKeys) {
      finalKeys.add(key);
    }
    
    const allKeys = [...finalKeys];
    
    if (allKeys.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-text">No projects yet.<br>Team members will appear here once they sync their first commit.</div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = '';
    
    for (const key of allKeys) {
      const projectInfo = getProjectInfo(projects, key);
      const commitsData = await loadCommits(key);
      const card = renderCommitCard(projectInfo, commitsData);
      container.appendChild(card);
    }
    
    updateLastUpdated();
  } catch (err) {
    console.error('Error refreshing commits:', err);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-text">Error loading commits</div>
      </div>
    `;
  } finally {
    if (refreshBtn) refreshBtn.disabled = false;
  }
}

function scheduleAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(refresh, REFRESH_INTERVAL_MS);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', refresh);
  }
  
  refresh();
  scheduleAutoRefresh();
});
