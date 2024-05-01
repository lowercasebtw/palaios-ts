// https://wiki.vg/index.php?title=Protocol&oldid=932

import { EntityType } from "./game/entity/EntityType.ts";
import { ByteWriter, Type } from "./util/byte.ts";
import { WorldType } from "./util/types.ts";
import { server } from "./index.ts";
import { Player } from "./game/entity/Player.ts";

export enum ProtocolVersion {
    v1_2_4_to_1_2_5 = 29
}

export enum PacketType {
    KEEP_ALIVE = 0x00,
    LOGIN_REQUEST = 0x01,
    HANDSHAKE = 0x02,
    CHAT_MESSAGE = 0x03,
    TIME_UPDATE = 0x04,
    ENTITY_EQUIPMENT = 0x05,
    SPAWN_POSITION = 0x06,
    USE_ENTITY = 0x07,
    UPDATE_HEALTH = 0x08,
    RESPAWN = 0x09,
    PLAYER = 0x0A,
    PLAYER_POSITION = 0x0B,
    PLAYER_LOOK = 0x0C,
    PLAYER_POSITION_LOOK = 0x0D,
    PLAYER_DIGGING = 0x0E,
    PLAYER_BLOCK_PLACEMENT = 0x0F,
    HELD_ITEM_CHANGE = 0x10,
    USE_BED = 0x11,
    ANIMATION = 0x12,
    ENTITY_ACTION = 0x13,
    SPAWN_NAMED_ENTITY = 0x14,
    SPAWN_DROPPED_ITEM = 0x15,
    COLLECT_ITEM = 0x16,
    // 1.24	Spawn Object/Vehicle (0x17)
    // 1.25	Spawn Mob (0x18)
    // 1.26	Spawn Painting (0x19)
    // 1.27	Spawn Experience Orb (0x1A)
    // 1.28	Entity Velocity (0x1C)
    // 1.29	Destroy Entity (0x1D)
    // 1.30	Entity (0x1E)
    // 1.31	Entity Relative Move (0x1F)
    // 1.32	Entity Look (0x20)
    // 1.33	Entity Look and Relative Move (0x21)
    // 1.34	Entity Teleport (0x22)
    // 1.35	Entity Head Look (0x23)
    // 1.36	Entity Status (0x26)
    // 1.37	Attach Entity (0x27)
    // 1.38	Entity Metadata (0x28)
    // 1.39	Entity Effect (0x29)
    // 1.40	Remove Entity Effect (0x2A)
    // 1.41	Set Experience (0x2B)
    // 1.42	Chunk Allocation (0x32)
    // 1.43	Chunk Data (0x33)
    // 1.44	Multi Block Change (0x34)
    // 1.45	Block Change (0x35)
    // 1.46	Block Action (0x36)
    // 1.47	Explosion (0x3C)
    // 1.48	Sound/Particle Effect (0x3D)
    // 1.49	Change Game State (0x46)
    // 1.50	Thunderbolt (0x47)
    OPEN_WINDOW = 0x64,
    CLOSE_WINDOW = 0x65,
    CLICK_WINDOW = 0x66,
    SET_SLOT = 0x67,
    SET_WINDOW_ITEMS = 0x68,
    UPDATE_WINDOW_PROPERTY = 0x69, // nice
    CONFIRM_TRANSACTION = 0x6A,
    ENCHANT_ITEM = 0x6C,
    UPDATE_SIGN = 0x82,
    ITEM_DATA = 0x83,
    UPDATE_TILE_ENTITY = 0x84,
    INCREMENT_STAT = 0xC8,
    PLAYER_LIST_ITEM = 0xC9,
    PLAYER_ABILITIES = 0xCA,
    PLUGIN_MESSAGE = 0xFA,
    SERVER_LIST_PING = 0xFE,
    DISCONNECT_KICK = 0xFF,
}

// NOTE: For some reason, it now only works if I send the packet id as a short

export async function login_packet(client: Deno.Conn, player: Player) {
    const writer = new ByteWriter();
    // TODO: Get World/Dimension info for player
    // TODO: Work on this, doesn't work
    writer.write(Type.SHORT, PacketType.LOGIN_REQUEST);
    writer.write(Type.INT, EntityType.PLAYER); // Entity ID
    writer.write(Type.STRING, ""); // unused
    writer.write(Type.STRING, WorldType.DEFAULT); // Level Type
    writer.write(Type.INT, player.getGamemode()); // Gamemode
    writer.write(Type.INT, player.getLocation().getDimensionType()); // Dimension
    writer.write(Type.BYTE, server.getDifficulty()); // Difficulty
    writer.write(Type.UNSIGNED_BYTE, 0); // unused
    writer.write(Type.UNSIGNED_BYTE, 1); // Max Player Count
    await writer.push(client);
}

export async function handshake_packet(client: Deno.Conn, hash: string) {
    // 2 0 1 0 45
    const writer = new ByteWriter();
    writer.write(Type.SHORT, PacketType.HANDSHAKE);
    writer.write(Type.STRING, hash);
    await writer.push(client);
}

export async function kick_packet(client: Deno.Conn, reason: string) {
    const writer = new ByteWriter();
    writer.write(Type.SHORT, PacketType.DISCONNECT_KICK);
    writer.write(Type.STRING, reason);
    await writer.push(client);
}