import { h, mount, clear, qs, splitCsv, cryptoRandomId } from '../lib/utils.js';
import { store, loadData } from '../lib/store.js';
import { getSession, signOut } from '../lib/supabase.js';
import { navigate } from '../lib/router.js';
import {
  upsertMovie, deleteMovie, upsertCinema, deleteCinema,
  upsertRoom, deleteRoom, upsertShowtime, deleteShowtime,
  savePricing, upsertCoupon, deleteCoupon
} from '../lib/supabase.js';

export async function renderAdmin(params){
  const session = await getSession();
  if (!session) {
    navigate('/login');
    return;
  }

  const wrap = h('div', { class:'page' });
  wrap.append(h('section', { class:'section' }, [
    h('h3', {}, ['Quản trị']),
    h('div', { class:'controls' }, [
      h('span', { class:'meta' }, [`Đang đăng nhập: ${session.user.email}`]),
      h('button', { class:'btn', onclick: async ()=>{ await signOut(); navigate('/login'); } }, ['Đăng xuất'])
    ])
  ]));

  // Movies
  wrap.append(entitySection('Phim', store.movies, [
    field('Tiêu đề','title'),
    field('Thể loại (phân tách bởi dấu ,)','genres'),
    fileField('Poster ảnh','poster'),
    selectField('Trạng thái','status', [{v:'now',t:'Đang chiếu'},{v:'soon',t:'Sắp chiếu'}])
  ], async (vals)=>{
    const m = {
      id: cryptoRandomId(),
      title: vals.title,
      genres: splitCsv(vals.genres),
      status: vals.status||'now',
      duration_min: 100,
      poster: vals.poster || ''
    };
    await upsertMovie(m).catch(e => console.warn('Upsert movie failed', e));
    await loadData();
    renderAdmin();
  }, async (id)=>{
    await deleteMovie(id).catch(e => console.warn('Delete movie failed', e));
    await loadData();
    renderAdmin();
  }));

  // Cinemas
  wrap.append(entitySection('Rạp', store.cinemas, [
    field('Tên','name'),
    field('Địa chỉ','address')
  ], async (vals)=>{
    const c = { id: cryptoRandomId(), name: vals.name, address: vals.address };
    await upsertCinema(c).catch(e => console.warn('Upsert cinema failed', e));
    await loadData();
    renderAdmin();
  }, async (id)=>{
    await deleteCinema(id).catch(e => console.warn('Delete cinema failed', e));
    await loadData();
    renderAdmin();
  }));

  // Rooms
  wrap.append(entitySection('Phòng', store.rooms, [
    selectField('Rạp','cinemaId', store.cinemas.map(c=>({v:c.id,t:c.name}))),
    field('Tên phòng','name'),
    field('Số hàng','rows'),
    field('Số cột','cols'),
    field('Hàng VIP (CSV)','vipRows'),
    field('Hàng ghế đôi (CSV)','coupleRows'),
    field('Vị trí xe lăn (CSV, VD: A1,A2)','wheelSpots')
  ], async (vals)=>{
    const r = {
      id: cryptoRandomId(),
      cinemaId: vals.cinemaId,
      name: vals.name,
      rows: Number(vals.rows)||8,
      cols: Number(vals.cols)||12,
      vipRows: splitCsv(vals.vipRows),
      coupleRows: splitCsv(vals.coupleRows),
      wheelSpots: splitCsv(vals.wheelSpots)
    };
    await upsertRoom(r).catch(e => console.warn('Upsert room failed', e));
    await loadData();
    renderAdmin();
  }, async (id)=>{
    await deleteRoom(id).catch(e => console.warn('Delete room failed', e));
    await loadData();
    renderAdmin();
  }));

  // Showtimes
  wrap.append(entitySection('Suất chiếu', store.showtimes, [
    selectField('Phim','movieId', store.movies.map(m=>({v:m.id,t:m.title}))),
    selectField('Rạp','cinemaId', store.cinemas.map(c=>({v:c.id,t:c.name}))),
    selectField('Phòng','roomId', store.rooms.map(r=>({v:r.id,t:r.name}))),
    field('Ngày (YYYY-MM-DD)','date'),
    field('Giờ (HH:mm)','time')
  ], async (vals)=>{
    const s = {
      id: cryptoRandomId(),
      movieId: vals.movieId,
      cinemaId: vals.cinemaId,
      roomId: vals.roomId,
      date: vals.date,
      time: vals.time
    };
    await upsertShowtime(s).catch(e => console.warn('Upsert showtime failed', e));
    await loadData();
    renderAdmin();
  }, async (id)=>{
    await deleteShowtime(id).catch(e => console.warn('Delete showtime failed', e));
    await loadData();
    renderAdmin();
  }));

  // Pricing
  wrap.append((()=>{
    const p = store.pricing;
    const sec = h('section', { class:'section' }, [
      h('h3', {}, ['Giá ghế']),
      formGrid([
        inputRow('Thường', 'base', p.base),
        inputRow('VIP','vip', p.vip),
        inputRow('Đôi','couple', p.couple),
        inputRow('Xe lăn','wheel', p.wheel)
      ]),
      h('div', { class:'controls' }, [
        h('button', { class:'btn primary', onclick: async ()=>{
          const pricing = {
            base: Number(qs('[name=base]').value)||p.base,
            vip: Number(qs('[name=vip]').value)||p.vip,
            couple: Number(qs('[name=couple]').value)||p.couple,
            wheel: Number(qs('[name=wheel]').value)||p.wheel,
          };
          await savePricing(pricing).catch(e => console.warn('Save pricing failed', e));
          await loadData();
          alert('Đã lưu giá ghế');
          renderAdmin();
        } }, ['Lưu'])
      ])
    ]);
    return sec;
  })());

  // Coupons
  wrap.append(entitySection('Mã giảm giá', store.coupons, [
    field('Mã','code'),
    selectField('Loại','type',[{v:'percent',t:'% phần trăm'},{v:'amount',t:'Số tiền'}]),
    field('Giá trị','value'),
    field('Tối thiểu','minTotal')
  ], async (vals)=>{
    const c = {
      code: (vals.code||'').toUpperCase(),
      type: vals.type,
      value: Number(vals.value)||0,
      minTotal: Number(vals.minTotal)||0,
      expiresAt: null
    };
    await upsertCoupon(c).catch(e => console.warn('Upsert coupon failed', e));
    await loadData();
    renderAdmin();
  }, async (code)=>{
    await deleteCoupon(code).catch(e => console.warn('Delete coupon failed', e));
    await loadData();
    renderAdmin();
  }));

  mount(document.getElementById('app'), wrap);

  function inputRow(label, name, val){
    const row = h('div', { class:'row' });
    row.append(h('div', { class:'col-6' }, [
      h('label', {}, [label]),
      h('input', { name, type:'number', value: val })
    ]));
    return row;
  }

  function formGrid(children){
    const f = h('form');
    children.forEach(ch=> f.append(ch));
    return f;
  }
}

function field(label, name){ return { kind:'text', label, name }; }
function selectField(label, name, options){ return { kind:'select', label, name, options }; }
function fileField(label, name){ return { kind:'file', label, name }; }

function entitySection(title, items, fields, onCreate, onDelete){
  const sec = h('section', { class:'section' }, [ h('h3', {}, [title]) ]);
  const form = h('form', { class:'page' });
  const rows = h('div', { class:'row' });
  const inputs = {};
  for (const f of fields){
    const col = h('div', { class:'col-4' });
    col.append(h('label', {}, [f.label]));
    if (f.kind==='select') {
      const sel = h('select', { name:f.name });
      for (const o of f.options) sel.append(h('option', { value:o.v }, [o.t]));
      inputs[f.name] = sel;
      col.append(sel);
    } else if (f.kind==='file') {
      const fileInput = h('input', { 
        type: 'file', 
        name: f.name,
        accept: 'image/*',
        style: 'padding:6px;'
      });
      const preview = h('div', { 
        style: 'margin-top:8px;display:none;'
      });
      const previewImg = h('img', { 
        style: 'max-width:120px;max-height:160px;object-fit:contain;border-radius:6px;border:1px solid var(--border);'
      });
      preview.append(previewImg);
      
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          if (file.size > 5 * 1024 * 1024) { // 5MB limit
            alert('Ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 5MB.');
            e.target.value = '';
            preview.style.display = 'none';
            inputs[f.name]._dataUrl = null;
            return;
          }
          const reader = new FileReader();
          reader.onload = (event) => {
            previewImg.src = event.target.result;
            preview.style.display = 'block';
            inputs[f.name]._dataUrl = event.target.result;
          };
          reader.readAsDataURL(file);
        } else {
          preview.style.display = 'none';
          inputs[f.name]._dataUrl = null;
        }
      });
      
      inputs[f.name] = fileInput;
      inputs[f.name]._preview = preview;
      col.append(fileInput, preview);
    } else {
      const inp = h('input', { name: f.name });
      inputs[f.name] = inp;
      col.append(inp);
    }
    rows.append(col);
  }
  const actions = h('div', { class:'controls' }, [
    h('button', { class:'btn primary', onclick: async (e)=>{
      e.preventDefault();
      const vals = {};
      for (const [k,inp] of Object.entries(inputs)) {
        // Handle file inputs - use data URL if available
        if (inp.type === 'file' && inp._dataUrl) {
          vals[k] = inp._dataUrl;
        } else {
          vals[k] = inp.value;
        }
      }
      await onCreate(vals);
      // Reset form
      form.reset();
      // Clear previews
      for (const [k,inp] of Object.entries(inputs)) {
        if (inp.type === 'file' && inp._preview) {
          inp._preview.style.display = 'none';
          inp._dataUrl = null;
        }
      }
    } }, ['Thêm'])
  ]);
  form.append(rows, actions);

  const table = h('table');
  const thead = h('thead');
  const headRow = h('tr');
  for (const f of fields) headRow.append(h('th', {}, [f.name]));
  headRow.append(h('th', {}, ['']));
  thead.append(headRow);
  table.append(thead);
  const tbody = h('tbody');
  for (const it of items){
    const tr = h('tr');
    for (const f of fields){
      let v = it[f.name];
      // Try camelCase version if snake_case not found
      if (v === undefined) {
        const camelName = f.name.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
        v = it[camelName];
      }
      if (f.name==='poster' && typeof v === 'string' && v) {
        tr.append(h('td', {}, [
          h('img', { src:v, alt:'poster', style:'width:56px;height:80px;object-fit:cover;border-radius:6px;border:1px solid var(--border);' })
        ]));
      } else {
        tr.append(h('td', {}, [ Array.isArray(v)? v.join(', '): String(v??'') ]));
      }
    }
    // Get ID - try both camelCase and snake_case
    const idVal = it.id ?? it.code ?? it.movie_id ?? it.movieId ?? it.cinema_id ?? it.cinemaId ?? it.room_id ?? it.roomId ?? it.showtime_id ?? it.showtimeId;
    tr.append(h('td', {}, [
      h('button', { class:'btn danger', onclick: async (e)=>{
        e.preventDefault();
        if (!idVal) {
          console.error('No ID found for item:', it);
          alert('Không tìm thấy ID để xóa!');
          return;
        }
        if (!confirm('Bạn có chắc chắn muốn xóa?')) return;
        try {
          console.log('Deleting with ID:', idVal);
          await onDelete(idVal);
          console.log('Delete successful');
        } catch(err) {
          console.error('Delete error:', err);
          alert('Lỗi khi xóa: ' + (err.message || err));
        }
      } }, ['Xoá'])
    ]));
    tbody.append(tr);
  }
  table.append(tbody);

  sec.append(form, table);
  return sec;
}

