import { ACTIVITY_MAX_PAGE_SIZE } from "@domain/activity/activity";
import { buildProtocolReport, type ProtocolReport } from "@domain/admin/admin";
import { FIXTURE_LISTINGS } from "@/lib/marketplace/fixture-listings";
import { getActivityFeed } from "@/lib/activity/get-activity";

export type GetProtocolReport = () => Promise<ProtocolReport>;

export const getProtocolReport: GetProtocolReport = async () => {
  const activity = await getActivityFeed({ filter: {}, page: 1, pageSize: ACTIVITY_MAX_PAGE_SIZE });
  return buildProtocolReport(FIXTURE_LISTINGS, activity.items);
};
