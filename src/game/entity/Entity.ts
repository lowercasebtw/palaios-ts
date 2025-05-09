import { Location, Vec3d } from "../../util/mth.ts";
import { DimensionType } from "../../util/types.ts";
import ItemStack from "../item/ItemStack.ts";
import { EntityType } from "./EntityType.ts";

// TODO
export class Entity {
	private static LAST_ENTITY_ID = 0;

	private _id: number;
	private _type: EntityType;

	private _inventory: Map<number, ItemStack>;
	private _location: Location;
	private _health: number;
	private _yaw: number;
	private _pitch: number;

	public constructor(type: EntityType) {
		this._id = Entity.LAST_ENTITY_ID++;
		this._type = type;
		this._inventory = new Map();
		this._location = new Location(DimensionType.OVERWORLD, new Vec3d(0, 128, 0));
		this._health = 20;
		this._yaw = 0;
		this._pitch = 0;
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

	getLocation() {
		return this._location;
	}

	setLocation(location: Location) {
		this._location = location;
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
}
