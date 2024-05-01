import { ByteReader, ByteUtil, Type } from "./util/byte.ts";
import { ProtocolVersion, handshake_packet, login_packet } from "./packet.ts";
import { PacketType, kick_packet } from "./packet.ts";
import World from "./game/dimension/World.ts";
import { Connection, Difficulty, DimensionType, WorldType } from "./util/types.ts";
import { Level, Logger } from "./logger/Logger.ts";

export default class Server {
    private _address: string;
    private _port: number;

    private _listener: Deno.Listener<Deno.Conn> | null;

    private _connection_handlers: Connection[];

    private difficulty: Difficulty;
    private _overworld: World;
    private _nether: World;
    private _the_end: World;

    public constructor(address: string, port: number) {
        this._address = address;
        this._port = port;
        this._listener = null;
        this._connection_handlers = [];

        // Could be wrong implementation
        this.difficulty = Difficulty.PEACEFUL;
        this._overworld = new World("worlds/world", DimensionType.OVERWORLD, WorldType.DEFAULT);
        this._nether = new World("worlds/nether", DimensionType.NETHER, WorldType.DEFAULT);
        this._the_end = new World("worlds/end", DimensionType.THE_END, WorldType.DEFAULT);
    }

    async listen() {
        if (this._listener != null)
            return;
        
        this._listener = Deno.listen({ 
            hostname: this._address, 
            port: this._port 
        });

        Logger.log(Level.INFO, `Listening on ${this._address == "0.0.0.0" ? "localhost" : this._address}:${this._port}`);

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
            case PacketType.KEEP_ALIVE: {
                // Keep Alive
            } break;
            
            case PacketType.LOGIN_REQUEST: {
                // Login Request
                const protocol_id = reader.read(Type.INT) as number;
                const username = reader.read(Type.STRING) as string;
                
                if (protocol_id != ProtocolVersion.v1_2_4_to_1_2_5) {
                    await kick_packet(client, `You are using a outdated client, ${username}! You are using ${protocol_id}`);
                    return;
                }

                await login_packet(client);
            } break;

            case PacketType.HANDSHAKE: {
                // Handle Client Data
                await handshake_packet(client, '-');
            } break;

            case PacketType.SERVER_LIST_PING: {
                await kick_packet(client, `A Minecraft Server§${this._connection_handlers.length}§10`);
            } break;

            default: {
                Logger.log(Level.WARNING, `Unknown packet with id (char='${String.fromCharCode(packet_id)}', value=${packet_id}, hex=0x${packet_id.toString(16)})`);
            } break;
        }
    }
}