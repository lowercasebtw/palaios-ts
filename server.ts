import { ByteReader, ByteUtil, Type } from "./util/byte.ts";
import { ProtocolVersion, handshake_packet, login_packet } from "./packet.ts";
import { PacketType, kick_packet } from "./packet.ts";
import { Client } from "./util/types.ts";
import { fetchUUID, un_spaceify } from "./util/util.ts";
import { generateHash } from "./util/hash.ts";

type Connection = {
    connection: Deno.Conn;
    handler_id: number;
}

export default class Server {
    private _address: string;
    private _port: number;

    private _listener: Deno.Listener<Deno.Conn> | null;

    private _connection_handlers: Connection[];

    public constructor(address: string, port: number) {
        this._address = address;
        this._port = port;
        this._listener = null;
        this._connection_handlers = [];
    }

    async listen() {
        if (this._listener != null)
            return;
        
        this._listener = Deno.listen({ 
            hostname: this._address, 
            port: this._port 
        });

        console.log(`Listening on ${this._address == "0.0.0.0" ? "localhost" : this._address}:${this._port}`);
        
        for await (const conn of this._listener) {
            const array = new Uint8Array(ByteUtil.MAX_BYTES_ALLOWED);
            this._connection_handlers.push({
                connection: conn,
                handler_id: setInterval(async () => {
                    const byte_count = await conn.read(array) as number;
                    if (byte_count <= 0) 
                        return;
                    await this.handle_packet(conn, array.slice(0, byte_count));
                })
            });
        }

        // TODO: Handle cleaning of connections?
    }

    private async handle_packet(client: Deno.Conn, bytes: Uint8Array) {
        const reader = new ByteReader(bytes);
        const packet_id = reader.read(Type.BYTE) as number;
        switch (packet_id) {
            case PacketType.LOGIN_REQUEST: {
                // Login Request
                const protocol_id = reader.read(Type.INT) as number;
                const username = reader.read(Type.STRING) as string;
                reader.read(Type.STRING); // unused
                reader.read(Type.INT); // unused
                reader.read(Type.INT); // unused
                reader.read(Type.BYTE); // unused
                reader.read(Type.UNSIGNED_BYTE); // unused
                reader.read(Type.UNSIGNED_BYTE); // unused

                if (protocol_id != ProtocolVersion.v1_2_4_to_1_2_5) {
                    await kick_packet(client, `Outdated client ${username}! You are using ${protocol_id}`);
                    return;
                }

                await login_packet(client);
            } break;
            case PacketType.HANDSHAKE: {
                // Handle Client Data
                await handshake_packet(client, generateHash());
            } break;
            case PacketType.SERVER_LIST_PING: {
                await kick_packet(client, `A Minecraft Server§${this._connection_handlers.length}§10`);
            } break;
            default: {
                console.log(`Unknown packet with id (char='${String.fromCharCode(packet_id)}', value=${packet_id}, hex=0x${packet_id.toString(16)})`);
            } break;
        }
    }
}