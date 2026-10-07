import type { AssetMetadata, AssetProvider } from "../domain/assets/schema";

async function catalogModule() {
  return import("./catalog");
}

export class VerifiedSeedProvider implements AssetProvider {
  readonly id = "verified-seed";
  readonly label = "Local open-license scientific assets";

  async list(): Promise<AssetMetadata[]> {
    return (await catalogModule()).seedCatalog;
  }

  async find(assetId: string): Promise<AssetMetadata | undefined> {
    return (await this.list()).find((asset) => asset.id === assetId);
  }

  async loadSvg(asset: AssetMetadata): Promise<string> {
    return (await catalogModule()).getSeedSvg(asset);
  }
}

export const seedProvider = new VerifiedSeedProvider();
