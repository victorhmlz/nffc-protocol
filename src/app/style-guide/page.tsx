import type { Metadata } from "next";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet-button";
import { NetworkBanner } from "@/components/wallet/network-banner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ChartFrame,
  ChartLegendItem,
  Container,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Field,
  FieldControl,
  FieldError,
  FieldHint,
  FieldLabel,
  Input,
  Skeleton,
  Sparkline,
  Stat,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  CompositionTable,
  GeoEligibilityNotice,
  NffcArt,
  NffcMarketPanel,
  SegmentBadge,
  StaticRarityStat,
  TransactionStatus,
} from "@/components/ui";
import type {
  NffcMarketSnapshot,
  StaticComponentFact,
} from "@domain/metadata/metadata";
import type { PerformancePoint } from "@domain/valuation/types";
import type { TransactionState } from "@/lib/wallet/transaction-state";

const DEMO_NOW = 1_700_000_000_000; // fixed "now" so the sample ages are stable across builds

const DEMO_COMPONENTS: StaticComponentFact[] = [
  {
    position: 0,
    assetId: "0xnvda" as never,
    assetSymbol: "NVDA",
    assetClass: "EQUITY",
    providerId: "ROBINHOOD" as never,
    representationId: "0xnvdarep" as never,
    weightBps: 6000 as never,
  },
  {
    position: 1,
    assetId: "0xbtc" as never,
    assetSymbol: "BTC",
    assetClass: "CRYPTO",
    providerId: "CRYPTO_NATIVE" as never,
    representationId: "0xbtcrep" as never,
    weightBps: 4000 as never,
  },
];

const DEMO_PERFORMANCE: PerformancePoint[] = (
  [
    ["1D", 0.042],
    ["7D", -0.061],
    ["30D", 0.118],
    ["SINCE_MINT", 0.5],
  ] as const
).map(([window, change]) => ({
  window,
  change,
  from: {
    tokenId: "1" as never,
    value: 100,
    at: (DEMO_NOW / 1000 - 300) as never,
    degraded: false,
  },
  to: {
    tokenId: "1" as never,
    value: 124.8,
    at: (DEMO_NOW / 1000 - 120) as never,
    degraded: false,
  },
}));

const DEMO_SNAPSHOT_OK: NffcMarketSnapshot = {
  tokenId: "1",
  referenceNav: {
    value: 12480.42,
    source: "chainlink:0xfeed…",
    observedAt: DEMO_NOW / 1000 - 120,
    stale: false,
  },
  components: [],
  performance: DEMO_PERFORMANCE,
  asOf: DEMO_NOW / 1000,
  degraded: false,
};

const DEMO_SNAPSHOT_STALE: NffcMarketSnapshot = {
  ...DEMO_SNAPSHOT_OK,
  referenceNav: { ...DEMO_SNAPSHOT_OK.referenceNav!, stale: true },
  degraded: true,
};

const DEMO_SNAPSHOT_UNAVAILABLE: NffcMarketSnapshot = {
  tokenId: "1",
  referenceNav: null,
  components: [],
  performance: [],
  asOf: DEMO_NOW / 1000,
  degraded: true,
  unavailableReason:
    "Reference NAV and prices are available once the price and NAV engines are deployed (TASK-22/23).",
};

const ART_SEED =
  "0x9f8e7d6c5b4a39281706f5e4d3c2b1a0ffeeddccbbaa99887766554433221100";
const ART_SAMPLES: {
  label: string;
  input: Parameters<typeof NffcArt>[0]["input"];
}[] = [
  {
    label: "1 component",
    input: {
      seed: ART_SEED,
      components: [{ assetId: "0xA", weightBps: 10000 }],
    },
  },
  {
    label: "2 components · 60 / 40",
    input: {
      seed: ART_SEED,
      components: [
        { assetId: "0xNVDA", weightBps: 6000 },
        { assetId: "0xBTC", weightBps: 4000 },
      ],
    },
  },
  {
    label: "5 components",
    input: {
      seed: ART_SEED,
      components: [
        { assetId: "0xA", weightBps: 3500 },
        { assetId: "0xB", weightBps: 2500 },
        { assetId: "0xC", weightBps: 2000 },
        { assetId: "0xD", weightBps: 1500 },
        { assetId: "0xE", weightBps: 500 },
      ],
    },
  },
  {
    label: "10 components · even",
    input: {
      seed: ART_SEED,
      components: Array.from({ length: 10 }, (_, i) => ({
        assetId: `0x${i.toString(16)}`,
        weightBps: 1000,
      })),
    },
  },
];

export const metadata: Metadata = { title: "Style Guide" };

const TREND = [12, 14, 13, 16, 15, 18, 17, 21, 20, 24];
const DOWN = [24, 22, 23, 19, 20, 16, 17, 13, 12, 9];
const TX_STATES: TransactionState[] = [
  "idle",
  "awaiting_wallet",
  "signing",
  "submitted",
  "confirming",
  "success",
  "failed",
  "rejected",
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-border py-8">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-subtle-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function StyleGuidePage() {
  return (
    <Container className="py-10">
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold tracking-tight">
            NFFC Design System
          </h1>
          <p className="text-sm text-muted-foreground">
            Tokens and base components. See{" "}
            <code className="tabular text-xs">docs/design-system.md</code>.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Color — semantic surfaces">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["background", "bg-background"],
            ["surface", "bg-surface"],
            ["surface-raised", "bg-surface-raised"],
            ["muted", "bg-muted"],
            ["primary", "bg-primary"],
            ["accent", "bg-accent"],
            ["gain", "bg-gain"],
            ["loss", "bg-loss"],
          ].map(([name, cls]) => (
            <div key={name} className="flex flex-col gap-1.5">
              <div className={`h-14 rounded-md border border-border ${cls}`} />
              <span className="tabular text-xs text-muted-foreground">
                {name}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Color — chart palette (validated, both themes)">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="flex flex-col items-center gap-1">
              <div
                className="size-10 rounded-md border border-border"
                style={{ backgroundColor: `var(--chart-${n})` }}
              />
              <span className="tabular text-[11px] text-subtle-foreground">
                {n}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-semibold tracking-tight">
            Non-Fungible Financial Collectibles
          </p>
          <p className="text-base">
            Body — Inter. A composition of verified on-chain representations.
          </p>
          <p className="text-sm text-muted-foreground">
            Secondary — reference value, performance, metadata.
          </p>
          <p className="tabular text-sm">
            0x4663 · 10,000 BPS · $12,480.42 · +4.20%
          </p>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Mint NFFC</Button>
          <Button variant="secondary">Preview</Button>
          <Button variant="outline">Add asset</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Cancel listing</Button>
          <Button variant="link">View on explorer</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Stock-only</Badge>
          <Badge variant="primary">Crypto-only</Badge>
          <Badge variant="outline">Mixed</Badge>
          <Badge variant="gain">+4.2%</Badge>
          <Badge variant="loss">−6.1%</Badge>
          <Badge variant="warning">Geo-restricted</Badge>
        </div>
      </Section>

      <Section title="Cards & stats">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Reference NAV</CardTitle>
              <CardDescription>Chainlink · updated 2m ago</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Stat
                label="Current"
                value="$12,480.42"
                delta={{ label: "+4.2%", direction: "up" }}
              />
              <Sparkline data={TREND} aria-label="NAV trend, up 4.2%" />
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="secondary">
                Details
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardContent className="flex items-center justify-between pt-5">
              <Stat
                label="24h"
                value="−$1,204"
                delta={{ label: "−6.1%", direction: "down" }}
              />
              <Sparkline data={DOWN} aria-label="24h trend, down 6.1%" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-2 pt-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title="Table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead numeric>Weight</TableHead>
              <TableHead numeric>Ref. price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ["NVDA", "Robinhood", "3,000", "$124.80"],
              ["BTC", "Crypto", "2,500", "$68,204.10"],
              ["MSFT", "Robinhood", "2,500", "$430.55"],
              ["ETH", "Crypto", "2,000", "$3,512.00"],
            ].map(([asset, provider, weight, price]) => (
              <TableRow key={asset}>
                <TableCell className="font-medium">{asset}</TableCell>
                <TableCell className="text-muted-foreground">
                  {provider}
                </TableCell>
                <TableCell numeric>{weight}</TableCell>
                <TableCell numeric>{price}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <Section title="Form">
        <form className="flex max-w-sm flex-col gap-4">
          <Field hasHint>
            <FieldLabel>Collection name</FieldLabel>
            <FieldControl>
              <Input placeholder="e.g. Semiconductor Basket" />
            </FieldControl>
            <FieldHint>Shown on every NFFC in the collection.</FieldHint>
          </Field>
          <Field hasError>
            <FieldLabel>Symbol</FieldLabel>
            <FieldControl>
              <Input defaultValue="SEMI" />
            </FieldControl>
            <FieldError>Symbol is already taken.</FieldError>
          </Field>
          <Button type="submit" className="self-start">
            Continue
          </Button>
        </form>
      </Section>

      <Section title="Modal">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary">Open confirmation</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm mint</DialogTitle>
              <DialogDescription>
                You are about to mint an NFFC with 4 components. The fee is
                shown before you sign — never after.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost">Cancel</Button>
              <Button>Review fees</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      <Section title="Charts — frame">
        <ChartFrame
          title="Reference NAV"
          legend={
            <>
              <ChartLegendItem color="var(--chart-1)">NAV</ChartLegendItem>
              <ChartLegendItem color="var(--chart-3)">
                Cost basis
              </ChartLegendItem>
            </>
          }
          caption="Reference only — not a redemption value."
          meta="Chainlink · 2026-09-09 14:32 UTC"
        >
          <div className="flex h-40 items-center justify-center text-xs text-subtle-foreground">
            Plot renders here (TASK-10+, per the data-viz procedure)
          </div>
        </ChartFrame>
      </Section>

      <Section title="Wallet transaction states">
        <div className="grid gap-3 sm:grid-cols-2">
          {TX_STATES.map((state) => (
            <TransactionStatus key={state} state={state} />
          ))}
        </div>
      </Section>

      <Section title="Composition segment (derived, never declared)">
        <div className="flex flex-col gap-3">
          {(["CRYPTO_ONLY", "STOCK_ONLY", "MIXED"] as const).map((seg) => (
            <div key={seg} className="flex flex-col gap-2">
              <SegmentBadge segment={seg} />
              <GeoEligibilityNotice segment={seg} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Generative art (deterministic — composition → visual)">
        <p className="max-w-prose text-sm text-subtle-foreground">
          Arc angle is the basis-point weight; radial reach and node size scale
          with it; colour and jitter derive from the asset id; rotation and
          inner radius from the composition hash. Same composition →
          byte-identical SVG. See <code>docs/art-algorithm.md</code>.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ART_SAMPLES.map((s) => (
            <figure key={s.label} className="flex flex-col gap-2">
              <NffcArt
                input={s.input}
                className="aspect-square"
                label={`Sample: ${s.label}`}
              />
              <figcaption className="text-xs text-subtle-foreground">
                {s.label}
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section title="Dynamic NFFC UI/Data (TASK-15)">
        <p className="max-w-prose text-sm text-subtle-foreground">
          Every market number carries an oracle source and a visible age;
          loading and unavailable states are explicit, never a blank value (
          <code>docs/spec/07-ux-map.md</code> §6). Rarity and composition are
          on-chain and need no oracle.
        </p>

        <div className="grid gap-6 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-subtle-foreground">Loaded</p>
            <NffcMarketPanel snapshot={DEMO_SNAPSHOT_OK} now={DEMO_NOW} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-subtle-foreground">
              Stale / degraded
            </p>
            <NffcMarketPanel snapshot={DEMO_SNAPSHOT_STALE} now={DEMO_NOW} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-subtle-foreground">
              Unavailable
            </p>
            <NffcMarketPanel
              snapshot={DEMO_SNAPSHOT_UNAVAILABLE}
              now={DEMO_NOW}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-subtle-foreground">Loading</p>
          <NffcMarketPanel snapshot={null} loading />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-subtle-foreground">
              Composition (on-chain, no oracle)
            </p>
            <CompositionTable components={DEMO_COMPONENTS} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-subtle-foreground">
              Static rarity (structural, no oracle)
            </p>
            <StaticRarityStat score={0.4029} />
          </div>
        </div>
      </Section>

      <Section title="Wallet (self-custody — TASK-16)">
        <p className="max-w-prose text-sm text-subtle-foreground">
          Every configured connector is self-custody only — no exchange or
          custodial option. Wrong-network detection is automatic, with a
          one-click switch to Robinhood Chain (4663). See{" "}
          <code>docs/wallet-integration.md</code>. These use the real app
          connectors (no mock wallet is available outside tests), so connecting
          needs a browser wallet extension.
        </p>
        <ConnectWalletButton />
        <NetworkBanner />
      </Section>
    </Container>
  );
}
