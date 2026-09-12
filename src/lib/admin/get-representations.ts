import type { Representation } from "@domain/registry/types";
import { FIXTURE_REPRESENTATIONS } from "@/lib/admin/fixture-registry";

export type GetRepresentations = () => Promise<readonly Representation[]>;

export const getRepresentations: GetRepresentations = async () => FIXTURE_REPRESENTATIONS;
