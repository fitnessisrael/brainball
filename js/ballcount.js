/* Ball tracking + counting logic (no camera code here, so it can be tested alone).
   juggle: every rise of the ball (even a tiny one) = 1.   feet: every pass from one side to the other = 1. */
function BallCounter(mode){
  const feet=mode==='feet',gap=feet?130:170,minPx=3;
  let ext=null,lo=0,hi=0,dir=0,n=0,lastT=-1e9;const ds=[];
  const med=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);return s[s.length>>1]};
  const hit=t=>{if(t-lastT<gap)return 0;lastT=t;n++;return 1};
  return{
    get n(){return n},get dir(){return dir},get diam(){return med(ds)},
    /* t ms, a = position on the counted axis (juggle: up is bigger; feet: x), d = ball diameter in px */
    push(t,a,d){
      if(d>0){ds.push(d);if(ds.length>15)ds.shift()}
      const dm=med(ds)||d||40,h=Math.max(dm*(feet?.6:.33),minPx);let c=0;
      if(ext===null){ext=lo=hi=a;return 0}
      if(dir===0){lo=Math.min(lo,a);hi=Math.max(hi,a);if(a-lo>h){dir=1;ext=a;c=hit(t)}else if(hi-a>h){dir=-1;ext=a;if(feet)c=hit(t)}}
      else if(dir===1){if(a>ext)ext=a;else if(ext-a>h){dir=-1;ext=a;if(feet)c=hit(t)}}
      else{if(a<ext)ext=a;else if(a-ext>h){dir=1;ext=a;c=hit(t)}}
      return c},
    /* ball left the picture through the top while rising: from now on it is coming down */
    peakGone(aTop){if(!feet&&dir===1){dir=-1;ext=aTop}}}}
/* choose which detection is "the ball": the one nearest the predicted spot, otherwise the most confident */
function pickBall(dets,pred,dm,vh,now,R){
  const ok=dets.filter(b=>{const r=b.w/b.h;return r>.5&&r<2&&b.w>=5&&b.w<vh*.6});if(!ok.length)return null;
  if(pred){let best=null,bd=1e9;for(const b of ok){const d=Math.hypot(b.cx-pred.x,b.cy-pred.y);if(d<R&&d<bd){bd=d;best=b}}if(best)return best;if(pred.strict)return null}
  return ok.sort((a,b)=>b.score-a.score)[0]}
/* small grayscale patch tracker: finds the template inside img near (cx,cy). Used when the detector blinks on a fast ball.
   returns {cx,cy,err,ok}. tpl/img are plain arrays of 0..255 luma. */
function patchFind(tpl,tw,th,img,iw,ih,cx,cy,rad){
  let tm=0;for(let i=0;i<tpl.length;i++)tm+=tpl[i];tm/=tpl.length;let tc=0;for(let i=0;i<tpl.length;i++)tc+=Math.abs(tpl[i]-tm);tc/=tpl.length;
  const x0=Math.max(0,Math.round(cx-tw/2-rad)),x1=Math.min(iw-tw,Math.round(cx-tw/2+rad)),y0=Math.max(0,Math.round(cy-th/2-rad)),y1=Math.min(ih-th,Math.round(cy-th/2+rad));
  let best=1e9,bx=cx,by=cy;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){let wm=0;for(let j=0;j<th;j++){const o=(y+j)*iw+x;for(let i=0;i<tw;i++)wm+=img[o+i]}wm/=tw*th;
    let e=0;for(let j=0;j<th;j++){const o=(y+j)*iw+x,t=j*tw;for(let i=0;i<tw;i++)e+=Math.abs((img[o+i]-wm)-(tpl[t+i]-tm))}e/=tw*th;
    if(e<best){best=e;bx=x+tw/2;by=y+th/2}}
  return{cx:bx,cy:by,err:best,ok:best<Math.max(.6*tc,4)}}
if(typeof module!=='undefined')module.exports={BallCounter,pickBall,patchFind};
