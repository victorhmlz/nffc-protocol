# NFFC Protocol — Plan de Desarrollo Detallado (Marketplace App)

**Versión:** 3.4 — actualiza y reemplaza la sección `## TASKS` del `NFFC_Claude_Master_Prompt.md` original.
**Vigente sin cambios:** Rol, Reglas absolutas, Protocolo de ejecución por TASK, Git/PR policy, Definition of Done y Comunicación del `NFFC_Claude_Master_Prompt.md` v2.4. Este documento solo redefine **qué** se construye y **en qué orden**.

**Cambios de la v3.4 respecto a la v3.3:**
- Agrega TASK-48 a TASK-52 (M1.5 — Capa Social: reputación 1–5 estrellas por rol, verificación de redes externas, comentarios por NFFC/colección, posts + feed general, herramientas de moderación) — ver `NFFC_Whitepaper.md` §18. Decisión del Project Lead; mensajería directa fue evaluada y descartada explícitamente (ver razonamiento en Whitepaper §18), no forma parte de ninguna TASK.
- Actualiza "Cómo leer este plan": la descripción de M1.5 ahora menciona la capa social junto a rareza dinámica, estado del mercado y token nativo.

**Cambios de la v3.3 respecto a la v3.2:**
- "Cómo leer este plan" decía que las TASKS se agrupan en "tres milestones" pero a continuación listaba cuatro (M0, M1, M1.5, M2). Corregido a "cuatro milestones".

**Cambios de la v3.2 respecto a la v3.1:**
- Corregidas 4 referencias cruzadas a `NFFC_Whitepaper.md` que apuntaban a la numeración del artefacto HTML (§08, §06) en vez de a la numeración real del `.md` v1.1 (§14 riesgos, §16 características de los NFFC) — TASK-08, TASK-32, TASK-40, TASK-42.
- Corregido el resumen de protocolo más abajo en este documento: seguía diciendo `...AUDIT → REPORT → PATCH`, desalineado con el Master Prompt v2.0/2.1 (`...AUDIT → PULL REQUEST → REPORT`, sin `.patch` sueltos).

**Cambios de la v3.1 respecto a la v3.0:**
- Stack de frontend fijado en **TypeScript** (no JavaScript). El equipo/agente que ejecute estas TASKS debe asumir `strict` mode desde TASK-01 — ver criterios actualizados de TASK-01 y TASK-02.

**Cambios de la v3.0 respecto a la v2.0:**
- El proyecto arranca **desde cero** — no existe repositorio previo. TASK-01 deja de ser una auditoría y pasa a ser inicialización de proyecto.
- El **adapter de criptomonedas nativas** y la **segmentación de composición** se adelantan de M1.5 a M1 — las criptomonedas se podrán añadir a la canasta desde el día uno, no como extensión posterior.
- El **Motor de Rareza Estática** se adelanta de M1.5 a M1, junto al resto de mecánicas fijadas en el mint.
- Se hace explícito en cada TASK relevante que el sistema de precios y de rareza dinámica dependen de un oráculo (Chainlink), y que toda wallet soportada es de autocustodia.
- Renumeración completa de TASKS para mantener una secuencia limpia (TASK-00 a TASK-47).

**Documentos relacionados:** Whitepaper (público) y Roadmap (público) — ambos publicados como referencia de producto y actualizados junto con este plan.

**Protocolo de cada TASK (definido en el Master Prompt v2.2, no en este documento):** `INSPECT → PLAN → IMPLEMENT → TEST → AUDIT → PULL REQUEST → REPORT`. Ninguna TASK se declara `COMPLETED` si build, lint, typecheck o tests relevantes fallan. Cada TASK produce: cambios de código, tests, documentación afectada, un Pull Request contra `main` y `docs/reports/TASK-XX-REPORT.md`.

---

## Cómo leer este plan

Las TASKS se agrupan en cuatro milestones que corresponden a las versiones del Roadmap público:

- **M0 — Fundamentos.** Especificación, inicialización del proyecto desde cero, arquitectura base, design system, infraestructura. Nada de esto es visible al usuario final.
- **M1 — Núcleo del Protocolo y Marketplace (V1).** Todo lo necesario para mintear, valorar y comerciar un NFFC en Robinhood Chain — incluyendo, desde el día uno, la posibilidad de componer con criptomonedas nativas además de Stock Tokens. Este milestone es el criterio de lanzamiento de mainnet.
- **M1.5 — Identidad y Utilidad.** Las capas que se agregan una vez que V1 tiene tracción real: rareza dinámica ganada con el tiempo, estado del mercado, token nativo, y una capa social alrededor de los perfiles (reputación, feed, comentarios — sin mensajería directa, ver Whitepaper §18).
- **M2 — Horizonte.** Investigación únicamente. Ninguna TASK de este bloque se implementa sin revisión legal previa.

Cada TASK incluye: **Objetivo**, **Entregables**, **Depende de** y **Criterios de aceptación**.

---

## M0 — Fundamentos

### TASK-00 — Especificación de Producto y Arquitectura

**Objetivo:** Documentar formalmente el dominio antes de escribir código de producción.

**Entregables:**
- Product Specification (visión, alcance V1, non-goals, terminología, user journeys, modelo económico, riesgos)
- Domain model: Asset Identity, Provider, Network, Representation, NFFC, Collection
- Arquitectura de contratos e interfaces (sin implementación aún)
- Fee model documentado (sin montos hardcodeados)

**Depende de:** Nada — es el punto de partida.

**Criterios de aceptación:**
- Arquitectura coherente con el Whitepaper y el Roadmap públicos
- Asset Identity separado de Representation de forma explícita en el documento
- Robinhood desacoplado del dominio central en cada diagrama
- Límites V1 / V1.5 / V2 claramente separados y no ambiguos
- El documento refleja que las criptomonedas nativas son un provider soportado desde V1, no una extensión futura

---

### TASK-01 — Inicialización del Proyecto

**Objetivo:** No existe código previo — este TASK reemplaza la auditoría de un repositorio existente por el bootstrap de uno nuevo. Es la única TASK del plan que no parte de código heredado.

**Entregables:**
- Repositorio inicializado con Next.js (App Router) + **TypeScript**
- `tsconfig.json` en modo `strict`, gestor de paquetes, linter (con regla que marca `any` explícito), formatter y test runner configurados y funcionando desde el primer commit
- CI mínimo (build + lint + typecheck + test) en verde
- README con instrucciones de setup local

**Depende de:** TASK-00.

**Criterios de aceptación:**
- Build, lint, typecheck y test corren en verde desde el primer commit, sin código de dominio todavía
- No se mezcla código de features ni mocks de dominio con el bootstrap — este TASK es infraestructura pura
- Estructura de carpetas vacía pero explícita, lista para recibir TASK-02
- `strict: true` activado desde el commit inicial — nunca se relaja para "avanzar más rápido"

---

### TASK-02 — Fundación de Arquitectura Objetivo

**Objetivo:** Levantar la estructura base de módulos para domain, web, API, blockchain, adapters, config, database y tests, sobre **Next.js (App Router)** como framework único de dapp.

**Entregables:**
- Estructura de proyecto (monorepo o multi-paquete, a decidir en el reporte) con Next.js como frontend + capa API vía Route Handlers — sin backend Node/Express separado
- Interfaces mínimas de Provider/Network Adapter
- Convenciones de nombres y organización de tests
- Convención explícita de Server Components vs. Client Components: todo lo que dependa de wallet/firma es Client Component; todo lo público (marketplace, detalle de NFFC) se resuelve Server-first

**Depende de:** TASK-01.

**Criterios de aceptación:**
- Ningún módulo de dominio importa directamente código específico de Robinhood ni de ningún adapter de criptomonedas
- Ningún módulo de dominio (contratos, registry, cálculo de NAV, motores de rareza) importa directamente APIs de Next.js — el dominio es agnóstico de framework igual que es agnóstico de proveedor
- Interfaces de adapter compilan sin implementación concreta
- Workers de sincronización/indexación (TASK-06, TASK-07, TASK-24) corren fuera del ciclo de request de Next.js — no como Route Handlers de larga duración
- Todo tipo de dato del dominio (composición, pesos, precios, NAV) está tipado explícitamente — ningún `any` sin un comentario que justifique por qué es necesario ahí

---

### TASK-03 — Design System

**Objetivo:** Construir la base visual: terminal financiero premium + marketplace de collectibles. Explícitamente no es estética de meme-coin/casino.

**Entregables:**
- Tokens visuales (color, tipografía, espaciado) en modo claro y oscuro
- Componentes base: cards, tablas, badges, charts, botones, forms, modals, estados de wallet
- Reglas responsive

**Depende de:** TASK-00.

**Criterios de aceptación:**
- Sistema de tokens reutilizable, no valores hardcodeados en componentes
- Paleta y tipografía definidas por escrito (no "a discreción del componente")

---

### TASK-04 — Infraestructura

**Objetivo:** Configuración de entornos, RPC, base de datos, caché, logging y manejo de errores.

**Entregables:**
- Environment management (dev/staging/producción)
- RPC abstraction hacia Robinhood Chain (Chain ID 4663)
- Conexión PostgreSQL + Redis
- Logging estructurado y error boundaries
- Infraestructura de test (unit, integración, contratos)

**Depende de:** TASK-02.

**Criterios de aceptación:**
- RPC abstraction soporta múltiples proveedores (no acoplado a un solo RPC de Robinhood Chain)
- Variables sensibles fuera del repositorio, `.env.example` documentado

---

## M1 — Núcleo del Protocolo y Marketplace (V1)

### TASK-05 — Asset Identity & Representation Registry

**Objetivo:** Implementar el modelo `Asset Identity → Provider → Network → Representation` como registry on-chain, diseñado desde el día uno para múltiples providers (Robinhood y criptomonedas nativas).

**Entregables:** `AssetIdentityRegistry.sol`, `RepresentationRegistry.sol`, tests de acceso y validación.

**Depende de:** TASK-02, TASK-04.

**Criterios de aceptación:**
- Solo direcciones verificadas por el registry pueden registrarse como Representation
- Ningún usuario puede introducir una dirección arbitraria y convertirla en activo soportado
- AccessControl restringe altas/bajas a roles administrativos
- El registry no asume un único provider — dar de alta un segundo provider (cripto) no requiere cambios al contrato

---

### TASK-06 — Robinhood Adapter

**Objetivo:** Sincronizar representaciones oficiales activas de Robinhood Stock Tokens.

**Entregables:** `RobinhoodAdapter.sol` + worker de sincronización off-chain (symbol, name, contract, chain, status, decimals, multiplier, oracle metadata, timestamps).

**Depende de:** TASK-05.

**Criterios de aceptación:**
- Tolera nuevos activos sin requerir redeploy del contrato core
- Marca automáticamente como inactiva cualquier representación que Robinhood deslistee
- Metadata de oráculo consistente con el proveedor confirmado (Chainlink)

---

### TASK-07 — Crypto Native Adapter

**Objetivo:** Segundo Provider/Network Adapter, disponible **desde el lanzamiento de V1**, para criptomonedas nativas (BTC, ETH y otras a definir), usando Chainlink como fuente de precio y direcciones de contrato verificadas (WBTC/WETH u homólogos según la red).

**Entregables:** `CryptoAdapter.sol` + worker de sincronización de metadata, reutilizando la misma interfaz de adapter que TASK-06.

**Depende de:** TASK-05.

**Criterios de aceptación:**
- Reutiliza el mismo Registry y la misma interfaz de Adapter que el Robinhood Adapter, sin cambios al contrato NFFC core
- Ningún activo cripto se agrega sin verificación explícita de dirección de contrato
- Disponible en el mint de V1 — un creador puede componer un NFFC 100% cripto, 100% Stock Tokens, o mixto, desde el primer día

---

### TASK-08 — Segmentación de Composición

**Objetivo:** Etiquetar cada NFFC según si su composición es 100% cripto-nativa, 100% Stock Tokens, o mixta — reflejando la diferencia de elegibilidad geográfica entre activos con y sin restricción de personas de EE.UU./Reino Unido/Canadá/Suiza.

**Depende de:** TASK-06, TASK-07.

**Criterios de aceptación:**
- La etiqueta se deriva automáticamente de la composición, nunca se declara manualmente
- La UI comunica con claridad la diferencia de disponibilidad geográfica entre composiciones cripto-only y mixtas (ver Whitepaper, sección 14)

---

### TASK-09 — NFFC Contract (ERC-721 Core)

**Objetivo:** Implementar el contrato central del protocolo.

**Entregables:** `NFFC.sol` con reglas: 1–20 componentes, suma exacta 10.000 BPS, sin duplicados, peso > 0, activo registrado (de cualquier provider), composición inmutable post-mint.

**Depende de:** TASK-05.

**Criterios de aceptación:**
- Tests exhaustivos de cada regla de validación, incluyendo casos límite (1 componente, 20 componentes, suma ≠ 10.000, mezcla de providers)
- Ningún método permite modificar la composición después del mint, bajo ningún rol
- Eventos completos para cada mint

---

### TASK-10 — Collection Contract / Model

**Objetivo:** Colecciones y creation fee configurable según cantidad de componentes.

**Entregables:** `Collection.sol`, lógica de cálculo de fee, ownership de creador.

**Depende de:** TASK-09.

**Criterios de aceptación:**
- Fee se lee de configuración on-chain, nunca hardcodeada en frontend
- Cambiar el fee no requiere redeploy del contrato NFFC

---

### TASK-11 — Arquitectura de Metadata

**Objetivo:** Separar metadata estática (composición, arte) de datos de mercado dinámicos (precio, NAV).

**Entregables:** Esquema de metadata ERC-721 estándar + capa de datos dinámicos servida por API, nunca almacenada como verdad permanente on-chain.

**Depende de:** TASK-09.

**Criterios de aceptación:**
- Metadata estática es inmutable y verificable independientemente del backend
- Ningún dato de mercado volátil se trata como fuente de verdad permanente

---

### TASK-12 — Motor de Arte Generativo (composición → visual)

**Objetivo:** Generar el arte de cada NFFC proceduralmente a partir de sus pesos reales en basis points — no una skin decorativa desconectada de los datos.

**Entregables:**
- Algoritmo determinista: composición (activos + pesos, de cualquier provider) → parámetros visuales (forma, distribución, paleta dentro del design system)
- Renderizado server-side en el mint, almacenado en IPFS/Arweave
- Documentación del algoritmo (debe ser reproducible y auditable, no una caja negra)

**Depende de:** TASK-03, TASK-09, TASK-11.

**Criterios de aceptación:**
- Dos composiciones distintas nunca producen el mismo output visual determinístico
- El algoritmo es público y verificable — cualquiera puede reconstruir el arte a partir de la composición on-chain
- Tiempo de generación no bloquea el flujo de mint (async con estado intermedio claro en la UI)

---

### TASK-13 — Motor de Trait de Condición de Mercado al Mint

**Objetivo:** Registrar de forma inmutable el estado del mercado ponderado en el instante del mint, usando el oráculo de precios como fuente.

**Entregables:**
- Cálculo del trait (ej. distancia a máximos históricos del conjunto ponderado) usando el oráculo Chainlink vía Price Engine (TASK-22)
- Almacenamiento como metadata estática inmutable, generado una sola vez en el mint

**Depende de:** TASK-09, TASK-22.

**Criterios de aceptación:**
- El trait se calcula y se congela en la misma transacción/flujo de mint, nunca después
- Es reproducible: dado el timestamp de mint, cualquiera puede verificar el valor original con datos históricos de oráculo

---

### TASK-14 — Motor de Rareza Estática (composición)

**Objetivo:** Calcular y exponer la rareza de nacimiento de cada NFFC a partir de la concentración de su composición (menos componentes y mayor concentración de peso = mayor rareza). Es el primer eje del doble sistema de rareza — fijo desde el mint.

**Depende de:** TASK-09.

**Criterios de aceptación:**
- Fórmula de rareza documentada y determinística, calculable a partir de datos on-chain únicamente
- No depende de precio ni de oráculo — es rareza estructural, no de mercado

---

### TASK-15 — Dynamic NFFC UI/Data

**Objetivo:** Mostrar composición, reference value, performance, rareza y activos en la interfaz.

**Entregables:** Componentes de visualización conectados a Price Engine (TASK-22), NAV Engine (TASK-23) y motores de rareza (TASK-14 y, cuando exista, TASK-41).

**Depende de:** TASK-11, TASK-14, TASK-22, TASK-23.

**Criterios de aceptación:**
- Ningún dato de mercado se muestra sin timestamp de última actualización visible ni sin indicar que proviene de un oráculo
- Estado de carga y error explícitos, nunca un valor en blanco sin explicación

---

### TASK-16 — Wallet (Autocustodia)

**Objetivo:** Conexión de wallet, detección de red y máquina de estados de transacción. Todo el almacenamiento de NFFCs es de autocustodia — el protocolo nunca tiene control de claves ni fondos del usuario.

**Entregables:** Integración wagmi/viem, soporte Robinhood Wallet + wallets EVM genéricas de autocustodia (WalletConnect), máquina de estados `IDLE → AWAITING_WALLET → SIGNING → SUBMITTED → CONFIRMING → SUCCESS/FAILED/REJECTED`.

**Depende de:** TASK-04.

**Criterios de aceptación:**
- Detecta automáticamente red incorrecta y ofrece cambio a Robinhood Chain (4663)
- Ningún estado se salta — no hay transición directa de SIGNING a SUCCESS
- Ninguna wallet custodial (exchange u otra) forma parte del flujo soportado; el backend nunca almacena claves privadas ni tiene capacidad de mover NFFCs en nombre del usuario

---

### TASK-17 — Create UI (Wizard)

**Objetivo:** Flujo completo de creación en 7 pasos: información básica, selección de activos (de cualquier provider), pesos, validación, preview, fees, mint.

**Entregables:** Wizard completo con validación en cada paso, preview del arte generativo antes de confirmar.

**Depende de:** TASK-03, TASK-07, TASK-12, TASK-16.

**Criterios de aceptación:**
- El selector de activos muestra Stock Tokens y criptomonedas nativas en la misma superficie, sin tratarlas como flujos separados
- Preview del arte generado coincide exactamente con el resultado post-mint
- El usuario ve el fee total antes de firmar, nunca después

---

### TASK-18 — Mint Flow

**Objetivo:** Simulación, firma, envío y confirmación del mint.

**Entregables:** Flujo end-to-end conectado a la máquina de estados de TASK-16, generación del trait de condición de mercado (TASK-13) y del arte (TASK-12) en el momento correcto del flujo.

**Depende de:** TASK-09, TASK-12, TASK-13, TASK-17.

**Criterios de aceptación:**
- Nunca se muestra SUCCESS antes de confirmación on-chain
- Fallos de simulación se comunican antes de pedir firma, no después

---

### TASK-19 — Marketplace Contract

**Objetivo:** Listar, cancelar, comprar, con fees configurables.

**Entregables:** `Marketplace.sol` con `ReentrancyGuard`, transferencia segura, fee configurable on-chain.

**Depende de:** TASK-09.

**Criterios de aceptación:**
- Protección contra reentrancy verificada con tests específicos
- Cancelación de listing por no-owner es imposible bajo cualquier condición probada

---

### TASK-20 — Marketplace UI

**Objetivo:** Explorar, buscar, filtrar, ordenar, listar, comprar con feedback de transacción.

**Entregables:** UI completa conectada a TASK-19 e Indexer (TASK-24). Listado renderizado server-side (Server Components + ISR) para SEO y previews sociales; interacciones de compra/oferta en Client Components sobre ese mismo layout.

**Depende de:** TASK-03, TASK-16, TASK-19.

**Criterios de aceptación:**
- Filtros por composición (incluyendo tipo cripto-only/mixta), rareza y condición de mint funcionan sobre datos indexados, no sobre lectura on-chain directa por ítem

---

### TASK-21 — NFFC Detail

**Objetivo:** Página de detalle premium: arte, reference value, performance, composición, actividad, ownership, listing, oferta.

**Entregables:** Página con ruta pública estable (`/nffc/[tokenId]`), renderizada server-side vía Next.js (App Router) con ISR para que cada NFFC tenga una URL indexable y compartible con preview social correcto del arte generativo.

**Depende de:** TASK-15, TASK-20.

**Criterios de aceptación:**
- Toda la información mostrada es trazable a un origen on-chain o de oráculo identificado
- La página es renderizable y compartible sin wallet conectada; la wallet solo es necesaria para acciones (comprar, ofertar)

---

### TASK-22 — Price Engine

**Objetivo:** Abstracción de precios agnóstica de proveedor, con Chainlink como oráculo primario en Robinhood Chain — cubre tanto Stock Tokens (Robinhood Adapter) como criptomonedas nativas (Crypto Adapter) desde el día uno.

**Entregables:** Normalización de precio, decimales, timestamp, fuente y multiplicador por cada Representation, sin distinguir en la interfaz si el activo subyacente es una acción tokenizada o una criptomoneda.

**Depende de:** TASK-06, TASK-07.

**Criterios de aceptación:**
- Ningún precio se usa sin metadata de fuente (oráculo) y timestamp
- El mismo motor sirve precios de Stock Tokens y de criptomonedas sin lógica condicional por tipo de activo en las capas superiores
- Diseño soporta agregar un segundo proveedor de oráculo sin romper el contrato de datos

---

### TASK-23 — Reference NAV Engine

**Objetivo:** Calcular y persistir `Reference NAV = Σ(weight × normalizedPrice)`.

**Entregables:** NAV actual, histórico, ventanas de performance.

**Depende de:** TASK-22.

**Criterios de aceptación:**
- Se muestra siempre como "Reference NAV", nunca como "valor" a secas, para evitar sugerir respaldo
- Histórico persistido es reproducible a partir de los precios de oráculo almacenados

---

### TASK-24 — Indexer

**Objetivo:** Indexar blockchain de forma idempotente: Transfer, Mint, ListingCreated, ListingCancelled, Sale, OfferCreated, OfferAccepted.

**Depende de:** TASK-09, TASK-19.

**Criterios de aceptación:**
- Reprocesar el mismo bloque dos veces no duplica datos
- Recuperación automática tras caída sin pérdida de eventos

---

### TASK-25 — Portfolio

**Objetivo:** NFFCs poseídos, reference value, performance, exposición, colecciones.

**Depende de:** TASK-23, TASK-24.

---

### TASK-26 — Activity

**Objetivo:** Timeline on-chain/off-chain indexada de mint, venta, transferencia, listing, oferta.

**Depende de:** TASK-24.

---

### TASK-27 — Profiles

**Objetivo:** Perfiles de creador/coleccionista — creado, poseído, coleccionado, listado, actividad.

**Depende de:** TASK-24, TASK-25.

---

### TASK-28 — Search

**Objetivo:** Búsqueda de NFFCs, activos, colecciones, wallets.

**Depende de:** TASK-24.

**Criterios de aceptación:**
- Búsqueda por composición parcial (ej. "contiene NVDA" o "contiene ETH") funciona sobre datos indexados

---

### TASK-29 — Offers

**Objetivo:** Crear, aceptar, cancelar, expiración de ofertas.

**Depende de:** TASK-19, TASK-24.

**Criterios de aceptación:**
- Ofertas expiradas no son aceptables on-chain aunque la UI no se haya refrescado

---

### TASK-30 — Fee Engine

**Objetivo:** Centralizar collection fee, mint fee, marketplace fee, royalty en un único punto de configuración administrable sin tocar el frontend.

**Depende de:** TASK-10, TASK-19.

**Criterios de aceptación:**
- Cambiar cualquier fee es una operación administrativa, nunca un deploy de frontend

---

### TASK-31 — Admin

**Objetivo:** Panel de administración de activos, representaciones, fees, colecciones, reportes, salud del sistema.

**Depende de:** TASK-05, TASK-30.

**Criterios de aceptación:**
- Toda acción administrativa sensible pasa por multisig, nunca por una sola clave

---

### TASK-32 — Security Hardening

**Objetivo:** Threat model, tests de seguridad, revisión de access control.

**Depende de:** Todas las TASKS de contratos (05–31).

**Criterios de aceptación:**
- Threat model documenta explícitamente el riesgo de clasificación regulatoria como fondo/producto compuesto (ver Whitepaper, sección 14) como hallazgo abierto, no cerrado
- Cobertura de tests de contratos con fuzzing en las rutas críticas (mint, marketplace)

---

### TASK-33 — Error Handling

**Objetivo:** Unificar errores de wallet, blockchain, API, RPC e indexer en un vocabulario consistente para el usuario.

**Depende de:** TASK-16, TASK-24.

---

### TASK-34 — Responsive & Accessibility

**Objetivo:** Responsive, navegación por teclado, foco, contraste.

**Depende de:** TASK-03 y toda la superficie de UI construida hasta el momento.

---

### TASK-35 — UI/UX Polish

**Objetivo:** Eliminar inconsistencias visuales y de interacción acumuladas.

**Depende de:** TASK-34.

---

### TASK-36 — Testnet Deployment

**Objetivo:** Deploy, verificación de contratos, seed de datos y activos de prueba (Stock Tokens y cripto), E2E.

**Entregables:** Incluye selección y configuración de la plataforma de hosting de la dapp Next.js (Vercel u otra compatible con Server Components/ISR + Route Handlers), separada de la infraestructura de workers/indexer.

**Depende de:** Todas las TASKS de M1.

---

### TASK-37 — QA

**Objetivo:** Regression + unit + integración + E2E sobre el testnet desplegado.

**Depende de:** TASK-36.

---

### TASK-38 — Performance

**Objetivo:** Caching, paginación, índices de base de datos, eficiencia de RPC, optimización de imágenes.

**Depende de:** TASK-36.

---

### TASK-39 — Observability

**Objetivo:** Métricas, logs, alertas, health checks de indexer y RPC, monitoreo de transacciones fallidas.

**Depende de:** TASK-04, TASK-24.

---

### TASK-40 — Mainnet Readiness (Gate de lanzamiento V1)

**Objetivo:** Checklist final antes de mainnet.

**Criterios de aceptación — todos obligatorios:**
- Auditoría de seguridad independiente completada
- Multisig configurado para todas las funciones administrativas
- Scripts de deployment y verificación probados en testnet
- Monitoreo y backups operativos
- Procedimientos de emergencia documentados
- **Revisión legal apropiada al alcance de lanzamiento** — incluyendo, como mínimo, opinión sobre la exclusión geográfica heredada de Robinhood Stock Tokens y sobre el riesgo de clasificación como instrumento compuesto (Whitepaper, sección 14)

---

## M1.5 — Identidad y Utilidad

### TASK-41 — Motor de Badges de Desempeño Dinámico

**Objetivo:** Segundo eje de rareza, ganado con el tiempo: badges por sostener el NFFC a través de una caída significativa, por alcanzar un nuevo máximo desde el mint, por antigüedad de holding continuo. Depende del mismo oráculo que alimenta el Price Engine.

**Depende de:** TASK-14, TASK-23, TASK-24.

**Criterios de aceptación:**
- Los badges se derivan de datos históricos verificables (NAV histórico basado en oráculo + eventos de transferencia indexados), nunca de una entrada manual
- Un cambio de holder resetea correctamente los badges de "holding continuo" que correspondan

---

### TASK-42 — Estado del Mercado (Leaderboard)

**Objetivo:** Vista agregada de NFFCs en circulación ordenados por Reference NAV relativo desde el mint.

**Depende de:** TASK-23, TASK-41.

**Criterios de aceptación:**
- Copy y UI revisados junto con asesoría legal antes de publicarse — enmarcado como "estado del mercado", nunca como "rendimiento de tu inversión" (ver Whitepaper, sección 16)
- No se filtra ni destaca automáticamente solo a los NFFCs con mejor desempeño sin mostrar también el panorama completo

---

### TASK-43 — Token Nativo de Utilidad — Especificación y Contrato

**Objetivo:** Diseñar e implementar el token ERC-20 de utilidad de plataforma.

**Depende de:** TASK-32 (no comienza sin que security hardening de V1 esté cerrado), revisión legal previa.

**Criterios de aceptación:**
- Ningún mecanismo de reparto de ingresos se implementa antes de que la revisión legal correspondiente esté documentada y aprobada
- Contrato auditado antes de cualquier distribución pública

---

### TASK-44 — Integración de Utilidad del Token

**Objetivo:** Descuentos de fee, acceso a whitelist, gobernanza ligera sobre parámetros no críticos.

**Depende de:** TASK-30, TASK-43.

**Criterios de aceptación:**
- Gobernanza del token nunca controla parámetros de seguridad o custodia — solo categorías, destacados y features no críticas

---

### TASK-45 — Expansión de Indexación y Analytics

**Objetivo:** Agregar subgraphs (Goldsky/Ormi u otro proveedor de indexación de Robinhood Chain) como redundancia y capa de analytics avanzado.

**Depende de:** TASK-24.

---

### TASK-48 — Sistema de Reputación

**Objetivo:** Calificación 1–5 estrellas por rol (creador/holder/trader), nunca una etiqueta acusatoria tipo "scammer" (ver Whitepaper §18 para el razonamiento). Persistida off-chain, nunca on-chain — a diferencia de la composición, una calificación debe poder corregirse.

**Entregables:**
- Esquema PostgreSQL para calificaciones, ligadas a una transacción verificable entre las dos partes (compra, venta, oferta aceptada) indexada por TASK-24
- Cálculo de las etiquetas de rol (creador/holder/trader) derivado de actividad on-chain (mints, tenencia, volumen), no auto-declarado
- Agregación del promedio de estrellas por perfil y por rol

**Depende de:** TASK-19, TASK-24, TASK-27.

**Criterios de aceptación:**
- Una calificación solo puede dejarla una wallet con al menos una transacción verificable indexada contra la wallet calificada — ninguna calificación sin esa relación se acepta
- Ninguna calificación se almacena on-chain
- El protocolo nunca genera ni muestra una etiqueta acusatoria (ej. "scammer") — solo la calificación numérica y su agregado

---

### TASK-49 — Verificación de Redes Externas

**Objetivo:** Permitir vincular redes sociales externas (X/Twitter u otras) al perfil, con prueba de propiedad — nunca un campo de texto libre sin verificar.

**Entregables:**
- Flujo de verificación (firma de un mensaje publicado en la red externa, u OAuth según la red)
- Persistencia del vínculo verificado en el perfil (PostgreSQL)

**Depende de:** TASK-27.

**Criterios de aceptación:**
- Ningún vínculo a una red externa se muestra en el perfil sin haber pasado por el flujo de verificación
- Revocar o cambiar el vínculo requiere volver a verificar, nunca sobreescribe sin prueba

---

### TASK-50 — Comentarios (NFFC y Colección)

**Objetivo:** Comentarios en la página de detalle de un NFFC (TASK-21) y en la página de una colección, con reporte y moderación integrados al panel de Admin existente (TASK-31) — no una superficie de moderación nueva y separada.

**Entregables:**
- Modelo de comentarios (PostgreSQL), asociado a `tokenId` o a `collectionId`
- UI de comentario + reporte en ambas superficies
- Cola de reportes visible y accionable desde Admin (TASK-31): ocultar, eliminar, o desestimar

**Depende de:** TASK-21, TASK-31.

**Criterios de aceptación:**
- Todo comentario es reportable desde la propia UI, sin pasos adicionales
- Un comentario reportado queda oculto solo tras acción administrativa — el reporte por sí solo no oculta nada automáticamente, para evitar abuso del propio sistema de reportes

---

### TASK-51 — Posts y Feed General

**Objetivo:** Un usuario publica posts en su propio perfil; esos posts aparecen también en un feed general compartido, mezclados con los eventos de actividad que el protocolo ya genera (mint, venta, badge ganado — TASK-26/41). Sin mensajería directa: fuera de alcance en cualquier forma (Whitepaper §18).

**Entregables:**
- Modelo de posts (PostgreSQL), asociado al perfil del autor
- Feed general: unión ordenada cronológicamente de posts + eventos de actividad indexados (TASK-24/26)
- Reporte de posts, mismo mecanismo y misma cola de Admin que TASK-50

**Depende de:** TASK-26, TASK-27, TASK-50.

**Criterios de aceptación:**
- El feed general nunca mezcla contenido no verificado como si fuera un evento on-chain — un post de usuario y un evento de actividad son visualmente distinguibles
- Todo post es reportable con el mismo mecanismo que TASK-50

---

### TASK-52 — Herramientas de Moderación (extiende Admin)

**Objetivo:** Extender el panel de Admin (TASK-31) con la cola de reportes de TASK-50/51, límites de tasa (rate limiting) para posts/comentarios, y bloqueo de usuario a nivel de wallet para publicar contenido nuevo (no para operar en el marketplace — eso nunca se restringe desde acá).

**Depende de:** TASK-31, TASK-50, TASK-51.

**Criterios de aceptación:**
- Un bloqueo de publicación nunca impide comprar, vender, ni transferir — solo publicar posts/comentarios nuevos
- Toda acción de moderación queda registrada con quién la tomó y cuándo, igual que el resto de las acciones administrativas sensibles (multisig, Whitepaper §10)

---

## M2 — Horizonte (Investigación — sin implementación)

### TASK-46 — Investigación de Vaults y Custodia (V2)

**Objetivo:** Explorar `NFFC → Vault → Stock Tokens` como posible extensión respaldada.

**Estado:** Bloqueada por diseño. No se abre ninguna sub-tarea de implementación sin:
- Revisión legal independiente sobre custodia, control de activos y derechos económicos
- Evidencia de tracción real de V1/V1.5 con datos de uso
- Diseño de vault auditado antes de cualquier despliegue, ni siquiera en testnet

---

### TASK-47 — Adapters Multi-Proveedor Adicionales

**Objetivo:** Evaluar la incorporación de proveedores de representación adicionales más allá de Robinhood y del adapter cripto nativo.

**Depende de:** Tracción demostrada de TASK-06 y TASK-07.

---

## Resumen de dependencias críticas

```
TASK-00 → TASK-01 (bootstrap, sin código previo) → TASK-02 → TASK-04 → TASK-05
                                                                          │
                                                            ┌─────────────┼─────────────┐
                                                            ▼                           ▼
                                                    TASK-06 (Robinhood)        TASK-07 (Crypto) ── día uno
                                                            └─────────────┬─────────────┘
                                                                          ▼
                                                              TASK-08 (Segmentación)
                                                                          │
                                                                          ▼
                          TASK-09 (NFFC.sol) ──► TASK-10, TASK-11, TASK-12, TASK-13, TASK-14
                                                                          │
                                                                          ▼
                    TASK-16 (Wallet, autocustodia) → TASK-17 (Create UI) → TASK-18 (Mint Flow)
                                                                          │
                                                                          ▼
                                              TASK-19 (Marketplace) → TASK-20, TASK-21
                                                                          │
                                                          TASK-22 (Price Engine, oráculo) → TASK-23 (NAV) → TASK-24 (Indexer)
                                                                          │
                                     TASK-25, TASK-26, TASK-27, TASK-28, TASK-29, TASK-30, TASK-31
                                                                          │
                                                                          ▼
                                TASK-32 (Security) → TASK-36 (Testnet) → TASK-40 (Mainnet Gate)
                                                                          │
                                                                 ── V1 lanzado ──
                                                                          │
                                                                          ▼
                                        TASK-41, TASK-42 → TASK-43 → TASK-44, TASK-45
```
