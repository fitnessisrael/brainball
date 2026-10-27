/* ================= routing ================= */
let hwTask=null,curTeam=null;const FLOW=['intro','start','pending'];
const homeOf=()=>({coach:'coach',manager:profile?.clubStatus==='pending'?'pending':'club',admin:'sys'})[profile?.role]||'home';
function go(v){
  if(!$('#v-'+v))v='home';
  if(!profile&&!FLOW.includes(v))v=S.get('introSeen',false)?'start':'intro';
  if(v==='start'&&!profile&&!S.get('introSeen',false))v='intro';
  const tab=v;
  if(v==='home')v=homeOf();
  if(v==='order'&&!['manager','admin'].includes(profile?.role))v='home';
  if(v==='sys'&&profile?.role!=='admin')v='home';
  $('.app').classList.toggle('flow',FLOW.includes(v));
  hush();
  ({account:renderAccount,club:renderClub,order:renderOrder,sys:renderSys,stats:renderStats,train:renderCatalog,home:renderHome,coach:renderCoach,field:()=>{renderField();enterField()},intro:renderIntro,start:renderReg,inbox:renderInbox,pending:renderPending})[v]?.();
  $$('.view').forEach(x=>x.classList.toggle('on',x.id==='v-'+v));
  $$('.tabs button').forEach(b=>{if(b.dataset.go===tab)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
  if(location.hash!=='#'+tab)history.replaceState(null,'','#'+tab);
  neuro.toggle(['home','coach','club','sys','intro','start','pending'].includes(v));
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
async function shareApp(extra){const text=(extra?extra+'\n':'')+'אני מאמן את המוח שלי ב-BrainBall. תנסה לנצח אותי:';const url=appUrl();
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

/* ---------- registration & login ---------- */
let regRole='player',regMode='register',newClub=false,logoUrl='';
function regLayout(){const staff=regRole!=='player',login=regMode==='login';
  $('#rowRole').hidden=login||regRole==='admin';$('#rowName').hidden=login;$('#rowAgePos').hidden=staff||login;$('#rowTeam').hidden=staff||login||!!profile?.server;
  $('#rowCode').hidden=login||regRole==='admin'||(regRole==='manager'&&newClub)||(regRole==='player'&&!!profile?.teamId);
  $('#lCode').textContent=regRole==='coach'?'קוד מאמן (קיבלת ממנהל המועדון)':regRole==='manager'?'קוד מועדון (קיבלת ממנהל המערכת)':'קוד קבוצה (אם המאמן שלח לך)';
  $('#rowStaff').hidden=!staff&&!login;$('#rowNewClub').hidden=regRole!=='manager'||login;$('#newClubBox').hidden=!newClub;$('#dNoCode').textContent=newClub?'יש לי קוד מועדון':'אין לי קוד. אני רוצה לפתוח מועדון חדש';
  $('#rowTerms').hidden=login||!!profile?.server;
  $('#regTitle').textContent=login?'התחברות':regRole==='admin'?'כניסת מנהל מערכת':profile?'עריכת הפרטים':'נרשמים פעם אחת, מתאמנים תמיד';
  $('#regSub').textContent=login?'למאמנים, מנהלים ומנהל מערכת':regRole==='player'?'חינם. לוקח 20 שניות.':regRole==='coach'?'מאמן נרשם עם הקוד שקיבל ממנהל המועדון.':regRole==='manager'?'מנהל נרשם עם קוד מועדון, או מבקש לפתוח מועדון חדש.':'';
  $('#dLogin').textContent=login?'חזרה להרשמה':'כבר רשום כמאמן או מנהל? התחברות';
  $('#dSubmit').innerHTML=(login?'התחבר':profile?'שמור':regRole==='player'?'יאללה, לאימון':'צור חשבון')+' <span class="ar">←</span>';
  $$('#dRole button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.r===regRole))}
function renderReg(){const p=profile||{};$('#dName').value=p.name||'';$('#dAge').value=p.age||'';$('#dTeam').value=p.team||'';$('#dPos').value=p.pos||'';
  $('#dCode').value=S.get('pendingCode','')||'';$('#dTerms').checked=!!p.terms;$('#dErr').textContent='';
  const pr=S.get('pendingRole','');regRole=p.role||(pr&&pr!=='player'?pr:'player');if(regRole==='admin'&&!p.role)regRole='player';regMode='register';newClub=false;regLayout()}
$('#dRole').onclick=e=>{const b=e.target.closest('[data-r]');if(!b)return;regRole=b.dataset.r;newClub=false;regLayout()};
$('#saLink').onclick=()=>{regRole='admin';regMode='register';regLayout()};
$('#dLogin').onclick=()=>{regMode=regMode==='login'?'register':'login';regLayout()};
$('#dNoCode').onclick=()=>{newClub=!newClub;regLayout()};
$('#dLogo').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{logoUrl=await logoData(f);$('#dLogoTxt').textContent=f.name}catch(err){$('#dLogoTxt').textContent='התמונה לא נטענה'}};
$('#dForm').addEventListener('submit',async e=>{e.preventDefault();const err=$('#dErr'),btn=$('#dSubmit');err.textContent='';
  const v={name:$('#dName').value.trim(),age:+$('#dAge').value,team:$('#dTeam').value.trim(),pos:$('#dPos').value,code:$('#dCode').value.trim().toUpperCase(),email:$('#dEmail').value.trim(),pass:$('#dPass').value,terms:$('#dTerms').checked||!!profile?.server};
  const staff=regRole!=='player',login=regMode==='login';
  if(!login){
    if(!v.name){err.textContent='רגע, איך קוראים לך?';$('#dName').focus();return}
    if(!staff&&(!v.age||v.age<6||v.age>80)){err.textContent='צריך גיל בין 6 ל-80.';$('#dAge').focus();return}
    if(regRole==='coach'&&!v.code){err.textContent='צריך את קוד המאמן שקיבלת ממנהל המועדון.';$('#dCode').focus();return}
    if(regRole==='manager'&&!newClub&&!v.code){err.textContent='צריך קוד מועדון, או לבחור "פתיחת מועדון חדש".';return}
    if(regRole==='manager'&&newClub&&!$('#dClubName').value.trim()){err.textContent='מה שם המועדון?';$('#dClubName').focus();return}
    if(!v.terms){err.textContent='צריך לאשר את התנאים כדי להמשיך.';return}}
  if((staff||login)&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)){err.textContent='האימייל לא נראה תקין.';$('#dEmail').focus();return}
  if((staff||login)&&v.pass.length<6){err.textContent='סיסמה צריכה לפחות 6 תווים.';$('#dPass').focus();return}
  if(!DB.ok()){if(staff||login){err.textContent='אין חיבור לשרת כרגע. נסה שוב בעוד רגע.';return}
    profile={...(profile||{}),name:v.name,age:v.age,team:v.team,pos:v.pos,role:'player',terms:true};S.set('profile2',profile);afterAuth(true);return}
  btn.disabled=true;
  try{
    if(login){await DB.staffAuth(v.email,v.pass,false);const p=await DB.refresh();if(!p)throw new Error('לא מצאנו חשבון. הירשם קודם.')}
    else if(staff){await DB.staffAuth(v.email,v.pass,true);
      await DB.register({name:v.name,role:regRole==='admin'?'player':regRole,code:regRole==='admin'?null:(newClub?null:v.code),clubName:newClub?$('#dClubName').value.trim():null,logo:newClub?logoUrl:null})}
    else{await DB.ensureAnon();await DB.register({name:v.name,age:v.age,role:'player',code:v.code||null,position:v.pos||null});
      if(!profile.teamId&&v.team){profile.team=v.team;S.set('profile2',profile)}}
    S.set('pendingCode','');S.set('pendingRole','');DB.flush();afterAuth(true);
  }catch(ex){err.textContent=ex.message&&/[א-ת]/.test(ex.message)?ex.message:errText(ex)}finally{btn.disabled=false}});
function afterAuth(first){$('#avatar').textContent=(profile?.name||'B').trim()[0]||'B';loadCatalogCfg();
  if(profile?.role==='player')go(first?'train':'account');else go('home')}
async function loadCatalogCfg(){try{if(profile?.clubId&&DB.prof?.club?.catalog)return;const g=await DB.globalCatalog();if(g&&!(profile?.clubId&&DB.prof?.club?.catalog))S.set('catalog3',g)}catch(e){}}
function renderPending(){$('#pendTxt').textContent=`המועדון "${profile?.club||''}" מחכה לאישור מנהל המערכת. בינתיים אפשר להתאמן כרגיל.`}
$('#pendRefresh').onclick=async()=>{try{await DB.refresh();go('home')}catch(e){toast(errText(e))}};

/* ================= player views ================= */
function lastOf(id){for(let i=hist.length-1;i>=0;i--)if(hist[i].id===id&&!hist[i].partial)return hist[i];return null}
function card(id,wide){const g=CAT[id],l=lastOf(id);
  return `<button class="gcard${wide?' wide':''}" style="--m:${g.m}" data-open="${id}"><span class="ico" aria-hidden="true">${I(g.ico)}</span>${g.cam?'<span class="tag">'+I('camera')+' מצלמה</span>':''}<small class="area-l">${AREAS[g.area]}</small><h3>${g.name}</h3><p>${g.desc}</p>${l?`<span class="last">${esc(l.disp)}</span>`:''}</button>`}
function renderCatalog(){const ids=visible();if(!ids.length){$('#catalog').innerHTML='<div class="empty">כל האימונים מוסתרים כרגע.</div>';return}
  let html='';const rest=[...ids];
  if(rest[0]&&CAT[rest[0]].field){const g=CAT[rest.shift()];html+=`<button class="gcard wide hero-card" style="--m:${g.m}" data-open="field"><span class="ico">${I(g.ico)}</span><span class="tag">מצב מגרש · לכל הקבוצה</span><h3>${g.name}</h3><p>שים את הטלפון או הטאבלט על חצובה. החלט מראש על פעולה לכל צבע, מספר או חץ, או צעק אותם תוך כדי התרגיל.</p><span class="cta">פתח מסך מגרש ←</span></button>`}
  html+=`<div class="games">${rest.map((id,i)=>card(id,rest.length%2&&i===rest.length-1)).join('')}</div>`;$('#catalog').innerHTML=html}
const today=()=>new Date().toDateString();
function program(){return visible().filter(id=>!CAT[id].field&&!CAT[id].cam).slice(0,3)}
function taskRow(t){const g=CAT[t.game];return `<button class="hwi${t.done?' done':''}" data-open="${t.game}" data-lv="${t.level||'beginner'}">${I(g?.ico||'bolt')}<span><b>${g?.name||t.game} · ${LV[t.level]||''}</b>${t.note?`<small>${esc(t.note)}</small>`:''}${t.player_id?'<small class="pers">אישית בשבילך</small>':''}</span><span class="ok">${t.done?'בוצע ✓':'לביצוע ←'}</span></button>`}
async function loadTasks(){if(!DB.ok()||!profile?.teamId)return[];try{const t=await DB.myTasks();window.TASKS=t;const open=t.filter(x=>!x.done).length;$('#bellN').textContent=open;$('#bellN').hidden=!open;return t}catch(e){return window.TASKS||[]}}
function renderHome(){
  $('#hello').textContent=profile?.name?`היי ${profile.name.split(' ')[0]}`:'היי';
  const prog=program(),done=new Set(hist.filter(h=>!h.partial&&new Date(h.date).toDateString()===today()).map(h=>h.id)),n=prog.filter(id=>done.has(id)).length;
  $('#ringArc').setAttribute('stroke-dasharray',`${264*n/Math.max(1,prog.length)} 264`);$('#ringTxt').textContent=`${n}/${prog.length}`;
  $('#progList').innerHTML=prog.map((id,i)=>`<button class="prog-item${done.has(id)?' done':''}" data-open="${id}"><span class="n">${done.has(id)?'✓':i+1}</span><b>${CAT[id].name}</b><span>${AREAS[CAT[id].area]}</span></button>`).join('');
  const next=prog.find(id=>!done.has(id));
  $('#progGo').innerHTML=next?'לתרגיל הבא <span class="ar">←</span>':'סגרת את הטבעת להיום';$('#progGo').disabled=!next;$('#progGo').onclick=()=>next&&openItem(next);
  $('#areas').innerHTML=['speed','decision','attention'].map(a=>{const h=[...hist].reverse().find(x=>!x.partial&&CAT[x.id]?.area===a);
    return `<div class="tile"><div class="v">${h?esc(h.disp):'-'}</div><div class="l">${AREAS[a]}${h?' · '+CAT[h.id].name:''}</div></div>`}).join('');
  const p=profile||{};$('#teamStrip').innerHTML=p.teamId?`<div class="team-strip">${p.clubLogo?`<img src="${p.clubLogo}" alt="">`:I('club')}<div><b>${esc(p.team||'הקבוצה')}</b><span class="note">${esc(p.club||'')}${p.share===false?' · התוצאות לא משותפות':' · התוצאות משותפות עם המאמן'}</span></div></div>`:'';
  $('#inboxPreview').innerHTML='';
  loadTasks().then(t=>{const open=t.filter(x=>!x.done).slice(0,2);if(!open.length)return;$('#inboxPreview').innerHTML=`<div class="sec">משימות מהמאמן <small><button class="link-btn" data-go="inbox">הכל</button></small></div><div class="hwlist">${open.map(taskRow).join('')}</div>`});
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

/* ================= coach: one team board ================= */
const BOARD_GAMES=['reaction','choice','gonogo','periph','tracking','sweeper','scenarios','juggle','feetcall','colortask','strobe'];
const ago=d=>{if(!d)return'-';const s=(Date.now()-new Date(d))/1000;return s<3600?'עכשיו':s<86400?`לפני ${Math.round(s/3600)} ש'`:`לפני ${Math.round(s/86400)} ימים`};
async function renderCoach(){const p=profile||{};
  const t=curTeam||(p.teamId?{id:p.teamId,name:p.team,code:p.teamCode,coach_code:p.coachCode,club:p.club}:null);
  $('#coachBack').hidden=!(curTeam&&['manager','admin'].includes(p.role));$('#coachBack').onclick=()=>{curTeam=null;go('home')};
  $('#coachHello').textContent=t?.club||(p.name?`היי ${p.name.split(' ')[0]}`:'');$('#coachTitle').textContent=t?.name||'הקבוצה שלי';
  if(!t||!DB.ok()){$('#board').innerHTML='<tr><td class="empty">כדי לראות שחקנים צריך להירשם כמאמן עם קוד מהמנהל.</td></tr>';$('#tCode').textContent='------';return}
  $('#tCode').textContent=t.code;const link=appLink('join-'+t.code);
  $('#tWaAll').href=wa(`היי! מצטרפים לקבוצה "${t.name}" ב-BrainBall, אימון מוח לשחקני כדורגל.\nקוד הקבוצה: ${t.code}\nנרשמים כאן: ${link}`);
  $('#tCopy').onclick=()=>copyTxt(link);
  $('#hwGame').innerHTML=visible().filter(id=>!CAT[id].field).map(id=>`<option value="${id}">${CAT[id].name}</option>`).join('');
  $('#dashNote').textContent='טוען...';
  let rows=[];try{rows=await DB.board(t.id)}catch(e){$('#dashNote').textContent=errText(e)}
  const used=BOARD_GAMES.filter(g=>g==='reaction'||rows.some(r=>r.last?.[g]));
  $('#dashNote').textContent=`${rows.length} שחקנים · ${rows.filter(r=>r.sessions_7d>0).length} התאמנו השבוע`;
  $('#board').innerHTML=rows.length?`<thead><tr><th>שחקן</th><th>השבוע</th><th>אחרון</th><th>משימות</th>${used.map(g=>`<th>${CAT[g].name}</th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>`<tr data-p="${i}"><td><span class="av on">${esc((r.full_name||'?').trim()[0])}</span><b>${esc(r.full_name)}</b>${r.share?'':'<small class="note"> · פרטי</small>'}</td><td class="num">${r.sessions_7d}</td><td>${ago(r.last_at)}</td><td class="num">${r.tasks_done}</td>${used.map(g=>`<td class="num">${r.last?.[g]?esc(r.last[g].disp):'-'}</td>`).join('')}</tr>`).join('')}</tbody>`
    :`<tr><td class="empty">עוד אין שחקנים בקבוצה.<br>שלח את ההזמנה בוואטסאפ, הם נרשמים עם הקוד ומופיעים כאן.</td></tr>`;
  $('#board').onclick=e=>{const tr=e.target.closest('[data-p]');if(tr)playerSheet(rows[+tr.dataset.p],t)};
  $('#taskTo').innerHTML=`<option value="">כל הקבוצה</option>`+rows.map(r=>`<option value="${r.id}">${esc(r.full_name)}</option>`).join('');
  $('#taskSend').onclick=async()=>{const to=$('#taskTo').value||null;$('#taskErr').textContent='';
    try{await DB.addTask({team_id:t.id,player_id:to,game:$('#hwGame').value,level:$('#hwLevel').value,note:$('#taskNote').value.trim()||null});$('#taskNote').value='';toast('המשימה נשלחה');renderTasks(t)}catch(e){$('#taskErr').textContent=errText(e)}};
  renderTasks(t);renderRoster(t);paintIcons($('#v-coach'))}
async function renderTasks(t){const list=await DB.teamTasks(t.id).catch(()=>[]);
  $('#hwList').innerHTML=list.slice(0,8).map(h=>`<div class="hwi">${I(CAT[h.game]?.ico||'bolt')}<span><b>${CAT[h.game]?.name||h.game} · ${LV[h.level]||''}</b><small>${h.player_id?'אישית':'לכל הקבוצה'} · ${new Date(h.created_at).toLocaleDateString('he-IL')}${h.note?' · '+esc(h.note):''}</small></span><span class="mini-acts"><a href="${wa(`משימה חדשה ב-BrainBall: ${CAT[h.game]?.name}, רמת ${LV[h.level]}.${h.note?'\n'+h.note:''}\nפותחים כאן: ${appLink('home')}`)}" target="_blank" rel="noopener" aria-label="שלח בוואטסאפ">${I('chat')}</a><button data-deltask="${h.id}" aria-label="מחק">${I('trash')}</button></span></div>`).join('');
  $('#hwList').onclick=async e=>{const b=e.target.closest('[data-deltask]');if(!b)return;await DB.delTask(b.dataset.deltask);renderTasks(t)}}
async function renderRoster(t){const list=await DB.roster(t.id).catch(()=>[]);
  $('#rosterList').innerHTML=list.map(r=>`<div class="drow"><span class="av">${esc(r.name.trim()[0]||'?')}</span><div><b>${esc(r.name)}</b><small class="ltr">${esc(r.phone||'')}</small></div><span></span><div class="mini-acts"><a href="${wa(`היי ${r.name}! המאמן מזמין אותך ל-BrainBall.\nקוד הקבוצה: ${t.code}\nנרשמים כאן: ${appLink('join-'+t.code)}`,r.phone)}" target="_blank" rel="noopener" aria-label="שלח בוואטסאפ">${I('chat')}</a><button data-delr="${r.id}" aria-label="הסר">${I('trash')}</button></div></div>`).join('');
  $('#rosterList').onclick=async e=>{const b=e.target.closest('[data-delr]');if(!b)return;await DB.delRoster(b.dataset.delr);renderRoster(t)};
  $('#pAdd').onclick=async()=>{const n=$('#pName').value.trim(),ph=$('#pPhone').value.trim(),err=$('#pErr');
    if(!n){err.textContent='צריך שם.';return}if(waNum(ph).length<11){err.textContent='מספר טלפון לא תקין.';return}err.textContent='';
    try{await DB.addRoster(t.id,n,ph);$('#pName').value='';$('#pPhone').value='';renderRoster(t)}catch(e){err.textContent=errText(e)}}}
async function playerSheet(r,t){$('#pSheetBody').innerHTML=`<div class="sheet-h"><span class="av on">${esc(r.full_name.trim()[0])}</span><div><h2 style="font-size:24px">${esc(r.full_name)}</h2><span class="note">${r.age?`גיל ${r.age}`:''}${r.position?' · '+esc(r.position):''} · ${r.sessions_7d} אימונים השבוע</span></div><button class="icon-btn" data-close aria-label="סגור">✕</button></div><div class="hist" id="psList"><div class="empty">טוען...</div></div><button class="btn btn-g full" id="psTask"><span class="ic" data-i="send"></span>משימה אישית ל${esc(r.full_name.split(' ')[0])}</button>`;
  $('#pSheet').hidden=false;paintIcons($('#pSheet'));
  $('#psTask').onclick=()=>{$('#pSheet').hidden=true;$('#taskTo').value=r.id;$('#taskTo').scrollIntoView({behavior:'smooth',block:'center'})};
  const ss=r.share?await DB.playerSessions(r.id).catch(()=>[]):[];
  const g={};ss.forEach(s=>{(g[s.game]=g[s.game]||[]).push(s)});
  $('#psList').innerHTML=!r.share?'<div class="empty">השחקן בחר לא לשתף תוצאות.</div>':Object.keys(g).length?Object.entries(g).map(([id,a])=>{const full=a.filter(x=>!x.partial),l=full[0]||a[0];return `<div class="hcard"><div class="hcard-h"><b>${CAT[id]?.name||id}</b><span class="note">${a.length} אימונים</span></div><div class="big">${esc(l.disp||'')}</div>${full.length>1?spark(full.slice(0,12).reverse().map(x=>+x.score),CAT[id]?.lower):''}<div class="hrow"><span>${ago(a[0].created_at)}</span><span>${a.length-full.length?`${a.length-full.length} חלקיים`:''}</span></div></div>`}).join(''):'<div class="empty">עוד אין אימונים.</div>'}

/* ================= club manager ================= */
async function renderClub(){const p=profile||{};
  $('#clubHello').textContent='היי '+(p.name||'').split(' ')[0];$('#clubName').textContent=p.club||'המועדון שלי';
  $('#clubLogo').hidden=!p.clubLogo;if(p.clubLogo)$('#clubLogo').src=p.clubLogo;
  $('#clubPending').innerHTML=p.clubStatus==='pending'?'<div class="notice">המועדון מחכה לאישור מנהל המערכת.</div>':'';
  if(!p.clubId||!DB.ok()){$('#clubTeams').innerHTML='<div class="empty">צריך להתחבר כמנהל מועדון.</div>';return}
  $('#clubTeams').innerHTML='<div class="empty">טוען...</div>';
  const [teams,staff,players]=await Promise.all([DB.clubTeams(p.clubId),DB.clubStaff(p.clubId),DB.clubPlayers(p.clubId)]).catch(()=>[[],[],[]]);
  $('#clubTiles').innerHTML=`<div class="tile"><div class="v">${teams.length}</div><div class="l">מחלקות</div></div><div class="tile"><div class="v">${staff.filter(s=>s.role==='coach').length}</div><div class="l">מאמנים</div></div><div class="tile"><div class="v">${players.length}</div><div class="l">שחקנים</div></div>`;
  $('#clubTeams').innerHTML=teams.length?teams.map((t,i)=>teamCard(t,staff.find(s=>s.id===t.coach_id),players.filter(x=>x.team_id===t.id).length,i)).join(''):'<div class="empty">עוד אין מחלקות. הוסף את הראשונה למטה.</div>';
  $('#clubTeams').onclick=e=>{const b=e.target.closest('[data-board]');if(b){curTeam={...teams[+b.dataset.board],club:p.club};go('coach')}const c=e.target.closest('[data-copy]');if(c)copyTxt(c.dataset.copy)};
  $('#ctAdd').onclick=async()=>{const n=$('#ctName').value.trim();if(!n){$('#ctErr').textContent='מה שם המחלקה?';return}$('#ctErr').textContent='';
    try{await DB.createTeam(p.clubId,n);$('#ctName').value='';toast('המחלקה נוצרה');renderClub()}catch(e){$('#ctErr').textContent=errText(e)}}}
function teamCard(t,coach,n,i){const cl=appLink('coach-'+t.coach_code),pl=appLink('join-'+t.code);
  return `<div class="tcard"><div class="tcard-h"><div><b>${esc(t.name)}</b><small>${coach?'מאמן: '+esc(coach.full_name):'עוד אין מאמן'} · ${n} שחקנים</small></div><button class="btn btn-w sm" data-board="${i}">${I('table')} טבלה</button></div>
    <div class="codes"><div><span class="note">קוד מאמן</span><b class="mono">${t.coach_code}</b></div><div><span class="note">קוד שחקנים</span><b class="mono">${t.code}</b></div></div>
    <div class="row2">${coach?`<button class="btn btn-o sm" data-copy="${pl}">${I('copy')} קישור לשחקנים</button>`:`<a class="btn btn-g sm" href="${wa(`היי! אתה מוזמן לאמן את "${t.name}" ב-BrainBall.\nקוד מאמן: ${t.coach_code}\nנרשמים כאן: ${cl}`)}" target="_blank" rel="noopener">${I('chat')} הזמן מאמן</a>`}<a class="btn btn-o sm" href="${wa(`מצטרפים לקבוצה "${t.name}" ב-BrainBall.\nקוד הקבוצה: ${t.code}\nנרשמים כאן: ${pl}`)}" target="_blank" rel="noopener">${I('chat')} הזמן שחקנים</a></div></div>`}

/* ================= system admin ================= */
let scLogoUrl='';
$('#scLogo').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{scLogoUrl=await logoData(f);$('#scLogoTxt').textContent=f.name}catch(err){$('#scLogoTxt').textContent='התמונה לא נטענה'}};
async function renderSys(){if(!DB.ok())return;$('#sysClubs').innerHTML='<div class="empty">טוען...</div>';
  const clubs=await DB.clubs().catch(()=>[]);const pend=clubs.filter(c=>c.status==='pending');
  $('#sysTiles').innerHTML=`<div class="tile"><div class="v">${clubs.length}</div><div class="l">מועדונים</div></div><div class="tile"><div class="v">${clubs.filter(c=>c.status==='active').length}</div><div class="l">פעילים</div></div><div class="tile"><div class="v">${pend.length}</div><div class="l">מחכים לאישור</div></div>`;
  $('#sysNote').textContent=pend.length?`${pend.length} מחכים לאישור`:'';
  const ord=[...pend,...clubs.filter(c=>c.status!=='pending')];
  $('#sysClubs').innerHTML=ord.length?ord.map(c=>`<div class="tcard"><div class="tcard-h">${c.logo?`<img class="clogo" src="${c.logo}" alt="">`:`<span class="av">${esc(c.name[0])}</span>`}<div><b>${esc(c.name)}</b><small><span class="pill ${c.status}">${{active:'פעיל',pending:'מחכה לאישור',suspended:'מושהה'}[c.status]}</span> · ${c.manager_id?'יש מנהל':'אין מנהל עדיין'}</small></div></div>
    <div class="codes"><div><span class="note">קוד מנהל מועדון</span><b class="mono">${c.code}</b></div></div>
    <div class="row2">${c.status==='active'?`<button class="btn btn-o sm" data-st="${c.id}|suspended">השהה</button>`:`<button class="btn btn-g sm" data-st="${c.id}|active">${I('check')} אשר</button>`}<a class="btn btn-o sm" href="${wa(`שלום! המועדון "${c.name}" נפתח ב-BrainBall.\nקוד מנהל: ${c.code}\nנרשמים כאן כמנהל מועדון: ${appLink('club-'+c.code)}`)}" target="_blank" rel="noopener">${I('chat')} שלח למנהל</a></div>
    <button class="link-btn" data-teams="${c.id}">מחלקות וקודים</button><div class="teams" id="ct-${c.id}"></div></div>`).join(''):'<div class="empty">עוד אין מועדונים.</div>';
  $('#sysClubs').onclick=async e=>{const s=e.target.closest('[data-st]');if(s){const [id,st]=s.dataset.st.split('|');try{await DB.setClubStatus(id,st);toast('עודכן');renderSys()}catch(er){toast(errText(er))}return}
    const tb=e.target.closest('[data-teams]');if(tb){const box=$('#ct-'+tb.dataset.teams);if(box.innerHTML){box.innerHTML='';return}const ts=await DB.clubTeams(tb.dataset.teams);const club=clubs.find(c=>c.id===tb.dataset.teams);
      box.innerHTML=ts.map((t,i)=>teamCard(t,null,'-',i)).join('')||'<p class="note">אין מחלקות.</p>';box.onclick=ev=>{const b=ev.target.closest('[data-board]');if(b){ev.stopPropagation();curTeam={...ts[+b.dataset.board],club:club?.name};go('coach')}const c=ev.target.closest('[data-copy]');if(c)copyTxt(c.dataset.copy)}}}}
$('#scAdd').onclick=async()=>{const n=$('#scName').value.trim(),err=$('#scErr');if(!n){err.textContent='מה שם המועדון?';return}err.textContent='';
  try{await DB.createClub(n,scLogoUrl,$('#scTeams').value.split('\n').map(x=>x.trim()).filter(Boolean));$('#scName').value='';$('#scTeams').value='';scLogoUrl='';$('#scLogoTxt').textContent='בחר תמונה';toast('המועדון נוצר');renderSys()}catch(e){err.textContent=errText(e)}};

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
  $('#accKv').innerHTML=[['שם',p.name],['גיל',p.age],['תפקיד',ROLE[p.role]],['קבוצה',p.team],['מועדון',p.club]].filter(x=>x[1]).map(([a,b])=>`<dt>${a}</dt><dd>${esc(b)}</dd>`).join('');
  $('#accShareRow').hidden=!(p.role==='player'&&p.teamId);$('#accTeam').textContent=p.team?'הקבוצה: '+p.team:'';$('#accShare').setAttribute('aria-checked',String(p.share!==false));
  $('#accJoin').hidden=!(p.role==='player'&&!p.teamId&&DB.ok());
  const hn={coach:'הקבוצה שלי',manager:'המועדון שלי',admin:'ניהול המערכת'}[p.role];$('#accHome').hidden=!hn;$('#accHome').textContent=hn||'';$('#accHome').onclick=()=>go('home');
  const ob=S.get('outbox',[]).length;$('#accSync').textContent=!DB.ok()?'אין חיבור לשרת. הכל נשמר בטלפון.':p.server?(ob?`${ob} אימונים מחכים לסנכרון.`:'הכל מסונכרן עם השרת.'):'התוצאות נשמרות בטלפון שלך.'}
$('#accEdit').onclick=()=>go('start');
$('#accShare').onclick=()=>{profile.share=profile.share===false;S.set('profile2',profile);DB.setShare(profile.share).catch(()=>{});renderAccount()};
$('#accJoinBtn').onclick=async()=>{const c=$('#accCode').value.trim().toUpperCase();if(!c)return;try{await DB.joinTeam(c);toast('הצטרפת לקבוצה');DB.flush();renderAccount()}catch(e){$('#accErr').textContent=errText(e)}};
$('#accOut').onclick=async()=>{await DB.logout();profile=null;S.set('profile2',null);curTeam=null;go('start')};
$('#avatar').onclick=()=>go('account');
