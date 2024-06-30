// https://wiki.vg/index.php?title=Protocol&oldid=932

import { Client } from "https://deno.land/x/tcp_socket@0.0.1/mods.ts";
import { Player } from "../src/game/entity/Player.ts";
import ItemStack from "../src/game/item/ItemStack.ts";
import { ByteReader, ByteWriter, Type } from "../src/util/byte.ts";
import MinecraftServer from "./server.ts";
import { generateHash } from "./util/hash.ts";
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

export function write_packet_string(writer: ByteWriter, message: string) {
    writer.write(Type.SHORT, message.length);
    for (let i = 0; i < message.length; ++i) {
        writer.write(Type.SHORT, message[i].charCodeAt(0));
    }
    return writer;
}

export function read_packet_string(reader: ByteReader) {
    const length = reader.read(Type.SHORT) as number;
    if (length === 0)
        return "";
    let string = "";
    for (let i = 0; i < length; ++i)
        string += String.fromCharCode(reader.read(Type.SHORT) as number);
    return string;
}

export async function sendLoginRequestPacket(client: Client, server: MinecraftServer, player: Player) {
    const writer = new ByteWriter;
    writer.write(Type.BYTE, PacketType.LOGIN_REQUEST);
    writer.write(Type.INTEGER, ProtocolVersion.v1_2_4_to_1_2_5);
    write_packet_string(writer, player.getUsername());
    write_packet_string(writer, WorldType.DEFAULT);
    writer.write(Type.INTEGER, player.getGamemode());
    writer.write(Type.INTEGER, server.getDifficulty());
    writer.write(Type.BYTE, server.getDifficulty());
    writer.write(Type.BYTE, 128);
    writer.write(Type.BYTE, 1);
    await client.write(writer.build());
}

export async function sendHandshakePacket(client: Client, isOnlineMode: boolean) {
    const writer = new ByteWriter;
    writer.write(Type.BYTE, PacketType.HANDSHAKE);
    // TODO: Fix The Hash
    write_packet_string(writer, isOnlineMode ? generateHash() : "-");
    await client.write(writer.build());
}

export async function sendWindowItemsPacket(client: Client, window_id: number, items: ItemStack[]) {
    if (items.length < 44)
        return; // invalid
    const writer = new ByteWriter;
    writer.write(Type.BYTE, PacketType.SET_WINDOW_ITEMS);
    writer.write(Type.BYTE, window_id);
    writer.write(Type.SHORT, items.length);
    for (const itemStack of items) {
        writer.append(itemStack.bytes());
    }
    await client.write(writer.build());
}

export async function kick_packet(client: Client, reason: string) {
    const writer = new ByteWriter;
    writer.write(Type.BYTE, PacketType.KICK_DISCONNECT);
    write_packet_string(writer, reason);
    await client.write(writer.build());
}