import type { AssetMetadata } from "./schema";
import { getAssetTaxonomyForCategory, getAssetTaxonomyGroup } from "./taxonomy";

export interface AssetFilters {
  query: string;
  taxonomy?: string;
  category: string;
  provider: string;
  license: string;
  attribution: "all" | "required" | "not-required";
}

const normalize = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .trim();

const collator = new Intl.Collator("en", { sensitivity: "base" });

const synonyms = [
  ["mitochondria", "mitochondrion", "mitochondrial"],
  ["cell", "cells", "cellular"],
  ["antibody", "antibodies", "immunoglobulin", "immunoglobulins"],
  ["bacterium", "bacteria", "bacterial"],
  ["virus", "viruses", "viral"],
  ["neuron", "neurons", "neural", "neuronal"],
  ["dna", "deoxyribonucleic"],
  ["rna", "ribonucleic"],
  ["microscope", "microscopes", "microscopy", "imaging"],
  ["protein", "proteins", "peptide", "peptides"],
  ["nucleus", "nuclei", "nuclear"],
  ["mouse", "mice", "murine"],
] as const;

const synonymLookup = new Map<string, readonly string[]>();
for (const group of synonyms) {
  for (const term of group) synonymLookup.set(term, group);
}

interface SearchDocument {
  haystack: string;
  title: string;
  description: string;
  category: string;
  provider: string;
  keywords: string[];
}

const searchDocuments = new WeakMap<AssetMetadata, SearchDocument>();

function createSearchDocument(asset: AssetMetadata): SearchDocument {
  const taxonomy = getAssetTaxonomyForCategory(asset.category);
  const searchableValues = [
    asset.title,
    asset.description,
    asset.category,
    asset.source.provider,
    ...asset.keywords,
    taxonomy?.label ?? "",
    taxonomy?.description ?? "",
  ].map(normalize);
  const expanded = new Set(searchableValues);
  for (const value of searchableValues) {
    for (const word of value.split(/\s+/)) {
      for (const synonym of synonymLookup.get(word) ?? [])
        expanded.add(synonym);
    }
  }
  return {
    haystack: [...expanded].join(" "),
    title: normalize(asset.title),
    description: normalize(asset.description),
    category: normalize(asset.category),
    provider: normalize(asset.source.provider),
    keywords: asset.keywords.map(normalize),
  };
}

function getSearchDocument(asset: AssetMetadata) {
  const cached = searchDocuments.get(asset);
  if (cached) return cached;
  const document = createSearchDocument(asset);
  searchDocuments.set(asset, document);
  return document;
}

function relevance(asset: AssetMetadata, terms: string[]): number {
  if (!terms.length) return 0;
  const { title, description, category, provider, keywords } =
    getSearchDocument(asset);

  return terms.reduce((score, term) => {
    if (title === term) return score;
    if (title.startsWith(term)) return score + 10;
    if (title.includes(term)) return score + 20;
    if (keywords.includes(term)) return score + 30;
    if (keywords.some((keyword) => keyword.startsWith(term))) return score + 40;
    if (keywords.some((keyword) => keyword.includes(term))) return score + 50;
    if (category.includes(term)) return score + 60;
    if (provider.includes(term)) return score + 70;
    if (description.includes(term)) return score + 80;
    return score + 100;
  }, 0);
}

export function searchAssets(
  assets: AssetMetadata[],
  filters: AssetFilters,
): AssetMetadata[] {
  const query = normalize(filters.query);
  const terms = query.split(/\s+/).filter(Boolean);

  const matches = assets.filter((asset) => {
    const { haystack } = getSearchDocument(asset);
    const matchesQuery = terms.every((term) => haystack.includes(term));
    const taxonomy = getAssetTaxonomyGroup(filters.taxonomy ?? "");
    const matchesTaxonomy =
      !taxonomy || taxonomy.categories.includes(asset.category);
    const matchesCategory =
      !filters.category || asset.category === filters.category;
    const matchesProvider =
      !filters.provider || asset.source.provider === filters.provider;
    const matchesLicense =
      !filters.license || asset.license.id === filters.license;
    const matchesAttribution =
      filters.attribution === "all" ||
      (filters.attribution === "required" &&
        asset.license.attributionRequired) ||
      (filters.attribution === "not-required" &&
        !asset.license.attributionRequired);
    return (
      matchesQuery &&
      matchesTaxonomy &&
      matchesCategory &&
      matchesProvider &&
      matchesLicense &&
      matchesAttribution
    );
  });

  if (!terms.length) return matches;

  return [...matches].sort((left, right) => {
    const score = relevance(left, terms) - relevance(right, terms);
    return score || collator.compare(left.title, right.title);
  });
}
