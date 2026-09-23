export function normalizeChannelName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildFavoriteSet(favorites: string[]): Set<string> {
  return new Set(favorites.map(normalizeChannelName));
}

export function isFavoriteChannel(
  channelTitle: string,
  favoriteSet: Set<string>,
): boolean {
  return favoriteSet.has(normalizeChannelName(channelTitle));
}
