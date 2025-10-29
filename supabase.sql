-- Supabase schema for Cinema Booking Demo
-- Run in SQL editor of your Supabase project.

create table if not exists movies (
  id text primary key,
  title text not null,
  genres text[] default '{}',
  status text check (status in ('now','soon')) default 'now',
  duration_min int,
  poster text
);

create table if not exists cinemas (
  id text primary key,
  name text not null,
  address text
);

create table if not exists rooms (
  id text primary key,
  cinema_id text references cinemas(id) on delete cascade,
  name text not null,
  rows int not null,
  cols int not null,
  vip_rows text[] default '{}',
  couple_rows text[] default '{}',
  wheel_spots text[] default '{}'
);

create table if not exists showtimes (
  id text primary key,
  movie_id text references movies(id) on delete cascade,
  cinema_id text references cinemas(id) on delete cascade,
  room_id text references rooms(id) on delete cascade,
  date date not null,
  time text not null
);

create table if not exists pricing (
  type text primary key check (type in ('base','vip','couple','wheel')),
  value int not null
);

create table if not exists coupons (
  code text primary key,
  type text not null check (type in ('percent','amount')),
  value int not null,
  min_total int default 0,
  expires_at timestamptz
);

create table if not exists holds (
  showtime_id text references showtimes(id) on delete cascade,
  seat_id text not null,
  session_id text not null,
  expires_at timestamptz not null,
  primary key (showtime_id, seat_id)
);

create table if not exists tickets (
  id text primary key,
  code text unique not null,
  showtime_id text references showtimes(id) on delete cascade,
  seats text[] not null,
  purchased_at timestamptz not null,
  owner_session text,
  total_paid int not null
);

-- RLS (Row Level Security)
alter table movies enable row level security;
alter table cinemas enable row level security;
alter table rooms enable row level security;
alter table showtimes enable row level security;
alter table pricing enable row level security;
alter table coupons enable row level security;
alter table holds enable row level security;
alter table tickets enable row level security;

-- Demo policies (permissive for anon; tighten for production)
-- Public read
create policy "public read movies" on movies for select using (true);
create policy "public read cinemas" on cinemas for select using (true);
create policy "public read rooms" on rooms for select using (true);
create policy "public read showtimes" on showtimes for select using (true);
create policy "public read pricing" on pricing for select using (true);
create policy "public read coupons" on coupons for select using (true);
create policy "public read tickets" on tickets for select using (true);
create policy "public read holds" on holds for select using (true);

-- Public write (DEMO ONLY). Consider using authenticated role or service role in production.
create policy "public write movies" on movies for insert with check (true);
create policy "public write cinemas" on cinemas for insert with check (true);
create policy "public write rooms" on rooms for insert with check (true);
create policy "public write showtimes" on showtimes for insert with check (true);
create policy "public write pricing upsert" on pricing for all using (true) with check (true);
create policy "public write coupons" on coupons for all using (true) with check (true);
create policy "public write holds" on holds for all using (true) with check (true);
create policy "public write tickets" on tickets for insert with check (true);

-- Optional: clean up expired holds with a scheduled function (Edge Function or cron outside Supabase)


