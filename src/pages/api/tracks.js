// GET /api/tracks — list all tracks (public, your games call this)
// Query params: ?tag=battle&limit=10&search=epic

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

    const { tag, limit, search } = req.query;

    let query = supabase
      .from("tracks")
      .select("*")
      .order("created_at", { ascending: false });

    if (tag) {
      query = query.contains("tags", [tag]);
    }

    if (search) {
      query = query.ilike("title", `%${search}%`);
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({
        error: "Database query failed",
        detail: error.message,
        hint: "Make sure the 'tracks' table exists in Supabase. See the README for setup SQL.",
      });
    }

    return res.status(200).json({ tracks: data || [] });
  } catch (err) {
    console.error("[/api/tracks] Unhandled error:", err);
    return res.status(500).json({
      error: "Internal server error in /api/tracks",
      detail: err.message || String(err),
      hint: "Check Vercel Function Logs for full trace.",
    });
  }
}
