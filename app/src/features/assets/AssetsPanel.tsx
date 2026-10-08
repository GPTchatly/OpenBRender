import {
  Atom,
  Bug,
  Binary,
  Boxes,
  ChevronDown,
  ChevronRight,
  BarChart3,
  CircleDotDashed,
  Clock3,
  Dna,
  FilePlus2,
  FlaskConical,
  HeartPulse,
  Library,
  PanelTop,
  Ruler,
  Search,
  ShieldCheck,
  Star,
  Upload,
  Waves,
  X,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { getSeedAssetUrl, seedCatalog } from "../../assets/catalog";
import { FormField } from "../../components/ui/FormField";
import { IconButton } from "../../components/ui/IconButton";
import {
  assetLibraryChangeEvent,
  loadAssetLibraryState,
  saveAssetLibraryState,
  toggleFavorite,
} from "../../domain/assets/libraryState";
import { searchAssets, type AssetFilters } from "../../domain/assets/search";
import type { AssetMetadata } from "../../domain/assets/schema";
import {
  assetTaxonomy,
  compareAssetsByTaxonomy,
  groupAssetsByTopic,
} from "../../domain/assets/taxonomy";
import type { ScientificElementKind } from "../../domain/scientific/elements";
import { t, type Locale } from "../../i18n/messages";
import { DEFAULT_ASSET_FILTERS } from "./filters";

type AssetScope = "all" | "favorites" | "recent";
const SHELF_PREVIEW_SIZE = 4;
const noToggledShelves: ReadonlySet<string> = new Set();

const topicIcons = {
  "cells-organelles": Boxes,
  "molecules-genetics": Atom,
  "microbes-viruses": Bug,
  "anatomy-organisms": HeartPulse,
  "lab-imaging": FlaskConical,
  "chemistry-materials": Atom,
  "computation-data": Binary,
  "safety-general": ShieldCheck,
} as const;

interface AssetsPanelProps {
  locale: Locale;
  filters: AssetFilters;
  setFilters: (filters: AssetFilters) => void;
  onAdd: (asset: AssetMetadata) => void | Promise<void>;
  onInsertScientific: (kind: ScientificElementKind) => void | Promise<void>;
  onCreateChart: () => void;
  onFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onRequestFile?: () => void;
}

export function AssetsPanel({
  locale,
  filters,
  setFilters,
  onAdd,
  onInsertScientific,
  onCreateChart,
  onFile,
  onRequestFile,
}: AssetsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [scope, setScope] = useState<AssetScope>("all");
  const shelfIdPrefix = useId();
  const [pendingAssets, setPendingAssets] = useState<Set<string>>(() => new Set());
  const insertAsset = async (asset: AssetMetadata) => {
    if (pendingAssets.has(asset.id)) return;
    setPendingAssets(previous => new Set([...previous, asset.id]));
    try { await onAdd(asset); }
    finally { setPendingAssets(previous => { const next = new Set(previous); next.delete(asset.id); return next; }); }
  };
  const [libraryState, setLibraryState] = useState(() =>
    loadAssetLibraryState(window.localStorage),
  );
  const deferredFilters = useDeferredValue(filters);
  const scopedAssets = useMemo(() => {
    if (scope === "all") return seedCatalog;
    const ids =
      scope === "favorites" ? libraryState.favorites : libraryState.recent;
    const byId = new Map(seedCatalog.map((asset) => [asset.id, asset]));
    return ids.flatMap((id) => {
      const asset = byId.get(id);
      return asset ? [asset] : [];
    });
  }, [libraryState, scope]);
  const results = useMemo(
    () => searchAssets(scopedAssets, deferredFilters),
    [deferredFilters, scopedAssets],
  );
  const searching = deferredFilters.query.trim() !== "";
  // Browsing the whole library reads in topic/category/title order; ranked
  // search results and the personal lists keep their own order.
  const topics = useMemo(
    () =>
      groupAssetsByTopic(
        scope === "all" && !searching
          ? [...results].sort(compareAssetsByTaxonomy)
          : results,
      ),
    [results, scope, searching],
  );
  const shelfCount = topics.reduce((sum, topic) => sum + topic.shelves.length, 0);
  // Shelves start closed while browsing the full library and open once the
  // view is narrowed; a click inverts that default for one shelf.
  const shelvesOpenByDefault = scope !== "all" || searching || shelfCount === 1;
  const [shelfToggles, setShelfToggles] = useState({
    openByDefault: false,
    categories: noToggledShelves,
  });
  const toggledShelves =
    shelfToggles.openByDefault === shelvesOpenByDefault
      ? shelfToggles.categories
      : noToggledShelves;
  const toggleShelf = (category: string) =>
    setShelfToggles((previous) => {
      const next = new Set<string>(
        previous.openByDefault === shelvesOpenByDefault ? previous.categories : [],
      );
      if (!next.delete(category)) next.add(category);
      return { openByDefault: shelvesOpenByDefault, categories: next };
    });
  // A new search or view starts at its first shelf, not mid-way down the last one.
  useEffect(() => {
    resultsRef.current?.scrollTo({ top: 0 });
  }, [deferredFilters, scope]);
  const categories = [
    ...new Set(seedCatalog.map((asset) => asset.category)),
  ].sort((left, right) => left.localeCompare(right));
  const providers = [
    ...new Set(seedCatalog.map((asset) => asset.source.provider)),
  ].sort((left, right) => left.localeCompare(right));
  const licenses = [
    ...new Set(seedCatalog.map((asset) => asset.license.id)),
  ].sort((left, right) => left.localeCompare(right));

  useEffect(() => {
    const syncLibraryState = () =>
      setLibraryState(loadAssetLibraryState(window.localStorage));
    window.addEventListener("storage", syncLibraryState);
    window.addEventListener(assetLibraryChangeEvent, syncLibraryState);
    return () => {
      window.removeEventListener("storage", syncLibraryState);
      window.removeEventListener(assetLibraryChangeEvent, syncLibraryState);
    };
  }, []);

  const updateFavorite = (assetId: string) => {
    try {
      const next = saveAssetLibraryState(
        window.localStorage,
        toggleFavorite(libraryState, assetId),
      );
      setLibraryState(next);
      window.dispatchEvent(new Event(assetLibraryChangeEvent));
    } catch {
      // Browsers can deny local storage in hardened privacy modes. The catalog
      // remains usable even when personal library state cannot be persisted.
    }
  };

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey)
        return;
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      )
        return;
      event.preventDefault();
      searchInputRef.current?.focus();
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const renderAssetCard = (asset: AssetMetadata) => (
    <article
      className="asset-card"
      data-asset-id={asset.id}
      key={asset.id}
      title={`${asset.title}\n${asset.source.provider} · ${asset.license.name}`}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData(
          "application/x-openbiofigure-asset",
          asset.id,
        );
      }}
      aria-busy={pendingAssets.has(asset.id)}
      onDoubleClick={event => {
        if ((event.target as HTMLElement).closest("button")) return;
        void insertAsset(asset);
      }}
    >
      <div className="asset-thumb" aria-hidden="true">
        <img src={getSeedAssetUrl(asset)} alt="" loading="lazy" />
        {asset.license.attributionRequired && (
          <span className="credit-flag">credit</span>
        )}
      </div>
      <div className="asset-card-copy">
        <strong>{asset.title}</strong>
        {pendingAssets.has(asset.id) && <span role="status">Loading drawing…</span>}
        <span className="visually-hidden">
          {asset.source.provider} · {asset.license.id}
          {asset.license.attributionRequired && " · credit required"}
        </span>
      </div>
      <div className="asset-actions">
        <button
          type="button"
          className={`asset-favorite${libraryState.favorites.includes(asset.id) ? " active" : ""}`}
          onClick={() => updateFavorite(asset.id)}
          aria-pressed={libraryState.favorites.includes(asset.id)}
          aria-label={`${t(locale, "favoriteAsset")}: ${asset.title}`}
          title={t(locale, "favoriteAsset")}
        >
          <Star />
        </button>
        <button
          type="button"
          className="asset-add"
          disabled={pendingAssets.has(asset.id)}
          onClick={() => void insertAsset(asset)}
          aria-label={`${t(locale, "addToCanvas")}: ${asset.title}`}
          title={t(locale, "addToCanvas")}
        >
          <FilePlus2 />
        </button>
      </div>
    </article>
  );

  return (
    <aside className="left-panel" aria-label="Scientific asset library">
      <div className="panel-heading">
        <h2>{t(locale, "assets")}</h2>
        <span className="count-badge" title="Bundled scientific drawings">
          {seedCatalog.length}
        </span>
      </div>
      <div className="search-control">
        <Search aria-hidden="true" />
        <input
          ref={searchInputRef}
          aria-label={t(locale, "searchAssets")}
          placeholder={t(locale, "searchAssets")}
          value={filters.query}
          onChange={(event) =>
            setFilters({ ...filters, query: event.currentTarget.value })
          }
        />
        {filters.query && (
          <IconButton
            label={t(locale, "clearSearch")}
            onClick={() => setFilters({ ...filters, query: "" })}
          >
            <X />
          </IconButton>
        )}
      </div>
      <p className="asset-pack-note">Open-license scientific drawings. CC BY artwork requires credit; download it from License. Check scientific suitability for your figure.</p>
      <div className="asset-scopes" aria-label={t(locale, "assetViews")}>
        {(
          [
            ["all", Library, t(locale, "allAssets")],
            ["favorites", Star, t(locale, "favorites")],
            ["recent", Clock3, t(locale, "recentAssets")],
          ] as const
        ).map(([value, Icon, label]) => (
          <button
            type="button"
            key={value}
            className={scope === value ? "active" : undefined}
            aria-pressed={scope === value}
            onClick={() => setScope(value)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <details className="asset-topics">
        <summary>
          <span>Browse topics</span>
          {filters.taxonomy ? (
            <span
              className="active-filter-dot"
              aria-label="Topic filter active"
            />
          ) : null}
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="asset-topic-grid">
          {assetTaxonomy.map((topic) => {
            const Icon = topicIcons[topic.id];
            const active = filters.taxonomy === topic.id;
            return (
              <button
                type="button"
                key={topic.id}
                className={active ? "active" : undefined}
                aria-pressed={active}
                title={topic.description}
                onClick={() =>
                  setFilters({
                    ...filters,
                    taxonomy: active ? "" : topic.id,
                    category: "",
                  })
                }
              >
                <Icon aria-hidden="true" />
                <span>{topic.label}</span>
              </button>
            );
          })}
        </div>
      </details>
      <details className="science-tools">
        <summary>
          <span>{t(locale, "scientificDrawing")}</span>
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="science-tool-grid">
          {(
            [
              ["cell", CircleDotDashed, "Cell"],
              ["membrane", Waves, "Membrane"],
              ["dna", Dna, "DNA"],
              ["panel", PanelTop, "Panel"],
              ["scale-bar", Ruler, "Scale bar"],
            ] as const
          ).map(([kind, Icon, label]) => (
            <button
              type="button"
              key={kind}
              title={`Add editable ${label.toLocaleLowerCase("en")}`}
              onClick={() => void onInsertScientific(kind)}
              data-testid={`add-scientific-${kind}`}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
          <button
            type="button"
            title="Create an editable chart"
            onClick={onCreateChart}
            data-testid="create-chart"
          >
            <BarChart3 aria-hidden="true" />
            <span>Chart</span>
          </button>
        </div>
      </details>
      <details className="filters">
        <summary>
          <span>{t(locale, "filters")}</span>
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="filter-grid">
          <FormField label={t(locale, "category")}>
            <select
              value={filters.category}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  taxonomy: "",
                  category: event.currentTarget.value,
                })
              }
            >
              <option value="">{t(locale, "all")}</option>
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t(locale, "source")}>
            <select
              value={filters.provider}
              onChange={(event) =>
                setFilters({ ...filters, provider: event.currentTarget.value })
              }
            >
              <option value="">{t(locale, "all")}</option>
              {providers.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t(locale, "license")}>
            <select
              value={filters.license}
              onChange={(event) =>
                setFilters({ ...filters, license: event.currentTarget.value })
              }
            >
              <option value="">{t(locale, "all")}</option>
              {licenses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </FormField>
          <FormField label={t(locale, "attribution")}>
            <select
              value={filters.attribution}
              onChange={(event) =>
                setFilters({
                  ...filters,
                  attribution: event.currentTarget
                    .value as AssetFilters["attribution"],
                })
              }
            >
              <option value="all">{t(locale, "all")}</option>
              <option value="required">{t(locale, "required")}</option>
              <option value="not-required">{t(locale, "notRequired")}</option>
            </select>
          </FormField>
        </div>
      </details>
      <div
        ref={resultsRef}
        className="asset-results"
        aria-busy={deferredFilters !== filters}
      >
        {/* Only the count is announced; opening a shelf must not read out every drawing. */}
        <div className="asset-result-summary" aria-live="polite">
          <span>
            {results.length} {t(locale, "results")}
          </span>
          <span>Drag or double-click to insert</span>
        </div>
        {topics.map((topic, topicIndex) => (
          <section
            className="asset-topic-section"
            key={topic.id}
            aria-labelledby={`${shelfIdPrefix}-topic-${topicIndex}`}
          >
            <h3 id={`${shelfIdPrefix}-topic-${topicIndex}`}>
              <span>{topic.label}</span>
              <span className="asset-topic-count">{topic.count}</span>
            </h3>
            {topic.shelves.map((shelf, shelfIndex) => {
              const open = shelvesOpenByDefault !== toggledShelves.has(shelf.category);
              const gridId = `${shelfIdPrefix}-shelf-${topicIndex}-${shelfIndex}`;
              return (
                <section className="asset-shelf" key={shelf.category}>
                  <button
                    type="button"
                    className="asset-shelf-header"
                    aria-label={`${shelf.category}, ${shelf.assets.length} drawings`}
                    aria-expanded={open}
                    aria-controls={open ? gridId : undefined}
                    onClick={(event) => {
                      const header = event.currentTarget;
                      toggleShelf(shelf.category);
                      // Closing a long shelf from its pinned header would leave
                      // the reader far below it; bring the header back into view.
                      if (open)
                        requestAnimationFrame(() =>
                          header.scrollIntoView({ block: "nearest" }),
                        );
                    }}
                  >
                    <ChevronRight aria-hidden="true" />
                    <span className="asset-shelf-name">{shelf.category}</span>
                    <span className="asset-shelf-count">{shelf.assets.length}</span>
                    {!open && (
                      <span className="asset-shelf-preview" aria-hidden="true">
                        {shelf.assets.slice(0, SHELF_PREVIEW_SIZE).map((asset) => (
                          <img
                            key={asset.id}
                            src={getSeedAssetUrl(asset)}
                            alt=""
                            loading="lazy"
                          />
                        ))}
                      </span>
                    )}
                  </button>
                  {open && (
                    <div className="asset-shelf-grid" id={gridId}>
                      {shelf.assets.map(renderAssetCard)}
                    </div>
                  )}
                </section>
              );
            })}
          </section>
        ))}
        {!results.length && (
          <div className="empty-state">
            <Search />
            <p>
              {scope === "favorites"
                ? t(locale, "noFavoriteAssets")
                : scope === "recent"
                  ? t(locale, "noRecentAssets")
                  : t(locale, "noResults")}
            </p>
            <button
              type="button"
              className="text-button"
              onClick={() => setFilters(DEFAULT_ASSET_FILTERS)}
            >
              {t(locale, "clearFilters")}
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        className="import-button"
        onClick={onRequestFile ?? (() => fileInputRef.current?.click())}
      >
        <Upload aria-hidden="true" /> {t(locale, "importLocalSvg")}
      </button>
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept="image/svg+xml,.svg"
        onChange={onFile}
      />
    </aside>
  );
}
