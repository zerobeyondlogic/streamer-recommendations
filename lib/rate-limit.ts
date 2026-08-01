type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    if (!current && buckets.size >= MAX_BUCKETS) {
      for (const [bucketKey, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(bucketKey);
      // This limiter is an instance-level safety net. Fail closed instead of allowing
      // an attacker to grow an unbounded map; production also needs platform WAF rules.
      if (buckets.size >= MAX_BUCKETS) return { ok: false, retryAfter: Math.ceil(windowMs / 1000) };
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (current.count >= limit) return { ok: false, retryAfter: Math.ceil((current.resetAt - now) / 1000) };
  current.count += 1;
  return { ok: true, retryAfter: 0 };
}

export function clearRateLimitsForTests() { buckets.clear(); }
