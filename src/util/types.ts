export type Client = {
    username: string;
    uuid: string | null;
    address: string;
    port: number;
}

export type APIUser = {
    id: string;
    name: string;
}

export type Connection = {
    connection: Deno.Conn;
    handler_id: number;
}

export enum DimensionType {
    OVERWORLD = 0,
    NETHER = -1,
    THE_END = 1
}

export enum Difficulty {
    PEACEFUL,
    EASY,
    NORMAL,
    HARD
}

export enum WorldType {
    DEFAULT = "default",
    FLAT = "flat"
}

export enum Gamemode {
    SURVIVAL = 0,
    CREATIVE = 1
}