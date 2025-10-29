// Centralized data store
import { syncFromBackend, isEnabled } from './supabase.js';

const STORAGE_KEYS = {
  movies: 'cb_movies',
  cinemas: 'cb_cinemas',
  rooms: 'cb_rooms',
  showtimes: 'cb_showtimes',
  pricing: 'cb_pricing',
  coupons: 'cb_coupons',
  tickets: 'cb_tickets',
  holds: 'cb_holds',
  cart: 'cb_cart'
};

function load(k, d) {
  try {
    const v = JSON.parse(localStorage.getItem(k)||'null');
    return v ?? d;
  } catch {
    return d;
  }
}

function save(k, v) {
  localStorage.setItem(k, JSON.stringify(v));
}

function getSessionId() {
  const k = 'cb_session';
  let id = localStorage.getItem(k);
  if (!id) {
    // Will be imported dynamically when needed
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(k, id);
  }
  return id;
}

const sessionId = getSessionId();

export const store = {
  get movies(){ return load(STORAGE_KEYS.movies, []); },
  set movies(v){ save(STORAGE_KEYS.movies, v); },
  get cinemas(){ return load(STORAGE_KEYS.cinemas, []); },
  set cinemas(v){ save(STORAGE_KEYS.cinemas, v); },
  get rooms(){ return load(STORAGE_KEYS.rooms, []); },
  set rooms(v){ save(STORAGE_KEYS.rooms, v); },
  get showtimes(){ return load(STORAGE_KEYS.showtimes, []); },
  set showtimes(v){ save(STORAGE_KEYS.showtimes, v); },
  get pricing(){ return load(STORAGE_KEYS.pricing, { base:90000, vip:140000, couple:180000, wheel:90000 }); },
  set pricing(v){ save(STORAGE_KEYS.pricing, v); },
  get coupons(){ return load(STORAGE_KEYS.coupons, []); },
  set coupons(v){ save(STORAGE_KEYS.coupons, v); },
  get tickets(){ return load(STORAGE_KEYS.tickets, []); },
  set tickets(v){ save(STORAGE_KEYS.tickets, v); },
  get holds(){ return load(STORAGE_KEYS.holds, {}); },
  set holds(v){ save(STORAGE_KEYS.holds, v); },
  get cart(){ return load(STORAGE_KEYS.cart, { items:[], coupon:null }); },
  set cart(v){ save(STORAGE_KEYS.cart, v); },
  get sessionId(){ return sessionId; }
};

export async function loadData(){
  if (isEnabled()) {
    try {
      const data = await syncFromBackend();
      if (data) {
        store.movies = data.movies || [];
        store.cinemas = data.cinemas || [];
        store.rooms = data.rooms || [];
        store.showtimes = data.showtimes || [];
        store.coupons = data.coupons || [];
        store.pricing = data.pricing || { base:90000, vip:140000, couple:180000, wheel:90000 };
        store.tickets = data.tickets || [];
        store.holds = data.holds || {};
      } else {
        console.warn('No data returned from Supabase - app will use empty state');
      }
    } catch (e) {
      console.warn('Backend sync failed:', e.message || e);
    }
  } else {
    console.info('Supabase not configured - app running in local-only mode');
  }
}

// Realtime disabled: no event listeners

