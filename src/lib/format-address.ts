/** `0x1234…abcd` — a short display for an EVM address. Formatting only. */
export function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
