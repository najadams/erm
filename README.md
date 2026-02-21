## Development

1) Copy `env.example` to `.env` and adjust secrets/URLs as needed.
2) Install deps: `npm install`
3) Run dev server: `npm run dev`

## Docker (local stack)

Prereqs: Docker/Compose installed.

- Build + start: `docker compose up --build`
- Services: Postgres (5432), Redis (6379), MinIO (9000/9001), app (3000), NGINX proxy (80).
- Default credentials in `env.example`; override in `.env`.

## Database

- Prisma datasource targets PostgreSQL via `DATABASE_URL`.
- Run migrations (when added): `npx prisma migrate dev`

# ermGipc
