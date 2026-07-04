(function () {
  window.getUser = function () {
    try { return JSON.parse(localStorage.getItem('user')); }
    catch { return null; }
  };

  window.requireAuth = function () {
    const u = window.getUser();
    if (!u) { window.location.href = 'login.html'; return null; }
    return u;
  };

  window.requireAdmin = function () {
    const u = window.requireAuth();
    if (!u) return null;
    if (u.role !== 'SYS_ADMIN') { window.location.href = 'index.html'; return null; }
    return u;
  };

  window.logout = function () {
    localStorage.removeItem('user');
    localStorage.removeItem('session_token');
    window.location.href = 'login.html';
  };

  // showUser 傳 false 的頁面（公開頁）不顯示使用者/登出區塊；
  // 其他頁面沒登入時也整塊移除，避免行動版選單展開時被 CSS 強制顯示
  window.initNavbar = function (activePage, showUser) {
    const u = window.getUser();
    const navUser = document.getElementById('navUser');
    const nameEl = document.getElementById('userName');
    if (navUser) {
      if (u && showUser !== false) {
        if (nameEl) nameEl.textContent = u.name;
        navUser.style.display = 'flex';
      } else {
        navUser.remove();
      }
    }

    const toggle = document.getElementById('navToggle');
    const navbar = document.getElementById('navbar');
    if (toggle && navbar) {
      toggle.addEventListener('click', () => navbar.classList.toggle('open'));
      document.addEventListener('click', (e) => {
        if (!navbar.contains(e.target)) navbar.classList.remove('open');
      });
    }

    if (activePage) {
      document.querySelectorAll('.nav-links a').forEach(a => {
        if (a.getAttribute('href').includes(activePage)) a.classList.add('active');
      });
    }
  };

  window.showToast = function (msg, type) {
    let wrap = document.getElementById('toastWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toastWrap';
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  };

  window.authFetch = async function (url, opts) {
    const token = localStorage.getItem('session_token');
    const options = opts || {};
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    if (res.status === 401) {
      // token 過期或未登入：清除狀態並導向登入頁
      localStorage.removeItem('user');
      localStorage.removeItem('session_token');
      window.location.href = 'login.html';
    }
    return res;
  };

  window.fmtDate = function (iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
  };

  window.fmtDateTime = function (iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  window.fmtMoney = function (amount) {
    const n = parseFloat(amount);
    return 'NT$' + n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
  };
})();
