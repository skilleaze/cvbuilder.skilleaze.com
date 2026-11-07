-- Skilleaze CV Builder: Meta Purchase fix. Run once in Supabase > SQL Editor (safe to run again).
alter table public.cvb_payments add column if not exists page text;
alter table public.cvb_payments add column if not exists value_local numeric;
alter table public.cvb_payments add column if not exists currency_local text;
alter table public.cvb_payments add column if not exists title text;
alter table public.cvb_payments add column if not exists fbp text;
alter table public.cvb_payments add column if not exists fbc text;
alter table public.cvb_payments add column if not exists ip text;
alter table public.cvb_payments add column if not exists ua text;
alter table public.cvb_payments add column if not exists capi_sent boolean not null default false;
create table if not exists public.cvb_ad_log (
  id bigserial primary key, at timestamptz not null default now(),
  channel text, ref text, ok boolean, reply text
);
alter table public.cvb_ad_log enable row level security;
