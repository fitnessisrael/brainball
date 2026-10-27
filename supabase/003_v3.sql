-- v3: email + phone sign-up for everyone, admin secret, full admin access, assignments, account deletion
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists email text;
alter table public.tasks add column if not exists title text;
alter table public.tasks add column if not exists batch uuid;

-- admin key (no read policy: nobody can read it from the app)
create table if not exists public.admin_keys(key text primary key);
alter table public.admin_keys enable row level security;
insert into public.admin_keys(key) values ('__ADMIN_KEY__') on conflict do nothing;

-- the admin sees every session, also players without a team
drop policy if exists sessions_read on public.sessions;
create policy sessions_read on public.sessions for select using (
  user_id=auth.uid() or is_admin() or (team_id is not null and can_see_team(team_id)
    and exists(select 1 from profiles p where p.id=sessions.user_id and p.share)));
drop policy if exists done_read on public.task_done;
create policy done_read on public.task_done for select using (
  user_id=auth.uid() or is_admin() or exists(select 1 from tasks t where t.id=task_id and can_see_team(t.team_id)));
drop policy if exists clubs_update on public.clubs;
create policy clubs_update on public.clubs for update using (can_manage_club(id));

drop function if exists public.register(text,int,text,text,text,text,text);
create or replace function public.register(p_name text, p_age int, p_role text, p_code text default null,
  p_position text default null, p_club_name text default null, p_logo text default null, p_phone text default null, p_admin_key text default null)
returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); t teams; c clubs; r text:=coalesce(p_role,'player'); cur profiles; em text;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  perform set_config('bb.trusted','1',true);
  select email into em from auth.users where id=uid;
  select * into cur from profiles where id=uid;
  if r='admin' then
    if not exists(select 1 from admin_keys where key=p_admin_key) then raise exception 'bad_admin_key'; end if;
  elsif r not in ('player','coach','manager') then raise exception 'bad_role';
  elsif cur.role='admin' then r:='admin'; end if;
  insert into profiles(id,full_name,age,role,position,phone,email) values(uid,p_name,p_age,case when r='admin' then 'admin' else 'player' end,p_position,p_phone,em)
    on conflict(id) do update set full_name=excluded.full_name, age=coalesce(excluded.age,profiles.age), position=coalesce(excluded.position,profiles.position),
      phone=coalesce(excluded.phone,profiles.phone), email=excluded.email, role=case when r='admin' then 'admin' else profiles.role end;
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

-- admin: change a club code
create or replace function public.set_club_code(p_club uuid, p_code text) returns text language plpgsql security definer set search_path=public as $$
declare c text:=upper(regexp_replace(coalesce(p_code,''),'[^A-Za-z0-9]','','g'));
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if length(c)<4 or length(c)>10 then raise exception 'bad_code'; end if;
  if exists(select 1 from clubs where code=c and id<>p_club) or exists(select 1 from teams where code=c or coach_code=c) then raise exception 'code_taken'; end if;
  update clubs set code=c where id=p_club; return c;
end $$;

-- admin or manager: new codes for a team
create or replace function public.reset_team_codes(p_team uuid) returns json language plpgsql security definer set search_path=public as $$
declare t teams;
begin
  select * into t from teams where id=p_team;
  if not can_manage_club(t.club_id) then raise exception 'forbidden'; end if;
  update teams set code=gen_code(), coach_code=gen_code() where id=p_team returning * into t; return row_to_json(t);
end $$;

-- admin or manager: move a player to another team in the same club / remove from team
create or replace function public.set_player_team(p_user uuid, p_team uuid) returns void language plpgsql security definer set search_path=public as $$
declare t teams;
begin
  perform set_config('bb.trusted','1',true);
  if p_team is null then
    if not (is_admin() or can_manage_club((select club_id from profiles where id=p_user))) then raise exception 'forbidden'; end if;
    update profiles set team_id=null, club_id=null where id=p_user; return;
  end if;
  select * into t from teams where id=p_team;
  if not can_manage_club(t.club_id) then raise exception 'forbidden'; end if;
  update profiles set team_id=t.id, club_id=t.club_id where id=p_user;
end $$;

-- Apple 5.1.1(v): users can delete their account inside the app
create or replace function public.delete_my_account() returns void language plpgsql security definer set search_path=public, auth as $$
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  update teams set coach_id=null where coach_id=auth.uid();
  update clubs set manager_id=null where manager_id=auth.uid();
  delete from auth.users where id=auth.uid();
end $$;

-- coach / manager / admin board, now with contact details
create or replace function public.team_board(p_team uuid) returns json language plpgsql security definer set search_path=public as $$
begin
  if not can_see_team(p_team) then raise exception 'forbidden'; end if;
  return coalesce((select json_agg(x order by x.sessions_7d desc, x.full_name) from (
    select p.id, p.full_name, p.age, p.position, p.share, p.phone, p.email, p.created_at,
      (select max(created_at) from sessions s where s.user_id=p.id) last_at,
      (select count(*) from sessions s where s.user_id=p.id and s.created_at>now()-interval '7 days') sessions_7d,
      (select count(*) from sessions s where s.user_id=p.id) sessions_all,
      (select count(*) from task_done d join tasks t on t.id=d.task_id where d.user_id=p.id and t.team_id=p_team) tasks_done,
      case when p.share or is_admin() then (select json_object_agg(g.game, json_build_object('disp',g.disp,'score',g.score,'at',g.created_at)) from (
        select distinct on (game) game, disp, score, created_at from sessions s where s.user_id=p.id and not s.partial order by game, created_at desc) g) end last
    from profiles p where p.team_id=p_team and p.role='player') x),'[]'::json);
end $$;

grant execute on function public.register(text,int,text,text,text,text,text,text,text), public.set_club_code, public.reset_team_codes, public.set_player_team, public.delete_my_account, public.team_board to authenticated;
