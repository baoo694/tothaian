import { h, now, money, clear, mount } from '../lib/utils.js';
import { store as dataStore } from '../lib/store.js';

export function seatTypeByRoom(room, seatId){
  const rowLabel = seatId[0]; // 'A', 'B', ...
  const rowIndex = (rowLabel.charCodeAt(0) - 64).toString(); // '1', '2', ...
  // Support both camelCase and snake_case field names
  const wheelSpots = room.wheelSpots || room.wheel_spots || [];
  const coupleRows = room.coupleRows || room.couple_rows || [];
  const vipRows = room.vipRows || room.vip_rows || [];
  if (wheelSpots.includes(seatId)) return 'wheel';
  // Accept either letter labels (e.g., 'A') OR numeric indices (e.g., '1') from DB
  if (coupleRows.includes(rowLabel) || coupleRows.includes(rowIndex)) return 'couple';
  if (vipRows.includes(rowLabel) || vipRows.includes(rowIndex)) return 'vip';
  return 'base';
}

export function seatPrice(type){
  const p = dataStore.pricing;
  return type==='vip'?p.vip: type==='couple'?p.couple: type==='wheel'?p.wheel: p.base;
}

export function renderSeatMap(showtimeId, movie, room, onSeatSelect, onAddToCart){
  const holds = dataStore.holds[showtimeId] || {};
  const soldSeats = collectSoldSeats(showtimeId);
  const selected = new Set();

  const container = h('div', { class:'content left' });
  const legend = h('div', { class:'controls', style:'display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin:4px 0 8px;' }, [
    h('div', { style:'display:flex; align-items:center; gap:6px;' }, [
      h('div', { style:'width:24px; height:20px; background:#1f2937; border:1px solid #4b5563; border-radius:4px;' }),
      h('span', { class:'meta' }, ['Thường'])
    ]),
    h('div', { style:'display:flex; align-items:center; gap:6px;' }, [
      h('div', { style:'width:24px; height:20px; background:linear-gradient(135deg, #fbbf24, #f59e0b); border:1px solid #d97706; border-radius:4px;' }),
      h('span', { class:'meta' }, ['VIP'])
    ]),
    h('div', { style:'display:flex; align-items:center; gap:6px;' }, [
      h('div', { style:'width:24px; height:20px; background:linear-gradient(135deg, #a78bfa, #8b5cf6); border:1px solid #7c3aed; border-radius:4px;' }),
      h('span', { class:'meta' }, ['Đôi'])
    ]),
    h('div', { style:'display:flex; align-items:center; gap:6px;' }, [
      h('div', { style:'width:24px; height:20px; background:linear-gradient(135deg, #60a5fa, #3b82f6); border:1px solid #2563eb; border-radius:4px;' }),
      h('span', { class:'meta' }, ['Xe lăn'])
    ]),
    h('div', { style:'display:flex; align-items:center; gap:6px;' }, [
      h('div', { style:'width:24px; height:20px; background:#451a03; border:2px dashed #f59e0b; border-radius:4px;' }),
      h('span', { class:'meta' }, ['Đang giữ'])
    ]),
    h('div', { style:'display:flex; align-items:center; gap:6px;' }, [
      h('div', { style:'width:24px; height:20px; background:#7f1d1d; border:1px solid #991b1b; border-radius:4px; position:relative; display:flex; align-items:center; justify-content:center;' }, [
        h('span', { style:'color:#dc2626; font-size:14px; font-weight:bold; line-height:1;' }, ['✕'])
      ]),
      h('span', { class:'meta' }, ['Đã bán'])
    ])
  ]);

  const mapWrap = h('div');
  const summary = h('div', { class:'section' });
  // expose for right column mount
  container.summary = summary;

  function renderMap(){
    clear(mapWrap);
    mapWrap.append(
      h('div', { class:'screen' }, ['Màn hình']),
      h('div', { class:'seats' }, buildRows())
    );
  }

  function buildRows(){
    const rows = [];
    const rowLabels = Array.from({length:room.rows}, (_,i)=> String.fromCharCode(65+i));
    for (const rLabel of rowLabels) {
      const row = h('div', { class:'row' });
      row.append(h('div', { class:'row-label' }, [rLabel]));
      for (let c=1; c<=room.cols; c++) {
        const seatId = `${rLabel}${c}`;
        const type = seatTypeByRoom(room, seatId);
        const btn = h('button', { class: 'seat ' + (type==='base'?'':type), title: seatId, 'aria-label': seatId }, [String(c)]);

        const isSold = !!soldSeats[seatId];
        const hold = holds[seatId];
        const isHeld = hold && hold.expiresAt>now() && hold.sessionId!==dataStore.sessionId;
        if (isSold) btn.classList.add('sold');
        if (isHeld) btn.classList.add('held');

        btn.addEventListener('click', ()=>{
          if (isSold || isHeld) return;
          const key = `${showtimeId}:${seatId}`;
          if (selected.has(key)) selected.delete(key); else selected.add(key);
          btn.classList.toggle('selected');
          updateSummary();
        });
        row.append(btn);
      }
      rows.push(row);
    }
    return rows;
  }

  function updateSummary(){
    const list = Array.from(selected).map(k=> k.split(':')[1]).sort();
    const items = list.map(seatId=> ({ seatId, type: seatTypeByRoom(room, seatId) }));
    const total = items.reduce((s,x)=> s + seatPrice(x.type), 0);
    const lines = items.map(x=> `${x.seatId} (${labelType(x.type)})`).join(', ');
    function labelType(t){ return t==='base'?'Thường': t==='vip'?'VIP': t==='couple'?'Đôi':'Xe lăn'; }
    mount(summary, h('div', {}, [
      h('div', {}, [`Ghế: ${lines||'-'}`]),
      h('div', { class:'price' }, [`Tạm tính: ${money(total)}`]),
      h('div', { class:'meta' }, ['Giữ chỗ trong 10 phút khi thêm vào giỏ.'])
    ]));
  }

  function collectSoldSeats(showtimeId){
    const tickets = dataStore.tickets.filter(t=>(t.showtime_id||t.showtimeId)===showtimeId);
    const map = {};
    for (const t of tickets) for (const s of t.seats) map[s] = true;
    return map;
  }

  renderMap();
  updateSummary();

  container.append(
    legend,
    mapWrap
  );

  return { container, selected, updateMap: renderMap, summary };
}

