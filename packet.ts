import { ByteWriter, Type } from "./util/byte.ts";
// import { server } from "./index.ts";

export enum ProtocolVersion {
    v1_2_4_to_1_2_5 = 29
}

export enum PacketType {
    LOGIN_REQUEST = 0x01,
    HANDSHAKE = 0x02,
    KICK = 0xFF,
    SERVER_LIST_PING = 0xFE
}

// NOTE: For some reason, it now only works if I send the packet id as a short

export async function login_packet(client: Deno.Conn) {
    const writter = new ByteWriter();
    // TODO: Work on this, doesn't work
    writter.write(Type.SHORT, PacketType.LOGIN_REQUEST);
    writter.write(Type.INT, 1); // Entity ID
    writter.write(Type.STRING, ""); // unused
    writter.write(Type.STRING, "default"); // Level Type
    writter.write(Type.INT, 1); // Gamemode
    writter.write(Type.INT, 0); // Dimension
    writter.write(Type.BYTE, 0); // Difficulty
    writter.write(Type.UNSIGNED_BYTE, 0); // unused
    writter.write(Type.UNSIGNED_BYTE, 1); // Player Count
    await writter.push(client);
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
    writer.write(Type.SHORT, PacketType.KICK);
    writer.write(Type.STRING, reason);
    await writer.push(client);
}