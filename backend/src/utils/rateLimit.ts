import { FastifyRequest, FastifyReply } from "fastify";

// In-memory store for rate limits
// Map of IP -> array of timestamps of requests
const ipRequests = new Map<string, number[]>();

export interface RateLimitOptions {
  maxRequests: number; // Maximum number of requests allowed in the window
  windowMs: number;    // Time window in milliseconds
}

/**
 * A lightweight in-memory rate limiter for Fastify routes.
 * Always enforced — in development the limit is more generous (3x).
 * Throws a 429 response if the client has exceeded their limit.
 */
export function rateLimit(
  request: FastifyRequest,
  reply: FastifyReply,
  options: RateLimitOptions = { maxRequests: 5, windowMs: 60 * 1000 }
): boolean {
  const isProduction = process.env.NODE_ENV === "production";

  // In development use a 3x more generous limit, but never fully bypass.
  const effectiveMax = isProduction ? options.maxRequests : options.maxRequests * 3;

  const ip = request.ip || "unknown-ip";
  const now = Date.now();

  // Get current timestamps for this IP
  let timestamps = ipRequests.get(ip) || [];

  // Filter out timestamps that are outside the current window
  timestamps = timestamps.filter(time => now - time < options.windowMs);

  if (timestamps.length >= effectiveMax) {
    const retryAfter = Math.ceil((options.windowMs - (now - timestamps[0])) / 1000);
    reply.status(429).send({
      error: "Muitos pedidos",
      message: "Excedeste o limite de pedidos permitidos. Por favor, aguarda um momento antes de tentar novamente.",
      retryAfterSeconds: retryAfter,
    });
    return false;
  }

  // Record this request
  timestamps.push(now);
  ipRequests.set(ip, timestamps);
  return true;
}

// Periodically sweep expired entries every 5 minutes to prevent memory leaks.
// If an IP has no requests in the last 5 minutes, we completely delete its entry from the Map.
setInterval(() => {
  const now = Date.now();
  const maxWindowMs = 5 * 60 * 1000; // 5 minutes
  for (const [ip, timestamps] of ipRequests.entries()) {
    const active = timestamps.filter(time => now - time < maxWindowMs);
    if (active.length === 0) {
      ipRequests.delete(ip);
    } else {
      ipRequests.set(ip, active);
    }
  }
}, 5 * 60 * 1000).unref();

