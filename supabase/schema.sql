-- BrainBall database: clubs > teams (departments) > players, with coaches and managers.
-- Run once in the Supabase SQL editor.

create extension if not exists pgcrypto;

-- ---------- tables ----------
create table if not exists public.clubs(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo text,
  code text unique not null,
  status text not null default 'active' check (status in ('pending','active','suspended')),
  manager_id uuid references auth.users on delete set null,
  created_at timestamptz not null default now());

create table if not exists public.teams(
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs on delete cascade,
  name text not null,
  code text unique not null,
  coach_code text unique not null,
  coach_id uuid references auth.users on delete set null,
  created_at timestamptz not null default now());

create table if not exists public.profiles(
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  age int,
  role text not null default 'player' check (role in ('player','coach','manager','admin')),
  club_id uuid references public.clubs on delete set null,
  team_id uuid references public.teams on delete set null,
  position text,
  share boolean not null default true,
  approved boolean not null default true,
  created_at timestamptz not null default now());

create table if not exists public.sessions(
  id uuid primary key default gen_random_uuid(),
  client_id text unique,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  team_id uuid references public.teams on delete set null,
  game text not null, level text, score numeric, disp text, label text,
  partial boolean not null default false, duration int, src text,
  created_at timestamptz not null default now());

create table if not exists public.tasks(
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams on delete cascade,
  player_id uuid references auth.users on delete cascade,
  game text not null, level text, note text, due date,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now());

create table if not exists public.task_done(
  task_id uuid references public.tasks on delete cascade,
  user_id uuid default auth.uid() references auth.users on delete cascade,
  done_at timestamptz not null default now(),
  primary key(task_id,user_id));

create table if not exists public.roster(
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams on delete cascade,
  name text not null, phone text,
  created_at timestamptz not null default now());

create index if not exists sessions_team_idx on public.sessions(team_id, created_at desc);
create index if not exists sessions_user_idx on public.sessions(user_id, created_at desc);
create index if not exists profiles_team_idx on public.profiles(team_id);

-- ---------- helpers ----------
create or replace function public.gen_code() returns text language sql volatile as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1+floor(random()*31)::int, 1), '') from generate_series(1,6) $$;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;

create or replace function public.can_see_team(t uuid) returns boolean language sql stable security definer set search_path=public as $$
  select is_admin() or exists(select 1 from teams tm where tm.id=t and (tm.coach_id=auth.uid()
    or tm.club_id in (select id from clubs where manager_id=auth.uid() and status='active'))) $$;

create or replace function public.can_manage_club(c uuid) returns boolean language sql stable security definer set search_path=public as $$
  select is_admin() or exists(select 1 from clubs where id=c and manager_id=auth.uid() and status='active') $$;

create or replace function public.my_team() returns uuid language sql stable security definer set search_path=public as $$
  select team_id from profiles where id=auth.uid() $$;

-- ---------- RLS ----------
alter table public.clubs enable row level security;
alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.tasks enable row level security;
alter table public.task_done enable row level security;
alter table public.roster enable row level security;

drop policy if exists clubs_read on public.clubs;
create policy clubs_read on public.clubs for select using (
  is_admin() or manager_id=auth.uid() or id=(select club_id from profiles where id=auth.uid()));
drop policy if exists clubs_update on public.clubs;
create policy clubs_update on public.clubs for update using (can_manage_club(id));

drop policy if exists teams_read on public.teams;
create policy teams_read on public.teams for select using (can_see_team(id) or id=my_team());
drop policy if exists teams_write on public.teams;
create policy teams_write on public.teams for update using (can_manage_club(club_id));
drop policy if exists teams_delete on public.teams;
create policy teams_delete on public.teams for delete using (can_manage_club(club_id));

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (
  id=auth.uid() or is_admin() or (team_id is not null and can_see_team(team_id))
  or (club_id is not null and can_manage_club(club_id)));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (id=auth.uid() or is_admin());

-- players may only change their own name, age, position and sharing choice
create or replace function public.profiles_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() and coalesce(current_setting('bb.trusted',true),'')<>'1' then
    new.role:=old.role; new.club_id:=old.club_id; new.team_id:=old.team_id; new.approved:=old.approved;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles for each row execute function public.profiles_guard();

drop policy if exists sessions_insert on public.sessions;
create policy sessions_insert on public.sessions for insert with check (user_id=auth.uid());
drop policy if exists sessions_read on public.sessions;
create policy sessions_read on public.sessions for select using (
  user_id=auth.uid() or (team_id is not null and can_see_team(team_id)
    and exists(select 1 from profiles p where p.id=sessions.user_id and p.share)));

drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks for select using (
  can_see_team(team_id) or (team_id=my_team() and (player_id is null or player_id=auth.uid())));
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks for insert with check (can_see_team(team_id));
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks for delete using (can_see_team(team_id));

drop policy if exists done_insert on public.task_done;
create policy done_insert on public.task_done for insert with check (user_id=auth.uid());
drop policy if exists done_read on public.task_done;
create policy done_read on public.task_done for select using (
  user_id=auth.uid() or exists(select 1 from tasks t where t.id=task_id and can_see_team(t.team_id)));

drop policy if exists roster_all on public.roster;
create policy roster_all on public.roster for all using (can_see_team(team_id)) with check (can_see_team(team_id));

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

-- a player joins a team later with its code
create or replace function public.join_team(p_code text) returns json language plpgsql security definer set search_path=public as $$
declare t teams;
begin
  perform set_config('bb.trusted','1',true);
  select * into t from teams where code=upper(p_code);
  if t.id is null then raise exception 'team_not_found'; end if;
  update profiles set team_id=t.id, club_id=t.club_id where id=auth.uid();
  return json_build_object('team',t.name,'team_id',t.id);
end $$;

-- admin: create a club with its teams; returns codes
create or replace function public.create_club(p_name text, p_logo text, p_teams text[]) returns json language plpgsql security definer set search_path=public as $$
declare c clubs; n text;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  insert into clubs(name,logo,code,status) values(p_name,p_logo,gen_code(),'active') returning * into c;
  foreach n in array coalesce(p_teams,'{}') loop
    if trim(n)<>'' then insert into teams(club_id,name,code,coach_code) values(c.id,trim(n),gen_code(),gen_code()); end if;
  end loop;
  return row_to_json(c);
end $$;

-- manager or admin: add a department / team under a club
create or replace function public.create_team(p_club uuid, p_name text) returns json language plpgsql security definer set search_path=public as $$
declare t teams;
begin
  if not can_manage_club(p_club) then raise exception 'forbidden'; end if;
  insert into teams(club_id,name,code,coach_code) values(p_club,p_name,gen_code(),gen_code()) returning * into t;
  return row_to_json(t);
end $$;

-- admin: approve or suspend a club (and its manager)
create or replace function public.set_club_status(p_club uuid, p_status text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  perform set_config('bb.trusted','1',true);
  update clubs set status=p_status where id=p_club;
  update profiles set approved=(p_status='active') where id=(select manager_id from clubs where id=p_club);
end $$;

-- coach / manager: team table (one row per player, last result per game)
create or replace function public.team_board(p_team uuid) returns json language plpgsql security definer set search_path=public as $$
begin
  if not can_see_team(p_team) then raise exception 'forbidden'; end if;
  return coalesce((select json_agg(x order by x.sessions_7d desc, x.full_name) from (
    select p.id, p.full_name, p.age, p.position, p.share, p.created_at,
      (select max(created_at) from sessions s where s.user_id=p.id) last_at,
      (select count(*) from sessions s where s.user_id=p.id and s.created_at>now()-interval '7 days') sessions_7d,
      (select count(*) from task_done d join tasks t on t.id=d.task_id where d.user_id=p.id and t.team_id=p_team) tasks_done,
      case when p.share then (select json_object_agg(g.game, json_build_object('disp',g.disp,'score',g.score,'at',g.created_at)) from (
        select distinct on (game) game, disp, score, created_at from sessions s where s.user_id=p.id and not s.partial order by game, created_at desc) g) end last
    from profiles p where p.team_id=p_team and p.role='player') x),'[]'::json);
end $$;


-- ---------- v2: training order per club + global settings ----------
alter table public.clubs add column if not exists catalog jsonb;
create table if not exists public.app_settings(key text primary key, value jsonb, updated_at timestamptz default now());
alter table public.app_settings enable row level security;
drop policy if exists settings_read on public.app_settings;
create policy settings_read on public.app_settings for select using (true);
drop policy if exists settings_write on public.app_settings;
create policy settings_write on public.app_settings for all using (is_admin()) with check (is_admin());

grant execute on function public.register, public.join_team, public.create_club, public.create_team, public.set_club_status, public.team_board to anon, authenticated;
