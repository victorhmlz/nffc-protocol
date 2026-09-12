"use client";

import type { useWriteContract } from "wagmi";
import type { Representation } from "@domain/registry/types";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { StatusToggleButton } from "@/components/admin/status-toggle-button";
import { truncateAddress } from "@/lib/format-address";

// No deployed RepresentationRegistry yet (TASK-36) — same honest fixture
// pattern every write in this codebase uses; REGISTRY_ADMIN_ROLE (or the
// provider's adapter) in the real contract.
function simulateSetRepresentationStatusFixture(): Promise<void> {
  return Promise.reject(
    new Error("RepresentationRegistry is not deployed yet (TASK-36) — changing representation status is unavailable."),
  );
}

type WriteContractParams = Parameters<ReturnType<typeof useWriteContract>["writeContract"]>[0];

function buildSetRepresentationStatusCallFixture(): WriteContractParams {
  throw new Error("unreachable — simulateSetRepresentationStatusFixture always rejects until deployed (TASK-36)");
}

export function RepresentationsTable({
  representations,
}: {
  readonly representations: readonly Representation[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Representations</CardTitle>
      </CardHeader>
      <CardContent>
        {representations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No representations registered yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {representations.map((r) => (
                <TableRow key={r.representationId}>
                  <TableCell className="font-mono">{truncateAddress(r.token)}</TableCell>
                  <TableCell>{r.providerId}</TableCell>
                  <TableCell>
                    <Badge variant={r.status === "ACTIVE" ? "gain" : "neutral"}>{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusToggleButton
                      label={truncateAddress(r.token)}
                      isActive={r.status === "ACTIVE"}
                      simulate={simulateSetRepresentationStatusFixture}
                      buildCall={buildSetRepresentationStatusCallFixture}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
