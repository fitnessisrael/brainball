/* ================= editable texts (system admin only) =================
   Every visitor gets the texts the admin saved (table ui_text: original -> new text).
   The admin gets a pencil: in edit mode a tap on any text, button or placeholder opens an editor.
   Self-contained (plain fetch, no libraries) so the landing page can use it too. */
(function(){
  const URL='https://xdtcsapcgamlabdslzby.supabase.co',KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkdGNzYXBjZ2FtbGFiZHNsemJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMjg3MjMsImV4cCI6MjEwODcwNDcyM30.lacZlgoMkE3fUhmv-PrBtWAC-tu6rLg-vcLc42SzxUw';
  const CK='bb_ui_text',SK='bb_auth',SKIP=/^(SCRIPT|STYLE|TEXTAREA|NOSCRIPT|SVG|CODE|OPTION)$/;
  let map={};try{map=JSON.parse(localStorage.getItem(CK)||'{}')||{}}catch(e){}
  let editing=false,isAdmin=false;
  const bad=n=>{const p=n.parentElement;return !p||SKIP.test(p.tagName.toUpperCase())||!!p.closest('#teUi')};

  /* ---- apply the saved texts ---- */
  function setNode(n){if(bad(n))return;const cur=n.nodeValue;if(n.__o===undefined)n.__o=cur;else if(cur!==n.__s)n.__o=cur;
    const t=n.__o.trim();if(!t){n.__s=cur;return}const m=map[t];const want=m!=null?n.__o.replace(t,()=>m):n.__o;if(cur!==want)n.nodeValue=want;n.__s=want}
  function setAttrs(el){if(el.closest&&el.closest('#teUi'))return;for(const a of['placeholder','aria-label','title']){const v=el.getAttribute(a);if(v==null)continue;const k='__o_'+a,s='__s_'+a;
    if(el[k]===undefined)el[k]=v;else if(v!==el[s])el[k]=v;const t=el[k].trim(),m=map[t],want=m!=null?m:el[k];if(v!==want)el.setAttribute(a,want);el[s]=want}}
  function applyTo(root){if(!root)return;if(root.nodeType===3){setNode(root);return}if(root.nodeType!==1)return;
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;const list=[];while(n=w.nextNode())list.push(n);list.forEach(setNode);
    if(root.matches&&root.matches('[placeholder],[aria-label],[title]'))setAttrs(root);root.querySelectorAll&&root.querySelectorAll('[placeholder],[aria-label],[title]').forEach(setAttrs)}
  let queued=[],raf=0;const flush=()=>{raf=0;const q=queued;queued=[];q.forEach(applyTo)};
  new MutationObserver(ms=>{for(const m of ms)m.addedNodes.forEach(n=>queued.push(n));if(!raf&&queued.length)raf=requestAnimationFrame(flush)}).observe(document.documentElement,{childList:true,subtree:true});
  const all=()=>{applyTo(document.body);try{localStorage.setItem(CK,JSON.stringify(map))}catch(e){}};
  if(document.body)all();else addEventListener('DOMContentLoaded',all);

  /* ---- server ---- */
  const session=()=>{try{const s=JSON.parse(localStorage.getItem(SK)||'null');return s&&(s.access_token?s:s.currentSession)||null}catch(e){return null}};
  async function token(){let s=session();if(!s)return null;
    if(s.expires_at&&s.expires_at*1000-Date.now()<30000&&s.refresh_token){try{const r=await fetch(URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});
      if(r.ok){const n=await r.json();localStorage.setItem(SK,JSON.stringify(n));s=n}}catch(e){}}
    return s.access_token}
  async function api(path,opt={}){const t=await token();return fetch(URL+'/rest/v1/'+path,{...opt,headers:{apikey:KEY,Authorization:'Bearer '+(t||KEY),'Content-Type':'application/json',...(opt.headers||{})}})}
  fetch(URL+'/rest/v1/ui_text?select=orig,txt',{headers:{apikey:KEY,Authorization:'Bearer '+KEY}}).then(r=>r.ok?r.json():null).then(rows=>{if(!rows)return;const m={};rows.forEach(r=>m[r.orig]=r.txt);map=m;all()}).catch(()=>{});
  async function checkAdmin(){const s=session();if(!s)return;const uid=s.user?.id;if(!uid)return;
    try{const r=await api('profiles?select=role&id=eq.'+uid);const j=await r.json();if(j&&j[0]?.role==='admin'){isAdmin=true;mount()}}catch(e){}}
  addEventListener('storage',e=>{if(e.key===SK)checkAdmin()});
  window.bbTextEditCheck=checkAdmin;
  setTimeout(checkAdmin,600);

  /* ---- admin UI ---- */
  const css=`#teUi{position:fixed;left:12px;bottom:92px;z-index:9990;display:flex;gap:8px;align-items:center;direction:rtl;font-family:Heebo,system-ui,sans-serif}
  #teUi button,#teUi select{font:600 14px Heebo,system-ui,sans-serif;border:0;border-radius:999px;padding:10px 14px;cursor:pointer;color:#fff;background:rgba(30,20,60,.92);box-shadow:0 6px 20px rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.18)}
  #teUi .fab{width:48px;height:48px;padding:0;display:grid;place-items:center;background:linear-gradient(135deg,#FF3FDC,#8A4BFF)}
  #teUi .fab svg{width:22px;height:22px}
  body.te-on #teUi .fab{outline:3px solid #00E0FF}
  body.te-on :not(#teUi):not(#teUi *):hover{outline:1px dashed rgba(0,224,255,.8);outline-offset:1px}
  #teBox{position:fixed;inset:0;z-index:9999;background:rgba(5,3,15,.72);display:grid;align-items:end;direction:rtl;font-family:Heebo,system-ui,sans-serif}
  #teBox[hidden]{display:none}
  #teBox>div{background:#15102B;color:#fff;border-radius:22px 22px 0 0;padding:20px 18px 26px;max-width:560px;width:100%;margin:0 auto;display:grid;gap:10px}
  #teBox h3{margin:0;font-size:20px}#teBox small{opacity:.65;font-size:13px}
  #teBox textarea{width:100%;min-height:96px;border-radius:14px;border:1px solid rgba(255,255,255,.2);background:#0B0818;color:#fff;font:500 17px/1.4 Heebo,system-ui,sans-serif;padding:12px;box-sizing:border-box}
  #teBox .orig{background:rgba(255,255,255,.07);border-radius:12px;padding:10px 12px;font-size:14px;opacity:.85}
  #teBox .row{display:flex;gap:8px}#teBox .row button{flex:1;border:0;border-radius:999px;padding:13px;font:700 16px Heebo,system-ui,sans-serif;cursor:pointer;color:#fff;background:rgba(255,255,255,.12)}
  #teBox .row .go{background:linear-gradient(135deg,#FF3FDC,#8A4BFF)}`;
  const ICO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
  const VIEWS=[['intro','פתיחה'],['start','הרשמה'],['home','בית'],['train','אימונים'],['stats','ביצועים'],['account','חשבון'],['hub','מתחם אימונים']];
  function mount(){if(document.getElementById('teUi'))return;const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
    const bar=document.createElement('div');bar.id='teUi';
    if(!document.querySelector('.tabs'))bar.style.bottom='18px';
    bar.innerHTML=`<button class="fab" id="teFab" aria-label="עריכת טקסטים">${ICO}</button><button id="teState" hidden>עריכה פעילה. לחץ על טקסט</button>${typeof window.go==='function'?`<select id="teGo" hidden aria-label="מעבר למסך"><option value="">עבור למסך...</option>${VIEWS.map(v=>`<option value="${v[0]}">${v[1]}</option>`).join('')}</select>`:''}`;
    document.body.appendChild(bar);
    const box=document.createElement('div');box.id='teBox';box.hidden=true;box.innerHTML='<div><h3>עריכת טקסט</h3><div class="orig" id="teOrig"></div><textarea id="teTxt"></textarea><small>השינוי חל על כל המקומות שבהם כתוב בדיוק אותו טקסט. שורה ריקה = חזרה למקור.</small><div class="row"><button id="teCancel">ביטול</button><button id="teReset">החזר מקור</button><button class="go" id="teSave">שמור</button></div></div>';document.body.appendChild(box);
    const toggle=on=>{editing=on;document.body.classList.toggle('te-on',on);bar.querySelector('#teState').hidden=!on;const g=bar.querySelector('#teGo');if(g)g.hidden=!on};
    bar.querySelector('#teFab').onclick=()=>toggle(!editing);
    const g=bar.querySelector('#teGo');if(g)g.onchange=()=>{if(g.value){try{window.go(g.value)}catch(e){}}g.value=''};
    let target=null;
    const open=t=>{target=t;box.hidden=false;box.querySelector('#teOrig').textContent=t.orig;box.querySelector('#teTxt').value=t.cur;box.querySelector('#teTxt').focus()};
    const close=()=>{box.hidden=true;target=null};
    box.querySelector('#teCancel').onclick=close;box.onclick=e=>{if(e.target===box)close()};
    async function save(txt){const o=target.orig;let r;
      if(!txt||txt===o){r=await api('ui_text?orig=eq.'+encodeURIComponent(o),{method:'DELETE'});delete map[o]}
      else{r=await api('ui_text?on_conflict=orig',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({orig:o,txt})});map[o]=txt}
      if(!r.ok){alert('השמירה נכשלה. התחבר שוב כמנהל מערכת ונסה שוב.');return false}
      all();document.querySelectorAll('[placeholder],[aria-label],[title]').forEach(setAttrs);return true}
    box.querySelector('#teSave').onclick=async()=>{const v=box.querySelector('#teTxt').value.trim();if(await save(v))close()};
    box.querySelector('#teReset').onclick=async()=>{if(await save(''))close()};
    function nodeAt(x,y,el){let n=null;
      if(document.caretRangeFromPoint){const c=document.caretRangeFromPoint(x,y);n=c&&c.startContainer}
      else if(document.caretPositionFromPoint){const c=document.caretPositionFromPoint(x,y);n=c&&c.offsetNode}
      if(n&&n.nodeType===3&&el.contains(n)&&n.nodeValue.trim()&&!bad(n))return{node:n};
      if((el.tagName==='INPUT'||el.tagName==='TEXTAREA')&&el.getAttribute('placeholder'))return{el,attr:'placeholder'};
      let e=el;for(let i=0;e&&i<5;i++,e=e.parentElement){const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let t;while(t=w.nextNode())if(t.nodeValue.trim()&&!bad(t))return{node:t}}
      return null}
    document.addEventListener('click',e=>{if(!editing||!isAdmin)return;const el=e.target;if(!el.closest||el.closest('#teUi')||el.closest('#teBox')||el.closest('.tabs'))return;
      e.preventDefault();e.stopPropagation();const hit=nodeAt(e.clientX,e.clientY,el);if(!hit)return;
      if(hit.node){const n=hit.node;open({orig:(n.__o??n.nodeValue).trim(),cur:n.nodeValue.trim()})}
      else{const a=hit.attr,o=(hit.el['__o_'+a]??hit.el.getAttribute(a)).trim();open({orig:o,cur:hit.el.getAttribute(a).trim()})}},true);
    document.addEventListener('submit',e=>{if(editing)e.preventDefault()},true)}
})();
