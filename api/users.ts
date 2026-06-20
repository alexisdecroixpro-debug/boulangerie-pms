import { admin, HttpError, normalizeUsername, ownerContext, sendError } from "./_supabase.js";
import type { ApiRequest, ApiResponse } from "./_types.js";
import type { User } from "@supabase/supabase-js";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  try {
    const { user: owner, bakeryId } = await ownerContext(request);

    if (request.method === "GET") {
      const { data: memberships, error: memberError } = await admin
        .from("bakery_members")
        .select("user_id, role, created_at")
        .eq("bakery_id", bakeryId);
      if (memberError) throw memberError;
      const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listError) throw listError;
      const usersById = new Map<string, User>(
        listed.users.map((user): [string, User] => [user.id, user]),
      );
      const users = memberships.map((membership) => {
        const user = usersById.get(membership.user_id);
        return {
          id: membership.user_id,
          username: user?.user_metadata?.username || user?.email?.split("@")[0] || "utilisateur",
          fullName: user?.user_metadata?.full_name || "",
          role: membership.role,
          createdAt: user?.created_at || membership.created_at,
        };
      });
      return response.status(200).json({ users });
    }

    if (request.method === "POST") {
      const username = normalizeUsername(request.body?.username);
      const fullName = String(request.body?.fullName || "").trim();
      const password = String(request.body?.password || "");
      if (!fullName) throw new HttpError(400, "Le nom affiché est requis");
      if (password.length < 8) throw new HttpError(400, "Le mot de passe doit contenir au moins 8 caractères");
      const email = `${username}@pack-hygiene.local`;
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username, full_name: fullName, bakery_name: "Compte employé temporaire" },
      });
      if (createError || !created.user) throw new HttpError(409, createError?.message || "Création impossible");

      const { data: generatedMembership } = await admin
        .from("bakery_members")
        .select("bakery_id")
        .eq("user_id", created.user.id)
        .single();
      await admin.from("bakery_members").delete().eq("user_id", created.user.id);
      const { error: linkError } = await admin
        .from("bakery_members")
        .insert({ bakery_id: bakeryId, user_id: created.user.id, role: "member" });
      if (linkError) {
        await admin.auth.admin.deleteUser(created.user.id);
        throw linkError;
      }
      if (generatedMembership?.bakery_id && generatedMembership.bakery_id !== bakeryId) {
        await admin.from("bakeries").delete().eq("id", generatedMembership.bakery_id);
      }
      return response.status(201).json({ ok: true });
    }

    if (request.method === "DELETE") {
      const targetId = String(request.query.id || "");
      if (!targetId) throw new HttpError(400, "Compte manquant");
      if (targetId === owner.id) throw new HttpError(400, "Le compte administrateur ne peut pas être supprimé");
      const { data: membership } = await admin
        .from("bakery_members")
        .select("role")
        .eq("bakery_id", bakeryId)
        .eq("user_id", targetId)
        .single();
      if (!membership) throw new HttpError(404, "Compte introuvable dans cet atelier");
      if (membership.role === "owner") throw new HttpError(400, "Un administrateur ne peut pas être supprimé ici");
      const { error } = await admin.auth.admin.deleteUser(targetId);
      if (error) throw error;
      return response.status(200).json({ ok: true });
    }

    response.status(405).json({ error: "Méthode non autorisée" });
  } catch (error) {
    sendError(response, error);
  }
}
