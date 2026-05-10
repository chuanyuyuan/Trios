const Confirm = {
  show(message) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('confirm-overlay');
      const msgEl = document.getElementById('confirm-message');
      const okBtn = document.getElementById('confirm-ok');
      const cancelBtn = document.getElementById('confirm-cancel');

      msgEl.textContent = message;
      cancelBtn.style.display = '';

      const close = (result) => {
        overlay.style.display = 'none';
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        document.removeEventListener('keydown', onKeydown);
        resolve(result);
      };

      const onOk = () => close(true);
      const onCancel = () => close(false);

      const onKeydown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          close(false);
        }
      };

      okBtn.addEventListener('click', onOk);
      cancelBtn.addEventListener('click', onCancel);
      document.addEventListener('keydown', onKeydown);

      overlay.style.display = 'flex';

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false);
      });
    });
  },

  alert(message) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('confirm-overlay');
      const msgEl = document.getElementById('confirm-message');
      const okBtn = document.getElementById('confirm-ok');
      const cancelBtn = document.getElementById('confirm-cancel');

      msgEl.textContent = message;
      cancelBtn.style.display = 'none';

      const close = () => {
        overlay.style.display = 'none';
        okBtn.removeEventListener('click', onOk);
        document.removeEventListener('keydown', onKeydown);
        cancelBtn.style.display = '';
        resolve();
      };

      const onOk = () => close();
      const onKeydown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          close();
        }
      };

      okBtn.addEventListener('click', onOk);
      document.addEventListener('keydown', onKeydown);

      overlay.style.display = 'flex';
    });
  }
};
