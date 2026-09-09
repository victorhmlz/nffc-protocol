# NFFC Protocol — Whitepaper

## Changelog

**v1.1 (2026-09-09)** — parche de reconciliación con `NFFC_Development_Plan.md` v3.1 y `NFFC_Claude_Master_Prompt.md` v2.0. Numeración de secciones 1–15 sin cambios; se agregan las secciones 16–17.
- §9 Arquitectura → Frontend: `JavaScript` reemplazado por `TypeScript` (modo `strict`).
- §4 V1 → se agrega que las representaciones cripto-nativas están disponibles desde V1, no como extensión posterior.
- §5 Agnosticismo de red → se aclara que el adapter de criptomonedas nativas se lanza **junto con** Robinhood en V1, no secuencialmente después.
- Nueva §16 Características de los NFFC (arte generativo, doble eje de rareza, trait de condición de mercado al mint, Estado del Mercado) — citada por TASK-10 a TASK-14, TASK-41, TASK-42 del Development Plan.
- Nueva §17 V1.5 — Token fungible nativo — citada por TASK-43, TASK-44 del Development Plan.

**v1.0** — versión original.

## 1. Resumen

NFFC Protocol propone una nueva categoría de activos digitales: **Non-Fungible Financial Collectibles (NFFCs)**.

Un NFFC es un NFT cuya identidad incorpora una composición financiera inmutable formada por referencias a representaciones on-chain de activos financieros. La primera integración será Robinhood Chain mediante sus Stock Tokens oficiales, pero el protocolo se diseñará desde el inicio de forma **agnóstica respecto de blockchain y proveedor**.

El objetivo no es crear otro marketplace NFT generalista, sino una infraestructura para convertir composiciones financieras en coleccionables digitales únicos, explorables y negociables.

## 2. Problema

Los mercados NFT tradicionales se centran principalmente en arte, PFPs, gaming y coleccionables. Los proyectos NFT-Fi, por otro lado, suelen centrarse en que un NFT posea activos, se fraccione o genere utilidad financiera.

Existe una oportunidad intermedia: representar una **composición financiera única** como un objeto coleccionable identificable, con historial, valoración de referencia, rareza y mercado secundario.

## 3. Solución

NFFC Protocol separa tres conceptos:

1. **Asset Identity** — qué activo financiero se referencia.
2. **Asset Representation** — qué proveedor y mecanismo on-chain representa ese activo.
3. **Blockchain Token** — contrato concreto donde existe esa representación.

Ejemplo:

`NVDA → Robinhood Stock Token → Robinhood Chain → ERC-20 → contract address`

El NFFC almacena la composición y la referencia a representaciones verificadas; no presupone que el NFT sea propietario de las acciones subyacentes.

## 4. V1

V1 será **composition-based**:

- ERC-721.
- Composición inmutable.
- Entre 1 y 20 componentes por NFFC.
- Pesos expresados en basis points; total obligatorio de 10.000.
- Solo representaciones aprobadas por el Asset Registry.
- Robinhood Chain como primera red.
- Stock Tokens oficiales de Robinhood como primer proveedor.
- **Representaciones de criptomonedas nativas (BTC, ETH) disponibles desde V1** — no como extensión de una versión posterior; un NFFC puede componerse 100% de Stock Tokens, 100% cripto, o mixto, desde el lanzamiento.
- Marketplace de compra, venta y ofertas.
- Reference NAV calculado a partir de precios de referencia.
- Sin custodia de Stock Tokens ni de criptomonedas por el protocolo — toda tenencia es en wallets de autocustodia del usuario.
- Sin compra de acciones para usuarios.
- Sin staking.
- Sin lending.
- Sin rendimiento garantizado.
- Sin portfolio management discrecional.
- Sin token nativo en V1 (ver §17 para V1.5).

## 5. Agnosticismo de red

La arquitectura tendrá una capa de abstracción:

`NFFC → Asset Abstraction → Provider/Network Adapter → Representation`

Robinhood será el primer adapter de proveedor de activos tradicionales, y un adapter de criptomonedas nativas (BTC, ETH, vía Chainlink) se lanza **en paralelo, dentro de V1** — ambos con el mismo tratamiento en el registry, sin jerarquía entre ellos. El protocolo podrá incorporar posteriormente proveedores adicionales (TASK-47) sin rediseñar el modelo conceptual del NFFC.

La identidad del activo no deberá confundirse con una representación concreta: dos proveedores pueden representar el mismo activo económico con diferentes contratos, derechos, precios, jurisdicciones o condiciones.

## 6. Creación y mint

Los creadores podrán seleccionar varios activos —Stock Tokens, criptomonedas nativas, o una mezcla de ambos— y asignar pesos.

Ejemplo:

- NVDA 30%
- MSFT 20%
- GOOGL 15%
- AMZN 15%
- META 10%
- AMD 10%

El sistema validará:

- activo soportado;
- representación oficial;
- ausencia de duplicados;
- número máximo de componentes;
- pesos > 0;
- suma = 100%.

El **Collection Creation Fee** crecerá con la complejidad de la composición. El **Mint Fee** también crecerá con el número de componentes.

Los importes definitivos serán configurables por gobernanza/admin y no deberán quedar hardcodeados en la UI.

## 7. Valoración

Para V1 se utilizará el término **Reference Value / Reference NAV**.

Conceptualmente:

`Reference NAV = Σ(weight_i × normalizedPrice_i)`

La valoración será informativa y no implica que el NFFC esté respaldado por esos activos.

El sistema deberá conservar metadatos de precio, fuente, timestamp, decimals y multiplicadores aplicables.

## 8. Marketplace

Funciones iniciales:

- listar;
- cancelar listing;
- comprar;
- transferir;
- crear oferta;
- aceptar oferta;
- cancelar oferta.

El marketplace podrá cobrar una comisión configurable. Un objetivo inicial de diseño es 1,5%, sujeto a validación económica.

Creator royalties podrán contemplarse, pero no se asumirá que todos los marketplaces externos los hagan cumplir.

## 9. Arquitectura

### Frontend

- Next.js (App Router)
- React
- TypeScript (modo `strict`)
- Tailwind CSS
- wagmi
- viem

### Backend

- Next.js Route Handlers (sin backend Node/Express separado)
- PostgreSQL
- Redis
- workers para sincronización/indexación

### Blockchain

- Solidity
- OpenZeppelin
- ERC-721
- Robinhood Chain (L2 sobre Arbitrum, Chain ID 4663) como primera implementación

### Contratos

- `NFFC.sol`
- `AssetIdentityRegistry.sol`
- `RepresentationRegistry.sol`
- `Marketplace.sol`
- `RobinhoodAdapter.sol`
- `CryptoAdapter.sol`
- interfaces futuras para vaults y oráculos adicionales

## 10. Seguridad

Principios:

- OpenZeppelin;
- AccessControl;
- Pausable cuando corresponda;
- ReentrancyGuard;
- validación estricta de activos;
- protección frente a duplicados;
- eventos completos;
- multisig para administración;
- separación de funciones;
- tests unitarios, fuzzing y E2E;
- revisión de seguridad independiente antes de mainnet.

## 11. V2

V2 podrá introducir NFFCs respaldados por activos on-chain:

`NFFC → Vault → Stock Tokens`

Esta versión queda fuera de V1 porque introduce cuestiones adicionales de custodia, control de activos y regulación.

## 12. Modelo de negocio

Fuentes potenciales:

- Collection Creation Fee.
- Mint Fee.
- Marketplace fee.
- Creator royalty donde sea aplicable.
- Analytics premium.
- API para terceros.
- Servicios B2B.

No se lanzará un token nativo salvo que una fase futura demuestre una necesidad real — ver §17 para el diseño previsto en V1.5.

## 13. Posicionamiento

NFFC Protocol no se posiciona como:

> otro marketplace NFT.

Se posiciona como:

> **Infraestructura agnóstica para convertir composiciones financieras en coleccionables digitales únicos y negociables.**

Robinhood Chain es el primer ecosistema, no el límite del protocolo.

## 14. Riesgos y límites

El protocolo deberá evitar afirmaciones de propiedad sobre valores subyacentes cuando no existan tales derechos.

La clasificación regulatoria dependerá de la implementación, jurisdicción, comercialización, custodia, derechos económicos y funciones futuras. Antes de una V2 respaldada o de una explotación comercial a gran escala deberá realizarse revisión legal especializada.

Los Stock Tokens de Robinhood no están disponibles para personas de Estados Unidos, y están restringidos en Canadá, Reino Unido, Suiza y otras jurisdicciones — el mercado inicial de NFFC hereda esa restricción para toda composición que incluya al menos un Stock Token. Las composiciones 100% cripto no heredan esta restricción específica.

## 15. Principios de producto

1. Blockchain-agnostic by design.
2. Provider-agnostic by design.
3. Source of truth on-chain.
4. Database as index/cache, never as canonical ownership.
5. Immutable composition.
6. Official representation allowlist.
7. No unnecessary custody in V1.
8. Security before mainnet.
9. Premium financial-terminal UX.
10. Build V1 so V2 does not require architectural replacement.

## 16. Características de los NFFCs

Cuatro mecánicas distinguen a un NFFC de un collectible genérico o de un token de índice fungible. Las dos primeras se fijan en el mint y son permanentes; las dos últimas se ganan o se observan con el tiempo.

**Arte generativo derivado de la composición.** El arte no es una skin decorativa aplicada sobre datos: se genera proceduralmente a partir de los pesos reales en basis points. Una composición concentrada en un solo activo produce una pieza visualmente distinta de una diversificada en quince — la imagen es la huella financiera de la composición, no un sorteo de traits desconectado de ella.

**Doble eje de rareza.** Un eje estático, fijado en el mint: composiciones concentradas en pocos activos son más raras — y más riesgosas — que las diversificadas. Un eje dinámico, ganado con el tiempo: badges de desempeño que documentan haber sostenido el NFFC a través de una caída fuerte o haber alcanzado un nuevo máximo desde el mint.

**Condición de mercado al mint.** Cada NFFC queda marcado, de forma inmutable, con el estado del mercado en el instante del mint — por ejemplo, a qué distancia de máximos históricos operaba el conjunto ponderado. Es un hecho de mercado público registrado on-chain, no una promesa: documenta cuándo y en qué condiciones nació esa pieza.

**Estado del Mercado.** Una vista agregada que ordena los NFFC en circulación por su Reference NAV relativo desde el mint. Es información de mercado pública presentada de forma legible — no una promoción de rendimiento de inversión. El copy y la UI de esta característica se revisan junto con asesoría legal antes de publicarse (ver TASK-40 del Development Plan).

## 17. V1.5 — Token fungible nativo

Una vez que el protocolo tiene mercado secundario real y una base de holders activa, V1.5 introduce un token fungible de utilidad de plataforma. Su función es dar a quienes lo sostienen beneficios concretos dentro de NFFC Protocol, no representar una expectativa de rendimiento pasivo:

- **Descuento de fees** — reducción de Mint Fee y Marketplace Fee proporcional al monto sostenido.
- **Acceso prioritario** — whitelist temprana para nuevas colecciones y adapters de activos.
- **Participación en gobernanza ligera** — parámetros no críticos del protocolo, nunca sobre seguridad ni custodia.
- **Elegibilidad para programas futuros** — cualquier mecanismo de reparto de ingresos queda supeditado a la estructura legal que resulte de la revisión regulatoria; no se anuncia ni se implementa antes de esa validación.

El token no se lanza en V1. Su emisión, oferta y mecánica exacta se especifican como TASK-43 una vez validado el modelo de negocio de V1 con datos de uso reales.
