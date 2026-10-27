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
