/* ---------- player card (FIFA-style): photo, colour, name, BrainBall logo. Drawn on a canvas so it can be saved and shared as a picture. ---------- */
const CARD_COLORS=['#C6F432','#2458E6','#FF2BD6','#FFF15A','#FF7A1A','#E8202F'];
const imgLoad=src=>new Promise(res=>{if(!src)return res(null);const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=src});
const lumOf=h=>{const n=parseInt(h.slice(1),16);return(((n>>16)&255)*.3+((n>>8)&255)*.59+(n&255)*.11)/255};
async function drawCard(cv,o){const W=900,H=1240,x=cv.getContext('2d');cv.width=W;cv.height=H;const col=o.color||CARD_COLORS[0];
  const [ph,logo,bm]=await Promise.all([imgLoad(o.photo),imgLoad('logo.png'),imgLoad('img/b-mark.png')]);
  const rr=(a,b,w,h,r)=>{x.beginPath();x.roundRect?x.roundRect(a,b,w,h,r):x.rect(a,b,w,h)};
  x.clearRect(0,0,W,H);x.save();rr(0,0,W,H,64);x.clip();x.fillStyle='#17171C';x.fillRect(0,0,W,H);
  /* photo field */
  x.save();x.beginPath();x.rect(210,0,W-210,H);x.clip();
  x.fillStyle='#10131C';x.fillRect(0,0,W,H);x.fillStyle=col+'40';x.fillRect(0,0,W,H);
  if(ph){const s=Math.max((W-210)/ph.width,H/ph.height),w=ph.width*s,h=ph.height*s;x.drawImage(ph,210+(W-210-w)/2,0,w,h)}
  else{x.fillStyle='rgba(255,255,255,.22)';x.beginPath();x.arc(555,470,150,0,7);x.fill();x.beginPath();x.ellipse(555,980,310,330,0,Math.PI,0);x.fill()}
  x.strokeStyle='rgba(255,255,255,.14)';x.lineWidth=3;for(let i=-H;i<W+H;i+=26){x.beginPath();x.moveTo(i,0);x.lineTo(i-520,H);x.stroke()}
  x.restore();
  /* accent triangle bottom right + dark stripe */
  x.beginPath();x.moveTo(210,H);x.lineTo(W,850);x.lineTo(W,H);x.closePath();x.fillStyle=col;x.fill();
  x.beginPath();x.moveTo(210,H-64);x.lineTo(W,786);x.lineTo(W,850);x.lineTo(210,H);x.closePath();x.fillStyle='rgba(23,23,28,.75)';x.fill();
  x.beginPath();x.moveTo(210,H);x.lineTo(W,850);x.lineTo(W,H);x.closePath();x.fillStyle=col;x.fill();
  /* dark name strip */
  x.fillStyle='#202026';x.fillRect(0,0,210,H);
  x.beginPath();x.moveTo(0,760);x.lineTo(210,980);x.lineTo(210,H);x.lineTo(0,H);x.closePath();x.fillStyle=col;x.fill();
  x.fillStyle='#202026';x.fillRect(0,0,210,H-300);x.beginPath();x.moveTo(0,H-300);x.lineTo(210,H-300);x.lineTo(210,H-210);x.lineTo(0,H-300);x.closePath();x.fill();
  if(bm){const w=150,h=w*bm.height/bm.width;x.drawImage(bm,30,60,w,h)}
  const dark=lumOf(col)>.5,name=(o.name||'שחקן BrainBall').trim();
  x.save();x.translate(104,H-340);x.rotate(-Math.PI/2);x.direction='rtl';x.textAlign='left';x.fillStyle='#fff';let fs=104;x.font=`800 ${fs}px Heebo,Outfit,sans-serif`;while(x.measureText(name).width>760&&fs>40){fs-=4;x.font=`800 ${fs}px Heebo,Outfit,sans-serif`}
  x.textAlign='left';x.direction='ltr';x.fillText(name,0,0);
  if(o.sub){x.font='600 40px Heebo,Outfit,sans-serif';x.globalAlpha=.75;x.fillText(o.sub,0,64);x.globalAlpha=1}x.restore();
  /* BrainBall logo bottom right */
  const pw=330,ph2=92,px=W-pw-40,py=H-ph2-40;x.fillStyle='#17171C';rr(px,py,pw,ph2,46);x.fill();
  if(logo){const h=54,w=h*logo.width/logo.height;x.drawImage(logo,px+(pw-w)/2,py+(ph2-h)/2,w,h)}
  x.restore();return cv}
function cardData(){const p=profile||{};return{photo:S.get('cardPhoto',null)||p.avatar||'',color:S.get('cardColor',CARD_COLORS[0]),name:p.name||'',sub:[p.team||p.ownTeam||p.club||''].filter(Boolean).join(' · ')}}
let cardBusy=false;
async function paintCard(){const cv=$('#cardCv');if(!cv||cardBusy)return;cardBusy=true;const d=cardData();try{await drawCard(cv,d)}finally{cardBusy=false}
  $('#cardSave').hidden=!d.photo;$('#cardHint').textContent=d.photo?'':'העלה תמונה, וקבל כרטיס שחקן לשיתוף.';
  $('#cardColors').innerHTML=CARD_COLORS.map(c=>`<button type="button" class="cc" data-c="${c}" aria-pressed="${c===S.get('cardColor',CARD_COLORS[0])}" style="background:${c}" aria-label="צבע"></button>`).join('')}
function cardPhotoData(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const s=Math.min(1,1100/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',.86))};im.onerror=rej;im.src=r.result};r.onerror=rej;r.readAsDataURL(f)})}
const cardBlob=()=>new Promise(r=>$('#cardCv').toBlob(r,'image/png'));
$('#cardColors').onclick=e=>{const b=e.target.closest('[data-c]');if(!b)return;S.set('cardColor',b.dataset.c);paintCard()};
$('#cardFile').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{S.set('cardPhoto',await cardPhotoData(f));await paintCard()}catch(er){toast('התמונה לא נטענה. נסה תמונה אחרת.')}};
$('#cardSave').onclick=async()=>{await paintCard();const b=await cardBlob(),f=new File([b],'brainball-card.png',{type:'image/png'});
  if(navigator.canShare?.({files:[f]})){try{await navigator.share({files:[f],title:'הכרטיס שלי ב-BrainBall'});return}catch(er){if(er?.name==='AbortError')return}}
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='brainball-card.png';document.body.appendChild(a);a.click();a.remove();toast('הכרטיס נשמר')};
