import type { AssetSearchResult } from "@domain/search/search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

export function AssetResultsList({ assets }: { readonly assets: readonly AssetSearchResult[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assets</CardTitle>
      </CardHeader>
      <CardContent>
        {assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No matching assets.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {assets.map((a) => (
              <li key={a.assetId} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{a.assetSymbol}</span>
                <span className="text-xs text-subtle-foreground">
                  {a.assetClass === "EQUITY" ? "Stock Token" : "Crypto"} · {a.nffcCount} NFFC
                  {a.nffcCount === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
