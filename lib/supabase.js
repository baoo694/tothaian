// Supabase client with Auth and Realtime

const url = window.SUPABASE_URL || '';
const key = window.SUPABASE_ANON_KEY || '';
const enabled = !!(url && key && window.supabase);
const client = enabled ? window.supabase.createClient(url, key) : null;

// Realtime disabled by request; no channel subscriptions

export function isEnabled(){ return enabled; }
export function getClient(){ return client; }

// Auth
export async function signIn(email, password){
  if (!enabled) throw new Error('Supabase not configured');
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut(){
  if (!enabled) return;
  await client.auth.signOut();
}

export async function getSession(){
  if (!enabled) return null;
  const { data } = await client.auth.getSession();
  return data?.session;
}

// Data access
export async function syncFromBackend(){
  if (!enabled) {
    console.warn('Supabase not enabled - check configuration');
    return null;
  }
  try {
    const [movies, cinemas, rooms, showtimes, coupons, pricing, tickets, holds] = await Promise.all([
      selAll('movies'), selAll('cinemas'), selAll('rooms'), selAll('showtimes'),
      selAll('coupons'), selPricing(), selAll('tickets'), selActiveHolds()
    ]);
    return {
      movies: movies || [],
      cinemas: cinemas || [],
      rooms: rooms || [],
      showtimes: showtimes || [],
      coupons: coupons || [],
      pricing: pricing || { base:90000, vip:140000, couple:180000, wheel:90000 },
      tickets: tickets || [],
      holds: groupHoldsByShowtime(holds || [])
    };
  } catch (err) {
    console.error('syncFromBackend failed:', err);
    return null;
  }
}

function groupHoldsByShowtime(rows){
  const map = {};
  for (const r of rows){
    map[r.showtimeId] ||= {};
    map[r.showtimeId][r.seatId] = {
      sessionId: r.sessionId,
      expiresAt: new Date(r.expiresAt).getTime()
    };
  }
  return map;
}

// Convert snake_case to camelCase
function toCamel(obj){
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      const camelKey = k.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
      result[camelKey] = toCamel(v);
    }
    return result;
  }
  return obj;
}

// Convert camelCase to snake_case
function toSnake(obj){
  if (Array.isArray(obj)) return obj.map(toSnake);
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      const snakeKey = k.replace(/[A-Z]/g, l => '_' + l.toLowerCase());
      result[snakeKey] = toSnake(v);
    }
    return result;
  }
  return obj;
}

async function selAll(name){
  try {
    const { data, error } = await client.from(name).select('*');
    if (error) {
      console.warn(`Supabase select error [${name}]:`, error.message || error);
      return [];
    }
    return toCamel(data || []);
  } catch (err) {
    console.warn(`Supabase select failed [${name}]:`, err.message || err);
    return [];
  }
}

async function selPricing(){
  try {
    const { data, error } = await client.from('pricing').select('*');
    if (error) {
      console.warn('Supabase pricing error:', error.message || error);
      return { base:90000, vip:140000, couple:180000, wheel:90000 };
    }
    const map = { base:90000, vip:140000, couple:180000, wheel:90000 };
    if (data && Array.isArray(data)) {
      for (const r of data) map[r.type] = r.value;
    }
    return map;
  } catch (err) {
    console.warn('Supabase pricing failed:', err.message || err);
    return { base:90000, vip:140000, couple:180000, wheel:90000 };
  }
}

async function selActiveHolds(){
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await client.from('holds').select('*').gt('expires_at', nowIso);
    if (error) {
      console.warn('Supabase holds error:', error.message || error);
      return [];
    }
    return toCamel(data || []);
  } catch (err) {
    console.warn('Supabase holds failed:', err.message || err);
    return [];
  }
}

// Mutations
export async function upsertMovie(m){
  if (!enabled) return;
  const { error } = await client.from('movies').upsert(m);
  if (error) throw error;
}

export async function deleteMovie(id){
  if (!enabled) return;
  const { error } = await client.from('movies').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertCinema(c){
  if (!enabled) return;
  const { error } = await client.from('cinemas').upsert(c);
  if (error) throw error;
}

export async function deleteCinema(id){
  if (!enabled) return;
  const { error } = await client.from('cinemas').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertRoom(r){
  if (!enabled) return;
  const { error } = await client.from('rooms').upsert(toSnake(r));
  if (error) throw error;
}

export async function deleteRoom(id){
  if (!enabled) return;
  const { error } = await client.from('rooms').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertShowtime(s){
  if (!enabled) return;
  const { error } = await client.from('showtimes').upsert(toSnake(s));
  if (error) throw error;
}

export async function deleteShowtime(id){
  if (!enabled) return;
  const { error } = await client.from('showtimes').delete().eq('id', id);
  if (error) throw error;
}

export async function savePricing(p){
  if (!enabled) return;
  const rows = [
    {type:'base',value:p.base},
    {type:'vip',value:p.vip},
    {type:'couple',value:p.couple},
    {type:'wheel',value:p.wheel}
  ];
  await client.from('pricing').delete().neq('type','__none__');
  const { error } = await client.from('pricing').insert(rows);
  if (error) throw error;
}

export async function upsertCoupon(c){
  if (!enabled) return;
  const coupon = { ...c, code: c.code.toUpperCase() };
  const { error } = await client.from('coupons').upsert(toSnake(coupon));
  if (error) throw error;
}

export async function deleteCoupon(code){
  if (!enabled) return;
  const { error } = await client.from('coupons').delete().eq('code', code.toUpperCase());
  if (error) throw error;
}

export async function createHolds(holds){
  if (!enabled) return;
  const rows = holds.map(h=> ({
    ...h,
    expiresAt: new Date(h.expiresAt).toISOString()
  }));
  const { error } = await client.from('holds').upsert(toSnake(rows));
  if (error) throw error;
}

export async function releaseHold(showtimeId, seatId){
  if (!enabled) return;
  const { error } = await client.from('holds').delete()
    .eq('showtime_id', showtimeId)
    .eq('seat_id', seatId);
  if (error) throw error;
}

export { toSnake, toCamel };

export async function createTickets(tickets){
  if (!enabled) return;
  const rows = tickets.map(t=> ({
    ...t,
    purchasedAt: new Date(t.purchasedAt).toISOString()
  }));
  const { error } = await client.from('tickets').insert(toSnake(rows));
  if (error) throw error;
  // cleanup holds
  for (const t of tickets){
    for (const s of t.seats){
      await client.from('holds').delete()
        .eq('showtime_id', t.showtimeId)
        .eq('seat_id', s);
    }
  }
}

