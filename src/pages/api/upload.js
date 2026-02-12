// POST /api/upload — admin-only endpoint to save track metadata
// The actual file is uploaded directly to Supabase Storage from the client

import { supabase } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/auth";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
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

    const { title, file_name, file_url, tags, file_size, mime_type } = req.body || {};

    if (!title || !file_name || !file_url) {
      return res.status(400).json({
        error: "Missing required fields",
        detail: `title: ${title ? "OK" : "missing"}, file_name: ${file_name ? "OK" : "missing"}, file_url: ${file_url ? "OK" : "missing"}`,
      });
    }

    const parsedTags = Array.isArray(tags)
      ? tags
      : typeof tags === "string" && tags.length > 0
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
      return res.status(500).json({
        error: "Failed to save track to database",
        detail: dbError.message,
        hint: "Make sure the 'tracks' table exists with the correct columns. See the README.",
      });
    }

    return res.status(201).json({ track });
  } catch (err) {
    console.error("[/api/upload] Unhandled error:", err);
    return res.status(500).json({
      error: "Internal server error in /api/upload",
      detail: err.message || String(err),
      hint: "Check Vercel Function Logs for full trace.",
    });
  }
}
