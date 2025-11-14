// ui.js — Shared UI helpers (ES module)

// ---------- Theme ----------
(function themeInit(){
  const saved = localStorage.getItem('theme');
  if(saved === 'light') document.documentElement.classList.remove('dark');
  else document.documentElement.classList.add('dark');
})();

export function toggleTheme(btn){
  const html = document.documentElement;
  html.classList.toggle('dark');
  const mode = html.classList.contains('dark') ? 'dark' : 'light';
  localStorage.setItem('theme', mode);
  if(btn) btn.textContent = mode === 'dark' ? '🌙' : '☀️';
}

export function syncThemeIcon(btn){
  const isDark = document.documentElement.classList.contains('dark');
  if(btn) btn.textContent = isDark ? '🌙' : '☀️';
}

// ---------- Password visibility ----------
export function wirePasswordToggle(inputId, btnId){
  const input = document.getElementById(inputId);
  const btn   = document.getElementById(btnId);
  if(!input || !btn) return;
  const eyeSVG = (opts = {}) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" ${opts.title?`aria-label="${opts.title}"`:'role="img"'}>
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>`;
  const eyeOffSVG = () => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M3 3l18 18" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M10.58 10.58A3 3 0 0113.42 13.42" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.5 12s3.5-6.5 9.5-6.5c1.8 0 3.3.5 4.7 1.3" />
    </svg>`;

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

// ---------- Mobile nav ----------
export function wireMobileNav(triggerId, menuId){
  const t = document.getElementById(triggerId);
  const m = document.getElementById(menuId);
  if(!t || !m) return;
  t.addEventListener('click', ()=> m.classList.toggle('hidden'));
}

// ---------- Active nav link ----------
export function markActive(pageKey){
  document.querySelectorAll('.nav-link').forEach(a=>{
    if(a.dataset.page === pageKey){
      a.classList.add('active-link');
      a.setAttribute('aria-current','page');
    }
  });
}

// ---------- Toast ----------
export function showToast(message, ms=2200){
  const t = document.getElementById('toast'); const m = document.getElementById('toastMsg');
  if(!t || !m) return;
  m.textContent = message; t.classList.remove('hidden');
  setTimeout(()=> t.classList.add('hidden'), ms);
}

// ---------- EMI Calculator ----------
function clampNum(v, min, max){ return Math.min(Math.max(v, min), max); }

function formatCurrency(num) {
  if (num <= 0 || isNaN(num)) return '₹ 0';
  if (num >= 10000000) return '₹' + (num/10000000).toFixed(2) + ' Cr';
  if (num >= 100000) return '₹' + (num/100000).toFixed(2) + ' L';
  return '₹' + num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function wireCalculator({amountId, rateId, monthsId, emiId, totalInterestId, totalPayableId}){
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

    // Clamp values to valid ranges
    if(p > 0) p = clampNum(p, 1000, 100000000);
    if(y > 0) y = clampNum(y, 0.1, 50);
    if(n > 0) n = clampNum(n, 1, 600);

    const j = y / 1200; // Monthly interest rate
    
    if(p > 0 && y > 0 && n > 0){
      try {
        // EMI formula: P * [r(1+r)^n] / [(1+r)^n - 1]
        const power = Math.pow(1 + j, n);
        const emi = (p * j * power) / (power - 1);
        const total = emi * n;
        const interest = total - p;
        
        EMIo.textContent = formatCurrency(emi);
        INT.textContent = formatCurrency(interest);
        TOT.textContent = formatCurrency(total);
        
        console.log('EMI Calculated:', {amount: p, rate: y, months: n, emi, interest, total});
      } catch(e) {
        console.error('Calculation error:', e);
        EMIo.textContent = '₹ 0';
        INT.textContent = '₹ 0';
        TOT.textContent = '₹ 0';
      }
    } else {
      EMIo.textContent = '₹ 0';
      INT.textContent = '₹ 0';
      TOT.textContent = '₹ 0';
    }
  }
  
  // Add event listeners with real-time calculation
  [A, R, M].forEach(input => {
    if(input) {
      input.addEventListener('input', calc);
      input.addEventListener('change', calc);
      input.addEventListener('keyup', calc);
    }
  });
  
  // Set default values
  A.value = '500000';
  R.value = '10.5';
  M.value = '36';
  
  // Initial calculation
  calc();
  
  console.log('Calculator initialized with default values');
}
