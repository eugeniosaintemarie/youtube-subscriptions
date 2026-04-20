import { kv } from "@vercel/kv";

type CacheEntry<T> = {
  value: T;
  expiresAt?: number;
};

const memoryStore = new Map<string, CacheEntry<unknown>>();

const hasVercelKv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

export async function getJson<T>(key: string): Promise<T | null> {
  if (hasVercelKv) {
    return (await kv.get<T>(key)) ?? null;
  }

  const entry = memoryStore.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }

  return entry.value as T;
}

export async function setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  if (hasVercelKv) {
    if (ttlSeconds && ttlSeconds > 0) {
      await kv.set(key, value, { ex: ttlSeconds });
      return;
    }

    await kv.set(key, value);
    return;
  }

  const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : undefined;
  memoryStore.set(key, { value, expiresAt });
}

export async function deleteKey(key: string): Promise<void> {
  if (hasVercelKv) {
    await kv.del(key);
    return;
  }

  memoryStore.delete(key);
}
