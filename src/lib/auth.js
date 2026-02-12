// Shared auth helper — checks env var AND settings table password override
import { supabase } from "./supabase";

export async function getAdminPassword() {
  let adminPassword = process.env.ADMIN_PASSWORD || null;

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
    } catch {
      // Settings table may not exist — use env var
    }
  }

  return adminPassword;
}

export async function verifyAdmin(req) {
  const password = req.headers["x-admin-password"];
  if (!password) return false;
  const adminPassword = await getAdminPassword();
  if (!adminPassword) return false;
  return password === adminPassword;
}
