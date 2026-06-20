import { LoaderCircle, LockKeyhole, Store } from "lucide-react";
import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";

export function AuthScreen({ loading, onSignedIn }: { loading: boolean; onSignedIn?: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    setSubmitting(true);
    setMessage("");
    const values = new FormData(event.currentTarget);
    const identifier = String(values.get("identifier")).trim().toLowerCase();
    const password = String(values.get("password"));
    const email = identifier.includes("@")
      ? identifier
      : `${identifier}@pack-hygiene.local`;
    const result = await supabase.auth.signInWithPassword({ email, password });

    if (result.error) setMessage(result.error.message);
    else onSignedIn?.();
    setSubmitting(false);
  };

  if (loading) {
    return <div className="auth-loading"><LoaderCircle className="spin" /> Connexion sécurisée…</div>;
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand"><Store size={26} /><span>Mon Atelier</span></div>
        <div className="auth-icon"><LockKeyhole size={26} /></div>
        <h1>Connexion à l’atelier</h1>
        <p>Retrouvez vos outils de production, d’hygiène et de gestion.</p>
        <form onSubmit={submit} className="auth-form">
          <label>Identifiant<input name="identifier" required autoComplete="username" autoCapitalize="none" /></label>
          <label>Mot de passe<input name="password" type="password" minLength={8} required autoComplete="current-password" /></label>
          {message && <div className="auth-message">{message}</div>}
          <button className="button button--primary" disabled={submitting}>
            {submitting ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </section>
    </main>
  );
}
