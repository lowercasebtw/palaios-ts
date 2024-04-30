import { ByteWriter, Type } from "./util/byte.ts";
// import { server } from "./index.ts";

export enum PacketType {
    LOGIN = 0x1,
    HANDSHAKE = 0x02,
    KICK = 0xff,
    SERVER_LIST_PING = 0xfe
}

export async function handshake_packet(conn: Deno.Conn, hash: string) {
    // const writer = new ByteWriter();
    // // 2, 0, 1, 0, 45
    // writer.writeByte(PacketType.HANDSHAKE);
    // writer.writeByte(1);
    // writer.writeString('-');
    // console.log(writer.build());
    // await writer.write(conn);
    await conn.write(new Uint8Array([
        PacketType.HANDSHAKE, 0, 
        hash.length, 0, 
        hash.charCodeAt(0)
    ]));
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