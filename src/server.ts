import * as pako from "https://deno.land/x/pako@v2.0.3/pako.js";
import { Client, Packet, Server } from "https://deno.land/x/tcp_socket@0.0.1/mods.ts";
import World from "./game/dimension/World.ts";
import { Entity } from "./game/entity/Entity.ts";
import { EntityType } from "./game/entity/EntityType.ts";
import { Player } from "./game/entity/Player.ts";
import { Level, Logger } from "./logger/Logger.ts";
import { kick_packet, PacketType, ProtocolVersion, read_packet_string, sendHandshakePacket, sendLoginRequestPacket } from "./packet.ts";
import { ByteReader, ByteWriter, Type } from "./util/byte.ts";
import { colorMessage, stripColor } from "./util/color.ts";
import { Location, Vec3d } from "./util/mth.ts";
import { Difficulty, DimensionType, ServerProperties, WorldType } from "./util/types.ts";
import { fetchUUID } from "./util/util.ts";

export default class MinecraftServer {
    private _server!: Server;

    private _online_player_count: number;

    private _entities: Entity[];
    private _players: Map<Client, Player>;

    private _difficulty: Difficulty;
    private _world_type: WorldType;
    private _overworld: World;
    private _nether: World;
    private _the_end: World;

    private _time: number;

    private _properties: ServerProperties;

    private ticks_per_second = 20;
    private tick_interval!: number;

    constructor(address: string | null = null, port: number | null = null) {
        // Could be wrong implementation
        this._online_player_count = 0;
        this._entities = [];
        this._players = new Map;
        this._difficulty = Difficulty.PEACEFUL;
        this._world_type = WorldType.DEFAULT;
        this._overworld = new World("worlds/world", DimensionType.OVERWORLD, WorldType.DEFAULT);
        this._nether = new World("worlds/nether", DimensionType.NETHER, WorldType.DEFAULT);
        this._the_end = new World("worlds/end", DimensionType.THE_END, WorldType.DEFAULT);

        this._time = 0;

        // server.properties
        this._properties = this.load_properties();
        if (address != null)
            this._properties.address = address;
        if (port != null)
            this._properties.port = port;

        this.tick_interval = setInterval(this.tick.bind(this), 1000 / this.ticks_per_second);
    }

    private load_properties(): ServerProperties {
        let data: string = "";
        try {
            data = Deno.readTextFileSync("./server.properties");
        // deno-lint-ignore no-unused-vars no-empty
        } catch(e) {
        }
        
        const properties: ServerProperties = {
            level_seed: 0,
            gamemode: "creative",
            motd: "A Minecraft Server",
            difficulty: "normal",
            max_players: 10,
            online_mode: false,
            address: "0.0.0.0",
            port: 25565,
            log_ips: false,
            level_type: "default"
        };
        for (const line of data.split('\n')) {
            const parts = line.split('=');
            if (parts.length < 2)
                continue;

            const key = parts[0].replace('-', '_');
            if (!(key in properties) && key != "server_ip" && key != "server_port") {
                // invalid key
                continue;
            }

            const value = parts[1].replaceAll('\r', '');
            switch (key) {
                // dirty
                case "server_ip": { properties.address = value; } break;
                case "server_port": { properties.port = parseInt(value); } break;
                default: { (properties as any)[key] = value; } break;
            }
        }

        return properties as ServerProperties;
    }

    async listen() {
        this._server = new Server({ hostname: this._properties.address, port: this._properties.port });
        this._server.on("listen", (server: Deno.Listener) => {
            const addr = server.addr as Deno.NetAddr;
            Logger.log(Level.INFO, `Listening on ${addr.hostname}:${addr.port}`);
        });
        this._server.on("connect", () => {});
        this._server.on("receive", this.handle_packet.bind(this));
        this._server.on("close", () => {});
        await this._server.listen();
    }

    private async handle_packet(client: Client, packet: Packet) {
        // handle packet data
        const reader = new ByteReader(packet.data);
        const packet_id = reader.read(Type.BYTE) as number;
        switch (packet_id) {
            case PacketType.KEEP_ALIVE: {
                const writer = new ByteWriter;
                writer.write(Type.BYTE, PacketType.KEEP_ALIVE);
                writer.write(Type.INTEGER, reader.read(Type.INTEGER) as number);
                await client.write(writer.build());
            } break;

            case PacketType.LOGIN_REQUEST: {
                console.log(packet.data);

                if (this.getOnlinePlayerCount() >= this.getMaxPlayerCount()) {
                    await kick_packet(client, "The server is full!");
                    return;
                }

                // Login Request
                const protocol_id = reader.read(Type.INTEGER) as number;
                const username = read_packet_string(reader);
                
                if (protocol_id != ProtocolVersion.v1_2_4_to_1_2_5) {
                    await kick_packet(client, `You are using a outdated client, ${username}! You are using ${protocol_id}`);
                    return;
                }    

                const uuid = await fetchUUID(username);
                if (uuid === null && this.isOnlineMode()) {
                    console.log(`id=${client.conn!.rid}, username='${username}', uuid='${uuid}'`)
                    await kick_packet(client, `Failed to login, invalid uuid.`);
                    return;
                }

                const player = new Player(username, uuid);
                this._players.set(client, player);

                this.broadcast(colorMessage(`&e${username} has joined`));
                await sendLoginRequestPacket(client, this, player);
                this._online_player_count++;

                await this.sendPlayerPosition(client, player);
                await this.sendChunks(client);
            } break;

            case PacketType.HANDSHAKE: {
                // Handle Client Data
                console.log(this.isOnlineMode())
                await sendHandshakePacket(client, this.isOnlineMode());
            } break;   

            case PacketType.CHAT_MESSAGE: {
                const message = read_packet_string(reader);
                const sender = this.getPlayerForClient(client);
                if (sender === null) 
                    return;

                if (message.startsWith('/')) {
                    switch (message.slice(1, message.length)) {
                        case "time": {
                            await sender.sendMessage("The time in ticks is: " + this._time);
                            await sender.sendMessage("Is it day? " + this.isDay());
                            await sender.sendMessage("Is it night? " + this.isNight());
                        } break;

                        default: {
                            await sender.sendMessage(colorMessage("&cUnknown command."));
                        } break;
                    }
                    return;
                }

                await this.broadcast(`<${sender.getUsername()}> ${message}`);
            } break; 

            case PacketType.FLYING: {
                const on_ground = reader.read(Type.BOOLEAN) as boolean;
                const player = this.getPlayerForClient(client);
                if (player === null) {
                    await kick_packet(client, "Player is null");
                    return;
                }
                player.setOnGround(on_ground);
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

                const player = this.getPlayerForClient(client);
                if (player === null) {
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

                const player = this.getPlayerForClient(client);
                if (player === null) {
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

                const player = this.getPlayerForClient(client);
                if (player === null) {
                    await kick_packet(client, "Player is null");
                    return;
                }

                const old_location = player.getLocation();
                player.setLocation(new Location(old_location.getDimensionType(), new Vec3d(x, y, z), yaw, pitch));
                player.setOnGround(on_ground);

                // TODO: figure out weirdness
                // const writer = new ByteWriter();
                // writer.write(Type.BYTE, PacketType.PLAYER_POSITION_LOOK);
                // writer.write(Type.DOUBLE, x);
                // writer.write(Type.DOUBLE, stance);
                // writer.write(Type.DOUBLE, y);
                // writer.write(Type.DOUBLE, z);
                // writer.write(Type.FLOAT, yaw);
                // writer.write(Type.FLOAT, pitch);
                // writer.write(Type.BOOLEAN, on_ground);
                // await client.write(writer.build().slice(0, writer.length - 1)); // why slice??
            } break;

            case PacketType.PLUGIN_MESSAGE: {
                // Plugin Message
                const channel = read_packet_string(reader);
                const byte_len = reader.read(Type.SHORT) as number;
                // const bytes = reader.read_bytes(byte_len);
                Logger.log(Level.INFO, `Got Plugin Message ('${channel}') [ ...${byte_len} bytes ]`);
            } break;    

            case PacketType.SERVER_LIST_PING: {
                await kick_packet(client, `${this._properties.motd}§${this._online_player_count}§${this._properties.max_players}`);
            } break;

            case PacketType.KICK_DISCONNECT: {
                const player = this.getPlayerForClient(client);
                if (player !== null) {
                    this.broadcast(colorMessage(`&e${player.getUsername()} left`));
                    this._players.delete(client);
                }
                this._online_player_count--;
            } break;

            default: {
                Logger.log(Level.WARNING, `TODO: Handle packet (${packet_id}) ${PacketType[packet_id]}`);
            } break;
        }
    }

    getDifficulty() { return this._difficulty; }

    getWorldType() { return this._world_type; }

    getOnlinePlayerCount() { return this._online_player_count; }

    isOnlineMode() { return this._properties.online_mode; }

    getMaxPlayerCount() { return this._properties.max_players; }

    // horrid
    getOverworld() { return this._overworld; }

    getNether() { return this._nether; }

    getTheEnd() { return this._the_end; }
    
    // Entity Stuff
    getEntities() { return this._entities; }

    addEntity(entity: Entity) {
        // horrid
        this._entities.push(entity);
    }

    getPlayerWithUUID(uuid: string) {
        // horrid
        const players = this.getEntitiesOf(EntityType.PLAYER);
        const it = players.find(player => (player as Player).getUUID() === uuid);
        if (!it)
            return null;
        return it as Player;
    }

    getEntitiesOf(type: EntityType) {
        // horrid
        return this._entities.filter(entity => entity.getType() === type);
    }

    getPlayerForClient(client: Client) {
        return this._players.get(client) ?? null;
    }

    // GOD I WISH TYPESCRIPT HAD REFERENCES N SHTIF fdjk dffdbnfdok 
    getClientForPlayer(player: Player) {
        let client: Client;
        this._players.forEach((_player, _client) => {
            if (player === _player) {
                client = _client;
                return;
            }
        });
        return client! ?? null;
    }

    isDay() {
        return this._time <= 12000;
    }

    isNight() {
        return this._time > 12000;
    }

    async broadcast(message: string) {
        for (const player of this._players.values()) {
            await player.sendMessage(message);
        }
        Logger.log(Level.INFO, stripColor(message));
    }

    async sendPlayerPosition(client: Client, player: Player) {
        const writer = new ByteWriter;
        writer.write(Type.BYTE, PacketType.PLAYER_POSITION);
        const position = player.getLocation().getPosition();
        writer.write(Type.DOUBLE, position.x);
        writer.write(Type.DOUBLE, position.y);
        writer.write(Type.DOUBLE, 0);
        writer.write(Type.DOUBLE, position.z);
        writer.write(Type.BYTE, player.isOnGround() == true ? 1 : 0);
        await client.write(writer.build());
    }

    async sendChunks(client: Client) {
        const writer = new ByteWriter;
        writer.write(Type.BYTE, PacketType.CHUNK_DATA);

        const worldHeight = 5;

        writer.write(Type.INTEGER, 0);                 // x
        writer.write(Type.INTEGER, 0);                 // z 
        writer.write(Type.BOOLEAN, false);         // ?
        writer.write(Type.SHORT, 0);               // minY 
        writer.write(Type.SHORT, worldHeight);     // maxY
        
        const chunkData = [];
        for (let i = 0; i < worldHeight; ++i) {
            chunkData.push(0);
            chunkData.push(0);
            chunkData.push(0);
        }
        writer.write(Type.INTEGER, chunkData.length);   // chunkSize

        writer.write(Type.INTEGER, 0);                  // unused
        writer.append(pako.deflate(new Uint8Array(chunkData)) as Uint8Array);
        // await client.write(writer.build());
    }

    async sendKeepAlive(client: Client) {
        await client.write(new ByteWriter()
                                .write(Type.BYTE, PacketType.KEEP_ALIVE)
                                .write(Type.INTEGER, Math.floor(Math.random() * 10000))
                                .build());
    }

    async sendTimeUpdate(client: Client) {
        await client.write(new ByteWriter()
                                .write(Type.BYTE, PacketType.UPDATE_TIME)
                                .write(Type.LONG, BigInt(this._time))
                                .build());
    }

    async tick() {
        for await (const player of this._players.values()) {     
            this._time++;   
            if (this._time >= 24000)
                this._time = 0; 
            const client = this.getClientForPlayer(player);
            if (client !== null) {
                await this.sendKeepAlive(client);
                await this.sendTimeUpdate(client);
                await player.sendHealthUpdate();
                // TODO: other stuff, like entity tick, tile tick, etc
            }
        }
    }
}   