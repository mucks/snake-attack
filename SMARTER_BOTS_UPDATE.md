# 🤖 Smarter Bots - Growth & Attack Strategy

## Overview

Bots now play much smarter - they actively collect items to grow strong before attacking!

---

## 🎯 New Bot Behavior System

### **Size-Based Strategies** (4 tiers)

#### **1. Tiny (< 30 length)** 🐣
**Goal**: Survive and grow
- **Flee from players** when too close (<40 units)
- **Seek nearest items** aggressively
- **Avoid combat** completely
- **Wander towards center** to find items

#### **2. Small (30-49 length)** 🐍
**Goal**: Grow to medium size
- **Actively hunt items** within 100 units
- **Avoid large players**
- **Chase items aggressively**
- **No combat** - focus on growth

#### **3. Medium (50-79 length)** 💪
**Goal**: Become combat-ready
- **Prioritize high-value items!**
  - Epic items get 70% priority boost
  - Rare items get 50% priority boost
  - Uncommon get 30% priority boost
- **Still avoid direct combat**
- **Build up to large size** before fighting
- **Smart item selection** - go for blues and magentas!

#### **4. Large (80+ length)** 👑
**Goal**: Dominate and hunt
- **Aggressive player hunting** (<120 units)
- **Predictive interception**
- **Cut off escape routes**
- **Box in opponents**
- **Very dangerous!**

---

## 📈 Improved Collection System

### **Increased Search Range**
- **Before**: 60 units
- **After**: 100 units
- Bots now see items much farther away!

### **Smart Item Prioritization**
Medium bots now calculate priority scores:
```typescript
priority = distance;
if (item.type === 'epic') priority *= 0.3;  // 70% priority boost!
if (item.type === 'rare') priority *= 0.5;   // 50% boost
if (item.type === 'uncommon') priority *= 0.7; // 30% boost
```

**Result**: Bots will travel farther for epic items than common items!

### **Collection Range**
- Still 2 units (same as player)
- But bots actively chase items now
- Much better at actually collecting

---

## 🚀 Smarter Boosting

### **New Boost Triggers**
1. **When hunting** (large + close to player) - 6% chance
2. **When cutting off** (60+ length + very close) - 4% chance
3. **When escaping danger** - 8% chance  
4. **When chasing items!** - 5% chance when item <25 units away

### **Boost Cooldown**
- **Reduced**: 80 → **60 frames**
- Bots boost more frequently
- More aggressive gameplay

### **Item Chase Boost**
New behavior! Bots now boost to catch items:
```typescript
if (bot.length > 20 && nearestItemDist < 25 && Math.random() < 0.05) {
    boost(); // Speed up to grab that item!
}
```

---

## 🎮 Strategic Changes

### **Hunting Range Increased**
- **Before**: Large bots hunt within 80 units
- **After**: Large bots hunt within **120 units**
- Much more aggressive!

### **Growth Phase Extended**
- **Before**: Bots attacked at 35+ length
- **After**: Bots focus on growth until **80 length**
- 2.3x longer growth phase
- Arrive to combat much stronger!

### **Smarter Fleeing**
- **Tiny bots** (<30) actively flee from players
- **Small bots** (30-49) avoid when close
- **Medium bots** (50-79) still cautious
- **Large bots** (80+) fearless

---

## 📊 Expected Bot Performance

### **Early Game (Minutes 0-2)**
- Bots collect items rapidly
- Avoid player
- Grow from 20 → 50 length
- Low threat level

### **Mid Game (Minutes 2-5)**
- Bots reach 50-80 length
- Hunt for rare/epic items
- Still avoid combat
- Building strength

### **Late Game (Minutes 5+)**
- Many bots reach 80+ length
- **Very dangerous!**
- Actively hunt player
- Use boost aggressively
- Cut off escape routes

---

## 🏆 Difficulty Comparison

### **Before**
- Bots attacked immediately
- Stayed small (35-45 length typically)
- Easy to avoid and kill
- Not threatening

### **After**
- **Bots grow to 80+ length** before attacking
- **Smart item collection**
- **Prioritize rare items**
- **Much longer and more dangerous**
- **Harder to escape** from
- **Actually threatening!**

---

## 💡 Player Counter-Strategies

### **Early Game**
- Collect items before bots get them
- Watch for growing bots on minimap
- Don't let them reach 80 length
- Kill them while they're medium size

### **Mid Game**
- Bots are 50-70 length now
- Still can be challenged
- Use boost to steal their items
- Grow faster than them

### **Late Game**
- Multiple bots at 80+ length
- **Very dangerous!**
- Use shield upgrade if available
- Use speed/turn upgrades to evade
- Lead them into walls/obstacles

---

## 🎯 Design Goals Achieved

✅ **Bots collect items** - Actively seek and prioritize  
✅ **Bots grow longer** - Reach 80+ before fighting  
✅ **Bots attack when strong** - Only hunt at 80+ length  
✅ **Smarter item selection** - Prioritize rare/epic  
✅ **More challenging** - Actually grow to threatening sizes  
✅ **Better pacing** - Early game peaceful, late game intense  

---

## 🔢 Key Thresholds

| Size | Length | Behavior |
|------|--------|----------|
| Tiny | <30 | Flee + collect |
| Small | 30-49 | Collect only |
| Medium | 50-79 | Smart collection + build up |
| Large | 80+ | **HUNT PLAYER!** |

---

## 🚀 Impact on Gameplay

### **More Dynamic Difficulty**
- Early: Easy (bots are small)
- Mid: Moderate (bots growing)
- Late: **Hard!** (bots are huge)

### **Race Against Time**
- Must collect items fast
- Before bots get them all
- Before bots become unstoppable
- Creates urgency!

### **Strategic Depth**
- Can you grow faster than bots?
- Will you sabotage bot collection?
- Lead bots into each other?
- Kill them before they're strong?

---

## 🎮 Watch Out For

**Red dots on minimap growing:**
- If you see bots staying in one area (item farming)
- They're getting longer!
- Go stop them or avoid that area
- Once they're large, they'll hunt you!

**Large bot swarms:**
- Multiple 80+ length bots
- Will actively hunt you
- Use mazes for safety
- Use boost to escape

---

## 🏅 Result

Bots now feel like **real players**:
- They have a strategy (grow then fight)
- They make smart decisions (prioritize good items)
- They're patient (wait until strong)
- They're dangerous (80+ length hunters)

**Much more challenging and rewarding to play against!** 🎮✨

