# NFFC Protocol — Open Issues

Registro vivo de issues abiertos entre TASKS — ver `NFFC_Claude_Master_Prompt.md` v2.3, sección "Registro de Issues Abiertos".

Reglas: cada entrada tiene un ID único, secuencial, en números naturales — el ID nunca se reutiliza. Al resolverse un issue, su entrada se borra (no se marca como resuelta).

**Próximo ID a usar: 3**

---

## Issue #1 — `tokenId` queda como `"pending"` para siempre en la metadata pineada

**Origen:** TASK-18 (Mint Flow), reportado como KNOWN ISSUE 1.

`prepare-mint-metadata.ts` pinea la metadata estática antes de que el mint mine y se conozca el `tokenId` real (asignado por un contador privado en `NFFC.sol`). Usa el placeholder documentado `PENDING_TOKEN_ID = "pending"`. Re-pinear la metadata corregida con el `tokenId` real, una vez conocido, quedó fuera de alcance de TASK-18.

No bloqueante: el `tokenId` no es insumo del algoritmo de arte (TASK-12) ni del trait de condición de mercado (TASK-13). Es deuda de prolijidad de metadata, no un riesgo funcional.

**Posible resolución en:** sin asignar todavía.

---

## Issue #2 — Trait de condición de mercado calculado "as of submission", no "as of mined block"

**Origen:** TASK-18 (Mint Flow), reportado como KNOWN ISSUE 2. Expone una brecha de diseño de TASK-13 que no era visible hasta que existió un flujo de mint real.

`prepareMintMetadata` calcula el trait usando el bloque/observaciones de oráculo vigentes al preparar la metadata (antes de firmar), no el bloque en el que la transacción efectivamente mina. TASK-13 exige que el trait sea reproducible "dado el timestamp de mint" — el único timestamp que un tercero puede verificar independientemente es el del bloque minado on-chain. Si hay lag entre envío y minado, la reconstrucción de un tercero puede no coincidir con lo pineado.

No bloqueante para TASK-18, pero tensiona la garantía de verificabilidad prometida por TASK-13 y el Whitepaper §16.

**Posible resolución en:** antes de TASK-31 (deploy real del contrato) — re-derivar y re-pinear el trait post-confirmación, o ajustar la redacción de TASK-13/Whitepaper §16 a "as of submission".
