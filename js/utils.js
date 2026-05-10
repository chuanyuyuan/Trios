const Storage = {
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
  set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.warn('Storage.write error:', e);
    }
  }
};

const ID = {
  generate() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }
};

const Time = {
  now() {
    return new Date().toISOString();
  },
  format(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },
  formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
};

const Priority = {
  map: { 1: '紧急', 2: '重要', 3: '普通' },
  label: { 1: 'high', 2: 'medium', 3: 'low' }
};
