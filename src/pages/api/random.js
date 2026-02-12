// GET /api/random — get a random track, optionally by tag
// Example: /api/random?tag=battle

import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tag } = req.query;

  let query = supabase.from("tracks").select("*");

  if (tag) {
    query = query.contains("tags", [tag]);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data || data.length === 0) {
    return res.status(404).json({ error: "No tracks found" });
  }

  const randomTrack = data[Math.floor(Math.random() * data.length)];
  return res.status(200).json({ track: randomTrack });
}
