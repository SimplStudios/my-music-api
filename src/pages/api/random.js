// GET /api/random — get a random track, optionally by tag
// Example: /api/random?tag=battle

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

    const { tag } = req.query;

    let query = supabase.from("tracks").select("*");

    if (tag) {
      query = query.contains("tags", [tag]);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        error: "Database query failed",
        detail: error.message,
        hint: "Make sure the 'tracks' table exists in Supabase.",
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: tag
          ? `No tracks found with tag "${tag}"`
          : "No tracks found. Upload some music first!",
      });
    }

    const randomTrack = data[Math.floor(Math.random() * data.length)];
    return res.status(200).json({ track: randomTrack });
  } catch (err) {
    console.error("[/api/random] Unhandled error:", err);
    return res.status(500).json({
      error: "Internal server error in /api/random",
      detail: err.message || String(err),
      hint: "Check Vercel Function Logs for full trace.",
    });
  }
}
