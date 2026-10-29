/* ---------- camera core (colour task, strobe) ----------
   The video element lives on the play layer (never inside #stage), so screen changes never pause it.
   Every analysis runs only on a NEW camera frame, so two identical frames never cancel a detection. */
let CAM=null;const CW=64,CH=48,CN=CW*CH;
async function camStart(){try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:60}},audio:false});
  const v=document.createElement('video');v.className='camv';v.playsInline=true;v.muted=true;v.autoplay=true;v.setAttribute('playsinline','');v.setAttribute('muted','');v.srcObject=s;play.appendChild(v);await v.play();
  const m=document.createElement('div');m.className='meter';m.innerHTML='<i id="mt"></i>';play.appendChild(m);
  const c=document.createElement('canvas');c.width=CW;c.height=CH;CAM={s,v,m,x:c.getContext('2d',{willReadFrequently:true}),lastT:-1,frame:null}}catch(e){throw 'nocam'}}
function camStop(){if(CAM){CAM.s.getTracks().forEach(t=>t.stop());CAM.v.remove();CAM.m.remove();CAM=null}if(RUN?.stream){RUN.stream.getTracks().forEach(t=>t.stop());RUN.stream=null}}
function camAttach(){}// kept for older calls: the camera layer is persistent now
// returns a fresh grey frame or null when the camera has not produced a new one yet
function camGrab(){const v=CAM.v;if(v.readyState<2)return null;const t=v.currentTime;if(t===CAM.lastT)return null;CAM.lastT=t;
  CAM.x.drawImage(v,0,0,CW,CH);const d=CAM.x.getImageData(0,0,CW,CH).data,g=new Float32Array(CN);let s=0;
  for(let i=0,j=0;j<CN;i+=4,j++){g[j]=(d[i]*.3+d[i+1]*.59+d[i+2]*.11)/255;s+=g[j]}const raw=s/CN,m=raw||1e-3;for(let j=0;j<CN;j++)g[j]/=m;return{g,mean:raw,t:performance.now()}}
const fracDiff=(a,b,th)=>{let c=0;for(let j=0;j<a.length;j++)if(Math.abs(a[j]-b[j])>th)c++;return c/a.length};
function meter(v){const mt=$('#mt');if(mt)mt.style.width=Math.min(100,v*100)+'%'}
function tapCatch(){RUN.tapHit=null;RUN.input=v=>{if(v.kind==='tap')RUN.tapHit=v.t}}
// waits until test(frame,state,elapsed) says yes; a tap counts only when there is no camera
function camWait(ms,test,init){const r=RUN;return new Promise(res=>{const t0=performance.now();const st=init||{};
  const f=()=>{if(r.cancel)return res({cancel:true});const now=performance.now();
    if(now-t0>ms)return res({timeout:true,t:now});if(RUN.tapHit&&!CAM){const t=RUN.tapHit;RUN.tapHit=null;return res({tap:true,t})}
    if(CAM){const fr=camGrab();if(fr){if(test(fr,st,now-t0))return res({cam:true,t:fr.t});st.prev=fr}}
    r.raf=requestAnimationFrame(f)};r.raf=requestAnimationFrame(f)}).then(v=>{chkR(r);return v})}
// a quick hand in front of the lens: movement between two frames, or the lens suddenly covered
const handMotion=(settle=140)=>(fr,st,el)=>{if(st.base==null)st.base=fr.mean;
  if(el<settle||!st.prev){st.base=st.base*.8+fr.mean*.2;return false}
  const m=fracDiff(fr.g,st.prev.g,.16),cover=fr.mean<st.base*.62;meter(Math.max(m*8,cover?1:0));
  if(m<.02)st.base=st.base*.85+fr.mean*.15;return m>.04||cover};

/* ---------- colour task ---------- */
async function runColorTask(cfg){const cols=[['#00E0FF','תכלת'],['#FF2BD6','ורוד'],['#3DF59A','ירוק'],['#FFE14D','צהוב']];const times=[];let prevC=null;
  // close to the lens only: a big part of the picture changes against the learned background, or the lens gets dark
  const near=(fr,st,el)=>{if(!st.ref){st.ref=fr;return false}
    const big=fracDiff(fr.g,st.ref.g,.22),dark=fr.mean<st.ref.mean*.55;meter(Math.max(big*1.6,dark?1:0));
    if(big<.12){const g=st.ref.g;for(let j=0;j<CN;j++)g[j]=g[j]*.9+fr.g[j]*.1;st.ref.mean=st.ref.mean*.9+fr.mean*.1}
    return el>900&&(big>.42||dark)};
  for(let i=0;i<cfg.n;i++){hud(`סבב ${i+1}/${cfg.n}`,i/cfg.n);let c;do{c=pick(cols)}while(c===prevC);prevC=c;const [col,name]=c;
    stageHTML(`<div class="fill" style="background:${col}"><div class="st-big" style="color:#0B0B0F;font-size:clamp(60px,18vw,130px)">${name}</div><div class="st-sub" style="color:#0B0B0F;font-weight:700">רוץ! ${CAM?'בחזרה, יד קרובה למצלמה':'בחזרה, גע במסך'}</div></div>`,'full');tapCatch();sfx.go();
    const t0=performance.now();const ci=setInterval(()=>clock((performance.now()-t0)/1000),100);RUN.timers.push(ci);
    const r=await camWait(45000,near);clearInterval(ci);RUN.input=null;clock(null);
    if(r.timeout){stageHTML(`<div class="st-big">דילגנו על הסבב</div>`);await sleep(900);continue}
    const t=(r.t-t0)/1000;times.push(t);sfx.ok();stageHTML(`<div class="okmark"><div>✓<small>${t.toFixed(2)} s</small></div></div>`);
    await sleep(i<cfg.n-1?2600:1000)}
  const tot=times.reduce((a,b)=>a+b,0),avg=times.length?tot/times.length:0;
  return{succ:[times.length,cfg.n],primary:+avg.toFixed(2),disp:avg.toFixed(2)+' s',unit:' s',lowerBetter:true,complete:times.length>=Math.ceil(cfg.n*.7),label:`זמן ממוצע לסבב ב-${times.length} סבבים`,
    grid:[['זמן כולל',tot.toFixed(1)+' s'],['הסבב הכי מהיר',(times.length?Math.min(...times):0).toFixed(2)+' s'],['סבבים',times.length+'/'+cfg.n]]}}

/* ---------- Ronaldo strobe ---------- */
async function runStrobe(cfg){const cols=['#FF2BD6','#00E0FF','#FFE14D','#AA44FF','#FF7A1A'];let ok=0,early=0,miss=0;const rts=[];
  for(let i=0;i<cfg.n;i++){hud(`${i+1}/${cfg.n}`,i/cfg.n);const k=2+(Math.random()*4|0);
    for(let j=0;j<k;j++){stageHTML(`<div class="fill" style="background:${pick(cols)}"></div>`,'full');tapCatch();
      const r=await camWait(cfg.flash,handMotion());if(!r.timeout){early++;sfx.bad();stageHTML(`<div class="st-big">מוקדם מדי</div><div class="st-sub">מנופפים רק על ירוק.</div>`);await sleep(900)}
      stageHTML(`<div class="fill" style="background:#000"></div>`,'full');await sleep(rnd(300,700))}
    stageHTML(`<div class="fill" style="background:var(--go)"></div>`,'full');tapCatch();const t0=performance.now();
    const r=await camWait(2000,handMotion(90));RUN.input=null;
    if(r.timeout){miss++;sfx.bad();stageHTML(`<div class="st-big">פספסת את הירוק</div>`)}else{ok++;sfx.ok();const rt=Math.round(r.t-t0);rts.push(rt);stageHTML(`<div class="okmark"><div>✓<small>${rt} ms</small></div></div>`)}
    await sleep(1000)}
  const md=Math.round(median(rts)||0),acc=Math.round(ok/cfg.n*100);
  return{succ:[ok,cfg.n],primary:md,disp:md+' ms',unit:' ms',lowerBetter:true,complete:rts.length>=3,label:`זמן תגובה חציוני לירוק. דיוק ${acc}%`,grid:[['תגובות נכונות',ok+'/'+cfg.n],['מוקדם מדי',early],['פספוסים',miss],['הכי מהיר',(rts.length?Math.min(...rts):0)+' ms']]}}

/* ---------- ball games: juggling + foot-to-foot. The camera looks for the BALL (any colour), not for body motion ---------- */
let OBJ=null,OBJ_ERR=false;
const MP='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
async function loadBall(){if(OBJ)return OBJ;if(OBJ_ERR)throw 'noball';
  try{const v=await import(MP+'/vision_bundle.mjs');const fs=await v.FilesetResolver.forVisionTasks(MP+'/wasm');
    const mk=d=>v.ObjectDetector.createFromOptions(fs,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',delegate:d},runningMode:'VIDEO',scoreThreshold:.12,maxResults:6,categoryAllowlist:['sports ball']});
    try{OBJ=await mk('GPU')}catch(e){OBJ=await mk('CPU')}return OBJ}catch(e){OBJ_ERR=true;throw 'noball'}}
const CALLS=[['#00E0FF',''],['#FF2BD6',''],['#3DF59A',''],['#FFE14D',''],['#FF7A1A',''],['','1'],['','2'],['','3'],['','4'],['','5'],['','6'],['','7'],['','8'],['','9']];
async function runPose(cfg,id){const g=CAT[id],feet=g.pose==='feet';RUN.bg=true;
  await camGate();let stream;try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720},frameRate:{ideal:60}},audio:false})}catch(e){throw 'nocam'}
  RUN.stream=stream;play.classList.add('bare');
  stageHTML(`<video class="pv" id="pv" playsinline muted autoplay></video><canvas class="cv" id="po"></canvas><div class="cvmsg" id="pm">מכין את הראייה הממוחשבת...</div><div class="callstrip" id="call"></div><div class="bigcount" id="pc" hidden>0</div><div class="cvbar" id="pBar"></div>`,'full');
  const v=$('#pv');v.srcObject=stream;await v.play();chk();
  const cv=$('#po'),cx=cv.getContext('2d'),dpr=devicePixelRatio||1,rect=stage.getBoundingClientRect(),W=rect.width,H=rect.height;cv.width=W*dpr;cv.height=H*dpr;cx.setTransform(dpr,0,0,dpr,0,0);
  let det=null;try{det=await Promise.race([loadBall(),new Promise((_,rej)=>setTimeout(()=>rej('slow'),25000))])}catch(e){det=null}chk();
  const msg=t=>{$('#pm').textContent=t};
  if(!det){msg('');play.classList.remove('bare');return{primary:0,disp:'0',unit:'',lowerBetter:false,complete:false,src:'camera',label:'הראייה הממוחשבת לא נטענה',grid:[],flag:'הראייה הממוחשבת לא נטענה. בדוק חיבור לאינטרנט ונסה שוב.'}}
  const vw=v.videoWidth||640,vh=v.videoHeight||480,sc=Math.max(W/vw,H/vh),ox=(W-vw*sc)/2,oy=(H-vh*sc)/2;
  const P=(x,y)=>[W-(x*sc+ox),y*sc+oy];
  /* ---- ball finder: square crops (keeps the ball round for the model); wide scan when lost, tight window when tracking ---- */
  const S=Math.min(vw,vh),wc=document.createElement('canvas');wc.width=wc.height=320;const wx=wc.getContext('2d');
  let lastTs=0,scanI=0,track=null,miss=99,acq=0,cand=null;
  const crop=(x0,y0,L)=>{wx.drawImage(v,x0,y0,L,L,0,0,320,320);const ts=Math.max(performance.now(),lastTs+1);lastTs=ts;
    let r;try{r=det.detectForVideo(wc,ts)}catch(e){return[]}
    return(r.detections||[]).map(d=>{const bb=d.boundingBox,k=L/320,w=bb.width*k,h=bb.height*k;return{cx:x0+(bb.originX+bb.width/2)*k,cy:y0+(bb.originY+bb.height/2)*k,w,h,score:d.categories?.[0]?.score||0}})};
  const findBall=now=>{let dets;
    if(track&&miss<10){const L=Math.min(S,Math.max(S*.6,10*(track.d||40)));const x0=Math.max(0,Math.min(vw-L,track.cx-L/2)),y0=Math.max(0,Math.min(vh-L,track.cy-L/2));dets=crop(x0,y0,L)}
    else{const long=Math.max(vw,vh),K=Math.max(1,Math.ceil(long/S)),pos=K===1?0:(long-S)*(scanI++%K)/(K-1);dets=vw>=vh?crop(pos,0,S):crop(0,pos,S)}
    return pickBall(dets,track,track?.d,vh,now)};
  const drawBall=(b,locked)=>{cx.clearRect(0,0,W,H);if(!b)return;const[x,y]=P(b.cx,b.cy),r=Math.max(14,(b.w+b.h)/4*sc);cx.lineWidth=5;cx.strokeStyle=locked?'#3DF59A':'#FFE14D';cx.beginPath();cx.arc(x,y,r*1.15,0,7);cx.stroke()};
  const seen=[];let lastVT=-1;
  const step=now=>{if(v.readyState<2||v.currentTime===lastVT)return 'same';lastVT=v.currentTime;
    const b=findBall(now);
    if(b){const prevC=cand;cand=b;acq=prevC&&Math.hypot(b.cx-prevC.cx,b.cy-prevC.cy)<Math.max(5*(b.w+b.h)/2,vh*.25)?acq+1:1;
      if(track||acq>=3){track={cx:b.cx,cy:b.cy,d:(b.w+b.h)/2,t:now};miss=0}}
    else{miss++;if(miss>14){track=null;acq=0;cand=null}}
    return{b:track&&miss===0?b:null,locked:!!track&&miss<10,miss}};
  /* 1. show the ball to the camera */
  msg('הראה את הכדור למצלמה');let okSince=0;
  await animate(()=>{const o=step(performance.now());if(o==='same')return true;drawBall(o.b,o.locked);
    if(o.locked&&o.b){msg('זיהיתי את הכדור. מתחילים...');okSince=okSince||performance.now();if(performance.now()-okSince>900)return false}else{okSince=0;msg('הראה את הכדור למצלמה. תן לו אור ורקע פשוט')}return true});
  msg('');cx.clearRect(0,0,W,H);
  for(const n of[3,2,1]){$('#call').innerHTML=`<span class="cd-strip">${n}</span>`;sfx.tick();await sleep(800)}$('#call').innerHTML='';sfx.go();
  /* 2. recording (9:16 with logo) */
  let recUrl=null,recType='';const rc=document.createElement('canvas');rc.width=720;rc.height=1280;const rx=rc.getContext('2d');let recEnd=0,chunks=[];
  if(RUN.recWanted&&window.MediaRecorder&&rc.captureStream){try{recType=['video/mp4','video/webm;codecs=vp9','video/webm'].find(t=>MediaRecorder.isTypeSupported(t))||'';
    const mr=new MediaRecorder(rc.captureStream(30),recType?{mimeType:recType}:{});mr.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};mr.onstop=()=>{recUrl=URL.createObjectURL(new Blob(chunks,{type:recType||'video/webm'}))};mr.start(500);RUN.rec=mr;recEnd=performance.now()+60000;
    const d=document.createElement('div');d.className='recdot';d.id='recDot';d.innerHTML='<i></i>REC';stage.appendChild(d)}catch(e){RUN.rec=null}}
  /* 3. count: juggling = every up-and-down of the ball; feet = every pass from one side to the other */
  let reps=0;const t0=performance.now(),end=cfg.sec?t0+cfg.sec*1000:Infinity;
  const pc=$('#pc');pc.hidden=false;let finished=false;RUN.onQuit=()=>{finished=true};
  $('#pBar').innerHTML=`<button class="btn btn-w" data-c="end">${I('check')} סיום ושמירה</button>`;RUN.input=v2=>{if(v2.kind==='btn'&&v2.v==='end')finished=true};
  const count=()=>{reps++;pc.textContent=reps;pc.classList.remove('bump');void pc.offsetWidth;pc.classList.add('bump');sfx.pop()};
  const BC=new BallCounter(feet?'feet':'juggle');let nextCall=0,lastCall='',smooth=null,lastSeen=performance.now(),trail=[];
  await animate(()=>{const now=performance.now();if(finished||now>=end)return false;
    clock(cfg.sec?(end-now)/1000:(now-t0)/1000);hud('',cfg.sec?(now-t0)/(cfg.sec*1000):0);
    if(feet&&now>nextCall){let c;do{c=pick(CALLS)}while((c[0]+c[1])===lastCall);lastCall=c[0]+c[1];$('#call').innerHTML=c[0]?`<span class="call-color" style="background:${c[0]}"></span>`:`<span class="call-num">${c[1]}</span>`;nextCall=now+cfg.call}
    const o=step(now);
    if(o!=='same'){drawBall(o.b,o.locked);
      if(o.b){lastSeen=now;const a=feet?o.b.cx:-o.b.cy;smooth=smooth==null?a:smooth*.3+a*.7;if(BC.push(now,smooth,(o.b.w+o.b.h)/2))count();
        trail.push([o.b.cx,o.b.cy]);if(trail.length>8)trail.shift()}
      else if(!feet&&track&&smooth!=null&&BC.dir===1&&track.cy<vh*.2&&now-lastSeen<400){if(BC.peakGone(now,-0))count()}
      msg(now-lastSeen>1800?'לא רואים את הכדור. תכניס אותו למסגרת':'')}
    if(RUN.rec&&RUN.rec.state==='recording'){if(now>recEnd){RUN.rec.stop();$('#recDot')?.remove()}else{const s2=Math.max(720/vw,1280/vh);rx.save();rx.translate(720,0);rx.scale(-1,1);rx.drawImage(v,(720-vw*s2)/2,(1280-vh*s2)/2,vw*s2,vh*s2);rx.restore();
      rx.fillStyle='rgba(0,0,0,.35)';rx.fillRect(0,1080,720,200);rx.fillStyle='#fff';rx.font='800 120px Outfit,sans-serif';rx.textAlign='center';rx.fillText(String(reps),360,1225);
      if(LOGO.complete&&LOGO.naturalWidth){const lw=200,lh=lw*LOGO.naturalHeight/LOGO.naturalWidth;rx.drawImage(LOGO,720-lw-24,28,lw,lh)}}}
    return true});
  RUN.onQuit=null;RUN.input=null;$('#call').innerHTML='';$('#pBar').innerHTML='';
  if(RUN.rec&&RUN.rec.state==='recording'){await new Promise(r=>{RUN.rec.addEventListener('stop',r,{once:true});RUN.rec.stop()})}
  if(RUN.rec){await sleep(200);let tries=0;while(!recUrl&&tries++<20)await sleep(100)}
  play.classList.remove('bare');const dur=Math.round((performance.now()-t0)/1000);
  const ext=(recType||'').includes('mp4')?'mp4':'webm',word=feet?'מעברים':'הקפצות';
  const res={primary:reps,disp:String(reps),unit:'',lowerBetter:false,complete:reps>0,src:'camera',label:`${word} ב-${mmss(dur)} דקות`,
    grid:[[word,reps],['זמן',mmss(dur)],['קצב לדקה',dur?Math.round(reps/dur*60):0],['זיהוי','כדור']],flag:reps?null:'לא נספרו חזרות. ודא שהכדור נראה בתמונה, שיש אור, ונסה שוב.'};
  if(recUrl){res.extra=`<a class="btn btn-g full" href="${recUrl}" download="brainball-${id}.${ext}">שמור את הסרטון בטלפון <span class="ar">↓</span></a><button class="btn btn-o full" id="recShare">שתף את הסרטון</button>`;
    res.after=()=>{$('#recShare').onclick=async()=>{try{const b=await fetch(recUrl).then(r=>r.blob());const f=new File([b],`brainball.${ext}`,{type:b.type});if(navigator.canShare?.({files:[f]}))await navigator.share({files:[f],title:'BrainBall'});else shareApp(`עשיתי ${reps} ב"${g.name}".`)}catch(e){}}}}
  return res}
