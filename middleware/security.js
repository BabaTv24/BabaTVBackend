import { RateLimiterMemory } from "rate-limiter-flexible";
import crypto from "crypto";

export const rateLimiter = new RateLimiterMemory({
  points: 20,
  duration: 60,
});

export const bruteForceLimiter = new RateLimiterMemory({
  points: 5,
  duration: 600,
});

const usedTokens = new Set();
export function protectReplay(token) {
  if (usedTokens.has(token)) return false;
  usedTokens.add(token);
  setTimeout(() => usedTokens.delete(token), 30000);
  return true;
}

export async function securityHeaders(c, next) {
  await next();
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("Referrer-Policy", "strict-origin");
  c.res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

export function secureLog(message) {
  const secret = process.env.LOG_SECRET || "LOGKEY123";
  const signature = crypto.createHmac("sha256", secret).update(message).digest("hex");
  console.log(`[SECURE LOG] ${message} | sig=${signature.substring(0, 16)}`);
}
