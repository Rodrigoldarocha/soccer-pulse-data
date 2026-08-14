import { describe, expect, it, vi } from "vitest";

import {
  FAVORITES_KEY,
  isFavorite,
  readFavorites,
  toggleFavorite,
  writeFavorites,
  type FavoritesStorage,
} from "../lib/favorites";

function mockStorage(initial: Record<string, string> = {}): FavoritesStorage {
  const store = new Map(Object.entries(initial));
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
  };
}

describe("toggleFavorite", () => {
  it("adds an id when absent", () => {
    expect(toggleFavorite([1, 2], 3)).toEqual([1, 2, 3]);
  });

  it("removes an id when present", () => {
    expect(toggleFavorite([1, 2, 3], 2)).toEqual([1, 3]);
  });

  it("does not duplicate when adding an existing id", () => {
    expect(toggleFavorite([1, 2], 2)).toEqual([1]);
  });
});

describe("readFavorites", () => {
  it("parses a valid list", () => {
    const storage = mockStorage({ [FAVORITES_KEY]: "[5,6,7]" });
    expect(readFavorites(storage)).toEqual([5, 6, 7]);
  });

  it("returns [] for missing key", () => {
    expect(readFavorites(mockStorage())).toEqual([]);
  });

  it("returns [] for invalid JSON", () => {
    const storage = mockStorage({ [FAVORITES_KEY]: "not-json" });
    expect(readFavorites(storage)).toEqual([]);
  });

  it("returns [] for null/undefined storage", () => {
    expect(readFavorites(null)).toEqual([]);
    expect(readFavorites(undefined)).toEqual([]);
  });
});

describe("writeFavorites", () => {
  it("persists the list as JSON", () => {
    const storage = mockStorage();
    writeFavorites(storage, [3, 1, 2]);
    expect(storage.setItem).toHaveBeenCalledWith(FAVORITES_KEY, "[3,1,2]");
  });
});

describe("isFavorite", () => {
  it("returns true when present", () => {
    expect(isFavorite([4, 5], 4)).toBe(true);
  });

  it("returns false when absent", () => {
    expect(isFavorite([4, 5], 9)).toBe(false);
  });
});
