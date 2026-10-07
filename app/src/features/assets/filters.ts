import type { AssetFilters } from "../../domain/assets/search";

export const DEFAULT_ASSET_FILTERS: AssetFilters = {
  query: "",
  taxonomy: "",
  category: "",
  provider: "",
  license: "",
  attribution: "all",
};
