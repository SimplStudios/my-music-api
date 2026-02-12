// DELETE /api/delete/[id] — admin-only delete endpoint

import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const password = req.headers["x-admin-password"];
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;

  // Get the track first to delete the file from storage
  const { data: track, error: fetchError } = await supabase
    .from("tracks")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !track) {
    return res.status(404).json({ error: "Track not found" });
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("music")
    .remove([track.file_name]);

  if (storageError) {
    console.error("Storage delete error:", storageError);
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from("tracks")
    .delete()
    .eq("id", id);

  if (dbError) {
    return res.status(500).json({ error: dbError.message });
  }

  return res.status(200).json({ message: "Track deleted" });
}
