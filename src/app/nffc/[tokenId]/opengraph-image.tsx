import { ImageResponse } from "next/og";
import { getNffcDetail } from "@/lib/nffc-detail/get-nffc-detail";
import { isValidTokenId } from "@/lib/token-id";

/**
 * The "correct social preview of the generative art" entregable (TASK-21) —
 * rasterizes the token's exact on-chain-derived SVG (via `next/og`'s Satori
 * renderer, which can take a data-URI `<img src>`) into a PNG per tokenId, at
 * request time. No external image hosting or pinning dependency: unlike an
 * `og:image` pointed at a `data:` URI (which most platforms won't fetch —
 * see TASK-18's KNOWN ISSUES for the same constraint on pinned art), this is
 * a real HTTP(S) image URL Next serves for every token, static-optimized by
 * default like any other cached route (`docs/nffc-detail.md`).
 */
export const alt = "NFFC generative art";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BACKGROUND = "#f9f9f7";
const FOREGROUND = "#1a1a18";
const MUTED = "#6b6a63";

export default async function Image({ params }: { params: Promise<{ tokenId: string }> }) {
  const { tokenId } = await params;
  const detail = isValidTokenId(tokenId) ? await getNffcDetail(tokenId) : null;

  if (!detail) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            background: BACKGROUND,
            alignItems: "center",
            justifyContent: "center",
            fontSize: 48,
            color: MUTED,
          }}
        >
          NFFC not found
        </div>
      ),
      { ...size },
    );
  }

  const facts = detail.metadata.nffc;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: BACKGROUND,
          alignItems: "center",
          padding: 64,
          gap: 64,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- next/image is not
            supported inside next/og's ImageResponse; a plain <img> is the API. */}
        <img src={detail.metadata.image} width={480} height={480} style={{ borderRadius: 16 }} alt="" />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 20, color: MUTED, letterSpacing: 2 }}>
            NFFC PROTOCOL
          </div>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: FOREGROUND }}>
            {detail.metadata.name}
          </div>
          <div style={{ display: "flex", fontSize: 28, color: MUTED }}>
            {facts.segment.replace("_", "-")} · {facts.componentCount} component
            {facts.componentCount === 1 ? "" : "s"}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
