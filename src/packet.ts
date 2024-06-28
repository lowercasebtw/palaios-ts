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
    KEEP_ALIVE = 0,
    LOGIN_REQUEST = 1,
    HANDSHAKE = 2,
    CHAT_MESSAGE = 3,
    UPDATE_TIME = 4,
    PLAYER_INVENTORY = 5,
    SPAWN_POSITION = 6,
    USE_ENTITY = 7,
    UPDATE_HEALTH = 8,
    RESPAWN = 9,
    FLYING = 10,
    PLAYER_POSITION = 11,
    PLAYER_LOOK = 12,
    PLAYER_POSITION_LOOK = 13,
    PLAYER_DIG = 14,
    PLAYER_PLACE = 15,
    HELD_ITEM_CHANGE = 16,
    SLEEP = 17,
    ANIMATION = 18,
    ENTITY_ACTION = 19,
    SPAWN_NAMED_ENTITY = 20,
    PICKUP_SPAWN = 21,
    COLLECT_ITEM = 22,
    VEHICLE_SPAWN = 23,
    MOB_SPAWN = 24,
    ENTITY_PAINTING = 25,
    ENTITIY_EXPERIENCE_ORB = 26,
    ENTITY_VELOCITY = 28,
    DESTROY_ENTITY = 29,
    ENTITY = 30,
    REL_ENTITY_MOVE = 31,
    ENTITY_LOOK = 32,
    REL_ENTITY_MOVE_LOOK = 33,
    ENTITY_TELEPORT = 34,
    ENTITY_HEAD_ROTATION = 35,
    ENTITY_STATUS = 38,
    ATTACH_ENTITY = 39,
    ENTITY_METADATA = 40,
    ENTITY_EFFECT = 41,
    REMOVE_ENTITY_EFFECT = 42,
    EXPERIENCE = 43,
    PRE_CHUNK = 50,
    CHUNK_DATA = 51,
    MULTI_BLOCK_CHANGE = 52,
    BLOCK_CHANGE = 53,
    PLAY_NOTEBLOCK = 54,
    EXPLOSION = 60,
    DOOR_CHANGE = 61,
    BED = 70,
    WEATHER = 71,
    OPEN_WINDOW = 100,
    CLOSE_WINDOW = 101,
    CLICK_WINDOW = 102,
    SET_SLOT = 103,
    SET_WINDOW_ITEMS = 104,
    UPDATE_PROGRESS_BAR = 105,
    TRANSACTION = 106,
    CREATIVE_SET_SLOT = 107,
    ENCHANT_ITEM = 108,
    UPDATE_SIGN = 130,
    MAP_DATA = 131,
    TILE_ENTITY_DATA = 132,
    STATISTIC = 200,
    PLAYER_INFO = 201,
    PLAYER_ABILITIES = 202,
    PLUGIN_MESSAGE = 250,
    SERVER_LIST_PING = 254,
    KICK_DISCONNECT = 255,
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
                        .write(Type.BYTE, PacketType.KICK_DISCONNECT)
                        .write(Type.STRING, reason)
                        .build());
}