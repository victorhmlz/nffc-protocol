# NFFC Protocol — Whitepaper

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
- Marketplace de compra, venta y ofertas.
- Reference NAV calculado a partir de precios de referencia.
- Sin custodia de Stock Tokens por el protocolo.
- Sin compra de acciones para usuarios.
- Sin staking.
- Sin lending.
- Sin rendimiento garantizado.
- Sin portfolio management discrecional.
- Sin token nativo en V1.

## 5. Agnosticismo de red

La arquitectura tendrá una capa de abstracción:

`NFFC → Asset Abstraction → Provider/Network Adapter → Representation`

Robinhood será el primer adapter. El protocolo podrá incorporar posteriormente otros proveedores o redes sin rediseñar el modelo conceptual del NFFC.

La identidad del activo no deberá confundirse con una representación concreta: dos proveedores pueden representar el mismo activo económico con diferentes contratos, derechos, precios, jurisdicciones o condiciones.

## 6. Creación y mint

Los creadores podrán seleccionar varios activos y asignar pesos.

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

- Next.js
- React
- JavaScript
- Tailwind CSS
- wagmi
- viem

### Backend

- Next.js/Node.js
- PostgreSQL
- Redis
- workers para sincronización/indexación

### Blockchain

- Solidity
- OpenZeppelin
- ERC-721
- Robinhood Chain como primera implementación

### Contratos

- `NFFC.sol`
- `AssetIdentityRegistry.sol`
- `RepresentationRegistry.sol`
- `Marketplace.sol`
- adapters/interfaces para proveedores
- interfaces futuras para vaults y oráculos

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

No se lanzará un token nativo salvo que una fase futura demuestre una necesidad real.

## 13. Posicionamiento

NFFC Protocol no se posiciona como:

> otro marketplace NFT.

Se posiciona como:

> **Infraestructura agnóstica para convertir composiciones financieras en coleccionables digitales únicos y negociables.**

Robinhood Chain es el primer ecosistema, no el límite del protocolo.

## 14. Riesgos y límites

El protocolo deberá evitar afirmaciones de propiedad sobre valores subyacentes cuando no existan tales derechos.

La clasificación regulatoria dependerá de la implementación, jurisdicción, comercialización, custodia, derechos económicos y funciones futuras. Antes de una V2 respaldada o de una explotación comercial a gran escala deberá realizarse revisión legal especializada.

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
