alter table public.raw_material_openings
  add column if not exists product_type text not null default 'Autre',
  add column if not exists sanitary_approval text,
  add column if not exists reception_temperature numeric(5,2),
  add column if not exists updated_by_name text;

alter table public.internal_batches
  add column if not exists thawed_at date,
  add column if not exists thawed_sale_by date,
  add column if not exists sensitive boolean not null default false,
  add column if not exists allergens text,
  add column if not exists destination text not null default 'Vente boutique',
  add column if not exists updated_by_name text;

alter table public.temperature_checks
  add column if not exists equipment_type text not null default 'Autre',
  add column if not exists product_impacted boolean not null default false,
  add column if not exists product_isolated boolean not null default false,
  add column if not exists manager_notified boolean not null default false,
  add column if not exists updated_by_name text;

alter table public.cleaning_tasks add column if not exists updated_by_name text;
alter table public.cleaning_records
  add column if not exists validation_comment text,
  add column if not exists updated_by_name text;

alter table public.delivery_checks
  alter column supplier_id drop not null,
  alter column product_id drop not null,
  add column if not exists supplier_name text not null default '',
  add column if not exists product_name text not null default '',
  add column if not exists category text not null default 'Autre',
  add column if not exists product_type text not null default 'Autre',
  add column if not exists quantity numeric(12,3) not null default 1,
  add column if not exists unit text not null default 'pièce',
  add column if not exists supplier_expiry date,
  add column if not exists temperature numeric(5,2),
  add column if not exists packaging_state text not null default 'Conforme',
  add column if not exists sanitary_stamp boolean not null default false,
  add column if not exists non_conformity_reason text,
  add column if not exists action_taken text not null default 'Accepté',
  add column if not exists controller text not null default 'Utilisateur',
  add column if not exists internal_lot text,
  add column if not exists updated_by_name text;
create index if not exists delivery_checks_bakery_internal_lot_idx on public.delivery_checks(bakery_id, internal_lot);

alter table public.non_conformities
  add column if not exists supplier text,
  add column if not exists product_isolated boolean not null default false,
  add column if not exists product_destroyed boolean not null default false,
  add column if not exists affected_quantity numeric(12,3),
  add column if not exists immediate_action text not null default '',
  add column if not exists closed_at timestamptz,
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists updated_by_name text;

alter table public.shelf_life_rules
  alter column duration_days drop not null,
  add column if not exists name text not null default 'Règle générale',
  add column if not exists conservation text not null default 'Froid positif',
  add column if not exists duration_value integer not null default 1,
  add column if not exists duration_unit text not null default 'Jours',
  add column if not exists after_production_rule text,
  add column if not exists after_freezing_rule text,
  add column if not exists sensitive boolean not null default false,
  add column if not exists updated_by_name text;

alter table public.procedure_documents
  add column if not exists category text not null default 'Bonnes pratiques d''hygiène',
  add column if not exists created_on date not null default current_date,
  add column if not exists updated_by_name text;

create table if not exists public.record_history (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete restrict,
  table_name text not null,
  record_id uuid not null,
  action text not null,
  changed_by uuid default auth.uid() references auth.users(id) on delete set null,
  changed_by_name text not null default 'Utilisateur',
  changed_at timestamptz not null default now(),
  previous_data jsonb,
  new_data jsonb
);
create index if not exists record_history_bakery_record_idx on public.record_history(bakery_id, table_name, record_id, changed_at desc);
alter table public.record_history enable row level security;
drop policy if exists record_history_select on public.record_history;
create policy record_history_select on public.record_history for select to authenticated
using ((select public.is_bakery_member(bakery_id)));

create or replace function public.audit_hygiene_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor text := public.current_operator_name();
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
    execute format(
      'create trigger audit_hygiene_change before insert or update on public.%I for each row execute function public.audit_hygiene_change()',
      table_name
    );
  end loop;
end;
$$;

grant select on public.record_history to authenticated;

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
