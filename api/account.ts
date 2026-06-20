import { admin, authenticatedUser, HttpError, normalizeUsername, publicClient, sendError } from "./_supabase.js";
import type { ApiRequest, ApiResponse } from "./_types.js";

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "PATCH") return response.status(405).json({ error: "Méthode non autorisée" });
  try {
    const user = await authenticatedUser(request);
    const username = normalizeUsername(request.body?.username);
    const currentPassword = String(request.body?.currentPassword || "");
    const newPassword = String(request.body?.newPassword || "");
    if (!currentPassword) throw new HttpError(400, "Le mot de passe actuel est requis");
    if (newPassword && newPassword.length < 8) throw new HttpError(400, "Le nouveau mot de passe doit contenir au moins 8 caractères");

    const { error: passwordError } = await publicClient.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });
    if (passwordError) throw new HttpError(401, "Mot de passe actuel incorrect");

    const email = `${username}@pack-hygiene.local`;
    const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;
    if (listed.users.some((candidate) => candidate.id !== user.id && candidate.email === email)) {
      throw new HttpError(409, "Cet identifiant est déjà utilisé");
    }

    const attributes: Parameters<typeof admin.auth.admin.updateUserById>[1] = {
      email,
      email_confirm: true,
      user_metadata: { ...user.user_metadata, username },
    };
    if (newPassword) attributes.password = newPassword;
    const { error } = await admin.auth.admin.updateUserById(user.id, attributes);
    if (error) throw error;
    response.status(200).json({ ok: true });
  } catch (error) {
    sendError(response, error);
  }
}
