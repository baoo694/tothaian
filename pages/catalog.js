import { h, mount, clear, groupBy } from '../lib/utils.js';
import { navigate } from '../lib/router.js';
import { movieCard } from '../components/movie-card.js';
import { store } from '../lib/store.js';

export function renderCatalog(params){
  const container = h('div', { class:'page' });
  const controls = h('div', { class:'controls' });
  const statusSel = h('select', { class:'control', id:'fltStatus' }, [
    h('option', { value:'' }, ['Tất cả']),
    h('option', { value:'now' }, ['Đang chiếu']),
    h('option', { value:'soon' }, ['Sắp chiếu'])
  ]);
  const genreSel = h('select', { class:'control', id:'fltGenre' }, [
    h('option', { value:'' }, ['Thể loại'])
  ]);
  const cinemaSel = h('select', { class:'control', id:'fltCinema' }, [
    h('option', { value:'' }, ['Rạp'])
  ]);
  const applyBtn = h('button', { class:'btn', onclick: apply }, ['Lọc']);
  controls.append(statusSel, genreSel, cinemaSel, applyBtn);
  const grid = h('div', { class:'grid', id:'catalogGrid' });

  // fill genres and cinemas
  const genres = Array.from(new Set(store.movies.flatMap(m=>m.genres || [])));
  genres.forEach(g=> genreSel.append(h('option', { value:g }, [g])));
  store.cinemas.forEach(c=> cinemaSel.append(h('option', { value:c.id }, [c.name])));

  function apply(){
    const st = statusSel.value;
    const g = genreSel.value;
    const cId = cinemaSel.value;
    let ms = store.movies.slice();
    if (st) ms = ms.filter(m=>m.status===st);
    if (g) ms = ms.filter(m=>(m.genres || []).includes(g));
    if (cId) {
      const movieIdsAtCinema = new Set(store.showtimes.filter(s=>s.cinema_id===cId).map(s=>s.movie_id));
      ms = ms.filter(m=>movieIdsAtCinema.has(m.id));
    }
    render(ms);
  }

  function render(list){
    clear(grid);
    if (!list.length) {
      grid.append(h('div', { class:'meta' }, ['Không có phim phù hợp.']));
      return;
    }
    grid.append(...list.map(m=> movieCard(m, { ctaLabel:'Đặt vé', onClick: ()=> navigate(`/showtimes?movieId=${m.id}`) })));
  }

  render(store.movies);

  container.append(
    h('section', { class:'section' }, [ h('h3', {}, ['Danh mục phim']), controls ]),
    grid
  );
  mount(document.getElementById('app'), container);
}

