-- Skilleaze CV Builder · 2-day free trial. Run once in Supabase → SQL Editor. Safe to run again.
alter table public.cvb_payments add column if not exists acct_email text;
alter table public.cvb_payments add column if not exists customer_id text;
create index if not exists cvb_payments_acct on public.cvb_payments (acct_email);
