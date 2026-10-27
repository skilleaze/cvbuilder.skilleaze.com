-- Skilleaze CV Builder · one plan, one person. Run once in Supabase → SQL Editor.

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
