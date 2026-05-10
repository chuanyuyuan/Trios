const Settings = {
  data: {
    visibleModules: { tasks: true, ideas: true, movies: true }
  },

  init() {
    this.load();
    this.render();
    this.bindEvents();
  },

  load() {
    const saved = Storage.get('trios_settings');
    if (saved && saved.visibleModules) {
      this.data = saved;
    }
  },

  save() {
    Storage.set('trios_settings', this.data);
  },

  isModuleVisible(module) {
    return this.data.visibleModules[module] !== false;
  },

  toggleModule(module) {
    const current = this.data.visibleModules;
    if (current[module]) {
      const visibleCount = Object.values(current).filter(Boolean).length;
      if (visibleCount <= 1) return false;
    }
    current[module] = !current[module];
    this.save();
    this.render();
    if (typeof applyModuleVisibility === 'function') {
      applyModuleVisibility();
    }
    return true;
  },

  exportData() {
    const data = {
      version: 1,
      exportedAt: Time.now(),
      data: {
        tasks: Storage.get('trios_tasks'),
        completedLog: Storage.get('trios_completed_log'),
        ideas: Storage.get('trios_ideas'),
        movies: Storage.get('trios_movies'),
        settings: Storage.get('trios_settings')
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trios-backup-' + Time.formatDate(Time.now()) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  async importData(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data || !data.data) {
        throw new Error('无效的备份文件格式');
      }

      const confirmed = await Confirm.show('导入将覆盖所有现有数据，确定要继续吗？');
      if (!confirmed) return;

      const d = data.data;
      if (d.tasks) Storage.set('trios_tasks', d.tasks);
      if (d.completedLog) Storage.set('trios_completed_log', d.completedLog);
      if (d.ideas) Storage.set('trios_ideas', d.ideas);
      if (d.movies) Storage.set('trios_movies', d.movies);
      if (d.settings) {
        Storage.set('trios_settings', d.settings);
        this.load();
      }

      Ideas.init();
      Movies.init();
      Tasks.init();
      this.render();
      if (typeof applyModuleVisibility === 'function') {
        applyModuleVisibility();
      }

      await Confirm.alert('数据导入成功！');
    } catch (e) {
      await Confirm.alert('导入失败：' + e.message);
    }
  },

  render() {
    const container = document.getElementById('settings-content');
    if (!container) return;

    const vm = this.data.visibleModules;
    const visibleCount = Object.values(vm).filter(Boolean).length;

    container.innerHTML = `
      <section class="settings-section">
        <h3 class="settings-section-title">模块显示</h3>
        <p class="settings-section-desc">选择要在导航栏中显示的模块（至少选择一项）</p>
        <div class="settings-toggle-list">
          <label class="settings-toggle-item ${vm.tasks && visibleCount <= 1 ? 'disabled' : ''}">
            <span>任务</span>
            <input type="checkbox" class="settings-toggle-input" data-module="tasks" ${vm.tasks ? 'checked' : ''}>
            <span class="settings-toggle-slider"></span>
          </label>
          <label class="settings-toggle-item ${vm.ideas && visibleCount <= 1 ? 'disabled' : ''}">
            <span>灵感</span>
            <input type="checkbox" class="settings-toggle-input" data-module="ideas" ${vm.ideas ? 'checked' : ''}>
            <span class="settings-toggle-slider"></span>
          </label>
          <label class="settings-toggle-item ${vm.movies && visibleCount <= 1 ? 'disabled' : ''}">
            <span>电影</span>
            <input type="checkbox" class="settings-toggle-input" data-module="movies" ${vm.movies ? 'checked' : ''}>
            <span class="settings-toggle-slider"></span>
          </label>
        </div>
      </section>

      <section class="settings-section">
        <h3 class="settings-section-title">数据管理</h3>
        <p class="settings-section-desc">导出或导入所有数据（JSON 格式）</p>
        <div class="settings-btn-group">
          <button id="settings-export-btn" class="primary">导出数据</button>
          <button id="settings-import-btn" class="secondary">导入数据</button>
        </div>
      </section>
    `;
  },

  bindEvents() {
    document.getElementById('settings-content').addEventListener('change', (e) => {
      if (e.target.classList.contains('settings-toggle-input')) {
        const module = e.target.dataset.module;
        const result = this.toggleModule(module);
        if (!result) {
          e.target.checked = true;
        }
      }
    });

    document.getElementById('settings-content').addEventListener('click', (e) => {
      if (e.target.id === 'settings-export-btn') {
        this.exportData();
      } else if (e.target.id === 'settings-import-btn') {
        document.getElementById('import-file-input').click();
      }
    });

    document.getElementById('import-file-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.importData(file);
        e.target.value = '';
      }
    });
  }
};
