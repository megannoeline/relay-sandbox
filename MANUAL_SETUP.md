# Running Relay Services in Your Own Terminals

## Terminal Setup (4 terminals)

Open 4 terminal windows/tabs in your sandbox directory.

### Terminal 1: Config Service
```bash
cd /Users/megancase/Projects/personal/sandbox
export PYTHONPATH=$PYTHONPATH:/Users/megancase/Projects/relay/src
python3 -m relay.cli serve config --db /tmp/store.db --host 127.0.0.1 --port 8001
```

### Terminal 2: Manager Service
```bash
cd /Users/megancase/Projects/personal/sandbox
export PYTHONPATH=$PYTHONPATH:/Users/megancase/Projects/relay/src
python3 -m relay.cli serve manager --config http://127.0.0.1:8001 --host 127.0.0.1 --port 8000 --repos ./repos --poll 15
```

### Terminal 3: Worker Service
```bash
cd /Users/megancase/Projects/personal/sandbox
export PYTHONPATH=$PYTHONPATH:/Users/megancase/Projects/relay/src
python3 -m relay.cli serve worker --manager http://127.0.0.1:8000 --id w1 --host 127.0.0.1 --port 8002
```

### Terminal 4: Commands
```bash
cd /Users/megancase/Projects/personal/sandbox
export PYTHONPATH=$PYTHONPATH:/Users/megancase/Projects/relay/src

# Register and deploy
python3 register.py register
python3 register.py deploy sandbox.dev

# Check status
python3 -m relay.cli ps
docker ps
```

---

## GitHub Setup

### 1. Create `.gitignore`
```bash
cd /Users/megancase/Projects/personal/sandbox
cat > .gitignore << 'EOF'
# Relay
repos/
*.log

# Python
__pycache__/
*.pyc

# Temp files
*.db
*.db-shm
*.db-wal

# Scripts
debug_db.py
fix_jobs.py
test_docker.py
EOF
```

### 2. Initialize Git
```bash
git init
git add .
git commit -m "Initial Relay sandbox project"
```

### 3. Create GitHub Repo
1. Go to https://github.com/new
2. Create a new repo (e.g., "relay-sandbox")
3. **Don't** initialize with README

### 4. Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/relay-sandbox.git
git branch -M main
git push -u origin main
```

### 5. Future Changes
```bash
# Make your code changes
git add .
git commit -m "Your change description"
git push

# Relay will auto-detect the commit and redeploy!
```

---

## What You'll See in Each Terminal

**Terminal 1 (Config):**
```
16:39:45 config db /tmp/store.db
16:39:45 config listen 127.0.0.1:8001
```

**Terminal 2 (Manager):**
```
16:39:46 manager config http://127.0.0.1:8001
16:39:46 manager listen 127.0.0.1:8000
16:39:46 manager poll 15s
16:39:47 manager build sandbox local app abc1234
16:39:50 manager job run build:sandbox:local:app
```

**Terminal 3 (Worker):**
```
16:39:47 worker manager http://127.0.0.1:8000
16:39:47 worker listen 127.0.0.1:8002
16:39:50 worker POST /v1/apply 200 2341ms
```

**Terminal 4 (Commands):**
```
Registering project from: /Users/...
Result: {'ok': True, ...}
```

---

## Access Your Services

- **App**: http://localhost:9002 (or check `docker ps` for the port)
- **Database**: `localhost:5434` (use TablePlus)
- **Manager API**: http://127.0.0.1:8000
- **Worker API**: http://127.0.0.1:8002

## Stop Everything

Press `Ctrl+C` in each terminal to stop the services.
