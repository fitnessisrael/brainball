/* ================= field mode (ball sequence) ================= */
const PALETTE=[['#00E0FF','תכלת'],['#FF2BD6','ורוד'],['#3DF59A','ירוק'],['#FFE14D','צהוב'],['#FF7A1A','כתום'],['#AA44FF','סגול'],['#FF3B3B','אדום'],['#2F6BFF','כחול'],['#FFFFFF','לבן']];
const ARROWS4=['←','→','↑','↓'],ARROWS8=['←','→','↑','↓','↖','↗','↙','↘'];
const FLV={beginner:['colors'],plus:['colors','arrows'],pro:['colors','arrows','numbers']};
const FLV_NOTE={beginner:'צבעים בלבד',plus:'צבעים וחיצים',pro:'צבעים, חיצים ומספרים'};
let fCfg=Object.assign({mode:'timed',dur:45,level:'plus',pace:3000,types:null,sets:1,rest:30,tap:false,colors:PALETTE.slice(0,5).map(c=>c[0]),nums:4,diag:false},S.get('field3',{}));
const fTypes=()=>fCfg.types||FLV[fCfg.level];
function fPool(){const p=[];const t=fTypes();
  if(t.includes('colors'))fCfg.colors.forEach(v=>p.push({t:'colors',v}));
  if(t.includes('arrows'))(fCfg.diag?ARROWS8:ARROWS4).forEach(v=>p.push({t:'arrows',v}));
  if(t.includes('numbers'))for(let i=1;i<=fCfg.nums;i++)p.push({t:'numbers',v:String(i)});return p}
function fPaint(p,el,symEl){el.style.background=p.t==='colors'?p.v:'#0B0B0F';symEl.textContent=p.t==='colors'?'':p.v;symEl.style.color=p.t==='numbers'?'#00E0FF':'#fff'}
let fDemo=null;
function renderField(){
  const set=(id,v)=>$$('#'+id+' [data-v]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v)===String(v)));
  set('fMode',fCfg.mode);set('fDur',fCfg.dur);set('fLevel',fCfg.level);set('fPace',fCfg.pace);set('fNums',fCfg.nums);
  $('#rowDur').hidden=fCfg.mode!=='timed';$('#rowSets').hidden=fCfg.mode!=='timed';$('#rowRest').hidden=fCfg.mode!=='timed'||fCfg.sets<2;
  $('#lvNote').textContent=FLV_NOTE[fCfg.level]+(fCfg.types?' · שונה בהגדרות הנוספות':'');
  $$('#fTypes .chip').forEach(b=>b.setAttribute('aria-pressed',fTypes().includes(b.dataset.t)));
  $('#fColors').innerHTML=PALETTE.map(([c,n])=>`<button class="swatch" data-col="${c}" aria-pressed="${fCfg.colors.includes(c)}" aria-label="${n}" style="--c:${c}"><i></i><span>${n}</span></button>`).join('');
  $('#fDiag').setAttribute('aria-pressed',fCfg.diag);
  $('#fSets').value=fCfg.sets;$('#fSetsV').textContent=fCfg.sets;$('#fRest').value=fCfg.rest;$('#fRestV').textContent=fCfg.rest;
  $('#fTap').setAttribute('aria-pressed',fCfg.tap);$('#fStart').disabled=!fPool().length;
  const saved=S.get('fieldSets',[]);$('#fSaved').innerHTML=saved.length?saved.map((s,i)=>`<span class="saved-set"><button data-load="${i}">${esc(s.name)}</button><button data-del="${i}" aria-label="מחק">${I('trash')}</button></span>`).join(''):'<span class="note">עוד אין סטים שמורים.</span>';
  clearInterval(fDemo);let prev=null;const step=()=>{const pool=fPool();if(!pool.length)return;let p;do{p=pick(pool)}while(pool.length>1&&p===prev);prev=p;fPaint(p,$('#demo'),$('#demoSym'))};
  $('#demoLbl').textContent=`ככה זה ייראה: החלפה כל ${fCfg.pace/1000} ${fCfg.pace===1000?'שנייה':'שניות'}`;step();
  fDemo=setInterval(()=>{if(!$('#v-field').classList.contains('on'))return clearInterval(fDemo);step()},fCfg.pace)}
function enterField(){say(VO.field)}
const saveF=()=>{S.set('field3',fCfg);renderField()};
[['fMode','mode'],['fDur','dur'],['fLevel','level'],['fPace','pace'],['fNums','nums']].forEach(([id,k])=>$('#'+id).onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;
  fCfg[k]=['dur','pace','nums'].includes(k)?+b.dataset.v:b.dataset.v;if(k==='level')fCfg.types=null;saveF()});
$('#fTypes').onclick=e=>{const b=e.target.closest('.chip');if(!b)return;const cur=[...fTypes()],t=b.dataset.t;fCfg.types=cur.includes(t)?cur.filter(x=>x!==t):[...cur,t];saveF()};
$('#fColors').onclick=e=>{const b=e.target.closest('[data-col]');if(!b)return;const c=b.dataset.col;fCfg.colors=fCfg.colors.includes(c)?fCfg.colors.filter(x=>x!==c):[...fCfg.colors,c];if(!fCfg.colors.length)fCfg.colors=[c];saveF()};
$('#fDiag').onclick=()=>{fCfg.diag=!fCfg.diag;saveF()};
$('#fSets').oninput=e=>{fCfg.sets=+e.target.value;saveF()};$('#fRest').oninput=e=>{fCfg.rest=+e.target.value;saveF()};
$('#fTap').onclick=()=>{fCfg.tap=!fCfg.tap;saveF()};
$('#fSetSave').onclick=()=>{const n=$('#fSetName').value.trim()||`סט ${S.get('fieldSets',[]).length+1}`;const a=S.get('fieldSets',[]);a.push({name:n,cfg:JSON.parse(JSON.stringify(fCfg))});S.set('fieldSets',a.slice(-12));$('#fSetName').value='';renderField()};
$('#fSaved').onclick=e=>{const a=S.get('fieldSets',[]),l=e.target.closest('[data-load]'),d=e.target.closest('[data-del]');
  if(l){fCfg=Object.assign({},fCfg,a[+l.dataset.load].cfg);saveF()}if(d){a.splice(+d.dataset.del,1);S.set('fieldSets',a);renderField()}};
$('#fMoreBtn').onclick=()=>{const m=$('#fMore');m.hidden=!m.hidden;$('#fMoreBtn').setAttribute('aria-expanded',String(!m.hidden));$('#fMoreBtn').innerHTML=(m.hidden?'הגדרות נוספות':'הסתר הגדרות')};
$('#fStart').onclick=async()=>{clearInterval(fDemo);ac();hush();
  try{await document.documentElement.requestFullscreen?.()}catch(e){}
  play.hidden=false;play.classList.add('bare');document.body.style.overflow='hidden';newRun();RUN.bg=true;RUN.meta={id:'field',lv:fCfg.level};keepAwake();
  const pool=fPool(),free=fCfg.mode==='free',sets=free?1:fCfg.sets;let shown=0,active=0,prev=null;const t00=performance.now();RUN.t0=t00;
  const finish=(partial)=>{play.classList.remove('bare');hud('סיום',1);clock(null);releaseWake();
    stageHTML(`<div class="res"><div class="k">קוד המגרש · ${LV[fCfg.level]}</div><div class="main grad">${mmss(active)}</div><div class="cap">${shown} החלפות · כל ${fCfg.pace/1000} שניות</div>
      <p style="margin:0 0 10px">איך הלך?</p><div class="acts"><button class="btn btn-g full" data-rep="done">ביצעתי הכל</button><button class="btn btn-o full" data-rep="partial">חלקית</button><button class="btn btn-o full" data-rep="no">לא הפעם</button></div>
      <p class="note" style="margin-top:12px">זה דיווח שלך. האפליקציה לא מודדת את העבודה עם הכדור.</p></div>`,'scroll');
    stage.onclick=e=>{const b=e.target.closest('[data-rep]');if(!b)return;stage.onclick=null;
      record({id:'field',level:fCfg.level,primary:active,disp:mmss(active),dur:active,partial:partial||b.dataset.rep!=='done',label:{done:'בוצע',partial:'בוצע חלקית',no:'לא בוצע'}[b.dataset.rep]+` · ${shown} החלפות`,src:'self_report'});closePlay()}};
  RUN.onQuit=()=>{active=Math.round((performance.now()-t00)/1000);stopRun();newRun();RUN.active=false;finish(!free)};
  try{
    for(let set=1;set<=sets;set++){
      for(const n of[3,2,1]){stageHTML(`<div class="cd" style="color:var(--cyan)">${n}</div>`,'full');sfx.tick();await sleep(800)}sfx.go();
      stageHTML(`<div class="fscreen" id="fs"><span class="sym" id="fsSym"></span></div><div class="cvbar"><button class="btn btn-o end-pill" id="fEnd">סיום ושמירה</button></div>`,'full');const fs=$('#fs'),sym=$('#fsSym');
      $('#fEnd').onclick=()=>$('#quit').click();
      const end=free?Infinity:performance.now()+fCfg.dur*1000,setStart=performance.now();
      const ci=setInterval(()=>{const now=performance.now();clock(free?(now-t00)/1000:(end-now)/1000)},200);RUN.timers.push(ci);
      while(performance.now()<end){let p;do{p=pick(pool)}while(pool.length>1&&p.v===prev);prev=p.v;shown++;fPaint(p,fs,sym);sfx.swap();
        hud(sets>1?`סט ${set}/${sets}`:'',free?0:(set-1+(performance.now()-setStart)/(fCfg.dur*1000))/sets);
        if(fCfg.tap)await waitInput(free?null:end-performance.now(),v=>v.kind==='tap');else await sleep(free?fCfg.pace:Math.min(fCfg.pace,Math.max(0,end-performance.now())))}
      clearInterval(ci);active+=fCfg.dur;
      if(set<sets){const re=performance.now()+fCfg.rest*1000;while(performance.now()<re){const l=(re-performance.now())/1000;clock(l);
        stageHTML(`<div><div class="st-big">מנוחה, נשימה</div><div class="cd grad" style="font-size:min(40vw,40vh)">${Math.ceil(l)}</div><div class="st-sub">סט ${set+1} מתוך ${sets} מגיע</div></div>`);hud('מנוחה',set/sets);await sleep(250)}}}
    RUN.onQuit=null;RUN.active=false;sfx.go();finish(false);
  }catch(e){if(e!=='cancel')console.error(e)}};
