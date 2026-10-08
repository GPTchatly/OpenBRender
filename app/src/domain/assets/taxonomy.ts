import type { AssetMetadata } from "./schema";

export interface AssetTaxonomyGroup {
  id: string;
  label: string;
  description: string;
  categories: readonly string[];
}

export const assetTaxonomy = [
  {
    id: "cells-organelles",
    label: "Cells & organelles",
    description: "Cells, membranes, organelles, and extracellular structures",
    categories: [
      "Cell culture",
      "Cell lines",
      "Cell types",
      "Cell membrane",
      "Intracellular components",
      "Extracellular matrix",
      "Cells and organelles",
      "Cell scenes",
      "Cellular processes",
    ],
  },
  {
    id: "molecules-genetics",
    label: "Molecules & genetics",
    description: "Nucleic acids, proteins, genetics, and molecular structures",
    categories: [
      "Amino Acids",
      "Genetics",
      "Genomics",
      "Epigenetics",
      "Nucleic acids",
      "Peptides",
      "Receptors channels",
      "Molecular modelling",
      "Proteins",
      "Molecules",
    ],
  },
  {
    id: "microbes-viruses",
    label: "Microbes & viruses",
    description: "Microbiology and virology",
    categories: ["Microbiology", "Parasites", "Viruses"],
  },
  {
    id: "anatomy-organisms",
    label: "Anatomy & organisms",
    description: "Physiology, tissues, immune biology, animals, and plants",
    categories: [
      "Human physiology",
      "Neuroscience",
      "Oncology",
      "Tissues",
      "Blood Immunology",
      "Animals",
      "Arthropods",
      "Other organisms",
      "Plants Algae",
      "People Other",
    ],
  },
  {
    id: "lab-imaging",
    label: "Lab & imaging",
    description: "Laboratory equipment, microscopy, and scientific plots",
    categories: ["Lab apparatus", "Imaging", "Procedures", "Scientific graphs"],
  },
  {
    id: "chemistry-materials",
    label: "Chemistry & materials",
    description: "Chemistry and nanoscale materials",
    categories: ["Chemistry", "Nanotechnology"],
  },
  {
    id: "computation-data",
    label: "Computation & data",
    description: "Bioinformatics, machine learning, and computing",
    categories: [
      "Machine Learning",
      "Chemo and Bioinformatics",
      "Computer hardware",
    ],
  },
  {
    id: "safety-general",
    label: "Safety & general",
    description: "Safety marks and general scientific symbols",
    categories: ["Safety symbols", "General items"],
  },
] as const satisfies readonly AssetTaxonomyGroup[];

export type AssetTaxonomyId = (typeof assetTaxonomy)[number]["id"];

const groupsById = new Map<string, AssetTaxonomyGroup>(
  assetTaxonomy.map((group) => [group.id, group]),
);
const groupByCategory = new Map<string, AssetTaxonomyGroup>(
  assetTaxonomy.flatMap((group) =>
    group.categories.map((category) => [category, group] as const),
  ),
);

export function getAssetTaxonomyGroup(id: string) {
  return groupsById.get(id);
}

export function getAssetTaxonomyForCategory(category: string) {
  return groupByCategory.get(category);
}

export interface AssetShelf {
  category: string;
  assets: AssetMetadata[];
}

export interface AssetTopicShelves {
  id: string;
  label: string;
  count: number;
  shelves: AssetShelf[];
}

const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });
const topicOrder = new Map<string, number>(
  assetTaxonomy.map((group, index) => [group.id, index]),
);
const topicIndex = (asset: AssetMetadata) =>
  topicOrder.get(getAssetTaxonomyForCategory(asset.category)?.id ?? "") ??
  assetTaxonomy.length;

const nihFirst = (asset: AssetMetadata) =>
  asset.source.provider === "NIH BioArt Source" ? 0 : 1;

/** Browsing order: topic, then category name, NIH BioArt drawings first, then drawing title. */
export function compareAssetsByTaxonomy(left: AssetMetadata, right: AssetMetadata) {
  return (
    topicIndex(left) - topicIndex(right) ||
    collator.compare(left.category, right.category) ||
    nihFirst(left) - nihFirst(right) ||
    collator.compare(left.title, right.title)
  );
}

/**
 * Groups drawings into topic sections of category shelves. Topics, shelves and
 * drawings keep their first-appearance order, so ranked search results put the
 * shelf holding the best match first.
 */
export function groupAssetsByTopic(assets: readonly AssetMetadata[]): AssetTopicShelves[] {
  const topics = new Map<string, AssetTopicShelves & { byCategory: Map<string, AssetShelf> }>();
  for (const asset of assets) {
    const group = getAssetTaxonomyForCategory(asset.category);
    const id = group?.id ?? "other";
    let topic = topics.get(id);
    if (!topic) {
      topic = { id, label: group?.label ?? "Other", count: 0, shelves: [], byCategory: new Map() };
      topics.set(id, topic);
    }
    let shelf = topic.byCategory.get(asset.category);
    if (!shelf) {
      shelf = { category: asset.category, assets: [] };
      topic.byCategory.set(asset.category, shelf);
      topic.shelves.push(shelf);
    }
    shelf.assets.push(asset);
    topic.count++;
  }
  return [...topics.values()].map(({ byCategory, ...topic }) => {
    void byCategory;
    return topic;
  });
}
