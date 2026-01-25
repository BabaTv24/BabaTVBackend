import { Hono } from "hono";
import { createClient } from "../utils/supabase.js";
import jwt from "jsonwebtoken";

const SUPPORT_THREADS_TABLE = "support_threads";
const SUPPORT_MESSAGES_TABLE = "support_messages";
const JWT_SECRET = process.env.JWT_SECRET || "babatv24-secret-key-change-in-production";

const getSupabaseClient = () => {
  try {
    return createClient();
  } catch {
    return null;
  }
};

const verifyToken = (c) => {
  const auth = c.req.header("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload?.sub || payload?.userId || payload?.id || null;
  } catch {
    return null;
  }
};

const support = new Hono();

support.get("/threads/me", async (c) => {
  const userId = verifyToken(c);
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const supabase = getSupabaseClient();
  if (!supabase) {
    return c.json({ success: true, threads: [] });
  }

  try {
    const { data, error } = await supabase
      .from(SUPPORT_THREADS_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.warn("[SUPPORT] threads/me error:", error.message);
      return c.json({ success: true, threads: [] });
    }

    return c.json({ success: true, threads: data || [] });
  } catch (e) {
    console.warn("[SUPPORT] threads/me catch:", e.message);
    return c.json({ success: true, threads: [] });
  }
});

support.get("/messages/me", async (c) => {
  const userId = verifyToken(c);
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const supabase = getSupabaseClient();
  if (!supabase) {
    return c.json({ success: true, messages: [] });
  }

  try {
    const { data, error } = await supabase
      .from(SUPPORT_MESSAGES_TABLE)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.warn("[SUPPORT] messages/me error:", error.message);
      return c.json({ success: true, messages: [] });
    }

    return c.json({ success: true, messages: data || [] });
  } catch (e) {
    console.warn("[SUPPORT] messages/me catch:", e.message);
    return c.json({ success: true, messages: [] });
  }
});

support.post("/messages", async (c) => {
  const userId = verifyToken(c);
  if (!userId) return c.json({ success: false, error: "Unauthorized" }, 401);

  const supabase = getSupabaseClient();
  if (!supabase) {
    return c.json({ success: false, error: "Database not configured" }, 500);
  }

  try {
    const { text, threadId } = await c.req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return c.json({ success: false, error: "Message text is required" }, 400);
    }

    let actualThreadId = threadId;

    if (!actualThreadId) {
      const { data: existingThread } = await supabase
        .from(SUPPORT_THREADS_TABLE)
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingThread) {
        actualThreadId = existingThread.id;
      } else {
        const { data: newThread, error: threadError } = await supabase
          .from(SUPPORT_THREADS_TABLE)
          .insert({
            user_id: userId,
            subject: "Support Request",
            status: "open",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select("id")
          .single();

        if (threadError) {
          console.warn("[SUPPORT] create thread error:", threadError.message);
          return c.json({ success: true, message: { text: text.trim(), sent: false } });
        }
        actualThreadId = newThread.id;
      }
    }

    const { data: message, error: msgError } = await supabase
      .from(SUPPORT_MESSAGES_TABLE)
      .insert({
        thread_id: actualThreadId,
        user_id: userId,
        sender: "user",
        text: text.trim(),
        created_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (msgError) {
      console.warn("[SUPPORT] create message error:", msgError.message);
      return c.json({ success: true, message: { text: text.trim(), sent: false } });
    }

    await supabase
      .from(SUPPORT_THREADS_TABLE)
      .update({ updated_at: new Date().toISOString() })
      .eq("id", actualThreadId);

    return c.json({ success: true, message });
  } catch (e) {
    console.warn("[SUPPORT] post message catch:", e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

export default support;
