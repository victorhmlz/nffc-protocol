import type { AssetIdentity } from "@domain/registry/types";
import { FIXTURE_ASSETS } from "@/lib/admin/fixture-registry";

export type GetAssets = () => Promise<readonly AssetIdentity[]>;

export const getAssets: GetAssets = async () => FIXTURE_ASSETS;
