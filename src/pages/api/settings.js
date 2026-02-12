// GET/PUT /api/settings — manage admin settings (username, password, kill switch)

import { supabase } from "@/lib/supabase";

async function getCurrentPassword() {
  let adminPassword = process.env.ADMIN_PASSWORD;
  if (supabase) {
    try {
      const { data } = await supabase
        .from("settings")
        .select("password_override")
        .eq("id", 1)
        .single();
      if (data?.password_override) {
        adminPassword = data.password_override;
      }
    } catch (e) {}
  }
  return adminPassword;
}

export default async function handler(req, res) {
  // Auth check
  const password = req.headers["x-admin-password"];
  const adminPassword = await getCurrentPassword();

  if (!password || password !== adminPassword) {
    return res.status(401).json({ error: "Invalid admin password." });
  }

  if (!supabase) {
    return res.status(500).json({ error: "Supabase not configured." });
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
        });
      }

      return res.status(200).json({
        username: data.username || "Admin",
        api_enabled: data.api_enabled !== false,
      });
    } catch (e) {
      return res.status(200).json({ username: "Admin", api_enabled: true });
    }
  }

  // PUT — update settings
  if (req.method === "PUT") {
    const { username, new_password, api_enabled } = req.body;

    const updates = { updated_at: new Date().toISOString() };
    if (username !== undefined) updates.username = username;
    if (new_password) updates.password_override = new_password;
    if (api_enabled !== undefined) updates.api_enabled = api_enabled;

    try {
      const { data, error } = await supabase
        .from("settings")
        .upsert({ id: 1, ...updates })
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({
        success: true,
        username: data.username || "Admin",
        api_enabled: data.api_enabled !== false,
        password_changed: !!new_password,
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
