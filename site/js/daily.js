/**
 * Daily Logs page loader
 * - Fetches daily-index.json (generated at build time)
 * - Fetches projects.json for display names
 * - Renders project sections with date links
 * - Manual refresh button + auto-refresh daily at 18:00 KST
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000; // UTC+9

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

async function loadDailyIndex() {
  try {
    const resp = await fetch('data/daily-index.json');
    if (!resp.ok) return {};
    return await resp.json();
  } catch (err) {
    console.warn('No daily-index.json:', err);
    return {};
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

function renderDailyProject(projectInfo, dates) {
  const section = document.createElement('div');
  section.className = 'daily-project';
  
  const header = document.createElement('div');
  header.className = 'daily-project-header';
  header.innerHTML = `
    <span class="daily-project-name">${projectInfo.display_name || projectInfo.repo || projectInfo.key}</span>
    <span class="daily-project-member">${projectInfo.member || ''}</span>
  `;
  section.appendChild(header);
  
  const datesContainer = document.createElement('div');
  datesContainer.className = 'daily-dates';
  
  if (!dates || dates.length === 0) {
    datesContainer.innerHTML = '<span style="color: var(--text-muted);">No logs yet</span>';
  } else {
    // Key format: owner__repo
    const [owner, repo] = projectInfo.key.split('__');
    dates.forEach(date => {
      const link = document.createElement('a');
      link.className = 'daily-date-link';
      link.href = `log.html?path=team-tracking/${owner}/${repo}/daily/${date}.md`;
      link.textContent = date;
      datesContainer.appendChild(link);
    });
  }
  
  section.appendChild(datesContainer);
  return section;
}

function updateLastUpdated() {
  const el = document.getElementById('lastUpdated');
  if (el) {
    const now = new Date();
    el.textContent = `Last updated: ${now.toLocaleTimeString('ko-KR')}`;
  }
}

async function refresh() {
  const container = document.getElementById('dailyContainer');
  const refreshBtn = document.getElementById('refreshBtn');
  
  if (refreshBtn) refreshBtn.disabled = true;
  container.innerHTML = '<div class="loading">Loading daily logs...</div>';
  
  try {
    const [projects, dailyIndex] = await Promise.all([
      loadProjects(),
      loadDailyIndex()
    ]);
    
    // Combine: show all projects, even those without logs
    const allKeys = new Set([
      ...projects.map(p => p.key),
      ...Object.keys(dailyIndex)
    ]);
    
    if (allKeys.size === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <div class="empty-state-text">No daily logs yet</div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = '';
    
    for (const key of allKeys) {
      const projectInfo = getProjectInfo(projects, key);
      const dates = dailyIndex[key] || [];
      const section = renderDailyProject(projectInfo, dates);
      container.appendChild(section);
    }
    
    updateLastUpdated();
  } catch (err) {
    console.error('Error refreshing daily logs:', err);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-text">Error loading daily logs</div>
      </div>
    `;
  } finally {
    if (refreshBtn) refreshBtn.disabled = false;
  }
}

function getMsUntilNextKST18() {
  const now = new Date();
  
  // Current time in KST
  const nowUtc = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const nowKst = new Date(nowUtc + KST_OFFSET_MS);
  
  // Target: 18:00 KST today or tomorrow
  let targetKst = new Date(nowKst);
  targetKst.setHours(18, 0, 0, 0);
  
  if (nowKst >= targetKst) {
    // Already past 18:00 today, schedule for tomorrow
    targetKst.setDate(targetKst.getDate() + 1);
  }
  
  // Convert back to local time
  const targetUtc = targetKst.getTime() - KST_OFFSET_MS;
  const targetLocal = targetUtc - (now.getTimezoneOffset() * 60 * 1000);
  
  return targetLocal - now.getTime();
}

function scheduleAutoRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  
  const msUntilNext = getMsUntilNextKST18();
  console.log(`Next auto-refresh in ${Math.round(msUntilNext / 1000 / 60)} minutes (18:00 KST)`);
  
  refreshTimer = setTimeout(() => {
    refresh();
    scheduleAutoRefresh(); // Schedule next day
  }, msUntilNext);
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
