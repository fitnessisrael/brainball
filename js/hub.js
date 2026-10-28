/* ================= virtual training hub: YouTube drills, plans, homework ================= */
const ytId=u=>{u=String(u||'').trim();const m=u.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/);if(m)return m[1];return /^[A-Za-z0-9_-]{11}$/.test(u)?u:null};
const ytThumb=id=>`https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
let hubPick=[],hubVids=[],hubOwn=[],hubTarget=[];tabs('hubTabs',t=>{if(t==='mine')renderMine();if(t==='edit')renderHubEdit();hubBar()});
/* whose list: a player/coach sees the list of his club (or the general one); the admin edits the list of the club he is inside, or the general one */
const hubClub=()=>profile?.role==='admin'?(curClub?.id||null):(profile?.clubId||null);
const hubCanEdit=()=>(profile?.role==='manager'&&!!profile.clubId)||(isAdmin()&&!(window.viewAs&&viewAs.mode==='player'));
const hubSendTeam=()=>profile?.role==='coach'?profile.teamId:(['manager','admin'].includes(profile?.role)&&curTeam?curTeam.id:null);
const vplay=(id,title)=>{$('#pSheetBody').innerHTML=`<div class="sheet-h"><div><h2 style="font-size:21px">${esc(title||'')}</h2></div><button class="icon-btn" data-close aria-label="סגור">✕</button></div><div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1" title="${esc(title||'סרטון')}" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div><a class="btn btn-o full" href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">פתח ביוטיוב</a>`;$('#pSheet').hidden=false};
const vrow=(v,sel)=>`<div class="vrow${sel?' on':''}"><button class="vthumb" data-play="${v.yt}" data-ttl="${esc(v.title)}" aria-label="נגן ${esc(v.title)}"><img loading="lazy" src="${ytThumb(v.yt)}" alt=""><span>${I('play')}</span></button><div class="vt"><b>${esc(v.title)}</b></div>${sel===undefined?'':`<button class="vsel" role="checkbox" aria-checked="${!!sel}" data-pick="${v.id}" aria-label="הוסף לתכנית"></button>`}</div>`;

async function renderHub(){const role=profile?.role,edit=hubCanEdit(),send=hubSendTeam();
  $('#hubTabs [data-t="edit"]').hidden=!edit;
  $('#hubSub').textContent=send?'בוחרים סרטונים, נותנים שם לתכנית ושולחים לשחקנים כשיעורי בית.':role==='player'||!role?'בוחרים סרטונים, נותנים שם לתכנית, ומתאמנים לפי התכנית שלך.':'אוסף התרגילים של המועדון.';
  if(!DB.ok()){$('#hubList').innerHTML='<div class="empty">צריך חיבור לאינטרנט.</div>';return}
  $('#hubList').innerHTML='<div class="empty">טוען סרטונים...</div>';hubBar();
  try{hubVids=await DB.videoList(hubClub())}catch(e){hubVids=[]}
  hubPick=hubPick.filter(id=>hubVids.some(v=>v.id===id));paintHub();
  if(send&&!hubTarget.length)DB.board(send).then(r=>{hubTarget=r;hubBar()}).catch(()=>{})}
function paintHub(){$('#hubList').innerHTML=hubVids.length?`<div class="vlist">${hubVids.map(v=>vrow(v,hubPick.includes(v.id))).join('')}</div>`
  :`<div class="empty">עוד אין סרטונים כאן.${hubCanEdit()?'<br>הוסף את הראשון בלשונית "ניהול סרטונים".':'<br>הם יתווספו בקרוב.'}</div>`;paintIcons($('#v-hub'));hubBar()}
$('#hubList').onclick=e=>{const p=e.target.closest('[data-play]');if(p){vplay(p.dataset.play,p.dataset.ttl);return}
  const b=e.target.closest('[data-pick]');if(!b)return;const id=b.dataset.pick;hubPick=hubPick.includes(id)?hubPick.filter(x=>x!==id):[...hubPick,id];paintHub()};

/* ---- the bar under the list: save for myself (player) or send (coach) ---- */
function hubBar(){const bar=$('#hubBar'),on=$('#hubTabs [data-t="lib"]').getAttribute('aria-pressed')==='true',send=hubSendTeam();
  if(!on||!hubPick.length){bar.hidden=true;return}bar.hidden=false;
  const due=new Date(Date.now()+7*864e5).toISOString().slice(0,10);
  bar.innerHTML=`<div class="pb-top"><b>${hubPick.length} סרטונים בתכנית</b><button class="link-btn" id="pbClear">נקה</button></div>
    <input type="text" id="pbTitle" placeholder="שם התכנית, לדוגמה חימום לפני משחק" maxlength="60" value="${esc(bar.dataset.title||'')}">
    ${send?`<div class="row2"><select id="pbTo"><option value="">כל הקבוצה (${hubTarget.length||''})</option>${hubTarget.map(r=>`<option value="${r.id}">${esc(r.full_name)}</option>`).join('')}</select><input type="date" id="pbDue" value="${due}"></div>`:''}
    <button class="btn btn-g full" id="pbGo">${send?I('send')+' שלח לשחקנים כשיעורי בית':I('check')+' שמור את התכנית'}</button><div class="ferr" id="pbErr"></div>`;
  $('#pbTitle').oninput=e=>{bar.dataset.title=e.target.value};
  $('#pbClear').onclick=()=>{hubPick=[];bar.dataset.title='';paintHub()};
  $('#pbGo').onclick=async()=>{const title=$('#pbTitle').value.trim(),err=$('#pbErr');if(!title){err.textContent='תן שם לתכנית.';$('#pbTitle').focus();return}
    const vids=hubPick.map(id=>hubVids.find(v=>v.id===id)).filter(Boolean).map(v=>({y:v.yt,t:v.title}));err.textContent='';
    try{if(send){const batch=crypto.randomUUID?crypto.randomUUID():null;await DB.addTasks([{team_id:send,player_id:$('#pbTo').value||null,game:'plan',level:null,title,note:null,due:$('#pbDue').value||null,batch,plan:{title,vids}}]);toast('התכנית נשלחה לשחקנים')}
      else{await DB.savePlan(title,vids);toast('התכנית נשמרה');showTab('hubTabs','mine')}
      hubPick=[];bar.dataset.title='';paintHub()}catch(ex){err.textContent=errText(ex)}}}

/* ---- my saved plans ---- */
async function renderMine(){const box=$('#hubMine');box.innerHTML='<div class="empty">טוען...</div>';
  let plans=[];try{plans=await DB.myPlans()}catch(e){}
  box.innerHTML=plans.length?plans.map(p=>`<div class="tcard plan"><div class="tcard-h"><div><b>${esc(p.title)}</b><small>${p.vids.length} סרטונים</small></div><button class="btn btn-w sm" data-planopen="${p.id}">${I('play')} התחל</button></div><button class="link-btn dim" data-plandel="${p.id}">מחיקה</button></div>`).join('')
    :'<div class="empty">עוד אין תכניות.<br>בחר כמה סרטונים בלשונית "הסרטונים", תן שם ושמור.</div>';
  box.onclick=async e=>{const o=e.target.closest('[data-planopen]');if(o){openPlan(plans.find(x=>x.id===o.dataset.planopen));return}
    const d=e.target.closest('[data-plandel]');if(d){await DB.delPlan(d.dataset.plandel);renderMine()}};paintIcons(box)}

/* ---- a plan sheet: used for my own plans and for plans the coach sent ---- */
function openPlan(p,taskId,done){if(!p)return;const vids=p.vids||p.plan?.vids||[],title=p.title||p.plan?.title||'תכנית אימונים';
  $('#pSheetBody').innerHTML=`<div class="sheet-h"><div><h2 style="font-size:22px">${esc(title)}</h2><span class="note">${vids.length} סרטונים</span></div><button class="icon-btn" data-close aria-label="סגור">✕</button></div>
    <div class="yt" id="pvBox"><iframe id="pvFrame" title="סרטון" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
    <div class="vlist">${vids.map((v,i)=>`<div class="vrow" data-pv="${i}"><button class="vthumb" aria-label="נגן"><img loading="lazy" src="${ytThumb(v.y)}" alt=""><span>${I('play')}</span></button><div class="vt"><b>${i+1}. ${esc(v.t)}</b></div></div>`).join('')}</div>
    ${taskId?`<button class="btn btn-g full" id="pvDone" ${done?'disabled':''}>${done?'סומן כבוצע ✓':'סיימתי את התכנית'}</button>`:''}`;
  const play=i=>{$('#pvFrame').src=`https://www.youtube-nocookie.com/embed/${vids[i].y}?rel=0&playsinline=1&autoplay=1`;$$('#pSheetBody [data-pv]').forEach((r,j)=>r.classList.toggle('on',j===i))};
  $('#pSheetBody').onclick=e=>{const r=e.target.closest('[data-pv]');if(r)play(+r.dataset.pv)};
  if(taskId&&!done)$('#pvDone').onclick=async()=>{try{await DB.markDone(taskId);toast('כל הכבוד. התכנית סומנה כבוצעת');const t=(window.TASKS||[]).find(x=>x.id===taskId);if(t)t.done=true;$('#pvDone').textContent='סומן כבוצע ✓';$('#pvDone').disabled=true;loadTasks().then(()=>{if($('#v-home').classList.contains('on'))renderHome();if($('#v-inbox').classList.contains('on'))renderInbox()})}catch(er){toast(errText(er))}};
  if(vids.length)$('#pvFrame').src=`https://www.youtube-nocookie.com/embed/${vids[0].y}?rel=0&playsinline=1`;
  $('#pSheet').hidden=false;paintIcons($('#pSheetBody'))}
$('#pSheet').addEventListener('click',e=>{if(e.target.id==='pSheet'||e.target.closest('[data-close]'))$('#pSheetBody').innerHTML=''});
document.addEventListener('click',e=>{const t=e.target.closest('[data-plan]');if(!t)return;const task=(window.TASKS||[]).find(x=>x.id===t.dataset.plan);if(task)openPlan(task,task.id,task.done)});

/* ---- manage the list (club manager / system admin) ---- */
async function renderHubEdit(){if(!hubCanEdit())return;const club=hubClub();
  hubOwn=await DB.ownVideos(club).catch(()=>[]);
  $('#hubEditNote').innerHTML=club&&!hubOwn.length?`<div class="notice">עכשיו המועדון מציג את הרשימה הכללית של BrainBall. כדי להתאים אותה, צור עותק, ואז מחק, שנה שם והוסף כרצונך. <button class="link-btn" id="hvCopy">צור עותק למועדון</button></div>`:club?'<p class="note">זו הרשימה של המועדון. השחקנים והמאמנים רואים רק אותה.</p>':'<p class="note">זו הרשימה הכללית. שחקנים בלי מועדון, ומועדונים שלא התאימו רשימה, רואים אותה.</p>';
  if($('#hvCopy'))$('#hvCopy').onclick=async()=>{try{const n=await DB.copyVideos(club);toast(n?'נוצר עותק למועדון':'הרשימה הכללית עדיין ריקה');renderHubEdit()}catch(e){toast(errText(e))}};
  $('#hubEditList').innerHTML=hubOwn.length?`<div class="vlist">${hubOwn.map(v=>`<div class="vrow"><button class="vthumb" data-play="${v.yt}" data-ttl="${esc(v.title)}" aria-label="נגן"><img loading="lazy" src="${ytThumb(v.yt)}" alt=""><span>${I('play')}</span></button><div class="vt"><input class="vname" value="${esc(v.title)}" data-vn="${v.id}" aria-label="שם הסרטון"></div><button class="mini-del" data-vdel="${v.id}" aria-label="מחק">${I('trash')}</button></div>`).join('')}</div>`:'<div class="empty">עוד אין סרטונים ברשימה הזו.</div>';
  paintIcons($('#v-hub'))}
$('#hubEditList').onclick=async e=>{const p=e.target.closest('[data-play]');if(p){vplay(p.dataset.play,p.dataset.ttl);return}const d=e.target.closest('[data-vdel]');if(d){try{await DB.delVideo(d.dataset.vdel);renderHubEdit()}catch(er){toast(errText(er))}}};
$('#hubEditList').onchange=async e=>{const i=e.target.closest('[data-vn]');if(!i||!i.value.trim())return;try{await DB.renameVideo(i.dataset.vn,i.value.trim());toast('השם עודכן')}catch(er){toast(errText(er))}};
$('#hvAdd').onclick=async()=>{const err=$('#hvErr'),id=ytId($('#hvUrl').value);if(!id){err.textContent='הקישור לא נראה כמו קישור של יוטיוב.';return}
  const title=$('#hvTitle').value.trim();if(!title){err.textContent='כתוב שם לתרגיל.';return}err.textContent='';
  try{await DB.addVideo({club_id:hubClub(),title,yt:id,sort:hubOwn.length});$('#hvUrl').value='';$('#hvTitle').value='';toast('הסרטון נוסף');renderHubEdit()}catch(e){err.textContent=errText(e)}};
