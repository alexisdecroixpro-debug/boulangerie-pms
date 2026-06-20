import { createClient } from "@supabase/supabase-js";
import type { ApiRequest, ApiResponse } from "./_types.js";

declare const process: { env: Record<string, string | undefined> };
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !serviceKey || !publishableKey) throw new Error("Configuration Supabase serveur manquante");

export const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
export const publicClient = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });

export async function authenticatedUser(request: ApiRequest) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Session manquante");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, "Session invalide");
  return data.user;
}

export async function ownerContext(request: ApiRequest) {
  const user = await authenticatedUser(request);
  const { data, error } = await admin
    .from("bakery_members")
    .select("bakery_id, role")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .single();
  if (error || !data) throw new HttpError(403, "Accès réservé à l’administrateur");
  return { user, bakeryId: data.bakery_id as string };
}

export function normalizeUsername(value: unknown) {
  const username = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    throw new HttpError(400, "Identifiant invalide : 3 à 40 caractères, sans espace ni accent");
  }
  return username;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function sendError(response: ApiResponse, error: unknown) {
  const status = error instanceof HttpError ? error.status : 500;
  response.status(status).json({ error: error instanceof Error ? error.message : "Erreur serveur" });
}
