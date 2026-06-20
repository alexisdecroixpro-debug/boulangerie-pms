import type { AuditFields, HygieneData } from "../domain/types";
import { seedData } from "./seed";
import { supabase } from "../lib/supabase";

type Row = Record<string, unknown>;
export type HygieneChanges = Pick<HygieneData,
  "openings" | "batches" | "temperatureChecks" | "cleaningPlanTasks" | "cleaningTasks" | "cleaningRecords" |
  "deliveryChecks" | "nonConformities" | "shelfLifeRules" | "procedures"
>;

const clean = (value: unknown) => value === "" ? null : value;
const auditToRow = (item: AuditFields, bakeryId: string) => ({
  id: item.id, bakery_id: bakeryId, created_at: item.createdAt, updated_at: item.updatedAt,
  creator_name: item.createdBy, updated_by_name: clean(item.updatedBy), status: item.status,
  comments: clean(item.comments), attachments: item.attachments ?? [], archived_at: clean(item.archivedAt),
});

export async function getCurrentBakeryId() {
  if (!supabase) throw new Error("Supabase non configuré");
  const { data, error } = await supabase.from("bakery_members").select("bakery_id").limit(1).single();
  if (error) throw error;
  return data.bakery_id as string;
}

export async function loadHygieneData(): Promise<HygieneData> {
  if (!supabase) throw new Error("Supabase non configuré");
  const client = supabase;
  const tables = [
    "equipment", "raw_material_openings", "internal_batches", "temperature_checks",
    "cleaning_tasks", "cleaning_records", "delivery_checks", "non_conformities",
    "shelf_life_rules", "procedure_documents",
  ] as const;
  const [results, cleaningPlanResult] = await Promise.all([
    Promise.all(tables.map((table) => client.from(table).select("*").order("created_at", { ascending: false }))),
    client.from("cleaning_plan_tasks").select("*").order("created_at", { ascending: false }),
  ]);
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
  if (cleaningPlanResult.error && !isMissingSchemaError(cleaningPlanResult.error)) throw cleaningPlanResult.error;
  const [equipment, openings, batches, temperatures, cleaningTasks, cleaningRecords, deliveries, nonConformities, shelfLifeRules, procedures] =
    results.map((result) => (result.data ?? []) as Row[]);
  const cleaningPlanTasks = cleaningPlanResult.error ? [] : (cleaningPlanResult.data ?? []) as Row[];

  return {
    equipment: equipment.map((row) => ({
      id: String(row.id), name: String(row.name), type: row.type as HygieneData["equipment"][number]["type"],
      minThreshold: Number(row.min_threshold), maxThreshold: Number(row.max_threshold),
    })),
    openings: openings.map((row) => ({
      ...fromAudit(row), openedAt: fromDbDateTime(row.opened_at), materialName: String(row.material_name),
      brand: optional(row.brand),
      category: String(row.category), productType: String(row.product_type ?? "Autre") as HygieneData["openings"][number]["productType"],
      supplier: String(row.supplier), supplierLot: optional(row.supplier_lot), noSupplierLot: Boolean(row.no_supplier_lot),
      missingLotJustification: optional(row.missing_lot_justification),
      producerName: optional(row.producer_name), receivedAt: optional(row.received_at), harvestedAt: optional(row.harvested_at),
      supplierExpiry: optional(row.supplier_expiry),
      dateType: String(row.date_type ?? "Non précisé") as HygieneData["openings"][number]["dateType"],
      missingExpiryJustification: optional(row.missing_expiry_justification),
      sanitaryApproval: optional(row.sanitary_approval),
      receptionTemperature: optionalNumber(row.reception_temperature), quantity: Number(row.quantity), unit: String(row.unit),
      storageTemperature: optional(row.storage_temperature), afterOpeningStorage: optional(row.after_opening_storage),
      allergens: (row.allergens as string[]) ?? [], ingredients: optional(row.ingredients),
      packaging: optional(row.packaging), barcode: optional(row.barcode),
      traceabilityNotes: optional(row.traceability_notes),
      internalExpiry: String(row.internal_expiry), storageZone: String(row.storage_zone),
      internalLot: String(row.internal_lot), operator: String(row.operator),
      validationStatus: String(row.validation_status ?? "Validé") as HygieneData["openings"][number]["validationStatus"],
      ocrConfidence: optionalNumber(row.ocr_confidence),
      ocrFieldConfidences: (row.ocr_field_confidences as Record<string, number>) ?? {},
      ocrUncertainFields: (row.ocr_uncertain_fields as string[]) ?? [],
    })),
    batches: batches.map((row) => ({
      ...fromAudit(row), manufacturedAt: fromDbDateTime(row.manufactured_at), family: String(row.family),
      productName: String(row.product_name), quantity: Number(row.quantity), unit: String(row.unit),
      internalLot: String(row.internal_lot), rawMaterials: String(row.raw_materials), rawMaterialLots: String(row.raw_material_lots),
      plannedSaleDate: optional(row.planned_sale_date), internalExpiry: String(row.internal_expiry),
      conservation: String(row.conservation), frozen: Boolean(row.frozen), frozenAt: optional(row.frozen_at),
      frozenUseBy: optional(row.frozen_use_by), thawedAt: optional(row.thawed_at), thawedSaleBy: optional(row.thawed_sale_by),
      sensitive: Boolean(row.sensitive), allergens: optional(row.allergens),
      destination: String(row.destination ?? "Vente boutique"), responsible: String(row.responsible),
    })),
    temperatureChecks: temperatures.map((row) => ({
      ...fromAudit(row), checkedAt: fromDbDateTime(row.checked_at), equipmentId: String(row.equipment_id),
      equipmentName: String(row.equipment_name), equipmentType: String(row.equipment_type ?? "Autre"),
      temperature: Number(row.temperature), minThreshold: Number(row.min_threshold), maxThreshold: Number(row.max_threshold),
      compliant: Boolean(row.compliant), correctiveAction: optional(row.corrective_action),
      productImpacted: Boolean(row.product_impacted), productIsolated: Boolean(row.product_isolated),
      managerNotified: Boolean(row.manager_notified), operator: String(row.operator),
    })),
    cleaningPlanTasks: cleaningPlanResult.error ? seedData.cleaningPlanTasks : cleaningPlanTasks.map((row) => ({
      ...fromAudit(row), name: String(row.name), zone: String(row.zone),
      materialSurface: String(row.material_surface),
      actionType: String(row.action_type) as HygieneData["cleaningPlanTasks"][number]["actionType"],
      frequency: row.frequency as HygieneData["cleaningPlanTasks"][number]["frequency"],
      suggestedDay: optional(row.suggested_day), scheduledDate: optional(row.scheduled_date),
      product: String(row.product), method: String(row.method),
      defaultResponsible: optional(row.default_responsible), photoRequired: Boolean(row.photo_required),
      active: Boolean(row.active),
    })),
    cleaningTasks: cleaningTasks.map((row) => ({
      ...fromAudit(row), planTaskId: optional(row.plan_task_id), zone: String(row.zone), title: String(row.title),
      materialSurface: optional(row.material_surface),
      actionType: optional(row.action_type) as HygieneData["cleaningTasks"][number]["actionType"],
      frequency: row.frequency as HygieneData["cleaningTasks"][number]["frequency"],
      product: String(row.product), method: String(row.method), contactTime: String(row.contact_time),
      responsible: String(row.responsible), plannedAt: fromDbDateTime(row.planned_at),
      duePeriodStart: optional(row.due_period_start), duePeriodEnd: optional(row.due_period_end),
      photoRequired: Boolean(row.photo_required),
    })),
    cleaningRecords: cleaningRecords.map((row) => ({
      ...fromAudit(row), taskId: String(row.task_id), completedAt: fromDbDateTime(row.completed_at),
      signature: String(row.signature), validationComment: optional(row.validation_comment),
    })),
    deliveryChecks: deliveries.map((row) => ({
      ...fromAudit(row), receivedAt: fromDbDateTime(row.received_at), supplier: String(row.supplier_name),
      product: String(row.product_name), category: String(row.category),
      productType: String(row.product_type) as HygieneData["deliveryChecks"][number]["productType"],
      quantity: Number(row.quantity), unit: String(row.unit), supplierLot: optional(row.supplier_lot),
      supplierExpiry: optional(row.supplier_expiry), temperature: optionalNumber(row.temperature),
      packagingState: String(row.packaging_state), sanitaryStamp: Boolean(row.sanitary_stamp),
      compliant: Boolean(row.compliant), nonConformityReason: optional(row.non_conformity_reason),
      actionTaken: String(row.action_taken), controller: String(row.controller), internalLot: String(row.internal_lot),
    })),
    nonConformities: nonConformities.map((row) => ({
      ...fromAudit(row), occurredAt: fromDbDateTime(row.occurred_at), type: String(row.type),
      description: String(row.description), product: optional(row.product), lot: optional(row.lot),
      supplier: optional(row.supplier), severity: row.severity as HygieneData["nonConformities"][number]["severity"],
      productIsolated: Boolean(row.product_isolated), productDestroyed: Boolean(row.product_destroyed),
      affectedQuantity: optionalNumber(row.affected_quantity), immediateAction: String(row.immediate_action),
      correctiveAction: optional(row.corrective_action), owner: String(row.owner),
      closedAt: optional(row.closed_at), sourceType: row.source_type as HygieneData["nonConformities"][number]["sourceType"],
      sourceId: optional(row.source_id),
    })),
    shelfLifeRules: shelfLifeRules.map((row) => ({
      ...fromAudit(row), family: String(row.family), name: String(row.name),
      conservation: String(row.conservation), durationValue: Number(row.duration_value),
      durationUnit: row.duration_unit as HygieneData["shelfLifeRules"][number]["durationUnit"],
      afterOpeningRule: optional(row.after_opening_rule), afterProductionRule: optional(row.after_production_rule),
      afterFreezingRule: optional(row.after_freezing_rule), afterThawingRule: optional(row.after_thawing_rule),
      sensitive: Boolean(row.sensitive), allergens: optional(row.allergens),
    })),
    procedures: procedures.map((row) => ({
      ...fromAudit(row), title: String(row.title), category: String(row.category), version: String(row.version),
      createdOn: String(row.created_on), updatedOn: String(row.updated_on), content: String(row.content),
      approvedBy: optional(row.approved_by), documentStatus: row.document_status as HygieneData["procedures"][number]["documentStatus"],
    })),
    suppliers: [], products: [], signatures: [],
  };
}

export async function syncHygieneChanges(data: HygieneChanges, bakeryId: string) {
  if (!supabase) return;
  const operations = [
    () => upsert("raw_material_openings", data.openings.map((item) => ({
      ...auditToRow(item, bakeryId), opened_at: toDbDateTime(item.openedAt), material_name: item.materialName,
      brand: clean(item.brand), category: item.category, product_type: item.productType, supplier: item.supplier,
      supplier_lot: clean(item.supplierLot), no_supplier_lot: item.noSupplierLot, producer_name: clean(item.producerName),
      missing_lot_justification: clean(item.missingLotJustification),
      received_at: clean(item.receivedAt), harvested_at: clean(item.harvestedAt), supplier_expiry: clean(item.supplierExpiry),
      date_type: item.dateType ?? "Non précisé", missing_expiry_justification: clean(item.missingExpiryJustification),
      sanitary_approval: clean(item.sanitaryApproval), reception_temperature: clean(item.receptionTemperature),
      storage_temperature: clean(item.storageTemperature), after_opening_storage: clean(item.afterOpeningStorage),
      allergens: item.allergens ?? [], ingredients: clean(item.ingredients), packaging: clean(item.packaging),
      barcode: clean(item.barcode), traceability_notes: clean(item.traceabilityNotes),
      quantity: item.quantity, unit: item.unit, internal_expiry: item.internalExpiry, storage_zone: item.storageZone,
      internal_lot: item.internalLot, operator: item.operator,
      validation_status: item.validationStatus ?? "Validé", ocr_confidence: clean(item.ocrConfidence),
      ocr_field_confidences: item.ocrFieldConfidences ?? {}, ocr_uncertain_fields: item.ocrUncertainFields ?? [],
    }))),
    () => upsertInternalBatches(data.batches, bakeryId),
    () => upsert("temperature_checks", data.temperatureChecks.map((item) => ({
      ...auditToRow(item, bakeryId), checked_at: toDbDateTime(item.checkedAt), equipment_id: item.equipmentId,
      equipment_name: item.equipmentName, equipment_type: item.equipmentType, temperature: item.temperature,
      min_threshold: item.minThreshold, max_threshold: item.maxThreshold, compliant: item.compliant,
      corrective_action: clean(item.correctiveAction), product_impacted: item.productImpacted,
      product_isolated: item.productIsolated, manager_notified: item.managerNotified, operator: item.operator,
    }))),
    () => optionalUpsert("cleaning_plan_tasks", data.cleaningPlanTasks.map((item) => ({
      ...auditToRow(item, bakeryId), name: item.name, zone: item.zone,
      material_surface: item.materialSurface, action_type: item.actionType, frequency: item.frequency,
      suggested_day: clean(item.suggestedDay), scheduled_date: clean(item.scheduledDate),
      product: item.product, method: item.method, default_responsible: clean(item.defaultResponsible),
      photo_required: item.photoRequired, active: item.active,
    }))),
    () => upsertCleaningTasks(data.cleaningTasks, bakeryId),
    () => upsert("cleaning_records", data.cleaningRecords.map((item) => ({
      ...auditToRow(item, bakeryId), task_id: item.taskId, completed_at: toDbDateTime(item.completedAt),
      signature: item.signature, validation_comment: clean(item.validationComment),
    }))),
    () => upsert("delivery_checks", data.deliveryChecks.map((item) => ({
      ...auditToRow(item, bakeryId), received_at: toDbDateTime(item.receivedAt), supplier_name: item.supplier,
      product_name: item.product, category: item.category, product_type: item.productType, quantity: item.quantity,
      unit: item.unit, supplier_lot: clean(item.supplierLot), supplier_expiry: clean(item.supplierExpiry),
      temperature: clean(item.temperature), packaging_state: item.packagingState, sanitary_stamp: item.sanitaryStamp,
      compliant: item.compliant, non_conformity_reason: clean(item.nonConformityReason),
      action_taken: item.actionTaken, controller: item.controller, internal_lot: item.internalLot,
    }))),
    () => upsert("non_conformities", data.nonConformities.map((item) => ({
      ...auditToRow(item, bakeryId), occurred_at: toDbDateTime(item.occurredAt), type: item.type,
      description: item.description, product: clean(item.product), lot: clean(item.lot), supplier: clean(item.supplier),
      severity: item.severity, product_isolated: item.productIsolated, product_destroyed: item.productDestroyed,
      affected_quantity: clean(item.affectedQuantity), immediate_action: item.immediateAction,
      corrective_action: clean(item.correctiveAction), owner: item.owner, closed_at: clean(item.closedAt),
      source_type: clean(item.sourceType), source_id: clean(item.sourceId),
    }))),
    () => upsert("shelf_life_rules", data.shelfLifeRules.map((item) => ({
      ...auditToRowWithoutAttachments(item, bakeryId), family: item.family, name: item.name, conservation: item.conservation,
      duration_value: item.durationValue, duration_unit: item.durationUnit,
      duration_days: item.durationUnit === "Jours" ? item.durationValue : null,
      storage_temperature: item.conservation, after_opening_rule: clean(item.afterOpeningRule),
      after_production_rule: clean(item.afterProductionRule), after_freezing_rule: clean(item.afterFreezingRule),
      after_thawing_rule: clean(item.afterThawingRule), sensitive: item.sensitive, allergens: clean(item.allergens),
    }))),
    () => upsert("procedure_documents", data.procedures.map((item) => ({
      ...auditToRow(item, bakeryId), title: item.title, category: item.category, version: item.version,
      created_on: item.createdOn, updated_on: item.updatedOn, content: item.content,
      approved_by: clean(item.approvedBy), document_status: item.documentStatus,
    }))),
  ];
  for (const operation of operations) {
    const result = await operation();
    if (result.error) throw result.error;
  }
}

export function getHygieneChanges(current: HygieneData, next: HygieneData): HygieneChanges {
  return {
    openings: changedRows(current.openings, next.openings), batches: changedRows(current.batches, next.batches),
    temperatureChecks: changedRows(current.temperatureChecks, next.temperatureChecks),
    cleaningPlanTasks: changedRows(current.cleaningPlanTasks, next.cleaningPlanTasks),
    cleaningTasks: changedRows(current.cleaningTasks, next.cleaningTasks),
    cleaningRecords: changedRows(current.cleaningRecords, next.cleaningRecords),
    deliveryChecks: changedRows(current.deliveryChecks, next.deliveryChecks),
    nonConformities: changedRows(current.nonConformities, next.nonConformities),
    shelfLifeRules: changedRows(current.shelfLifeRules, next.shelfLifeRules),
    procedures: changedRows(current.procedures, next.procedures),
  };
}

export const hasHygieneChanges = (changes: HygieneChanges) => Object.values(changes).some((rows) => rows.length > 0);

function upsert(table: string, rows: Row[]) {
  if (!rows.length) return Promise.resolve({ error: null });
  return supabase!.from(table).upsert(rows, { onConflict: "id" });
}
function auditToRowWithoutAttachments(item: AuditFields, bakeryId: string) {
  const row: Row = { ...auditToRow(item, bakeryId) };
  delete row.attachments;
  return row;
}
async function optionalUpsert(table: string, rows: Row[]) {
  if (!rows.length) return { error: null };
  const result = await upsert(table, rows);
  return result.error && isMissingSchemaError(result.error) ? { error: null } : result;
}
async function upsertInternalBatches(items: HygieneChanges["batches"], bakeryId: string) {
  if (!items.length) return { error: null };
  for (const item of items) {
    const result = await upsert("internal_batches", [toInternalBatchRow(item, bakeryId)]);
    if (!result.error) continue;
    if (!isUniqueConflict(result.error)) return result;
    const uniqueLot = `${item.internalLot}-${item.id.slice(0, 6).toUpperCase()}`;
    const retry = await upsert("internal_batches", [toInternalBatchRow({ ...item, internalLot: uniqueLot }, bakeryId)]);
    if (retry.error) return retry;
  }
  return { error: null };
}
async function upsertCleaningTasks(items: HygieneChanges["cleaningTasks"], bakeryId: string) {
  if (!items.length) return { error: null };
  const rows = items.map((item) => ({
    ...auditToRow(item, bakeryId), plan_task_id: clean(item.planTaskId), zone: item.zone, title: item.title,
    material_surface: clean(item.materialSurface), action_type: clean(item.actionType), frequency: item.frequency,
    product: item.product, method: item.method, contact_time: item.contactTime,
    responsible: item.responsible, planned_at: toDbDateTime(item.plannedAt),
    due_period_start: clean(item.duePeriodStart), due_period_end: clean(item.duePeriodEnd),
    photo_required: Boolean(item.photoRequired),
  }));
  const result = await upsert("cleaning_tasks", rows);
  if (!result.error || !isMissingSchemaError(result.error)) return result;
  return upsert("cleaning_tasks", items.map((item) => ({
    ...auditToRow(item, bakeryId), zone: item.zone, title: item.title, frequency: item.frequency,
    product: item.product, method: item.method, contact_time: item.contactTime,
    responsible: item.responsible, planned_at: toDbDateTime(item.plannedAt),
  })));
}
function toInternalBatchRow(item: HygieneChanges["batches"][number], bakeryId: string) {
  return {
    ...auditToRow(item, bakeryId), manufactured_at: toDbDateTime(item.manufacturedAt), family: item.family,
    product_name: item.productName, quantity: item.quantity, unit: item.unit, internal_lot: item.internalLot,
    raw_materials: item.rawMaterials, raw_material_lots: item.rawMaterialLots,
    planned_sale_date: clean(item.plannedSaleDate), internal_expiry: item.internalExpiry,
    conservation: item.conservation, frozen: item.frozen, frozen_at: clean(item.frozenAt),
    frozen_use_by: clean(item.frozenUseBy), thawed_at: clean(item.thawedAt), thawed_sale_by: clean(item.thawedSaleBy),
    sensitive: item.sensitive, allergens: clean(item.allergens), destination: item.destination, responsible: item.responsible,
  };
}
function fromAudit(row: Row) {
  return {
    id: String(row.id), createdAt: String(row.created_at), updatedAt: String(row.updated_at),
    createdBy: String(row.creator_name ?? "Utilisateur"), updatedBy: optional(row.updated_by_name),
    status: row.status as HygieneData["openings"][number]["status"], comments: optional(row.comments),
    attachments: (row.attachments as string[]) ?? [], archivedAt: optional(row.archived_at),
  };
}
function optional(value: unknown) { return value == null ? undefined : String(value); }
function optionalNumber(value: unknown) { return value == null ? undefined : Number(value); }
function isMissingSchemaError(error: { code?: string }) { return error.code === "PGRST205" || error.code === "42703"; }
function isUniqueConflict(error: { code?: string }) { return error.code === "23505"; }
function changedRows<T extends AuditFields>(current: T[], next: T[]) {
  const versions = new Map(current.map((item) => [item.id, item.updatedAt]));
  return next.filter((item) => versions.get(item.id) !== item.updatedAt);
}
function toDbDateTime(value: string) { return new Date(value).toISOString(); }
function fromDbDateTime(value: unknown) {
  const date = new Date(String(value)); const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
