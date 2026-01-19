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
    return {
      ...ownerMatch,
      key,
      repo,
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
    const resp = await fetch(`data/${key}/commits.json`);
    if (!resp.ok) return null;
    const data = await resp.json();
    
    // Handle backward compatibility: if data is an array (old format), normalize it
    if (Array.isArray(data)) {
      return {
        commits: data.map(commit => ({
          sha_short: commit.sha || commit.sha_short || '—',
          message: commit.message || '',
          committed_at: commit.timestamp || commit.committed_at || ''
        }))
      };
    }
    
    // New format: ensure commits array exists and normalize field names
    if (data.commits && Array.isArray(data.commits)) {
      return {
        ...data,
        commits: data.commits.map(commit => ({
          sha_short: commit.sha_short || commit.sha || '—',
          message: commit.message || '',
          committed_at: commit.committed_at || commit.timestamp || ''
        }))
      };
    }
    
    return data;
  } catch (err) {
    console.warn(`No commits for ${key}:`, err);
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
  header.innerHTML = `
    <div class="commit-card-member">${project.member || 'Unknown'}</div>
    <div class="commit-card-repo">${project.repo || project.key}</div>
  `;
  card.appendChild(header);
  
  const body = document.createElement('div');
  body.className = 'commit-card-body';
  
  if (!commitsData || !commitsData.commits || commitsData.commits.length === 0) {
    body.innerHTML = '<div class="commit-card-empty">No commits yet</div>';
  } else {
    const commits = commitsData.commits.slice(0, MAX_COMMITS_DISPLAY);
    commits.forEach(commit => {
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
    
    // Combine: projects.json keys + any discovered keys not already in projects
    const projectKeys = new Set(projects.map(p => p.key));
    const allKeys = [...projectKeys];
    
    for (const key of discoveredKeys) {
      if (!projectKeys.has(key)) {
        allKeys.push(key);
      }
    }
    
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
