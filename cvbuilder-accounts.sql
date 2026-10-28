-- Skilleaze CV Builder (customer site) · subscriber accounts
-- Run once in Supabase → SQL Editor. Safe to run again. Uses the same project as the CV Portal.
create extension if not exists pgcrypto with schema extensions;

create table if not exists cvb_accounts(
  email text primary key, name text default '', pass text not null,
  plan_until timestamptz, created_at timestamptz default now(), last_login timestamptz);
create table if not exists cvb_sessions(
  token text primary key, email text references cvb_accounts(email) on delete cascade, created_at timestamptz default now());
create table if not exists cvb_cvs(
  email text references cvb_accounts(email) on delete cascade, id text not null, doc jsonb not null,
  tailored boolean default false, updated_at timestamptz default now(), primary key(email,id));
alter table cvb_accounts enable row level security;
alter table cvb_sessions enable row level security;
alter table cvb_cvs enable row level security;

create or replace function cvb_auth(p_token text) returns cvb_accounts
language plpgsql security definer set search_path=public, extensions as $$
declare a cvb_accounts; begin
  select ac.* into a from cvb_sessions s join cvb_accounts ac on ac.email=s.email
   where s.token=p_token and s.created_at > now() - interval '180 days';
  if a.email is null then raise exception 'Please sign in again.'; end if;
  return a; end $$;

create or replace function cvb_out(a cvb_accounts, t text) returns json language sql as $$
  select json_build_object('token',t,'email',a.email,'name',a.name,'until',a.plan_until) $$;

-- called after a successful subscription payment
create or replace function cvb_subscribe(p_email text, p_name text, p_pass text, p_days int) returns json
language plpgsql security definer set search_path=public, extensions as $$
declare a cvb_accounts; t text; e text:=lower(trim(p_email)); begin
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email.'; end if;
  if length(coalesce(p_pass,''))<6 then raise exception 'Password must be at least 6 characters.'; end if;
  select * into a from cvb_accounts where email=e;
  if a.email is null then
    insert into cvb_accounts(email,name,pass,plan_until) values(e,coalesce(p_name,''),crypt(p_pass,gen_salt('bf')),now()+make_interval(days=>greatest(1,least(p_days,400)))) returning * into a;
  else
    if a.pass<>crypt(p_pass,a.pass) then raise exception 'This email already has an account. Use its password.'; end if;
    update cvb_accounts set plan_until=greatest(coalesce(plan_until,now()),now())+make_interval(days=>greatest(1,least(p_days,400))),name=coalesce(nullif(p_name,''),name) where email=e returning * into a;
  end if;
  t:=encode(gen_random_bytes(24),'hex'); insert into cvb_sessions(token,email) values(t,e);
  return cvb_out(a,t); end $$;

create or replace function cvb_login(p_email text, p_pass text) returns json
language plpgsql security definer set search_path=public, extensions as $$
declare a cvb_accounts; t text; begin
  select * into a from cvb_accounts where email=lower(trim(p_email));
  if a.email is null or a.pass<>crypt(p_pass,a.pass) then raise exception 'Wrong email or password.'; end if;
  update cvb_accounts set last_login=now() where email=a.email;
  t:=encode(gen_random_bytes(24),'hex'); insert into cvb_sessions(token,email) values(t,a.email);
  return cvb_out(a,t); end $$;

create or replace function cvb_me(p_token text) returns json
language plpgsql security definer set search_path=public, extensions as $$
declare a cvb_accounts; begin a:=cvb_auth(p_token); return cvb_out(a,p_token); end $$;

create or replace function cvb_logout(p_token text) returns boolean
language sql security definer set search_path=public as $$ delete from cvb_sessions where token=p_token; select true $$;

create or replace function cvb_save(p_token text, p_id text, p_doc jsonb) returns boolean
language plpgsql security definer set search_path=public, extensions as $$
declare a cvb_accounts; begin a:=cvb_auth(p_token);
  if length(p_doc::text)>2000000 then raise exception 'CV is too large to save.'; end if;
  insert into cvb_cvs(email,id,doc,tailored,updated_at) values(a.email,p_id,p_doc,(p_doc ? 'jdFor') and p_doc->'jdFor' is not null and p_doc->>'jdFor'<>'null',now())
  on conflict(email,id) do update set doc=excluded.doc,tailored=excluded.tailored,updated_at=now();
  return true; end $$;

create or replace function cvb_list(p_token text) returns json
language plpgsql security definer set search_path=public, extensions as $$
declare a cvb_accounts; begin a:=cvb_auth(p_token);
  return coalesce((select json_agg(doc order by updated_at desc) from cvb_cvs where email=a.email),'[]'::json); end $$;

create or replace function cvb_delete(p_token text, p_id text) returns boolean
language plpgsql security definer set search_path=public, extensions as $$
declare a cvb_accounts; begin a:=cvb_auth(p_token); delete from cvb_cvs where email=a.email and id=p_id; return true; end $$;

revoke all on cvb_accounts, cvb_sessions, cvb_cvs from anon, authenticated;
grant execute on function cvb_subscribe(text,text,text,int), cvb_login(text,text), cvb_me(text), cvb_logout(text), cvb_save(text,text,jsonb), cvb_list(text), cvb_delete(text,text) to anon, authenticated;

-- ===== One plan, one person (upgrade, safe to run again) =====
alter table cvb_accounts add column if not exists lock_base text;
alter table cvb_accounts add column if not exists lock_name text;
alter table cvb_accounts add column if not exists lock_email text;
alter table cvb_accounts add column if not exists lock_phone text;
alter table cvb_accounts add column if not exists lock_label text;
alter table cvb_accounts add column if not exists lock_at timestamptz;

create or replace function cvb_out(a cvb_accounts, t text) returns json language sql as $$
  select json_build_object('token',t,'email',a.email,'name',a.name,'until',a.plan_until,
    'lock',case when a.lock_name is null then null else json_build_object('base',a.lock_base,'name',a.lock_name,'email',a.lock_email,'phone',a.lock_phone,'label',a.lock_label,'at',a.lock_at) end) $$;

-- links the plan to one person the first time they tailor; cannot be changed afterwards
create or replace function cvb_lock(p_token text, p_base text, p_name text, p_email text, p_phone text, p_label text) returns json
language plpgsql security definer set search_path=public, extensions as $$
declare a cvb_accounts; begin a:=cvb_auth(p_token);
  if a.plan_until is null or a.plan_until < now() then raise exception 'Your plan has ended. Subscribe to continue.'; end if;
  if coalesce(trim(p_name),'')='' then raise exception 'Add your full name to the CV first.'; end if;
  if a.lock_name is not null and a.lock_name<>p_name then
    raise exception 'This plan is already linked to %. Start a new plan for another person.', coalesce(a.lock_label,a.lock_name); end if;
  if a.lock_name is null then
    update cvb_accounts set lock_base=p_base,lock_name=p_name,lock_email=nullif(p_email,''),lock_phone=nullif(p_phone,''),lock_label=p_label,lock_at=now() where email=a.email returning * into a;
  end if;
  return cvb_out(a,p_token); end $$;


-- Skilleaze CV Builder · Google sign-in. Run once in Supabase → SQL Editor. Safe to run again.
-- Needs: Supabase → Authentication → Providers → Google switched on.

-- signs in (or creates) the customer account for the verified Google email
create or replace function cvb_google() returns json
language plpgsql security definer set search_path=public, extensions, auth as $$
declare j jsonb:=auth.jwt(); e text; nm text; a cvb_accounts; t text; begin
  e:=lower(trim(coalesce(j->>'email','')));
  if e='' or coalesce(j->'user_metadata'->>'email_verified', j->>'email_verified','true')='false' then raise exception 'Google did not share a verified email.'; end if;
  nm:=coalesce(j->'user_metadata'->>'full_name', j->'user_metadata'->>'name', '');
  select * into a from cvb_accounts where email=e;
  if a.email is null then
    insert into cvb_accounts(email,name,pass) values(e,nm,crypt(encode(gen_random_bytes(18),'hex'),gen_salt('bf'))) returning * into a;
  elsif coalesce(a.name,'')='' and nm<>'' then update cvb_accounts set name=nm where email=e returning * into a;
  end if;
  update cvb_accounts set last_login=now() where email=e;
  t:=encode(gen_random_bytes(24),'hex'); insert into cvb_sessions(token,email) values(t,e);
  return cvb_out(a,t); end $$;
grant execute on function cvb_google() to authenticated;

-- subscribe / renew for an account that is already signed in (Google or email)
create or replace function cvb_subscribe_tok(p_token text, p_days int) returns json
language plpgsql security definer set search_path=public, extensions as $$
declare a cvb_accounts; begin a:=cvb_auth(p_token);
  update cvb_accounts set plan_until=greatest(coalesce(plan_until,now()),now())+make_interval(days=>greatest(1,least(p_days,400))) where email=a.email returning * into a;
  return cvb_out(a,p_token); end $$;


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
