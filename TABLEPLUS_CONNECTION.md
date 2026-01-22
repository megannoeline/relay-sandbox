# TablePlus Connection Details

## Connection Settings

**Type**: PostgreSQL

**Host**: `localhost` (or `127.0.0.1`)

**Port**: `5434`

**User**: `user`

**Password**: `password`

**Database**: `toy_db`

## Quick Connect URL

```
postgresql://user:password@localhost:5434/toy_db
```

## Container Details

- **Container Name**: `sandbox-postgres`
- **Image**: `postgres:15-alpine`
- **External Port**: `5434` (mapped to internal `5432`)
- **Init Script**: `/Users/megancase/Projects/personal/sandbox/db/init.sql`

## Verify Connection

Test the connection from terminal:
```bash
psql -h localhost -p 5434 -U user -d toy_db
# Password: password
```

Or view tables:
```bash
docker exec sandbox-postgres psql -U user -d toy_db -c "\dt"
```
