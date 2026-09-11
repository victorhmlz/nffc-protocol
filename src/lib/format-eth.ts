/**
 * `wei` decimal string → a short ETH display. Formatting only — never a price
 * feed, never rounds a value a payment actually depends on (marketplace calls
 * always use the exact `priceWei` string, not this).
 */
export function formatEth(weiDecimal: string): string {
  const wei = BigInt(weiDecimal);
  const whole = wei / 1_000_000_000_000_000_000n;
  const fracRaw = wei % 1_000_000_000_000_000_000n;
  const frac = fracRaw.toString().padStart(18, "0").slice(0, 3).replace(/0+$/, "");
  return frac ? `${whole}.${frac} ETH` : `${whole} ETH`;
}
