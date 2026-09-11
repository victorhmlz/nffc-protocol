/**
 * `NFFC.sol` token ids are ERC-721 `uint256` — positive decimal, no leading
 * zero, no assumed upper bound. Shared by `/api/nffc/[tokenId]/market` and
 * `/nffc/[tokenId]` so both reject the same malformed ids the same way.
 */
const TOKEN_ID = /^[1-9]\d{0,77}$/;

export function isValidTokenId(value: string): boolean {
  return TOKEN_ID.test(value);
}
