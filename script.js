const themeToggle = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', currentTheme);

themeToggle.addEventListener('click', () => {
  const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
});

document.querySelectorAll('#footer-year, .footer-year-d').forEach(el => el.textContent = new Date().getFullYear());

function buildCards() {
  const container = document.getElementById('cards-container');
  container.innerHTML = '';
  
  const visibleOS = OS_DATA.filter(os => !os.hide);

  visibleOS.forEach((os, i) => {
    const totalDownloads = os.downloads.reduce((a, g) => a + g.items.length, 0);
    const card = document.createElement('div');
    card.className = 'os-card';
    card.style.animationDelay = `${i * 0.08}s`;
    card.onclick = () => navigateToOS(os.id);
    card.innerHTML = `
      <div class="card-img">
        <img src="${os.image}" alt="${os.name}" onerror="this.src='images/placeholder.jpg'" />
        <div class="card-img-overlay"></div>
        <div class="card-badge">${os.badge}</div>
      </div>
      <div class="card-body">
        <div class="card-title">${os.name}</div>
        <div class="card-desc">${os.shortDesc}</div>
        <div class="card-footer">
          <div class="card-count">${totalDownloads} download${totalDownloads !== 1 ? 's' : ''} available</div>
          <div class="card-arrow">-></div>
        </div>
      </div>`;
    container.appendChild(card);
  });
}

function navigateToOS(id) {
  history.pushState({ os: id }, '', '?os=' + id);
  openDetail(id);
}

function navigateHome() {
  history.pushState({}, '', window.location.pathname);
  goHome();
}

window.renderDownloads = function(id, filterValue) {
  const os = OS_DATA.find(o => o.id === id);
  if (!os) return;
  
  const container = document.getElementById('dl-list-container');
  let dlGroupsHTML = '';
  
  os.downloads.forEach((group, gi) => {
    const filteredItems = group.items.filter(item => filterValue === 'all' || item.device === filterValue);
    if (filteredItems.length === 0) return;

    dlGroupsHTML += `
      <div class="dl-group">
        <div class="dl-group-title">${group.group}</div>
        <div class="dl-list">
          ${filteredItems.map((item, ii) => `
            <div class="dl-item" style="animation-delay:${(gi * filteredItems.length + ii) * 0.06}s">
              <div class="dl-item-left">
                <div class="dl-item-name">${item.name}</div>
                <div class="dl-item-meta">${item.device ? `${item.device} . ` : ''}${item.meta}</div>
              </div>
              <div class="dl-item-right">
                <span class="tag-chip ${item.tag}">${item.tag}</span>
                <span class="tag-chip secondary" style="color:var(--muted);border-color:var(--glass-border);background:var(--glass-bg)">${item.version}</span>
                <a class="btn-dl primary" href="${item.url}" target="_blank" rel="noopener">V Download</a>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  container.innerHTML = dlGroupsHTML || '<div class="empty-note">No downloads available for the selected device.</div>';
};

function openDetail(id) {
  const os = OS_DATA.find(o => o.id === id);
  if (!os || os.hide) {
    navigateHome();
    return;
  }

  const uniqueDevices = [...new Set(os.downloads.flatMap(g => g.items.map(i => i.device)).filter(Boolean))];
  
  let filterHTML = '';
  if (uniqueDevices.length > 0) {
    filterHTML = `
      <div class="filter-controls">
        <select id="device-filter" class="filter-select" onchange="renderDownloads('${id}', this.value)">
          <option value="all">All Devices</option>
          ${uniqueDevices.map(d => `<option value="${d}">${d}</option>`).join('')}
        </select>
      </div>
    `;
  }

  document.getElementById('detail-content').innerHTML = `
    <div class="detail-hero">
      <div class="detail-img">
        <img src="${os.image}" alt="${os.name}" onerror="this.src='images/placeholder.jpg'" />
      </div>
      <div class="detail-info">
        <div class="detail-eyebrow">${os.badge}</div>
        <div class="detail-title">${os.name}</div>
        <div class="detail-desc">${os.fullDesc}</div>
        <div class="action-buttons">
          <a href="https://t.me/screenxia" target="_blank" rel="noopener" class="btn-dl secondary">Screenshots</a>
          <a href="${os.changelog || 'https://telegra.ph/'}" target="_blank" rel="noopener" class="btn-dl secondary">Changelogs</a>
        </div>
      </div>
    </div>
    <div class="downloads-section">
      <div class="section-header">
        <div class="section-label" style="margin:0; padding:0;"><span>Download Files</span></div>
        ${filterHTML}
      </div>
      <div id="dl-list-container"></div>
    </div>
  `;

  renderDownloads(id, 'all');

  document.getElementById('page-home').classList.remove('active');
  document.getElementById('page-detail').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.title = `${os.name} - ROM Hub`;
}

function goHome() {
  document.getElementById('page-detail').classList.remove('active');
  document.getElementById('page-home').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.title = 'ROM Hub - Download Center';
}

window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  const osParam = params.get('os');
  if (osParam) {
    openDetail(osParam);
  } else {
    goHome();
  }
});

buildCards();

const initialParams = new URLSearchParams(window.location.search);
const initialOs = initialParams.get('os');

if (initialOs) {
  const targetOs = OS_DATA.find(o => o.id === initialOs);
  if (targetOs && !targetOs.hide) {
    openDetail(initialOs);
  } else {
    navigateHome();
  }
} else {
  goHome();
}