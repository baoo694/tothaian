import { h } from '../lib/utils.js';
import { navigate } from '../lib/router.js';

export function movieCard(m, opts={}){
  return h('div', { class:'card' }, [
    h('div', { class:'media' }, [
      m.poster ? h('img', { src:m.poster, alt:m.title, style:'width:100%;height:100%;object-fit:cover;' }) : 
      h('div', { style:'width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:48px;' }, ['🎬'])
    ]),
    h('div', { class:'body' }, [
      h('div', { class:'meta', style:'font-size:12px;text-transform:uppercase;letter-spacing:0.5px;opacity:0.8;' }, [m.genres?.join(' • ') || '']),
      h('div', { class:'title' }, [m.title]),
      h('div', { class:'controls', style:'display:flex;gap:8px;align-items:center;margin-top:12px;' }, [
        h('span', { class:`tag ${m.status==='now'?'now':''}` }, [m.status==='now'?'Đang chiếu':'Sắp chiếu']),
        opts.ctaLabel ? h('button', { class:'btn primary', style:'flex:1;', onclick: opts.onClick || (() => navigate(opts.route || `/showtimes?movieId=${m.id}`)) }, [opts.ctaLabel]) : null
      ])
    ])
  ]);
}

