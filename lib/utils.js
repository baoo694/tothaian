// Utilities
export function cryptoRandomId() {
  try {
    const arr = new Uint32Array(4);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(x=>x.toString(16).padStart(8,'0')).join('');
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export const now = () => Date.now();
export const fmt = new Intl.NumberFormat('vi-VN', { style:'currency', currency:'VND', maximumFractionDigits:0 });
export const money = v => fmt.format(v);

export const byId = id => document.getElementById(id);
export const el = id => document.getElementById(id);
export const qs = (sel, root=document) => root.querySelector(sel);
export const qsa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

// UI helpers
export function h(tag, attrs={}, children=[]) {
  const e = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs||{})) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c==null) continue;
    if (typeof c === 'string') e.appendChild(document.createTextNode(c));
    else e.appendChild(c);
  }
  return e;
}

export function clear(node){ while(node.firstChild) node.removeChild(node.firstChild); }
export function mount(node, elChild){ clear(node); node.appendChild(elChild); }

export function groupBy(arr, fn){
  return arr.reduce((acc, x)=>{ const k = fn(x); (acc[k] ||= []).push(x); return acc; }, {});
}

export function parseQuery(qs){
  const o = {}; if(!qs) return o;
  qs.split('&').forEach(p=>{ const [k,v] = p.split('='); o[decodeURIComponent(k)] = decodeURIComponent(v||''); });
  return o;
}

export function fmtCountdown(ms){
  const s = Math.max(0, Math.floor(ms/1000));
  const m = String(Math.floor(s/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  return `${m}:${ss}`;
}

export function splitCsv(s){ return (s||'').split(',').map(x=>x.trim()).filter(Boolean); }

