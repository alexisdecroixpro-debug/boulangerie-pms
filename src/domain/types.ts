export type RecordStatus =
  | "À faire" | "Fait" | "En retard" | "Non conforme" | "Corrigé" | "Archivé"
  | "Ouverte" | "En cours" | "Clôturée" | "Active" | "Inactif" | "Validée" | "Non réalisée";

export interface AuditFields {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  status: RecordStatus;
  comments?: string;
  attachments?: string[];
  archivedAt?: string;
}

export type ProductType = "Sec" | "Frais" | "Surgelé" | "Produit d’origine animale" | "Fruit / légume local" | "Autre";

export interface RawMaterialOpening extends AuditFields {
  openedAt: string;
  materialName: string;
  brand?: string;
  category: string;
  productType: ProductType;
  supplier: string;
  supplierLot?: string;
  noSupplierLot: boolean;
  missingLotJustification?: string;
  producerName?: string;
  receivedAt?: string;
  harvestedAt?: string;
  supplierExpiry?: string;
  dateType?: "DLC" | "DDM" | "Non précisé";
  missingExpiryJustification?: string;
  sanitaryApproval?: string;
  receptionTemperature?: number;
  storageTemperature?: string;
  afterOpeningStorage?: string;
  allergens?: string[];
  ingredients?: string;
  packaging?: string;
  barcode?: string;
  traceabilityNotes?: string;
  quantity: number;
  unit: string;
  internalExpiry: string;
  storageZone: string;
  internalLot: string;
  operator: string;
  validationStatus?: "Validé" | "À vérifier";
  ocrConfidence?: number;
  ocrFieldConfidences?: Record<string, number>;
  ocrUncertainFields?: string[];
}

export interface InternalBatch extends AuditFields {
  manufacturedAt: string;
  family: string;
  productName: string;
  quantity: number;
  unit: string;
  internalLot: string;
  rawMaterials: string;
  rawMaterialLots: string;
  plannedSaleDate?: string;
  internalExpiry: string;
  conservation: string;
  frozen: boolean;
  frozenAt?: string;
  frozenUseBy?: string;
  thawedAt?: string;
  thawedSaleBy?: string;
  sensitive: boolean;
  allergens?: string;
  destination: string;
  responsible: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: "Froid positif" | "Froid négatif" | "Produit périssable" | "Autre";
  minThreshold: number;
  maxThreshold: number;
}

export interface TemperatureCheck extends AuditFields {
  checkedAt: string;
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  temperature: number;
  minThreshold: number;
  maxThreshold: number;
  compliant: boolean;
  correctiveAction?: string;
  productImpacted: boolean;
  productIsolated: boolean;
  managerNotified: boolean;
  operator: string;
}

export type CleaningFrequency = "Quotidien" | "Hebdomadaire" | "Mensuel" | "Ponctuel" | "Trimestriel";
export type CleaningActionType = "Nettoyage" | "Désinfection" | "Nettoyage-désinfection" | "Aspiration" | "Contrôle visuel";

export interface CleaningPlanTask extends AuditFields {
  name: string;
  zone: string;
  materialSurface: string;
  actionType: CleaningActionType;
  frequency: CleaningFrequency;
  suggestedDay?: string;
  scheduledDate?: string;
  product: string;
  method: string;
  defaultResponsible?: string;
  photoRequired: boolean;
  active: boolean;
}

export interface CleaningTask extends AuditFields {
  planTaskId?: string;
  zone: string;
  title: string;
  materialSurface?: string;
  actionType?: CleaningActionType;
  frequency: CleaningFrequency;
  product: string;
  method: string;
  contactTime: string;
  responsible: string;
  plannedAt: string;
  duePeriodStart?: string;
  duePeriodEnd?: string;
  photoRequired?: boolean;
}

export interface CleaningRecord extends AuditFields {
  taskId: string;
  completedAt: string;
  signature: string;
  validationComment?: string;
}

export interface DeliveryCheck extends AuditFields {
  receivedAt: string;
  supplier: string;
  product: string;
  category: string;
  productType: ProductType;
  quantity: number;
  unit: string;
  supplierLot?: string;
  supplierExpiry?: string;
  temperature?: number;
  packagingState: string;
  sanitaryStamp: boolean;
  compliant: boolean;
  nonConformityReason?: string;
  actionTaken: string;
  controller: string;
  internalLot: string;
}

export interface NonConformity extends AuditFields {
  occurredAt: string;
  type: string;
  description: string;
  product?: string;
  lot?: string;
  supplier?: string;
  severity: "Faible" | "Moyenne" | "Élevée" | "Critique";
  productIsolated: boolean;
  productDestroyed: boolean;
  affectedQuantity?: number;
  immediateAction: string;
  correctiveAction?: string;
  owner: string;
  closedAt?: string;
  sourceType?: "temperature" | "delivery" | "manual";
  sourceId?: string;
}

export interface ShelfLifeRule extends AuditFields {
  family: string;
  name: string;
  conservation: string;
  durationValue: number;
  durationUnit: "Heures" | "Jours" | "Mois";
  afterOpeningRule?: string;
  afterProductionRule?: string;
  afterFreezingRule?: string;
  afterThawingRule?: string;
  sensitive: boolean;
  allergens?: string;
}

export interface ProcedureDocument extends AuditFields {
  title: string;
  category: string;
  version: string;
  createdOn: string;
  updatedOn: string;
  content: string;
  approvedBy?: string;
  documentStatus: "Brouillon" | "Validé" | "Archivé";
}

export interface Supplier extends AuditFields { name: string; contact?: string; }
export interface Product extends AuditFields { name: string; family: string; shelfLifeRuleId?: string; }
export interface UserSignature extends AuditFields { userName: string; initials: string; }

export interface HygieneDashboard {
  todo: number;
  done: number;
  overdue: number;
  nonCompliant: number;
  missingTemperatures: number;
  cleaningPending: number;
  expiringSoon: number;
  openNonConformities: number;
}

export interface HygieneData {
  openings: RawMaterialOpening[];
  batches: InternalBatch[];
  temperatureChecks: TemperatureCheck[];
  cleaningPlanTasks: CleaningPlanTask[];
  cleaningTasks: CleaningTask[];
  cleaningRecords: CleaningRecord[];
  equipment: Equipment[];
  deliveryChecks: DeliveryCheck[];
  nonConformities: NonConformity[];
  shelfLifeRules: ShelfLifeRule[];
  procedures: ProcedureDocument[];
  suppliers: Supplier[];
  products: Product[];
  signatures: UserSignature[];
}
