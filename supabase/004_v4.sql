-- v4: editable UI texts (system admin), editable team codes, virtual training hub (videos + plans)

-- ---------- editable texts: the admin changes any text in the app / landing page ----------
create table if not exists public.ui_text(
  orig text primary key,
  txt text not null,
  updated_at timestamptz not null default now());
alter table public.ui_text enable row level security;
drop policy if exists ui_read on public.ui_text;
create policy ui_read on public.ui_text for select using (true);
drop policy if exists ui_write on public.ui_text;
create policy ui_write on public.ui_text for all using (is_admin()) with check (is_admin());
grant select on public.ui_text to anon, authenticated;
grant insert, update, delete on public.ui_text to authenticated;

-- ---------- admin or club manager: edit the player code and the coach code of a team ----------
create or replace function public.set_team_codes(p_team uuid, p_code text, p_coach text) returns json
language plpgsql security definer set search_path=public as $$
declare t teams;
  a text:=upper(regexp_replace(coalesce(p_code,''),'[^A-Za-z0-9]','','g'));
  b text:=upper(regexp_replace(coalesce(p_coach,''),'[^A-Za-z0-9]','','g'));
begin
  select * into t from teams where id=p_team;
  if t.id is null or not can_manage_club(t.club_id) then raise exception 'forbidden'; end if;
  if a='' then a:=t.code; end if;
  if b='' then b:=t.coach_code; end if;
  if length(a)<4 or length(a)>10 or length(b)<4 or length(b)>10 then raise exception 'bad_code'; end if;
  if a=b then raise exception 'code_taken'; end if;
  if exists(select 1 from clubs where code in (a,b))
     or exists(select 1 from teams where id<>p_team and (code in (a,b) or coach_code in (a,b))) then raise exception 'code_taken'; end if;
  update teams set code=a, coach_code=b where id=p_team returning * into t;
  return row_to_json(t);
end $$;
grant execute on function public.set_team_codes(uuid,text,text) to authenticated;

-- ---------- virtual training hub ----------
create or replace function public.my_club() returns uuid language sql stable security definer set search_path=public as $$
  select club_id from profiles where id=auth.uid() $$;

-- club_id null = the general list of the system. A club that has its own rows sees only them.
create table if not exists public.videos(
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs on delete cascade,
  title text not null,
  yt text not null,
  sort int not null default 0,
  created_at timestamptz not null default now());
alter table public.videos enable row level security;
drop policy if exists videos_read on public.videos;
create policy videos_read on public.videos for select using (club_id is null or club_id=my_club() or is_admin());
drop policy if exists videos_write on public.videos;
create policy videos_write on public.videos for all
  using ((club_id is null and is_admin()) or (club_id is not null and can_manage_club(club_id)))
  with check ((club_id is null and is_admin()) or (club_id is not null and can_manage_club(club_id)));

-- a player's own saved training plans (a title and a list of videos)
create table if not exists public.plans(
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  vids jsonb not null default '[]',
  created_at timestamptz not null default now());
alter table public.plans enable row level security;
drop policy if exists plans_all on public.plans;
create policy plans_all on public.plans for all using (owner=auth.uid()) with check (owner=auth.uid());

-- a coach plan sent as homework: a snapshot of title and videos on the task itself
alter table public.tasks add column if not exists plan jsonb;
