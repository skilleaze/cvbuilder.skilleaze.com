-- Skilleaze CV Builder admin: visitor locations + live users map. Run once after cvbuilder-admin.sql.
alter table public.cvb_events add column if not exists lat numeric;
alter table public.cvb_events add column if not exists lon numeric;
alter table public.cvb_events add column if not exists city text;
alter table public.cvb_events add column if not exists country text;

create or replace function public.cvb_track(p jsonb) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p is null or length(p::text) > 6000 then return; end if;
  insert into cvb_events (sid, ev, path, ref, src, med, camp, dev, tz, value, currency, tags, meta, lat, lon, city, country)
  values (left(p->>'sid',64), left(p->>'ev',40), left(p->>'path',200), left(p->>'ref',200),
          left(p->>'src',80), left(p->>'med',80), left(p->>'camp',120), left(p->>'dev',20), left(p->>'tz',60),
          case when coalesce(p->>'value','') ~ '^[0-9]+(\.[0-9]+)?$' then (p->>'value')::numeric end,
          left(upper(p->>'currency'),3),
          case when jsonb_typeof(p->'tags')='object' then p->'tags' end,
          case when jsonb_typeof(p->'meta')='object' then p->'meta' end,
          case when coalesce(p->>'lat','') ~ '^-?[0-9]+(\.[0-9]+)?$' then round((p->>'lat')::numeric,2) end,
          case when coalesce(p->>'lon','') ~ '^-?[0-9]+(\.[0-9]+)?$' then round((p->>'lon')::numeric,2) end,
          left(p->>'city',60), left(p->>'country',60));
end $$;
grant execute on function public.cvb_track(jsonb) to anon, authenticated;

create or replace function public.cvb_admin_geo(p_user text, p_pass text, p_from date, p_to date) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare f timestamptz; t timestamptz; r json;
begin
  if not cvb_admin_ok(p_user, p_pass) then raise exception 'Wrong username or password'; end if;
  f := coalesce(p_from, current_date - 29)::timestamptz;
  t := (coalesce(p_to, current_date) + 1)::timestamptz;
  select json_build_object(
    'points', coalesce((select json_agg(x) from (
        select round(lat,1) lat, round(lon,1) lon, max(city) city, max(country) country, count(distinct sid) n
        from cvb_events where at >= f and at < t and lat is not null and lon is not null
        group by 1, 2 order by 5 desc limit 600) x), '[]'::json),
    'live', coalesce((select json_agg(x) from (
        select round(lat,1) lat, round(lon,1) lon, max(city) city, max(country) country, count(distinct sid) n,
               (array_agg(path order by at desc))[1] path
        from cvb_events where at > now() - interval '5 minutes' and lat is not null and lon is not null
        group by 1, 2 order by 5 desc limit 200) x), '[]'::json),
    'live_count', (select count(distinct sid) from cvb_events where at > now() - interval '5 minutes'),
    'countries', coalesce((select json_agg(x) from (
        select coalesce(nullif(country,''),'Unknown') country, count(distinct sid) n
        from cvb_events where at >= f and at < t and ev = 'page_view' group by 1 order by 2 desc limit 12) x), '[]'::json)
  ) into r;
  return r;
end $$;
grant execute on function public.cvb_admin_geo(text, text, date, date) to anon;
