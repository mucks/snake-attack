# 🎮 Upgrade System - Roguelike Power-Ups!

## Overview

A roguelike-inspired upgrade system that lets you choose powerful abilities as you level up!

---

## 📊 Level System

### **How Leveling Works**
- **1 Level** = **50 Length**
- Collect items to grow your snake
- Every 50 length units = level up!

**Examples:**
- Length 50 → Level 1
- Length 100 → Level 2
- Length 150 → Level 3
- Length 500 → Level 10

### **Level Up Trigger**
- ✅ Automatic when reaching next 50 length milestone
- ✅ Game pauses
- ✅ Shows 3 random upgrade cards
- ✅ Choose one to continue

---

## 🃏 Available Upgrades (8 Total)

### 1. **⚡ Speed Demon**
- **Effect**: +30% base movement speed
- **Strategy**: Get to collectibles faster, escape danger
- **Stacks**: Yes (can get multiple times)

### 2. **🌀 Turn Master**
- **Effect**: +50% turn speed  
- **Strategy**: Better maneuverability, tighter turns
- **Stacks**: Yes

### 3. **💨 Efficient Boost**
- **Effect**: Boost costs 50% less length
- **Strategy**: Use boost more freely, longer boosts
- **Stacks**: Yes (gets really cheap!)

### 4. **🧲 Item Magnet**
- **Effect**: 2x collection range (4 units instead of 2)
- **Strategy**: Auto-collect nearby items, less precision needed
- **Stacks**: No (already 2x)

### 5. **🧛 Vampire**
- **Effect**: Gain 20% length of any snake you kill
- **Strategy**: Aggressive playstyle, hunt other snakes
- **Stacks**: Yes (40%, 60%, etc.)
- **Note**: Currently passive (will work when you cause deaths)

### 6. **🛡️ Thick Skin**
- **Effect**: Survive 1 hit, teleport to safety
- **Strategy**: Insurance against mistakes
- **Stacks**: Yes (each gives another shield)
- **Visual**: Shows in active upgrades while active

### 7. **💰 Double Points**
- **Effect**: 2x score from all collectibles
- **Strategy**: Climb leaderboard faster
- **Stacks**: Yes (4x, 8x, etc.!)

### 8. **🚀 Mega Boost**
- **Effect**: 2x boost speed
- **Strategy**: Insane speed, escape/chase
- **Stacks**: Yes (4x, 8x boost speed!)

---

## 🎲 Selection Process

### **When You Level Up**
1. Game pauses (can't move)
2. Screen shows "LEVEL UP!" animation
3. 3 random upgrade cards appear
4. Each shows: Icon, Name, Description

### **How to Choose**
- **Click** on a card
- **Press** 1, 2, or 3 on keyboard
- Game resumes immediately after selection

### **Random Selection**
- All 8 upgrades shuffled each level
- 3 shown as options
- Can get same upgrade multiple times (stacking!)
- Different options each level

---

## 🎨 UI Design

### **Upgrade Cards**
- **Size**: 250px wide, tall format
- **Colors**: Purple to cyan gradient
- **Hover**: Scale up, color shift
- **Border**: Glows on hover
- **Layout**: Horizontal row of 3

### **Card Contents**
- **Icon**: Large emoji (5xl size)
- **Name**: Upgrade name (2xl)
- **Description**: What it does
- **Hint**: "Press 1/2/3"

### **Active Upgrades Display**
- **Location**: Bottom-left corner
- **Shows**: All equipped upgrades with icons
- **Style**: Purple theme, rounded badges
- **Tooltip**: Hover for description

### **Level Display**
- **Location**: Top center (with score & items)
- **Color**: Purple
- **Format**: Just the number
- **Updates**: Real-time

---

## 🎮 Strategic Depth

### **Early Game (Levels 1-3)**
**Best Picks:**
- Item Magnet (collect faster)
- Speed Demon (get to items first)
- Boost Efficiency (escape danger)

### **Mid Game (Levels 4-7)**
**Best Picks:**
- Turn Master (better navigation)
- Thick Skin (safety net)
- Double Points (snowball score)

### **Late Game (Levels 8+)**
**Best Picks:**
- Mega Boost (dominate)
- Vampire (hunt aggressively)
- Stack previous upgrades

### **Synergies**
- **Speed + Turn** = Unstoppable movement
- **Boost Efficiency + Mega Boost** = Always boosting
- **Item Magnet + Double Points** = Score machine
- **Multiple Thick Skins** = Very hard to kill

---

## 💡 Build Ideas

### **"Speed Demon" Build**
- Speed Demon (x2-3)
- Turn Master (x2)
- Mega Boost
- Result: Fastest snake alive!

### **"Tank" Build**
- Thick Skin (x3-4)
- Boost Efficiency
- Item Magnet
- Result: Very hard to kill

### **"Hunter" Build**
- Vampire (x2-3)
- Mega Boost
- Speed Demon
- Result: Aggressive killer

### **"Collector" Build**
- Item Magnet
- Double Points (x2-3)
- Speed Demon
- Result: Highest score

---

## 🔢 Math

### **Leveling Speed**
- Common items: +3 length → 16.7 items per level
- Uncommon: +5 length → 10 items per level
- Rare: +8 length → 6.3 items per level
- Epic: +15 length → 3.3 items per level
- Treasure: +30 length → 1.7 items per level

### **Realistic Progression**
- Level 1: ~17 common items (easy!)
- Level 2: ~17 more items
- Level 5: Probably have 2-3 upgrades
- Level 10: Probably have 6-8 upgrades (powerful!)

### **Maximum Levels**
- Theoretically infinite!
- Practically: Level 10-15 is endgame
- Very skilled: Level 20+

---

## 🎯 Tips

1. **Plan your build** - Think about synergies
2. **Thick Skin early** - Great safety net
3. **Stack multipliers** - Double Points can stack infinitely!
4. **Adapt to situation** - Losing? Get shield. Winning? Get speed!
5. **Experiment** - Every game can be different

---

## 🚀 Future Enhancements

Possible additions:
- **Negative trades** - "+Speed but -Turn"
- **Legendary upgrades** - Ultra rare, ultra powerful
- **Temporary buffs** - 30-second power-ups
- **Upgrade reroll** - Skip and get 3 new options
- **Upgrade removal** - Remove unwanted upgrades
- **Prestige system** - Reset for permanent bonuses

---

## 🏆 Achievement Ideas

- **First Blood**: Get your first upgrade
- **Power House**: Have 5 upgrades active
- **Specialist**: Max out one upgrade type (x5)
- **Generalist**: Have all 8 upgrade types
- **Immortal**: Use 5 shields in one life
- **Speed Runner**: Reach level 10

---

## 🎨 Visual Indicators

### **When Shielded** (Thick Skin)
- Shows in active upgrades list
- Badge with 🛡️ icon
- Disappears after blocking one hit

### **When Boosting with Mega Boost**
- Extra bright trail
- Faster boost speed (visible!)

### **When Using Item Magnet**
- Items collected from farther away (visible!)

---

Enjoy the roguelike progression! Every run is different based on your upgrade choices! 🎮✨

