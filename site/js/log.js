/**
 * Log viewer page
 * - Reads ?path=... query param
 * - Fetches the markdown file
 * - Renders using marked.js
 */

const ALLOWED_PATH_PREFIX = 'team-tracking/';
const ALLOWED_TAGS = new Set([
  'a', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'pre', 'code', 'blockquote',
  'strong', 'em', 'hr', 'br', 'table', 'thead',
  'tbody', 'tr', 'th', 'td'
]);
const ALLOWED_ATTRS = {
  a: new Set(['href', 'title']),
  code: new Set(['class']),
  pre: new Set(['class'])
};

async function loadAndRenderLog() {
  const container = document.getElementById('logViewer');
  
  // Get path from query string
  const params = new URLSearchParams(window.location.search);
  const path = params.get('path');
  
  if (!path) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❓</div>
        <div class="empty-state-text">No log path specified</div>
      </div>
    `;
    return;
  }

  if (!isValidLogPath(path)) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-text">Invalid log path</div>
      </div>
    `;
    return;
  }
  
  try {
    const resp = await fetch(path);
    if (!resp.ok) {
      throw new Error(`Failed to fetch: ${resp.status}`);
    }
    
    const markdown = await resp.text();
    
    // Render markdown
    if (typeof marked !== 'undefined') {
      const rendered = marked.parse(markdown);
      container.innerHTML = sanitizeHtml(rendered);
    } else {
      // Fallback: show raw markdown in pre
      container.innerHTML = `<pre>${escapeHtml(markdown)}</pre>`;
    }
    
    // Update page title with date from path
    const dateMatch = path.match(/(\d{4}-\d{2}-\d{2})\.md$/);
    if (dateMatch) {
      document.title = `${dateMatch[1]} — Gene-Brain Hub`;
    }
    
  } catch (err) {
    console.error('Error loading log:', err);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-text">Error loading log: ${escapeHtml(path)}</div>
      </div>
    `;
  }
}

function isValidLogPath(path) {
  if (!path.startsWith(ALLOWED_PATH_PREFIX)) return false;
  if (!path.endsWith('.md')) return false;
  if (path.includes('..')) return false;
  if (path.includes('\\')) return false;
  if (path.includes('://')) return false;
  return /^[A-Za-z0-9/_.-]+$/.test(path);
}

function sanitizeHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const elements = Array.from(doc.body.querySelectorAll('*'));

  for (const el of elements) {
    const tag = el.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) {
      const text = doc.createTextNode(el.textContent || '');
      el.replaceWith(text);
      continue;
    }

    const allowed = ALLOWED_ATTRS[tag] || new Set();
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      if (name.startsWith('on') || name === 'style') {
        el.removeAttribute(attr.name);
        continue;
      }

      if (!allowed.has(name)) {
        el.removeAttribute(attr.name);
        continue;
      }

      if (tag === 'a' && name === 'href' && !isSafeHref(value)) {
        el.removeAttribute(attr.name);
      }
    }

    if (tag === 'a' && el.getAttribute('href')) {
      el.setAttribute('rel', 'noopener noreferrer');
    }
  }

  return doc.body.innerHTML;
}

function isSafeHref(href) {
  if (!href) return false;
  if (href.startsWith('#')) return true;
  if (href.startsWith('/') || href.startsWith('./')) return true;
  return /^https?:\/\//i.test(href) || /^mailto:/i.test(href);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
document.addEventListener('DOMContentLoaded', loadAndRenderLog);
