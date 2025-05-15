import { Client, Server } from "./util/tcp.ts";
import World from "./game/dimension/World.ts";
import { Entity } from "./game/entity/Entity.ts";
import { EntityType } from "./game/entity/EntityType.ts";
import { Player } from "./game/entity/Player.ts";
import { Level, Logger } from "./logger/Logger.ts";
import Types, { ReadableBuffer, WritableBuffer } from "./util/byte.ts";
import { colorMessage, stripColor } from "./util/color.ts";
import ClientConnection from "./util/connection.ts";
import { toAbsolutePosition, toAbsoluteRotation } from "./util/mth.ts";
import { Difficulty, DimensionType, ServerProperties, WorldType } from "./util/types.ts";
import PacketType from "./packet/PacketType.ts";
import RelEntityMoveLookPacket from "./packet/RelEntityMoveLookPacket.ts";
import KeepAlivePacket from "./packet/KeepAlivePacket.ts";
import UpdateTimePacket from "./packet/UpdateTimePacket.ts";
import ChatMessagePacket from "./packet/ChatMessagePacket.ts";
import PlayerListItemPacket, { UpdateType } from "./packet/PlayerListItemPacket.ts";

export enum ProtocolVersion {
	v1_2_4_to_1_2_5 = 29,
}

export default class MinecraftServer {
	private server!: Server;

	private readonly entities: Entity[];
	private readonly connections: Map<Client, ClientConnection>;

	private readonly difficulty: Difficulty;
	private readonly world_type: WorldType;
	private readonly overworld: World;
	private readonly nether: World;
	private readonly the_end: World;

	private time: number;

	private properties: ServerProperties;

	private ticks_per_second = 20;
	private tick_interval!: number;

	constructor(address: string | null = null, port: number | null = null) {
		// Could be wrong implementation
		this.entities = [];
		this.connections = new Map();
		this.difficulty = Difficulty.PEACEFUL;
		this.world_type = WorldType.DEFAULT;
		this.overworld = new World(
			"worlds/world",
			DimensionType.OVERWORLD,
			WorldType.DEFAULT,
		);
		this.nether = new World(
			"worlds/nether",
			DimensionType.NETHER,
			WorldType.DEFAULT,
		);
		this.the_end = new World(
			"worlds/end",
			DimensionType.THE_END,
			WorldType.DEFAULT,
		);

		this.time = 0;

		// server.properties
		this.properties = this.load_properties();
		if (address != null) this.properties.address = address;
		if (port != null) this.properties.port = port;

		this.tick_interval = setInterval(() => {
			try {
				this.tick();
			} catch (error: unknown) {
				Logger.log(
					Level.WARNING,
					"An error has occured when ticking! " +
						(error as Error).message,
				);
			}
		}, 1000 / this.ticks_per_second);
	}

	private load_properties(): ServerProperties {
		let data: string = "";
		try {
			data = Deno.readTextFileSync("./server.properties");
			// deno-lint-ignore no-unused-vars no-empty
		} catch (e) {
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
			level_type: "default",
		};
		for (const line of data.split("\n")) {
			const parts = line.split("=");
			if (parts.length < 2) continue;

			const key = parts[0].replace("-", "_");
			if (
				!(key in properties) && key != "server_ip" &&
				key != "server_port"
			) {
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

	getPlayingConnections() {
		return this.connections.values().filter((connection, _) =>
			connection.isPlaying()
		);
	}

	async listen() {
		this.server = new Server(this.properties.address, this.properties.port);

		this.server.on(
			"listen",
			() =>
				Logger.log(
					Level.INFO,
					`Listening on ${this.properties.address}:${this.properties.port}`,
				),
		);

		this.server.on("connect", (client: Client) => {
			const connection = new ClientConnection(this, client);
			this.connections.set(client, connection);
			Logger.log(Level.INFO, `Client ${connection.id} connected!`);
			client.on(
				"receive",
				(_, reader: ReadableBuffer) => connection.handle(reader),
			);
			client.on("close", (reason: string) => {
				Logger.log(Level.INFO, `Client ${connection.id} disconnected!`);
				Logger.log(Level.INFO, "Reason: " + reason);
				// TODO: cleanup?
				this.connections.get(client)!.close();
				this.connections.delete(client);
			});
		});

		await this.server.listen();
	}

	async onPlayerJoin(newConnection: ClientConnection) {
		const msg = colorMessage(
			`&e${newConnection.getPlayer()!.getUsername()} has joined`,
		);
		await this.broadcast(msg);
		Logger.log(Level.INFO, stripColor(msg));
		for await (const otherConnection of this.getPlayingConnections()) {
			if (otherConnection.getPlayer() == null) continue; // wtf?
			// Don't spawn if you
			if (otherConnection != newConnection) {
				// Spawn new player for others
				await newConnection.getPlayer()!.spawn(otherConnection);
				// spawn others for new player?
				await otherConnection.getPlayer()!.spawn(newConnection);
			}
		}
	}

	async onPlayerLeave(connection: ClientConnection) {
		const msg = colorMessage(
			`&e${connection.getPlayer()!.getUsername()} left`,
		);
		await this.broadcast(msg);
		Logger.log(Level.INFO, stripColor(msg));
		for await (const otherConnection of this.getPlayingConnections()) {
			// await otherConnection.sendTabListUpdate(connection, true);
			const player = connection.getPlayer();
			if (player != null) {
				await player.remove(otherConnection);
			}
		}
	}

	async updatePlayerPosition(connection: ClientConnection) {
		for await (const otherConnection of this.getPlayingConnections()) {
			if (otherConnection != connection) {
				const player = connection.getPlayer()!;
				const oldPos = player.getLastPosition();
				const newPos = player.getPosition();
				if (!oldPos.equals(newPos)) {
					const entityId = player.getEntityID();
					const nx = toAbsolutePosition(newPos.x - oldPos.x);
					const ny = toAbsolutePosition(newPos.y - oldPos.y);
					const nz = toAbsolutePosition(newPos.z - oldPos.z);
					const yaw = toAbsoluteRotation(player.getYaw());
					const pitch = toAbsoluteRotation(player.getPitch());
					player.setPosition(player.getPosition());
					await connection.sendPacket(
						new RelEntityMoveLookPacket(
							entityId,
							nx,
							ny,
							nz,
							yaw,
							pitch,
						),
					);
				}
			}
		}
	}

	getConnectionByUsername(username: string) {
		let _connection = null;
		for (const [_, connection] of this.connections) {
			if (connection.getPlayer() != null) {
				if (connection.getPlayer()!.getUsername() == username) {
					_connection = connection;
				}
			}
		}

		return _connection;
	}

	getDifficulty() {
		return this.difficulty;
	}

	getMessageOfTheDay() {
		return this.properties.motd;
	}

	getOnlinePlayerCount() {
		let online = 0;
		for (const connection of this.getPlayingConnections()) {
			if (connection.getPlayer() != null) {
				online++;
			}
		}

		return online;
	}

	isOnlineMode() {
		return this.properties.online_mode;
	}

	getMaxPlayerCount() {
		return this.properties.max_players;
	}

	getPlayerWithUUID(uuid: string) {
		// horrid
		const players = this.getEntitiesOf(EntityType.PLAYER);
		const it = players.find((player) =>
			(player as Player).getUUID() === uuid
		);
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
		for (const connection of this.getPlayingConnections()) {
			// player is null, possibly logging in
			if (connection.getPlayer() != null) {
				await connection.sendPacket(new ChatMessagePacket(message));
			}
		}

		// Logger.log(Level.INFO, stripColor(message));
	}

	async tick() {
		this.time++;
		if (this.time >= 24000) this.time = 0;
		for (const connection of this.getPlayingConnections()) {
			if (connection.getPlayer() == null) continue; // player is null, possibly logging in
			await connection.sendPacket(
				new KeepAlivePacket(Math.floor(Math.random() * 10000)),
			);
			await connection.sendPacket(
				new UpdateTimePacket(BigInt(this.time)),
			);
			// await connection.sendHealthUpdate();

			// Send other player movement
			for await (const otherConnection of this.getPlayingConnections()) {
				const player = otherConnection.getPlayer();
				if (player == null) continue; // skip

				// Add entity for others
				const writer = new WritableBuffer();
				Types.BYTE.write(writer, PacketType.ENTITY);
				Types.INTEGER.write(writer, player.getEntityID());
				await connection.getClient().write(writer.build());

				await this.updatePlayerPosition(connection);
			}

			await this.overworld.tick();
			await this.nether.tick();
			await this.the_end.tick();

			for await (const otherConnection of this.getPlayingConnections()) {
				const otherPlayer = otherConnection.getPlayer();
				if (!(connection.getPlayer() == null || otherPlayer == null)) {
					await connection.sendPacket(
						new PlayerListItemPacket(
							otherPlayer.getUsername(),
							UpdateType.ADD,
						),
					);
				}
			}
		}
	}
}
