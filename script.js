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
  
  const visibleOS = OS_DATA.filter(os => !os.hide).sort((a, b) => {
    return new Date(b.uploadDate) - new Date(a.uploadDate);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  visibleOS.forEach((os, i) => {
    const totalDownloads = os.downloads.reduce((a, g) => a + g.items.length, 0);
    
    const uploadDateObj = new Date(os.uploadDate);
    uploadDateObj.setHours(0, 0, 0, 0);
    const isNew = uploadDateObj.getTime() === today.getTime();

    const tags = new Set();
    os.downloads.forEach(group => {
      group.items.forEach(item => tags.add(item.tag.toLowerCase()));
    });

    let statusBadgeHTML = '';
    if (tags.has('stable')) {
      statusBadgeHTML = `<div class="card-badge stable">STABLE</div>`;
    } else if (tags.has('pre') || tags.has('alpha')) {
      statusBadgeHTML = `<div class="card-badge pre-release">PRE-RELEASE</div>`;
    } else if (tags.has('beta')) {
      statusBadgeHTML = `<div class="card-badge beta">BETA</div>`;
    }

    let newBadgeHTML = isNew ? `<div class="card-badge new">NEW</div>` : '';
    let finalBadges = newBadgeHTML + statusBadgeHTML;

    const card = document.createElement('div');
    card.className = 'os-card';
    card.style.animationDelay = `${i * 0.08}s`;
    card.onclick = () => navigateToOS(os.id);
    card.innerHTML = `
      <div class="card-img">
        <img src="${os.image}" alt="${os.name}" onerror="this.src='images/placeholder.jpg'" />
        <div class="card-img-overlay"></div>
        <div class="badges-container">
          ${finalBadges}
        </div>
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
                <span class="tag-chip ${item.tag.toLowerCase()}">${item.tag}</span>
                <span class="tag-chip secondary" style="color:var(--muted);border-color:var(--glass-border);background:var(--glass-bg)">${item.version}</span>
                <button class="btn-dl primary" onclick="showDownloadWarning('${item.url}')">V Download</button>
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

  const tags = new Set();
  os.downloads.forEach(g => g.items.forEach(i => tags.add(i.tag.toLowerCase())));
  let detailBadge = "PORT";
  if (tags.has('stable')) detailBadge = "STABLE";
  else if (tags.has('pre') || tags.has('alpha')) detailBadge = "PRE-RELEASE";
  else if (tags.has('beta')) detailBadge = "BETA";

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
        <div class="detail-eyebrow">[*] ${detailBadge}</div>
        <div class="detail-title">${os.name}</div>
        <div class="detail-desc">${os.fullDesc}</div>
        <div class="action-buttons">
          <button onclick="openModal('${os.guideFile}')" class="btn-dl primary">How to flash</button>
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
  document.title = `${os.name} - Xia's Projekt`;
}

function goHome() {
  document.getElementById('page-detail').classList.remove('active');
  document.getElementById('page-home').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.title = "Xia's Projekt - Download Center";
}

function openModal(fileUrl) {
  fetch(fileUrl)
    .then(response => {
      if (!response.ok) throw new Error("File not found");
      return response.text();
    })
    .then(text => {
      document.getElementById('md-content').innerHTML = marked.parse(text);
      document.getElementById('md-modal').classList.add('active');
    })
    .catch(error => {
      document.getElementById('md-content').innerHTML = `<h2 style="color:red;">Error loading guide</h2><p>Ensure the file ${fileUrl} exists.</p>`;
      document.getElementById('md-modal').classList.add('active');
    });
}

function closeModal() {
  document.getElementById('md-modal').classList.remove('active');
}

let downloadTimerInterval;

function showDownloadWarning(url) {
  const modal = document.getElementById('dl-warning-modal');
  const proceedBtn = document.getElementById('proceed-btn');
  const timerSpan = document.getElementById('countdown-timer');

  clearInterval(downloadTimerInterval);

  proceedBtn.disabled = true;
  proceedBtn.onclick = null;
  proceedBtn.innerHTML = `Proceed (<span id="countdown-timer">5</span>s)`;
  
  let timeLeft = 5;
  document.getElementById('countdown-timer').textContent = timeLeft;

  modal.classList.add('active');

  downloadTimerInterval = setInterval(() => {
    timeLeft -= 1;
    if (timeLeft > 0) {
      document.getElementById('countdown-timer').textContent = timeLeft;
    } else {
      clearInterval(downloadTimerInterval);
      proceedBtn.disabled = false;
      proceedBtn.innerHTML = 'Proceed';
      proceedBtn.onclick = () => {
        window.open(url, '_blank');
        closeWarningModal();
      };
    }
  }, 1000);
}

function closeWarningModal() {
  document.getElementById('dl-warning-modal').classList.remove('active');
  clearInterval(downloadTimerInterval);
}

window.addEventListener('click', (event) => {
  const mdModal = document.getElementById('md-modal');
  const warningModal = document.getElementById('dl-warning-modal');
  if (event.target === mdModal) {
    closeModal();
  }
  if (event.target === warningModal) {
    closeWarningModal();
  }
});

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