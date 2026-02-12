// POST /api/auth — validate admin password, return settings

import { supabase } from "@/lib/supabase";
import { getAdminPassword } from "@/lib/auth";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed", route: "/api/auth" });
    }

    const { password } = req.body || {};

    if (!password || !password.trim()) {
      return res.status(400).json({ error: "Please enter your admin password." });
    }

    // Get the active admin password (env var or settings override)
    const adminPassword = await getAdminPassword();
    let username = "Admin";
    let apiEnabled = true;

    // Fetch display settings
    if (supabase) {
      try {
        const { data } = await supabase
          .from("settings")
          .select("username, api_enabled")
          .eq("id", 1)
          .single();

        if (data) {
          username = data.username || "Admin";
          apiEnabled = data.api_enabled !== false;
        }
      } catch {
        // Settings table may not exist yet — use defaults
      }
    }

    if (!adminPassword) {
      return res.status(500).json({
        error:
          "Admin password not configured. Set ADMIN_PASSWORD in your Vercel environment variables.",
        hint: "Go to Vercel → Your Project → Settings → Environment Variables → Add ADMIN_PASSWORD",
      });
    }

    if (password !== adminPassword) {
      return res.status(401).json({ error: "Invalid admin password. Please try again." });
    }

    return res.status(200).json({
      success: true,
      username,
      api_enabled: apiEnabled,
    });
  } catch (err) {
    console.error("[/api/auth] Unhandled error:", err);
    return res.status(500).json({
      error: "Internal server error in /api/auth",
      detail: err.message || String(err),
      hint: "Check Vercel Function Logs for full trace. Common cause: Supabase URL/key misconfigured.",
    });
  }
}
