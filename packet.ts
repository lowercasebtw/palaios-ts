import { ByteWriter } from "./byte.ts";
import { server } from "./index.ts";

export enum PacketType {
    LOGIN = 0x1,
    HANDSHAKE = 0x02,
    KICK = 0xff,
    SERVER_LIST_PING = 0xfe
}

export async function handshake_packet(conn: Deno.Conn, hash: string) {
    const writer = new ByteWriter(true);
    writer.writeByte(PacketType.HANDSHAKE);
    writer.writeString(hash);
    await writer.write(conn);
}

export async function kick_packet(conn: Deno.Conn, reason: string, uuid?: string | null) {
    const writer = new ByteWriter(false);
    writer.writeByte(PacketType.KICK);
    writer.writeByte(reason.length);
    writer.writeString(reason);
    if (uuid) 
        server.removeClientWithUUID(uuid);
    await writer.write(conn);
}