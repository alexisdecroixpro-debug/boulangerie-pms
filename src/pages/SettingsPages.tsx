import type { Session } from "@supabase/supabase-js";
import { KeyRound, Plus, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Field, Input } from "../components/FormFields";

type ManagedUser = {
  id: string;
  username: string;
  fullName: string;
  role: string;
  createdAt: string;
};

async function apiRequest<T>(session: Session, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...init?.headers,
    },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Opération impossible");
  return payload as T;
}

export function AccountPage({ session, onUpdated }: { session: Session | null; onUpdated: () => void }) {
  const currentUsername = session?.user.user_metadata?.username || session?.user.email?.split("@")[0] || "";
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!session) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    const values = new FormData(event.currentTarget);
    try {
      await apiRequest(session, "/api/account", {
        method: "PATCH",
        body: JSON.stringify({
          username: String(values.get("username")),
          currentPassword: String(values.get("currentPassword")),
          newPassword: String(values.get("newPassword") || ""),
        }),
      });
      setMessage("Paramètres enregistrés. Reconnexion en cours…");
      window.setTimeout(() => { void onUpdated(); }, 800);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Modification impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="page-header">
        <div><p className="eyeline">Paramètres</p><h1>Mon compte</h1><p>Modifiez votre identifiant ou votre mot de passe.</p></div>
      </header>
      <section className="panel settings-panel">
        <div className="settings-icon"><UserRound /></div>
        <form className="form-grid" onSubmit={submit}>
          <Field label="Identifiant"><Input name="username" defaultValue={currentUsername} minLength={3} required autoComplete="username" /></Field>
          <Field label="Mot de passe actuel"><Input name="currentPassword" type="password" required autoComplete="current-password" /></Field>
          <Field label="Nouveau mot de passe" wide><Input name="newPassword" type="password" minLength={8} autoComplete="new-password" placeholder="Laisser vide pour ne pas le changer" /></Field>
          {error && <div className="form-message form-message--error field--wide">{error}</div>}
          {message && <div className="form-message field--wide">{message}</div>}
          <div className="form-actions field--wide"><button className="button button--primary" disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button></div>
        </form>
      </section>
    </>
  );
}

export function UsersPage({ session }: { session: Session | null }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const data = await apiRequest<{ users: ManagedUser[] }>(session, "/api/users");
      setUsers(data.users);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);
  if (!session) return null;

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      await apiRequest(session, "/api/users", {
        method: "POST",
        body: JSON.stringify({
          username: String(values.get("username")),
          fullName: String(values.get("fullName")),
          password: String(values.get("password")),
        }),
      });
      form.reset();
      setMessage("Compte employé créé.");
      await loadUsers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Création impossible");
    }
  };

  const removeUser = async (user: ManagedUser) => {
    if (!window.confirm(`Supprimer définitivement l'accès de ${user.username} ?`)) return;
    setError("");
    setMessage("");
    try {
      await apiRequest(session, `/api/users?id=${encodeURIComponent(user.id)}`, { method: "DELETE" });
      setMessage("Compte supprimé. Ses anciens enregistrements PMS sont conservés.");
      await loadUsers();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Suppression impossible");
    }
  };

  return (
    <>
      <header className="page-header">
        <div><p className="eyeline">Administration</p><h1>Utilisateurs</h1><p>Créez et gérez les accès de l’équipe.</p></div>
      </header>
      <section className="panel settings-panel">
        <div className="section-heading"><div><h2><Plus size={18} /> Nouveau compte</h2><p>Le compte sera ajouté à votre atelier avec le rôle employé.</p></div></div>
        <form className="form-grid settings-form" onSubmit={createUser}>
          <Field label="Identifiant"><Input name="username" minLength={3} required /></Field>
          <Field label="Nom affiché"><Input name="fullName" required /></Field>
          <Field label="Mot de passe temporaire" wide><Input name="password" type="password" minLength={8} required autoComplete="new-password" /></Field>
          <div className="form-actions field--wide"><button className="button button--primary"><KeyRound size={17} /> Créer le compte</button></div>
        </form>
      </section>
      {error && <div className="form-message form-message--error">{error}</div>}
      {message && <div className="form-message">{message}</div>}
      <section className="panel users-panel">
        <div className="section-heading"><div><h2><ShieldCheck size={18} /> Comptes de l’atelier</h2><p>{loading ? "Chargement…" : `${users.length} compte(s)`}</p></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Identifiant</th><th>Nom</th><th>Rôle</th><th>Création</th><th></th></tr></thead>
            <tbody>{users.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.username}</strong></td>
                <td>{user.fullName || "—"}</td>
                <td>{user.role === "owner" ? "Administrateur" : "Employé"}</td>
                <td>{new Date(user.createdAt).toLocaleDateString("fr-FR")}</td>
                <td>{user.role !== "owner" && <button className="danger-button" onClick={() => void removeUser(user)} aria-label={`Supprimer ${user.username}`}><Trash2 size={17} /> Supprimer</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}
