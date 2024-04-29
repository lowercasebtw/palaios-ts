import { ByteReader, MAX_BYTES_ALLOWED } from "./util/byte.ts";
import { generateHash } from "./util/hash.ts";
import { handshake_packet } from "./packet.ts";
import { PacketType, kick_packet } from "./packet.ts";
import { Client } from "./util/types.ts";
import { as_string, fetchUUID, un_spaceify } from "./util/util.ts";

export default class Server {
    private _clients: Client[];

    private _address: string;
    private _port: number;

    private _listener: Deno.Listener<Deno.Conn> | null;

    public constructor(address: string, port: number) {
        this._clients = [];
        this._address = address;
        this._port = port;
        this._listener = null;
    }

    async listen() {
        if (this._listener != null)
            return;
        this._listener = Deno.listen({ hostname: this.address, port: this.port });
        console.log(`Listening on ${this.address == "0.0.0.0" ? "localhost" : this.address}:${this.port}`);
        for await (const conn of this._listener) {
            const array = new Uint8Array(MAX_BYTES_ALLOWED);
            const byte_count = await conn.read(array) as number;
            if (byte_count <= 0) {
                console.log("Received bytes with size <= 0, discarding...");
                continue;
            }
            await this.handle_packet(conn, array.slice(0, byte_count));
        }
    }

    private async handle_packet(conn: Deno.Conn, bytes: Uint8Array) {
        const reader = new ByteReader(bytes);
        const packet_id = reader.readByte();
        switch (packet_id) {
            // case PacketType.LOGIN: {
            //     // Login Request
            //     console.log("Attempted login");
            // } break;
            case PacketType.HANDSHAKE: {
                // Handle Client Data
    
                let uuid;
                // TODO: Write a better handler for this
                {
                    const string = un_spaceify(as_string(reader.read(reader.length - reader.cursor)!, true));
                    if (string.includes(';') && string.includes(':')) {
                        // username;address:port
                        const parts = string.split(';');
                        const username = parts[0];
                        const [address, port] = parts[1].split(':');
                        uuid = await fetchUUID(username);
                        this._clients.push({
                            username,
                            uuid,
                            address,
                            port: Number(port)
                        });
                    }
                }
    
                await handshake_packet(conn, generateHash());
                // await kick_packet(conn, `TODO`, uuid);
            } break;
            case PacketType.SERVER_LIST_PING: {
                await kick_packet(conn, `A Minecraft Server§${this._clients.length}§10`);
            } break;
            default: {
                console.log(`Unknown packet with id (char='${String.fromCharCode(packet_id)}', value=${packet_id}, hex=0x${packet_id.toString(16)})`);
            } break;
        }
    }    

    get clients() { return this._clients; }

    get address() { return this._address; }
    
    get port() { return this._port; }

    // TODO: fix ugly ahh name
    getClientWithUUID(uuid: string) {
        return this.clients.filter(c => c.uuid == uuid)[0];
    }

    // TODO: fix ugly ahh name
    removeClientWithUUID(uuid: string) {
        this._clients = this.clients.filter(c => c.uuid != uuid);
    }
}