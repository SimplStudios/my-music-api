// GET/PUT /api/settings — manage admin settings (username, password, kill switch)

import { supabase } from "@/lib/supabase";
import { verifyAdmin } from "@/lib/auth";

export default async function handler(req, res) {
  try {
    // Auth check
    const isAdmin = await verifyAdmin(req);
    if (!isAdmin) {
      return res.status(401).json({ error: "Invalid admin password." });
    }

    if (!supabase) {
      return res.status(500).json({
        error: "Supabase not configured.",
        hint: "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel env vars.",
      });
    }

    // GET — fetch current settings
    if (req.method === "GET") {
      try {
        const { data, error } = await supabase
          .from("settings")
          .select("*")
          .eq("id", 1)
          .single();

        if (error) {
          // Table might not exist — return defaults
          return res.status(200).json({
            username: "Admin",
            api_enabled: true,
            _note: "Settings table not found, returning defaults. Run the settings SQL from the README.",
          });
        }

        return res.status(200).json({
          username: data.username || "Admin",
          api_enabled: data.api_enabled !== false,
        });
      } catch {
        return res.status(200).json({ username: "Admin", api_enabled: true });
      }
    }

    // PUT — update settings
    if (req.method === "PUT") {
      const { username, new_password, api_enabled } = req.body || {};

      const updates = { updated_at: new Date().toISOString() };
      if (username !== undefined) updates.username = username;
      if (new_password) updates.password_override = new_password;
      if (api_enabled !== undefined) updates.api_enabled = api_enabled;

      const { data, error } = await supabase
        .from("settings")
        .upsert({ id: 1, ...updates })
        .select()
        .single();

      if (error) {
        return res.status(500).json({
          error: "Failed to update settings.",
          detail: error.message,
          hint: "Make sure the 'settings' table exists. Run the settings SQL from the README.",
        });
      }

      return res.status(200).json({
        success: true,
        username: data.username || "Admin",
        api_enabled: data.api_enabled !== false,
        password_changed: !!new_password,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[/api/settings] Unhandled error:", err);
    return res.status(500).json({
      error: "Internal server error in /api/settings",
      detail: err.message || String(err),
      hint: "Check Vercel Function Logs for full trace.",
    });
  }
}
