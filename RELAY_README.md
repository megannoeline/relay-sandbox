# Relay Deployment System

## What is Relay?

Relay is a lightweight container orchestration system designed to simplify Docker-based application deployment. Think of it as a simpler alternative to Kubernetes or Docker Swarm.

## Core Concepts

### Architecture

Relay consists of three core services:

1. **Config Service** - Stores project configuration and deployment state in SQLite
2. **Manager Service** - Orchestrates builds, deployments, and worker coordination
3. **Worker Service(s)** - Executes Docker builds and runs containers

```
┌─────────────┐
│   Manager   │ ←── Watches git repos, triggers builds
└──────┬──────┘
       │
       ├──→ ┌────────┐
       │    │ Config │ ←── SQLite database
       │    └────────┘
       │
       └──→ ┌────────┐
            │ Worker │ ←── Builds images, runs containers
            └────────┘
```

### Configuration

Projects are defined using `relay.yaml`:

```yaml
project: myapp

containers:
  - name: app
    dockerfile: Dockerfile

services:
  - name: app
    container: app
    ports:
      - name: http
        port: 3000

deploys:
  - name: prod
    services:
      - service: app
        host: myapp.com
        port: 443
        target: http
```

## How It Works

### 1. Registration
```bash
relay projects register
```
- Registers your project with the Manager
- Manager starts watching the repository for changes

### 2. Auto-Build
When code changes are detected:
- Manager calculates a source hash
- Queues a build job
- Worker picks up the job
- Docker image is built and tagged (e.g., `myapp:main-abc1234`)

### 3. Auto-Deploy
After successful build:
- Manager creates deployment plan
- Worker receives apply command
- New container is started
- Health checks run
- Old container is stopped (zero-downtime)

### 4. Load Balancing
Multiple workers can run containers:
- Manager assigns containers to workers
- Built-in reverse proxy (Caddy) routes traffic
- Automatic failover if workers go down

## Key Features

✅ **Declarative Configuration** - Define desired state in YAML  
✅ **Git Integration** - Auto-deploy on commits  
✅ **Zero-Downtime Deploys** - Blue/green container switching  
✅ **Multi-Worker** - Distribute containers across machines  
✅ **Built-in Proxy** - Automatic HTTPS with Caddy  
✅ **Volume Management** - Persistent data handling  

## What We Learned (This Session)

### ✅ What Works
- Single-container builds and deployments
- Automatic rebuild on source changes
- Port mapping and container management
- Using pre-built images (e.g., `postgres:15-alpine`)

### ⚠️ Gotchas & Bugs
1. **Multi-container name collision** - Multiple containers in one project get the same Docker image tag
2. **Overly aggressive watching** - Relay watches the entire project directory, including logs and DB files
3. **No build isolation** - All containers build from project root (not their subdirectories)

### 💡 Workarounds
1. **Store state outside project** - Database and logs should go in `/tmp/` or elsewhere
2. **Use pre-built images** - For databases, use `image:` instead of `dockerfile:`
3. **One container per project** - Until multi-container support improves

## Commands

```bash
# Initialize config
relay init --defaults

# Start services
relay serve config --db /tmp/store.db --port 8001
relay serve manager --config http://localhost:8001 --port 8000
relay serve worker --manager http://localhost:8000 --id w1

# Register project
relay projects register

# Trigger deployment
relay deploy <project>.<deploy>

# View status
relay workers
relay projects
relay placements
relay deploys
```

## Our Deployment

**What's Running:**
- App: http://localhost:9002 (via Relay)
- Database: `localhost:5434` (manual Docker container)

**Services:**
- Config: `localhost:8001` (logs: `/tmp/relay-config.log`)
- Manager: `localhost:8000` (logs: `/tmp/relay-manager.log`)
- Worker: `localhost:8002` (logs: `/tmp/relay-worker.log`)

**Database Connection:**
```
Host: localhost
Port: 5434
User: user
Password: password
Database: toy_db
```

## Comparison to Alternatives

| Feature | Relay | Docker Compose | Kubernetes |
|---------|-------|---------------|------------|
| Complexity | Low | Low | High |
| Auto-deploy | ✅ | ❌ | ✅ (via tools) |
| Multi-host | ✅ | ❌ | ✅ |
| Learning curve | Medium | Easy | Steep |
| Production ready | ⚠️ (beta) | ❌ | ✅ |

## When to Use Relay

**Good for:**
- Small to medium web apps
- Internal tools and services
- Learning container orchestration
- Simple multi-host deployments

**Not ideal for:**
- Complex multi-container apps (current bugs)
- High-scale production (use K8s)
- Teams without Docker experience

## Resources

- Relay GitHub: (assumed to be open source)
- Docker Docs: https://docs.docker.com
- Caddy Docs: https://caddyserver.com/docs

---

*Last updated: 2026-01-22*
