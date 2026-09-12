# NFFC Protocol — Open Issues

Registro vivo de issues abiertos entre TASKS — ver `NFFC_Claude_Master_Prompt.md` v2.3, sección "Registro de Issues Abiertos".

Reglas: cada entrada tiene un ID único, secuencial, en números naturales — el ID nunca se reutiliza. Al resolverse un issue, su entrada se borra (no se marca como resuelta).

**Próximo ID a usar: 13**

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

**Posible resolución en:** antes de TASK-36 (deploy real del contrato) — re-derivar y re-pinear el trait post-confirmación, o ajustar la redacción de TASK-13/Whitepaper §16 a "as of submission".

---

## Issue #4 — Front-running de listings y ofertas, sin mitigación en V1

**Origen:** TASK-19 (Marketplace Contract). El propio `docs/spec/08-security-principles.md` (tabla de superficie de amenazas, área "Marketplace") ya nombra *"front-running a listing price change"* como un riesgo conocido, sin asignarle una TASK de mitigación.

Ni un cambio de precio de listing ni una compra tienen protección alguna contra MEV/front-running (sin commit-reveal, sin price-time lock, sin slippage tolerance). Es un riesgo inherente a cualquier mercado on-chain sin mitigación explícita, no un defecto introducido por esta implementación — pero no está mitigado ni trackeado en ningún TASK futuro del Development Plan.

No bloqueante para TASK-19. El Project Lead debería decidir si amerita una TASK de mitigación explícita antes de mainnet (TASK-40 gate) o si se acepta como riesgo conocido del diseño V1.

**Posible resolución en:** sin asignar todavía — candidato para revisión en TASK-32 (threat model) o TASK-40 (mainnet gate).

---

## Issue #5 — `/market` no logra ISR clásico: `searchParams` fuerza render dinámico por request

**Origen:** TASK-20 (Marketplace UI).

El entregable de TASK-20 pide "Server Components + ISR" para SEO/previews sociales. Pero el filtrado server-side (el propio criterio de aceptación) requiere leer `searchParams`, y bajo el modelo de caché de este proyecto (`cacheComponents` no está habilitado en `next.config.ts`), eso convierte cada combinación de query string en render dinámico por request — no en una página estáticamente pre-generada (ISR clásico). Las dos palabras del entregable ("Server Components" e "ISR") tiran en direcciones distintas en cuanto el filtrado es un requisito duro.

Lo entregado: `/market` sigue siendo 100% server-rendered (SSR) en cada request — sin fetch waterfall en cliente, crawleable, correcto para cualquier URL específica incluyendo previews sociales de una vista filtrada — pero cada query distinta se renderiza dinámicamente en vez de servirse desde una página estática pre-construida. El fetch de datos subyacente (`get-listings.ts`) sí está cacheado vía `unstable_cache` (`revalidate: 300`), el equivalente de ISR a nivel de datos, no del HTML.

No bloqueante — la página funciona, es SSR, es crawleable. Pero es una brecha real entre lo que el entregable pide literalmente y lo que el modelo de caché de Next.js permite sin más cambios.

**Posible resolución en:** evaluar habilitar `cacheComponents` (el sucesor de Partial Prerendering de esta versión de Next) a nivel de proyecto — dejaría prerenderizar el "App Shell" sin filtros mientras los resultados filtrados streamean detrás de un `<Suspense>`. Es un cambio de alcance mayor al de esta TASK; requiere decisión explícita del Project Lead, no algo para resolver unilateralmente dentro de TASK-20.

---

## Issue #6 — `/` y `/market`: el ux-map los lista como la misma superficie, TASK-20 solo construyó `/market`

**Origen:** TASK-20 (Marketplace UI).

`docs/spec/07-ux-map.md` §1 lista "Marketplace / explore" con dos rutas: `/` y `/market`. TASK-20 construyó únicamente `/market`; `/` sigue mostrando la landing page de bootstrap de TASK-01. No hay redirect ni contenido compartido entre ambas.

Decisión de producto pendiente: ¿`/` debería redirigir a `/market`, mostrar el mismo contenido, o quedar como landing separada permanentemente? No bloqueante — ambas rutas funcionan, no hay contenido roto — pero amerita una decisión explícita del Project Lead en vez de asumirse.

**Posible resolución en:** sin asignar todavía — podría resolverse en cualquier TASK posterior de UI, o explícitamente antes de TASK-40 (mainnet gate) como parte de la revisión de superficie pública.

---

## Issue #7 — Los módulos `infra/*` marcados `server-only` no se pueden importar (ni estática ni dinámicamente, una vez alcanzado el código) desde ningún worker corrido con `tsx`/`pnpm worker`

**Origen:** TASK-24 (Indexer), descubierto al intentar cablear `createPostgresIndexerStore()` en `workers/indexer/index.ts`.

`docs/conventions.md` §3 establece que los workers (`workers/provider-sync/`, `workers/nav-materializer/`, `workers/indexer/`) son procesos standalone, re-invocados por un scheduler externo (cron, un loop supervisado) — corren fuera de Next.js, vía `pnpm worker <archivo>` (= `tsx <archivo>`). Pero `infra/valuation/postgres-price-store.ts`, `infra/valuation/postgres-nav-store.ts` (TASK-23) e `infra/indexer/postgres-indexer-store.ts` (TASK-24) empiezan con `import "server-only"`.

El paquete `server-only` (`node_modules/server-only/package.json`) resuelve su export condicional `"react-server"` (el único que sirve un módulo no-op, `empty.js`) solo cuando el bundler que resuelve el import declara esa condición — algo que únicamente el compilador de Next.js hace. Bajo Node/`tsx` sin ese bundler, siempre resuelve `index.js`, que hace `throw new Error("This module cannot be imported from a Client Component module...")` **incondicionalmente**, sin importar si el módulo se usa o no. Verificado en este TASK: un `import` estático de `@infra/indexer` en `workers/indexer/index.ts` rompía el worker incluso en el camino "not configured" (el único invocable hoy, antes de TASK-36). Se mitigó ahí con un `import()` dinámico gateado detrás del chequeo de configuración — pero eso solo evita el crash mientras el worker no está configurado; el día que TASK-36 despliegue los contratos y `CONTRACT_NFFC`/`CONTRACT_MARKETPLACE` (o el registry de `nav-materializer`) estén seteados, ese mismo `import()` se ejecutará igual y **también** va a tirar el mismo error — el worker jamás llega a usar la store real.

No bloqueante hoy (ningún worker se corre "configured: true" en ningún ambiente todavía), pero es un defecto latente que va a manifestarse en el primer intento real de correr cualquiera de estos tres workers fuera de Next.js una vez desplegados los contratos — no es específico de TASK-24, alcanza igual a `nav-materializer` (TASK-23) apenas cablee sus stores.

**Posible resolución en:** decisión de arquitectura del Project Lead — candidatas: (a) quitar `import "server-only"` de los módulos `infra/*` que los workers necesitan en tiempo de ejecución real (dejando que la barrera cliente/servidor la sigan imponiendo solo los módulos que de verdad importa Next.js, p. ej. `infra/env.ts` no lo tiene y no tuvo este problema), (b) mover esos tres store modules fuera de `infra/` a una ruta que ni Next.js ni los workers compartan, evitando la necesidad del marker, o (c) ejecutar los workers en producción con un runtime que sí declare la condición `react-server` en vez de `tsx` plano. Candidato para revisar junto con TASK-36 (deploy), antes de que cualquier worker necesite correr con datos reales.

---

## Issue #8 — `OfferCancelled(offerId)` no lleva `tokenId`; el indexer no puede completar `activity.token_id` para esa fila

**Origen:** TASK-24 (Indexer).

`docs/spec/09-data-model.md` define `activity.token_id` como columna de la tabla; `domain/nffc-detail/detail.ts`'s `ActivityEntry.tokenId` (extendido en este mismo TASK, ver CHANGES del reporte) la espera para toda fila. Pero `Marketplace.sol` (TASK-19) emite `event OfferCancelled(uint256 indexed offerId)` sin `tokenId` ni ningún otro campo — el propio actor tampoco viene en el evento, por lo que `domain/indexer/plan.ts` usa `ctx.transactionSender` (`LogEvent.transactionSender`, agregado en este TASK) como fallback razonable para `actorAddress`, pero no existe un fallback equivalente para `tokenId`: la fila de actividad para un offer cancelado queda con `tokenId: null`.

No bloqueante — el resto de la fila (actor, txHash, timestamp) es correcta y completa; solo el campo `tokenId` queda vacío para este único tipo de evento. Documentado también como limitación explícita en el doc comment de `planWrite`.

**Posible resolución en:** sin asignar todavía — requeriría cambiar la firma de `OfferCancelled` en `Marketplace.sol` para incluir `tokenId` (rompe el ABI ya usado por TASK-19/20/21), algo que solo tiene sentido decidir antes de TASK-36 (deploy real, donde el ABI recién se vuelve inmutable de verdad). Candidato para revisar junto con TASK-36.

---

## Issue #9 — El indexer (TASK-24) no llena la tabla `collection` ni escucha `CollectionCreated`

**Origen:** TASK-24 (Indexer), decisión de alcance tomada dentro de la propia TASK, documentada en el header de `db/migrations/0003_indexer_mirror.sql`, y elevada acá para que quede visible fuera de un comentario SQL.

`docs/spec/09-data-model.md` incluye `collection` entre las tablas espejo del indexer. `NFFC_Development_Plan.md` (TASK-24) enumera explícitamente los eventos a indexar — Transfer, Mint (+composición), listing, sale, offer — y no incluye `CollectionCreated` (TASK-10) en esa lista. Se decidió, dentro de esta TASK, no indexar `collection` ni escuchar `CollectionCreated`, ya que hacerlo abre preguntas propias sin resolver (¿de dónde sale el nombre/creador de una colección para el mirror — del evento, o de una llamada de lectura aparte a `Collection.sol`?) mejor señalizadas que resueltas u omitidas en silencio.

Efecto concreto: nada en el pipeline actual (indexer, NAV materializer, ninguna TASK de UI) llena `collection` — cualquier consumidor futuro que espere esa tabla poblada (p. ej. una vista "por colección") no va a encontrar filas.

No bloqueante para TASK-24 tal como está definida en el Development Plan. No hay ninguna TASK futura nombrada explícitamente responsable de esto.

**Posible resolución en:** sin asignar todavía — candidato para una TASK dedicada (o una extensión explícita de un TASK-24-bis) que decida la fuente de verdad de `collection` y la indexe.

---

## Issue #11 — `docs/spec/07-ux-map.md` nombra `/collection/[collectionId]` y TASK-50 ya asume que existe, pero ninguna TASK del Development Plan lo construye

**Origen:** TASK-27 (Profiles), descubierto al enlazar `CollectionsList` a esa ruta.

`docs/spec/07-ux-map.md` §1 lista "Collection page" como superficie de primera clase (`/collection/[collectionId]`, Server-first). `NFFC_Development_Plan.md` v3.4's TASK-50 (Comentarios, M1.5, nueva) ya da por sentado que "la página de una colección" existe ("Comentarios en la página de detalle de un NFFC (TASK-21) y en la página de una colección"). Pero ninguna TASK del 00 al 52 tiene como entregable construir esa página — `Collection.sol` (TASK-10) es solo el contrato; ninguna TASK de UI la reclama.

Efecto concreto hoy: `CollectionsList` (TASK-27) enlaza cada colección a `/collection/[collectionId]`, que 404 hasta que alguna TASK futura la construya — el mismo precedente de referencia-adelantada que `NffcCard` (TASK-20) ya sentó enlazando a `/nffc/[tokenId]` antes de que TASK-21 existiera.

No bloqueante para TASK-27. Si nadie construye esta página antes de TASK-50, esa TASK (M1.5) queda con una dependencia implícita sin dueño, la misma clase de problema que Issue #3 ya describió para `Marketplace.sol`/`Collection.sol`.

**Posible resolución en:** sin asignar todavía — requiere que el Project Lead asigne una TASK explícita para `/collection/[collectionId]` antes de TASK-50, o confirme que queda fuera de alcance de V1/V1.5 y TASK-50 se ajusta en consecuencia.

---

## Issue #12 — "TASK-31" se citó erróneamente como "deploy real de los contratos" en ~26 archivos ya mergeados (el número correcto es TASK-36)

**Origen:** TASK-31 (Admin), descubierto al escribir el propio comentario "not deployed yet" de esta TASK y notar que TASK-31 es "Admin", no deploy.

`NFFC_Development_Plan.md` es inequívoco: **TASK-31 = Admin** (esta TASK); **TASK-36 = Testnet Deployment** ("Deploy, verificación de contratos, seed de datos..."). En algún punto anterior de esta sesión (antes de que existiera un registro visible de cuándo) se estableció incorrectamente "TASK-31" como el número a citar para "todavía no hay contrato desplegado", y ese número incorrecto se copió consistentemente de TASK en TASK durante TASK-18 a TASK-30 — comentarios de código (`simulateBuy`/`simulateMint`/`simulateMakeOffer`/etc. fixtures, mensajes de error mostrados al usuario), casi todos los `docs/*.md`, y varios `docs/reports/TASK-XX-REPORT.md` ya mergeados.

Es un error puramente de **cita/documentación**, no funcional ni de seguridad: el comportamiento en sí (todo intento de simulación falla honestamente porque no hay contrato desplegado) es correcto en cada caso; solo el número de TASK mencionado en el texto es incorrecto.

**Ya corregido, como parte de este mismo TASK** (tocados de todas formas por la relocalización de `useMarketplaceActionFlow` → `useWriteFlow`, `src/lib/wallet/use-write-flow.ts`): `src/components/market/buy-button.tsx` (+ su test), `src/components/nffc/make-offer-form.tsx`, `src/components/nffc/offer-row-actions.tsx`, `docs/marketplace-ui.md`, `docs/offers.md`, y las tres citas dentro de este mismo archivo (Issues #2, #7, #8 — ver historial de este archivo, ya no aparecen porque se corrigieron in situ, no se dejaron como issues nuevos).

**Todavía sin corregir** (no tocados en esta TASK — barrido no realizado unilateralmente, ver más abajo): `docs/activity.md`, `docs/fee-engine.md`, `docs/mint-flow.md`, `docs/portfolio.md`, `docs/price-engine.md`, `docs/valuation.md`, `docs/reports/TASK-18-REPORT.md`, `docs/reports/TASK-20-REPORT.md`, `docs/reports/TASK-22-REPORT.md`, `docs/reports/TASK-24-REPORT.md`, `docs/reports/TASK-25-REPORT.md`, `docs/reports/TASK-26-REPORT.md`, `docs/reports/TASK-27-REPORT.md`, `docs/reports/TASK-30-REPORT.md`, `src/app/create/page.tsx`, `src/lib/portfolio/get-portfolio.ts`, `workers/indexer/index.ts`, `workers/indexer/onchain.ts`, `workers/nav-materializer/config.ts`, `workers/README.md`.

No bloqueante — ningún comportamiento depende de este número siendo correcto. Los `docs/reports/TASK-XX-REPORT.md` ya mergeados son además snapshots históricos que esta sesión no reescribe unilateralmente (mismo criterio ya aplicado en TASK-19/TASK-20/TASK-21).

**Posible resolución en:** una TASK/chore dedicada y pequeña (mismo patrón que `docs/fix-task-19-test-count`) que reemplace "TASK-31" por "TASK-36" en los archivos listados arriba que aún no lo tienen corregido — código fuente y `docs/*.md` vigentes sin problema; para los `docs/reports/TASK-XX-REPORT.md` ya mergeados, el Project Lead debería decidir si se corrigen in situ (son snapshots, no se han tratado como inmutables en otros casos de esta magnitud) o se dejan como están con una nota aclaratoria.
