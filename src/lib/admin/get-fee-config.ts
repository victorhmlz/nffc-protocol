import type { FeeConfigSnapshot } from "@/lib/admin/types";
import { FIXTURE_FEE_CONFIG } from "@/lib/admin/fixture-fee-config";

export type GetFeeConfig = () => Promise<FeeConfigSnapshot>;

export const getFeeConfig: GetFeeConfig = async () => FIXTURE_FEE_CONFIG;
