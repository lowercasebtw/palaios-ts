import { ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import AbstractPacket from "./AbstractPacket.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";

export default class HandshakePacket extends AbstractPacket {
	constructor(private hash: string) {
		super();
	}

	override write(writer: WritableBuffer) {
		this.writePacketString(writer, this.hash);
	}

	override read(reader: ReadableBuffer) {
	}

	override async handle(handler: PacketHandler) {
		await handler.onHandshake(this);
	}

	override getType(): PacketType {
		return PacketType.HANDSHAKE;
	}
}
