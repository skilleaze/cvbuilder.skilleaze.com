-- Skilleaze CV Builder · free-trial tracking for the admin page. Run once in Supabase → SQL Editor. Safe to run again.
alter table public.cvb_payments add column if not exists acct_email text;
alter table public.cvb_payments add column if not exists customer_id text;
alter table public.cvb_payments add column if not exists sub_state text;          -- trialing · active · cancelled · on_hold · failed · expired
alter table public.cvb_payments add column if not exists trial_end timestamptz;
alter table public.cvb_payments add column if not exists next_billing timestamptz;
alter table public.cvb_payments add column if not exists charges int not null default 0;
alter table public.cvb_payments add column if not exists last_charge_at timestamptz;
alter table public.cvb_payments add column if not exists card_at timestamptz;      -- when the card was added (trial started)
alter table public.cvb_payments add column if not exists cancelled_at timestamptz;
create index if not exists cvb_payments_acct on public.cvb_payments (acct_email);
create index if not exists cvb_payments_sub on public.cvb_payments (subscription_id);

create or replace function public.cvb_admin_trials(p_user text, p_pass text, p_from date, p_to date) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare f timestamptz; t timestamptz; r json;
begin
  if not cvb_admin_ok(p_user, p_pass) then raise exception 'Wrong username or password'; end if;
  f := coalesce(p_from, current_date - 29)::timestamptz;
  t := (coalesce(p_to, current_date) + 1)::timestamptz;
  with s as (select * from cvb_payments where kind = 'sub'),
       sp as (select * from s where created_at >= f and created_at < t)
  select json_build_object(
    'opened',        (select count(*) from sp),
    'cards',         (select count(*) from sp where card_at is not null),
    'no_card',       (select count(*) from sp where card_at is null and status = 'pending'),
    'trial_now',     (select count(*) from s where sub_state = 'trialing' and coalesce(trial_end, next_billing) > now()),
    'paying_now',    (select count(*) from s where sub_state = 'active' and charges > 0),
    'converted',     (select count(*) from sp where charges > 0),
    'cancel_trial',  (select count(*) from sp where cancelled_at is not null and charges = 0),
    'cancel_paid',   (select count(*) from sp where cancelled_at is not null and charges > 0),
    'failed',        (select count(*) from sp where sub_state in ('on_hold','failed')),
    'expired',       (select count(*) from sp where sub_state = 'expired'),
    'ending_24h',    (select count(*) from s where sub_state = 'trialing' and coalesce(trial_end, next_billing) between now() and now() + interval '24 hours'),
    'list', coalesce((select json_agg(x) from (
        select created_at, card_at, trial_end, next_billing, cancelled_at, charges, sub_state, status,
               coalesce(nullif(acct_email,''), email) email, customer_name
        from sp order by created_at desc limit 200) x), '[]'::json)
  ) into r;
  return r;
end $$;
grant execute on function public.cvb_admin_trials(text, text, date, date) to anon;
