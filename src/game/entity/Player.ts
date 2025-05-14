import { PacketType, writePacketString } from "../../packet.ts";
import Types, { WritableBuffer } from "../../util/byte.ts";
import ClientConnection from "../../util/connection.ts";
import { Location, toAbsoluteRotation } from "../../util/mth.ts";
import { Gamemode } from "../../util/types.ts";
import { Entity } from "./Entity.ts";
import { EntityType } from "./EntityType.ts";

export class Player extends Entity {
	// TODO: UUID class, because uuid is actually numbers
	private readonly _uuid: string | null;
	private readonly _username: string;
	private readonly _gamemode: Gamemode;
	private _on_ground: boolean;

	private readonly _hunger_bars: number;
	private readonly _saturation: number;

	private readonly _experience_level: number;
	private readonly _experience_points: number;

	private _last_location: Location | null;

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
		this._last_location = null;
	}

	getUUID() {
		return this._uuid;
	}

	getX() {
		const position = this.getLocation().getPosition();
		return position.x;
	}

	getY() {
		const position = this.getLocation().getPosition();
		return position.y;
	}

	getZ() {
		const position = this.getLocation().getPosition();
		return position.z;
	}

	getUsername() {
		return this._username;
	}

	getGamemode() {
		return this._gamemode;
	}

	isOnGround() {
		return this._on_ground;
	}

	setOnGround(on_ground: boolean) {
		this._on_ground = on_ground;
	}

	getHungerLevel() {
		return this._hunger_bars;
	}

	getSaturation() {
		return this._saturation;
	}

	getExperienceLevel() {
		return this._experience_level;
	}

	getExperiencePoints() {
		return this._experience_points;
	}

	getLastLocation() {
		return this._last_location;
	}

	setLastLocation(location: Location) {
		this._last_location = location;
	}

	async spawn(connection: ClientConnection) {
		const writer = new WritableBuffer();
		Types.BYTE.write(writer, PacketType.SPAWN_NAMED_ENTITY);
		Types.INTEGER.write(writer, this.getEntityID());
		writePacketString(writer, this._username);
		const location = this.getLocation();
		const position = location.getPosition();
		Types.INTEGER.write(writer, position.x);
		Types.INTEGER.write(writer, position.y);
		Types.INTEGER.write(writer, position.z);
		Types.BYTE.write(writer, this.getYaw());
		Types.BYTE.write(writer, this.getPitch());
		Types.SHORT.write(writer, 0); // TODO: inventory
		await connection.write(writer.build());
	}

	async remove(connection: ClientConnection) {
		const writer = new WritableBuffer();
		Types.BYTE.write(writer, PacketType.DESTROY_ENTITY);
		Types.INTEGER.write(writer, this.getEntityID());
		await connection.write(writer.build());
	}

	async teleport(
		connection: ClientConnection,
		x: number = this.getX(),
		y: number = this.getY(),
		z: number = this.getZ(),
	) {
		const writer = new WritableBuffer();
		Types.BYTE.write(writer, PacketType.REL_ENTITY_MOVE_LOOK);
		Types.INTEGER.write(writer, this.getEntityID());
		Types.BYTE.write(writer, toAbsoluteRotation(x));
		Types.BYTE.write(writer, toAbsoluteRotation(y));
		Types.BYTE.write(writer, toAbsoluteRotation(z));
		Types.BYTE.write(writer, toAbsoluteRotation(this.getYaw()));
		Types.BYTE.write(writer, toAbsoluteRotation(this.getPitch()));
		await connection.write(writer.build());
	}
}
