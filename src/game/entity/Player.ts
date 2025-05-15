import ClientConnection from "../../util/connection.ts";
import { Gamemode } from "../../util/types.ts";
import { Entity } from "./Entity.ts";
import { EntityType } from "./EntityType.ts";

export class Player extends Entity {
	private readonly connection: ClientConnection;
	private readonly uuid: string | null;
	private readonly username: string;
	private readonly gameMode: Gamemode;
	private on_ground: boolean;

	private readonly hunger_bars: number;
	private readonly saturation: number;

	private readonly experience_level: number;
	private readonly experience_points: number;

	public constructor(
		connection: ClientConnection,
		username: string,
		uuid: string | null,
	) {
		super(EntityType.PLAYER);
		this.connection = connection;
		this.uuid = uuid;
		this.username = username;
		this.gameMode = Gamemode.CREATIVE;
		this.on_ground = true;
		this.hunger_bars = 20;
		this.saturation = 5;
		this.experience_level = 0;
		this.experience_points = 0;
	}

	getUUID() {
		return this.uuid;
	}

	getX() {
		return this.getPosition().x;
	}

	getY() {
		return this.getPosition().y;
	}

	getZ() {
		return this.getPosition().z;
	}

	getUsername() {
		return this.username;
	}

	getGamemode() {
		return this.gameMode;
	}

	isOnGround() {
		return this.on_ground;
	}

	setOnGround(on_ground: boolean) {
		this.on_ground = on_ground;
	}

	getHungerLevel() {
		return this.hunger_bars;
	}

	getSaturation() {
		return this.saturation;
	}

	getExperienceLevel() {
		return this.experience_level;
	}

	getExperiencePoints() {
		return this.experience_points;
	}

	async spawn(connection: ClientConnection) {
		// const writer = new WritableBuffer();
		// Types.BYTE.write(writer, PacketType.SPAWN_NAMED_ENTITY);
		// Types.INTEGER.write(writer, this.getEntityID());
		// writePacketString(writer, this.username);
		// const position = this.getPosition();
		// Logger.log(Level.INFO, "position: " + JSON.stringify(position));
		// Types.INTEGER.write(writer, position.x);
		// Types.INTEGER.write(writer, position.y);
		// Types.INTEGER.write(writer, position.z);
		// Types.BYTE.write(writer, this.getYaw());
		// Types.BYTE.write(writer, this.getPitch());
		// Types.SHORT.write(writer, 0); // TODO: inventory
		// await connection.getClient().write(writer.build());
	}

	async teleport(
		connection: ClientConnection,
		x: number = this.getX(),
		y: number = this.getY(),
		z: number = this.getZ(),
	) {
		// const writer = new WritableBuffer();
		// Types.BYTE.write(writer, PacketType.REL_ENTITY_MOVE_LOOK);
		// Types.INTEGER.write(writer, this.getEntityID());
		// Types.BYTE.write(writer, toAbsoluteRotation(x));
		// Types.BYTE.write(writer, toAbsoluteRotation(y));
		// Types.BYTE.write(writer, toAbsoluteRotation(z));
		// Types.BYTE.write(writer, toAbsoluteRotation(this.getYaw()));
		// Types.BYTE.write(writer, toAbsoluteRotation(this.getPitch()));
		// await connection.getClient().write(writer.build());
	}

	async disconnect(message: string) {
		await this.connection.kick(message);
	}
}
