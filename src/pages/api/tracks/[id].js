// GET /api/tracks/[id] — get a single track by ID (public)

import { supabase } from "@/lib/supabase";
import { isApiEnabled } from "@/lib/checkApi";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!supabase) {
      return res.status(500).json({
        error: "Supabase not configured",
        hint: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel environment variables.",
      });
    }

    if (!(await isApiEnabled())) {
      return res.status(503).json({ error: "API is currently disabled by the administrator." });
    }

    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Track ID is required." });
    }

    const { data, error } = await supabase
      .from("tracks")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return res.status(404).json({
        error: "Track not found",
        detail: `No track with ID "${id}" exists.`,
      });
    }

    return res.status(200).json({ track: data });
  } catch (err) {
    console.error("[/api/tracks/[id]] Unhandled error:", err);
    return res.status(500).json({
      error: "Internal server error in /api/tracks/[id]",
      detail: err.message || String(err),
      hint: "Check Vercel Function Logs for full trace.",
    });
  }
}
