import ClientConnection from "../../util/connection.ts";
import { Gamemode } from "../../util/types.ts";
import { Entity } from "./Entity.ts";
import { EntityType } from "./EntityType.ts";
import { toAbsolutePositionVec, toAbsoluteRotation, Vec3d } from "../../util/mth.ts";
import EntityTeleportPacket from "../../packet/EntityTeleportPacket.ts";
import SpawnNamedEntityPacket from "../../packet/SpawnNamedEntityPacket.ts";

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
		await connection.sendPacket(
			new SpawnNamedEntityPacket(
				this.getEntityID(),
				this.username,
				this.getPosition(),
				this.getYaw(),
				this.getPitch(),
				0, // TODO: inventory
			),
		);
	}

	async teleport(
		connection: ClientConnection,
		x: number = this.getX(),
		y: number = this.getY(),
		z: number = this.getZ(),
	) {
		await connection.sendPacket(
			new EntityTeleportPacket(
				this.getEntityID(),
				toAbsolutePositionVec(new Vec3d(x, y, z)),
				toAbsoluteRotation(this.getYaw()),
				toAbsoluteRotation(this.getPitch()),
			),
		);
	}

	async disconnect(message: string) {
		await this.connection.kick(message);
	}
}
