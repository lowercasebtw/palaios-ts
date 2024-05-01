import { Gamemode } from "../../util/types.ts";
import { Entity } from "./Entity.ts";
import { EntityType } from "./EntityType.ts";

export class Player extends Entity {
    private _rid: number;
    // TODO: UUID class, because uuid is actually numbers
    private _uuid: string;
    private _gamemode: Gamemode;

    public constructor(rid: number, uuid: string) {
        super(EntityType.PLAYER);
        this._rid = rid;
        this._uuid = uuid;
        this._gamemode = Gamemode.CREATIVE;
    }

    getRID() { return this._rid; }

    getUUID() { return this._uuid; }

    getGamemode() { return this._gamemode; }
}