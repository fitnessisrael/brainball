/* ---------- player card (FIFA-style): photo, colour, name, BrainBall logo. Drawn on a canvas so it can be saved and shared as a picture. ---------- */
const CARD_COLORS=['#C6F432','#00E0FF','#FF2BD6','#FFE14D','#FF7A1A','#9B6BFF'];
const imgLoad=src=>new Promise(res=>{if(!src)return res(null);const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=src});
const lumOf=h=>{const n=parseInt(h.slice(1),16);return(((n>>16)&255)*.3+((n>>8)&255)*.59+(n&255)*.11)/255};
async function drawCard(cv,o){const W=900,H=1240,x=cv.getContext('2d');cv.width=W;cv.height=H;const col=o.color||CARD_COLORS[0];
  const [ph,logo,bm]=await Promise.all([imgLoad(o.photo),imgLoad('logo.png'),imgLoad('img/b-mark.png')]);
  const rr=(a,b,w,h,r)=>{x.beginPath();x.roundRect?x.roundRect(a,b,w,h,r):x.rect(a,b,w,h)};
  x.clearRect(0,0,W,H);x.save();rr(0,0,W,H,64);x.clip();
  x.fillStyle='#0B0B12';x.fillRect(0,0,W,H);
  /* photo field: accent gradient + diagonal stripes + photo */
  const g=x.createLinearGradient(0,0,W,900);g.addColorStop(0,col+'55');g.addColorStop(1,col+'22');x.fillStyle=g;x.fillRect(0,0,W,H);
  x.save();x.beginPath();x.moveTo(0,0);x.lineTo(W,0);x.lineTo(W,700);x.lineTo(0,930);x.closePath();x.clip();
  x.fillStyle='#16161F';x.fillRect(0,0,W,H);x.fillStyle=col+'33';x.fillRect(0,0,W,H);
  x.strokeStyle='rgba(255,255,255,.12)';x.lineWidth=3;for(let i=-H;i<W+H;i+=26){x.beginPath();x.moveTo(i,0);x.lineTo(i-420,H);x.stroke()}
  if(ph){const s=Math.max(W/ph.width,980/ph.height),w=ph.width*s,h=ph.height*s;x.drawImage(ph,(W-w)/2,Math.min(0,(900-h)*.15),w,h)}
  else if(bm){x.globalAlpha=.9;const w=560,h=w*bm.height/bm.width;x.drawImage(bm,(W-w)/2,250,w,h);x.globalAlpha=1}
  x.restore();
  /* accent band under the diagonal */
  x.beginPath();x.moveTo(0,930);x.lineTo(W,700);x.lineTo(W,H);x.lineTo(0,H);x.closePath();x.fillStyle=col;x.fill();
  x.beginPath();x.moveTo(0,930);x.lineTo(W,700);x.lineTo(W,742);x.lineTo(0,972);x.closePath();x.fillStyle='rgba(11,11,18,.88)';x.fill();
  /* B tab, top left */
  x.fillStyle='#0B0B12';rr(0,0,230,200,0);x.beginPath();x.moveTo(0,0);x.lineTo(230,0);x.lineTo(230,150);x.quadraticCurveTo(230,200,180,200);x.lineTo(0,200);x.closePath();x.fill();
  if(bm){const w=150,h=w*bm.height/bm.width;x.drawImage(bm,40,100-h/2,w,h)}
  /* name */
  const dark=lumOf(col)>.5,tc=dark?'#0B0B12':'#fff',name=(o.name||'שחקן BrainBall').trim();
  x.direction='rtl';x.textAlign='center';x.fillStyle=tc;let fs=104;x.font=`800 ${fs}px Heebo,Outfit,sans-serif`;while(x.measureText(name).width>780&&fs>40){fs-=4;x.font=`800 ${fs}px Heebo,Outfit,sans-serif`}
  x.fillText(name,W/2,1010);
  if(o.sub){x.font='600 40px Heebo,Outfit,sans-serif';x.globalAlpha=.8;x.fillText(o.sub,W/2,1070);x.globalAlpha=1}
  /* BrainBall logo on a dark pill */
  const pw=330,ph2=92,px=(W-pw)/2,py=H-ph2-40;x.fillStyle='#0B0B12';rr(px,py,pw,ph2,46);x.fill();
  if(logo){const h=54,w=h*logo.width/logo.height;x.drawImage(logo,(W-w)/2,py+(ph2-h)/2,w,h)}
  x.restore();return cv}
function cardData(){const p=profile||{};return{photo:S.get('cardPhoto',null)||p.avatar||'',color:S.get('cardColor',CARD_COLORS[0]),name:p.name||'',sub:[p.team||p.ownTeam||p.club||''].filter(Boolean).join(' · ')}}
let cardBusy=false;
async function paintCard(){const cv=$('#cardCv');if(!cv||cardBusy)return;cardBusy=true;try{await drawCard(cv,cardData())}finally{cardBusy=false}
  $('#cardColors').innerHTML=CARD_COLORS.map(c=>`<button type="button" class="cc" data-c="${c}" aria-pressed="${c===S.get('cardColor',CARD_COLORS[0])}" style="background:${c}" aria-label="צבע"></button>`).join('')}
function cardPhotoData(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const s=Math.min(1,1100/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.86))};im.onerror=rej;im.src=r.result};r.onerror=rej;r.readAsDataURL(f)})}
const cardBlob=()=>new Promise(r=>$('#cardCv').toBlob(r,'image/png'));
$('#cardColors').onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;S.set('cardColor',b.dataset.c);paintCard()};
$('#cardFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{S.set('cardPhoto',await cardPhotoData(f));await paintCard()}catch(er){toast('התמונה לא נטענה. נסה תמונה אחרת.')}};
$('#cardSave').onclick=async()=>{await paintCard();const b=await cardBlob(),f=new File([b],'brainball-card.png',{type:'image/png'});
  if(navigator.canShare?.({files:[f]})){try{await navigator.share({files:[f],title:'הכרטיס שלי ב-BrainBall'});return}catch(er){if(er?.name==='AbortError')return}}
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='brainball-card.png';document.body.appendChild(a);a.click();a.remove();toast('הכרטיס נשמר')};
