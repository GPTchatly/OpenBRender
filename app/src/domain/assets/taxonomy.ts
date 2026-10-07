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
