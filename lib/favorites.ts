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
    .split(/[,\n;]+/)
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
  const seeded = getEnvFavorites();

  // FAVORITE_CHANNELS es fuente de verdad: si tiene contenido, prevalece
  // sobre KV y se re-sincroniza para que cambios en Vercel apliquen
  // sin tener que borrar la key a mano.
  if (seeded.length > 0) {
    const existing = await getJson<string[]>(FAVS_KEY);
    const same =
      existing &&
      existing.length === seeded.length &&
      existing.every((v, i) => v === seeded[i]);
    if (!same) {
      await setJson(FAVS_KEY, seeded);
    }
    return seeded;
  }

  const existing = await getJson<string[]>(FAVS_KEY);
  if (existing && existing.length > 0) {
    return existing;
  }

  const fromLegacyFile = await tryReadLegacyFile();
  if (fromLegacyFile.length > 0) {
    await setJson(FAVS_KEY, fromLegacyFile);
    return fromLegacyFile;
  }

  return [];
}
