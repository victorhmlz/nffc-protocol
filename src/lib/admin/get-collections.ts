import { listAllCollections, type CollectionOverview } from "@domain/admin/admin";
import { FIXTURE_LISTINGS } from "@/lib/marketplace/fixture-listings";

export type GetAllCollections = () => Promise<readonly CollectionOverview[]>;

export const getAllCollections: GetAllCollections = async () => listAllCollections(FIXTURE_LISTINGS);
