create or replace function public.audit_hygiene_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor text := coalesce(nullif(public.current_operator_name(), ''), 'Migration système');
begin
  new.updated_at := now();
  if to_jsonb(new) ? 'updated_by_name' then
    new.updated_by_name := actor;
  end if;
  insert into public.record_history(bakery_id, table_name, record_id, action, changed_by_name, previous_data, new_data)
  values (
    new.bakery_id,
    tg_table_name,
    new.id,
    case when tg_op = 'INSERT' then 'Création' else 'Modification' end,
    actor,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'raw_material_openings', 'internal_batches', 'temperature_checks',
    'cleaning_tasks', 'cleaning_records', 'delivery_checks',
    'non_conformities', 'shelf_life_rules', 'procedure_documents'
  ]
  loop
    execute format('drop trigger if exists audit_hygiene_change on public.%I', table_name);
    execute format('drop trigger if exists zz_audit_hygiene_change on public.%I', table_name);
    execute format(
      'create trigger zz_audit_hygiene_change before insert or update on public.%I for each row execute function public.audit_hygiene_change()',
      table_name
    );
  end loop;
end;
$$;

insert into public.shelf_life_rules (
  bakery_id, family, name, conservation, duration_value, duration_unit,
  duration_days, storage_temperature, sensitive, allergens, status
)
select b.id, seed.family, seed.name, seed.conservation, seed.duration_value, seed.duration_unit,
  case when seed.duration_unit = 'Jours' then seed.duration_value else null end,
  seed.conservation, seed.sensitive, seed.allergens, 'Active'
from public.bakeries b
cross join (values
  ('Pâtisserie','Crème pâtissière','Froid positif',2,'Jours',true,'Lait, œufs'),
  ('Pâtisserie','Chantilly','Froid positif',2,'Jours',true,'Lait'),
  ('Pâtisserie','Ganache','Froid positif',3,'Jours',true,'Lait'),
  ('Pâtisserie','Mousse','Froid positif',2,'Jours',true,'Lait, œufs'),
  ('Pâtisserie','Entremets','Froid positif',3,'Jours',true,'Selon recette'),
  ('Pâtisserie','Tarte aux fruits','Froid positif',2,'Jours',true,'Gluten, lait'),
  ('Pâtisserie','Éclair / pâte à choux garnie','Froid positif',2,'Jours',true,'Gluten, lait, œufs'),
  ('Snacking','Quiche','Froid positif',2,'Jours',true,'Gluten, lait, œufs'),
  ('Snacking','Sandwich','Froid positif',1,'Jours',true,'Selon recette'),
  ('Divers','Produit décongelé','Froid positif',1,'Jours',true,'Selon produit'),
  ('Confiture','Confiture','Ambiant',12,'Mois',false,null),
  ('Divers','Biscuit sec','Ambiant',3,'Mois',false,'Gluten, œufs'),
  ('Pièce montée','Pièce montée','Froid positif',1,'Jours',true,'Selon recette')
) as seed(family,name,conservation,duration_value,duration_unit,sensitive,allergens)
where not exists (
  select 1 from public.shelf_life_rules r where r.bakery_id = b.id and lower(r.name) = lower(seed.name)
);
