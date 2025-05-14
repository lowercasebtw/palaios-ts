import * as pako from "https://deno.land/x/pako@v2.0.3/pako.js";
import { Player } from "../game/entity/Player.ts";
import { Level, Logger } from "../logger/Logger.ts";
import {
	PacketType,
	ProtocolVersion,
	readPacketString,
	sendHandshakePacket,
	sendKickPacket,
	writePacketString,
} from "../packet.ts";
import MinecraftServer from "../server.ts";
import Types, { ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import { colorMessage } from "./color.ts";
import { Vec3d } from "./mth.ts";
import { Gamemode, WorldType } from "./types.ts";
import { fetchUUID } from "./util.ts";
import { Client, Packet } from "./tcp.ts";

export default class ClientConnection {
	private static LAST_CONNECTION_ID = 0;
	public readonly id: number;
	private readonly client: Client;
	private player: Player | null;

	public constructor(client: Client) {
		this.id = ClientConnection.LAST_CONNECTION_ID++;
		this.client = client;
		this.player = null;
	}

	getClient() {
		return this.client;
	}

	getPlayer() {
		return this.player;
	}

	async handle(server: MinecraftServer, packet: Packet) {
		// handle packet data
		const reader = new ReadableBuffer(packet.data);
		const packet_id = Types.BYTE.read(reader) as number;
		switch (packet_id) {
			case PacketType.KEEP_ALIVE: {
				const writer = new WritableBuffer();
				Types.BYTE.write(writer, PacketType.KEEP_ALIVE);
				Types.INTEGER.write(writer, Types.INTEGER.read(reader));
				await this.client.write(writer.build());
				break;
			}

			case PacketType.LOGIN_REQUEST: {
				if (
					server.getOnlinePlayerCount() >= server.getMaxPlayerCount()
				) {
					await sendKickPacket(this.client, "The server is full!");
					return;
				}

				// Login Request
				const protocol_id = Types.INTEGER.read(reader);
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
					console.log(
						`id=${this.id} username='${username}', uuid='${uuid}'`,
					);
					await sendKickPacket(
						this.client,
						`Failed to login, invalid uuid.`,
					);
					return;
				}

				this.player = new Player(this, username, uuid);
				await this.sendLoginRequestPacket(server);
				await this.sendPlayerPosition();
				await server.onPlayerJoin(this);
				// TODO: player abilities
				// TODO: chunks
				// await server.sendChunks(this.client);

				for (let chunk_x = -4; chunk_x < 4; chunk_x++) {
					for (let chunk_z = -4; chunk_z < 4; ++chunk_z) {
						{
							// Chunk Allocation
							const writer = new WritableBuffer();
							Types.BYTE.write(writer, PacketType.PRE_CHUNK);
							Types.INTEGER.write(writer, chunk_x);
							Types.INTEGER.write(writer, chunk_z);
							Types.BOOLEAN.write(writer, true);
							await this.client.write(writer.build());
						}

						{
							// Chunk Data
							const blocks = new Uint8Array(
								new Uint8Array(16 * 256 * 16).map((_) =>
									Math.floor(Math.random() * 4)
								),
							);
							const compressed = pako.deflate(blocks);

							// Chunk Data Packet
							if (compressed) {
								// this.sendMessage("Sending chunk with size: " + compressed.length);
								const writer = new WritableBuffer();
								Types.BYTE.write(writer, PacketType.CHUNK_DATA);
								Types.INTEGER.write(writer, chunk_x); // Chunk X
								Types.INTEGER.write(writer, chunk_z); // Chunk Z
								Types.BOOLEAN.write(writer, true); // Ground-up continuous
								Types.SHORT.write(writer, 15); // primary bitmap (Bitmask with 1 for every 16x16x16 section which data follows in the compressed data.)
								Types.SHORT.write(writer, 0); // add bitmap
								Types.INTEGER.write(writer, compressed.length); // size of compressed data
								Types.INTEGER.write(writer, 0); // unused?
								for (let i = 0; i < compressed.length; ++i) {
									Types.BYTE.write(writer, compressed[i]);
								}

								await this.client.write(writer.build());
							} else {
								this.sendMessage("Failed to send chunk!");
							}
						}
					}
				}

				// The payload is a set of 16x16x16 sections, sharing the same X and Z coordinates. What is and isn't sent is provided by the two bitmask fields. The least significant bit is '1' if the section spanning from Y=0 to Y=15 is not completely air, and so forth. For block IDs, metadata, and lighting, the primary bitmask is used. A secondary bitmask is used for 'add' data, which is Mojang's means of provided Block IDs past 256. In vanilla minecraft, you can expect this to always be zero. The sections included in this packet progress from bottom to top, where Y=0 is the bottom.

				// The data is compressed using the deflate() function in zlib. After uncompressing, the data consists of five (or six) sequential sections, in order:

				// Block type array (1 byte per block, 4096 bytes per section)
				// Block metadata array (half byte per block, 2048 bytes per section)
				// Block light array (half byte per block, 2048 bytes per section)
				// Sky light array (half byte per block, 2048 bytes per section)
				// Add array (half byte per block, 2048 bytes per section, uses second bitmask)
				// Biome array (1 byte per XZ coordinate, 256 bytes total, only sent if 'ground up continuous' is true)
				// Each section is the concatenated data of all included sections (i.e. the block type array contains the block types of all included sections).

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
					const parts = message.slice(1, message.length).split(" ");
					const cmd = parts.shift();
					switch (cmd) {
						case "time":
							await this.sendMessage(
								"The time in ticks is: " + server.getTime(),
							);
							await this.sendMessage(
								"Is it day? " + server.isDay(),
							);
							await this.sendMessage(
								"Is it night? " + server.isNight(),
							);
							break;
						case "kick":
							if (parts.length > 0) {
								const name = parts.shift() as string;
								await this.sendMessage(`Kicking ${name}!`);
								const them = server.getConnectionByUsername(
									name,
								);
								if (them != null) {
									sendKickPacket(
										them.getClient(),
										"You have been kicked!",
									);
								} else {
									await this.sendMessage(
										`Failed to kick ${name}!`,
									);
								}
							} else {
								await this.sendMessage(
									"You must provide someones ign to kick!",
								);
							}

							break;
						default:
							await this.sendMessage(
								colorMessage("&cUnknown command."),
							);
							break;
					}
					return;
				}

				await server.broadcast(
					`<${this.player.getUsername()}> ${message}`,
				);
				break;
			}

			case PacketType.FLYING: {
				if (this.player === null) {
					await sendKickPacket(this.client, "Player is null");
					return;
				}

				this.player.setOnGround(Types.BOOLEAN.read(reader));
				break;
			}

			case PacketType.PLAYER_POSITION: {
				if (this.player === null) {
					await sendKickPacket(this.client, "Player is null");
					return;
				}

				// Player Position
				const x = Types.DOUBLE.read(reader);
				const y = Types.DOUBLE.read(reader);
				const stance = Types.DOUBLE.read(reader);

				if (stance - y < 0.1 || stance - y > 1.65) {
					await sendKickPacket(this.client, "Invalid stance");
					return;
				}

				const z = Types.DOUBLE.read(reader);
				const on_ground = Types.BOOLEAN.read(reader);

				this.player.setLastLocation(this.player.getLocation());
				this.player.getLocation().setPosition(new Vec3d(x, y, z));
				this.player.setOnGround(on_ground);
				break;
			}

			case PacketType.PLAYER_LOOK: {
				if (this.player === null) {
					await sendKickPacket(this.client, "Player is null");
					return;
				}

				// Player Look
				const yaw = Types.FLOAT.read(reader);
				const pitch = Types.FLOAT.read(reader);
				const on_ground = Types.BOOLEAN.read(reader);

				this.player.setYaw(yaw);
				this.player.setPitch(pitch);
				this.player.setOnGround(on_ground);
				break;
			}

			case PacketType.PLAYER_POSITION_LOOK: {
				if (this.player === null) {
					await sendKickPacket(this.client, "Player is null");
					return;
				}

				// Player Position Look
				const x = Types.DOUBLE.read(reader);
				const y = Types.DOUBLE.read(reader);
				const stance = Types.DOUBLE.read(reader);

				if (stance - y < 0.1 || stance - y > 1.65) {
					await sendKickPacket(this.client, "Invalid stance");
					return;
				}

				const z = Types.DOUBLE.read(reader);
				const yaw = Types.FLOAT.read(reader);
				const pitch = Types.FLOAT.read(reader);
				const on_ground = Types.BOOLEAN.read(reader);

				this.player.setLastLocation(this.player.getLocation());
				this.player.getLocation().setPosition(new Vec3d(x, y, z));
				this.player.setYaw(yaw);
				this.player.setPitch(pitch);
				this.player.setOnGround(on_ground);
				await server.updatePlayerPosition(this);
				break;
			}

			case PacketType.ANIMATION:
				break;

			case PacketType.PLAYER_ABILITIES: {
				if (this.player == null) return;

				const invulnerable = Types.BOOLEAN.read(reader);
				const is_flying = Types.BOOLEAN.read(reader);
				const can_fly = Types.BOOLEAN.read(reader);
				const instant_destroy = Types.BOOLEAN.read(reader);

				const is_creative =
					this.player.getGamemode() == Gamemode.CREATIVE;
				console.log("is c", is_creative);
				const writer = new WritableBuffer();
				Types.BYTE.write(writer, PacketType.PLAYER_ABILITIES);
				Types.BOOLEAN.write(writer, invulnerable); // Invulnerability
				Types.BOOLEAN.write(writer, is_flying); // Is flying
				Types.BOOLEAN.write(writer, can_fly); // Can fly
				Types.BOOLEAN.write(writer, instant_destroy); // Instant Destroy
				await this.client.write(writer.build());
				break;
			}

			case PacketType.PLUGIN_MESSAGE: {
				// Plugin Message
				const channel = readPacketString(reader);
				const byte_len = Types.SHORT.read(reader);
				// const bytes = reader.read_bytes(byte_len);
				Logger.log(
					Level.INFO,
					`Got Plugin Message ('${channel}') [ ...${byte_len} bytes ]`,
				);
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
				await server.onPlayerLeave(this);
				break;
			}

			default: {
				Logger.log(
					Level.WARNING,
					`TODO: Handle packet (${packet_id}) ${
						PacketType[packet_id]
					}`,
				);
				break;
			}
		}
	}

	close() {
	}

	// Writing
	async sendLoginRequestPacket(server: MinecraftServer) {
		if (this.player == null) return; // erm no this shouldn't happen
		const writer = new WritableBuffer();
		Types.BYTE.write(writer, PacketType.LOGIN_REQUEST);
		Types.INTEGER.write(writer, ProtocolVersion.v1_2_4_to_1_2_5);
		writePacketString(writer, this.player.getUsername());
		writePacketString(writer, WorldType.DEFAULT);
		Types.INTEGER.write(writer, this.player.getGamemode());
		Types.INTEGER.write(writer, server.getDifficulty());
		Types.BYTE.write(writer, server.getDifficulty());
		Types.BYTE.write(writer, 256); // World Height?
		Types.BYTE.write(writer, 10); // Tab List Count?
		await this.client.write(writer.build());
	}

	async sendPlayerPosition() {
		// Should this happen?
		if (this.player == null) return;
		const writer = new WritableBuffer();
		Types.BYTE.write(writer, PacketType.PLAYER_POSITION);
		const position = this.player.getLocation().getPosition();
		Types.DOUBLE.write(writer, position.x);
		Types.DOUBLE.write(writer, position.y);
		Types.DOUBLE.write(writer, 0);
		Types.DOUBLE.write(writer, position.z);
		Types.BYTE.write(writer, this.player.isOnGround() == true ? 1 : 0);
		await this.client.write(writer.build());
	}

	async sendMessage(message: string) {
		const writer = new WritableBuffer();
		Types.BYTE.write(writer, PacketType.CHAT_MESSAGE);
		writePacketString(writer, message);
		await this.client.write(writer.build());
	}

	async sendHealthUpdate() {
		// Should this happen?
		if (this.player == null) return;
		const writer = new WritableBuffer();
		Types.BYTE.write(writer, PacketType.UPDATE_HEALTH);
		Types.SHORT.write(writer, this.player.getHealth());
		Types.SHORT.write(writer, this.player.getHungerLevel());
		Types.FLOAT.write(writer, this.player.getSaturation());
		await this.client.write(writer.build());
	}

	async sendTabListUpdate(other: ClientConnection, remove: boolean = false) {
		// Should this happen?
		if (this.player == null || other.getPlayer() == null) return;
		const writer = new WritableBuffer();
		Types.BYTE.write(writer, PacketType.PLAYER_LIST_ITEM);
		writePacketString(writer, other.getPlayer()!.getUsername());
		Types.BOOLEAN.write(writer, !remove); // false to remove
		Types.SHORT.write(writer, 0); // TODO: Ping
		await this.client.write(writer.build());
	}
}
