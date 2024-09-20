import * as pako from "https://deno.land/x/pako@v2.0.3/pako.js";
import { Client, Packet } from "https://deno.land/x/tcp_socket@0.0.1/mods.ts";
import MinecraftServer from "../server.ts";
import {
	sendKickPacket,
	PacketType,
	ProtocolVersion,
	readPacketString,
	sendHandshakePacket,
	writePacketString,
} from "../packet.ts";
import { ByteReader, ByteWriter, Type } from "../util/byte.ts";
import { colorMessage } from "../util/color.ts";
import { Location, Vec3d } from "../util/mth.ts";
import { Level, Logger } from "../logger/Logger.ts";
import { fetchUUID } from "./util.ts";
import { Player } from "../game/entity/Player.ts";
import { Gamemode, WorldType } from "./types.ts";

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
	
	getClient() {
		return this.client;
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
				await this.sendLoginRequestPacket(server);
				await this.sendPlayerPosition();
				server.onPlayerJoin(this);
				// TODO: player abilities
				// TODO: chunks
				// await server.sendChunks(this.client);

				for (let chunk_x = -4; chunk_x < 4; chunk_x++) {
					for (let chunk_z = -4; chunk_z < 4; ++chunk_z) {
						{
							// Chunk Allocation
							const writer = new ByteWriter();
							writer.write(Type.BYTE, PacketType.PRE_CHUNK);
							writer.write(Type.INTEGER, chunk_x);
							writer.write(Type.INTEGER, chunk_z);
							writer.write(Type.BOOLEAN, true);
							await this.client.write(writer.build());
						}

						{
							// Chunk Data
							const blocks = new Uint8Array(
								new Uint8Array(16 * 256 * 16).map((_) => Math.floor(Math.random() * 4)),
							);
							const compressed = pako.deflate(blocks);

							// Chunk Data Packet
							if (compressed) {
								// this.sendMessage("Sending chunk with size: " + compressed.length);
								const writer = new ByteWriter();
								writer.write(Type.BYTE, PacketType.CHUNK_DATA);
								writer.write(Type.INTEGER, chunk_x); // Chunk X
								writer.write(Type.INTEGER, chunk_z); // Chunk Z
								writer.write(Type.BOOLEAN, true); // Ground-up continuous
								writer.write(Type.SHORT, 15); // primary bitmap (Bitmask with 1 for every 16x16x16 section which data follows in the compressed data.)
								writer.write(Type.SHORT, 0); // add bitmap
								writer.write(Type.INTEGER, compressed.length); // size of compressed data
								writer.write(Type.INTEGER, 0); // unused?

								for (let i = 0; i < compressed.length; ++i) {
									writer.write(Type.BYTE, compressed[i]);
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
							await this.sendMessage("The time in ticks is: " + server.getTime());
							await this.sendMessage("Is it day? " + server.isDay());
							await this.sendMessage("Is it night? " + server.isNight());
							break;
						case "kick":
							if (parts.length > 0) {
								const name = parts.shift() as string;
								await this.sendMessage(`Kicking ${name}!`);
								const them = server.getConnectionByUsername(name);
								if (them != null) {
									sendKickPacket(them.getClient(), "You have been kicked!");
								} else {
									await this.sendMessage(`Failed to kick ${name}!`);
								}
							} else {
								await this.sendMessage("You must provide someones ign to kick!");
							}

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

			case PacketType.PLAYER_ABILITIES: {
				if (this.player == null) return;

				// NOTE: I don't think i'm doing this right, might need to send abilities
				// on join?
				const invulnerable = reader.read(Type.BOOLEAN) as boolean;
				const is_flying = reader.read(Type.BOOLEAN) as boolean;
				const can_fly = reader.read(Type.BOOLEAN) as boolean;
				const instant_destroy = reader.read(Type.BOOLEAN) as boolean;

				const is_creative = this.player.getGamemode() == Gamemode.CREATIVE;
				console.log("is c", is_creative);
				const writer = new ByteWriter();
				writer.write(Type.BYTE, PacketType.PLAYER_ABILITIES);
				writer.write(Type.BOOLEAN, is_creative); // Invulnerability
				writer.write(Type.BOOLEAN, is_flying); // Is flying
				writer.write(Type.BOOLEAN, is_creative); // Can fly
				writer.write(Type.BOOLEAN, is_creative); // Instant Destroy

				await this.client.write(writer.build());
				break;
			}

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

	async sendLoginRequestPacket(server: MinecraftServer) {
		if (this.player == null) return; // erm no this shouldnt happen
		const writer = new ByteWriter();
		writer.write(Type.BYTE, PacketType.LOGIN_REQUEST);
		writer.write(Type.INTEGER, ProtocolVersion.v1_2_4_to_1_2_5);
		writePacketString(writer, this.player.getUsername());
		writePacketString(writer, WorldType.DEFAULT);
		writer.write(Type.INTEGER, this.player.getGamemode());
		writer.write(Type.INTEGER, server.getDifficulty());
		writer.write(Type.BYTE, server.getDifficulty());
		writer.write(Type.BYTE, 256); // World Height?
		writer.write(Type.BYTE, 10); // Tab List Count?
		await this.client.write(writer.build());
	}

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

	async sendTabListUpdate(other: ClientConnection, remove: boolean = false) {
		// Should this happen?
		if (this.player == null || other.getPlayer() == null) return;			
		const writer = new ByteWriter();
		writer.write(Type.BYTE, PacketType.PLAYER_LIST_ITEM);
		writePacketString(writer, other.getPlayer()!.getUsername());
		writer.write(Type.BOOLEAN, !remove); // false to remove
		writer.write(Type.SHORT, 0); // TODO: Ping
		await this.client.write(writer.build());
	}
	
	async write(bytes: Uint8Array) {
		return this.client.write(bytes);
	}
}
