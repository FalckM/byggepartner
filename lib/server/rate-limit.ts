import "server-only";

// Simple in-memory fixed-window rate limit (spec 12). Per server instance – fine for a prototype.
const buckets = new Map<string, { start: number; count: number }>();

export function rateLimit(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now - b.start > windowMs) {
    buckets.set(key, { start: now, count: 1 });
    if (buckets.size > 10_000) buckets.clear(); // memory guard
    return true;
  }
  b.count++;
  return b.count <= limit;
}
