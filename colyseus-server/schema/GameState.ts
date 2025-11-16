import { Schema, MapSchema, ArraySchema, type } from '@colyseus/schema';

export class TailPoint extends Schema {
    @type('number') public x: number = 0;
    @type('number') public y: number = 0;
    @type('number') public z: number = 0;
}

export class Player extends Schema {
    @type('string') public id: string = '';
    @type('number') public x: number = 0;
    @type('number') public y: number = 0;
    @type('number') public z: number = 0;
    @type('number') public dirX: number = 0;
    @type('number') public dirY: number = 0;
    @type('number') public dirZ: number = -1;
    @type('number') public targetRotation: number = 0;
    @type('number') public length: number = 5;
    @type('string') public color: string = '#00ffff';
    @type('boolean') public spawned: boolean = false;
    @type('boolean') public boosting: boolean = false;
    @type([TailPoint]) public tail = new ArraySchema<TailPoint>(); // Server-authoritative tail segments
    @type(['string']) public upgrades = new ArraySchema<string>(); // Active upgrades
}

export class WorldItem extends Schema {
    @type('string') public id: string = '';
    @type('number') public x: number = 0;
    @type('number') public y: number = 0;
    @type('number') public z: number = 0;
    @type('string') public type: string = 'common'; // common, uncommon, rare, epic, treasure
    @type('number') public value: number = 1;
}

export class WorldTree extends Schema {
    @type('string') public id: string = '';
    @type('number') public x: number = 0;
    @type('number') public z: number = 0;
    @type('number') public color: number = 0xff00ff; // Color as number
    @type('number') public height: number = 8;
}

export class WorldObstacle extends Schema {
    @type('string') public id: string = '';
    @type('number') public x: number = 0;
    @type('number') public z: number = 0;
    @type('string') public obstacleType: string = 'ring'; // ring, pillar, platform
    @type('number') public radius: number = 5;
}

export class MazeWall extends Schema {
    @type('string') public id: string = '';
    @type('number') public x: number = 0;
    @type('number') public z: number = 0;
    @type('number') public width: number = 2;
    @type('number') public depth: number = 2;
}

export class Maze extends Schema {
    @type('string') public id: string = '';
    @type('number') public centerX: number = 0;
    @type('number') public centerZ: number = 0;
    @type([MazeWall]) public walls = new ArraySchema<MazeWall>();
    @type('number') public treasureX: number = 0;
    @type('number') public treasureZ: number = 0;
    @type('number') public color: number = 0xff00ff; // Color as number (HSL hue converted to hex)
}

export class GameState extends Schema {
    @type({ map: Player }) public players = new MapSchema<Player>();
    @type({ map: WorldItem }) public items = new MapSchema<WorldItem>();
    @type([WorldTree]) public trees = new ArraySchema<WorldTree>();
    @type([WorldObstacle]) public obstacles = new ArraySchema<WorldObstacle>();
    @type([Maze]) public mazes = new ArraySchema<Maze>();
    @type('boolean') public worldGenerated: boolean = false;
}

