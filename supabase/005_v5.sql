-- v5: several coaches per team, profile photo, own team for free players, favourites, shared training plans

alter table public.profiles add column if not exists avatar text;
alter table public.profiles add column if not exists own_team text;
alter table public.profiles add column if not exists own_logo text;
alter table public.profiles add column if not exists favs jsonb;

-- every coach who joined a team can see it (not only teams.coach_id)
create or replace function public.can_see_team(t uuid) returns boolean language sql stable security definer set search_path=public as $$
  select is_admin()
    or exists(select 1 from teams tm where tm.id=t and (tm.coach_id=auth.uid()
         or tm.club_id in (select id from clubs where manager_id=auth.uid() and status='active')))
    or exists(select 1 from profiles p where p.id=auth.uid() and p.role='coach' and p.team_id=t) $$;

-- register: several coaches per team, no stored placeholder email
create or replace function public.register(p_name text, p_age int, p_role text, p_code text default null,
  p_position text default null, p_club_name text default null, p_logo text default null, p_phone text default null, p_admin_key text default null)
returns json language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); t teams; c clubs; r text:=coalesce(p_role,'player'); cur profiles; em text;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  perform set_config('bb.trusted','1',true);
  select email into em from auth.users where id=uid;
  if em like '%@phone.brainball.app' then em:=null; end if;
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
    update teams set coach_id=uid where id=t.id and coach_id is null;
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
grant execute on function public.register(text,int,text,text,text,text,text,text,text) to authenticated;

-- training plans: videos and exercises. private = mine, club = shared with the club staff, global = example plans from the admin
alter table public.plans add column if not exists games jsonb not null default '[]';
alter table public.plans add column if not exists club_id uuid references public.clubs on delete cascade;
alter table public.plans add column if not exists scope text not null default 'private';
alter table public.plans drop constraint if exists plans_scope_chk;
alter table public.plans add constraint plans_scope_chk check (scope in ('private','club','global'));
drop policy if exists plans_all on public.plans;
drop policy if exists plans_read on public.plans;
create policy plans_read on public.plans for select using (
  owner=auth.uid() or scope='global' or is_admin()
  or (scope='club' and club_id=my_club() and exists(select 1 from profiles p where p.id=auth.uid() and p.role in ('coach','manager'))));
drop policy if exists plans_write on public.plans;
create policy plans_write on public.plans for all using (owner=auth.uid())
  with check (owner=auth.uid() and (scope<>'global' or is_admin()) and (scope<>'club' or club_id=my_club()));
