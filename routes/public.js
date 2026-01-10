import { Hono } from "hono";
import { createClient } from "../utils/supabase.js";

const USERS_TABLE = process.env.SUPABASE_USERS_TABLE || "users";

const getSupabaseClient = () => {
  try {
    return createClient();
  } catch {
    return null;
  }
};

const publicRoutes = new Hono();

publicRoutes.get("/stats", async (c) => {
  try {
    const supabase = getSupabaseClient();

    if (!supabase) {
      return c.json({ success: true, totalUsers: 0 });
    }

    const { count, error } = await supabase
      .from(USERS_TABLE)
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("[PUBLIC] GET /stats error:", error.message);
      return c.json({ success: true, totalUsers: 0 });
    }

    return c.json({ success: true, totalUsers: count || 0 });
  } catch (e) {
    console.error("[PUBLIC] GET /stats crash:", e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

export default publicRoutes;
