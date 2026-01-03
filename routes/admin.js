import { Hono } from "hono";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import { signToken } from "../utils/jwt.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { rateLimiter, bruteForceLimiter, protectReplay, secureLog } from "../middleware/security.js";
import { userMeta, ads, coupons, testimonials, chats, videoLoop, generateId } from "../utils/dataStore.js";
import { createClient } from "../utils/supabase.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@babatv24.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_2FA_SECRET = process.env.ADMIN_2FA_SECRET;

const admin = new Hono();

admin.post("/login", async (c) => {
  const ip = c.req.header("x-forwarded-for") || "unknown";

  try {
    try {
      await rateLimiter.consume(ip);
    } catch {
      return c.json({ success: false, error: "Too many requests" }, 429);
    }

    const { email, password } = await c.req.json();

    if (email !== ADMIN_EMAIL) {
      try { 
        await bruteForceLimiter.consume(ip); 
      } catch {
        secureLog(`BRUTE FORCE BLOCKED from IP=${ip}`);
        return c.json({ success: false, error: "Too many failed attempts. Try again later." }, 429);
      }
      secureLog(`FAILED ADMIN LOGIN (email mismatch) from IP=${ip}`);
      return c.json({ success: false, error: "Invalid credentials" }, 401);
    }

    if (!ADMIN_PASSWORD) {
      return c.json({ success: false, error: "Admin password not configured" }, 500);
    }

    let valid = false;
    if (ADMIN_PASSWORD.startsWith("$2")) {
      valid = await bcrypt.compare(password, ADMIN_PASSWORD);
    } else {
      valid = password === ADMIN_PASSWORD;
    }
    
    if (!valid) {
      try { 
        await bruteForceLimiter.consume(ip); 
      } catch {
        secureLog(`BRUTE FORCE BLOCKED from IP=${ip}`);
        return c.json({ success: false, error: "Too many failed attempts. Try again later." }, 429);
      }
      secureLog(`FAILED ADMIN LOGIN (wrong password) from IP=${ip}`);
      return c.json({ success: false, error: "Invalid credentials" }, 401);
    }

    secureLog(`ADMIN PASSWORD VERIFIED from IP=${ip}`);

    if (ADMIN_2FA_SECRET) {
      return c.json({
        success: true,
        requires2FA: true,
        message: "Enter Google Authenticator code."
      });
    } else {
      const token = signToken({ role: "admin", email: ADMIN_EMAIL });
      secureLog(`ADMIN LOGIN (no 2FA) from IP=${ip}`);
      return c.json({
        success: true,
        token,
        message: "Admin authenticated (2FA disabled)."
      });
    }

  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

admin.post("/verify-2fa", async (c) => {
  const ip = c.req.header("x-forwarded-for") || "unknown";

  try {
    const { code } = await c.req.json();

    if (!ADMIN_2FA_SECRET) {
      return c.json({ success: false, error: "2FA not configured" }, 400);
    }

    const verified = speakeasy.totp.verify({
      secret: ADMIN_2FA_SECRET,
      encoding: "base32",
      token: code,
      window: 1,
    });

    if (!verified) {
      secureLog(`FAILED 2FA from IP=${ip}`);
      return c.json({ success: false, error: "Invalid 2FA code" }, 401);
    }

    if (!protectReplay(code)) {
      return c.json({ success: false, error: "Replay attack detected" }, 400);
    }

    const token = signToken({ role: "admin", email: ADMIN_EMAIL });

    secureLog(`ADMIN SUCCESSFUL LOGIN from IP=${ip}`);

    return c.json({
      success: true,
      token,
      message: "Admin authenticated."
    });

  } catch (err) {
    return c.json({ success: false, error: err.message }, 500);
  }
});

admin.use("/*", authMiddleware);

admin.get("/dashboard", async (c) => {
  try {
    const stats = {
      totalAds: ads.length,
      activeAds: ads.filter(a => a.isActive).length,
      totalCoupons: coupons.length,
      activeCoupons: coupons.filter(cp => cp.isActive).length,
      totalTestimonials: testimonials.length,
      pendingTestimonials: testimonials.filter(t => !t.isApproved).length,
      unreadMessages: chats.filter(m => m.recipientId === "admin" && !m.readAt).length,
      videoLoopActive: videoLoop.isActive,
      premiumUsers: Array.from(userMeta.values()).filter(u => u.isPremium).length,
      system: "BabaTV24 ADMIN PANEL - ULTRA-PRO SECURITY",
      status: "OK"
    };

    return c.json({ success: true, stats });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

admin.get("/users", async (c) => {
  try {
    const supabase = createClient();
    
    const { data: users, error } = await supabase
      .from("users")
      .select("*");

    if (error) throw error;

    const enrichedUsers = (users || []).map(user => ({
      ...user,
      meta: userMeta.get(user.id) || { tags: [], isPremium: false }
    }));

    return c.json({ success: true, users: enrichedUsers });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

admin.post("/users/:userId/toggle-premium", async (c) => {
  try {
    const userId = c.req.param("userId");
    
    let meta = userMeta.get(userId);
    if (!meta) {
      meta = { tags: [], isPremium: false };
    }

    meta.isPremium = !meta.isPremium;
    meta.premiumToggledAt = new Date().toISOString();
    meta.premiumToggledBy = c.get("userId");
    
    userMeta.set(userId, meta);

    return c.json({ 
      success: true, 
      userId,
      isPremium: meta.isPremium,
      message: meta.isPremium ? "User is now premium" : "Premium removed from user"
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

admin.post("/users/:userId/set-premium", async (c) => {
  try {
    const userId = c.req.param("userId");
    const { isPremium, expiresAt } = await c.req.json();
    
    let meta = userMeta.get(userId) || { tags: [], isPremium: false };

    meta.isPremium = isPremium;
    meta.premiumExpiresAt = expiresAt || null;
    meta.premiumSetAt = new Date().toISOString();
    meta.premiumSetBy = c.get("userId");
    
    userMeta.set(userId, meta);

    return c.json({ 
      success: true, 
      userId,
      isPremium: meta.isPremium,
      expiresAt: meta.premiumExpiresAt
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

admin.post("/users/:userId/tags", async (c) => {
  try {
    const userId = c.req.param("userId");
    const { tag } = await c.req.json();
    
    if (!tag) {
      return c.json({ success: false, error: "Tag is required" }, 400);
    }

    let meta = userMeta.get(userId);
    if (!meta) {
      meta = { tags: [], isPremium: false };
    }

    if (!meta.tags.includes(tag)) {
      meta.tags.push(tag);
    }
    
    userMeta.set(userId, meta);

    return c.json({ success: true, userId, tags: meta.tags });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

admin.delete("/users/:userId/tags/:tag", async (c) => {
  try {
    const userId = c.req.param("userId");
    const tag = c.req.param("tag");
    
    let meta = userMeta.get(userId);
    if (!meta) {
      return c.json({ success: false, error: "User metadata not found" }, 404);
    }

    meta.tags = meta.tags.filter(t => t !== tag);
    userMeta.set(userId, meta);

    return c.json({ success: true, userId, tags: meta.tags });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

admin.get("/users/by-tag/:tag", async (c) => {
  try {
    const tag = c.req.param("tag");
    
    const usersWithTag = [];
    userMeta.forEach((meta, userId) => {
      if (meta.tags && meta.tags.includes(tag)) {
        usersWithTag.push({ userId, ...meta });
      }
    });

    return c.json({ success: true, users: usersWithTag });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

admin.get("/users/premium", async (c) => {
  try {
    const premiumUsers = [];
    userMeta.forEach((meta, userId) => {
      if (meta.isPremium) {
        premiumUsers.push({ userId, ...meta });
      }
    });

    return c.json({ success: true, users: premiumUsers });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

admin.get("/tags", async (c) => {
  try {
    const allTags = new Set();
    userMeta.forEach((meta) => {
      if (meta.tags) {
        meta.tags.forEach(tag => allTags.add(tag));
      }
    });

    return c.json({ success: true, tags: Array.from(allTags) });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

admin.post("/users/bulk/add-tag", async (c) => {
  try {
    const { userIds, tag } = await c.req.json();
    
    if (!userIds || !tag) {
      return c.json({ success: false, error: "User IDs and tag are required" }, 400);
    }

    userIds.forEach(userId => {
      let meta = userMeta.get(userId) || { tags: [], isPremium: false };
      if (!meta.tags.includes(tag)) {
        meta.tags.push(tag);
      }
      userMeta.set(userId, meta);
    });

    return c.json({ success: true, message: `Tag "${tag}" added to ${userIds.length} users` });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

admin.post("/users/bulk/set-premium", async (c) => {
  try {
    const { userIds, isPremium, expiresAt } = await c.req.json();
    
    if (!userIds) {
      return c.json({ success: false, error: "User IDs are required" }, 400);
    }

    userIds.forEach(userId => {
      let meta = userMeta.get(userId) || { tags: [], isPremium: false };
      meta.isPremium = isPremium;
      meta.premiumExpiresAt = expiresAt || null;
      meta.premiumSetAt = new Date().toISOString();
      userMeta.set(userId, meta);
    });

    return c.json({ 
      success: true, 
      message: `Premium status ${isPremium ? "enabled" : "disabled"} for ${userIds.length} users` 
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

const activityLog = [];

admin.get("/activity", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "50");
    return c.json({ success: true, activities: activityLog.slice(-limit).reverse() });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

export default admin;
