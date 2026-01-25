import { Hono } from "hono";
import { createClient } from "../utils/supabase.js";

const USERS_TABLE = process.env.SUPABASE_USERS_TABLE || "users";
const ADMIN_SPONSOR_ID = process.env.ADMIN_SPONSOR_ID || null;

const getSupabaseClient = () => {
  try {
    return createClient();
  } catch {
    return null;
  }
};

const publicRoutes = new Hono();

publicRoutes.get("/stats", async (c) => {
  c.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  c.header("Pragma", "no-cache");
  c.header("Expires", "0");

  console.info("[PUBLIC] GET /api/public/stats called");

  try {
    const supabase = getSupabaseClient();

    if (!supabase) {
      console.info("[PUBLIC] /stats - no Supabase, returning zeros");
      return c.json({ 
        success: true, 
        totalUsers: 0,
        joinedForRef: 0,
        refCodeUsed: null,
        data: {
          usersCount: 0,
          maxPublicId: 0,
          updatedAt: new Date().toISOString()
        }
      });
    }

    const ref = (c.req.query("ref") || "").trim();
    let sponsorId = null;

    if (ref) {
      const { data: sponsor } = await supabase
        .from(USERS_TABLE)
        .select("id, ref_code")
        .eq("ref_code", ref)
        .maybeSingle();
      sponsorId = sponsor?.id || null;
      console.info(`[PUBLIC] /stats ref=${ref}, sponsorId=${sponsorId || "not found"}`);
    }

    let totalUsers = 0;
    if (ADMIN_SPONSOR_ID) {
      const { count, error: countError } = await supabase
        .from(USERS_TABLE)
        .select("*", { count: "exact", head: true })
        .neq("sponsor_id", ADMIN_SPONSOR_ID);
      if (countError) {
        console.error("[PUBLIC] GET /stats count error:", countError.message);
      }
      totalUsers = count || 0;
    } else {
      const { count, error: countError } = await supabase
        .from(USERS_TABLE)
        .select("*", { count: "exact", head: true });
      if (countError) {
        console.error("[PUBLIC] GET /stats count error:", countError.message);
      }
      totalUsers = count || 0;
    }

    let joinedForRef = 0;
    if (sponsorId) {
      const { count, error: refError } = await supabase
        .from(USERS_TABLE)
        .select("*", { count: "exact", head: true })
        .eq("referred_by_id", sponsorId);
      if (refError) {
        console.error("[PUBLIC] GET /stats refCount error:", refError.message);
      }
      joinedForRef = count || 0;
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

    const maxPublicId = maxRow?.public_id || 0;

    console.info(`[PUBLIC] /stats - totalUsers=${totalUsers}, joinedForRef=${joinedForRef}, maxPublicId=${maxPublicId}`);

    return c.json({ 
      success: true,
      totalUsers,
      joinedForRef,
      refCodeUsed: ref || null,
      data: {
        usersCount: totalUsers,
        maxPublicId,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (e) {
    console.error("[PUBLIC] GET /stats crash:", e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

export default publicRoutes;
