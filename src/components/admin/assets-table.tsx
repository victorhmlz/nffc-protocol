"use client";

import type { useWriteContract } from "wagmi";
import type { AssetIdentity } from "@domain/registry/types";
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

// No deployed AssetIdentityRegistry yet (TASK-36) — same honest fixture
// pattern every write in this codebase uses; REGISTRY_ADMIN_ROLE-only in the
// real contract.
function simulateSetAssetStatusFixture(): Promise<void> {
  return Promise.reject(
    new Error("AssetIdentityRegistry is not deployed yet (TASK-36) — changing asset status is unavailable."),
  );
}
type WriteContractParams = Parameters<ReturnType<typeof useWriteContract>["writeContract"]>[0];

function buildSetAssetStatusCallFixture(): WriteContractParams {
  throw new Error("unreachable — simulateSetAssetStatusFixture always rejects until deployed (TASK-36)");
}

export function AssetsTable({ assets }: { readonly assets: readonly AssetIdentity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assets</CardTitle>
      </CardHeader>
      <CardContent>
        {assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assets registered yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((a) => (
                <TableRow key={a.assetId}>
                  <TableCell className="font-medium">{a.symbol}</TableCell>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>{a.assetClass}</TableCell>
                  <TableCell>
                    <Badge variant={a.status === "ACTIVE" ? "gain" : "neutral"}>{a.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusToggleButton
                      label={a.symbol}
                      isActive={a.status === "ACTIVE"}
                      simulate={simulateSetAssetStatusFixture}
                      buildCall={buildSetAssetStatusCallFixture}
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
