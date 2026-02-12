// GET /api/tracks/[id] — get a single track by ID (public)

import { supabase } from "@/lib/supabase";
import { isApiEnabled } from "@/lib/checkApi";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  if (!(await isApiEnabled())) {
    return res.status(503).json({ error: "API is currently disabled by the administrator." });
  }

  const { id } = req.query;

  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return res.status(404).json({ error: "Track not found" });
  }

  return res.status(200).json({ track: data });
}
