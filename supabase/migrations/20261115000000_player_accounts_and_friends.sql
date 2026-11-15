create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null default 'Operator',
  avatar_id text not null default 'avatar_default',
  created_at timestamptz not null default now()
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  constraint friend_request_not_self check (from_user <> to_user),
  constraint friend_request_unique_pair unique (from_user, to_user)
);

create index if not exists friend_requests_to_user_status_idx
  on public.friend_requests (to_user, status);

create unique index if not exists friend_requests_unique_pair_idx
  on public.friend_requests (
    least(from_user, to_user),
    greatest(from_user, to_user)
  );

create table if not exists public.player_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  lobby_state jsonb not null,
  game_profile jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.create_player_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_name text;
  unique_name text;
  suffix integer := 0;
begin
  base_name := lower(coalesce(
    new.raw_user_meta_data ->> 'preferred_username',
    split_part(coalesce(new.email, ''), '@', 1),
    'player'
  ));
  base_name := left(regexp_replace(base_name, '[^a-z0-9_]', '', 'g'), 15);
  if length(base_name) < 3 then
    base_name := 'player';
  end if;

  unique_name := base_name;
  while exists (
    select 1 from public.profiles p where p.username = unique_name
  ) loop
    suffix := suffix + 1;
    unique_name := left(base_name, 20 - length(suffix::text) - 1) || '_' || suffix::text;
  end loop;

  insert into public.profiles (user_id, username, display_name, avatar_id)
  values (
    new.id,
    unique_name,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      unique_name
    ),
    'avatar_default'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_player_profile on auth.users;
create trigger on_auth_user_created_player_profile
  after insert on auth.users
  for each row execute procedure public.create_player_profile();

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.player_saves enable row level security;

drop policy if exists "Authenticated players can find profiles" on public.profiles;
create policy "Authenticated players can find profiles"
  on public.profiles for select to authenticated
  using (true);

drop policy if exists "Players can update their own profile" on public.profiles;
create policy "Players can update their own profile"
  on public.profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "Players can view their friend requests" on public.friend_requests;
create policy "Players can view their friend requests"
  on public.friend_requests for select to authenticated
  using ((select auth.uid()) in (from_user, to_user));

drop policy if exists "Players can send their own friend requests" on public.friend_requests;
create policy "Players can send their own friend requests"
  on public.friend_requests for insert to authenticated
  with check (
    from_user = (select auth.uid())
    and to_user <> (select auth.uid())
    and status = 'pending'
  );

drop policy if exists "Recipients can respond to friend requests" on public.friend_requests;
create policy "Recipients can respond to friend requests"
  on public.friend_requests for update to authenticated
  using (to_user = (select auth.uid()) and status = 'pending')
  with check (
    to_user = (select auth.uid())
    and status in ('accepted', 'declined')
  );

drop policy if exists "Players can remove their own friend links" on public.friend_requests;
create policy "Players can remove their own friend links"
  on public.friend_requests for delete to authenticated
  using ((select auth.uid()) in (from_user, to_user));

drop policy if exists "Players can access their own save" on public.player_saves;
create policy "Players can access their own save"
  on public.player_saves for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Players can create their own save" on public.player_saves;
create policy "Players can create their own save"
  on public.player_saves for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Players can update their own save" on public.player_saves;
create policy "Players can update their own save"
  on public.player_saves for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.friend_requests to authenticated;
grant select, insert, update on public.player_saves to authenticated;
