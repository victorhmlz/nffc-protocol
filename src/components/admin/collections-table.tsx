import Link from "next/link";
import type { CollectionOverview } from "@domain/admin/admin";
import {
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
import { truncateAddress } from "@/lib/format-address";

/** Every collection with at least one indexed NFFC, protocol-wide — not
 *  filtered to one wallet, unlike `/profile/[address]`'s own collections
 *  facet (TASK-27). Links each creator to their profile (TASK-27, live). */
export function CollectionsTable({ collections }: { readonly collections: readonly CollectionOverview[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Collections</CardTitle>
      </CardHeader>
      <CardContent>
        {collections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No collections indexed yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Creator</TableHead>
                <TableHead numeric>NFFCs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((c) => (
                <TableRow key={c.collectionId}>
                  <TableCell>{c.collectionName}</TableCell>
                  <TableCell className="font-mono">
                    <Link href={`/profile/${c.creatorAddress}`} className="hover:underline">
                      {truncateAddress(c.creatorAddress)}
                    </Link>
                  </TableCell>
                  <TableCell numeric>{c.nffcCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
