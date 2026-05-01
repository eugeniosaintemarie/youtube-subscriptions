import { kv } from "@vercel/kv";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

type CacheEntry<T> = {
  value: T;
  expiresAt?: number;
};

const memoryStore = new Map<string, CacheEntry<unknown>>();
const fileStorePath = path.join(os.tmpdir(), "yts-kv-store.json");

const hasVercelKv = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

async function readFileStore(): Promise<Record<string, CacheEntry<unknown>>> {
  try {
    const data = await fs.readFile(fileStorePath, "utf-8");
    return JSON.parse(data) as Record<string, CacheEntry<unknown>>;
  } catch {
    return {};
  }
}

async function writeFileStore(data: Record<string, CacheEntry<unknown>>): Promise<void> {
  try {
    await fs.writeFile(fileStorePath, JSON.stringify(data), "utf-8");
  } catch {
    // Ignore file write errors
  }
}

export async function getJson<T>(key: string): Promise<T | null> {
  if (hasVercelKv) {
    return (await kv.get<T>(key)) ?? null;
  }

  // Try file store first (persistent across restarts)
  const fileStore = await readFileStore();
  const entry = fileStore[key] ?? memoryStore.get(key);
  
  if (!entry) {
    return null;
  }

  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    delete fileStore[key];
    memoryStore.delete(key);
    await writeFileStore(fileStore);
    return null;
  }

  // Sync to memory for faster access
  memoryStore.set(key, entry);
  return entry.value as T;
}

export async function setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
  if (hasVercelKv) {
    if (ttlSeconds && ttlSeconds > 0) {
      await kv.set(key, value, { ex: ttlSeconds });
    } else {
      await kv.set(key, value);
    }
    return;
  }

  const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : undefined;
  const entry: CacheEntry<T> = { value, expiresAt };

  // Save to both memory and file
  memoryStore.set(key, entry);
  
  const fileStore = await readFileStore();
  fileStore[key] = entry;
  await writeFileStore(fileStore);
}

export async function deleteKey(key: string): Promise<void> {
  if (hasVercelKv) {
    await kv.del(key);
    return;
  }

  memoryStore.delete(key);
  
  const fileStore = await readFileStore();
  delete fileStore[key];
  await writeFileStore(fileStore);
}
