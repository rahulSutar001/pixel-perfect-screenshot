-- Schema for going live. Run in your database SQL editor.
create table public.market_indices (
  id bigserial primary key,
  date date not null,
  index_name text not null,
  open numeric, high numeric, low numeric, close numeric not null,
  volume bigint,
  unique (index_name, date)
);
grant select on public.market_indices to anon, authenticated;
grant all on public.market_indices to service_role;
alter table public.market_indices enable row level security;
create policy "public read" on public.market_indices for select using (true);

create table public.crisis_events (
  id bigserial primary key,
  name text not null,
  start_date date not null,
  end_date date not null,
  description text,
  peak_volatility numeric
);
grant select on public.crisis_events to anon, authenticated;
grant all on public.crisis_events to service_role;
alter table public.crisis_events enable row level security;
create policy "public read" on public.crisis_events for select using (true);

insert into public.crisis_events (name, start_date, end_date, description, peak_volatility) values
 ('Global Financial Crisis','2008-09-01','2009-03-31','Lehman Brothers collapse triggers a global credit freeze.',72.4),
 ('Eurozone Debt Crisis','2011-07-15','2011-11-30','Sovereign debt fears; US downgraded by S&P.',34.1),
 ('Taper Tantrum','2013-05-20','2013-09-15','Fed signals QE taper; EM sell-off.',28.6),
 ('COVID-19 Market Crash','2020-02-20','2020-05-15','Pandemic lockdowns cause the fastest bear market.',81.2),
 ('2022 Rate Shock','2022-02-15','2022-07-15','Russia–Ukraine war and aggressive rate hikes.',31.8),
 ('2024 Election Volatility','2024-05-25','2024-06-20','Indian election results trigger a sharp crash and rebound.',26.3);

create table public.user_annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_targeted date not null,
  annotation_text text not null check (char_length(annotation_text) <= 500),
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.user_annotations to authenticated;
grant all on public.user_annotations to service_role;
alter table public.user_annotations enable row level security;
create policy "own rows" on public.user_annotations for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
