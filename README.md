# Sistema de fidelización con puntos — CLUB+

Programa de fidelización web: los socios acumulan puntos por compras elegibles, los
convierten automáticamente en cheques de descuento (5€ cada 250 puntos por defecto,
configurable) y los canjean. Incluye panel de administración para reglas del motor de
puntos, promociones y auditoría.

MVP implementado como **monolito modular** (decisión explícita del HLD/LLD del
proyecto), no microservicios: un backend NestJS con módulos internos por dominio
(`auth`, `customers`, `points-engine`, `cheques`, `promotions`, `events`, `admin`,
`audit`) y un frontend Next.js. Menos piezas móviles que operar y desplegar para un MVP,
con el mismo modelo de dominio.

## Stack

- **Backend**: NestJS + TypeScript, Prisma ORM sobre PostgreSQL 15, Redis (cache de
  lectura de 30-60s en catálogo de promociones y stats de admin), JWT (access 1h /
  refresh 7d, stateless).
- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind, usando los tokens de
  diseño del contrato UI/UX del proyecto (verde `#007A5E`, headers navy `#0E1A33`,
  marca "CLUB+").

## Estructura

```
backend/    API REST (ver /docs para Swagger una vez levantado)
frontend/   App del socio + panel de administración
docker-compose.yml   Postgres + Redis + backend + frontend para levantar todo local
```

## Cómo correrlo

```bash
docker compose up --build
# backend:  http://localhost:3001  (Swagger en /docs)
# frontend: http://localhost:3000
```

O en modo desarrollo sin Docker:

```bash
# Backend
cd backend
cp .env.example .env   # ajustar DATABASE_URL/REDIS_URL si hace falta
npm install
npx prisma migrate dev
npm run start:dev

# Frontend (en otra terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Tests

```bash
cd backend && npm test    # 27 tests unitarios: motor de puntos, cheques, auth, eventos, promociones, ownership
cd frontend && npx tsc --noEmit && npm run build   # type-check + build de producción
```

La lógica de negocio no trivial (acumulación de puntos, umbral de cheques, reversa por
devolución, idempotencia de eventos, canje/anulación de cheques, ownership por rol) está
cubierta con tests unitarios reales (mockeando Prisma), no solo happy-path.

## Decisiones y límites conocidos (MVP)

- **Auth propia (JWT), no SSO externo.** El levantamiento menciona un IdP corporativo
  como supuesto, pero no lo especifica (ver pregunta abierta TD-001 del LLD). Se
  implementó email/password propio para no bloquear el MVP; migrar a SSO/OIDC es un
  cambio acotado al módulo `auth`.
- **Refresh tokens stateless.** No hay revocación server-side (no hay tabla de
  sesiones). `POST /auth/logout` es un no-op del lado del servidor; el cliente
  descarta los tokens. Si se necesita revocación real, agregar una tabla de refresh
  tokens con estado.
- **`/events/ingest` y `/events/batch` requieren rol ADMIN** como puerta de entrada
  mínima, a falta de un mecanismo de API-key de integración server-to-server (fuera de
  alcance del MVP según el documento de requerimientos).
- **Expiración de cheques "al leer"**, no con un job programado. Se recalcula el
  estado `EXPIRED` la primera vez que se consulta o intenta canjear un cheque vencido.
  Suficiente para el volumen esperado del MVP.
- **Reversa de puntos por devolución nunca deja saldo negativo** (se clampea en 0). Si
  el socio ya convirtió esos puntos en un cheque, esa "deuda" de puntos no se cobra en
  otra compra — reconciliar eso requeriría un mecanismo de saldo pendiente que no
  contempla el MVP.
- Sin despliegue a producción ni integraciones reales con e-commerce/POS/CRM/IdP: son
  explícitamente **fuera de alcance** en el documento de requerimientos del proyecto.
  `/events/ingest` es el punto de integración preparado para cuando eso exista.

## Contexto del proyecto

Documentos de origen (Owner/Architect/UI-UX) en la plataforma AI Factory, proyecto
`e6776991-1f67-43d4-9c6b-646af81e176d`. El Developer Agent automatizado de la
plataforma quedó interrumpido a mitad de la generación del plan de desarrollo (el
contenedor se reinició en medio de la ejecución); este repositorio es la implementación
manual completa a partir de esos mismos documentos de requerimientos y arquitectura.
