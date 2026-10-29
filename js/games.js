/* ---------- reaction ---------- */
async function reactionTrial(){
  stageHTML(`<div class="fill" style="background:#17161f"><div class="st-big" style="color:var(--dim)">המתן...</div></div>`);
  let r=await waitInput(rnd(1500,4000),v=>v.kind==='tap');
  if(!r.timeout){sfx.bad();stageHTML(`<div class="fill" style="background:#2a0f1c"><div class="st-big">מוקדם מדי</div><div class="st-sub">חכה לכתום.</div></div>`);await sleep(900);return{res:'false_start'}}
  stageHTML(`<div class="fill" style="background:var(--stim)"><div class="dot"></div></div>`);const t0=await frame();chk();
  r=await waitInput(2000,v=>v.kind==='tap');
  if(r.timeout){stageHTML(`<div class="fill" style="background:#2a0f1c"><div class="st-big">פספסת</div></div>`);await sleep(800);return{res:'timeout'}}
  const rt=Math.round(r.t-t0);
  if(rt<100){stageHTML(`<div class="fill" style="background:#2a0f1c"><div class="st-big">ניחוש</div><div class="st-sub">פחות מ-100ms זה לא תגובה, זה מזל.</div></div>`);await sleep(900);return{res:'anticipation',rt}}
  stageHTML(`<div class="fill" style="background:#17161f"><div class="st-ms">${rt}<small style="font-size:.3em"> ms</small></div></div>`);await sleep(600);return{res:'ok',rt}}
async function runReaction(cfg){
  for(let i=0;i<3;i++){hud('חימום '+(i+1)+'/3',0);await reactionTrial()}await practiceDone();
  const tr=[],max=Math.ceil(cfg.n*1.5);let valid=0;
  while(valid<cfg.n&&tr.length<max){hud(valid+'/'+cfg.n,valid/cfg.n);const t=await reactionTrial();tr.push(t);if(t.res==='ok')valid++}
  const rts=tr.filter(t=>t.res==='ok').map(t=>t.rt),md=Math.round(median(rts)||0),c=k=>tr.filter(t=>t.res===k).length;
  return{succ:[valid,tr.length],primary:md,disp:md+' ms',unit:' ms',lowerBetter:true,complete:valid>=cfg.n,label:`זמן התגובה החציוני שלך ב-${rts.length} ניסיונות`,
    grid:[['ממוצע',Math.round(mean(rts))+' ms'],['הכי מהיר',(rts.length?Math.min(...rts):0)+' ms'],['יציבות',Math.round(sd(rts))+' ms'],['מוקדם / ניחוש',c('false_start')+c('anticipation')]]}}

/* ---------- choice ---------- */
function balanced(items,n){const a=[];for(let i=0;i<n;i++)a.push(items[i%items.length]);
  for(let t=0;t<200;t++){shuffle(a);let ok=true;for(let i=3;i<a.length;i++)if(a[i]===a[i-1]&&a[i]===a[i-2]&&a[i]===a[i-3]){ok=false;break}if(ok)break}return a}
function choiceBtns(dirs){return `<div class="choices ${dirs.length===2?'two':'four'}">`+dirs.map(d=>`<button class="cbtn" data-c="${d}" style="${dirs.length===4?'grid-area:'+d[0]+';':''}border-color:${ACOL[d]}66" aria-label="${d}">${arrowSVG(d,ACOL[d],'')}</button>`).join('')+'</div>'}
async function choiceTrial(dirs,d,cfg,practice){const btns=choiceBtns(dirs);
  stageHTML(`<div class="fill" style="padding-bottom:190px"><div class="fix">+</div></div>${btns}`);await sleep(rnd(400,700));
  let fl='';if(cfg.flank){fl=[[18,22],[70,18],[14,58],[74,54]].map(([x,y])=>`<div class="flank" style="left:${x}%;top:${y}%"><svg style="width:54px;height:54px" viewBox="0 0 100 100"><path d="${ARW[pick(['left','right','up','down'])]}" stroke="#8b84a0" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`).join('')}
  stageHTML(`<div class="fill" style="padding-bottom:190px">${fl}${arrowSVG(d,ACOL[d])}</div>${btns}`);const t0=await frame();chk();
  const r=await waitInput(cfg.win,v=>v.kind==='btn');const res=r.timeout?'timeout':(r.v===d?'correct':'incorrect');
  (res==='correct'?sfx.ok:sfx.bad)();stage.classList.add(res==='correct'?'flash-ok':'flash-no');await sleep(practice?450:220);stage.classList.remove('flash-ok','flash-no');
  return{res,rt:r.timeout?null:Math.round(r.t-t0)}}
async function runChoice(cfg){const dirs=cfg.opts===2?['left','right']:['left','up','down','right'];
  const pr=balanced(dirs,4);for(let i=0;i<4;i++){hud('חימום '+(i+1)+'/4',0);await choiceTrial(dirs,pr[i],cfg,true)}await practiceDone();
  const seq=balanced(dirs,cfg.n),tr=[];for(let i=0;i<seq.length;i++){hud((i+1)+'/'+seq.length,i/seq.length);tr.push(await choiceTrial(dirs,seq[i],cfg,false))}
  const ok=tr.filter(t=>t.res==='correct'),acc=Math.round(ok.length/tr.length*100),md=Math.round(median(ok.map(t=>t.rt))||0);
  return{succ:[ok.length,tr.length],primary:acc,disp:acc+'%',unit:'%',lowerBetter:false,complete:true,label:`דיוק. זמן תגובה חציוני בתשובות נכונות: ${md} ms`,
    grid:[['נכונות',ok.length+'/'+tr.length],['זמן תגובה',md+' ms'],['טעויות',tr.filter(t=>t.res==='incorrect').length],['לא הספקת',tr.filter(t=>t.res==='timeout').length]]}}

/* ---------- go / no-go ---------- */
async function gngTrial(go,cfg,practice){stageHTML(`<div class="fill"></div>`);await sleep(rnd(500,1000));
  stageHTML(`<div class="fill">${go?'<svg viewBox="0 0 100 100" style="width:min(50vw,220px)"><circle cx="50" cy="50" r="46" fill="#3DF59A"/></svg>':'<svg viewBox="0 0 100 100" style="width:min(50vw,220px)"><path d="M18 18L82 82M82 18L18 82" stroke="#FF4D6D" stroke-width="16" stroke-linecap="round"/></svg>'}</div>`);
  const t0=await frame();chk();const r=await waitInput(cfg.win,v=>v.kind==='tap');
  const res=go?(r.timeout?'miss':'hit'):(r.timeout?'correct_rejection':'false_alarm');
  if(res==='false_alarm'||res==='miss'||practice){const good=res==='hit'||res==='correct_rejection';(good?sfx.ok:sfx.bad)();stage.classList.add(good?'flash-ok':'flash-no');await sleep(250);stage.classList.remove('flash-ok','flash-no')}
  return{res,go,rt:r.timeout?null:Math.round(r.t-t0)}}
async function runGoNoGo(cfg){const pr=shuffle([1,1,1,0,0]);for(let i=0;i<5;i++){hud('חימום '+(i+1)+'/5',0);await gngTrial(!!pr[i],cfg,true)}await practiceDone();
  const nNo=Math.round(cfg.n*.3),seq=shuffle(Array(cfg.n-nNo).fill(1).concat(Array(nNo).fill(0))),tr=[];
  for(let i=0;i<seq.length;i++){hud((i+1)+'/'+seq.length,i/seq.length);tr.push(await gngTrial(!!seq[i],cfg,false))}
  const c=k=>tr.filter(t=>t.res===k).length,goN=tr.filter(t=>t.go).length,noN=tr.length-goN;
  const hr=Math.round(c('hit')/goN*100),fa=Math.round(c('false_alarm')/noN*100),md=Math.round(median(tr.filter(t=>t.res==='hit').map(t=>t.rt))||0),none=c('hit')+c('false_alarm')===0;
  return{succ:[c('hit')+noN-c('false_alarm'),goN+noN],primary:fa,disp:fa+'%',unit:'%',lowerBetter:true,complete:!none,flag:none?'לא נרשמה אף נגיעה, אז התוצאה לא נשמרה.':null,label:`נגיעות בטעות באדום (פחות זה יותר). פגיעות בירוק: ${hr}%`,
    grid:[['פגיעות בירוק',c('hit')+'/'+goN],['נגיעות באדום',c('false_alarm')+'/'+noN],['זמן תגובה',md+' ms'],['פספוסי ירוק',c('miss')]]}}

/* ---------- tracking ---------- */
async function runTracking(cfg){const {cv,cx,W,H}=canvasStage();const total=10,practice=2,rounds=[];
  for(let rd=0;rd<total+practice;rd++){const isP=rd<practice;hud(isP?`חימום ${rd+1}/${practice}`:`סיבוב ${rd-practice+1}/${total}`,isP?0:(rd-practice)/total);
    const short=Math.min(W,H-120),R=Math.max(short*.03,12),top=70,bot=H-96,bs=spawn(cfg.n,R+6,W,top,bot);bs.forEach((b,i)=>{b.t=i<cfg.k;b.sel=false});
    const draw=mode=>{cx.clearRect(0,0,W,H);for(const b of bs){let c='#d9d4e8';if(mode==='show'&&b.t)c='#FF2BD6';if(mode==='pick'&&b.sel)c='#00E0FF';
      if(mode==='reveal')c=b.t?(b.sel?'#3DF59A':'#FF2BD6'):(b.sel?'#FF4D6D':'#4b4660');cx.beginPath();cx.arc(b.x,b.y,R,0,7);cx.fillStyle=c;cx.fill();if(mode==='reveal'&&b.t){cx.lineWidth=3;cx.strokeStyle='#fff';cx.stroke()}}};
    $('#cvMsg').textContent='זכור את הוורודים';$('#cvBar').innerHTML='';draw('show');await sleep(2000);$('#cvMsg').textContent='';
    const end=performance.now()+cfg.dur*1000,speed=cfg.spd*short;
    await animate((dt,now)=>{moveBalls(bs,R+6,W,top,bot,speed,dt);
      for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++){const a=bs[i],c=bs[j],dx=c.x-a.x,dy=c.y-a.y,d=Math.hypot(dx,dy);
        if(d<R*2.2&&d>0){const nx=dx/d,ny=dy/d,p=(a.vx-c.vx)*nx+(a.vy-c.vy)*ny;if(p>0){a.vx-=p*nx;a.vy-=p*ny;c.vx+=p*nx;c.vy+=p*ny}const n1=Math.hypot(a.vx,a.vy)||1,n2=Math.hypot(c.vx,c.vy)||1;a.vx/=n1;a.vy/=n1;c.vx/=n2;c.vy/=n2}}
      draw('move');return now<end});
    $('#cvMsg').textContent=`בחר ${cfg.k} כדורים`;$('#cvBar').innerHTML=`<button class="btn btn-g" data-c="ok" id="okB" disabled>אישור</button>`;draw('pick');
    const deadline=performance.now()+15000;let confirmed=false;const cnt=()=>bs.filter(b=>b.sel).length;const ci=setInterval(()=>clock((deadline-performance.now())/1000),200);RUN.timers.push(ci);
    while(!confirmed){const r=await waitInput(Math.max(0,deadline-performance.now()));if(r.timeout)break;
      if(r.kind==='btn'){if(cnt()===cfg.k)confirmed=true;continue}
      const rc=cv.getBoundingClientRect(),[b,d]=nearest(bs,lastPt.x-rc.left,lastPt.y-rc.top);
      if(b&&d<Math.max(R*1.6,26)){if(b.sel)b.sel=false;else if(cnt()<cfg.k)b.sel=true}draw('pick');$('#okB').disabled=cnt()!==cfg.k}
    clearInterval(ci);clock(null);const hit=bs.filter(b=>b.t&&b.sel).length;draw('reveal');(hit===cfg.k?sfx.ok:sfx.bad)();$('#cvMsg').textContent=confirmed?`${hit} מתוך ${cfg.k}`:'נגמר הזמן';$('#cvBar').innerHTML='';
    if(!isP)rounds.push({hit,done:confirmed});await sleep(1300)}
  const tg=rounds.reduce((p,r)=>p+r.hit,0),all=total*cfg.k,pct=Math.round(tg/all*100);stage.className='';
  return{succ:[tg,all],primary:pct,disp:pct+'%',unit:'%',lowerBetter:false,complete:true,label:`כדורים נכונים מתוך ${all} ב-${total} סיבובים`,
    grid:[['כדורים נכונים',tg+'/'+all],['סיבובים מושלמים',rounds.filter(r=>r.hit===cfg.k&&r.done).length+'/'+total],['לא הושלמו בזמן',rounds.filter(r=>!r.done).length],['מהירות',cfg.spd]]}}

/* ---------- sweeper ---------- */
async function runSweeper(cfg){const {cv,cx,W,H}=canvasStage();let level=cfg.start,score=0,hits=0,miss=0,streak=0;const rts=[],end=performance.now()+cfg.sec*1000;
  const short=Math.min(W,H-80),top=76,bot=H-20;
  while(performance.now()<end){const n=Math.min(6+level*2,24),R=Math.max(short*(.055-level*.0025),15),odd=Math.random()*n|0;
    const hueShift=Math.max(22,80-level*6),sizeMul=1+Math.max(.18,.55-level*.04),kind=pick(['hue','size','both']);
    const bs=spawn(n,R*1.6,W,top,bot),hue=pick([280,200,320,150,30]);bs.forEach((b,i)=>{b.o=i===odd});const t0=performance.now();let picked=null;
    const draw=()=>{cx.clearRect(0,0,W,H);for(const b of bs){const h=b.o&&kind!=='size'?hue+hueShift:hue,r=b.o&&kind!=='hue'?R*sizeMul:R;cx.beginPath();cx.arc(b.x,b.y,r,0,7);cx.fillStyle=`hsl(${h},90%,60%)`;cx.fill()}};
    RUN.input=v=>{if(v.kind==='tap')picked=v};
    await animate((dt,now)=>{moveBalls(bs,R*1.6,W,top,bot,short*(.07+level*.018),dt);draw();clock((end-now)/1000);hud(`רמה ${level} · ${score} נקודות`,1-(end-now)/(cfg.sec*1000));return !picked&&now<end});
    RUN.input=null;if(!picked)break;
    const rc=cv.getBoundingClientRect(),[b,d]=nearest(bs,lastPt.x-rc.left,lastPt.y-rc.top);
    if(b&&b.o&&d<R*2.2){score+=10;hits++;streak++;rts.push(performance.now()-t0);sfx.ok();const up=streak%3===0;if(up)level++;
      $('#okm').innerHTML=`<div>✓<small>+10 · ${score}</small>${up?`<small style="color:var(--cyan)">רמה ${level}</small>`:''}</div>`;await sleep(650);$('#okm').innerHTML=''}
    else{score=Math.max(0,score-5);miss++;streak=0;sfx.bad();$('#cvMsg').textContent=`-5 · ${score}`;await sleep(450);$('#cvMsg').textContent=''}}
  stage.className='';clock(null);
  return{succ:hits+miss?[hits,hits+miss]:null,primary:score,disp:score+' נק\'',unit:' נק\'',lowerBetter:false,complete:true,label:`ניקוד ב-${cfg.sec} שניות. הגעת לרמה ${level}`,
    grid:[['זיהויים נכונים',hits],['טעויות',miss],['רמה אחרונה',level],['זמן זיהוי',(rts.length?(median(rts)/1000).toFixed(1):'-')+' s']]}}

/* ---------- peripheral ---------- */
async function runPeriph(cfg){const pos=Array.from({length:8},(_,i)=>{const a=i/8*Math.PI*2-Math.PI/2;return[50+Math.cos(a)*38,50+Math.sin(a)*38]});
  const ring=sel=>`<div class="ring" style="position:absolute;inset:0">${pos.map(([x,y],i)=>`<button data-c="${i}" style="position:absolute;width:64px;height:64px;margin:-32px 0 0 -32px;border-radius:50%;border:2px solid rgba(255,255,255,.2);background:${sel===i?'var(--go)':'rgba(255,255,255,.05)'};left:${x}%;top:${y}%" aria-label="מיקום ${i+1}"></button>`).join('')}</div>`;
  const ctr=`<div style="position:absolute;left:50%;top:50%;width:18px;height:18px;margin:-9px;border-radius:50%;background:#fff"></div>`;
  const box=inner=>`<div style="position:relative;width:min(92vw,62vh);aspect-ratio:1">${ctr}${inner}</div>`;let ok=0;const rts=[];
  for(let i=0;i<cfg.n+3;i++){const p=i<3;hud(p?`חימום ${i+1}/3`:`${i-2}/${cfg.n}`,p?0:(i-3)/cfg.n);const target=Math.random()*8|0;
    stageHTML(box(''));await sleep(rnd(700,1300));const [x,y]=pos[target];
    stageHTML(box(`<div style="position:absolute;left:${x}%;top:${y}%;width:46px;height:46px;margin:-23px;border-radius:50%;background:var(--magenta)"></div>`));
    await sleep(cfg.flash);stageHTML(box(ring()));const t0=await frame();chkR(RUN);
    const r=await waitInput(5000,v=>v.kind==='btn');const good=!r.timeout&&+r.v===target;(good?sfx.ok:sfx.bad)();
    if(!p&&good){ok++;rts.push(r.t-t0)}
    stageHTML(box(ring(target)+(good&&!p?`<div style="position:absolute;inset:0;display:grid;place-items:center;pointer-events:none"><span class="mono" style="font-size:26px;font-weight:700;color:#fff;margin-top:60px">${Math.round(r.t-t0)} ms</span></div>`:'')),good?'flash-ok':'flash-no');await sleep(550)}
  const md=Math.round(mean(rts)),acc=Math.round(ok/cfg.n*100);
  return{succ:[ok,cfg.n],primary:md,disp:md+' ms',unit:' ms',lowerBetter:true,complete:rts.length>=Math.ceil(cfg.n/2),label:`זמן תגובה ממוצע לתשובה נכונה. דיוק ${acc}%`,
    grid:[['דיוק',acc+'%'],['נכונות',ok+'/'+cfg.n],['הכי מהיר',(rts.length?Math.round(Math.min(...rts)):0)+' ms'],['משך הבזק',cfg.flash+' ms']]}}

/* ---------- scenarios ---------- */
const SCN=[
 {me:[72,14],ball:[74,17],team:[88,32],opp:[[78,22],[90,40],[84,28]],q:'אתה כנף ימין עם הכדור. המגן סוגר אותך, והחלוץ שלך פנוי ברחבה. מה עושים?',a:['בועטים לשער מהזווית','מוסרים לחלוץ הפנוי','מכדררים פנימה לתוך שני שחקנים','מחזירים לבלם'],c:1,e:'החלוץ פנוי במצב טוב יותר. מסירה מהירה מנצלת את הרגע לפני שההגנה מתארגנת.'},
 {me:[44,32],ball:[46,32],team:[[48,6],[30,50]],opp:[[40,32],[52,26]],q:'אתה קשר אחורי. מקבל כדור עם לחץ מאחור, והמגן השמאלי שלך פנוי באגף. מה הכי נכון?',a:['להסתובב מול הלחץ','נגיעה אחת לאגף הפנוי','לעצור את הכדור ולחכות','בעיטה ארוכה קדימה'],c:1,e:'כשיש לחץ מאחור, נגיעה אחת לשחקן פנוי שומרת על הכדור ומעבירה את המשחק לצד הנוח.'},
 {me:[22,32],ball:[30,30],team:[[34,50]],opp:[[31,30]],q:'אתה בלם אחרון. חלוץ יריב מגיע עם כדור ישר אליך. מה עושים?',a:['תיקול מיידי','לעכב, לסגור זווית ולחכות לעזרה','לרוץ לשער','לתת לו לעבור'],c:1,e:'כשאתה אחרון, תיקול שנכשל משאיר שער פתוח. לעכב ולהכווין לצד נותן לחברים זמן לחזור.'},
 {me:[70,30],ball:[72,30],team:[[72,46]],opp:[[82,38]],q:'שניים על אחד: אתה עם הכדור, חבר לצידך, מגן אחד ביניכם. מה עושים?',a:['מוסרים מוקדם לפני שהמגן מחליט','מושכים את המגן אליך ואז מוסרים','בועטים מיד','מכדררים לבד מסביב'],c:1,e:'כשהמגן מתחייב אליך, החבר נשאר פנוי לגמרי. מסירה מוקדמת מדי נותנת למגן לסגור את שניכם.'},
 {me:[6,32],ball:[24,34],team:[[20,20]],opp:[[36,36]],q:'אתה שוער. כדור עומק עובר את ההגנה, והחלוץ היריב רחוק יותר ממך. מה עושים?',a:['נשארים על הקו','יוצאים מהר ומסלקים או אוספים','צועקים לבלם וממתינים','רצים לפינה'],c:1,e:'אם אתה מגיע ראשון, יציאה מהירה מונעת מצב אחד על אחד. החלטה מאוחרת היא הסכנה הגדולה.'},
 {me:[56,32],ball:[50,32],team:[[48,32]],opp:[[54,22]],q:'אתה קשר התקפי, גב לשער. יריב מגיע משמאל, ויש מקום פתוח מימין. איך מקבלים?',a:['עוצרים ומגינים על הכדור','קבלה ברגל הרחוקה וסיבוב לימין','מחזירים מיד אחורה','קופצים לנגיחה'],c:1,e:'מבט לפני הקבלה מראה איפה הלחץ. קבלה ברגל הרחוקה מרחיקה את הכדור מהיריב ופותחת את המשחק קדימה.'},
 {me:[48,30],ball:[52,34],team:[[40,20],[38,44]],opp:[[52,36],[62,30]],q:'איבדתם כדור במרכז ואתה הכי קרוב. מה עושים מיד?',a:['חוזרים לעמדה','לחץ מיידי על השחקן עם הכדור','מבקשים עבירה מהשופט','עוצרים לנוח'],c:1,e:'השניות הראשונות אחרי איבוד הן הזמן הכי טוב לזכות שוב, לפני שהיריב מרים את הראש.'},
 {me:[82,40],ball:[92,8],team:[[92,8]],opp:[[86,36],[88,30]],q:'אתה חלוץ. הכנף שלך עומד להגביה מקו הרוחב. לאן רצים?',a:['עומדים במקום','ריצה לקורה הקרובה לפני המגן','חוזרים לקו האמצע','רצים לפינה'],c:1,e:'ריצה מתוזמנת לקורה הקרובה מקדימה את המגן ומשאירה אותו מאחור ברגע ההגבהה.'},
];
function pitchSVG(s){const P=([x,y])=>[x*3,y*3];const dots=(arr,f,r)=>(Array.isArray(arr[0])?arr:[arr]).map(p=>{const[x,y]=P(p);return `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/>`}).join('');
  const[mx,my]=P(s.me),[bx,by]=P(s.ball);
  return `<svg class="pitch" viewBox="0 0 300 192" style="direction:ltr"><rect width="300" height="192" rx="18" fill="#0f2a1e"/><g fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1.5"><rect x="6" y="6" width="288" height="180" rx="10"/><line x1="150" y1="6" x2="150" y2="186"/><circle cx="150" cy="96" r="24"/><rect x="6" y="52" width="40" height="88"/><rect x="254" y="52" width="40" height="88"/></g>
  ${dots(s.team,'#00E0FF',7)}${dots(s.opp,'#FF2BD6',7)}<circle cx="${mx}" cy="${my}" r="10" fill="#fff"/><circle cx="${mx}" cy="${my}" r="15" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="2"/><circle cx="${bx}" cy="${by}" r="4" fill="#FFE14D"/><text x="290" y="100" font-size="10" fill="rgba(255,255,255,.5)" text-anchor="end">שער יריב →</text></svg>`}
async function runScenarios(cfg){const set=shuffle([...SCN]).slice(0,cfg.n);let ok=0;const times=[];
  for(let i=0;i<set.length;i++){const s=set[i];hud(`${i+1}/${set.length}`,i/set.length);
    stageHTML(`<div style="width:100%;max-width:520px;text-align:right">${pitchSVG(s)}<div class="qtext">${s.q}</div><div class="opts">${s.a.map((a,j)=>`<button class="opt" data-c="${j}">${a}</button>`).join('')}</div><div class="tbar"><i id="tb"></i></div></div>`,'scroll');
    const tb=$('#tb');tb.style.transition=`width ${cfg.t}s linear`;await frame();tb.style.width='0%';const t0=performance.now();
    const ci=setInterval(()=>clock(cfg.t-(performance.now()-t0)/1000),200);RUN.timers.push(ci);
    const r=await waitInput(cfg.t*1000,v=>v.kind==='btn');clearInterval(ci);clock(null);const good=!r.timeout&&+r.v===s.c;if(good){ok++;times.push(r.t-t0)}(good?sfx.ok:sfx.bad)();
    $$('.opt').forEach((b,j)=>{if(j===s.c)b.classList.add('ok');else if(!r.timeout&&j===+r.v)b.classList.add('no')});
    stage.querySelector('.tbar').outerHTML=`<p class="st-sub" style="text-align:right;margin-top:12px"><b style="color:${good?'var(--go)':'var(--nogo)'}">${good?'בדיוק!':r.timeout?'נגמר הזמן.':'לא הפעם.'}</b> ${s.e}</p><button class="btn btn-g full" data-c="next" style="margin-top:8px">הבא <span class="ar">←</span></button>`;
    await waitInput(null,v=>v.kind==='btn'&&v.v==='next')}
  const pct=Math.round(ok/set.length*100);
  return{succ:[ok,set.length],primary:pct,disp:pct+'%',unit:'%',lowerBetter:false,complete:true,label:`החלטות נכונות מתוך ${set.length} מצבים`,grid:[['נכונות',ok+'/'+set.length],['זמן החלטה',times.length?(median(times)/1000).toFixed(1)+' s':'-']]}}

/* ---------- breathing ---------- */
async function runBreath(cfg){RUN.bg=true;RUN.wantAmb=true;RUN.amb=ambient();
  stageHTML(`<div class="breath" id="br"></div><div class="st-big" id="brT" style="margin-top:28px">שאיפה</div><div class="st-sub" id="brS"></div>`);const br=$('#br'),t=$('#brT'),total=cfg.min*60,end=performance.now()+total*1000;let cycles=0;
  const ci=setInterval(()=>{const left=(end-performance.now())/1000;clock(left);hud('',1-left/total)},250);RUN.timers.push(ci);
  while(performance.now()<end){
    t.textContent='שאיפה';$('#brS').textContent='דרך האף, לאט';br.style.transition='transform 4s ease-in-out';br.style.transform='scale(1)';breathSnd(4,true);await sleep(4000);
    t.textContent='עצירה';$('#brS').textContent='';await sleep(2000);
    t.textContent='נשיפה';$('#brS').textContent='דרך הפה, ארוך';br.style.transition='transform 6s ease-in-out';br.style.transform='scale(.55)';breathSnd(6,false);await sleep(Math.min(6000,Math.max(0,end-performance.now())));cycles++}
  clearInterval(ci);if(RUN.amb){RUN.amb.stop();RUN.amb=null}sfx.go();
  return{primary:cfg.min,disp:cfg.min+' min',lowerBetter:false,complete:true,src:'self_report',label:`${cycles} נשימות עמוקות. הראש צלול`,grid:[['נשימות',cycles],['קצב','4 · 2 · 6']]}}

async function camGate(cue){const r=RUN;if(cue)cueSay(cue,'כדי להתחיל, תלחץ על אפשר מצלמה, ואז על אישור בחלון של הטלפון.');
  stageHTML(`<div class="gate"><div class="lensbig">${I('camera')}</div><h2 style="font-size:28px">צריך את המצלמה שלך</h2><p class="st-sub" style="margin:0">המצלמה מזהה לבד את הכדור ומודדת. שום דבר לא נשלח לשום מקום. הטלפון ישאל אותך, צריך ללחוץ "אישור".</p><button class="btn btn-g btn-xl full" data-c="allow">אפשר מצלמה <span class="ar">←</span></button></div>`,'scroll');
  await waitInput(null,v=>v.kind==='btn'&&v.v==='allow');chkR(r)}
