# 🏆 Maze Challenges & Treasure System

## Overview

The game now features **5 maze challenges** scattered across the map, each containing a valuable **golden treasure** worth 30 points!

## 🎁 Collectible Abundance

### **600 Initial Collectibles** (3x increase!)
- ~420 Common (Yellow)
- ~120 Uncommon (Green)
- ~48 Rare (Blue)
- ~12 Epic (Magenta)

### **Auto-Respawn System**
- Maintains minimum **450 items** at all times
- Spawns up to **50 new items** every 5 seconds
- Map is now SATURATED with collectibles!

## 🏰 Maze Challenges

### **5 Maze Locations**
1. **Northeast** (300, 300)
2. **Southwest** (-300, -300)
3. **Southeast** (300, -300)
4. **Northwest** (-300, 300)
5. **North Center** (0, 400)

### **Maze Features**
- **25x25 unit size** - challenging but navigable
- **Glowing cyan walls** (semi-transparent)
- **Complex inner passages** - requires careful navigation
- **Collision detection** - can't phase through walls!

## 💎 Treasure Items

### **Visual Properties**
- **Color**: Brilliant Gold (#FFD700)
- **Size**: 1.0 units (largest collectible!)
- **Emissive**: Super bright (2.0 intensity)
- **Special Effects**:
  - Faster rotation (2.5x normal speed)
  - Wobbling motion on X-axis
  - Bigger vertical bounce (0.5 units)
  - Pulsing scale (±20%)
  - Golden point light above (radius 20 units)

### **Value**
- **Points**: 300 (30 value × 10)
- **Growth**: +30 length
- **Equivalent to**: ~30 common items or 3 epic items!

### **Strategic Importance**
- **High Risk, High Reward** - must navigate maze
- **Game-Changing** - can turn the tide instantly
- **Visible from far away** - glowing gold beacon
- **Always available** - treasures don't despawn

## 🎮 Gameplay Strategy

### **Early Game**
- Focus on abundant yellow items outside mazes
- Build up length before attempting mazes
- Watch for bots near maze entrances

### **Mid Game**
- Start exploring maze edges
- Learn maze patterns
- Attempt easier mazes first

### **Late Game**
- Aggressively hunt treasures
- Use boost to escape mazes quickly
- Defend maze entrances from other large snakes

## 🎨 Visual Design

### **Maze Walls**
- **Material**: Metallic cyan with glow
- **Height**: 3 units tall
- **Opacity**: 70% (can see through slightly)
- **Collision**: Full collision detection

### **Treasure Animation**
```
Rotation Y: Fast spin (0.05 rad/frame)
Rotation X: Wobble (sin wave, 0.3 amplitude)
Position Y: Big bounce (0.5 amplitude, slower frequency)
Scale: Pulse (1.0 ± 0.2, smooth sine wave)
```

## 📊 Maze Pattern

Each maze has:
- **4 outer walls** (North, South, East, West)
- **4 inner walls** creating passages:
  - 2 horizontal walls (half-width)
  - 2 vertical walls (third-width)
- **Multiple paths** to center
- **Dead ends** for challenge

## 🏅 Achievement Ideas

Future additions could include:
- **Maze Master** - Collect all 5 treasures
- **Speed Runner** - Get treasure in under 10 seconds
- **Treasure Hoarder** - Collect 3 treasures in one life
- **Maze Defender** - Kill 3 players near maze entrances

## 🎯 Tips & Tricks

1. **Scout first** - Learn the maze before committing
2. **Watch your tail** - Don't trap yourself!
3. **Boost in, boost out** - Use speed strategically
4. **Bait competitors** - Let others risk the maze first
5. **Golden glow** - Follow the light to find center

## 🔥 Competitive Play

Mazes create:
- **Choke points** - ambush opportunities
- **High-traffic areas** - likely to find opponents
- **Risk zones** - trapped snakes are easy kills
- **Power spikes** - +30 length advantage is huge!

Enjoy the hunt! 🎮✨

