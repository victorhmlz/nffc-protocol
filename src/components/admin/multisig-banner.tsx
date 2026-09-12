import { Badge } from "@/components/ui";

/**
 * Shown on every `/admin/*` page (TASK-31). The acceptance criterion —
 * "Toda acción administrativa sensible pasa por multisig, nunca por una sola
 * clave" (`docs/spec/08-security-principles.md` S8) — is an operational fact
 * about which address a role is granted to at deploy time, not something any
 * client-side check can enforce against a contract that doesn't exist yet
 * (`docs/admin.md`). This banner is this panel's honest answer: make the
 * requirement visible everywhere, rather than fabricate a role check with
 * nothing real to check against.
 */
export function MultisigBanner() {
  return (
    <div
      role="note"
      className="flex items-center gap-3 rounded-md border border-border bg-status-warning/15 p-3 text-sm"
    >
      <Badge variant="warning">Multisig required</Badge>
      <span>
        In production, every admin role here is held by the protocol multisig — never a single key
        (S8).
      </span>
    </div>
  );
}
