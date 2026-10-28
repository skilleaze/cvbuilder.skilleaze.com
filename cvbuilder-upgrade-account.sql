-- Skilleaze CV Builder · profile + billing. Run once in Supabase → SQL Editor. Safe to run again.
alter table cvb_accounts add column if not exists picture text;
alter table cvb_accounts add column if not exists phone text;
create table if not exists cvb_payments(
  id text primary key, email text references cvb_accounts(email) on delete cascade,
  kind text, item text, amount text, currency text, until timestamptz, at timestamptz default now());
alter table cvb_payments enable row level security;

create or replace function cvb_out(a cvb_accounts, t text) returns json language sql as $$
  select json_build_object('token',t,'email',a.email,'name',a.name,'until',a.plan_until,'picture',a.picture,'phone',a.phone,'created',a.created_at,
    'lock',case when a.lock_name is null then null else json_build_object('base',a.lock_base,'name',a.lock_name,'email',a.lock_email,'phone',a.lock_phone,'label',a.lock_label,'at',a.lock_at) end) $$;

create or replace function cvb_google() returns json
language plpgsql security definer set search_path=public, extensions, auth as $$
declare j jsonb:=auth.jwt(); e text; nm text; pic text; a cvb_accounts; t text; begin
  e:=lower(trim(coalesce(j->>'email','')));
  if e='' or coalesce(j->'user_metadata'->>'email_verified', j->>'email_verified','true')='false' then raise exception 'Google did not share a verified email.'; end if;
  nm:=coalesce(j->'user_metadata'->>'full_name', j->'user_metadata'->>'name', '');
  pic:=coalesce(j->'user_metadata'->>'avatar_url', j->'user_metadata'->>'picture', null);
  select * into a from cvb_accounts where email=e;
  if a.email is null then
    insert into cvb_accounts(email,name,pass,picture) values(e,nm,crypt(encode(gen_random_bytes(18),'hex'),gen_salt('bf')),pic) returning * into a;
  else
    update cvb_accounts set name=case when coalesce(name,'')='' then nm else name end, picture=coalesce(pic,picture) where email=e returning * into a;
  end if;
  update cvb_accounts set last_login=now() where email=e;
  t:=encode(gen_random_bytes(24),'hex'); insert into cvb_sessions(token,email) values(t,e);
  return cvb_out(a,t); end $$;
grant execute on function cvb_google() to authenticated;

create or replace function cvb_profile(p_token text, p_name text, p_phone text) returns json
language plpgsql security definer set search_path=public, extensions as $$
declare a cvb_accounts; begin a:=cvb_auth(p_token);
  if length(trim(coalesce(p_name,'')))<2 then raise exception 'Enter your name.'; end if;
  update cvb_accounts set name=trim(p_name), phone=nullif(trim(coalesce(p_phone,'')),'') where email=a.email returning * into a;
  return cvb_out(a,p_token); end $$;

create or replace function cvb_pay_log(p_token text, p_kind text, p_item text, p_amount text, p_currency text, p_ref text) returns json
language plpgsql security definer set search_path=public, extensions as $$
declare a cvb_accounts; r cvb_payments; begin a:=cvb_auth(p_token);
  insert into cvb_payments(id,email,kind,item,amount,currency,until)
    values(coalesce(nullif(p_ref,''),'INV-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(md5(random()::text),1,5))),a.email,p_kind,p_item,p_amount,p_currency,
           case when p_kind='sub' then a.plan_until else null end)
    on conflict (id) do nothing returning * into r;
  return row_to_json(r); end $$;

create or replace function cvb_payments(p_token text) returns json
language plpgsql security definer set search_path=public, extensions as $$
declare a cvb_accounts; begin a:=cvb_auth(p_token);
  return coalesce((select json_agg(x order by x.at desc) from (select id,kind,item,amount,currency,until,at from cvb_payments where email=a.email) x),'[]'::json); end $$;
