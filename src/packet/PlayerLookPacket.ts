import { ReadableBuffer, WritableBuffer } from "../util/byte.ts";
import AbstractPacket from "./AbstractPacket.ts";
import PacketHandler from "./PacketHandler.ts";
import PacketType from "./PacketType.ts";

export default class PlayerLookPacket extends AbstractPacket {
	constructor() {
		super();
	}

	override write(writer: WritableBuffer) {
	}

	override read(reader: ReadableBuffer) {
	}

	override async handle(handler: PacketHandler) {
		await handler.onPlayerLook(this);
	}

	override getType(): PacketType {
		return PacketType.PLAYER_LOOK;
	}
}
