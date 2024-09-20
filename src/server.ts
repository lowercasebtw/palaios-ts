import * as pako from "https://deno.land/x/pako@v2.0.3/pako.js";
import { Client, Packet, Server } from "https://deno.land/x/tcp_socket@0.0.1/mods.ts";
import World from "./game/dimension/World.ts";
import { Entity } from "./game/entity/Entity.ts";
import { EntityType } from "./game/entity/EntityType.ts";
import { Player } from "./game/entity/Player.ts";
import { Level, Logger } from "./logger/Logger.ts";
import { PacketType } from "./packet.ts";
import { ByteWriter, Type } from "./util/byte.ts";
import { Difficulty, DimensionType, ServerProperties, WorldType } from "./util/types.ts";
import ClientConnection from "./util/connection.ts";
import { colorMessage, stripColor } from "./util/color.ts";

export default class MinecraftServer {
	private server!: Server;

	private online_player_count: number;

	private entities: Entity[];
	private connections: Map<Client, ClientConnection>;

	private difficulty: Difficulty;
	private world_type: WorldType;
	private overworld: World;
	private nether: World;
	private the_end: World;

	private time: number;

	private properties: ServerProperties;

	private ticks_per_second = 20;
	private tick_interval!: number;

	constructor(address: string | null = null, port: number | null = null) {
		// Could be wrong implementation
		this.online_player_count = 0;
		this.entities = [];
		this.connections = new Map();
		this.difficulty = Difficulty.PEACEFUL;
		this.world_type = WorldType.DEFAULT;
		this.overworld = new World("worlds/world", DimensionType.OVERWORLD, WorldType.DEFAULT);
		this.nether = new World("worlds/nether", DimensionType.NETHER, WorldType.DEFAULT);
		this.the_end = new World("worlds/end", DimensionType.THE_END, WorldType.DEFAULT);

		this.time = 0;

		// server.properties
		this.properties = this.load_properties();
		if (address != null) this.properties.address = address;
		if (port != null) this.properties.port = port;

		this.tick_interval = setInterval(this.tick.bind(this), 1000 / this.ticks_per_second);
	}

	private load_properties(): ServerProperties {
		let data: string = "";
		try {
			data = Deno.readTextFileSync("./server.properties");
			// deno-lint-ignore no-unused-vars no-empty
		} catch (e) {}

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
			level_type: "default",
		};
		for (const line of data.split("\n")) {
			const parts = line.split("=");
			if (parts.length < 2) continue;

			const key = parts[0].replace("-", "_");
			if (!(key in properties) && key != "server_ip" && key != "server_port") {
				// invalid key
				continue;
			}

			const value = parts[1].replaceAll("\r", "");
			switch (key) {
				// dirty
				case "server_ip":
					properties.address = value;
					break;
				case "server_port":
					properties.port = parseInt(value);
					break;
				default:
					(properties as any)[key] = value;
					break;
			}
		}

		return properties as ServerProperties;
	}

	async listen() {
		this.server = new Server({
			hostname: this.properties.address,
			port: this.properties.port,
		});

		this.server.on("listen", () =>
			Logger.log(Level.INFO, `Listening on ${this.properties.address}:${this.properties.port}`),
		);

		this.server.on("connect", (client: Client) => {
			const connection = new ClientConnection(client);
			this.connections.set(client, connection);
			Logger.log(Level.INFO, `Client ${connection.id} connected!`);
			client.addListener("receive", (_, packet: Packet) => connection.handle(this, packet));
			client.addListener("close", () => {
				Logger.log(Level.INFO, `Client ${connection.id} disconnected!`);
				// TODO: cleanup?
				this.connections.get(client)!.close();
				this.connections.delete(client);
			});
		});

		await this.server.listen();
	}

	onPlayerJoin(connection: ClientConnection) {
		this.online_player_count++;
		this.broadcast(colorMessage(`&e${connection.getPlayer()!.getUsername()} has joined`));
	}

	onPlayerLeave(connection: ClientConnection) {
		this.broadcast(colorMessage(`&e${connection.getPlayer()!.getUsername()} left`));
		this.online_player_count--;
	}

	getDifficulty() {
		return this.difficulty;
	}

	getWorldType() {
		return this.world_type;
	}

	getMessageOfTheDay() {
		return this.properties.motd;
	}

	getOnlinePlayerCount() {
		return this.online_player_count;
	}

	isOnlineMode() {
		return this.properties.online_mode;
	}

	getMaxPlayerCount() {
		return this.properties.max_players;
	}

	// horrid
	getOverworld() {
		return this.overworld;
	}

	getNether() {
		return this.nether;
	}

	getTheEnd() {
		return this.the_end;
	}

	// Entity Stuff
	getEntities() {
		return this.entities;
	}

	addEntity(entity: Entity) {
		// horrid
		this.entities.push(entity);
	}

	getPlayerWithUUID(uuid: string) {
		// horrid
		const players = this.getEntitiesOf(EntityType.PLAYER);
		const it = players.find((player) => (player as Player).getUUID() === uuid);
		if (!it) return null;
		return it as Player;
	}

	getEntitiesOf(type: EntityType) {
		// horrid
		return this.entities.filter((entity) => entity.getType() === type);
	}

	getTime() {
		return this.time;
	}

	isDay() {
		return this.time <= 12000;
	}

	isNight() {
		return this.time > 12000;
	}

	async broadcast(message: string) {
		for (const [_, connection] of this.connections.entries()) {
			if (connection.getPlayer() == null) continue; // player is null, possibly logging in
			await connection.sendMessage(message);
		}

		Logger.log(Level.INFO, stripColor(message));
	}

	async sendChunks(client: Client) {
		const writer = new ByteWriter();
		writer.write(Type.BYTE, PacketType.CHUNK_DATA);

		const worldHeight = 5;

		writer.write(Type.INTEGER, 0); // x
		writer.write(Type.INTEGER, 0); // z
		writer.write(Type.BOOLEAN, false); // ?
		writer.write(Type.SHORT, 0); // minY
		writer.write(Type.SHORT, worldHeight); // maxY

		const chunkData = [];
		for (let i = 0; i < worldHeight; ++i) {
			chunkData.push(0);
			chunkData.push(0);
			chunkData.push(0);
		}
		writer.write(Type.INTEGER, chunkData.length); // chunkSize

		writer.write(Type.INTEGER, 0); // unused
		writer.append(pako.deflate(new Uint8Array(chunkData)) as Uint8Array);
		// await client.write(writer.build());
	}

	async sendKeepAlive(client: Client) {
		await client.write(
			new ByteWriter()
				.write(Type.BYTE, PacketType.KEEP_ALIVE)
				.write(Type.INTEGER, Math.floor(Math.random() * 10000))
				.build(),
		);
	}

	async sendTimeUpdate(client: Client) {
		await client.write(
			new ByteWriter().write(Type.BYTE, PacketType.UPDATE_TIME).write(Type.LONG, BigInt(this.time)).build(),
		);
	}

	async tick() {
		this.time++;
		if (this.time >= 24000) this.time = 0;
		for (const [client, connection] of this.connections) {
			if (connection.getPlayer() == null) continue; // player is null, possibly logging in
			await this.sendKeepAlive(client);
			await this.sendTimeUpdate(client);
			await connection.sendHealthUpdate();
		}
	}
}
