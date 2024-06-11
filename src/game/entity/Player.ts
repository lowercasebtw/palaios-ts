import { server } from "../../index.ts";
import { Level, Logger } from "../../logger/Logger.ts";
import { PacketType } from "../../packet.ts";
import { ByteWriter, Type } from "../../util/byte.ts";
import { Gamemode } from "../../util/types.ts";
import { Entity } from "./Entity.ts";
import { EntityType } from "./EntityType.ts";

export class Player extends Entity {
    // TODO: UUID class, because uuid is actually numbers
    private _uuid: string;
    private _display_name: string;
    private _gamemode: Gamemode;
    private _on_ground: boolean;

    private _hunger_bars: number;
    private _saturation: number;

    private _experience_level: number;
    private _experience_points: number;

    public constructor(username: string, uuid: string) {
        super(EntityType.PLAYER);
        this._uuid = uuid;
        this._display_name = username;
        this._gamemode = Gamemode.CREATIVE;
        this._on_ground = true;
        this._hunger_bars = 20;
        this._saturation = 5;
        this._experience_level = 0;
        this._experience_points = 0;
    }

    getUUID() { return this._uuid; }

    getDisplayName() { return this._display_name; }

    getGamemode() { return this._gamemode; }

    isOnGround() { return this._on_ground; }

    setOnGround(on_ground: boolean) { this._on_ground = on_ground; }

    getHungerLevel() { return this._hunger_bars; }

    getSaturation() { return this._saturation; }

    getExperienceLevel() { return this._experience_level; }
    
    getExperiencePoints() { return this._experience_points; }

    async sendMessage(message: string) {
        const writer = new ByteWriter();
        writer.write(Type.SHORT, PacketType.CHAT_MESSAGE);
        writer.write(Type.STRING, message);
        const client = server.getClientForPlayer(this)!;
        await client.write(writer.build());
    }
}