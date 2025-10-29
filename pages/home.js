import { h, mount } from '../lib/utils.js';
import { navigate } from '../lib/router.js';
import { movieCard } from '../components/movie-card.js';
import { store } from '../lib/store.js';

export function renderHome(){
  const wrap = h('div', { class:'page' }, [
    h('section', { class:'section' }, [
      h('h3', {}, ['Đặt vé xem phim trực tuyến']),
      h('p', { class:'meta' }, ['Tìm phim đang chiếu, chọn ghế, thanh toán và nhận vé điện tử.']),
      h('div', {}, [
        h('button', { class:'btn primary', 'data-route':'/catalog' }, ['Bắt đầu đặt vé'])
      ])
    ]),
    renderQuickNowPlaying()
  ]);
  mount(document.getElementById('app'), wrap);
}

function renderQuickNowPlaying(){
  const movies = store.movies.filter(m=>m.status==='now');
  const cards = movies.map(m=>movieCard(m, { ctaLabel:'Lịch chiếu', onClick: ()=> navigate(`/showtimes?movieId=${m.id}`) }));
  return h('section', { class:'section' }, [
    h('h3', {}, ['Đang chiếu']),
    h('div', { class:'grid' }, cards)
  ]);
}

