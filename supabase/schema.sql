-- Run once in the Supabase SQL editor. No service-role key is used in the app.
begin;
create table if not exists public.wellness_records (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null default '{"workouts":[],"meals":[],"body":[],"goal":""}'::jsonb,
 revision bigint not null default 1,
 updated_at timestamptz not null default now(),
 constraint payload_is_object check (jsonb_typeof(payload)='object'),
 constraint payload_has_records check (
   jsonb_typeof(payload->'workouts')='array' and
   jsonb_typeof(payload->'meals')='array' and
   jsonb_typeof(payload->'body')='array' and
   jsonb_typeof(payload->'goal')='string' and
   payload ?& array['workouts','meals','body','goal']
 )
);
alter table public.wellness_records add column if not exists revision bigint not null default 1;
alter table public.wellness_records enable row level security;
revoke all on public.wellness_records from anon;
grant select, insert, update, delete on public.wellness_records to authenticated;
drop policy if exists own_records_select on public.wellness_records;
create policy own_records_select on public.wellness_records for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists own_records_insert on public.wellness_records;
create policy own_records_insert on public.wellness_records for insert to authenticated with check ((select auth.uid())=user_id);
drop policy if exists own_records_update on public.wellness_records;
create policy own_records_update on public.wellness_records for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists own_records_delete on public.wellness_records;
create policy own_records_delete on public.wellness_records for delete to authenticated using ((select auth.uid())=user_id);
-- Optimistic revision check avoids silently overwriting changes from another device.
create or replace function public.save_wellness_records(new_payload jsonb, expected_revision bigint)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare next_revision bigint;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if expected_revision=0 then
  insert into public.wellness_records(user_id,payload,revision)
  values(auth.uid(),new_payload,1)
  on conflict(user_id) do nothing returning revision into next_revision;
 else
  update public.wellness_records set payload=new_payload,revision=revision+1,updated_at=now()
  where user_id=auth.uid() and revision=expected_revision returning revision into next_revision;
 end if;
 if next_revision is null then raise exception 'Record changed on another device' using errcode='40001'; end if;
 return next_revision;
end;
$$;
revoke all on function public.save_wellness_records(jsonb,bigint) from public,anon;
grant execute on function public.save_wellness_records(jsonb,bigint) to authenticated;
commit;
