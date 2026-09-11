# NFFC Protocol — Open Issues

Registro vivo de issues abiertos entre TASKS — ver `NFFC_Claude_Master_Prompt.md` v2.3, sección "Registro de Issues Abiertos".

Reglas: cada entrada tiene un ID único, secuencial, en números naturales — el ID nunca se reutiliza. Al resolverse un issue, su entrada se borra (no se marca como resuelta).

**Próximo ID a usar: 5**

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

---

## Issue #3 — `Marketplace.sol` depende de `Collection.sol` para resolver el destinatario del royalty, sin ser una dependencia declarada de TASK-19

**Origen:** TASK-19 (Marketplace Contract).

`docs/spec/06-fee-model.md` §3 deja abierto si el royalty se paga al creador de la colección; TASK-19 decidió que sí (`ICollection.ownerOfCollection(collectionId)`), pero `NFFC_Development_Plan.md` solo lista `Depende de: TASK-09` para TASK-19 — Collection (TASK-10) no es una dependencia formal, aunque ya está mergeada y se usa en tiempo de ejecución.

`NFFC.sol` (TASK-09) no valida que `collectionId` corresponda a una `Collection` real — es un campo sin validar. `_settle` solo llama a `collection.ownerOfCollection(collectionId)` cuando `royaltyBps(collectionId) != 0`, así que esto solo puede revertir (`UnknownCollection`) si esa colección inexistente además tuviera un royalty no-cero configurado — nunca bajo el default V1 (`royaltyBps` en 0 para todo `collectionId` hasta que `FEE_ADMIN_ROLE` configure uno).

No bloqueante bajo el comportamiento V1 por defecto. El Project Lead debería confirmar que esta dependencia implícita en `Collection.sol`, y el modo de falla si alguna vez ocurre, son aceptables.

**Posible resolución en:** revisar junto con TASK-30 (Fee Engine), que ya depende de TASK-10 y TASK-19 explícitamente.

---

## Issue #4 — Front-running de listings y ofertas, sin mitigación en V1

**Origen:** TASK-19 (Marketplace Contract). El propio `docs/spec/08-security-principles.md` (tabla de superficie de amenazas, área "Marketplace") ya nombra *"front-running a listing price change"* como un riesgo conocido, sin asignarle una TASK de mitigación.

Ni un cambio de precio de listing ni una compra tienen protección alguna contra MEV/front-running (sin commit-reveal, sin price-time lock, sin slippage tolerance). Es un riesgo inherente a cualquier mercado on-chain sin mitigación explícita, no un defecto introducido por esta implementación — pero no está mitigado ni trackeado en ningún TASK futuro del Development Plan.

No bloqueante para TASK-19. El Project Lead debería decidir si amerita una TASK de mitigación explícita antes de mainnet (TASK-40 gate) o si se acepta como riesgo conocido del diseño V1.

**Posible resolución en:** sin asignar todavía — candidato para revisión en TASK-32 (threat model) o TASK-40 (mainnet gate).
