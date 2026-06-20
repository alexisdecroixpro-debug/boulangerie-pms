create table if not exists public.cleaning_plan_tasks (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete restrict,
  name text not null,
  zone text not null,
  material_surface text not null,
  action_type text not null,
  frequency text not null check (frequency in ('Quotidien', 'Hebdomadaire', 'Mensuel', 'Ponctuel', 'Trimestriel')),
  suggested_day text,
  scheduled_date date,
  product text not null,
  method text not null,
  default_responsible text,
  photo_required boolean not null default false,
  active boolean not null default true,
  status text not null default 'Active',
  comments text,
  attachments text[] not null default '{}',
  creator_name text not null default 'Utilisateur',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by_name text,
  archived_at timestamptz
);
create index if not exists cleaning_plan_tasks_bakery_active_idx on public.cleaning_plan_tasks(bakery_id, active, status, frequency);

alter table public.cleaning_tasks
  drop constraint if exists cleaning_tasks_frequency_check,
  add constraint cleaning_tasks_frequency_check check (frequency in ('Quotidien', 'Hebdomadaire', 'Mensuel', 'Ponctuel', 'Trimestriel')),
  add column if not exists plan_task_id uuid references public.cleaning_plan_tasks(id) on delete restrict,
  add column if not exists material_surface text,
  add column if not exists action_type text,
  add column if not exists due_period_start date,
  add column if not exists due_period_end date,
  add column if not exists photo_required boolean not null default false;

create index if not exists cleaning_tasks_plan_period_idx on public.cleaning_tasks(bakery_id, plan_task_id, due_period_start, due_period_end);

alter table public.cleaning_plan_tasks enable row level security;
drop policy if exists cleaning_plan_tasks_select on public.cleaning_plan_tasks;
drop policy if exists cleaning_plan_tasks_insert on public.cleaning_plan_tasks;
drop policy if exists cleaning_plan_tasks_update on public.cleaning_plan_tasks;
create policy cleaning_plan_tasks_select on public.cleaning_plan_tasks for select to authenticated using ((select public.is_bakery_member(bakery_id)));
create policy cleaning_plan_tasks_insert on public.cleaning_plan_tasks for insert to authenticated with check ((select public.is_bakery_member(bakery_id)));
create policy cleaning_plan_tasks_update on public.cleaning_plan_tasks for update to authenticated using ((select public.is_bakery_member(bakery_id))) with check ((select public.is_bakery_member(bakery_id)));

drop trigger if exists cleaning_plan_tasks_updated_at on public.cleaning_plan_tasks;
drop trigger if exists cleaning_plan_tasks_prevent_delete on public.cleaning_plan_tasks;
drop trigger if exists zz_audit_hygiene_change on public.cleaning_plan_tasks;
create trigger cleaning_plan_tasks_updated_at before update on public.cleaning_plan_tasks for each row execute function public.set_updated_at();
create trigger cleaning_plan_tasks_prevent_delete before delete on public.cleaning_plan_tasks for each row execute function public.prevent_hygiene_delete();
create trigger zz_audit_hygiene_change before insert or update on public.cleaning_plan_tasks for each row execute function public.audit_hygiene_change();

do $$
declare table_name text;
begin
  foreach table_name in array array['cleaning_plan_tasks', 'cleaning_tasks', 'cleaning_records']
  loop
    execute format('drop trigger if exists zz_audit_hygiene_change on public.%I', table_name);
    execute format('create trigger zz_audit_hygiene_change before insert or update on public.%I for each row execute function public.audit_hygiene_change()', table_name);
  end loop;
end;
$$;

insert into public.cleaning_plan_tasks (
  bakery_id, name, zone, material_surface, action_type, frequency,
  suggested_day, product, method, photo_required, active, status
)
select b.id, seed.name, seed.zone, seed.material_surface, seed.action_type, seed.frequency,
  seed.suggested_day, seed.product, seed.method, seed.photo_required, true, 'Active'
from public.bakeries b
cross join (values
  ('Nettoyage-désinfection plan de travail','Fournil','Plan de travail','Nettoyage-désinfection','Quotidien',null,'Désinfectant alimentaire','Nettoyer, rincer, désinfecter, laisser agir puis essuyer.',false),
  ('Nettoyage-désinfection pétrin/batteur','Fournil','Pétrin / batteur','Nettoyage-désinfection','Quotidien',null,'Détergent désinfectant','Retirer les résidus, brosser, rincer puis désinfecter.',false),
  ('Nettoyage-désinfection façonneuse','Fournil','Façonneuse','Nettoyage-désinfection','Quotidien',null,'Détergent désinfectant','Nettoyer les surfaces en contact, rincer puis désinfecter.',false),
  ('Nettoyage-désinfection balancelle','Fournil','Balancelle','Nettoyage-désinfection','Quotidien',null,'Détergent désinfectant','Dépoussiérer, nettoyer les supports puis désinfecter.',false),
  ('Nettoyage-désinfection façade chambre de fermentation','Fournil','Façade chambre de fermentation','Nettoyage-désinfection','Quotidien',null,'Désinfectant alimentaire','Nettoyer la façade et les poignées puis désinfecter.',false),
  ('Nettoyage-désinfection intérieur chambre de fermentation','Fournil','Intérieur chambre de fermentation','Nettoyage-désinfection','Mensuel','1','Détergent désinfectant','Vider, nettoyer les parois, rincer puis désinfecter.',true),
  ('Nettoyage-désinfection étagères','Fournil','Étagères','Nettoyage-désinfection','Hebdomadaire','Lundi','Désinfectant alimentaire','Retirer les produits, nettoyer les étagères puis désinfecter.',false),
  ('Nettoyage-désinfection façade four à sole','Fournil','Façade four à sole','Nettoyage-désinfection','Quotidien',null,'Dégraissant alimentaire','Nettoyer la façade froide puis essuyer.',false),
  ('Nettoyage-désinfection intérieur four ventilé','Fournil','Intérieur four ventilé','Nettoyage-désinfection','Hebdomadaire','Lundi','Dégraissant four','Nettoyer four froid selon notice produit puis rincer.',true),
  ('Aspiration des sols','Fournil','Sols','Aspiration','Quotidien',null,'Aspirateur','Aspirer les farines et résidus en fin de poste.',false),
  ('Nettoyage-désinfection des sols','Fournil','Sols','Nettoyage-désinfection','Hebdomadaire','Lundi','Détergent désinfectant sols','Laver les sols puis respecter le temps de contact.',false),
  ('Nettoyage-désinfection poignées, prises et interrupteurs','Fournil','Points de contact','Nettoyage-désinfection','Quotidien',null,'Désinfectant alimentaire','Nettoyer les points de contact puis désinfecter.',false)
) as seed(name,zone,material_surface,action_type,frequency,suggested_day,product,method,photo_required)
where not exists (
  select 1 from public.cleaning_plan_tasks p where p.bakery_id = b.id and lower(p.name) = lower(seed.name)
);
