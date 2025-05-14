import { ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import AbstractPacket from "./AbstractPacket.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";

export default class KickDisconnectPacket extends AbstractPacket {
	constructor(private reason: string) {
		super();
	}

	override write(writer: WritableBuffer) {
		this.writePacketString(writer, this.reason);
	}

	override read(reader: ReadableBuffer) {
		this.reason = this.readPacketString(reader);
	}

	override async handle(handler: PacketHandler) {
		await handler.onKickDisconnect(this);
	}

	override getType(): PacketType {
		return PacketType.KICK_DISCONNECT;
	}

	getReason() {
		return this.reason;
	}
}
