/* ================= cognitive analytics =================
   Every result becomes a BrainBall index 0-100 per exercise. These are internal reference ranges
   for comparing a player with himself and with his team. They are not a clinical measurement. */
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const LVL_SEC={sweeper:{beginner:60,plus:120,pro:180}};
function idx(game,score,level,dur){if(score==null||isNaN(score))return null;const s=+score;
  switch(game){
    case'reaction':return clamp((480-s)/(480-220)*100);
    case'strobe':return clamp((900-s)/(900-300)*100);
    case'periph':return clamp((1100-s)/(1100-400)*100);
    case'colortask':return clamp((9-s)/(9-3)*100);
    case'choice':case'scenarios':case'warmup':case'tracking':return clamp(s);
    case'gonogo':return clamp(100-s*1.6);
    case'sweeper':{const sec=LVL_SEC.sweeper[level]||120;return clamp(s/(sec/60)/60*100)}
    case'juggle':return dur?clamp(s/(dur/60)/80*100):null;
    case'feetcall':return dur?clamp(s/(dur/60)/120*100):null;
    default:return null}}
const DOMAINS={speed:{name:'מהירות תגובה',games:['reaction','colortask','strobe'],c:'#FF7A1A'},decision:{name:'קבלת החלטות',games:['choice','gonogo','scenarios','warmup'],c:'#00E0FF'},attention:{name:'קשב ומודעות',games:['tracking','sweeper','periph'],c:'#AA44FF'},ball:{name:'שליטה בכדור',games:['juggle','feetcall'],c:'#3DF59A'}};
const domainOf=g=>Object.keys(DOMAINS).find(k=>DOMAINS[k].games.includes(g));
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const dayKey=d=>{const x=new Date(d);return x.getFullYear()+'-'+(x.getMonth()+1)+'-'+x.getDate()};
// rows: {user_id,game,level,score,partial,duration,created_at}
function scored(rows){return rows.filter(r=>!r.partial).map(r=>({...r,ix:idx(r.game,r.score,r.level,r.duration),t:+new Date(r.created_at)})).filter(r=>r.ix!=null)}
// profile = average of each player's latest 3 results per exercise, then per domain
function profileOf(rows){const by={};scored(rows).forEach(r=>{const k=r.user_id+'|'+r.game;(by[k]=by[k]||[]).push(r)});
  const perGame={};Object.entries(by).forEach(([k,a])=>{const g=k.split('|')[1];const last=a.slice(-3).map(x=>x.ix);(perGame[g]=perGame[g]||[]).push(avg(last))});
  const out={};Object.entries(DOMAINS).forEach(([d,D])=>{const v=D.games.flatMap(g=>perGame[g]||[]);out[d]=v.length?Math.round(avg(v)):null});return out}
const overall=p=>{const v=Object.values(p).filter(x=>x!=null);return v.length?Math.round(avg(v)):null};
// improvement in index points: first 3 vs last 3 of the same exercise, averaged over exercises with 4+ results
function improvement(rows){const by={};scored(rows).forEach(r=>{(by[r.game]=by[r.game]||[]).push(r.ix)});
  const d=Object.values(by).filter(a=>a.length>=4).map(a=>avg(a.slice(-3))-avg(a.slice(0,3)));return d.length?Math.round(avg(d)):null}
function consistency(rows){const v=scored(rows).slice(-12).map(r=>r.ix);if(v.length<4)return null;const m=avg(v),s=Math.sqrt(avg(v.map(x=>(x-m)**2)));return Math.round(clamp(100-s*2))}
function streakDays(rows){const days=new Set(rows.map(r=>dayKey(r.created_at)));let n=0,d=new Date();if(!days.has(dayKey(d)))d.setDate(d.getDate()-1);while(days.has(dayKey(d))){n++;d.setDate(d.getDate()-1)}return n}
const groupBy=(a,f)=>a.reduce((m,x)=>{const k=f(x);(m[k]=m[k]||[]).push(x);return m},{});

/* ---------- charts (plain SVG) ---------- */
function barsChart(rows,days=30){const now=new Date();now.setHours(0,0,0,0);const cnt=[];for(let i=days-1;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);cnt.push({d,n:0})}
  const map=Object.fromEntries(cnt.map(c=>[dayKey(c.d),c]));rows.forEach(r=>{const c=map[dayKey(r.created_at)];if(c)c.n++});
  const mx=Math.max(1,...cnt.map(c=>c.n)),W=320,H=110,bw=W/days;
  return `<svg class="chart" viewBox="0 0 ${W} ${H+18}" preserveAspectRatio="none" role="img" aria-label="אימונים ב-${days} ימים">
    <defs><linearGradient id="bg1" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#AA44FF"/><stop offset="1" stop-color="#FF3FDC"/></linearGradient></defs>
    ${[.5,1].map(f=>`<line x1="0" x2="${W}" y1="${H-H*f}" y2="${H-H*f}" stroke="rgba(255,255,255,.07)"/>`).join('')}
    ${cnt.map((c,i)=>`<rect x="${(days-1-i)*bw+1.5}" y="${H-(c.n/mx)*H}" width="${bw-3}" height="${(c.n/mx)*H||0}" rx="2" fill="url(#bg1)" opacity="${c.n?1:.15}"><title>${c.d.toLocaleDateString('he-IL')}: ${c.n}</title></rect>`).join('')}
    <text x="${W}" y="${H+14}" fill="#6F6982" font-size="9" text-anchor="end">לפני ${days} ימים</text><text x="0" y="${H+14}" fill="#6F6982" font-size="9">היום</text>
    <text x="${W-2}" y="10" fill="#A9A3BB" font-size="9" text-anchor="end">${mx}</text></svg>`}
function domainBars(p,cmp){return `<div class="dbars">${Object.entries(DOMAINS).map(([k,D])=>{const v=p[k],c=cmp?.[k];return `<div class="dbar"><div class="dbar-h"><span>${D.name}</span><b class="mono">${v??'-'}</b></div><div class="dbar-t"><i style="width:${v??0}%;background:${D.c}"></i>${c!=null?`<em style="right:${c}%" title="ממוצע להשוואה"></em>`:''}</div></div>`}).join('')}</div>`}
function radar(p,size=220,cmp){const ks=Object.keys(DOMAINS),n=ks.length,c=size/2,R=size/2-34;const pt=(i,v)=>{const a=-Math.PI/2+i*2*Math.PI/n;return[c+Math.cos(a)*R*v/100,c+Math.sin(a)*R*v/100]};
  const poly=(vals)=>vals.map((v,i)=>pt(i,v??0).join(',')).join(' ');
  return `<svg class="radar" viewBox="0 0 ${size} ${size}" role="img" aria-label="פרופיל קוגניטיבי">
    ${[25,50,75,100].map(l=>`<polygon points="${poly(ks.map(()=>l))}" fill="none" stroke="rgba(255,255,255,${l===100?.18:.07})"/>`).join('')}
    ${ks.map((k,i)=>{const[x,y]=pt(i,100);return `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,.07)"/>`}).join('')}
    ${cmp?`<polygon points="${poly(ks.map(k=>cmp[k]))}" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.35)" stroke-dasharray="4 4"/>`:''}
    <polygon points="${poly(ks.map(k=>p[k]))}" fill="rgba(255,43,214,.22)" stroke="#FF3FDC" stroke-width="2.5" stroke-linejoin="round"/>
    ${ks.map((k,i)=>{const[x,y]=pt(i,p[k]??0);return `<circle cx="${x}" cy="${y}" r="4" fill="${DOMAINS[k].c}"/>`}).join('')}
    ${ks.map((k,i)=>{const[x,y]=pt(i,128);return `<text x="${x}" y="${y}" fill="#C9C4D8" font-size="11" font-weight="600" text-anchor="middle" dominant-baseline="middle">${DOMAINS[k].name}</text>`}).join('')}</svg>`}
const kpi=(v,l,sub,cls='')=>`<div class="kpi ${cls}"><div class="v">${v??'-'}</div><div class="l">${l}</div>${sub?`<div class="s">${sub}</div>`:''}</div>`;
const trend=d=>d==null?'':`<span class="trend ${d>=0?'up':'dn'}">${d>0?'+':''}${d}</span>`;

/* ---------- people-level summary for any group ---------- */
function peopleStats(people,ses){const wk=Date.now()-7*864e5,mo=Date.now()-30*864e5;const by=groupBy(ses,r=>r.user_id);
  return people.filter(p=>p.role==='player').map(p=>{const s=by[p.id]||[];const prof=profileOf(s);
    return{...p,ses:s,n7:s.filter(r=>+new Date(r.created_at)>wk).length,n30:s.filter(r=>+new Date(r.created_at)>mo).length,last:s.length?s[s.length-1].created_at:null,prof,ov:overall(prof),imp:improvement(s),cons:consistency(s),streak:streakDays(s)}})}

/* ---------- full insight dashboard (club, team or whole system) ---------- */
function insightHTML(people,ses,{title='',teams=null,showPlayers=true}={}){
  const P=peopleStats(people,ses),players=P.length,act7=P.filter(p=>p.n7>0).length,s7=ses.filter(r=>+new Date(r.created_at)>Date.now()-7*864e5).length;
  const prof=profileOf(ses),ov=overall(prof),imps=P.filter(p=>p.imp!=null),impAvg=imps.length?Math.round(avg(imps.map(p=>p.imp))):null;
  const mins=Math.round(ses.reduce((a,r)=>a+(+r.duration||0),0)/60);
  const top=[...P].filter(p=>p.ov!=null).sort((a,b)=>b.ov-a.ov).slice(0,5),risers=[...imps].sort((a,b)=>b.imp-a.imp).slice(0,5);
  const quiet=P.filter(p=>p.n7===0).sort((a,b)=>(+new Date(b.last||0))-(+new Date(a.last||0))).slice(0,6);
  const strongest=Object.entries(prof).filter(([,v])=>v!=null).sort((a,b)=>b[1]-a[1]);
  const gameUse=Object.entries(groupBy(ses,r=>r.game)).sort((a,b)=>b[1].length-a[1].length).slice(0,6);
  const tips=[];
  if(players&&act7/players<.5)tips.push(`רק ${act7} מתוך ${players} שחקנים התאמנו השבוע. משימה קצרה לכל הקבוצה תחזיר אותם.`);
  if(strongest.length>1){const w=strongest[strongest.length-1];tips.push(`התחום החלש כרגע: ${DOMAINS[w[0]].name} (${w[1]}). כדאי לשלוח משימות מהתחום הזה.`)}
  if(impAvg!=null&&impAvg>0)tips.push(`השחקנים השתפרו בממוצע ב-${impAvg} נקודות מאז שהתחילו.`);
  if(quiet.length)tips.push(`${quiet.length} שחקנים לא התאמנו השבוע. אפשר לשלוח להם תזכורת בוואטסאפ מהטבלה.`);
  return `<div class="kpis">${kpi(players,'שחקנים',`${act7} פעילים השבוע`)}${kpi(s7,'אימונים השבוע',`${mins} דקות ב-90 ימים`)}${kpi(ov,'מדד BrainBall',ov!=null?'ממוצע קבוצתי':'עוד אין נתונים','hl')}${kpi(impAvg!=null?(impAvg>0?'+':'')+impAvg:'-','שיפור ממוצע','נקודות מדד')}</div>
  ${tips.length?`<div class="insights">${tips.map(t=>`<div class="ins">${I('bolt')}<span>${t}</span></div>`).join('')}</div>`:''}
  <div class="panel"><div class="panel-h"><b>פעילות</b><span class="note">אימונים ביום, 30 ימים אחרונים</span></div>${barsChart(ses,30)}</div>
  <div class="panel two"><div><div class="panel-h"><b>פרופיל קוגניטיבי</b><span class="note">ממוצע ${title||'הקבוצה'}</span></div>${radar(prof)}</div><div>${domainBars(prof)}<p class="note">מדד פנימי 0-100 להשוואה בתוך BrainBall. לא אבחון.</p></div></div>
  ${teams?`<div class="panel"><div class="panel-h"><b>השוואת קבוצות</b></div><div class="board-wrap"><table class="board"><thead><tr><th>קבוצה</th><th>שחקנים</th><th>פעילים השבוע</th><th>מדד</th>${Object.values(DOMAINS).map(d=>`<th>${d.name}</th>`).join('')}</tr></thead><tbody>${teams.map(t=>{const tp=P.filter(p=>p.team_id===t.id),ts=ses.filter(r=>r.team_id===t.id),pr=profileOf(ts);return `<tr data-team="${t.id}"><td><b>${esc(t.name)}</b></td><td class="num">${tp.length}</td><td class="num">${tp.filter(p=>p.n7>0).length}</td><td class="num">${overall(pr)??'-'}</td>${Object.keys(DOMAINS).map(k=>`<td class="num">${pr[k]??'-'}</td>`).join('')}</tr>`}).join('')}</tbody></table></div></div>`:''}
  ${showPlayers?`<div class="panel two"><div><div class="panel-h"><b>המובילים</b><span class="note">מדד BrainBall</span></div>${top.length?`<ol class="rank">${top.map(p=>`<li data-uid="${p.id}"><span>${esc(p.full_name||'')}</span><b class="mono">${p.ov}</b></li>`).join('')}</ol>`:'<p class="note">עוד אין מספיק תוצאות.</p>'}</div>
    <div><div class="panel-h"><b>הכי השתפרו</b><span class="note">מתחילת הדרך</span></div>${risers.length?`<ol class="rank">${risers.map(p=>`<li data-uid="${p.id}"><span>${esc(p.full_name||'')}</span>${trend(p.imp)}</li>`).join('')}</ol>`:'<p class="note">צריך לפחות 4 אימונים באותו תרגיל.</p>'}</div></div>
  ${quiet.length?`<div class="panel"><div class="panel-h"><b>צריכים דחיפה</b><span class="note">לא התאמנו השבוע</span></div><div class="chips">${quiet.map(p=>`<span class="chip" data-uid="${p.id}">${esc(p.full_name||'')}${p.last?` · ${ago(p.last)}`:' · עוד לא התחיל'}</span>`).join('')}</div></div>`:''}`:''}
  ${gameUse.length?`<div class="panel"><div class="panel-h"><b>התרגילים הכי פופולריים</b></div>${gameUse.map(([g,a])=>`<div class="dbar"><div class="dbar-h"><span>${CAT[g]?.name||g}</span><b class="mono">${a.length}</b></div><div class="dbar-t"><i style="width:${a.length/gameUse[0][1].length*100}%"></i></div></div>`).join('')}</div>`:''}`}

/* ---------- one player ---------- */
function playerHTML(p,ses,teamProf){const prof=profileOf(ses),ov=overall(prof),imp=improvement(ses),cons=consistency(ses),st=streakDays(ses);
  const byG=groupBy(scored(ses),r=>r.game);
  return `<div class="kpis">${kpi(ov,'מדד BrainBall',null,'hl')}${kpi(imp!=null?(imp>0?'+':'')+imp:'-','שיפור','נקודות מדד')}${kpi(cons,'יציבות','0-100')}${kpi(st,'ימים ברצף')}</div>
  <div class="panel two"><div>${radar(prof,220,teamProf)}</div><div>${domainBars(prof,teamProf)}<p class="note">הקו האפור הוא ממוצע הקבוצה.</p></div></div>
  ${Object.keys(byG).length?Object.entries(byG).map(([g,a])=>{const vals=a.map(r=>r.ix),first=avg(vals.slice(0,3)),last=avg(vals.slice(-3));return `<div class="hcard"><div class="hcard-h"><b>${CAT[g]?.name||g}</b><span class="note">${a.length} אימונים ${a.length>=4?trend(Math.round(last-first)):''}</span></div><div class="big">${Math.round(last)}</div>${vals.length>1?spark(vals.slice(-15),false):''}</div>`}).join(''):'<div class="empty">עוד אין תוצאות מדודות.</div>'}`}
