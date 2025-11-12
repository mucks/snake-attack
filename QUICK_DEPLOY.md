# ⚡ Quick Deploy - 3 Steps

## 🚀 Deploy to Production in 3 Steps

### **Step 1: Push to GitHub** ✅ (Already Done!)
```bash
git add .
git commit -m "Add Docker deployment"
git push origin main
```

### **Step 2: Wait for Build** (5 minutes)
- Go to: https://github.com/mucks/snake-attack/actions
- Watch the build complete
- Image pushed to: `ghcr.io/mucks/snake-attack:latest`

### **Step 3: Deploy** (Choose One)

#### **Option A: Railway.app** (Easiest)
1. Go to railway.app
2. New Project → **"Docker Image"**
3. Enter: `ghcr.io/mucks/snake-attack:latest`
4. Deploy!
5. Get URL: `https://snake-attack-production.up.railway.app`

**Cost**: $5/month

#### **Option B: Fly.io** (Free)
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Launch
flyctl launch --image ghcr.io/mucks/snake-attack:latest --name snake-attack

# Deploy
flyctl deploy
```

**Cost**: Free (3 VMs)

#### **Option C: DigitalOcean**
1. Go to DigitalOcean Apps
2. Create App → Docker Hub
3. Enter: `ghcr.io/mucks/snake-attack:latest`
4. Choose $5 plan
5. Deploy!

**Cost**: $5/month

---

## 🎮 You're Done!

Your game is now live at your deployment URL! Share it with friends! 🎉

**Features Working:**
- ✅ Next.js frontend
- ✅ Socket.IO multiplayer
- ✅ 60 FPS performance
- ✅ All game features
- ✅ Auto-deploys on push

---

## 🔄 Update Your Game

```bash
# Make changes
# ... edit files ...

# Push to GitHub
git add .
git commit -m "New feature"
git push

# Wait 5 minutes
# New image built automatically!

# On Railway/DO: Auto-deploys
# On Fly.io: flyctl deploy
```

---

## 📊 Where Is Everything?

- **Code**: github.com/mucks/snake-attack
- **Docker Image**: ghcr.io/mucks/snake-attack
- **Builds**: github.com/mucks/snake-attack/actions
- **Game**: Your deployment URL

---

**That's it! Your game is production-ready!** 🚀🎮

