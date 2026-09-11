import type { Metadata } from "next";
import Link from "next/link";
import { isAddress } from "viem";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { ProfileHeader } from "@/components/profile/profile-header";
import { CollectionsList } from "@/components/profile/collections-list";
import { NffcSummaryGrid } from "@/components/nffc/nffc-summary-grid";
import { ActivityTimeline } from "@/components/nffc/activity-timeline";
import { getProfile } from "@/lib/profile/get-profile";
import { truncateAddress } from "@/lib/format-address";

// Classic ISR, same shape as `/nffc/[tokenId]` (TASK-21): no
// `generateStaticParams`/`searchParams`, so this isn't forced into
// per-request dynamic rendering (`docs/OPEN_ISSUES.md` Issue #5 doesn't
// apply here) — every address is server-rendered on first visit and cached
// as static HTML for `revalidate` seconds after.
export const revalidate = 300;

interface PageParams {
  readonly address: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { address } = await params;
  if (!isAddress(address)) return {};
  return {
    title: truncateAddress(address),
    description: `Creator and collector profile for ${address} on NFFC Protocol.`,
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { address } = await params;
  if (!isAddress(address)) notFound();

  const profile = await getProfile(address);

  return (
    <Container className="flex flex-col gap-8 py-10">
      <ProfileHeader profile={profile} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <CollectionsList collections={profile.collections} />
        <div className="lg:col-span-2">
          <ActivityTimeline activity={profile.recentActivity} showTokenLinks title="Recent activity" />
          {profile.recentActivity.length > 0 && (
            <Link
              href={`/activity?wallet=${address}`}
              className="mt-2 inline-block text-xs text-subtle-foreground hover:underline"
            >
              See full activity →
            </Link>
          )}
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight">Created ({profile.created.length})</h2>
        <NffcSummaryGrid items={profile.created} emptyLabel="Hasn't minted an NFFC yet." />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight">Owned ({profile.owned.length})</h2>
        <NffcSummaryGrid items={profile.owned} emptyLabel="Doesn't hold any NFFCs yet." />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-tight">Listed ({profile.listed.length})</h2>
        <NffcSummaryGrid items={profile.listed} emptyLabel="Nothing currently listed for sale." />
      </section>
    </Container>
  );
}
