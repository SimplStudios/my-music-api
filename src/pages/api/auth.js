// POST /api/auth — validate admin password, return settings

import { supabase } from "@/lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password } = req.body || {};

  if (!password || !password.trim()) {
    return res.status(400).json({ error: "Please enter your admin password." });
  }

  // Determine the current password (env var or override from settings)
  let adminPassword = process.env.ADMIN_PASSWORD;
  let username = "Admin";
  let apiEnabled = true;

  if (supabase) {
    try {
      const { data } = await supabase
        .from("settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (data) {
        if (data.password_override) {
          adminPassword = data.password_override;
        }
        username = data.username || "Admin";
        apiEnabled = data.api_enabled !== false;
      }
    } catch (e) {
      // Settings table may not exist yet — fall back to env var
    }
  }

  if (!adminPassword) {
    return res.status(500).json({
      error:
        "Admin password not configured. Set ADMIN_PASSWORD in your Vercel environment variables.",
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
}
