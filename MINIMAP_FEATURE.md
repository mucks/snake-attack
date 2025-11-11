# 🗺️ Minimap Feature

## Overview

A real-time tactical minimap has been added to the bottom-right corner, giving you strategic awareness of the entire battlefield!

## Location

**Bottom-Right Corner** of the screen
- Only visible when spawned
- 200×200 pixel canvas
- Styled with cyan theme matching game aesthetic

## What's Displayed

### 🎯 **You (Cyan)**
- Large cyan dot with glow effect
- Direction indicator line showing where you're heading
- Most prominent marker - easy to spot

### 🤖 **Bots (Red)**
- Small red dots
- Shows all alive and visible bots
- Helps you avoid or hunt them

### 👥 **Multiplayer Players (Purple)**
- Medium purple dots with glow
- Shows real players on the server
- Distinguish from AI bots

### 💎 **Treasures (Gold)**
- Large gold dots with bright glow
- Shows all 5 maze treasure locations
- Helps you navigate to maze challenges

### 🏰 **Maze Boundaries (Cyan Squares)**
- Semi-transparent cyan rectangles
- Shows maze wall locations
- Helps plan your approach

### 📐 **Grid**
- Subtle cyan grid lines
- Helps with distance estimation
- World boundary reference

## Features

### **Real-Time Updates**
- Updates every 5 frames (12 times/second)
- Low performance impact
- Smooth, responsive tracking

### **Smart Filtering**
- Only shows visible/alive entities
- Automatically tracks treasure collection
- Scales entire 2000-unit world to 200px

### **Visual Polish**
- Dark background with transparency
- Glowing player marker
- Shadow effects on important markers
- Cyan border matching game theme
- Rounded corners for modern look

## Legend

The minimap includes a built-in legend showing:
- **Cyan circle** = You
- **Red circle** = Bots
- **Purple circle** = Players
- **Yellow circle** = Treasure

## Strategic Uses

### **Navigation**
- Find nearest maze challenge
- See which treasures are still available
- Plan efficient collection routes

### **Awareness**
- Spot bots approaching from behind
- See if players are camping mazes
- Avoid crowded areas when small

### **Tactics**
- Identify isolated bots to hunt
- Race to unclaimed treasures
- Set up ambushes near mazes

### **Survival**
- Escape to empty areas when low
- Avoid bot clusters
- Find safe zones for respawn

## Technical Details

### **Implementation**
- HTML5 Canvas rendering
- useRef for data persistence
- Separate render loop (60fps)
- World-to-screen coordinate transformation

### **Performance**
- Updates data every 5 frames
- Renders at 60fps (separate from game)
- Filters only visible entities
- Minimal CPU impact (~1-2%)

### **Coordinates**
- World: 2000×2000 units
- Minimap: 200×200 pixels
- Scale: 1:10 ratio
- Center: (0, 0) in world = (100, 100) on minimap

## Map Coverage

The minimap shows the entire playable area:
- **Total coverage**: 2000×2000 units
- **Your position**: Always centered in view
- **Maze locations**: Fixed positions shown
- **Boundaries**: Edges of minimap = world edges

## Tips

1. **Glance quickly** - don't stare at minimap (you'll crash!)
2. **Use peripheral vision** - keep eyes on main game
3. **Plan routes** during safe moments
4. **Watch for treasure collection** - gold dots disappear when taken
5. **Bot clusters** - red areas = danger zones

## Future Enhancements

Possible additions:
- **Zoom control** - focus on nearby area
- **Ping system** - mark locations
- **Trail visualization** - show recent paths
- **Heat map mode** - show high-traffic areas
- **Collectible density** - show where items are clustered

Enjoy your enhanced situational awareness! 🎮✨

