import { Hono } from "hono";
import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import { signToken } from "../utils/jwt.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { rateLimiter, bruteForceLimiter, protectReplay, secureLog } from "../middleware/security.js";
import { userMeta, ads, coupons, testimonials, chats, videoLoop, generateId } from "../utils/dataStore.js";
import { createClient } from "../utils/supabase.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "mtvx007@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_2FA_SECRET = process.env.ADMIN_2FA_SECRET;
const USERS_TABLE = process.env.SUPABASE_USERS_TABLE || "users";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ROLES = ["user", "moderator", "admin"];
const ALLOWED_ACCESS_STATUS = ["active", "suspended", "expired"];

const ROLE_ALIASES = {
  "administrator": "admin",
  "mod": "moderator",
  "member": "user",
  "normal": "user"
};

const STATUS_ALIASES = {
  "enabled": "active",
  "disabled": "suspended",
  "banned": "suspended",
  "inactive": "expired"
};

const normalizeRole = (role) => {
  if (!role || typeof role !== "string") return "user";
  const normalized = role.trim().toLowerCase();
  if (ROLE_ALIASES[normalized]) return ROLE_ALIASES[normalized];
  if (ALLOWED_ROLES.includes(normalized)) return normalized;
  return null;
};

const normalizeAccessStatus = (status) => {
  if (!status || typeof status !== "string") return "active";
  const normalized = status.trim().toLowerCase();
  if (STATUS_ALIASES[normalized]) return STATUS_ALIASES[normalized];
  if (ALLOWED_ACCESS_STATUS.includes(normalized)) return normalized;
  return null;
};

const IS_DEV = process.env.NODE_ENV !== "production";

const TEMP_PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
const generateTempPassword = (length = 16) => {
  let password = "";
  for (let i = 0; i < length; i++) {
    password += TEMP_PASSWORD_CHARS.charAt(Math.floor(Math.random() * TEMP_PASSWORD_CHARS.length));
  }
  return password;
};

const snakeToCamel = (str) => str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

const convertUserToCamelCase = (user) => {
  if (!user) return user;
  const result = {};
  for (const [key, value] of Object.entries(user)) {
    if (key === "password_hash") continue;
    result[snakeToCamel(key)] = value;
  }
  return result;
};

const createSupabasePayload = (data) => {
  const now = new Date().toISOString();
  
  const rawPayload = {
    email: (data.email || "").toLowerCase().trim(),
    first_name: data.firstName || data.first_name || "",
    last_name: data.lastName || data.last_name || "",
    phone: data.phone || null,
    address: data.address || data.addressLine1 || null,
    city: data.city || null,
    country: data.country || null,
    postal_code: data.postalCode || data.postal_code || null,
    bank_account: data.bankAccount || data.bank_account || null,
    facebook_url: data.facebookUrl || data.facebook_url || null,
    instagram_url: data.instagramUrl || data.instagram_url || null,
    linkedin_url: data.linkedinUrl || data.linkedin_url || null,
    tiktok_url: data.tiktokUrl || data.tiktok_url || null,
    twitter_url: data.twitterUrl || data.twitter_url || null,
    youtube_url: data.youtubeUrl || data.youtube_url || null,
    role: normalizeRole(data.role) || "user",
    access_status: data.accessStatus || data.access_status || "active",
    password_hash: data.password_hash,
    created_at: now,
    updated_at: now
  };
  
  const payload = {};
  for (const [key, value] of Object.entries(rawPayload)) {
    if (value !== null && value !== undefined && value !== "") {
      payload[key] = value;
    }
  }
  
  if (rawPayload.password_hash) {
    payload.password_hash = rawPayload.password_hash;
  }
  
  if (IS_DEV) {
    console.log("[DEV] createSupabasePayload - klucze:", Object.keys(payload).join(", "));
    console.log("[DEV] role po normalizacji:", payload.role);
    console.log("[DEV] password_hash ustawiony:", !!payload.password_hash);
  }
  
  return payload;
};

const createUserObjectForMemory = (data) => {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    email: (data.email || "").toLowerCase().trim(),
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    phone: data.phone || null,
    address: data.address || null,
    city: data.city || null,
    country: data.country || null,
    postalCode: data.postalCode || null,
    bankAccount: data.bankAccount || null,
    facebookUrl: data.facebookUrl || null,
    instagramUrl: data.instagramUrl || null,
    linkedinUrl: data.linkedinUrl || null,
    tiktokUrl: data.tiktokUrl || null,
    twitterUrl: data.twitterUrl || null,
    youtubeUrl: data.youtubeUrl || null,
    role: normalizeRole(data.role) || "user",
    accessStatus: normalizeAccessStatus(data.accessStatus) || "active",
    externalId: data.externalId || generateId(),
    createdAt: data.createdAt || now,
    updatedAt: now
  };
};

const usersInMemory = new Map();

const getSupabaseClient = () => {
  try {
    return createClient();
  } catch {
    return null;
  }
};

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
    const page = parseInt(c.req.query("page") || "1");
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = (page - 1) * limit;
    const q = (c.req.query("q") || "").toLowerCase().trim();
    const statusFilter = c.req.query("status") || "";
    const roleFilter = c.req.query("role") || "";

    const filterUsers = (usersList) => {
      return usersList.filter(user => {
        const matchesSearch = !q || 
          (user.email || "").toLowerCase().includes(q) ||
          (user.firstName || "").toLowerCase().includes(q) ||
          (user.lastName || "").toLowerCase().includes(q);
        const matchesStatus = !statusFilter || user.accessStatus === statusFilter;
        const matchesRole = !roleFilter || user.role === roleFilter;
        return matchesSearch && matchesStatus && matchesRole;
      });
    };

    const supabase = getSupabaseClient();
    
    if (!supabase) {
      const allUsers = Array.from(usersInMemory.values());
      const filteredUsers = filterUsers(allUsers);
      const paginatedUsers = filteredUsers.slice(offset, offset + limit);
      const total = filteredUsers.length;
      return c.json({ 
        users: paginatedUsers.map(u => ({ ...u, meta: userMeta.get(u.id) || { tags: [], isPremium: false } })),
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        source: "memory"
      });
    }
    
    const { data: users, error, count } = await supabase
      .from(USERS_TABLE)
      .select("*", { count: "exact" })
      .order("createdAt", { ascending: false });

    if (error) {
      if (error.message.includes("does not exist") || error.code === "42P01") {
        const allUsers = Array.from(usersInMemory.values());
        const filteredUsers = filterUsers(allUsers);
        const paginatedUsers = filteredUsers.slice(offset, offset + limit);
        const total = filteredUsers.length;
        return c.json({ 
          users: paginatedUsers.map(u => ({ ...u, meta: userMeta.get(u.id) || { tags: [], isPremium: false } })),
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
          source: "memory"
        });
      }
      throw error;
    }

    const filteredUsers = filterUsers(users || []);
    const paginatedUsers = filteredUsers.slice(offset, offset + limit);
    const total = filteredUsers.length;

    const enrichedUsers = paginatedUsers.map(user => ({
      ...convertUserToCamelCase(user),
      meta: userMeta.get(user.id) || { tags: [], isPremium: false }
    }));

    return c.json({ 
      success: true,
      users: enrichedUsers,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      source: "supabase"
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

admin.post("/users", async (c) => {
  try {
    const body = await c.req.json();
    
    if (IS_DEV) {
      console.log("[DEV] POST /api/admin/users - received body (bez password):", JSON.stringify({ ...body, password: body.password ? "[HIDDEN]" : undefined }, null, 2));
    }
    
    if (!body.email || !body.firstName || !body.lastName) {
      return c.json({ success: false, error: "email, firstName, lastName are required" }, 400);
    }
    
    const email = body.email.toLowerCase().trim();
    if (!EMAIL_REGEX.test(email)) {
      return c.json({ success: false, error: "Invalid email format" }, 400);
    }
    
    const normalizedRole = normalizeRole(body.role);
    if (body.role && normalizedRole === null) {
      return c.json({ success: false, error: `role must be one of: ${ALLOWED_ROLES.join(", ")} (or aliases: administrator, mod)` }, 400);
    }
    
    const normalizedStatus = normalizeAccessStatus(body.accessStatus);
    if (body.accessStatus && normalizedStatus === null) {
      return c.json({ success: false, error: `accessStatus must be one of: ${ALLOWED_ACCESS_STATUS.join(", ")}` }, 400);
    }
    
    if (body.expiresAt && isNaN(Date.parse(body.expiresAt))) {
      return c.json({ success: false, error: "expiresAt must be a valid ISO date" }, 400);
    }

    let tempPassword = null;
    let plainPassword = body.password;
    
    if (!plainPassword || typeof plainPassword !== "string" || plainPassword.trim().length < 6) {
      tempPassword = generateTempPassword(14);
      plainPassword = tempPassword;
    }
    
    const password_hash = await bcrypt.hash(plainPassword, 10);

    const supabase = getSupabaseClient();

    if (!supabase) {
      const newUser = createUserObjectForMemory({ ...body, email, role: normalizedRole || "user", accessStatus: normalizedStatus || "active" });
      newUser.password_hash = password_hash;
      for (const [, u] of usersInMemory) {
        if (u.email === email) {
          return c.json({ success: false, error: "User with this email already exists" }, 409);
        }
      }
      usersInMemory.set(newUser.id, newUser);
      const { password_hash: _, ...userWithoutHash } = newUser;
      const response = { 
        success: true, 
        user: convertUserToCamelCase(userWithoutHash), 
        tempPasswordGenerated: !!tempPassword,
        source: "memory" 
      };
      console.log(`[ADMIN] User created: ${email}, role: ${normalizedRole || "user"}, tempPasswordGenerated: ${!!tempPassword}`);
      return c.json(response, 201);
    }

    const supabasePayload = createSupabasePayload({ ...body, email, role: normalizedRole || "user", password_hash });
    
    if (IS_DEV) {
      const logPayload = { ...supabasePayload };
      delete logPayload.password_hash;
      console.log("[DEV] Supabase insert payload (bez password_hash):", JSON.stringify(logPayload, null, 2));
    }

    const { data: existing } = await supabase
      .from(USERS_TABLE)
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return c.json({ success: false, error: "User with this email already exists" }, 409);
    }

    const { data, error } = await supabase
      .from(USERS_TABLE)
      .insert(supabasePayload)
      .select()
      .single();

    if (error) {
      if (IS_DEV) {
        console.log("[DEV] Supabase insert error:", JSON.stringify({ message: error.message, details: error.details, code: error.code }, null, 2));
      }
      if (error.message.includes("does not exist") || error.code === "42P01") {
        const newUser = createUserObjectForMemory({ ...body, email, role: normalizedRole || "user", accessStatus: normalizedStatus || "active" });
        newUser.password_hash = password_hash;
        for (const [, u] of usersInMemory) {
          if (u.email === email) {
            return c.json({ success: false, error: "User with this email already exists" }, 409);
          }
        }
        usersInMemory.set(newUser.id, newUser);
        const { password_hash: _, ...userWithoutHash } = newUser;
        const response = { 
          success: true, 
          user: convertUserToCamelCase(userWithoutHash), 
          tempPasswordGenerated: !!tempPassword,
          source: "memory" 
        };
        console.log(`[ADMIN] User created (fallback): ${email}, role: ${normalizedRole || "user"}, tempPasswordGenerated: ${!!tempPassword}`);
        return c.json(response, 201);
      }
      if (error.code === "23505") {
        return c.json({ success: false, error: "User with this email already exists" }, 409);
      }
      return c.json({ success: false, error: error.message, details: error.details || null }, 400);
    }

    if (IS_DEV) {
      console.log("[DEV] Supabase insert success, user id:", data.id);
    }

    const { password_hash: _, ...userWithoutHash } = data;
    const response = { 
      success: true, 
      user: convertUserToCamelCase(userWithoutHash), 
      tempPasswordGenerated: !!tempPassword,
      source: "supabase" 
    };
    console.log(`[ADMIN] User created in Supabase: ${email}, role: ${normalizedRole || "user"}, tempPasswordGenerated: ${!!tempPassword}`);
    return c.json(response, 201);
  } catch (error) {
    console.error("[ADMIN] POST /api/admin/users error:", error.message);
    return c.json({ success: false, error: error.message }, 400);
  }
});

admin.put("/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    if (body.email) {
      body.email = body.email.toLowerCase().trim();
      if (!EMAIL_REGEX.test(body.email)) {
        return c.json({ success: false, error: "Invalid email format" }, 400);
      }
    }
    
    if (body.role !== undefined) {
      const normalizedRole = normalizeRole(body.role);
      if (body.role && normalizedRole === null) {
        return c.json({ success: false, error: `role must be one of: ${ALLOWED_ROLES.join(", ")} (or aliases: administrator, mod)` }, 400);
      }
      body.role = normalizedRole || "user";
    }
    
    if (body.accessStatus !== undefined) {
      const normalizedStatus = normalizeAccessStatus(body.accessStatus);
      if (body.accessStatus && normalizedStatus === null) {
        return c.json({ success: false, error: `accessStatus must be one of: ${ALLOWED_ACCESS_STATUS.join(", ")}` }, 400);
      }
      body.accessStatus = normalizedStatus || "active";
    }
    
    if (body.expiresAt && isNaN(Date.parse(body.expiresAt))) {
      return c.json({ success: false, error: "expiresAt must be a valid ISO date" }, 400);
    }

    const supabase = getSupabaseClient();

    if (!supabase) {
      const memUser = usersInMemory.get(id);
      if (!memUser) {
        return c.json({ success: false, error: "User not found" }, 404);
      }
      if (body.email && body.email !== memUser.email) {
        for (const [, u] of usersInMemory) {
          if (u.email === body.email && u.id !== id) {
            return c.json({ success: false, error: "Email already in use" }, 409);
          }
        }
      }
      const updated = { ...memUser, ...body, id, createdAt: memUser.createdAt, updatedAt: new Date().toISOString() };
      usersInMemory.set(id, updated);
      return c.json({ success: true, user: updated, source: "memory" });
    }

    const { data: existingUser, error: fetchError } = await supabase
      .from(USERS_TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      if (fetchError.message.includes("does not exist") || fetchError.code === "42P01") {
        const memUser = usersInMemory.get(id);
        if (!memUser) {
          return c.json({ success: false, error: "User not found" }, 404);
        }
        if (body.email && body.email !== memUser.email) {
          for (const [, u] of usersInMemory) {
            if (u.email === body.email && u.id !== id) {
              return c.json({ success: false, error: "Email already in use" }, 409);
            }
          }
        }
        const updated = { ...memUser, ...body, id, createdAt: memUser.createdAt, updatedAt: new Date().toISOString() };
        usersInMemory.set(id, updated);
        return c.json({ success: true, user: updated, source: "memory" });
      }
      throw fetchError;
    }

    if (!existingUser) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    if (body.email && body.email !== existingUser.email) {
      const { data: emailCheck } = await supabase
        .from(USERS_TABLE)
        .select("id")
        .eq("email", body.email)
        .neq("id", id)
        .maybeSingle();
      if (emailCheck) {
        return c.json({ success: false, error: "Email already in use" }, 409);
      }
    }

    const now = new Date().toISOString();
    const rawUpdate = {
      email: body.email || undefined,
      first_name: body.firstName || body.first_name || undefined,
      last_name: body.lastName || body.last_name || undefined,
      phone: body.phone || undefined,
      address: body.address || body.addressLine1 || undefined,
      city: body.city || undefined,
      country: body.country || undefined,
      postal_code: body.postalCode || body.postal_code || undefined,
      bank_account: body.bankAccount || body.bank_account || undefined,
      facebook_url: body.facebookUrl || body.facebook_url || undefined,
      instagram_url: body.instagramUrl || body.instagram_url || undefined,
      linkedin_url: body.linkedinUrl || body.linkedin_url || undefined,
      tiktok_url: body.tiktokUrl || body.tiktok_url || undefined,
      twitter_url: body.twitterUrl || body.twitter_url || undefined,
      youtube_url: body.youtubeUrl || body.youtube_url || undefined,
      role: body.role || undefined,
      access_status: body.accessStatus || body.access_status || undefined,
      updated_at: now
    };
    
    const updatePayload = {};
    for (const [key, value] of Object.entries(rawUpdate)) {
      if (value !== undefined) {
        updatePayload[key] = value;
      }
    }

    if (IS_DEV) {
      console.log("[DEV] PUT /api/admin/users/:id - update payload:", JSON.stringify(updatePayload, null, 2));
    }

    const { data, error } = await supabase
      .from(USERS_TABLE)
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (IS_DEV) {
        console.log("[DEV] Supabase update error:", JSON.stringify({ message: error.message, details: error.details, code: error.code }, null, 2));
      }
      return c.json({ success: false, error: error.message, details: error.details }, 400);
    }

    return c.json({ success: true, user: convertUserToCamelCase(data), source: "supabase" });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 400);
  }
});

admin.delete("/users/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const supabase = getSupabaseClient();

    if (!supabase) {
      if (!usersInMemory.has(id)) {
        return c.json({ success: false, error: "User not found" }, 404);
      }
      usersInMemory.delete(id);
      userMeta.delete(id);
      return c.json({ success: true, message: "User deleted", source: "memory" });
    }

    const { data: existingUser, error: fetchError } = await supabase
      .from(USERS_TABLE)
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      if (fetchError.message.includes("does not exist") || fetchError.code === "42P01") {
        if (!usersInMemory.has(id)) {
          return c.json({ success: false, error: "User not found" }, 404);
        }
        usersInMemory.delete(id);
        userMeta.delete(id);
        return c.json({ success: true, message: "User deleted", source: "memory" });
      }
      throw fetchError;
    }

    if (!existingUser) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    const { error } = await supabase
      .from(USERS_TABLE)
      .delete()
      .eq("id", id);

    if (error) throw error;

    userMeta.delete(id);

    return c.json({ success: true, message: "User deleted", source: "supabase" });
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
