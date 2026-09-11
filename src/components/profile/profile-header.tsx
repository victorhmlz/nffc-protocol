import type { Profile } from "@domain/profile/profile";
import { Badge } from "@/components/ui";
import { truncateAddress } from "@/lib/format-address";

/**
 * Identity strip for `/profile/[address]` (TASK-27). "Creator" is shown only
 * when this wallet has actually minted something — derived from on-chain
 * activity (`profile.created`), never a self-declared role
 * (`NFFC_Whitepaper.md` §18: role labels "se derivan de actividad on-chain...
 * no son auto-declaradas" — the same rule the upcoming reputation system,
 * TASK-48, will apply, established here first since this is where roles are
 * first surfaced).
 */
export function ProfileHeader({ profile }: { profile: Profile }) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="font-mono text-lg font-semibold tracking-tight" title={profile.address}>
        {truncateAddress(profile.address)}
      </h1>
      <div className="flex flex-wrap items-center gap-2">
        {profile.created.length > 0 && <Badge variant="primary">Creator</Badge>}
        {profile.owned.length > 0 && <Badge variant="outline">Collector</Badge>}
        {profile.created.length === 0 && profile.owned.length === 0 && (
          <Badge variant="neutral">No on-chain activity yet</Badge>
        )}
      </div>
    </header>
  );
}
