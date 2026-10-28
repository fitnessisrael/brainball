/* ================= play engine ================= */
let RUN=null;const stage=$('#stage'),play=$('#play');
function hud(t,p){$('#hudTxt').textContent=t||'';$('#progBar').style.width=((p||0)*100)+'%'}
function clock(sec){const c=$('#clock');if(sec==null){c.hidden=true;return}c.hidden=false;c.textContent=mmss(sec)}
function stageHTML(h,cls=''){stage.className=cls;stage.style.background='';stage.innerHTML=h}
function newRun(){RUN={cancel:false,timers:[],fns:[],input:null,active:true};return RUN}
function chk(){if(!RUN||RUN.cancel)throw'cancel'}
const chkR=r=>{if(!r||r.cancel||r!==RUN)throw'cancel'};
const sleep=ms=>{const r=RUN;return new Promise(res=>{r.timers.push(setTimeout(res,ms));r.fns.push(res)}).then(()=>chkR(r))};
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(performance.now()))));
function waitInput(ms,accept=()=>true){const r=RUN;return new Promise(res=>{let done=false;
  const fin=v=>{if(done)return;done=true;clearTimeout(to);if(r.input===h)r.input=null;res(v)};
  const h=v=>{if(accept(v))fin(v)};r.input=h;const to=ms==null?null:setTimeout(()=>fin({timeout:true,t:performance.now()}),ms);r.fns.push(()=>fin({cancel:true}))}).then(v=>{chkR(r);return v})}
let lastPt=null;
stage.addEventListener('pointerdown',e=>{lastPt={x:e.clientX,y:e.clientY};if(!RUN||!RUN.input)return;const b=e.target.closest('[data-c]');
  const now=performance.now(),t=(e.timeStamp>now-300&&e.timeStamp<=now)?e.timeStamp:now;RUN.input(b?{kind:'btn',v:b.dataset.c,t}:{kind:'tap',t});if(b)e.preventDefault()});

/* every training is kept on the phone (also partial ones) and queued for the server */
function record(r){const row={cid:uid(),id:r.id,level:r.level,date:r.date||Date.now(),primary:r.primary??null,disp:r.disp||'',label:r.label||'',lowerBetter:!!r.lowerBetter,src:r.src||'auto',partial:!!r.partial,dur:r.dur||null};
  hist.push(row);S.set('hist',hist.slice(-2000));DB.queue(row);
  if(!row.partial){if(hwTask&&hwTask.id===row.id&&hwTask.level===row.level)S.set('hwdone_'+hwTask.key,true);
    (window.TASKS||[]).filter(t=>!t.done&&t.game===row.id).forEach(t=>{t.done=true;DB.markDone(t.id).catch(()=>{})})}
  return row}
function savePartial(){const r=RUN;if(!r||!r.meta||r.saved||!r.t0)return;const dur=Math.round((performance.now()-r.t0)/1000);if(dur<5)return;r.saved=true;
  record({id:r.meta.id,level:r.meta.lv,partial:true,dur,disp:mmss(dur),label:'אימון שלא הושלם',src:CAT[r.meta.id]?.cam?'camera':'auto'})}
function stopRun(){clearTimeout(demoTimer);hush();if(!RUN)return;RUN.cancel=true;(RUN.timers||[]).forEach(clearTimeout);(RUN.fns||[]).forEach(f=>f());RUN.fns=[];if(RUN.raf)cancelAnimationFrame(RUN.raf);if(RUN.amb){RUN.amb.stop();RUN.amb=null}if(RUN.rec&&RUN.rec.state==='recording')try{RUN.rec.stop()}catch(e){}camStop()}
function closePlay(){if(RUN?.active)savePartial();stopRun();RUN=null;play.hidden=true;play.classList.remove('bare');clock(null);document.body.style.overflow='';releaseWake();try{document.fullscreenElement&&document.exitFullscreen()}catch(e){}
  const v=$('.view.on')?.id?.slice(2);if(v)go(['coach','club','admin','sys'].includes(v)?'home':v)}
$('#quit').onclick=()=>{if(RUN&&RUN.onQuit){const f=RUN.onQuit;RUN.onQuit=null;f()}else closePlay()};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&RUN&&RUN.active&&!RUN.bg){savePartial();stopRun();RUN={cancel:true};clock(null);
  stageHTML(`<div class="st-big">האימון נעצר</div><div class="st-sub">יצאת מהאפליקציה באמצע. שמרנו אותו כאימון חלקי.</div><div style="margin-top:20px"><button class="btn btn-g" id="bk">חזרה</button></div>`);$('#bk').onclick=closePlay}});
let wake=null;async function keepAwake(){try{wake=await navigator.wakeLock?.request('screen')}catch(e){}}
function releaseWake(){try{wake&&wake.release()}catch(e){}wake=null}

const lvName=(g,k)=>g.lvNames?.[k]||LV[k];
const lvButtons=(g,lv)=>Object.entries(g.levels).map(([k,v])=>`<button data-lv="${k}" aria-pressed="${k===lv}"><b>${lvName(g,k)}</b>${v.lbl?`<small>${v.lbl}</small>`:''}</button>`).join('');
function openIntro(id,lvForced){const g=CAT[id];let lv=lvForced||S.get('lv_'+id,'beginner');let rec=S.get('rec',false);
  play.hidden=false;document.body.style.overflow='hidden';hud('',0);clock(null);
  stageHTML(`<div class="intro"><div class="intro-top"><span class="area">${g.cam?'מצלמה · ':''}${AREAS[g.area]}</span><span class="intro-btns"><button class="heart" id="favBtn" aria-label="הוסף למועדפים" aria-pressed="false"></button><button class="vo-btn" id="voBtn" aria-label="הסבר קולי"></button></span></div><h2>${g.name}</h2><p class="tagline">${g.tagline||g.desc}</p>
    <div class="demo" id="iDemo"></div><div class="demo-cap" id="iCap"></div>
    <ol>${g.how.map(x=>`<li>${x}</li>`).join('')}</ol>
    <div class="lv" id="lvSel">${lvButtons(g,lv)}</div>
    ${g.rec?`<div class="chips" style="margin-bottom:14px"><button class="chip" id="recChip" aria-pressed="${rec}">${I('rec')} להקליט סרטון 9:16 (עד דקה)</button></div>`:''}
    <button class="btn btn-g btn-xl full" id="goBtn">יאללה, מתחילים <span class="ar">←</span></button></div>`,'scroll');
  playDemo($('#iDemo'),$('#iCap'),DEMOS[id]||[]);
  const paintFav=()=>{const on=favs().includes(id);$('#favBtn').innerHTML=I('heart');$('#favBtn').setAttribute('aria-pressed',on)};paintFav();
  $('#favBtn').onclick=()=>{toggleFav(id);paintFav();toast(favs().includes(id)?'נוסף לאימונים המועדפים':'הוסר מהמועדפים')};
  const paintVo=()=>{$('#voBtn').innerHTML=I(voiceOn?'speaker':'mute');$('#voBtn').classList.toggle('off',!voiceOn)};paintVo();
  $('#voBtn').onclick=()=>{voiceOn=!voiceOn;S.set('voice',voiceOn);paintVo();if(voiceOn)say(VO[id]);else hush()};
  say(VO[id]);
  $('#lvSel').onclick=e=>{const b=e.target.closest('[data-lv]');if(!b)return;lv=b.dataset.lv;$$('#lvSel button').forEach(x=>x.setAttribute('aria-pressed',x===b))};
  if(g.rec)$('#recChip').onclick=()=>{rec=!rec;S.set('rec',rec);$('#recChip').setAttribute('aria-pressed',rec)};
  $('#goBtn').onclick=()=>{ac();hush();clearTimeout(demoTimer);S.set('lv_'+id,lv);start(id,lv,false,g.rec&&rec)}}
async function countdown(el){for(const n of[3,2,1]){if(el)el.innerHTML=`<div class="cd grad">${n}</div>`;else stageHTML(`<div class="cd grad">${n}</div>`);sfx.tick();await sleep(800)}sfx.go()}
async function runIt(id,lv,tapOnly,rec){newRun();RUN.tapOnly=tapOnly;RUN.recWanted=rec;RUN.meta={id,lv};keepAwake();const g=CAT[id];
  if(g.cam&&!g.pose&&!tapOnly){await camGate();await camStart()}
  if(!g.pose)await countdown();
  RUN.t0=performance.now();
  const res=await g.run(g.levels[lv],id);RUN.active=false;camStop();clock(null);Object.assign(res,{id,level:lv,date:Date.now(),dur:Math.round((performance.now()-RUN.t0)/1000)});
  if(g.cam&&!res.src)res.src=tapOnly?'auto':'camera';showResult(res)}
async function start(id,lv,tapOnly=false,rec=false){
  try{await runIt(id,lv,tapOnly,rec)}catch(e){clock(null);
    if(e==='nocam'){camStop();const g=CAT[id];stageHTML(`<div class="gate"><div class="lensbig">${I('camera')}</div><h2 style="font-size:26px">המצלמה לא נפתחה</h2><p class="st-sub" style="margin:0">באייפון: הגדרות > Safari > מצלמה > אפשר.<br>באנדרואיד: המנעול ליד הכתובת > הרשאות > מצלמה.</p><div style="display:grid;gap:10px;width:100%;max-width:360px"><button class="btn btn-g" id="retry">נסה שוב</button>${g.pose?'':'<button class="btn btn-o" id="tapMode">שחק בנגיעה במסך</button>'}<button class="btn btn-o" id="bk">חזרה</button></div></div>`,'scroll');
      $('#bk').onclick=closePlay;$('#retry').onclick=()=>start(id,lv,false,rec);if(!g.pose)$('#tapMode').onclick=()=>start(id,lv,true);return}
    if(e!=='cancel')console.error(e)}}
function practiceDone(){stageHTML(`<div class="st-big">החימום נגמר</div><div class="st-sub">מעכשיו זה נספר. בהצלחה!</div>`);return sleep(1200)}

function showResult(r){hud('סיום',1);clock(null);const g=CAT[r.id];
  const prev=[...hist].reverse().find(h=>h.id===r.id&&h.level===r.level&&!h.partial);let delta='';
  if(prev&&r.complete&&!r.flag&&r.unit!=null){const d=Math.round((r.primary-prev.primary)*100)/100,better=r.lowerBetter?d<0:d>0;
    delta=d===0?`<span class="delta up">בדיוק כמו בפעם הקודמת</span>`:`<span class="delta ${better?'up':'dn'}">${better?'שיפור של':'שינוי של'} ${Math.abs(d)}${r.unit} מהפעם הקודמת</span>`}
  const ok=r.complete&&!r.flag;record(ok?r:{...r,partial:true,disp:r.disp||mmss(r.dur||0),label:'אימון שלא הושלם'});
  let lv=r.level;
  stageHTML(`<div class="res"><div class="k">${g.name} · ${lvName(g,r.level)}</div><div class="main grad">${esc(r.disp)}</div>
    <div class="cap">${r.flag||r.label}${!ok&&!r.flag?' · נשמר כאימון חלקי':''}</div>${delta}
    <div class="grid">${(r.grid||[]).map(([a,b])=>`<div class="tile"><div class="l">${a}</div><div class="v" style="font-size:19px">${b}</div></div>`).join('')}</div>
    <div class="acts">${r.extra||''}
      <div class="again-box"><span class="note">הסיבוב הבא</span><div class="seg" id="agLv">${Object.keys(g.levels).map(k=>`<button data-lv="${k}" aria-pressed="${k===lv}">${lvName(g,k)}</button>`).join('')}</div>
      <button class="btn btn-g full" id="again">עוד סיבוב <span class="ar">↻</span></button></div>
      <button class="btn btn-o full" id="dare">${I('share')} אתגר חבר</button><button class="btn btn-o full" id="fin">סיום</button></div></div>`,'scroll');
  if(r.after)r.after();
  $('#agLv').onclick=e=>{const b=e.target.closest('[data-lv]');if(!b)return;lv=b.dataset.lv;S.set('lv_'+r.id,lv);$$('#agLv button').forEach(x=>x.setAttribute('aria-pressed',x===b))};
  $('#again').onclick=()=>start(r.id,lv,!!RUN?.tapOnly,!!RUN?.recWanted);$('#fin').onclick=closePlay;$('#dare').onclick=()=>shareApp(`עשיתי ${r.disp} ב"${g.name}".`)}
