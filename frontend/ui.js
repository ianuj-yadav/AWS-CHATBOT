// ui.js - UI rendering helpers for chat and admin panels

// No external date-fns import needed for native JS date formatting

/**
 * Render a chat message bubble with timestamp.
 * @param {Object} msg - message object {role, text, timestamp, sources}
 * @returns {HTMLElement}
 */
export function renderMessage(msg) {
  const messageEl = document.createElement('div');
  messageEl.className = `message message--${msg.role}`;

  const contentEl = document.createElement('div');
  contentEl.className = 'message-content';

  const senderEl = document.createElement('span');
  senderEl.className = 'message-sender';
  senderEl.textContent = msg.role === 'user' ? 'You' : 'AWS Bedrock';

  const bubbleEl = document.createElement('div');
  bubbleEl.className = 'message-bubble';
  bubbleEl.innerHTML = DOMPurify.sanitize(marked.parse(msg.text));

  contentEl.appendChild(senderEl);
  contentEl.appendChild(bubbleEl);

  // Timestamp
  if (msg.timestamp) {
    const tsEl = document.createElement('span');
    tsEl.className = 'message-timestamp';
    tsEl.textContent = new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    tsEl.style.fontSize = '0.75rem';
    tsEl.style.color = 'var(--text-muted)';
    contentEl.appendChild(tsEl);
  }

  // Sources (if any)
  if (msg.sources && msg.sources.length) {
    const sourcesDiv = document.createElement('div');
    sourcesDiv.className = 'message-sources';
    const label = document.createElement('span');
    label.className = 'sources-label';
    label.textContent = 'Sources:';
    sourcesDiv.appendChild(label);
    msg.sources.forEach(src => {
      const badge = document.createElement('span');
      badge.className = 'source-badge';
      badge.textContent = src.name || 'Source';
      sourcesDiv.appendChild(badge);
    });
    contentEl.appendChild(sourcesDiv);
  }

  messageEl.appendChild(contentEl);
  return messageEl;
}

/**
 * Show a toast notification (used in admin panel).
 */
export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.background = type === 'error' ? '#dc2626' : '#4f46e5';
  toast.style.color = '#fff';
  toast.style.padding = '0.75rem 1rem';
  toast.style.borderRadius = '6px';
  toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

/**
 * Toggle light/dark theme and update label.
 * @param {HTMLElement} labelEl - element displaying the current theme name
 */
export function toggleTheme(labelEl) {
  const wrapper = document.getElementById('appWrapper') || document.querySelector('.app-wrapper');
  const current = wrapper.getAttribute('data-theme') || 'light';
  const newTheme = current === 'light' ? 'dark' : 'light';
  wrapper.setAttribute('data-theme', newTheme);
  // Update label text
  if (labelEl) {
    labelEl.textContent = newTheme === 'light' ? 'Light Mode' : 'Dark Mode';
  }
}
