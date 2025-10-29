import { h, mount } from '../lib/utils.js';
import { signIn, getSession } from '../lib/supabase.js';
import { navigate } from '../lib/router.js';

export async function renderLogin(params){
  const session = await getSession();
  if (session) {
    navigate('/admin');
    return;
  }

  const wrap = h('div', { class:'page' });
  const form = h('form', { class:'section' }, [
    h('h3', {}, ['Đăng nhập Admin']),
    h('div', { class:'row' }, [
      h('div', { class:'col-12' }, [
        h('label', {}, ['Email']),
        h('input', { type:'email', id:'loginEmail', required: true, placeholder:'admin@example.com' })
      ])
    ]),
    h('div', { class:'row' }, [
      h('div', { class:'col-12' }, [
        h('label', {}, ['Mật khẩu']),
        h('input', { type:'password', id:'loginPassword', required: true, placeholder:'••••••••' })
      ])
    ]),
    h('div', { class:'controls' }, [
      h('button', { class:'btn primary', type:'submit' }, ['Đăng nhập'])
    ]),
    h('div', { id:'loginError', class:'danger-text', style:'display:none;margin-top:12px;' })
  ]);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    errorDiv.style.display = 'none';

    try {
      await signIn(email, password);
      navigate('/admin');
    } catch (err) {
      errorDiv.textContent = err.message || 'Đăng nhập thất bại';
      errorDiv.style.display = 'block';
    }
  });

  wrap.append(form);
  mount(document.getElementById('app'), wrap);
}

