# Configuration Supabase

1. Créer un projet Supabase.
2. Ouvrir **SQL Editor** et exécuter `migrations/202606150001_pack_hygiene.sql`.
3. Copier `.env.example` vers `.env.local`.
4. Renseigner `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` depuis **Project Settings > API**.
5. Dans **Authentication > URL Configuration**, ajouter l’URL locale et l’URL de production.
6. Relancer `npm run dev`.

Le premier compte créé génère automatiquement son établissement, son rôle propriétaire et les équipements froids par défaut.

Les politiques RLS isolent les données par établissement. Les registres PMS ne disposent d’aucune autorisation de suppression : ils doivent être archivés.
