// --- AUTO-PUBLISH FILTER ---
// Removes items with a release date in the future so they automatically appear when the day comes.
(function filterFutureReleases() {
  const now = new Date();
  const todayStr = now.getFullYear() + '-' + 
                   String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(now.getDate()).padStart(2, '0');

  OS_DATA.forEach(os => {
    if (os.downloads) {
      os.downloads.forEach(group => {
        if (group.items) {
          group.items = group.items.filter(item => {
            if (!item.date) return true;
            return item.date <= todayStr;
          });
        }
      });
      // Clean up empty groups
      os.downloads = os.downloads.filter(group => group.items && group.items.length > 0);
      
      // If no downloads left, hide the OS completely
      if (os.downloads.length === 0) {
        os.hide = true;
      }
    }
  });
})();
// ---------------------------

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const themeToggle = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', currentTheme);

function updateThemeIcon(theme) {
  const icon = document.getElementById('dock-theme-icon');
  if (!icon) return;
  icon.innerHTML = theme === 'dark'
    ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>'
    : '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
}

function toggleTheme() {
  const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  updateThemeIcon(theme);
}

if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
const dockTheme = document.getElementById('dock-theme');
if (dockTheme) dockTheme.addEventListener('click', toggleTheme);
updateThemeIcon(currentTheme);

function setDockContext() {
  const dock = document.getElementById('mobile-dock');
  if (!dock) return;
  dock.classList.toggle('is-detail', document.getElementById('page-detail').classList.contains('active'));
}

const dockBack = document.getElementById('dock-back');
if (dockBack) dockBack.addEventListener('click', navigateHome);

document.querySelectorAll('#footer-year, .footer-year-d').forEach(el => el.textContent = new Date().getFullYear());

function getLatestDate(os) {
  let latest = 0;
  if (os.downloads) {
    os.downloads.forEach(group => {
      if (group.items) {
        group.items.forEach(item => {
          if (item.date) {
            const time = new Date(item.date).getTime();
            if (time > latest) {
              latest = time;
            }
          }
        });
      }
    });
  }
  return latest;
}

function renderLatestDrop() {
  const strip = document.getElementById('latest-strip');
  if (!strip) return;

  const candidates = [];
  OS_DATA.forEach(os => {
    if (os.hide || !os.downloads) return;
    os.downloads.forEach(group => {
      if (!group.items) return;
      group.items.forEach(item => {
        if (item.date) candidates.push({ os, item });
      });
    });
  });

  if (!candidates.length) {
    strip.style.display = 'none';
    return;
  }

  candidates.sort((a, b) => b.item.date.localeCompare(a.item.date));
  const top = candidates[0];

  const nameEl = document.getElementById('latest-drop-name');
  const dateEl = document.getElementById('latest-drop-date');
  const chipEl = document.getElementById('latest-drop-chip');
  const versionEl = document.getElementById('latest-drop-version');
  if (nameEl) nameEl.textContent = top.item.name;
  if (versionEl) versionEl.textContent = top.item.version || '';
  if (dateEl) dateEl.textContent = 'Added ' + top.item.date;
  if (chipEl) {
    chipEl.textContent = top.item.tag;
    chipEl.className = 'tag-chip ' + top.item.tag.toLowerCase();
    chipEl.hidden = false;
  }
  strip.href = '?os=' + top.os.id;
  strip.addEventListener('click', (e) => {
    e.preventDefault();
    navigateToOS(top.os.id);
  });
}

let currentDeviceFilter = 'all';
let currentView = localStorage.getItem('view-mode') || (window.matchMedia('(max-width: 768px)').matches ? 'list' : 'grid');

function setView(mode) {
  currentView = mode;
  localStorage.setItem('view-mode', mode);
  document.querySelectorAll('#view-toggle .view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === mode);
  });
  const container = document.getElementById('cards-container');
  if (container) container.classList.toggle('view-list', mode === 'list');
  buildCards(currentDeviceFilter);
}

function initViewToggle() {
  const toggle = document.getElementById('view-toggle');
  if (!toggle) return;
  toggle.querySelectorAll('.view-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === currentView);
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });
  const container = document.getElementById('cards-container');
  if (container) container.classList.toggle('view-list', currentView === 'list');
}

const deviceSelectStore = {};
let deviceSelectSeq = 0;

function deviceSelectHTML(cbName, arg, options, current) {
  const key = 'ds' + (++deviceSelectSeq);
  deviceSelectStore[key] = { cb: cbName, arg: arg || '', options: options, value: current };
  return `
    <div class="device-select" data-device-select data-key="${key}">
      <button type="button" class="filter-select filter-trigger" aria-haspopup="listbox" aria-expanded="false">
        <span class="filter-trigger-label"></span>
        <svg class="filter-caret" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </button>
      <ul class="filter-dropdown" role="listbox"></ul>
    </div>
  `;
}

function setDeviceSelectValue(wrap, value) {
  const stored = deviceSelectStore[wrap.dataset.key];
  if (!stored) return;
  stored.value = value;
  if (stored.refresh) stored.refresh();
}

function bindDeviceSelects() {
  document.querySelectorAll('[data-device-select]').forEach(wrap => {
    if (wrap.dataset.bound) return;
    wrap.dataset.bound = 'true';
    const stored = deviceSelectStore[wrap.dataset.key];
    if (!stored) return;

    const trigger = wrap.querySelector('.filter-trigger');
    const dropdown = wrap.querySelector('.filter-dropdown');
    const label = trigger.querySelector('.filter-trigger-label');

    stored.refresh = function() {
      const current = stored.options.find(o => o.value === stored.value) || {};
      label.textContent = current.label !== undefined ? current.label : stored.value;
      dropdown.querySelectorAll('.filter-option').forEach(opt => {
        const active = opt.dataset.value === stored.value;
        opt.classList.toggle('active', active);
        opt.setAttribute('aria-selected', String(active));
      });
    };

    dropdown.innerHTML = stored.options.map(opt =>
      `<li role="option" aria-selected="false" tabindex="0" class="filter-option" data-value="${opt.value}">${opt.label}</li>`
    ).join('');

    const close = () => { dropdown.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); };
    const open = () => { dropdown.classList.add('open'); trigger.setAttribute('aria-expanded', 'true'); };
    const choose = (value) => {
      stored.value = value;
      stored.refresh();
      close();
      const fn = window[stored.cb];
      if (typeof fn === 'function') fn.apply(null, stored.arg ? [stored.arg, value] : [value]);
    };

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dropdown.classList.contains('open')) close(); else open();
    });
    dropdown.addEventListener('click', (e) => {
      const opt = e.target.closest('.filter-option');
      if (opt) choose(opt.dataset.value);
    });
    dropdown.addEventListener('keydown', (e) => {
      const opts = Array.from(dropdown.querySelectorAll('.filter-option'));
      const idx = opts.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); if (opts[(idx + 1) % opts.length]) opts[(idx + 1) % opts.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (opts[(idx - 1 + opts.length) % opts.length]) opts[(idx - 1 + opts.length) % opts.length].focus(); }
      else if (e.key === 'Enter' || e.key === ' ') {
        const focused = document.activeElement;
        if (focused && focused.classList.contains('filter-option')) { e.preventDefault(); choose(focused.dataset.value); }
      }
    });
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    stored.refresh();
  });
}

function populateHomeDeviceFilter() {
  const allDevices = new Set();
  OS_DATA.forEach(os => {
    if (!os.hide && os.downloads) {
      os.downloads.forEach(group => {
        if (group.items) {
          group.items.forEach(item => {
            if (item.device) allDevices.add(item.device);
          });
        }
      });
    }
  });

  const uniqueDevices = Array.from(allDevices).sort();
  const container = document.getElementById('home-device-filter-container');
  if (container) {
    const options = [{ value: 'all', label: 'All Devices' }].concat(uniqueDevices.map(d => ({ value: d, label: d })));
    container.innerHTML = deviceSelectHTML('buildCards', '', options, 'all');
    bindDeviceSelects();
  }
}

function buildCards(deviceFilter = 'all') {
  const container = document.getElementById('cards-container');
  container.innerHTML = '';
  
  const visibleOS = OS_DATA.filter(os => !os.hide).sort((a, b) => {
    return getLatestDate(b) - getLatestDate(a);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let cardsRendered = 0;
  const fragment = document.createDocumentFragment();

  visibleOS.forEach(os => {
    let totalDownloads = 0;
    let tags = new Set();
    let latestTime = 0;

    if (os.downloads) {
      os.downloads.forEach(group => {
        if (group.items) {
          const validItems = group.items.filter(item => deviceFilter === 'all' || item.device === deviceFilter);
          totalDownloads += validItems.length;
          
          validItems.forEach(item => {
            if (item.tag) tags.add(item.tag.toLowerCase());
            if (item.date) {
              const time = new Date(item.date).getTime();
              if (time > latestTime) latestTime = time;
            }
          });
        }
      });
    }

    if (deviceFilter !== 'all' && totalDownloads === 0) return;

    if (deviceFilter === 'all') {
      latestTime = getLatestDate(os);
    }

    let isNew = false;
    let formattedDate = "Unknown";
    
    if (latestTime > 0) {
      const uploadDateObj = new Date(latestTime);
      uploadDateObj.setHours(0, 0, 0, 0);
      isNew = uploadDateObj.getTime() === today.getTime();
      formattedDate = new Date(latestTime).toISOString().split('T')[0];
    }

    let statusBadgeHTML = '';
    if (tags.has('stable')) {
      statusBadgeHTML = `<span class="card-badge stable">STABLE</span>`;
    } else if (tags.has('pre') || tags.has('alpha')) {
      statusBadgeHTML = `<span class="card-badge pre-release">PRE-RELEASE</span>`;
    } else if (tags.has('beta')) {
      statusBadgeHTML = `<span class="card-badge beta">BETA</span>`;
    }

    let newBadgeHTML = isNew ? `<span class="card-badge new">NEW</span>` : '';
    let finalBadges = newBadgeHTML + statusBadgeHTML;
    const downloadLabel = `${totalDownloads} download${totalDownloads !== 1 ? 's' : ''}`;

    const card = document.createElement('article');
    card.className = 'os-card' + (currentView === 'list' ? ' list-row' : '');
    card.style.animationDelay = `${cardsRendered * (reducedMotion ? 0 : 0.07)}s`;
    card.onclick = () => navigateToOS(os.id);

    if (currentView === 'list') {
      card.innerHTML = `
        <div class="list-row-img">
          <img src="${os.image}" alt="" loading="lazy" onerror="this.src='assets/images/placeholder.svg'" />
        </div>
        <div class="list-row-main">
          <div class="card-title">${os.name}</div>
          <div class="card-desc">${os.shortDesc}</div>
          <div class="list-row-meta">
            ${finalBadges}
            <span class="list-count">${downloadLabel}</span>
            <span class="list-updated">Updated ${formattedDate}</span>
          </div>
        </div>
        <div class="card-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></div>
      `;
    } else {
      card.innerHTML = `
        <div class="card-img">
          <img src="${os.image}" alt="" loading="lazy" onerror="this.src='assets/images/placeholder.svg'" />
          <div class="card-img-overlay"></div>
          ${finalBadges ? `<div class="badges-container">${finalBadges}</div>` : ''}
        </div>
        <div class="card-body">
          <div class="card-title">${os.name}</div>
          <div class="card-desc">${os.shortDesc}</div>
          <div class="card-footer">
            <div class="card-count"><span class="count">${downloadLabel}</span><span class="updated">Updated ${formattedDate}</span></div>
            <div class="card-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></div>
          </div>
        </div>
      `;
    }
    fragment.appendChild(card);
    cardsRendered++;
  });

  if (cardsRendered === 0) {
    container.innerHTML = '<div class="empty-note">No ROMs available for the selected device.</div>';
  } else {
    container.appendChild(fragment);
  }
}

function navigateToOS(id) {
  history.pushState({ os: id }, '', '?os=' + id);
  openDetail(id);
}

function navigateHome() {
  history.pushState({}, '', window.location.pathname);
  const homeFilter = document.querySelector('#home-device-filter-container [data-device-select]');
  if (homeFilter) setDeviceSelectValue(homeFilter, 'all');
  buildCards('all');
  goHome();
}

window.renderDownloads = function(id, filterValue) {
  const os = OS_DATA.find(o => o.id === id);
  if (!os) return;
  
  const container = document.getElementById('dl-list-container');
  let dlGroupsHTML = '';
  
  os.downloads.forEach((group, gi) => {
    const filteredItems = group.items
      .filter(item => filterValue === 'all' || item.device === filterValue)
      .sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });

    if (filteredItems.length === 0) return;

    dlGroupsHTML += `
      <div class="dl-group">
        <div class="dl-group-title">${group.group}<span class="dl-group-count">${filteredItems.length}</span></div>
        <div class="dl-list">
          ${filteredItems.map((item, ii) => `
            <div class="dl-item" style="animation-delay:${(gi * filteredItems.length + ii) * (reducedMotion ? 0 : 0.06)}s">
              <div class="dl-item-left">
                <div class="dl-item-name">${item.name}</div>
                <div class="dl-item-meta">${item.device ? `${item.device} / ` : ''}${item.meta}</div>
                ${item.date ? `<div class="dl-item-date">Uploaded ${item.date}</div>` : ''}
              </div>
              <div class="dl-item-right">
                <span class="tag-chip ${item.tag.toLowerCase()}">${item.tag}</span>
                <span class="version-chip">${item.version}</span>
                <button class="btn-dl primary" data-url="${item.url}" onclick="showDownloadWarning(this.dataset.url)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Download</button>
                ${item.url2 ? `<button class="btn-dl secondary" data-url="${item.url2}" onclick="showDownloadWarning(this.dataset.url)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg> Mirror</button>` : ''}
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
    const options = [{ value: 'all', label: 'All Devices' }].concat(uniqueDevices.map(d => ({ value: d, label: d })));
    filterHTML = `<div class="filter-controls">${deviceSelectHTML('renderDownloads', id, options, 'all')}</div>`;
  }

  document.getElementById('detail-content').innerHTML = `
    <div class="detail-hero">
      <div class="detail-img">
        <img src="${os.image}" alt="${os.name}" fetchpriority="high" decoding="sync" onerror="this.src='assets/images/placeholder.svg'" />
      </div>
      <div class="detail-info">
        <div class="detail-eyebrow">[*] ${detailBadge}</div>
        <div class="detail-title">${os.name}</div>
        <div class="detail-desc">${os.fullDesc}</div>
        <div class="action-buttons">
          <button onclick="openModal('${os.guideFile}')" class="btn-dl primary">How to flash</button>
          <a href="https://t.me/screenxia" target="_blank" rel="noopener" class="btn-dl secondary">Screenshots</a>
          ${(os.changelog && os.changelog.includes('telegra.ph')) 
  ? `<button onclick="openReaderModal('${os.changelog}')" class="btn-dl secondary">Changelogs</button>` 
  : `<a href="${os.changelog || 'https://telegra.ph/'}" target="_blank" rel="noopener" class="btn-dl secondary">Changelogs</a>`
}
        </div>
      </div>
    </div>
    <div class="downloads-section">
      <div class="downloads-heading">
        <h3>Download Files</h3>
        ${filterHTML}
      </div>
      <div id="dl-list-container"></div>
    </div>
  `;

  renderDownloads(id, 'all');
  bindDeviceSelects();

  document.getElementById('page-home').classList.remove('active');
  document.getElementById('page-detail').classList.add('active');
  setDockContext();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.title = `${os.name} - Xia's Projekt`;
}

function goHome() {
  document.getElementById('page-detail').classList.remove('active');
  document.getElementById('page-home').classList.add('active');
  setDockContext();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.title = "Xia's Projekt - Products";
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

function openDonateModal() {
  document.getElementById('donate-modal').classList.add('active');
}

function closeDonateModal() {
  document.getElementById('donate-modal').classList.remove('active');
}

window.addEventListener('click', (event) => {
  const mdModal = document.getElementById('md-modal');
  const warningModal = document.getElementById('dl-warning-modal');
  const donateModal = document.getElementById('donate-modal');
  const readerModal = document.getElementById('reader-modal');
  
  if (event.target === mdModal) closeModal();
  if (event.target === warningModal) closeWarningModal();
  if (event.target === donateModal) closeDonateModal();
  if (event.target === readerModal) closeReaderModal();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeWarningModal();
    closeDonateModal();
    closeReaderModal();
  }
});

window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  const osParam = params.get('os');
  if (osParam) {
    openDetail(osParam);
  } else {
    navigateHome();
  }
});

populateHomeDeviceFilter();
initViewToggle();
buildCards();
renderLatestDrop();

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

async function openReaderModal(url) {
  const modal = document.getElementById('reader-modal');
  const titleEl = document.getElementById('reader-title');
  const contentEl = document.getElementById('reader-content');

  titleEl.innerText = "Loading...";
  contentEl.innerHTML = `<div style="text-align: center; color: var(--muted); padding: 40px 0;">Fetching changelog...</div>`;
  modal.classList.add('active');

  try {
    const path = url.split('/').pop();
    const response = await fetch(`https://api.telegra.ph/getPage/${path}?return_content=true`);
    const data = await response.json();

    if (data.ok) {
      titleEl.innerText = data.result.title;
      contentEl.innerHTML = parseTelegraphNodes(data.result.content);
    } else {
      throw new Error('Post not found');
    }
  } catch (error) {
    titleEl.innerText = "Error";
    contentEl.innerHTML = `
      <div style="text-align: center; color: var(--muted); padding: 40px 0;">
        Failed to load content. <br><br>
        <a href="${url}" target="_blank" class="btn-dl primary" style="margin-top: 15px;">Open in new tab instead</a>
      </div>`;
  }
}

function parseTelegraphNodes(nodes) {
  if (!nodes) return '';
  let html = '';
  
  for (const node of nodes) {
    if (typeof node === 'string') {
      html += node.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/\n/g, "<br>");
    } else {
      let { tag, attrs, children } = node;
      let attrStr = '';
      
      if (attrs) {
         if (tag === 'img' && attrs.src && attrs.src.startsWith('/')) {
            attrs.src = 'https://telegra.ph' + attrs.src;
         }
         for (const [key, value] of Object.entries(attrs)) {
            attrStr += ` ${key}="${value.toString().replace(/"/g, '&quot;')}"`;
         }
      }
      
      let styleStr = '';
      if (tag === 'p') styleStr = ' style="margin-bottom: 1em; color: var(--text); white-space: pre-wrap;"';
      else if (tag === 'a') styleStr = ' style="color: var(--accent); text-decoration: underline;" target="_blank"';
      else if (tag === 'ul') styleStr = ' style="list-style-type: disc; padding-left: 20px; margin-bottom: 1em; color: var(--text);"';
      else if (tag === 'ol') styleStr = ' style="list-style-type: decimal; padding-left: 20px; margin-bottom: 1em; color: var(--text);"';
      else if (tag === 'h3' || tag === 'h4') styleStr = ' style="font-family: \'Syne\', sans-serif; margin: 1.5em 0 0.5em; color: var(--accent); font-size: 1.25rem; font-weight: bold;"';
      else if (tag === 'blockquote') styleStr = ' style="border-left: 4px solid var(--glass-border); padding-left: 15px; margin-bottom: 1em; font-style: italic; color: var(--muted);"';
      else if (tag === 'img') styleStr = ' style="max-width: 100%; border-radius: var(--radius-sm); margin: 15px 0; border: 1px solid var(--glass-border);"';
      else if (tag === 'code') styleStr = ' style="font-family: monospace; background: var(--bg-color); padding: 2px 5px; border-radius: 4px; border: 1px solid var(--glass-border);"';

      html += `<${tag}${attrStr}${styleStr}>`;
      
      if (children) {
        html += parseTelegraphNodes(children);
      }
      
      if (!['img', 'br', 'hr'].includes(tag)) {
        html += `</${tag}>`;
      }
    }
  }
  return html;
}

function closeReaderModal() {
  document.getElementById('reader-modal').classList.remove('active');
}