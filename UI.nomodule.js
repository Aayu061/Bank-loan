// UI.nomodule.js — Non-module fallback for environments that block module imports (file://)
(function(){
  // Theme init (same behavior as UI.js)
  (function themeInit(){
    const saved = localStorage.getItem('theme');
    if(saved === 'light') document.documentElement.classList.remove('dark');
    else document.documentElement.classList.add('dark');
  })();

  function toggleTheme(btn){
    const html = document.documentElement;
    html.classList.toggle('dark');
    const mode = html.classList.contains('dark') ? 'dark' : 'light';
    localStorage.setItem('theme', mode);
    if(btn) btn.textContent = mode === 'dark' ? '🌙' : '☀️';
  }

  function syncThemeIcon(btn){
    const isDark = document.documentElement.classList.contains('dark');
    if(btn) btn.textContent = isDark ? '🌙' : '☀️';
  }

  // Password toggle
  function wirePasswordToggle(inputId, btnId){
    const input = document.getElementById(inputId);
    const btn   = document.getElementById(btnId);
    if(!input || !btn) return;
    const eyeSVG = (opts = {}) => `\n    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" ${opts.title?`aria-label="${opts.title}"`:'role="img"'}>\n      <path stroke-linecap="round" stroke-linejoin="round" d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />\n      <circle cx="12" cy="12" r="2.5" />\n    </svg>`;
    const eyeOffSVG = () => `\n    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5">\n      <path stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18" />\n      <path stroke-linecap="round" stroke-linejoin="round" d="M10.58 10.58A3 3 0 0113.42 13.42" />\n      <path stroke-linecap="round" stroke-linejoin="round" d="M2.5 12s3.5-6.5 9.5-6.5c1.8 0 3.3.5 4.7 1.3" />\n    </svg>`;

    // Initialize icon
    btn.innerHTML = eyeSVG({title: 'Show password'});
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', ()=> {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
      btn.setAttribute('aria-pressed', String(isPassword));
      btn.innerHTML = isPassword ? eyeOffSVG() : eyeSVG({title: 'Show password'});
    });
  }

  // Mobile nav
  function wireMobileNav(triggerId, menuId){
    const t = document.getElementById(triggerId);
    const m = document.getElementById(menuId);
    if(!t || !m) return;
    t.addEventListener('click', ()=> m.classList.toggle('hidden'));
  }

  // Active nav link
  function markActive(pageKey){
    document.querySelectorAll('.nav-link').forEach(a=>{
      if(a.dataset.page === pageKey){
        a.classList.add('active-link');
        a.setAttribute('aria-current','page');
      }
    });
  }

  // Toast
  function showToast(message, ms=2200){
    const t = document.getElementById('toast'); const m = document.getElementById('toastMsg');
    if(!t || !m) return;
    m.textContent = message; t.classList.remove('hidden');
    setTimeout(()=> t.classList.add('hidden'), ms);
  }

  // EMI Calculator
  function clampNum(v, min, max){ return Math.min(Math.max(v, min), max); }
  function formatCurrency(num) {
    if (num <= 0 || isNaN(num)) return '₹ 0';
    if (num >= 10000000) return '₹' + (num/10000000).toFixed(2) + ' Cr';
    if (num >= 100000) return '₹' + (num/100000).toFixed(2) + ' L';
    return '₹' + num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function wireCalculator({amountId, rateId, monthsId, emiId, totalInterestId, totalPayableId}){
    const A = document.getElementById(amountId);
    const R = document.getElementById(rateId);
    const M = document.getElementById(monthsId);
    const EMIo = document.getElementById(emiId);
    const INT = document.getElementById(totalInterestId);
    const TOT = document.getElementById(totalPayableId);

    if(!A || !R || !M || !EMIo || !INT || !TOT) {
      console.error('Calculator elements not found:', {A, R, M, EMIo, INT, TOT});
      return;
    }

    function calc(){
      let p = parseFloat(A.value) || 0;
      let y = parseFloat(R.value) || 0;
      let n = parseInt(M.value) || 0;

      if(p > 0) p = clampNum(p, 1000, 100000000);
      if(y > 0) y = clampNum(y, 0.1, 50);
      if(n > 0) n = clampNum(n, 1, 600);

      const j = y / 1200;
      if(p > 0 && y > 0 && n > 0){
        try {
          const power = Math.pow(1 + j, n);
          const emi = (p * j * power) / (power - 1);
          const total = emi * n;
          const interest = total - p;

          EMIo.textContent = formatCurrency(emi);
          INT.textContent = formatCurrency(interest);
          TOT.textContent = formatCurrency(total);
        } catch(e) {
          console.error('Calculation error:', e);
          EMIo.textContent = '₹ 0'; INT.textContent = '₹ 0'; TOT.textContent = '₹ 0';
        }
      } else {
        EMIo.textContent = '₹ 0'; INT.textContent = '₹ 0'; TOT.textContent = '₹ 0';
      }
    }

    [A, R, M].forEach(input => {
      if(input) { input.addEventListener('input', calc); input.addEventListener('change', calc); input.addEventListener('keyup', calc); }
    });

    A.value = '500000'; R.value = '10.5'; M.value = '36'; calc();
  }

  // Expose functions to the global scope for non-module use
  window.toggleTheme = toggleTheme;
  window.syncThemeIcon = syncThemeIcon;
  window.wirePasswordToggle = wirePasswordToggle;
  window.wireMobileNav = wireMobileNav;
  window.markActive = markActive;
  window.showToast = showToast;
  window.wireCalculator = wireCalculator;

  // Simple API helpers that call backend endpoints with credentials
  const API_BASE = window.API_BASE || (location.protocol === 'file:' ? 'http://localhost:4000' : `${location.protocol}//${location.host}`);

  async function apiRequest(path, opts = {}){
    const url = (path.startsWith('http') ? path : `${API_BASE}${path}`);
    opts.credentials = opts.credentials || 'include';
    opts.headers = Object.assign({'Content-Type':'application/json'}, opts.headers || {});
    if(opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
    const res = await fetch(url, opts);
    let json = null;
    try{ json = await res.json(); } catch(e) { json = null; }
    if(!res.ok) {
      const err = (json && json.error) ? json.error : (res.statusText || 'Request failed');
      const e = new Error(err);
      e.status = res.status;
      e.payload = json;
      throw e;
    }
    return json;
  }

  async function register(payload){ return apiRequest('/api/auth/register', { method: 'POST', body: payload }); }
  async function login(payload){ return apiRequest('/api/auth/login', { method: 'POST', body: payload }); }
  async function logout(){ return apiRequest('/api/auth/logout', { method: 'POST' }); }
  async function getMe(){ return apiRequest('/api/me', { method: 'GET' }); }
  async function listProducts(){ return apiRequest('/api/products', { method: 'GET' }); }
  async function submitApplication(payload){ return apiRequest('/api/applications', { method: 'POST', body: payload }); }
  async function listMyApplications(){ return apiRequest('/api/applications', { method: 'GET' }); }
  async function pay(payload){ return apiRequest('/api/pay/pay', { method: 'POST', body: payload }); }
  async function getLoans(){ return apiRequest('/api/loans', { method: 'GET' }); }
  async function getLoanPayments(loanId){ return apiRequest(`/api/pay/loan/${loanId}`, { method: 'GET' }); }

  // Documents API
  async function listMyDocuments(){ return apiRequest('/api/documents', { method: 'GET' }); }
  async function uploadDocument(formData){
    const url = (('/api/documents').startsWith('http') ? '/api/documents' : '/api/documents');
    const res = await fetch(API_BASE + '/api/documents', { method: 'POST', body: formData, credentials: 'include' });
    if(!res.ok){ const txt = await res.text().catch(()=>null); throw new Error(txt || 'Upload failed'); }
    return res.json();
  }

  // Admin helpers
  async function adminListApplications(opts = {}){
    const q = [];
    if(opts.q) q.push(`q=${encodeURIComponent(opts.q)}`);
    if(opts.status) q.push(`status=${encodeURIComponent(opts.status)}`);
    if(opts.page) q.push(`page=${encodeURIComponent(opts.page)}`);
    if(opts.pageSize) q.push(`pageSize=${encodeURIComponent(opts.pageSize)}`);
    const qs = q.length ? ('?' + q.join('&')) : '';
    return apiRequest(`/api/applications/admin${qs}`, { method: 'GET' });
  }
  async function adminApprove(appId, payload){ return apiRequest(`/api/applications/${appId}`, { method: 'PATCH', body: Object.assign({status:'approved'}, payload) }); }
  async function adminReject(appId, reason){ return apiRequest(`/api/applications/${appId}`, { method: 'PATCH', body: { status: 'rejected', note: reason } }); }

  // Client-side dashboard aggregator (best-effort, falls back if endpoints missing)
  async function getCustomerDashboard(){
    try{
      const me = await getMe();
      const loans = await getLoans();
      const activeLoans = (loans && loans.loans) ? loans.loans.filter(l=> l.status === 'active') : (loans && loans.rows) ? loans.rows : [];
      const outstanding_total = activeLoans.reduce((s,l)=> s + (parseFloat(l.outstanding_amount||0)), 0).toFixed(2);
      const next_emi_amount = (activeLoans[0] && activeLoans[0].monthly_emi) ? parseFloat(activeLoans[0].monthly_emi).toFixed(2) : '0.00';
      return { ok: true, data: { outstanding_total, next_emi_amount, active_loans_count: activeLoans.length, loans: activeLoans } };
    } catch(e){ return { ok: false, error: e.message || 'dashboard fetch failed' }; }
  }

  // Prefer server-side dashboard when available
  async function getCustomerDashboardServer(){ return apiRequest('/api/customer/dashboard', { method:'GET' }); }
  async function getAdminDashboard(){ return apiRequest('/api/admin/dashboard', { method:'GET' }); }

  window.api = {
    register, login, logout, getMe, listProducts, submitApplication, listMyApplications, pay,
    getLoans, getLoanPayments,
    adminListApplications, adminApprove, adminReject,
    getCustomerDashboard, getCustomerDashboardServer, getAdminDashboard,
    listMyDocuments, uploadDocument
  };

  // Success dialog helper: message, optional subtext, redirect after ms
  function showSuccessDialog(title, subtitle = '', redirect = null, ms = 1600) {
    const dlg = document.getElementById('successDialogOverlay');
    if(!dlg) {
      // Fallback to toast
      showToast(title, ms);
      if(redirect) setTimeout(()=> location.href = redirect, ms);
      return;
    }
    const t = dlg.querySelector('.success-title');
    const s = dlg.querySelector('.success-sub');
    t.textContent = title || '';
    s.textContent = subtitle || '';
    dlg.classList.add('open');
    // Auto-hide after ms and redirect
    setTimeout(()=>{
      dlg.classList.remove('open');
      if(redirect) location.href = redirect;
    }, ms);
  }

  window.showSuccessDialog = showSuccessDialog;

  // Session init: call /api/me and populate header names across pages
  async function initSession(){
    try{
      const me = await getMe();
      if(me && me.user){
        const name = me.user.first_name || me.user.email || '';
        document.querySelectorAll('#userName, #greetName, #adminName').forEach(el=>{ if(el) el.textContent = name; });
      }
    }catch(e){ /* ignore */ }
  }
  window.initSession = initSession;
  document.addEventListener('DOMContentLoaded', ()=>{ initSession().catch(()=>{}); });
})();
