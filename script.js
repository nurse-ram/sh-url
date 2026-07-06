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

  function goToGoogleLogout() {
    const continueUrl = encodeURIComponent(getContinueUrl());
    window.location.href = 'https://accounts.google.com/Logout?continue=' + continueUrl;
  }

  function goToGoogleAccountChooser() {
    const continueUrl = encodeURIComponent(getContinueUrl());
    window.location.href = 'https://accounts.google.com/AccountChooser?continue=' + continueUrl;
  }

  function redirectToAppsScript(token) {
    const separator = config.APPS_SCRIPT_URL.indexOf('?') === -1 ? '?' : '&';
    const target = config.APPS_SCRIPT_URL + separator + 'token=' + encodeURIComponent(token);
    window.location.replace(target);
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

    setStatus('พร้อมเข้าสู่ระบบ', '');
  }

  switchAccountBtn.addEventListener('click', goToGoogleAccountChooser);
  logoutBtn.addEventListener('click', goToGoogleLogout);

  initGoogleButton();
})();
