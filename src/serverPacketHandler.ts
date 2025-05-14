import PacketHandler from "./packet/PacketHandler.ts";
import ClientConnection from "./util/connection.ts";
import KeepAlivePacket from "./packet/KeepAlivePacket.ts";
import ServerListPingPacket from "./packet/ServerListPingPacket.ts";
import KickDisconnectPacket from "./packet/KickDisconnectPacket.ts";
import { Level, Logger } from "./logger/Logger.ts";
import MinecraftServer from "./server.ts";
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

export default class ServerPacketHandler extends PacketHandler {
	private playing: boolean;

	constructor(
		private server: MinecraftServer,
		private connection: ClientConnection,
	) {
		super();
		this.playing = false;
	}

	isPlaying() {
		return this.playing;
	}

	override async onKeepAlive(packet: KeepAlivePacket) {
		// Logger.log(Level.INFO, "keep alive");
		await this.connection.sendPacket(new KeepAlivePacket(packet.getId()));
	}

	override async onLoginRequest(packet: LoginRequestPacket) {
		// 			if (
		// 				server.getOnlinePlayerCount() >= server.getMaxPlayerCount()
		// 			) {
		// 				await sendKickPacket(this, "The server is full!");
		// 				return;
		// 			}
		//
		// 			// Login Request
		// 			const protocol_id = Types.INTEGER.read(reader);
		// 			const username = readPacketString(reader);
		//
		// 			if (protocol_id != ProtocolVersion.v1_2_4_to_1_2_5) {
		// 				await sendKickPacket(
		// 					this,
		// 					`You are using a outdated client, ${username}! You are using ${protocol_id}`,
		// 				);
		// 				return;
		// 			}
		//
		// 			const uuid = await fetchUUID(username);
		// 			if (uuid === null && server.isOnlineMode()) {
		// 				console.log(
		// 					`id=${this.id} username='${username}', uuid='${uuid}'`,
		// 				);
		// 				await sendKickPacket(
		// 					this,
		// 					`Failed to login, invalid uuid.`,
		// 				);
		// 				return;
		// 			}
		//
		// 			this.player = new Player(this, username, uuid);
		// 			this.playing = true;
		// 			await this.sendLoginRequestPacket(server);
		// 			await this.sendPlayerPosition();
		// 			await server.onPlayerJoin(this);
		// 			// TODO: player abilities
		// 			// TODO: chunks
		// 			// await server.sendChunks(this.client);
		//
		// 			for (let chunk_x = -4; chunk_x < 4; chunk_x++) {
		// 				for (let chunk_z = -4; chunk_z < 4; ++chunk_z) {
		// 					{
		// 						// Chunk Allocation
		// 						const writer = new WritableBuffer();
		// 						Types.BYTE.write(writer, PacketType.PRE_CHUNK);
		// 						Types.INTEGER.write(writer, chunk_x);
		// 						Types.INTEGER.write(writer, chunk_z);
		// 						Types.BOOLEAN.write(writer, true);
		// 						await this.client.write(writer.build());
		// 					}
		//
		// 					{
		// 						// Chunk Data
		// 						const blocks = new Uint8Array(
		// 							new Uint8Array(16 * 256 * 16).map((_) =>
		// 								Math.floor(Math.random() * 4)
		// 							),
		// 						);
		// 						const compressed = pako.deflate(blocks);
		//
		// 						// Chunk Data Packet
		// 						if (compressed) {
		// 							// this.sendMessage("Sending chunk with size: " + compressed.length);
		// 							const writer = new WritableBuffer();
		// 							Types.BYTE.write(writer, PacketType.CHUNK_DATA);
		// 							Types.INTEGER.write(writer, chunk_x); // Chunk X
		// 							Types.INTEGER.write(writer, chunk_z); // Chunk Z
		// 							Types.BOOLEAN.write(writer, true); // Ground-up continuous
		// 							Types.SHORT.write(writer, 15); // primary bitmap (Bitmask with 1 for every 16x16x16 section which data follows in the compressed data.)
		// 							Types.SHORT.write(writer, 0); // add bitmap
		// 							Types.INTEGER.write(writer, compressed.length); // size of compressed data
		// 							Types.INTEGER.write(writer, 0); // unused?
		// 							for (let i = 0; i < compressed.length; ++i) {
		// 								Types.BYTE.write(writer, compressed[i]);
		// 							}
		//
		// 							await this.client.write(writer.build());
		// 						} else {
		// 							this.sendMessage("Failed to send chunk!");
		// 						}
		// 					}
		// 				}
		// 			}
		//
		// 			// The payload is a set of 16x16x16 sections, sharing the same X and Z coordinates. What is and isn't sent is provided by the two bitmask fields. The least significant bit is '1' if the section spanning from Y=0 to Y=15 is not completely air, and so forth. For block IDs, metadata, and lighting, the primary bitmask is used. A secondary bitmask is used for 'add' data, which is Mojang's means of provided Block IDs past 256. In vanilla minecraft, you can expect this to always be zero. The sections included in this packet progress from bottom to top, where Y=0 is the bottom.
		//
		// 			// The data is compressed using the deflate() function in zlib. After uncompressing, the data consists of five (or six) sequential sections, in order:
		//
		// 			// Block type array (1 byte per block, 4096 bytes per section)
		// 			// Block metadata array (half byte per block, 2048 bytes per section)
		// 			// Block light array (half byte per block, 2048 bytes per section)
		// 			// Sky light array (half byte per block, 2048 bytes per section)
		// 			// Add array (half byte per block, 2048 bytes per section, uses second bitmask)
		// 			// Biome array (1 byte per XZ coordinate, 256 bytes total, only sent if 'ground up continuous' is true)
		// 			// Each section is the concatenated data of all included sections (i.e. the block type array contains the block types of all included sections).
		//
	}

	override async onHandshake(packet: HandshakePacket) {}

	override async onChatMessage(packet: ChatMessagePacket) {}

	override async onUpdateTime(packet: UpdateTimePacket) {}

	override async onPlayer(packet: PlayerPacket) {}

	override async onPlayerPosition(packet: PlayerPositionPacket) {}

	override async onPlayerLook(packet: PlayerLookPacket) {}

	override async onPlayerPositionLook(packet: PlayerPositionLookPacket) {}

	override async onAnimation(packet: AnimationPacket) {}

	override async onSetWindowItems(packet: SetWindowItemsPacket) {
	}

	override async onPlayerAbilities(packet: PlayerAbilitiesPacket) {}

	override async onPluginMessage(packet: PluginMessagePacket) {}

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
	}
}
