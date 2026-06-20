import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    client.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        const { data: membership } = await client
          .from("bakery_members")
          .select("role")
          .eq("user_id", data.session.user.id)
          .limit(1)
          .single();
        setRole(membership?.role ?? null);
      }
      setLoading(false);
    });

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) setRole(null);
      else {
        void client
          .from("bakery_members")
          .select("role")
          .eq("user_id", nextSession.user.id)
          .limit(1)
          .single()
          .then(({ data: membership }) => setRole(membership?.role ?? null));
      }
      setLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return {
    session,
    role,
    loading,
    configured: isSupabaseConfigured,
    signOut: () => supabase?.auth.signOut(),
  };
}
