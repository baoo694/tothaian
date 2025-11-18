import { initRouter, register } from './lib/router.js';
import { loadData } from './lib/store.js';
import { renderHome } from './pages/home.js';
import { renderCatalog } from './pages/catalog.js';
import { renderShowtimes } from './pages/showtimes.js';
import { renderCart } from './pages/cart.js';
import { renderTickets } from './pages/tickets.js';
import { renderAdmin } from './pages/admin.js';
import { renderLogin } from './pages/login.js';
import { renderSignup } from './pages/signup.js';
import { renderConfirm } from './pages/confirm.js';
import { renderProfile } from './pages/profile.js';
import { getSession, signOut, isAdmin } from './lib/supabase.js';

// Register routes
register('/', renderHome);
register('/catalog', renderCatalog);
register('/showtimes', renderShowtimes);
register('/cart', renderCart);
register('/tickets', renderTickets);
register('/admin', renderAdmin);
register('/login', renderLogin);
register('/signup', renderSignup);
register('/profile', renderProfile);
register('/confirm', renderConfirm);

// Realtime disabled: no store:update handling

// Initialize app
async function init(){
  try {
    await loadData();
  } catch (e) {
    console.warn('Initial data load failed', e);
  }
  await renderUserNav();
  initRouter();
}

init();

async function renderUserNav(){
  const container = document.getElementById('userNav');
  if (!container) return;
  const sess = await getSession();
  container.innerHTML = '';
  if (sess && sess.user) {
    const email = sess.user.email || 'Tài khoản';
    const pill = document.createElement('span');
    pill.className = 'user-pill';
    pill.textContent = email;
    // Admin link (only for admin)
    if (isAdmin(sess.user)) {
      const adminBtn = document.createElement('button');
      adminBtn.className = 'btn';
      adminBtn.textContent = 'Quản trị';
      adminBtn.addEventListener('click', ()=>{ location.hash = '#/admin'; });
      container.appendChild(adminBtn);
    }
    if (!isAdmin(sess.user)) {
      const profileBtn = document.createElement('button');
      profileBtn.className = 'btn';
      profileBtn.textContent = 'Hồ sơ';
      profileBtn.addEventListener('click', ()=>{ location.hash = '#/profile'; });
      container.appendChild(profileBtn);
    }
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = 'Đăng xuất';
    btn.addEventListener('click', async ()=>{ try { await signOut(); location.hash = '#/login'; await renderUserNav(); } catch(e){ console.warn('Sign out error', e); } });
    container.appendChild(pill);
    container.appendChild(btn);
  } else {
    const loginBtn = document.createElement('button');
    loginBtn.className = 'btn primary';
    loginBtn.textContent = 'Đăng nhập';
    loginBtn.addEventListener('click', ()=>{ location.hash = '#/login'; });
    container.appendChild(loginBtn);
  }
}

window.addEventListener('hashchange', ()=>{ renderUserNav(); });
