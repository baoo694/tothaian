import { initRouter, register } from './lib/router.js';
import { loadData } from './lib/store.js';
import { renderHome } from './pages/home.js';
import { renderCatalog } from './pages/catalog.js';
import { renderShowtimes } from './pages/showtimes.js';
import { renderCart } from './pages/cart.js';
import { renderTickets } from './pages/tickets.js';
import { renderAdmin } from './pages/admin.js';
import { renderLogin } from './pages/login.js';

// Register routes
register('/', renderHome);
register('/catalog', renderCatalog);
register('/showtimes', renderShowtimes);
register('/cart', renderCart);
register('/tickets', renderTickets);
register('/admin', renderAdmin);
register('/login', renderLogin);

// Realtime disabled: no store:update handling

// Initialize app
async function init(){
  try {
    await loadData();
  } catch (e) {
    console.warn('Initial data load failed', e);
  }
  initRouter();
}

init();
