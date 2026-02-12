// GET /api/tracks — list all tracks (public, your games call this)
// Query params: ?tag=battle&limit=10

import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
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
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ tracks: data });
}
