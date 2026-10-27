
-- ---------- v2: training order per club + global settings ----------
alter table public.clubs add column if not exists catalog jsonb;
create table if not exists public.app_settings(key text primary key, value jsonb, updated_at timestamptz default now());
alter table public.app_settings enable row level security;
drop policy if exists settings_read on public.app_settings;
create policy settings_read on public.app_settings for select using (true);
drop policy if exists settings_write on public.app_settings;
create policy settings_write on public.app_settings for all using (is_admin()) with check (is_admin());

-- ---------- actions (validated on the server) ----------
-- register / update the signed-in user. role: player | coach | manager
create or replace function public.register(p_name text, p_age int, p_role text, p_code text default null,
  p_position text default null, p_club_name text default null, p_logo text default null)
returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); t teams; c clubs; r text:=coalesce(p_role,'player'); cur profiles;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  perform set_config('bb.trusted','1',true);
  if r not in ('player','coach','manager') then raise exception 'bad_role'; end if;
  select * into cur from profiles where id=uid;
  if cur.role='admin' or (select lower(email) from auth.users where id=uid)='fitnessisrael@gmail.com' then r:='admin'; end if;
  insert into profiles(id,full_name,age,role,position) values(uid,p_name,p_age,r,p_position)
    on conflict(id) do update set full_name=excluded.full_name, age=excluded.age, position=excluded.position,
      role=case when excluded.role='admin' then 'admin' else profiles.role end;
  if r='player' and coalesce(p_code,'')<>'' then
    select * into t from teams where code=upper(p_code);
    if t.id is null then raise exception 'team_not_found'; end if;
    update profiles set team_id=t.id, club_id=t.club_id where id=uid;
  elsif r='coach' then
    if coalesce(p_code,'')='' then raise exception 'code_required'; end if;
    select * into t from teams where coach_code=upper(p_code);
    if t.id is null then raise exception 'team_not_found'; end if;
    if t.coach_id is not null and t.coach_id<>uid then raise exception 'team_has_coach'; end if;
    update teams set coach_id=uid where id=t.id;
    update profiles set role='coach', team_id=t.id, club_id=t.club_id where id=uid;
  elsif r='manager' then
    if coalesce(p_code,'')<>'' then
      select * into c from clubs where code=upper(p_code);
      if c.id is null then raise exception 'club_not_found'; end if;
      if c.manager_id is not null and c.manager_id<>uid then raise exception 'club_has_manager'; end if;
      update clubs set manager_id=uid where id=c.id;
      update profiles set role='manager', club_id=c.id, approved=(c.status='active') where id=uid;
    elsif coalesce(p_club_name,'')<>'' then
      insert into clubs(name,logo,code,status,manager_id) values(p_club_name,p_logo,gen_code(),'pending',uid) returning * into c;
      update profiles set role='manager', club_id=c.id, approved=false where id=uid;
    else raise exception 'code_required'; end if;
  end if;
  return (select row_to_json(p) from profiles p where id=uid);
end $$;

