/* ================= virtual training hub: YouTube drills + system exercises -> plans -> homework ================= */
const ytId=u=>{u=String(u||'').trim();const m=u.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/);if(m)return m[1];return /^[A-Za-z0-9_-]{11}$/.test(u)?u:null};
const ytThumb=id=>`https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
let hubSel=[],hubVids=[],hubOwn=[],hubPlans=[],hubOpen=new Set(),hubCompose=false,hubTitle='',hubSaving=false;
const RUBS=[['drib','שיפור דריבל','הכדור צמוד לרגל. היריב נשאר מאחור.','#8a1a9c,#1a0720','#ff6be6'],['aware','שיפור פוקוס','עיניים חדות, ראש רגוע, ומגרש שנקרא מראש.','#0f6a73,#04181c','#5df0ff'],['react','שיפור זמן תגובה','שבריר שנייה שמכריע משחקים.','#123f9c,#050c24','#6cc8ff'],['warm','חימום הכנה למוח','עולים למגרש כשהראש כבר חם.','#5a1fa8,#12062a','#d7a0ff']];
const rubBtn=(r,open)=>`<button class="rub${open?' on':''}" data-rub="${r[0]}" aria-expanded="${!!open}" style="background:linear-gradient(90deg,${r[3].split(',')[1]} 30%,${r[3].split(',')[0]})"><img src="img/rub_${r[0]}.webp" alt=""><span class="rt"><b>${r[1]}</b></span></button>`;
tabs('hubTabs',t=>{if(t==='mine')renderMine();if(t==='edit')renderHubEdit();hubBar()});
/* whose list: a player/coach sees the list of his club (or the general one); the admin edits the list of the club he is inside, or the general one */
const hubClub=()=>profile?.role==='admin'?(curClub?.id||null):(profile?.clubId||null);
const hubCanEdit=()=>(profile?.role==='manager'&&!!profile.clubId)||(isAdmin()&&!(viewAs&&viewAs.mode==='player'));
const isStaff=()=>['coach','manager'].includes(profile?.role)||(isAdmin()&&!(viewAs&&viewAs.mode==='player'));
/* teams this person can send homework to */
async function sendTeams(){const r=profile?.role;
  if(r==='coach'&&profile.teamId)return[{id:profile.teamId,name:profile.team||'הקבוצה שלי'}];
  if(r==='manager'&&profile.clubId)return(await DB.clubTeams(profile.clubId).catch(()=>[])).map(t=>({id:t.id,name:t.name}));
  if(isAdmin()&&!(viewAs&&viewAs.mode==='player')){if(curTeam)return[{id:curTeam.id,name:curTeam.name}];if(curClub)return(await DB.clubTeams(curClub.id).catch(()=>[])).map(t=>({id:t.id,name:t.name}))}
  return[]}
const hubTopOff=new MutationObserver(()=>{if($('#pSheet').hidden){$('#pSheet').classList.remove('top');$('#pSheetBody').innerHTML=''}});hubTopOff.observe($('#pSheet'),{attributes:true,attributeFilter:['hidden']});
const showTop=()=>{$('#pSheet').classList.add('top');$('#pSheet').hidden=false};
const embed=(id,auto)=>`https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1${auto?'&autoplay=1':''}`;
const vplay=(id,title)=>{$('#pSheetBody').innerHTML=`<div class="sheet-h"><div><h2 style="font-size:20px">${esc(title||'')}</h2></div><button class="icon-btn" data-close aria-label="סגור">✕</button></div><div class="yt"><iframe src="${embed(id,true)}" title="${esc(title||'סרטון')}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;showTop()};
const vrow=(v,sel)=>`<div class="vrow${sel?' on':''}"><button class="vthumb" data-play="${v.yt}" data-ttl="${esc(v.title)}" aria-label="נגן ${esc(v.title)}"><img loading="lazy" src="${ytThumb(v.yt)}" alt=""><span>${I('play')}</span></button><div class="vt"><b>${esc(v.title)}</b></div>${sel===undefined?'':`<button class="vsel" role="checkbox" aria-checked="${!!sel}" data-pick="${v.id}" aria-label="הוסף לתכנית"></button>`}</div>`;
const exInfoHTML=id=>{const g=CAT[id];return `<div class="pinfo-box"><b>${g.name}</b><p>${esc(g.tagline||'')} ${esc(g.desc)}</p><ul>${(g.how||[]).slice(0,2).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><button class="btn btn-o sm" data-preview="${id}">${I('play')} צפה בתרגיל</button></div>`};

/* ---- the library tab ---- */
async function renderHub(){hubOpen=new Set();try{showTab('hubTabs','lib')}catch(e){}const edit=hubCanEdit();delete $('#hubBar').dataset.built;
  $('#hubTabs [data-t="edit"]').hidden=!edit;
  $('#hubSub').textContent=isStaff()?'בוחרים סרטונים ותרגילים, נותנים שם לתכנית, שומרים ושולחים.':'בוחרים סרטונים ותרגילים, נותנים שם לתכנית, ומתאמנים לפי התכנית שלך.';
  if(!DB.ok()){$('#hubList').innerHTML='<div class="empty">צריך חיבור לאינטרנט.</div>';return}
  $('#hubList').innerHTML='<div class="empty">טוען סרטונים...</div>';hubBar();
  try{hubVids=await DB.videoList(hubClub())}catch(e){hubVids=[]}
  try{hubMap=await DB.hubCats()}catch(e){}
  hubSel=hubSel.filter(x=>x.k==='g'||hubVids.some(v=>v.id===x.id));paintHub()}
const hubHas=(k,id)=>hubSel.some(x=>x.k===k&&x.id===id);
const DEFCAT={field:['drib'],juggle:['drib'],feetcall:['drib'],tracking:['aware'],sweeper:['aware'],periph:['aware'],breath:['aware','warm'],reaction:['react'],colortask:['react'],strobe:['react'],choice:['react'],gonogo:['react'],warmup:['warm'],scenarios:['warm']};
let hubMap=null;const gameCats=id=>(hubMap&&hubMap[id])||DEFCAT[id]||[];
const canAssign=()=>isAdmin()&&!(viewAs&&viewAs.mode==='player');
function catBody(c){const vis=visible().filter(id=>CAT[id]&&gameCats(id).includes(c)),vs=hubVids.filter(v=>v.cat===c);
  return `<div class="catbody">${vs.length?`<div class="vlist">${vs.map(v=>vrow(v,hubCompose?hubHas('v',v.id):undefined)).join('')}</div>`:''}
    ${vis.length?`<div class="pickgrid">${vis.map(id=>`<button class="pick" data-gpick="${id}" aria-pressed="${hubHas('g',id)}">${I(CAT[id].ico)}<span>${CAT[id].name}</span></button>`).join('')}</div>`:'<div class="empty">עוד אין אימונים בקטגוריה הזאת.</div>'}
    ${canAssign()?`<details class="assignbox"><summary>שיוך אימונים לקטגוריה (מנהל על)</summary><div class="assign">${visible().filter(id=>CAT[id]).map(id=>`<button class="chip" data-assign="${id}" data-cat="${c}" aria-pressed="${gameCats(id).includes(c)}">${CAT[id].name}</button>`).join('')}</div></details>`:''}</div>`}
function paintHub(){
  const top=hubCompose?`<div class="box compose"><div class="field-row"><span>שם האימון</span><input type="text" id="cpTitle" placeholder="לדוגמה: חימום לפני משחק" maxlength="60" value="${esc(hubTitle)}"></div><p class="note">בחר למטה אימונים מהקטגוריות, ואפשר להמשיך לקטגוריה הבאה ולצרף עוד.</p><button class="link-btn" id="cpOff">ביטול</button></div>`:`<button class="btn btn-g full" id="cpOn" style="margin-bottom:14px">הרכב את האימונים המועדפים מהקטגוריות</button>`;
  $('#hubList').innerHTML=`${top}<div class="rubs">${RUBS.map(r=>rubBtn(r,hubOpen.has(r[0]))+(hubOpen.has(r[0])?catBody(r[0]):'')).join('')}</div>`;
  paintIcons($('#v-hub'));hubBar()}
$('#hubList').oninput=e=>{if(e.target.id==='cpTitle')hubTitle=e.target.value};
$('#hubList').onclick=async e=>{const as=e.target.closest('[data-assign]');if(as){const id=as.dataset.assign,c=as.dataset.cat,cur=gameCats(id),nx=cur.includes(c)?cur.filter(x=>x!==c):[...cur,c];const nm={...(hubMap||{}),[id]:nx};try{await DB.setHubCats(nm);hubMap=nm;paintHub();toast('השיוך נשמר')}catch(er){toast(errText(er))}return}if(e.target.closest('#cpOn')){hubCompose=true;paintHub();setTimeout(()=>$('#cpTitle')?.focus(),50);return}if(e.target.closest('#cpOff')){hubCompose=false;hubSel=[];hubTitle='';paintHub();return}const rb=e.target.closest('[data-rub]');if(rb){const c=rb.dataset.rub;hubOpen.has(c)?hubOpen.delete(c):hubOpen.add(c);paintHub();return}const p=e.target.closest('[data-play]');if(p){vplay(p.dataset.play,p.dataset.ttl);return}
  const pv=e.target.closest('[data-preview]');if(pv){openIntro(pv.dataset.preview);return}
  const gi=e.target.closest('[data-ginfo]');if(gi){const id=gi.dataset.ginfo,box=$('#hubInfo');box.innerHTML=box.dataset.id===id?'':exInfoHTML(id);box.dataset.id=box.dataset.id===id?'':id;paintIcons(box);return}
  const gp=e.target.closest('[data-gpick]');if(gp){const id=gp.dataset.gpick;if(!hubCompose){openItem(id);return}hubSel=hubHas('g',id)?hubSel.filter(x=>!(x.k==='g'&&x.id===id)):[...hubSel,{k:'g',id,level:'plus'}];gp.setAttribute('aria-pressed',hubHas('g',id));hubBar();return}
  const b=e.target.closest('[data-pick]');if(!b)return;const id=b.dataset.pick;hubSel=hubHas('v',id)?hubSel.filter(x=>!(x.k==='v'&&x.id===id)):[...hubSel,{k:'v',id}];b.setAttribute('aria-checked',hubHas('v',id));b.closest('.vrow').classList.toggle('on',hubHas('v',id));hubBar()};

/* ---- the bar under the list: save and send ---- */
const planFromSel=title=>({title,vids:hubSel.filter(x=>x.k==='v').map(x=>{const v=hubVids.find(z=>z.id===x.id);return v&&{y:v.yt,t:v.title}}).filter(Boolean),games:hubSel.filter(x=>x.k==='g').map(x=>({id:x.id,level:x.level}))});
function shareLabel(){const r=profile?.role;return r==='coach'&&profile.clubId?'שתף עם מנהל המועדון':r==='manager'&&profile.clubId?'שתף עם המאמנים במועדון':isAdmin()&&!(viewAs&&viewAs.mode==='player')?'תכנית לדוגמה לכל המשתמשים':''}
async function hubBar(){const bar=$('#hubBar'),on=$('#hubTabs [data-t="lib"]').getAttribute('aria-pressed')==='true';
  if(!on||!hubCompose||!hubSel.length){bar.hidden=true;return}bar.hidden=false;
  if(!bar.dataset.built){bar.dataset.built='1';const sl=shareLabel(),teams=await sendTeams();
    bar.innerHTML=`<div class="pb-top"><b id="pbCount"></b><button class="link-btn" id="pbClear">נקה</button></div>
            ${sl?`<label class="check pbshare"><input type="checkbox" id="pbShare"><span>${sl}</span></label>`:''}
      <div class="row2"><button class="btn btn-o" id="pbSave">${I('check')} שמור בתכניות שלי</button>${teams.length?`<button class="btn btn-g" id="pbSend">${I('send')} שמור ושלח</button>`:''}</div><div class="ferr" id="pbErr"></div>`;
    paintIcons(bar);
    $('#pbClear').onclick=()=>{hubSel=[];paintHub()};
    const save=async()=>{if(hubSaving)return null;const title=hubTitle.trim(),err=$('#pbErr');if(!title){err.textContent='כתוב למעלה שם לאימון.';window.scrollTo({top:0,behavior:'smooth'});$('#cpTitle')?.focus();return null}err.textContent='';
      const p={...planFromSel(title),scope:$('#pbShare')?.checked?(isAdmin()?'global':'club'):'private'};
      hubSaving=true;$('#pbSave').disabled=true;if($('#pbSend'))$('#pbSend').disabled=true;try{const row=await DB.savePlan(p);return row}catch(ex){err.textContent=errText(ex);return null}finally{hubSaving=false;$('#pbSave').disabled=false;if($('#pbSend'))$('#pbSend').disabled=false}};
    $('#pbSave').onclick=async()=>{const r=await save();if(!r)return;toast('התכנית נשמרה');hubSel=[];hubTitle='';hubCompose=false;paintHub();showTab('hubTabs','mine')};
    if($('#pbSend'))$('#pbSend').onclick=async()=>{const r=await save();if(!r)return;hubSel=[];hubTitle='';hubCompose=false;paintHub();sendSheet(r)}}
  $('#pbCount').textContent=`${hubSel.length} פריטים בתכנית`}

/* ---- send a saved plan to teams / players as homework ---- */
async function sendSheet(plan){const teams=await sendTeams();if(!teams.length){toast('אין קבוצה לשליחה');return}
  const due=new Date(Date.now()+7*864e5).toISOString().slice(0,10),coach=profile?.role==='coach';
  let players=[];if(coach)players=await DB.board(teams[0].id).catch(()=>[]);
  $('#pSheetBody').innerHTML=`<div class="sheet-h"><div><h2 style="font-size:22px">שליחת "${esc(plan.title)}"</h2></div><button class="icon-btn" data-close aria-label="סגור">✕</button></div>
    ${coach?`<div class="field-row"><span>למי</span><select id="sdTo"><option value="">כל הקבוצה (${players.length})</option>${players.map(r=>`<option value="${r.id}">${esc(r.full_name)}</option>`).join('')}</select></div>`
      :`<div class="field-row"><span>לאילו קבוצות</span><div class="chips" id="sdTeams">${teams.map(t=>`<button class="chip" data-t="${t.id}" aria-pressed="true">${esc(t.name)}</button>`).join('')}</div></div>`}
    <div class="field-row"><span>עד מתי</span><input type="date" id="sdDue" value="${due}"></div>
    <div class="ferr" id="sdErr"></div><button class="btn btn-g full" id="sdGo">${I('send')} שלח כשיעורי בית</button>`;
  showTop();paintIcons($('#pSheetBody'));
  if(!coach)$('#sdTeams').onclick=e=>{const b=e.target.closest('[data-t]');if(b)b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')!=='true')};
  $('#sdGo').onclick=async()=>{const ids=coach?[teams[0].id]:$$('#sdTeams [aria-pressed=true]').map(b=>b.dataset.t);if(!ids.length){$('#sdErr').textContent='בחר קבוצה אחת לפחות.';return}
    const batch=crypto.randomUUID?crypto.randomUUID():null,snap={title:plan.title,vids:plan.vids||[],games:plan.games||[]},to=coach?$('#sdTo').value||null:null;
    try{await DB.addTasks(ids.map(t=>({team_id:t,player_id:to,game:'plan',level:null,title:plan.title,note:null,due:$('#sdDue').value||null,batch,plan:snap})));toast('התכנית נשלחה');$('#pSheet').hidden=true}catch(ex){$('#sdErr').textContent=errText(ex)}}}

/* ---- my plans: mine, shared by the club, examples from BrainBall ---- */
async function renderMine(){const box=$('#hubMine');box.innerHTML='<div class="empty">טוען...</div>';
  try{hubPlans=await DB.myPlans()}catch(e){hubPlans=[]}
  const me=DB.user?.id,mine=hubPlans.filter(p=>p.owner===me),club=hubPlans.filter(p=>p.owner!==me&&p.scope==='club'),glob=hubPlans.filter(p=>p.owner!==me&&p.scope==='global'),canSend=(await sendTeams()).length>0;
  const n=p=>(p.vids?.length||0)+(p.games?.length||0);
  const card=(p,own)=>{const r=RUBS[[...String(p.id)].reduce((a,c)=>a+c.charCodeAt(0),0)%RUBS.length],g=r[3].split(',');
    return `<div class="pcard" style="background:linear-gradient(90deg,${g[1]} 30%,${g[0]})"><img src="img/rub_${r[0]}.webp" alt=""><div class="pt"><b>${esc(p.title)}</b><small style="color:${r[4]}">${p.vids?.length||0} סרטונים · ${p.games?.length||0} אימונים${own&&p.scope==='club'?' · משותפת עם המועדון':own&&p.scope==='global'?' · תכנית לדוגמה':''}</small></div>
    <div class="pa"><button class="btn btn-w sm" data-planopen="${p.id}">${I('play')} התחל</button>${canSend?`<button class="btn btn-o sm" data-plansend="${p.id}">${I('send')} שלח</button>`:''}${own?`<button class="btn btn-o sm" data-plandel="${p.id}">${I('trash')} מחק</button>`:`<button class="btn btn-o sm" data-plancopy="${p.id}">${I('copy')} שמור אצלי</button>`}</div></div>`};
  const sec=(t,l,own)=>l.length?`<div class="sec">${t}</div>${l.map(p=>card(p,own)).join('')}`:'';
  box.innerHTML=`<div class="rubs"><div class="rub static" style="background:linear-gradient(90deg,#120a00 30%,#4a3000)"><img src="img/mine.webp" alt=""><span class="rt"><b>התכניות שלי</b></span></div></div>`+(mine.length?sec('התכניות שלי',mine,true):'<div class="empty">עוד אין תכניות משלך.<br>בחר סרטונים ותרגילים בלשונית "הסרטונים", תן שם ושמור.</div>')+sec('תכניות המועדון',club,false)+sec('תכניות לדוגמה',glob,false);
  box.onclick=async e=>{const f=a=>hubPlans.find(x=>x.id===e.target.closest(`[${a}]`)?.getAttribute(a));
    if(e.target.closest('[data-planopen]'))return openPlan(f('data-planopen'));
    if(e.target.closest('[data-plansend]'))return sendSheet(f('data-plansend'));
    if(e.target.closest('[data-plandel]')){await DB.delPlan(f('data-plandel').id);renderMine();return}
    if(e.target.closest('[data-plancopy]')){const p=f('data-plancopy');try{await DB.savePlan({title:p.title,vids:p.vids,games:p.games,scope:'private'});toast('נשמרה בתכניות שלך');renderMine()}catch(er){toast(errText(er))}}};
  paintIcons(box)}

/* ---- a plan sheet at the top of the phone: used for my plans and for plans the coach sent ---- */
function openPlan(p,taskId,done){if(!p)return;const vids=p.vids||p.plan?.vids||[],games=p.games||p.plan?.games||[],title=p.title||p.plan?.title||'תכנית אימונים';
  $('#pSheetBody').innerHTML=`<div class="sheet-h"><div><h2 style="font-size:21px">${esc(title)}</h2><span class="note">${vids.length} סרטונים · ${games.length} אימונים</span></div><button class="icon-btn" data-close aria-label="סגור">✕</button></div>
    ${vids.length?`<div class="yt" id="pvBox"><iframe id="pvFrame" title="סרטון" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`:''}
    <div class="vlist">${vids.map((v,i)=>`<div class="vrow" data-pv="${i}"><button class="vthumb" aria-label="נגן"><img loading="lazy" src="${ytThumb(v.y)}" alt=""><span>${I('play')}</span></button><div class="vt"><b>${i+1}. ${esc(v.t)}</b></div></div>`).join('')}
    ${games.filter(g=>CAT[g.id]).map(g=>`<button class="vrow gx" data-gx="${g.id}" data-lv="${g.level||'plus'}"><span class="gx-ico">${I(CAT[g.id].ico)}</span><div class="vt"><b>${CAT[g.id].name}</b><small>${LV[g.level]||''}</small></div><span class="ar">←</span></button>`).join('')}</div>
    ${taskId?`<button class="btn btn-g full" id="pvDone" ${done?'disabled':''}>${done?'סומן כבוצע ✓':'סיימתי את התכנית'}</button>`:''}`;
  const play=i=>{$('#pvFrame').src=embed(vids[i].y,true);$$('#pSheetBody [data-pv]').forEach((r,j)=>r.classList.toggle('on',j===i))};
  $('#pSheetBody').onclick=e=>{const r=e.target.closest('[data-pv]');if(r)return play(+r.dataset.pv);const g=e.target.closest('[data-gx]');if(g){$('#pSheet').hidden=true;openItem(g.dataset.gx,g.dataset.lv)}};
  if(taskId&&!done)$('#pvDone').onclick=async()=>{try{await DB.markDone(taskId);toast('כל הכבוד. התכנית סומנה כבוצעת');const t=(window.TASKS||[]).find(x=>x.id===taskId);if(t)t.done=true;$('#pvDone').textContent='סומן כבוצע ✓';$('#pvDone').disabled=true;loadTasks().then(()=>{if($('#v-home').classList.contains('on'))renderHome();if($('#v-inbox').classList.contains('on'))renderInbox()})}catch(er){toast(errText(er))}};
  if(vids.length)$('#pvFrame').src=embed(vids[0].y,false);
  showTop();paintIcons($('#pSheetBody'))}
document.addEventListener('click',e=>{const t=e.target.closest('[data-plan]');if(!t)return;const task=(window.TASKS||[]).find(x=>x.id===t.dataset.plan);if(task)openPlan(task,task.id,task.done)});

/* ---- manage the list (club manager / system admin) ---- */
async function renderHubEdit(){if(!hubCanEdit())return;const club=hubClub();
  hubOwn=await DB.ownVideos(club).catch(()=>[]);
  $('#hubEditNote').innerHTML=club&&!hubOwn.length?`<div class="notice">עכשיו המועדון מציג את הרשימה הכללית של BrainBall. כדי להתאים אותה, צור עותק, ואז מחק, שנה שם והוסף כרצונך. <button class="link-btn" id="hvCopy">צור עותק למועדון</button></div>`:club?'<p class="note">זו הרשימה של המועדון. השחקנים והמאמנים רואים רק אותה.</p>':'<p class="note">זו הרשימה הכללית. שחקנים בלי מועדון, ומועדונים שלא התאימו רשימה, רואים אותה.</p>';
  if($('#hvCopy'))$('#hvCopy').onclick=async()=>{try{const n=await DB.copyVideos(club);toast(n?'נוצר עותק למועדון':'הרשימה הכללית עדיין ריקה');renderHubEdit()}catch(e){toast(errText(e))}};
  $('#hubEditList').innerHTML=hubOwn.length?`<div class="vlist">${hubOwn.map(v=>`<div class="vrow"><button class="vthumb" data-play="${v.yt}" data-ttl="${esc(v.title)}" aria-label="נגן"><img loading="lazy" src="${ytThumb(v.yt)}" alt=""><span>${I('play')}</span></button><div class="vt"><input class="vname" value="${esc(v.title)}" data-vn="${v.id}" aria-label="שם הסרטון"><select class="vcat" data-vc="${v.id}" aria-label="קטגוריה"><option value="">ללא קטגוריה</option>${RUBS.map(r=>`<option value="${r[0]}"${v.cat===r[0]?' selected':''}>${r[1]}</option>`).join('')}</select></div><button class="mini-del" data-vdel="${v.id}" aria-label="מחק">${I('trash')}</button></div>`).join('')}</div>`:'<div class="empty">עוד אין סרטונים ברשימה הזו.</div>';
  paintIcons($('#v-hub'))}
$('#hubEditList').onclick=async e=>{const p=e.target.closest('[data-play]');if(p){vplay(p.dataset.play,p.dataset.ttl);return}const d=e.target.closest('[data-vdel]');if(d){try{await DB.delVideo(d.dataset.vdel);renderHubEdit()}catch(er){toast(errText(er))}}};
$('#hubEditList').onchange=async e=>{const vc=e.target.closest('[data-vc]');if(vc){try{await DB.setVideoCat(vc.dataset.vc,vc.value);toast('הקטגוריה עודכנה')}catch(er){toast(errText(er))}return}const i=e.target.closest('[data-vn]');if(!i||!i.value.trim())return;try{await DB.renameVideo(i.dataset.vn,i.value.trim());toast('השם עודכן')}catch(er){toast(errText(er))}};
$('#hvAdd').onclick=async()=>{const err=$('#hvErr'),id=ytId($('#hvUrl').value);if(!id){err.textContent='הקישור לא נראה כמו קישור של יוטיוב.';return}
  const title=$('#hvTitle').value.trim();if(!title){err.textContent='כתוב שם לתרגיל.';return}err.textContent='';
  try{await DB.addVideo({club_id:hubClub(),title,yt:id,sort:hubOwn.length,cat:$('#hvCat').value||null});$('#hvUrl').value='';$('#hvTitle').value='';toast('הסרטון נוסף');renderHubEdit()}catch(e){err.textContent=errText(e)}};
