import { Gamemode } from "../../util/types.ts";
import { Entity } from "./Entity.ts";
import { EntityType } from "./EntityType.ts";

export class Player extends Entity {
    private _connection_id: number;
    
    // TODO: UUID class, because uuid is actually numbers
    private _uuid: string;
    private _gamemode: Gamemode;
    private _on_ground: boolean;

    private _hunger_bars: number;
    private _saturation: number;

    private _experience_level: number;
    private _experience_points: number;

    public constructor(_connection_id: number, uuid: string) {
        super(EntityType.PLAYER);
        this._connection_id = _connection_id;
        this._uuid = uuid;
        this._gamemode = Gamemode.CREATIVE;
        this._on_ground = true;
        this._hunger_bars = 20;
        this._saturation = 5;
        this._experience_level = 0;
        this._experience_points = 0;
    }

    getConnectionID() { return this._connection_id; }

    getUUID() { return this._uuid; }

    getGamemode() { return this._gamemode; }

    isOnGround() { return this._on_ground; }

    setOnGround(on_ground: boolean) { this._on_ground = on_ground; }

    getHungerLevel() { return this._hunger_bars; }

    getSaturation() { return this._saturation; }

    getExperienceLevel() { return this._experience_level; }
    
    getExperiencePoints() { return this._experience_points; }
}