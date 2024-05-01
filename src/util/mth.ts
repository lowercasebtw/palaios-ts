import { DimensionType } from "./types.ts";

export class Vec2d {
    constructor(public readonly x: number, public readonly y: number) {}
}

export class Vec3d {
    constructor(public readonly x: number, public readonly y: number, public readonly z: number) {}
}

export class Location {
    private _dimension: DimensionType;
    private _position: Vec3d;
    private _yaw: number;
    private _pitch: number;

    constructor(dimension: DimensionType, position: Vec3d, yaw: number, pitch: number) {
        this._dimension = dimension;
        this._position = position;
        this._yaw = yaw;
        this._pitch = pitch;
    }

    getDimensionType() { return this._dimension; }

    getPosition() { return this._position; }

    getYaw() { return this._yaw; }

    setYaw(yaw: number) { this._yaw = yaw; }
    
    getPitch() { return this._pitch; }
    
    setPitch(pitch: number) { this._pitch = pitch; }
}