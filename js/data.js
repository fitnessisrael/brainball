/* ================= data: Supabase + offline outbox ================= */
// Public project keys (safe in the browser; access is enforced by row level security on the server).
const SUPA={url:'https://xdtcsapcgamlabdslzby.supabase.co',key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkdGNzYXBjZ2FtbGFiZHNsemJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMjg3MjMsImV4cCI6MjEwODcwNDcyM30.lacZlgoMkE3fUhmv-PrBtWAC-tu6rLg-vcLc42SzxUw'};
let sb=null;try{if(window.supabase)sb=window.supabase.createClient(SUPA.url,SUPA.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'bb_auth'}})}catch(e){sb=null}
let RECOVERY=/type=recovery/.test(location.hash);
try{sb&&sb.auth.onAuthStateChange((ev)=>{if(ev==='PASSWORD_RECOVERY'){RECOVERY=true;setTimeout(()=>window.openNewPass&&openNewPass(),300)}})}catch(e){}
const DEV=S.get('dev',null)||(()=>{const d='d'+Math.random().toString(36).slice(2,12);S.set('dev',d);return d})();
const uid=()=>'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const waNum=p=>{let d=String(p||'').replace(/\D/g,'');if(d.startsWith('0'))d='972'+d.slice(1);return d};
const ERR={bad_admin_key:'קוד מנהל המערכת לא נכון.',code_taken:'הקוד הזה כבר בשימוש.',bad_code:'קוד צריך 4 עד 10 אותיות או ספרות.',confirm_email:'שלחנו לך מייל לאישור. אשר אותו ונסה שוב.','Email rate limit exceeded':'נשלחו יותר מדי מיילים. נסה שוב בעוד שעה.','Unable to validate email address':'האימייל לא תקין.',team_not_found:'לא מצאנו קבוצה עם הקוד הזה. בדוק עם המאמן.',club_not_found:'לא מצאנו מועדון עם הקוד הזה.',code_required:'צריך קוד הצטרפות.',team_has_coach:'לקבוצה הזו כבר יש מאמן.',club_has_manager:'למועדון הזה כבר יש מנהל.',forbidden:'אין לך הרשאה לפעולה הזו.',not_signed_in:'צריך להתחבר קודם.',
  'Invalid login credentials':'אימייל או סיסמה לא נכונים.','User already registered':'האימייל כבר רשום. נסה להתחבר.','Password should be at least 6 characters.':'סיסמה צריכה לפחות 6 תווים.'};
const errText=e=>{const m=String(e?.message||e||'');const k=Object.keys(ERR).find(k=>m.includes(k));return k?ERR[k]:(navigator.onLine?'משהו השתבש. נסה שוב.':'אין חיבור לאינטרנט.')};

const DB={
  ok:()=>!!sb,
  user:null,prof:null,
  async init(){if(!sb)return;try{const {data}=await sb.auth.getSession();this.user=data.session?.user||null;if(this.user)await this.refresh()}catch(e){}},
  async refresh(){if(!sb||!this.user)return null;
    const {data,error}=await sb.from('profiles').select('*,team:teams(id,name,code,coach_code,club_id),club:clubs(id,name,logo,code,status,catalog)').eq('id',this.user.id).maybeSingle();
    if(error)throw error;this.prof=data;if(data)applyServerProfile(data);return data},
  // everyone signs in with email + password. The default password is the phone number (digits only).
  async signUp(email,pass){if(this.user)await this.logout();let r=await sb.auth.signUp({email,password:pass});
    if(r.error&&/already/i.test(r.error.message)){r=await sb.auth.signInWithPassword({email,password:pass});if(r.error)throw new Error('האימייל הזה כבר רשום עם סיסמה אחרת. לחץ "כבר רשום? התחברות", או "שכחתי סיסמה".')}
    if(r.error)throw r.error;if(!r.data.session)throw new Error('confirm_email');this.user=r.data.user;return this.user},
  async signIn(email,pass){if(this.user)await this.logout();const r=await sb.auth.signInWithPassword({email,password:pass});if(r.error)throw r.error;this.user=r.data.user;return this.user},
  async resetPass(email){const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:appUrl()+'app'});if(error)throw error},
  async setPass(pass){const {error}=await sb.auth.updateUser({password:pass});if(error)throw error},
  async deleteAccount(){const {error}=await sb.rpc('delete_my_account');if(error)throw error;await this.logout()},
  async register(o){const {data,error}=await sb.rpc('register',{p_name:o.name,p_age:o.age||null,p_role:o.role,p_code:o.code||null,p_position:o.position||null,p_club_name:o.clubName||null,p_logo:o.logo||null,p_phone:o.phone||null,p_admin_key:o.adminKey||null});if(error)throw error;await this.refresh();return data},
  async joinTeam(code){const {data,error}=await sb.rpc('join_team',{p_code:code});if(error)throw error;await this.refresh();return data},
  async setShare(v){if(!this.user)return;await sb.from('profiles').update({share:v}).eq('id',this.user.id)},
  async logout(){try{await sb?.auth.signOut()}catch(e){}this.user=null;this.prof=null},
  /* sessions: every training (also partial) goes to the outbox, then up to the server */
  queue(row){const o=S.get('outbox',[]);o.push(row);S.set('outbox',o.slice(-500));this.flush()},
  async flush(){if(!sb||!this.user||!this.prof||this._fl)return;const o=S.get('outbox',[]);if(!o.length)return;this._fl=true;
    try{const rows=o.map(r=>({client_id:r.cid,game:r.id,level:r.level,score:r.primary??null,disp:r.disp||null,label:r.label||null,partial:!!r.partial,duration:r.dur||null,src:r.src||null,team_id:this.prof.team_id||null,created_at:new Date(r.date).toISOString()}));
      const {error}=await sb.from('sessions').upsert(rows,{onConflict:'client_id',ignoreDuplicates:true});if(!error)S.set('outbox',S.get('outbox',[]).slice(o.length))}catch(e){}finally{this._fl=false}},
  /* tasks */
  async myTasks(){if(!sb||!this.prof?.team_id)return[];const [{data:t},{data:d}]=await Promise.all([sb.from('tasks').select('*').eq('team_id',this.prof.team_id).order('created_at',{ascending:false}).limit(30),sb.from('task_done').select('task_id').eq('user_id',this.user.id)]);
    const done=new Set((d||[]).map(x=>x.task_id));return(t||[]).map(x=>({...x,done:done.has(x.id)}))},
  async markDone(id){if(sb&&this.user)await sb.from('task_done').upsert({task_id:id,user_id:this.user.id},{onConflict:'task_id,user_id',ignoreDuplicates:true})},
  async addTask(o){const {error}=await sb.from('tasks').insert(o);if(error)throw error},
  async delTask(id){await sb.from('tasks').delete().eq('id',id)},
  async teamTasks(team){const {data}=await sb.from('tasks').select('*').eq('team_id',team).order('created_at',{ascending:false}).limit(30);return data||[]},
  /* coach / manager */
  async board(team){const {data,error}=await sb.rpc('team_board',{p_team:team});if(error)throw error;return data||[]},
  async playerSessions(user){const {data}=await sb.from('sessions').select('*').eq('user_id',user).order('created_at',{ascending:false}).limit(200);return data||[]},
  async roster(team){const {data}=await sb.from('roster').select('*').eq('team_id',team).order('created_at');return data||[]},
  async addRoster(team,name,phone){const {error}=await sb.from('roster').insert({team_id:team,name,phone});if(error)throw error},
  async delRoster(id){await sb.from('roster').delete().eq('id',id)},
  async clubTeams(club){const {data}=await sb.from('teams').select('*').eq('club_id',club).order('created_at');return data||[]},
  async clubStaff(club){const {data}=await sb.from('profiles').select('id,full_name,role,team_id').eq('club_id',club).in('role',['coach','manager']);return data||[]},
  async clubPlayers(club){const {data}=await sb.from('profiles').select('id,team_id').eq('club_id',club).eq('role','player');return data||[]},
  async createTeam(club,name){const {data,error}=await sb.rpc('create_team',{p_club:club,p_name:name});if(error)throw error;return data},
  async saveCatalog(club,cfg){if(club)await sb.from('clubs').update({catalog:cfg}).eq('id',club);else await sb.from('app_settings').upsert({key:'catalog',value:cfg})},
  async globalCatalog(){if(!sb)return null;const {data}=await sb.from('app_settings').select('value').eq('key','catalog').maybeSingle();return data?.value||null},
  /* analytics: raw rows, computed on the device */
  async clubData(club,days=90){const since=new Date(Date.now()-days*864e5).toISOString();
    const [teams,people]=await Promise.all([this.clubTeams(club),sb.from('profiles').select('id,full_name,age,position,role,team_id,share,phone,email,created_at').eq('club_id',club).then(r=>r.data||[])]);
    const ids=teams.map(t=>t.id);let ses=[];if(ids.length){const {data}=await sb.from('sessions').select('user_id,team_id,game,level,score,partial,duration,created_at').in('team_id',ids).gte('created_at',since).order('created_at').limit(20000);ses=data||[]}
    return{teams,people,ses}},
  async teamData(team,days=90){const since=new Date(Date.now()-days*864e5).toISOString();const {data}=await sb.from('sessions').select('user_id,team_id,game,level,score,partial,duration,created_at').eq('team_id',team).gte('created_at',since).order('created_at').limit(20000);return data||[]},
  async allData(days=30){const since=new Date(Date.now()-days*864e5).toISOString();
    const [people,ses]=await Promise.all([sb.from('profiles').select('id,role,club_id,team_id,created_at').then(r=>r.data||[]),sb.from('sessions').select('user_id,team_id,game,level,score,partial,duration,created_at').gte('created_at',since).order('created_at').limit(30000).then(r=>r.data||[])]);
    return{people,ses}},
  async taskDone(team){const {data}=await sb.from('task_done').select('task_id,user_id,done_at,tasks!inner(team_id)').eq('tasks.team_id',team);return data||[]},
  async addTasks(rows){const {error}=await sb.from('tasks').insert(rows);if(error)throw error},
  async setClubCode(id,code){const {data,error}=await sb.rpc('set_club_code',{p_club:id,p_code:code});if(error)throw error;return data},
  async resetTeamCodes(id){const {data,error}=await sb.rpc('reset_team_codes',{p_team:id});if(error)throw error;return data},
  async setPlayerTeam(u,t){const {error}=await sb.rpc('set_player_team',{p_user:u,p_team:t});if(error)throw error},
  async club(id){const {data}=await sb.from('clubs').select('*').eq('id',id).maybeSingle();return data},
  /* system admin */
  async clubs(){const {data}=await sb.from('clubs').select('*').order('created_at',{ascending:false});return data||[]},
  async createClub(name,logo,teams){const {data,error}=await sb.rpc('create_club',{p_name:name,p_logo:logo||null,p_teams:teams});if(error)throw error;return data},
  async setClubStatus(id,st){const {error}=await sb.rpc('set_club_status',{p_club:id,p_status:st});if(error)throw error},
  async updateClub(id,o){const {error}=await sb.from('clubs').update(o).eq('id',id);if(error)throw error},
  async setTeamCodes(team,code,coach){const {data,error}=await sb.rpc('set_team_codes',{p_team:team,p_code:code,p_coach:coach});if(error)throw error;return data},
  /* virtual training hub: the club's own list if it has one, otherwise the general list of the system */
  async videoList(club){if(!sb)return[];let rows=[];
    if(club){const r=await sb.from('videos').select('*').eq('club_id',club).order('sort').order('created_at');rows=r.data||[];if(rows.length)return rows}
    const g=await sb.from('videos').select('*').is('club_id',null).order('sort').order('created_at');return g.data||[]},
  async ownVideos(club){const q=sb.from('videos').select('*');const r=await (club?q.eq('club_id',club):q.is('club_id',null)).order('sort').order('created_at');return r.data||[]},
  async addVideo(o){const {error}=await sb.from('videos').insert(o);if(error)throw error},
  async delVideo(id){const {error}=await sb.from('videos').delete().eq('id',id);if(error)throw error},
  async renameVideo(id,title){const {error}=await sb.from('videos').update({title}).eq('id',id);if(error)throw error},
  async copyVideos(toClub){const g=await sb.from('videos').select('title,yt,sort').is('club_id',null).order('sort').order('created_at');const rows=(g.data||[]).map(v=>({...v,club_id:toClub}));if(rows.length){const {error}=await sb.from('videos').insert(rows);if(error)throw error}return rows.length},
  async myPlans(){if(!sb||!this.user)return[];const {data}=await sb.from('plans').select('*').order('created_at',{ascending:false});return data||[]},
  async savePlan(title,vids){const {error}=await sb.from('plans').insert({title,vids});if(error)throw error},
  async delPlan(id){await sb.from('plans').delete().eq('id',id)},
};
// server profile -> local profile used by the UI
function applyServerProfile(d){
  const p=Object.assign({},profile||{},{name:d.full_name,age:d.age,role:d.role,pos:d.position,share:d.share,approved:d.approved,terms:true,
    teamId:d.team_id||null,team:d.team?.name||profile?.team||'',teamCode:d.team?.code||'',coachCode:d.team?.coach_code||'',
    phone:d.phone||'',email:d.email||'',clubId:d.club_id||null,club:d.club?.name||'',clubLogo:d.club?.logo||'',clubCode:d.club?.code||'',clubStatus:d.club?.status||'',server:true});
  profile=p;S.set('profile2',p);
  if(d.club?.catalog)S.set('catalog3',d.club.catalog);
}
// downscale an uploaded logo to a small data URL
function logoData(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const s=Math.min(1,256/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/png'))};im.onerror=rej;im.src=r.result};r.onerror=rej;r.readAsDataURL(file)})}
addEventListener('online',()=>DB.flush());
