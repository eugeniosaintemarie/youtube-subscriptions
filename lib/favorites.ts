import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getJson, setJson } from "@/lib/kv";

const FAVS_KEY = "single_user:favs";

const parseFavoriteLines = (content: string): string[] => {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const getEnvFavorites = (): string[] => {
  const fromEnv = process.env.FAVORITE_CHANNELS;
  if (!fromEnv) {
    return [];
  }

  return fromEnv
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const tryReadLegacyFile = async (): Promise<string[]> => {
  try {
    const filePath = join(process.cwd(), "favs.md");
    const content = await readFile(filePath, "utf-8");
    return parseFavoriteLines(content);
  } catch {
    return [];
  }
};

export async function getFavoriteChannels(): Promise<string[]> {
  const existing = await getJson<string[]>(FAVS_KEY);
  if (existing && existing.length > 0) {
    return existing;
  }

  const seeded = getEnvFavorites();
  if (seeded.length > 0) {
    await setJson(FAVS_KEY, seeded);
    return seeded;
  }

  const fromLegacyFile = await tryReadLegacyFile();
  if (fromLegacyFile.length > 0) {
    await setJson(FAVS_KEY, fromLegacyFile);
    return fromLegacyFile;
  }

  return [];
}
