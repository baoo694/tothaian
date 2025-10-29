import { parseQuery, mount, h } from './utils.js';

export const routes = {};

export function navigate(path){
  location.hash = '#' + path;
}

export function register(path, handler){
  routes[path] = handler;
}

export function handleRoute(){
  const path = location.hash.slice(1) || '/';
  const [base, query] = path.split('?');
  const fn = routes[base] || routes['/404'] || (() => mount(document.getElementById('app'), h('div', {class:'section'}, ['Không tìm thấy trang'])));
  fn(parseQuery(query||''));
}

export function initRouter(){
  window.addEventListener('hashchange', handleRoute);
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-route]');
    if (btn) {
      const path = btn.getAttribute('data-route');
      navigate(path);
    }
  });
  handleRoute();
}

