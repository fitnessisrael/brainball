/* ================= registration, login, password ================= */
let regRole='player',regMode='register',newClub=false,ownPass=false,logoUrl='';
const phoneDigits=p=>String(p||'').replace(/\D/g,'');
function regLayout(){const login=regMode==='login',admin=regRole==='admin',edit=!!profile?.server&&!login,staff=regRole==='coach'||regRole==='manager';
  $('#rowRole').hidden=login||admin||edit;$('#rowName').hidden=login;$('#rowEmail').hidden=edit;$('#rowPhone').hidden=login;
  $('#rowPass').hidden=!(login||ownPass)||edit;$('#dOwnPass').hidden=login||edit;$('#dOwnPass').textContent=ownPass?'הסיסמה תהיה מספר הטלפון':'אני רוצה לבחור סיסמה אחרת';
  $('#phoneHint').hidden=ownPass||edit;$('#lPass').textContent=login?'סיסמה':'סיסמה שתבחר';
  $('#rowAgePos').hidden=login||staff||admin;
  $('#rowCode').hidden=login||admin||(regRole==='manager'&&newClub)||(regRole==='player'&&!!profile?.teamId);
  $('#lCode').textContent=regRole==='coach'?'קוד מאמן (קיבלת ממנהל המועדון)':regRole==='manager'?'קוד מועדון (קיבלת מצוות BrainBall)':'קוד קבוצה (אם המאמן שלח לך)';
  $('#rowAdmin').hidden=!admin||login;$('#rowNewClub').hidden=regRole!=='manager'||login||edit;$('#newClubBox').hidden=!newClub;$('#dNoCode').textContent=newClub?'יש לי קוד מועדון':'אין לי קוד. אני רוצה לפתוח מועדון חדש';
  $('#rowTerms').hidden=login||edit;$('#dForgot').hidden=!login;
  $('#regTitle').textContent=login?'התחברות':admin?'כניסת מנהל מערכת':edit?'עריכת הפרטים':'נרשמים פעם אחת, מתאמנים תמיד';
  $('#regSub').textContent=login?'אימייל וסיסמה. הסיסמה היא הטלפון שלך, אם לא שינית.':edit?'':regRole==='player'?'חינם. לוקח 20 שניות.':regRole==='coach'?'נרשמים עם קוד המאמן שקיבלת ממנהל המועדון.':regRole==='manager'?'נרשמים עם קוד המועדון, או מבקשים לפתוח מועדון חדש.':'';
  $('#dLogin').textContent=login?'חזרה להרשמה':'כבר רשום? התחברות';$('#dLogin').hidden=edit;$('#saLink').hidden=edit;
  $('#dSubmit').innerHTML=(login?'התחבר':edit?'שמור':regRole==='player'?'יאללה, לאימון':'צור חשבון')+' <span class="ar">←</span>';
  $$('#dRole button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.r===regRole))}
function renderReg(){const p=profile||{};$('#dName').value=p.name||'';$('#dAge').value=p.age||'';$('#dPos').value=p.pos||'';$('#dPhone').value=p.phone||'';$('#dEmail').value=p.email||'';
  $('#dCode').value=S.get('pendingCode','')||'';$('#dTerms').checked=false;$('#dErr').textContent='';$('#dPass').value='';
  const pr=S.get('pendingRole','');regRole=p.role||(pr||'player');regMode=!profile&&S.get('wasUser',false)&&!pr?'login':'register';newClub=false;ownPass=false;regLayout()}
$('#dRole').onclick=e=>{const b=e.target.closest('[data-r]');if(!b)return;regRole=b.dataset.r;newClub=false;regLayout()};
$('#saLink').onclick=()=>{regRole=regRole==='admin'?'player':'admin';regMode='register';regLayout()};
$('#dLogin').onclick=()=>{regMode=regMode==='login'?'register':'login';if(regMode==='register'&&regRole==='admin')regRole='player';regLayout()};
$('#dNoCode').onclick=()=>{newClub=!newClub;regLayout()};
$('#dOwnPass').onclick=()=>{ownPass=!ownPass;regLayout()};
$('#dLogo').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{logoUrl=await logoData(f);$('#dLogoTxt').textContent=f.name}catch(err){$('#dLogoTxt').textContent='התמונה לא נטענה'}};
$('#dForgot').onclick=async()=>{const em=$('#dEmail').value.trim(),err=$('#dErr');if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){err.textContent='כתוב קודם את האימייל שלך.';$('#dEmail').focus();return}
  try{await DB.resetPass(em);err.textContent='';toast('שלחנו לך מייל לאיפוס סיסמה')}catch(e){err.textContent=errText(e)}};
$('#dForm').addEventListener('submit',async e=>{e.preventDefault();const err=$('#dErr'),btn=$('#dSubmit');err.textContent='';
  const login=regMode==='login',edit=!!profile?.server&&!login;
  const v={name:$('#dName').value.trim(),email:$('#dEmail').value.trim().toLowerCase(),phone:$('#dPhone').value.trim(),age:+$('#dAge').value||null,pos:$('#dPos').value,code:$('#dCode').value.trim().toUpperCase(),pass:$('#dPass').value,terms:$('#dTerms').checked};
  const pass=login||ownPass?v.pass:phoneDigits(v.phone);
  if(!login&&!v.name){err.textContent='רגע, איך קוראים לך?';$('#dName').focus();return}
  if(!edit&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)){err.textContent='האימייל לא נראה תקין.';$('#dEmail').focus();return}
  if(!login&&phoneDigits(v.phone).length<9){err.textContent='צריך מספר טלפון מלא.';$('#dPhone').focus();return}
  if(!edit&&pass.length<6){err.textContent='סיסמה צריכה לפחות 6 תווים.';$('#dPass').focus();return}
  if(v.age&&(v.age<6||v.age>80)){err.textContent='גיל בין 6 ל-80.';return}
  if(!login&&!edit){
    if(regRole==='coach'&&!v.code){err.textContent='צריך את קוד המאמן שקיבלת ממנהל המועדון.';$('#dCode').focus();return}
    if(regRole==='manager'&&!newClub&&!v.code){err.textContent='צריך קוד מועדון, או לבחור פתיחת מועדון חדש.';return}
    if(regRole==='manager'&&newClub&&!$('#dClubName').value.trim()){err.textContent='מה שם המועדון?';$('#dClubName').focus();return}
    if(regRole==='admin'&&!$('#dAdminKey').value.trim()){err.textContent='צריך את קוד מנהל המערכת.';return}
    if(!v.terms){err.textContent='צריך לאשר את התנאים כדי להמשיך.';return}}
  if(!DB.ok()){err.textContent='אין חיבור לשרת כרגע. בדוק את האינטרנט ונסה שוב.';return}
  btn.disabled=true;
  try{
    if(login){await DB.signIn(v.email,pass);const p=await DB.refresh();if(!p)throw new Error('לא מצאנו חשבון עם האימייל הזה. הירשם קודם.')}
    else{if(!edit)await DB.signUp(v.email,pass);
      await DB.register({name:v.name,age:v.age,role:edit?(profile.role==='admin'?'player':profile.role):regRole,phone:v.phone,position:v.pos||null,
        code:edit?null:(regRole==='manager'&&newClub?null:v.code||null),clubName:!edit&&newClub?$('#dClubName').value.trim():null,logo:!edit&&newClub?logoUrl:null,adminKey:regRole==='admin'?$('#dAdminKey').value.trim():null})}
    S.set('pendingCode','');S.set('pendingRole','');S.set('wasUser',true);DB.flush();afterAuth(!login&&!edit);
  }catch(ex){err.textContent=ex.message&&/[א-ת]/.test(ex.message)?ex.message:errText(ex)}finally{btn.disabled=false}});
function afterAuth(first){$('#avatar').textContent=(profile?.name||'B').trim()[0]||'B';loadCatalogCfg();
  if(profile?.role==='player')go('home');else go('home')}
async function loadCatalogCfg(){try{if(DB.prof?.club?.catalog)return;const g=await DB.globalCatalog();if(g)S.set('catalog3',g)}catch(e){}}
function renderPending(){$('#pendTxt').textContent=`המועדון "${profile?.club||''}" מחכה לאישור צוות BrainBall. בינתיים אפשר להתאמן כרגיל.`}
$('#pendRefresh').onclick=async()=>{try{await DB.refresh();go('home')}catch(e){toast(errText(e))}};
window.openNewPass=()=>{$$('.view').forEach(x=>x.classList.toggle('on',x.id==='v-newpass'));$('.app').classList.add('flow')};
$('#npSave').onclick=async()=>{const p=$('#npPass').value;if(p.length<6){$('#npErr').textContent='לפחות 6 תווים.';return}
  try{await DB.setPass(p);RECOVERY=false;toast('הסיסמה עודכנה');await DB.init();history.replaceState(null,'','#home');go('home')}catch(e){$('#npErr').textContent=errText(e)}};
