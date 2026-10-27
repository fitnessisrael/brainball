/* ================= boot ================= */
async function boot(){if(RECOVERY){await DB.init();openNewPass();return}const h=location.hash.slice(1),m=h.match(/^hw-([a-z]+)-(beginner|plus|pro)$/),inv=h.match(/^(join|coach|club)-([A-Z0-9]{4,8})$/i);
  paintIcons();
  if(inv){const role={join:'player',coach:'coach',club:'manager'}[inv[1]],code=inv[2].toUpperCase();S.set('pendingCode',code);S.set('pendingRole',role);history.replaceState(null,'','#start');
    if(profile&&role==='player'&&profile.role==='player'&&DB.ok()){try{await DB.init();if(DB.user){await DB.joinTeam(code);S.set('pendingCode','');toast('הצטרפת לקבוצה')}}catch(e){}}
    else if(profile){await DB.logout();profile=null;S.set('profile2',null)}}
  if(m&&CAT[m[1]]){hwTask={key:h,id:m[1],level:m[2]};S.set('hw',hwTask)}else hwTask=S.get('hw',null);
  if(profile)$('#avatar').textContent=(profile.name||'B').trim()[0]||'B';
  go(inv&&!profile?'start':m?'home':(location.hash.slice(1)||'home'));
  await DB.init();if(RECOVERY){openNewPass();return}
  if(DB.ok()&&profile&&profile.server&&!DB.user){profile=null;S.set('profile2',null);go('start');return}
  if(DB.user){DB.flush();loadCatalogCfg();const v=$('.view.on')?.id?.slice(2);if(v&&$('#play').hidden)go(v)}}
addEventListener('hashchange',()=>{const h=location.hash.slice(1);if(/^(hw|join|coach|club)-/.test(h))boot();else if($('#v-'+h)&&!$('#v-'+h).classList.contains('on'))go(h)});
boot();
