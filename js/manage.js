/* ================= management: coach, club manager, system admin ================= */
let curClub=null;
const ago=d=>{if(!d)return'-';const s=(Date.now()-new Date(d))/1000;return s<3600?'עכשיו':s<86400?`לפני ${Math.round(s/3600)} ש'`:`לפני ${Math.round(s/86400)} ימים`};
function tabs(id,onShow){const root=$('#'+id),view=root.closest('.view');root.onclick=e=>{const b=e.target.closest('[data-t]');if(!b)return;
  $$('#'+id+' [data-t]').forEach(x=>x.setAttribute('aria-pressed',x===b));view.querySelectorAll('[data-pane]').forEach(p=>p.hidden=p.dataset.pane!==b.dataset.t);onShow&&onShow(b.dataset.t)}}
function showTab(id,t){const b=$(`#${id} [data-t="${t}"]`);b&&b.click()}
const isAdmin=()=>profile?.role==='admin';
const waBtn=(phone,text,label='')=>phone?`<a class="wa-mini" href="${wa(text,phone)}" target="_blank" rel="noopener" aria-label="וואטסאפ">${I('chat')}${label}</a>`:'';

const codeBtn=(attr,val)=>`<button class="code-edit" ${attr}="${val}" aria-label="עריכת קוד">${I('edit')}</button>`;
function codeSheet(title,fields,onSave){$('#pSheetBody').innerHTML=`<div class="sheet-h"><div><h2 style="font-size:22px">${esc(title)}</h2></div><button class="icon-btn" data-close aria-label="סגור">✕</button></div>${fields.map(f=>`<div class="field-row"><span>${f.label}</span><input type="text" id="ce_${f.id}" class="code-in" value="${esc(f.val)}" maxlength="10" autocapitalize="characters" autocomplete="off"></div>`).join('')}<p class="note">4 עד 10 אותיות באנגלית או ספרות. מי שכבר נרשם נשאר במקומו. קישורי הזמנה ישנים יפסיקו לעבוד, ושחקנים חדשים ירשמו עם הקוד החדש.</p><div class="ferr" id="ceErr"></div><button class="btn btn-g full" id="ceSave">שמור</button>`;
  $('#pSheet').hidden=false;$('#ceSave').onclick=async()=>{try{await onSave(Object.fromEntries(fields.map(f=>[f.id,$('#ce_'+f.id).value.trim()])));$('#pSheet').hidden=true;toast('הקוד עודכן')}catch(e){$('#ceErr').textContent=errText(e)}}}
const canEditCodes=()=>(isAdmin()||profile?.role==='manager')&&!(viewAs&&viewAs.mode==='player');

/* ---------- player detail sheet (coach / manager / admin) ---------- */
async function openPlayer(uid,ctx){const p=ctx.people.find(x=>x.id===uid);if(!p)return;
  const ses=ctx.ses.filter(r=>r.user_id===uid),teamProf=profileOf(ctx.ses.filter(r=>r.team_id===p.team_id));
  $('#pSheetBody').innerHTML=`<div class="sheet-h"><span class="av on">${esc((p.full_name||'?').trim()[0])}</span><div><h2 style="font-size:24px">${esc(p.full_name||'')}</h2><span class="note">${[p.age?`גיל ${p.age}`:'',p.position||'',ctx.teamName?.(p.team_id)||''].filter(Boolean).join(' · ')}</span></div><button class="icon-btn" data-close aria-label="סגור">✕</button></div>
    <div class="contact">${p.phone?`<a class="btn btn-o sm" href="tel:${esc(p.phone)}">${I('phone')} ${esc(p.phone)}</a>`:''}${p.phone?`<a class="btn btn-g sm" href="${wa(`היי ${(p.full_name||'').split(' ')[0]}! `,p.phone)}" target="_blank" rel="noopener">${I('chat')} וואטסאפ</a>`:''}${p.email?`<span class="note ltr">${esc(p.email)}</span>`:''}</div>
    ${p.share===false&&!isAdmin()?'<div class="empty">השחקן בחר לא לשתף תוצאות.</div>':playerHTML(p,ses,teamProf)}
    ${ctx.onTask?`<button class="btn btn-g full" id="psTask" style="margin-top:12px">${I('send')} משימה אישית</button>`:''}
    ${ctx.teams&&ctx.teams.length>1?`<div class="field-row" style="margin-top:12px"><span>העברה למחלקה</span><select id="psMove">${ctx.teams.map(t=>`<option value="${t.id}" ${t.id===p.team_id?'selected':''}>${esc(t.name)}</option>`).join('')}</select></div>`:''}`;
  $('#pSheet').hidden=false;
  if(ctx.onTask)$('#psTask').onclick=()=>{$('#pSheet').hidden=true;ctx.onTask(uid)};
  if($('#psMove'))$('#psMove').onchange=async e=>{try{await DB.setPlayerTeam(uid,e.target.value);toast('השחקן הועבר');$('#pSheet').hidden=true;ctx.reload&&ctx.reload()}catch(er){toast(errText(er))}}}

/* ================= coach ================= */
const gN=x=>x.game==='plan'?('תכנית: '+(x.plan?.title||x.title||'אימונים')):(CAT[x.game]?.name||x.game);
let hwLevel='plus',hwPicked=new Set(['reaction']),coachCtx=null;
tabs('coachTabs');
async function renderCoach(){const p=profile||{};
  const t=curTeam||(p.teamId?{id:p.teamId,name:p.team,code:p.teamCode,coach_code:p.coachCode,club:p.club}:null);
  $('#coachBack').hidden=!curTeam;$('#coachBack').onclick=()=>{curTeam=null;go(isAdmin()&&!curClub?'sys':'club')};
  $('#coachHello').textContent=t?.club||(p.name?`היי ${p.name.split(' ')[0]}`:'');$('#coachTitle').textContent=t?.name||'הקבוצה שלי';
  if(!t||!DB.ok()){$('#coachIns').innerHTML='<div class="empty">כדי לנהל קבוצה צריך להירשם כמאמן עם הקוד מהמנהל.</div>';$('#tCode').textContent='------';return}
  $('#tCode').textContent=t.code;const link=appLink('join-'+t.code);
  $('#tCodeEdit').hidden=!(curTeam&&canEditCodes());$('#tCodeEdit').onclick=()=>codeSheet('קודים של '+t.name,[{id:'p',label:'קוד שחקנים',val:t.code},{id:'c',label:'קוד מאמן',val:t.coach_code}],async v=>{const r=await DB.setTeamCodes(t.id,v.p,v.c);curTeam={...curTeam,code:r.code,coach_code:r.coach_code};renderCoach()});
  $('#tWaAll').href=wa(`היי! מצטרפים לקבוצה "${t.name}" ב-BrainBall, אימון מוח לשחקני כדורגל.\nקוד הקבוצה: ${t.code}\nנרשמים כאן: ${link}`);
  $('#tCopy').onclick=()=>copyTxt(link);
  $('#coachIns').innerHTML='<div class="empty">טוען נתונים...</div>';
  let rows=[],ses=[];try{[rows,ses]=await Promise.all([DB.board(t.id),DB.teamData(t.id)])}catch(e){$('#coachIns').innerHTML=`<div class="empty">${errText(e)}</div>`;return}
  const people=rows.map(r=>({...r,role:'player',team_id:t.id}));
  coachCtx={t,rows,people,ses,onTask:uid=>{showTab('coachTabs','hw');$('#taskTo').value=uid;$('#hwTitle').focus()},reload:renderCoach};
  $('#coachIns').innerHTML=insightHTML(people,ses,{title:'הקבוצה'});
  $('#coachIns').onclick=e=>{const u=e.target.closest('[data-uid]');if(u)openPlayer(u.dataset.uid,coachCtx)};
  renderBoard(rows,t);renderHw(t,rows);renderRoster(t);paintIcons($('#v-coach'))}
function renderBoard(rows,t){const used=BOARD_GAMES.filter(g=>g==='reaction'||rows.some(r=>r.last?.[g]));const P=peopleStats(coachCtx.people,coachCtx.ses);
  $('#dashNote').textContent=`${rows.length} שחקנים · ${rows.filter(r=>r.sessions_7d>0).length} התאמנו השבוע`;
  $('#board').innerHTML=rows.length?`<thead><tr><th>שחקן</th><th>מדד</th><th>שיפור</th><th>השבוע</th><th>אחרון</th><th>משימות</th>${used.map(g=>`<th>${CAT[g].name}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map(r=>{const s=P.find(x=>x.id===r.id)||{};return `<tr data-uid="${r.id}"><td><span class="av on">${esc((r.full_name||'?').trim()[0])}</span><b>${esc(r.full_name)}</b></td><td class="num">${s.ov??'-'}</td><td class="num">${s.imp!=null?trend(s.imp):'-'}</td><td class="num">${r.sessions_7d}</td><td>${ago(r.last_at)}</td><td class="num">${r.tasks_done}</td>${used.map(g=>`<td class="num">${r.last?.[g]?esc(r.last[g].disp):'-'}</td>`).join('')}<td>${waBtn(r.phone,`היי ${(r.full_name||'').split(' ')[0]}! `)}</td></tr>`}).join('')}</tbody>`
    :`<tr><td class="empty">עוד אין שחקנים בקבוצה.<br>שלח את ההזמנה בוואטסאפ. הם נרשמים עם הקוד ומופיעים כאן.</td></tr>`;
  $('#board').onclick=e=>{if(e.target.closest('a'))return;const tr=e.target.closest('[data-uid]');if(tr)openPlayer(tr.dataset.uid,coachCtx)}}
/* ---------- homework centre ---------- */
function renderHw(t,rows){
  $('#hwPick').innerHTML=visible().filter(id=>!CAT[id].field).map(id=>`<button class="pick" data-g="${id}" aria-pressed="${hwPicked.has(id)}">${I(CAT[id].ico)}<span>${CAT[id].name}</span></button>`).join('');
  $('#hwPick').onclick=e=>{const b=e.target.closest('[data-g]');if(!b)return;const g=b.dataset.g;hwPicked.has(g)?hwPicked.delete(g):hwPicked.add(g);b.setAttribute('aria-pressed',hwPicked.has(g))};
  $('#hwLv').onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;hwLevel=b.dataset.v;$$('#hwLv button').forEach(x=>x.setAttribute('aria-pressed',x===b))};
  const d=new Date(Date.now()+7*864e5);if(!$('#hwDue').value)$('#hwDue').value=d.toISOString().slice(0,10);
  $('#taskTo').innerHTML=`<option value="">כל הקבוצה (${rows.length})</option>`+rows.map(r=>`<option value="${r.id}">${esc(r.full_name)}</option>`).join('');
  $('#taskSend').onclick=async()=>{const err=$('#taskErr');err.textContent='';if(!hwPicked.size){err.textContent='בחר לפחות תרגיל אחד.';return}
    const batch=crypto.randomUUID?crypto.randomUUID():null,to=$('#taskTo').value||null,title=$('#hwTitle').value.trim()||null,note=$('#taskNote').value.trim()||null,due=$('#hwDue').value||null;
    try{await DB.addTasks([...hwPicked].map(g=>({team_id:t.id,player_id:to,game:g,level:hwLevel,note,title,due,batch})));
      toast('המשימה נשלחה לשחקנים');$('#hwTitle').value='';$('#taskNote').value='';renderHwList(t,rows)}catch(e){err.textContent=errText(e)}};
  renderHwList(t,rows)}
async function renderHwList(t,rows){const [list,done]=await Promise.all([DB.teamTasks(t.id).catch(()=>[]),DB.taskDone(t.id).catch(()=>[])]);
  const doneBy=groupBy(done,d=>d.task_id);const groups=Object.values(groupBy(list,x=>x.batch||x.id));
  const total=groups.length,active=groups.filter(g=>!g[0].due||new Date(g[0].due)>=new Date(new Date().toDateString())).length;
  $('#hwSum').textContent=total?`${active} פעילות · ${total} בסך הכל`:'';
  $('#hwList').innerHTML=groups.length?groups.map(g=>{const h=g[0],targets=h.player_id?rows.filter(r=>r.id===h.player_id):rows;
    const st=targets.map(r=>({r,n:g.filter(x=>(doneBy[x.id]||[]).some(d=>d.user_id===r.id)).length}));const full=st.filter(x=>x.n===g.length).length,pct=targets.length?Math.round(full/targets.length*100):0;
    const late=h.due&&new Date(h.due)<new Date(new Date().toDateString());
    return `<details class="hwcard"><summary><div class="hwc-top"><div><b>${esc(h.title||g.map(gN).join(' + '))}</b><small>${h.player_id?'אישית: '+esc(targets[0]?.full_name||''):'כל הקבוצה'} · ${LV[h.level]||''}${h.due?` · עד ${new Date(h.due).toLocaleDateString('he-IL')}`:''}${late?' · <em class="late">הסתיים</em>':''}</small></div><div class="ring-s" style="--p:${pct}"><span>${pct}%</span></div></div>
      <div class="hwc-games">${g.map(x=>`<span>${I(x.game==='plan'?'play':CAT[x.game]?.ico||'bolt')}${esc(gN(x))}</span>`).join('')}</div></summary>
      ${h.note?`<p class="note">"${esc(h.note)}"</p>`:''}
      <div class="hwc-list">${st.map(x=>`<div class="hwc-row ${x.n===g.length?'ok':''}"><span>${esc(x.r.full_name)}</span><span class="mono">${x.n}/${g.length}</span>${x.n<g.length?waBtn(x.r.phone,`היי ${(x.r.full_name||'').split(' ')[0]}, תזכורת מהמאמן: "${h.title||gN(h)}" ב-BrainBall${h.due?` עד ${new Date(h.due).toLocaleDateString('he-IL')}`:''}. ${appLink('home')}`,' תזכורת'):`<span class="okmark-s">${I('check')}</span>`}</div>`).join('')||'<p class="note">אין שחקנים בקבוצה עדיין.</p>'}</div>
      <div class="row2"><a class="btn btn-o sm" href="${wa(`משימה חדשה ב-BrainBall: ${h.title||g.map(gN).join(' + ')}${h.due?` עד ${new Date(h.due).toLocaleDateString('he-IL')}`:''}.${h.note?'\n'+h.note:''}\nפותחים כאן: ${appLink('home')}`)}" target="_blank" rel="noopener">${I('chat')} שלח לקבוצה</a><button class="btn btn-o sm" data-delb="${g.map(x=>x.id).join(',')}">${I('trash')} מחק</button></div></details>`}).join(''):'<div class="empty">עוד לא נשלחו משימות.<br>בנה משימה למעלה, והיא תופיע לשחקנים בהתראות.</div>';
  $('#hwList').onclick=async e=>{const b=e.target.closest('[data-delb]');if(!b)return;for(const id of b.dataset.delb.split(','))await DB.delTask(id);renderHwList(t,rows)}}
async function renderRoster(t){const list=await DB.roster(t.id).catch(()=>[]);
  $('#rosterList').innerHTML=list.map(r=>`<div class="drow"><span class="av">${esc(r.name.trim()[0]||'?')}</span><div><b>${esc(r.name)}</b><small class="ltr">${esc(r.phone||'')}</small></div><span></span><div class="mini-acts"><a href="${wa(`היי ${r.name}! המאמן מזמין אותך ל-BrainBall.\nקוד הקבוצה: ${t.code}\nנרשמים כאן: ${appLink('join-'+t.code)}`,r.phone)}" target="_blank" rel="noopener" aria-label="שלח בוואטסאפ">${I('chat')}</a><button data-delr="${r.id}" aria-label="הסר">${I('trash')}</button></div></div>`).join('');
  $('#rosterList').onclick=async e=>{const b=e.target.closest('[data-delr]');if(!b)return;await DB.delRoster(b.dataset.delr);renderRoster(t)};
  $('#pAdd').onclick=async()=>{const n=$('#pName').value.trim(),ph=$('#pPhone').value.trim(),err=$('#pErr');
    if(!n){err.textContent='צריך שם.';return}if(waNum(ph).length<11){err.textContent='מספר טלפון לא תקין.';return}err.textContent='';
    try{await DB.addRoster(t.id,n,ph);$('#pName').value='';$('#pPhone').value='';renderRoster(t)}catch(e){err.textContent=errText(e)}}}

/* ================= club (manager, or admin inside any club) ================= */
let clubCtx=null;tabs('clubTabs');
async function renderClub(){const p=profile||{};const admin=isAdmin();
  let c=curClub||(p.clubId?{id:p.clubId,name:p.club,logo:p.clubLogo,code:p.clubCode,status:p.clubStatus}:null);
  $('#clubBack').onclick=()=>{curClub=null;go('sys')};
  if(!c||!DB.ok()){$('#clubIns').innerHTML='<div class="empty">צריך להתחבר כמנהל מועדון.</div>';return}
  if(admin){const fresh=await DB.club(c.id).catch(()=>null);if(fresh)c=curClub=fresh}
  $('#clubHello').textContent=admin&&!viewAs?'מנהל מערכת · צפייה במועדון':'היי '+(p.name||'').split(' ')[0];$('#clubName').textContent=c.name||'המועדון שלי';
  $('#clubLogo').hidden=!c.logo;if(c.logo)$('#clubLogo').src=c.logo;
  $('#clubPending').innerHTML=c.status==='pending'?'<div class="notice">המועדון מחכה לאישור צוות BrainBall.</div>':'';
  const adm=admin&&!viewAs;
  $('#clubBack').hidden=!adm;
  $('#clubAdmin').innerHTML=adm?`<div class="admin-bar"><div class="codes"><div><span class="note">קוד מנהל מועדון</span><b class="mono" id="caCode">${c.code}</b></div>${codeBtn('data-ecclub',c.id)}</div>${c.status==='active'?`<button class="btn btn-o sm" data-st="suspended">השהה מועדון</button>`:`<button class="btn btn-g sm" data-st="active">${I('check')} אשר מועדון</button>`}</div>`:'';
  if(adm){$('#clubAdmin').querySelector('[data-ecclub]').onclick=()=>codeSheet('קוד מנהל המועדון',[{id:'c',label:'קוד',val:c.code}],async v=>{const n=await DB.setClubCode(c.id,v.c);c.code=n;$('#caCode').textContent=n});
    $('#clubAdmin').querySelector('[data-st]').onclick=async e=>{try{await DB.setClubStatus(c.id,e.currentTarget.dataset.st);toast('עודכן');renderClub()}catch(er){toast(errText(er))}}}
  $('#clubIns').innerHTML='<div class="empty">טוען נתונים...</div>';
  let d;try{d=await DB.clubData(c.id)}catch(e){$('#clubIns').innerHTML=`<div class="empty">${errText(e)}</div>`;return}
  const tName=id=>d.teams.find(t=>t.id===id)?.name||'';
  clubCtx={...d,teamName:tName,reload:renderClub};
  $('#clubIns').innerHTML=insightHTML(d.people,d.ses,{title:'המועדון',teams:d.teams});
  $('#clubIns').onclick=e=>{const u=e.target.closest('[data-uid]');if(u)return openPlayer(u.dataset.uid,clubCtx);const tr=e.target.closest('[data-team]');if(tr){const t=d.teams.find(x=>x.id===tr.dataset.team);curTeam={...t,club:c.name};go('coach')}};
  const staff=d.people.filter(x=>x.role==='coach'),pl=d.people.filter(x=>x.role==='player');
  $('#clubTeams').innerHTML=d.teams.length?d.teams.map((t,i)=>teamCard(t,staff.find(s=>s.id===t.coach_id),pl.filter(x=>x.team_id===t.id).length,i)).join(''):'<div class="empty">עוד אין מחלקות. הוסף את הראשונה למטה.</div>';
  $('#clubTeams').onclick=async e=>{const b=e.target.closest('[data-board]');if(b){curTeam={...d.teams[+b.dataset.board],club:c.name};go('coach');return}const cp=e.target.closest('[data-copy]');if(cp)copyTxt(cp.dataset.copy);
    const ec=e.target.closest('[data-ecteam]');if(ec){const t=d.teams.find(x=>x.id===ec.dataset.ecteam);codeSheet('קודים של '+t.name,[{id:'p',label:'קוד שחקנים',val:t.code},{id:'c',label:'קוד מאמן',val:t.coach_code}],async v=>{await DB.setTeamCodes(t.id,v.p,v.c);renderClub()});return}
    const rc=e.target.closest('[data-recode]');if(rc){try{await DB.resetTeamCodes(rc.dataset.recode);toast('נוצרו קודים חדשים');renderClub()}catch(er){toast(errText(er))}}};
  $('#ctAdd').onclick=async()=>{const n=$('#ctName').value.trim();if(!n){$('#ctErr').textContent='מה שם המחלקה?';return}$('#ctErr').textContent='';
    try{await DB.createTeam(c.id,n);$('#ctName').value='';toast('המחלקה נוצרה');renderClub()}catch(e){$('#ctErr').textContent=errText(e)}};
  const P=peopleStats(d.people,d.ses);
  $('#clubBoard').innerHTML=P.length?`<thead><tr><th>שחקן</th><th>מחלקה</th><th>מדד</th>${Object.values(DOMAINS).map(x=>`<th>${x.name}</th>`).join('')}<th>שיפור</th><th>30 ימים</th><th>אחרון</th><th></th></tr></thead><tbody>${[...P].sort((a,b)=>(b.ov??-1)-(a.ov??-1)).map(x=>`<tr data-uid="${x.id}"><td><span class="av on">${esc((x.full_name||'?').trim()[0])}</span><b>${esc(x.full_name||'')}</b></td><td>${esc(tName(x.team_id))}</td><td class="num">${x.ov??'-'}</td>${Object.keys(DOMAINS).map(k=>`<td class="num">${x.prof[k]??'-'}</td>`).join('')}<td class="num">${x.imp!=null?trend(x.imp):'-'}</td><td class="num">${x.n30}</td><td>${ago(x.last)}</td><td>${waBtn(x.phone,`היי ${(x.full_name||'').split(' ')[0]}! `)}</td></tr>`).join('')}</tbody>`:'<tr><td class="empty">עוד אין שחקנים במועדון.</td></tr>';
  $('#clubBoard').onclick=e=>{if(e.target.closest('a'))return;const tr=e.target.closest('[data-uid]');if(tr)openPlayer(tr.dataset.uid,clubCtx)};
  paintIcons($('#v-club'))}
function teamCard(t,coach,n,i){const cl=appLink('coach-'+t.coach_code),pl=appLink('join-'+t.code);
  return `<div class="tcard"><div class="tcard-h"><div><b>${esc(t.name)}</b><small>${coach?'מאמן: '+esc(coach.full_name):'עוד אין מאמן'} · ${n} שחקנים</small></div><button class="btn btn-w sm" data-board="${i}">${I('table')} כניסה</button></div>
    <div class="codes"><div><span class="note">קוד מאמן</span><b class="mono">${t.coach_code}</b></div><div><span class="note">קוד שחקנים</span><b class="mono">${t.code}</b></div>${canEditCodes()?codeBtn('data-ecteam',t.id):''}</div>
    <div class="row2">${coach?`<button class="btn btn-o sm" data-copy="${pl}">${I('copy')} קישור לשחקנים</button>`:`<a class="btn btn-g sm" href="${wa(`היי! אתה מוזמן לאמן את "${t.name}" ב-BrainBall.\nקוד מאמן: ${t.coach_code}\nנרשמים כאן: ${cl}`)}" target="_blank" rel="noopener">${I('chat')} הזמן מאמן</a>`}<a class="btn btn-o sm" href="${wa(`מצטרפים לקבוצה "${t.name}" ב-BrainBall.\nקוד הקבוצה: ${t.code}\nנרשמים כאן: ${pl}`)}" target="_blank" rel="noopener">${I('chat')} הזמן שחקנים</a></div>
    <button class="link-btn dim" data-recode="${t.id}">יצירת קודים חדשים</button></div>`}

/* ================= system admin ================= */
let scLogoUrl='';tabs('sysTabs');
$('#scLogo').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{scLogoUrl=await logoData(f);$('#scLogoTxt').textContent=f.name}catch(err){$('#scLogoTxt').textContent='התמונה לא נטענה'}};
async function renderSys(){if(!DB.ok())return;$('#sysIns').innerHTML='<div class="empty">טוען נתונים...</div>';
  const [clubs,all]=await Promise.all([DB.clubs().catch(()=>[]),DB.allData(90).catch(()=>({people:[],ses:[]}))]);
  const wk=Date.now()-7*864e5,players=all.people.filter(p=>p.role==='player'),pend=clubs.filter(c=>c.status==='pending');
  const byClub=groupBy(players,p=>p.club_id||'none'),sesByUser=groupBy(all.ses,r=>r.user_id);
  const clubRow=c=>{const pl=byClub[c.id]||[],ses=pl.flatMap(p=>sesByUser[p.id]||[]),act=pl.filter(p=>(sesByUser[p.id]||[]).some(r=>+new Date(r.created_at)>wk)).length;return{pl:pl.length,act,s7:ses.filter(r=>+new Date(r.created_at)>wk).length,ov:overall(profileOf(ses))}};
  const freeP=(byClub.none||[]).length;
  $('#sysIns').innerHTML=`${pend.length?`<div class="notice">${pend.length} מועדונים מחכים לאישור. <button class="link-btn" id="goPend">לאישור</button></div>`:''}
    <div class="kpis">${kpi(clubs.filter(c=>c.status==='active').length,'מועדונים פעילים',`${clubs.length} בסך הכל`)}${kpi(players.length,'שחקנים',`${freeP} בלי מועדון`)}</div>
    ${insightHTML(players.map(p=>({...p,full_name:''})),all.ses,{title:'כל המערכת',showPlayers:false})}
    <div class="panel"><div class="panel-h"><b>מועדונים</b><span class="note">לחץ לכניסה</span></div><div class="board-wrap"><table class="board"><thead><tr><th>מועדון</th><th>סטטוס</th><th>שחקנים</th><th>פעילים השבוע</th><th>אימונים השבוע</th><th>מדד</th></tr></thead><tbody>${clubs.map(c=>{const r=clubRow(c);return `<tr data-club="${c.id}"><td>${c.logo?`<img class="clogo sm" src="${c.logo}" alt="">`:`<span class="av">${esc(c.name[0])}</span>`}<b>${esc(c.name)}</b></td><td><span class="pill ${c.status}">${{active:'פעיל',pending:'ממתין',suspended:'מושהה'}[c.status]}</span></td><td class="num">${r.pl}</td><td class="num">${r.act}</td><td class="num">${r.s7}</td><td class="num">${r.ov??'-'}</td></tr>`}).join('')||'<tr><td class="empty">עוד אין מועדונים.</td></tr>'}</tbody></table></div></div>`;
  $('#sysIns').onclick=e=>{const r=e.target.closest('[data-club]');if(r){curClub=clubs.find(c=>c.id===r.dataset.club);go('club')}if(e.target.id==='goPend')showTab('sysTabs','clubs')};
  $('#sysClubs').innerHTML=[...pend,...clubs.filter(c=>c.status!=='pending')].map(c=>{const r=clubRow(c);return `<div class="tcard"><div class="tcard-h">${c.logo?`<img class="clogo" src="${c.logo}" alt="">`:`<span class="av">${esc(c.name[0])}</span>`}<div><b>${esc(c.name)}</b><small><span class="pill ${c.status}">${{active:'פעיל',pending:'מחכה לאישור',suspended:'מושהה'}[c.status]}</span> · ${r.pl} שחקנים · ${c.manager_id?'יש מנהל':'אין מנהל עדיין'}</small></div><button class="btn btn-w sm" data-enter="${c.id}">כניסה</button></div>
    <div class="codes"><div><span class="note">קוד מנהל מועדון</span><b class="mono">${c.code}</b></div>${codeBtn('data-ecclub',c.id)}</div>
    <div class="row2">${c.status==='active'?`<button class="btn btn-o sm" data-st="${c.id}|suspended">השהה</button>`:`<button class="btn btn-g sm" data-st="${c.id}|active">${I('check')} אשר</button>`}<a class="btn btn-o sm" href="${wa(`שלום! המועדון "${c.name}" נפתח ב-BrainBall.\nקוד מנהל: ${c.code}\nנרשמים כאן כמנהל מועדון: ${appLink('club-'+c.code)}`)}" target="_blank" rel="noopener">${I('chat')} שלח למנהל</a></div></div>`}).join('')||'<div class="empty">עוד אין מועדונים.</div>';
  $('#sysClubs').onclick=async e=>{const ecb=e.target.closest('[data-ecclub]');if(ecb){const c=clubs.find(x=>x.id===ecb.dataset.ecclub);codeSheet('קוד מנהל של '+c.name,[{id:'c',label:'קוד',val:c.code}],async v=>{await DB.setClubCode(c.id,v.c);renderSys()});return}
    const en=e.target.closest('[data-enter]');if(en){curClub=clubs.find(c=>c.id===en.dataset.enter);go('club');return}
    const s=e.target.closest('[data-st]');if(s){const [id,st]=s.dataset.st.split('|');try{await DB.setClubStatus(id,st);toast('עודכן');renderSys()}catch(er){toast(errText(er))}}};
  paintIcons($('#v-sys'))}
$('#scAdd').onclick=async()=>{const n=$('#scName').value.trim(),err=$('#scErr');if(!n){err.textContent='מה שם המועדון?';return}err.textContent='';
  try{const c=await DB.createClub(n,scLogoUrl,$('#scTeams').value.split('\n').map(x=>x.trim()).filter(Boolean));$('#scName').value='';$('#scTeams').value='';scLogoUrl='';$('#scLogoTxt').textContent='בחר תמונה';toast('המועדון נוצר');curClub=c;go('club')}catch(e){err.textContent=errText(e)}};

/* ================= system admin: see the app as a player or as a club manager ================= */
function paintVa(){const bar=$('#vaBar');if(!isAdmin()||!viewAs){bar.hidden=true;document.body.classList.remove('va-on');return}
  bar.hidden=false;document.body.classList.add('va-on');$('#vaTxt').textContent=viewAs.mode==='player'?'צפייה כשחקן':'צפייה כמנהל מועדון · '+(curClub?.name||'')}
$('#vaExit').onclick=()=>{viewAs=null;curClub=null;curTeam=null;go('account')};
$('#vaPlayer').onclick=()=>{viewAs={mode:'player'};curClub=null;curTeam=null;go('home')};
$('#vaManager').onclick=async()=>{let clubs=[];try{clubs=await DB.clubs()}catch(e){}
  if(!clubs.length){toast('עוד אין מועדונים לצפייה');return}
  $('#pSheetBody').innerHTML=`<div class="sheet-h"><div><h2 style="font-size:22px">איזה מועדון?</h2></div><button class="icon-btn" data-close aria-label="סגור">✕</button></div><div class="pickclub">${clubs.map(c=>`<button class="btn btn-o full" data-pc="${c.id}">${esc(c.name)}</button>`).join('')}</div>`;$('#pSheet').hidden=false;
  $('#pSheetBody').onclick=e=>{const b=e.target.closest('[data-pc]');if(!b)return;curClub=clubs.find(c=>c.id===b.dataset.pc);curTeam=null;viewAs={mode:'manager',clubId:curClub.id};$('#pSheet').hidden=true;go('club')}};
