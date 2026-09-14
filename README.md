# Block Meadow 3D

Open `index.html` in a desktop browser with WebGL enabled. Keep `world3d.js` and `game3d.js` alongside it. Everything runs locally; no installation, server, account, or internet is needed.

A first-person 3D voxel sandbox with mining, building, flight, two linked realms, and creatures. You begin in creative mode with unlimited items.

- WASD / arrow keys: move. Mouse: look. Space: jump.
- Click **Enter the meadow** to capture the mouse; Esc releases it. If mouse capture is unavailable, drag to look and click Use / Fire.
- Left click: use your selected item. Select **Mine** to dig. Select a block to place it; right click builds with your last selected block.
- 1–9: staff, portal, dragon egg, Herobrine axe, gun, bomb, ice boomerang, sword, Herobrine. Q cycles every item; B cycles building blocks. Scroll the hotbar to reach bow, mining, and blocks.
- F: toggle flight. Space / Shift: fly up / down.
- Touch: drag the world to look, use the movement buttons and Use / Fire. Fly and Build have separate buttons.
- / or Commands: enter a command. The command panel lists all supported examples. Coordinates are now **x y z**, with y increasing upward.

The **magic staff** fires violet bolts for 30 damage. The **portal** creates a linked pair of gateways; walk into the violet doorway to travel between the meadow and the dragon realm, then through the other end to return. Placing a new portal replaces the previous pair and creates a clear landing platform.

The **dragon spawn egg** summons a flying, winged dragon with exactly **6,666,666,666,666 HP**, shown in the boss display and preserved in saves. Equip the new items with `/give staff`, `/give portal`, and `/give dragon_spawn_egg`. `/summon dragon` also works.

Your previous weapons remain available: the Herobrine axe fires a white laser for exactly 99 damage, the gun deals 12, the bow 8, and the sword 6. Pigs have 10 HP and can be killed. Bombs have a 1.2-second fuse and deal 24 damage within 3 blocks; walls shield creatures and the blast preserves terrain. The ice boomerang deals 6 damage once per creature, freezes it for 3 seconds, and returns to you. All weapons have unlimited uses. Herobrine's reusable spawn item is still available.

Creative mode prevents creature damage to you. Survival enables creature attacks, nighttime zombies, and mined-block inventory. Spectator passes through blocks and cannot attack. This is an original simplified sandbox, with a 48 × 28 × 48 block world in each realm; it does not implement Minecraft's full command set.

Save manually or let autosave run every 30 seconds. The two 3D realms, creatures, dragon health, equipment, and inventory save locally under a new browser storage key. The earlier 2D save and `game.js` are preserved; the 2D map is not automatically converted into 3D. Browser storage restrictions can prevent saving, and clearing browser data removes saves.

To run the 3D simulation checks, open `check3d.html` in a browser, or use Node.js:

```sh
node -e "require('./world3d.js'); require('./check3d.js')"
```

The original 2D regression checks remain in `check.cjs`.
# Jesse-Craft
