const Ideas = {
  data: [],
  searchQuery: '',

  init() {
    this.load();
    this.bindEvents();
    this.render();
  },

  load() {
    this.data = Storage.get('trios_ideas');
  },

  save() {
    Storage.set('trios_ideas', this.data);
  },

  add(content) {
    const now = Time.now();
    this.data.unshift({
      id: ID.generate(),
      content: content.trim(),
      createdAt: now,
      updatedAt: now
    });
    this.save();
    this.render();
  },

  async remove(id) {
    const confirmed = await Confirm.show('确定要删除这条灵感吗？');
    if (!confirmed) return;
    this.data = this.data.filter((item) => item.id !== id);
    this.save();
    this.render();
  },

  update(id, content) {
    const item = this.data.find((i) => i.id === id);
    if (item) {
      item.content = content.trim();
      item.updatedAt = Time.now();
      this.save();
      this.render();
    }
  },

  search(query) {
    this.searchQuery = query.trim().toLowerCase();
    this.render();
  },

  getFiltered() {
    if (!this.searchQuery) return this.data;
    const q = this.searchQuery;
    return this.data.filter((item) =>
      item.content.toLowerCase().includes(q)
    );
  },

  render() {
    const container = document.getElementById('ideas-list');
    const items = this.getFiltered();

    if (items.length === 0) {
      container.innerHTML = this.searchQuery
        ? '<div class="no-results"><p>未找到相关灵感</p></div>'
        : '<div class="empty-state"><p>还没有灵感，开始记录吧</p></div>';
      return;
    }

    container.innerHTML = items.map((item) => `
      <div class="item-card" data-id="${item.id}">
        <div class="item-header">
          <div class="item-body">
            <p class="item-text" onclick="Ideas.startEdit('${item.id}')">${this.escapeHtml(item.content)}</p>
            <div class="item-meta">${Time.format(item.createdAt)}</div>
          </div>
          <div class="item-actions">
            <button class="btn-danger" onclick="Ideas.remove('${item.id}')" title="删除">✕</button>
          </div>
        </div>
      </div>
    `).join('');
  },

  startEdit(id) {
    const card = document.querySelector(`#ideas-list .item-card[data-id="${id}"]`);
    if (!card) return;
    const textEl = card.querySelector('.item-text');
    const oldVal = textEl.textContent;

    textEl.contentEditable = 'true';
    textEl.focus();

    const finishEdit = () => {
      textEl.contentEditable = 'false';
      const newVal = textEl.textContent.trim();
      if (newVal && newVal !== oldVal.trim()) {
        this.update(id, newVal);
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
    // Add form
    document.getElementById('ideas-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('idea-input');
      const val = input.value.trim();
      if (val) {
        this.add(val);
        input.value = '';
      }
    });

  }
};
