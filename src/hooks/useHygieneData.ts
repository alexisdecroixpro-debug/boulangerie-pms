import { useEffect, useMemo, useRef, useState } from "react";
import { seedData } from "../data/seed";
import type { HygieneData } from "../domain/types";
import {
  getCurrentBakeryId,
  getHygieneChanges,
  hasHygieneChanges,
  loadHygieneData,
  syncHygieneChanges,
} from "../data/supabaseRepository";
import { isSupabaseConfigured } from "../lib/supabase";
import {
  countQueuedChanges,
  enqueueChanges,
  getQueuedChanges,
  loadBakeryId,
  loadCloudCache,
  removeQueuedChanges,
  saveBakeryId,
  saveCloudCache,
} from "../data/offlineStore";
import { useOnlineStatus } from "./useOnlineStatus";

const STORAGE_KEY = "pack-hygiene-v1";

const load = (): HygieneData => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return seedData;
  try {
    return normalizeHygieneData(JSON.parse(saved) as Partial<HygieneData>);
  } catch {
    return seedData;
  }
};

export type SyncStatus = "local" | "loading" | "syncing" | "synced" | "offline" | "pending" | "error";

export function useHygieneData(userId?: string) {
  const [data, setDataState] = useState<HygieneData>(load);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(isSupabaseConfigured ? "loading" : "local");
  const [syncError, setSyncError] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const bakeryId = useRef<string | null>(null);
  const online = useOnlineStatus();

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) return;
    let active = true;
    const initialize = async () => {
      const [cachedData, cachedBakeryId, queued] = await Promise.all([
        loadCloudCache(userId),
        loadBakeryId(userId),
        countQueuedChanges(),
      ]);
      if (!active) return;
      if (cachedData) setDataState(normalizeHygieneData(cachedData));
      if (cachedBakeryId) bakeryId.current = cachedBakeryId;
      setPendingCount(queued);

      if (!navigator.onLine) {
        setSyncStatus(queued ? "pending" : "offline");
        return;
      }

      setSyncStatus("loading");
      try {
        const currentBakeryId = cachedBakeryId ?? await getCurrentBakeryId();
        bakeryId.current = currentBakeryId;
        await saveBakeryId(userId, currentBakeryId);
        let queueError = "";
        try {
          await flushQueue();
        } catch (error: unknown) {
          queueError = error instanceof Error ? error.message : "Synchronisation en attente";
        }
        const cloudData = await loadHygieneData();
        if (!active) return;
        const cleaningPlanMerge = mergeCachedCleaningPlan(normalizeHygieneData(cloudData), cachedData);
        const normalizedCloudData = cleaningPlanMerge.data;
        if (cleaningPlanMerge.shouldSync && bakeryId.current) {
          try {
            await syncHygieneChanges(emptyCleaningPlanChanges(normalizedCloudData.cleaningPlanTasks), bakeryId.current);
          } catch (error: unknown) {
            queueError = error instanceof Error ? error.message : "Synchronisation du plan en attente";
          }
        }
        setDataState(normalizedCloudData);
        await saveCloudCache(userId, normalizedCloudData);
        const remaining = await countQueuedChanges();
        setPendingCount(remaining);
        setSyncStatus(remaining ? "pending" : "synced");
        setSyncError(queueError && remaining ? `Synchronisation en attente : ${queueError}` : "");
      } catch (error: unknown) {
        if (!active) return;
        setSyncError(error instanceof Error ? error.message : "Chargement impossible");
        setSyncStatus(cachedData ? "offline" : "error");
      }
    };
    void initialize();
    return () => { active = false; };
  }, [userId]);

  useEffect(() => {
    if (!isSupabaseConfigured || !userId) return;
    if (!online) {
      void countQueuedChanges().then((remaining) => {
        setPendingCount(remaining);
        setSyncStatus(remaining ? "pending" : "offline");
      });
      return;
    }
    if (!bakeryId.current) return;
    void flushQueue().then(async () => {
      const remaining = await countQueuedChanges();
      setPendingCount(remaining);
      setSyncStatus(remaining ? "pending" : "synced");
      setSyncError("");
    }).catch((error: unknown) => {
      setSyncError(error instanceof Error ? error.message : "Synchronisation impossible");
      setSyncStatus("error");
    });
  }, [online, userId]);

  const setData = (updater: (current: HygieneData) => HygieneData) => {
    setDataState((current) => {
      const next = updater(current);
      if (!isSupabaseConfigured) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } else if (userId) {
        void saveCloudCache(userId, next);
        const changes = getHygieneChanges(current, next);
        if (bakeryId.current && hasHygieneChanges(changes)) {
          const currentBakeryId = bakeryId.current;
          setSyncStatus(online ? "syncing" : "pending");
          void enqueueChanges(currentBakeryId, changes).then(async () => {
            const queued = await countQueuedChanges();
            setPendingCount(queued);
            if (online) {
              try {
                await flushQueue();
                setPendingCount(await countQueuedChanges());
                setSyncStatus("synced");
                setSyncError("");
              } catch (error: unknown) {
                setSyncError(error instanceof Error ? error.message : "Synchronisation impossible");
                setSyncStatus("pending");
              }
            }
          });
        }
      }
      return next;
    });
  };

  const dashboard = useMemo(() => {
    const statuses = [
      ...data.temperatureChecks,
      ...data.cleaningTasks,
    ].map((item) => item.status);
    const today = new Date().toISOString().slice(0, 10);
    const soon = new Date();
    soon.setDate(soon.getDate() + 3);
    const checkedEquipment = new Set(data.temperatureChecks.filter((item) => item.checkedAt.startsWith(today)).map((item) => item.equipmentId));
    return {
      todo: statuses.filter((status) => status === "À faire").length,
      done: statuses.filter((status) => status === "Fait" || status === "Validée").length,
      overdue: statuses.filter((status) => status === "En retard").length,
      nonCompliant: statuses.filter((status) => status === "Non conforme").length,
      missingTemperatures: data.equipment.filter((item) => !checkedEquipment.has(item.id)).length,
      cleaningPending: data.cleaningTasks.filter((item) => item.plannedAt.startsWith(today) && !["Fait", "Validée", "Archivé"].includes(item.status)).length,
      expiringSoon: [
        ...data.openings.map((item) => item.internalExpiry),
        ...data.batches.map((item) => item.internalExpiry),
      ].filter((date) => date && new Date(date) <= soon && new Date(date) >= new Date(today)).length,
      openNonConformities: data.nonConformities.filter((item) => ["Ouverte", "En cours", "Non conforme"].includes(item.status)).length,
    };
  }, [data]);

  return { data, setData, dashboard, syncStatus, syncError, pendingCount, online };
}

function normalizeHygieneData(data: Partial<HygieneData>): HygieneData {
  return {
    ...seedData,
    ...data,
    openings: data.openings ?? [],
    batches: data.batches ?? [],
    temperatureChecks: data.temperatureChecks ?? [],
    cleaningPlanTasks: data.cleaningPlanTasks ?? seedData.cleaningPlanTasks,
    cleaningTasks: data.cleaningTasks ?? [],
    cleaningRecords: data.cleaningRecords ?? [],
    equipment: data.equipment ?? seedData.equipment,
    deliveryChecks: data.deliveryChecks ?? [],
    nonConformities: data.nonConformities ?? [],
    shelfLifeRules: data.shelfLifeRules ?? seedData.shelfLifeRules,
    procedures: data.procedures ?? [],
    suppliers: data.suppliers ?? [],
    products: data.products ?? [],
    signatures: data.signatures ?? [],
  };
}

function mergeCachedCleaningPlan(cloudData: HygieneData, cachedData?: HygieneData) {
  if (!cachedData?.cleaningPlanTasks?.length) return { data: cloudData, shouldSync: false };
  if (cloudData.cleaningPlanTasks.length > 0 && !isDefaultCleaningPlan(cloudData.cleaningPlanTasks)) {
    return { data: cloudData, shouldSync: false };
  }
  if (isUnmodifiedDefaultCleaningPlan(cachedData.cleaningPlanTasks)) {
    return { data: cloudData, shouldSync: false };
  }
  const cleaningPlanTasks = reconcileCachedCleaningPlanIds(cloudData.cleaningPlanTasks, cachedData.cleaningPlanTasks);
  return { data: { ...cloudData, cleaningPlanTasks }, shouldSync: true };
}

function isDefaultCleaningPlan(tasks: HygieneData["cleaningPlanTasks"]) {
  if (tasks.length !== seedData.cleaningPlanTasks.length) return false;
  const seedIds = new Set(seedData.cleaningPlanTasks.map((task) => task.id));
  return tasks.every((task) => seedIds.has(task.id));
}

function isUnmodifiedDefaultCleaningPlan(tasks: HygieneData["cleaningPlanTasks"]) {
  if (!isDefaultCleaningPlan(tasks)) return false;
  const comparable = (task: HygieneData["cleaningPlanTasks"][number]) => JSON.stringify({
    id: task.id,
    status: task.status,
    name: task.name,
    zone: task.zone,
    materialSurface: task.materialSurface,
    actionType: task.actionType,
    frequency: task.frequency,
    suggestedDay: task.suggestedDay ?? "",
    scheduledDate: task.scheduledDate ?? "",
    product: task.product,
    method: task.method,
    defaultResponsible: task.defaultResponsible ?? "",
    photoRequired: task.photoRequired,
    active: task.active,
    comments: task.comments ?? "",
  });
  const seedById = new Map(seedData.cleaningPlanTasks.map((task) => [task.id, comparable(task)]));
  return tasks.every((task) => comparable(task) === seedById.get(task.id));
}

function reconcileCachedCleaningPlanIds(
  cloudTasks: HygieneData["cleaningPlanTasks"],
  cachedTasks: HygieneData["cleaningPlanTasks"],
) {
  const cloudByName = new Map(cloudTasks.map((task) => [task.name.toLowerCase(), task]));
  return cachedTasks.map((task) => {
    if (isUuid(task.id)) return task;
    const cloudTask = cloudByName.get(task.name.toLowerCase());
    return cloudTask ? { ...task, id: cloudTask.id, createdAt: cloudTask.createdAt } : task;
  });
}

function emptyCleaningPlanChanges(cleaningPlanTasks: HygieneData["cleaningPlanTasks"]) {
  return {
    openings: [],
    batches: [],
    temperatureChecks: [],
    cleaningPlanTasks,
    cleaningTasks: [],
    cleaningRecords: [],
    deliveryChecks: [],
    nonConformities: [],
    shelfLifeRules: [],
    procedures: [],
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function flushQueue() {
  const queue = await getQueuedChanges();
  const failures: string[] = [];
  for (const item of queue) {
    try {
      await syncHygieneChanges(item.changes, item.bakeryId);
      await removeQueuedChanges(item.id);
    } catch (error: unknown) {
      failures.push(error instanceof Error ? error.message : "Synchronisation impossible");
    }
  }
  if (failures.length) {
    throw new Error(Array.from(new Set(failures)).join(" | "));
  }
}
