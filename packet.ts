import { ByteWriter, Type } from "./util/byte.ts";
// import { server } from "./index.ts";

export enum PacketType {
    LOGIN = 0x1,
    HANDSHAKE = 0x02,
    KICK = 0xff,
    SERVER_LIST_PING = 0xfe
}

export async function handshake_packet(conn: Deno.Conn, hash: string) {
    // 2 0 1 0 45
    const writer = new ByteWriter();
    writer.write(Type.BYTE, PacketType.HANDSHAKE);
    writer.write(Type.BYTE, hash.length);
    writer.write(Type.STRING, hash);
    await writer.push(conn, false);
}

export async function kick_packet(conn: Deno.Conn, reason: string, uuid?: string | null) {
    const writer = new ByteWriter();
    writer.write(Type.BYTE,   PacketType.KICK);
    writer.write(Type.BYTE,   reason.length);
    writer.write(Type.STRING, reason);
    // if (uuid) 
    //     server.removeClientWithUUID(uuid);
    await writer.push(conn, false);

    // Byte   PACKET ID
    // Byte   LENGTH OF MSG
    // Byte[] ...MSG BYTES

    // [PACKET_ID, 0x00, LENGTH, 0x00, ...bytes + 0x0 per byte]
}