import { h, mount, clear, groupBy } from '../lib/utils.js';
import { store } from '../lib/store.js';
import { openSeatPicker } from '../components/seat-picker-modal.js';

export function renderShowtimes(params={}){
  const byMovieId = params.movieId || '';
  const byCinemaId = params.cinemaId || '';
  const wrap = h('div', { class:'page' });

  const modeSel = h('select', { class:'control', id:'modeSel' }, [
    h('option', { value:'byMovie' }, ['Theo phim']),
    h('option', { value:'byCinema' }, ['Theo rạp'])
  ]);
  const movieSel = h('select', { class:'control', id:'movieSel' }, [
    h('option', { value:'' }, ['Chọn phim'])
  ]);
  const cinemaSel = h('select', { class:'control', id:'cinemaSel' }, [
    h('option', { value:'' }, ['Chọn rạp'])
  ]);
  const dateSel = h('input', { class:'control', id:'dateSel', type:'date' });
  const list = h('div', { class:'section' });

  store.movies.forEach(m=> movieSel.append(h('option', { value:m.id, selected: m.id===byMovieId }, [m.title])));
  store.cinemas.forEach(c=> cinemaSel.append(h('option', { value:c.id, selected: c.id===byCinemaId }, [c.name])));
  const today = new Date().toISOString().slice(0,10);
  dateSel.value = today;

  function update(){
    clear(list);
    const mode = modeSel.value;
    const date = dateSel.value;
    if (mode==='byMovie') {
      const mId = movieSel.value;
      if (!mId) { list.append(h('div', { class:'meta' }, ['Chọn phim'])); return; }
      const sts = store.showtimes.filter(s=>(s.movie_id||s.movieId)===mId && (!date || s.date===date));
      if (!sts.length) { list.append(h('div', { class:'meta' }, ['Không có suất chiếu.'])); return; }
      const byCinema = groupBy(sts, s=>s.cinema_id||s.cinemaId);
      for (const [cid, arr] of Object.entries(byCinema)) {
        const c = store.cinemas.find(x=>x.id===cid);
        list.append(h('div', { class:'section' }, [
          h('h3', {}, [c?c.name:'Rạp']),
          h('div', { class:'controls' }, arr.map(st => h('button', { class:'btn', onclick: ()=> openSeatPicker(st.id) }, [`${st.date} ${st.time}`])))
        ]));
      }
    } else {
      const cId = cinemaSel.value;
      if (!cId) { list.append(h('div', { class:'meta' }, ['Chọn rạp'])); return; }
      const sts = store.showtimes.filter(s=>(s.cinema_id||s.cinemaId)===cId && (!date || s.date===date));
      if (!sts.length) { list.append(h('div', { class:'meta' }, ['Không có suất chiếu.'])); return; }
      const byMovie = groupBy(sts, s=>s.movie_id||s.movieId);
      for (const [mid, arr] of Object.entries(byMovie)) {
        const m = store.movies.find(x=>x.id===mid);
        list.append(h('div', { class:'section' }, [
          h('h3', {}, [m?m.title:'Phim']),
          h('div', { class:'controls' }, arr.map(st => h('button', { class:'btn', onclick: ()=> openSeatPicker(st.id) }, [`${st.date} ${st.time}`])))
        ]));
      }
    }
  }

  modeSel.addEventListener('change', update);
  movieSel.addEventListener('change', ()=>{ modeSel.value='byMovie'; update(); });
  cinemaSel.addEventListener('change', ()=>{ modeSel.value='byCinema'; update(); });
  dateSel.addEventListener('change', update);

  wrap.append(
    h('section', { class:'section' }, [
      h('h3', {}, ['Lịch chiếu']),
      h('div', { class:'controls' }, [modeSel, movieSel, cinemaSel, dateSel])
    ]),
    list
  );
  mount(document.getElementById('app'), wrap);
  update();
}

