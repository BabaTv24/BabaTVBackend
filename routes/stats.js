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

const statsRoutes = new Hono();

statsRoutes.get("/users-count", async (c) => {
  console.info("[STATS] GET /api/stats/users-count called");
  try {
    const supabase = getSupabaseClient();

    if (!supabase) {
      console.info("[STATS] /users-count - no Supabase, returning zeros");
      return c.json({ 
        success: true, 
        usersCount: 0,
        maxPublicId: 0
      });
    }

    const { count, error: countError } = await supabase
      .from(USERS_TABLE)
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("[STATS] users-count error:", countError.message);
    }

    const { data: maxRow, error: maxError } = await supabase
      .from(USERS_TABLE)
      .select("public_id")
      .order("public_id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxError) {
      console.error("[STATS] max public_id error:", maxError.message);
    }

    const usersCount = count || 0;
    const maxPublicId = maxRow?.public_id || 0;

    console.info(`[STATS] usersCount=${usersCount}, maxPublicId=${maxPublicId}`);

    return c.json({ 
      success: true, 
      usersCount,
      maxPublicId
    });
  } catch (e) {
    console.error("[STATS] users-count crash:", e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

export default statsRoutes;
