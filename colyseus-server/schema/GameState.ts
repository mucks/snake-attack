import { Schema, MapSchema, type } from '@colyseus/schema';

export class Player extends Schema {
    @type('string') public id: string = '';
    @type('number') public x: number = 0;
    @type('number') public y: number = 0;
    @type('number') public z: number = 0;
    @type('number') public targetRotation: number = 0;
    @type('number') public length: number = 5;
    @type('string') public color: string = '#00ffff';
    @type('boolean') public spawned: boolean = false;
    @type('boolean') public boosting: boolean = false;
}

export class GameState extends Schema {
    @type({ map: Player }) public players = new MapSchema<Player>();
}

