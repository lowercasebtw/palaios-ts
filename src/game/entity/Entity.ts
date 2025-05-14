import { Location, Vec3d } from "../../util/mth.ts";
import { DimensionType } from "../../util/types.ts";
import ItemStack from "../item/ItemStack.ts";
import { EntityType } from "./EntityType.ts";
import ClientConnection from "../../util/connection.ts";
import Types, { WritableBuffer } from "../../util/byte.ts";
import { PacketType } from "../../serverPacketHandler.ts";

// TODO
export class Entity {
	private static LAST_ENTITY_ID = 0;

	private readonly _id: number;
	private readonly _type: EntityType;

	private readonly _inventory: Map<number, ItemStack>;
	private _location: Location;
	private _health: number;
	private _yaw: number;
	private _pitch: number;

	private last_position: Vec3d;

	public constructor(type: EntityType) {
		this._id = Entity.LAST_ENTITY_ID++;
		this._type = type;
		this._inventory = new Map();
		this._location = new Location(
			DimensionType.OVERWORLD,
			new Vec3d(0, 128, 0),
		);
		this._health = 20;
		this._yaw = 0;
		this._pitch = 0;
		this.last_position = this._location.getPosition();
	}

	getEntityID() {
		return this._id;
	}

	getType() {
		return this._type;
	}

	getInventory() {
		return this._inventory;
	}

	getPosition() {
		return this._location.getPosition();
	}

	setPosition(position: Vec3d) {
		this.last_position = this._location.getPosition();
		this._location = this._location.withPosition(position);
	}

	getLastPosition() {
		return this.last_position;
	}

	getYaw() {
		return this._yaw;
	}

	setYaw(yaw: number) {
		this._yaw = yaw;
	}

	getPitch() {
		return this._pitch;
	}

	setPitch(pitch: number) {
		this._pitch = pitch;
	}

	getHealth() {
		return this._health;
	}

	setHealth(health: number) {
		this._health = Math.max(health, 0);
	}

	async remove(connection: ClientConnection) {
		const writer = new WritableBuffer();
		Types.BYTE.write(writer, PacketType.DESTROY_ENTITY);
		Types.INTEGER.write(writer, this.getEntityID());
		await connection.getClient().write(writer.build());
	}
}
