import { PacketType, writePacketString } from "../../packet.ts";
import { ByteWriter, Type } from "../../util/byte.ts";
import ClientConnection from "../../util/connection.ts";
import { Gamemode } from "../../util/types.ts";
import { Entity } from "./Entity.ts";
import { EntityType } from "./EntityType.ts";

export class Player extends Entity {
    // TODO: UUID class, because uuid is actually numbers
    private _uuid: string | null;
    private _username: string;
    private _gamemode: Gamemode;
    private _on_ground: boolean;

    private _hunger_bars: number;
    private _saturation: number;

    private _experience_level: number;
    private _experience_points: number;

    private _spawned: boolean;

    public constructor(username: string, uuid: string | null) {
        super(EntityType.PLAYER);
        this._uuid = uuid;
        this._username = username;
        this._gamemode = Gamemode.CREATIVE;
        this._on_ground = true;
        this._hunger_bars = 20;
        this._saturation = 5;
        this._experience_level = 0;
        this._experience_points = 0;
        this._spawned = false;
    }

    getUUID() { return this._uuid; }

    getUsername() { return this._username; }

    getGamemode() { return this._gamemode; }

    isOnGround() { return this._on_ground; }

    setOnGround(on_ground: boolean) { this._on_ground = on_ground; }

    getHungerLevel() { return this._hunger_bars; }

    getSaturation() { return this._saturation; }

    getExperienceLevel() { return this._experience_level; }

    getExperiencePoints() { return this._experience_points; }

    hasSpawned() { return this._spawned; }

    async spawn(connection: ClientConnection) {
        if (this._spawned)
            return;
        const writer = new ByteWriter;
        writer.write(Type.BYTE, PacketType.SPAWN_NAMED_ENTITY);
        writer.write(Type.INTEGER, this.getEntityID());
        writePacketString(writer, this._username);
        const location = this.getLocation();
        const position = location.getPosition();
        writer.write(Type.INTEGER, position.x);
        writer.write(Type.INTEGER, position.y);
        writer.write(Type.INTEGER, position.z);
        writer.write(Type.BYTE, location.getYaw());
        writer.write(Type.BYTE, location.getPitch());
        writer.write(Type.SHORT, 0); // TODO: inventory
        await connection.write(writer.build());
        this._spawned = true;
    }

    async remove(connection: ClientConnection) {
        
    }
}