import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;
const bakeryName = process.env.ADMIN_BAKERY_NAME || "Atelier principal";
const fullName = process.env.ADMIN_FULL_NAME || username;

if (!url || !serviceRoleKey || !username || !password) {
  throw new Error(
    "Variables requises: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_USERNAME et ADMIN_PASSWORD.",
  );
}

const normalizedUsername = username.trim().toLowerCase();
const email = `${normalizedUsername}@pack-hygiene.local`;
const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: users, error: listError } = await supabase.auth.admin.listUsers();
if (listError) throw listError;

const existing = users.users.find((user) => user.email === email);
if (existing) {
  const { error } = await supabase.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: { username: normalizedUsername, full_name: fullName, bakery_name: bakeryName },
  });
  if (error) throw error;
  console.log(`Compte administrateur mis à jour: ${normalizedUsername}`);
} else {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: normalizedUsername, full_name: fullName, bakery_name: bakeryName },
  });
  if (error) throw error;
  console.log(`Compte administrateur créé: ${normalizedUsername}`);
}
