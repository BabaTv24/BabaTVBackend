import { Hono } from "hono";
import { createClient } from "../utils/supabase.js";
import jwt from "jsonwebtoken";

const USERS_TABLE = process.env.SUPABASE_USERS_TABLE || "users";
const JWT_SECRET = process.env.JWT_SECRET || "babatv24-secret-key-change-in-production";

const getSupabaseClient = () => {
  try {
    return createClient();
  } catch {
    return null;
  }
};

const verifyJwt = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

const entitlement = new Hono();

entitlement.get("/check", async (c) => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return c.json({ success: false, error: "Database not configured" }, 500);

    const auth = c.req.header("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return c.json({ success: false, error: "Missing token" }, 401);

    const payload = verifyJwt(token);
    const userId = payload?.sub || payload?.userId || payload?.id;
    if (!userId) return c.json({ success: false, error: "Invalid token" }, 401);

    const { data: user, error } = await supabase
      .from(USERS_TABLE)
      .select("id, public_id, plan, access_status, expires_at")
      .eq("id", userId)
      .maybeSingle();

    if (error || !user) return c.json({ success: false, error: "User not found" }, 401);

    const accessStatus = (user.access_status || "").toLowerCase();
    if (accessStatus !== "active") {
      return c.json({
        success: true,
        allowed: false,
        reason: "inactive",
        userPublicId: user.public_id,
        plan: user.plan || null,
        accessStatus: user.access_status || null,
      });
    }

    const expiresAt = user.expires_at ? new Date(user.expires_at).getTime() : null;
    const now = Date.now();

    if (expiresAt && expiresAt <= now) {
      return c.json({
        success: true,
        allowed: false,
        reason: "expired",
        userPublicId: user.public_id,
        plan: user.plan || null,
        accessStatus: user.access_status || null,
        expiresAt: user.expires_at,
      });
    }

    return c.json({
      success: true,
      allowed: true,
      reason: "ok",
      userPublicId: user.public_id,
      plan: user.plan || null,
      accessStatus: user.access_status || null,
      expiresAt: user.expires_at || null,
    });
  } catch (e) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

export default entitlement;
