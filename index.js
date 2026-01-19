import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { securityHeaders } from "./middleware/security.js";

import auth from "./routes/auth.js";
import users from "./routes/users.js";
import operators from "./routes/operators.js";
import payments from "./routes/payments.js";
import events from "./routes/events.js";
import push from "./routes/push.js";
import adsRoutes from "./routes/ads.js";
import couponsRoutes from "./routes/coupons.js";
import testimonialsRoutes from "./routes/testimonials.js";
import smsRoutes from "./routes/sms.js";
import chatRoutes from "./routes/chat.js";
import videoRoutes from "./routes/video.js";
import adminRoutes from "./routes/admin.js";
import publicRoutes from "./routes/public.js";
import statsRoutes from "./routes/stats.js";

dotenv.config();

const app = new Hono();

app.use("*", securityHeaders);

app.use(
  "*",
  cors({
    origin: [
      "https://www.babatv24.com",
      "https://babatv24.com",
      "http://localhost:5173",
      "http://localhost:5000",
      "https://babatvfanpage.replit.dev",
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    maxAge: 86400,
  })
);


app.get("/", (c) => {
  return c.json({
    status: "OK",
    message: "BabaTV24 Backend ULTRA-PRO SECURITY",
    version: "2.3.1",
    frontend: "https://www.babatv24.com",
    environment: process.env.NODE_ENV || "production",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      operators: "/api/operators",
      payments: "/api/payments",
      events: "/api/events",
      push: "/api/push",
      ads: "/api/ads",
      coupons: "/api/coupons",
      testimonials: "/api/testimonials",
      sms: "/api/sms",
      chat: "/api/chat",
      video: "/api/video",
      admin: "/api/admin",
      public: "/api/public",
      stats: "/api/stats",
    },
  });
});

app.route("/api/auth", auth);
app.route("/api/users", users);
app.route("/api/operators", operators);
app.route("/api/payments", payments);
app.route("/api/events", events);
app.route("/api/push", push);
app.route("/api/ads", adsRoutes);
app.route("/api/coupons", couponsRoutes);
app.route("/api/testimonials", testimonialsRoutes);
app.route("/api/sms", smsRoutes);
app.route("/api/chat", chatRoutes);
app.route("/api/video", videoRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/public", publicRoutes);
app.route("/api/stats", statsRoutes);

app.onError((err, c) => {
  console.error("SERVER ERROR:", err);
  return c.json(
    {
      success: false,
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    500,
  );
});

app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: "Not found",
      route: c.req.path,
    },
    404,
  );
});

const port = Number(process.env.PORT) || 5000;

console.log(`BabaTV24 Backend v2.3.3 ULTRA-PRO SECURITY running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});
