// Favorite leagues — client-only persistence (localStorage).
// Sem auth/backend: funciona offline, por dispositivo. Simples de trocar por
// conta depois (mesma API de storage).

export const FAVORITES_KEY = "zagueiro:favorite-leagues";

export type FavoritesStorage = Pick<Storage, "getItem" | "setItem">;

export function toggleFavorite(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function isFavorite(list: number[], id: number): boolean {
  return list.includes(id);
}

export function readFavorites(storage: FavoritesStorage | null | undefined): number[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is number => typeof x === "number") : [];
  } catch {
    return [];
  }
}

export function writeFavorites(storage: FavoritesStorage, list: number[]): void {
  try {
    storage.setItem(FAVORITES_KEY, JSON.stringify(list));
  } catch {
    // quota/privacidade — falha silenciosa, app segue sem favoritos
  }
}

export function safeLocalStorage(): FavoritesStorage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}
