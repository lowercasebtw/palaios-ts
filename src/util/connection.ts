import { Client, Packet } from "https://deno.land/x/tcp_socket@0.0.1/mods.ts";
import MinecraftServer from "../server.ts";
import {
	sendKickPacket,
	PacketType,
	ProtocolVersion,
	readPacketString,
	sendHandshakePacket,
	sendLoginRequestPacket,
	writePacketString,
} from "../packet.ts";
import { ByteReader, ByteWriter, Type } from "../util/byte.ts";
import { colorMessage } from "../util/color.ts";
import { Location, Vec3d } from "../util/mth.ts";
import { Level, Logger } from "../logger/Logger.ts";
import { fetchUUID } from "./util.ts";
import { Player } from "../game/entity/Player.ts";

export default class ClientConnection {
	private static LAST_CONNECTION_ID = 0;

	public readonly id: number;

	private client: Client;
	private player: Player | null;

	public constructor(client: Client) {
		this.id = ClientConnection.LAST_CONNECTION_ID++;
		this.client = client;
		this.player = null;
	}

	getPlayer() {
		return this.player;
	}

	async handle(server: MinecraftServer, packet: Packet) {
		// handle packet data
		const reader = new ByteReader(packet.data);
		const packet_id = reader.read(Type.BYTE) as number;
		switch (packet_id) {
			case PacketType.KEEP_ALIVE: {
				const writer = new ByteWriter();
				writer.write(Type.BYTE, PacketType.KEEP_ALIVE);
				writer.write(Type.INTEGER, reader.read(Type.INTEGER) as number);
				await this.client.write(writer.build());
				break;
			}

			case PacketType.LOGIN_REQUEST: {
				if (server.getOnlinePlayerCount() >= server.getMaxPlayerCount()) {
					await sendKickPacket(this.client, "The server is full!");
					return;
				}

				// Login Request
				const protocol_id = reader.read(Type.INTEGER) as number;
				const username = readPacketString(reader);

				if (protocol_id != ProtocolVersion.v1_2_4_to_1_2_5) {
					await sendKickPacket(
						this.client,
						`You are using a outdated client, ${username}! You are using ${protocol_id}`,
					);
					return;
				}

				const uuid = await fetchUUID(username);
				if (uuid === null && server.isOnlineMode()) {
					console.log(`id=${this.id} username='${username}', uuid='${uuid}'`);
					await sendKickPacket(this.client, `Failed to login, invalid uuid.`);
					return;
				}

				this.player = new Player(username, uuid);
				await sendLoginRequestPacket(this.client, server, this.player);
				await this.sendPlayerPosition();
				server.onPlayerJoin(this);
				await server.sendChunks(this.client);
				break;
			}

			case PacketType.HANDSHAKE: {
				// Handle Client Data
				await sendHandshakePacket(this.client, server.isOnlineMode());
				break;
			}

			case PacketType.CHAT_MESSAGE: {
				const message = readPacketString(reader);
				if (this.player == null) return;

				if (message.startsWith("/")) {
					switch (message.slice(1, message.length)) {
						case "time":
							await this.sendMessage("The time in ticks is: " + server.getTime());
							await this.sendMessage("Is it day? " + server.isDay());
							await this.sendMessage("Is it night? " + server.isNight());
							break;
						default:
							await this.sendMessage(colorMessage("&cUnknown command."));
							break;
					}
					return;
				}

				await server.broadcast(`<${this.player.getUsername()}> ${message}`);
				break;
			}

			case PacketType.FLYING: {
				const on_ground = reader.read(Type.BOOLEAN) as boolean;
				if (this.player === null) {
					await sendKickPacket(this.client, "Player is null");
					return;
				}
				this.player.setOnGround(on_ground);
				break;
			}

			case PacketType.PLAYER_POSITION: {
				// Player Position
				const x = reader.read(Type.DOUBLE) as number;
				const y = reader.read(Type.DOUBLE) as number;
				const stance = reader.read(Type.DOUBLE) as number;

				if (stance - y < 0.1 || stance - y > 1.65) {
					await sendKickPacket(this.client, "Invalid stance");
					return;
				}

				const z = reader.read(Type.DOUBLE) as number;
				const on_ground = reader.read(Type.BOOLEAN) as boolean;

				if (this.player === null) {
					await sendKickPacket(this.client, "Player is null");
					return;
				}

				const old_location = this.player.getLocation();
				this.player.setLocation(
					new Location(
						old_location.getDimensionType(),
						new Vec3d(x, y, z),
						old_location.getYaw(),
						old_location.getPitch(),
					),
				);
				this.player.setOnGround(on_ground);
				break;
			}

			case PacketType.PLAYER_LOOK: {
				// Player Look
				const yaw = reader.read(Type.FLOAT) as number;
				const pitch = reader.read(Type.FLOAT) as number;
				const on_ground = reader.read(Type.BOOLEAN) as boolean;

				if (this.player === null) {
					await sendKickPacket(this.client, "Player is null");
					return;
				}

				const old_location = this.player.getLocation();
				this.player.setLocation(
					new Location(old_location.getDimensionType(), old_location.getPosition(), yaw, pitch),
				);
				this.player.setOnGround(on_ground);
				break;
			}

			case PacketType.PLAYER_POSITION_LOOK: {
				// Player Position Look
				const x = reader.read(Type.DOUBLE) as number;
				const y = reader.read(Type.DOUBLE) as number;
				const stance = reader.read(Type.DOUBLE) as number;

				if (stance - y < 0.1 || stance - y > 1.65) {
					await sendKickPacket(this.client, "Invalid stance");
					return;
				}

				const z = reader.read(Type.DOUBLE) as number;
				const yaw = reader.read(Type.FLOAT) as number;
				const pitch = reader.read(Type.FLOAT) as number;
				const on_ground = reader.read(Type.BOOLEAN) as boolean;

				if (this.player === null) {
					await sendKickPacket(this.client, "Player is null");
					return;
				}

				const old_location = this.player.getLocation();
				this.player.setLocation(new Location(old_location.getDimensionType(), new Vec3d(x, y, z), yaw, pitch));
				this.player.setOnGround(on_ground);

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
				break;
			}

			case PacketType.ANIMATION:
				break;

			case PacketType.PLUGIN_MESSAGE: {
				// Plugin Message
				const channel = readPacketString(reader);
				const byte_len = reader.read(Type.SHORT) as number;
				// const bytes = reader.read_bytes(byte_len);
				Logger.log(Level.INFO, `Got Plugin Message ('${channel}') [ ...${byte_len} bytes ]`);
				break;
			}

			case PacketType.SERVER_LIST_PING: {
				Logger.log(Level.INFO, "Got server list ping!");
				await sendKickPacket(
					this.client,
					`${server.getMessageOfTheDay()}§${server.getOnlinePlayerCount()}§${server.getMaxPlayerCount()}`,
				);
				break;
			}

			case PacketType.KICK_DISCONNECT: {
				server.onPlayerLeave(this);
				break;
			}

			default: {
				Logger.log(Level.WARNING, `TODO: Handle packet (${packet_id}) ${PacketType[packet_id]}`);
				break;
			}
		}
	}

	close() {}

	// Writing
	async sendPlayerPosition() {
		// Should this happen?
		if (this.player == null) return;
		const writer = new ByteWriter();
		writer.write(Type.BYTE, PacketType.PLAYER_POSITION);
		const position = this.player.getLocation().getPosition();
		writer.write(Type.DOUBLE, position.x);
		writer.write(Type.DOUBLE, position.y);
		writer.write(Type.DOUBLE, 0);
		writer.write(Type.DOUBLE, position.z);
		writer.write(Type.BYTE, this.player.isOnGround() == true ? 1 : 0);
		await this.client.write(writer.build());
	}

	async sendMessage(message: string) {
		const writer = new ByteWriter();
		writer.write(Type.BYTE, PacketType.CHAT_MESSAGE);
		writePacketString(writer, message);
		await this.client.write(writer.build());
	}

	async sendHealthUpdate() {
		// Should this happen?
		if (this.player == null) return;
		const writer = new ByteWriter();
		writer.write(Type.BYTE, PacketType.UPDATE_HEALTH);
		writer.write(Type.SHORT, this.player.getHealth());
		writer.write(Type.SHORT, this.player.getHungerLevel());
		writer.write(Type.FLOAT, this.player.getSaturation());
		await this.client.write(writer.build());
	}
}
