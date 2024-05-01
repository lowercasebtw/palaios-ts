import { ByteReader, ByteUtil, Type } from "./util/byte.ts";
import { ProtocolVersion, handshake_packet, login_packet } from "./packet.ts";
import { PacketType, kick_packet } from "./packet.ts";
import World from "./game/dimension/World.ts";
import { Connection, Difficulty, DimensionType, WorldType } from "./util/types.ts";
import { Level, Logger } from "./logger/Logger.ts";
import { fetchUUID } from "./util/util.ts";
import { Player } from "./game/entity/Player.ts";
import { Location, Vec3d } from "./util/mth.ts";
import { Entity } from "./game/entity/Entity.ts";
import { EntityType } from "./game/entity/EntityType.ts";
import { ByteWriter } from "./util/byte.ts";

export default class Server {
    private _address: string;
    private _port: number;

    private _listener: Deno.Listener<Deno.Conn> | null;
    private _connection_handlers: Connection[];

    private _entities: Entity[];

    private _difficulty: Difficulty;
    private _overworld: World;
    private _nether: World;
    private _the_end: World;

    public constructor(address: string, port: number) {
        this._address = address;
        this._port = port;
        this._listener = null;
        this._connection_handlers = [];

        this._entities = [];

        // Could be wrong implementation
        this._difficulty = Difficulty.PEACEFUL;
        this._overworld = new World("worlds/world", DimensionType.OVERWORLD, WorldType.DEFAULT);
        this._nether = new World("worlds/nether", DimensionType.NETHER, WorldType.DEFAULT);
        this._the_end = new World("worlds/end", DimensionType.THE_END, WorldType.DEFAULT);
    }

    getDifficulty() { return this._difficulty; }

    getOverworld() {
        return this._overworld;
    }

    getNether() {
        return this._overworld;
    }

    getTheEnd() {
        return this._overworld;
    }

    getEntities() { return this._entities; }

    addEntity(entity: Entity) {
        this._entities.push(entity);
    }

    getPlayerWithUUID(uuid: string) {
        const players = this.getEntitiesOf(EntityType.PLAYER);
        const it = players.find(player => (player as Player).getUUID() == uuid);
        if (!it)
            return null;
        return it as Player;
    }

    getPlayerWithRID(rid: number): Player | null {
        const players = this.getEntitiesOf(EntityType.PLAYER);
        const it = players.find(player => (player as Player).getRID() == rid);
        if (!it)
            return null;
        return it as Player;
    }

    getEntitiesOf(type: EntityType) {
        return this._entities.filter(entity => entity.getType() == type);
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

    private broadcast(message: string) {
        const writer = new ByteWriter();
        writer.write(Type.SHORT, PacketType.CHAT_MESSAGE);
        writer.write(Type.STRING, message);
        for (const { connection } of this._connection_handlers) {
            writer.push(connection);
        }
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

                const uuid = await fetchUUID(username);
                if (uuid == null) {
                    await kick_packet(client, `Failed to login, invalid uuid.`);
                    return;
                }

                this.addEntity(new Player(client.rid, uuid));
                await login_packet(client);
            } break;

            case PacketType.HANDSHAKE: {
                // Handle Client Data
                await handshake_packet(client, '-');
            } break;

            case PacketType.CHAT_MESSAGE: {
                // const message = reader.read(Type.STRING) as string;
                // await this.broadcast(message);
            } break;

            case PacketType.PLAYER_POSITION: {
                // Player Position
                const x = reader.read(Type.DOUBLE) as number;
                const y = reader.read(Type.DOUBLE) as number;
                const stance = reader.read(Type.DOUBLE) as number;

                if (stance - y < 0.1 || stance - y > 1.65) {
                    await kick_packet(client, "Invalid stance");
                    return;
                }

                const z = reader.read(Type.DOUBLE) as number;
                const on_ground = reader.read(Type.BOOLEAN) as boolean;

                const player = this.getPlayerWithRID(client.rid);
                if (player == null) {
                    await kick_packet(client, "Player is null");
                    return;
                }

                const old_location = player.getLocation();
                player.setLocation(new Location(old_location.getDimensionType(), new Vec3d(x, y, z), old_location.getYaw(), old_location.getPitch()), on_ground)
            } break;

            case PacketType.PLAYER_LOOK: {
                // Player Look
                const yaw = reader.read(Type.FLOAT) as number;
                const pitch = reader.read(Type.FLOAT) as number;
                const on_ground = reader.read(Type.BOOLEAN) as boolean;

                const player = this.getPlayerWithRID(client.rid);
                if (player == null) {
                    await kick_packet(client, "Player is null");
                    return;
                }

                const old_location = player.getLocation();
                player.setLocation(new Location(old_location.getDimensionType(), old_location.getPosition(), yaw, pitch), on_ground);
            } break;

            case PacketType.PLAYER_POSITION_LOOK: {
                // Player Position Look
                const x = reader.read(Type.DOUBLE) as number;
                const y = reader.read(Type.DOUBLE) as number;
                const stance = reader.read(Type.DOUBLE) as number;

                if (stance - y < 0.1 || stance - y > 1.65) {
                    await kick_packet(client, "Invalid stance");
                    return;
                }

                const z = reader.read(Type.DOUBLE) as number;
                const yaw = reader.read(Type.FLOAT) as number;
                const pitch = reader.read(Type.FLOAT) as number;
                const on_ground = reader.read(Type.BOOLEAN) as boolean;

                const player = this.getPlayerWithRID(client.rid);
                if (player == null) {
                    await kick_packet(client, "Player is null");
                    return;
                }

                const old_location = player.getLocation();
                player.setLocation(new Location(old_location.getDimensionType(), new Vec3d(x, y, z), yaw, pitch), on_ground);

                await client.write(bytes);
                // const writer = new ByteWriter();
                // writer.write(Type.SHORT, PacketType.PLAYER_POSITION_LOOK);
                // writer.write(Type.DOUBLE, x);
                // writer.write(Type.DOUBLE, stance);
                // writer.write(Type.DOUBLE, y);
                // writer.write(Type.DOUBLE, z);
                // writer.write(Type.FLOAT, yaw);
                // writer.write(Type.FLOAT, pitch);
                // writer.write(Type.BOOLEAN, on_ground);
                // await writer.push(client);
            } break;

            case PacketType.SERVER_LIST_PING: {
                await kick_packet(client, `A Minecraft Server§${this._connection_handlers.length}§10`);
            } break;

            case PacketType.DISCONNECT_KICK: {
                // 
            } break;

            default: {
                Logger.log(Level.WARNING, `Unknown packet with id (char='${String.fromCharCode(packet_id)}', value=${packet_id}, hex=0x${packet_id.toString(16)})`);
            } break;
        }
    }
}