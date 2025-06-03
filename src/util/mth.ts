import { DimensionType } from "./types.ts";

export class Vec2d {
	constructor(public readonly x: number, public readonly y: number) {}
}

export class Vec3d {
	constructor(
		public readonly x: number,
		public readonly y: number,
		public readonly z: number,
	) {}

	mul(value: number) {
		return new Vec3d(this.x * value, this.y * value, this.z * value);
	}

	equals(other: Vec3d) {
		return this.x === other.x && this.y === other.y && this.z === other.z;
	}
}

export function toAbsolutePosition(coord: number) {
	return coord * 32.0;
}

export function toAbsolutePositionVec(coords: Vec3d) {
	return coords.mul(32.0);
}

export function toAbsoluteRotation(rotation: number) {
	return rotation * 256 / 360;
}

export class Location {
	private readonly _dimension: DimensionType;
	private _position: Vec3d;

	constructor(dimension: DimensionType, position: Vec3d) {
		this._dimension = dimension;
		this._position = position;
	}

	getDimensionType() {
		return this._dimension;
	}

	getPosition() {
		return this._position;
	}

	withPosition(position: Vec3d) {
		return new Location(this._dimension, position);
	}

	setPosition(position: Vec3d) {
		this._position = position;
	}
}
