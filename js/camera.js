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
  return{primary:+avg.toFixed(2),disp:avg.toFixed(2)+' s',unit:' s',lowerBetter:true,complete:times.length>=Math.ceil(cfg.n*.7),label:`זמן ממוצע לסבב ב-${times.length} סבבים`,
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
  return{primary:md,disp:md+' ms',unit:' ms',lowerBetter:true,complete:rts.length>=3,label:`זמן תגובה חציוני לירוק. דיוק ${acc}%`,grid:[['תגובות נכונות',ok+'/'+cfg.n],['מוקדם מדי',early],['פספוסים',miss],['הכי מהיר',(rts.length?Math.min(...rts):0)+' ms']]}}

/* ---------- pose games: juggling + foot-to-foot calls ---------- */
let POSE=null,POSE_ERR=false;
const MP='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
async function loadPose(){if(POSE)return POSE;if(POSE_ERR)throw 'nopose';
  try{const v=await import(MP+'/vision_bundle.mjs');const fs=await v.FilesetResolver.forVisionTasks(MP+'/wasm');
    const mk=d=>v.PoseLandmarker.createFromOptions(fs,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',delegate:d},runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.4,minTrackingConfidence:.4});
    try{POSE=await mk('GPU')}catch(e){POSE=await mk('CPU')}return POSE}catch(e){POSE_ERR=true;throw 'nopose'}}
const EDGES=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,31],[28,32]];
const CALLS=[['#00E0FF',''],['#FF2BD6',''],['#3DF59A',''],['#FFE14D',''],['#FF7A1A',''],['','1'],['','2'],['','3'],['','4'],['','5'],['','6'],['','7'],['','8'],['','9']];
async function runPose(cfg,id){const g=CAT[id],feet=g.pose==='feet';RUN.bg=true;
  await camGate();let stream;try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720},frameRate:{ideal:60}},audio:false})}catch(e){throw 'nocam'}
  RUN.stream=stream;play.classList.add('bare');
  stageHTML(`<video class="pv" id="pv" playsinline muted autoplay></video><canvas class="cv" id="po"></canvas><div class="cvmsg" id="pm">מכין את הראייה הממוחשבת...</div><div class="callstrip" id="call"></div><div class="bigcount" id="pc" hidden>0</div><div class="cvbar" id="pBar"></div>`,'full');
  const v=$('#pv');v.srcObject=stream;await v.play();chk();
  const cv=$('#po'),cx=cv.getContext('2d'),dpr=devicePixelRatio||1,rect=stage.getBoundingClientRect(),W=rect.width,H=rect.height;cv.width=W*dpr;cv.height=H*dpr;cx.setTransform(dpr,0,0,dpr,0,0);
  let pose=null;try{pose=await Promise.race([loadPose(),new Promise((_,rej)=>setTimeout(()=>rej('slow'),20000))])}catch(e){pose=null}chk();
  const vw=v.videoWidth||640,vh=v.videoHeight||480,sc=Math.max(W/vw,H/vh),ox=(W-vw*sc)/2,oy=(H-vh*sc)/2;
  const P=l=>[W-(l.x*vw*sc+ox),l.y*vh*sc+oy];
  const guide={x:W*.12,y:H*.14,w:W*.76,h:H*.82};
  const drawGuide=ok=>{cx.save();cx.setLineDash([14,10]);cx.lineWidth=4;cx.strokeStyle=ok?'#3DF59A':'rgba(255,255,255,.6)';cx.beginPath();cx.roundRect?cx.roundRect(guide.x,guide.y,guide.w,guide.h,28):cx.rect(guide.x,guide.y,guide.w,guide.h);cx.stroke();cx.restore()};
  const drawSkel=lm=>{cx.lineWidth=5;cx.strokeStyle='#00E0FF';cx.lineCap='round';for(const[a,b]of EDGES){const A=lm[a],B=lm[b];if((A.visibility??1)<.35||(B.visibility??1)<.35)continue;const[ax,ay]=P(A),[bx,by]=P(B);cx.beginPath();cx.moveTo(ax,ay);cx.lineTo(bx,by);cx.stroke()}
    cx.fillStyle='#FF2BD6';for(const i of[15,16,27,28,25,26]){const l=lm[i];if((l.visibility??1)<.35)continue;const[x,y]=P(l);cx.beginPath();cx.arc(x,y,7,0,7);cx.fill()}};
  let lastVT=-1;const detect=()=>{if(!pose||v.readyState<2)return null;const vt=v.currentTime;if(vt===lastVT)return 'same';lastVT=vt;try{const r=pose.detectForVideo(v,performance.now());return r.landmarks?.[0]||null}catch(e){return null}};
  const msg=t=>{$('#pm').textContent=t};
  /* 1. get into the frame */
  if(pose){let okSince=0,lastLm=null;msg('התרחק עד שכל הגוף בתוך המסגרת');
    await animate(()=>{let lm=detect();if(lm==='same')lm=lastLm;else lastLm=lm;cx.clearRect(0,0,W,H);let ok=false;
      if(lm){drawSkel(lm);const need=[0,11,12,23,24,27,28].map(i=>lm[i]);const inside=need.every(l=>(l.visibility??1)>.45&&l.y>.02&&l.y<.98&&l.x>.03&&l.x<.97);const h=((lm[27].y+lm[28].y)/2)-lm[0].y;
        ok=inside&&h>.38;msg(ok?'מעולה, תישאר ככה...':h>.9?'קצת יותר רחוק':'התרחק עד שכל הגוף בתוך המסגרת')}else msg('לא רואים אותך. תעמוד מול המצלמה');
      drawGuide(ok);if(ok){okSince=okSince||performance.now();if(performance.now()-okSince>1200)return false}else okSince=0});
  }else{msg('מצב פשוט: המצלמה סופרת תנועה ברגליים. תעמוד 2-3 מטר מהמסך');drawGuide(true);await sleep(3000)}
  msg('');cx.clearRect(0,0,W,H);
  for(const n of[3,2,1]){$('#call').innerHTML=`<span class="cd-strip">${n}</span>`;sfx.tick();await sleep(800)}$('#call').innerHTML='';sfx.go();
  /* 2. recording (9:16 with logo) */
  let recUrl=null,recType='';const rc=document.createElement('canvas');rc.width=720;rc.height=1280;const rx=rc.getContext('2d');let recEnd=0,chunks=[];
  if(RUN.recWanted&&window.MediaRecorder&&rc.captureStream){try{recType=['video/mp4','video/webm;codecs=vp9','video/webm'].find(t=>MediaRecorder.isTypeSupported(t))||'';
    const mr=new MediaRecorder(rc.captureStream(30),recType?{mimeType:recType}:{});mr.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};mr.onstop=()=>{recUrl=URL.createObjectURL(new Blob(chunks,{type:recType||'video/webm'}))};mr.start(500);RUN.rec=mr;recEnd=performance.now()+60000;
    const d=document.createElement('div');d.className='recdot';d.id='recDot';d.innerHTML='<i></i>REC';stage.appendChild(d)}catch(e){RUN.rec=null}}
  /* 3. count: every quick foot (or knee) movement is one touch, with a beep */
  let reps=0;const t0=performance.now(),end=cfg.sec?t0+cfg.sec*1000:Infinity;
  const pc=$('#pc');pc.hidden=false;let finished=false;RUN.onQuit=()=>{finished=true};
  $('#pBar').innerHTML=`<button class="btn btn-w" data-c="end">${I('check')} סיום ושמירה</button>`;RUN.input=v2=>{if(v2.kind==='btn'&&v2.v==='end')finished=true};
  const count=()=>{reps++;pc.textContent=reps;pc.classList.remove('bump');void pc.offsetWidth;pc.classList.add('bump');sfx.pop()};
  const J={}; // joint trackers: previous position + last count time
  const track=(key,l,legL,now,need,refr,upOnly)=>{const s=J[key]||(J[key]={});if((l.visibility??1)<.35){s.p=null;return}
    if(s.p){const dt=Math.max(.012,(now-s.pt)/1000),dx=(l.x-s.p.x)/legL,dy=(l.y-s.p.y)/legL,sp=(upOnly?Math.max(0,-dy):Math.hypot(dx,dy))/dt;
      if(sp>need&&!s.fast&&now-(s.t||0)>refr){s.t=now;count()}s.fast=sp>need*.6}
    s.p={x:l.x,y:l.y};s.pt=now};
  let prevG=null,lastMot=0,nextCall=0,lastCall='';const small=document.createElement('canvas');small.width=48;small.height=36;const sx=small.getContext('2d',{willReadFrequently:true});let lastSV=-1;
  await animate(()=>{const now=performance.now();if(finished||now>=end)return false;
    clock(cfg.sec?(end-now)/1000:(now-t0)/1000);hud('',cfg.sec?(now-t0)/(cfg.sec*1000):0);
    if(feet&&now>nextCall){let c;do{c=pick(CALLS)}while((c[0]+c[1])===lastCall);lastCall=c[0]+c[1];$('#call').innerHTML=c[0]?`<span class="call-color" style="background:${c[0]}"></span>`:`<span class="call-num">${c[1]}</span>`;nextCall=now+cfg.call}
    const lm=detect();
    if(lm&&lm!=='same'){cx.clearRect(0,0,W,H);drawSkel(lm);const legL=Math.max(.12,Math.hypot(lm[23].x-lm[27].x,lm[23].y-lm[27].y));
      if(feet){track('aL',lm[27],legL,now,1.1,160);track('aR',lm[28],legL,now,1.1,160)}
      else{track('aL',lm[27],legL,now,1.3,220,true);track('aR',lm[28],legL,now,1.3,220,true);track('kL',lm[25],legL,now,1.6,260,true);track('kR',lm[26],legL,now,1.6,260,true)}}
    else if(!pose&&v.readyState>=2&&v.currentTime!==lastSV){lastSV=v.currentTime;sx.drawImage(v,0,Math.floor(v.videoHeight*.5),v.videoWidth,Math.floor(v.videoHeight*.5),0,0,48,36);const d=sx.getImageData(0,0,48,36).data,gr=new Float32Array(1728);let s=0;for(let i=0,j=0;j<1728;i+=4,j++){gr[j]=(d[i]+d[i+1]+d[i+2])/765;s+=gr[j]}const m=s/1728||1e-3;for(let j=0;j<1728;j++)gr[j]/=m;
      if(prevG){const mo=fracDiff(gr,prevG,.2);if(mo>.035&&now-lastMot>(feet?170:260)){lastMot=now;count()}}prevG=gr}
    if(RUN.rec&&RUN.rec.state==='recording'){if(now>recEnd){RUN.rec.stop();$('#recDot')?.remove()}else{const s2=Math.max(720/vw,1280/vh);rx.save();rx.translate(720,0);rx.scale(-1,1);rx.drawImage(v,(720-vw*s2)/2,(1280-vh*s2)/2,vw*s2,vh*s2);rx.restore();
      rx.fillStyle='rgba(0,0,0,.35)';rx.fillRect(0,1080,720,200);rx.fillStyle='#fff';rx.font='800 120px Outfit,sans-serif';rx.textAlign='center';rx.fillText(String(reps),360,1225);
      if(LOGO.complete&&LOGO.naturalWidth){const lw=200,lh=lw*LOGO.naturalHeight/LOGO.naturalWidth;rx.drawImage(LOGO,720-lw-24,28,lw,lh)}}}
  });
  RUN.onQuit=null;RUN.input=null;$('#call').innerHTML='';$('#pBar').innerHTML='';
  if(RUN.rec&&RUN.rec.state==='recording'){await new Promise(r=>{RUN.rec.addEventListener('stop',r,{once:true});RUN.rec.stop()})}
  if(RUN.rec){await sleep(200);let tries=0;while(!recUrl&&tries++<20)await sleep(100)}
  play.classList.remove('bare');const dur=Math.round((performance.now()-t0)/1000);
  const ext=(recType||'').includes('mp4')?'mp4':'webm',word=feet?'נגיעות':'הקפצות';
  const res={primary:reps,disp:String(reps),unit:'',lowerBetter:false,complete:reps>0,src:'camera',label:`${word} ב-${mmss(dur)} דקות${pose?'':' (מצב פשוט)'}`,
    grid:[[word,reps],['זמן',mmss(dur)],['קצב לדקה',dur?Math.round(reps/dur*60):0],['זיהוי',pose?'גוף מלא':'תנועה']],flag:reps?null:'לא נספרו חזרות. בדוק שכל הגוף בתוך המסגרת ונסה שוב.'};
  if(recUrl){res.extra=`<a class="btn btn-g full" href="${recUrl}" download="brainball-${id}.${ext}">שמור את הסרטון בטלפון <span class="ar">↓</span></a><button class="btn btn-o full" id="recShare">שתף את הסרטון</button>`;
    res.after=()=>{$('#recShare').onclick=async()=>{try{const b=await fetch(recUrl).then(r=>r.blob());const f=new File([b],`brainball.${ext}`,{type:b.type});if(navigator.canShare?.({files:[f]}))await navigator.share({files:[f],title:'BrainBall'});else shareApp(`עשיתי ${reps} ב"${g.name}".`)}catch(e){}}}}
  return res}
