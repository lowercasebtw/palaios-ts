import MinecraftServer from "../server.ts";
import Types, { ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import { Client } from "./tcp.ts";
import AbstractPacket from "../packet/AbstractPacket.ts";
import ServerPacketHandler from "../serverPacketHandler.ts";
import Packets from "../packet/Packets.ts";
import PacketType from "../packet/PacketType.ts";
import { Level, Logger } from "../logger/Logger.ts";
import KickDisconnectPacket from "../packet/KickDisconnectPacket.ts";

export default class ClientConnection {
	private static LAST_CONNECTION_ID = 0;
	public readonly id: number;
	private readonly client: Client;
	private readonly handler: ServerPacketHandler;

	public constructor(server: MinecraftServer, client: Client) {
		this.id = ClientConnection.LAST_CONNECTION_ID++;
		this.client = client;
		this.handler = new ServerPacketHandler(server, this);
	}

	getClient() {
		return this.client;
	}

	isPlaying() {
		return this.handler.isPlaying();
	}

	getPlayer() {
		return this.handler.getPlayer();
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
		try {
			await packet.handle(this.handler);
		} catch (error) {
			await this.kick("Kicked! Reason: " + (error as Error).message);
		}
	}

	async sendPacket(packet: AbstractPacket) {
		const writer = new WritableBuffer();
		Types.BYTE.write(writer, packet.getType());
		packet.write(writer);
		await this.client.write(writer.build());
	}

	async kick(message: string) {
		await this.sendPacket(new KickDisconnectPacket(message));
		this.client.close();
	}

	close() {
	}

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
}
