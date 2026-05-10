(function () {
  'use strict';

  const searchInput = document.getElementById('header-search');

  // Tab switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      tabBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      const target = document.getElementById('tab-' + tab);
      if (target) target.classList.add('active');
      syncSearch(tab);
    });
  });

  // Sync search input with current tab
  const modules = { ideas: Ideas, movies: Movies, tasks: Tasks };
  const placeholders = { ideas: '搜索灵感...', movies: '搜索电影...', tasks: '搜索任务...', settings: '' };

  function getActiveTab() {
    return document.querySelector('.tab-btn.active')?.dataset.tab || 'ideas';
  }

  function syncSearch(tab) {
    const m = modules[tab];
    searchInput.placeholder = placeholders[tab] || '';
    searchInput.value = m ? m.searchQuery : '';
    searchInput.style.display = tab === 'settings' ? 'none' : '';
  }

  // Shared search handler
  function handleSearch() {
    const tab = getActiveTab();
    const m = modules[tab];
    if (m) m.search(searchInput.value);
  }

  searchInput.addEventListener('input', handleSearch);
  // Handle native clear button (X) in search inputs
  searchInput.addEventListener('search', handleSearch);

  // Init modules
  Ideas.init();
  Movies.init();
  Tasks.init();
  Settings.init();

  // Apply module visibility from settings
  applyModuleVisibility();

  // Set initial placeholder and search visibility
  syncSearch(getActiveTab());

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // Module visibility control
  function applyModuleVisibility() {
    if (!Settings.data || !Settings.data.visibleModules) return;
    const visible = Settings.data.visibleModules;
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      const tab = btn.dataset.tab;
      if (tab === 'settings') return;
      btn.style.display = visible[tab] ? '' : 'none';
    });

    // If current active tab is hidden, switch to first visible one
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    if (activeTab && activeTab !== 'settings' && !Settings.isModuleVisible(activeTab)) {
      const firstVisible = Array.from(document.querySelectorAll('.tab-btn')).find(
        (btn) => btn.dataset.tab !== 'settings' && btn.style.display !== 'none'
      );
      if (firstVisible) {
        firstVisible.click();
      } else {
        const settingsBtn = document.querySelector('.tab-btn[data-tab="settings"]');
        if (settingsBtn) settingsBtn.click();
      }
    }
  }

  // Expose for Settings module to call after toggle
  window.applyModuleVisibility = applyModuleVisibility;
})();
