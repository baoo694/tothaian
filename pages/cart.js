import { h, mount, now, money, fmtCountdown } from '../lib/utils.js';
import { store } from '../lib/store.js';
import { releaseHold, createTickets } from '../lib/supabase.js';
import { navigate } from '../lib/router.js';
import { seatTypeByRoom, seatPrice } from '../components/seat-map.js';
import { cryptoRandomId } from '../lib/utils.js';
import { groupBy } from '../lib/utils.js';

const HOLD_MS = 10 * 60 * 1000;

export function renderCart(){
  const wrap = h('div', { class:'page' });
  const cart = store.cart;
  const items = cart.items.filter(i=> !isHoldExpired(i));
  if (items.length !== cart.items.length) {
    cart.items = items;
    store.cart = cart;
  }

  if (!items.length) {
    mount(document.getElementById('app'), h('div', { class:'section' }, [
      h('h3', {}, ['Giỏ vé trống']),
      h('button', { class:'btn', 'data-route':'/showtimes' }, ['Chọn suất chiếu'])
    ]));
    return;
  }

  const table = h('table');
  const thead = h('thead');
  thead.append(h('tr', {}, [
    h('th', {}, ['Phim']), h('th', {}, ['Rạp/phòng']), h('th', {}, ['Suất']),
    h('th', {}, ['Ghế']), h('th', {}, ['Giá']), h('th', {}, ['Còn lại']), h('th', {}, [''])
  ]));
  table.append(thead);
  const tbody = h('tbody');
  let subtotal = 0;
  for (const it of items) {
    const st = store.showtimes.find(s=>s.id===it.showtimeId);
    const mv = store.movies.find(m=>m.id===(st?.movie_id||st?.movieId));
    const cn = store.cinemas.find(c=>c.id===(st?.cinema_id||st?.cinemaId));
    const rm = store.rooms.find(r=>r.id===(st?.room_id||st?.roomId));
    const type = seatTypeByRoom(rm, it.seatId);
    const price = seatPrice(type);
    subtotal += price;
    const remainingMs = Math.max(0, (store.holds[st.id]?.[it.seatId]?.expiresAt||0) - now());
    const tr = h('tr');
    tr.append(
      h('td', {}, [mv?.title || '']),
      h('td', {}, [`${cn?.name || ''} / ${rm?.name || ''}`]),
      h('td', {}, [`${st.date} ${st.time}`]),
      h('td', {}, [it.seatId]),
      h('td', {}, [money(price)]),
      h('td', { 'data-countdown': String(remainingMs) }, [fmtCountdown(remainingMs)]),
      h('td', {}, [ h('button', { class:'btn danger', onclick: ()=> removeItem(it.id) }, ['Xoá']) ])
    );
    tbody.append(tr);
  }
  table.append(tbody);

  const couponInput = h('input', { placeholder:'Mã giảm giá...', value: cart.coupon?.code || '' });
  const applyBtn = h('button', { class:'btn', onclick: ()=> applyCoupon(couponInput.value) }, ['Áp dụng']);
  const couponRow = h('div', { class:'controls' }, [couponInput, applyBtn]);

  let discount = 0; let applied = null;
  if (cart.coupon) {
    const c = store.coupons.find(x=> x.code.toUpperCase()===cart.coupon.code.toUpperCase());
    if (c) {
      const d = computeDiscount(c, subtotal);
      discount = d.amount;
      applied = c;
    }
  }
  const total = Math.max(0, subtotal - discount);
  const payBtn = h('button', { class:'btn primary', onclick: checkout }, ['Thanh toán']);

  wrap.append(h('section', { class:'section' }, [
    h('h3', {}, ['Giỏ vé']),
    table,
    couponRow,
    h('div', { class:'controls' }, [
      h('div', { class:'meta' }, [`Tạm tính: ${money(subtotal)}`]),
      h('div', { class:'meta' }, [`Giảm: ${money(discount)}${applied?` (${applied.code})`:''}`]),
      h('div', { class:'price' }, [`Tổng: ${money(total)}`]),
      payBtn
    ])
  ]));

  mount(document.getElementById('app'), wrap);
  startCountdowns();

  async function removeItem(id){
    const c = store.cart;
    const idx = c.items.findIndex(x=>x.id===id);
    if (idx>-1) {
      const it = c.items[idx];
      const holds = store.holds;
      if (holds[it.showtimeId]) delete holds[it.showtimeId][it.seatId];
      store.holds = holds;
      await releaseHold(it.showtimeId, it.seatId).catch(e => console.warn('Release hold failed', e));
      c.items.splice(idx,1);
      store.cart = c;
      renderCart();
    }
  }

  function applyCoupon(code){
    code = (code||'').trim();
    if (!code) {
      store.cart = { ...store.cart, coupon:null };
      renderCart();
      return;
    }
    const c = store.coupons.find(x=> x.code.toUpperCase()===code.toUpperCase());
    if (!c) { alert('Mã giảm giá không hợp lệ'); return; }
    const { amount, ok, reason } = computeDiscount(c, subtotal);
    if (!ok) { alert(reason||'Không áp dụng được'); return; }
    store.cart = { ...store.cart, coupon: { code: c.code } };
    renderCart();
  }

  async function checkout(){
    for (const it of store.cart.items) {
      const st = store.showtimes.find(s=>s.id===it.showtimeId);
      const sold = collectSoldSeats(st.id);
      const hold = store.holds[st.id]?.[it.seatId];
      if (sold[it.seatId]) { alert('Ghế đã bán: '+it.seatId); return; }
      if (!hold || hold.expiresAt<=now()) { alert('Hết thời gian giữ chỗ: '+it.seatId); return; }
    }
    const purchased = finalizePurchase(store.cart.items, total);
    await createTickets(purchased).catch(e => { console.warn('Create tickets failed', e); alert('Lỗi khi tạo vé'); return; });
    store.cart = { items:[], coupon:null };
    alert('Thanh toán thành công! Vé được lưu trong "Vé của tôi".');
    navigate('/tickets');
  }

  function isHoldExpired(cartItem){
    const { showtimeId, seatId } = cartItem;
    const hold = store.holds[showtimeId]?.[seatId];
    return !hold || hold.expiresAt <= now();
  }

  function collectSoldSeats(showtimeId){
    const tickets = store.tickets.filter(t=>(t.showtime_id||t.showtimeId)===showtimeId);
    const map = {};
    for (const t of tickets) for (const s of t.seats) map[s] = true;
    return map;
  }

  function computeDiscount(coupon, subtotal){
    const expired = coupon.expires_at && now()>new Date(coupon.expires_at).getTime();
    if (expired) return { ok:false, amount:0, reason:'Mã đã hết hạn' };
    const minTotal = coupon.min_total || 0;
    if (minTotal && subtotal<minTotal) return { ok:false, amount:0, reason:`Yêu cầu tối thiểu ${money(minTotal)}` };
    let amount = 0;
    if (coupon.type==='percent') amount = Math.floor(subtotal * (coupon.value/100));
    else amount = coupon.value;
    return { ok:true, amount: Math.min(amount, subtotal) };
  }

  function finalizePurchase(items, totalPaid){
    const groups = groupBy(items, it=>it.showtimeId);
    const tickets = [];
    for (const [showtimeId, arr] of Object.entries(groups)){
      const seatIds = arr.map(x=>x.seatId);
      const code = 'TKT-' + cryptoRandomId().slice(0,8).toUpperCase();
      const t = {
        id: cryptoRandomId(),
        code,
        showtimeId: showtimeId,
        seats: seatIds,
        purchasedAt: now(),
        ownerSession: store.sessionId,
        totalPaid: totalPaid
      };
      tickets.push(t);
    }
    const all = store.tickets;
    all.push(...tickets);
    store.tickets = all;
    const holds = store.holds;
    for (const t of tickets){
      for (const s of t.seats) {
        const stId = t.showtimeId || t.showtime_id;
        if (holds[stId]) delete holds[stId][s];
      }
    }
    store.holds = holds;
    return tickets;
  }

  function startCountdowns(){
    const nodes = document.querySelectorAll('[data-countdown]');
    if (!nodes.length) return;
    const timer = setInterval(()=>{
      let any = false;
      for (const n of nodes){
        const ms = Number(n.getAttribute('data-countdown')) - 1000;
        if (ms <= 0) { n.textContent = '00:00'; any = true; }
        else { n.setAttribute('data-countdown', String(ms)); n.textContent = fmtCountdown(ms); any = true; }
      }
      if (!any) clearInterval(timer);
    }, 1000);
  }
}

