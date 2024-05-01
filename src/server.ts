import { ByteReader, Type } from "./util/byte.ts";
import { ProtocolVersion, handshake_packet, login_request_packet } from "./packet.ts";
import { PacketType, kick_packet } from "./packet.ts";
import World from "./game/dimension/World.ts";
import { Difficulty, DimensionType, WorldType } from "./util/types.ts";
import { Level, Logger } from "./logger/Logger.ts";
import { fetchUUID } from "./util/util.ts";
import { Player } from "./game/entity/Player.ts";
import { Location, Vec3d } from "./util/mth.ts";
import { Entity } from "./game/entity/Entity.ts";
import { EntityType } from "./game/entity/EntityType.ts";
import { ByteWriter } from "./util/byte.ts";

import ClientConnection from "./util/connection.ts";

export default class Server {
    private _address: string;
    private _port: number;

    private _listener: Deno.Listener<Deno.Conn> | null;
    private _clients: ClientConnection[];

    private _online_player_count: number;
    private _max_player_count: number;

    private _entities: Entity[];

    private _difficulty: Difficulty;
    private _world_type: WorldType;
    private _overworld: World;
    private _nether: World;
    private _the_end: World;

    public constructor(address: string, port: number) {
        this._address = address;
        this._port = port;
        this._listener = null;
        this._clients = [];

        // Could be wrong implementation
        this._online_player_count = 0;
        this._max_player_count = 10;
        this._entities = [];
        this._difficulty = Difficulty.PEACEFUL;
        this._world_type = WorldType.DEFAULT;
        this._overworld = new World("worlds/world", DimensionType.OVERWORLD, WorldType.DEFAULT);
        this._nether = new World("worlds/nether", DimensionType.NETHER, WorldType.DEFAULT);
        this._the_end = new World("worlds/end", DimensionType.THE_END, WorldType.DEFAULT);
    }

    async listen() {
        if (this._listener != null)
            return;
        
        this._listener = Deno.listen({ hostname: this._address, port: this._port });
        Logger.log(Level.INFO, `Listening on ${this._address == "0.0.0.0" ? "localhost" : this._address}:${this._port}`);
        for await (const conn of this._listener) {
            const client = new ClientConnection(conn);
            client.setHandler(setInterval(async () => {
                const bytes = await client.read();
                if (bytes.length <= 0) 
                    return;
                await this.handle_packet(client, bytes);
            }));
            this._clients.push(client);
            // TODO Possibly: Purge Dead Clients
        }
    }

    getDifficulty() { return this._difficulty; }

    getWorldType() { return this._world_type; }

    getOnlinePlayerCount() { return this._online_player_count; }

    getMaxPlayerCount() { return this._max_player_count; }

    // horrid
    getOverworld() {
        return this._overworld;
    }

    getNether() {
        return this._nether;
    }

    getTheEnd() {
        return this._the_end;
    }

    getEntities() { return this._entities; }

    addEntity(entity: Entity) {
        // horrid
        this._entities.push(entity);
    }

    getPlayerWithUUID(uuid: string) {
        // horrid
        const players = this.getEntitiesOf(EntityType.PLAYER);
        const it = players.find(player => (player as Player).getUUID() == uuid);
        if (!it)
            return null;
        return it as Player;
    }

    getPlayerWithConnectionID(connection_id: number): Player | null {
        // horrid
        const players = this.getEntitiesOf(EntityType.PLAYER);
        const it = players.find(player => (player as Player).getConnectionID() == connection_id);
        if (!it)
            return null;
        return it as Player;
    }

    removePlayerWithConnectionID(connection_id: number) {
        // horrid
        this._entities = this._entities.filter(entity => {
            if (entity instanceof Player)
                return entity.getConnectionID() == connection_id;
            return false;
        });
    }

    getEntitiesOf(type: EntityType) {
        // horrid
        return this._entities.filter(entity => entity.getType() == type);
    }

    private broadcast(message: string) {
        const writer = new ByteWriter();
        writer.write(Type.SHORT, PacketType.CHAT_MESSAGE);
        writer.write(Type.STRING, message);
        // console.log(writer.build());
        // console.log(writer.build());
        for (const client of this._clients) {
            client.write(new Uint8Array([3, 0, 1, 0, 45]));
        }
    }

    private disconnect(connection: ClientConnection) {
        if (connection.isOpen())
            connection.disconnect();
        const index = this._clients.findIndex(client => client.id == connection.id);
        this._clients = this._clients.splice(index, 1);
        // TODO: save data
        this.removePlayerWithConnectionID(connection.id);
    }

    private async handle_packet(client: ClientConnection, bytes: Uint8Array) {
        const reader = new ByteReader(bytes);
        const packet_id = reader.read(Type.BYTE) as number;
        switch (packet_id) {
            case PacketType.KEEP_ALIVE: {
                // Keep Alive
                const id = Math.floor(Math.random() * 10000);

                const writer = new ByteWriter();
                writer.write(Type.SHORT, PacketType.KEEP_ALIVE);
                writer.write(Type.INT, id);
                await writer.push(client);

                // TODO: handle it receiving back
            } break;
            
            case PacketType.LOGIN_REQUEST: {
                if (this._online_player_count >= this.getMaxPlayerCount()) {
                    await kick_packet(client, "The server is full!");
                    return;
                }

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

                const player = new Player(client.id, uuid);
                this.addEntity(player);
                this._online_player_count++;
                await login_request_packet(client, this, player);
            } break;

            case PacketType.HANDSHAKE: {
                // Handle Client Data
                await handshake_packet(client, '-');
            } break;

            case PacketType.CHAT_MESSAGE: {
                const message = reader.read(Type.STRING) as string;
                this.broadcast(message);
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

                const player = this.getPlayerWithConnectionID(client.id);
                if (player == null) {
                    await kick_packet(client, "Player is null");
                    return;
                }

                const old_location = player.getLocation();
                player.setLocation(new Location(old_location.getDimensionType(), new Vec3d(x, y, z), old_location.getYaw(), old_location.getPitch()));
                player.setOnGround(on_ground);
            } break;

            case PacketType.PLAYER_LOOK: {
                // Player Look
                const yaw = reader.read(Type.FLOAT) as number;
                const pitch = reader.read(Type.FLOAT) as number;
                const on_ground = reader.read(Type.BOOLEAN) as boolean;

                const player = this.getPlayerWithConnectionID(client.id);
                if (player == null) {
                    await kick_packet(client, "Player is null");
                    return;
                }

                const old_location = player.getLocation();
                player.setLocation(new Location(old_location.getDimensionType(), old_location.getPosition(), yaw, pitch));
                player.setOnGround(on_ground);
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

                const player = this.getPlayerWithConnectionID(client.id);
                if (player == null) {
                    await kick_packet(client, "Player is null");
                    return;
                }

                const old_location = player.getLocation();
                player.setLocation(new Location(old_location.getDimensionType(), new Vec3d(x, y, z), yaw, pitch));
                player.setOnGround(on_ground);

                // TODO: figure out weirdness
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

                await client.write(bytes);
            } break;
            
            case PacketType.OPEN_WINDOW: {
                // Open Window
            } break;

            case PacketType.CLOSE_WINDOW: {
                // Close Window
            } break;

            case PacketType.CLICK_WINDOW: {
                // Click Window
                const window_id = reader.read(Type.BYTE);
                const slot = reader.read(Type.SHORT);
                const is_right_click = reader.read(Type.BYTE);
                const action_type = reader.read(Type.SHORT);
                const is_shift = reader.read(Type.BOOLEAN);

                // TODO
            } break;

            case PacketType.SET_SLOT: {
                // Set Slot
            } break;

            case PacketType.SET_WINDOW_ITEMS: {
                // Set Window Items
            } break;

            case PacketType.SERVER_LIST_PING: {
                await kick_packet(client, `A Minecraft Server§${this._online_player_count}§${this._max_player_count}`);
            } break;

            case PacketType.DISCONNECT_KICK: {
                // Left
                this.disconnect(client);
                this._online_player_count--;
            } break;

            default: {
                Logger.log(Level.WARNING, `Unknown packet with id (char='${String.fromCharCode(packet_id)}', value=${packet_id}, hex=0x${packet_id.toString(16)})`);
            } break;
        }
    }
}