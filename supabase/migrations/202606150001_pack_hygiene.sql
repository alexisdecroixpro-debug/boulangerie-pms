create extension if not exists pgcrypto;

create table public.bakeries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  initials text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bakery_members (
  bakery_id uuid not null references public.bakeries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'manager', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (bakery_id, user_id)
);
create index bakery_members_user_id_idx on public.bakery_members(user_id);

create or replace function public.is_bakery_member(target_bakery_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.bakery_members
    where bakery_id = target_bakery_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_hygiene_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Les enregistrements PMS doivent être archivés et ne peuvent pas être supprimés.';
end;
$$;

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete cascade,
  name text not null,
  type text not null check (type in ('Froid positif', 'Froid négatif', 'Autre')),
  min_threshold numeric(6,2) not null,
  max_threshold numeric(6,2) not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bakery_id, name)
);
create index equipment_bakery_active_idx on public.equipment(bakery_id, active);

create table public.raw_material_openings (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete restrict,
  opened_at timestamptz not null,
  material_name text not null,
  category text not null,
  supplier text not null,
  supplier_lot text,
  no_supplier_lot boolean not null default false,
  producer_name text,
  received_at date,
  harvested_at date,
  supplier_expiry date,
  quantity numeric(12,3) not null check (quantity > 0),
  unit text not null,
  internal_expiry date not null,
  storage_zone text not null,
  internal_lot text not null,
  operator text not null,
  status text not null default 'Fait',
  comments text,
  attachments text[] not null default '{}',
  creator_name text not null default 'Utilisateur',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (bakery_id, internal_lot)
);
create index raw_material_openings_bakery_opened_idx on public.raw_material_openings(bakery_id, opened_at desc);
create index raw_material_openings_bakery_supplier_idx on public.raw_material_openings(bakery_id, supplier);
create index raw_material_openings_bakery_expiry_idx on public.raw_material_openings(bakery_id, internal_expiry) where archived_at is null;

create table public.internal_batches (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete restrict,
  manufactured_at timestamptz not null,
  family text not null,
  product_name text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit text not null,
  internal_lot text not null,
  raw_materials text not null,
  raw_material_lots text not null,
  planned_sale_date date,
  internal_expiry date not null,
  conservation text not null,
  frozen boolean not null default false,
  frozen_at date,
  frozen_use_by date,
  responsible text not null,
  status text not null default 'Fait',
  comments text,
  attachments text[] not null default '{}',
  creator_name text not null default 'Utilisateur',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (bakery_id, internal_lot)
);
create index internal_batches_bakery_manufactured_idx on public.internal_batches(bakery_id, manufactured_at desc);
create index internal_batches_bakery_product_idx on public.internal_batches(bakery_id, product_name);
create index internal_batches_bakery_expiry_idx on public.internal_batches(bakery_id, internal_expiry) where archived_at is null;

create table public.temperature_checks (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete restrict,
  checked_at timestamptz not null,
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  equipment_name text not null,
  temperature numeric(6,2) not null,
  min_threshold numeric(6,2) not null,
  max_threshold numeric(6,2) not null,
  compliant boolean not null,
  corrective_action text,
  operator text not null,
  status text not null,
  comments text,
  attachments text[] not null default '{}',
  creator_name text not null default 'Utilisateur',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index temperature_checks_bakery_checked_idx on public.temperature_checks(bakery_id, checked_at desc);
create index temperature_checks_bakery_compliant_idx on public.temperature_checks(bakery_id, compliant, checked_at desc);
create index temperature_checks_equipment_id_idx on public.temperature_checks(equipment_id);

create table public.cleaning_tasks (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete restrict,
  zone text not null,
  title text not null,
  frequency text not null check (frequency in ('Quotidien', 'Hebdomadaire', 'Mensuel', 'Trimestriel')),
  product text not null,
  method text not null,
  contact_time text not null,
  responsible text not null,
  planned_at timestamptz not null,
  status text not null default 'À faire',
  comments text,
  attachments text[] not null default '{}',
  creator_name text not null default 'Utilisateur',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index cleaning_tasks_bakery_status_planned_idx on public.cleaning_tasks(bakery_id, status, planned_at);

create table public.cleaning_records (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete restrict,
  task_id uuid not null references public.cleaning_tasks(id) on delete restrict,
  completed_at timestamptz not null,
  signature text not null,
  status text not null default 'Fait',
  comments text,
  attachments text[] not null default '{}',
  creator_name text not null default 'Utilisateur',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index cleaning_records_task_id_idx on public.cleaning_records(task_id);
create index cleaning_records_bakery_completed_idx on public.cleaning_records(bakery_id, completed_at desc);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete restrict,
  name text not null,
  contact text,
  status text not null default 'Fait',
  comments text,
  creator_name text not null default 'Utilisateur',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (bakery_id, name)
);

create table public.shelf_life_rules (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete restrict,
  family text not null,
  duration_days integer not null check (duration_days >= 0),
  storage_temperature text not null,
  after_opening_rule text,
  after_thawing_rule text,
  allergens text,
  status text not null default 'Fait',
  comments text,
  creator_name text not null default 'Utilisateur',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index shelf_life_rules_bakery_family_idx on public.shelf_life_rules(bakery_id, family);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete restrict,
  name text not null,
  family text not null,
  shelf_life_rule_id uuid references public.shelf_life_rules(id) on delete set null,
  status text not null default 'Fait',
  comments text,
  creator_name text not null default 'Utilisateur',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (bakery_id, name)
);
create index products_shelf_life_rule_id_idx on public.products(shelf_life_rule_id);

create table public.delivery_checks (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete restrict,
  received_at timestamptz not null,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  supplier_lot text,
  compliant boolean not null,
  status text not null,
  comments text,
  attachments text[] not null default '{}',
  creator_name text not null default 'Utilisateur',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index delivery_checks_supplier_id_idx on public.delivery_checks(supplier_id);
create index delivery_checks_product_id_idx on public.delivery_checks(product_id);
create index delivery_checks_bakery_received_idx on public.delivery_checks(bakery_id, received_at desc);

create table public.non_conformities (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete restrict,
  occurred_at timestamptz not null,
  type text not null,
  description text not null,
  product text,
  lot text,
  severity text not null check (severity in ('Faible', 'Moyenne', 'Élevée', 'Critique')),
  corrective_action text,
  owner text not null,
  status text not null,
  comments text,
  attachments text[] not null default '{}',
  creator_name text not null default 'Utilisateur',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index non_conformities_bakery_status_occurred_idx on public.non_conformities(bakery_id, status, occurred_at desc);
create index non_conformities_bakery_lot_idx on public.non_conformities(bakery_id, lot) where lot is not null;

create table public.procedure_documents (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete restrict,
  title text not null,
  version text not null,
  updated_on date not null,
  content text not null,
  approved_by text,
  document_status text not null check (document_status in ('Brouillon', 'Validé', 'Archivé')),
  status text not null default 'Fait',
  comments text,
  attachments text[] not null default '{}',
  creator_name text not null default 'Utilisateur',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index procedure_documents_bakery_status_idx on public.procedure_documents(bakery_id, document_status);

create table public.user_signatures (
  id uuid primary key default gen_random_uuid(),
  bakery_id uuid not null references public.bakeries(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  user_name text not null,
  initials text not null,
  status text not null default 'Fait',
  comments text,
  creator_name text not null default 'Utilisateur',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index user_signatures_bakery_user_id_idx on public.user_signatures(bakery_id, user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_bakery_id uuid;
  bakery_name text;
begin
  bakery_name := coalesce(nullif(new.raw_user_meta_data ->> 'bakery_name', ''), 'Mon atelier');
  insert into public.profiles(id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.bakeries(name) values (bakery_name) returning id into new_bakery_id;
  insert into public.bakery_members(bakery_id, user_id, role)
  values (new_bakery_id, new.id, 'owner');

  insert into public.equipment(bakery_id, name, type, min_threshold, max_threshold) values
    (new_bakery_id, 'Chambre froide positive', 'Froid positif', 0, 4),
    (new_bakery_id, 'Chambre froide négative', 'Froid négatif', -25, -18),
    (new_bakery_id, 'Congélateur', 'Froid négatif', -25, -18),
    (new_bakery_id, 'Tour pâtisserie', 'Froid positif', 0, 4),
    (new_bakery_id, 'Vitrine pâtisserie', 'Froid positif', 0, 4),
    (new_bakery_id, 'Vitrine snacking', 'Froid positif', 0, 4);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.bakeries enable row level security;
alter table public.profiles enable row level security;
alter table public.bakery_members enable row level security;

create policy bakeries_member_select on public.bakeries for select to authenticated
using ((select public.is_bakery_member(id)));
create policy profiles_self on public.profiles for all to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy bakery_members_member_select on public.bakery_members for select to authenticated
using ((select public.is_bakery_member(bakery_id)));

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'equipment', 'raw_material_openings', 'internal_batches', 'temperature_checks',
    'cleaning_tasks', 'cleaning_records', 'suppliers', 'products', 'delivery_checks',
    'non_conformities', 'shelf_life_rules', 'procedure_documents', 'user_signatures'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select public.is_bakery_member(bakery_id)))',
      table_name || '_select', table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select public.is_bakery_member(bakery_id)))',
      table_name || '_insert', table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select public.is_bakery_member(bakery_id))) with check ((select public.is_bakery_member(bakery_id)))',
      table_name || '_update', table_name
    );
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', table_name || '_updated_at', table_name);
    execute format('create trigger %I before delete on public.%I for each row execute function public.prevent_hygiene_delete()', table_name || '_prevent_delete', table_name);
  end loop;
end $$;

insert into storage.buckets(id, name, public)
values ('hygiene-attachments', 'hygiene-attachments', false)
on conflict (id) do nothing;

create policy hygiene_attachments_select on storage.objects for select to authenticated
using (
  bucket_id = 'hygiene-attachments'
  and (select public.is_bakery_member((storage.foldername(name))[1]::uuid))
);
create policy hygiene_attachments_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'hygiene-attachments'
  and (select public.is_bakery_member((storage.foldername(name))[1]::uuid))
);
create policy hygiene_attachments_update on storage.objects for update to authenticated
using (
  bucket_id = 'hygiene-attachments'
  and (select public.is_bakery_member((storage.foldername(name))[1]::uuid))
);

grant usage on schema public to authenticated;
grant select, insert, update on all tables in schema public to authenticated;
revoke delete on all tables in schema public from authenticated;
