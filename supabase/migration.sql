-- ═══════════════════════════════════════════════
-- PackFlow — Supabase Schema Migration
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── User Profiles (extends Supabase auth.users) ───
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  avatar text not null default '',
  color text not null default '#63d297',
  created_at timestamptz not null default now(),
  last_login timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view all profiles"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, avatar, color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 1)),
    (array['#63d297','#5ba4f5','#f5a623','#b07cff','#ef5f5f','#e891dc','#45c7d1'])[floor(random()*7+1)]
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─── Boards ───
create table public.boards (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  color text not null default '#63d297',
  invite_code text unique not null default upper(substring(replace(uuid_generate_v4()::text, '-', '') from 1 for 8)),
  created_at timestamptz not null default now()
);

alter table public.boards enable row level security;

create policy "Board members can view boards"
  on public.boards for select using (
    id in (select board_id from public.board_members where user_id = auth.uid())
  );

create policy "Authenticated users can create boards"
  on public.boards for insert with check (auth.uid() = owner_id);

create policy "Board owners can update boards"
  on public.boards for update using (auth.uid() = owner_id);

create policy "Board owners can delete boards"
  on public.boards for delete using (auth.uid() = owner_id);


-- ─── Board Members (join table) ───
create table public.board_members (
  board_id uuid references public.boards(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (board_id, user_id)
);

alter table public.board_members enable row level security;

create policy "Members can view board memberships"
  on public.board_members for select using (
    board_id in (select board_id from public.board_members where user_id = auth.uid())
  );

create policy "Board owners can manage members"
  on public.board_members for all using (
    board_id in (select id from public.boards where owner_id = auth.uid())
  );

create policy "Users can join via invite"
  on public.board_members for insert with check (auth.uid() = user_id);


-- ─── Columns (lists) ───
create table public.columns (
  id uuid primary key default uuid_generate_v4(),
  board_id uuid references public.boards(id) on delete cascade not null,
  name text not null,
  color text not null default '#8b95a5',
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.columns enable row level security;

create policy "Board members can view columns"
  on public.columns for select using (
    board_id in (select board_id from public.board_members where user_id = auth.uid())
  );

create policy "Board members can manage columns"
  on public.columns for all using (
    board_id in (select board_id from public.board_members where user_id = auth.uid())
  );


-- ─── Cards ───
create table public.cards (
  id uuid primary key default uuid_generate_v4(),
  board_id uuid references public.boards(id) on delete cascade not null,
  column_id uuid references public.columns(id) on delete set null,
  title text not null,
  notes text default '',
  assignee text default '',
  images text[] default '{}',
  tags text[] default '{}',
  due_date date,
  created_date date default current_date,
  checkpoints jsonb default '{}',
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cards enable row level security;

create policy "Board members can view cards"
  on public.cards for select using (
    board_id in (select board_id from public.board_members where user_id = auth.uid())
  );

create policy "Board members can manage cards"
  on public.cards for all using (
    board_id in (select board_id from public.board_members where user_id = auth.uid())
  );

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger cards_updated_at
  before update on public.cards
  for each row execute function public.update_updated_at();


-- ─── Changelog ───
create table public.changelog (
  id uuid primary key default uuid_generate_v4(),
  card_id uuid references public.cards(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  user_name text not null,
  action text not null,
  detail text default '',
  created_at timestamptz not null default now()
);

alter table public.changelog enable row level security;

create policy "Board members can view changelog"
  on public.changelog for select using (
    card_id in (
      select c.id from public.cards c
      join public.board_members bm on bm.board_id = c.board_id
      where bm.user_id = auth.uid()
    )
  );

create policy "Board members can add changelog entries"
  on public.changelog for insert with check (
    card_id in (
      select c.id from public.cards c
      join public.board_members bm on bm.board_id = c.board_id
      where bm.user_id = auth.uid()
    )
  );


-- ─── Indexes for performance ───
create index idx_cards_board_id on public.cards(board_id);
create index idx_cards_column_id on public.cards(column_id);
create index idx_changelog_card_id on public.changelog(card_id);
create index idx_board_members_user_id on public.board_members(user_id);
create index idx_board_members_board_id on public.board_members(board_id);
create index idx_columns_board_id on public.columns(board_id);
create index idx_boards_invite_code on public.boards(invite_code);


-- ─── Seed default columns function ───
-- Call this after creating a board to add default columns
create or replace function public.seed_board_columns(p_board_id uuid)
returns void as $$
begin
  insert into public.columns (board_id, name, color, position) values
    (p_board_id, 'Backlog', '#8b95a5', 0),
    (p_board_id, 'In Progress', '#5ba4f5', 1),
    (p_board_id, 'Packed', '#b07cff', 2),
    (p_board_id, 'Shipped', '#f5a623', 3),
    (p_board_id, 'Delivered', '#63d297', 4);
end;
$$ language plpgsql security definer;
