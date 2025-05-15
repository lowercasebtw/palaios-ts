import PacketHandler from "./packet/PacketHandler.ts";
import ClientConnection from "./util/connection.ts";
import KeepAlivePacket from "./packet/KeepAlivePacket.ts";
import ServerListPingPacket from "./packet/ServerListPingPacket.ts";
import KickDisconnectPacket from "./packet/KickDisconnectPacket.ts";
import { Level, Logger } from "./logger/Logger.ts";
import MinecraftServer, { ProtocolVersion } from "./server.ts";
import LoginRequestPacket from "./packet/LoginRequestPacket.ts";
import ChatMessagePacket from "./packet/ChatMessagePacket.ts";
import PlayerPositionPacket from "./packet/PlayerPositionPacket.ts";
import PlayerPacket from "./packet/PlayerPacket.ts";
import PlayerLookPacket from "./packet/PlayerLookPacket.ts";
import PlayerPositionLookPacket from "./packet/PlayerPositionLookPacket.ts";
import AnimationPacket from "./packet/AnimationPacket.ts";
import PlayerAbilitiesPacket from "./packet/PlayerAbilitiesPacket.ts";
import PluginMessagePacket from "./packet/PluginMessagePacket.ts";
import HandshakePacket from "./packet/HandshakePacket.ts";
import SetWindowItemsPacket from "./packet/SetWindowItemsPacket.ts";
import UpdateTimePacket from "./packet/UpdateTimePacket.ts";
import { Player } from "./game/entity/Player.ts";
import PlayerListItemPacket from "./packet/PlayerListItemPacket.ts";
import RelEntityMoveLookPacket from "./packet/RelEntityMoveLookPacket.ts";
import { generateHash } from "./util/hash.ts";
import { fetchUUID } from "./util/util.ts";
import Types, { WritableBuffer } from "./util/byte.ts";
import PacketType from "./packet/PacketType.ts";
import pako from "https://deno.land/x/pako@v2.0.3/pako.js";
import { DimensionType, WorldType } from "./util/types.ts";

export default class ServerPacketHandler extends PacketHandler {
	private playing: boolean;
	private player: Player | null;

	constructor(
		private server: MinecraftServer,
		private connection: ClientConnection,
	) {
		super();
		this.playing = false;
		this.player = null;
	}

	isPlaying() {
		return this.playing;
	}

	getPlayer() {
		return this.player;
	}

	override async onKeepAlive(packet: KeepAlivePacket) {
		// Logger.log(Level.INFO, "keep alive");
		await this.connection.sendPacket(new KeepAlivePacket(packet.getId()));
	}

	override async onLoginRequest(packet: LoginRequestPacket) {
		if (
			this.server.getOnlinePlayerCount() >=
				this.server.getMaxPlayerCount()
		) {
			await this.connection.kick("The server is full!");
			return;
		}

		// Login Request
		const username = packet.getUsername();
		if (packet.getProtocolVersion() != ProtocolVersion.v1_2_4_to_1_2_5) {
			await this.connection.kick(
				`You are using a outdated client, ${username}! You are using ${packet.getProtocolVersion()}`,
			);
			return;
		}

		const uuid = await fetchUUID(username);
		if (uuid === null && this.server.isOnlineMode()) {
			console.log(
				`id=${this.connection.id} username='${username}', uuid='${uuid}'`,
			);
			await this.connection.kick(`Failed to login, invalid uuid.`);
			return;
		}

		this.player = new Player(this.connection, username, uuid);
		this.playing = true;

		await this.connection.sendPacket(
			new LoginRequestPacket(
				ProtocolVersion.v1_2_4_to_1_2_5,
				this.player.getUsername(),
				WorldType.DEFAULT,
				this.player.getGamemode(),
				DimensionType.OVERWORLD,
				this.server.getDifficulty(),
				10,
			),
		);

		await this.connection.sendPacket(
			new PlayerPositionPacket(
				this.player.getPosition(),
				0,
				this.player.isOnGround(),
			),
		);

		await this.server.onPlayerJoin(this.connection);
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
					await this.connection.getClient().write(writer.build());
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

						await this.connection.getClient().write(writer.build());
					} else {
						await this.connection.sendPacket(
							new ChatMessagePacket("Failed to send chunk!"),
						);
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
	}

	override async onHandshake(packet: HandshakePacket) {
		await this.connection.sendPacket(
			new HandshakePacket(
				this.server.isOnlineMode() ? generateHash() : "-",
			),
		);
	}

	override async onChatMessage(packet: ChatMessagePacket) {
		// 			const message = readPacketString(reader);
		// 			if (this.player == null) return;
		//
		// 			if (message.startsWith("/")) {
		// 				const parts = message.slice(1, message.length).split(" ");
		// 				const cmd = parts.shift();
		// 				switch (cmd) {
		// 					case "time":
		// 						await this.sendMessage(
		// 							"The time in ticks is: " + server.getTime(),
		// 						);
		// 						await this.sendMessage(
		// 							"Is it day? " + server.isDay(),
		// 						);
		// 						await this.sendMessage(
		// 							"Is it night? " + server.isNight(),
		// 						);
		// 						break;
		// 					case "kick":
		// 						if (parts.length > 0) {
		// 							const name = parts.shift() as string;
		// 							await this.sendMessage(`Kicking ${name}!`);
		// 							const them = server.getConnectionByUsername(
		// 								name,
		// 							);
		// 							if (them != null) {
		// 								sendKickPacket(
		// 									them,
		// 									"You have been kicked!",
		// 								);
		// 							} else {
		// 								await this.sendMessage(
		// 									`Failed to kick ${name}!`,
		// 								);
		// 							}
		// 						} else {
		// 							await this.sendMessage(
		// 								"You must provide someones ign to kick!",
		// 							);
		// 						}
		//
		// 						break;
		// 					default:
		// 						await this.sendMessage(
		// 							colorMessage("&cUnknown command."),
		// 						);
		// 						break;
		// 				}
		// 				return;
		// 			}
		//
		// 			await server.broadcast(
		// 				`<${this.player.getUsername()}> ${message}`,
		// 			);
	}

	override async onUpdateTime(packet: UpdateTimePacket) {
		// illegal
	}

	override async onPlayer(packet: PlayerPacket) {
		if (this.player === null) {
			await this.connection.kick("Player is null");
		} else {
			this.player.setOnGround(packet.isOnGround());
		}
	}

	override async onPlayerPosition(packet: PlayerPositionPacket) {
		if (this.player === null) {
			await this.connection.kick("Player is null");
			return;
		}

		// 			// Player Position
		// 			const x = Types.DOUBLE.read(reader);
		// 			const y = Types.DOUBLE.read(reader);
		// 			const stance = Types.DOUBLE.read(reader);
		//
		// 			if (stance - y < 0.1 || stance - y > 1.65) {
		// 				await sendKickPacket(this, "Invalid stance");
		// 				return;
		// 			}
		//
		// 			const z = Types.DOUBLE.read(reader);
		// 			const on_ground = Types.BOOLEAN.read(reader);
		//
		// 			this.player.setPosition(new Vec3d(x, y, z));
		// 			this.player.setOnGround(on_ground);
		// 			await server.updatePlayerPosition(this);
	}

	override async onPlayerLook(packet: PlayerLookPacket) {
		if (this.player === null) {
			await this.connection.kick("Player is null");
			return;
		}

		this.player.setYaw(packet.getYaw());
		this.player.setPitch(packet.getPitch());
		this.player.setOnGround(packet.isOnGround());
		await this.server.updatePlayerPosition(this.connection);
	}

	override async onPlayerPositionLook(packet: PlayerPositionLookPacket) {
		if (this.player === null) {
			await this.connection.kick("Player is null");
			return;
		}

		// Player Position Look
		const stance = packet.getStance();
		const position = packet.getPosition();
		if (stance - position.y < 0.1 || stance - position.y > 1.65) {
			await this.connection.kick("Invalid stance");
			return;
		}

		this.player.setPosition(position);
		this.player.setYaw(packet.getYaw());
		this.player.setPitch(packet.getPitch());
		this.player.setOnGround(packet.isOnGround());
		await this.server.updatePlayerPosition(this.connection);
	}

	override async onAnimation(packet: AnimationPacket) {}

	override async onRelEntityMoveLook(packet: RelEntityMoveLookPacket) {}

	override async onSetWindowItems(packet: SetWindowItemsPacket) {}

	override async onPlayerListItem(packet: PlayerListItemPacket) {}

	override async onPlayerAbilities(packet: PlayerAbilitiesPacket) {
		if (this.player != null) {
			await this.connection.sendPacket(packet);
		}
	}

	override async onPluginMessage(packet: PluginMessagePacket) {
		// // Plugin Message
		// Logger.log(
		// 	Level.INFO,
		// 	`Got Plugin Message ('${packet.getChannel()}') [ ...${packet.getMessage().length} bytes ]`,
		// );
	}

	override async onServerListPing(packet: ServerListPingPacket) {
		Logger.log(Level.INFO, "Got server list ping!");
		await this.connection.sendPacket(
			new KickDisconnectPacket(
				`${this.server.getMessageOfTheDay()}§${this.server.getOnlinePlayerCount()}§${this.server.getMaxPlayerCount()}`,
			),
		);
	}

	override async onKickDisconnect(packet: KickDisconnectPacket) {
		Logger.log(Level.INFO, "Got kick disconnect!");
		Logger.log(Level.INFO, "   Reason: " + packet.getReason());
		await this.server.onPlayerLeave(this.connection);
	}
}
