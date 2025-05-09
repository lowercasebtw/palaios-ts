import { DimensionType } from "./types.ts";

export class Vec2d {
	constructor(public readonly x: number, public readonly y: number) {}
}

export class Vec3d {
	constructor(public readonly x: number, public readonly y: number, public readonly z: number) {}
}

export function toAbsolutePosition(coord: number) {
	return coord * 32.0;
}

export function toAbsoluteRotation(rotation: number) {
	return rotation * 256 / 360;
}

export class Location {
	private _dimension: DimensionType;
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

	setPosition(position: Vec3d) {
		this._position = position;
	}
}
