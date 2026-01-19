-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Clean up existing objects
drop function if exists increment_blacklist_count;
drop view if exists public.checkpoint_status_view;
drop table if exists public.reports;
drop table if exists public.blacklist_items;
drop table if exists public.checkpoints;

-- 1. Create Checkpoints Table
create table public.checkpoints (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  location text,
  lat float8,
  lng float8,
  base_strictness int default 5,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Reports Table
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  checkpoint_id uuid references public.checkpoints(id) not null,
  status text not null, -- 'GREEN', 'YELLOW', 'RED'
  wait_time_minutes int not null,
  user_ip text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create Blacklist Items Table
create table public.blacklist_items (
  id uuid default uuid_generate_v4() primary key,
  rank int, -- Legacy field, logic now uses confiscated_count_today sorting
  name text not null,
  category text,
  reason text,
  confiscated_count_today int default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Row Level Security (RLS)
alter table public.checkpoints enable row level security;
alter table public.reports enable row level security;
alter table public.blacklist_items enable row level security;

-- Policies
create policy "Public read access" on public.checkpoints for select using (true);

create policy "Public read access" on public.reports for select using (true);
create policy "Public insert access" on public.reports for insert with check (true);

create policy "Public read access" on public.blacklist_items for select using (true);
-- ALLOW updates to counts for crowdsourcing (Consider removing this if ONLY using RPC for strict security)
create policy "Public update access" on public.blacklist_items for update using (true);
-- ALLOW insert for new item reporting
create policy "Public insert access" on public.blacklist_items for insert with check (true);


-- 5. Atomic Increment Function (RPC)
-- This ensures that if 100 people click at once, all 100 votes are counted.
create or replace function increment_blacklist_count(row_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.blacklist_items
  set confiscated_count_today = confiscated_count_today + 1,
      updated_at = now()
  where id = row_id;
end;
$$;


-- 6. Seed Initial Data
-- Checkpoints
insert into public.checkpoints (name, location, lat, lng) values
  ('海口美兰机场', 'T2 国内出发', 19.9388, 110.4589),
  ('三亚凤凰机场', '安检口 B', 18.3039, 109.4124),
  ('新海港（轮渡）', '小车安检通道', 20.0536, 110.1554),
  ('海口火车站', '进站口', 20.0256, 110.1589);

-- Blacklist Items
insert into public.blacklist_items (rank, name, category, reason, confiscated_count_today) values
  (1, '某大牌小棕瓶眼霜', '化妆品', '超出件数限制', 142),
  (2, '戴森吹风机 (多台)', '电子', '疑似代购倒卖', 89),
  (3, '茅台 (整箱)', '酒类', '超出1500ml限制', 56),
  (4, 'iPhone 15 Pro Max', '手机', '未申报且超自用', 33),
  (5, '大疆无人机', '电子', '电池超规/超额', 21);

-- 7. Helper View: Calculate Real-time Status
create or replace view public.checkpoint_status_view as
select 
  c.id,
  c.name,
  c.location,
  c.lat,
  c.lng,
  c.base_strictness,
  coalesce(avg(r.wait_time_minutes) filter (where r.created_at > now() - interval '1 hour'), 0)::int as avg_wait_time,
  count(r.id) filter (where r.created_at > now() - interval '1 hour') as report_count,
  mode() within group (order by r.status) filter (where r.created_at > now() - interval '1 hour') as most_reported_status,
  max(r.created_at) as last_report_time
from public.checkpoints c
left join public.reports r on c.id = r.checkpoint_id
group by c.id;