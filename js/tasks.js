const Tasks = {
  data: [],
  completedLog: [],
  searchQuery: '',
  deletedExpanded: false,
  completedExpanded: false,
  completedOpenDates: {},

  init() {
    this.load();
    if (!this._bound) { this.bindEvents(); this._bound = true; }
    this.render();
  },

  load() {
    this.data = Storage.get('trios_tasks');
    this.completedLog = Storage.get('trios_completed_log');
  },

  save() {
    Storage.set('trios_tasks', this.data);
    Storage.set('trios_completed_log', this.completedLog);
  },

  add(text, priority) {
    this.data.unshift({
      id: ID.generate(),
      text: text.trim(),
      priority: parseInt(priority),
      deleted: false,
      createdAt: Time.now(),
      updatedAt: Time.now()
    });
    this.save();
    this.render();
  },

  remove(id) {
    const task = this.data.find((t) => t.id === id);
    if (task) {
      task.deleted = true;
      this.save();
      this.render();
    }
  },

  async permanentDelete(id) {
    const confirmed = await Confirm.show('确定要永久删除这条任务吗？此操作不可恢复。已归档任务将同时被删除。');
    if (!confirmed) return;
    this.data = this.data.filter((t) => t.id !== id);
    this.save();
    this.render();
  },

  async deleteCompletedRecord(recordId) {
    const confirmed = await Confirm.show('确定要删除此完成记录吗？不会影响任务本身。');
    if (!confirmed) return;
    this.completedLog = this.completedLog.filter((r) => r.id !== recordId);
    this.save();
    this.render();
  },

  restore(id) {
    const task = this.data.find((t) => t.id === id);
    if (task) {
      task.deleted = false;
      this.save();
      this.render();
    }
  },

  toggleComplete(id) {
    const task = this.data.find((t) => t.id === id);
    if (task && !task.deleted) {
      this.completedLog.unshift({
        id: ID.generate(),
        taskId: task.id,
        text: task.text,
        priority: task.priority,
        completedAt: Time.now()
      });
      this.save();
      this.render();
      this.showCompletedToast(id);
    }
  },

  showCompletedToast(id) {
    const card = document.querySelector(`.item-card[data-id="${id}"]`);
    if (!card) return;
    const checkbox = card.querySelector('.task-checkbox');
    if (checkbox) checkbox.disabled = true;
    const toast = document.createElement('div');
    toast.className = 'completed-toast';
    toast.textContent = '✓ 已记录';
    card.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
      if (checkbox) checkbox.disabled = false;
    }, 2200);
  },

  updatePriority(id, priority) {
    const task = this.data.find((t) => t.id === id);
    if (task && !task.deleted) {
      task.priority = parseInt(priority);
      task.updatedAt = Time.now();
      this.save();
      this.render();
    }
  },

  updateText(id, text) {
    const task = this.data.find((t) => t.id === id);
    if (task && !task.deleted) {
      task.text = text.trim();
      task.updatedAt = Time.now();
      this.save();
      this.render();
    }
  },

  cyclePriority(id) {
    const task = this.data.find((t) => t.id === id);
    if (task && !task.deleted) {
      const next = task.priority === 1 ? 2 : task.priority === 2 ? 3 : 1;
      this.updatePriority(id, next);
    }
  },

  search(query) {
    this.searchQuery = query.trim().toLowerCase();
    this.render();
  },

  getFiltered() {
    const q = this.searchQuery;
    const filtered = q
      ? this.data.filter((t) => !t.deleted && t.text.toLowerCase().includes(q))
      : this.data.filter((t) => !t.deleted);
    return filtered.sort((a, b) => a.priority - b.priority);
  },

  getCompleted() {
    return this.completedLog.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
  },

  getDeleted() {
    return this.data.filter((t) => t.deleted);
  },

  getPriorityLabel(p) {
    const labels = { 1: '紧急', 2: '重要', 3: '普通' };
    return labels[p] || '普通';
  },

  getPriorityClass(p) {
    const classes = { 1: 'high', 2: 'medium', 3: 'low' };
    return classes[p] || 'low';
  },

  render() {
    const container = document.getElementById('tasks-list');
    const items = this.getFiltered();

    // Active tasks
    if (items.length === 0) {
      container.innerHTML = this.searchQuery
        ? '<div class="no-results"><p>未找到相关任务</p></div>'
        : '<div class="empty-state"><p>还没有任务，添加第一个吧</p></div>';
    } else {
      container.innerHTML = items.map((task) => `
        <div class="item-card" data-id="${task.id}">
          <div class="item-header">
            <div class="item-body" style="display:flex;align-items:center;gap:0.5rem;">
              <input type="checkbox" class="task-checkbox" onchange="Tasks.toggleComplete('${task.id}')">
              <div style="flex:1;min-width:0;">
                <p class="item-text" onclick="Tasks.startEdit('${task.id}')">${this.escapeHtml(task.text)}</p>
                <div class="movie-info-row">
                  <span class="priority-badge priority-${this.getPriorityClass(task.priority)}" onclick="Tasks.cyclePriority('${task.id}')" style="cursor:pointer" title="点击切换优先级">
                    <span class="priority-dot ${this.getPriorityClass(task.priority)}"></span>
                    ${this.getPriorityLabel(task.priority)}
                  </span>
                </div>
                <div class="item-meta">创建于 ${Time.format(task.createdAt)}</div>
              </div>
            </div>
            <div class="item-actions">
              <button class="btn-danger" onclick="Tasks.remove('${task.id}')" title="删除">✕</button>
            </div>
          </div>
        </div>
      `).join('');
    }

    // Completed tasks section
    const completedTasks = this.getCompleted();
    if (completedTasks.length > 0) {
      const groups = {};
      completedTasks.forEach((record) => {
        const date = Time.formatDate(record.completedAt);
        if (!groups[date]) groups[date] = [];
        groups[date].push(record);
      });

      const completedHtml = `
        <div style="margin-top:1.5rem;border-top:1px solid var(--border);padding-top:0.75rem;">
          <button id="toggle-completed-btn" class="secondary" style="width:100%;font-size:0.85rem;" onclick="Tasks.toggleCompleted()">
            已完成任务 (${completedTasks.length}) ${this.completedExpanded ? '▾' : '▸'}
          </button>
          <div id="completed-tasks-list" style="display:${this.completedExpanded ? 'block' : 'none'};margin-top:0.6rem;">
            ${(() => {
              // Auto-expand latest date on first render
              const dates = Object.keys(groups);
              if (Object.keys(this.completedOpenDates).length === 0 && dates.length > 0) {
                this.completedOpenDates[dates[0]] = true;
              }
              return dates.map((date) => {
                const isOpen = this.completedOpenDates[date];
                return `
              <div style="display:flex;align-items:center;gap:0.4rem;padding:0.4rem 0 0.25rem;cursor:pointer;user-select:none;" onclick="Tasks.toggleCompletedDate('${date}')">
                <span style="font-size:0.6rem;color:var(--text-secondary);transition:transform 0.15s;display:inline-block;${isOpen ? 'transform:rotate(90deg)' : ''}">▸</span>
                <span style="font-size:0.75rem;color:var(--text-secondary);font-weight:500;">${date}</span>
                <span style="font-size:0.7rem;color:var(--text-secondary);">(${groups[date].length})</span>
              </div>
              <div style="display:${isOpen ? 'block' : 'none'};">
                ${groups[date].map((record) => `
                <div class="item-card" data-id="${record.id}" style="opacity:0.6;">
                  <div class="item-header">
                    <div class="item-body">
                      <p class="item-text completed">${this.escapeHtml(record.text)}</p>
                      <div class="movie-info-row">
                        <span class="priority-badge priority-${this.getPriorityClass(record.priority)}">
                          <span class="priority-dot ${this.getPriorityClass(record.priority)}"></span>
                          ${this.getPriorityLabel(record.priority)}
                        </span>
                      </div>
                      <div class="item-meta">完成于 ${Time.format(record.completedAt)}</div>
                    </div>
                    <div class="item-actions">
                      <button class="btn-danger" onclick="Tasks.deleteCompletedRecord('${record.id}')" title="删除此完成记录">删除记录</button>
                    </div>
                  </div>
                </div>
              `).join('')}
              </div>
            `;
          }).join('');
        })()}
          </div>
        </div>`;

      container.insertAdjacentHTML('beforeend', completedHtml);
    }

    // Deleted tasks section
    const deletedTasks = this.getDeleted();
    if (deletedTasks.length > 0) {
      const deletedHtml = `
        <div style="margin-top:1.5rem;border-top:1px solid var(--border);padding-top:0.75rem;">
          <button id="toggle-deleted-btn" class="secondary" style="width:100%;font-size:0.85rem;" onclick="Tasks.toggleDeleted()">
            已归档任务 (${deletedTasks.length}) ${this.deletedExpanded ? '▾' : '▸'}
          </button>
          <div id="deleted-tasks-list" style="display:${this.deletedExpanded ? 'block' : 'none'};margin-top:0.6rem;">
            ${deletedTasks.map((task) => `
              <div class="item-card" data-id="${task.id}" style="opacity:0.6;">
                <div class="item-header">
                  <div class="item-body">
                    <p class="item-text" style="color:var(--text-secondary);text-decoration:line-through;">${this.escapeHtml(task.text)}</p>
                    <div class="movie-info-row">
                      <span class="priority-badge priority-${this.getPriorityClass(task.priority)}">
                        <span class="priority-dot ${this.getPriorityClass(task.priority)}"></span>
                        ${this.getPriorityLabel(task.priority)}
                      </span>
                    </div>
                    <div class="item-meta">创建于 ${Time.format(task.createdAt)}</div>
                  </div>
                  <div class="item-actions">
                    <button onclick="Tasks.restore('${task.id}')" style="font-size:0.8rem;">恢复</button>
                    <button class="btn-danger" onclick="Tasks.permanentDelete('${task.id}')" title="永久删除">✕</button>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;

      container.insertAdjacentHTML('beforeend', deletedHtml);
    }
  },

  toggleCompleted() {
    this.completedExpanded = !this.completedExpanded;
    this.render();
  },

  toggleCompletedDate(date) {
    this.completedOpenDates[date] = !this.completedOpenDates[date];
    this.render();
  },

  toggleDeleted() {
    this.deletedExpanded = !this.deletedExpanded;
    this.render();
  },

  startEdit(id) {
    const card = document.querySelector(`#tasks-list .item-card[data-id="${id}"]`);
    if (!card) return;
    const textEl = card.querySelector('.item-text');
    const oldVal = textEl.textContent;

    textEl.contentEditable = 'true';
    textEl.focus();

    const finishEdit = () => {
      textEl.contentEditable = 'false';
      const newVal = textEl.textContent.trim();
      if (newVal && newVal !== oldVal.trim()) {
        const bytes = new TextEncoder().encode(newVal).length;
        if (bytes > 50) {
          textEl.textContent = oldVal;
          return;
        }
        this.updateText(id, newVal);
      } else if (!newVal) {
        textEl.textContent = oldVal;
      }
    };

    textEl.addEventListener('blur', finishEdit, { once: true });
    textEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); textEl.blur(); }
      if (e.key === 'Escape') { textEl.textContent = oldVal; textEl.blur(); }
    });
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  bindEvents() {
    // Add task button -> open dialog
    document.getElementById('add-task-btn').addEventListener('click', () => this.openAddDialog());

    // Add task dialog: confirm
    document.getElementById('add-task-confirm').addEventListener('click', () => this.confirmAdd());

    // Add task dialog: cancel
    document.getElementById('add-task-cancel').addEventListener('click', () => this.closeAddDialog());

    // Add task dialog: backdrop click
    document.getElementById('add-task-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeAddDialog();
    });

    // Add task dialog: Ctrl+Enter to confirm, Escape to cancel
    document.getElementById('add-task-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.confirmAdd(); }
      if (e.key === 'Escape') { e.preventDefault(); this.closeAddDialog(); }
    });

    // Add task dialog: byte count
    document.getElementById('add-task-input').addEventListener('input', () => {
      const input = document.getElementById('add-task-input');
      const countEl = document.getElementById('add-task-char-count');
      const bytes = new TextEncoder().encode(input.value).length;
      countEl.textContent = Math.min(bytes, 50);
      countEl.style.color = bytes > 50 ? 'var(--priority-high)' : '';
    });
  },

  openAddDialog() {
    const input = document.getElementById('add-task-input');
    input.value = '';
    document.getElementById('add-task-priority').value = '2';
    document.getElementById('add-task-char-count').textContent = '0';
    document.getElementById('add-task-char-count').style.color = '';
    document.getElementById('add-task-overlay').style.display = 'flex';
    input.focus();
  },

  closeAddDialog() {
    document.getElementById('add-task-overlay').style.display = 'none';
  },

  confirmAdd() {
    const input = document.getElementById('add-task-input');
    const bytes = new TextEncoder().encode(input.value).length;
    if (bytes > 50) return;
    const priority = document.getElementById('add-task-priority').value;
    const text = input.value.trim();
    if (text) {
      this.add(text, priority);
      this.closeAddDialog();
    }
  }
};
