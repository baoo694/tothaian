import { h, mount, money } from '../lib/utils.js';
import { store } from '../lib/store.js';
import { getSession } from '../lib/supabase.js';
import { navigate } from '../lib/router.js';

export async function renderTickets(){
  const sess = await getSession();
  if (!sess) { const next = encodeURIComponent('/tickets'); navigate(`/login?next=${next}`); return; }
  const wrap = h('div', { class:'page' });
  const email = (sess.user.email || '').toLowerCase();
  const my = store.tickets.filter(t=> {
    const ticketEmail = (t.user_email || t.userEmail || '').toLowerCase();
    if (ticketEmail) {
      return ticketEmail === email;
    }
    // fallback cho vé cũ chưa có email
    return (t.owner_session||t.ownerSession)===store.sessionId;
  });
  if (!my.length) {
    mount(document.getElementById('app'), h('div', { class:'section' }, [
      h('h3', {}, ['Vé của tôi']),
      h('div', { class:'meta' }, ['Chưa có vé.']),
      h('button', { class:'btn', 'data-route':'/catalog' }, ['Đặt vé ngay'])
    ]));
    return;
  }
  const list = h('div', { class:'grid' });
  for (const t of my) list.append(ticketCard(t));
  wrap.append(h('section', { class:'section' }, [ h('h3', {}, ['Vé của tôi']), list ]));
  mount(document.getElementById('app'), wrap);
}

function ticketCard(t){
  const stId = t.showtime_id || t.showtimeId;
  const st = store.showtimes.find(s=>s.id===stId);
  const mv = store.movies.find(m=>m.id===(st?.movie_id||st?.movieId));
  const cn = store.cinemas.find(c=>c.id===(st?.cinema_id||st?.cinemaId));
  const rm = store.rooms.find(r=>r.id===(st?.room_id||st?.roomId));
  const card = h('div', { class:'card' });
  const media = h('div', { class:'media', style:'display:flex; flex-direction:column; gap:12px; padding:16px; align-items:center; justify-content:center;' });
  
  // QR Code Container (qrcodejs will create canvas inside)
  const qrContainerId = `qr-${t.code}`;
  const qrContainer = h('div', { id: qrContainerId, style:'width:200px; height:200px; display:inline-block;' });
  media.append(qrContainer);
  
  const body = h('div', { class:'body' }, [
    h('div', { class:'meta', style:'font-weight:600; font-size:16px; margin-bottom:4px;' }, [`Mã vé: ${t.code}`]),
    h('div', { style:'font-size:15px; font-weight:500; margin-bottom:4px;' }, [mv?.title || '']),
    h('div', { class:'meta' }, [`${cn?.name || ''} / ${rm?.name || ''}`]),
    h('div', { class:'meta' }, [`${st?.date || ''} ${st?.time || ''}`]),
    h('div', { class:'meta', style:'margin-top:4px;' }, ['Ghế: ', (t.seats || []).join(', ')]),
    h('div', { class:'price', style:'margin-top:8px;' }, [money(t.total_paid || t.totalPaid || 0)])
  ]);
  card.append(media, body);
  
  // Generate codes after card is in DOM
  const qrData = `${t.code}|${stId || ''}|${(t.seats || []).join(',')}`;
  
  // Generate QR code using qrcodejs library
  const generateQR = () => {
    const containerEl = document.getElementById(qrContainerId);
    if (!containerEl) {
      setTimeout(generateQR, 100);
      return;
    }
    
    // qrcodejs uses constructor pattern: new QRCode(element, options)
    if (window.QRCode) {
      try {
        new window.QRCode(containerEl, {
          text: qrData,
          width: 200,
          height: 200,
          colorDark: '#000000',
          colorLight: '#FFFFFF',
          correctLevel: window.QRCode.CorrectLevel.M
        });
        console.log('QR code generated for:', t.code);
      } catch(e) {
        console.warn('QR code error:', e);
        // Fallback: create canvas and draw QR-like
        const canvas = h('canvas', { width:200, height:200 });
        containerEl.appendChild(canvas);
        drawQrLike(canvas, qrData);
      }
    } else {
      // Library not loaded yet
      setTimeout(generateQR, 200);
    }
  };
  
  // Wait for DOM then generate QR
  setTimeout(() => {
    generateQR();
  }, 200);
  
  return card;
}

function drawQrLike(canvasEl, text){
  if (!canvasEl) return;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return;
  const W = canvasEl.width, H = canvasEl.height;
  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,W,H);
  
  const hash = simpleHash(text);
  const cols = 25, rows = 25;
  const size = Math.min(Math.floor(W/cols), Math.floor(H/rows));
  const ox = Math.floor((W - cols*size)/2), oy = Math.floor((H - rows*size)/2);
  
  // Draw QR pattern
  ctx.fillStyle = '#000000';
  for (let y=0; y<rows; y++){
    for (let x=0; x<cols; x++){
      const bit = ((hash + (x*73856093) ^ (y*19349663)) >>> 0) & 1;
      if (bit) {
        ctx.fillRect(ox+x*size, oy+y*size, size, size);
      }
    }
  }
  
  // Finder patterns (3 corners)
  const finderSize = 7;
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 2;
  // Top-left
  ctx.strokeRect(ox+1*size, oy+1*size, finderSize*size, finderSize*size);
  ctx.fillRect(ox+2*size, oy+2*size, 5*size, 5*size);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(ox+3*size, oy+3*size, 3*size, 3*size);
  ctx.fillStyle = '#000000';
  // Top-right
  ctx.strokeRect(ox+(cols-8)*size, oy+1*size, finderSize*size, finderSize*size);
  ctx.fillRect(ox+(cols-7)*size, oy+2*size, 5*size, 5*size);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(ox+(cols-6)*size, oy+3*size, 3*size, 3*size);
  ctx.fillStyle = '#000000';
  // Bottom-left
  ctx.strokeRect(ox+1*size, oy+(rows-8)*size, finderSize*size, finderSize*size);
  ctx.fillRect(ox+2*size, oy+(rows-7)*size, 5*size, 5*size);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(ox+3*size, oy+(rows-6)*size, 3*size, 3*size);
}

function simpleHash(str){
  let h=2166136261>>>0;
  for (let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=(h*16777619)>>>0; }
  return h;
}

