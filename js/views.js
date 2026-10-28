/* ================= routing ================= */
var viewAs=null;let hwTask=null,curTeam=null;const FLOW=['intro','start','pending','newpass'];const BOARD_GAMES=['reaction','choice','gonogo','periph','tracking','sweeper','scenarios','juggle','feetcall','colortask','strobe'];
const homeOf=()=>({coach:'coach',manager:profile?.clubStatus==='pending'?'pending':'club',admin:viewAs?.mode==='player'?'home':curClub?'club':'sys'})[profile?.role]||'home';
function go(v){
  if(!$('#v-'+v))v='home';
  if(!profile&&!FLOW.includes(v))v=S.get('introSeen',false)?'start':'intro';
  if(v==='start'&&!profile&&!S.get('introSeen',false))v='intro';
  const tab=v;
  if(v==='home')v=homeOf();
  if(v==='order'&&!['manager','admin'].includes(profile?.role))v='home';
  if(v==='sys'&&profile?.role!=='admin')v='home';
  if(v==='club'&&!['manager','admin'].includes(profile?.role))v='home';
  $('.app').classList.toggle('flow',FLOW.includes(v));
  hush();
  ({hub:renderHub,account:renderAccount,club:renderClub,order:renderOrder,sys:renderSys,stats:renderStats,train:renderCatalog,home:renderHome,coach:renderCoach,field:()=>{renderField();enterField()},intro:renderIntro,start:renderReg,inbox:renderInbox,pending:renderPending})[v]?.();
  $$('.view').forEach(x=>x.classList.toggle('on',x.id==='v-'+v));
  $$('.tabs button').forEach(b=>{if(b.dataset.go===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  if(location.hash!=='#'+tab)history.replaceState(null,'','#'+tab);
  neuro.toggle(['home','train','hub','coach','club','sys','intro','start','pending'].includes(v));
  window.paintVa&&paintVa();
  $('#bellBtn').hidden=!(profile?.role==='player'&&profile?.teamId);
  window.scrollTo(0,0);
}
document.addEventListener('click',e=>{const sh=e.target.closest('[data-share]');if(sh){shareApp();return}
  const g=e.target.closest('[data-go]');if(g){go(g.dataset.go);return}
  const o=e.target.closest('[data-open]');if(o)openItem(o.dataset.open,o.dataset.lv)});
function openItem(id,lv){if(!CAT[id])return;if(CAT[id].field)go('field');else openIntro(id,lv)}
const toast=(t)=>{let el=$('#toast');if(!el){el=document.createElement('div');el.id='toast';el.className='toast';document.body.appendChild(el)}el.textContent=t;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),2200)};
const copyTxt=(t,btn)=>{try{navigator.clipboard.writeText(t).then(()=>toast('הועתק')).catch(()=>{})}catch(e){}};

/* ---------- neurons background ---------- */
const neuro=(()=>{const c=$('#neuro'),x=c.getContext('2d');let w,h,pts=[],on=false,raf=0;const d=devicePixelRatio||1,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function size(){w=c.width=c.clientWidth*d;h=c.height=c.clientHeight*d;const n=Math.round(Math.min(46,c.clientWidth/10));pts=Array.from({length:n},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.3*d,vy:(Math.random()-.5)*.3*d,p:Math.random()*6}))}
  function draw(t){x.clearRect(0,0,w,h);const L=120*d;for(const p of pts){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>w)p.vx*=-1;if(p.y<0||p.y>h)p.vy*=-1}
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const a=pts[i],b=pts[j],q=Math.hypot(a.x-b.x,a.y-b.y);if(q<L){x.strokeStyle=`rgba(190,110,255,${(1-q/L)*.4})`;x.lineWidth=d;x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke()}}
    for(const p of pts){const s=1.6+Math.sin(t/500+p.p)*.9;x.fillStyle='rgba(255,120,230,.9)';x.beginPath();x.arc(p.x,p.y,s*d,0,7);x.fill()}
    if(on&&!reduce)raf=requestAnimationFrame(draw)}
  addEventListener('resize',size);size();
  return{toggle(v){if(v===on)return;on=v;c.style.display=v?'block':'none';cancelAnimationFrame(raf);if(v){size();raf=requestAnimationFrame(draw)}}}})();

/* ---------- share & links ---------- */
function appUrl(){return location.href.split('#')[0].split('?')[0].replace(/app(\.html)?$/,'')}
const appLink=h=>appUrl()+'app#'+h;
async function shareApp(extra){const text=(extra?extra+'\n':'')+'אני מאמן את המוח שלי למשחק ב-BrainBall. מוזמנים להצטרף גם ולהתחיל להתאמן.';const url=appUrl();
  try{if(navigator.share){await navigator.share({title:'BrainBall',text,url});return}}catch(e){if(e&&e.name==='AbortError')return}
  $('#shText').textContent=text+' '+url;$('#shWa').href='https://wa.me/?text='+encodeURIComponent(text+' '+url);$('#shareSheet').hidden=false;
  $('#shCopy').onclick=()=>copyTxt(url)}
$('#shClose').onclick=()=>{$('#shareSheet').hidden=true};
$('#shareSheet').onclick=e=>{if(e.target.id==='shareSheet')$('#shareSheet').hidden=true};
$('#pSheet').onclick=e=>{if(e.target.id==='pSheet'||e.target.closest('[data-close]'))$('#pSheet').hidden=true};
const wa=(text,phone)=>`https://wa.me/${phone?waNum(phone):''}?text=${encodeURIComponent(text)}`;

/* ---------- intro slides ---------- */
const SLIDES=[
 {t:'המשחק מתחיל בראש',p:'BrainBall מאמן את מה שקורה לפני הנגיעה בכדור: לראות, להבין ולהחליט מהר.',img:true,m:G('#FF2BD6','#AA44FF')},
 {t:'כמה דקות ביום. ראש של מקצוען.',p:'תגובה, קשב וקבלת החלטות בתרגילים קצרים. אתה מול עצמך, ורואה את השיפור.',big:'bolt',m:G('#00E0FF','#AA44FF')},
 {t:'גם במגרש. גם מול המצלמה.',p:'מסך מגרש לכל הקבוצה, ומשחקים שהמצלמה רואה ומודדת בלי לגעת.',big:'ball',m:G('#FF7A1A','#FFE14D')}];
let slide=0;
function renderIntro(){const s=SLIDES[slide];$('#slT').textContent=s.t;$('#slP').textContent=s.p;$('#slImg').hidden=!s.img;$('#slBig').hidden=!!s.img;$('#slBig').innerHTML=s.big?I(s.big):'';$('#slArt').style.setProperty('--m',s.m);
  $$('#slDots i').forEach((d,i)=>d.classList.toggle('on',i===slide));$('#slNext').innerHTML=slide<SLIDES.length-1?'הבא <span class="ar">←</span>':'בוא נתחיל <span class="ar">←</span>'}
const endIntro=()=>{S.set('introSeen',true);go('start')};
$('#slNext').onclick=()=>{if(slide<SLIDES.length-1){slide++;renderIntro()}else endIntro()};
$('#slSkip').onclick=endIntro;

/* ================= player views ================= */
function lastOf(id){for(let i=hist.length-1;i>=0;i--)if(hist[i].id===id&&!hist[i].partial)return hist[i];return null}
function card(id,wide){const g=CAT[id],l=lastOf(id);
  return `<button class="gcard${wide?' wide':''}" style="--m:${g.m}" data-open="${id}"><span class="ico" aria-hidden="true">${I(g.ico)}</span>${g.cam?'<span class="tag">'+I('camera')+' מצלמה</span>':''}<small class="area-l">${AREAS[g.area]}</small><h3>${g.name}</h3><p>${g.desc}</p>${l?`<span class="last">${esc(l.disp)}</span>`:''}</button>`}
const hubCard=()=>`<button class="hubcard" data-go="hub"><span class="hc-ico">${I('play')}</span><span class="hc-t"><small>VIRTUAL TRAINING</small><b>מתחם אימונים וירטואלי</b><span>${['coach','manager','admin'].includes(profile?.role)?'אוסף סרטוני תרגילים. בונים תכנית ושולחים לשחקנים.':'סרטוני תרגילים מוכנים. בוחרים כמה, ובונים תכנית אימונים משלך.'}</span></span><span class="ar">←</span></button>`;
function renderCatalog(){const ids=visible();if(!ids.length){$('#catalog').innerHTML='<div class="empty">כל האימונים מוסתרים כרגע.</div>'+hubCard();return}
  let html='';const rest=[...ids];
  if(rest[0]&&CAT[rest[0]].field){const g=CAT[rest.shift()];html+=`<button class="gcard wide hero-card" style="--m:${g.m}" data-open="field"><span class="ico">${I(g.ico)}</span><span class="tag">מצב מגרש · לכל הקבוצה</span><h3>${g.name}</h3><p>שים את הטלפון או הטאבלט על חצובה. החלט מראש על פעולה לכל צבע, מספר או חץ, או צעק אותם תוך כדי התרגיל.</p><span class="cta">פתח מסך מגרש ←</span></button>`}
  html+=`<div class="games">${rest.map((id,i)=>card(id,rest.length%2&&i===rest.length-1)).join('')}</div>`+hubCard();$('#catalog').innerHTML=html}
const today=()=>new Date().toDateString();
function program(){return visible().filter(id=>!CAT[id].field&&!CAT[id].cam).slice(0,3)}
function taskRow(t){if(t.game==='plan'){const n=t.plan?.vids?.length||0;return `<button class="hwi${t.done?' done':''}" data-plan="${t.id}">${I('play')}<span><b>${esc(t.title||t.plan?.title||'תכנית אימונים')} · ${n} סרטונים</b>${t.note?`<small>${esc(t.note)}</small>`:''}${t.player_id?'<small class="pers">אישית בשבילך</small>':'<small>תכנית מהמאמן</small>'}</span><span class="ok">${t.done?'בוצע ✓':'לצפייה ←'}</span></button>`}
  const g=CAT[t.game];return `<button class="hwi${t.done?' done':''}" data-open="${t.game}" data-lv="${t.level||'beginner'}">${I(g?.ico||'bolt')}<span><b>${g?.name||t.game} · ${LV[t.level]||''}</b>${t.note?`<small>${esc(t.note)}</small>`:''}${t.player_id?'<small class="pers">אישית בשבילך</small>':''}</span><span class="ok">${t.done?'בוצע ✓':'לביצוע ←'}</span></button>`}
async function loadTasks(){if(!DB.ok()||!profile?.teamId)return[];try{const t=await DB.myTasks();window.TASKS=t;const open=t.filter(x=>!x.done).length;$('#bellN').textContent=open;$('#bellN').hidden=!open;return t}catch(e){return window.TASKS||[]}}
/* today's plan: what the coach asked for first, then the default three */
function todayPlan(tasks){const seen=new Set(),items=[],t0=new Date(new Date().toDateString());
  (tasks||[]).filter(x=>!x.done&&x.game!=='plan'&&CAT[x.game]&&!CAT[x.game].field&&(!x.due||new Date(x.due)>=t0)).forEach(x=>{if(!seen.has(x.game)&&items.length<4){seen.add(x.game);items.push({id:x.game,level:x.level,coach:true})}});
  program().forEach(id=>{if(items.length<3&&!seen.has(id)){seen.add(id);items.push({id})}});return items}
function paintPlan(tasks){const items=todayPlan(tasks),done=new Set(hist.filter(h=>!h.partial&&new Date(h.date).toDateString()===today()).map(h=>h.id)),n=items.filter(x=>done.has(x.id)).length,coach=items.filter(x=>x.coach).length;
  $('#ringArc').setAttribute('stroke-dasharray',`${264*n/Math.max(1,items.length)} 264`);$('#ringTxt').textContent=`${n}/${items.length}`;
  $('#planSub').textContent=coach?(coach===1?'המאמן ביקש תרגיל אחד. סוגרים אותו, וממשיכים.':`המאמן ביקש ${coach} תרגילים. סוגרים אותם, וממשיכים.`):'שלושה תרגילים קצרים. סוגרים את הטבעת.';
  $('#progList').innerHTML=items.map((x,i)=>`<button class="prog-item${done.has(x.id)?' done':''}" data-open="${x.id}"${x.level?` data-lv="${x.level}"`:''}><span class="n">${done.has(x.id)?'✓':i+1}</span><b>${CAT[x.id].name}</b><span>${x.coach?'מהמאמן':AREAS[CAT[x.id].area]}</span></button>`).join('');
  const next=items.find(x=>!done.has(x.id));
  $('#progGo').innerHTML=next?'לתרגיל הבא <span class="ar">←</span>':'סגרת את הטבעת להיום';$('#progGo').disabled=!next;$('#progGo').onclick=()=>next&&openItem(next.id,next.level)}
function renderHome(){
  $('#hello').textContent=profile?.name?`היי ${profile.name.split(' ')[0]}`:'היי';
  paintPlan(window.TASKS);
  $('#areas').innerHTML=['speed','decision','attention'].map(a=>{const h=[...hist].reverse().find(x=>!x.partial&&CAT[x.id]?.area===a);
    return `<div class="tile"><div class="v">${h?esc(h.disp):'-'}</div><div class="l">${AREAS[a]}${h?' · '+CAT[h.id].name:''}</div></div>`}).join('');
  const p=profile||{};$('#teamStrip').innerHTML=p.teamId?`<div class="team-strip">${p.clubLogo?`<img src="${p.clubLogo}" alt="">`:I('club')}<div><b>${esc(p.team||'הקבוצה')}</b><span class="note">${esc(p.club||'')}${p.share===false?' · התוצאות לא משותפות':' · התוצאות משותפות עם המאמן'}</span></div></div>`:'';
  $('#inboxPreview').innerHTML='';
  loadTasks().then(t=>{paintPlan(t);const open=t.filter(x=>!x.done).slice(0,2);if(!open.length)return;$('#inboxPreview').innerHTML=`<div class="sec">משימות מהמאמן <small><button class="link-btn" data-go="inbox">הכל</button></small></div><div class="hwlist">${open.map(taskRow).join('')}</div>`});
  const hb=$('#hwBanner');
  if(hwTask&&CAT[hwTask.id]&&!S.get('hwdone_'+hwTask.key,false)){hb.innerHTML=`<div class="hw"><div><b>משימה מהמאמן</b><div class="h-sub">${CAT[hwTask.id].name} · ${LV[hwTask.level]}</div></div><button class="btn btn-g" id="hwStart">יאללה</button></div>`;$('#hwStart').onclick=()=>openIntro(hwTask.id,hwTask.level)}else hb.innerHTML='';
}
async function renderInbox(){$('#inboxList').innerHTML='<div class="empty">טוען...</div>';const t=await loadTasks();
  $('#inboxList').innerHTML=t.length?t.map(taskRow).join(''):'<div class="empty">אין משימות כרגע.<br>כשהמאמן ישלח משימה, היא תופיע כאן.</div>'}
function spark(vals,lowerBetter){if(vals.length<2)return'';const w=300,h=64,p=8,mn=Math.min(...vals),mx=Math.max(...vals),r=mx-mn||1;
  const pts=vals.map((v,i)=>[p+i*(w-2*p)/(vals.length-1),lowerBetter?p+(v-mn)/r*(h-2*p):h-p-(v-mn)/r*(h-2*p)]);const line=pts.map(q=>q.join(',')).join(' '),last=pts[pts.length-1];
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="direction:ltr"><defs><linearGradient id="sg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#AA44FF" stop-opacity=".35"/><stop offset="1" stop-color="#AA44FF" stop-opacity="0"/></linearGradient></defs><polygon points="${p},${h} ${line} ${w-p},${h}" fill="url(#sg)"/><polyline points="${line}" fill="none" stroke="#00E0FF" stroke-width="2.5" vector-effect="non-scaling-stroke"/><circle cx="${last[0]}" cy="${last[1]}" r="4" fill="#00E0FF"/></svg>`}
function renderStats(){const wk=Date.now()-7*864e5,all=hist.filter(h=>CAT[h.id]),part=all.filter(h=>h.partial).length,min=Math.round(all.reduce((a,h)=>a+(h.dur||0),0)/60);
  $('#statSum').innerHTML=`<div class="areas"><div class="tile"><div class="v">${all.length}</div><div class="l">אימונים בסך הכל</div></div><div class="tile"><div class="v">${all.filter(h=>h.date>wk).length}</div><div class="l">השבוע</div></div><div class="tile"><div class="v">${min}</div><div class="l">דקות אימון</div></div></div>${part?`<p class="note">כולל ${part} אימונים שלא הושלמו.</p>`:''}`;
  const groups={};all.forEach(h=>{const k=h.id+'|'+h.level;(groups[k]=groups[k]||[]).push(h)});const keys=Object.keys(groups).sort((a,b)=>groups[b][groups[b].length-1].date-groups[a][groups[a].length-1].date);
  if(!keys.length){$('#histList').innerHTML='<div class="empty">עוד אין תוצאות.<br>אימון אחד, וזה מתחיל להתמלא.</div>';return}
  $('#histList').innerHTML=keys.map(k=>{const a=groups[k],full=a.filter(x=>!x.partial),l=full[full.length-1]||a[a.length-1],[id,lv]=k.split('|'),ln=CAT[id].lvNames?.[lv]||LV[lv]||'';
    return `<div class="hcard"><div class="hcard-h"><b>${CAT[id].name} · ${ln}</b><span class="note">${a.length} אימונים${a.length-full.length?` · ${a.length-full.length} חלקיים`:''}</span></div><div class="big">${esc(l.disp)}</div><div class="note">${esc(l.label)}</div>${l.src==='self_report'||full.length<2?'':spark(full.slice(-12).map(x=>x.primary),l.lowerBetter)}<div class="hrow"><span>אחרון: ${new Date(a[a.length-1].date).toLocaleDateString('he-IL')}</span><span>${l.src==='self_report'?'דיווח עצמי':l.src==='camera'?'מצלמה':'נמדד אוטומטית'}</span></div></div>`}).join('')}

/* ================= training order (manager: club, admin: everyone) ================= */
function renderOrder(){const c=catCfg();const admin=profile?.role==='admin';$('#admTitle').textContent=admin?'סדר האימונים · כל המערכת':'סדר האימונים במועדון';
  $('#admNote').textContent=admin?'השינויים חלים על כל השחקנים שלא שייכים למועדון עם סדר משלו.':'השינויים חלים על כל השחקנים והמאמנים במועדון.';
  $('#admList').innerHTML=c.order.map((id,i)=>{const g=CAT[id],off=c.hidden.includes(id);
    return `<div class="adm-row${off?' off':''}"><span class="dotc" style="background:${g.m.match(/#\w+/)[0]}">${I(g.ico)}</span><div><b>${g.name}</b><small>${AREAS[g.area]}${g.cam?' · מצלמה':''}</small></div>
    <div class="mv"><button data-up="${id}" aria-label="למעלה" ${i===0?'disabled':''}>${I('up')}</button><button data-dn="${id}" aria-label="למטה" ${i===c.order.length-1?'disabled':''}>${I('down')}</button></div>
    <button class="sw" role="switch" aria-checked="${!off}" aria-label="הצג ${g.name}" data-sw="${id}"></button></div>`}).join('')}
const pushOrder=c=>{S.set('catalog3',c);renderOrder();if(DB.ok())DB.saveCatalog(profile?.role==='admin'?null:profile?.clubId,c).catch(()=>{})};
$('#admList').onclick=e=>{const c=catCfg(),b=e.target.closest('button');if(!b)return;const id=b.dataset.up||b.dataset.dn||b.dataset.sw;if(!id)return;const i=c.order.indexOf(id);
  if(b.dataset.up&&i>0)[c.order[i-1],c.order[i]]=[c.order[i],c.order[i-1]];
  if(b.dataset.dn&&i<c.order.length-1)[c.order[i+1],c.order[i]]=[c.order[i],c.order[i+1]];
  if(b.dataset.sw)c.hidden=c.hidden.includes(id)?c.hidden.filter(x=>x!==id):[...c.hidden,id];pushOrder(c)};
$('#admReset').onclick=()=>pushOrder({order:DEFAULT_ORDER,hidden:[]});

/* ================= account ================= */
function renderAccount(){const p=profile||{};
  $('#accKv').innerHTML=[['שם',p.name],['אימייל',p.email],['טלפון',p.phone],['גיל',p.age],['תפקיד',ROLE[p.role]],['קבוצה',p.team],['מועדון',p.club]].filter(x=>x[1]).map(([a,b])=>`<dt>${a}</dt><dd>${esc(b)}</dd>`).join('');
  $('#accShareRow').hidden=!(p.role==='player'&&p.teamId);$('#accTeam').textContent=p.team?'הקבוצה: '+p.team:'';$('#accShare').setAttribute('aria-checked',String(p.share!==false));
  $('#accJoin').hidden=!(p.role==='player'&&!p.teamId&&DB.user);$('#accPassBox').hidden=!DB.user;$('#accDel').hidden=!DB.user;
  const hn={coach:'הקבוצה שלי',manager:'המועדון שלי',admin:'ניהול המערכת'}[p.role];$('#accHome').hidden=!hn;$('#accHome').textContent=hn||'';$('#accHome').onclick=()=>{curTeam=null;curClub=null;viewAs=null;go('home')};
  $('#accViewAs').hidden=!(p.role==='admin');
  const ob=S.get('outbox',[]).length;$('#accSync').textContent=!DB.ok()?'אין חיבור לשרת. הכל נשמר בטלפון.':DB.user?(ob?`${ob} אימונים מחכים לסנכרון.`:'הכל מסונכרן.'):'התוצאות נשמרות בטלפון שלך.'}
$('#accEdit').onclick=()=>go('start');
$('#accShare').onclick=()=>{profile.share=profile.share===false;S.set('profile2',profile);DB.setShare(profile.share).catch(()=>{});renderAccount()};
$('#accJoinBtn').onclick=async()=>{const c=$('#accCode').value.trim().toUpperCase();if(!c)return;try{await DB.joinTeam(c);toast('הצטרפת לקבוצה');DB.flush();renderAccount()}catch(e){$('#accErr').textContent=errText(e)}};
$('#accPassBtn').onclick=async()=>{const v=$('#accPass').value;if(v.length<6){$('#accPassErr').textContent='לפחות 6 תווים.';return}try{await DB.setPass(v);$('#accPass').value='';$('#accPassErr').textContent='';toast('הסיסמה עודכנה')}catch(e){$('#accPassErr').textContent=errText(e)}};
$('#accOut').onclick=async()=>{await DB.logout();profile=null;S.set('profile2',null);curTeam=null;curClub=null;go('start')};
$('#accDel').onclick=()=>{$('#pSheetBody').innerHTML=`<h2 style="font-size:24px">למחוק את החשבון?</h2><p class="st-sub" style="margin:0">החשבון, הפרטים וכל התוצאות שלך יימחקו מהשרת לתמיד. אי אפשר לבטל.</p><button class="btn btn-o full danger-btn" id="delYes">כן, למחוק לתמיד</button><button class="btn btn-g full" data-close>ביטול</button>`;$('#pSheet').hidden=false;
  $('#delYes').onclick=async()=>{try{await DB.deleteAccount();profile=null;hist=[];['profile2','hist','outbox'].forEach(k=>S.set(k,null));$('#pSheet').hidden=true;toast('החשבון נמחק');go('start')}catch(e){toast(errText(e))}}};
$('#avatar').onclick=()=>go('account');
