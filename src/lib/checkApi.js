// Helper to check if the API is enabled (kill switch)
import { supabase } from "./supabase";

export async function isApiEnabled() {
  if (!supabase) return true;

  try {
    const { data } = await supabase
      .from("settings")
      .select("api_enabled")
      .eq("id", 1)
      .single();

    return data?.api_enabled !== false;
  } catch {
    // Settings table might not exist — default to enabled
    return true;
  }
}
