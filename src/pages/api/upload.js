// POST /api/upload — admin-only endpoint to save track metadata
// The actual file is uploaded directly to Supabase Storage from the client

import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  // Check admin password
  const password = req.headers["x-admin-password"];
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { title, file_name, file_url, tags, file_size, mime_type } = req.body;

    if (!title || !file_name || !file_url) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const parsedTags = Array.isArray(tags) ? tags : 
      (typeof tags === "string" && tags.length > 0) 
        ? tags.split(",").map((t) => t.trim().toLowerCase()) 
        : [];

    // Insert metadata into database
    const { data: track, error: dbError } = await supabase
      .from("tracks")
      .insert({
        title,
        file_url,
        file_name,
        tags: parsedTags,
        file_size: file_size || 0,
        mime_type: mime_type || "audio/mpeg",
      })
      .select()
      .single();

    if (dbError) {
      return res.status(500).json({ error: dbError.message });
    }

    return res.status(201).json({ track });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
