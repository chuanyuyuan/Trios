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
  const placeholders = { ideas: '搜索灵感...', movies: '搜索电影...', tasks: '搜索任务...' };

  function getActiveTab() {
    return document.querySelector('.tab-btn.active')?.dataset.tab || 'ideas';
  }

  function syncSearch(tab) {
    const m = modules[tab];
    searchInput.placeholder = placeholders[tab];
    searchInput.value = m ? m.searchQuery : '';
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

  // Set initial placeholder
  searchInput.placeholder = placeholders.tasks;

  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // iOS PWA keyboard workaround
  document.addEventListener('touchstart', () => {}, { passive: true });
  document.addEventListener('click', () => {}, { passive: true });
  // Force iOS to activate text input system in standalone mode
  document.body.contentEditable = true;
  document.body.contentEditable = false;
})();
