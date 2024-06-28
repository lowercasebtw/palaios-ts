// https://wiki.vg/index.php?title=Protocol&oldid=932

import { Client } from "https://deno.land/x/tcp_socket@0.0.1/mods.ts";
import { EntityType } from "../src/game/entity/EntityType.ts";
import { Player } from "../src/game/entity/Player.ts";
import ItemStack from "../src/game/item/ItemStack.ts";
import { ByteWriter, Type } from "../src/util/byte.ts";
import MinecraftServer from "./server.ts";
import { WorldType } from "./util/types.ts";

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
    SPAWN_OBJECT_VEHICLE = 0x17,
    SPAWN_MOB = 0x18,
    SPAWN_PAINTING = 0x19,
    SPAWN_EXPERIENCE_ORB = 0x1A,
    ENTITY_VEHICLE = 0x1C,
    DESTROY_ENTITY = 0x1D,
    ENTITY = 0x1E,
    ENTITY_RELATIVE_MOVE = 0x1F,
    ENTITY_LOOK = 0x20,
    ENTITY_LOOK_RELATIVE_MOVE = 0x21,
    ENTITY_TELEPORT = 0x22,
    ENTITY_HEAD_LOOK = 0x23,
    ENTITY_STATUS = 0x26,
    ATTACH_ENTITY = 0x27,
    ENTITY_METADATA = 0x28,
    ENTITY_EFFECT = 0x29,
    REMOVE_ENTITY_EFFECT = 0x2A,
    SET_EXPERIENCE = 0x2B,
    CHUNK_ALLOCATION = 0x32,
    CHUNK_DATA = 0x33,
    MULTI_BLOCK_CHANGE = 0x34,
    BLOCK_CHANGE = 0x35,
    BLOCK_ACTION = 0x36,
    EXPLOSION = 0x3C,
    SOUND_PARTICLE_EFFECT = 0x3D,
    CHANGE_GAME_STATE = 0x46,
    THUNDERBOLT = 0x47,
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

export async function login_request_packet(client: Client, server: MinecraftServer, player: Player) {
    await client.write(new ByteWriter()
                            .write(Type.BYTE, PacketType.LOGIN_REQUEST)
                            .write(Type.INT, ProtocolVersion.v1_2_4_to_1_2_5)
                            .write(Type.STRING, player.getUsername())
                            .write(Type.STRING, WorldType.DEFAULT)
                            .write(Type.INT, player.getGamemode())
                            .write(Type.INT, server.getDifficulty())    
                            .write(Type.BYTE, server.getDifficulty())
                            .write(Type.BYTE, 128)
                            .write(Type.BYTE, 1)
                            .build());
}

export async function handshake_packet(client: Client, hash: string) {
    await client.write(new ByteWriter()
                            .write(Type.BYTE, PacketType.HANDSHAKE)
                            .write(Type.STRING, hash)
                            .build());
}

export async function set_window_items_packet(client: Client, window_id: number, items: ItemStack[]) {
    if (items.length < 44)
        return; // invalid
    const writer = new ByteWriter();
    writer.write(Type.BYTE, PacketType.SET_WINDOW_ITEMS);
    writer.write(Type.BYTE, window_id);
    writer.write(Type.SHORT, items.length);
    for (const itemStack of items) 
        writer.append(itemStack.bytes());
    await client.write(writer.build());
}

export async function kick_packet(client: Client, reason: string) {
    await client.write(new ByteWriter()
                        .write(Type.BYTE, PacketType.DISCONNECT_KICK)
                        .write(Type.STRING, reason)
                        .build());
}