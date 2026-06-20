import { openDB } from "idb";
import type { HygieneChanges } from "./supabaseRepository";
import type { HygieneData } from "../domain/types";

interface QueueEntry {
  id: string;
  bakeryId: string;
  changes: HygieneChanges;
  createdAt: string;
}

const dbPromise = openDB("pack-hygiene-offline", 1, {
  upgrade(db) {
    db.createObjectStore("cache");
    db.createObjectStore("meta");
    db.createObjectStore("queue", { keyPath: "id" });
  },
});

export async function saveCloudCache(userId: string, data: HygieneData) {
  const db = await dbPromise;
  await db.put("cache", data, userId);
}

export async function loadCloudCache(userId: string) {
  const db = await dbPromise;
  return db.get("cache", userId) as Promise<HygieneData | undefined>;
}

export async function saveBakeryId(userId: string, bakeryId: string) {
  const db = await dbPromise;
  await db.put("meta", bakeryId, `bakery:${userId}`);
}

export async function loadBakeryId(userId: string) {
  const db = await dbPromise;
  return db.get("meta", `bakery:${userId}`) as Promise<string | undefined>;
}

export async function enqueueChanges(bakeryId: string, changes: HygieneChanges) {
  const db = await dbPromise;
  const entry: QueueEntry = {
    id: crypto.randomUUID(),
    bakeryId,
    changes,
    createdAt: new Date().toISOString(),
  };
  await db.add("queue", entry);
}

export async function getQueuedChanges() {
  const db = await dbPromise;
  return db.getAll("queue") as Promise<QueueEntry[]>;
}

export async function removeQueuedChanges(id: string) {
  const db = await dbPromise;
  await db.delete("queue", id);
}

export async function countQueuedChanges() {
  const db = await dbPromise;
  return db.count("queue");
}
