# Entrega — Sistema de fidelización con puntos (CLUB+)

**Estado:** COMPLETADO
**Fecha de entrega:** 2026-09-21
**Repositorio:** https://github.com/aifactory-api-ux/sistema-de-fidelizacion-con-puntos
**Commit entregado:** `eadc9d4` (rama `main`)

## Nota técnica — origen de esta entrega

El proyecto en AI Factory (`e6776991-1f67-43d4-9c6b-646af81e176d`) tiene un run
automático del Developer Agent (`run-67cda945-6a03-4283-bd60-dbd3868d3a52`) cuyo
estado real es **`failed` / `outcome: cancelled`**: el contenedor del Developer
Agent se reinició a mitad de la generación del plan de desarrollo (step
`development_plan`, 3/4), antes de llegar a generar código. Ese estado no fue
modificado y sigue siendo consultable en la plataforma tal cual ocurrió.

A partir de los documentos ya generados por las etapas previas del pipeline
(Owner: requisitos; Architect: HLD/LLD; UI/UX: contrato de diseño e
implementación), la implementación completa de backend, frontend, tests y
CI de este documento fue realizada manualmente, fuera del pipeline
automático, dado que este último no llegó a producir el código.

## Verificación realizada en esta entrega (2026-09-21)

- **Backend:** `cd backend && npm test` → **27/27 tests unitarios pasando**
  (motor de puntos, cheques, auth, eventos/idempotencia, promociones,
  ownership por rol). `npx tsc` / `nest build` sin errores.
- **Frontend:** `npx tsc --noEmit` sin errores. `next build` genera las 11
  rutas correctamente (`/`, `/login`, `/registro`, `/dashboard`, `/cheques`,
  `/promociones`, `/admin`, `/admin/puntos`, `/admin/promociones`,
  `/admin/auditoria`).
- **Stack completo levantado con `docker compose up --build`** (Postgres 15 +
  Redis 7 + backend + frontend) y probado end-to-end con datos reales:
  registro de socio → login → evento de compra (260 pts) → emisión automática
  de cheque al cruzar el umbral de 250 pts → canje de cheque → generación de
  QR → creación de promoción → stats del dashboard admin → audit log — todo
  verificado con respuestas reales de la API, no mockeadas.

## Funcionalidades implementadas

**Socio:**
- Registro y login (JWT, access 1h / refresh 7d).
- Dashboard: saldo de puntos, progreso hacia el próximo cheque, cheques
  disponibles, promociones relevantes, últimos movimientos.
- Mis Cheques (filtros Activos/Usados/Caducados), canje de cheques.
- Catálogo de promociones.

**Motor de puntos (automático):**
- Acumulación configurable (ratio puntos/€).
- Emisión automática de cheques al cruzar el umbral configurado (250 pts →
  5€ por defecto), incluso si una sola compra cruza varios umbrales.
- Reversa de puntos por devolución, sin dejar saldo negativo.
- Idempotencia de eventos (`externalEventId` único — reenvíos no duplican).
- Herramienta de reconciliación de saldos desde el ledger.

**Administración:**
- Dashboard con KPIs (socios activos, puntos emitidos, cheques
  emitidos/canjeados, tasa de canje, promociones activas) y actividad
  reciente.
- Configuración versionada del motor de puntos (cada cambio queda auditado,
  no reescribe el historial).
- CRUD de promociones + asignación dirigida a socios.
- Auditoría: ledger de puntos y log de auditoría filtrable (quién, qué,
  cuándo).
- Roles: SOCIO, ADMIN, ATENCION_CLIENTE (consulta sin edición), AUDITOR
  (solo lectura de ledger/auditoría).

## Stack

NestJS + Prisma + PostgreSQL 15 + Redis (cache de lectura), Next.js 16 +
TypeScript + Tailwind. Monolito modular (decisión explícita del HLD/LLD del
proyecto). CI en GitHub Actions (lint + test + build backend, typecheck +
build frontend).

## Límites conocidos del MVP

Ver sección "Decisiones y límites conocidos (MVP)" en el [README](./README.md):
auth propia (no SSO externo), refresh tokens sin revocación server-side,
`/events/ingest` como puerta de integración provisoria, expiración de
cheques evaluada al leer, reversa de puntos clampeada en 0.
