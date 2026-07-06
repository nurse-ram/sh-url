(function(){
  const cfg = window.RUNS_AUTH_CONFIG || {};
  const statusText = document.getElementById('statusText');
  const googleButton = document.getElementById('googleButton');
  let isSubmitting = false;
  let submitTimer = null;

  function setStatus(message, isError){
    statusText.textContent = message || '';
    statusText.classList.toggle('error', !!isError);
  }

  function decodeJwt(token){
    const payload = token.split('.')[1] || '';
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(Array.from(json).map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')));
  }

  function handleCredential(response){
    try{
      if(isSubmitting) return;
      const credential = response && response.credential;
      if(!credential) throw new Error('ไม่พบข้อมูลยืนยันตัวตน');
      const profile = decodeJwt(credential);
      const email = String(profile.email || '').toLowerCase();
      const domain = email.split('@')[1] || '';
      if(domain !== cfg.ALLOWED_DOMAIN){
        setStatus('บัญชีนี้ไม่ใช่ @' + cfg.ALLOWED_DOMAIN + ' ระบบจะให้ Apps Script ตรวจรายชื่อในชีต USERS ต่อ', false);
      }else{
        setStatus('ยืนยันบัญชี RUMAIL แล้ว กำลังเปิดระบบ...', false);
      }
      submitToken(credential);
    }catch(err){
      setStatus(err.message || String(err), true);
    }
  }

  function submitToken(credential){
    isSubmitting = true;
    setLoginBusy(true);
    submitTimer = setTimeout(() => {
      setStatus('กำลังเปิดระบบ หากหน้านี้ค้างนานเกินไปให้รีเฟรชแล้วเข้าสู่ระบบใหม่', true);
      setLoginBusy(false);
      isSubmitting = false;
    }, 15000);

    const joiner = cfg.APPS_SCRIPT_URL.indexOf('?') >= 0 ? '&' : '?';
    window.location.replace(cfg.APPS_SCRIPT_URL + joiner + 'token=' + encodeURIComponent(credential));
  }

  function setLoginBusy(busy){
    if(!googleButton) return;
    googleButton.classList.toggle('is-busy', busy);
    googleButton.style.pointerEvents = busy ? 'none' : '';
    googleButton.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  window.addEventListener('load', () => {
    if(!cfg.GOOGLE_CLIENT_ID || cfg.GOOGLE_CLIENT_ID.indexOf('PASTE_') === 0){
      setStatus('กรุณาใส่ GOOGLE_CLIENT_ID ใน config.js ก่อนใช้งาน', true);
      return;
    }
    if(!window.google || !google.accounts || !google.accounts.id){
      setStatus('โหลด Google Sign-In ไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง', true);
      return;
    }
    google.accounts.id.initialize({
      client_id: cfg.GOOGLE_CLIENT_ID,
      callback: handleCredential,
      auto_select: false,
      cancel_on_tap_outside: true
    });
    const slotWidth = Math.floor(googleButton.getBoundingClientRect().width || (window.innerWidth - 56));
    const buttonWidth = Math.min(340, Math.max(200, slotWidth));
    google.accounts.id.renderButton(googleButton, {
      type: 'standard',
      theme: 'filled_blue',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      width: buttonWidth
    });
  });
})();
