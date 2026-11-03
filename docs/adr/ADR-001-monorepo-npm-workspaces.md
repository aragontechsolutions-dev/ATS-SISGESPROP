# ADR-001 – Monorepo con npm workspaces y Node 24.22.1

**Contexto.** El plan pide un repositorio con web, API y motor de cálculo (día 1). Hay que fijar Node
parcheado contra las vulnerabilidades del 21/10/2026.

**Decisión.** Un único repositorio con npm workspaces (`packages/*`, `apps/*`). Se usa npm, que ya viene
con Node; no se agregan herramientas extra (pnpm, turbo). Node 24.22.1 o superior en `.node-version` y
`engines` con `engine-strict`.

**Consecuencias.** Un solo `package-lock.json` auditable. Si el monorepo crece mucho se puede evaluar
una herramienta de orquestación de builds.
