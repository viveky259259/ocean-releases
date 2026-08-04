// ── Sidebar toggle (mobile) ──
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

// ── Dynamic Articles Rendering ──
function renderArticles() {
  // Render on index.html (Docs Home)
  const indexGrid = document.getElementById('articlesGrid');
  if (indexGrid && typeof AppArticles !== 'undefined') {
    indexGrid.innerHTML = ''; // Clear placeholder
    AppArticles.slice(0, 6).forEach(article => {
      const card = document.createElement('a');
      card.href = `article.html?id=${article.id}`;
      card.className = 'article-card';
      card.innerHTML = `
        <h4>${article.title}</h4>
        <div class="for">${article.tag} &middot; ${article.date}</div>
        <p>${article.desc}</p>
      `;
      indexGrid.appendChild(card);
    });
  }

  // Render on articles.html (Articles Portal)
  const portal = document.getElementById('articlesPortal');
  if (portal && typeof AppArticles !== 'undefined') {
    const releases = AppArticles.filter(a => a.tag === 'Release Notes');
    const guides = AppArticles.filter(a => a.tag !== 'Release Notes');

    const renderSection = (title, items) => {
      if (items.length === 0) return '';
      return `
        <div class="section-label"><span>${title}</span></div>
        <div class="articles-grid">
          ${items.map(article => `
            <a href="article.html?id=${article.id}" class="article-card">
              <div class="article-tag">${article.tag}</div>
              <h3>${article.title}</h3>
              <p>${article.desc}</p>
              <div class="article-footer">
                <div class="read-more">Read Guide <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></div>
              </div>
            </a>
          `).join('')}
        </div>
      `;
    };

    portal.innerHTML = renderSection('Latest Releases', releases.slice(0, 6)) +
      renderSection('Featured Guides', guides) +
      renderSection('Past Releases', releases.slice(6));
  }
}

function renderDownloads() {
  const tableBody = document.querySelector('#downloadsTable tbody');
  const latestContainer = document.getElementById('latestDownload');

  if (!tableBody || typeof AppArticles === 'undefined') return;

  const releases = AppArticles.filter(a => a.tag === 'Release Notes' && a.version);
  if (releases.length === 0) return;

  const getDownloadUrl = (v) => `https://github.com/Ocean-AI-Platform/ocean-releases/releases/download/v${v}/Ocean_${v}_aarch64.app.tar.gz`;

  // Latest download button
  if (latestContainer || document.getElementById('inlineDownload')) {
    const latest = releases[0];
    const btnHtml = `
      <a href="${getDownloadUrl(latest.version)}" class="download-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Download v${latest.version} (macOS aarch64)
      </a>
    `;

    if (latestContainer) latestContainer.innerHTML = btnHtml;

    const inline = document.getElementById('inlineDownload');
    if (inline) {
      inline.innerHTML = `
        <div class="download-box">
          ${btnHtml}
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <span style="font-size: 11px; color: var(--dim); text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Other Sources</span>
            <a href="https://github.com/Ocean-AI-Platform/ocean-releases/releases" target="_blank" rel="noopener" class="text-button">
              View on GitHub
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </a>
          </div>
        </div>
      `;
    }
  }

  // Table rows
  tableBody.innerHTML = releases.map(release => `
    <tr>
      <td><span class="version-badge">v${release.version}</span></td>
      <td>${release.date}</td>
      <td>${release.desc}</td>
      <td>
        <a href="${getDownloadUrl(release.version)}" class="download-btn secondary">
          Download
        </a>
      </td>
    </tr>
  `).join('');
}

// ── Main Initializer ──
document.addEventListener('DOMContentLoaded', () => {
  // 1. Active section highlighting (ScrollSpy)
  const sections = document.querySelectorAll('h2[id], section[id]');
  const sidebarLinks = document.querySelectorAll('.sidebar a');

  if (sections.length > 0 && sidebarLinks.length > 0) {
    const observerOptions = {
      root: null,
      rootMargin: '-100px 0px -70% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          sidebarLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + id) {
              link.classList.add('active');
            }
          });
        }
      });
    }, observerOptions);

    sections.forEach(section => observer.observe(section));
  }

  // 2. Inject strings from strings.js
  if (typeof AppStrings !== 'undefined') {
    for (const [key, value] of Object.entries(AppStrings)) {
      const el = document.getElementById(key);
      if (el) el.textContent = value;
    }
  }

  // 3. Render dynamic articles and downloads
  renderArticles();
  renderDownloads();

  // 4. Copy Button Logic for Code Blocks
  document.querySelectorAll('pre').forEach(block => {
    const codeEl = block.querySelector('code');
    if (!codeEl) return;

    const button = document.createElement('button');
    button.className = 'copy-btn';
    button.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      <span>${AppStrings.copyText || 'Copy'}</span>
    `;

    block.style.position = 'relative';
    block.appendChild(button);

    button.addEventListener('click', async () => {
      const code = codeEl.innerText;
      try {
        await navigator.clipboard.writeText(code);
        button.classList.add('copied');
        button.querySelector('span').innerText = AppStrings.copiedText || 'Copied!';
        button.querySelector('svg').innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';

        setTimeout(() => {
          button.classList.remove('copied');
          button.querySelector('span').innerText = AppStrings.copyText || 'Copy';
          button.querySelector('svg').innerHTML = '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
    });
  });
});