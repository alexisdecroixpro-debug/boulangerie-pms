import { getCurrentBakeryId } from "../data/supabaseRepository";
import { supabase } from "../lib/supabase";

export async function uploadAttachments(recordId: string, inputs: Array<File | null>) {
  const files = inputs.filter((file): file is File => Boolean(file?.size));
  if (!files.length) return [];
  if (!supabase || !navigator.onLine) {
    throw new Error("Les photos nécessitent une connexion Internet au moment de l’enregistrement.");
  }
  const client = supabase;
  const bakeryId = await getCurrentBakeryId();
  const paths = await Promise.all(files.map(async (file, index) => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${bakeryId}/${recordId}/${index + 1}-${Date.now()}.${extension}`;
    const { error } = await client.storage.from("hygiene-attachments").upload(path, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    if (error) throw error;
    return path;
  }));
  return paths;
}
