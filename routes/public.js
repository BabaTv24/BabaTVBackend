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
        usersCount: 0,
        latestPublicId: 0,
        joinedForRef: 0,
        refCodeUsed: null
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

    // usersCount (excluding admins)
    const { count: usersCountRaw, error: countError } = await supabase
      .from(USERS_TABLE)
      .select("*", { count: "exact", head: true })
      .neq("role", "admin");

    if (countError) {
      console.error("[PUBLIC] GET /stats count error:", countError.message);
    }

    const usersCount = usersCountRaw || 0;

    // latestPublicId = MAX(public_id) excluding admins and NULL values
    const { data: latestRow, error: latestErr } = await supabase
      .from(USERS_TABLE)
      .select("public_id")
      .neq("role", "admin")
      .not("public_id", "is", null)
      .order("public_id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestErr) {
      console.error("[PUBLIC] GET /stats latestPublicId error:", latestErr.message);
      return c.json({ success: false, error: "Stats query failed", details: latestErr.message }, 500);
    }

    const latestPublicId = latestRow?.public_id ?? 0;

    // joinedForRef - count users referred by sponsor
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

    console.info(`[PUBLIC] /stats - usersCount=${usersCount}, latestPublicId=${latestPublicId}, joinedForRef=${joinedForRef}`);

    return c.json({
      success: true,
      usersCount,
      latestPublicId,
      joinedForRef,
      refCodeUsed: ref || null
    });
  } catch (e) {
    console.error("[PUBLIC] GET /stats crash:", e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

export default publicRoutes;
