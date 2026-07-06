(function () {
  'use strict';

  const config = window.RUNS_SHORT_URL_CONFIG || {};
  const statusText = document.getElementById('statusText');
  const switchAccountBtn = document.getElementById('switchAccountBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  function setStatus(message, type) {
    statusText.textContent = message;
    statusText.className = 'status-text' + (type ? ' ' + type : '');
  }

  function isConfigured() {
    return config.GOOGLE_CLIENT_ID &&
      !config.GOOGLE_CLIENT_ID.includes('PASTE_') &&
      config.APPS_SCRIPT_URL &&
      !config.APPS_SCRIPT_URL.includes('PASTE_');
  }

  function decodeJwtPayload(token) {
    try {
      const payload = token.split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(atob(base64).split('').map(function (char) {
        return '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(json);
    } catch (error) {
      return null;
    }
  }

  function getContinueUrl() {
    return window.location.origin + window.location.pathname;
  }

  function getShortCodeFromPath() {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    if (!path || path === 'index.html') return '';
    if (path.indexOf('/') > -1) return '';
    return /^[A-Za-z0-9_-]{1,64}$/.test(path) ? path : '';
  }

  function redirectShortCode(code) {
    const separator = config.APPS_SCRIPT_URL.indexOf('?') === -1 ? '?' : '&';
    const target = config.APPS_SCRIPT_URL + separator + 'action=resolve&code=' + encodeURIComponent(code);
    window.location.replace(target);
  }

  function goToGoogleLogout() {
    if (window.google && google.accounts && google.accounts.id && google.accounts.id.disableAutoSelect) {
      google.accounts.id.disableAutoSelect();
    }
    window.location.href = getContinueUrl() + '?logout=1';
  }

  function goToGoogleAccountChooser() {
    if (window.google && google.accounts && google.accounts.id && google.accounts.id.disableAutoSelect) {
      google.accounts.id.disableAutoSelect();
    }
    window.location.href = getContinueUrl() + '?switch=1';
  }

  function redirectToAppsScript(token) {
    const separator = config.APPS_SCRIPT_URL.indexOf('?') === -1 ? '?' : '&';
    const target = config.APPS_SCRIPT_URL + separator + 'token=' + encodeURIComponent(token);
    window.location.replace(target);
  }

  function getLoginMode() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('logout')) return 'logout';
    if (params.has('switch')) return 'switch';
    return '';
  }

  function cleanLoginUrl() {
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
    }
  }

  function handleCredentialResponse(response) {
    const token = response && response.credential;
    if (!token) {
      setStatus('ไม่พบ token จาก Google กรุณาลองเข้าสู่ระบบใหม่', 'error');
      return;
    }

    const payload = decodeJwtPayload(token);
    if (!payload || !payload.email) {
      setStatus('อ่านข้อมูลอีเมลจาก Google token ไม่ได้', 'error');
      return;
    }

    const email = String(payload.email).toLowerCase();
    const domain = '@' + String(config.ALLOWED_DOMAIN || 'rumail.ru.ac.th').toLowerCase();

    if (email.endsWith(domain)) {
      setStatus('ยืนยันโดเมนสำเร็จ กำลังเข้าสู่ระบบ...', 'success');
    } else {
      setStatus('กำลังส่งต่อเพื่อตรวจสิทธิ์จากชีต USERS...', 'success');
    }

    redirectToAppsScript(token);
  }

  function initGoogleButton() {
    if (!isConfigured()) {
      setStatus('กรุณาตั้งค่า GOOGLE_CLIENT_ID และ APPS_SCRIPT_URL ใน config.js ก่อนใช้งาน', 'error');
      return;
    }

    if (!window.google || !google.accounts || !google.accounts.id) {
      setStatus('กำลังโหลด Google Identity Services...', '');
      window.setTimeout(initGoogleButton, 250);
      return;
    }

    const loginMode = getLoginMode();
    if (loginMode && google.accounts.id.disableAutoSelect) {
      google.accounts.id.disableAutoSelect();
    }

    google.accounts.id.initialize({
      client_id: config.GOOGLE_CLIENT_ID,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: false
    });

    google.accounts.id.renderButton(document.getElementById('googleButton'), {
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'pill',
      width: 320
    });

    if (loginMode === 'logout') {
      setStatus('ออกจากระบบแล้ว หากต้องการใช้งานต่อกรุณาเข้าสู่ระบบใหม่', 'success');
    } else if (loginMode === 'switch') {
      setStatus('เลือกบัญชี Google ที่ต้องการเข้าสู่ระบบ', 'success');
    } else {
      setStatus('พร้อมเข้าสู่ระบบ', '');
    }

    cleanLoginUrl();
  }

  switchAccountBtn.addEventListener('click', goToGoogleAccountChooser);
  logoutBtn.addEventListener('click', goToGoogleLogout);

  const shortCode = getShortCodeFromPath();
  if (shortCode) {
    setStatus('กำลังเปิดลิงก์ปลายทาง...', 'success');
    redirectShortCode(shortCode);
    return;
  }

  initGoogleButton();
})();
