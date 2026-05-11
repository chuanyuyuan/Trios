const Movies = {
  data: [],
  searchQuery: '',
  currentMovieId: null,
  selectedResult: null,

  init() {
    this.load();
    if (!this._bound) { this.bindEvents(); this._bound = true; }
    this.render();
  },

  load() {
    this.data = Storage.get('trios_movies');
  },

  save() {
    Storage.set('trios_movies', this.data);
  },

  add(name, extra = {}) {
    this.data.unshift({
      id: ID.generate(),
      name: name.trim(),
      addedAt: Time.now(),
      watched: false,
      watchedAt: null,
      comments: [],
      poster: extra.poster || null,
      tmdbId: extra.tmdbId || null,
      year: extra.year || null
    });
    this.save();
    this.render();
  },

  async remove(id) {
    const confirmed = await Confirm.show('确定要删除这部电影吗？');
    if (!confirmed) return;
    this.data = this.data.filter((m) => m.id !== id);
    this.save();
    this.render();
  },

  updateName(id, name) {
    const movie = this.data.find((m) => m.id === id);
    if (movie) {
      movie.name = name.trim();
      this.save();
      this.render();
    }
  },

  updateComment(movieId, commentId, text) {
    const movie = this.data.find((m) => m.id === movieId);
    if (movie) {
      const comment = movie.comments.find((c) => c.id === commentId);
      if (comment) {
        comment.text = text.trim();
        this.save();
        this.render();
      }
    }
  },

  async deleteComment(movieId, commentId) {
    const confirmed = await Confirm.show('确定要删除这条评论吗？');
    if (!confirmed) return;
    this.removeComment(movieId, commentId);
  },

  toggleWatched(id) {
    const movie = this.data.find((m) => m.id === id);
    if (movie) {
      movie.watched = !movie.watched;
      movie.watchedAt = movie.watched ? Time.now() : null;
      this.save();
      this.render();
    }
  },

  addComment(movieId, text, rating) {
    const movie = this.data.find((m) => m.id === movieId);
    if (movie) {
      movie.comments.push({
        id: ID.generate(),
        text: text.trim(),
        rating: parseFloat(rating),
        createdAt: Time.now()
      });
      this.save();
      this.render();
    }
  },

  removeComment(movieId, commentId) {
    const movie = this.data.find((m) => m.id === movieId);
    if (movie) {
      movie.comments = movie.comments.filter((c) => c.id !== commentId);
      this.save();
      this.render();
    }
  },

  getAvgRating(movie) {
    if (!movie.comments || movie.comments.length === 0) return null;
    const sum = movie.comments.reduce((s, c) => s + c.rating, 0);
    return (sum / movie.comments.length).toFixed(1);
  },

  search(query) {
    this.searchQuery = query.trim().toLowerCase();
    this.render();
  },

  async searchTMDB(query) {
    const key = (Settings.data.tmdbApiKey || '').trim();
    if (!key) return [];
    try {
      const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(query)}&language=zh-CN`);
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || []).slice(0, 5).map(r => ({
        tmdbId: r.id,
        title: r.title,
        year: r.release_date ? r.release_date.slice(0, 4) : '',
        posterPath: r.poster_path || null
      }));
    } catch {
      return [];
    }
  },

  getFiltered() {
    if (!this.searchQuery) return this.data;
    const q = this.searchQuery;
    return this.data.filter((m) => {
      if (m.name.toLowerCase().includes(q)) return true;
      return m.comments.some((c) => c.text.toLowerCase().includes(q));
    });
  },

  render() {
    const container = document.getElementById('movies-list');
    const items = this.getFiltered();

    if (items.length === 0) {
      container.innerHTML = this.searchQuery
        ? '<div class="no-results"><p>未找到相关电影</p></div>'
        : '<div class="empty-state"><p>还没有电影，添加第一部吧</p></div>';
      return;
    }

    container.innerHTML = items.map((movie) => {
      const avg = this.getAvgRating(movie);
      const ratingHtml = avg != null
        ? `<span class="rating-badge">评分 ${avg}</span>`
        : '';
      const watchedClass = movie.watched ? 'watched' : 'unwatched';

      const commentBtn = movie.watched
        ? `<button onclick="Movies.openComment('${movie.id}')" title="评论">评论${movie.comments.length ? ' ' + movie.comments.length : ''}</button>`
        : '';

      const commentsHtml = movie.comments.length > 0
        ? `<div class="movie-comments">${movie.comments.map(c =>
            `<div class="movie-comment-item" data-movie-id="${movie.id}" data-comment-id="${c.id}">
              <span class="mc-rating">${c.rating.toFixed(1)}</span>
              <span class="mc-text" onclick="Movies.startCommentEdit('${movie.id}','${c.id}')">${this.escapeHtml(c.text)}</span>
              <span class="mc-date">${Time.formatDate(c.createdAt)}</span>
              <button class="mc-delete" onclick="Movies.deleteComment('${movie.id}','${c.id}')" title="删除评论">✕</button>
            </div>`
          ).join('')}</div>`
        : '';

      return `
        <div class="item-card ${watchedClass}" data-id="${movie.id}" style="${movie.poster ? 'display:flex;gap:0.75rem;' : ''}">
          ${movie.poster ? `<img class="movie-poster" src="https://image.tmdb.org/t/p/w92${movie.poster}" alt="" loading="lazy">` : ''}
          <div class="item-header" style="${movie.poster ? 'flex:1;min-width:0;' : ''}">
            <div class="item-body">
              <p class="item-text" onclick="Movies.startEdit('${movie.id}')">${this.escapeHtml(movie.name)}</p>
              ${movie.year ? `<span style="font-size:0.75rem;color:var(--text-secondary);">${movie.year}</span>` : ''}
              <div class="movie-info-row">
                ${ratingHtml}
                ${movie.watched ? '<span class="watched-label">✓ 已看过</span>' : '<span class="unwatched-label">未看过</span>'}
              </div>
              <div class="item-meta">${Time.format(movie.addedAt)}</div>
            </div>
            <div class="item-actions">
              <button class="btn-watched ${movie.watched ? 'active' : ''}" onclick="Movies.toggleWatched('${movie.id}')" title="${movie.watched ? '标记未看' : '标记看过'}">
                ${movie.watched ? '已看' : '看过'}
              </button>
              ${commentBtn}
              <button class="btn-danger" onclick="Movies.remove('${movie.id}')" title="删除">✕</button>
            </div>
            ${commentsHtml}
          </div>
        </div>
      `;
    }).join('');
  },

  startEdit(id) {
    const card = document.querySelector(`#movies-list .item-card[data-id="${id}"]`);
    if (!card) return;
    const textEl = card.querySelector('.item-text');
    const oldVal = textEl.textContent;

    textEl.contentEditable = 'true';
    textEl.focus();

    const finishEdit = () => {
      textEl.contentEditable = 'false';
      const newVal = textEl.textContent.trim();
      if (newVal && newVal !== oldVal.trim()) {
        this.updateName(id, newVal);
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

  startCommentEdit(movieId, commentId) {
    const commentItem = document.querySelector(`.movie-comment-item[data-movie-id="${movieId}"][data-comment-id="${commentId}"]`);
    if (!commentItem) return;
    const textEl = commentItem.querySelector('.mc-text');
    const oldVal = textEl.textContent;

    textEl.contentEditable = 'true';
    textEl.focus();

    const finishEdit = () => {
      textEl.contentEditable = 'false';
      const newVal = textEl.textContent.trim();
      if (newVal && newVal !== oldVal.trim()) {
        this.updateComment(movieId, commentId, newVal);
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

  openComment(movieId) {
    this.currentMovieId = movieId;
    const movie = this.data.find((m) => m.id === movieId);
    if (!movie) return;

    document.getElementById('comment-dialog-title').textContent = `评论 · ${movie.name}`;
    document.getElementById('comment-input').value = '';
    document.getElementById('comment-char-count').textContent = '0 / 500';
    document.getElementById('comment-char-count').classList.remove('over');

    const overlay = document.getElementById('comment-overlay');
    overlay.style.display = 'flex';
    document.getElementById('comment-input').focus();
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  closeModal() {
    document.getElementById('comment-overlay').style.display = 'none';
    this.currentMovieId = null;
  },

  bindEvents() {
    // Add movie button -> open dialog
    document.getElementById('add-movie-btn').addEventListener('click', () => this.openAddDialog());

    // Add movie dialog: confirm — 有选中结果则带图添加, 否则直接添加
    document.getElementById('add-movie-confirm').addEventListener('click', () => {
      const name = document.getElementById('add-movie-input').value.trim();
      if (!name) return;
      if (this.selectedResult) {
        this.add(this.selectedResult.title, {
          tmdbId: this.selectedResult.tmdbId,
          poster: this.selectedResult.posterPath,
          year: this.selectedResult.year
        });
        this.closeAddDialog();
      } else {
        this.add(name);
        this.closeAddDialog();
      }
    });

    // Add movie dialog: cancel
    document.getElementById('add-movie-cancel').addEventListener('click', () => this.closeAddDialog());

    // Add movie dialog: backdrop click
    document.getElementById('add-movie-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeAddDialog();
    });

    // Add movie dialog: search button — 搜索 TMDB
    document.getElementById('add-movie-search').addEventListener('click', () => {
      const name = document.getElementById('add-movie-input').value.trim();
      if (name) this.doSearch(name);
    });

    // Add movie dialog: Enter -> 有 key 搜索, 无 key 直接添加
    document.getElementById('add-movie-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const name = document.getElementById('add-movie-input').value.trim();
        if (!name) return;
        const hasKey = !!(Settings.data.tmdbApiKey || '').trim();
        if (hasKey) {
          this.doSearch(name);
        } else {
          this.add(name);
          this.closeAddDialog();
        }
      }
      if (e.key === 'Escape') { e.preventDefault(); this.closeAddDialog(); }
    });

    // 编辑输入框时清除选中的搜索结果
    document.getElementById('add-movie-input').addEventListener('input', () => {
      if (this.selectedResult) {
        this.selectedResult = null;
        document.querySelectorAll('.movie-search-result').forEach(el => el.classList.remove('selected'));
      }
    });

// Comment dialog: close
    document.getElementById('comment-dialog-close').addEventListener('click', () => this.closeModal());

    // Comment dialog: backdrop click
    document.getElementById('comment-overlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeModal();
    });

    // Comment dialog: Escape (document-level so it catches any focus)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('comment-overlay').style.display === 'flex') {
        e.preventDefault();
        this.closeModal();
      }
    });

    // Comment slider: update value display
    document.getElementById('comment-rating-slider').addEventListener('input', () => {
      const slider = document.getElementById('comment-rating-slider');
      document.getElementById('comment-rating-value').textContent = parseFloat(slider.value).toFixed(1);
    });

    // Comment: submit
    document.getElementById('comment-submit').addEventListener('click', () => {
      const input = document.getElementById('comment-input');
      const rating = document.getElementById('comment-rating-slider').value;
      const text = input.value.trim();
      const bytes = new TextEncoder().encode(text).length;
      if (bytes > 500) return;
      if (text && this.currentMovieId) {
        this.addComment(this.currentMovieId, text, rating);
        this.closeModal();
        input.value = '';
        document.getElementById('comment-char-count').textContent = '0 / 500';
        document.getElementById('comment-char-count').classList.remove('over');
      }
    });

    // Comment input: byte count
    document.getElementById('comment-input').addEventListener('input', () => {
      const input = document.getElementById('comment-input');
      const countEl = document.getElementById('comment-char-count');
      const bytes = new TextEncoder().encode(input.value).length;
      countEl.textContent = `${bytes} / 500`;
      countEl.classList.toggle('over', bytes > 500);
    });
  },

  openAddDialog() {
    this.selectedResult = null;
    const input = document.getElementById('add-movie-input');
    input.value = '';
    document.getElementById('add-movie-overlay').style.display = 'flex';
    document.getElementById('add-movie-results').style.display = 'none';
    document.getElementById('add-movie-results').innerHTML = '';
    const hasKey = !!(Settings.data.tmdbApiKey || '').trim();
    document.getElementById('add-movie-input-wrap').classList.toggle('with-search', hasKey);
    input.focus();
  },

  closeAddDialog() {
    this.selectedResult = null;
    document.getElementById('add-movie-overlay').style.display = 'none';
    document.getElementById('add-movie-search').disabled = false;
    document.getElementById('add-movie-search').textContent = '搜索';
  },

  confirmAdd() {
    const input = document.getElementById('add-movie-input');
    const name = input.value.trim();
    if (!name) return;
    const hasKey = !!(Settings.data.tmdbApiKey || '').trim();
    if (hasKey) {
      this.doSearch(name);
    } else {
      this.add(name);
      this.closeAddDialog();
    }
  },

  async doSearch(query) {
    this.selectedResult = null;
    const btn = document.getElementById('add-movie-search');
    btn.textContent = '搜索中…';
    btn.disabled = true;
    const results = await this.searchTMDB(query);
    btn.textContent = '搜索';
    btn.disabled = false;

    const container = document.getElementById('add-movie-results');
    container.innerHTML = '';
    container.style.display = 'block';

    if (results.length === 0) {
      container.innerHTML = '<div class="movie-search-empty">未找到匹配的电影</div>';
      return;
    }

    results.forEach(r => {
      const item = document.createElement('div');
      item.className = 'movie-search-result';
      item.innerHTML = `
        <img class="movie-search-poster" src="https://image.tmdb.org/t/p/w92${r.posterPath || ''}" alt="" onerror="this.style.display='none'">
        <div class="movie-search-info">
          <div class="movie-search-title">${this.escapeHtml(r.title)}</div>
          <div class="movie-search-year">${r.year || ''}</div>
        </div>
      `;
      item.addEventListener('click', () => {
        container.querySelectorAll('.movie-search-result').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        this.selectedResult = r;
        document.getElementById('add-movie-input').value = r.title;
      });
      container.appendChild(item);
    });
  }
};
