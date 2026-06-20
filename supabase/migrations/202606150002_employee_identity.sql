create or replace function public.current_operator_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(u.raw_user_meta_data ->> 'username', ''),
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    split_part(u.email, '@', 1),
    'Utilisateur'
  )
  from auth.users u
  where u.id = (select auth.uid())
$$;

create or replace function public.set_record_operator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  operator_name text := public.current_operator_name();
begin
  if tg_op = 'INSERT' then
    new.created_by := (select auth.uid());
    new.creator_name := operator_name;

    if tg_table_name in ('raw_material_openings', 'temperature_checks') then
      new.operator := operator_name;
    elsif tg_table_name in ('internal_batches', 'cleaning_tasks') then
      new.responsible := operator_name;
    elsif tg_table_name = 'cleaning_records' then
      new.signature := operator_name;
    end if;
  else
    new.created_by := old.created_by;
    new.creator_name := old.creator_name;

    if tg_table_name in ('raw_material_openings', 'temperature_checks') then
      new.operator := old.operator;
    elsif tg_table_name in ('internal_batches', 'cleaning_tasks') then
      new.responsible := old.responsible;
    elsif tg_table_name = 'cleaning_records' then
      new.signature := old.signature;
    end if;
  end if;

  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'raw_material_openings',
    'internal_batches',
    'temperature_checks',
    'cleaning_tasks',
    'cleaning_records'
  ]
  loop
    execute format('drop trigger if exists set_record_operator on public.%I', table_name);
    execute format(
      'create trigger set_record_operator before insert or update on public.%I for each row execute function public.set_record_operator()',
      table_name
    );
  end loop;
end;
$$;
