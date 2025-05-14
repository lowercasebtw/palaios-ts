import { Player } from "../game/entity/Player.ts";
import MinecraftServer from "../server.ts";
import Types, { ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import { Client } from "./tcp.ts";
import AbstractPacket from "../packet/AbstractPacket.ts";
import ServerPacketHandler from "../serverPacketHandler.ts";
import Packets from "../packet/Packets.ts";
import PacketType from "../packet/PacketType.ts";
import { Level, Logger } from "../logger/Logger.ts";

export default class ClientConnection {
	private static LAST_CONNECTION_ID = 0;
	public readonly id: number;
	private readonly server: MinecraftServer;
	private readonly client: Client;
	private readonly handler: ServerPacketHandler;
	private player: Player | null;

	public constructor(server: MinecraftServer, client: Client) {
		this.id = ClientConnection.LAST_CONNECTION_ID++;
		this.server = server;
		this.client = client;
		this.handler = new ServerPacketHandler(server, this);
		this.player = null;
	}

	getClient() {
		return this.client;
	}

	getPlayer() {
		return this.player;
	}

	isPlaying() {
		return this.handler.isPlaying();
	}

	async handle(reader: ReadableBuffer) {
		const packet_id = Types.BYTE.read(reader);
		if (!(packet_id in PacketType)) {
			Logger.log(
				Level.WARNING,
				"Recieved unknown packet type with id " + packet_id,
			);
			return;
		}

		const packetClass: AbstractPacket | undefined = Packets.INSTANCE
			.getPacket(packet_id)!;
		if (packetClass === undefined) {
			Logger.log(
				Level.WARNING,
				"TODO Packet: " + PacketType[packet_id],
			);
			return;
		}

		// eugh
		const packet = new (packetClass as any)();
		packet.read(reader);
		await packet.handle(this.handler);
	}

	async sendPacket(packet: AbstractPacket) {
		const writer = new WritableBuffer();
		Types.BYTE.write(writer, packet.getType());
		packet.write(writer);
		await this.client.write(writer.build());
	}

	close() {
	}

	// async handle(server: MinecraftServer, packet: Packet) {
	// 	// handle packet data
	// 	const reader = new ReadableBuffer(packet.data);
	// 	const packet_id = Types.BYTE.read(reader) as number;
	// 	Logger.log(Level.INFO, "packet type: " + PacketType[packet_id]);
	// 	switch (packet_id) {
	// 		case PacketType.HANDSHAKE: {
	// 			// Handle Client Data
	// 			await sendHandshakePacket(this.client, server.isOnlineMode());
	// 			break;
	// 		}
	//
	// 		case PacketType.CHAT_MESSAGE: {
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
	// 			break;
	// 		}
	//
	// 		case PacketType.PLAYER: {
	// 			if (this.player === null) {
	// 				await sendKickPacket(this, "Player is null");
	// 				return;
	// 			}
	//
	// 			this.player.setOnGround(Types.BOOLEAN.read(reader));
	// 			break;
	// 		}
	//
	// 		case PacketType.PLAYER_POSITION: {
	// 			if (this.player === null) {
	// 				await sendKickPacket(this, "Player is null");
	// 				return;
	// 			}
	//
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
	// 			break;
	// 		}
	//
	// 		case PacketType.PLAYER_LOOK: {
	// 			if (this.player === null) {
	// 				await sendKickPacket(this, "Player is null");
	// 				return;
	// 			}
	//
	// 			// Player Look
	// 			this.player.setYaw(Types.FLOAT.read(reader));
	// 			this.player.setPitch(Types.FLOAT.read(reader));
	// 			this.player.setOnGround(Types.BOOLEAN.read(reader));
	// 			await server.updatePlayerPosition(this);
	// 			break;
	// 		}
	//
	// 		case PacketType.PLAYER_POSITION_LOOK: {
	// 			if (this.player === null) {
	// 				await sendKickPacket(this, "Player is null");
	// 				return;
	// 			}
	//
	// 			// Player Position Look
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
	// 			this.player.setPosition(new Vec3d(x, y, z));
	// 			this.player.setYaw(Types.FLOAT.read(reader));
	// 			this.player.setPitch(Types.FLOAT.read(reader));
	// 			this.player.setOnGround(Types.BOOLEAN.read(reader));
	// 			await server.updatePlayerPosition(this);
	// 			break;
	// 		}
	//
	// 		case PacketType.ANIMATION:
	// 			break;
	//
	// 		case PacketType.PLAYER_ABILITIES: {
	// 			if (this.player == null) return;
	//
	// 			const invulnerable = Types.BOOLEAN.read(reader);
	// 			const is_flying = Types.BOOLEAN.read(reader);
	// 			const can_fly = Types.BOOLEAN.read(reader);
	// 			const instant_destroy = Types.BOOLEAN.read(reader);
	//
	// 			const writer = new WritableBuffer();
	// 			Types.BYTE.write(writer, PacketType.PLAYER_ABILITIES);
	// 			Types.BOOLEAN.write(writer, invulnerable); // Invulnerability
	// 			Types.BOOLEAN.write(writer, is_flying); // Is flying
	// 			Types.BOOLEAN.write(writer, can_fly); // Can fly
	// 			Types.BOOLEAN.write(writer, instant_destroy); // Instant Destroy
	// 			await this.client.write(writer.build());
	// 			break;
	// 		}
	//
	// 		case PacketType.PLUGIN_MESSAGE: {
	// 			// Plugin Message
	// 			const channel = readPacketString(reader);
	// 			const byte_len = Types.SHORT.read(reader);
	// 			// const bytes = reader.read_bytes(byte_len);
	// 			Logger.log(
	// 				Level.INFO,
	// 				`Got Plugin Message ('${channel}') [ ...${byte_len} bytes ]`,
	// 			);
	// 			break;
	// 		}
	//
	// 		case PacketType.SERVER_LIST_PING: {

	// 			break;
	// 		}
	//
	// 		case PacketType.KICK_DISCONNECT: {
	// 			await server.onPlayerLeave(this);
	// 			break;
	// 		}
	//
	// 		default: {
	// 			Logger.log(
	// 				Level.WARNING,
	// 				`TODO: Handle packet (${packet_id}) ${
	// 					PacketType[packet_id]
	// 				}`,
	// 			);
	// 			break;
	// 		}
	// 	}
	// }

	// close() {
	// this.playing = false;
	// }

	// Writing
	// async sendLoginRequestPacket(server: MinecraftServer) {
	// 	if (this.player == null) return; // erm no this shouldn't happen
	// 	const writer = new WritableBuffer();
	// 	Types.BYTE.write(writer, PacketType.LOGIN_REQUEST);
	// 	Types.INTEGER.write(writer, ProtocolVersion.v1_2_4_to_1_2_5);
	// 	writePacketString(writer, this.player.getUsername());
	// 	writePacketString(writer, WorldType.DEFAULT);
	// 	Types.INTEGER.write(writer, this.player.getGamemode());
	// 	Types.INTEGER.write(writer, server.getDifficulty());
	// 	Types.BYTE.write(writer, server.getDifficulty());
	// 	Types.BYTE.write(writer, 256); // World Height?
	// 	Types.BYTE.write(writer, 10); // Tab List Count?
	// 	await this.client.write(writer.build());
	// }
	//
	// async sendPlayerPosition() {
	// 	// Should this happen?
	// 	if (this.player == null) return;
	// 	const writer = new WritableBuffer();
	// 	Types.BYTE.write(writer, PacketType.PLAYER_POSITION);
	// 	const position = this.player.getPosition();
	// 	Types.DOUBLE.write(writer, position.x);
	// 	Types.DOUBLE.write(writer, position.y);
	// 	Types.DOUBLE.write(writer, 0); // stance
	// 	Types.DOUBLE.write(writer, position.z);
	// 	Types.BYTE.write(writer, this.player.isOnGround() == true ? 1 : 0);
	// 	await this.client.write(writer.build());
	// }
	//
	// async sendMessage(message: string) {
	// 	const writer = new WritableBuffer();
	// 	Types.BYTE.write(writer, PacketType.CHAT_MESSAGE);
	// 	writePacketString(writer, message);
	// 	await this.client.write(writer.build());
	// }
	//
	// async sendHealthUpdate() {
	// 	// Should this happen?
	// 	if (this.player == null) return;
	// 	const writer = new WritableBuffer();
	// 	Types.BYTE.write(writer, PacketType.UPDATE_HEALTH);
	// 	Types.SHORT.write(writer, this.player.getHealth());
	// 	Types.SHORT.write(writer, this.player.getHungerLevel());
	// 	Types.FLOAT.write(writer, this.player.getSaturation());
	// 	await this.client.write(writer.build());
	// }
	//
	// async sendTabListUpdate(other: ClientConnection, remove: boolean = false) {
	// 	// Should this happen?
	// 	if (this.player == null || other.getPlayer() == null) return;
	// 	const writer = new WritableBuffer();
	// 	Types.BYTE.write(writer, PacketType.PLAYER_LIST_ITEM);
	// 	writePacketString(writer, other.getPlayer()!.getUsername());
	// 	Types.BOOLEAN.write(writer, !remove); // false to remove
	// 	Types.SHORT.write(writer, 0); // TODO: Ping
	// 	await this.client.write(writer.build());
	// }
}
