-- Skilleaze CV Builder: admin dashboard + first-party analytics.
-- Run once in Supabase > SQL Editor. Safe to run again.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.cvb_events (
  id bigserial primary key,
  at timestamptz not null default now(),
  sid text, ev text, path text, ref text, src text, med text, camp text,
  dev text, tz text, value numeric, currency text, tags jsonb, meta jsonb
);
create index if not exists cvb_events_at on public.cvb_events (at);
create index if not exists cvb_events_ev_at on public.cvb_events (ev, at);
alter table public.cvb_events enable row level security;

create table if not exists public.cvb_ad_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  channel text, ref text, ok boolean, reply text
);
create index if not exists cvb_ad_log_at on public.cvb_ad_log (at);
alter table public.cvb_ad_log enable row level security;

create table if not exists public.cvb_admin (username text primary key, pass_hash text not null);
alter table public.cvb_admin enable row level security;
insert into public.cvb_admin (username, pass_hash)
values ('admin', extensions.crypt('skilleaze@2327', extensions.gen_salt('bf')))
on conflict (username) do update set pass_hash = excluded.pass_hash;

-- Browser tracker writes here (no direct table access).
create or replace function public.cvb_track(p jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p is null or length(p::text) > 6000 then return; end if;
  insert into cvb_events (sid, ev, path, ref, src, med, camp, dev, tz, value, currency, tags, meta)
  values (left(p->>'sid',64), left(p->>'ev',40), left(p->>'path',200), left(p->>'ref',200),
          left(p->>'src',80), left(p->>'med',80), left(p->>'camp',120), left(p->>'dev',20), left(p->>'tz',60),
          case when coalesce(p->>'value','') ~ '^[0-9]+(\.[0-9]+)?$' then (p->>'value')::numeric end,
          left(upper(p->>'currency'),3),
          case when jsonb_typeof(p->'tags')='object' then p->'tags' end,
          case when jsonb_typeof(p->'meta')='object' then p->'meta' end);
end $$;
grant execute on function public.cvb_track(jsonb) to anon, authenticated;

create or replace function public.cvb_admin_ok(p_user text, p_pass text) returns boolean
language sql security definer set search_path = public, extensions as $$
  select exists (select 1 from cvb_admin where username = lower(trim(p_user)) and pass_hash = extensions.crypt(p_pass, pass_hash));
$$;

create or replace function public.cvb_admin_login(p_user text, p_pass text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not cvb_admin_ok(p_user, p_pass) then perform pg_sleep(0.6); return false; end if;
  return true;
end $$;
grant execute on function public.cvb_admin_login(text, text) to anon;

create or replace function public.cvb_admin_stats(p_user text, p_pass text, p_from date, p_to date) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare f timestamptz; t timestamptz; r json;
begin
  if not cvb_admin_ok(p_user, p_pass) then raise exception 'Wrong username or password'; end if;
  f := coalesce(p_from, current_date - 29)::timestamptz;
  t := (coalesce(p_to, current_date) + 1)::timestamptz;
  with e as (select * from cvb_events where at >= f and at < t),
       pay as (select * from cvb_payments where created_at >= f and created_at < t)
  select json_build_object(
    'totals', (select json_build_object(
        'visitors', count(distinct sid) filter (where ev = 'page_view'),
        'pageviews', count(*) filter (where ev = 'page_view'),
        'checkouts', count(*) filter (where ev = 'checkout'),
        'purchases_browser', count(*) filter (where ev = 'purchase'),
        'whatsapp', count(*) filter (where ev = 'whatsapp'),
        'downloads', count(*) filter (where ev = 'download'),
        'signins', count(*) filter (where ev = 'signin'),
        'ats_checks', count(*) filter (where ev = 'ats_check')) from e),
    'payments', (select json_build_object(
        'paid', count(*) filter (where status = 'paid'),
        'pending', count(*) filter (where status = 'pending'),
        'failed', count(*) filter (where status = 'failed'),
        'revenue', coalesce((select json_agg(x) from (select upper(coalesce(currency,'USD')) cur, sum(amount)::numeric/100 total, count(*) n
                    from pay where status = 'paid' group by 1 order by 2 desc) x), '[]'::json),
        'by_kind', coalesce((select json_agg(x) from (select kind, count(*) n from pay where status = 'paid' group by 1 order by 2 desc) x), '[]'::json)) from pay),
    'daily', coalesce((select json_agg(x order by d) from (
        select g::date d,
          (select count(distinct sid) from e where ev='page_view' and at::date = g::date) visitors,
          (select count(*) from e where ev='page_view' and at::date = g::date) pageviews,
          (select count(*) from e where ev='checkout' and at::date = g::date) checkouts,
          (select count(*) from pay where status='paid' and created_at::date = g::date) paid
        from generate_series(f::date, (t - interval '1 day')::date, interval '1 day') g) x), '[]'::json),
    'sources', coalesce((select json_agg(x) from (
        select coalesce(nullif(src,''), nullif(regexp_replace(coalesce(ref,''), '^https?://(www\.)?([^/]+).*$', '\2'),''), 'direct') source,
               coalesce(nullif(med,''),'') medium, count(distinct sid) visitors
        from e where ev = 'page_view' group by 1, 2 order by 3 desc limit 12) x), '[]'::json),
    'pages', coalesce((select json_agg(x) from (select coalesce(path,'/') path, count(*) views, count(distinct sid) visitors
        from e where ev='page_view' group by 1 order by 2 desc limit 12) x), '[]'::json),
    'devices', coalesce((select json_agg(x) from (select coalesce(dev,'unknown') dev, count(distinct sid) n from e where ev='page_view' group by 1 order by 2 desc) x), '[]'::json),
    'regions', coalesce((select json_agg(x) from (select coalesce(nullif(tz,''),'unknown') tz, count(distinct sid) n from e where ev='page_view' group by 1 order by 2 desc limit 10) x), '[]'::json),
    'channels_browser', (select json_build_object(
        'checked', count(*),
        'ga', json_build_object('n', count(*) filter (where (tags->>'ga')::boolean), 'last', max(at) filter (where (tags->>'ga')::boolean)),
        'gads', json_build_object('n', count(*) filter (where (tags->>'gads')::boolean), 'last', max(at) filter (where (tags->>'gads')::boolean)),
        'fb', json_build_object('n', count(*) filter (where (tags->>'fb')::boolean), 'last', max(at) filter (where (tags->>'fb')::boolean)),
        'tt', json_build_object('n', count(*) filter (where (tags->>'tt')::boolean), 'last', max(at) filter (where (tags->>'tt')::boolean)),
        'oai', json_build_object('n', count(*) filter (where (tags->>'oai')::boolean), 'last', max(at) filter (where (tags->>'oai')::boolean)),
        'clarity', json_build_object('n', count(*) filter (where (tags->>'clarity')::boolean), 'last', max(at) filter (where (tags->>'clarity')::boolean)))
      from e where ev = 'tags'),
    'channels_server', coalesce((select json_agg(x) from (select channel, count(*) filter (where ok) ok, count(*) filter (where not ok) failed, max(at) last,
        (array_agg(reply order by at desc))[1] last_reply from cvb_ad_log where at >= f and at < t group by 1) x), '[]'::json),
    'events', coalesce((select json_agg(x) from (select ev, count(*) n, max(at) last from e group by 1 order by 2 desc) x), '[]'::json),
    'recent_payments', coalesce((select json_agg(x) from (select created_at, kind, status, amount::numeric/100 amount, upper(coalesce(currency,'')) currency,
        coalesce(customer_name,'') name, coalesce(email,'') email, coalesce(cv_name,'') cv_name from cvb_payments where created_at >= f and created_at < t
        order by created_at desc limit 40) x), '[]'::json),
    'recent_events', coalesce((select json_agg(x) from (select at, ev, path, coalesce(nullif(src,''), regexp_replace(coalesce(ref,''), '^https?://(www\.)?([^/]+).*$', '\2')) source, dev, value, currency
        from e where ev <> 'tags' order by at desc limit 40) x), '[]'::json)
  ) into r;
  return r;
end $$;
grant execute on function public.cvb_admin_stats(text, text, date, date) to anon;
