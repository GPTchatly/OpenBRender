const STORAGE_KEY = "openbiofigure:asset-library:v1";
export const assetLibraryChangeEvent = "openbiofigure:asset-library-change";
const RECENT_LIMIT = 24;

export interface AssetLibraryState {
  favorites: string[];
  recent: string[];
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const EMPTY_STATE: AssetLibraryState = { favorites: [], recent: [] };

function validIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter((item): item is string => typeof item === "string"),
    ),
  ];
}

export function loadAssetLibraryState(storage: StorageLike): AssetLibraryState {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? "{}") as {
      favorites?: unknown;
      recent?: unknown;
    };
    return {
      favorites: validIds(parsed.favorites),
      recent: validIds(parsed.recent).slice(0, RECENT_LIMIT),
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

export function saveAssetLibraryState(
  storage: StorageLike,
  state: AssetLibraryState,
): AssetLibraryState {
  const normalized = {
    favorites: validIds(state.favorites),
    recent: validIds(state.recent).slice(0, RECENT_LIMIT),
  };
  storage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function toggleFavorite(
  state: AssetLibraryState,
  assetId: string,
): AssetLibraryState {
  return {
    ...state,
    favorites: state.favorites.includes(assetId)
      ? state.favorites.filter((id) => id !== assetId)
      : [assetId, ...state.favorites],
  };
}

export function recordRecentAsset(
  state: AssetLibraryState,
  assetId: string,
): AssetLibraryState {
  return {
    ...state,
    recent: [assetId, ...state.recent.filter((id) => id !== assetId)].slice(
      0,
      RECENT_LIMIT,
    ),
  };
}

export const assetLibraryStorageKey = STORAGE_KEY;
