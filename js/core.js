/* ================= helpers & storage ================= */
const S={get(k,d){try{const v=localStorage.getItem('bb_'+k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem('bb_'+k,JSON.stringify(v))}catch(e){}}};
let profile=S.get('profile2',null),hist=S.get('hist',[]);
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.random()*a.length|0];
const median=a=>{if(!a.length)return null;const s=[...a].sort((p,q)=>p-q),m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2};
const mean=a=>a.length?a.reduce((p,q)=>p+q,0)/a.length:0;
const sd=a=>{if(a.length<2)return 0;const m=mean(a);return Math.sqrt(a.reduce((p,q)=>p+(q-m)**2,0)/(a.length-1))};
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mmss=s=>{s=Math.max(0,Math.round(s));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`};
const LV={beginner:'מתחילים',plus:'בינוני',pro:'מקצוענים'};
const ROLE={player:'שחקן',coach:'מאמן',manager:'מנהל מועדון',admin:'מנהל מערכת'};
const AREAS={field:'מגרש וכדור',speed:'מהירות תגובה',decision:'קבלת החלטות',attention:'קשב ומודעות',focus:'מיקוד ורוגע'};
const G=(a,b)=>`radial-gradient(circle at 78% 25%,${a},transparent 45%),radial-gradient(circle at 20% 80%,${b},transparent 50%)`;
const LOGO=new Image();LOGO.src='logo.png';

/* ================= sound ================= */
let sndOn=S.get('snd',true),AC=null;
function ac(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();return AC}catch(e){return null}}
function tone(f,d=.12,v=.25,type='sine'){if(!sndOn)return;const a=ac();if(!a)return;const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=f;g.gain.setValueAtTime(v,a.currentTime);g.gain.exponentialRampToValueAtTime(.001,a.currentTime+d);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+d+.03)}
const sfx={tick:()=>tone(660,.14,.32),go:()=>tone(1046,.32,.38),ok:()=>{tone(880,.08,.22);setTimeout(()=>tone(1320,.14,.22),70)},bad:()=>tone(200,.2,.25,'triangle'),pop:()=>tone(990,.08,.3,'square'),swap:()=>tone(880,.1,.22),boom:()=>{if(!sndOn)return;const a=ac();if(!a)return;const n=a.createBufferSource(),len=Math.floor(a.sampleRate*.32),b=a.createBuffer(1,len,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2);n.buffer=b;const g=a.createGain();g.gain.value=.45;n.connect(g).connect(a.destination);n.start();tone(150,.26,.35,'triangle');tone(560,.09,.16,'square')}};
function ambient(){const a=ac();if(!a||!sndOn)return null;const out=a.createGain();out.gain.setValueAtTime(0,a.currentTime);out.gain.linearRampToValueAtTime(.09,a.currentTime+2);
  const lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=700;lp.connect(out);out.connect(a.destination);
  const os=[110,164.8,220.4,277.2].map((f,i)=>{const o=a.createOscillator();o.type='sine';o.frequency.value=f;o.detune.value=i*4;const g=a.createGain();g.gain.value=i===3?.08:.25;o.connect(g).connect(lp);o.start();return o});
  return{stop(){try{out.gain.linearRampToValueAtTime(0,a.currentTime+.6);setTimeout(()=>os.forEach(o=>{try{o.stop()}catch(e){}}),700)}catch(e){}}}}
function breathSnd(dur,inhale){const a=ac();if(!a||!sndOn)return;const len=Math.floor(a.sampleRate*dur),b=a.createBuffer(1,len,a.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  const s=a.createBufferSource();s.buffer=b;const f=a.createBiquadFilter();f.type='bandpass';f.frequency.value=inhale?1100:650;f.Q.value=.6;const g=a.createGain(),t=a.currentTime;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.045,t+dur*(inhale?.7:.2));g.gain.linearRampToValueAtTime(0,t+dur);s.connect(f).connect(g).connect(a.destination);s.start()}
const SPK_ON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/></svg>';
const SPK_OFF='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>';
function paintSnd(){$('#sndBtn').innerHTML=sndOn?SPK_ON:SPK_OFF;$('#sndBtn').setAttribute('aria-label',sndOn?'השתק סאונד':'הפעל סאונד')}
$('#sndBtn').onclick=()=>{sndOn=!sndOn;S.set('snd',sndOn);paintSnd();if(!sndOn)hush();if(!sndOn&&RUN?.amb){RUN.amb.stop();RUN.amb=null}else if(sndOn&&RUN?.wantAmb&&!RUN.amb)RUN.amb=ambient()};
paintSnd();


/* ================= voice-over (Hebrew text to speech) ================= */
let voiceOn=S.get('voice',true);
function heVoice(){try{const vs=speechSynthesis.getVoices();return vs.find(v=>/^(he|iw)/i.test(v.lang)&&/natural|enhanced|premium|google/i.test(v.name))||vs.find(v=>/^(he|iw)/i.test(v.lang))||null}catch(e){return null}}
try{speechSynthesis.onvoiceschanged=()=>{}}catch(e){}
var _vo=null;
function say(t){try{if(!t||!voiceOn||!sndOn)return;hush();let id=null;try{for(const k in VO)if(VO[k]===t){id=k;break}}catch(e){}
 const tts=()=>{try{if(!window.speechSynthesis)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='he-IL';const v=heVoice();if(v)u.voice=v;u.rate=1.0;u.pitch=1;speechSynthesis.speak(u)}catch(e){}};
 if(!id)return tts();
 const a=new Audio('audio/vo_'+id+'.mp3');_vo=a;a.onerror=()=>{if(_vo===a)tts()};const p=a.play();if(p&&p.catch)p.catch(()=>{if(_vo===a)tts()})}catch(e){}}
/* spoken instruction clips (audio/cue_<key>.mp3, Itamar). One shared <audio> element that is unlocked by the player's tap, because
   iPhones refuse to play a NEW audio element later without a tap. Resolves when the clip ends; falls back to the phone voice. */
let _cueEl=null;
function unlockCue(){try{if(!_cueEl)_cueEl=new Audio();_cueEl.src='data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=';const p=_cueEl.play();if(p&&p.catch)p.catch(()=>{})}catch(e){}}
function cueSay(key,text){if(!voiceOn||!sndOn)return Promise.resolve();hush();
 return new Promise(res=>{let done=false;const fin=()=>{if(!done){done=true;res()}};
  const tts=()=>{try{if(!window.speechSynthesis){fin();return}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='he-IL';const v=heVoice();if(v)u.voice=v;u.onend=fin;u.onerror=fin;speechSynthesis.speak(u)}catch(e){fin()}};
  try{if(!_cueEl)_cueEl=new Audio();const a=_cueEl;a.onended=fin;a.onerror=()=>{if(_vo===a)tts();else fin()};a.src='audio/cue_'+key+'.mp3';_vo=a;const p=a.play();if(p&&p.catch)p.catch(()=>{if(_vo===a)tts();else fin()})}catch(e){tts()}
  setTimeout(fin,20000)})}
function hush(){try{if(_vo){_vo.pause();_vo=null}}catch(e){}try{window.speechSynthesis&&speechSynthesis.cancel()}catch(e){}}

/* ================= icons ================= */
const ICONS={
 bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
 arrows:'<path d="M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
 stop:'<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><path d="M8.5 12h7"/>',
 pitch:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14"/><circle cx="12" cy="12" r="2.5"/>',
 flame:'<path d="M12 3c.5 3.5 5 5.5 5 10.5a5 5 0 0 1-10 0c0-2.5 1.5-3.5 2-6 1.5 1 2.5 2.3 2.5 4"/>',
 scan:'<circle cx="11" cy="11" r="6.5"/><path d="M20.5 20.5L16 16"/>',
 eye:'<path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
 display:'<rect x="3" y="4" width="18" height="12" rx="2.5"/><path d="M12 16v4M8 20h8M10 8.5l3.5 1.5L10 11.5z"/>',
 flask:'<path d="M9 3h6M10 3v6L4.5 19a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L14 9V3"/><path d="M7.5 15h9"/>',
 ball:'<circle cx="12" cy="12" r="9"/><path d="M12 7.5l3.8 2.8-1.5 4.4H9.7l-1.5-4.4z"/><path d="M12 3v4.5M15.8 10.3l4.4-1.5M14.3 14.7l2.7 3.8M9.7 14.7L7 18.5M8.2 10.3L3.8 8.8"/>',
 grid:'<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
 spark:'<path d="M12 2v5M12 17v5M2 12h5M17 12h5M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/>',
 feet:'<path d="M7.5 3C6 3 5 5.5 5 8.5S6 13 7.5 13 10 11.5 10 8.5 9 3 7.5 3zM16.5 9C15 9 14 11.5 14 14.5s1 4.5 2.5 4.5 2.5-1.5 2.5-4.5-1-5.5-2.5-5.5z"/><path d="M5.5 16h4M14.5 22h4"/>',
 wind:'<path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
 camera:'<path d="M4 7.5h3L9 4.5h6l2 3h3V19H4z"/><circle cx="12" cy="13" r="3.8"/>',
 player:'<circle cx="14.5" cy="4" r="2"/><path d="M7 21l3.2-6 3.3 2.2V22M5 11.5l4.2-4 4.3 1.8 3 3.2M10.2 15l-1.8-4.2"/>',
 coach:'<rect x="5" y="4" width="14" height="17" rx="2.5"/><path d="M9 4V2.5h6V4M8.5 10h7M8.5 14h7M8.5 18h4"/>',
 club:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
 check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 chat:'<path d="M4 20l1.4-4.2A8 8 0 1 1 8.3 19z"/><path d="M9 10.5c.3 1.8 2.2 3.7 4 4l1.2-1.2 1.8 1-.6 1.5c-3.4.2-6.8-3.2-6.6-6.6l1.5-.6 1 1.8z"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 trash:'<path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13"/>',
 hand:'<path d="M7 11.5V5.5a1.5 1.5 0 0 1 3 0v5M10 10V3.5a1.5 1.5 0 0 1 3 0V10M13 10.5V4.5a1.5 1.5 0 0 1 3 0V11M16 11.5V8a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-.8a6.2 6.2 0 0 1-5.2-2.9L3.4 13.8a1.6 1.6 0 0 1 2.6-1.8L7 13.5"/>',
 cone:'<path d="M12 3l6.5 16h-13z"/><path d="M8.7 11h6.6M7.2 15h9.6M3 21h18"/>',
 rec:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5" fill="currentColor"/>',
 speaker:'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
 mute:'<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
 bell:'<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
 logout:'<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
 users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.6 3.5 6"/>',
 table:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 10h18M9 10v10"/>',
 lock:'<rect x="5" y="10" width="14" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
 send:'<path d="M21 3L3 10.5l7 3 3 7z"/><path d="M10 13.5l4.5-4.5"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
 chev:'<path d="M15 6l-6 6 6 6"/>',
 up:'<path d="M6 15l6-6 6 6"/>',down:'<path d="M6 9l6 6 6-6"/>',
 image:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
 share:'<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.4 13.3l7.2 4.3M15.6 6.4l-7.2 4.3"/>',
 home:'<path d="M3.5 11l8.5-7 8.5 7v8.5a1 1 0 0 1-1 1h-4.5v-6h-6v6H4.5a1 1 0 0 1-1-1z"/>',
 chart:'<path d="M4 20V11M10 20V5M16 20v-6M21 20H3"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
 phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
 heart:'<path d="M12 20.5S3.5 15 3.5 9a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2c0 6-8.5 11.5-8.5 11.5z"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
 play:'<rect x="3" y="5" width="18" height="14" rx="3.5"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/>',
 swap:'<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
 sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'
};
const I=(n,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]||''}</svg>`;
const SKEL=(cls='')=>`<svg class="skel ${cls}" viewBox="0 0 60 110" aria-hidden="true"><circle class="head" cx="30" cy="10" r="7"/><path class="bone" d="M30 18v37M18 25h24M18 25l-6 17 2 16M42 25l6 17-2 16M22 55h16M22 55l-2 25v24"/><g class="leg"><path class="bone" d="M38 55l2 25v24"/><circle class="jt" cx="40" cy="80" r="3"/><circle class="jt" cx="40" cy="104" r="3"/></g><g><circle class="jt" cx="18" cy="25" r="3"/><circle class="jt" cx="42" cy="25" r="3"/><circle class="jt" cx="12" cy="42" r="3"/><circle class="jt" cx="48" cy="42" r="3"/><circle class="jt" cx="22" cy="55" r="3"/><circle class="jt" cx="38" cy="55" r="3"/><circle class="jt" cx="20" cy="80" r="3"/><circle class="jt" cx="20" cy="104" r="3"/></g></svg>`;
const BALL=(cls='',st='')=>`<svg class="dm-ballsvg ${cls}" style="${st}" viewBox="0 0 24 24" fill="#fff" stroke="#0B0B0F" stroke-width="1.4" stroke-linejoin="round"><circle cx="12" cy="12" r="10.5"/><path d="M12 7.5l3.8 2.8-1.5 4.4H9.7l-1.5-4.4z" fill="#0B0B0F"/></svg>`;
function paintIcons(root=document){root.querySelectorAll('[data-i]').forEach(e=>{if(!e.firstChild)e.innerHTML=I(e.dataset.i)})}

/* ---------- canvas helpers ---------- */
function canvasStage(){stageHTML(`<canvas class="cv" id="cv"></canvas><div class="cvmsg" id="cvMsg"></div><div class="cvbar" id="cvBar"></div><div class="okmark" id="okm"></div>`,'full');
  const cv=$('#cv'),cx=cv.getContext('2d'),dpr=devicePixelRatio||1,r=stage.getBoundingClientRect();cv.width=r.width*dpr;cv.height=r.height*dpr;cx.setTransform(dpr,0,0,dpr,0,0);
  return{cv,cx,W:r.width,H:r.height}}
function animate(step){const r=RUN;return new Promise(res=>{let last=performance.now();const f=now=>{if(r.cancel)return res();const dt=Math.min(.05,(now-last)/1000);last=now;if(step(dt,now)===false)return res();r.raf=requestAnimationFrame(f)};r.raf=requestAnimationFrame(f)}).then(()=>chkR(r))}
function moveBalls(bs,R,W,top,bot,speed,dt){for(const b of bs){b.x+=b.vx*speed*dt;b.y+=b.vy*speed*dt;
  if(b.x<R){b.x=R;b.vx=Math.abs(b.vx)}if(b.x>W-R){b.x=W-R;b.vx=-Math.abs(b.vx)}if(b.y<top+R){b.y=top+R;b.vy=Math.abs(b.vy)}if(b.y>bot-R){b.y=bot-R;b.vy=-Math.abs(b.vy)}}}
function spawn(n,R,W,top,bot){const bs=[];for(let i=0;i<n;i++){let b,t=0;do{b={x:rnd(R,W-R),y:rnd(top+R,bot-R)};t++}while(t<200&&bs.some(o=>Math.hypot(o.x-b.x,o.y-b.y)<R*2.6));const a=rnd(0,7);b.vx=Math.cos(a);b.vy=Math.sin(a);bs.push(b)}return bs}
const nearest=(bs,x,y)=>{let best=null,bd=1e9;for(const b of bs){const d=Math.hypot(b.x-x,b.y-y);if(d<bd){bd=d;best=b}}return[best,bd]};
