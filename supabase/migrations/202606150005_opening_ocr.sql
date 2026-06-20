alter table public.raw_material_openings
  add column if not exists brand text,
  add column if not exists missing_lot_justification text,
  add column if not exists date_type text not null default 'Non précisé',
  add column if not exists missing_expiry_justification text,
  add column if not exists storage_temperature text,
  add column if not exists after_opening_storage text,
  add column if not exists allergens text[] not null default '{}',
  add column if not exists ingredients text,
  add column if not exists packaging text,
  add column if not exists barcode text,
  add column if not exists traceability_notes text,
  add column if not exists validation_status text not null default 'Validé',
  add column if not exists ocr_confidence integer,
  add column if not exists ocr_field_confidences jsonb not null default '{}',
  add column if not exists ocr_uncertain_fields text[] not null default '{}';

update public.raw_material_openings
set missing_lot_justification = coalesce(
  nullif(missing_lot_justification, ''),
  case
    when producer_name is not null and btrim(producer_name) <> ''
      then 'Produit local sans lot fournisseur - ' || producer_name
    else 'Enregistrement antérieur à la saisie des justifications'
  end
)
where supplier_lot is null or btrim(supplier_lot) = '';

update public.raw_material_openings
set missing_expiry_justification = coalesce(
  nullif(missing_expiry_justification, ''),
  'Enregistrement antérieur à la saisie des justifications'
)
where supplier_expiry is null;

alter table public.raw_material_openings
  drop constraint if exists raw_material_openings_date_type_check,
  add constraint raw_material_openings_date_type_check
    check (date_type in ('DLC', 'DDM', 'Non précisé')),
  drop constraint if exists raw_material_openings_validation_status_check,
  add constraint raw_material_openings_validation_status_check
    check (validation_status in ('Validé', 'À vérifier')),
  drop constraint if exists raw_material_openings_missing_lot_check,
  add constraint raw_material_openings_missing_lot_check
    check (
      (supplier_lot is not null and btrim(supplier_lot) <> '')
      or (missing_lot_justification is not null and btrim(missing_lot_justification) <> '')
    ),
  drop constraint if exists raw_material_openings_missing_expiry_check,
  add constraint raw_material_openings_missing_expiry_check
    check (
      supplier_expiry is not null
      or (missing_expiry_justification is not null and btrim(missing_expiry_justification) <> '')
    );

create index if not exists raw_material_openings_barcode_idx
  on public.raw_material_openings(bakery_id, barcode)
  where barcode is not null;
