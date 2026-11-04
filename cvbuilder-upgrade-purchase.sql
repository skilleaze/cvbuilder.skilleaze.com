-- Skilleaze CV Builder · paid downloads saved to the buyer's email, re-download of the same version, saved card.
-- Run once in Supabase → SQL Editor, after the earlier cvbuilder-*.sql files. Safe to run again.
alter table cvb_accounts add column if not exists card jsonb;
create table if not exists cvb_paid(
  email text references cvb_accounts(email) on delete cascade, cv_id text not null, kind text not null, hash text not null,
  at timestamptz default now(), primary key(email,cv_id,kind,hash));
alter table cvb_paid enable row level security;
revoke all on cvb_paid from anon, authenticated;

create or replace function cvb_out(a cvb_accounts, t text) returns json language sql as $$
  select json_build_object('token',t,'email',a.email,'name',a.name,'until',a.plan_until,'picture',a.picture,'phone',a.phone,'created',a.created_at,'card',a.card,
    'lock',case when a.lock_name is null then null else json_build_object('base',a.lock_base,'name',a.lock_name,'email',a.lock_email,'phone',a.lock_phone,'label',a.lock_label,'at',a.lock_at) end) $$;

-- Records a paid download. Signed in: uses the session. Guest: finds or creates the account for the email given at checkout.
-- A session is only returned for a brand-new account, so nobody can open an existing account just by typing its email.
create or replace function cvb_purchase(p_token text, p_email text, p_name text, p_phone text, p_id text, p_doc jsonb,
  p_kind text, p_hash text, p_item text, p_amount text, p_currency text, p_card jsonb) returns json
language plpgsql security definer set search_path=public, extensions as $$
declare a cvb_accounts; e text; t text:=null; fresh boolean:=false; ref text; begin
  if p_token is not null and p_token<>'' then a:=cvb_auth(p_token); e:=a.email;
  else
    e:=lower(trim(coalesce(p_email,'')));
    if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid email.'; end if;
    select * into a from cvb_accounts where email=e;
    if a.email is null then
      insert into cvb_accounts(email,name,phone,pass) values(e,coalesce(p_name,''),nullif(p_phone,''),crypt(encode(gen_random_bytes(18),'hex'),gen_salt('bf'))) returning * into a; fresh:=true;
    end if;
  end if;
  update cvb_accounts set name=case when coalesce(name,'')='' then coalesce(p_name,'') else name end,
    phone=coalesce(nullif(phone,''),nullif(p_phone,'')), card=coalesce(p_card,card) where email=e returning * into a;
  if p_doc is not null and length(p_doc::text)<2000000 then
    insert into cvb_cvs(email,id,doc,tailored,updated_at) values(e,p_id,p_doc,(p_doc ? 'jdFor') and p_doc->>'jdFor' is not null and p_doc->>'jdFor'<>'null',now())
    on conflict(email,id) do update set doc=excluded.doc,updated_at=now();
  end if;
  insert into cvb_paid(email,cv_id,kind,hash) values(e,p_id,coalesce(p_kind,'cv'),p_hash) on conflict do nothing;
  ref:='INV-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(encode(gen_random_bytes(4),'hex'),1,6));
  insert into cvb_payments(id,email,kind,item,amount,currency,at) values(ref,e,coalesce(p_kind,'cv'),p_item,p_amount,p_currency,now());
  if fresh then t:=encode(gen_random_bytes(24),'hex'); insert into cvb_sessions(token,email) values(t,e); return cvb_out(a,t); end if;
  return json_build_object('ok',true,'email',e,'invoice',ref); end $$;

create or replace function cvb_paid_list(p_token text) returns json
language plpgsql security definer set search_path=public, extensions as $$
declare a cvb_accounts; begin a:=cvb_auth(p_token);
  return coalesce((select json_agg(json_build_object('cv_id',cv_id,'kind',kind,'hash',hash)) from cvb_paid where email=a.email),'[]'::json); end $$;

grant execute on function cvb_purchase(text,text,text,text,text,jsonb,text,text,text,text,text,jsonb), cvb_paid_list(text) to anon, authenticated;
