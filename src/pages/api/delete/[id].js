// DELETE /api/delete/[id] — admin-only delete endpoint

import { supabase } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/auth";

export default async function handler(req, res) {
  try {
    if (req.method !== "DELETE") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!supabase) {
      return res.status(500).json({
        error: "Supabase not configured",
        hint: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel environment variables.",
      });
    }

    // Check admin password (supports password override from settings)
    const isAdmin = await verifyAdmin(req);
    if (!isAdmin) {
      return res.status(401).json({
        error: "Unauthorized. Invalid admin password.",
        hint: "If you recently changed your password in Settings, make sure you're using the new one.",
      });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Track ID is required." });
    }

    // Get the track first to delete the file from storage
    const { data: track, error: fetchError } = await supabase
      .from("tracks")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !track) {
      return res.status(404).json({
        error: "Track not found",
        detail: `No track with ID "${id}" exists.`,
      });
    }

    // Delete from storage
    if (track.file_name) {
      const { error: storageError } = await supabase.storage
        .from("music")
        .remove([track.file_name]);

      if (storageError) {
        console.error("[/api/delete] Storage delete error:", storageError);
        // Continue anyway — still remove the DB record
      }
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("tracks")
      .delete()
      .eq("id", id);

    if (dbError) {
      return res.status(500).json({
        error: "Failed to delete track from database",
        detail: dbError.message,
      });
    }

    return res.status(200).json({ message: "Track deleted", id });
  } catch (err) {
    console.error("[/api/delete] Unhandled error:", err);
    return res.status(500).json({
      error: "Internal server error in /api/delete",
      detail: err.message || String(err),
      hint: "Check Vercel Function Logs for full trace.",
    });
  }
}
