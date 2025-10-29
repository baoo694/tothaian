import { h, clear, mount, now, money, cryptoRandomId } from '../lib/utils.js';
import { store } from '../lib/store.js';
import { createHolds } from '../lib/supabase.js';
import { navigate } from '../lib/router.js';
import { renderSeatMap, seatTypeByRoom, seatPrice } from './seat-map.js';

const HOLD_MS = 10 * 60 * 1000;

export function openSeatPicker(showtimeId){
  const st = store.showtimes.find(s=>s.id===showtimeId);
  if (!st) { alert('Không tìm thấy suất chiếu'); return; }
  const movie = store.movies.find(m=>m.id===(st.movie_id||st.movieId));
  const room = store.rooms.find(r=>r.id===(st.room_id||st.roomId));
  if (!movie || !room) { alert('Thiếu thông tin'); return; }

  const modal = h('div', { class:'modal' });
  const root = document.getElementById('modal-root');
  root.classList.add('active');
  root.setAttribute('aria-hidden', 'false');

  function close(){
    root.classList.remove('active');
    root.setAttribute('aria-hidden','true');
    clear(root);
  }

  const header = h('header', {}, [
    h('div', {}, [`${movie.title} — ${st.date} ${st.time} — ${room.name}`]),
    h('button', { class:'btn', onclick: close }, ['Đóng'])
  ]);

  const seatSec = h('div', { class:'content' });

  function addToCart(selectedKeys){
    if (!selectedKeys.length) return;
    const holds = [];
    const cartItems = [];
    for (const k of selectedKeys) {
      const seatId = k.split(':')[1];
      holds.push({ showtimeId, seatId, sessionId: store.sessionId, expiresAt: now() + HOLD_MS });
      cartItems.push({ id: cryptoRandomId(), showtimeId, seatId, addedAt: now() });
    }

    // Update local
    const holdSet = store.holds;
    holdSet[showtimeId] ||= {};
    for (const h of holds) {
      holdSet[showtimeId][h.seatId] = { sessionId: h.sessionId, expiresAt: h.expiresAt };
    }
    store.holds = holdSet;

    const cart = store.cart;
    cart.items.push(...cartItems);
    store.cart = cart;

    // Sync to backend
    createHolds(holds).catch(e => console.warn('Create holds failed', e));

    close();
    navigate('/cart');
  }

  const seatMap = renderSeatMap(showtimeId, movie, room, null, addToCart);

  // Scrollable area for screen + seats
  const scrollArea = h('div', { class:'scroll-area' });
  scrollArea.append(seatMap.container);

  // Bottom bar: summary + actions
  const bottom = h('div', { class:'bottom-bar' });
  const actions = h('div', { class:'controls' }, [
    h('button', { class:'btn', onclick: ()=>{ seatMap.selected.clear(); seatMap.updateMap(); } }, ['Bỏ chọn']),
    h('button', { class:'btn primary', onclick: ()=>{ addToCart(Array.from(seatMap.selected)); } }, ['Giữ chỗ & thêm vào giỏ'])
  ]);
  bottom.append(seatMap.summary || h('div'), actions);

  seatSec.append(scrollArea, bottom);
  

  modal.append(header, seatSec);
  clear(root);
  root.append(modal);
}

