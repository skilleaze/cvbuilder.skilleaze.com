-- Skilleaze CV Builder: Dodo Payments table. Run once in Supabase > SQL Editor.
create table if not exists public.cvb_payments (
  ref uuid primary key,
  kind text not null,
  product_id text,
  cv_id text,
  cv_name text,
  session_id text,
  payment_id text,
  subscription_id text,
  status text not null default 'pending',
  amount integer,
  currency text,
  email text,
  customer_name text,
  last_event text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cvb_payments_email on public.cvb_payments (email);
alter table public.cvb_payments enable row level security;
-- No public policies: only the edge functions (service role) can read or write this table.
