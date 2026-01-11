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
  console.info("[PUBLIC] GET /api/public/stats called");
  try {
    const supabase = getSupabaseClient();

    if (!supabase) {
      console.info("[PUBLIC] /stats - no Supabase, returning zeros");
      return c.json({ 
        success: true, 
        data: {
          usersCount: 0,
          maxPublicId: 0,
          updatedAt: new Date().toISOString()
        },
        totalUsers: 0
      });
    }

    const { count, error: countError } = await supabase
      .from(USERS_TABLE)
      .select("*", { count: "exact", head: true });

    if (countError) {
      console.error("[PUBLIC] GET /stats count error:", countError.message);
    }

    const { data: maxRow, error: maxError } = await supabase
      .from(USERS_TABLE)
      .select("public_id")
      .order("public_id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxError) {
      console.error("[PUBLIC] GET /stats max error:", maxError.message);
    }

    const usersCount = count || 0;
    const maxPublicId = maxRow?.public_id || 0;

    console.info(`[PUBLIC] /stats - usersCount=${usersCount}, maxPublicId=${maxPublicId}`);

    return c.json({ 
      success: true, 
      data: {
        usersCount,
        maxPublicId,
        updatedAt: new Date().toISOString()
      },
      totalUsers: usersCount
    });
  } catch (e) {
    console.error("[PUBLIC] GET /stats crash:", e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

export default publicRoutes;
