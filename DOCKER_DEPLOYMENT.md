# 🐳 Docker Deployment Guide - GitHub Container Registry

## Overview

Your Snake Attack game is now containerized and automatically builds with GitHub Actions!

---

## 📦 What's Been Created

### **Files Added**
1. `Dockerfile` - Multi-stage build (optimized)
2. `.dockerignore` - Excludes unnecessary files
3. `.github/workflows/docker-build.yml` - Auto-build on push
4. `docker-compose.yml` - Local testing
5. Updated `server.ts` - Production-ready
6. Updated `package.json` - Docker scripts

---

## 🚀 How It Works

### **GitHub Actions Workflow**

When you push to `main`:
1. ✅ GitHub Actions triggers
2. ✅ Builds Docker image
3. ✅ Pushes to `ghcr.io/mucks/snake-attack`
4. ✅ Tags with `latest`, branch name, and commit SHA
5. ✅ Multi-platform (amd64 + arm64)

### **Docker Image**
- **Registry**: GitHub Container Registry (GHCR)
- **URL**: `ghcr.io/mucks/snake-attack:latest`
- **Size**: ~200MB (optimized multi-stage build)
- **Platforms**: Linux AMD64 + ARM64

---

## 🏃 Quick Start

### **1. Test Locally with Docker**

```bash
# Build the image
pnpm docker:build

# Run the container
pnpm docker:run

# Or use docker-compose
pnpm docker:compose
```

Then open: `http://localhost:3000`

### **2. Push to GitHub**

```bash
git add .
git commit -m "Add Docker setup"
git push origin main
```

GitHub Actions will automatically:
- Build the Docker image
- Push to `ghcr.io/mucks/snake-attack:latest`
- Available in ~5 minutes!

### **3. Deploy Anywhere**

Pull and run your image on any server:

```bash
# Pull from GitHub Container Registry
docker pull ghcr.io/mucks/snake-attack:latest

# Run it
docker run -d -p 3000:3000 --name snake-attack ghcr.io/mucks/snake-attack:latest
```

---

## 🌐 Where to Deploy

### **Option 1: DigitalOcean App Platform** ⭐
**Cost**: $5/month  
**Setup**:
1. Go to DigitalOcean
2. Create App → Docker Hub/Container Registry
3. Enter: `ghcr.io/mucks/snake-attack:latest`
4. Choose $5 basic plan
5. Deploy!

**URL**: `https://snake-attack-xxxxx.ondigitalocean.app`

### **Option 2: Railway.app** ⭐
**Cost**: $5/month  
**Setup**:
1. Go to Railway.app
2. New Project → Deploy from GitHub
3. Select your repo
4. Railway auto-detects Dockerfile
5. Done!

**URL**: `https://snake-attack-production.up.railway.app`

### **Option 3: Fly.io**
**Cost**: Free tier (3 VMs)  
**Setup**:
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Launch (from your project directory)
flyctl launch --image ghcr.io/mucks/snake-attack:latest

# Deploy
flyctl deploy
```

**URL**: `https://snake-attack.fly.dev`

### **Option 4: Your Own VPS**
**Cost**: $5-20/month (Hetzner, Linode, etc.)  
**Setup**:
```bash
# SSH into your server
ssh user@your-server.com

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Pull and run
docker pull ghcr.io/mucks/snake-attack:latest
docker run -d -p 80:3000 --restart unless-stopped ghcr.io/mucks/snake-attack:latest
```

**URL**: `http://your-server-ip`

---

## 🔐 Make GitHub Package Public

By default, GitHub packages are private. To make it public:

1. Go to: `https://github.com/users/mucks/packages/container/snake-attack`
2. Click **"Package settings"**
3. Scroll to **"Danger Zone"**
4. Click **"Change visibility"** → **"Public"**
5. Confirm

Now anyone can pull your image without authentication!

---

## 🔧 Configuration

### **Environment Variables**

Set these in your deployment platform:

```bash
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-domain.com  # Optional: restrict CORS
```

### **For DigitalOcean**
- App Settings → Environment Variables
- Add `NODE_ENV=production`

### **For Railway**
- Variables tab
- Add environment variables

### **For Fly.io**
```bash
flyctl secrets set NODE_ENV=production
```

---

## 📊 GitHub Actions Features

### **Automatic Builds**
- ✅ Triggers on push to `main`
- ✅ Triggers on pull requests
- ✅ Manual trigger available (workflow_dispatch)

### **Caching**
- ✅ Layer caching (faster builds)
- ✅ Uses GitHub Actions cache
- ✅ Subsequent builds: ~2-3 minutes

### **Tagging Strategy**
Every build creates multiple tags:
- `latest` - Always the newest main build
- `main` - Latest from main branch
- `main-abc123` - Commit SHA
- `pr-5` - PR number (for PRs)

### **Multi-Platform**
- ✅ `linux/amd64` - Most servers
- ✅ `linux/arm64` - Apple Silicon, Raspberry Pi

---

## 🧪 Testing Your Docker Image

### **Local Test**

```bash
# Build locally
docker build -t snake-attack .

# Run locally
docker run -p 3000:3000 snake-attack

# Test in browser
open http://localhost:3000
```

### **Test GitHub Container**

```bash
# Pull from GHCR (after Actions complete)
docker pull ghcr.io/mucks/snake-attack:latest

# Run it
docker run -p 3000:3000 ghcr.io/mucks/snake-attack:latest

# Test
open http://localhost:3000
```

---

## 🎯 Recommended Deployment Flow

### **For Production** (Best)

1. **Use Railway or DigitalOcean** ($5/month)
2. Connect to GitHub (auto-deploys)
3. Set environment variables
4. Get public URL
5. Share with friends!

### **For Free Hosting** (Limited)

1. **Use Fly.io** (free tier)
2. Deploy Docker container
3. 3 VMs free globally
4. Perfect for hobby projects

### **For Self-Hosting**

1. Rent a VPS ($5/month - Hetzner, Linode)
2. Install Docker
3. Pull from GHCR
4. Run container
5. Point domain to server

---

## 🔄 Update Workflow

### **Development**
```bash
# Make changes
git add .
git commit -m "Add new feature"
git push origin main

# Wait 5 minutes
# New Docker image automatically built!
# Pull and deploy: docker pull ghcr.io/mucks/snake-attack:latest
```

### **Continuous Deployment**
If using Railway/DigitalOcean with GitHub integration:
- Push to GitHub → Auto-builds → Auto-deploys → Live in 5 minutes!

---

## 📈 Monitoring

### **Check Build Status**
- Go to: `https://github.com/mucks/snake-attack/actions`
- See all workflow runs
- Click to view logs

### **View Container**
- Go to: `https://github.com/mucks/snake-attack/pkgs/container/snake-attack`
- See all image versions
- Download statistics

### **Docker Logs**
```bash
# If running locally
docker logs snake-attack

# Follow logs
docker logs -f snake-attack
```

---

## 🛠️ Useful Commands

### **Build & Test**
```bash
# Build image
docker build -t snake-attack .

# Run container
docker run -p 3000:3000 snake-attack

# Run with compose
docker-compose up

# Stop
docker-compose down
```

### **Debug**
```bash
# Enter running container
docker exec -it snake-attack sh

# Check logs
docker logs snake-attack

# Inspect image
docker inspect ghcr.io/mucks/snake-attack:latest
```

### **Cleanup**
```bash
# Remove containers
docker-compose down

# Remove images
docker rmi snake-attack

# Clean everything
docker system prune -a
```

---

## 🎉 Benefits

✅ **No Vercel limitations** - Full WebSocket support!  
✅ **Automatic builds** - Push and forget  
✅ **Version control** - Every commit tagged  
✅ **Portable** - Run anywhere Docker runs  
✅ **Reproducible** - Same environment everywhere  
✅ **Scalable** - Easy to add more instances  
✅ **Professional** - Industry-standard deployment  

---

## 🚀 Next Steps

1. **Push your code** to GitHub
2. **Wait for Actions** to complete (~5 min)
3. **Choose deployment platform** (Railway recommended)
4. **Deploy container** from GHCR
5. **Share URL** with friends!
6. **Play together!** 🎮

Your game is now production-ready with Docker! 🐳✨

