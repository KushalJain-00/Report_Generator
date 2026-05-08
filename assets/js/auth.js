// ── AUTO-SKIP AUTH IF ALREADY SIGNED IN ───────────────────────────
(function checkAutoRedirect() {
  try {
    if (localStorage.getItem('rig_signed_in') === 'true') {
      window.location.replace('index.html');
      return;
    }
  } catch(e) {}
  // Also check IndexedDB as fallback
  try {
    const req = indexedDB.open('rig_store', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('settings');
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction('settings', 'readonly');
        const getReq = tx.objectStore('settings').get('rig_signed_in');
        getReq.onsuccess = () => {
          if (getReq.result === true) window.location.replace('index.html');
        };
      } catch(e) {}
    };
  } catch(e) {}
})();

// ── ANIMATED BACKGROUND CANVAS ────────────────────────────────────
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');
let W, H, nodes = [], lines = [], animFrame;

function resize() {
  W = canvas.width  = window.innerWidth;
  H = canvas.height = window.innerHeight;
}

// Create floating nodes
function initNodes() {
  nodes = [];
  const count = Math.floor((W * H) / 18000);
  for (let i = 0; i < count; i++) {
    nodes.push({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.7 ? '#b8f241' : Math.random() > 0.5 ? '#41e8f2' : '#52527a',
    });
  }
}

function drawBg() {
  ctx.clearRect(0, 0, W, H);

  // draw connections
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 140) {
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        const alpha = (1 - dist / 140) * 0.12;
        ctx.strokeStyle = `rgba(184,242,65,${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  // draw nodes
  nodes.forEach(n => {
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fillStyle = n.color;
    ctx.globalAlpha = n.opacity;
    ctx.fill();
    ctx.globalAlpha = 1;

    // move
    n.x += n.vx;
    n.y += n.vy;
    if (n.x < 0 || n.x > W) n.vx *= -1;
    if (n.y < 0 || n.y > H) n.vy *= -1;
  });

  animFrame = requestAnimationFrame(drawBg);
}

// hexagon grid on left side
function drawHexGrid() {
  // done via CSS
}

window.addEventListener('resize', () => { resize(); initNodes(); });
resize();
initNodes();
drawBg();

// ── COUNTER ANIMATION ─────────────────────────────────────────────
function animCount(id, target, duration) {
  const el = document.getElementById(id);
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start = Math.min(start + step, target);
    el.textContent = Math.round(start);
    if (start >= target) clearInterval(timer);
  }, 16);
}

setTimeout(() => {
  animCount('t1', 27, 1200);
  animCount('t2', 5,  900);
  animCount('t3', 4,  800);
}, 600);

// ── TAB SWITCHING ─────────────────────────────────────────────────
let currentTab = 'signin';

function switchTab(tab) {
  if (tab === currentTab) return;
  currentTab = tab;

  const bar  = document.getElementById('tab-bar');
  const btnSI = document.getElementById('tab-signin');
  const btnSU = document.getElementById('tab-signup');
  const secSI = document.getElementById('sec-signin');
  const secSU = document.getElementById('sec-signup');

  if (tab === 'signup') {
    bar.classList.add('signup-active');
    btnSI.classList.remove('active');
    btnSU.classList.add('active');
    secSI.classList.remove('active');
    secSU.classList.add('active');
  } else {
    bar.classList.remove('signup-active');
    btnSU.classList.remove('active');
    btnSI.classList.add('active');
    secSU.classList.remove('active');
    secSI.classList.add('active');
  }
}

// ── PASSWORD TOGGLE ───────────────────────────────────────────────
function togglePw(id, btn) {
  const inp = document.getElementById(id);
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁'; }
}

// ── PASSWORD STRENGTH ─────────────────────────────────────────────
function checkStrength(val) {
  const box = document.getElementById('pw-strength');
  box.style.display = val.length ? 'flex' : 'none';

  let score = 0;
  if (val.length >= 8)  score++;
  if (val.length >= 12) score++;
  if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score = Math.min(score + 1, 4);

  const colors = ['#f24178','#f2c741','#41e8f2','#b8f241'];
  const labels = ['Weak','Fair','Good','Strong'];
  const fills  = [25, 50, 75, 100];

  for (let i = 1; i <= 4; i++) {
    const bar = document.getElementById(`pb${i}`);
    if (i <= score) {
      bar.style.width  = '100%';
      bar.style.background = colors[score - 1];
    } else {
      bar.style.width = '0%';
    }
  }
  document.getElementById('pw-label').textContent = labels[Math.max(score - 1, 0)];
  document.getElementById('pw-label').style.color  = colors[Math.max(score - 1, 0)];
}

// ── VALIDATION HELPERS ────────────────────────────────────────────
function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

function showErr(id, show) {
  document.getElementById(id).classList.toggle('visible', show);
}
function markInp(id, err) {
  document.getElementById(id).classList.toggle('err', err);
}

// ── SIGN IN ───────────────────────────────────────────────────────
function handleSignIn() {
  const email = document.getElementById('si-email').value.trim();
  const pass  = document.getElementById('si-pass').value;
  let valid = true;

  if (!isEmail(email)) { showErr('si-email-err', true); markInp('si-email', true); valid = false; }
  else { showErr('si-email-err', false); markInp('si-email', false); }

  if (!pass) { showErr('si-pass-err', true); markInp('si-pass', true); valid = false; }
  else { showErr('si-pass-err', false); markInp('si-pass', false); }

  if (!valid) return;

  // Simulate loading
  const btn = document.getElementById('btn-signin');
  btn.classList.add('loading');

  setTimeout(() => {
    btn.classList.remove('loading');
    showSuccess('Welcome back!', 'Redirecting to your workspace...');
  }, 1600);
}

// ── SIGN UP ───────────────────────────────────────────────────────
function handleSignUp() {
  const fname = document.getElementById('su-fname').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const pass  = document.getElementById('su-pass').value;
  const terms = document.getElementById('su-terms').checked;
  let valid = true;

  if (!fname) { showErr('su-fname-err', true); markInp('su-fname', true); valid = false; }
  else { showErr('su-fname-err', false); markInp('su-fname', false); }

  if (!isEmail(email)) { showErr('su-email-err', true); markInp('su-email', true); valid = false; }
  else { showErr('su-email-err', false); markInp('su-email', false); }

  if (pass.length < 8) { showErr('su-pass-err', true); markInp('su-pass', true); valid = false; }
  else { showErr('su-pass-err', false); markInp('su-pass', false); }

  if (!terms) {
    // shake the checkbox row
    const row = document.querySelector('.check-row');
    row.style.animation = 'errShake 0.3s';
    setTimeout(() => row.style.animation = '', 400);
    valid = false;
  }

  if (!valid) return;

  const btn = document.getElementById('btn-signup');
  btn.classList.add('loading');

  setTimeout(() => {
    btn.classList.remove('loading');
    showSuccess(`Welcome, ${fname}!`, 'Your account has been created.');
  }, 1800);
}

// ── SOCIAL AUTH ───────────────────────────────────────────────────
function socialAuth(provider) {
  showSuccess(`Connecting to ${provider}...`, 'Redirecting to authentication...');
}

// ── SUCCESS OVERLAY ───────────────────────────────────────────────
function showSuccess(title, sub) {
  document.getElementById('success-msg').textContent = title;
  document.getElementById('success-sub').textContent = sub;

  // Persist signed-in flag so user auto-skips auth next time
  try { localStorage.setItem('rig_signed_in', 'true'); } catch(e) {}
  try {
    const req = indexedDB.open('rig_store', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('settings');
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction('settings', 'readwrite');
        tx.objectStore('settings').put(true, 'rig_signed_in');
      } catch(e) {}
    };
  } catch(e) {}

  const overlay = document.getElementById('success-overlay');
  overlay.classList.add('show');

  // animate progress bar
  const fill = document.getElementById('redirect-fill');
  fill.style.transition = 'none';
  fill.style.width = '0%';
  requestAnimationFrame(() => {
    fill.style.transition = 'width 2s linear';
    fill.style.background = 'var(--lime)';
    fill.style.width = '100%';
  });

  // redirect after 2.2s
  setTimeout(() => {
    window.location.href = 'index.html';
  }, 2200);
}

// ── ENTER KEY SUPPORT ─────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (currentTab === 'signin') handleSignIn();
  else handleSignUp();
});

// ── MOUSE PARALLAX ON FORM CARD ───────────────────────────────────
const card = document.getElementById('form-card');
document.addEventListener('mousemove', e => {
  const rect = card.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top  + rect.height / 2;
  const dx = (e.clientX - cx) / window.innerWidth;
  const dy = (e.clientY - cy) / window.innerHeight;
  card.style.transform = `perspective(1200px) rotateY(${dx * 4}deg) rotateX(${-dy * 4}deg)`;
});
document.addEventListener('mouseleave', () => {
  card.style.transform = 'perspective(1200px) rotateY(0) rotateX(0)';
  card.style.transition = 'transform 0.6s ease';
});
card.addEventListener('mouseenter', () => {
  card.style.transition = 'transform 0.1s ease';
});