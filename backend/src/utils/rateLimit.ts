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
 * Throws a 429 response if the client has exceeded their limit.
 */
export function rateLimit(
  request: FastifyRequest,
  reply: FastifyReply,
  options: RateLimitOptions = { maxRequests: 5, windowMs: 60 * 1000 } // Default: 5 requests per minute
): boolean {
  // Bypass rate limiting in development environment
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const ip = request.ip || "unknown-ip";
  const now = Date.now();

  // Get current timestamps for this IP
  let timestamps = ipRequests.get(ip) || [];

  // Filter out timestamps that are outside the current window
  timestamps = timestamps.filter(time => now - time < options.windowMs);

  if (timestamps.length >= options.maxRequests) {
    // Rate limit exceeded
    reply.status(429).send({
      error: "Muitos pedidos",
      message: "Excedeste o limite de pedidos permitidos. Por favor, aguarda um momento antes de tentar novamente.",
      retryAfterSeconds: Math.ceil((options.windowMs - (now - timestamps[0])) / 1000),
    });
    return false;
  }

  // Record this request
  timestamps.push(now);
  ipRequests.set(ip, timestamps);
  return true;
}
