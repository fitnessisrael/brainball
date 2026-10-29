/* Ball tracking + counting logic (no camera code here, so it can be tested alone).
   juggle: one full up-then-down of the ball = 1.   feet: every pass from one side to the other = 1. */
function BallCounter(mode){
  const feet=mode==='feet',gap=feet?140:230,minPx=feet?10:14;
  let ext=null,lo=0,hi=0,dir=0,n=0,lastT=-1e9;const ds=[];
  const med=a=>{if(!a.length)return 0;const s=[...a].sort((x,y)=>x-y);return s[s.length>>1]};
  const hit=t=>{if(t-lastT<gap)return 0;lastT=t;n++;return 1};
  return{
    get n(){return n},get dir(){return dir},get diam(){return med(ds)},
    /* t ms, a = position on the counted axis (juggle: up is bigger; feet: x), d = ball diameter in px */
    push(t,a,d){
      if(d>0){ds.push(d);if(ds.length>15)ds.shift()}
      const dm=med(ds)||d||40,h=Math.max(dm*(feet?.7:.9),minPx);let c=0;
      if(ext===null){ext=lo=hi=a;return 0}
      if(dir===0){lo=Math.min(lo,a);hi=Math.max(hi,a);if(a-lo>h){dir=1;ext=a;if(feet)c=hit(t)}else if(hi-a>h){dir=-1;ext=a;if(feet)c=hit(t)}}
      else if(dir===1){if(a>ext)ext=a;else if(ext-a>h){dir=-1;ext=a;c=hit(t)}}
      else{if(a<ext)ext=a;else if(a-ext>h){dir=1;ext=a;if(feet)c=hit(t)}}
      return c},
    /* ball went out of the top of the picture while rising: that is the peak */
    peakGone(t,aTop){if(!feet&&dir===1){dir=-1;ext=aTop;return hit(t)}return 0}}}
/* choose which detection is "the ball": continue the last track, otherwise the most confident one */
function pickBall(dets,last,dm,vh,now){
  const ok=dets.filter(b=>{const r=b.w/b.h;return r>.5&&r<2&&b.w>=6&&b.w<vh*.6});if(!ok.length)return null;
  if(last&&now-last.t<700){const R=Math.max(8*(dm||30),vh*.3);let best=null,bd=1e9;
    for(const b of ok){const d=Math.hypot(b.cx-last.cx,b.cy-last.cy);if(d<R&&d<bd){bd=d;best=b}}if(best)return best}
  return ok.sort((a,b)=>b.score-a.score)[0]}
if(typeof module!=='undefined')module.exports={BallCounter,pickBall};
