/* ---------- נגיחות: balls pop up in the top third, the player jumps and heads them. Body tracking only, no ball detection. ---------- */
async function runHeader(cfg,id){RUN.bg=true;
  await camGate('allow');let stream;try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720},frameRate:{ideal:60}},audio:false})}catch(e){throw 'nocam'}
  RUN.stream=stream;play.classList.add('bare');
  stageHTML(`<video class="pv" id="pv" playsinline muted autoplay></video><canvas class="cv" id="po"></canvas><div class="cvmsg" id="pm">מכין את מעקב הגוף...</div><div class="bigcount mid" id="pc" hidden>0</div><div class="cvbar" id="pBar"></div>`,'full');
  const v=$('#pv');v.srcObject=stream;await v.play();chk();
  const cv=$('#po'),cx=cv.getContext('2d'),dpr=devicePixelRatio||1,rect=stage.getBoundingClientRect(),W=rect.width,H=rect.height;cv.width=W*dpr;cv.height=H*dpr;cx.setTransform(dpr,0,0,dpr,0,0);
  const msg=t=>{$('#pm').textContent=t};
  let pose=null;try{pose=await Promise.race([loadPose(),new Promise((_,rej)=>setTimeout(()=>rej('slow'),25000))])}catch(e){pose=null}chk();
  if(!pose){msg('');play.classList.remove('bare');return{primary:0,disp:'0',unit:'',lowerBetter:false,complete:false,src:'camera',label:'מעקב הגוף לא נטען',grid:[],flag:'מעקב הגוף לא נטען. בדוק חיבור לאינטרנט ונסה שוב.'}}
  const vw=v.videoWidth||640,vh=v.videoHeight||480,sc=Math.max(W/vw,H/vh),ox=(W-vw*sc)/2,oy=(H-vh*sc)/2;
  const PN=l=>[W-(l.x*vw*sc+ox),l.y*vh*sc+oy],spk=(k,t)=>cueSay(k,t);
  let lm=null,lmT=0,lastVT=-1,poseTs=0,prevHead=null;
  const detect=now=>{if(v.readyState<2||v.currentTime===lastVT)return false;lastVT=v.currentTime;
    try{const ts=Math.max(performance.now(),poseTs+1);poseTs=ts;const r=pose.detectForVideo(v,ts),l=r.landmarks?.[0];if(l){lm=l;lmT=now}}catch(e){}return true};
  const vis=(i,t=.4)=>lm&&(lm[i].visibility??1)>=t;
  /* the whole body is in view when the head and at least one knee/ankle are seen */
  const bodyIn=now=>lm&&now-lmT<600&&vis(0)&&(vis(25)||vis(26)||vis(27)||vis(28))&&(vis(23)||vis(24));
  const headTop=()=>Math.min(lm[0].y,lm[7].y-.01,lm[8].y-.01);
  const pc=$('#pc');let phase='gate',busy=true,okSince=0,lastHint=performance.now(),lastBack=0,h0=.45,samples=[],hits=0,spawned=0,missed=0,finished=false,t0=0,end=Infinity,started=false;
  const balls=[],parts=[];let nextSpawn=0,farSince=0,lastLost=0;
  msg('לכו אחורה, וכל הגוף למסגרת');
  spk('stepback_head','לך שניים עד שלושה צעדים אחורה, כך שכל הגוף נכנס למסגרת, והשליש העליון של המסך נשאר ריק.').then(()=>{busy=false});
  const goCount=async()=>{phase='ready';busy=true;msg('');h0=samples.length?samples.sort((a,b)=>a-b)[samples.length>>1]:.45;
    await spk('ready_head','הכל מוכן. עוד רגע יופיעו כדורים למעלה. תקפוץ ותנגח אותם בזהירות, כדי לפוצץ.');
    phase='count';const vp=spk('count321','שלוש, שתיים, אחת, התחלה!');
    for(const n of[3,2,1]){$('#pm').innerHTML=`<span class="cd-strip">${n}</span>`;sfx.tick();await sleep(800)}$('#pm').textContent='';sfx.go();await Promise.race([vp,sleep(900)]);
    t0=performance.now();end=cfg.sec?t0+cfg.sec*1000:Infinity;RUN.t0=t0;started=true;pc.hidden=false;nextSpawn=t0+600;
    $('#pBar').innerHTML=`<button class="btn btn-w" data-c="end">${I('check')} סיום ושמירה</button>`;RUN.input=x=>{if(x.kind==='btn'&&x.v==='end')finished=true};phase='run'};
  RUN.onQuit=()=>{finished=true;phase='run'};
  const burst=(x,y)=>{const cols=['#FFE14D','#FF2BD6','#00E0FF','#3DF59A','#fff'];for(let i=0;i<34;i++){const a=Math.random()*6.283,sp=120+Math.random()*340;parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:.55+Math.random()*.4,t:0,c:cols[i%5],r:3+Math.random()*5})}parts.push({x,y,ring:true,life:.4,t:0})};
  const spawn=now=>{const nose=lm&&now-lmT<800?lm[0]:{x:.5,y:h0};const up=.08+Math.random()*.10;const ny=Math.max(.07,Math.min(.3,h0-up));
    const nx=Math.max(.14,Math.min(.86,nose.x+(Math.random()*.36-.18)));balls.push({nx,ny,born:now,life:4200,ph:Math.random()*6});spawned++};
  const drawBall=(b,now)=>{const[x0,y0]=PN({x:b.nx,y:b.ny}),y=y0+Math.sin((now-b.born)/260+b.ph)*5,age=(now-b.born)/b.life,r=Math.max(20,.058*vh*sc),pop=Math.min(1,(now-b.born)/180);
    cx.save();cx.translate(x0,y);cx.scale(pop,pop);cx.globalAlpha=age>.8?.5+.5*Math.sin(now/60):1;cx.shadowColor='rgba(255,43,214,.9)';cx.shadowBlur=22;cx.fillStyle='#fff';cx.beginPath();cx.arc(0,0,r,0,7);cx.fill();cx.shadowBlur=0;cx.strokeStyle='#0B0B0F';cx.lineWidth=3;cx.stroke();
    cx.fillStyle='#0B0B0F';cx.beginPath();for(let i=0;i<5;i++){const a=-1.5708+i*1.2566;cx.lineTo(Math.cos(a)*r*.42,Math.sin(a)*r*.42)}cx.closePath();cx.fill();cx.restore();return[x0,y]};
  await animate((dt,now)=>{if(finished||(phase==='run'&&now>=end))return false;
    const fresh=detect(now);cx.clearRect(0,0,W,H);if(lm&&now-lmT<500)drawSkel(cx,lm,PN);
    if(phase==='gate'){
      if(fresh){const inn=bodyIn(now),top=inn?headTop():1;
        if(inn&&top>=.34){okSince=okSince||now;samples.push(lm[0].y);if(samples.length>60)samples.shift();msg('מעולה, ככה');if(now-okSince>1200&&!busy)goCount().catch(()=>{})}
        else{okSince=0;samples=[];
          if(!busy&&now-lastBack>7000){if(inn&&top<.34){lastBack=now;msg('הלכו עוד צעד אחורה');spk('back_head','אתה קרוב מדי. תלך עוד צעד אחורה, כדי שהשליש העליון יישאר ריק.')}
            else if(now-lastHint>9000){lastBack=now;lastHint=now;msg('לא רואים את כל הגוף');spk('noperson','אני לא רואה אותך. תיכנס למסגרת עם כל הגוף.')}}}}
    }
    if(phase==='run'){clock(cfg.sec?(end-now)/1000:(now-t0)/1000);hud('',cfg.sec?(now-t0)/(cfg.sec*1000):0);
      if(!balls.length&&now>=nextSpawn&&balls.length<1)spawn(now);else if(balls.length===1&&now-balls[0].born>1500&&Math.random()<dt*.5&&now>=nextSpawn)spawn(now);
      /* head hit: the nose, or the line it travelled since the last frame (a fast jump), touches a ball */
      if(fresh&&lm&&now-lmT<400){const hp={x:lm[0].x,y:Math.min(lm[0].y,headTop())};
        for(let i=balls.length-1;i>=0;i--){const b=balls[i],R=(.058+.05)*vh;let hit=false;
          const test=p=>Math.hypot((p.x-b.nx)*vw,(p.y-b.ny)*vh)<R;if(test(hp)||test({x:lm[0].x,y:lm[0].y}))hit=true;
          else if(prevHead){for(let k=1;k<4&&!hit;k++){const q={x:prevHead.x+(hp.x-prevHead.x)*k/4,y:prevHead.y+(hp.y-prevHead.y)*k/4};if(test(q))hit=true}}
          if(hit){const[x,y]=PN({x:b.nx,y:b.ny});balls.splice(i,1);hits++;burst(x,y);sfx.boom();pc.textContent=hits;pc.classList.remove('bump');void pc.offsetWidth;pc.classList.add('bump');nextSpawn=now+500+Math.random()*700}}
        prevHead=hp}
      for(let i=balls.length-1;i>=0;i--){if(now-balls[i].born>balls[i].life){balls.splice(i,1);missed++;nextSpawn=now+400+Math.random()*600}}
      for(const b of balls)drawBall(b,now);
      /* too close for the top third to stay empty, or out of view */
      if(lm&&now-lmT<600&&vis(0)&&lm[0].y<.2){farSince=farSince||now;if(now-farSince>2500&&now-lastBack>10000){lastBack=now;msg('לך צעד אחורה');spk('back_head','אתה קרוב מדי. תלך עוד צעד אחורה, כדי שהשליש העליון יישאר ריק.')}}else farSince=0;
      if(now-lmT>2500&&now-lastLost>9000){lastLost=now;msg('לא רואים אותך');spk('noperson','אני לא רואה אותך. תיכנס למסגרת עם כל הגוף.')}else if(now-lmT<600&&now-lastLost>1500)msg('')}
    /* particles */
    for(let i=parts.length-1;i>=0;i--){const q=parts[i];q.t+=dt;if(q.t>q.life){parts.splice(i,1);continue}const k=q.t/q.life;
      if(q.ring){cx.save();cx.strokeStyle='rgba(255,225,77,'+(1-k)+')';cx.lineWidth=6*(1-k);cx.beginPath();cx.arc(q.x,q.y,20+k*110,0,7);cx.stroke();cx.restore()}
      else{q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=380*dt;cx.save();cx.globalAlpha=1-k;cx.fillStyle=q.c;cx.beginPath();cx.arc(q.x,q.y,q.r*(1-k*.5),0,7);cx.fill();cx.restore()}}
    return true});
  if(!t0)t0=performance.now();
  RUN.onQuit=null;RUN.input=null;$('#pBar').innerHTML='';play.classList.remove('bare');
  const dur=Math.round((performance.now()-t0)/1000);
  return{succ:spawned>0?[hits,spawned]:null,primary:hits,disp:String(hits),unit:'',lowerBetter:false,complete:started&&dur>=8,src:'camera',label:`נגיחות מוצלחות ב-${mmss(dur)} דקות`,
    grid:[['נגיחות',hits],['כדורים שהוחמצו',missed],['זמן',mmss(dur)],['קצב לדקה',dur?Math.round(hits/dur*60):0]],flag:hits?null:'לא פוצצו כדורים. ודא שכל הגוף בתמונה ושהשליש העליון ריק, ונסה שוב.'}}
